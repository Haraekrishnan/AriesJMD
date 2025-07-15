export type UserRole = 'Admin' | 'Manager' | 'Supervisor' | 'Employee' | 'Store Personnel' | 'HSE' | 'Junior Supervisor' | 'Junior HSE' | 'Store in Charge' | 'Assistant Store Incharge' | 'Team Member' | 'Document Controller';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  directReports?: string[];
  supervisorId?: string;
  projectId?: string;
  planningScore?: number;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed' | 'Overdue' | 'Pending Approval' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type ApprovalState = 'none' | 'pending' | 'approved' | 'rejected';

export interface TaskComment {
    id: string;
    userId: string;
    text: string;
    date: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  assigneeIds?: string[];
  creatorId: string;
  projectId: string;
  comments?: TaskComment[];
  isViewedByAssignee?: boolean;
  requiresAttachmentForCompletion?: boolean;
  approvalState?: ApprovalState;
  completionDate?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
}

export type PlannerEventFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface PlannerEvent {
    id: string;
    title: string;
    description: string;
    date: string;
    frequency: PlannerEventFrequency;
    creatorId: string;
    userId: string;
    comments: { id: string, text: string, userId: string, date: string }[];
}

export interface Achievement {
    id: string;
    userId: string;
    type: 'manual' | 'auto';
    title: string;
    description: string;
    points: number;
    date: string;
    awardedById: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    details: string;
    timestamp: string;
}

export interface DailyPlannerComment {
    id: string;
    date: string; // YYYY-MM-DD
    userId: string;
    comment: string;
}

export type Permission = 
    | 'manage_users' | 'manage_roles' | 'manage_projects' | 'manage_branding'
    | 'manage_tasks' | 'manage_planner' | 'manage_incidents' | 'manage_achievements'
    | 'manage_vehicles' | 'manage_manpower' | 'manage_manpower_list' | 'manage_accommodation'
    | 'approve_store_requests' | 'manage_inventory'
    | 'manage_equipment_status'
    | 'manage_announcements' | 'view_performance_reports' | 'view_activity_logs';

export const ALL_PERMISSIONS: Permission[] = [
    'manage_users', 'manage_roles', 'manage_projects', 'manage_branding',
    'manage_tasks', 'manage_planner', 'manage_incidents', 'manage_achievements',
    'manage_vehicles', 'manage_manpower', 'manage_manpower_list', 'manage_accommodation',
    'approve_store_requests', 'manage_inventory',
    'manage_equipment_status',
    'manage_announcements', 'view_performance_reports', 'view_activity_logs'
];


export interface RoleDefinition {
    id: string;
    name: string;
    permissions: Permission[];
    isEditable: boolean;
}

export interface RequestItem {
    description: string;
    quantity: number;
    remarks: string;
}

export interface InternalRequest {
    id: string;
    requesterId: string;
    items: RequestItem[];
    status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
    approverId?: string;
    date: string;
    comments: { id: string, userId: string, text: string, date: string }[];
    viewedByRequester: boolean;
}

export type InventoryItemStatus = 'In Use' | 'In Store' | 'Damaged' | 'Expired';
export interface InventoryItem {
    id: string;
    name: string;
    serialNumber: string;
    chestCrollNo?: string;
    ariesId?: string;
    status: InventoryItemStatus;
    inspectionDate: string;
    inspectionDueDate: string;
    tpInspectionDueDate: string;
    projectId: string;
    lastUpdated: string;
}

export interface CertificateRequest {
    id: string;
    itemId: string;
    requesterId: string;
    requestType: 'Inspection Certificate' | 'TP Certificate';
    status: 'Pending' | 'Uploaded' | 'Rejected';
    requestDate: string;
    remarks: string;
    comments: { id: string, userId: string, text: string, date: string }[];
}

export interface ManpowerLog {
    id: string;
    date: string; // YYYY-MM-DD
    projectId: string;
    countIn: number;
    countOut: number;
    reason: string;
    updatedBy: string;
    personOutName?: string;
}

export interface UTMachine {
    id: string;
    machineName: string;
    serialNumber: string;
    calibrationDueDate: string;
}

export interface DftMachine {
    id: string;
    machineName: string;
    serialNumber: string;
    calibrationDueDate: string;
}

export interface MobileSim {
    id: string;
    provider: string;
    number: string;
    plan: string;
    assignedTo: string;
}

export interface OtherEquipment {
    id: string;
    equipmentName: string;
    quantity: number;
    location: string;
}


export interface Vehicle {
    id: string;
    vehicleNumber: string;
    driverId: string;
    vapValidity: string;
    insuranceValidity: string;
    fitnessValidity: string;
    taxValidity: string;
    puccValidity: string;
}

export type Trade = 'RA Level 1' | 'RA Level 2' | 'RA Level 3' | 'HSE' | 'Supervisor' | 'Document Controller' | 'Cook';

export interface ManpowerDocument {
    name: string;
    details: string;
    status: 'Collected' | 'Received' | 'Pending' | 'Not Applicable';
    fileUrl?: string;
}

export interface ManpowerLeave {
    id: string;
    leaveType: 'Annual' | 'Sick' | 'Emergency';
    leaveStartDate: string;
    leaveEndDate?: string;
}

export interface ManpowerProfile {
    id: string;
    name: string;
    trade: Trade;
    status: 'Working' | 'On Leave' | 'Resigned' | 'Terminated';
    hardCopyFileNo?: string;
    epNumber?: string;
    plantName?: string;
    eicName?: string;
    joiningDate?: string;
    documents: ManpowerDocument[];
    leaveHistory?: ManpowerLeave[];
}

export interface ManagementRequest {
    id: string;
    requesterId: string;
    recipientId: string;
    subject: string;
    body: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    date: string;
    comments: { id: string, userId: string, text: string, date: string }[];
    viewedByRequester: boolean;
}

export interface Driver {
    id: string;
    name: string;
    licenseNumber: string;
    epNumber: string;
    sdpNumber: string;
    epExpiry: string;
    medicalExpiry: string;
    photo: string;
}

export interface IncidentReport {
    id: string;
    date: string;
    time: string;
    location: string;
    description: string;
    reportedById: string;
    involvedPersonnel: string[];
    severity: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'Under Investigation' | 'Closed';
}

export interface Bed {
    id: string;
    bedNumber: string;
    bedType: 'Bunk' | 'Single';
    occupantId?: string;
}

export interface Room {
    id: string;
    roomNumber: string;
    beds: Bed[];
}

export interface Building {
    id: string;
    buildingNumber: string;
    rooms: Room[];
}

// Previous Event type is replaced by PlannerEvent. If still needed, it should be distinguished.
export interface Event {
  id: string;
  title: string;
  date: string;
  userId: string;
}
