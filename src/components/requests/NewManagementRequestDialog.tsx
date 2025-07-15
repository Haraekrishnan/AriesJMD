'use client';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from '@/hooks/use-app-context';
import { useToast } from '@/hooks/use-toast';

type NewManagementRequestDialogProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

export default function NewManagementRequestDialog({ isOpen, setIsOpen }: NewManagementRequestDialogProps) {
    const { user, users, createManagementRequest } = useAppContext();
    const { toast } = useToast();

    const [recipientId, setRecipientId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const possibleRecipients = users.filter(u => ['Admin', 'Manager', 'Supervisor'].includes(u.role) && u.id !== user?.id);

    const handleSubmit = () => {
        if (!recipientId || !subject.trim() || !body.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
            return;
        }
        createManagementRequest(recipientId, subject, body);
        toast({ title: 'Request Submitted' });
        // Reset form
        setRecipientId('');
        setSubject('');
        setBody('');
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Management Request</DialogTitle>
                    <DialogDescription>
                        Submit a request directly to a manager or supervisor.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="recipient" className="text-right">
                            To
                        </Label>
                        <Select value={recipientId} onValueChange={setRecipientId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select a recipient" />
                            </SelectTrigger>
                            <SelectContent>
                                {possibleRecipients.map(u => (
                                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="subject" className="text-right">
                            Subject
                        </Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="body" className="text-right mt-2">
                            Details
                        </Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="col-span-3 min-h-[120px]"
                            placeholder="Provide details about your request..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleSubmit}>Submit Request</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
