

export type Broadcast = {
  id: string;
  message: string;
  creatorId: string;
  createdAt: string; // ISO String
  expiryDate: string; // ISO String
  recipientRoles: string[];
  recipientUserIds:string[];
  dismissedBy: string[];
  emailTarget: 'none' | 'roles' | 'individuals';
};

export type JobCode = {
  id: string;
  code: string;
  details: string;
  jobNo?: string;
};

export type JobRecord = {
  id: string; // YYYY-MM
  isLocked?: boolean;
  records: {
    [employeeId: string]: {
      days: { [day: number]: string }; // day: 1-31, value: code
      dailyOvertime?: { [day: number]: number };
      dailyComments?: { [day: number]: string };
      additionalSundayDuty?: number;
      plant?: string;
    };
  };
  plantsOrder?: {
      [plantName: string]: string[];
  };
};

export type PpeInwardRecord = {
  id: string;
  date: string; // ISO string
  ppeType: 'Coverall' | 'Safety Shoes';
  sizes?: { [size: string]: number };
  quantity?: number;
  addedByUserId: string;
};

export type ConsumableInwardRecord = {
  id: string;
  date: string; // ISO string
  itemId: string;
  quantity: number;
  addedByUserId: string;
};

export type IgpOgpItem = {
  id: string;
  itemName: string;
  quantity: number;
  uom: string;
};

export type IgpOgpRecord = {
  id: string;
  type: 'IGP' | 'OGP';
  mrnNumber: string;
  date: string; // ISO String
  location: string;
  materialInBy?: string;
  materialOutBy?: string;
  items: IgpOgpItem[];
  creatorId: string;
};

export type Vendor = {
  id: string;
  name: string;
  category?: string;
  ownerId?: string;
  totalSpend?: number;
  nextPaymentAmount?: number;
  nextPaymentDate?: string; // ISO String
  frequency?: 'Monthly' | 'Rolling' | 'Annual';
  ownerDept?: string;
  icon?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  gstNumber?: string;
};

export type PaymentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled' | 'Email Sent' | 'Amount Listed Out';

export type Payment = {
    id: string;
    requesterId: string;
    approverId?: string;
    vendorId: string;
    amount: number;
    date: string; // ISO String
    durationFrom?: string | null; // ISO String
    durationTo?: string | null; // ISO String
    emailSentDate?: string | null; // ISO String
    status: PaymentStatus;
    remarks?: string;
    comments?: Comment[];
    purchaseRegisterId?: string;
};

export type PurchaseItem = {
    id: string;
    name: string;
    uom: string;
    unitRate: number;
    quantity: number;
    tax: number;
};

export type PurchaseRegister = {
    id: string;
    vendorId: string;
    creatorId: string;
    date: string; // ISO String
    items: PurchaseItem[];
    subTotal: number;
    totalTax: number;
    grandTotal: number;
    roundOff?: number;
    poNumber?: string;
    invoiceNumber?: string;
    deliveryNoteNumber?: string;
    poDate?: string | null; // ISO String
    invoiceDate?: string | null; // ISO String
};


export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  status?: 'active' | 'locked' | 'deactivated';
  password?: string;
  supervisorId?: string;
  projectIds?: string[];
  planningScore?: number;
  permissions?: Permission[];
  dismissedPendingUpdates?: { [key: string]: boolean };
  signatureUrl?: string;
};

export type PasswordResetRequest = {
  id: string;
  userId: string;
  email: string;
  date: string; // ISO String
  status: 'pending' | 'handled';
  resetCode?: string;
};

export type UnlockRequest = {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO String
  status: 'pending' | 'resolved';
};

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done' | 'Pending Approval' | 'Overdue' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High';
export type ApprovalState = 'none' | 'pending' | 'approved' | 'returned' | 'status_pending';

export type Subtask = {
    userId: string;
    status: TaskStatus;
    updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string; // DEPRECATED in favor of assigneeIds
  assigneeIds: string[];
  subtasks?: { [userId: string]: Subtask };
  creatorId: string;
  dueDate: string; // ISO String
  priority: Priority;
  comments: Comment[];
  participants?: string[];
  lastUpdated?: string;
  viewedBy?: { [key: string]: boolean };
  requiresAttachmentForCompletion?: boolean;
  link?: string;
  attachment?: {
    name: string;
    url: string; 
  };
  approvalState: ApprovalState;
  approverId?: string;
  statusRequest?: {
    requestedBy: string;
    newStatus: TaskStatus;
    comment: string;
    attachment?: Task['attachment'];
    date: string; // ISO String
    status: 'Pending' | 'Approved' | 'Rejected';
  }
  completionDate?: string;
  pendingAssigneeId?: string | null;
  viewedByApprover?: boolean;
  isViewedByAssignee?: boolean;
  viewedByRequester?: boolean;
  previousStatus?: TaskStatus;
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
  viewedBy?: { [userId: string]: boolean };
};

export type DailyPlannerComment = {
  id: string; // composite key: `${YYYY-MM-DD}_${plannerUserId}`
  plannerUserId: string; // The user whose planner this comment belongs to
  day: string; // YYYY-MM-DD
  comments: Comment[];
  lastUpdated: string;
  viewedBy: { [key: string]: boolean };
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
  'manage_job_schedule',
  'prepare_master_schedule',
  'manage_ppe_stock',
  'view_ppe_requests',
  'manage_ppe_request',
  'view_internal_store_request',
  'manage_store_requests',
  'manage_vendors',
  'manage_payments',
  'manage_purchase_register',
  'manage_password_resets',
  'manage_igp_ogp',
  'manage_feedback',
  'manage_user_lock_status',
  'create_broadcast',
  'manage_job_record',
  'manage_downloads',
  'manage_logbook',
  'perform_inventory_inspection',
  'manage_tp_certification',
  'manage_directives',
  'manage_vehicle_usage',
  'manage_signatures',
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
  isPlant?: boolean;
};

export type ActivityLog = {
  id: string;
  userId: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
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
  status?: VehicleStatus;
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
  licenseExpiry?: string;
};

export type IncidentStatus = 'New' | 'Under Investigation' | 'Action Pending' | 'Resolved' | 'Closed';

export type Comment = {
  id: string;
  userId: string;
  text: string;
  date: string; // ISO String
  eventId?: string; 
  viewedBy?: { [key: string]: boolean };
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
    viewedBy: { [key: string]: boolean }; // Object of user IDs
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
    attachmentUrl?: string;
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
  requestId?: string;
  issuedById?: string;
  approverId?: string;
};

export type EpNumberRecord = {
    epNumber: string;
    date: string; // ISO string
};

export type LogbookStatus = 'Received' | 'Not Received' | 'Pending' | 'Sent back as requested';

export type LogbookRecord = {
  id: string;
  status: LogbookStatus;
  inDate?: string | null; // ISO string
  outDate?: string | null; // ISO string
  remarks?: string; // remarks for manual entry
  entryDate?: string; // when the manual entry was made
  enteredById?: string; // user who made manual entry
  // For request flow
  requestDate?: string; // ISO
  requestedById?: string;
  requestRemarks?: string;
  approverId?: string;
  approvalDate?: string;
  approverComment?: string;
  requestId?: string;
};

export type ManpowerProfile = {
  id: string;
  name: string;
  trade: Trade;
  status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated' | 'Left the Project';
  photo?: string;
  
  // Personal Details
  mobileNumber?: string;
  emergencyContactNumber?: string;
  emergencyContactRelation?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string | null; // Date of Birth
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
  joiningDate?: string | null; // ISO
  plantName?: string; 

  // Policy & Card Details
  wcPolicyNumber?: string;
  cardCategory?: string;
  cardType?: string;
  epNumber?: string; // Current EP Number
  epNumberHistory?: EpNumberRecord[];
  
  // Documents and Skills
  documents: ManpowerDocument[];
  skills?: Skill[];

  // Validity Dates
  passIssueDate?: string | null; // ISO
  workOrderExpiryDate?: string | null; // ISO
  wcPolicyExpiryDate?: string | null; // ISO
  labourLicenseExpiryDate?: string | null; // ISO
  medicalExpiryDate?: string | null; // ISO
  safetyExpiryDate?: string | null; // ISO
  irataValidity?: string | null; // ISO
  firstAidExpiryDate?: string | null; // ISO
  contractValidity?: string | null;
  
  // Leave and Termination
  leaveHistory?: { [key: string]: LeaveRecord };
  memoHistory?: { [key: string]: MemoRecord };
  ppeHistory?: { [key: string]: PpeHistoryRecord };

  terminationDate?: string | null; // ISO
  resignationDate?: string | null; // ISO
  feedback?: string;

  // Logbook
  logbook?: LogbookRecord;
  logbookHistory?: { [key: string]: LogbookRecord };

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
    validity?: string | null; // ISO String
};

export type ManpowerLog = {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  openingManpower: number;
  countIn: number;
  personInName?: string;
  countOut: number;
  personOutName?: string;
  countOnLeave: number;
  personOnLeaveName?: string;
  reason: string;
  updatedBy: string;
  updatedAt: string; // ISO String
  total: number;
};

export type InternalRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Partially Issued' | 'Disputed' | 'Partially Approved';
export type InternalRequestItemStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued';

export type InternalRequestItem = {
    id: string;
    inventoryItemId?: string | null;
    description: string;
    quantity: number;
    unit: string;
    remarks: string;
    status: InternalRequestItemStatus;
};
export type InternalRequest = {
  id: string;
  requesterId: string;
  date: string; // YYYY-MM-DD
  items: InternalRequestItem[];
  status: InternalRequestStatus; // This will now be a summary status
  approverId?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  acknowledgedByRequester?: boolean;
};

export type PpeRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Issued' | 'Disputed';

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
  issuedById?: string;
  comments: Comment[];
  viewedByRequester: boolean;
  attachmentUrl?: string;
  eligibility?: {
    eligible: boolean;
    reason: string;
  } | null;
  newRequestJustification?: string;
};


export type InventoryItemStatus = 'In Use' | 'In Store' | 'Damaged' | 'Expired' | 'Moved to another project' | 'Quarantine';
export type InventoryCategory = 'General' | 'Daily Consumable' | 'Job Consumable';

export type InventoryItem = {
  id: string;
  name: string;
  serialNumber: string;
  ariesId?: string;
  erpId?: string;
  certification?: string;
  purchaseDate?: string | null;
  chestCrollNo?: string | null;
  status: InventoryItemStatus;
  projectId: string;
  plantUnit?: string;
  inspectionDate?: string; // ISO string
  inspectionDueDate?: string; // ISO string
  tpInspectionDueDate?: string | null; // ISO string
  certificateUrl?: string;
  inspectionCertificateUrl?: string;
  lastUpdated: string; // ISO string
  remarks?: string;
  category?: InventoryCategory;
  quantity?: number;
  unit?: string;
  movedToProjectId?: string | null;
};

export type UTMachine = {
  id: string;
  machineName: string;
  serialNumber: string;
  ariesId?: string;
  projectId: string;
  unit: string;
  calibrationDueDate: string; // ISO String
  tpInspectionDueDate?: string | null; // ISO String
  probeDetails?: string;
  probeStatus?: string;
  cableDetails?: string;
  cableStatus?: string;
  remarks?: string;
  status: string;
  certificateUrl?: string;
  movedToProjectId?: string;
};

export type DftMachine = {
    id: string;
    machineName: string;
    serialNumber: string;
    ariesId?: string;
    projectId: string;
    unit: string;
    calibrationDueDate: string; // ISO String
    tpInspectionDueDate?: string; // ISO String
    probeDetails: string;
    cableDetails: string;
    status: string;
    certificateUrl?: string;
    movedToProjectId?: string;
};

export type DigitalCamera = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  projectId: string;
  status: string;
  remarks?: string;
  ariesId?: string;
};

export type Anemometer = {
  id: string;
  make: string;
  model: string;
  serialNumber: string;
  projectId: string;
  status: string;
  calibrationDueDate?: string; // ISO String
  remarks?: string;
  ariesId?: string;
};

export type MobileSimStatus = 'Active' | 'Inactive' | 'Returned' | 'Standby';

export type MobileSim = {
  id: string;
  type: 'Mobile' | 'SIM' | 'Mobile with SIM';
  // Mobile fields
  make?: string;
  model?: string;
  imei?: string;
  // SIM fields
  simProvider?: string;
  simNumber?: string;
  // Common fields for backward compatibility and simpler cases
  provider?: string;
  number?: string;
  
  allottedToUserId: string | null;
  allotmentDate: string; // ISO string
  projectId: string;
  status: MobileSimStatus;
  remarks?: string;
  ariesId?: string;
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
    category?: string;
    ariesId?: string;
    projectId: string;
    remarks?: string;
    tpInspectionDueDate?: string | null;
    certificateUrl?: string;
};

export type PneumaticDrillingMachine = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Pneumatic Drilling Machine' };
export type PneumaticAngleGrinder = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Pneumatic Angle Grinder' };
export type WiredDrillingMachine = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Wired Drilling Machine' };
export type CordlessDrillingMachine = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Cordless Drilling Machine' };
export type WiredAngleGrinder = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Wired Angle Grinder' };
export type CordlessAngleGrinder = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Cordless Angle Grinder' };
export type CordlessReciprocatingSaw = Omit<OtherEquipment, 'equipmentName'> & { equipmentName: 'Cordless Reciprocating Saw' };


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
  notifyAll?: boolean;
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

export type JobScheduleItem = {
  id: string;
  manpowerIds: string[];
  jobType: string;
  jobNo: string;
  projectVesselName: string;
  location: string;
  reportingTime: string; // HH:mm
  clientContact: string;
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
  isLocked?: boolean;
};

export type PpeStock = {
  id: 'coveralls' | 'safetyShoes';
  name: string;
  sizes?: { [size: string]: number }; // For coveralls
  quantity?: number; // For safety shoes
  lastUpdated: string; // ISO
};

export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved';

export type Feedback = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  date: string; // ISO String
  status: FeedbackStatus;
  viewedBy?: { [key: string]: boolean };
  comments?: { [key: string]: Comment };
};

export type JobRecordPlant = {
  id: string;
  name: string;
};

export type TpCertListItem = {
  itemId: string;
  itemType: string;
  materialName: string;
  manufacturerSrNo: string;
  chestCrollNo?: string | null;
  ariesId?: string | null;
};

export type TpCertList = {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD
    creatorId: string;
    createdAt: string; // ISO String
    items: TpCertListItem[];
};

export const TRANSFER_REASONS = [
  "For TP certification",
  "Transfer to another project as requested by",
  "Material out request by store/office",
  "Expired materials",
] as const;

export type TransferReason = (typeof TRANSFER_REASONS)[number];

export type InventoryTransferStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Disputed';

export type InventoryTransferRequest = {
    id: string;
    requesterId: string;
    requestDate: string; // ISO
    fromProjectId: string;
    toProjectId: string;
    reason: TransferReason;
    requestedById?: string; // The person who verbally requested the transfer
    remarks?: string;
    items: {
      itemId: string;
      itemType: 'Inventory' | 'UTMachine' | 'DftMachine' | 'DigitalCamera' | 'Anemometer' | 'OtherEquipment';
      name: string;
      serialNumber: string;
      ariesId?: string;
    }[];
    status: InventoryTransferStatus;
    approverId?: string;
    approvalDate?: string; // ISO
    acknowledgedBy?: string; // User ID of supervisor or requestedBy person
    acknowledgedDate?: string; // ISO
    comments?: Comment[];
    viewedByRequester?: boolean;
};

export type DownloadableDocument = {
    id: string;
    title: string;
    description?: string;
    category?: string;
    documentType?: string;
    url: string;
    uploadedBy: string; // userId
    createdAt: string; // ISO string
};

export type LogbookRequest = {
    id: string;
    manpowerId: string;
    requesterId: string;
    requestDate: string; // ISO String
    status: 'Pending' | 'Completed' | 'Rejected';
    remarks?: string;
    viewedBy: { [key: string]: boolean };
    comments?: Comment[];
    approverId?: string;
};

export type InspectionChecklist = {
  id: string;
  itemId: string;
  inspectedById: string;
  reviewedById: string;
  inspectionDate: string; // ISO
  nextDueDate: string; // ISO
  knownHistory?: string;
  findings?: Record<string, string>;
  preliminaryObservation: string;
  conditionSheath: string;
  conditionCore: string;
  sheathsAndTerminations: string;
  otherComponents: string;
  comments?: string;
  remarks?: string;
  verdict: string;
  yearOfManufacture?: string;
  purchaseDate?: string | null;
  firstUseDate?: string | null;
};

export const NOTIFICATION_EVENTS = {
    onNewTask: 'New Task Created',
    onTaskComment: 'New Task Comment',
    onTaskStatusSubmitted: 'Task Status Submitted for Approval',
    onTaskApproved: 'Task Approved',
    onTaskReturned: 'Task Returned for Revision',
    onTaskReassignmentRequest: 'Task Reassignment Requested',
    onPpeRequest: 'New PPE Request',
    onInternalRequest: 'New Internal Store Request',
    onInternalRequestUpdate: 'Update on Request Item',
    onManagementRequest: 'New Management Request',
    onTaskForApproval: 'Task Submitted for Approval',
    onPasswordReset: 'Password Reset Request',
    onUnlockRequest: 'Account Unlock Request',
    onNewIncident: 'New Incident Reported',
    onPurchaseForApproval: 'Purchase Requires Approval',
    onLogbookRequest: 'New Logbook Request',
} as const;

export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;

export type NotificationSettings = {
  events: {
      [key in NotificationEventKey]?: {
          recipientRoles: Role[];
          notifyInvolvedUser?: boolean;
          notifyCreator?: boolean;
          additionalRecipients?: string; // comma-separated emails
      };
  };
  additionalRecipients: string; // comma-separated emails
};
export type Directive = {
  id: string;
  creatorId: string;
  toUserId: string;
  ccUserIds?: string[];
  subject: string;
  body: string;
  status: DirectiveStatus;
  lastUpdated: string;
  comments: Comment[];
  readBy: { [key: string]: boolean };
};
export type DirectiveStatus = 'New' | 'Under Review' | 'Action Taken' | 'Closed';

export type DamageReportStatus = 'Pending' | 'Approved' | 'Rejected' | 'Under Review';

export type DamageReport = {
  id: string;
  itemId: string | null;
  otherItemName: string | null;
  reason: string;
  reporterId: string;
  reportDate: string; // ISO
  status: DamageReportStatus;
  attachmentOriginalUrl?: string | null;
  attachmentDownloadUrl?: string | null;
  attachmentUrl?: string; // Legacy
};

export type DecorationTheme = 'none' | 'christmas' | 'diwali' | 'new-year';

export type VehicleUsageRecord = {
  id: string; // YYYY-MM
  records: {
    [vehicleId: string]: {
      isLocked?: boolean;
      lastUpdated?: string; // ISO
      lastUpdatedById?: string;
      days: { 
        [day: number]: {
          startKm?: number;
          endKm?: number;
          overtime?: string; // HH:mm
          remarks?: string;
          isHoliday?: boolean;
        }
      };
      jobNo?: string;
      vehicleType?: string;
      extraKm?: number;
      headerOvertime?: string;
      extraNight?: number;
      extraDays?: number;
      verifiedBy?: {
        name: string;
        date: string; // ISO
      };
    };
  };
};

