

import type { User as FirebaseUser } from 'firebase/auth';

// User & Auth

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
  status?: 'active' | 'locked' | 'deactivated';
  projectIds?: string[];
  signatureUrl?: string;
  viewedBy?: { [key: string]: boolean };
  dismissedPendingUpdates?: { [key: string]: boolean };
  viewPreferences?: {
    jmsTracker: 'board' | 'list';
    timesheetTracker: 'board' | 'list';
  };
};

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Pending Approval' | 'Overdue' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High';
export type ApprovalState = 'none' | 'pending' | 'approved' | 'returned';

export type Subtask = {
    userId: string;
    status: 'To Do' | 'In Progress' | 'Done';
    updatedAt: string; // ISO string
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string; // Keep single for now for simplicity in UI
  assigneeIds: string[]; // For potential future multiple assignees
  creatorId: string;
  approverId?: string;
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
  participants?: string[];
  viewedBy?: { [key: string]: boolean };
  statusRequest?: {
    requestedBy: string;
    newStatus: TaskStatus;
    comment: string;
    date: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    attachment?: { name: string; url: string };
  };
  subtasks?: { [userId: string]: Subtask };
  link?: string;
  lastUpdated: string;
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
  viewedBy: { [key: string]: boolean };
};

export type DailyPlannerComment = {
  id: string; // Format: YYYY-MM-DD_plannerUserId
  plannerUserId: string; // The user whose planner this comment belongs to
  day: string; // YYYY-MM-DD
  comments: { [key: string]: Comment };
  lastUpdated: string;
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
  'view_manpower_list',
  'approve_store_requests',
  'manage_inventory',
  'view_inventory',
  'manage_equipment_status',
  'manage_equipments',
  'manage_announcements',
  'create_broadcast',
  'view_performance_reports',
  'view_activity_logs',
  'manage_accommodation',
  'log_manpower',
  'manage_job_schedule',
  'prepare_master_schedule',
  'manage_vendors',
  'manage_payments',
  'manage_ppe_request',
  'view_ppe_requests',
  'view_internal_store_request',
  'manage_store_requests',
  'manage_ppe_stock',
  'manage_job_record',
  'manage_tp_certification',
  'manage_purchase_register',
  'manage_igp_ogp',
  'manage_directives',
  'manage_downloads',
  'perform_inventory_inspection',
  'manage_user_lock_status',
  'manage_logbook',
  'manage_signatures',
  'view_inventory_database',
  'manage_inventory_database',
  'manage_vehicle_usage',
  'manage_job_progress',
  'view_job_progress',
  'view_all',
  'manage_safety_observations',
  'manage_delivery_notes',
  'manage_inward_outward',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type Role = 'Admin' | 'Manager' | 'Project Coordinator' | 'Supervisor' | 'Senior Safety Supervisor' | 'Safety Supervisor' | 'Junior Supervisor' | 'Junior HSE' | 'Team Member' | 'Store in Charge' | 'Assistant Store Incharge' | 'Document Controller' | 'PPE Inspector';

export type RoleDefinition = {
  id: string;
  name: Role;
  permissions: readonly Permission[] | Permission[];
  isEditable?: boolean;
};

export type Project = {
  id: string;
  name: string;
  isPlant?: boolean;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
};

export type NotificationEventKey =
  | 'onNewTask'
  | 'onTaskStatusUpdate'
  | 'onTaskStatusSubmitted'
  | 'onTaskApproved'
  | 'onTaskReturned'
  | 'onTaskComment'
  | 'onInternalRequest'
  | 'onInternalRequestUpdate'
  | 'onPpeRequest'
  | 'onPpeRequestUpdate'
  | 'onManagementRequest'
  | 'onPasswordReset';

export type NotificationSettings = {
  additionalRecipients?: string;
  events?: {
    [key in NotificationEventKey]?: {
      enabled: boolean;
      additionalRecipients?: string;
      notifyInvolvedUser?: boolean;
      notifyCreator?: boolean;
    };
  };
};

export type WorkOrder = {
  id: string;
  number: string;
  type: 'WO' | 'ARC/OTC';
};

export type VehicleStatus = 'Active' | 'In Maintenance' | 'Left the Project';
export type Vehicle = {
  id:string;
  vehicleNumber: string;
  driverId: string;
  vendorName?: string;
  vapNumber?: string;
  seatingCapacity: number;
  vapAccess?: string[];
  status: VehicleStatus;
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
  licenseExpiry?: string;
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

export type IncidentStatus = 'New' | 'Under Investigation' | 'Action Taken' | 'Resolved' | 'Closed';

export type Comment = {
  id: string;
  userId: string;
  text: string;
  date: string; // ISO String
  eventId: string;
  viewedBy?: { [userId: string]: boolean };
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
    comments: { [key: string]: Comment };
    viewedBy: { [key: string]: boolean };
};

export type ManpowerTrade = {
  id: string;
  name: string;
  trade: string;
  company: string;
};

export type Trade = 'RA Level 1' | 'RA Level 2' | 'RA Level 3' | 'RA + Supervisor' | 'Supervisor' | 'Senior Safety Supervisor' | 'Safety Supervisor' | 'Document Controller' | 'Cook' | 'Others' | string;

export type DocumentStatus = 'Pending' | 'Collected' | 'Submitted' | 'Received';

export type ManpowerDocument = {
    name: string;
    details?: string;
    status: DocumentStatus;
};

export type LeaveRecord = {
    id: string;
    leaveType: 'Emergency' | 'Annual';
    leaveStartDate: string; // ISO String
    plannedEndDate?: string; // ISO String
    isConfirmed?: boolean;
    leaveEndDate?: string; // ISO String
    rejoinedDate?: string; // ISO String
    remarks?: string;
};

export type MemoRecord = {
  id: string;
  type: 'Memo' | 'Warning Letter';
  date: string; // ISO
  reason: string;
  issuedBy: string;
  attachmentUrl?: string;
};

export type EpNumberRecord = {
  epNumber: string;
  date: string;
};

export type LogbookStatus = 'Received' | 'Not Received' | 'Sent back as requested' | 'Pending';

export type LogbookRecord = {
  id: string;
  status: LogbookStatus;
  inDate?: string; // ISO
  outDate?: string; // ISO
  remarks?: string;
  entryDate?: string; // ISO
  enteredById?: string;
  requestId?: string;
  requestedById?: string;
  requestRemarks?: string;
  approvalDate?: string; // ISO
  approverId?: string;
  approverComment?: string;
};

export type ManpowerProfile = {
  id: string;
  name: string;
  employeeCode?: string;
  trade: Trade;
  status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated' | 'Left the Project';
  photo?: string;
  hardCopyFileNo?: string;
  documentFolderUrl?: string;
  epNumber?: string;
  epNumberHistory?: Record<string, EpNumberRecord> | EpNumberRecord[];
  plantName?: string;
  eic?: string;
  documents: ManpowerDocument[];
  skills?: Skill[];
  passIssueDate?: string; 
  joiningDate?: string; 
  workOrderExpiryDate?: string;
  wcPolicyExpiryDate?: string;
  labourLicenseExpiryDate?: string;
  medicalExpiryDate?: string;
  safetyExpiryDate?: string;
  irataValidity?: string;
  firstAidExpiryDate?: string;
  contractValidity?: string;
  leaveHistory?: Record<string, LeaveRecord>;
  memoHistory?: Record<string, MemoRecord> | MemoRecord[];
  ppeHistory?: Record<string, PpeHistoryRecord> | PpeHistoryRecord[];
  logbook?: Partial<LogbookRecord>;
  projectId?: string;
  accommodation?: {
    buildingId: string;
    roomId: string;
    bedId: string;
  };
};

export type Skill = {
  name: string;
  details?: string;
  link?: string;
  validity?: string | null;
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
  updatedAt: string;
  total: number;
  openingManpower: number;
  countOnLeave: number;
  personOnLeaveName?: string;
};

export type InternalRequestItemStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued';

export type InternalRequestItem = {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    remarks?: string;
    status: InternalRequestItemStatus;
    inventoryItemId?: string | null;
};

export type InternalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Partially Issued' | 'Partially Approved' | 'Disputed';
export type InternalRequest = {
  id: string;
  requesterId: string;
  date: string; // YYYY-MM-DD
  items: InternalRequestItem[];
  status: InternalRequestStatus;
  approverId?: string;
  acknowledgedByRequester?: boolean;
  comments?: Comment[];
  disputeDetails?: {
    date: string;
    comment: string;
  };
};

export type ManagementRequestStatus = 'New' | 'Under Review' | 'Action Taken' | 'Closed';

export type ManagementRequest = {
    id: string;
    creatorId: string;
    toUserId: string;
    ccUserIds?: string[];
    lastUpdated: string;
    subject: string;
    body: string;
    status: ManagementRequestStatus;
    comments: Comment[];
    readBy: { [key: string]: boolean };
};

export type InventoryItemStatus = 'In Use' | 'In Store' | 'Damaged' | 'Expired' | 'Moved to another project' | 'Quarantine';
export type InventoryCategory = 'General' | 'Daily Consumable' | 'Job Consumable';

export type InventoryItem = {
  id: string;
  name: string;
  serialNumber: string;
  ariesId?: string;
  chestCrollNo?: string;
  status: InventoryItemStatus;
  projectId: string;
  inspectionDate?: string; // ISO string
  inspectionDueDate?: string; // ISO string
  tpInspectionDueDate?: string; // ISO string
  lastUpdated: string; // ISO string
  remarks?: string;
  erpId?: string;
  certification?: string;
  purchaseDate?: string | null;
  movedToProjectId?: string | null;
  transferDate?: string | null;
  plantUnit?: string;
  certificateUrl?: string;
  inspectionCertificateUrl?: string;
  category?: InventoryCategory;
  isArchived?: boolean;
  quantity?: number;
  unit?: string;
};

export type UTMachine = {
  id: string;
  machineName: string;
  serialNumber: string;
  ariesId?: string | null;
  projectId: string;
  unit: string;
  calibrationDueDate: string; // ISO String
  tpInspectionDueDate?: string | null; // ISO String
  probeDetails?: string | null;
  probeStatus?: string | null;
  cableDetails?: string | null;
  cableStatus?: string | null;
  status: string;
  certificateUrl?: string | null;
  movedToProjectId?: string | null;
  remarks?: string | null;
};

export type DftMachine = {
    id: string;
    machineName: string;
    serialNumber: string;
    ariesId?: string | null;
    projectId: string;
    unit: string;
    calibrationDueDate: string; // ISO String
    tpInspectionDueDate?: string | null; // ISO String
    probeDetails: string;
    cableDetails: string;
    status: string;
    certificateUrl?: string | null;
    movedToProjectId?: string | null;
};

export type MobileSimStatus = 'Active' | 'Inactive' | 'Returned' | 'Standby';

export type MobileSim = {
  id: string;
  type: 'Mobile' | 'SIM' | 'Mobile with SIM';
  allottedToUserId?: string | null;
  allotmentDate: string; // ISO string
  projectId: string;
  status: MobileSimStatus;
  remarks?: string;
  ariesId?: string;
  make?: string; // For Mobile
  model?: string; // For Mobile
  imei?: string; // For Mobile
  provider?: string; // Legacy
  number?: string; // Legacy
  simProvider?: string; // For SIM
  simNumber?: string; // For SIM
};

export type LaptopDesktop = {
  id: string;
  allottedTo: string; // user id
  make: string;
  model: string;
  serialNumber: string;
  ariesId?: string;
  password?: string;
  remarks?: string;
};

export type DigitalCamera = {
  id: string;
  projectId: string;
  make: string;
  model: string;
  serialNumber: string;
  ariesId?: string;
  status: string;
  remarks?: string;
};

export type Anemometer = {
  id: string;
  projectId: string;
  make: string;
  model: string;
  serialNumber: string;
  ariesId?: string;
  status: string;
  calibrationDueDate?: string;
  remarks?: string;
};

export type OtherEquipment = {
    id: string;
    equipmentName: string;
    serialNumber: string;
    ariesId?: string;
    projectId: string;
    category?: string;
    remarks?: string;
    tpInspectionDueDate?: string | null;
    certificateUrl?: string | null;
};

export type WeldingMachine = {
  id: string;
  make?: string;
  model?: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
  tpInspectionDueDate?: string | null;
  certificateUrl?: string | null;
}
export type WalkieTalkie = {
  id: string;
  make?: string;
  model?: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type PneumaticDrillingMachine = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type PneumaticAngleGrinder = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type WiredDrillingMachine = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type CordlessDrillingMachine = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type WiredAngleGrinder = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type CordlessAngleGrinder = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}

export type CordlessReciprocatingSaw = {
  id: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  status: string;
  remarks?: string;
}


export type MachineLog = {
    id: string;
    machineId: string;
    loggedByUserId: string;
    userName: string;
    date: string; // YYYY-MM-DD
    fromTime: string; // HH:mm
    toTime: string; // HH:mm
    location: string;
    jobDescription: string;
    startingKm?: number;
    endingKm?: number;
    status: 'Active' | 'Idle';
    reason?: string;
    attachmentUrl?: string;
};

export type InventoryTransferRequest = {
  id: string;
  requesterId: string;
  fromProjectId: string;
  toProjectId: string;
  items: {
    itemId: string;
    itemType: 'Inventory' | 'UTMachine' | 'DftMachine' | 'DigitalCamera' | 'Anemometer' | 'OtherEquipment' | 'LaptopDesktop' | 'MobileSim' | 'WeldingMachine' | 'WalkieTalkie';
    serialNumber: string;
    name: string;
    ariesId?: string | null;
  }[];
  status: 'Pending' | 'Approved' | 'Rejected' | 'Disputed' | 'Completed' | 'Issued';
  requestDate: string; // ISO String
  comments?: Comment[];
  approverId?: string;
  approvalDate?: string;
  acknowledgedByRequester?: boolean;
  acknowledgedDate?: string;
  reason: TransferReason;
  requestedById?: string | null;
  remarks?: string;
};

export type TransferReason = 'Temporary Use' | 'For TP certification' | 'Expired materials' | 'Not in use' | 'Damaged items' | 'Transfer to another project as requested by';

export const TRANSFER_REASONS: TransferReason[] = ['Temporary Use', 'For TP certification', 'Expired materials', 'Not in use', 'Damaged items', 'Transfer to another project as requested by'];

export type CertificateRequestType = 'Calibration Certificate' | 'TP Certificate' | 'Inspection Certificate';
export type CertificateRequestStatus = 'Pending' | 'Completed' | 'Rejected';

export type CertificateRequest = {
  id: string;
  requesterId: string;
  requestType: CertificateRequestType;
  itemId?: string;
  utMachineId?: string;
  dftMachineId?: string;
  status: CertificateRequestStatus;
  requestDate: string; // ISO String
  completionDate?: string; // ISO String
  remarks?: string;
  comments?: Comment[];
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
  comments?: { [key: string]: Comment };
  dismissedBy?: string[];
  notifyAll?: boolean;
};

export type Broadcast = {
  id: string;
  message: string;
  creatorId: string;
  createdAt: string;
  expiryDate: string;
  emailTarget: 'none' | 'roles' | 'individuals';
  recipientRoles?: Role[];
  recipientUserIds?: string[];
  dismissedBy?: string[];
}

export type Bed = {
  id: string;
  bedNumber: string;
  bedType: 'Bunk' | 'Single';
  occupantId?: string | null;
};

export type Room = {
  id: string;
  roomNumber: string;
  beds?: Bed[];
};

export type Building = {
  id: string;
  buildingNumber: string;
  rooms?: Room[];
};

export type PpeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Disputed';

export type PpeRequest = {
  id: string;
  requesterId: string;
  manpowerId: string;
  date: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity: number;
  requestType: 'New' | 'Replacement';
  status: PpeRequestStatus;
  remarks?: string;
  attachmentUrl?: string;
  newRequestJustification?: string;
  eligibility?: { eligible: boolean; reason: string; } | null;
  comments?: { [key: string]: Comment };
  viewedByRequester?: boolean;
  approverId?: string;
};

export type PpeStock = {
    id: 'coveralls' | 'safetyShoes';
    sizes?: { [size: string]: number };
    quantity?: number;
};

export type PpeHistoryRecord = {
    id: string;
    ppeType: 'Coverall' | 'Safety Shoes';
    size: string;
    quantity: number;
    issueDate: string; // ISO String
    requestType: 'New' | 'Replacement';
    remarks?: string;
    issuedById: string;
    requestId?: string; // Link to the PpeRequest
};

export type ConsumableInwardRecord = {
    id: string;
    itemId: string;
    quantity: number;
    date: string; // ISO String
    addedByUserId: string;
};

export type PpeInwardRecord = {
    id: string;
    ppeType: 'Coverall' | 'Safety Shoes';
    date: string; // ISO String
    addedByUserId: string;
    sizes?: { [size: string]: number };
    quantity?: number;
};

export type TpCertListItem = {
  itemId: string;
  itemType: 'Inventory' | 'UTMachine' | 'DftMachine' | 'Anemometer' | 'DigitalCamera' | 'OtherEquipment' | 'LaptopDesktop' | 'MobileSim' | 'WeldingMachine' | 'WalkieTalkie';
  materialName: string;
  manufacturerSrNo: string;
  chestCrollNo?: string | null;
  ariesId?: string | null;
};

export type TpCertList = {
  id: string;
  name: string;
  date: string;
  creatorId: string;
  createdAt: string;
  items: TpCertListItem[];
  checklist?: TpCertChecklist;
  isLocked?: boolean;
  checklistMaxIndex?: number;
};

export type ChecklistStep = {
  userId: string;
  date: string; // ISO
};

export type TpCertChecklist = {
  sentForTesting?: ChecklistStep | null;
  itemsReceived?: ChecklistStep | null;
  proformaReceived?: ChecklistStep | null;
  poSent?: ChecklistStep | null;
  certsReceived?: ChecklistStep | null;
  validityUpdated?: ChecklistStep | null;
};

export type InspectionChecklist = {
  id: string;
  itemId: string;
  inspectionDate: string; // ISO
  nextDueDate: string; // ISO
  knownHistory?: string;
  yearOfManufacture?: string;
  purchaseDate?: string; // ISO
  firstUseDate?: string; // ISO
  findings: Record<string, string>;
  comments?: string;
  remarks: string;
  verdict: 'This equipment is fit to remain in service (PASS)' | 'This equipment is NOT fit to remain in service (FAIL)';
  inspectedById: string;
  reviewedById: string;
};

export type IgpOgpRecord = {
  id: string;
  type: 'IGP' | 'OGP';
  creatorId: string;
  mrnNumber: string;
  date: string;
  location: string;
  materialInBy?: string;
  materialOutBy?: string;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    uom: string;
  }[];
};

export type DirectiveStatus = 'New' | 'Under Review' | 'Action Taken' | 'Closed';

export type Directive = {
    id: string;
    creatorId: string;
    toUserId: string;
    ccUserIds?: string[];
    lastUpdated: string;
    subject: string;
    body: string;
    status: DirectiveStatus;
    comments: Comment[];
    readBy: { [key: string]: boolean };
};

export type DamageReportStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

export type DamageReport = {
  id: string;
  itemId: string | null;
  otherItemName?: string | null;
  reason: string;
  reporterId: string;
  reportDate: string; // ISO
  status: DamageReportStatus;
  attachmentUrl?: string | null; // For legacy, will be removed
  attachmentOriginalUrl?: string | null;
  attachmentDownloadUrl?: string | null;
  comments?: Comment[];
};

export type PasswordResetRequest = {
  id: string;
  userId: string;
  email: string;
  date: string;
  status: 'pending' | 'handled';
  resetCode?: string;
};

export type UnlockRequest = {
    id: string;
    userId: string;
    userName: string;
    date: string; // ISO
    status: 'pending' | 'resolved';
};

export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved';

export type Feedback = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  date: string;
  status: FeedbackStatus;
  viewedByUser: boolean;
  comments?: { [key: string]: Comment };
};

export type DecorationTheme = 'none' | 'christmas' | 'diwali' | 'new-year';

export type JobRecord = {
  records: {
    [manpowerId: string]: {
      days?: { [day: number]: string };
      plant?: string;
      additionalSundayDuty?: number;
      dailyOvertime?: { [day: number]: number };
      dailyComments?: { [day: number]: string };
    }
  };
  plantsOrder?: {
    [plantName: string]: string[];
  };
  isLocked?: boolean;
};

export type JobRecordPlant = {
  id: string;
  name: string;
};

export type JobCode = {
  id: string;
  code: string;
  details: string;
  jobNo?: string;
};

export type VehicleUsageRecord = {
  [month: string]: { // yyyy-MM
    records: {
      [vehicleId: string]: {
        days: {
          [day: number]: {
            startKm: number;
            endKm: number;
            overtime: string;
            remarks: string;
            isHoliday?: boolean;
          }
        };
        jobNo?: string;
        vehicleType?: string;
        extraKm?: number;
        headerOvertime?: string;
        extraNight?: number;
        extraDays?: number;
        isLocked?: boolean;
        lastUpdated?: string;
        lastUpdatedById?: string;
        verifiedBy?: {
          name: string;
          date: string;
        };
      }
    }
  }
};

export const JOB_PROGRESS_STEPS = [
    "JMS created",
    "JMS sent to Site",
    "JMS Handed Over to",
    "JMS submitted",
    "JMS Endorsed",
    "JMS sent to Office",
    "JMS no created",
    "JMS Hard copy sent back to Site",
    "JMS Hard copy submitted",
  ] as const;
  
  export const REOPEN_JOB_STEPS = [
    "JMS created",
    "JMS sent to Site",
    "JMS Handed Over to",
    "JMS submitted",
    "JMS Endorsed",
    "JMS sent to Office",
    "JMS no created",
  ] as const;


export type JobProgressStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Completed';
export type JobStepStatus = 'Not Started' | 'Pending' | 'Acknowledged' | 'Completed' | 'Skipped';

export type JobStep = {
    id: string;
    name: (typeof JOB_PROGRESS_STEPS)[number] | string;
    assigneeId: string | null;
    status: JobStepStatus;
    description?: string;
    dueDate?: string | null;
    completedAt?: string | null;
    completedBy?: string | null;
    completionDetails?: {
      date: string;
      notes: string;
      attachmentUrl?: string | null;
      customFields?: Record<string, any> | null;
    } | null;
    acknowledgedAt?: string | null;
    isReturned?: boolean;
    returnDetails?: {
        returnedBy: string;
        date: string;
        reason: string;
    };
    comments?: { [key: string]: Comment };
    reassignmentInfo?: {
        reassignedBy: string;
        reassignedAt: string; // ISO
        fromUserId: string | null;
        toUserId: string;
        reason: string;
    } | null;
};

export type SorItem = {
    id: string;
    ariesJobId: string;
    rilApprovedQuantity: number;
    itemCode: string;
    scopeDescription: string;
    uom: string;
    unitRate: number;
};

export type JobProgress = {
    id: string;
    title: string;
    creatorId: string;
    createdAt: string;
    lastUpdated: string;
    status: JobProgressStatus;
    steps: JobStep[];
    projectId?: string;
    plantUnit?: string;
    workOrderNo?: string;
    foNo?: string;
    jmsNo?: string;
    amount?: number;
    dateFrom?: string | null;
    dateTo?: string | null;
    // New JMS Builder fields
    plantRegNo?: string;
    arcOtcWoNo?: string;
    sorItems?: SorItem[];
};

export type TimesheetStatus = 'Pending' | 'Acknowledged' | 'Sent To Office' | 'Office Acknowledged' | 'Rejected';

export type Timesheet = {
    id: string;
    submitterId: string;
    submissionDate: string;
    submittedToId: string;
    projectId: string;
    plantUnit: string;
    numberOfTimesheets: number;
    startDate: string;
    endDate: string;
    status: TimesheetStatus;
    lastUpdated: string;
    acknowledgedById?: string;
    acknowledgedDate?: string;
    sentToOfficeById?: string;
    sentToOfficeDate?: string;
    officeAcknowledgedById?: string;
    officeAcknowledgedDate?: string;
    rejectedById?: string;
    rejectedDate?: string;
    rejectionReason?: string;
    comments?: { [key: string]: Comment };
};

export type DocumentMovementStatus = 'Pending' | 'Acknowledged' | 'Returned' | 'Completed';

export type DocumentMovement = {
  id: string;
  title: string;
  creatorId: string;
  assigneeId: string;
  createdAt: string; // ISO
  lastUpdated: string; // ISO
  status: DocumentMovementStatus;
  comments?: Comment[];
  acknowledgedAt?: string;
  completedAt?: string;
};

export type ObservationReport = {
  id: string;
  reporterId: string;
  createdAt: string; // ISO
  visitDate: string; // ISO
  visitTime: string; // HH:mm
  projectId: string;
  location: string;
  supervisorName: string;
  siteInChargeName: string;
  jobDescription: string;
  goodPractices?: string;
  unsafeActs?: string;
  unsafeConditions?: string;
  correctiveActions?: string;
  status: 'Open' | 'Closed';
  closedAt?: string; // ISO
  comments?: Comment[];
};

export type DeliveryNoteItem = {
    id: string; // Could be inventory item id or just a random id for manual entries
    description: string;
    quantity: number;
    remarks?: string;
};

export type DeliveryNote = {
    id: string;
    type: 'Inward' | 'Outward';
    creatorId: string;
    createdAt: string; // ISO
    deliveryDate: string; // ISO
    deliveryNoteNumber: string;
    ariesRefNo?: string;
    fromAddress: string;
    toAddress: string;
    serviceType?: string;
    
    // For Outward
    items?: DeliveryNoteItem[];

    // For Inward
    attachmentUrl?: string;

    // For Outward signed copy
    signedAttachmentUrl?: string;
};

export type QuotationItem = {
  id: string;
  itemId: string;
  description: string;
  uom: string;
  itemType: string;
  isNew?: boolean;
  newItemCategory?: 'Store Inventory' | 'Equipment' | 'Daily Consumable' | 'Job Consumable';
};
  
export type QuotationQuote = {
    itemId: string;
    quantity: number;
    rate: number;
    taxPercent: number;
    receivedQuantity?: number;
};

export type AdditionalCost = {
  id: string;
  name: string;
  value: number;
}

export type QuotationVendorDetails = {
    id: string; 
    vendorId: string;
    name: string;
    quotes: QuotationQuote[];
    additionalCosts?: AdditionalCost[];
};

export type QuotationStatus = 'Pending' | 'Approved' | 'PO Sent' | 'Partially Received' | 'Completed' | 'Rejected';

export type Quotation = {
    id: string;
    title: string;
    creatorId: string;
    createdAt: string; // ISO
    status: QuotationStatus;
    items: QuotationItem[];
    vendors: QuotationVendorDetails[];
    finalizedVendorId?: string;
    poNumber?: string;
    isLocked?: boolean;
};

export type RequestListItem = {
    id: string;
    requestNo: string;
    status: string;
    requestOn: string; // ISO date
    deliveryDate: string; // ISO date
    addedBy: string; // User name
    doneBy?: string; // User name
    toBeDoneBy: string; // User name
    requestedBy: string; // User name
    requirement: string;
    jobNo?: string;
    category?: string;
    subDivision?: string;
  };

export type InwardOutwardRecord = {
    id: string;
    itemId: string;
    itemType: string;
    itemName: string;
    type: 'Inward' | 'Outward';
    quantity: number;
    date: string; // ISO
    source: string;
    remarks?: string;
    userId: string;
    status?: 'Pending Details' | 'Completed';
    quotationId?: string;
    vendorId?: string;
    finalizedItemIds?: string[];
    isLocked?: boolean;
};




