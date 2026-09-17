
'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, ArrowRight, ShieldCheck, UserPlus, Calendar } from 'lucide-react';
import type { EhsObservation, CapaStage } from '@/lib/types';
import { useEhs } from '@/contexts/ehs-provider';
import { useAuth } from '@/contexts/auth-provider';
import { useFormContext } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Props {
    observation: EhsObservation;
    stage: CapaStage;
}

export default function CapaActionFooter({ observation, stage }: Props) {
    const { user, users } = useAuth();
    const { actionStage, reviewStage } = useEhs();
    const { getValues } = useFormContext();
    
    const [isHandoverOpen, setIsHandoverOpen] = useState(false);
    const [handoverData, setHandoverData] = useState({ assigneeId: '', targetDate: '' });

    const sData = observation.stages[stage];
    const isCurrentStage = observation.currentStage === stage;
    const isCompleted = sData?.status === 'Completed';
    const isSubmitted = sData?.status === 'In Progress';
    const isLocked = isCompleted || isSubmitted;
    const isAssignee = user?.id === sData?.assigneeId;

    const handleAction = (isSubmit: boolean) => {
        const formData = getValues();
        actionStage(observation.id, stage, formData, isSubmit);
    };

    const handleInvestigationFinalize = () => {
        if (stage === 'Investigation') {
            setIsHandoverOpen(true);
        } else {
            handleAction(true);
        }
    };

    const handleCompleteHandover = () => {
        if (!handoverData.assigneeId || !handoverData.targetDate) return;
        
        // This effectively completes the Investigation stage and assigns Resolution
        const formData = getValues();
        actionStage(observation.id, 'Investigation', formData, true);
        
        // Now, we need to handle the approval logic which moves it to the next stage.
        // For the purposes of this handover, we act as the approval flow but with custom assignee data.
        reviewStage(observation.id, 'Investigation', 'Completed', 'Investigation finalized. Resolution strategy assigned.', handoverData);
        
        setIsHandoverOpen(false);
    };

    const buttonLabel = useMemo(() => {
        switch(stage) {
            case 'Investigation': return 'FINALIZE INVESTIGATION';
            case 'Resolution': return 'SUBMIT RESOLUTION';
            case 'Implementation': return 'FINALIZE FIELD ACTIONS';
            case 'Closure': return 'AUTHORIZE CASE CLOSURE';
            default: return `SUBMIT ${stage.toUpperCase()}`;
        }
    }, [stage]);

    const availableAssignees = useMemo(() => {
        return users.filter(u => u.status === 'active' && u.role !== 'Manager');
    }, [users]);

    return (
        <>
        <div className="flex items-center justify-between w-full h-full max-w-[1000px] mx-auto">
            <div className="flex items-center gap-4">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-5 text-[10px] font-black uppercase tracking-widest text-slate-900 border border-slate-300 gap-2 bg-white hover:bg-slate-50"
                    disabled={isLocked || !isCurrentStage}
                    onClick={() => handleAction(false)}
                >
                    <Save className="h-3.5 w-3.5" /> SAVE AS DRAFT
                </Button>
            </div>

            <div className="flex items-center gap-6">
                {!isLocked && (!isCurrentStage || !isAssignee) && (
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                       <ShieldCheck className="h-3.5 w-3.5" /> OVERSIGHT MODE ACTIVE
                   </div>
                )}
                
                <Button 
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.15em] text-[10px] h-10 px-10 rounded-sm shadow-sm transition-all disabled:bg-slate-200"
                    disabled={isLocked || !isCurrentStage}
                    onClick={handleInvestigationFinalize}
                >
                    {isLocked ? 'STAGE FINALIZED' : buttonLabel} <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Handover Selection Dialog for Investigation Completion */}
        <Dialog open={isHandoverOpen} onOpenChange={setIsHandoverOpen}>
            <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Handover Responsibility</DialogTitle>
                    <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assign Resolution & Implementation Ownership</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 text-left">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <UserPlus className="h-3 w-3" /> Responsibility Official
                        </Label>
                        <Select onValueChange={(val) => setHandoverData(p => ({ ...p, assigneeId: val }))}>
                            <SelectTrigger className="h-12 rounded-xl font-bold border-2">
                                <SelectValue placeholder="Select technical owner..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableAssignees.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Calendar className="h-3 w-3" /> Resolution Target Date
                        </Label>
                        <Input 
                            type="date" 
                            className="h-12 rounded-xl font-bold border-2" 
                            onChange={(e) => setHandoverData(p => ({ ...p, targetDate: e.target.value }))}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="h-12 px-6 rounded-xl font-bold uppercase text-[10px]" onClick={() => setIsHandoverOpen(false)}>Cancel</Button>
                    <Button 
                        className="bg-[#1769FF] hover:bg-blue-700 text-white h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest"
                        disabled={!handoverData.assigneeId || !handoverData.targetDate}
                        onClick={handleCompleteHandover}
                    >
                        Confirm Handover & Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
