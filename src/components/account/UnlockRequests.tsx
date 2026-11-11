'use client';
import styles from './account.module.css';

import { useAppContext } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function UnlockRequests() {
    const { unlockRequests, resolveUnlockRequest, cancelUnlockRequest } = useAppContext();
    const { toast } = useToast();

    const [busy, setBusy] = useState(false);
    const handleAction = async (requestId: string, userId?: string) => {
        if (!userId && !window.confirm('Cancel this unlock request? The account will remain locked.')) return;
        setBusy(true);
        try {
            if (userId) await resolveUnlockRequest(requestId, userId);
            else await cancelUnlockRequest(requestId);
            toast({ title: userId ? 'Account unlocked' : 'Unlock request cancelled' });
        } catch (error) {
            toast({ title: 'Unable to update request', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
        } finally { setBusy(false); }
    };

    const pendingRequests = unlockRequests.filter(r => r.status === 'pending');
    
    if (pendingRequests.length === 0) {
        return <Card><CardHeader><CardTitle>Account Unlock Requests</CardTitle><CardDescription>No pending unlock requests.</CardDescription></CardHeader></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound />
                    Account Unlock Requests
                </CardTitle>
                <CardDescription>
                    Review and act upon account unlock requests from users.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {pendingRequests.length > 0 ? (
                  <div className={styles.listArea}>
                    <Table className={styles.managementTable}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Area / Request type</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell data-label="User">{req.userName}</TableCell>
                                    <TableCell data-label="Area / Request type">Account access · Login unlock</TableCell>
                                    <TableCell data-label="Requested" title={req.date}>{formatDistanceToNow(parseISO(req.date), { addSuffix: true })}</TableCell>
                                    <TableCell data-label="Actions" className="text-right">
                                        <Button disabled={busy} size="sm" variant="outline" className="mr-2" onClick={() => handleAction(req.id)}>Cancel request</Button>
                                        <Button disabled={busy} size="sm" onClick={() => handleAction(req.id, req.userId)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" /> Unlock
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending unlock requests.</p>
                )}
            </CardContent>
        </Card>
    );
}
