'use client';

import { useAppContext } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";

export default function UnlockRequests() {
    const { unlockRequests, resolveUnlockRequest } = useAppContext();
    const { toast } = useToast();

    const handleResolve = (requestId: string, userId: string) => {
        resolveUnlockRequest(requestId, userId);
        toast({ title: "Request Resolved & User Unlocked" });
    };

    const pendingRequests = unlockRequests.filter(r => r.status === 'pending');
    
    if (pendingRequests.length === 0) {
        return null;
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
                  <ScrollArea className="h-48">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.userName}</TableCell>
                                    <TableCell>{formatDistanceToNow(parseISO(req.date), { addSuffix: true })}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" onClick={() => handleResolve(req.id, req.userId)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" /> Unlock
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending unlock requests.</p>
                )}
            </CardContent>
        </Card>
    );
}
