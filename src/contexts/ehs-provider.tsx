'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import type { EhsAudit, EhsIncident, EhsRiskAssessment, EhsTraining, EhsAuditStatus, EhsIncidentStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type EhsContextType = {
  audits: EhsAudit[];
  incidents: EhsIncident[];
  riskAssessments: EhsRiskAssessment[];
  trainings: EhsTraining[];
  
  addAudit: (audit: Omit<EhsAudit, 'id'>) => void;
  addIncident: (incident: Omit<EhsIncident, 'id'>) => void;
  addRiskAssessment: (ra: Omit<EhsRiskAssessment, 'id'>) => void;
  addTraining: (training: Omit<EhsTraining, 'id'>) => void;
  
  reviewAudit: (auditId: string, status: 'Approved' | 'Rejected', comment: string) => void;
  updateIncidentStatus: (incidentId: string, status: EhsIncidentStatus, notes: string) => void;
  
  stats: {
    totalIncidents: number;
    totalLTIs: number;
    avgAuditScore: number;
    trainingHours: number;
  };
};

const EhsContext = createContext<EhsContextType | undefined>(undefined);

export function EhsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [audits, setAudits] = useState<EhsAudit[]>([]);
  const [incidents, setIncidents] = useState<EhsIncident[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<EhsRiskAssessment[]>([]);
  const [trainings, setTrainings] = useState<EhsTraining[]>([]);

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

    return () => {
      unsubAudits();
      unsubIncidents();
      unsubRA();
      unsubTrainings();
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
    <EhsContext.Provider value={{ audits, incidents, riskAssessments, trainings, addAudit, addIncident, addRiskAssessment, addTraining, reviewAudit, updateIncidentStatus, stats }}>
      {children}
    </EhsContext.Provider>
  );
}

export const useEhs = () => {
  const context = useContext(EhsContext);
  if (!context) throw new Error('useEhs must be used within EhsProvider');
  return context;
};
