
'use client';

import { useAppContext } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow, parseISO } from "date-fns";
import { KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PasswordResetRequests() {
    const { passwordResetRequests, generateResetCode, resolveResetRequest } = useAppContext();
    const { toast } = useToast();

    const handleGenerate = (requestId: string) => {
        generateResetCode(requestId);
        toast({ title: "Reset Code Generated", description: "The code is now visible. Please share it with the user." });
    };

    const handleResolve = (requestId: string) => {
        resolveResetRequest(requestId);
        toast({ title: "Request Resolved", description: "The request has been marked as handled." });
    };

    const pendingRequests = passwordResetRequests.filter(r => r.status === 'pending');
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound />
                    Password Reset Requests
                </CardTitle>
                <CardDescription>
                    Generate one-time codes for users who have forgotten their password.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {pendingRequests.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead>Reset Code</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{req.email}</TableCell>
                                    <TableCell>{formatDistanceToNow(parseISO(req.date), { addSuffix: true })}</TableCell>
                                    <TableCell className="font-mono font-bold text-lg tracking-widest">
                                        {req.resetCode || '...'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {req.resetCode ? (
                                            <Button size="sm" onClick={() => handleResolve(req.id)}>Resolve</Button>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => handleGenerate(req.id)}>Generate Code</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No pending password reset requests.</p>
                )}
            </CardContent>
        </Card>
    );
}
