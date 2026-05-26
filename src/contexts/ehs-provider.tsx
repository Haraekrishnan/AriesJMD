'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import type { EhsAudit, EhsIncident, EhsRiskAssessment, EhsTraining, EhsAuditStatus, EhsIncidentStatus, EhsSupportTicket, EhsContactInfo, Comment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';

type EhsContextType = {
  audits: EhsAudit[];
  incidents: EhsIncident[];
  riskAssessments: EhsRiskAssessment[];
  trainings: EhsTraining[];
  supportTickets: EhsSupportTicket[];
  contactInfo: EhsContactInfo;
  
  addAudit: (audit: Omit<EhsAudit, 'id'>) => void;
  addIncident: (incident: Omit<EhsIncident, 'id'>) => void;
  addRiskAssessment: (ra: Omit<EhsRiskAssessment, 'id'>) => void;
  addTraining: (training: Omit<EhsTraining, 'id'>) => void;
  
  reviewAudit: (auditId: string, status: 'Approved' | 'Rejected', comment: string) => void;
  updateIncidentStatus: (incidentId: string, status: EhsIncidentStatus, notes: string) => void;
  
  addSupportTicket: (ticket: Omit<EhsSupportTicket, 'id' | 'requesterId' | 'createdAt' | 'status' | 'comments'>) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: EhsSupportTicket['status']) => void;
  addTicketComment: (ticketId: string, text: string) => void;
  updateContactInfo: (info: Partial<EhsContactInfo>) => void;
  
  stats: {
    totalIncidents: number;
    totalLTIs: number;
    avgAuditScore: number;
    trainingHours: number;
  };
};

const EhsContext = createContext<EhsContextType | undefined>(undefined);

export function EhsProvider({ children }: { children: ReactNode }) {
  const { user, users } = useAuth();
  const { toast } = useToast();
  const { notificationSettings } = useGeneral();
  
  const [audits, setAudits] = useState<EhsAudit[]>([]);
  const [incidents, setIncidents] = useState<EhsIncident[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<EhsRiskAssessment[]>([]);
  const [trainings, setTrainings] = useState<EhsTraining[]>([]);
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
        to: emails,
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

  const updateContactInfo = useCallback((info: Partial<EhsContactInfo>) => {
    if (user?.role !== 'Admin' && user?.role !== 'Senior Safety Supervisor') return;
    update(ref(rtdb, 'ehs/contactInfo'), info);
    toast({ title: 'Contact Info Updated' });
  }, [user, toast]);

  const stats = useMemo(() => {
    const totalLTIs = incidents.filter(i => i.type === 'LTI').length;
    const approvedAudits = audits.filter(a => a.status === 'Approved');
    const avgAuditScore = approvedAudits.length > 0 
      ? approvedAudits.reduce((sum, a) => sum + a.score, 0) / approvedAudits.length 
      : 0;
    
    return {
      totalIncidents: incidents.length,
      totalLTIs,
      avgAuditScore,
      trainingHours: trainings.length * 2,
    };
  }, [incidents, audits, trainings]);

  return (
    <EhsContext.Provider value={{ audits, incidents, riskAssessments, trainings, supportTickets, contactInfo, addAudit, addIncident, addRiskAssessment, addTraining, reviewAudit, updateIncidentStatus, addSupportTicket, updateTicketStatus, addTicketComment, updateContactInfo, stats }}>
      {children}
    </EhsContext.Provider>
  );
}

export const useEhs = () => {
  const context = useContext(EhsContext);
  if (!context) throw new Error('useEhs must be used within EhsProvider');
  return context;
};
