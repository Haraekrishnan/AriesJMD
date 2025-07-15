'use client';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '@/components/ui/textarea';
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';
import type { ManpowerProfile, Trade, DocumentStatus } from '@/types';
import { TRADES, MANDATORY_DOCS, RA_TRADES } from '@/lib/mock-data';
import { format } from 'date-fns';

type ManpowerProfileDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    profile: ManpowerProfile | null;
};

const INITIAL_STATE: Omit<ManpowerProfile, 'id'> = {
    name: '',
    trade: 'RA Level 1',
    status: 'Working',
    documents: MANDATORY_DOCS.map(doc => ({ name: doc, status: 'Pending', details: '' })),
};

export default function ManpowerProfileDialog({ isOpen, setIsOpen, profile }: ManpowerProfileDialogProps) {
    const { addManpowerProfile, editManpowerProfile } = useAppContext();
    const { toast } = useToast();
    const [formData, setFormData] = useState(INITIAL_STATE);

    useEffect(() => {
        if (profile) {
            const existingDocs = profile.documents.map(d => d.name);
            const allDocs = [...profile.documents];
            MANDATORY_DOCS.forEach(md => {
                if(!existingDocs.includes(md)) {
                    allDocs.push({ name: md, status: 'Pending', details: '' });
                }
            })
            if (RA_TRADES.includes(profile.trade) && !existingDocs.includes('IRATA Certificate')) {
                 allDocs.push({ name: 'IRATA Certificate', status: 'Pending', details: '' });
            }

            setFormData({ ...profile, documents: allDocs });
        } else {
            setFormData(INITIAL_STATE);
        }
    }, [profile, isOpen]);

    const handleChange = (field: keyof ManpowerProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleDocChange = (docName: string, field: 'status' | 'details', value: string) => {
        const updatedDocs = formData.documents.map(doc => 
            doc.name === docName ? { ...doc, [field]: value } : doc
        );
        handleChange('documents', updatedDocs);
    }

    const handleSubmit = () => {
        if (profile) {
            editManpowerProfile(profile.id, formData);
        } else {
            addManpowerProfile(formData);
        }
        toast({ title: profile ? 'Profile Updated' : 'Profile Created' });
        setIsOpen(false);
    };
    
    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd');
        } catch (e) {
            return '';
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{profile ? 'Edit Manpower Profile' : 'Add New Manpower'}</DialogTitle>
                    <DialogDescription>
                        {profile ? `Editing profile for ${profile.name}` : 'Enter the details for the new manpower.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                    <Tabs defaultValue="basic">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="documents">Documents</TabsTrigger>
                            <TabsTrigger value="validity">Validity</TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="py-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Name</Label><Input value={formData.name} onChange={e => handleChange('name', e.target.value)} /></div>
                                <div><Label>Trade</Label>
                                    <Select value={formData.trade} onValueChange={val => handleChange('trade', val)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Status</Label>
                                    <Select value={formData.status} onValueChange={val => handleChange('status', val)}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Working">Working</SelectItem>
                                            <SelectItem value="On Leave">On Leave</SelectItem>
                                            <SelectItem value="Resigned">Resigned</SelectItem>
                                            <SelectItem value="Terminated">Terminated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Hard Copy File No.</Label><Input value={formData.hardCopyFileNo || ''} onChange={e => handleChange('hardCopyFileNo', e.target.value)} /></div>
                                <div><Label>EP Number</Label><Input value={formData.epNumber || ''} onChange={e => handleChange('epNumber', e.target.value)} /></div>
                                <div><Label>Plant Name</Label><Input value={formData.plantName || ''} onChange={e => handleChange('plantName', e.target.value)} /></div>
                                <div><Label>EIC Name</Label><Input value={formData.eicName || ''} onChange={e => handleChange('eicName', e.target.value)} /></div>
                                <div><Label>Joining Date</Label><Input type="date" value={formatDate(formData.joiningDate)} onChange={e => handleChange('joiningDate', e.target.value)} /></div>
                            </div>
                        </TabsContent>
                        <TabsContent value="documents" className="py-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formData.documents.map(doc => (
                                    <div key={doc.name} className="p-3 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-muted/20">
                                        <Label className="md:col-span-1 font-semibold">{doc.name}</Label>
                                        <div className="md:col-span-2 grid grid-cols-2 gap-2">
                                            <Select value={doc.status} onValueChange={val => handleDocChange(doc.name, 'status', val)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Pending">Pending</SelectItem>
                                                    <SelectItem value="Collected">Collected</SelectItem>
                                                    <SelectItem value="Submitted">Submitted</SelectItem>
                                                    <SelectItem value="Received">Received</SelectItem>
                                                    <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input placeholder="Details / No." value={doc.details || ''} onChange={e => handleDocChange(doc.name, 'details', e.target.value)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>
                        <TabsContent value="validity" className="py-4 space-y-4">
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div><Label>Pass Issue Date</Label><Input type="date" value={formatDate(formData.passIssueDate)} onChange={e => handleChange('passIssueDate', e.target.value)} /></div>
                                <div><Label>WO Validity</Label><Input type="date" value={formatDate(formData.woValidity)} onChange={e => handleChange('woValidity', e.target.value)} /></div>
                                <div><Label>WC Policy Validity</Label><Input type="date" value={formatDate(formData.wcPolicyValidity)} onChange={e => handleChange('wcPolicyValidity', e.target.value)} /></div>
                                <div><Label>Labour Contract Validity</Label><Input type="date" value={formatDate(formData.labourContractValidity)} onChange={e => handleChange('labourContractValidity', e.target.value)} /></div>
                                <div><Label>Medical Expiry</Label><Input type="date" value={formatDate(formData.medicalExpiryDate)} onChange={e => handleChange('medicalExpiryDate', e.target.value)} /></div>
                                <div><Label>Safety Expiry</Label><Input type="date" value={formatDate(formData.safetyExpiryDate)} onChange={e => handleChange('safetyExpiryDate', e.target.value)} /></div>
                                <div><Label>IRATA Validity</Label><Input type="date" value={formatDate(formData.irataValidity)} onChange={e => handleChange('irataValidity', e.target.value)} /></div>
                                <div><Label>Contract Validity</Label><Input type="date" value={formatDate(formData.contractValidity)} onChange={e => handleChange('contractValidity', e.target.value)} /></div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
                <DialogFooter className="pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Save Profile</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
