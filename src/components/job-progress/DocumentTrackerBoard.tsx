

'use client';
import { useMemo } from 'react';
import { DocumentMovement, DocumentMovementStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Check, Undo2 } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

const statusVariant: { [key in DocumentMovementStatus]: "default" | "secondary" | "destructive" | "success" } = {
    'Pending': 'secondary',
    'Acknowledged': 'default',
    'Returned': 'destructive',
    'Completed': 'success',
};

const DocumentMovementList = ({ documents, onViewDocument }: { documents: DocumentMovement[], onViewDocument: (doc: DocumentMovement) => void }) => {
    const { users } = useAppContext();

    if (documents.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 border-dashed border rounded-lg">
                <p className="text-muted-foreground">No documents found for this period.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[calc(100vh-28rem)]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document Title</TableHead>
                        <TableHead>Current Assignee</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map(doc => {
                        const assignee = users.find(u => u.id === doc.assigneeId);
                        return (
                            <TableRow key={doc.id} onClick={() => onViewDocument(doc)} className="cursor-pointer">
                                <TableCell className="font-semibold">{doc.title}</TableCell>
                                <TableCell>
                                    {assignee && (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6"><AvatarImage src={assignee.avatar} /><AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback></Avatar>
                                            {assignee.name}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>{formatDistanceToNow(parseISO(doc.lastUpdated), { addSuffix: true })}</TableCell>
                                <TableCell><Badge variant={statusVariant[doc.status]}>{doc.status}</Badge></TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

export default DocumentMovementList;
