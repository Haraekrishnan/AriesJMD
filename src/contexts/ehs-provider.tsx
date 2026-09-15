
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import type { 
  EhsAudit, 
  EhsIncident, 
  EhsRiskAssessment, 
  EhsTraining, 
  EhsAuditStatus, 
  EhsIncidentStatus, 
  EhsSupportTicket, 
  EhsContactInfo, 
  EhsObservation, 
  CapaStage,
  CapaStageRecord,
  Comment 
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';

type EhsContextType = {
  audits: EhsAudit[];
  incidents: EhsIncident[];
  riskAssessments: EhsRiskAssessment[];
  trainings: EhsTraining[];
  observations: EhsObservation[];
  supportTickets: EhsSupportTicket[];
  contactInfo: EhsContactInfo;
  
  addAudit: (audit: Omit<EhsAudit, 'id'>) => void;
  addIncident: (incident: Omit<EhsIncident, 'id'>) => void;
  addRiskAssessment: (ra: Omit<EhsRiskAssessment, 'id'>) => void;
  addTraining: (training: Omit<EhsTraining, 'id'>) => void;
  
  // CAPA Management
  addObservation: (observation: Omit<EhsObservation, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => void;
  splitObservation: (parentId: string, subObservations: { category: any, severity: any, description: string, assigneeId?: string }[]) => void;
  assignStageOwner: (observationId: string, stage: CapaStage, assigneeId: string) => void;
  actionStage: (observationId: string, stage: CapaStage, data: any, attachmentUrl?: string) => void;
  reviewStage: (observationId: string, stage: CapaStage, status: 'Completed' | 'Returned', comment: string) => void;
  addStageComment: (observationId: string, stage: CapaStage, text: string) => void;
  addCcToObservation: (observationId: string, userIds: string[]) => void;
  addStageAttachment: (observationId: string, stage: CapaStage, name: string, url: string) => void;
  deleteObservation: (observationId: string) => void;
  
  reviewAudit: (auditId: string, status: 'Approved' | 'Rejected', comment: string) => void;
  updateIncidentStatus: (incidentId: string, status: EhsIncidentStatus, notes: string) => void;
  
  addSupportTicket: (ticket: Omit<EhsSupportTicket, 'id' | 'requesterId' | 'createdAt' | 'status' | 'comments'>) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: EhsSupportTicket['status']) => void;
  addTicketComment: (ticketId: string, text: string) => void;
  deleteSupportTicket: (ticketId: string) => void;
  updateContactInfo: (info: Partial<EhsContactInfo>) => void;
  
  stats: {
    totalIncidents: number;
    totalLTIs: number;
    avgAuditScore: number;
    trainingHours: number;
    openObservations: number;
  };
};

const EhsContext = createContext<EhsContextType | undefined>(undefined);

const CAPA_STAGES: CapaStage[] = ['Initiation', 'Investigation', 'Resolution', 'Implementation', 'Effectiveness Review', 'Reference', 'Closure'];

const generateInitialStages = (creatorId: string): Record<CapaStage, CapaStageRecord> => {
    const stages: any = {};
    CAPA_STAGES.forEach(stage => {
        stages[stage] = {
            status: 'Pending',
            assignedAt: stage === 'Initiation' ? new Date().toISOString() : null,
            assignedById: stage === 'Initiation' ? creatorId : null,
            assigneeId: stage === 'Initiation' ? creatorId : null,
        };
    });
    return stages;
};

export function EhsProvider({ children }: { children: ReactNode }) {
  const { user, users } = useAuth();
  const { toast } = useToast();
  const { notificationSettings } = useGeneral();
  
  const [audits, setAudits] = useState<EhsAudit[]>([]);
  const [incidents, setIncidents] = useState<EhsIncident[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<EhsRiskAssessment[]>([]);
  const [trainings, setTrainings] = useState<EhsTraining[]>([]);
  const [observations, setObservations] = useState<EhsObservation[]>([]);
  const [supportTickets, setSupportTickets] = useState<EhsSupportTicket[]>([]);
  const [contactInfo, setContactInfo] = useState<EhsContactInfo>({
    hotline: '+91 966 209 5558',
    email: 'safety.hq@ariesmar.com',
    liveChat: 'EHS Live Chat'
  });

  useEffect(() => {
    const unsubAudits = onValue(ref(rtdb, 'ehs/audits'), (snap) => {
      const val = snap.val() || {};
      setAudits(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubIncidents = onValue(ref(rtdb, 'ehs/incidents'), (snap) => {
      const val = snap.val() || {};
      setIncidents(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubRA = onValue(ref(rtdb, 'ehs/riskAssessments'), (snap) => {
      const val = snap.val() || {};
      setRiskAssessments(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubTrainings = onValue(ref(rtdb, 'ehs/trainings'), (snap) => {
      const val = snap.val() || {};
      setTrainings(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubObservations = onValue(ref(rtdb, 'ehs/observations'), (snap) => {
      const val = snap.val() || {};
      setObservations(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubTickets = onValue(ref(rtdb, 'ehs/supportTickets'), (snap) => {
      const val = snap.val() || {};
      setSupportTickets(Object.keys(val).map(k => ({ ...val[k], id: k })));
    });
    const unsubContact = onValue(ref(rtdb, 'ehs/contactInfo'), (snap) => {
      const val = snap.val();
      if (val) setContactInfo(val);
    });

    return () => {
      unsubAudits();
      unsubIncidents();
      unsubRA();
      unsubTrainings();
      unsubObservations();
      unsubTickets();
      unsubContact();
    };
  }, []);

  const addAudit = useCallback((data: Omit<EhsAudit, 'id'>) => {
    push(ref(rtdb, 'ehs/audits'), {
      ...data,
      status: 'Pending Review' as EhsAuditStatus,
    });
  }, []);

  const addIncident = useCallback((data: Omit<EhsIncident, 'id'>) => {
    push(ref(rtdb, 'ehs/incidents'), {
      ...data,
      status: 'Open' as EhsIncidentStatus,
    });
  }, []);

  const addRiskAssessment = useCallback((data: Omit<EhsRiskAssessment, 'id'>) => {
    push(ref(rtdb, 'ehs/riskAssessments'), data);
  }, []);

  const addTraining = useCallback((data: Omit<EhsTraining, 'id'>) => {
    push(ref(rtdb, 'ehs/trainings'), data);
  }, []);

  // CAPA MANAGEMENT FUNCTIONS
  const addObservation = useCallback((data: Omit<EhsObservation, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'ehs/observations'));
    const now = new Date().toISOString();
    
    // Find Senior Safety Supervisor for direct routing
    const seniorSafetySupervisor = users.find(u => u.role === 'Senior Safety Supervisor' && u.status !== 'deactivated');
    const initialAssigneeId = seniorSafetySupervisor ? seniorSafetySupervisor.id : user.id;

    const stages = generateInitialStages(user.id);
    
    // 1. Mark initiation as completed (Reported by Anyone)
    stages['Initiation'].status = 'Completed';
    stages['Initiation'].actionedById = user.id;
    stages['Initiation'].actionedAt = now;
    stages['Initiation'].reviewedById = user.id;
    stages['Initiation'].reviewedAt = now;

    // 2. Route directly to Senior Safety Supervisor for 'Investigation' (New Order)
    stages['Investigation'].status = 'Pending';
    stages['Investigation'].assignedById = user.id;
    stages['Investigation'].assignedAt = now;
    stages['Investigation'].assigneeId = initialAssigneeId;

    const newObservation: Omit<EhsObservation, 'id'> = {
      ...data,
      reporterId: user.id,
      createdAt: now,
      currentStage: 'Investigation',
      status: 'Open',
      stages,
      ccUserIds: [],
    };
    
    set(newRef, JSON.parse(JSON.stringify(newObservation)));
    toast({ title: 'Safety Case Opened', description: `Case routed to ${seniorSafetySupervisor?.name || 'Safety HQ'} for Investigation.` });
  }, [user, users, toast]);

  const splitObservation = useCallback((parentId: string, subObservations: { category: any, severity: any, description: string, assigneeId?: string }[]) => {
    if (!user) return;
    const parent = observations.find(o => o.id === parentId);
    if (!parent) return;

    const seniorSafetySupervisor = users.find(u => u.role === 'Senior Safety Supervisor' && u.status !== 'deactivated');
    const defaultAssigneeId = seniorSafetySupervisor ? seniorSafetySupervisor.id : user.id;
    const now = new Date().toISOString();

    const updates: Record<string, any> = {};

    subObservations.forEach((sub, index) => {
        const newRef = push(ref(rtdb, 'ehs/observations'));
        const newId = newRef.key!;

        const stages = generateInitialStages(user.id);
        stages['Initiation'].status = 'Completed';
        stages['Initiation'].actionedById = user.id;
        stages['Initiation'].actionedAt = now;
        stages['Initiation'].reviewedById = user.id;
        stages['Initiation'].reviewedAt = now;

        stages['Investigation'].status = 'Pending';
        stages['Investigation'].assignedById = user.id;
        stages['Investigation'].assignedAt = now;
        // USE PROVIDED ASSIGNEE OR DEFAULT
        stages['Investigation'].assigneeId = (sub.assigneeId && sub.assigneeId !== 'unassigned') ? sub.assigneeId : defaultAssigneeId;

        const subObs: EhsObservation = {
            ...parent,
            id: newId,
            parentId: parentId,
            category: sub.category,
            severity: sub.severity,
            description: sub.description,
            createdAt: now,
            currentStage: 'Investigation',
            status: 'Open',
            stages,
            ccUserIds: parent.ccUserIds || [],
        };

        updates[`ehs/observations/${newId}`] = JSON.parse(JSON.stringify(subObs));
    });

    // Add system comment to parent
    const commentRef = push(ref(rtdb, `ehs/observations/${parentId}/stages/Initiation/comments`));
    updates[`ehs/observations/${parentId}/stages/Initiation/comments/${commentRef.key}`] = {
        id: commentRef.key,
        userId: user.id,
        text: `Observation split into ${subObservations.length} sub-cases for focused management.`,
        date: now
    };

    update(ref(rtdb), updates);
    toast({ title: 'Observation Split', description: `${subObservations.length} sub-cases created.` });
  }, [user, observations, users, toast]);

  const assignStageOwner = useCallback((observationId: string, stage: CapaStage, assigneeId: string) => {
    if (!user) return;
    const path = `ehs/observations/${observationId}/stages/${stage}`;
    const now = new Date().toISOString();
    const updates = {
      assigneeId,
      assignedById: user.id,
      assignedAt: now,
      status: 'Pending',
      actionedById: null, // Clear any previous action data
      actionedAt: null,
      reviewedById: null,
      reviewedAt: null,
    };
    update(ref(rtdb, path), updates);
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
    toast({ title: 'Stage Responsibility Assigned' });
  }, [user, toast]);

  const addStageComment = useCallback((observationId: string, stage: CapaStage, text: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const commentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/comments`));
    set(commentRef, {
        id: commentRef.key,
        userId: user.id,
        text,
        date: now
    });
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
  }, [user]);

  const actionStage = useCallback((observationId: string, stage: CapaStage, data: any, attachmentUrl?: string) => {
    if (!user) return;
    const path = `ehs/observations/${observationId}/stages/${stage}`;
    const now = new Date().toISOString();
    
    const isClosure = stage === 'Closure';

    const updates: any = {
      actionedById: user.id,
      actionedAt: now,
      status: isClosure ? 'Completed' : 'In Progress', 
      data: data || null
    };

    if (attachmentUrl) {
       const attachmentRef = push(ref(rtdb, `${path}/attachments`));
       updates[`attachments/${attachmentRef.key}`] = {
           id: attachmentRef.key,
           name: 'Evidence Attachment',
           url: attachmentUrl,
           uploadedBy: user.id,
           uploadedAt: now
       };
    }

    if (isClosure) {
      updates['reviewedById'] = user.id;
      updates['reviewedAt'] = now;
      update(ref(rtdb, `ehs/observations/${observationId}`), { status: 'Closed', closedAt: now, lastUpdated: now });
    }

    update(ref(rtdb, path), updates);
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
    
    if (isClosure) {
        toast({ title: 'Safety Case Closed', description: 'All remediation milestones have been achieved.' });
    } else {
        toast({ title: 'Action Recorded', description: 'Pending Official Review.' });
    }
  }, [user, toast]);

  const reviewStage = useCallback((observationId: string, stage: CapaStage, status: 'Completed' | 'Returned', comment: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const obsRef = ref(rtdb, `ehs/observations/${observationId}`);
    
    get(obsRef).then(snap => {
        const obs = snap.val() as EhsObservation;
        if (!obs) return;

        const updates: any = {};
        const stagePath = `stages/${stage}`;
        
        updates[`${stagePath}/status`] = status;
        updates[`${stagePath}/reviewedById`] = user.id;
        updates[`${stagePath}/reviewedAt`] = now;
        
        if (comment) {
            const commentRef = push(ref(rtdb, `ehs/observations/${observationId}/${stagePath}/comments`));
            updates[`${stagePath}/comments/${commentRef.key}`] = {
                id: commentRef.key,
                userId: user.id,
                text: status === 'Returned' ? `[REWORK REQUIRED] ${comment}` : comment,
                date: now
            };
        }

        if (status === 'Completed') {
            const currentIndex = CAPA_STAGES.indexOf(stage);
            const nextStage = CAPA_STAGES[currentIndex + 1];
            
            if (nextStage) {
                updates['currentStage'] = nextStage;
                updates[`stages/${nextStage}/status`] = 'Pending';
                updates[`stages/${nextStage}/assignedById`] = user.id;
                updates[`stages/${nextStage}/assignedAt`] = now;
                
                // NEW ROUTING LOGIC:
                // After Implementation, "Effectiveness Review", "Reference", and "Closure" stay with the Delegator/Admin.
                if (stage === 'Implementation' || stage === 'Effectiveness Review' || stage === 'Reference') {
                    updates[`stages/${nextStage}/assigneeId`] = user.id; // Assign to the person who just approved the previous technical step
                } else {
                    updates[`stages/${nextStage}/assigneeId`] = obs.stages[stage].assigneeId; 
                }
            } else {
                updates['status'] = 'Closed';
                updates['closedAt'] = now;
            }
        } else {
            // Returned - Reset action data to allow re-submission
            updates[`${stagePath}/actionedAt`] = null;
            updates[`${stagePath}/actionedById`] = null;
        }

        updates['lastUpdated'] = now;
        update(obsRef, updates);
        toast({ title: `Stage ${status}` });
    });
  }, [user, toast]);

  const addCcToObservation = useCallback((observationId: string, userIds: string[]) => {
    if (!user) return;
    const obsRef = ref(rtdb, `ehs/observations/${observationId}`);
    get(obsRef).then(snap => {
        const obs = snap.val() as EhsObservation;
        if (!obs) return;
        const currentCc = obs.ccUserIds || [];
        const updatedCc = Array.from(new Set([...currentCc, ...userIds]));
        update(obsRef, { ccUserIds: updatedCc, lastUpdated: new Date().toISOString() });
        toast({ title: 'Personnel Informed', description: `${userIds.length} users added to information loop.` });
    });
  }, [user, toast]);

  const addStageAttachment = useCallback((observationId: string, stage: CapaStage, name: string, url: string) => {
    if (!user) return;
    const attachmentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/attachments`));
    set(attachmentRef, {
        id: attachmentRef.key,
        name,
        url,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString()
    });
  }, [user]);

  const deleteObservation = useCallback((observationId: string) => {
    if (user?.role !== 'Admin') return;
    
    // Find children first to ensure hierarchical deletion
    const children = observations.filter(o => o.parentId === observationId);
    const updates: Record<string, any> = {};
    updates[`ehs/observations/${observationId}`] = null;
    children.forEach(child => {
        updates[`ehs/observations/${child.id}`] = null;
    });

    update(ref(rtdb), updates).then(() => {
        toast({ title: 'Record Deleted', variant: 'destructive' });
    });
  }, [user, observations, toast]);

  const reviewAudit = useCallback((auditId: string, status: 'Approved' | 'Rejected', comment: string) => {
    if (user?.role !== 'Senior Safety Supervisor' && user?.role !== 'Admin') {
      toast({ title: 'Access Denied', description: 'Only the higher official can review audits.', variant: 'destructive' });
      return;
    }

    update(ref(rtdb, `ehs/audits/${auditId}`), {
      status,
      supervisorComment: comment,
      reviewedById: user.id,
      reviewDate: new Date().toISOString(),
    });
    toast({ title: `Audit ${status}` });
  }, [user, toast]);

  const updateIncidentStatus = useCallback((incidentId: string, status: EhsIncidentStatus, notes: string) => {
    if (user?.role !== 'Senior Safety Supervisor' && user?.role !== 'Admin') {
      toast({ title: 'Access Denied', description: 'Only the higher official can update incident status.', variant: 'destructive' });
      return;
    }

    update(ref(rtdb, `ehs/incidents/${incidentId}`), {
      status,
      resolutionNotes: notes,
      reviewedById: user.id,
      reviewDate: new Date().toISOString(),
    });
    toast({ title: `Incident Status Updated: ${status}` });
  }, [user, toast]);

  const addSupportTicket = useCallback(async (data: Omit<EhsSupportTicket, 'id' | 'requesterId' | 'createdAt' | 'status' | 'comments'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'ehs/supportTickets'));
    const ticket: Omit<EhsSupportTicket, 'id'> = {
      ...data,
      requesterId: user.id,
      createdAt: new Date().toISOString(),
      status: 'Open',
    };
    await set(newRef, ticket);

    // Notify Senior Safety Supervisor
    const supervisors = users.filter(u => u.role === 'Senior Safety Supervisor');
    const emails = supervisors.map(s => s.email).filter(Boolean);
    
    if (emails.length > 0) {
      const htmlBody = `
        <p>A new EHS support ticket has been opened by <strong>${user.name}</strong>.</p>
        <p><strong>Category:</strong> ${data.category}</p>
        <p><strong>Urgency:</strong> ${data.urgency}</p>
        <p><strong>Description:</strong></p>
        <div style="padding: 10px; border-left: 3px solid #10b981; background: #f8fafc;">${data.description}</div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/ehs/support">View in Portal</a></p>
      `;
      sendNotificationEmail({
        to: [emails[0]], 
        subject: `[EHS Support] New ${data.urgency} Ticket: ${data.category}`,
        htmlBody,
        notificationSettings,
        event: 'onEhsSupportTicket',
        involvedUser: user,
      });
    }
  }, [user, users, notificationSettings]);

  const updateTicketStatus = useCallback((ticketId: string, status: EhsSupportTicket['status']) => {
    update(ref(rtdb, `ehs/supportTickets/${ticketId}`), { status });
  }, []);

  const addTicketComment = useCallback((ticketId: string, text: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `ehs/supportTickets/${ticketId}/comments`));
    set(newCommentRef, {
      userId: user.id,
      text,
      date: new Date().toISOString(),
      eventId: ticketId
    });
  }, [user]);

  const deleteSupportTicket = useCallback((ticketId: string) => {
    if (user?.role !== 'Admin') return;
    remove(ref(rtdb, `ehs/supportTickets/${ticketId}`));
    toast({ title: 'Ticket Deleted', variant: 'destructive' });
  }, [user, toast]);

  const updateContactInfo = useCallback((info: Partial<EhsContactInfo>) => {
    if (user?.role !== 'Admin' && user?.role === 'Senior Safety Supervisor') return;
    update(ref(rtdb, 'ehs/contactInfo'), info);
    toast({ title: 'Contact Info Updated' });
  }, [user, toast]);

  const stats = useMemo(() => {
    const totalIncidents = incidents.length;
    const totalLTIs = incidents.filter(i => i.type === 'LTI').length;
    const approvedAudits = audits.filter(a => a.status === 'Approved');
    const avgAuditScore = approvedAudits.length > 0 
      ? approvedAudits.reduce((sum, a) => sum + a.score, 0) / approvedAudits.length 
      : 0;
    
    return {
      totalIncidents,
      totalLTIs,
      avgAuditScore,
      trainingHours: trainings.length * 2,
      openObservations: observations.filter(o => o.status !== 'Closed').length,
    };
  }, [incidents, audits, trainings, observations]);

  return (
    <EhsContext.Provider value={{ 
        audits, incidents, riskAssessments, trainings, observations, supportTickets, contactInfo, 
        addAudit, addIncident, addRiskAssessment, addTraining, 
        addObservation, splitObservation, assignStageOwner, actionStage, reviewStage, addStageComment, addStageAttachment, addCcToObservation, deleteObservation,
        reviewAudit, updateIncidentStatus, addSupportTicket, updateTicketStatus, addTicketComment, deleteSupportTicket, updateContactInfo, stats 
    }}>
      {children}
    </EhsContext.Provider>
  );
}

export const useEhs = () => {
  const context = useContext(EhsContext);
  if (!context) throw new Error('useEhs must be used within EhsProvider');
  return context;
};
