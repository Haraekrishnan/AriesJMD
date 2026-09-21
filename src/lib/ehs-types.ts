export type EhsAuditStatus = 'Pending Review' | 'Approved' | 'Rejected';
export type EhsIncidentStatus = 'Open' | 'Under Investigation' | 'Closed';
export type EhsAudit = {
  id: string;
  title: string;
  type: 'Safety' | 'Environmental' | 'Health' | 'Fire';
  projectId: string;
  date: string;
  score: number;
  inspectorId: string;
  findings: string[];
  status: EhsAuditStatus;
  supervisorComment?: string;
  reviewedById?: string;
  reviewDate?: string;
};
export type EhsIncident = {
  id: string;
  type:
    | 'Near Miss'
    | 'Minor Injury'
    | 'LTI'
    | 'Fatality'
    | 'Environmental'
    | 'Property Damage';
  date: string;
  projectId: string;
  location: string;
  description: string;
  immediateActions: string;
  reporterId: string;
  status: EhsIncidentStatus;
  resolutionNotes?: string;
  reviewedById?: string;
  reviewDate?: string;
};
export type EhsRiskAssessment = {
  id: string;
  activityName: string;
  projectId: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  hazards: string[];
  controls: string[];
  reviewedBy: string;
  reviewDate: string;
};
export type EhsTraining = {
  id: string;
  topic: string;
  type: 'Induction' | 'Toolbox' | 'Specialized';
  date: string;
  trainer: string;
  attendees: string[];
};
export type EhsSupportTicket = {
  id: string;
  requesterId: string;
  createdAt: string;
  category: string;
  urgency: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  comments?: Record<
    string,
    { userId: string; text: string; date: string; eventId?: string }
  >;
};
export type EhsContactInfo = {
  hotline: string;
  email: string;
  liveChat: string;
};
