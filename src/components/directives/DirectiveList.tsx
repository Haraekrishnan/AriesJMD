
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { Directive } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ViewDirectiveDialog from './ViewDirectiveDialog';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface DirectiveListProps {
  directives: Directive[];
}

const statusVariantMap: { [key in Directive['status']]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'New': 'default',
  'Under Review': 'secondary',
  'Action Taken': 'success',
  'Closed': 'secondary',
};

export default function DirectiveList({ directives }: DirectiveListProps) {
  const { user, users, markDirectiveAsRead } = useAppContext();
  const [viewingDirective, setViewingDirective] = useState<Directive | null>(null);

  const handleView = (directive: Directive) => {
    if (user && !directive.readBy?.[user.id]) {
      markDirectiveAsRead(directive.id);
    }
    setViewingDirective(directive);
  };

  if (!directives.length) {
    return <p className="text-center text-muted-foreground py-10">No directives here.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {directives.map((directive) => {
          const creator = users.find((u) => u.id === directive.creatorId);
          const recipient = users.find((u) => u.id === directive.toUserId);
          const isUnread = user && !directive.readBy?.[user.id];

          return (
            <div
              key={directive.id}
              className={cn(
                "border rounded-lg p-4 cursor-pointer hover:bg-muted/50",
                isUnread && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              )}
              onClick={() => handleView(directive)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isUnread && <div className="h-2 w-2 rounded-full bg-blue-500" title="Unread"></div>}
                    <p className="font-semibold">{directive.subject}</p>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <span>From:</span>
                      <Avatar className="h-5 w-5"><AvatarImage src={creator?.avatar} /><AvatarFallback>{creator?.name.charAt(0)}</AvatarFallback></Avatar>
                      <span>{creator?.name}</span>
                    </div>
                    <span>&middot;</span>
                    <div className="flex items-center gap-1">
                      <span>To:</span>
                      <Avatar className="h-5 w-5"><AvatarImage src={recipient?.avatar} /><AvatarFallback>{recipient?.name.charAt(0)}</AvatarFallback></Avatar>
                      <span>{recipient?.name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge variant={statusVariantMap[directive.status]}>{directive.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(directive.lastUpdated), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {viewingDirective && (
        <ViewDirectiveDialog 
          isOpen={!!viewingDirective}
          setIsOpen={() => setViewingDirective(null)}
          directive={viewingDirective}
        />
      )}
    </>
  );
}
