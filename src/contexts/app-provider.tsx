

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback, Subtask, UnlockRequest, PpeInwardRecord, Broadcast, JobRecord, JobRecordPlant, JobCode, InternalRequestItem, TpCertList, InventoryTransferRequest, TRANSFER_REASONS, DownloadableDocument, LogbookRequest, InspectionChecklist } from '../lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid, parseISO, isBefore, isToday, isFuture, endOfWeek, startOfWeek } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get, query, orderByChild, equalTo, onChildAdded, onChildChanged, onChildRemoved } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendPpeRequestEmail } from '@/app/actions/sendPpeRequestEmail';
import { uploadFile } from '@/lib/storage';
import { createAndSendNotification } from '@/app/actions/sendNotificationEmail';
import { JOB_CODES as INITIAL_JOB_CODES, JOB_CODE_COLORS } from '@/lib/job-codes';

type PermissionsObject = Record<Permission, boolean>;

type AppContextType = {
  // State
  user: User | null;
  loading: boolean;
  users: User[];
  roles: RoleDefinition[];
  tasks: Task[];
  projects: Project[];
  jobRecordPlants: JobRecordPlant[];
  jobCodes: JobCode[];
  JOB_CODE_COLORS: typeof JOB_CODE_COLORS;
  plannerEvents: PlannerEvent[];
  dailyPlannerComments: DailyPlannerComment[];
  achievements: Achievement[];
  activityLogs: ActivityLog[];
  vehicles: Vehicle[];
  drivers: Driver[];
  incidentReports: IncidentReport[];
  manpowerLogs: ManpowerLog[];
  manpowerProfiles: ManpowerProfile[];
  internalRequests: InternalRequest[];
  managementRequests: ManagementRequest[];
  inventoryItems: InventoryItem[];
  inventoryTransferRequests: InventoryTransferRequest[];
  utMachines: UTMachine[];
  dftMachines: DftMachine[];
  mobileSims: MobileSim[];
  laptopsDesktops: LaptopDesktop[];
  digitalCameras: DigitalCamera[];
  anemometers: Anemometer[];
  otherEquipments: OtherEquipment[];
  machineLogs: MachineLog[];
  certificateRequests: CertificateRequest[];
  announcements: Announcement[];
  broadcasts: Broadcast[];
  buildings: Building[];
  jobSchedules: JobSchedule[];
  jobRecords: { [key: string]: JobRecord };
  ppeRequests: PpeRequest[];
  ppeStock: PpeStock[];
  ppeInwardHistory: PpeInwardRecord[];
  payments: Payment[];
  vendors: Vendor[];
  purchaseRegisters: PurchaseRegister[];
  passwordResetRequests: PasswordResetRequest[];
  igpOgpRecords: IgpOgpRecord[];
  feedback: Feedback[];
  unlockRequests: UnlockRequest[];
  tpCertLists: TpCertList[];
  downloadableDocuments: DownloadableDocument[];
  logbookRequests: LogbookRequest[];
  inspectionChecklists: InspectionChecklist[];
  appName: string;
  appLogo: string | null;
  isManpowerUpdatedToday: boolean;
  lastManpowerUpdate: string | null;
  workingManpowerCount: number;
  onLeaveManpowerCount: number;

  // Auth
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User }>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatarFile: File | null, password?: string) => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  generateResetCode: (requestId: string) => void;
  resolveResetRequest: (requestId: string) => void;
  resetPassword: (email: string, code: string, newPass: string) => Promise<boolean>;
  lockUser: (userId: string) => void;
  unlockUser: (userId: string) => void;
  requestUnlock: (userId: string, userName: string) => void;
  resolveUnlockRequest: (requestId: string, userId: string) => void;

  // Permissions
  can: PermissionsObject;

  // Computed Data
  pendingTaskApprovalCount: number;
  myNewTaskCount: number;
  myPendingTaskRequestCount: number;
  myFulfilledStoreCertRequestCount: number;
  myFulfilledEquipmentCertRequests: CertificateRequest[];
  pendingStoreCertRequestCount: number;
  pendingEquipmentCertRequestCount: number;
  plannerNotificationCount: number;
  pendingInternalRequestCount: number;
  updatedInternalRequestCount: number;
  pendingManagementRequestCount: number;
  updatedManagementRequestCount: number;
  incidentNotificationCount: number;
  pendingPpeRequestCount: number;
  updatedPpeRequestCount: number;
  pendingPaymentApprovalCount: number;
  pendingPasswordResetRequestCount: number;
  pendingFeedbackCount: number;
  pendingUnlockRequestCount: number;
  pendingInventoryTransferRequestCount: number;
  allCompletedTransferRequests: InventoryTransferRequest[];
  pendingLogbookRequestCount: number;

  // Functions
  getVisibleUsers: () => User[];
  getAssignableUsers: () => User[];
  createTask: (task: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'participants' | 'lastUpdated' | 'viewedBy' | 'viewedByApprover' | 'viewedByRequester'> & { assigneeIds: string[] }) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  submitTaskForApproval: (taskId: string) => void;
  approveTask: (taskId: string, comment?: string) => void;
  returnTask: (taskId: string, comment: string) => void;
  requestTaskStatusChange: (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => Promise<void>;
  approveTaskStatusChange: (taskId: string, comment: string) => void;
  returnTaskStatusChange: (taskId: string, comment: string) => void;
  addComment: (taskId: string, commentText: string) => void;
  markTaskAsViewed: (taskId: string) => void;
  acknowledgeReturnedTask: (taskId: string) => void;
  requestTaskReassignment: (taskId: string, newAssigneeId: string, comment: string) => void;
  getExpandedPlannerEvents: (month: Date, userId: string) => (PlannerEvent & { eventDate: Date })[];
  addPlannerEvent: (event: Omit<PlannerEvent, 'id'>) => void;
  updatePlannerEvent: (event: PlannerEvent) => void;
  deletePlannerEvent: (eventId: string) => void;
  addPlannerEventComment: (plannerUserId: string, day: string, eventId: string, text: string) => void;
  markSinglePlannerCommentAsRead: (plannerUserId: string, day: string, commentId: string) => void;
  dismissPendingUpdate: (eventId: string, day: string) => void;
  awardManualAchievement: (achievement: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => void;
  updateManualAchievement: (achievement: Achievement) => void;
  deleteManualAchievement: (achievementId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (user: User) => void;
  updateUserPlanningScore: (userId: string, score: number) => void;
  deleteUser: (userId: string) => void;
  addRole: (role: Omit<RoleDefinition, 'id' | 'isEditable'>) => void;
  updateRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => void;
  addProject: (projectName: string, isPlant: boolean) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => void;
  addDriver: (driver: Omit<Driver, 'id' | 'photo'>) => void;
  updateDriver: (driver: Driver) => void;
  deleteDriver: (driverId: string) => void;
  addIncidentReport: (incident: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => void;
  updateIncident: (incident: IncidentReport, comment: string) => void;
  addIncidentComment: (incidentId: string, text: string) => void;
  publishIncident: (incidentId: string, comment: string) => void;
  addUsersToIncidentReport: (incidentId: string, userIds: string[], comment: string) => void;
  markIncidentAsViewed: (incidentId: string) => void;
  addManpowerLog: (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'total'>> & { projectId: string }, logDate?: Date) => Promise<void>;
  updateManpowerLog: (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName' | 'openingManpower'>>) => Promise<void>;
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => Promise<void>;
  addMultipleManpowerProfiles: (profiles: any[]) => number;
  updateManpowerProfile: (profile: ManpowerProfile) => Promise<void>;
  deleteManpowerProfile: (profileId: string) => void;
  addLeaveForManpower: (manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => void;
  extendLeave: (manpowerId: string, leaveId: string, newEndDate: Date) => void;
  rejoinFromLeave: (manpowerId: string, leaveId: string, rejoinedDate: Date) => void;
  confirmManpowerLeave: (manpowerId: string, leaveId: string) => void;
  cancelManpowerLeave: (manpowerId: string, leaveId: string) => void;
  updateLeaveRecord: (manpowerId: string, leaveRecord: LeaveRecord) => void;
  deleteLeaveRecord: (manpowerId: string, leaveId: string) => void;
  addMemoOrWarning: (manpowerId: string, memo: Omit<MemoRecord, 'id'>) => void;
  updateMemoRecord: (manpowerId: string, memo: MemoRecord) => void;
  deleteMemoRecord: (manpowerId: string, memoId: string) => void;
  addPpeHistoryRecord: (manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => void;
  updatePpeHistoryRecord: (manpowerId: string, record: PpeHistoryRecord) => void;
  deletePpeHistoryRecord: (manpowerId: string, recordId: string) => void;
  addPpeHistoryFromExcel: (data: any[]) => Promise<{ importedCount: number; notFoundCount: number; }>;
  addInternalRequest: (request: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => void;
  updateInternalRequestItem: (requestId: string, item: InternalRequestItem, originalItem: InternalRequestItem) => void;
  resolveInternalRequestDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => void;
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus, comment: string) => void;
  updateInternalRequestItemStatus: (requestId: string, itemId: string, status: InternalRequestItemStatus, comment: string) => void;
  addInternalRequestComment: (requestId: string, commentText: string, notify?: boolean) => void;
  deleteInternalRequest: (requestId: string) => void;
  forceDeleteInternalRequest: (requestId: string) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  acknowledgeInternalRequest: (requestId: string) => void;
  addManagementRequest: (request: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => void;
  updateManagementRequest: (request: ManagementRequest) => void;
  updateManagementRequestStatus: (requestId: string, status: ManagementRequestStatus, comment: string) => void;
  deleteManagementRequest: (requestId: string) => void;
  markManagementRequestAsViewed: (requestId: string) => void;
  addPpeRequest: (request: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updatePpeRequest: (request: PpeRequest) => void;
  updatePpeRequestStatus: (requestId: string, status: PpeRequestStatus, comment: string) => void;
  addPpeRequestComment: (requestId: string, commentText: string, notify?: boolean) => void;
  resolvePpeDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => void;
  deletePpeRequest: (requestId: string) => void;
  deletePpeAttachment: (requestId: string) => void;
  markPpeRequestAsViewed: (requestId: string) => void;
  updatePpeStock: (stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => void;
  addPpeInwardRecord: (record: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => void;
  updatePpeInwardRecord: (record: PpeInwardRecord) => void;
  deletePpeInwardRecord: (record: PpeInwardRecord) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItem: (item: InventoryItem) => void;
  updateInventoryItemGroup: (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => void;
  updateInventoryItemGroupByProject: (itemName: string, projectId: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => void;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  deleteInventoryItemGroup: (itemName: string) => Promise<void>;
  renameInventoryItemGroup: (oldName: string, newName: string) => void;
  addInventoryTransferRequest: (request: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => void;
  deleteInventoryTransferRequest: (requestId: string) => void;
  approveInventoryTransferRequest: (request: InventoryTransferRequest, createTpList: boolean) => void;
  rejectInventoryTransferRequest: (requestId: string, comment: string) => void;
  disputeInventoryTransfer: (requestId: string, comment: string) => void;
  acknowledgeTransfer: (requestId: string) => void;
  clearInventoryTransferHistory: () => void;
  addCertificateRequest: (requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => void;
  fulfillCertificateRequest: (requestId: string, comment: string) => void;
  addCertificateRequestComment: (requestId: string, comment: string) => void;
  markFulfilledRequestsAsViewed: (requestType: 'store' | 'equipment') => void;
  acknowledgeFulfilledRequest: (requestId: string) => void;
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => void;
  updateUTMachine: (machine: UTMachine) => void;
  deleteUTMachine: (machineId: string) => void;
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => void;
  updateDftMachine: (machine: DftMachine) => void;
  deleteDftMachine: (machineId: string) => void;
  addMobileSim: (item: Omit<MobileSim, 'id'>) => void;
  updateMobileSim: (item: MobileSim) => void;
  deleteMobileSim: (itemId: string) => void;
  addLaptopDesktop: (item: Omit<LaptopDesktop, 'id'>) => void;
  updateLaptopDesktop: (item: LaptopDesktop) => void;
  deleteLaptopDesktop: (itemId: string) => void;
  addDigitalCamera: (camera: Omit<DigitalCamera, 'id'>) => void;
  updateDigitalCamera: (camera: DigitalCamera) => void;
  deleteDigitalCamera: (cameraId: string) => void;
  addAnemometer: (anemometer: Omit<Anemometer, 'id'>) => void;
  updateAnemometer: (anemometer: Anemometer) => void;
  deleteAnemometer: (anemometerId: string) => void;
  addOtherEquipment: (equipment: Omit<OtherEquipment, 'id'>) => void;
  updateOtherEquipment: (equipment: OtherEquipment) => void;
  deleteOtherEquipment: (equipmentId: string) => void;
  addMachineLog: (log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => void;
  deleteMachineLog: (logId: string) => void;
  getMachineLogs: (machineId: string) => MachineLog[];
  updateBranding: (name: string, logo: string | null) => void;
  addAnnouncement: (data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => void;
  updateAnnouncement: (announcement: Announcement) => void;
  approveAnnouncement: (announcementId: string) => void;
  rejectAnnouncement: (announcementId: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  returnAnnouncement: (announcementId: string, comment: string) => void;
  dismissBroadcast: (broadcastId: string) => void;
  addBroadcast: (broadcastData: Omit<Broadcast, 'id'|'creatorId'|'createdAt'|'dismissedBy'>) => void;
  dismissAnnouncement: (announcementId: string) => void;
  addBuilding: (buildingNumber: string) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  updateRoom: (buildingId: string, room: Room) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  addBed: (buildingId: string, roomId: string) => void;
  updateBed: (buildingId: string, roomId: string, bed: Bed) => void;
  deleteBed: (buildingId: string, roomId: string, bedId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
  saveJobSchedule: (schedule: JobSchedule) => void;
  addJobRecordPlant: (plantName: string) => void;
  deleteJobRecordPlant: (plantId: string) => void;
  addJobCode: (jobCode: Omit<JobCode, 'id'>) => void;
  updateJobCode: (jobCode: JobCode) => void;
  deleteJobCode: (jobCodeId: string) => void;
  saveJobRecord: (monthKey: string, employeeId: string, day: number | null, codeOrValue: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'dailyComments' | 'sundayDuty') => void;
  savePlantOrder: (monthKey: string, plantName: string, orderedIds: string[]) => void;
  lockJobSchedule: (date: string) => void;
  unlockJobSchedule: (date: string, projectId: string) => void;
  lockJobRecordSheet: (monthKey: string) => void;
  unlockJobRecordSheet: (monthKey: string) => void;
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (vendorId: string) => void;
  addPayment: (payment: Omit<Payment, 'id'|'requesterId'|'status'|'approverId'|'date'|'comments'>) => void;
  updatePayment: (payment: Payment) => void;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, comment: string) => void;
  deletePayment: (paymentId: string) => void;
  addPurchaseRegister: (purchase: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => void;
  updatePurchaseRegister: (purchase: PurchaseRegister) => void;
  updatePurchaseRegisterPoNumber: (purchaseRegisterId: string, poNumber: string) => void;
  deletePurchaseRegister: (id: string) => void;
  addIgpOgpRecord: (record: Omit<IgpOgpRecord, 'id'|'creatorId'>) => void;
  addFeedback: (subject: string, message: string) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  markFeedbackAsViewed: () => void;
  addTpCertList: (listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => void;
  updateTpCertList: (listData: TpCertList) => void;
  deleteTpCertList: (listId: string) => void;
  addDocument: (data: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => void;
  updateDocument: (doc: DownloadableDocument) => void;
  deleteDocument: (docId: string) => void;
  addLogbookRequest: (manpowerId: string, remarks?: string) => void;
  updateLogbookRequestStatus: (requestId: string, status: 'Completed' | 'Rejected', comment: string) => void;
  addLogbookRequestComment: (requestId: string, text: string) => void;
  deleteLogbookRecord: (manpowerId: string, onComplete: () => void) => void;
  addInspectionChecklist: (checklist: Omit<InspectionChecklist, 'id'>) => void;
  updateInspectionChecklist: (checklist: InspectionChecklist) => void;
  deleteInspectionChecklist: (id: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generic listener function
const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);

    const listeners = [
        onChildAdded(dbRef, (snapshot) => {
            setData(prev => ({ ...prev, [snapshot.key as string]: { id: snapshot.key, ...snapshot.val() } }));
        }),
        onChildChanged(dbRef, (snapshot) => {
            setData(prev => ({ ...prev, [snapshot.key as string]: { id: snapshot.key, ...snapshot.val() } }));
        }),
        onChildRemoved(dbRef, (snapshot) => {
            setData(prev => {
                const newState = { ...prev };
                delete newState[snapshot.key as string];
                return newState;
            });
        })
    ];

    return () => listeners.forEach(listener => listener());
};

export function AppProvider({ children }: { children: ReactNode }) {
  // SECTION: State Declarations
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [storedUserId, setStoredUserId] = useLocalStorage<string | null>('aries-userId-v1', null);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [rolesById, setRolesById] = useState<Record<string, RoleDefinition>>({});
  const [tasksById, setTasksById] = useState<Record<string, Task>>({});
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [jobRecordPlantsById, setJobRecordPlantsById] = useState<Record<string, JobRecordPlant>>({});
  const [jobCodesById, setJobCodesById] = useState<Record<string, JobCode>>({});
  const [plannerEventsById, setPlannerEventsById] = useState<Record<string, PlannerEvent>>({});
  const [dailyPlannerCommentsById, setDailyPlannerCommentsById] = useState<Record<string, DailyPlannerComment>>({});
  const [achievementsById, setAchievementsById] = useState<Record<string, Achievement>>({});
  const [activityLogsById, setActivityLogsById] = useState<Record<string, ActivityLog>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<string, Vehicle>>({});
  const [driversById, setDriversById] = useState<Record<string, Driver>>({});
  const [incidentReportsById, setIncidentReportsById] = useState<Record<string, IncidentReport>>({});
  const [manpowerLogsById, setManpowerLogsById] = useState<Record<string, ManpowerLog>>({});
  const [manpowerProfilesById, setManpowerProfilesById] = useState<Record<string, ManpowerProfile>>({});
  const [internalRequestsById, setInternalRequestsById] = useState<Record<string, InternalRequest>>({});
  const [managementRequestsById, setManagementRequestsById] = useState<Record<string, ManagementRequest>>({});
  const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
  const [inventoryTransferRequestsById, setInventoryTransferRequestsById] = useState<Record<string, InventoryTransferRequest>>({});
  const [utMachinesById, setUtMachinesById] = useState<Record<string, UTMachine>>({});
  const [dftMachinesById, setDftMachinesById] = useState<Record<string, DftMachine>>({});
  const [mobileSimsById, setMobileSimsById] = useState<Record<string, MobileSim>>({});
  const [laptopsDesktopsById, setLaptopsDesktopsById] = useState<Record<string, LaptopDesktop>>({});
  const [digitalCamerasById, setDigitalCamerasById] = useState<Record<string, DigitalCamera>>({});
  const [anemometersById, setAnemometersById] = useState<Record<string, Anemometer>>({});
  const [otherEquipmentsById, setOtherEquipmentsById] = useState<Record<string, OtherEquipment>>({});
  const [machineLogsById, setMachineLogsById] = useState<Record<string, MachineLog>>({});
  const [certificateRequestsById, setCertificateRequestsById] = useState<Record<string, CertificateRequest>>({});
  const [announcementsById, setAnnouncementsById] = useState<Record<string, Announcement>>({});
  const [broadcastsById, setBroadcastsById] = useState<Record<string, Broadcast>>({});
  const [buildingsById, setBuildingsById] = useState<Record<string, Building>>({});
  const [jobSchedulesById, setJobSchedulesById] = useState<Record<string, JobSchedule>>({});
  const [jobRecordsById, setJobRecordsById] = useState<Record<string, JobRecord>>({});
  const [ppeRequestsById, setPpeRequestsById] = useState<Record<string, PpeRequest>>({});
  const [ppeStockById, setPpeStockById] = useState<Record<string, PpeStock>>({});
  const [ppeInwardHistoryById, setPpeInwardHistoryById] = useState<Record<string, PpeInwardRecord>>({});
  const [paymentsById, setPaymentsById] = useState<Record<string, Payment>>({});
  const [vendorsById, setVendorsById] = useState<Record<string, Vendor>>({});
  const [purchaseRegistersById, setPurchaseRegistersById] = useState<Record<string, PurchaseRegister>>({});
  const [passwordResetRequestsById, setPasswordResetRequestsById] = useState<Record<string, PasswordResetRequest>>({});
  const [igpOgpRecordsById, setIgpOgpRecordsById] = useState<Record<string, IgpOgpRecord>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, Feedback>>({});
  const [unlockRequestsById, setUnlockRequestsById] = useState<Record<string, UnlockRequest>>({});
  const [tpCertListsById, setTpCertListsById] = useState<Record<string, TpCertList>>({});
  const [downloadableDocumentsById, setDownloadableDocumentsById] = useState<Record<string, DownloadableDocument>>({});
  const [logbookRequestsById, setLogbookRequestsById] = useState<Record<string, LogbookRequest>>({});
  const [inspectionChecklistsById, setInspectionChecklistsById] = useState<Record<string, InspectionChecklist>>({});
  const [dismissedPendingUpdatesById, setDismissedPendingUpdatesById] = useState<Record<string, boolean>>({});

  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);

  // SECTION: Memoized Data Arrays
  const users = useMemo(() => Object.values(usersById), [usersById]);
  const roles = useMemo(() => Object.values(rolesById), [rolesById]);
  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);
  const projects = useMemo(() => Object.values(projectsById), [projectsById]);
  const jobRecordPlants = useMemo(() => Object.values(jobRecordPlantsById), [jobRecordPlantsById]);
  const jobCodes = useMemo(() => Object.values(jobCodesById), [jobCodesById]);
  const plannerEvents = useMemo(() => Object.values(plannerEventsById), [plannerEventsById]);
  const dailyPlannerComments = useMemo(() => Object.values(dailyPlannerCommentsById), [dailyPlannerCommentsById]);
  const achievements = useMemo(() => Object.values(achievementsById), [achievementsById]);
  const activityLogs = useMemo(() => Object.values(activityLogsById), [activityLogsById]);
  const vehicles = useMemo(() => Object.values(vehiclesById), [vehiclesById]);
  const drivers = useMemo(() => Object.values(driversById), [driversById]);
  const incidentReports = useMemo(() => Object.values(incidentReportsById), [incidentReportsById]);
  const manpowerLogs = useMemo(() => Object.values(manpowerLogsById), [manpowerLogsById]);
  const manpowerProfiles = useMemo(() => Object.values(manpowerProfilesById), [manpowerProfilesById]);
  const internalRequests = useMemo(() => Object.values(internalRequestsById), [internalRequestsById]);
  const managementRequests = useMemo(() => Object.values(managementRequestsById), [managementRequestsById]);
  const inventoryItems = useMemo(() => Object.values(inventoryItemsById), [inventoryItemsById]);
  const inventoryTransferRequests = useMemo(() => Object.values(inventoryTransferRequestsById), [inventoryTransferRequestsById]);
  const utMachines = useMemo(() => Object.values(utMachinesById), [utMachinesById]);
  const dftMachines = useMemo(() => Object.values(dftMachinesById), [dftMachinesById]);
  const mobileSims = useMemo(() => Object.values(mobileSimsById), [mobileSimsById]);
  const laptopsDesktops = useMemo(() => Object.values(laptopsDesktopsById), [laptopsDesktopsById]);
  const digitalCameras = useMemo(() => Object.values(digitalCamerasById), [digitalCamerasById]);
  const anemometers = useMemo(() => Object.values(anemometersById), [anemometersById]);
  const otherEquipments = useMemo(() => Object.values(otherEquipmentsById), [otherEquipmentsById]);
  const machineLogs = useMemo(() => Object.values(machineLogsById), [machineLogsById]);
  const certificateRequests = useMemo(() => Object.values(certificateRequestsById), [certificateRequestsById]);
  const announcements = useMemo(() => Object.values(announcementsById), [announcementsById]);
  const broadcasts = useMemo(() => Object.values(broadcastsById), [broadcastsById]);
  const buildings = useMemo(() => Object.values(buildingsById), [buildingsById]);
  const jobSchedules = useMemo(() => Object.values(jobSchedulesById), [jobSchedulesById]);
  const jobRecords = useMemo(() => jobRecordsById, [jobRecordsById]);
  const ppeRequests = useMemo(() => Object.values(ppeRequestsById), [ppeRequestsById]);
  const ppeStock = useMemo(() => Object.values(ppeStockById), [ppeStockById]);
  const ppeInwardHistory = useMemo(() => Object.values(ppeInwardHistoryById), [ppeInwardHistoryById]);
  const payments = useMemo(() => Object.values(paymentsById), [paymentsById]);
  const vendors = useMemo(() => Object.values(vendorsById), [vendorsById]);
  const purchaseRegisters = useMemo(() => Object.values(purchaseRegistersById), [purchaseRegistersById]);
  const passwordResetRequests = useMemo(() => Object.values(passwordResetRequestsById), [passwordResetRequestsById]);
  const igpOgpRecords = useMemo(() => Object.values(igpOgpRecordsById), [igpOgpRecordsById]);
  const feedback = useMemo(() => Object.values(feedbackById), [feedbackById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  const tpCertLists = useMemo(() => Object.values(tpCertListsById), [tpCertListsById]);
  const downloadableDocuments = useMemo(() => Object.values(downloadableDocumentsById), [downloadableDocumentsById]);
  const logbookRequests = useMemo(() => Object.values(logbookRequestsById), [logbookRequestsById]);
  const inspectionChecklists = useMemo(() => Object.values(inspectionChecklistsById), [inspectionChecklistsById]);

  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // SECTION: PERMISSIONS
  const can: PermissionsObject = useMemo(() => {
    const userRole = roles.find(r => r.name === user?.role);
    const permissions = userRole?.permissions || [];
    const canObject: PermissionsObject = {} as PermissionsObject;
    for (const permission of ALL_PERMISSIONS) {
      canObject[permission] = permissions.includes(permission);
    }
    return canObject;
  }, [user, roles]);

  // SECTION: ALL FUNCTION DEFINITIONS START HERE
  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    if (!userId) {
        console.error("addActivityLog: userId is undefined or null");
        return;
    }
    const logRef = push(ref(rtdb, 'activityLogs'));
    const newLog: Partial<ActivityLog> = {
        userId,
        action,
        timestamp: new Date().toISOString(),
    };
    if (details) {
        newLog.details = details;
    }
    set(logRef, newLog);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; user?: User }> => {
    setLoading(true);
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const foundUser = { id: userId, ...usersData[userId] };

        if (foundUser.password === pass) {
            setStoredUserId(foundUser.id);
            addActivityLog(foundUser.id, 'User Logged In');
            
            // Let the useEffect triggered by setStoredUserId handle setting user and loading state
            return { success: true, user: foundUser };
        }
    }
    setLoading(false);
    return { success: false };
  }, [setStoredUserId, addActivityLog]);

  const logout = useCallback(() => {
    if (user) {
      addActivityLog(user.id, 'User Logged Out');
    }
    setStoredUserId(null);
    setUser(null);
    router.push('/login');
  }, [user, setStoredUserId, router, addActivityLog]);
  
  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    const dataToSave: any = { ...data };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
      dataToSave.supervisorId = null;
    }
    update(ref(rtdb, `users/${id}`), dataToSave);
    if (user) {
      addActivityLog(user.id, 'User Profile Updated', `Updated details for ${updatedUser.name}`);
      if (user.id === updatedUser.id) setUser(updatedUser);
    }
  }, [user, addActivityLog]);

  const updateProfile = useCallback(async (name: string, email: string, avatarFile: File | null, password?: string) => {
    if (user) {
        const updatedUser: User = { ...user, name, email };
        if (password) updatedUser.password = password;

        if (avatarFile) {
            try {
                const avatarUrl = await uploadFile(avatarFile, `avatars/${user.id}/${avatarFile.name}`);
                updatedUser.avatar = avatarUrl;
            } catch (error) {
                console.error("Avatar upload failed:", error);
                toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload new profile picture." });
            }
        }
        updateUser(updatedUser);
    }
  }, [user, updateUser, toast]);
  
  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) {
        return false;
    }
    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    const targetUser = { id: userId, ...userData[userId] };
    
    const newRequest: Omit<PasswordResetRequest, 'id'> = {
      userId: targetUser.id,
      email: targetUser.email,
      date: new Date().toISOString(),
      status: 'pending',
    };
    const newRequestRef = push(ref(rtdb, 'passwordResetRequests'));
    await set(newRequestRef, newRequest);

    const admins = users.filter(u => u.role === 'Admin');
    admins.forEach(admin => {
        if (admin.email) {
            createAndSendNotification(
                admin.email,
                `Password Reset Request from ${targetUser.email}`,
                'Password Reset Request',
                { 'User Email': targetUser.email },
                `${process.env.NEXT_PUBLIC_APP_URL}/account`,
                'View Requests'
            );
        }
    });

    return true;
  }, [users]);
  
  const generateResetCode = useCallback((requestId: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    update(ref(rtdb, `passwordResetRequests/${requestId}`), { resetCode: code });
  }, []);

  const resolveResetRequest = useCallback((requestId: string) => {
    update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });
  }, []);
  
  const resetPassword = useCallback(async (email: string, code: string, newPass: string): Promise<boolean> => {
    const requestsRef = query(ref(rtdb, 'passwordResetRequests'), orderByChild('email'), equalTo(email));
    const snapshot = await get(requestsRef);
    if (!snapshot.exists()) return false;
    
    const requestsData = snapshot.val();
    let validRequest: PasswordResetRequest | null = null;
    let requestId: string | null = null;

    for (const key in requestsData) {
      if (requestsData[key].resetCode === code && requestsData[key].status === 'pending') {
        validRequest = { id: key, ...requestsData[key] };
        requestId = key;
        break;
      }
    }
    
    if (!validRequest || !requestId) return false;
    
    await update(ref(rtdb, `users/${validRequest.userId}`), { password: newPass });
    await update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });

    addActivityLog(validRequest.userId, 'Password Reset');
    return true;

  }, [addActivityLog]);
  
  const lockUser = useCallback((userId: string) => {
    update(ref(rtdb, `users/${userId}`), { status: 'locked' });
  }, []);

  const unlockUser = useCallback((userId: string) => {
    update(ref(rtdb, `users/${userId}`), { status: 'active' });
  }, []);

  const requestUnlock = useCallback((userId: string, userName: string) => {
    const newRequestRef = push(ref(rtdb, 'unlockRequests'));
    const newRequest: Omit<UnlockRequest, 'id'> = {
        userId,
        userName,
        date: new Date().toISOString(),
        status: 'pending',
    };
    set(newRequestRef, newRequest);
  }, []);

  const resolveUnlockRequest = useCallback((requestId: string, userId: string) => {
    unlockUser(userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [unlockUser]);
  
  const getSubordinateChain = useCallback((userId: string, allUsers: User[]): Set<string> => {
    const subordinates = new Set<string>();
    const queue = [userId];
    const visited = new Set<string>();
  
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if(visited.has(currentId)) continue;
        visited.add(currentId);

        const directReports = allUsers.filter(u => u.supervisorId === currentId);
        directReports.forEach(report => {
            if (!subordinates.has(report.id)) {
                subordinates.add(report.id);
                queue.push(report.id);
            }
        });
    }
    return subordinates;
  }, []);

  const getVisibleUsers = useCallback(() => {
    if (!user) return [];
  
    const highLevelRoles: Role[] = ['Admin', 'Manager', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    const supervisorRoles: Role[] = ['Supervisor', 'Junior Supervisor', 'Senior Safety Supervisor', 'Safety Supervisor'];
  
    if (highLevelRoles.includes(user.role)) {
      if (user.role === 'Manager' || user.role === 'Admin') return users;
      if (user.role === 'Project Coordinator') return users.filter(u => u.role !== 'Manager');
      if (user.role === 'Store in Charge' || user.role === 'Document Controller' || user.role === 'Assistant Store Incharge') {
          return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator');
      }
    }
  
    let visibleUserIds = new Set<string>([user.id]);
    
    // Add own direct reports
    const myDirectReports = users.filter(u => u.supervisorId === user.id);
    myDirectReports.forEach(u => visibleUserIds.add(u.id));

    // For supervisors, add peers' teams if their common manager is also a supervisor
    if (supervisorRoles.includes(user.role) && user.supervisorId) {
        const directSupervisor = users.find(u => u.id === user.supervisorId);
        
        // ONLY if the direct supervisor is ALSO a supervisor, get their reports
        if (directSupervisor && supervisorRoles.includes(directSupervisor.role)) {
            const supervisorSubordinates = getSubordinateChain(directSupervisor.id, users);
            supervisorSubordinates.forEach(id => visibleUserIds.add(id));
        }
    }
  
    return users.filter(u => visibleUserIds.has(u.id) && u.id !== user.supervisorId);
  }, [user, users, getSubordinateChain]);

  const getAssignableUsers = useCallback(() => {
    if (!user) return [];
    
    let assignableUsers = getVisibleUsers();
  
    assignableUsers = assignableUsers.filter(u => u.role !== 'Manager');
  
    const supervisorChain = new Set<string>();
    let currentUser: User | undefined = user;
    while(currentUser?.supervisorId) {
        supervisorChain.add(currentUser.supervisorId);
        currentUser = users.find(u => u.id === currentUser?.supervisorId);
        if (!currentUser) break;
    }

    const assignable = assignableUsers.filter(u => !supervisorChain.has(u.id));

    return assignable;
  }, [user, users, getVisibleUsers]);
  
  const addComment = useCallback((taskId: string, commentText: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: taskId };
    
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    const allParticipants = new Set(task.participants || []);
    if (task.creatorId) allParticipants.add(task.creatorId);
    if (task.assigneeIds) task.assigneeIds.forEach(id => allParticipants.add(id));

    allParticipants.forEach(participantId => {
        if (participantId !== user.id) {
            updates[`tasks/${taskId}/viewedBy/${participantId}`] = false;
        }
    });

    update(ref(rtdb), updates);

    allParticipants.forEach(participantId => {
        if (participantId !== user.id) {
            const participant = users.find(u => u.id === participantId);
            if (participant && participant.email) {
                createAndSendNotification(
                    participant.email,
                    `New comment on task: ${task.title}`,
                    `New comment from ${user.name}`,
                    {
                        'Task': task.title,
                        'Comment': commentText
                    },
                    `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
                    'View Task'
                );
            }
        }
    });
  }, [user, tasksById, users]);
  
  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'internalRequests'));
    
    const newRequest: Omit<InternalRequest, 'id'> = {
      ...requestData,
      items: requestData.items.map(item => ({ ...item, status: 'Pending', inventoryItemId: item.inventoryItemId || null })),
      requesterId: user.id,
      date: new Date().toISOString(),
      status: 'Pending',
      viewedByRequester: true,
      acknowledgedByRequester: false
    };

    set(newRef, newRequest);
    addActivityLog(user.id, "Internal Request Created");
  }, [user, addActivityLog]);
  
  const addInternalRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);

    if (notify) {
        const requester = users.find(u => u.id === request.requesterId);
        if(requester && requester.email) {
            createAndSendNotification(
                requester.email,
                `New comment on your store request #${request.id.slice(-6)}`,
                `New comment from ${user.name}`,
                {
                    'Request ID': `#${request.id.slice(-6)}`,
                    'Comment': commentText
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
                'View Request'
            );
        }
    }
  }, [user, internalRequestsById, users]);

  const updateInternalRequestItem = useCallback((requestId: string, item: InternalRequestItem, originalItem: InternalRequestItem) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const updates: { [key: string]: any } = {};
    const itemIndex = request.items.findIndex(i => i.id === item.id);
    if (itemIndex > -1) {
        updates[`internalRequests/${requestId}/items/${itemIndex}`] = item;
        addInternalRequestComment(requestId, `Item "${originalItem.description}" updated to "${item.description}" (Qty: ${item.quantity}).`, true);
    }

    update(ref(rtdb), updates);
  }, [user, internalRequestsById, addInternalRequestComment]);

  const resolveInternalRequestDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request || request.status !== 'Disputed') return;
  
    addInternalRequestComment(requestId, `Dispute resolved by ${user.name}: ${resolution}. Comment: ${comment}`, true);
  
    const updates: { [key: string]: any } = {};
  
    if (resolution === 'reissue') {
      // Set all items back to approved to be re-issued
      const newItems = request.items.map(item => ({ ...item, status: 'Approved' as InternalRequestItemStatus }));
      updates[`internalRequests/${requestId}/items`] = newItems;
      updates[`internalRequests/${requestId}/status`] = 'Partially Approved';
    } else { // reverse
      // Confirm all items as issued
      const newItems = request.items.map(item => ({ ...item, status: 'Issued' as InternalRequestItemStatus }));
      updates[`internalRequests/${requestId}/items`] = newItems;
      updates[`internalRequests/${requestId}/status`] = 'Issued';
    }
    
    update(ref(rtdb), updates);
  
  }, [user, internalRequestsById, addInternalRequestComment]);

  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/status`] = status;
    updates[`internalRequests/${requestId}/approverId`] = user.id;

    if (comment) addInternalRequestComment(requestId, comment, true);

    const allItemsArePending = request.items.every(item => item.status === 'Pending');
    if (allItemsArePending) {
        const newItems = request.items.map(item => ({ ...item, status: status as InternalRequestItemStatus }));
        updates[`internalRequests/${requestId}/items`] = newItems;
    }

    update(ref(rtdb), updates);

    const requester = users.find(u => u.id === request.requesterId);
    if (requester?.email) {
      createAndSendNotification(
        requester.email,
        `Update on your Store Request #${request.id.slice(-6)}`,
        `Your request status is now: ${status}`,
        {
          'Updated By': user.name,
          'Comment': comment || 'No comment provided.',
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'View Request'
      );
    }
  }, [user, can.approve_store_requests, internalRequests, addInternalRequestComment, users]);
  
  const updateInternalRequestItemStatus = useCallback((requestId: string, itemId: string, status: InternalRequestItemStatus, comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;
    
    addInternalRequestComment(requestId, `Item "${request.items.find(i => i.id === itemId)?.description}" status changed to ${status}. Reason: ${comment}`, true);

    const updates: { [key: string]: any } = {};
    const itemIndex = request.items.findIndex(i => i.id === itemId);
    if(itemIndex > -1) {
        updates[`internalRequests/${requestId}/items/${itemIndex}/status`] = status;
    }

    // Determine the overall status
    const newItems = [...request.items];
    if (itemIndex > -1) newItems[itemIndex].status = status;

    const allApproved = newItems.every(i => i.status === 'Approved');
    const allIssued = newItems.every(i => i.status === 'Issued');
    const allRejected = newItems.every(i => i.status === 'Rejected');
    
    let overallStatus: InternalRequestStatus = 'Partially Approved';
    if (allIssued) overallStatus = 'Issued';
    else if (allApproved) overallStatus = 'Approved';
    else if (allRejected) overallStatus = 'Rejected';

    updates[`internalRequests/${requestId}/status`] = overallStatus;

    update(ref(rtdb), updates);
  }, [user, can.approve_store_requests, internalRequests, addInternalRequestComment]);

  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Context Value
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can,
    pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, isManpowerUpdatedToday: false, lastManpowerUpdate: null, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0, pendingUnlockRequestCount: 0, pendingInventoryTransferRequestCount: 0, allCompletedTransferRequests: [], pendingLogbookRequestCount: 0,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markSinglePlannerCommentAsRead, dismissPendingUpdate, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestItem, resolveInternalRequestDispute, updateInternalRequestStatus, updateInternalRequestItemStatus, addInternalRequestComment, deleteInternalRequest, forceDeleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissBroadcast, addBroadcast, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, updateRoom, updateBed, deleteRoom, addBed, deleteBed, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegister, updatePurchaseRegisterPoNumber, deletePurchaseRegister, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, addTpCertList, updateTpCertList, deleteTpCertList, addDocument, updateDocument, deleteDocument, addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, deleteLogbookRecord, addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
  };

  // SECTION: useEffect for Initialization and Data Listening
  useEffect(() => {
    if (!rtdb) {
      console.error("Firebase Realtime Database is not initialized.");
      setLoading(false);
      return;
    }
  
    // Seed initial data if it doesn't exist
    const seedData = async () => {
        const jobCodesSnapshot = await get(ref(rtdb, 'jobCodes'));
        if (!jobCodesSnapshot.exists()) {
            const updates: { [key: string]: any } = {};
            INITIAL_JOB_CODES.forEach(jc => {
                const newRef = push(ref(rtdb, 'jobCodes'));
                updates[`/jobCodes/${newRef.key}`] = { ...jc, id: newRef.key };
            });
            await update(ref(rtdb), updates);
        }
    };
    seedData();

    if (!storedUserId) {
      setLoading(false);
      // Clear all state when user logs out
      const clearState = (setter: Dispatch<SetStateAction<any>>) => setter({});
      clearState(setUsersById); clearState(setRolesById); clearState(setTasksById); clearState(setProjectsById); clearState(setJobRecordPlantsById); clearState(setJobCodesById); clearState(setPlannerEventsById);
      clearState(setDailyPlannerCommentsById); clearState(setAchievementsById); clearState(setActivityLogsById);
      clearState(setVehiclesById); clearState(setDriversById); clearState(setIncidentReportsById); clearState(setManpowerLogsById); clearState(setManpowerProfilesById); clearState(setInternalRequestsById); clearState(setManagementRequestsById); clearState(setInventoryItemsById); clearState(setInventoryTransferRequestsById); clearState(setUtMachinesById); clearState(setDftMachinesById); clearState(setMobileSimsById); clearState(setLaptopsDesktopsById); clearState(setDigitalCamerasById); clearState(setAnemometersById); clearState(setOtherEquipmentsById); clearState(setMachineLogsById); clearState(setCertificateRequestsById); clearState(setAnnouncementsById); clearState(setBroadcastsById); clearState(setBuildingsById); clearState(setJobSchedulesById); clearState(setJobRecordsById); clearState(setPpeRequestsById); clearState(setPaymentsById); clearState(setVendorsById); clearState(setPurchaseRegistersById); clearState(setPasswordResetRequestsById); clearState(setIgpOgpRecordsById); clearState(setFeedbackById); 
      clearState(setPpeStockById); clearState(setPpeInwardHistoryById);
      clearState(setUnlockRequestsById);
      clearState(setTpCertListsById);
      clearState(setDownloadableDocumentsById);
      clearState(setLogbookRequestsById);
      clearState(setInspectionChecklistsById);
      return;
    }
  
    const listeners = [
      createDataListener('users', setUsersById),
      createDataListener('roles', setRolesById),
      createDataListener('tasks', setTasksById),
      createDataListener('projects', setProjectsById),
      createDataListener('jobRecordPlants', setJobRecordPlantsById),
      createDataListener('jobCodes', setJobCodesById),
      createDataListener('plannerEvents', setPlannerEventsById),
      createDataListener('dailyPlannerComments', setDailyPlannerCommentsById),
      createDataListener('achievements', setAchievementsById),
      createDataListener('activityLogs', setActivityLogsById),
      createDataListener('vehicles', setVehiclesById),
      createDataListener('drivers', setDriversById),
      createDataListener('incidentReports', setIncidentReportsById),
      createDataListener('manpowerLogs', setManpowerLogsById),
      createDataListener('manpowerProfiles', setManpowerProfilesById),
      createDataListener('internalRequests', setInternalRequestsById),
      createDataListener('managementRequests', setManagementRequestsById),
      createDataListener('inventoryItems', setInventoryItemsById),
      createDataListener('inventoryTransferRequests', setInventoryTransferRequestsById),
      createDataListener('utMachines', setUtMachinesById),
      createDataListener('dftMachines', setDftMachinesById),
      createDataListener('mobileSims', setMobileSimsById),
      createDataListener('laptopsDesktops', setLaptopsDesktopsById),
      createDataListener('digitalCameras', setDigitalCamerasById),
      createDataListener('anemometers', setAnemometersById),
      createDataListener('otherEquipments', setOtherEquipmentsById),
      createDataListener('machineLogs', setMachineLogsById),
      createDataListener('certificateRequests', setCertificateRequestsById),
      createDataListener('announcements', setAnnouncementsById),
      createDataListener('broadcasts', setBroadcastsById),
      createDataListener('buildings', setBuildingsById),
      createDataListener('jobSchedules', setJobSchedulesById),
      createDataListener('jobRecords', setJobRecordsById),
      createDataListener('ppeRequests', setPpeRequestsById),
      createDataListener('ppeStock', setPpeStockById),
      createDataListener('ppeInwardHistory', setPpeInwardHistoryById),
      createDataListener('payments', setPaymentsById),
      createDataListener('vendors', setVendorsById),
      createDataListener('purchaseRegisters', setPurchaseRegistersById),
      createDataListener('passwordResetRequests', setPasswordResetRequestsById),
      createDataListener('igpOgpRecords', setIgpOgpRecordsById),
      createDataListener('feedback', setFeedbackById),
      createDataListener('unlockRequests', setUnlockRequestsById),
      createDataListener('tpCertLists', setTpCertListsById),
      createDataListener('downloadableDocuments', setDownloadableDocumentsById),
      createDataListener('logbookRequests', setLogbookRequestsById),
      createDataListener('inspectionChecklists', setInspectionChecklistsById),
    ];
  
    const brandingRef = ref(rtdb, 'branding');
    const brandingListener = onValue(brandingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAppName(data.appName || 'Aries Marine');
        setAppLogo(data.appLogo || null);
      }
    });

    const dismissedRef = ref(rtdb, `users/${storedUserId}/dismissedPendingUpdates`);
    const dismissedListener = onValue(dismissedRef, (snapshot) => {
        setDismissedPendingUpdatesById(snapshot.val() || {});
    });
  
    setLoading(false);
  
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
      brandingListener();
      dismissedListener();
    };
  }, [storedUserId]);

  // Effect for cleaning up old activity logs and broadcasts
  useEffect(() => {
    if (user?.role === 'Admin' && activityLogs.length > 0) {
      const thirtyDaysAgo = sub(new Date(), { days: 30 }).toISOString();
      const logsToDelete = activityLogs.filter(log => log.timestamp < thirtyDaysAgo);

      if (logsToDelete.length > 0) {
        const updates: { [key: string]: null } = {};
        logsToDelete.forEach(log => {
          updates[`/activityLogs/${log.id}`] = null;
        });
        update(ref(rtdb), updates).then(() => {
          console.log(`Deleted ${logsToDelete.length} old activity logs.`);
        });
      }
    }
    
    if (user?.role === 'Admin' && broadcasts.length > 0) {
        const now = new Date();
        const expiredBroadcasts = broadcasts.filter(b => b && b.expiryDate && isAfter(now, parseISO(b.expiryDate)));
        if (expiredBroadcasts.length > 0) {
            const updates: { [key: string]: null } = {};
            expiredBroadcasts.forEach(b => {
                updates[`/broadcasts/${b.id}`] = null;
            });
            update(ref(rtdb), updates).then(() => {
                console.log(`Deleted ${expiredBroadcasts.length} expired broadcasts.`);
            });
        }
    }

  }, [user, activityLogs, broadcasts]);
  
  useEffect(() => {
    if (storedUserId) {
        const foundUser = usersById[storedUserId];
        if (foundUser) {
            setUser({ ...foundUser, dismissedPendingUpdates: dismissedPendingUpdatesById });
        }
    } else {
        setUser(null);
    }
  }, [storedUserId, usersById, dismissedPendingUpdatesById]);

  // Listen for status changes on the current user
  useEffect(() => {
    if (user?.id) {
        const userRef = ref(rtdb, `users/${user.id}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            if (!snapshot.exists()) {
                // User was deleted, log out
                setStoredUserId(null);
                setUser(null);
                router.replace('/login');
                return;
            }
            const updatedUser = { id: snapshot.key, ...snapshot.val() };
            if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                 setUser(updatedUser);
            }
        });
        return () => unsubscribe();
    }
  }, [user?.id, setStoredUserId, router]);

  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Computed Values (Memoized)
  const { pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, lastManpowerUpdate, isManpowerUpdatedToday, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount } = useMemo(() => {
    if (!user) return {
      pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, isManpowerUpdatedToday: false, lastManpowerUpdate: null, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0, pendingUnlockRequestCount: 0, pendingInventoryTransferRequestCount: 0, allCompletedTransferRequests: [], pendingLogbookRequestCount: 0,
    };
    
    const pendingTaskApprovalCount = tasks.filter(t => t.creatorId === user.id && t.statusRequest?.status === 'Pending').length;
    const myNewTaskCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && !t.viewedBy?.[user.id]).length;
    const myPendingTaskRequestCount = tasks.filter(t => (t.statusRequest?.requestedBy === user.id && t.statusRequest?.status === 'Pending') || (t.approvalState === 'returned' && t.assigneeIds?.includes(user.id))).length;

    const myFulfilledStoreCertRequestCount = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    
    const unreadCommentsForUser = dailyPlannerComments.filter(dayComment => {
      if (!dayComment || !dayComment.day || !dayComment.comments) return false;
  
      // Get all unique event IDs mentioned in this day's comments
      const eventIdsInComments = new Set(Object.values(dayComment.comments).map(c => c?.eventId).filter(Boolean));
  
      // Check if the current user is a participant in any of these events
      for (const eventId of eventIdsInComments) {
          const event = plannerEvents.find(e => e.id === eventId);
          if (!event) continue;
  
          const isParticipant = event.userId === user.id || event.creatorId === user.id;
          if (!isParticipant) continue;
  
          // Now check if there's any unread comment from another user for this event on this day
          const hasUnread = Object.values(dayComment.comments).some(c => 
              c && 
              c.eventId === eventId && 
              c.userId !== user.id && 
              !c.viewedBy?.[user.id]
          );
  
          if (hasUnread) return true; // Found an unread comment for this user
      }
      return false;
    });
    
    const plannerNotificationCount = unreadCommentsForUser.length;

    const pendingInternalRequestCount = isStoreManager ? internalRequests.filter(r => r.status === 'Pending' || r.status === 'Partially Approved').length : 0;
    
    const updatedInternalRequestCount = internalRequests.filter(r => {
        const isMyRequest = r.requesterId === user.id;
        if (!isMyRequest) return false;
    
        const isRejectedButActive = r.status === 'Rejected' && !r.acknowledgedByRequester;
        const isStandardUpdate = (r.status === 'Approved' || r.status === 'Issued' || r.status === 'Partially Issued' || r.status === 'Partially Approved') && !r.acknowledgedByRequester;
        
        return isRejectedButActive || isStandardUpdate;
    }).length;

    const isRecipientOfMgmtReq = (req: ManagementRequest) => req.recipientId === user.id;
    const pendingManagementRequestCount = managementRequests.filter(r => r.status === 'Pending' && isRecipientOfMgmtReq(r)).length;
    const updatedManagementRequestCount = managementRequests.filter(r => r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester).length;

    const incidentNotificationCount = incidentReports.filter(i => {
      const isParticipant = i.reporterId === user.id || i.reportedToUserIds.includes(user.id);
      const isUnread = !i.viewedBy?.[user.id];
      return isParticipant && isUnread;
    }).length;
    
    const canApprovePpe = ['Admin', 'Manager'].includes(user.role);
    const canIssuePpe = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'].includes(user.role);
    
    const pendingApproval = canApprovePpe ? ppeRequests.filter(r => r.status === 'Pending').length : 0;
    const pendingIssuance = canIssuePpe ? ppeRequests.filter(r => r.status === 'Approved').length : 0;
    const pendingDisputes = (canApprovePpe || canIssuePpe) ? ppeRequests.filter(r => r.status === 'Disputed').length : 0;
    
    const myPpeRequests = ppeRequests.filter(r => r.requesterId === user.id);
    const ppeQueries = myPpeRequests.filter(req => {
      const comments = req.comments ? (Array.isArray(req.comments) ? req.comments : Object.values(req.comments)) : [];
      const lastComment = comments[comments.length - 1];
      return lastComment && lastComment.userId !== user.id && !req.viewedByRequester;
    }).length;
    
    const pendingPpeRequestCount = pendingApproval + pendingIssuance + pendingDisputes;

    const updatedPpeRequestCount = myPpeRequests.filter(r => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length + ppeQueries;
    
    const canApprovePayments = user.role === 'Admin' || user.role === 'Manager';
    const pendingPaymentApprovalCount = canApprovePayments ? payments.filter(p => p.status === 'Pending').length : 0;
    const pendingPasswordResetRequestCount = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.[user.id]).length : 0;
    const pendingUnlockRequestCount = can.manage_user_lock_status ? unlockRequests.filter(r => r.status === 'pending').length : 0;

    const canApproveTransfers = can.approve_store_requests; // Using this permission for now
    const pendingInventoryTransferRequestCount = canApproveTransfers ? inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;
    
    const pendingLogbookRequestCount = can.manage_logbook ? logbookRequests.filter(r => r.status === 'Pending').length : 0;

    const allCompletedTransferRequests = (can.approve_store_requests && inventoryTransferRequests) ? inventoryTransferRequests.filter(r => r.status === 'Completed' || r.status === 'Rejected') : [];
    
    let totalWorking = 0;
    let totalOnLeave = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const latestManpowerLog = manpowerLogs.length > 0 ? manpowerLogs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] : null;
    const isManpowerUpdatedToday = latestManpowerLog ? isToday(parseISO(latestManpowerLog.updatedAt)) : false;
    
    projects.forEach(project => {
        const logsForProjectDay = manpowerLogs.filter(log => log.date === todayStr && log.projectId === project.id);
        const latestLogForDay = logsForProjectDay.length > 0
            ? logsForProjectDay.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
            : null;

        const previousLogs = manpowerLogs
            .filter(l => l.projectId === project.id && isBefore(parseISO(l.date), startOfDay(new Date())))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
        const mostRecentPreviousLog = previousLogs[0];
        
        const openingManpower = latestLogForDay?.openingManpower ?? mostRecentPreviousLog?.total ?? 0;
        const countIn = latestLogForDay?.countIn || 0;
        const countOut = latestLogForDay?.countOut || 0;
        const dayTotal = openingManpower + countIn - countOut;
        const onLeave = latestLogForDay?.countOnLeave || 0;

        totalWorking += dayTotal;
        totalOnLeave += onLeave;
    });

    return {
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount: totalWorking, onLeaveManpowerCount: totalOnLeave, isManpowerUpdatedToday, lastManpowerUpdate: latestManpowerLog?.updatedAt || null, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    };
  }, [can, user, tasks, certificateRequests, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, manpowerProfiles, unlockRequests, inventoryTransferRequests, logbookRequests, plannerEvents, manpowerLogs, projects]);
  
  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Context Value
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, isManpowerUpdatedToday, lastManpowerUpdate, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markSinglePlannerCommentAsRead, dismissPendingUpdate, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestItem, resolveInternalRequestDispute, updateInternalRequestStatus, updateInternalRequestItemStatus, addInternalRequestComment, deleteInternalRequest, forceDeleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissBroadcast, addBroadcast, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, updateRoom, updateBed, deleteRoom, addBed, deleteBed, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegister, updatePurchaseRegisterPoNumber, deletePurchaseRegister, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, addTpCertList, updateTpCertList, deleteTpCertList, addDocument, updateDocument, deleteDocument, addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, deleteLogbookRecord, addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
  };

  // SECTION: useEffect for Initialization and Data Listening
  useEffect(() => {
    if (!rtdb) {
      console.error("Firebase Realtime Database is not initialized.");
      setLoading(false);
      return;
    }
  
    // Seed initial data if it doesn't exist
    const seedData = async () => {
        const jobCodesSnapshot = await get(ref(rtdb, 'jobCodes'));
        if (!jobCodesSnapshot.exists()) {
            const updates: { [key: string]: any } = {};
            INITIAL_JOB_CODES.forEach(jc => {
                const newRef = push(ref(rtdb, 'jobCodes'));
                updates[`/jobCodes/${newRef.key}`] = { ...jc, id: newRef.key };
            });
            await update(ref(rtdb), updates);
        }
    };
    seedData();

    if (!storedUserId) {
      setLoading(false);
      // Clear all state when user logs out
      const clearState = (setter: Dispatch<SetStateAction<any>>) => setter({});
      clearState(setUsersById); clearState(setRolesById); clearState(setTasksById); clearState(setProjectsById); clearState(setJobRecordPlantsById); clearState(setJobCodesById); clearState(setPlannerEventsById);
      clearState(setDailyPlannerCommentsById); clearState(setAchievementsById); clearState(setActivityLogsById);
      clearState(setVehiclesById); clearState(setDriversById); clearState(setIncidentReportsById); clearState(setManpowerLogsById); clearState(setManpowerProfilesById); clearState(setInternalRequestsById); clearState(setManagementRequestsById); clearState(setInventoryItemsById); clearState(setInventoryTransferRequestsById); clearState(setUtMachinesById); clearState(setDftMachinesById); clearState(setMobileSimsById); clearState(setLaptopsDesktopsById); clearState(setDigitalCamerasById); clearState(setAnemometersById); clearState(setOtherEquipmentsById); clearState(setMachineLogsById); clearState(setCertificateRequestsById); clearState(setAnnouncementsById); clearState(setBroadcastsById); clearState(setBuildingsById); clearState(setJobSchedulesById); clearState(setJobRecordsById); clearState(setPpeRequestsById); clearState(setPaymentsById); clearState(setVendorsById); clearState(setPurchaseRegistersById); clearState(setPasswordResetRequestsById); clearState(setIgpOgpRecordsById); clearState(setFeedbackById); 
      clearState(setPpeStockById); clearState(setPpeInwardHistoryById);
      clearState(setUnlockRequestsById);
      clearState(setTpCertListsById);
      clearState(setDownloadableDocumentsById);
      clearState(setLogbookRequestsById);
      clearState(setInspectionChecklistsById);
      return;
    }
  
    const listeners = [
      createDataListener('users', setUsersById),
      createDataListener('roles', setRolesById),
      createDataListener('tasks', setTasksById),
      createDataListener('projects', setProjectsById),
      createDataListener('jobRecordPlants', setJobRecordPlantsById),
      createDataListener('jobCodes', setJobCodesById),
      createDataListener('plannerEvents', setPlannerEventsById),
      createDataListener('dailyPlannerComments', setDailyPlannerCommentsById),
      createDataListener('achievements', setAchievementsById),
      createDataListener('activityLogs', setActivityLogsById),
      createDataListener('vehicles', setVehiclesById),
      createDataListener('drivers', setDriversById),
      createDataListener('incidentReports', setIncidentReportsById),
      createDataListener('manpowerLogs', setManpowerLogsById),
      createDataListener('manpowerProfiles', setManpowerProfilesById),
      createDataListener('internalRequests', setInternalRequestsById),
      createDataListener('managementRequests', setManagementRequestsById),
      createDataListener('inventoryItems', setInventoryItemsById),
      createDataListener('inventoryTransferRequests', setInventoryTransferRequestsById),
      createDataListener('utMachines', setUtMachinesById),
      createDataListener('dftMachines', setDftMachinesById),
      createDataListener('mobileSims', setMobileSimsById),
      createDataListener('laptopsDesktops', setLaptopsDesktopsById),
      createDataListener('digitalCameras', setDigitalCamerasById),
      createDataListener('anemometers', setAnemometersById),
      createDataListener('otherEquipments', setOtherEquipmentsById),
      createDataListener('machineLogs', setMachineLogsById),
      createDataListener('certificateRequests', setCertificateRequestsById),
      createDataListener('announcements', setAnnouncementsById),
      createDataListener('broadcasts', setBroadcastsById),
      createDataListener('buildings', setBuildingsById),
      createDataListener('jobSchedules', setJobSchedulesById),
      createDataListener('jobRecords', setJobRecordsById),
      createDataListener('ppeRequests', setPpeRequestsById),
      createDataListener('ppeStock', setPpeStockById),
      createDataListener('ppeInwardHistory', setPpeInwardHistoryById),
      createDataListener('payments', setPaymentsById),
      createDataListener('vendors', setVendorsById),
      createDataListener('purchaseRegisters', setPurchaseRegistersById),
      createDataListener('passwordResetRequests', setPasswordResetRequestsById),
      createDataListener('igpOgpRecords', setIgpOgpRecordsById),
      createDataListener('feedback', setFeedbackById),
      createDataListener('unlockRequests', setUnlockRequestsById),
      createDataListener('tpCertLists', setTpCertListsById),
      createDataListener('downloadableDocuments', setDownloadableDocumentsById),
      createDataListener('logbookRequests', setLogbookRequestsById),
      createDataListener('inspectionChecklists', setInspectionChecklistsById),
    ];
  
    const brandingRef = ref(rtdb, 'branding');
    const brandingListener = onValue(brandingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAppName(data.appName || 'Aries Marine');
        setAppLogo(data.appLogo || null);
      }
    });

    const dismissedRef = ref(rtdb, `users/${storedUserId}/dismissedPendingUpdates`);
    const dismissedListener = onValue(dismissedRef, (snapshot) => {
        setDismissedPendingUpdatesById(snapshot.val() || {});
    });
  
    setLoading(false);
  
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
      brandingListener();
      dismissedListener();
    };
  }, [storedUserId]);

  // Effect for cleaning up old activity logs and broadcasts
  useEffect(() => {
    if (user?.role === 'Admin' && activityLogs.length > 0) {
      const thirtyDaysAgo = sub(new Date(), { days: 30 }).toISOString();
      const logsToDelete = activityLogs.filter(log => log.timestamp < thirtyDaysAgo);

      if (logsToDelete.length > 0) {
        const updates: { [key: string]: null } = {};
        logsToDelete.forEach(log => {
          updates[`/activityLogs/${log.id}`] = null;
        });
        update(ref(rtdb), updates).then(() => {
          console.log(`Deleted ${logsToDelete.length} old activity logs.`);
        });
      }
    }
    
    if (user?.role === 'Admin' && broadcasts.length > 0) {
        const now = new Date();
        const expiredBroadcasts = broadcasts.filter(b => b && b.expiryDate && isAfter(now, parseISO(b.expiryDate)));
        if (expiredBroadcasts.length > 0) {
            const updates: { [key: string]: null } = {};
            expiredBroadcasts.forEach(b => {
                updates[`/broadcasts/${b.id}`] = null;
            });
            update(ref(rtdb), updates).then(() => {
                console.log(`Deleted ${expiredBroadcasts.length} expired broadcasts.`);
            });
        }
    }

  }, [user, activityLogs, broadcasts]);
  
  useEffect(() => {
    if (storedUserId) {
        const foundUser = usersById[storedUserId];
        if (foundUser) {
            setUser({ ...foundUser, dismissedPendingUpdates: dismissedPendingUpdatesById });
        }
    } else {
        setUser(null);
    }
  }, [storedUserId, usersById, dismissedPendingUpdatesById]);

  // Listen for status changes on the current user
  useEffect(() => {
    if (user?.id) {
        const userRef = ref(rtdb, `users/${user.id}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            if (!snapshot.exists()) {
                setStoredUserId(null);
                setUser(null);
                router.replace('/login');
                return;
            }
            const updatedUser = { id: snapshot.key, ...snapshot.val() };
            if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
                 setUser(updatedUser);
            }
        });
        return () => unsubscribe();
    }
  }, [user, setStoredUserId, router]);

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


