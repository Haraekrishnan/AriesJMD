'use client';

import { useAppContext } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UnlockRequests() {
    const { unlockRequests, resolveUnlockRequest } = useAppContext();
    const { toast } = useToast();

    const handleResolve = (requestId: string) => {
        resolveUnlockRequest(requestId);
        toast({ title: "Account Unlocked", description: "The user's account has been unlocked." });
    };

    const pendingRequests = (unlockRequests || []).filter(r => r.status === 'pending');
    
    if (pendingRequests.length === 0) {
        return null; // Don't render the card if there are no requests
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Unlock />
                    Unlock Requests
                </CardTitle>
                <CardDescription>
                    Review and approve account unlock requests.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                                    <Button size="sm" onClick={() => handleResolve(req.id)}>Unlock Account</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
