
'use client';
import { useMemo } from 'react';
import { DocumentMovement, DocumentMovementStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Check, CheckCheck } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format, parseISO } from 'date-fns';
import { Badge } from '../ui/badge';

const DocumentCard = ({ movement, onViewDocument }: { movement: DocumentMovement; onViewDocument: (doc: DocumentMovement) => void }) => {
    const { users } = useAppContext();
    
    const assignee = users.find(u => u.id === movement.assigneeId);
    
    return (
        <Card onClick={() => onViewDocument(movement)} className="cursor-pointer hover:shadow-md">
            <CardContent className="p-3 space-y-2">
                <p className="font-bold text-base leading-tight">{movement.title}</p>
                <div className="flex justify-between items-center pt-1">
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(movement.createdAt), 'dd MMM, yyyy')}
                    </p>
                    {assignee && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                             <Avatar className="h-5 w-5">
                                <AvatarImage src={assignee.avatar} />
                                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{assignee.name.split(' ')[0]}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const statusColumns: { title: string, status: DocumentMovementStatus, icon: React.ElementType }[] = [
    { title: 'Pending', status: 'Pending', icon: Clock },
    { title: 'Acknowledged', status: 'Acknowledged', icon: Check },
    { title: 'Completed', status: 'Completed', icon: CheckCheck },
];

const BoardColumn = ({ title, icon: Icon, documents, onViewDocument }: { title: string; icon: React.ElementType; documents: DocumentMovement[]; onViewDocument: (doc: DocumentMovement) => void; }) => {
    return (
        <div className="flex flex-col bg-muted/50 rounded-lg">
            <h3 className="p-4 font-semibold flex items-center gap-2 text-base border-b">
                <Icon className="h-5 w-5" />
                <span>{title}</span>
                <Badge variant="secondary">{documents.length}</Badge>
            </h3>
            <ScrollArea className="h-[calc(100vh-28rem)]">
                <div className="p-4 space-y-4">
                    {documents.length > 0 ? (
                        documents.map(doc => (
                            <DocumentCard key={doc.id} movement={doc} onViewDocument={onViewDocument} />
                        ))
                    ) : (
                        <div className="text-center text-sm text-muted-foreground pt-10">
                            No documents in this stage.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

export default function DocumentTrackerBoard({ documents, onViewDocument }: { documents: DocumentMovement[], onViewDocument: (doc: DocumentMovement) => void }) {
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
       {statusColumns.map(({ title, status, icon }) => (
         <BoardColumn
            key={status}
            title={title}
            icon={icon}
            documents={documents.filter(ts => ts.status === status)}
            onViewDocument={onViewDocument}
         />
       ))}
    </div>
  );
}
