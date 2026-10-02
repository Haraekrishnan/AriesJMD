'use client';
import { useMemo, useState } from 'react';
import { format, parseISO, startOfDay, subDays, isValid } from 'date-fns';
import { MessageSquare, Clock, X, Send, Search, Info, Bell, CalendarDays, UserRound, CheckCircle, ExternalLink, ChevronDown } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/rtdb';
import { useAuth } from '@/contexts/auth-provider';
import { usePlanner } from '@/contexts/planner-provider';
import { useToast } from '@/hooks/use-toast';
import type { PlannerEvent } from '@/lib/types';
import { reviewItem, type ReviewItem, type ReviewState } from './delegated-review-state';
import EventInstanceDialog from './EventInstanceDialog';
import EditEventDialog from './EditEventDialog';
import styles from './delegated-review.module.css';
const labels: Record<ReviewState,string> = {'needs-update':'Needs update','awaiting-reply':'Awaiting assignee reply','new-reply':'New activity'};
export default function RecentPlannerActivity() {
  const { user, users } = useAuth();
  const { plannerEvents, dailyPlannerComments, getExpandedPlannerEvents, addPlannerEventComment } = usePlanner();
  const { toast } = useToast();
  const [tab,setTab]=useState<ReviewState|'all'>('all');
  const [query,setQuery]=useState('');
  const [drafts,setDrafts]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [viewing,setViewing]=useState<ReviewItem|null>(null);
  const [editing,setEditing]=useState<PlannerEvent|null>(null);
  const [localDismissals,setLocalDismissals]=useState<Record<string,Record<string,string>>>({});
  const viewer=users.find(u=>u.id===user?.id)||user;
  const dismissals={...viewer?.delegatedReviewDismissals,...(user ? localDismissals[user.id] : {})};
  const cards=useMemo(()=>{
    if(!user) return [];
    const start=subDays(startOfDay(new Date()),30), end=subDays(startOfDay(new Date()),1);
    const events=plannerEvents.filter(e=>e.creatorId!==e.userId && (e.creatorId===user.id||e.userId===user.id));
    const candidates=new Map<string,{event:PlannerEvent;day:string}>();
    const add=(event:PlannerEvent,day:string)=>{if(isValid(parseISO(day))) candidates.set(event.id+'_'+day,{event,day});};
    for(const owner of new Set(events.map(e=>e.userId))) {
      for(const row of getExpandedPlannerEvents(start,end,owner)) if(events.some(e=>e.id===row.event.id)) add(row.event,format(row.eventDate,'yyyy-MM-dd'));
    }
    for(const event of events){
      const date=parseISO(event.date);if(isValid(date))add(event,format(date,'yyyy-MM-dd'));
      Object.keys(event.instanceStatuses || {}).forEach(day=>add(event,day));
      for(const block of dailyPlannerComments) if(block.id===block.day+'_'+event.userId && Object.values(block.comments||{}).some(c=>c.eventId===event.id))add(event,block.day);
    }
    const today=format(new Date(),'yyyy-MM-dd');
    return [...candidates.values()].map(({event,day})=>reviewItem(event,day,Object.values(dailyPlannerComments.find(c=>c.id===day+'_'+event.userId)?.comments||{}),user.id,day<today && day>=format(start,'yyyy-MM-dd'),dismissals[event.id+'_'+day],!!viewer?.dismissedPendingUpdates?.[event.id+'_'+day])).filter((r):r is ReviewItem=>!!r).sort((a,b)=>b.day.localeCompare(a.day));
  },[user,plannerEvents,dailyPlannerComments,getExpandedPlannerEvents,viewer,JSON.stringify(dismissals)]);
  const person=(id:string)=>users.find(u=>u.id===id)?.name||'Former user';
  const counts=(state:ReviewState)=>cards.filter(c=>c.state===state).length;
  const filtered=cards.filter(c=>(tab==='all'||tab===c.state)&&[c.event.title,person(c.event.userId),person(c.event.creatorId),...c.comments.map(m=>m.text)].join(' ').toLowerCase().includes(query.toLowerCase().trim()));
  const dismiss=async(items:ReviewItem[],markRead=false)=>{
    if(!user||busy) return;
    setBusy(markRead?'read':'dismiss');
    const versions=Object.fromEntries(items.map(c=>[c.key,c.version]));
    const changes:Record<string,string|boolean>={};
    for(const item of items){
      changes[`users/${user.id}/delegatedReviewDismissals/${item.key}`]=item.version;
      if(markRead){
        for(const comment of item.unread)changes[`dailyPlannerComments/${item.day}_${item.event.userId}/comments/${comment.id}/viewedBy/${user.id}`]=true;
        changes[`plannerEvents/${item.event.id}/viewedBy/${user.id}`]=true;
      }
    }
    try{await update(ref(rtdb),changes);setLocalDismissals(p=>({...p,[user.id]:{...p[user.id],...versions}}));}
    catch{toast({variant:'destructive',title:'Could not save dismissal',description:'Please try again. Your notifications are still available.'});}
    finally{setBusy(null);}
  };
  const send=async(item:ReviewItem)=>{
    const text=drafts[item.key]?.trim();if(!text||busy)return;
    setBusy(item.key);
    try{await addPlannerEventComment(item.event.userId,item.day,item.event.id,text);setDrafts(p=>({...p,[item.key]:''}));toast({title:'Request saved',description:'Your follow-up is now in the task conversation.'});}
    catch{toast({variant:'destructive',title:'Message not saved',description:'Your draft has been kept. Please try again.'});}
    finally{setBusy(null);}
  };
  const dialogs=<>{viewing&&<EventInstanceDialog key={viewing.key} isOpen setIsOpen={()=>setViewing(null)} event={plannerEvents.find(e=>e.id===viewing.event.id)||viewing.event} date={parseISO(viewing.day)} plannerUserId={viewing.event.userId} onEdit={setEditing}/>} {editing&&<EditEventDialog isOpen setIsOpen={()=>setEditing(null)} event={editing}/>}</>;
  if(!user)return null;
  if(!cards.length)return dialogs;
  return <>
    <section className={styles.review} aria-label="Delegated Event Review">
      <details className={styles.accordion}>
        <summary className={styles.accordionTrigger}>
          <span className={styles.compactHeading}><MessageSquare size={20} aria-hidden="true"/><span>Delegated Event Review <small>{cards.length} notifications · Expand to view</small></span></span>
          <span className={styles.compactCounts}>
            <span data-tone="amber">{counts('needs-update')} Needs update</span>
            <span data-tone="slate">{counts('awaiting-reply')} Awaiting reply</span>
            <span data-tone="blue">{counts('new-reply')} New replies / updates</span>
          </span>
          <ChevronDown size={19} className={styles.accordionChevron} aria-hidden="true"/>
        </summary>
        <div className={styles.body}>
          <div className={styles.expandedActions}>
            <p className={styles.expandedHint}><Info size={16}/>Dismiss hides notifications only. Tasks and conversations stay saved.</p>
            <button className={styles.secondaryButton} disabled={!!busy} onClick={()=>dismiss(cards)}><X size={17}/>Dismiss all</button>
          </div>
        <div className={styles.toolbar}><nav aria-label="Review filters">{([['all','All',cards.length],['needs-update','Needs update',counts('needs-update')],['awaiting-reply','Awaiting reply',counts('awaiting-reply')],['new-reply','New replies / updates',counts('new-reply')]] as const).map(([key,label,count])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label} ({count})</button>)}</nav><label className={styles.search}><Search size={17}/><input aria-label="Search delegated events" placeholder="Search task or person…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>
        <div className={styles.cards}>
          {!filtered.length&&<p className={styles.empty}>No events match this view. Choose All or clear your search.</p>}
          {filtered.map(item=>{
            const assignee=person(item.event.userId);const lastRequest=[...item.comments].reverse().find(c=>c.userId===item.event.creatorId);const mine=item.event.creatorId===user.id;
            return <article className={styles.item} key={item.key}>
              <span className={styles.avatar} data-tone={item.state}>{assignee.split(' ').map(n=>n[0]).slice(0,2).join('')}</span>
              <div className={styles.itemBody}>
                <div className={styles.itemHeader}><div><h3>{item.event.title}</h3><div className={styles.meta}><span><UserRound size={14}/>{mine?'Assigned to '+assignee:'From '+person(item.event.creatorId)}</span><span><CalendarDays size={14}/>Task date: {format(parseISO(item.day),'dd MMM yyyy')}</span><span className={styles.pill} data-state={item.state}>{labels[item.state]}</span></div></div><button className={styles.secondaryButton} disabled={!!busy} onClick={()=>dismiss([item])}><X size={15}/>Dismiss event</button></div>
                {item.state==='needs-update'&&<><div className={styles.message}>No update received for this task.</div><div className={styles.composer}><textarea aria-label={'Request an update for '+item.event.title} placeholder="Write a request for an update…" rows={1} value={drafts[item.key]||''} disabled={!!busy} onChange={e=>setDrafts(p=>({...p,[item.key]:e.target.value}))}/><button className={styles.secondaryButton} onClick={()=>setViewing(item)}><ExternalLink size={16}/>View task</button><button className={styles.primary} disabled={!!busy||!drafts[item.key]?.trim()} onClick={()=>send(item)}><Send size={16}/>{busy===item.key?'Saving…':'Request update'}</button></div></>}
                {item.state==='awaiting-reply'&&<><div className={styles.message}><strong>Your last request <small>· {lastRequest&&format(parseISO(lastRequest.date),'dd MMM, HH:mm')}</small></strong><p>{lastRequest?.text}</p></div><footer className={styles.footer}><span><Clock size={15}/>Request sent · No reply received yet</span><div><button className={styles.secondaryButton} onClick={()=>setViewing(item)}><MessageSquare size={16}/>View conversation</button><button className={styles.primary} onClick={()=>setViewing(item)}><Send size={16}/>Send follow-up</button></div></footer></>}
                {item.state==='new-reply'&&<><div className={styles.history}>{item.comments.length?item.comments.slice(-2).map(comment=><div key={comment.id} className={styles.message}><strong>{comment.userId===user.id?'You':person(comment.userId)} <small>· {format(parseISO(comment.date),'dd MMM, HH:mm')}</small></strong><p>{comment.text}</p></div>):<div className={styles.message}>A delegated task was added or updated. Open the task to review its details.</div>}</div><footer className={styles.footer}><span><MessageSquare size={15}/>{item.comments.length} messages · Saved in task history</span><div><button className={styles.secondaryButton} disabled={!!busy} onClick={()=>dismiss([item],true)}><CheckCircle size={16}/>Mark as read</button><button className={styles.secondaryButton} onClick={()=>setViewing(item)}>View conversation</button><button className={styles.primary} onClick={()=>setViewing(item)}>Reply</button></div></footer></>}
              </div>
            </article>;
          })}
        </div>
        <p className={styles.notice}><Bell size={16}/>Dismissed events return only when they receive a new notification or update.</p>
      </div>
      </details>
    </section>{dialogs}
  </>;
}
