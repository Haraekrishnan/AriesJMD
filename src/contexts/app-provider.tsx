

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
  const can = useMemo(() => {
    const permissions = new Set<Permission>();
    if (user && !loading && roles.length > 0) {
        const userRole = roles.find(r => r.name === user.role);
        if (userRole && userRole.permissions) {
            userRole.permissions.forEach(p => permissions.add(p));
        }
    }
    const canObject: PermissionsObject = {} as any;
    for (const p of ALL_PERMISSIONS) canObject[p] = permissions.has(p);
    return canObject;
  }, [user, roles, loading]);

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
  
  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'inventoryItems'));
    const dataToSave = { 
      ...itemData, 
      lastUpdated: new Date().toISOString(),
      movedToProjectId: itemData.movedToProjectId || null,
    };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'Inventory Item Added', `${itemData.name} (SN: ${itemData.serialNumber})`);
  }, [user, addActivityLog]);
  
  const addTpCertList = useCallback((listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'tpCertLists'));
    const newList: Omit<TpCertList, 'id'> = {
      ...listData,
      creatorId: user.id,
      createdAt: new Date().toISOString(),
    };
    set(newRef, newList);
    addActivityLog(user.id, 'TP Certification List Saved', `List Name: ${listData.name}`);
  }, [user, addActivityLog]);

  const updateTpCertList = useCallback((listData: TpCertList) => {
    const { id, ...data } = listData;
    const sanitizedData = {
      ...data,
      items: data.items.map(item => ({
        ...item,
        chestCrollNo: item.chestCrollNo === undefined ? null : item.chestCrollNo,
      })),
    };
    update(ref(rtdb, `tpCertLists/${id}`), sanitizedData);
  }, []);
  
  const addInventoryTransferRequest = useCallback((requestData: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'inventoryTransferRequests'));
    const newRequest: Omit<InventoryTransferRequest, 'id'> = {
      ...requestData,
      requesterId: user.id,
      requestDate: new Date().toISOString(),
      status: 'Pending',
    };
    set(newRef, newRequest);
    addActivityLog(user.id, 'Inventory Transfer Request Created');

    const approvers = users.filter(u => roles.find(r => r.name === u.role)?.permissions.includes('approve_store_requests'));
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

  }, [user, addActivityLog, users, roles, projects]);

  const approveInventoryTransferRequest = useCallback((request: InventoryTransferRequest, createTpList: boolean) => {
    if (!user) return;
  
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${request.id}/status`] = 'Approved';
    updates[`inventoryTransferRequests/${request.id}/approverId`] = user.id;
    updates[`inventoryTransferRequests/${request.id}/approvalDate`] = new Date().toISOString();
  
    if (createTpList && (request.reason === 'For TP certification' || request.reason === 'Expired materials')) {
      const newListData = {
        name: `${request.reason === 'Expired materials' ? 'Expired' : 'TP'} - ${format(new Date(), 'dd-MM-yyyy')}`,
        date: new Date().toISOString().split('T')[0],
        items: request.items.map(item => ({
          materialName: item.name,
          manufacturerSrNo: item.serialNumber,
          itemId: item.itemId,
          itemType: item.itemType,
          chestCrollNo: 'chestCrollNo' in item ? item.chestCrollNo : undefined,
        })),
      };
      addTpCertList(newListData);
    }
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Approved', `Request ID: ${request.id}`);

    const requester = users.find(u => u.id === request.requesterId);
    const destSupervisor = users.find(u => u.projectId === request.toProjectId && u.role === 'Supervisor');

    const recipients = new Set<User>();
    if (requester) recipients.add(requester);
    if (destSupervisor) recipients.add(destSupervisor);

    const fromProjectName = projects.find(p => p.id === request.fromProjectId)?.name;
    const toProjectName = projects.find(p => p.id === request.toProjectId)?.name;
    
    recipients.forEach(recipient => {
        if(recipient.email) {
            createAndSendNotification(
                recipient.email,
                `Inventory Transfer Approved: #${request.id.slice(-6)}`,
                'Inventory Transfer Approved',
                {
                    'Request ID': `#${request.id.slice(-6)}`,
                    'From': fromProjectName || 'Unknown',
                    'To': toProjectName || 'Unknown',
                    'Approved By': user.name,
                    'Info': 'The items are now in transit. Please acknowledge receipt at the destination.'
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
                'View Transfers'
            );
        }
    });

  }, [user, addActivityLog, addTpCertList, users, projects]);
  
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

  // All other function definitions exist here...
  
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

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaysLogs = manpowerLogs.filter(log => log.date === todayStr);
    
    const { workingManpowerCount, onLeaveManpowerCount } = todaysLogs.reduce((acc, log) => {
        acc.workingManpowerCount += (log.total || 0);
        acc.onLeaveManpowerCount += (log.countOnLeave || 0);
        return acc;
    }, { workingManpowerCount: 0, onLeaveManpowerCount: 0 });

    return {
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    };
  }, [can, user, tasks, certificateRequests, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, manpowerProfiles, unlockRequests, inventoryTransferRequests, logbookRequests, plannerEvents, manpowerLogs]);

  // SECTION: Context Value
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, addComment, addPlannerEventComment, addInternalRequestComment, addPpeRequestComment, addInventoryTransferRequest, addInspectionChecklist, addTpCertList,
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




    

    

