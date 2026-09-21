'use client';

import RecordToolbar from '@/components/ehs/RecordToolbar';
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useEhs } from '@/contexts/ehs-provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  FileQuestion,
  Book,
  ShieldCheck,
  Send,
  Zap,
  Edit,
  Check,
  X,
  Clock,
  MessageSquare,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function EhsSupportPage() {
  const { user, users } = useAuth();
  const {
    contactInfo,
    supportTickets,
    addSupportTicket,
    updateContactInfo,
    updateTicketStatus,
    addTicketComment,
    deleteSupportTicket,
  } = useEhs();
  const { toast } = useToast();
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Audit/Inspection Query',
    urgency: 'Normal - 24hr Response',
    description: '',
  });

  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isManagement =
    user?.role === 'Admin' || user?.role === 'Senior Safety Supervisor';

  const myTickets = useMemo(() => {
    return supportTickets
      .filter((t) => t.requesterId === user?.id)
      .sort(
        (a, b) =>
          parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(),
      );
  }, [supportTickets, user]);

  const ticketsToReview = useMemo(() => {
    if (!isManagement) return [];
    return [...supportTickets].sort(
      (a, b) =>
        parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime(),
    );
  }, [supportTickets, isManagement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please provide details for your support request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addSupportTicket(formData);

      toast({
        title: 'Support Case Opened',
        description:
          'Your request has been received and assigned to the Senior Safety Supervisor.',
      });

      setFormData({
        category: 'Audit/Inspection Query',
        urgency: 'Normal - 24hr Response',
        description: '',
      });
    } catch {
      toast({
        title: 'Request not sent',
        description: 'Please try again. Your message has been kept.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (key: string, value: string) => {
    setEditingContact(key);
    setEditValue(value || '');
  };

  const handleSaveContact = () => {
    if (!editingContact) return;
    updateContactInfo({ [editingContact]: editValue });
    setEditingContact(null);
  };

  const visibleTickets = (isManagement ? ticketsToReview : myTickets).filter(
    (t) =>
      (ticketStatus === 'all' || t.status === ticketStatus) &&
      [t.category, t.description, t.urgency]
        .join(' ')
        .toLowerCase()
        .includes(ticketSearch.toLowerCase()),
  );
  return (
    <div className="p-5 md:p-8 max-w-[1600px] mx-auto space-y-6 text-slate-900">
      <header>
        <p className="mb-2 text-xs text-slate-500">
          Workspace / Safety management
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Safety support
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Contact your safety team, ask a question and follow your requests.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-400 normal-case tracking-normal mb-6">
            Immediate Contact
          </h3>

          <ContactCard
            icon={Phone}
            label="Safety Hotline"
            value={contactInfo.hotline}
            desc="Contact your designated safety team."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('hotline', contactInfo.hotline)}
            isEditing={editingContact === 'hotline'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />

          <ContactCard
            icon={Mail}
            label="Compliance Office"
            value={contactInfo.email}
            desc="SOP & Documentation queries."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('email', contactInfo.email)}
            isEditing={editingContact === 'email'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />

          <ContactCard
            icon={MessageCircle}
            label="Portal Support"
            value={contactInfo.liveChat}
            desc="Use the request form for portal assistance."
            isEditable={isManagement}
            onEdit={() => handleStartEdit('liveChat', contactInfo.liveChat)}
            isEditing={editingContact === 'liveChat'}
            editValue={editValue}
            onValueChange={setEditValue}
            onSave={handleSaveContact}
            onCancel={() => setEditingContact(null)}
          />
        </div>

        <div className="lg:col-span-2 space-y-6 text-left">
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="p-6 pb-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-slate-900 text-2xl font-semibold normal-case tracking-tight">
                Open Support Case
              </CardTitle>
              <CardDescription className="text-slate-500 text-base mt-2 font-medium">
                Request a technical safety review or get help with a portal
                feature.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-slate-900 font-semibold text-xs normal-case tracking-normal ml-1">
                      Query Category
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, category: val }))
                      }
                    >
                      <SelectTrigger className="h-14 bg-white border-slate-200 text-slate-900 rounded-2xl font-bold shadow-sm px-6">
                        <SelectValue placeholder="Select topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Audit/Inspection Query">
                          Audit/Inspection Query
                        </SelectItem>
                        <SelectItem value="Incident Reporting Help">
                          Incident Reporting Help
                        </SelectItem>
                        <SelectItem value="Risk Assessment Review">
                          Risk Assessment Review
                        </SelectItem>
                        <SelectItem value="Portal Technical Issue">
                          Portal Technical Issue
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-slate-900 font-semibold text-xs normal-case tracking-normal ml-1">
                      Urgency Profile
                    </Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, urgency: val }))
                      }
                    >
                      <SelectTrigger className="h-14 bg-white border-slate-200 text-slate-900 rounded-2xl font-bold shadow-sm px-6">
                        <SelectValue placeholder="Normal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low - Routine Query">
                          Low - Routine Query
                        </SelectItem>
                        <SelectItem value="Normal - 24hr Response">
                          Normal - 24hr Response
                        </SelectItem>
                        <SelectItem value="High - Action Required">
                          High - Action Required
                        </SelectItem>
                        <SelectItem value="Critical - Immediate Assist">
                          Critical - Immediate Assist
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-900 font-semibold text-xs normal-case tracking-normal ml-1">
                    Request Description
                  </Label>
                  <Textarea
                    placeholder="Provide specific details including Site, Date, and Case IDs if applicable..."
                    className="bg-white border-slate-200 text-slate-900 min-h-[180px] rounded-xl p-6 font-bold focus-visible:ring-emerald-600/20 text-base"
                    value={formData.description || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold normal-case tracking-normal h-14 px-6 rounded-2xl shadow-xl shadow-emerald-600/10 active:scale-95 transition-all"
                  >
                    <Send className="mr-3 h-5 w-5" />{' '}
                    {isSubmitting ? 'TRANSMITTING...' : 'SEND REQUEST'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              {isManagement ? 'Support inbox' : 'My requests'}
            </h2>
            <RecordToolbar
              search={ticketSearch}
              onSearch={setTicketSearch}
              count={visibleTickets.length}
              onReset={() => {
                setTicketSearch('');
                setTicketStatus('all');
              }}
              filters={[
                {
                  label: 'Status',
                  value: ticketStatus,
                  onChange: setTicketStatus,
                  options: [
                    { value: 'all', label: 'All statuses' },
                    ...['Open', 'In Progress', 'Closed'].map((value) => ({
                      value,
                      label: value,
                    })),
                  ],
                },
              ]}
            />
            <div className="divide-y rounded-xl border bg-white">
              {visibleTickets.map((ticket) => (
                <TicketReviewItem
                  key={ticket.id}
                  ticket={ticket}
                  users={users}
                  currentUser={user}
                  canManage={isManagement}
                  onStatusChange={updateTicketStatus}
                  onAddComment={addTicketComment}
                  onDelete={deleteSupportTicket}
                />
              ))}
              {!visibleTickets.length && (
                <p className="p-10 text-center text-sm text-slate-500">
                  No matching requests.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  desc,
  isEditable,
  onEdit,
  isEditing,
  editValue,
  onValueChange,
  onSave,
  onCancel,
}: any) {
  return (
    <Card className="bg-white border-slate-200 hover:border-emerald-600/20 transition-all duration-300 shadow-sm group rounded-xl">
      <CardContent className="p-6 flex gap-6 relative">
        <div className="bg-slate-100 p-4 rounded-2xl group-hover:scale-110 transition-transform">
          <Icon className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">
            {label}
          </p>
          {isEditing ? (
            <div className="mt-2 flex gap-2">
              <Input
                value={editValue || ''}
                onChange={(e) => onValueChange(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 text-slate-900 text-sm font-bold"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-emerald-600"
                onClick={onSave}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 text-slate-400"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="break-all text-base font-semibold text-slate-900 mt-1">
                {value}
              </p>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={'Edit ' + label}
                  className="h-8 w-8 shrink-0"
                  onClick={onEdit}
                >
                  <Edit className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              )}
            </div>
          )}
          <p className="text-sm text-slate-500 mt-1 font-bold">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketReviewItem({
  ticket,
  users,
  currentUser,
  canManage,
  onStatusChange,
  onAddComment,
  onDelete,
}: any) {
  const requester = users.find((u: any) => u.id === ticket.requesterId);
  const [comment, setComment] = useState('');
  const comments = ticket.comments ? Object.values(ticket.comments) : [];
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <div className="p-8 space-y-6 text-left">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-slate-100 shadow-sm">
            <AvatarImage src={requester?.avatar} />
            <AvatarFallback className="font-semibold text-slate-500">
              {requester?.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-slate-900 normal-case tracking-tight">
              {requester?.name}
            </p>
            <p className="text-sm text-slate-500 normal-case font-semibold tracking-normal">
              {ticket.category} &middot; {ticket.urgency}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge
            variant={
              ticket.status === 'Open'
                ? 'destructive'
                : ticket.status === 'Closed'
                  ? 'success'
                  : 'default'
            }
            className="font-semibold normal-case text-sm h-6 px-3"
          >
            {ticket.status}
          </Badge>
          <span className="text-sm text-slate-400 font-semibold normal-case tracking-normal">
            {formatDistanceToNow(parseISO(ticket.createdAt), {
              addSuffix: true,
            })}
          </span>

          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-rose-600 hover:bg-rose-50 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white border-slate-200">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold normal-case text-slate-900">
                    Delete Support Ticket?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-600 font-medium">
                    This action will permanently remove this ticket and its
                    entire conversation history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold rounded-xl">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl"
                    onClick={() => onDelete(ticket.id)}
                  >
                    DELETE PERMANENTLY
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 shadow-none">
        <p className="text-slate-700 text-sm font-bold leading-relaxed whitespace-pre-wrap">
          "{ticket.description}"
        </p>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 pl-12 border-l-2 border-slate-100 ml-6">
          {comments.map((c: any, i: number) => {
            const cAuthor = users.find((u: any) => u.id === c.userId);
            return (
              <div key={i} className="flex gap-4 items-start">
                <Avatar className="h-8 w-8 border shadow-sm shrink-0">
                  <AvatarImage src={cAuthor?.avatar} />
                  <AvatarFallback className="text-sm font-semibold">
                    {cAuthor?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-semibold text-slate-400 normal-case tracking-normal">
                      {cAuthor?.name}
                    </p>
                    <p className="text-sm text-slate-400 font-bold normal-case">
                      {formatDistanceToNow(parseISO(c.date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                    {c.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-4">
        <div className="min-w-[160px] flex-1 relative">
          <Input
            aria-label="Reply to support request"
            placeholder="Add a reply…"
            className="h-14 bg-white border-slate-200 text-slate-900 rounded-2xl pr-14 font-bold shadow-sm"
            value={comment || ''}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (comment.trim()) {
                  onAddComment(ticket.id, comment);
                  setComment('');
                }
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
            disabled={!comment.trim()}
            onClick={() => {
              onAddComment(ticket.id, comment);
              setComment('');
            }}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {canManage && (
          <Select
            value={ticket.status}
            onValueChange={(val) => onStatusChange(ticket.id, val)}
          >
            <SelectTrigger className="w-[180px] h-14 bg-white border-slate-200 text-slate-900 rounded-2xl font-semibold normal-case text-sm tracking-normal shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
