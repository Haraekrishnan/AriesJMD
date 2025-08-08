

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
  participants?: string[]; // Creator, assignee, and all commenters
  lastUpdated?: string; // ISO String of last comment or status change
  viewedBy?: string[]; // Array of user IDs who have seen the latest update
  requiresAttachmentForCompletion?: boolean;
  attachment?: {
    name: string;
    url: string; 
  };
  approvalState: ApprovalState;
  approverId?: string; // New field
  pendingStatus?: TaskStatus | null;
  previousStatus?: TaskStatus | null;
  completionDate?: string; // ISO String
  pendingAssigneeId?: string | null;
  viewedByApprover?: boolean; // DEPRECATED, use viewedBy
  isViewedByAssignee?: boolean; // DEPRECATED, use viewedBy
  viewedByRequester?: boolean; // DEPRECATED, use viewedBy
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
  'log_manpower',
  'manage_job_schedule'
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
  vendorName?: string;
  seatingCapacity: number;
  vapAccess?: string[];
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
    lastUpdated: string; // ISO string
    viewedBy: string[]; // Array of user IDs
};


export type ManpowerTrade = {
  id: string;
  name: string;
  trade: string;
  company: string;
};

export type Trade = string;
export const RA_TRADES: Trade[] = ['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor'];
export const MANDATORY_DOCS = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];

export type MemoRecord = {
    id: string;
    type: 'Memo' | 'Warning Letter';
    date: string; // ISO String
    reason: string;
    issuedBy: string;
};

export type PpeHistoryRecord = {
  id: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity?: number;
  issueDate: string; // ISO String
  requestType: 'New' | 'Replacement';
  remarks?: string;
  storeComment?: string;
};

export type ManpowerProfile = {
  id: string;
  name: string;
  trade: Trade;
  status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated' | 'Left the Project';
  photo?: string;
  
  // Personal Details
  mobileNumber?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string; // Date of Birth
  aadharNumber?: string;
  uanNumber?: string;
  coverallSize?: string;
  shoeSize?: string;

  // Identifiers
  hardCopyFileNo?: string;
  documentFolderUrl?: string;
  
  // Work Details
  workOrderNumber?: string;
  labourLicenseNo?: string;
  eic?: string; 
  joiningDate?: string; // ISO

  // Policy & Card Details
  wcPolicyNumber?: string;
  cardCategory?: string;
  cardType?: string;
  epNumber?: string;
  plantName?: string;
  
  // Documents and Skills
  documents: ManpowerDocument[];
  skills?: Skill[];

  // Validity Dates
  passIssueDate?: string; // ISO
  workOrderExpiryDate?: string; // ISO, replaces woValidity
  wcPolicyExpiryDate?: string; // ISO, replaces wcPolicyValidity
  labourLicenseExpiryDate?: string; // ISO, new
  medicalExpiryDate?: string; // ISO
  safetyExpiryDate?: string; // ISO
  irataValidity?: string; // ISO
  firstAidExpiryDate?: string; // ISO
  contractValidity?: string; // ISO
  
  // Leave and Termination
  leaveHistory?: LeaveRecord[];
  memoHistory?: MemoRecord[];
  ppeHistory?: PpeHistoryRecord[];
  terminationDate?: string; // ISO
  resignationDate?: string; // ISO
  feedback?: string;

  // Remarks
  remarks?: string;
};

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
    remarks?: string;
};

export type Skill = {
    name: string;
    details: string;
    link?: string;
    validity?: string; // ISO String
};

export type ManpowerLog = {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  countIn: number;
  personInName?: string;
  countOut: number;
  personOutName?: string;
  countOnLeave: number;
  personOnLeaveName?: string;
  reason: string;
  updatedBy: string;
  yesterdayCount: number;
  total: number;
};

export type InternalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued';
export type InternalRequestItem = {
    description: string;
    quantity: number;
    unit: string;
    remarks: string;
};
export type InternalRequest = {
  id: string;
  requesterId: string;
  date: string; // YYYY-MM-DD
  items: InternalRequestItem[];
  status: InternalRequestStatus;
  approverId?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  acknowledgedByRequester?: boolean;
};

export type ManagementRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type ManagementRequest = {
    id: string;
    requesterId: string;
    recipientId: string;
    approverId?: string;
    date: string;
    subject: string;
    body: string;
    status: ManagementRequestStatus;
    comments: Comment[];
    viewedByRequester: boolean;
}

export type PpeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued';

export type PpeRequest = {
  id: string;
  requesterId: string;
  manpowerId: string;
  ppeType: 'Coverall' | 'Safety Shoes';
  size: string;
  quantity?: number;
  requestType: 'New' | 'Replacement';
  remarks?: string;
  date: string; // ISO
  status: PpeRequestStatus;
  approverId?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  attachmentUrl?: string;
};


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
  projectId: string;
  unit: string;
  calibrationDueDate: string; // ISO String
  probeDetails: string;
  cableDetails: string;
  status: string;
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

export type DigitalCamera = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  allottedTo: string; // User ID
  status: string;
  projectId: string;
  remarks?: string;
};

export type Anemometer = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  allottedTo: string; // User ID
  status: string;
  projectId: string;
  calibrationDueDate?: string; // ISO String
  remarks?: string;
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

export type LaptopDesktop = {
    id: string;
    make: string;
    model: string;
    serialNumber: string;
    allottedTo: string; // User ID
    ariesId?: string;
    password?: string;
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
    userName: string;
    loggedByUserId: string;
    date: string; // YYYY-MM-DD
    fromTime: string; // HH:mm
    toTime: string; // HH:mm
    location: string;
    jobDescription: string;
    status: 'Active' | 'Idle';
    reason?: string;
    attachmentUrl?: string;
    startingKm?: number;
    endingKm?: number;
};

export type CertificateRequestType = 'Calibration Certificate' | 'TP Certificate' | 'Inspection Certificate';
export type CertificateRequestStatus = 'Pending' | 'Completed' | 'Rejected';

export type CertificateRequest = {
  id: string;
  requesterId: string;
  requestType: CertificateRequestType;
  itemId?: string; // For InventoryItem
  utMachineId?: string; // For UTMachine
  dftMachineId?: string; // For DftMachine
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
  dismissedBy?: string[];
};

export type DailyPlannerComment = {
  id: string; // composite key: `${YYYY-MM-DD}_${plannerUserId}`
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

export type JobScheduleItem = {
  id: string;
  manpowerIds: string[];
  jobType?: string;
  jobNo?: string;
  projectVesselName?: string;
  location?: string;
  reportingTime?: string; // HH:mm
  clientContact?: string;
  vehicleId?: string;
  remarks?: string;
};

export type JobSchedule = {
  id: string; // composite key: `${projectId}_${YYYY-MM-DD}`
  projectId: string;
  date: string; // YYYY-MM-DD
  supervisorId: string;
  items: JobScheduleItem[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
