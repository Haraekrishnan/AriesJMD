

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback, Subtask, UnlockRequest, PpeInwardRecord, Broadcast, JobRecord, JobRecordPlant, JobCode, InternalRequestItem, TpCertList, InventoryTransferRequest, TRANSFER_REASONS, DownloadableDocument, LogbookRequest, InspectionChecklist } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid, parseISO, isBefore, isToday, isFuture, endOfWeek, startOfWeek } from 'date-fns';
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
  markPlannerCommentsAsRead: (plannerUserId: string, day: string) => void;
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
  addManpowerLog: (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string }, logDate?: Date) => Promise<void>;
  updateManpowerLog: (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName'>>) => Promise<void>;
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
  addPpeRequestComment: (requestId: string, commentText: string) => void;
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
  updateInventoryItemGroup: (itemName: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => void;
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
  deleteRoom: (buildingId: string, roomId: string) => void;
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
  addDocument: (data: Omit<DownloadableDocument, 'id'|'uploadedBy'|'createdAt'>) => void;
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

  const can: PermissionsObject = useMemo(() => {
    const userRole = roles.find(r => r.name === user?.role);
    const permissions = userRole?.permissions || [];
    const permissionsObj: Partial<PermissionsObject> = {};
    for (const p of ALL_PERMISSIONS) {
      permissionsObj[p] = permissions.includes(p);
    }
    return permissionsObj as PermissionsObject;
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
  
  const addInternalRequestComment = useCallback((requestId: string, commentText: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);
  }, [user, internalRequestsById]);
  
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
  
  const addComment = useCallback((taskId: string, commentText: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
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
  
  const addPpeRequestComment = useCallback((requestId: string, commentText: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`ppeRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);

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
  }, [user, ppeRequests, users, manpowerProfiles]);

  const addManpowerLog = useCallback(async (
    logData: Partial<Omit<ManpowerLog, 'id' | 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string },
    logDate: Date = new Date()
  ) => {
      if (!user) return;
  
      const dateStr = format(logDate, 'yyyy-MM-dd');
      const yesterdayStr = format(sub(logDate, { days: 1 }), 'yyyy-MM-dd');
  
      // Find the most recent log for this project on the previous day or earlier
      const previousLogs = Object.values(manpowerLogsById)
          .filter(l => l.projectId === logData.projectId && l.date <= yesterdayStr)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
      const yesterdayTotal = previousLogs.length > 0 ? (previousLogs[0].total || 0) : 0;
      
      const newLogRef = push(ref(rtdb, 'manpowerLogs'));
      
      const newLog: Omit<ManpowerLog, 'id'> = {
          projectId: logData.projectId,
          date: dateStr,
          countIn: logData.countIn ?? 0,
          personInName: logData.personInName,
          countOut: logData.countOut ?? 0,
          personOutName: logData.personOutName,
          countOnLeave: logData.countOnLeave ?? 0,
          personOnLeaveName: logData.personOnLeaveName,
          reason: logData.reason || '',
          updatedBy: user.id,
          yesterdayCount: yesterdayTotal,
          total: logData.newTotal !== undefined ? logData.newTotal : (yesterdayTotal + (logData.countIn || 0) - (logData.countOut || 0)),
      };
      
      await set(newLogRef, newLog);
  }, [user, manpowerLogsById]);

  const addManpowerProfile = useCallback(async (profileData: Omit<ManpowerProfile, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'manpowerProfiles'));
    const photoUrl = `https://i.pravatar.cc/150?u=${newRef.key}`;
    const newProfile = { ...profileData, id: newRef.key, photo: photoUrl };
    await set(newRef, newProfile);
    addActivityLog(user.id, 'Manpower Profile Added', `Added profile for ${profileData.name}`);
  }, [user, addActivityLog]);

  const addIncidentReport = useCallback((incidentData: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if (!user) return;

    const supervisorId = user.supervisorId;
    const hseUsers = users.filter(u => u.role === 'Senior Safety Supervisor').map(u => u.id);
    
    const reportedToUserIds = new Set<string>();
    if (supervisorId) reportedToUserIds.add(supervisorId);
    hseUsers.forEach(id => reportedToUserIds.add(id));

    const newRef = push(ref(rtdb, 'incidentReports'));
    const newIncident: Omit<IncidentReport, 'id'> = {
      ...incidentData,
      reporterId: user.id,
      reportTime: new Date().toISOString(),
      status: 'New',
      isPublished: false,
      comments: [{ id: 'comment-0', userId: user.id, text: 'Incident Reported.', date: new Date().toISOString() }],
      reportedToUserIds: Array.from(reportedToUserIds),
      lastUpdated: new Date().toISOString(),
      viewedBy: { [user.id]: true }
    };
    set(newRef, newIncident);

    addActivityLog(user.id, 'Incident Reported', `Incident at ${projects.find(p => p.id === incidentData.projectId)?.name}`);
  }, [user, users, addActivityLog, projects]);

  const addVehicle = useCallback((vehicleData: Omit<Vehicle, 'id'>) => {
    const newRef = push(ref(rtdb, 'vehicles'));
    set(newRef, { ...vehicleData, id: newRef.key });
    if(user) addActivityLog(user.id, 'Vehicle Added', `Added vehicle: ${vehicleData.vehicleNumber}`);
  }, [user, addActivityLog]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar'>) => {
    const newRef = push(ref(rtdb, 'users'));
    const newUser = {
      ...userData,
      id: newRef.key,
      avatar: `https://i.pravatar.cc/150?u=${newRef.key}`,
      status: 'active'
    };
    set(newRef, newUser);
    if(user) addActivityLog(user.id, 'User Added', `Added new user: ${userData.name}`);
  }, [user, addActivityLog]);

  // SECTION: ALL FUNCTION DEFINITIONS START HERE
  const updateTask = useCallback((updatedTask: Task) => {
    const { id, ...data } = updatedTask;
    update(ref(rtdb, `tasks/${id}`), { ...data, lastUpdated: new Date().toISOString() });
    if(user) addActivityLog(user.id, 'Task Updated', `Updated task: ${updatedTask.title}`);
  }, [user, addActivityLog]);
  
  const deleteTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    remove(ref(rtdb, `tasks/${taskId}`));
    if(user) addActivityLog(user.id, 'Task Deleted', `Deleted task: ${task.title}`);
  }, [tasks, user, addActivityLog]);
  
  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    const updates: { [key: string]: any } = {};
    updates[`/tasks/${taskId}/status`] = newStatus;
    if (newStatus === 'Done') {
        updates[`/tasks/${taskId}/completionDate`] = new Date().toISOString();
    } else {
        updates[`/tasks/${taskId}/completionDate`] = null;
    }
    update(ref(rtdb), updates);
  }, []);

  const submitTaskForApproval = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTask({ ...task, status: 'Pending Approval', previousStatus: task.status });
    }
  }, [tasks, updateTask]);

  const approveTask = useCallback((taskId: string, comment?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        const updates: { [key: string]: any } = {};
        updates[`tasks/${taskId}/status`] = 'Done';
        updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
        updates[`tasks/${taskId}/approvalState`] = 'approved';

        if (comment && user) {
            const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
            const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
            updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
        }

        update(ref(rtdb), updates);
    }
  }, [tasks, user]);

  const returnTask = useCallback((taskId: string, comment: string) => {
      if(!user) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const updates: { [key: string]: any } = {};
          updates[`tasks/${taskId}/status`] = task.previousStatus || 'To Do';
          updates[`tasks/${taskId}/approvalState`] = 'returned';

          const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
          const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
          updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

          update(ref(rtdb), updates);
      }
  }, [tasks, user]);
  
  const requestTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;

    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();
    
    if (attachment) {
      updates[`tasks/${taskId}/attachment`] = attachment;
    }

    const isSubtaskUpdate = task.assigneeIds && task.assigneeIds.length > 1;

    if (isSubtaskUpdate) {
        updates[`tasks/${taskId}/subtasks/${user.id}/status`] = newStatus;
        updates[`tasks/${taskId}/subtasks/${user.id}/updatedAt`] = new Date().toISOString();
    } else {
        updates[`tasks/${taskId}/status`] = newStatus;
    }

    if (newStatus === 'Done') {
      const requestPayload = {
        requestedBy: user.id,
        newStatus: 'Done',
        comment,
        attachment: attachment || null,
        date: new Date().toISOString(),
        status: 'Pending',
      };
      updates[`tasks/${taskId}/statusRequest`] = requestPayload;
      updates[`tasks/${taskId}/approvalState`] = 'status_pending';
    }

    addComment(taskId, comment);
    await update(ref(rtdb), updates);
  }, [user, tasksById, addComment]);

  const approveTaskStatusChange = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task || !task.statusRequest) return;
  
    const updates: { [key: string]: any } = {};
    const { newStatus, requestedBy } = task.statusRequest;
  
    updates[`tasks/${taskId}/approvalState`] = 'approved';
    updates[`tasks/${taskId}/statusRequest`] = null; // Clear the request
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();
  
    if (newStatus === 'Done') {
      updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
    }

    if (task.assigneeIds.length > 1 && newStatus === 'Done') {
        updates[`tasks/${taskId}/subtasks/${requestedBy}/status`] = 'Done';
        updates[`tasks/${taskId}/subtasks/${requestedBy}/updatedAt`] = new Date().toISOString();

        const allDone = Object.values(task.subtasks || {}).every(st => st.userId === requestedBy ? true : st.status === 'Done');
        if (allDone) {
            updates[`tasks/${taskId}/status`] = 'Done';
            updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
        } else {
            updates[`tasks/${taskId}/status`] = 'In Progress'; // Keep task active
        }
    } else {
        updates[`tasks/${taskId}/status`] = newStatus;
        if (newStatus === 'Done') {
            updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
        }
    }
  
    update(ref(rtdb), updates).then(() => {
      addComment(taskId, `Status change to "${newStatus}" approved. ${comment}`);
      toast({ title: 'Task Approved' });
    });
  }, [user, tasksById, addComment, toast]);
  
  const returnTaskStatusChange = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task || !task.statusRequest) return;
  
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = task.status; // Revert to current status
    updates[`tasks/${taskId}/approvalState`] = 'returned';
    updates[`tasks/${taskId}/statusRequest`] = null; // Clear the request
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();
  
    update(ref(rtdb), updates).then(() => {
      addComment(taskId, `Status change request returned. ${comment}`);
    });
  }, [user, tasksById, addComment]);
  
  const markTaskAsViewed = useCallback((taskId: string) => {
    if (user) {
        update(ref(rtdb, `tasks/${taskId}/viewedBy`), { [user.id]: true });
    }
  }, [user]);
  
  const acknowledgeReturnedTask = useCallback((taskId: string) => {
    update(ref(rtdb, `tasks/${taskId}`), { approvalState: 'none' });
  }, []);
  
  const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, comment: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    addComment(taskId, comment);
    
    const updates: { [key: string]: any } = {
        [`tasks/${taskId}/pendingAssigneeId`]: newAssigneeId,
        [`tasks/${taskId}/status`]: 'Pending Approval',
        [`tasks/${taskId}/approverId`]: task.creatorId,
    };
    update(ref(rtdb), updates);
  }, [user, tasksById, addComment]);
  
  const getExpandedPlannerEvents = useCallback((month: Date, userId: string) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const events: (PlannerEvent & { eventDate: Date })[] = [];

    const userEvents = plannerEvents.filter(e => e.userId === userId);

    eachDayOfInterval({ start: monthStart, end: monthEnd }).forEach(day => {
      userEvents.forEach(event => {
        if (!isValid(parseISO(event.date))) return;
        const eventStartDate = parseISO(event.date);
        
        let shouldAdd = false;
        switch (event.frequency) {
          case 'once':
            if (isSameDay(day, eventStartDate)) shouldAdd = true;
            break;
          case 'daily':
            if (day >= startOfDay(eventStartDate)) shouldAdd = true;
            break;
           case 'daily-except-sundays':
            if (day >= startOfDay(eventStartDate) && getDay(day) !== 0) shouldAdd = true;
            break;
          case 'weekly':
            if (day >= startOfDay(eventStartDate) && getDay(day) === getDay(eventStartDate)) shouldAdd = true;
            break;
          case 'weekends':
            if (day >= startOfDay(eventStartDate) && (isSaturday(day) || isSunday(day))) shouldAdd = true;
            break;
          case 'monthly':
            if (day >= startOfDay(eventStartDate) && getDate(day) === getDate(eventStartDate)) shouldAdd = true;
            break;
        }
        if (shouldAdd) {
          events.push({ ...event, eventDate: day });
        }
      });
    });
    return events;
  }, [plannerEvents]);
  
  const addPlannerEvent = useCallback((eventData: Omit<PlannerEvent, 'id'>) => {
    const newRef = push(ref(rtdb, 'plannerEvents'));
    set(newRef, { ...eventData, id: newRef.key });
    if(user) addActivityLog(user.id, 'Planner Event Added', eventData.title);
  }, [user, addActivityLog]);

  const updatePlannerEvent = useCallback((event: PlannerEvent) => {
    const { id, ...data } = event;
    update(ref(rtdb, `plannerEvents/${id}`), data);
    if(user) addActivityLog(user.id, 'Planner Event Updated', event.title);
  }, [user, addActivityLog]);

  const deletePlannerEvent = useCallback((eventId: string) => {
    const event = plannerEvents.find(e => e.id === eventId);
    if (!event) return;
    remove(ref(rtdb, `plannerEvents/${eventId}`));
    if(user) addActivityLog(user.id, 'Planner Event Deleted', event.title);
  }, [plannerEvents, user, addActivityLog]);
  
  const addPlannerEventComment = useCallback((plannerUserId: string, day: string, eventId: string, text: string) => {
    if (!user) return;
    const dayCommentId = `${day}_${plannerUserId}`;
    const commentId = push(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments`)).key;
    const newComment: Omit<Comment, 'id'> = {
      userId: user.id,
      text: text,
      date: new Date().toISOString(),
      eventId: eventId,
    };
    
    const updates: { [key: string]: any } = {};
    updates[`dailyPlannerComments/${dayCommentId}/id`] = dayCommentId;
    updates[`dailyPlannerComments/${dayCommentId}/plannerUserId`] = plannerUserId;
    updates[`dailyPlannerComments/${dayCommentId}/day`] = day;
    updates[`dailyPlannerComments/${dayCommentId}/comments/${commentId}`] = { ...newComment, id: commentId };
    updates[`dailyPlannerComments/${dayCommentId}/lastUpdated`] = new Date().toISOString();

    const event = plannerEvents.find(e => e.id === eventId);
    if(event) {
        if(user.id !== event.creatorId) updates[`dailyPlannerComments/${dayCommentId}/viewedBy/${event.creatorId}`] = false;
        if(user.id !== event.userId) updates[`dailyPlannerComments/${dayCommentId}/viewedBy/${event.userId}`] = false;
    }

    update(ref(rtdb), updates);
  }, [user, plannerEvents]);

  const markSinglePlannerCommentAsRead = useCallback((plannerUserId: string, day: string, commentId: string) => {
    if (!user) return;
    const path = `dailyPlannerComments/${day}_${plannerUserId}/comments/${commentId}/viewedBy/${user.id}`;
    update(ref(rtdb), { [path]: true });
  }, [user]);

  const markPlannerCommentsAsRead = useCallback((plannerUserId: string, day: string) => {
      if (!user) return;
      const dayCommentId = `${day}_${plannerUserId}`;
      const dayComment = dailyPlannerCommentsById[dayCommentId];
      if (!dayComment || !dayComment.comments) return;

      const updates: { [key: string]: boolean } = {};
      Object.values(dayComment.comments).forEach(comment => {
          if (comment && comment.userId !== user.id) {
              updates[`dailyPlannerComments/${dayCommentId}/comments/${comment.id}/viewedBy/${user.id}`] = true;
          }
      });
      if (Object.keys(updates).length > 0) {
          update(ref(rtdb), updates);
      }
  }, [user, dailyPlannerCommentsById]);
  
  const dismissPendingUpdate = useCallback((eventId: string, day: string) => {
    if(!user) return;
    const path = `users/${user.id}/dismissedPendingUpdates/${eventId}_${day}`;
    update(ref(rtdb), { [path]: true });
  }, [user]);

  const awardManualAchievement = useCallback((achievement: Omit<Achievement, 'id'|'date'|'type'|'awardedById'|'status'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'achievements'));
    const newAchievement: Omit<Achievement, 'id'> = {
      ...achievement,
      type: 'manual',
      date: new Date().toISOString(),
      awardedById: user.id,
      status: 'approved',
    };
    set(newRef, newAchievement);
    addActivityLog(user.id, 'Achievement Awarded', `Awarded "${achievement.title}" to ${users.find(u => u.id === achievement.userId)?.name}`);
  }, [user, addActivityLog, users]);

  const updateManualAchievement = useCallback((achievement: Achievement) => {
    const { id, ...data } = achievement;
    update(ref(rtdb, `achievements/${id}`), data);
    if(user) addActivityLog(user.id, 'Achievement Updated', `Updated achievement: ${achievement.title}`);
  }, [user, addActivityLog]);

  const deleteManualAchievement = useCallback((achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if(!achievement) return;
    remove(ref(rtdb, `achievements/${achievementId}`));
    if(user) addActivityLog(user.id, 'Achievement Deleted', `Deleted achievement: ${achievement.title}`);
  }, [achievements, user, addActivityLog]);

  const updateUserPlanningScore = useCallback((userId: string, score: number) => {
    update(ref(rtdb, `users/${userId}`), { planningScore: score });
  }, []);

  const deleteUser = useCallback((userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if(!userToDelete) return;
    remove(ref(rtdb, `users/${userId}`));
    if(user) addActivityLog(user.id, 'User Deleted', `Deleted user: ${userToDelete.name}`);
  }, [users, user, addActivityLog]);

  const addRole = useCallback((roleData: Omit<RoleDefinition, 'id' | 'isEditable'>) => {
    const newRef = push(ref(rtdb, 'roles'));
    set(newRef, { ...roleData, id: newRef.key, isEditable: true });
    if(user) addActivityLog(user.id, 'Role Added', `Added role: ${roleData.name}`);
  }, [user, addActivityLog]);

  const updateRole = useCallback((role: RoleDefinition) => {
    const { id, ...data } = role;
    update(ref(rtdb, `roles/${id}`), data);
    if(user) addActivityLog(user.id, 'Role Updated', `Updated role: ${role.name}`);
  }, [user, addActivityLog]);

  const deleteRole = useCallback((roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    if (!roleToDelete) return;
    remove(ref(rtdb, `roles/${roleId}`));
    if(user) addActivityLog(user.id, 'Role Deleted', `Deleted role: ${roleToDelete.name}`);
  }, [roles, user, addActivityLog]);

  const addProject = useCallback((projectName: string) => {
    const newRef = push(ref(rtdb, 'projects'));
    set(newRef, { id: newRef.key, name: projectName, isPlant: true });
    if(user) addActivityLog(user.id, 'Project Added', `Added project: ${projectName}`);
  }, [user, addActivityLog]);

  const updateProject = useCallback((project: Project) => {
    const { id, ...data } = project;
    update(ref(rtdb, `projects/${id}`), data);
    if(user) addActivityLog(user.id, 'Project Updated', `Updated project: ${project.name}`);
  }, [user, addActivityLog]);

  const deleteProject = useCallback((projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;
    remove(ref(rtdb, `projects/${projectId}`));
    if(user) addActivityLog(user.id, 'Project Deleted', `Deleted project: ${projectToDelete.name}`);
  }, [projects, user, addActivityLog]);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    const { id, ...data } = vehicle;
    update(ref(rtdb, `vehicles/${id}`), data);
    if(user) addActivityLog(user.id, 'Vehicle Updated', `Updated vehicle: ${vehicle.vehicleNumber}`);
  }, [user, addActivityLog]);

  const deleteVehicle = useCallback((vehicleId: string) => {
    const vehicleToDelete = vehicles.find(v => v.id === vehicleId);
    if(!vehicleToDelete) return;
    remove(ref(rtdb, `vehicles/${vehicleId}`));
    if(user) addActivityLog(user.id, 'Vehicle Deleted', `Deleted vehicle: ${vehicleToDelete.vehicleNumber}`);
  }, [vehicles, user, addActivityLog]);

  const addDriver = useCallback((driverData: Omit<Driver, 'id'|'photo'>) => {
    const newRef = push(ref(rtdb, 'drivers'));
    const photoUrl = `https://i.pravatar.cc/150?u=${newRef.key}`;
    set(newRef, { ...driverData, id: newRef.key, photo: photoUrl });
    if(user) addActivityLog(user.id, 'Driver Added', `Added driver: ${driverData.name}`);
  }, [user, addActivityLog]);

  const updateDriver = useCallback((driver: Driver) => {
    const { id, ...data } = driver;
    update(ref(rtdb, `drivers/${id}`), data);
    if(user) addActivityLog(user.id, 'Driver Updated', `Updated driver: ${driver.name}`);
  }, [user, addActivityLog]);

  const deleteDriver = useCallback((driverId: string) => {
    const driverToDelete = drivers.find(d => d.id === driverId);
    if(!driverToDelete) return;
    remove(ref(rtdb, `drivers/${driverId}`));
    if(user) addActivityLog(user.id, 'Driver Deleted', `Deleted driver: ${driverToDelete.name}`);
  }, [drivers, user, addActivityLog]);
  
  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
    if (!user) return;
    const { id, ...data } = incident;
    const updates: { [key: string]: any } = {
        [`incidentReports/${id}`]: { ...data, lastUpdated: new Date().toISOString() }
    };
    const newCommentRef = push(ref(rtdb, `incidentReports/${id}/comments`));
    updates[`incidentReports/${id}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key,
        userId: user.id,
        text: comment,
        date: new Date().toISOString(),
    };
    
    // Mark as unread for all participants
    const participants = new Set(incident.reportedToUserIds);
    participants.add(incident.reporterId);
    participants.forEach(pId => {
        updates[`incidentReports/${id}/viewedBy/${pId}`] = false;
    });

    update(ref(rtdb), updates);
  }, [user]);

  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    if(!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;
    
    const updates: { [key: string]: any } = {};
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key,
        userId: user.id,
        text,
        date: new Date().toISOString(),
    };
    updates[`incidentReports/${incidentId}/lastUpdated`] = new Date().toISOString();

    const participants = new Set(incident.reportedToUserIds);
    participants.add(incident.reporterId);
    participants.forEach(pId => {
        updates[`incidentReports/${incidentId}/viewedBy/${pId}`] = false;
    });

    update(ref(rtdb), updates);
  }, [user, incidentReports]);

  const publishIncident = useCallback((incidentId: string, comment: string) => {
    if(!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if(!incident) return;

    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/isPublished`] = true;
    
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key,
        userId: user.id,
        text: comment,
        date: new Date().toISOString(),
    };
    
    update(ref(rtdb), updates);
  }, [user, incidentReports]);
  
  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    if(!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;

    const currentParticipants = new Set(incident.reportedToUserIds || []);
    userIds.forEach(id => currentParticipants.add(id));
    
    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/reportedToUserIds`] = Array.from(currentParticipants);

    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key,
        userId: user.id,
        text: comment,
        date: new Date().toISOString(),
    };

    update(ref(rtdb), updates);
  }, [user, incidentReports]);
  
  const markIncidentAsViewed = useCallback((incidentId: string) => {
    if (user) {
        update(ref(rtdb, `incidentReports/${incidentId}/viewedBy`), { [user.id]: true });
    }
  }, [user]);

  const updateManpowerLog = useCallback(async (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName'>>) => {
    if (!user) return;
    const log = manpowerLogs.find(l => l.id === logId);
    if (!log) return;

    const newTotal = log.yesterdayCount + (data.countIn ?? log.countIn) - (data.countOut ?? log.countOut);

    const updates: Partial<ManpowerLog> = {
        ...data,
        total: newTotal,
        updatedBy: user.id,
    }
    await update(ref(rtdb, `manpowerLogs/${logId}`), updates);
  }, [user, manpowerLogs]);

  const addMultipleManpowerProfiles = useCallback((profilesData: any[]): number => { if (!user) return 0; const profiles = Object.values(manpowerProfilesById); const updates: { [key: string]: any } = {}; let importedCount = 0; for (const row of profilesData) { const [name, mobile, gender, woNo, llNo, eic, woExpiry, llExpiry, joiningDate, epNo, aadhar, dob, uan, wcPolicyNo, wcPolicyExpiry] = row; const fileNo = row[20]; if (!name || !fileNo) continue; const existingProfile = profiles.find(p => p.hardCopyFileNo === fileNo); if (existingProfile) { updates[`manpowerProfiles/${existingProfile.id}/name`] = name; // ... update other fields } else { const newRef = push(ref(rtdb, 'manpowerProfiles')); const photoUrl = `https://i.pravatar.cc/150?u=${newRef.key}`; updates[`manpowerProfiles/${newRef.key}`] = { id: newRef.key, name, hardCopyFileNo: fileNo, mobileNumber: mobile, gender, workOrderNumber: woNo, labourLicenseNo: llNo, eic, workOrderExpiryDate: woExpiry?.toISOString(), labourLicenseExpiryDate: llExpiry?.toISOString(), joiningDate: joiningDate?.toISOString(), epNumber: epNo, aadharNumber: aadhar, dob: dob?.toISOString(), uanNumber: uan, wcPolicyNumber: wcPolicyNo, wcPolicyExpiryDate: wcPolicyExpiry?.toISOString(), status: 'Working', trade: 'Unknown', photo: photoUrl }; } importedCount++; } if (Object.keys(updates).length > 0) { update(ref(rtdb), updates); } return importedCount; }, [user, manpowerProfilesById]);
  
  const updateManpowerProfile = useCallback(async (profile: ManpowerProfile) => { if (user) { const { id, ...data } = profile; await update(ref(rtdb, `manpowerProfiles/${id}`), data); addActivityLog(user.id, 'Manpower Profile Updated', `Updated profile for ${profile.name}`); } }, [user, addActivityLog]);
  
  const deleteManpowerProfile = useCallback((profileId: string) => { if (user) { remove(ref(rtdb, `manpowerProfiles/${profileId}`)); addActivityLog(user.id, 'Manpower Profile Deleted'); } }, [user, addActivityLog]);
  
  const addLeaveForManpower = useCallback((manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => { if (!user) return; const leaveRecord: Omit<LeaveRecord, 'id'> = { leaveType, leaveStartDate: startDate.toISOString(), plannedEndDate: endDate.toISOString(), remarks }; manpowerIds.forEach(id => { const newLeaveRef = push(ref(rtdb, `manpowerProfiles/${id}/leaveHistory`)); set(newLeaveRef, { ...leaveRecord, id: newLeaveRef.key }); }); addActivityLog(user.id, 'Manpower Leave Added', `Added leave for ${manpowerIds.length} employees`); }, [user, addActivityLog]);
  
  const extendLeave = useCallback((manpowerId: string, leaveId: string, newEndDate: Date) => { update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), { plannedEndDate: newEndDate.toISOString() }); }, []);
  
  const rejoinFromLeave = useCallback((manpowerId: string, leaveId: string, rejoinedDate: Date) => { const updates: { [key: string]: any } = {}; updates[`manpowerProfiles/${manpowerId}/status`] = 'Working'; updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/rejoinedDate`] = rejoinedDate.toISOString(); update(ref(rtdb), updates); }, []);
  
  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => { const updates: { [key: string]: any } = {}; updates[`manpowerProfiles/${manpowerId}/status`] = 'On Leave'; updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/leaveEndDate`] = new Date().toISOString(); update(ref(rtdb), updates); }, []);
  
  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => { remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`)); }, []);
  
  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => { const { id, ...data } = leaveRecord; update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${id}`), data); }, []);
  
  const deleteLeaveRecord = useCallback((manpowerId: string, leaveId: string) => { remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`)); }, []);
  
  const addMemoOrWarning = useCallback((manpowerId: string, memo: Omit<MemoRecord, 'id'>) => { const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory`)); set(newRef, { ...memo, id: newRef.key }); }, []);
  
  const updateMemoRecord = useCallback((manpowerId: string, memo: MemoRecord) => { const { id, ...data } = memo; update(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${id}`), data); }, []);
  
  const deleteMemoRecord = useCallback((manpowerId: string, memoId: string) => { remove(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${memoId}`)); }, []);
  
  const addPpeHistoryRecord = useCallback((manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => { const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory`)); set(newRef, { ...record, id: newRef.key }); }, []);
  
  const updatePpeHistoryRecord = useCallback((manpowerId: string, record: PpeHistoryRecord) => { const { id, ...data } = record; update(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${id}`), data); }, []);
  
  const deletePpeHistoryRecord = useCallback((manpowerId: string, recordId: string) => { remove(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${recordId}`)); }, []);
  
  const addPpeHistoryFromExcel = useCallback(async (data: any[]): Promise<{ importedCount: number; notFoundCount: number; }> => { let importedCount = 0; let notFoundCount = 0; const profiles = Object.values(manpowerProfilesById); const updates: { [key: string]: any } = {}; for (const row of data) { const employeeName = row['Employee Name']; const size = row['Size']; const date = row['Date']; if (!employeeName || !size || !date) continue; const profile = profiles.find(p => p.name.trim().toLowerCase() === employeeName.trim().toLowerCase()); if (profile) { const newRecord: Omit<PpeHistoryRecord, 'id'> = { ppeType: 'Coverall', size, issueDate: new Date(date).toISOString(), requestType: 'New', issuedById: user!.id, }; const newKey = push(ref(rtdb, `manpowerProfiles/${profile.id}/ppeHistory`)).key; updates[`manpowerProfiles/${profile.id}/ppeHistory/${newKey}`] = { ...newRecord, id: newKey }; importedCount++; } else { notFoundCount++; } } if (Object.keys(updates).length > 0) { await update(ref(rtdb), updates); } return { importedCount, notFoundCount }; }, [manpowerProfilesById, user]);
  
  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => { if (!user) return; const newRef = push(ref(rtdb, 'internalRequests')); const newRequest: Omit<InternalRequest, 'id'> = { ...requestData, requesterId: user.id, date: new Date().toISOString(), status: 'Pending', viewedByRequester: true, acknowledgedByRequester: false, }; set(newRef, newRequest); addActivityLog(user.id, 'Internal Store Request Created'); }, [user, addActivityLog]);
  
  const updateInternalRequestItem = useCallback((requestId: string, item: InternalRequestItem, originalItem: InternalRequestItem) => { const request = internalRequestsById[requestId]; if (!request) return; const itemIndex = (request.items || []).findIndex(i => i.id === item.id); if (itemIndex === -1) return; const updates: { [key: string]: any } = {}; updates[`internalRequests/${requestId}/items/${itemIndex}`] = item; if (user) { const comment = `Item changed: "${originalItem.description}" (Qty: ${originalItem.quantity}) to "${item.description}" (Qty: ${item.quantity}).`; addInternalRequestComment(requestId, comment); } update(ref(rtdb), updates); }, [user, internalRequestsById, addInternalRequestComment]);
  
  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => { if (!user) return; const updates: { [key: string]: any } = { [`internalRequests/${requestId}/status`]: status, }; if (status === 'Approved' || status === 'Rejected' || status === 'Issued') { updates[`internalRequests/${requestId}/approverId`] = user.id; } addInternalRequestComment(requestId, comment); update(ref(rtdb), updates); }, [user, addInternalRequestComment]);
  
  const updateInternalRequestItemStatus = useCallback((requestId: string, itemId: string, status: InternalRequestItemStatus, comment: string) => { const request = internalRequests.find(r => r.id === requestId); if (!request) return; const itemIndex = request.items.findIndex(i => i.id === itemId); if (itemIndex === -1) return; const updates: { [key: string]: any } = {}; updates[`internalRequests/${requestId}/items/${itemIndex}/status`] = status; update(ref(rtdb), updates); addInternalRequestComment(requestId, `Status for "${request.items[itemIndex].description}" set to ${status}. ${comment || ''}`); }, [internalRequests, addInternalRequestComment]);
  
  const resolveInternalRequestDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => { if(!user) return; const request = internalRequests.find(r => r.id === requestId); if (!request) return; if(resolution === 'reissue') { const updates: {[key: string]: any} = {}; request.items.forEach((item, index) => { if (item.status === 'Issued') { updates[`internalRequests/${requestId}/items/${index}/status`] = 'Approved'; } }); update(ref(rtdb), updates); addInternalRequestComment(requestId, `Dispute approved by ${user.name}. Item(s) set back to 'Approved' for re-issuance. Comment: ${comment}`); toast({ title: 'Dispute Resolved', description: 'Items are ready to be re-issued.' }); } else { addInternalRequestComment(requestId, `Dispute rejected by ${user.name}. Status remains 'Issued'. Comment: ${comment}`); toast({ title: 'Dispute Resolved', description: 'Transfer confirmed as issued.' }); } update(ref(rtdb), { [`internalRequests/${requestId}/status`]: 'Issued' }); }, [user, internalRequests, addInternalRequestComment, toast]);
  
  const deleteInternalRequest = useCallback((requestId: string) => { remove(ref(rtdb, `internalRequests/${requestId}`)); }, []);
  
  const forceDeleteInternalRequest = useCallback((requestId: string) => { remove(ref(rtdb, `internalRequests/${requestId}`)); }, []);
  
  const markInternalRequestAsViewed = useCallback((requestId: string) => { if (user) { update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true }); } }, [user]);
  
  const acknowledgeInternalRequest = useCallback((requestId: string) => { update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true }); }, []);
  
  const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => { if (!user) return; const newRef = push(ref(rtdb, 'managementRequests')); const newRequest: Omit<ManagementRequest, 'id'> = { ...requestData, requesterId: user.id, date: new Date().toISOString(), status: 'Pending', viewedByRequester: true, comments: [] }; set(newRef, newRequest); addActivityLog(user.id, 'Management Request Sent', requestData.subject); }, [user, addActivityLog]);
  
  const updateManagementRequest = useCallback((request: ManagementRequest) => { const { id, ...data } = request; update(ref(rtdb, `managementRequests/${id}`), data); }, []);
  
  const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => { if (!user) return; const request = managementRequests.find(r => r.id === requestId); if (!request) return; const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`)); const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() }; const updates: { [key: string]: any } = { [`managementRequests/${requestId}/status`]: status, [`managementRequests/${requestId}/approverId`]: user.id, [`managementRequests/${requestId}/viewedByRequester`]: false, [`managementRequests/${requestId}/comments/${newCommentRef.key}`]: { ...newComment, id: newCommentRef.key }, }; update(ref(rtdb), updates); }, [user, managementRequests]);
  
  const deleteManagementRequest = useCallback((requestId: string) => { remove(ref(rtdb, `managementRequests/${requestId}`)); }, []);
  
  const markManagementRequestAsViewed = useCallback((requestId: string) => { if (user) { update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true }); } }, [user]);
  
  const addPpeRequest = useCallback(async (requestData: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => { if (!user) return; const newRef = push(ref(rtdb, 'ppeRequests')); const newRequest: Omit<PpeRequest, 'id'> = { ...requestData, requesterId: user.id, date: new Date().toISOString(), status: 'Pending', viewedByRequester: true, comments: [] }; await set(newRef, newRequest); addActivityLog(user.id, 'PPE Request Created', `For ${manpowerProfiles.find(p => p.id === requestData.manpowerId)?.name}`); const managers = users.filter(u => u.role === 'Manager' || u.role === 'Admin'); const profile = manpowerProfiles.find(p => p.id === requestData.manpowerId); if (!profile) return; const lastIssue = (Array.isArray(profile.ppeHistory) ? profile.ppeHistory : Object.values(profile.ppeHistory || {})) .filter(h => h.ppeType === requestData.ppeType) .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0]; const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes')); const stockInfo = requestData.ppeType === 'Coverall' && stockItem?.sizes ? `${stockItem.sizes[requestData.size] || 0} in stock` : (stockItem?.quantity ? `${stockItem.quantity} in stock` : 'N/A'); const emailData = { ...requestData, requesterName: user.name, employeeName: profile.name, joiningDate: profile.joiningDate ? format(parseISO(profile.joiningDate), 'dd-MM-yyyy') : 'N/A', rejoiningDate: (profile.leaveHistory || []).find(l => l.rejoinedDate)?.rejoinedDate ? format(parseISO((profile.leaveHistory || []).find(l => l.rejoinedDate)!.rejoinedDate!), 'dd-MM-yyyy') : 'N/A', lastIssueDate: lastIssue ? format(parseISO(lastIssue.issueDate), 'dd-MM-yyyy') : 'N/A', stockInfo, }; for (const manager of managers) { if (manager.email) { await sendPpeRequestEmail(emailData); } } }, [user, addActivityLog, manpowerProfiles, users, ppeStock]);
  
  const updatePpeRequest = useCallback((request: PpeRequest) => { const { id, ...data } = request; update(ref(rtdb, `ppeRequests/${id}`), data); }, []);
    
  const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => { if (!user) return; const request = ppeRequests.find(r => r.id === requestId); if (!request) return; const updates: { [key: string]: any } = { [`ppeRequests/${requestId}/status`]: status, [`ppeRequests/${requestId}/viewedByRequester`]: false, }; if (status === 'Approved' || status === 'Rejected' || status === 'Disputed') { updates[`ppeRequests/${requestId}/approverId`] = user.id; } if (status === 'Issued') { updates[`ppeRequests/${requestId}/issuedById`] = user.id; const newHistoryRecordRef = push(ref(rtdb, `manpowerProfiles/${request.manpowerId}/ppeHistory`)); const newRecord: Omit<PpeHistoryRecord, 'id'> = { ppeType: request.ppeType, size: request.size, quantity: request.quantity, issueDate: new Date().toISOString(), requestType: request.requestType, remarks: request.remarks, issuedById: user.id, approverId: request.approverId, requestId: requestId, }; updates[`manpowerProfiles/${request.manpowerId}/ppeHistory/${newHistoryRecordRef.key}`] = { ...newRecord, id: newHistoryRecordRef.key }; const stockId = request.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'; const stockItem = ppeStock.find(s => s.id === stockId); if (stockItem) { if (request.ppeType === 'Coverall' && stockItem.sizes) { const currentSizeStock = stockItem.sizes[request.size] || 0; updates[`ppeStock/${stockId}/sizes/${request.size}`] = Math.max(0, currentSizeStock - request.quantity); } else if (request.ppeType === 'Safety Shoes' && stockItem.quantity) { updates[`ppeStock/${stockId}/quantity`] = Math.max(0, stockItem.quantity - request.quantity); } } } addPpeRequestComment(requestId, `${status}: ${comment}`); update(ref(rtdb), updates); }, [user, ppeRequests, ppeStock, addPpeRequestComment]);
  
  const resolvePpeDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => { if (!user) return; if (resolution === 'reissue') { updatePpeRequestStatus(requestId, 'Approved', `Dispute approved. Re-issuing item. ${comment}`); toast({ title: "Dispute Resolved", description: "Request has been sent back for re-issuance." }); } else { updatePpeRequestStatus(requestId, 'Issued', `Dispute rejected. Confirmed as issued. ${comment}`); toast({ title: "Dispute Resolved", description: "The item has been confirmed as issued." }); } }, [user, updatePpeRequestStatus, toast]);
  
  const deletePpeRequest = useCallback((requestId: string) => { remove(ref(rtdb, `ppeRequests/${requestId}`)); }, []);
  
  const deletePpeAttachment = useCallback((requestId: string) => { update(ref(rtdb, `ppeRequests/${requestId}`), { attachmentUrl: null }); }, []);
  
  const markPpeRequestAsViewed = useCallback((requestId: string) => { if (user) { update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true }); } }, [user]);
  
  const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => { const updates: { [key: string]: any } = {}; if (stockId === 'coveralls' && typeof data === 'object') { updates[`ppeStock/${stockId}/sizes`] = data; } else if (stockId === 'safetyShoes' && typeof data === 'number') { updates[`ppeStock/${stockId}/quantity`] = data; } updates[`ppeStock/${stockId}/lastUpdated`] = new Date().toISOString(); update(ref(rtdb), updates); }, []);
  
  const addPpeInwardRecord = useCallback((record: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => { if (!user) return; const newRef = push(ref(rtdb, 'ppeInwardHistory')); const newRecord = { ...record, id: newRef.key, addedByUserId: user.id }; set(newRef, newRecord); const stockId = record.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'; const stockItem = ppeStock.find(s => s.id === stockId); if (stockItem) { const updates: { [key: string]: any } = {}; if (record.ppeType === 'Coverall' && record.sizes) { const newSizes = { ...stockItem.sizes }; for (const size in record.sizes) { newSizes[size] = (newSizes[size] || 0) + (record.sizes[size] || 0); } updates[`ppeStock/${stockId}/sizes`] = newSizes; } else if (record.ppeType === 'Safety Shoes' && record.quantity) { updates[`ppeStock/${stockId}/quantity`] = (stockItem.quantity || 0) + record.quantity; } update(ref(rtdb), updates); } }, [user, ppeStock]);
  
  const updatePpeInwardRecord = useCallback((record: PpeInwardRecord) => { const { id, ...data } = record; update(ref(rtdb, `ppeInwardHistory/${id}`), data); }, []);
  
  const deletePpeInwardRecord = useCallback((record: PpeInwardRecord) => { remove(ref(rtdb, `ppeInwardHistory/${record.id}`)); const stockId = record.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'; const stockItem = ppeStock.find(s => s.id === stockId); if (stockItem) { const updates: { [key: string]: any } = {}; if (record.ppeType === 'Coverall' && record.sizes) { const newSizes = { ...stockItem.sizes }; for (const size in record.sizes) { newSizes[size] = Math.max(0, (newSizes[size] || 0) - (record.sizes[size] || 0)); } updates[`ppeStock/${stockId}/sizes`] = newSizes; } else if (record.ppeType === 'Safety Shoes' && record.quantity) { updates[`ppeStock/${stockId}/quantity`] = Math.max(0, (stockItem.quantity || 0) - record.quantity); } update(ref(rtdb), updates); } }, [ppeStock]);
  
  const addMultipleInventoryItems = useCallback((items: any[]): number => {
    if (!user) return 0;
    const existingItems = Object.values(inventoryItemsById);
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    items.forEach(itemData => {
        const serialNumber = itemData['SERIAL NUMBER'];
        if (!serialNumber) return;

        const existingItem = existingItems.find(i => i.serialNumber === serialNumber);
        const data = {
            name: itemData['ITEM NAME'] || 'Unknown',
            serialNumber: serialNumber,
            chestCrollNo: itemData['CHEST CROLL NO'] || null,
            ariesId: itemData['ARIES ID'] || null,
            inspectionDate: itemData['INSPECTION DATE']?.toISOString() || null,
            inspectionDueDate: itemData['INSPECTION DUE DATE']?.toISOString() || null,
            tpInspectionDueDate: itemData['TP INSPECTION DUE DATE']?.toISOString() || null,
            status: itemData['STATUS'] || 'In Store',
            projectId: projects.find(p => p.name === itemData['PROJECT'])?.id || projects.find(p => p.name === 'Unassigned')?.id,
            lastUpdated: new Date().toISOString(),
        };

        if (existingItem) {
            updates[`/inventoryItems/${existingItem.id}`] = { ...existingItem, ...data };
        } else {
            const newRef = push(ref(rtdb, 'inventoryItems'));
            updates[`/inventoryItems/${newRef.key}`] = { id: newRef.key, ...data };
        }
        importedCount++;
    });

    if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
    }
    
    return importedCount;
  }, [user, inventoryItemsById, projects]);

  const deleteInventoryItem = useCallback((itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item && user) addActivityLog(user.id, 'Inventory Item Deleted', `Deleted ${item.name} (SN: ${item.serialNumber})`);
    remove(ref(rtdb, `inventoryItems/${itemId}`));
  }, [inventoryItems, user, addActivityLog]);
  
  const deleteInventoryItemGroup = useCallback((itemName: string) => {
    const itemsToDelete = inventoryItems.filter(item => item.name === itemName);
    const updates: { [key: string]: null } = {};
    itemsToDelete.forEach(item => {
        updates[`/inventoryItems/${item.id}`] = null;
    });
    update(ref(rtdb), updates);
  }, [inventoryItems]);

  const renameInventoryItemGroup = useCallback((oldName: string, newName: string) => {
    const itemsToUpdate = inventoryItems.filter(item => item.name === oldName);
    const updates: { [key: string]: string } = {};
    itemsToUpdate.forEach(item => {
        updates[`/inventoryItems/${item.id}/name`] = newName;
    });
    update(ref(rtdb), updates);
  }, [inventoryItems]);
  
  const deleteInventoryTransferRequest = useCallback((requestId: string) => {
    remove(ref(rtdb, `inventoryTransferRequests/${requestId}`));
  }, []);
  
  const rejectInventoryTransferRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Rejected';
    updates[`inventoryTransferRequests/${requestId}/approverId`] = user.id;
    updates[`inventoryTransferRequests/${requestId}/approvalDate`] = new Date().toISOString();
    addInternalRequestComment(requestId, `Rejected: ${comment}`);
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Rejected', `Request ID: ${requestId}`);
  }, [user, addInternalRequestComment, addActivityLog]);

  const disputeInventoryTransfer = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Disputed';
    addInternalRequestComment(requestId, `Disputed by ${user.name}: ${comment}`);
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Disputed', `Request ID: ${requestId}`);
  }, [user, addInternalRequestComment, addActivityLog]);

  const acknowledgeTransfer = useCallback((requestId: string) => {
    if (!user) return;
    const request = inventoryTransferRequests.find(req => req.id === requestId);
    if (!request) return;

    const updates: { [key: string]: any } = {
        [`inventoryTransferRequests/${requestId}/status`]: 'Completed',
        [`inventoryTransferRequests/${requestId}/acknowledgedBy`]: user.id,
        [`inventoryTransferRequests/${requestId}/acknowledgedDate`]: new Date().toISOString()
    };
    
    request.items.forEach(item => {
        updates[`${item.itemType.toLowerCase()}s/${item.itemId}/projectId`] = request.toProjectId;
        updates[`${item.itemType.toLowerCase()}s/${item.itemId}/lastUpdated`] = new Date().toISOString();
    });

    update(ref(rtdb), updates);
  }, [user, inventoryTransferRequests]);
  
  const clearInventoryTransferHistory = useCallback(() => {
    const updates: { [key: string]: null } = {};
    inventoryTransferRequests.forEach(req => {
        if(req.status === 'Completed' || req.status === 'Rejected') {
            updates[`/inventoryTransferRequests/${req.id}`] = null;
        }
    });
    update(ref(rtdb), updates);
  }, [inventoryTransferRequests]);

  const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'certificateRequests'));
    const newRequest: Omit<CertificateRequest, 'id'> = {
      ...requestData,
      requesterId: user.id,
      status: 'Pending',
      requestDate: new Date().toISOString(),
      comments: [{ id: 'c-0', userId: user.id, text: requestData.remarks || 'Request submitted', date: new Date().toISOString() }],
    };
    set(newRef, newRequest);
  }, [user]);

  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if(!user) return;
    const updates: { [key: string]: any } = {
        [`certificateRequests/${requestId}/status`]: 'Completed',
        [`certificateRequests/${requestId}/completionDate`]: new Date().toISOString(),
        [`certificateRequests/${requestId}/viewedByRequester`]: false,
    };
    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    updates[`certificateRequests/${requestId}/comments/${newCommentRef.key}`] = { id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString() };
    update(ref(rtdb), updates);
  }, [user]);

  const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
    if(!user) return;
    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    const updates: { [key: string]: any } = {};
    updates[`certificateRequests/${requestId}/comments/${newCommentRef.key}`] = { id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString() };
    updates[`certificateRequests/${requestId}/viewedByRequester`] = false;
    update(ref(rtdb), updates);
  }, [user]);
  
  const markFulfilledRequestsAsViewed = useCallback((requestType: 'store' | 'equipment') => {
      if(!user) return;
      const updates: {[key: string]: boolean} = {};
      certificateRequests.forEach(req => {
          if (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester) {
              const isStore = !!req.itemId;
              const isEquipment = !!req.utMachineId || !!req.dftMachineId;
              if ((requestType === 'store' && isStore) || (requestType === 'equipment' && isEquipment)) {
                  updates[`certificateRequests/${req.id}/viewedByRequester`] = true;
              }
          }
      });
      if (Object.keys(updates).length > 0) {
          update(ref(rtdb), updates);
      }
  }, [user, certificateRequests]);
  
  const acknowledgeFulfilledRequest = useCallback((requestId: string) => {
    remove(ref(rtdb, `certificateRequests/${requestId}`));
  }, []);
  
  const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => { const newRef = push(ref(rtdb, 'utMachines')); set(newRef, { ...machine, id: newRef.key }); }, []);
  const updateUTMachine = useCallback((machine: UTMachine) => { const { id, ...data } = machine; update(ref(rtdb, `utMachines/${id}`), data); }, []);
  const deleteUTMachine = useCallback((machineId: string) => { remove(ref(rtdb, `utMachines/${machineId}`)); }, []);
  const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => { const newRef = push(ref(rtdb, 'dftMachines')); set(newRef, { ...machine, id: newRef.key }); }, []);
  const updateDftMachine = useCallback((machine: DftMachine) => { const { id, ...data } = machine; update(ref(rtdb, `dftMachines/${id}`), data); }, []);
  const deleteDftMachine = useCallback((machineId: string) => { remove(ref(rtdb, `dftMachines/${machineId}`)); }, []);
  const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => { const newRef = push(ref(rtdb, 'mobileSims')); set(newRef, { ...item, id: newRef.key }); }, []);
  const updateMobileSim = useCallback((item: MobileSim) => { const { id, ...data } = item; update(ref(rtdb, `mobileSims/${id}`), data); }, []);
  const deleteMobileSim = useCallback((itemId: string) => { remove(ref(rtdb, `mobileSims/${itemId}`)); }, []);
  const addLaptopDesktop = useCallback((item: Omit<LaptopDesktop, 'id'>) => { const newRef = push(ref(rtdb, 'laptopsDesktops')); set(newRef, { ...item, id: newRef.key }); }, []);
  const updateLaptopDesktop = useCallback((item: LaptopDesktop) => { const { id, ...data } = item; update(ref(rtdb, `laptopsDesktops/${id}`), data); }, []);
  const deleteLaptopDesktop = useCallback((itemId: string) => { remove(ref(rtdb, `laptopsDesktops/${itemId}`)); }, []);
  const addDigitalCamera = useCallback((camera: Omit<DigitalCamera, 'id'>) => { const newRef = push(ref(rtdb, 'digitalCameras')); set(newRef, { ...camera, id: newRef.key }); }, []);
  const updateDigitalCamera = useCallback((camera: DigitalCamera) => { const { id, ...data } = camera; update(ref(rtdb, `digitalCameras/${id}`), data); }, []);
  const deleteDigitalCamera = useCallback((cameraId: string) => { remove(ref(rtdb, `digitalCameras/${cameraId}`)); }, []);
  const addAnemometer = useCallback((anemometer: Omit<Anemometer, 'id'>) => { const newRef = push(ref(rtdb, 'anemometers')); set(newRef, { ...anemometer, id: newRef.key }); }, []);
  const updateAnemometer = useCallback((anemometer: Anemometer) => { const { id, ...data } = anemometer; update(ref(rtdb, `anemometers/${id}`), data); }, []);
  const deleteAnemometer = useCallback((anemometerId: string) => { remove(ref(rtdb, `anemometers/${anemometerId}`)); }, []);
  const addOtherEquipment = useCallback((equipment: Omit<OtherEquipment, 'id'>) => { const newRef = push(ref(rtdb, 'otherEquipments')); set(newRef, { ...equipment, id: newRef.key }); }, []);
  const updateOtherEquipment = useCallback((equipment: OtherEquipment) => { const { id, ...data } = equipment; update(ref(rtdb, `otherEquipments/${id}`), data); }, []);
  const deleteOtherEquipment = useCallback((equipmentId: string) => { remove(ref(rtdb, `otherEquipments/${equipmentId}`)); }, []);

  const addMachineLog = useCallback((log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'machineLogs'));
    const newLog = { ...log, id: newRef.key, machineId: machineId, loggedByUserId: user.id };
    set(newRef, newLog);
  }, [user]);

  const deleteMachineLog = useCallback((logId: string) => {
    remove(ref(rtdb, `machineLogs/${logId}`));
  }, []);
  
  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    update(ref(rtdb, 'branding'), { appName: name, appLogo: logo });
  }, []);
  
  const addAnnouncement = useCallback((data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'announcements'));
    
    const approver = users.find(u => u.id === user.supervisorId);
    if (!approver) {
      toast({ variant: 'destructive', title: 'Could not submit', description: 'No supervisor found to approve your announcement.' });
      return;
    }
    
    const newAnnouncement: Omit<Announcement, 'id'> = {
        title: data.title!,
        content: data.content!,
        creatorId: user.id,
        approverId: approver.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        comments: [],
        notifyAll: data.notifyAll || false,
    };
    set(newRef, newAnnouncement);
  }, [user, users, toast]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    const { id, ...data } = announcement;
    update(ref(rtdb, `announcements/${id}`), data);
  }, []);

  const approveAnnouncement = useCallback((announcementId: string) => {
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'approved' });
  }, []);

  const rejectAnnouncement = useCallback((announcementId: string) => {
    remove(ref(rtdb, `announcements/${announcementId}`));
  }, []);
  
  const deleteAnnouncement = useCallback((announcementId: string) => {
    remove(ref(rtdb, `announcements/${announcementId}`));
  }, []);

  const returnAnnouncement = useCallback((announcementId: string, comment: string) => {
    if(!user) return;
    const newCommentRef = push(ref(rtdb, `announcements/${announcementId}/comments`));
    const newComment = { userId: user.id, text: comment, date: new Date().toISOString() };
    update(ref(rtdb), {
        [`announcements/${announcementId}/status`]: 'returned',
        [`announcements/${announcementId}/comments/${newCommentRef.key}`]: newComment
    });
  }, [user]);

  const dismissAnnouncement = useCallback((announcementId: string) => {
    if (!user) return;
    const currentDismissedBy = announcements.find(a => a.id === announcementId)?.dismissedBy || [];
    const newDismissedBy = [...currentDismissedBy, user.id];
    update(ref(rtdb, `announcements/${announcementId}`), { dismissedBy: newDismissedBy });
  }, [user, announcements]);

  const dismissBroadcast = useCallback((broadcastId: string) => {
    if (!user) return;
    const currentDismissedBy = broadcasts.find(b => b.id === broadcastId)?.dismissedBy || [];
    const newDismissedBy = [...currentDismissedBy, user.id];
    update(ref(rtdb, `broadcasts/${broadcastId}`), { dismissedBy: newDismissedBy });
  }, [user, broadcasts]);
  
  const addBroadcast = useCallback((broadcastData: Omit<Broadcast, 'id'|'creatorId'|'createdAt'|'dismissedBy'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'broadcasts'));
    const newBroadcast = {
      ...broadcastData,
      id: newRef.key,
      creatorId: user.id,
      createdAt: new Date().toISOString(),
      dismissedBy: [],
    };
    set(newRef, newBroadcast);

    if (broadcastData.emailTarget !== 'none') {
        let recipientEmails: string[] = [];
        if (broadcastData.emailTarget === 'roles' && broadcastData.recipientRoles) {
            recipientEmails = users
                .filter(u => u.email && broadcastData.recipientRoles!.includes(u.role))
                .map(u => u.email!);
        } else if (broadcastData.emailTarget === 'individuals' && broadcastData.recipientUserIds) {
            recipientEmails = users
                .filter(u => u.email && broadcastData.recipientUserIds!.includes(u.id))
                .map(u => u.email!);
        }

        recipientEmails.forEach(email => {
            createAndSendNotification(
                email,
                'New Company Broadcast',
                'New Broadcast Message',
                { 'Message': broadcastData.message },
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
            );
        });
    }
  }, [user, users]);
  
  const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    set(newRef, { id: newRef.key, buildingNumber, rooms: [] });
  }, []);

  const updateBuilding = useCallback((building: Building) => {
    const { id, ...data } = building;
    update(ref(rtdb, `buildings/${id}`), data);
  }, []);

  const deleteBuilding = useCallback((buildingId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}`));
  }, []);

  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    const newRoomRef = push(ref(rtdb, `buildings/${buildingId}/rooms`));
    const beds: Bed[] = [];
    for (let i = 1; i <= roomData.numberOfBeds; i++) {
        beds.push({ id: `${newRoomRef.key}-bed-${i}`, bedNumber: i.toString(), bedType: 'Bunk' });
    }
    set(newRoomRef, { id: newRoomRef.key, roomNumber: roomData.roomNumber, beds });
  }, []);
  
  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}`));
  }, []);

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    const bedPath = `buildings/${buildingId}/rooms/${roomId}/beds`;
    get(ref(rtdb, bedPath)).then(snapshot => {
      const beds = snapshot.val();
      const bedIndex = beds.findIndex((b: Bed) => b && b.id === bedId);
      if (bedIndex !== -1) {
        update(ref(rtdb, `${bedPath}/${bedIndex}`), { occupantId });
      }
    });
  }, []);

  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    const bedPath = `buildings/${buildingId}/rooms/${roomId}/beds`;
    get(ref(rtdb, bedPath)).then(snapshot => {
      const beds = snapshot.val();
      const bedIndex = beds.findIndex((b: Bed) => b && b.id === bedId);
      if (bedIndex !== -1) {
        remove(ref(rtdb, `${bedPath}/${bedIndex}/occupantId`));
      }
    });
  }, []);
  
  const saveJobSchedule = useCallback((schedule: JobSchedule) => {
      const { id, ...data } = schedule;
      set(ref(rtdb, `jobSchedules/${id}`), data);
  }, []);
  
  const lockJobSchedule = useCallback((date: string) => {
    const schedulesForDate = jobSchedules.filter(s => s.date === date);
    const updates: { [key: string]: any } = {};
    schedulesForDate.forEach(s => {
        updates[`/jobSchedules/${s.id}/isLocked`] = true;
    });
    update(ref(rtdb), updates);
  }, [jobSchedules]);

  const unlockJobSchedule = useCallback((date: string, projectId: string) => {
    const scheduleId = `${projectId}_${date}`;
    update(ref(rtdb, `jobSchedules/${scheduleId}`), { isLocked: false });
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
  
  const addJobRecordPlant = useCallback((plantName: string) => {
    const newRef = push(ref(rtdb, 'jobRecordPlants'));
    set(newRef, { name: plantName, id: newRef.key });
  }, []);

  const deleteJobRecordPlant = useCallback((plantId: string) => {
    remove(ref(rtdb, `jobRecordPlants/${plantId}`));
  }, []);
  
  const saveJobRecord = useCallback((monthKey: string, employeeId: string, day: number | null, codeOrValue: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'dailyComments' | 'sundayDuty') => {
    let path;
    switch(type) {
      case 'status':
        path = `jobRecords/${monthKey}/records/${employeeId}/days/${day}`;
        break;
      case 'plant':
        path = `jobRecords/${monthKey}/records/${employeeId}/plant`;
        break;
      case 'dailyOvertime':
        path = `jobRecords/${monthKey}/records/${employeeId}/dailyOvertime/${day}`;
        break;
      case 'dailyComments':
        path = `jobRecords/${monthKey}/records/${employeeId}/dailyComments/${day}`;
        break;
      case 'sundayDuty':
        path = `jobRecords/${monthKey}/records/${employeeId}/additionalSundayDuty`;
        break;
      default:
        return;
    }
    set(ref(rtdb, path), codeOrValue);
  }, []);

  const savePlantOrder = useCallback((monthKey: string, plantName: string, orderedIds: string[]) => {
    set(ref(rtdb, `jobRecords/${monthKey}/plantsOrder/${plantName}`), orderedIds);
  }, []);
  
  const lockJobRecordSheet = useCallback((monthKey: string) => {
    update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: true });
  }, []);

  const unlockJobRecordSheet = useCallback((monthKey: string) => {
    update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: false });
  }, []);
  
  const addVendor = useCallback((vendor: Omit<Vendor, 'id'>) => {
    const newRef = push(ref(rtdb, 'vendors'));
    set(newRef, { ...vendor, id: newRef.key });
  }, []);
  
  const updateVendor = useCallback((vendor: Vendor) => {
    const { id, ...data } = vendor;
    update(ref(rtdb, `vendors/${id}`), data);
  }, []);

  const deleteVendor = useCallback((vendorId: string) => {
    remove(ref(rtdb, `vendors/${vendorId}`));
  }, []);

  const addPayment = useCallback((paymentData: Omit<Payment, 'id'|'requesterId'|'status'|'approverId'|'date'|'comments'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'payments'));
    const newPayment: Omit<Payment, 'id'> = {
      ...paymentData,
      requesterId: user.id,
      date: new Date().toISOString(),
      status: 'Pending',
      comments: [],
    };
    set(newRef, newPayment);
  }, [user]);

  const updatePayment = useCallback((payment: Payment) => {
    const { id, ...data } = payment;
    update(ref(rtdb, `payments/${id}`), data);
  }, []);

  const updatePaymentStatus = useCallback((paymentId: string, status: PaymentStatus, comment: string) => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    updates[`payments/${paymentId}/status`] = status;
    updates[`payments/${paymentId}/approverId`] = user.id;

    const newCommentRef = push(ref(rtdb, `payments/${paymentId}/comments`));
    const newComment: Omit<Comment, 'id'> = {
        userId: user.id,
        text: comment,
        date: new Date().toISOString()
    };
    updates[`payments/${paymentId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
  }, [user]);

  const deletePayment = useCallback((paymentId: string) => {
    remove(ref(rtdb, `payments/${paymentId}`));
  }, []);
  
  const addPurchaseRegister = useCallback((purchase: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'purchaseRegisters'));
    const newPurchase: Omit<PurchaseRegister, 'id'> = {
        ...purchase,
        creatorId: user.id,
        date: new Date().toISOString(),
    };
    set(newRef, newPurchase);
    
    // Also create a payment record
    addPayment({
        vendorId: purchase.vendorId,
        amount: purchase.grandTotal,
        durationFrom: purchase.invoiceDate?.toISOString(),
        durationTo: purchase.invoiceDate?.toISOString(),
        remarks: `For Purchase Register: ${newRef.key}`,
        purchaseRegisterId: newRef.key,
    });
  }, [user, addPayment]);

  const updatePurchaseRegister = useCallback((purchase: PurchaseRegister) => {
      const { id, ...data } = purchase;
      update(ref(rtdb, `purchaseRegisters/${id}`), data);
  }, []);
  
  const updatePurchaseRegisterPoNumber = useCallback((purchaseRegisterId: string, poNumber: string) => {
    update(ref(rtdb, `purchaseRegisters/${purchaseRegisterId}`), { poNumber });
  }, []);

  const deletePurchaseRegister = useCallback((id: string) => {
    remove(ref(rtdb, `purchaseRegisters/${id}`));
    // Also delete the associated payment
    const payment = payments.find(p => p.purchaseRegisterId === id);
    if(payment) {
        remove(ref(rtdb, `payments/${payment.id}`));
    }
  }, [payments]);

  const addIgpOgpRecord = useCallback((record: Omit<IgpOgpRecord, 'id'|'creatorId'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'igpOgpRecords'));
    set(newRef, { ...record, id: newRef.key, creatorId: user.id });
  }, [user]);
  
  const addFeedback = useCallback((subject: string, message: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'feedback'));
    set(newRef, { id: newRef.key, userId: user.id, subject, message, date: new Date().toISOString(), status: 'New', viewedBy: { [user.id]: true } });
  }, [user]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
  }, []);

  const markFeedbackAsViewed = useCallback(() => {
    if (!user) return;
    const updates: { [key: string]: boolean } = {};
    feedback.forEach(f => {
        if (!f.viewedBy?.[user.id]) {
            updates[`feedback/${f.id}/viewedBy/${user.id}`] = true;
        }
    });
    if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
    }
  }, [user, feedback]);
  
  const deleteTpCertList = useCallback((listId: string) => {
    remove(ref(rtdb, `tpCertLists/${listId}`));
  }, []);

  const addDocument = useCallback((data: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'downloadableDocuments'));
    set(newRef, {
      ...data,
      id: newRef.key,
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
    });
  }, [user]);

  const updateDocument = useCallback((doc: DownloadableDocument) => {
    const { id, ...data } = doc;
    update(ref(rtdb, `downloadableDocuments/${id}`), data);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    remove(ref(rtdb, `downloadableDocuments/${docId}`));
  }, []);
  
  const addLogbookRequest = useCallback((manpowerId: string, remarks?: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'logbookRequests'));
    const newRequest: Omit<LogbookRequest, 'id'> = {
      manpowerId,
      requesterId: user.id,
      requestDate: new Date().toISOString(),
      status: 'Pending',
      remarks: remarks || '',
      viewedBy: { [user.id]: true },
    };
    set(newRef, newRequest);
  }, [user]);

  const updateLogbookRequestStatus = useCallback((requestId: string, status: 'Completed' | 'Rejected', comment: string) => {
    if (!user) return;
    const request = logbookRequests.find(r => r.id === requestId);
    if (!request) return;
    addLogbookRequestComment(requestId, `${status}: ${comment}`);
    update(ref(rtdb, `logbookRequests/${requestId}`), { status });
    
    if (status === 'Completed') {
      const profile = manpowerProfiles.find(p => p.id === request.manpowerId);
      if (profile) {
        const logbook: LogbookRecord = {
          status: 'Sent back as requested',
          outDate: new Date().toISOString(),
          remarks: `Sent to ${users.find(u => u.id === request.requesterId)?.name || 'requester'} as per request.`
        };
        updateManpowerProfile({ ...profile, logbook });
      }
    }
  }, [user, logbookRequests, manpowerProfiles, addLogbookRequestComment, updateManpowerProfile]);

  const addLogbookRequestComment = useCallback((requestId: string, text: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `logbookRequests/${requestId}/comments`));
    set(newCommentRef, { id: newCommentRef.key, userId: user.id, text, date: new Date().toISOString() });

    const request = logbookRequests.find(r => r.id === requestId);
    if (request) {
      // Find the "other party" to notify
      const otherPartyId = user.id === request.requesterId ? (request.approverId || users.find(u => u.role === 'Document Controller')?.id) : request.requesterId;
      if (otherPartyId) {
        update(ref(rtdb, `logbookRequests/${requestId}/viewedBy`), { [otherPartyId]: false });
      }
    }
  }, [user, logbookRequests, users]);

  const deleteLogbookRecord = useCallback((manpowerId: string, onComplete: () => void) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/logbook`)).then(onComplete);
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

    if(user) addActivityLog(user.id, "Inspection Checklist Created", `For item ID: ${checklist.itemId}`);
  }, [user, addActivityLog]);

  const updateInspectionChecklist = useCallback((checklist: InspectionChecklist) => {
    const { id, ...data } = checklist;
    update(ref(rtdb, `inspectionChecklists/${id}`), data);
  }, []);
  
  const deleteInspectionChecklist = useCallback((id: string) => {
    remove(ref(rtdb, `inspectionChecklists/${id}`));
  }, []);

  const {
    myFulfilledStoreCertRequestCount,
    myFulfilledEquipmentCertRequests,
    pendingStoreCertRequestCount,
    pendingEquipmentCertRequestCount,
    plannerNotificationCount,
    pendingInternalRequestCount,
    updatedInternalRequestCount,
    pendingManagementRequestCount,
    updatedManagementRequestCount,
    incidentNotificationCount,
    pendingPpeRequestCount,
    updatedPpeRequestCount,
    pendingPaymentApprovalCount,
    pendingPasswordResetRequestCount,
    pendingFeedbackCount,
    pendingUnlockRequestCount,
    workingManpowerCount,
    onLeaveManpowerCount,
    pendingInventoryTransferRequestCount,
    allCompletedTransferRequests,
    pendingLogbookRequestCount
  } = useMemo(() => {
    if (!user) return {
      myFulfilledStoreCertRequestCount: 0,
      myFulfilledEquipmentCertRequests: [],
      pendingStoreCertRequestCount: 0,
      pendingEquipmentCertRequestCount: 0,
      plannerNotificationCount: 0,
      pendingInternalRequestCount: 0,
      updatedInternalRequestCount: 0,
      pendingManagementRequestCount: 0,
      updatedManagementRequestCount: 0,
      incidentNotificationCount: 0,
      pendingPpeRequestCount: 0,
      updatedPpeRequestCount: 0,
      pendingPaymentApprovalCount: 0,
      pendingPasswordResetRequestCount: 0,
      pendingFeedbackCount: 0,
      pendingUnlockRequestCount: 0,
      workingManpowerCount: 0,
      onLeaveManpowerCount: 0,
      pendingInventoryTransferRequestCount: 0,
      allCompletedTransferRequests: [],
      pendingLogbookRequestCount: 0
    };

    const myFulfilledStoreCertRequestCount = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;

    const unreadCommentsForUser = dailyPlannerComments.filter(dayComment => {
      if (!dayComment || !dayComment.day || !dayComment.comments) return false;
      const eventIdsInComments = new Set(Object.values(dayComment.comments).map(c => c?.eventId).filter(Boolean));
      for (const eventId of eventIdsInComments) {
        const event = plannerEvents.find(e => e.id === eventId);
        if (!event) continue;
        const isParticipant = event.userId === user.id || event.creatorId === user.id;
        if (!isParticipant) continue;
        const hasUnread = Object.values(dayComment.comments).some(c =>
          c && c.eventId === eventId && c.userId !== user.id && !c.viewedBy?.[user.id]
        );
        if (hasUnread) return true;
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

    const canApproveTransfers = can.approve_store_requests;
    const pendingInventoryTransferRequestCount = canApproveTransfers ? inventoryTransferRequests.filter(r => r.status === 'Pending' || r.status === 'Disputed').length : 0;
    const allCompletedTransferRequests = (can.approve_store_requests && inventoryTransferRequests) ? inventoryTransferRequests.filter(r => r.status === 'Completed' || r.status === 'Rejected') : [];
    
    const pendingLogbookRequestCount = can.manage_logbook ? logbookRequests.filter(r => r.status === 'Pending').length : 0;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaysLogs = manpowerLogs.filter(log => log.date === todayStr);
    const { workingManpowerCount, onLeaveManpowerCount } = todaysLogs.reduce((acc, log) => {
        acc.workingManpowerCount += (log.total || 0);
        acc.onLeaveManpowerCount += (log.countOnLeave || 0);
        return acc;
    }, { workingManpowerCount: 0, onLeaveManpowerCount: 0 });

    return {
      pendingTaskApprovalCount: tasks.filter(t => t.creatorId === user.id && t.statusRequest?.status === 'Pending').length,
      myNewTaskCount: tasks.filter(t => t.assigneeIds?.includes(user.id) && !t.viewedBy?.[user.id]).length,
      myPendingTaskRequestCount: tasks.filter(t => (t.statusRequest?.requestedBy === user.id && t.statusRequest?.status === 'Pending') || (t.approvalState === 'returned' && t.assigneeIds?.includes(user.id))).length,
      myFulfilledStoreCertRequestCount,
      myFulfilledEquipmentCertRequests,
      pendingStoreCertRequestCount,
      pendingEquipmentCertRequestCount,
      plannerNotificationCount,
      pendingInternalRequestCount,
      updatedInternalRequestCount,
      pendingManagementRequestCount,
      updatedManagementRequestCount,
      incidentNotificationCount,
      pendingPpeRequestCount,
      updatedPpeRequestCount,
      pendingPaymentApprovalCount,
      pendingPasswordResetRequestCount,
      pendingFeedbackCount,
      pendingUnlockRequestCount,
      workingManpowerCount,
      onLeaveManpowerCount,
      pendingInventoryTransferRequestCount,
      allCompletedTransferRequests,
      pendingLogbookRequestCount
    };
  }, [can, user, tasks, certificateRequests, dailyPlannerComments, plannerEvents, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, unlockRequests, inventoryTransferRequests, logbookRequests, manpowerLogs]);
  
  // All other function definitions exist here...
  // ... including login, logout, etc.

  // SECTION: Context Value
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markSinglePlannerCommentAsRead, dismissPendingUpdate, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestItem, resolveInternalRequestDispute, updateInternalRequestStatus, updateInternalRequestItemStatus, addInternalRequestComment, deleteInternalRequest, forceDeleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissBroadcast, addBroadcast, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegister, updatePurchaseRegisterPoNumber, deletePurchaseRegister, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, addTpCertList, updateTpCertList, deleteTpCertList, addDocument, updateDocument, deleteDocument, addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, deleteLogbookRecord, addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
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

  

    

    
