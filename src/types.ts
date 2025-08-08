
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  password?: string;
  supervisorId?: string;
  projectId?: string;
  planningScore?: number;
};

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Pending Approval' | 'Overdue' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High';
export type ApprovalState = 'none' | 'pending' | 'approved' | 'returned';

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string; // Keep single for now for simplicity in UI
  assigneeIds: string[]; // For potential future multiple assignees
  creatorId: string;
  dueDate: string; // ISO String
  priority: Priority;
  comments: Comment[];
  isViewedByAssignee?: boolean;
  requiresAttachmentForCompletion?: boolean;
  attachment?: {
    name: string;
    url: string; // data URI
  };
  approvalState: ApprovalState;
  pendingStatus?: TaskStatus;
  previousStatus?: TaskStatus;
  completionDate?: string; // ISO String
  pendingAssigneeId?: string;
};

export type Frequency = 'once' | 'daily' | 'weekly' | 'weekends' | 'monthly' | 'daily-except-sundays';

export type PlannerEvent = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO String of the start date
  userId: string; // Who the event is for
  creatorId: string; // Who created the event
  frequency: Frequency;
  comments: Comment[];
};


export type AchievementStatus = 'pending' | 'approved' | 'rejected';

export type Achievement = {
  id: string;
  userId: string;
  title: string;
  description:string;
  points: number;
  date: string; // YYYY-MM-DD
  type: 'system' | 'manual';
  status: AchievementStatus;
  awardedById?: string; // Manager's user ID for manual awards
};


export const ALL_PERMISSIONS = [
  'manage_users',
  'manage_roles',
  'manage_projects',
  'manage_branding',
  'manage_tasks',
  'manage_planner',
  'manage_incidents',
  'manage_achievements',
  'manage_vehicles',
  'manage_manpower',
  'manage_manpower_list',
  'approve_store_requests',
  'manage_inventory',
  'manage_equipment_status',
  'manage_announcements',
  'view_performance_reports',
  'view_activity_logs',
  'manage_accommodation',
  'log_manpower'
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type Role = string;

export type RoleDefinition = {
  id: string;
  name: string;
  permissions: readonly Permission[] | Permission[];
  isEditable?: boolean;
};

export type Project = {
  id: string;
  name: string;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
};

export type Vehicle = {
  id:string;
  vehicleNumber: string;
  driverId: string;
  vapValidity?: string; // YYYY-MM-DD
  insuranceValidity?: string; // YYYY-MM-DD
  fitnessValidity?: string; // YYYY-MM-DD
  taxValidity?: string; // YYYY-MM-DD
  puccValidity?: string; // YYYY-MM-DD
};

export type Driver = {
  id: string;
  name: string;
  photo: string;
  licenseNumber: string;
  epNumber?: string;
  sdpNumber?: string;
  epExpiry?: string;
  medicalExpiry?: string;
  safetyExpiry?: string;
  sdpExpiry?: string;
  woExpiry?: string;
  labourContractExpiry?: string;
  wcPolicyExpiry?: string;
};

export type IncidentStatus = 'New' | 'Under Investigation' | 'Action Pending' | 'Resolved' | 'Closed';

export type Comment = {
  id: string;
  userId: string;
  text: string;
  date: string; // ISO String
  isRead?: boolean;
};

export type IncidentReport = {
    id: string;
    reporterId: string;
    reportTime: string; // ISO string
    incidentTime: string; // ISO string
    projectId: string;
    unitArea: string;
    incidentDetails: string;
    status: IncidentStatus;
    reportedToUserIds: string[];
    isPublished: boolean;
    comments: Comment[];
};


export type ManpowerTrade = {
  id: string;
  name: string;
  trade: string;
  company: string;
};

export type Trade = 'Welder' | 'Fabricator' | 'Electrician' | 'Painter' | 'Scaffolder' | 'Rope Access Tech';

export type DocumentStatus = 'Pending' | 'Collected' | 'Submitted' | 'Received';

export type ManpowerDocument = {
    name: string;
    details?: string;
    status: DocumentStatus;
};

export type LeaveRecord = {
    id: string;
    leaveType?: 'Emergency' | 'Annual';
    leaveStartDate: string; // ISO String
    plannedEndDate?: string; // ISO String
    leaveEndDate?: string; // ISO String
    rejoinedDate?: string; // ISO String
};

export type Skill = {
    name: string;
    details: string;
    link?: string;
};

export type ManpowerProfile = {
  id: string;
  name: string;
  trade: Trade;
  status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated';
  photo?: string;
  
  // Identifiers
  hardCopyFileNo?: string;
  documentFolderUrl?: string;
  epNumber?: string;
  plantName?: string;
  eicName?: string;
  
  // Documents and Skills
  documents: ManpowerDocument[];
  skills?: Skill[];

  // Validity Dates
  passIssueDate?: string; // ISO
  joiningDate?: string; // ISO
  woValidity?: string; // ISO
  wcPolicyValidity?: string; // ISO
  labourContractValidity?: string; // ISO
  medicalExpiryDate?: string; // ISO
  safetyExpiryDate?: string; // ISO
  irataValidity?: string; // ISO
  contractValidity?: string; // ISO
  
  // Leave and Termination
  leaveHistory?: LeaveRecord[];
  terminationDate?: string; // ISO
  resignationDate?: string; // ISO
  feedback?: string;

  // Remarks
  remarks?: string;
};


export type ManpowerLog = {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  countIn: number;
  personInName?: string;
  countOut: number;
  personOutName?: string;
  reason: string;
  updatedBy: string;
};

export type InternalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued';

export type InternalRequest = {
  id: string;
  requesterId: string;
  date: string; // YYYY-MM-DD
  items: {
    description: string;
    quantity: number;
    remarks: string;
  }[];
  status: InternalRequestStatus;
  approverId?: string;
};

export type ManagementRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ManagementRequest = {
    id: string;
    requesterId: string;
    recipientId: string;
    date: string;
    subject: string;
    body: string;
    status: ManagementRequestStatus;
}

export type InventoryItemStatus = 'In Use' | 'In Store' | 'Damaged' | 'Expired';

export type InventoryItem = {
  id: string;
  name: string;
  serialNumber: string;
  ariesId?: string;
  chestCrollNo?: string;
  status: InventoryItemStatus;
  projectId: string;
  inspectionDate: string; // ISO string
  inspectionDueDate: string; // ISO string
  tpInspectionDueDate: string; // ISO string
  lastUpdated: string; // ISO string
  remarks?: string;
};

export type UTMachine = {
  id: string;
  machineName: string;
  serialNumber: string;
  calibrationDueDate: string; // YYYY-MM-DD
};

export type DftMachine = {
    id: string;
    machineName: string;
    serialNumber: string;
    projectId: string;
    unit: string;
    calibrationDueDate: string; // ISO String
    probeDetails: string;
    cableDetails: string;
    status: string;
};

export type MobileSimStatus = 'Active' | 'Inactive' | 'Returned';

export type MobileSim = {
  id: string;
  type: 'Mobile' | 'SIM';
  provider: string;
  number: string;
  allottedToUserId: string;
  allotmentDate: string; // ISO string
  projectId: string;
  status: MobileSimStatus;
  remarks?: string;
};

export type OtherEquipment = {
    id: string;
    equipmentName: string;
    serialNumber: string;
    allottedTo: string; // User ID
    remarks?: string;
};

export type MachineLog = {
    id: string;
    machineId: string;
    userId: string;
    date: string; // YYYY-MM-DD
    fromTime: string; // HH:mm
    toTime: string; // HH:mm
    location: string;
    jobDescription: string;
    startingKm?: number;
    endingKm?: number;
};


export type InventoryTransferRequest = {
  id: string;
  requesterId: string;
  fromProjectId: string;
  toProjectId: string;
  items: { itemId: string; serialNumber: string; name: string }[];
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string; // ISO String
  comments: Comment[];
  approverId?: string;
};

export type CertificateRequestType = 'Calibration Certificate' | 'TP Certificate' | 'Inspection Certificate';
export type CertificateRequestStatus = 'Pending' | 'Completed' | 'Rejected';

export type CertificateRequest = {
  id: string;
  requesterId: string;
  requestType: CertificateRequestType;
  itemId?: string; // For InventoryItem
  utMachineId?: string; // For UTMachine
  status: CertificateRequestStatus;
  requestDate: string; // ISO String
  completionDate?: string; // ISO String
  remarks?: string;
  comments: Comment[];
  viewedByRequester?: boolean;
};

export type AnnouncementStatus = 'pending' | 'approved' | 'rejected' | 'returned';

export type Announcement = {
  id: string;
  title: string;
  content: string;
  creatorId: string;
  approverId: string;
  status: AnnouncementStatus;
  createdAt: string; // ISO String
  comments: {
    userId: string;
    text: string;
    date: string;
  }[];
};

export type DailyPlannerComment = {
  id: string;
  plannerUserId: string; // The user whose planner this comment belongs to
  day: string; // YYYY-MM-DD
  comments: Comment[];
  lastUpdated: string;
  viewedBy: string[];
};

export type Bed = {
  id: string;
  bedNumber: string;
  bedType: 'Bunk' | 'Single';
  occupantId?: string; // ManpowerProfile ID
};

export type Room = {
  id: string;
  roomNumber: string;
  beds: Bed[];
};

export type Building = {
  id: string;
  buildingNumber: string;
  rooms: Room[];
};
