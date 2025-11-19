

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback, Subtask, UnlockRequest, PpeInwardRecord, Broadcast, JobRecord, JobRecordPlant, JobCode, InternalRequestItem, TpCertList, InventoryTransferRequest, TRANSFER_REASONS, DownloadableDocument, LogbookRequest, InspectionChecklist } from '../lib/types';
import { useRouter } from 'next/navigation';
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
  login: (email: string, pass: string) => Promise<{ success: boolean; status?: User['status']; user?: User }>;
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
  addProject: (projectName: string) => void;
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
  addInternalRequestComment: (requestId: string, commentText: string) => void;
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
  deleteInventoryItem: (itemId: string) => void;
  deleteInventoryItemGroup: (itemName: string) => void;
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
  updateBed: (buildingId: string, roomId: string, bed: Bed) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  addBed: (buildingId: string, roomId: string) => void;
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

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; status?: User['status']; user?: User }> => {
    setLoading(true);
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
        const usersData = snapshot.val();
        const userId = Object.keys(usersData)[0];
        const foundUser = { id: userId, ...usersData[userId] };

        if (foundUser.password === pass) {
            setStoredUserId(foundUser.id);
            setUser(foundUser);
            addActivityLog(foundUser.id, 'User Logged In');
            setLoading(false);
            return { success: true, status: foundUser.status || 'active', user: foundUser };
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
  
  const addInternalRequestComment = useCallback((requestId: string, commentText: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);
  }, [user, internalRequestsById]);
  
  const addPpeRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`ppeRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);
    
    if (notify) {
        const requester = users.find(u => u.id === request.requesterId);
        if (requester?.email && request.requesterId !== user.id) {
            const employee = manpowerProfiles.find(p => p.id === request.manpowerId);
            createAndSendNotification(
                requester.email,
                `New Query on your PPE Request for ${employee?.name || '...'}`,
                `Query from ${user.name}`,
                {
                    'Request For': employee?.name || 'N/A',
                    'Item': `${request.ppeType} (Size: ${request.size})`,
                    'Question': commentText,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
                'Reply to Query'
            );
        }
    }
  }, [user, ppeRequests, users, manpowerProfiles]);

  const addManagementRequestComment = useCallback((requestId: string, commentText: string) => {
    if (!user) return;
    const request = managementRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`managementRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);
  }, [user, managementRequestsById]);
  
  const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = certificateRequestsById[requestId];
    if (!request) return;
  
    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`certificateRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`certificateRequests/${requestId}/viewedByRequester`] = false;
  
    update(ref(rtdb), updates);
  }, [user, certificateRequestsById]);
  
  const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'participants' | 'lastUpdated' | 'viewedBy' | 'viewedByApprover' | 'viewedByRequester'> & { assigneeIds: string[] }) => {
    if (!user) return;

    const newRef = push(ref(rtdb, 'tasks'));

    const subtasks: { [userId: string]: Subtask } = {};
    taskData.assigneeIds.forEach(id => {
      subtasks[id] = { userId: id, status: 'To Do', updatedAt: new Date().toISOString() };
    });

    const newTask: Omit<Task, 'id'> = {
      ...taskData,
      creatorId: user.id,
      assigneeId: taskData.assigneeIds[0], // Keep for backward compatibility/simplicity where needed
      assigneeIds: taskData.assigneeIds,
      status: 'To Do',
      subtasks: subtasks,
      comments: [],
      participants: [user.id, ...taskData.assigneeIds],
      lastUpdated: new Date().toISOString(),
      approvalState: 'none',
      isViewedByAssignee: false,
      viewedBy: { [user.id]: true }
    };
    
    set(newRef, newTask);
    addActivityLog(user.id, 'Task Created', taskData.title);

    taskData.assigneeIds.forEach(assigneeId => {
      const assignee = users.find(u => u.id === assigneeId);
      if (assignee && assignee.email) {
        createAndSendNotification(
          assignee.email,
          `New Task Assigned: ${taskData.title}`,
          'You have a new task!',
          {
            'Task': taskData.title,
            'Assigned by': user.name,
            'Due Date': format(new Date(taskData.dueDate), 'PPP'),
            'Priority': taskData.priority,
          },
          `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
          'View Task'
        );
      }
    });

  }, [user, users, addActivityLog]);
  
  const updateTask = useCallback((task: Task) => {
      if(!user) return;
      const { id, ...data } = task;
      const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
        return value === undefined ? null : value;
      }));
      update(ref(rtdb, `tasks/${id}`), { ...sanitizedData, lastUpdated: new Date().toISOString() });
      addActivityLog(user.id, 'Task Updated', `Updated task: "${task.title}"`);
  }, [user, addActivityLog]);

  const deleteTask = useCallback((taskId: string) => {
      if(!user || user.role !== 'Admin') return;
      const task = tasksById[taskId];
      remove(ref(rtdb, `tasks/${taskId}`));
      addActivityLog(user.id, 'Task Deleted', `Deleted task: "${task.title}"`);
      toast({ title: 'Task Deleted', variant: 'destructive'});
  }, [user, tasksById, addActivityLog, toast]);

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    if (!user) return;
    update(ref(rtdb, `tasks/${taskId}`), { status: newStatus, lastUpdated: new Date().toISOString() });
    addActivityLog(user.id, 'Task Status Changed', `Task ID: ${taskId}, New Status: ${newStatus}`);
  }, [user, addActivityLog]);

  const submitTaskForApproval = useCallback((taskId: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if(!task) return;
    
    const updates: {[key: string]: any} = {};
    updates[`/tasks/${taskId}/status`] = 'Pending Approval';
    updates[`/tasks/${taskId}/approvalState`] = 'pending';
    updates[`/tasks/${taskId}/lastUpdated`] = new Date().toISOString();
    update(ref(rtdb), updates);

    addActivityLog(user.id, 'Task Submitted for Approval', `Task: ${task.title}`);
  }, [user, tasksById, addActivityLog]);

  const approveTask = useCallback((taskId: string, comment?: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;
    
    if (comment) addComment(taskId, comment);
    
    const updates: {[key: string]: any} = {};
    updates[`/tasks/${taskId}/status`] = 'Done';
    updates[`/tasks/${taskId}/approvalState`] = 'approved';
    updates[`/tasks/${taskId}/completionDate`] = new Date().toISOString();
    updates[`/tasks/${taskId}/lastUpdated`] = new Date().toISOString();
    update(ref(rtdb), updates);

    addActivityLog(user.id, 'Task Approved', `Task: ${task.title}`);

    const assignee = users.find(u => u.id === task.assigneeId);
    if(assignee?.email) {
      createAndSendNotification(
        assignee.email,
        `Task Approved: ${task.title}`,
        'Your task has been approved!',
        {
            'Task': task.title,
            'Approved by': user.name,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
        'View Task'
      );
    }

    toast({ title: 'Task Approved', description: `You have approved the task: "${task.title}".`});
  }, [user, tasksById, users, addActivityLog, addComment, toast]);

  const returnTask = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;
    
    addComment(taskId, comment);
    
    const updates: {[key: string]: any} = {};
    updates[`/tasks/${taskId}/status`] = task.previousStatus || 'In Progress';
    updates[`/tasks/${taskId}/approvalState`] = 'returned';
    updates[`/tasks/${taskId}/lastUpdated`] = new Date().toISOString();
    updates[`/tasks/${taskId}/viewedBy/${task.assigneeId}`] = false;
    update(ref(rtdb), updates);

    addActivityLog(user.id, 'Task Returned', `Task: ${task.title}`);

    const assignee = users.find(u => u.id === task.assigneeId);
    if (assignee && assignee.email) {
        createAndSendNotification(
            assignee.email,
            `Task Returned: ${task.title}`,
            `Task Returned by ${user.name}`,
            {
                'Task': task.title,
                'Comment': comment
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
            'View Task'
        );
    }

  }, [user, tasksById, users, addComment, addActivityLog]);

  const requestTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;
  
    const updates: { [key: string]: any } = {};
  
    // Update individual subtask status
    updates[`tasks/${taskId}/subtasks/${user.id}/status`] = newStatus;
    updates[`tasks/${taskId}/subtasks/${user.id}/updatedAt`] = new Date().toISOString();
  
    // If one person starts, the whole task starts.
    if (newStatus === 'In Progress' && task.status === 'To Do') {
      updates[`tasks/${taskId}/status`] = 'In Progress';
    }
  
    const allSubtasksDone = Object.values(task.subtasks || {}).every(
      (sub) => (sub.userId === user.id ? newStatus === 'Done' : sub.status === 'Done')
    );
  
    if (newStatus === 'Done' && allSubtasksDone) {
      updates[`tasks/${taskId}/statusRequest`] = {
        requestedBy: user.id,
        newStatus,
        comment,
        attachment: attachment || null,
        date: new Date().toISOString(),
        status: 'Pending',
      };
      updates[`tasks/${taskId}/approvalState`] = 'status_pending';
      addComment(taskId, comment);
  
      const creator = users.find((u) => u.id === task.creatorId);
      if (creator && creator.email) {
        createAndSendNotification(
          creator.email,
          `Task Ready for Approval: ${task.title}`,
          `Task Completed by ${user.name}`,
          {
            'Task': task.title,
            'Comment': comment,
          },
          `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
          'Review Task'
        );
      }
    } else if (newStatus === 'In Progress') {
      if (comment) addComment(taskId, comment);
    }
  
    await update(ref(rtdb), updates);
  }, [user, tasksById, users, addComment]);
  
  const approveTaskStatusChange = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task || !task.statusRequest) return;
    
    addComment(taskId, comment);
    
    const updates: { [key: string]: any } = {};
    const newStatus = task.statusRequest.newStatus;
    
    updates[`/tasks/${taskId}/status`] = newStatus;
    updates[`/tasks/${taskId}/subtasks`] = Object.entries(task.subtasks || {}).reduce((acc, [userId, subtask]) => {
      acc[userId] = { ...subtask, status: newStatus };
      return acc;
    }, {} as {[key:string]: Subtask});
    
    if (newStatus === 'Done') {
        updates[`/tasks/${taskId}/completionDate`] = new Date().toISOString();
    }
    
    updates[`/tasks/${taskId}/statusRequest`] = null;
    updates[`/tasks/${taskId}/approvalState`] = 'none';
    updates[`/tasks/${taskId}/viewedBy/${task.statusRequest.requestedBy}`] = false;

    update(ref(rtdb), updates);
    toast({ title: 'Task Approved' });
  }, [user, tasksById, addComment, toast]);

  const returnTaskStatusChange = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task || !task.statusRequest) return;

    addComment(taskId, `Status change to '${task.statusRequest.newStatus}' rejected by ${user.name}. Reason: ${comment}`);
    
    const requesterId = task.statusRequest.requestedBy;

    const updates: Record<string, any> = {};
    updates[`tasks/${taskId}/approvalState`] = 'returned';
    updates[`tasks/${taskId}/statusRequest`] = null;
    updates[`tasks/${taskId}/status`] = 'In Progress';

    if (requesterId) {
        updates[`tasks/${taskId}/subtasks/${requesterId}/status`] = 'In Progress';
    }

    update(ref(rtdb), updates);
    toast({ title: 'Task Returned', description: 'The task has been returned to the assignee for updates.' });
}, [user, tasksById, addComment, toast]);

  const markTaskAsViewed = useCallback((taskId: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;

    const updates: {[key: string]: any} = {};
    
    if (user.id === task.creatorId) {
        updates[`/tasks/${taskId}/viewedByApprover`] = true;
    }
    if (task.assigneeIds.includes(user.id)) {
        updates[`/tasks/${taskId}/viewedByRequester`] = true;
        if(task.approvalState === 'returned') {
          updates[`/tasks/${taskId}/approvalState`] = 'none'; // Clear returned state on view
        }
    }
    updates[`/tasks/${taskId}/viewedBy/${user.id}`] = true;
    
    update(ref(rtdb), updates);
  }, [user, tasksById]);

  const acknowledgeReturnedTask = useCallback((taskId: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task || task.approvalState !== 'returned' || !task.assigneeIds.includes(user.id)) return;
    update(ref(rtdb, `tasks/${taskId}`), { approvalState: 'none' });
  }, [user, tasksById]);
  
  const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, comment: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    addComment(taskId, comment);
    
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/pendingAssigneeId`] = newAssigneeId;
    updates[`tasks/${taskId}/status`] = 'Pending Approval';
    updates[`tasks/${taskId}/approverId`] = task.creatorId;

    update(ref(rtdb), updates);
  }, [user, addComment, tasksById]);
  
  const getExpandedPlannerEvents = useCallback((month: Date, userId: string): (PlannerEvent & { eventDate: Date })[] => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return plannerEvents.filter(event => event.userId === userId).flatMap(event => {
        const eventStartDate = parseISO(event.date);
        if (!isValid(eventStartDate)) return [];

        switch (event.frequency) {
            case 'once':
                return isSameMonth(eventStartDate, month) ? [{ ...event, eventDate: eventStartDate }] : [];
            case 'daily':
                return daysInMonth.filter(day => day >= startOfDay(eventStartDate)).map(day => ({ ...event, eventDate: day }));
            case 'daily-except-sundays':
                return daysInMonth.filter(day => day >= startOfDay(eventStartDate) && !isSunday(day)).map(day => ({ ...event, eventDate: day }));
            case 'weekly':
                return daysInMonth.filter(day => day >= startOfDay(eventStartDate) && getDay(day) === getDay(eventStartDate)).map(day => ({ ...event, eventDate: day }));
            case 'weekends':
                return daysInMonth.filter(day => day >= startOfDay(eventStartDate) && (isSaturday(day) || isSunday(day))).map(day => ({ ...event, eventDate: day }));
            case 'monthly':
                const eventDayOfMonth = getDate(eventStartDate);
                return daysInMonth.filter(day => day >= startOfDay(eventStartDate) && getDate(day) === eventDayOfMonth).map(day => ({ ...event, eventDate: day }));
            default:
                return [];
        }
    });
  }, [plannerEvents]);

  const addPlannerEvent = useCallback((eventData: Omit<PlannerEvent, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'plannerEvents'));
    set(newRef, { ...eventData, id: newRef.key });
    addActivityLog(user.id, "Planner Event Created", `Created event: ${eventData.title}`);

    if (eventData.userId !== user.id) {
        const targetUser = users.find(u => u.id === eventData.userId);
        if (targetUser?.email) {
            createAndSendNotification(
                targetUser.email,
                `New Delegated Event: ${eventData.title}`,
                'A new event has been added to your planner',
                {
                    'Event': eventData.title,
                    'Date': format(parseISO(eventData.date), 'PPP'),
                    'Delegated by': user.name,
                    'Description': eventData.description || 'N/A'
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/schedule?userId=${targetUser.id}&date=${eventData.date}`,
                'View Planner'
            );
        }
    }
  }, [user, users, addActivityLog]);

  const updatePlannerEvent = useCallback((event: PlannerEvent) => {
    const { id, ...data } = event;
    update(ref(rtdb, `plannerEvents/${id}`), data);
    if (user) {
        addActivityLog(user.id, "Planner Event Updated", `Updated event: ${event.title}`);
    }
  }, [user, addActivityLog]);

  const deletePlannerEvent = useCallback((eventId: string) => {
    remove(ref(rtdb, `plannerEvents/${eventId}`));
    if (user) {
        addActivityLog(user.id, "Planner Event Deleted", `Deleted event ID: ${eventId}`);
    }
  }, [user, addActivityLog]);
  
  const addPlannerEventComment = useCallback((plannerUserId: string, day: string, eventId: string, text: string) => {
    if (!user) return;
    const dayCommentId = `${day}_${plannerUserId}`;
    const newCommentRef = push(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments`));
    const newComment: Omit<Comment, 'id'> = {
        userId: user.id,
        text,
        date: new Date().toISOString(),
        eventId: eventId,
    };
    set(newCommentRef, { ...newComment, id: newCommentRef.key });
    update(ref(rtdb, `dailyPlannerComments/${dayCommentId}`), {
      lastUpdated: new Date().toISOString(),
      id: dayCommentId,
      day: day,
      plannerUserId: plannerUserId
    });
    
    // Send Notification
    const event = plannerEvents.find(e => e.id === eventId);
    if (event) {
        const participants = new Set([event.creatorId, event.userId]);
        participants.forEach(participantId => {
            if (participantId !== user.id) {
                const participant = users.find(u => u.id === participantId);
                if (participant && participant.email) {
                    createAndSendNotification(
                        participant.email,
                        `New comment on planner for ${format(parseISO(day), 'PPP')}`,
                        `New comment from ${user.name} on "${event.title}"`,
                        { 'Comment': text }, `${process.env.NEXT_PUBLIC_APP_URL}/schedule?userId=${plannerUserId}&date=${day}`,
                        'View Comment'
                    );
                }
            }
        });
    }

  }, [user, users, plannerEvents]);

  const markSinglePlannerCommentAsRead = useCallback((plannerUserId: string, day: string, commentId: string) => {
    if (!user) return;
    const path = `dailyPlannerComments/${day}_${plannerUserId}/comments/${commentId}/viewedBy/${user.id}`;
    const updates: { [key: string]: any } = {};
    updates[path] = true;
    update(ref(rtdb), updates);
  }, [user]);

  const dismissPendingUpdate = useCallback((eventId: string, day: string) => {
    if (!user) return;
    const path = `users/${user.id}/dismissedPendingUpdates/${eventId}_${day}`;
    const updates: { [key: string]: any } = {};
    updates[path] = true;
    update(ref(rtdb), updates);
  }, [user]);
  
  const awardManualAchievement = useCallback((achievementData: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'achievements'));
    const newAchievement: Omit<Achievement, 'id'> = {
      ...achievementData,
      date: new Date().toISOString(),
      type: 'manual',
      status: 'approved',
      awardedById: user.id
    };
    set(newRef, newAchievement);
  }, [user]);

  const updateManualAchievement = useCallback((achievement: Achievement) => {
    const { id, ...data } = achievement;
    update(ref(rtdb, `achievements/${id}`), data);
  }, []);

  const deleteManualAchievement = useCallback((achievementId: string) => {
    remove(ref(rtdb, `achievements/${achievementId}`));
  }, []);
  
  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar'>) => {
    const newRef = push(ref(rtdb, 'users'));
    const newUser: Omit<User, 'id'> = {
      ...userData,
      avatar: `https://i.pravatar.cc/150?u=${newRef.key}`,
      status: 'active',
      planningScore: 0,
    };
    set(newRef, newUser);
    if(user) addActivityLog(user.id, 'New User Added', `Added user: ${userData.name}`);
  }, [user, addActivityLog]);
  
  const updateUserPlanningScore = useCallback((userId: string, score: number) => {
      update(ref(rtdb, `users/${userId}`), { planningScore: score });
  }, []);

  const deleteUser = useCallback((userId: string) => {
    remove(ref(rtdb, `users/${userId}`));
    if(user) addActivityLog(user.id, 'User Deleted', `Deleted user ID: ${userId}`);
  }, [user, addActivityLog]);
  
  const addRole = useCallback((role: Omit<RoleDefinition, 'id' | 'isEditable'>) => {
    const newRef = push(ref(rtdb, 'roles'));
    set(newRef, { ...role, isEditable: true });
  }, []);

  const updateRole = useCallback((role: RoleDefinition) => {
    const { id, ...data } = role;
    update(ref(rtdb, `roles/${id}`), data);
  }, []);

  const deleteRole = useCallback((roleId: string) => {
    remove(ref(rtdb, `roles/${roleId}`));
  }, []);
  
  const addProject = useCallback((projectName: string) => {
    const newRef = push(ref(rtdb, 'projects'));
    set(newRef, { name: projectName });
  }, []);

  const updateProject = useCallback((project: Project) => {
    const { id, ...data } = project;
    update(ref(rtdb, `projects/${id}`), data);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    remove(ref(rtdb, `projects/${projectId}`));
  }, []);
  
  const addVehicle = useCallback((vehicle: Omit<Vehicle, 'id'>) => {
      const newRef = push(ref(rtdb, 'vehicles'));
      set(newRef, vehicle);
  }, []);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
      const { id, ...data } = vehicle;
      update(ref(rtdb, `vehicles/${id}`), data);
  }, []);

  const deleteVehicle = useCallback((vehicleId: string) => {
      remove(ref(rtdb, `vehicles/${vehicleId}`));
  }, []);
  
  const addDriver = useCallback((driver: Omit<Driver, 'id' | 'photo'>) => {
    const newRef = push(ref(rtdb, 'drivers'));
    set(newRef, { ...driver, photo: `https://i.pravatar.cc/150?u=${newRef.key}` });
  }, []);

  const updateDriver = useCallback((driver: Driver) => {
    const { id, ...data } = driver;
    update(ref(rtdb, `drivers/${id}`), data);
  }, []);

  const deleteDriver = useCallback((driverId: string) => {
    remove(ref(rtdb, `drivers/${driverId}`));
  }, []);

  const addIncidentReport = useCallback((incident: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'incidentReports'));
    
    // Automatically report to reporter's supervisor and any user with role 'HSE' or 'Admin'
    const supervisor = users.find(u => u.id === user.supervisorId);
    const hseUsers = users.filter(u => u.role === 'Senior Safety Supervisor' || u.role === 'Admin');
    const reportedToUserIds = new Set<string>();
    if(supervisor) reportedToUserIds.add(supervisor.id);
    hseUsers.forEach(u => reportedToUserIds.add(u.id));
    
    const newIncident: Omit<IncidentReport, 'id'> = {
      ...incident,
      reporterId: user.id,
      reportTime: new Date().toISOString(),
      status: 'New',
      isPublished: false,
      comments: [{ id: 'comment-initial', userId: user.id, text: 'Incident Reported', date: new Date().toISOString(), eventId: newRef.key! }],
      reportedToUserIds: Array.from(reportedToUserIds),
      lastUpdated: new Date().toISOString(),
      viewedBy: { [user.id]: true }
    };
    set(newRef, newIncident);
  }, [user, users]);
  
  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
      const { id, ...data } = incident;
      const updates: { [key: string]: any } = {};
      updates[`incidentReports/${id}`] = { ...data, lastUpdated: new Date().toISOString() };
      
      const newCommentRef = push(ref(rtdb, `incidentReports/${id}/comments`));
      updates[`incidentReports/${id}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key,
        userId: user!.id,
        text: comment,
        date: new Date().toISOString(),
        eventId: id,
      };
      
      // Mark as unread for all participants
      const participants = new Set(incident.reportedToUserIds);
      participants.add(incident.reporterId);
      participants.forEach(pId => {
          if (pId !== user!.id) {
              updates[`incidentReports/${id}/viewedBy/${pId}`] = false;
          }
      });
      
      update(ref(rtdb), updates);
  }, [user]);

  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!user || !incident) return;
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: new Date().toISOString(), eventId: incidentId };
    
    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    
    const participants = new Set(incident.reportedToUserIds);
    participants.add(incident.reporterId);
    participants.forEach(pId => {
        if (pId !== user.id) {
            updates[`incidentReports/${incidentId}/viewedBy/${pId}`] = false;
        }
    });

    update(ref(rtdb), updates);
  }, [user, incidentReports]);

  const publishIncident = useCallback((incidentId: string, comment: string) => {
      if(!user || user.role !== 'Admin') return;
      const updates: { [key: string]: any } = {};
      updates[`incidentReports/${incidentId}/isPublished`] = true;
      updates[`incidentReports/${incidentId}/status`] = 'Closed';
      update(ref(rtdb), updates);
      addIncidentComment(incidentId, comment);
  }, [user, addIncidentComment]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
      if(!user) return;
      const incident = incidentReports.find(i => i.id === incidentId);
      if(!incident) return;
      
      const updatedUserIds = Array.from(new Set([...incident.reportedToUserIds, ...userIds]));
      const updates: { [key: string]: any } = {};
      updates[`incidentReports/${incidentId}/reportedToUserIds`] = updatedUserIds;
      update(ref(rtdb), updates);
      addIncidentComment(incidentId, comment);
  }, [user, incidentReports, addIncidentComment]);

  const markIncidentAsViewed = useCallback((incidentId: string) => {
      if(!user) return;
      update(ref(rtdb, `incidentReports/${incidentId}/viewedBy`), { [user.id]: true });
  }, [user]);
  
  const addManpowerLog = useCallback(async (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'total'>> & { projectId: string }, logDate?: Date) => {
    if (!user) return;

    const dateToLog = logDate || new Date();
    const dateStr = format(dateToLog, 'yyyy-MM-dd');

    const previousLogs = manpowerLogs
        .filter(l => l.projectId === logData.projectId && isBefore(parseISO(l.date), startOfDay(dateToLog)))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const mostRecentPreviousLog = previousLogs[0];
    const openingManpower = logData.openingManpower ?? mostRecentPreviousLog?.total ?? 0;
    
    const total = openingManpower + (logData.countIn || 0) - (logData.countOut || 0);

    const newLogRef = push(ref(rtdb, 'manpowerLogs'));
    const newLog: Omit<ManpowerLog, 'id'> = {
      projectId: logData.projectId,
      date: dateStr,
      openingManpower: openingManpower,
      countIn: logData.countIn || 0,
      personInName: logData.personInName || '',
      countOut: logData.countOut || 0,
      personOutName: logData.personOutName || '',
      countOnLeave: logData.countOnLeave || 0,
      personOnLeaveName: logData.personOnLeaveName || '',
      total: total,
      reason: logData.reason || 'Daily Log',
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };
    await set(newLogRef, newLog);
  }, [user, manpowerLogs]);

  const updateManpowerLog = useCallback(async (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName' | 'openingManpower'>>) => {
    const existingLog = manpowerLogs.find(l => l.id === logId);
    if (!existingLog || !user) return;

    const openingManpower = data.openingManpower ?? existingLog.openingManpower;
    const countIn = data.countIn ?? existingLog.countIn;
    const countOut = data.countOut ?? existingLog.countOut;
    
    const newTotal = openingManpower + countIn - countOut;

    const updatePayload = {
      ...existingLog,
      ...data,
      total: newTotal,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };
    
    await update(ref(rtdb, `manpowerLogs/${logId}`), updatePayload);
  }, [manpowerLogs, user]);

  const addManpowerProfile = useCallback(async (profileData: Omit<ManpowerProfile, 'id'>) => {
    const newRef = push(ref(rtdb, 'manpowerProfiles'));
    const profileWithId = { ...profileData, id: newRef.key };
    await set(newRef, profileWithId);
  }, []);
  
  const addMultipleManpowerProfiles = useCallback((profilesData: any[]): number => {
    if (!user) return 0;
    
    let importedCount = 0;
    const updates: { [key: string]: any } = {};
    
    profilesData.forEach(row => {
      try {
        const [
          name, mobileNumber, gender, workOrderNumber, labourLicenseNo, eic,
          workOrderExpiryDate, labourLicenseExpiryDate, joiningDate, epNumber,
          aadharNumber, dob, uanNumber, wcPolicyNumber, wcPolicyExpiryDate,
          cardCategory, cardType
        ] = row;
        
        if (!name || !eic) return;
        
        const existingProfile = manpowerProfiles.find(p => p.hardCopyFileNo === row[20]); // Assuming File No is in column U (index 20)

        const parseDateExcel = (date: any): string | null => {
            if (date instanceof Date && isValid(date)) {
                return date.toISOString();
            }
            if (typeof date === 'string') {
                const parsed = parse(date, 'yyyy-MM-dd', new Date());
                if (isValid(parsed)) return parsed.toISOString();
            }
            if (typeof date === 'number') {
                // Excel serial date number
                const excelEpoch = new Date(1899, 11, 30);
                const jsDate = new Date(excelEpoch.getTime() + date * 86400000);
                if(isValid(jsDate)) return jsDate.toISOString();
            }
            return null;
        }

        const profileData = {
          name: name?.trim(),
          mobileNumber: String(mobileNumber || ''),
          gender: gender,
          workOrderNumber: String(workOrderNumber || ''),
          labourLicenseNo: String(labourLicenseNo || ''),
          eic: eic?.trim(),
          workOrderExpiryDate: parseDateExcel(workOrderExpiryDate),
          labourLicenseExpiryDate: parseDateExcel(labourLicenseExpiryDate),
          joiningDate: parseDateExcel(joiningDate),
          epNumber: String(epNumber || ''),
          aadharNumber: String(aadharNumber || ''),
          dob: parseDateExcel(dob),
          uanNumber: String(uanNumber || ''),
          wcPolicyNumber: String(wcPolicyNumber || ''),
          wcPolicyExpiryDate: parseDateExcel(wcPolicyExpiryDate),
          cardCategory: cardCategory,
          cardType: cardType,
          status: 'Working',
          trade: 'RA Level 1',
        };

        if (existingProfile) {
          updates[`/manpowerProfiles/${existingProfile.id}`] = { ...existingProfile, ...profileData };
        } else {
          const newRef = push(ref(rtdb, 'manpowerProfiles'));
          updates[`/manpowerProfiles/${newRef.key}`] = { ...profileData, id: newRef.key };
        }
        importedCount++;
      } catch (error) {
        console.error("Error processing row:", row, error);
      }
    });

    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
    return importedCount;
  }, [manpowerProfiles, user]);

  const updateManpowerProfile = useCallback(async (profile: ManpowerProfile): Promise<void> => {
    const { id, ...data } = profile;
    const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => (value === undefined ? null : value)));
    await update(ref(rtdb, `manpowerProfiles/${id}`), sanitizedData);
  }, []);
  
  const deleteManpowerProfile = useCallback((profileId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${profileId}`));
  }, []);
  
  const addLeaveForManpower = useCallback((manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => {
    const updates: { [key: string]: any } = {};
    manpowerIds.forEach(id => {
      const newLeaveRef = push(ref(rtdb, `manpowerProfiles/${id}/leaveHistory`));
      updates[`manpowerProfiles/${id}/leaveHistory/${newLeaveRef.key}`] = {
        id: newLeaveRef.key,
        leaveType,
        leaveStartDate: startDate.toISOString(),
        plannedEndDate: endDate.toISOString(),
        remarks,
      };
    });
    update(ref(rtdb), updates);
  }, []);

  const extendLeave = useCallback((manpowerId: string, leaveId: string, newEndDate: Date) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), {
          plannedEndDate: newEndDate.toISOString()
      });
  }, []);

  const rejoinFromLeave = useCallback((manpowerId: string, leaveId: string, rejoinedDate: Date) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { status: 'Working' });
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), {
        rejoinedDate: rejoinedDate.toISOString(),
      });
  }, []);

  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { status: 'On Leave' });
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), {
          leaveEndDate: new Date().toISOString()
      });
  }, []);

  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
      remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`));
  }, []);

  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => {
    const { id, ...data } = leaveRecord;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${id}`), data);
  }, []);

  const deleteLeaveRecord = useCallback((manpowerId: string, leaveId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`));
  }, []);
  
  const addMemoOrWarning = useCallback((manpowerId: string, memo: Omit<MemoRecord, 'id'>) => {
      const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory`));
      set(newRef, { ...memo, id: newRef.key });
  }, []);

  const updateMemoRecord = useCallback((manpowerId: string, memo: MemoRecord) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${memo.id}`), memo);
  }, []);

  const deleteMemoRecord = useCallback((manpowerId: string, memoId: string) => {
      remove(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${memoId}`));
  }, []);
  
  const addPpeHistoryRecord = useCallback((manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => {
      const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory`));
      set(newRef, { ...record, id: newRef.key });
  }, []);

  const updatePpeHistoryRecord = useCallback((manpowerId: string, record: PpeHistoryRecord) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${record.id}`), record);
  }, []);

  const deletePpeHistoryRecord = useCallback((manpowerId: string, recordId: string) => {
      remove(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${recordId}`));
  }, []);
  
  const addPpeHistoryFromExcel = useCallback(async (data: any[]): Promise<{ importedCount: number; notFoundCount: number; }> => {
    let importedCount = 0;
    let notFoundCount = 0;
    const updates: { [key: string]: any } = {};

    for (const row of data) {
        const employeeName = row['Employee Name'];
        const size = String(row['Size']);
        const date = row['Date'];

        if (!employeeName || !size || !date) continue;

        const profile = manpowerProfiles.find(p => p.name.trim().toLowerCase() === employeeName.trim().toLowerCase());
        
        if (profile) {
            const historyRef = push(ref(rtdb, `manpowerProfiles/${profile.id}/ppeHistory`));
            const newRecord: PpeHistoryRecord = {
                id: historyRef.key!,
                ppeType: 'Coverall',
                size: size,
                quantity: 1,
                issueDate: date instanceof Date ? date.toISOString() : new Date().toISOString(),
                requestType: 'New',
                issuedById: user?.id || 'admin-import',
            };
            updates[`/manpowerProfiles/${profile.id}/ppeHistory/${historyRef.key}`] = newRecord;
            
            // Deduct from stock
            const stockPath = `/ppeStock/coveralls/sizes/${size}`;
            const currentStockSnap = await get(ref(rtdb, stockPath));
            const currentStock = currentStockSnap.val() || 0;
            updates[stockPath] = currentStock - 1;
            
            importedCount++;
        } else {
            notFoundCount++;
        }
    }
    
    if(Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
    }
    return { importedCount, notFoundCount };
  }, [manpowerProfiles, user]);
  
  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'internalRequests'));
    
    // Ensure `inventoryItemId` is null if it's undefined
    const sanitizedItems = requestData.items.map(item => ({
        ...item,
        inventoryItemId: item.inventoryItemId || null,
    }));

    const newRequest: Omit<InternalRequest, 'id'> = {
        ...requestData,
        items: sanitizedItems,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: [{ id: `comm-init`, text: 'Request Created', userId: user.id, date: new Date().toISOString(), eventId: newRequestRef.key! }],
        viewedByRequester: true,
        acknowledgedByRequester: false,
    };

    set(newRequestRef, newRequest);
    addActivityLog(user.id, 'Internal Store Request Created', `Request ID: ${newRequestRef.key}`);

    const storePersonnel = users.filter(u => u.role === 'Store in Charge' || u.role === 'Assistant Store Incharge');
    storePersonnel.forEach(p => {
        if(p.email) {
            createAndSendNotification(
                p.email,
                `New Internal Store Request from ${user.name}`,
                'New Store Request',
                {
                    'Requested By': user.name,
                    'Item Count': requestData.items.length.toString(),
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
                'View Request'
            );
        }
    });

  }, [user, users, addActivityLog]);
  
  const updateInternalRequestItem = useCallback((requestId: string, item: InternalRequestItem, originalItem: InternalRequestItem) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const updates: { [key: string]: any } = {};
    const itemIndex = request.items.findIndex(i => i.id === item.id);
    if (itemIndex > -1) {
        updates[`internalRequests/${requestId}/items/${itemIndex}`] = item;
        addInternalRequestComment(requestId, `Item "${originalItem.description}" updated to "${item.description}" (Qty: ${item.quantity}).`);
    }

    update(ref(rtdb), updates);
  }, [user, internalRequestsById, addInternalRequestComment]);

  const resolveInternalRequestDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request || request.status !== 'Disputed') return;
  
    addInternalRequestComment(requestId, `Dispute resolved by ${user.name}: ${resolution}. Comment: ${comment}`);
  
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
    const request = internalRequestsById[requestId];
    if (!request) return;
    
    const updates: { [key: string]: any } = {};
    
    updates[`internalRequests/${requestId}/status`] = status;
    updates[`internalRequests/${requestId}/approverId`] = user.id;

    if (comment) addInternalRequestComment(requestId, comment);

    const allItemsArePending = request.items.every(item => item.status === 'Pending');
    if (allItemsArePending) {
        const newItems = request.items.map(item => ({ ...item, status: status as InternalRequestItemStatus }));
        updates[`internalRequests/${requestId}/items`] = newItems;
    }

    update(ref(rtdb), updates);
  }, [user, can.approve_store_requests, internalRequestsById, addInternalRequestComment]);
  
  const updateInternalRequestItemStatus = useCallback((requestId: string, itemId: string, status: InternalRequestItemStatus, comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = internalRequestsById[requestId];
    if (!request) return;
    
    addInternalRequestComment(requestId, `Item "${request.items.find(i => i.id === itemId)?.description}" status changed to ${status}. Reason: ${comment}`);

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
    
    if (allIssued) updates[`internalRequests/${requestId}/status`] = 'Issued';
    else if (allApproved) updates[`internalRequests/${requestId}/status`] = 'Approved';
    else if (allRejected) updates[`internalRequests/${requestId}/status`] = 'Rejected';
    else updates[`internalRequests/${requestId}/status`] = 'Partially Approved';

    update(ref(rtdb), updates);
  }, [user, can.approve_store_requests, internalRequestsById, addInternalRequestComment]);

  const deleteInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;
    if (request.status !== 'Pending' && request.status !== 'Rejected') {
        toast({
            title: 'Cannot Delete',
            description: 'This request has been processed and cannot be deleted.',
            variant: 'destructive',
        });
        return;
    }
    remove(ref(rtdb, `internalRequests/${requestId}`));
    toast({ title: 'Request Deleted', variant: 'destructive' });
  }, [user, internalRequestsById, toast]);
  
  const forceDeleteInternalRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `internalRequests/${requestId}`));
    toast({ title: 'Request Force Deleted', variant: 'destructive' });
  }, [user, toast]);

  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request || request.requesterId !== user.id) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true });
  }, [user, internalRequestsById]);

  const acknowledgeInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request || request.requesterId !== user.id) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true });
  }, [user, internalRequestsById]);

  const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'managementRequests'));
    const newRequest: Omit<ManagementRequest, 'id'> = {
      ...requestData,
      requesterId: user.id,
      date: new Date().toISOString(),
      status: 'Pending',
      comments: [{ id: 'comment-initial', text: 'Request created', userId: user.id, date: new Date().toISOString(), eventId: newRequestRef.key! }],
      viewedByRequester: true,
    };
    set(newRequestRef, newRequest);
  }, [user]);

  const updateManagementRequest = useCallback((request: ManagementRequest) => {
    const { id, ...data } = request;
    update(ref(rtdb, `managementRequests/${id}`), data);
  }, []);

  const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => {
    if (!user) return;
    const request = managementRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Status changed to ${status}: ${comment}`, date: new Date().toISOString(), eventId: requestId };
    
    const updates: { [key: string]: any } = {};
    updates[`managementRequests/${requestId}/status`] = status;
    updates[`managementRequests/${requestId}/approverId`] = user.id;
    updates[`managementRequests/${requestId}/viewedByRequester`] = false;
    updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Management Request Status Updated', `Request ID: ${requestId} to ${status}`);

    const requester = users.find(u => u.id === request.requesterId);
    if (requester && requester.email) {
        const vendor = vendors.find(v => (v as any).id === request.vendorId);
        createAndSendNotification(
            requester.email,
            `Update on your request: ${request.subject}`,
            `Your request status is now: ${status}`,
            {
                'Subject': request.subject,
                'Updated By': user.name,
                'Comment': comment,
            }, `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`, 'View Request')
    }
  }, [user, managementRequests, users, vendors, addActivityLog]);
  
  const deleteManagementRequest = useCallback((requestId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `managementRequests/${requestId}`));
    addActivityLog(user.id, 'Management Request Deleted', `ID: ${requestId}`);
  }, [user, addActivityLog]);

  const markManagementRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true });
  }, [user]);
  
  const addPpeRequest = useCallback(async (requestData: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
    if (!user) return;

    const newRequestRef = push(ref(rtdb, 'ppeRequests'));
    
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: 'Request Created', date: new Date().toISOString(), eventId: newRequestRef.key! };
    const newCommentRef = push(ref(rtdb, `ppeRequests/${newRequestRef.key}/comments`));

    const newRequest: Omit<PpeRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: { [newCommentRef.key!]: { ...newComment, id: newCommentRef.key! } },
        viewedByRequester: true,
    };

    set(newRequestRef, newRequest);
    
    const employee = manpowerProfiles.find(p => p.id === requestData.manpowerId);
    const employeeName = employee?.name || 'Unknown Employee';
    
    addActivityLog(user.id, 'PPE Request Created', `Requested ${requestData.ppeType} for ${employeeName}`);
    
    const historyArray = Array.isArray(employee?.ppeHistory) ? employee.ppeHistory : Object.values(employee?.ppeHistory || {});
    const lastIssue = historyArray
      .filter(h => h && h.ppeType === requestData.ppeType)
      .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

    const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
    const stockInfo = requestData.ppeType === 'Coverall' && stockItem && 'sizes' in stockItem && stockItem.sizes
      ? `${stockItem.sizes[requestData.size] || 0} in stock`
      : (stockItem && 'quantity' in stockItem ? `${stockItem.quantity || 0} in stock` : 'N/A');

    const emailData = {
        requesterName: user.name,
        employeeName,
        ppeType: requestData.ppeType,
        size: requestData.size,
        quantity: requestData.quantity || 1,
        requestType: requestData.requestType,
        remarks: requestData.remarks,
        attachmentUrl: requestData.attachmentUrl,
        joiningDate: employee?.joiningDate ? format(parseISO(employee.joiningDate), 'dd MMM, yyyy') : 'N/A',
        rejoiningDate: 'N/A', // This needs logic to find last rejoin date
        lastIssueDate: lastIssue ? format(parseISO(lastIssue.issueDate), 'dd MMM, yyyy') : 'N/A',
        stockInfo,
        eligibility: requestData.eligibility,
        newRequestJustification: requestData.newRequestJustification,
    };

    sendPpeRequestEmail(emailData);

  }, [user, manpowerProfiles, ppeStock, addActivityLog, toast]);

  const updatePpeRequest = useCallback((request: PpeRequest) => {
    if (!user) return;
    const { id, ...data } = request;
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    update(ref(rtdb, `ppeRequests/${id}`), cleanData);
    addActivityLog(user.id, 'PPE Request Updated', `Request ID: ${id}`);
  }, [user, addActivityLog]);

  const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;
  
    let commentText = `Status changed to ${status}.`;
    if (comment.trim()) {
      commentText += ` Comment: ${comment}`;
    }

    const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
  
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/status`] = status;
    updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
    updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
  
    if (status === 'Approved') {
        updates[`ppeRequests/${requestId}/approverId`] = user.id;
    } else if (status === 'Issued') {
        updates[`ppeRequests/${requestId}/issuedById`] = user.id;
        
        const ppeHistoryRecord: Omit<PpeHistoryRecord, 'id'> = {
          ppeType: request.ppeType,
          size: request.size,
          quantity: request.quantity,
          issueDate: new Date().toISOString(),
          requestType: request.requestType,
          remarks: request.remarks,
          storeComment: comment,
          requestId: request.id,
          issuedById: user.id,
          approverId: request.approverId,
        };
        const ppeHistoryRef = push(ref(rtdb, `manpowerProfiles/${request.manpowerId}/ppeHistory`));
        updates[`manpowerProfiles/${request.manpowerId}/ppeHistory/${ppeHistoryRef.key}`] = { ...ppeHistoryRecord, id: ppeHistoryRef.key };
        
        if (request.ppeType === 'Coverall') {
            const stock = ppeStock.find(s => s.id === 'coveralls');
            if (stock && 'sizes' in stock && stock.sizes) {
              const currentSizeQty = stock.sizes[request.size] || 0;
              updates[`ppeStock/coveralls/sizes/${request.size}`] = Math.max(0, currentSizeQty - (request.quantity || 1));
            }
        } else {
            const stock = ppeStock.find(s => s.id === 'safetyShoes');
            if (stock && 'quantity' in stock) {
              const currentQty = stock.quantity || 0;
              updates['ppeStock/safetyShoes/quantity'] = Math.max(0, currentQty - (request.quantity || 1));
            }
        }
    } else if (status === 'Rejected' || status === 'Disputed') {
      updates[`ppeRequests/${requestId}/approverId`] = user.id;
    }
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'PPE Request Status Updated', `Request ID: ${requestId} to ${status}`);
  
    const requester = users.find(u => u.id === request.requesterId);
    const employee = manpowerProfiles.find(p => p.id === request.manpowerId);
    if (requester && requester.email && employee) {
      createAndSendNotification(
        requester.email,
        `Update on PPE Request for ${employee.name}`,
        `Your PPE request status is now: ${status}`,
        {
          'Request For': employee.name,
          'Item': `${request.ppeType} (Size: ${request.size})`,
          'Updated By': user.name,
          'Comment': comment,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'View Request'
      );
    }
  }, [user, ppeRequests, ppeStock, addActivityLog, users, manpowerProfiles]);
  
  const resolvePpeDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'Disputed') return;
  
    const newStatus: PpeRequestStatus = resolution === 'reissue' ? 'Approved' : 'Issued';
    
    const actionComment = resolution === 'reissue'
      ? `Dispute accepted by ${user.name}. Items will be re-issued. Comment: ${comment}`
      : `Dispute reversed by ${user.name}. Items confirmed as issued. Comment: ${comment}`;
    
    updatePpeRequestStatus(requestId, newStatus, actionComment);
  
    const requester = users.find(u => u.id === request.requesterId);
    if(requester && requester.email) {
      createAndSendNotification(
        requester.email,
        `PPE Dispute Resolved: ${request.ppeType}`,
        'A dispute you filed has been resolved.',
        { 
          'Item': `${request.ppeType} (Size: ${request.size})`,
          'Resolution': `The dispute was resolved by ${user.name}. The request has been moved to '${newStatus}'.`,
          'Comment': comment
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'View Request'
      );
    }
  }, [user, ppeRequests, can.approve_store_requests, updatePpeRequestStatus, users]);

  const deletePpeRequest = useCallback((requestId: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;

    const canDelete = user.role === 'Admin' || (request.requesterId === user.id && ['Pending', 'Rejected'].includes(request.status));
    
    if (canDelete) {
        remove(ref(rtdb, `ppeRequests/${requestId}`));
        toast({ title: "Request Deleted" });
        addActivityLog(user.id, "PPE Request Deleted", `ID: ${requestId}`);
    } else {
        toast({ variant: 'destructive', title: "Permission Denied", description: "You cannot delete this request." });
    }
  }, [user, ppeRequests, addActivityLog, toast]);

  const deletePpeAttachment = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    update(ref(rtdb, `ppeRequests/${requestId}`), { attachmentUrl: null });
    toast({ title: 'Attachment Removed' });
  }, [user, toast]);

  const markPpeRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if(request?.requesterId === user.id) {
        update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true });
    }
  }, [user, ppeRequests]);
  
  const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => {
      if (!user) return;
      const updates = typeof data === 'number' ? { quantity: data } : { sizes: data };
      update(ref(rtdb, `ppeStock/${stockId}`), { ...updates, lastUpdated: new Date().toISOString() });
      addActivityLog(user.id, 'PPE Stock Updated', `Updated ${stockId}`);
  }, [user, addActivityLog]);
  
  const addPpeInwardRecord = useCallback((recordData: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => {
      if(!user) return;
      const newRef = push(ref(rtdb, 'ppeInwardHistory'));
      const newRecord = { ...recordData, date: recordData.date.toISOString(), addedByUserId: user.id, id: newRef.key! };
      set(newRef, newRecord);

      const updates: { [key: string]: any } = {};
      if (newRecord.ppeType === 'Coverall' && newRecord.sizes) {
          const stock = ppeStock.find(s => s.id === 'coveralls');
          const currentSizes = stock && 'sizes' in stock ? stock.sizes || {} : {};
          for (const size in newRecord.sizes) {
              updates[`ppeStock/coveralls/sizes/${size}`] = (currentSizes[size] || 0) + (newRecord.sizes[size] || 0);
          }
      } else if (newRecord.ppeType === 'Safety Shoes' && newRecord.quantity) {
          const stock = ppeStock.find(s => s.id === 'safetyShoes');
          const currentQuantity = stock && 'quantity' in stock ? stock.quantity || 0 : 0;
          updates['ppeStock/safetyShoes/quantity'] = currentQuantity + newRecord.quantity;
      }
      update(ref(rtdb), updates);

      addActivityLog(user.id, 'PPE Inward Registered', `Type: ${newRecord.ppeType}`);
      
      const rolesToNotify: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
      const usersToNotify = users.filter(u => rolesToNotify.includes(u.role));
      usersToNotify.forEach(u => {
          if(u.email) {
              createAndSendNotification(
                  u.email,
                  `New PPE Inward Stock Registered`,
                  'PPE Stock Updated',
                  {
                      'Type': newRecord.ppeType,
                      'Details': newRecord.ppeType === 'Coverall' ? JSON.stringify(newRecord.sizes) : `Quantity: ${newRecord.quantity}`,
                      'Registered By': user.name,
                  },
                  `${process.env.NEXT_PUBLIC_APP_URL}/ppe-stock`,
                  'View PPE Stock'
              );
          }
      });

  }, [user, users, ppeStock, addActivityLog]);

  const updatePpeInwardRecord = useCallback((record: PpeInwardRecord) => {
      if(!user || user.role !== 'Admin') return;
      const originalRecord = ppeInwardHistory.find(r => r.id === record.id);
      if (!originalRecord) return;

      const updates: { [key: string]: any } = {};
      const cleanedRecord = {
          ...record,
          quantity: record.quantity === undefined ? null : record.quantity,
          sizes: record.sizes === undefined ? null : record.sizes,
      };
      updates[`ppeInwardHistory/${record.id}`] = cleanedRecord;
      
      if (record.ppeType === 'Coverall') {
          const stockPath = 'ppeStock/coveralls/sizes';
          const stock = ppeStock.find(s => s.id === 'coveralls');
          const currentSizes = stock && 'sizes' in stock ? stock.sizes || {} : {};
          const newSizes = {...currentSizes};
          const allSizes = new Set([...Object.keys(originalRecord.sizes || {}), ...Object.keys(record.sizes || {})]);
          allSizes.forEach(size => {
              const originalQty = originalRecord.sizes?.[size] || 0;
              const newQty = record.sizes?.[size] || 0;
              const diff = newQty - originalQty;
              newSizes[size] = (newSizes[size] || 0) + diff;
          });
          updates[stockPath] = newSizes;

      } else if (record.ppeType === 'Safety Shoes') {
          const stockPath = 'ppeStock/safetyShoes/quantity';
          const stock = ppeStock.find(s => s.id === 'safetyShoes');
          const currentQty = stock && 'quantity' in stock ? stock.quantity || 0 : 0;
          const diff = (record.quantity || 0) - (originalRecord.quantity || 0);
          updates[stockPath] = currentQty + diff;
      }
      
      update(ref(rtdb), updates);
      addActivityLog(user.id, 'PPE Inward Updated', `Record ID: ${record.id}`);
  }, [user, ppeStock, ppeInwardHistory, addActivityLog]);
  
  const deletePpeInwardRecord = useCallback(async (record: PpeInwardRecord) => {
    if (!user || user.role !== 'Admin') return;
  
    const updates: { [key: string]: any } = {};
    updates[`ppeInwardHistory/${record.id}`] = null;
  
    if (record.ppeType === 'Coverall' && record.sizes) {
      const stock = ppeStock.find(s => s.id === 'coveralls');
      const currentSizes = stock && 'sizes' in stock ? stock.sizes || {} : {};
      const newSizes = { ...currentSizes };
      for (const size in record.sizes) {
        newSizes[size] = Math.max(0, (newSizes[size] || 0) - (record.sizes[size] || 0));
      }
      updates['ppeStock/coveralls/sizes'] = newSizes;
      updates['ppeStock/coveralls/lastUpdated'] = new Date().toISOString();
    } else if (record.ppeType === 'Safety Shoes' && record.quantity) {
      const stock = ppeStock.find(s => s.id === 'safetyShoes');
      const currentQuantity = stock && 'quantity' in stock ? stock.quantity || 0 : 0;
      updates['ppeStock/safetyShoes/quantity'] = Math.max(0, currentQuantity - record.quantity);
      updates['ppeStock/safetyShoes/lastUpdated'] = new Date().toISOString();
    }
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'PPE Inward Deleted', `Record ID: ${record.id}`);
  }, [user, ppeStock, addActivityLog]);
  
  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'inventoryItems'));
    const dataToSave = { 
      ...itemData,
      chestCrollNo: itemData.chestCrollNo || null,
      lastUpdated: new Date().toISOString(),
      movedToProjectId: itemData.movedToProjectId || null,
    };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'Inventory Item Added', `${itemData.name} (SN: ${itemData.serialNumber})`);
  }, [user, addActivityLog]);

  const addMultipleInventoryItems = useCallback((itemsData: any[]): number => {
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    itemsData.forEach(item => {
        const serialNumber = item['SERIAL NUMBER']?.toString().trim();
        if (!serialNumber) return;

        const existingItem = inventoryItems.find(i => i.serialNumber === serialNumber);
        
        const parseExcelDate = (date: any): string | null => {
            if (!date) return null;
            if (date instanceof Date && isValid(date)) {
                return date.toISOString();
            }
            return null;
        };
        
        const projectName = item['PROJECT']?.trim();
        const project = projects.find(p => p.name.toLowerCase() === projectName?.toLowerCase());
        
        const itemData: Partial<InventoryItem> = {
            name: item['ITEM NAME'] || null,
            serialNumber: serialNumber || null,
            chestCrollNo: item['CHEST CROLL NO']?.toString() || null,
            ariesId: item['ARIES ID']?.toString() || null,
            inspectionDate: parseExcelDate(item['INSPECTION DATE']),
            inspectionDueDate: parseExcelDate(item['INSPECTION DUE DATE']),
            tpInspectionDueDate: parseExcelDate(item['TP INSPECTION DUE DATE']),
            status: item['STATUS'] || null,
            projectId: project?.id || projects.find(p => p.name === 'Unassigned')?.id || null,
            lastUpdated: new Date().toISOString(),
        };
        
        const itemId = existingItem ? existingItem.id : push(ref(rtdb)).key;
        if (!itemId) return;

        const finalData = existingItem ? { ...existingItem, ...itemData } : itemData;
        
        Object.keys(finalData).forEach(key => {
            if (finalData[key as keyof typeof finalData] === undefined) {
                finalData[key as keyof typeof finalData] = null;
            }
        });

        updates[`inventoryItems/${itemId}`] = finalData;
        importedCount++;
    });

    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
      if (user) addActivityLog(user.id, 'Bulk Inventory Import', `Imported/updated ${importedCount} items.`);
    }
    
    return importedCount;
}, [user, inventoryItems, projects, addActivityLog]);
  
  const updateInventoryItem = useCallback((item: InventoryItem) => {
    const { id, ...data } = item;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const updates = { 
        ...cleanData,
        chestCrollNo: data.chestCrollNo || null,
        lastUpdated: new Date().toISOString(),
        movedToProjectId: data.movedToProjectId || null,
    };
    update(ref(rtdb, `inventoryItems/${id}`), updates);
  }, []);
  
  const updateInventoryItemGroup = useCallback((itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => {
    if (!user || !can.manage_inventory) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    const dbUpdates: { [key: string]: any } = {};
    const itemsToUpdate = inventoryItems.filter(
      (item) => item.name === itemName && item.tpInspectionDueDate === originalDueDate
    );
  
    if (itemsToUpdate.length === 0) {
        toast({
            title: 'No Matching Items',
            description: 'No items were found with that name and TP due date.',
            variant: 'destructive',
        });
        return;
    }
  
    itemsToUpdate.forEach((item) => {
      const itemPath = `inventoryItems/${item.id}`;
      if (updates.tpInspectionDueDate) {
          dbUpdates[`${itemPath}/tpInspectionDueDate`] = updates.tpInspectionDueDate;
      }
      if (updates.certificateUrl) {
          dbUpdates[`${itemPath}/certificateUrl`] = updates.certificateUrl;
      }
      dbUpdates[`${itemPath}/lastUpdated`] = new Date().toISOString();
    });
  
    if (Object.keys(dbUpdates).length > 0) {
      update(ref(rtdb), dbUpdates);
      addActivityLog(
        user.id,
        'Bulk TP Cert Update',
        `Updated ${itemsToUpdate.length} items for ${itemName}`
      );
      toast({
        title: 'Update Successful',
        description: `${itemsToUpdate.length} items have been updated.`,
      });
    }
  }, [user, can.manage_inventory, inventoryItems, addActivityLog, toast]);
  
  const updateInventoryItemGroupByProject = useCallback((itemName: string, projectId: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => {
    const itemsToUpdate = inventoryItems.filter(item => item.name === itemName && item.projectId === projectId);
    if(itemsToUpdate.length === 0) return;
    const dbUpdates: { [key: string]: any } = {};
    itemsToUpdate.forEach(item => {
        dbUpdates[`/inventoryItems/${item.id}/inspectionDate`] = updates.inspectionDate || item.inspectionDate;
        dbUpdates[`/inventoryItems/${item.id}/inspectionDueDate`] = updates.inspectionDueDate || item.inspectionDueDate;
        dbUpdates[`/inventoryItems/${item.id}/inspectionCertificateUrl`] = updates.inspectionCertificateUrl || item.inspectionCertificateUrl;
        dbUpdates[`/inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
    });
    update(ref(rtdb), dbUpdates);
  }, [inventoryItems]);

  const deleteInventoryItem = useCallback(async (itemId: string): Promise<void> => {
    const item = inventoryItems.find(i => i.id === itemId);
    await remove(ref(rtdb, `inventoryItems/${itemId}`));
    if(user && item) addActivityLog(user.id, 'Inventory Item Deleted', item.name);
  }, [user, inventoryItems, addActivityLog]);

  const deleteInventoryItemGroup = useCallback(async (itemName: string): Promise<void> => {
    if (!user || user.role !== 'Admin') return;
    const updates: { [key: string]: null } = {};
    const itemsToDelete = inventoryItems.filter(item => item.name === itemName);
    itemsToDelete.forEach(item => {
        updates[`inventoryItems/${item.id}`] = null;
    });
    await update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Item Group Deleted', `Deleted all items named: ${itemName}`);
  }, [user, inventoryItems, addActivityLog]);
  
  const renameInventoryItemGroup = useCallback((oldName: string, newName: string) => {
    if (!user || user.role !== 'Admin') return;
    const updates: { [key: string]: any } = {};
    const itemsToRename = inventoryItems.filter(item => item.name === oldName);
    itemsToRename.forEach(item => {
        updates[`inventoryItems/${item.id}/name`] = newName;
    });
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Item Group Renamed', `Renamed "${oldName}" to "${newName}"`);
  }, [user, inventoryItems, addActivityLog]);
  
  const addTpCertList = useCallback((listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'tpCertLists'));
    const sanitizedItems = listData.items.map(item => ({
      ...item,
      ariesId: item.ariesId || null,
      chestCrollNo: item.chestCrollNo || null,
    }));
    const newList: Omit<TpCertList, 'id'> = {
        ...listData,
        items: sanitizedItems,
        creatorId: user.id,
        createdAt: new Date().toISOString(),
    };
    set(newRef, { ...newList, id: newRef.key });
    addActivityLog(user.id, 'TP Certification List Saved', `List Name: ${listData.name}`);
  }, [user, addActivityLog]);
  
  const updateTpCertList = useCallback((listData: TpCertList) => {
    if (!user) return;
    const { id, ...data } = listData;
    const sanitizedItems = data.items.map(item => ({
      itemId: item.itemId,
      itemType: item.itemType,
      materialName: item.materialName,
      manufacturerSrNo: item.manufacturerSrNo,
      ariesId: item.ariesId || null,
      chestCrollNo: item.chestCrollNo || null,
    }));
    const sanitizedData = { ...data, items: sanitizedItems };
    update(ref(rtdb, `tpCertLists/${id}`), sanitizedData);
    addActivityLog(user.id, 'TP Certification List Updated', `List Name: ${data.name}`);
  }, [user, addActivityLog]);
  
  const deleteTpCertList = useCallback((listId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `tpCertLists/${listId}`));
    addActivityLog(user.id, 'TP Certification List Deleted', `List ID: ${listId}`);
  }, [user, addActivityLog]);
  
  const approveInventoryTransferRequest = useCallback((request: InventoryTransferRequest, createTpList: boolean) => {
    if (!user) return;
  
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${request.id}/status`] = 'Approved';
    updates[`inventoryTransferRequests/${request.id}/approverId`] = user.id;
    updates[`inventoryTransferRequests/${request.id}/approvalDate`] = new Date().toISOString();
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Approved', `Request ID: ${request.id}`);

    const requester = users.find(u => u.id === request.requesterId);
    
    if(requester && requester.email) {
        const fromProjectName = projects.find(p => p.id === request.fromProjectId)?.name;
        const toProjectName = projects.find(p => p.id === request.toProjectId)?.name;
        createAndSendNotification(
            requester.email,
            `Inventory Transfer Approved: #${request.id.slice(-6)}`,
            'Inventory Transfer Request Approved',
            {
                'Request ID': `#${request.id.slice(-6)}`,
                'From': fromProjectName || 'Unknown',
                'To': toProjectName || 'Unknown',
                'Approved By': user.name,
                'Info': 'The request has been approved. Awaiting acknowledgement from the receiving project supervisor to complete the transfer.'
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
            'View Transfers'
        );
    }
  }, [user, addActivityLog, users, projects]);
  
  const addInventoryTransferRequest = useCallback((requestData: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'inventoryTransferRequests'));
    
    const sanitizedItems = requestData.items.map(item => ({
      ...item,
      ariesId: item.ariesId || null,
    }));
  
    const newRequest: Omit<InventoryTransferRequest, 'id'> = {
        ...requestData,
        items: sanitizedItems,
        requesterId: user.id,
        requestDate: new Date().toISOString(),
        status: 'Pending',
    };
    set(newRequestRef, newRequest);
    addActivityLog(user.id, 'Inventory Transfer Request Created');
  
    const approvers = users.filter(u => can.approve_store_requests);
    const fromProjectName = projects.find(p => p.id === requestData.fromProjectId)?.name;
    const toProjectName = projects.find(p => p.id === requestData.toProjectId)?.name;
  
    approvers.forEach(approver => {
      if (approver.email) {
        createAndSendNotification(
          approver.email,
          `Inventory Transfer Request from ${user.name}`,
          'New Inventory Transfer Request',
          {
            'Requester': user.name,
            'From': fromProjectName || 'Unknown',
            'To': toProjectName || 'Unknown',
            'Reason': requestData.reason,
            'Item Count': requestData.items.length.toString(),
          },
          `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
          'Review Request'
        );
      }
    });
  }, [user, addActivityLog, users, can.approve_store_requests, projects, approveInventoryTransferRequest]);
  
  const deleteInventoryTransferRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only an administrator can delete transfer requests.',
      });
      return;
    }
    remove(ref(rtdb, `inventoryTransferRequests/${requestId}`));
    toast({
      title: 'Transfer Request Deleted',
      description: 'The request has been permanently removed.',
      variant: 'destructive',
    });
    addActivityLog(user.id, 'Inventory Transfer Deleted', `Request ID: ${requestId}`);
  }, [user, toast, addActivityLog]);
  
  const rejectInventoryTransferRequest = useCallback((requestId: string, comment: string) => {
    if (!user || !can.approve_store_requests) return;

    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Rejected';
    updates[`inventoryTransferRequests/${requestId}/approverId`] = user.id;

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Rejected', `Request ID: ${requestId}`);
  }, [user, can.approve_store_requests, addActivityLog]);
  
  const disputeInventoryTransfer = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = inventoryTransferRequestsById[requestId];
    if (!request || request.status !== 'Approved') return;

    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Disputed';
    
    const newCommentRef = push(ref(rtdb, `inventoryTransferRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Disputed: ${comment}`, date: new Date().toISOString(), eventId: requestId };
    updates[`inventoryTransferRequests/${requestId}/comments/${newCommentRef.key}`] = newComment;

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Disputed', `Request ID: ${requestId}`);
    toast({ title: 'Transfer Disputed', description: 'The store has been notified of the issue.' });

    const approvers = users.filter(u => roles.find(r => r.name === u.role)?.permissions.includes('approve_store_requests'));
    approvers.forEach(approver => {
        if(approver.email) {
            createAndSendNotification(
                approver.email,
                `Dispute Raised for Transfer #${requestId.slice(-6)}`,
                'Inventory Transfer Disputed',
                {
                    'Request ID': `#${requestId.slice(-6)}`,
                    'Disputed By': user.name,
                    'Reason': comment,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
                'Review Dispute'
            );
        }
    });

  }, [user, inventoryTransferRequestsById, addActivityLog, toast, users, roles]);
  
  const acknowledgeTransfer = useCallback((requestId: string) => {
    if (!user) return;
    const request = inventoryTransferRequestsById[requestId];
    if (!request || request.status !== 'Approved') return;
  
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Completed';
    updates[`inventoryTransferRequests/${requestId}/acknowledgedBy`] = user.id;
    updates[`inventoryTransferRequests/${requestId}/acknowledgedDate`] = new Date().toISOString();
  
    request.items.forEach(item => {
      let itemPath: string;
      switch (item.itemType) {
        case 'Inventory': itemPath = `inventoryItems/${item.itemId}`; break;
        case 'UTMachine': itemPath = `utMachines/${item.itemId}`; break;
        case 'DftMachine': itemPath = `dftMachines/${item.itemId}`; break;
        case 'DigitalCamera': itemPath = `digitalCameras/${item.itemId}`; break;
        case 'Anemometer': itemPath = `anemometers/${item.itemId}`; break;
        case 'OtherEquipment': itemPath = `otherEquipments/${item.itemId}`; break;
        default: return;
      }
      updates[`${itemPath}/projectId`] = request.toProjectId;
      updates[`${itemPath}/lastUpdated`] = new Date().toISOString();
    });
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Acknowledged', `Request ID: ${requestId}`);
    toast({ title: 'Transfer Completed', description: 'The items have been moved to the new project inventory.' });

    const approvers = users.filter(u => roles.find(r => r.name === u.role)?.permissions.includes('approve_store_requests'));
    approvers.forEach(approver => {
        if(approver.email) {
            createAndSendNotification(
                approver.email,
                `Transfer #${requestId.slice(-6)} Completed`,
                'Inventory Transfer Completed',
                {
                    'Request ID': `#${requestId.slice(-6)}`,
                    'Acknowledged By': user.name,
                    'Status': 'Completed',
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
                'View Transfers'
            );
        }
    });

  }, [user, inventoryTransferRequestsById, addActivityLog, toast, users, roles]);

  const clearInventoryTransferHistory = useCallback(() => {
    if (!user || user.role !== 'Admin') return;
    const allRequests = inventoryTransferRequests;
    const updates: { [key: string]: null } = {};
    allRequests.forEach(req => {
        if (req.status === 'Completed' || req.status === 'Rejected') {
            updates[`/inventoryTransferRequests/${req.id}`] = null;
        }
    });
    if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
    }
  }, [user, inventoryTransferRequests]);
  
  const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'certificateRequests'));
    const newRequest: Omit<CertificateRequest, 'id'> = {
      ...requestData,
      requesterId: user.id,
      status: 'Pending',
      requestDate: new Date().toISOString(),
      comments: [{ id: `comm-init`, text: requestData.remarks || 'Request created.', userId: user.id, date: new Date().toISOString(), eventId: newRequestRef.key! }],
      viewedByRequester: true,
    };
    set(newRequestRef, newRequest);
    
    addActivityLog(user.id, "Certificate Request Created");

    const storePersonnel = users.filter(u => u.role === 'Store in Charge' || u.role === 'Document Controller');
    storePersonnel.forEach(p => {
        if(p.email) {
            createAndSendNotification(
                p.email,
                `New Certificate Request from ${user.name}`,
                'New Certificate Request',
                {
                    'Request Type': requestData.requestType,
                    'Requested By': user.name,
                    'Remarks': requestData.remarks || 'None'
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
                'View Request'
            );
        }
    });
  }, [user, users, addActivityLog]);
  
  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = certificateRequestsById[requestId];
    if (!request) return;

    addCertificateRequestComment(requestId, `Request fulfilled by ${user.name}. Comment: ${comment}`);

    const updates: { [key: string]: any } = {};
    updates[`certificateRequests/${requestId}/status`] = 'Completed';
    updates[`certificateRequests/${requestId}/completionDate`] = new Date().toISOString();
    updates[`certificateRequests/${requestId}/viewedByRequester`] = false;
    
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = comment.match(urlRegex);
    if(match) {
      const url = match[0];
      let path: string | null = null;
      if (request.itemId) {
        path = `inventoryItems/${request.itemId}/certificateUrl`;
      } else if (request.utMachineId) {
        path = `utMachines/${request.utMachineId}/certificateUrl`;
      } else if (request.dftMachineId) {
        path = `dftMachines/${request.dftMachineId}/certificateUrl`;
      }
      if (path) {
          updates[path] = url;
      }
    }
    
    update(ref(rtdb), updates);

  }, [user, certificateRequestsById, addCertificateRequestComment]);
  
  const markFulfilledRequestsAsViewed = useCallback((requestType: 'store' | 'equipment') => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    certificateRequests.forEach(req => {
      const isStoreReq = requestType === 'store' && req.itemId;
      const isEquipmentReq = requestType === 'equipment' && (req.utMachineId || req.dftMachineId);
      
      if (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester && (isStoreReq || isEquipmentReq)) {
        updates[`certificateRequests/${req.id}/viewedByRequester`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
  }, [user, certificateRequests]);
  
  const acknowledgeFulfilledRequest = useCallback((requestId: string) => {
    if (!user) return;
    remove(ref(rtdb, `certificateRequests/${requestId}`));
    toast({ title: 'Request Acknowledged', description: 'The completed request has been cleared from your view.' });
    addActivityLog(user.id, "Acknowledged Certificate Request", `ID: ${requestId}`);
  }, [user, toast, addActivityLog]);
  
  const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => {
    const newRef = push(ref(rtdb, 'utMachines'));
    set(newRef, machine);
  }, []);

  const updateUTMachine = useCallback((machine: UTMachine) => {
    const { id, ...data } = machine;
    update(ref(rtdb, `utMachines/${id}`), data);
  }, []);

  const deleteUTMachine = useCallback((machineId: string) => {
    remove(ref(rtdb, `utMachines/${machineId}`));
  }, []);
  
  const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => {
    const newRef = push(ref(rtdb, 'dftMachines'));
    set(newRef, machine);
  }, []);

  const updateDftMachine = useCallback((machine: DftMachine) => {
    const { id, ...data } = machine;
    update(ref(rtdb, `dftMachines/${id}`), data);
  }, []);

  const deleteDftMachine = useCallback((machineId: string) => {
    remove(ref(rtdb, `dftMachines/${machineId}`));
  }, []);

  const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => {
    const newRef = push(ref(rtdb, 'mobileSims'));
    set(newRef, item);
  }, []);

  const updateMobileSim = useCallback((item: MobileSim) => {
    const { id, ...data } = item;
    update(ref(rtdb, `mobileSims/${id}`), data);
  }, []);

  const deleteMobileSim = useCallback((itemId: string) => {
    remove(ref(rtdb, `mobileSims/${itemId}`));
  }, []);

  const addLaptopDesktop = useCallback((item: Omit<LaptopDesktop, 'id'>) => {
    const newRef = push(ref(rtdb, 'laptopsDesktops'));
    set(newRef, item);
  }, []);

  const updateLaptopDesktop = useCallback((item: LaptopDesktop) => {
    const { id, ...data } = item;
    update(ref(rtdb, `laptopsDesktops/${id}`), data);
  }, []);
  
  const deleteLaptopDesktop = useCallback((itemId: string) => {
    remove(ref(rtdb, `laptopsDesktops/${itemId}`));
  }, []);
  
  const addDigitalCamera = useCallback((camera: Omit<DigitalCamera, 'id'>) => {
    const newRef = push(ref(rtdb, 'digitalCameras'));
    set(newRef, camera);
  }, []);

  const updateDigitalCamera = useCallback((camera: DigitalCamera) => {
    const { id, ...data } = camera;
    update(ref(rtdb, `digitalCameras/${id}`), data);
  }, []);
  
  const deleteDigitalCamera = useCallback((cameraId: string) => {
    remove(ref(rtdb, `digitalCameras/${cameraId}`));
  }, []);
  
  const addAnemometer = useCallback((anemometer: Omit<Anemometer, 'id'>) => {
    const newRef = push(ref(rtdb, 'anemometers'));
    set(newRef, anemometer);
  }, []);

  const updateAnemometer = useCallback((anemometer: Anemometer) => {
    const { id, ...data } = anemometer;
    update(ref(rtdb, `anemometers/${id}`), data);
  }, []);
  
  const deleteAnemometer = useCallback((anemometerId: string) => {
    remove(ref(rtdb, `anemometers/${anemometerId}`));
  }, []);

  const addOtherEquipment = useCallback((equipment: Omit<OtherEquipment, 'id'>) => {
    const newRef = push(ref(rtdb, 'otherEquipments'));
    set(newRef, equipment);
  }, []);

  const updateOtherEquipment = useCallback((equipment: OtherEquipment) => {
    const { id, ...data } = equipment;
    const sanitizedData = {
        ...data,
        tpInspectionDueDate: data.tpInspectionDueDate || null,
        certificateUrl: data.certificateUrl || null,
    };
    update(ref(rtdb, `otherEquipments/${id}`), sanitizedData);
  }, []);
  
  const deleteOtherEquipment = useCallback((equipmentId: string) => {
    remove(ref(rtdb, `otherEquipments/${equipmentId}`));
  }, []);

  const addMachineLog = useCallback((log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'machineLogs'));
    const newLog: Omit<MachineLog, 'id'> = { ...log, machineId, loggedByUserId: user.id };
    set(newRef, newLog);
    const storePersonnel = users.filter(u => u.role === 'Store in Charge' || u.role === 'Assistant Store Incharge');
    storePersonnel.forEach(p => {
        if(p.email) {
            createAndSendNotification(
                p.email,
                `New Log for Machine ID: ${machineId}`,
                'New Machine Log Entry',
                {
                    'Machine ID': machineId,
                    'User': log.userName,
                    'Job': log.jobDescription,
                    'Logged By': user.name
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/equipment-status`,
                'View Logs'
            );
        }
    });
  }, [user, users]);

  const deleteMachineLog = useCallback((logId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `machineLogs/${logId}`));
  }, [user]);

  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);
  
  const updateBranding = useCallback((name: string, logo: string | null) => {
    if (!user || user.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only administrators can change branding settings.',
      });
      return;
    }
    const updates: { [key: string]: any } = {};
    updates['/branding/appName'] = name;
    if (logo !== undefined) {
      updates['/branding/appLogo'] = logo;
    }
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Branding Updated', `App name changed to "${name}"`);
  }, [user, addActivityLog, toast]);

  const addAnnouncement = useCallback((data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'announcements'));
    const approverId = user.supervisorId || Object.values(usersById).find(u => u.role === 'Admin')?.id;
    if (!approverId) {
        toast({ title: 'No approver found', description: 'Cannot submit announcement.', variant: 'destructive'});
        return;
    }
    const newAnnouncement: Omit<Announcement, 'id'> = {
        title: data.title!,
        content: data.content!,
        creatorId: user.id,
        approverId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        comments: [{ userId: user.id, text: 'Announcement created', date: new Date().toISOString(), eventId: newRef.key! }],
        notifyAll: data.notifyAll || false,
    };
    set(newRef, newAnnouncement);

    const approver = usersById[approverId];
    if (approver?.email) {
        createAndSendNotification(
            approver.email,
            `New Announcement for Approval: ${data.title}`,
            'New Announcement for Approval',
            {
                'From': user.name,
                'Title': data.title!,
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            'Review Announcement'
        );
    }
  }, [user, usersById, toast]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    const { id, ...data } = announcement;
    update(ref(rtdb, `announcements/${id}`), data);
  }, []);
  
  const approveAnnouncement = useCallback((announcementId: string) => {
    if(!user) return;
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'approved' });
    const announcement = announcementsById[announcementId];
    if (announcement?.notifyAll) {
        const recipients = Object.values(usersById).filter(u => u.email && u.role !== 'Manager');
        recipients.forEach(recipient => {
            createAndSendNotification(
                recipient.email,
                `New Announcement: ${announcement.title}`,
                announcement.title,
                { 'Announcement': announcement.content },
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            );
        });
    }
  }, [user, announcementsById, usersById]);

  const rejectAnnouncement = useCallback((announcementId: string) => {
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'rejected' });
  }, []);
  
  const deleteAnnouncement = useCallback((announcementId: string) => {
    remove(ref(rtdb, `announcements/${announcementId}`));
  }, []);

  const returnAnnouncement = useCallback((announcementId: string, comment: string) => {
    if(!user) return;
    const newCommentRef = push(ref(rtdb, `announcements/${announcementId}/comments`));
    set(newCommentRef, { userId: user.id, text: comment, date: new Date().toISOString() });
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'returned' });
  }, [user]);

  const dismissAnnouncement = useCallback((announcementId: string) => {
    if (!user) return;
    set(ref(rtdb, `announcements/${announcementId}/dismissedBy/${user.id}`), true);
  }, [user]);
  
  const dismissBroadcast = useCallback((broadcastId: string) => {
    if (!user) return;
    update(ref(rtdb, `broadcasts/${broadcastId}/dismissedBy`), { [user.id]: true });
  }, [user]);

  const addBroadcast = useCallback((broadcastData: Omit<Broadcast, 'id'|'creatorId'|'createdAt'|'dismissedBy'>) => {
    if (!user) return;
    const { message, expiryDate, emailTarget, recipientRoles, recipientUserIds } = broadcastData;
    const newRef = push(ref(rtdb, 'broadcasts'));
    const newBroadcast: Omit<Broadcast, 'id'> = {
        message,
        expiryDate,
        creatorId: user.id,
        createdAt: new Date().toISOString(),
        dismissedBy: {},
        emailTarget,
        recipientRoles,
        recipientUserIds,
    };
    set(newRef, newBroadcast);
    addActivityLog(user.id, 'Broadcast Sent', message);
  
    if (emailTarget !== 'none') {
      let usersToNotify: User[] = [];
      if (emailTarget === 'roles' && recipientRoles) {
        usersToNotify = users.filter(u => u.status === 'active' && u.email && recipientRoles.includes(u.role));
      } else if (emailTarget === 'individuals' && recipientUserIds) {
        usersToNotify = users.filter(u => u.status === 'active' && u.email && recipientUserIds.includes(u.id));
      }
  
      usersToNotify.forEach(u => {
        createAndSendNotification(
            u.email!,
            `Important Broadcast from ${user.name}`,
            'Important Broadcast',
            { Message: message },
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            'Go to Dashboard',
            'ariesjmdportal@gmail.com'
        );
      });
    }
  }, [user, users, addActivityLog]);

  const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    set(newRef, { buildingNumber: buildingNumber, rooms: [] });
  }, []);

  const updateBuilding = useCallback((building: Building) => {
    const { id, ...data } = building;
    update(ref(rtdb, `buildings/${id}`), data);
  }, []);

  const deleteBuilding = useCallback((buildingId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}`));
  }, []);
  
  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    const roomRef = push(ref(rtdb, `buildings/${buildingId}/rooms`));
    const beds = Array.from({ length: roomData.numberOfBeds }, (_, i) => {
      const bedRef = push(ref(rtdb)); // Generate a unique key for the bed
      return { id: bedRef.key, bedNumber: `${i + 1}`, bedType: 'Bunk' }
    });
    set(roomRef, { id: roomRef.key, roomNumber: roomData.roomNumber, beds: beds.reduce((acc, bed) => ({...acc, [bed.id!]: bed}), {}) });
  }, []);

  const addBed = useCallback((buildingId: string, roomId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;
    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
    if (roomKey) {
        const room = building.rooms[roomKey as any];
        const nextBedNumber = room.beds ? Object.keys(room.beds).length + 1 : 1;
        const newBedRef = push(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}/beds`));
        set(newBedRef, { id: newBedRef.key, bedNumber: `${nextBedNumber}`, bedType: 'Bunk' });
    }
  }, [buildings]);

  const deleteBed = useCallback((buildingId: string, roomId: string, bedId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;

    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
    if (roomKey) {
        const room = building.rooms[roomKey as any];
        if(room.beds) {
            const bedKey = Object.keys(room.beds).find(key => room.beds[key as any]?.id === bedId);
            if (bedKey) {
                 remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}/beds/${bedKey}`));
            }
        }
    }
  }, [buildings]);
  
  const updateBed = useCallback((buildingId: string, roomId: string, bed: Bed) => {
      const building = buildings.find(b => b.id === buildingId);
      if (!building || !building.rooms) return;
  
      const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
      if (roomKey) {
          const room = building.rooms[roomKey as any];
          if (room.beds) {
             const bedKey = Object.keys(room.beds).find(key => room.beds[key as any]?.id === bed.id);
              if(bedKey) {
                  update(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}/beds/${bedKey}`), bed);
              }
          }
      }
  }, [buildings]);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;

    // Firebase stores array-like objects. Find the key associated with the roomId.
    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
    if (roomKey) {
        remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}`));
    }
  }, [buildings]);

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;

    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
    if (roomKey) {
        const room = building.rooms[roomKey as any];
        if (room.beds) {
           const bedKey = Object.keys(room.beds).find(key => room.beds[key as any]?.id === bedId);
            if(bedKey) {
                update(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}/beds/${bedKey}`), { occupantId: occupantId });
            }
        }
    }
  }, [buildings]);

  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;

    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any]?.id === roomId);
    
    if (roomKey) {
        const room = building.rooms[roomKey as any];
        if (room.beds) {
           const bedKey = Object.keys(room.beds).find(key => room.beds[key as any]?.id === bedId);
           if (bedKey) {
                remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomKey}/beds/${bedKey}/occupantId`));
           }
        }
    }
  }, [buildings]);
  
  const saveJobSchedule = useCallback((schedule: JobSchedule) => {
      update(ref(rtdb, `jobSchedules/${schedule.id}`), schedule);
  }, []);

  const lockJobSchedule = useCallback((date: string) => {
      const schedulesForDate = jobSchedules.filter(s => s.date === date);
      const updates: {[key: string]: any} = {};
      schedulesForDate.forEach(s => {
          updates[`jobSchedules/${s.id}/isLocked`] = true;
      });
      update(ref(rtdb), updates);
  }, [jobSchedules]);

  const unlockJobSchedule = useCallback((date: string, projectId: string) => {
      const scheduleId = `${projectId}_${date}`;
      update(ref(rtdb, `jobSchedules/${scheduleId}`), { isLocked: null });
  }, []);
  
  const lockJobRecordSheet = useCallback((monthKey: string) => {
      update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: true });
  }, []);

  const unlockJobRecordSheet = useCallback((monthKey: string) => {
      update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: null });
  }, []);

  const addJobRecordPlant = useCallback((plantName: string) => {
      const newRef = push(ref(rtdb, 'jobRecordPlants'));
      set(newRef, { name: plantName, id: newRef.key });
  }, []);

  const deleteJobRecordPlant = useCallback((plantId: string) => {
      remove(ref(rtdb, `jobRecordPlants/${plantId}`));
  }, []);
  
  const addJobCode = useCallback((jobCode: Omit<JobCode, 'id'>) => {
      const newRef = push(ref(rtdb, 'jobCodes'));
      set(newRef, { ...jobCode, id: newRef.key });
  }, []);

  const updateJobCode = useCallback((jobCode: JobCode) => {
      const { id, ...data } = jobCode;
      update(ref(rtdb, `jobCodes/${id}`), data);
  }, []);

  const deleteJobCode = useCallback((jobCodeId: string) => {
      remove(ref(rtdb, `jobCodes/${jobCodeId}`));
  }, []);

  const saveJobRecord = useCallback((monthKey: string, employeeId: string, day: number | null, codeOrValue: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'dailyComments' | 'sundayDuty') => {
      let path;
      if (type === 'status') {
          path = `jobRecords/${monthKey}/records/${employeeId}/days/${day}`;
      } else if (type === 'plant') {
          path = `jobRecords/${monthKey}/records/${employeeId}/plant`;
      } else if (type === 'dailyOvertime') {
          path = `jobRecords/${monthKey}/records/${employeeId}/dailyOvertime/${day}`;
      } else if (type === 'dailyComments') {
          path = `jobRecords/${monthKey}/records/${employeeId}/dailyComments/${day}`;
      } else if (type === 'sundayDuty') {
          path = `jobRecords/${monthKey}/records/${employeeId}/additionalSundayDuty`;
      } else {
          return;
      }
      
      const valueToSet = (typeof codeOrValue === 'string' && codeOrValue.trim() === '') ? null : codeOrValue;
      update(ref(rtdb), { [path]: valueToSet });
  }, []);

  const savePlantOrder = useCallback((monthKey: string, plantName: string, orderedIds: string[]) => {
      const path = `jobRecords/${monthKey}/plantsOrder/${plantName}`;
      set(ref(rtdb, path), orderedIds);
  }, []);
  
  const addVendor = useCallback((vendor: Omit<Vendor, 'id'>) => {
    const newRef = push(ref(rtdb, 'vendors'));
    set(newRef, vendor);
  }, []);
  
  const updateVendor = useCallback((vendor: Vendor) => {
    const { id, ...data } = vendor;
    update(ref(rtdb, `vendors/${id}`), data);
  }, []);

  const deleteVendor = useCallback((vendorId: string) => {
    remove(ref(rtdb, `vendors/${vendorId}`));
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'|'requesterId'|'status'|'approverId'|'date'|'comments'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'payments'));
    const newPayment: Omit<Payment, 'id'> = {
        ...payment,
        requesterId: user.id,
        status: 'Paid',
        date: new Date().toISOString(),
        comments: [{ id: `comm-init`, text: 'Payment logged.', userId: user.id, date: new Date().toISOString(), eventId: newRef.key! }],
    };
    set(newRef, newPayment);
  }, [user]);
  
  const updatePayment = useCallback((payment: Payment) => {
    const { id, ...data } = payment;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    update(ref(rtdb, `payments/${id}`), cleanData);
  }, []);

  const updatePaymentStatus = useCallback((paymentId: string, status: PaymentStatus, comment: string) => {
    if(!user) return;
    const payment = payments.find(p => p.id === paymentId);
    if(!payment) return;
    
    const newCommentRef = push(ref(rtdb, `payments/${paymentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Status changed to ${status}: ${comment}`, date: new Date().toISOString(), eventId: paymentId };
    
    const updates: Partial<Payment> = {
        status,
        approverId: user.id,
        comments: [...(payment.comments || []), {id: newCommentRef.key!, ...newComment}],
    };
    update(ref(rtdb, `payments/${paymentId}`), updates);
    const requester = users.find(u => u.id === payment.requesterId);
    if (requester && requester.email) {
        const vendor = vendors.find(v => (v as any).id === payment.vendorId);
        createAndSendNotification(
            requester.email,
            `Update on Payment for ${vendor?.name}`,
            `Your payment request status is now: ${status}`,
            {
                'Vendor': vendor?.name || 'N/A',
                'Amount': payment.amount,
                'Updated By': user.name,
                'Comment': comment,
            }, `${process.env.NEXT_PUBLIC_APP_URL}/vendor-management`, 'View Payment')
    }
  }, [user, payments, users, vendors]);

  const deletePayment = useCallback((paymentId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `payments/${paymentId}`));
  }, [user]);
  
  const addPurchaseRegister = useCallback((purchase: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'purchaseRegisters'));
    const newPurchase: Omit<PurchaseRegister, 'id'> = {
      ...purchase,
      creatorId: user.id,
      date: new Date().toISOString(),
    };
    set(newRef, newPurchase);
  }, [user]);

  const updatePurchaseRegister = useCallback((purchase: PurchaseRegister) => {
    const { id, ...data } = purchase;
    update(ref(rtdb, `purchaseRegisters/${id}`), data);
  }, []);

  const updatePurchaseRegisterPoNumber = useCallback((purchaseRegisterId: string, poNumber: string) => {
    update(ref(rtdb, `purchaseRegisters/${purchaseRegisterId}`), { poNumber });
  }, []);
  
  const deletePurchaseRegister = useCallback((id: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `purchaseRegisters/${id}`));
  }, [user]);

  const addIgpOgpRecord = useCallback((record: Omit<IgpOgpRecord, 'id'|'creatorId'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'igpOgpRecords'));
    const newRecord: Omit<IgpOgpRecord, 'id'> = {
      ...record,
      date: format(record.date, 'yyyy-MM-dd'),
      creatorId: user.id,
    };
    set(newRef, newRecord);
  }, [user]);
  
  const addFeedback = useCallback((subject: string, message: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'feedback'));
    const newFeedback: Omit<Feedback, 'id'> = {
        userId: user.id,
        subject,
        message,
        date: new Date().toISOString(),
        status: 'New',
        viewedBy: { [user.id]: true }
    };
    set(newRef, newFeedback);

    const admins = users.filter(u => u.role === 'Admin');
    admins.forEach(admin => {
        if(admin.email) {
            createAndSendNotification(
                admin.email,
                `New Feedback Received: ${subject}`,
                'New Feedback/Complaint Submitted',
                {
                    'From': user.name,
                    'Subject': subject,
                    'Message': message,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/account`,
                'View Feedback'
            );
        }
    });

  }, [user, users]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
  }, []);
  
  const markFeedbackAsViewed = useCallback(() => {
    if (!user || !can.manage_feedback) return;
    const updates: { [key: string]: any } = {};
    feedback.forEach(f => {
      if (!f.viewedBy?.[user.id]) {
        updates[`feedback/${f.id}/viewedBy/${user.id}`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
  }, [user, feedback, can.manage_feedback]);
  
  const addDocument = useCallback((doc: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'downloadableDocuments'));
    set(newRef, { ...doc, uploadedBy: user.id, createdAt: new Date().toISOString() });
  }, [user]);

  const updateDocument = useCallback((doc: DownloadableDocument) => {
    if(!user) return;
    const { id, ...data } = doc;
    update(ref(rtdb, `downloadableDocuments/${id}`), data);
  }, [user]);
  
  const deleteDocument = useCallback((docId: string) => {
    if(!user) return;
    remove(ref(rtdb, `downloadableDocuments/${docId}`));
  }, [user]);

  const addLogbookRequest = useCallback((manpowerId: string, remarks?: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'logbookRequests'));
    const newRequest: Omit<LogbookRequest, 'id'> = {
        manpowerId,
        requesterId: user.id,
        requestDate: new Date().toISOString(),
        status: 'Pending',
        remarks: remarks || '',
        viewedBy: { [user.id]: true }
    };
    set(newRef, newRequest);
  }, [user]);

  const addLogbookRequestComment = useCallback((requestId: string, text: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `logbookRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: new Date().toISOString(), eventId: requestId };
    
    update(ref(rtdb, `logbookRequests/${requestId}/comments/${newCommentRef.key}`), { ...newComment, id: newCommentRef.key });
  }, [user]);

  const updateLogbookRequestStatus = useCallback((requestId: string, status: 'Completed' | 'Rejected', comment: string) => {
    if (!user) return;
    const request = logbookRequests.find(r => r.id === requestId);
    if (!request) return;
    
    addLogbookRequestComment(requestId, comment || `Status changed to ${status}`);
    
    if (status === 'Completed') {
        update(ref(rtdb, `manpowerProfiles/${request.manpowerId}/logbook`), {
            status: 'Sent back as requested',
            outDate: new Date().toISOString(),
            remarks: comment,
        });
    }
    remove(ref(rtdb, `logbookRequests/${requestId}`));
  }, [user, logbookRequests, addLogbookRequestComment]);

  const deleteLogbookRecord = useCallback((manpowerId: string, onComplete: () => void) => {
      const path = `manpowerProfiles/${manpowerId}/logbook`;
      remove(ref(rtdb, path)).then(() => {
          onComplete();
      });
  }, []);
  
  const addInspectionChecklist = useCallback((checklist: Omit<InspectionChecklist, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'inspectionChecklists'));
    
    const dataToSave: Partial<InspectionChecklist> = {
        ...checklist,
        purchaseDate: checklist.purchaseDate || null,
        firstUseDate: checklist.firstUseDate || null,
    };
    
    const newChecklist = { ...dataToSave, id: newRef.key! };
    set(newRef, newChecklist);

    // Also update the inspection due date on the inventory item
    update(ref(rtdb, `inventoryItems/${checklist.itemId}`), {
      inspectionDueDate: checklist.nextDueDate,
      lastUpdated: new Date().toISOString()
    });

    addActivityLog(user.id, "Inspection Checklist Created", `For item ID: ${checklist.itemId}`);
  }, [user, addActivityLog]);

  const updateInspectionChecklist = useCallback((checklist: InspectionChecklist) => {
    if (!user) return;
    const { id, ...data } = checklist;
    update(ref(rtdb, `inspectionChecklists/${id}`), data);
  }, [user]);
  
  const deleteInspectionChecklist = useCallback((id: string) => {
    if (!user) return;
    remove(ref(rtdb, `inspectionChecklists/${id}`));
  }, [user]);

  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Computed Values (Memoized)
  const { pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount } = useMemo(() => {
    if (!user) return {
      pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0, pendingUnlockRequestCount: 0, pendingInventoryTransferRequestCount: 0, allCompletedTransferRequests: [], pendingLogbookRequestCount: 0,
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
          const hasUnread = Object.values(dayComment.comments).some(c => c && c.eventId === eventId && c.userId !== user.id && !c.viewedBy?.[user.id]
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
    
    const pendingApproval = canApprovePpe ? (ppeRequests || []).filter(r => r.status === 'Pending').length : 0;
    const pendingIssuance = canIssuePpe ? (ppeRequests || []).filter(r => r.status === 'Approved').length : 0;
    const pendingDisputes = (canApprovePpe || canIssuePpe) ? (ppeRequests || []).filter(r => r.status === 'Disputed').length : 0;
    
    const myPpeRequests = (ppeRequests || []).filter(r => r.requesterId === user.id);
    const ppeQueries = myPpeRequests.filter(req => {
      const comments = req.comments ? (Array.isArray(req.comments) ? req.comments : Object.values(req.comments)) : [];
      const lastComment = comments[comments.length - 1];
      return lastComment && lastComment.userId !== user.id && !req.viewedByRequester;
    }).length;
    
    const pendingPpeRequestCount = pendingApproval + pendingIssuance + pendingDisputes;

    const updatedPpeRequestCount = myPpeRequests.filter(r => (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length + ppeQueries;
    
    const canApprovePayments = user.role === 'Admin' || user.role === 'Manager';
    const pendingPaymentApprovalCount = canApprovePayments ? (payments || []).filter(p => p.status === 'Pending').length : 0;
    const pendingPasswordResetRequestCount = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.[user.id]).length : 0;
    const pendingUnlockRequestCount = can.manage_user_lock_status ? unlockRequests.filter(r => r.status === 'pending').length : 0;

    const canApproveTransfers = can.approve_store_requests; // Using this permission for now
    const pendingInventoryTransferRequestCount = canApproveTransfers ? inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;
    
    const pendingLogbookRequestCount = can.manage_logbook ? logbookRequests.filter(r => r.status === 'Pending').length : 0;

    const allCompletedTransferRequests = (can.approve_store_requests && inventoryTransferRequests) ? inventoryTransferRequests.filter(r => r.status === 'Completed' || r.status === 'Rejected') : [];
    
    let totalWorking = 0;
    let totalOnLeave = 0;
    
    projects.forEach(project => {
        const logsForProjectDay = manpowerLogs.filter(log => log.date === format(new Date(), 'yyyy-MM-dd') && log.projectId === project.id);
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
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount: totalWorking, onLeaveManpowerCount: totalOnLeave, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    };
  }, [can, user, tasks, certificateRequests, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, manpowerProfiles, unlockRequests, inventoryTransferRequests, logbookRequests, plannerEvents, manpowerLogs, projects]);
  
  const { isManpowerUpdatedToday, lastManpowerUpdate } = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isUpdated = manpowerLogs.some(log => log.date === todayStr);

    const sortedLogs = manpowerLogs.filter(log => log?.updatedAt).sort((a, b) => parseISO(b.updatedAt).getTime() - parseISO(a.updatedAt).getTime());
    const lastUpdate = sortedLogs.length > 0 ? sortedLogs[0].updatedAt : null;
    
    return { isManpowerUpdatedToday: isUpdated, lastManpowerUpdate: lastUpdate };
  }, [manpowerLogs]);

  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Context Value
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can, isManpowerUpdatedToday, lastManpowerUpdate,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markSinglePlannerCommentAsRead, dismissPendingUpdate, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestItem, resolveInternalRequestDispute, updateInternalRequestStatus, updateInternalRequestItemStatus, addInternalRequestComment, deleteInternalRequest, forceDeleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissBroadcast, addBroadcast, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, updateBed, deleteRoom, addBed, deleteBed, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegister, updatePurchaseRegisterPoNumber, deletePurchaseRegister, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, addTpCertList, updateTpCertList, deleteTpCertList, addDocument, updateDocument, deleteDocument, addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, deleteLogbookRecord, addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
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
            if (user.status === 'active' && updatedUser.status === 'locked') {
                router.replace('/status');
            }
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
