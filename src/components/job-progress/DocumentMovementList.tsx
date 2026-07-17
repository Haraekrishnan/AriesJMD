'use client';
import { useMemo } from 'react';
import { DocumentMovement, DocumentMovementStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Clock, Check, Undo2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
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
    const { users } = useAuth();

    if (documents.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20 m-4">
                <p className="text-muted-foreground">No documents found for this period.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
                <div className="min-w-max">
                    <Table className="border-collapse text-[11px] font-sans">
                        <TableHeader className="sticky top-0 z-20">
                            <TableRow className="bg-[#D9E2F3] hover:bg-[#D9E2F3] border-b-2 border-black">
                                <TableHead className="border-r border-black text-black font-bold h-10 px-3">DOCUMENT TITLE</TableHead>
                                <TableHead className="border-r border-black text-black font-bold h-10 px-3">CURRENT ASSIGNEE</TableHead>
                                <TableHead className="border-r border-black text-black font-bold h-10 px-3">LAST UPDATED</TableHead>
                                <TableHead className="border-r border-black text-black font-bold h-10 px-3">STATUS</TableHead>
                                <TableHead className="border-black text-black font-bold h-10 px-3 text-right">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map(doc => {
                                const assignee = users.find(u => u.id === doc.assigneeId);
                                return (
                                    <TableRow key={doc.id} onClick={() => onViewDocument(doc)} className="hover:bg-blue-50/50 cursor-pointer border-b border-slate-300">
                                        <TableCell className="border-r border-slate-300 font-bold uppercase p-2">{doc.title}</TableCell>
                                        <TableCell className="border-r border-slate-300 p-2">
                                            {assignee && (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 border">
                                                        <AvatarImage src={assignee.avatar} />
                                                        <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{assignee.name}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="border-r border-slate-300 text-muted-foreground p-2">{formatDistanceToNow(parseISO(doc.lastUpdated), { addSuffix: true })}</TableCell>
                                        <TableCell className="border-r border-slate-300 p-2"><Badge variant={statusVariant[doc.status]} className="text-[10px] py-0">{doc.status.toUpperCase()}</Badge></TableCell>
                                        <TableCell className="text-right p-2">
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold text-blue-700">DETAILS</Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
};

export default DocumentMovementList;
