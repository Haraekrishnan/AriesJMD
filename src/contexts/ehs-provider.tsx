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
  User,
  NotificationSettings
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { addHours, format } from 'date-fns';

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
  
  addObservation: (observation: Omit<EhsObservation, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => void;
  updateInitiationDetails: (observationId: string, updates: Partial<EhsObservation>) => Promise<void>;
  splitObservation: (parentId: string, subObservations: { category: any, severity: any, description: string, assigneeId?: string }[]) => void;
  assignStageOwner: (observationId: string, stage: CapaStage, assigneeId: string, targetDate?: string) => void;
  actionStage: (observationId: string, stage: CapaStage, data: any, isSubmit?: boolean, attachmentUrl?: string) => void;
  reviewStage: (observationId: string, stage: CapaStage, status: 'Completed' | 'Returned', comment: string, nextOwnerData?: { assigneeId: string, targetDate: string }) => void;
  addStageComment: (observationId: string, stage: CapaStage, text: string) => void;
  addCcToObservation: (observationId: string, userIds: string[]) => void;
  addStageAttachment: (observationId: string, stage: CapaStage, name: string, url: string) => void;
  deleteStageAttachment: (observationId: string, stage: CapaStage, attachmentId: string) => void;
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

const sanitizeData = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
    }));
};

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
      unsubAudits(); unsubIncidents(); unsubRA(); unsubTrainings(); unsubObservations(); unsubTickets(); unsubContact();
    };
  }, []);

  const addObservationActivity = useCallback((observationId: string, action: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const actRef = push(ref(rtdb, `ehs/observations/${observationId}/activities`));
    set(actRef, { id: actRef.key, userId: user.id, action, date: now });
  }, [user]);

  const addAudit = useCallback((data: Omit<EhsAudit, 'id'>) => {
    push(ref(rtdb, 'ehs/audits'), { ...data, status: 'Pending Review' as EhsAuditStatus });
  }, []);

  const addIncident = useCallback((data: Omit<EhsIncident, 'id'>) => {
    push(ref(rtdb, 'ehs/incidents'), { ...data, status: 'Open' as EhsIncidentStatus });
  }, []);

  const addRiskAssessment = useCallback((data: Omit<EhsRiskAssessment, 'id'>) => {
    push(ref(rtdb, 'ehs/riskAssessments'), data);
  }, []);

  const addObservation = useCallback((data: Omit<EhsObservation, 'id' | 'createdAt' | 'status' | 'currentStage' | 'stages'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'ehs/observations'));
    const now = new Date();
    const nowISO = now.toISOString();
    const seniorSafetySupervisor = users.find(u => u.role === 'Senior Safety Supervisor' && u.status !== 'deactivated');
    const initialAssigneeId = seniorSafetySupervisor ? seniorSafetySupervisor.id : user.id;
    const stages = generateInitialStages(user.id);
    
    stages['Initiation'].status = 'Completed';
    stages['Initiation'].actionedById = user.id;
    stages['Initiation'].actionedAt = nowISO;
    stages['Initiation'].reviewedById = user.id;
    stages['Initiation'].reviewedAt = nowISO;

    stages['Investigation'].status = 'Pending';
    stages['Investigation'].assignedById = user.id;
    stages['Investigation'].assignedAt = nowISO;
    stages['Investigation'].assigneeId = initialAssigneeId;
    stages['Investigation'].targetDate = addHours(now, 24).toISOString();

    const newObservation: Omit<EhsObservation, 'id'> = { 
        ...data, 
        reporterId: user.id, 
        createdAt: nowISO, 
        currentStage: 'Investigation', 
        status: 'Open', 
        stages, 
        ccUserIds: [],
        activities: {
            'init': { id: 'init', userId: user.id, action: 'Case initiated and discovery captured.', date: nowISO }
        }
    };
    set(newRef, sanitizeData(newObservation));
    toast({ title: 'Safety Case Opened', description: `Investigation deadline: ${format(addHours(now, 24), 'dd MMM, HH:mm')}` });
  }, [user, users, toast]);

  const updateInitiationDetails = useCallback(async (observationId: string, updates: Partial<EhsObservation>) => {
    if (!user) return;
    const obsRef = ref(rtdb, `ehs/observations/${observationId}`);
    const snap = await get(obsRef);
    if (!snap.exists()) return;
    const current = snap.val() as EhsObservation;
    const now = new Date().toISOString();
    const finalUpdates: any = { ...updates, lastUpdated: now };
    
    Object.keys(updates).forEach(field => {
        const oldValue = (current as any)[field];
        const newValue = (updates as any)[field];
        if (oldValue !== newValue) {
            const revRef = push(ref(rtdb, `ehs/observations/${observationId}/revisions`));
            finalUpdates[`revisions/${revRef.key}`] = { id: revRef.key!, date: now, userId: user.id, field, oldValue: oldValue === undefined ? null : oldValue, newValue: newValue === undefined ? null : newValue };
        }
    });

    try {
        await update(obsRef, sanitizeData(finalUpdates));
        addObservationActivity(observationId, 'Initiation metadata overwritten by Higher Official.');
        toast({ title: 'Initiation Details Updated' });
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  }, [user, toast, addObservationActivity]);

  const splitObservation = useCallback((parentId: string, subObservations: { category: any, severity: any, description: string, assigneeId?: string }[]) => {
    if (!user) return;
    const parent = observations.find(o => o.id === parentId);
    if (!parent) return;
    const seniorSafetySupervisor = users.find(u => u.role === 'Senior Safety Supervisor' && u.status !== 'deactivated');
    const defaultAssigneeId = seniorSafetySupervisor ? seniorSafetySupervisor.id : user.id;
    const now = new Date();
    const nowISO = now.toISOString();
    const updates: Record<string, any> = {};

    subObservations.forEach((sub, index) => {
        const newRef = push(ref(rtdb, 'ehs/observations'));
        const newId = newRef.key!;
        const stages = generateInitialStages(user.id);
        stages['Initiation'].status = 'Completed';
        stages['Initiation'].actionedById = user.id;
        stages['Initiation'].actionedAt = nowISO;
        stages['Initiation'].reviewedById = user.id;
        stages['Initiation'].reviewedAt = nowISO;
        stages['Investigation'].status = 'Pending';
        stages['Investigation'].assignedById = user.id;
        stages['Investigation'].assignedAt = nowISO;
        stages['Investigation'].assigneeId = (sub.assigneeId && sub.assigneeId !== 'unassigned') ? sub.assigneeId : defaultAssigneeId;
        stages['Investigation'].targetDate = addHours(now, 24).toISOString();
        const subObs: EhsObservation = { ...parent, id: newId, parentId: parentId, category: sub.category, severity: sub.severity, description: sub.description, createdAt: nowISO, currentStage: 'Investigation', status: 'Open', stages, ccUserIds: parent.ccUserIds || [] };
        updates[`ehs/observations/${newId}`] = sanitizeData(subObs);
    });

    const commentRef = push(ref(rtdb, `ehs/observations/${parentId}/stages/Initiation/comments`));
    updates[`ehs/observations/${parentId}/stages/Initiation/comments/${commentRef.key}`] = { id: commentRef.key, userId: user.id, text: `Observation split into ${subObservations.length} sub-cases.`, date: nowISO };
    update(ref(rtdb), updates);
    addObservationActivity(parentId, `Splitting case into ${subObservations.length} specific workflows.`);
    toast({ title: 'Observation Split' });
  }, [user, observations, users, toast, addObservationActivity]);

  const assignStageOwner = useCallback((observationId: string, stage: CapaStage, assigneeId: string, targetDate?: string) => {
    if (!user) return;
    const path = `ehs/observations/${observationId}/stages/${stage}`;
    const now = new Date().toISOString();
    const assigneeName = users.find(u => u.id === assigneeId)?.name || 'Personnel';
    const updates: any = { assigneeId, assignedById: user.id, assignedAt: now, status: 'Pending', actionedById: null, actionedAt: null, reviewedById: null, reviewedAt: null };
    if (targetDate) updates.targetDate = targetDate;
    update(ref(rtdb, path), sanitizeData(updates));
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
    
    const commentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/comments`));
    set(commentRef, { id: commentRef.key, userId: user.id, text: `Responsibility assigned to ${assigneeName}.`, date: now });
    
    addObservationActivity(observationId, `Assigned ${stage} phase to ${assigneeName}.`);
    toast({ title: 'Assignment Synchronized' });
  }, [user, users, toast, addObservationActivity]);

  const addStageComment = useCallback((observationId: string, stage: CapaStage, text: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const commentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/comments`));
    set(commentRef, { id: commentRef.key, userId: user.id, text, date: now });
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
  }, [user]);

  const actionStage = useCallback((observationId: string, stage: CapaStage, data: any, isSubmit: boolean = true, attachmentUrl?: string) => {
    if (!user) return;
    const path = `ehs/observations/${observationId}/stages/${stage}`;
    const now = new Date().toISOString();
    const updates: any = { data: sanitizeData(data) || null };
    if (isSubmit || stage === 'Closure') {
        updates.actionedById = user.id;
        updates.actionedAt = now;
        updates.status = stage === 'Closure' ? 'Completed' : 'In Progress';
        const commentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/comments`));
        updates[`comments/${commentRef.key}`] = { id: commentRef.key, userId: user.id, text: `Phase findings submitted for verification.`, date: now };
        addObservationActivity(observationId, `Submitted ${stage} data for Higher Official review.`);
    }
    if (attachmentUrl) {
       const attachmentRef = push(ref(rtdb, `${path}/attachments`));
       updates[`attachments/${attachmentRef.key}`] = { id: attachmentRef.key, name: 'Evidence Attachment', url: attachmentUrl, uploadedBy: user.id, uploadedAt: now };
    }
    if (stage === 'Closure') {
      updates['reviewedById'] = user.id; updates['reviewedAt'] = now;
      update(ref(rtdb, `ehs/observations/${observationId}`), { status: 'Closed', closedAt: now, lastUpdated: now });
      addObservationActivity(observationId, `Final safety case closure validated.`);
    }
    update(ref(rtdb, path), updates);
    update(ref(rtdb, `ehs/observations/${observationId}`), { lastUpdated: now });
    toast({ title: isSubmit ? 'Action Recorded' : 'Draft Saved' });
  }, [user, toast, addObservationActivity]);

  const reviewStage = useCallback((observationId: string, stage: CapaStage, status: 'Completed' | 'Returned', comment: string, nextOwnerData?: { assigneeId: string, targetDate: string }) => {
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
            updates[`${stagePath}/comments/${commentRef.key}`] = { id: commentRef.key, userId: user.id, text: status === 'Returned' ? `REWORK REQUIRED: ${comment}` : comment, date: now };
        }
        if (status === 'Completed') {
            addObservationActivity(observationId, `Verified ${stage} findings. Milestone complete.`);
            const nextStage = CAPA_STAGES[CAPA_STAGES.indexOf(stage) + 1];
            if (nextStage) {
                updates['currentStage'] = nextStage;
                updates[`stages/${nextStage}/status`] = 'Pending';
                updates[`stages/${nextStage}/assignedById`] = user.id;
                updates[`stages/${nextStage}/assignedAt`] = now;
                if (stage === 'Investigation' && nextOwnerData) { 
                    updates[`stages/${nextStage}/assigneeId`] = nextOwnerData.assigneeId; 
                    updates[`stages/${nextStage}/targetDate`] = nextOwnerData.targetDate; 
                }
                else if (stage === 'Resolution') { 
                    updates[`stages/${nextStage}/assigneeId`] = obs.stages['Resolution']?.assigneeId || null; 
                    updates[`stages/${nextStage}/targetDate`] = obs.stages['Resolution']?.targetDate || null; 
                }
                else if (['Implementation', 'Effectiveness Review'].includes(stage)) { 
                    updates[`stages/${nextStage}/assigneeId`] = obs.stages['Investigation']?.assigneeId || null; 
                }
                else if (stage === 'Reference') { 
                    updates[`stages/${nextStage}/assigneeId`] = obs.stages['Resolution']?.assigneeId || null; 
                }
                else { 
                    updates[`stages/${nextStage}/assigneeId`] = obs.stages[stage]?.assigneeId || null; 
                }
            }
        } else { 
            addObservationActivity(observationId, `Returned ${stage} for technical rework.`);
            updates[`${stagePath}/actionedAt`] = null; 
            updates[`${stagePath}/actionedById`] = null; 
            updates[`${stagePath}/status`] = 'Returned';
        }
        updates['lastUpdated'] = now;
        update(obsRef, sanitizeData(updates));
        toast({ title: `Stage ${status}` });
    });
  }, [user, toast, addObservationActivity]);

  const addCcToObservation = useCallback((observationId: string, userIds: string[]) => {
    if (!user) return;
    const obsRef = ref(rtdb, `ehs/observations/${observationId}`);
    get(obsRef).then(snap => {
        const obs = snap.val() as EhsObservation;
        if (!obs) return;
        const currentCc = obs.ccUserIds || [];
        const updatedCc = Array.from(new Set([...currentCc, ...userIds]));
        update(obsRef, { ccUserIds: updatedCc, lastUpdated: new Date().toISOString() });
    });
  }, [user]);

  const addStageAttachment = useCallback((observationId: string, stage: CapaStage, name: string, url: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const attachmentRef = push(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/attachments`));
    set(attachmentRef, { id: attachmentRef.key, name, url, uploadedBy: user.id, uploadedAt: now });
    addObservationActivity(observationId, `Uploaded document "${name}" to ${stage} registry.`);
  }, [user, addObservationActivity]);

  const deleteStageAttachment = useCallback((observationId: string, stage: CapaStage, attachmentId: string) => {
    remove(ref(rtdb, `ehs/observations/${observationId}/stages/${stage}/attachments/${attachmentId}`));
    addObservationActivity(observationId, `Removed document from ${stage} technical registry.`);
    toast({ title: 'Attachment Deleted', variant: 'destructive' });
  }, [toast, addObservationActivity]);

  const deleteObservation = useCallback((observationId: string) => {
    if (user?.role !== 'Admin') return;
    remove(ref(rtdb, `ehs/observations/${observationId}`));
    toast({ title: 'Record Wiped', variant: 'destructive' });
  }, [user, toast]);

  const reviewAudit = useCallback((auditId: string, status: 'Approved' | 'Rejected', comment: string) => {
    if (user?.role !== 'Senior Safety Supervisor' && user?.role !== 'Admin') return;
    update(ref(rtdb, `ehs/audits/${auditId}`), { status, supervisorComment: comment, reviewedById: user.id, reviewDate: new Date().toISOString() });
  }, [user]);

  const updateIncidentStatus = useCallback((incidentId: string, status: EhsIncidentStatus, notes: string) => {
    if (user?.role !== 'Senior Safety Supervisor' && user?.role !== 'Admin') return;
    update(ref(rtdb, `ehs/incidents/${incidentId}`), { status, resolutionNotes: notes, reviewedById: user.id, reviewDate: new Date().toISOString() });
  }, [user]);

  const addSupportTicket = useCallback(async (data: Omit<EhsSupportTicket, 'id' | 'requesterId' | 'createdAt' | 'status' | 'comments'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'ehs/supportTickets'));
    await set(newRef, { ...data, requesterId: user.id, createdAt: new Date().toISOString(), status: 'Open' });
  }, [user]);

  const updateTicketStatus = useCallback((ticketId: string, status: EhsSupportTicket['status']) => update(ref(rtdb, `ehs/supportTickets/${ticketId}`), { status }), []);
  const addTicketComment = useCallback((ticketId: string, text: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `ehs/supportTickets/${ticketId}/comments`));
    set(newCommentRef, { userId: user.id, text, date: new Date().toISOString(), eventId: ticketId });
  }, [user]);

  const deleteSupportTicket = useCallback((ticketId: string) => {
    if (user?.role !== 'Admin') return;
    remove(ref(rtdb, `ehs/supportTickets/${ticketId}`));
  }, [user]);

  const updateContactInfo = useCallback((info: Partial<EhsContactInfo>) => update(ref(rtdb, 'ehs/contactInfo'), info), []);

  const addTraining = useCallback((data: Omit<EhsTraining, 'id'>) => {
    push(ref(rtdb, 'ehs/trainings'), data);
  }, []);

  const stats = useMemo(() => {
    const totalIncidents = incidents.length;
    const totalLTIs = incidents.filter(i => i.type === 'LTI').length;
    const approvedAudits = audits.filter(a => a.status === 'Approved');
    const avgAuditScore = approvedAudits.length > 0 ? approvedAudits.reduce((sum, a) => sum + a.score, 0) / approvedAudits.length : 0;
    return { totalIncidents, totalLTIs, avgAuditScore, trainingHours: trainings.length * 2, openObservations: observations.filter(o => o.status !== 'Closed').length };
  }, [incidents, audits, trainings, observations]);

  return (
    <EhsContext.Provider value={{ 
        audits, incidents, riskAssessments, trainings, observations, supportTickets, contactInfo, 
        addAudit, addIncident, addRiskAssessment, addTraining, 
        addObservation, updateInitiationDetails, splitObservation, assignStageOwner, actionStage, reviewStage, addStageComment, addStageAttachment, deleteStageAttachment, addCcToObservation, deleteObservation,
        reviewAudit, updateIncidentStatus, addSupportTicket, updateTicketStatus, addTicketComment, deleteSupportTicket, updateContactInfo, stats 
    }}>{children}</EhsContext.Provider>
  );
}

export const useEhs = () => {
  const context = useContext(EhsContext);
  if (!context) throw new Error('useEhs must be used within EhsProvider');
  return context;
};
