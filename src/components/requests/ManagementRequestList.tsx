
'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import type { ManagementRequest } from '@/lib/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ViewManagementRequestDialog from './ViewManagementRequestDialog';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface ManagementRequestListProps {
  requests: ManagementRequest[];
}

const statusVariantMap: { [key in ManagementRequest['status']]: 'default' | 'secondary' | 'destructive' | 'success' } = {
  'New': 'default',
  'Under Review': 'secondary',
  'Action Taken': 'success',
  'Closed': 'secondary',
};

export default function ManagementRequestList({ requests }: ManagementRequestListProps) {
  const { user, users, markManagementRequestAsViewed } = useAppContext();
  const [viewingRequest, setViewingRequest] = useState<ManagementRequest | null>(null);

  const handleView = (request: ManagementRequest) => {
    if (user && !request.readBy?.[user.id]) {
      markManagementRequestAsViewed(request.id);
    }
    setViewingRequest(request);
  };

  if (!requests.length) {
    return <p className="text-center text-muted-foreground py-10">No requests here.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const creator = users.find((u) => u.id === request.creatorId);
          const recipient = users.find((u) => u.id === request.toUserId);
          const isUnread = user && !request.readBy?.[user.id];

          return (
            <div
              key={request.id}
              className={cn(
                "border rounded-lg p-4 cursor-pointer hover:bg-muted/50",
                isUnread && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              )}
              onClick={() => handleView(request)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isUnread && <div className="h-2 w-2 rounded-full bg-blue-500" title="Unread"></div>}
                    <p className="font-semibold">{request.subject}</p>
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
                    <Badge variant={statusVariantMap[request.status]}>{request.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(request.lastUpdated), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {viewingRequest && (
        <ViewManagementRequestDialog 
          isOpen={!!viewingRequest}
          setIsOpen={() => setViewingRequest(null)}
          request={viewingRequest}
        />
      )}
    </>
  );
}
