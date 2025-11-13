
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
    if(!user) return;
    const { id, ...data } = updatedTask;
    update(ref(rtdb, `tasks/${id}`), { ...data, lastUpdated: new Date().toISOString() });
    addActivityLog(user.id, 'Task Updated', data.title);
  }, [user, addActivityLog]);

  const deleteTask = useCallback((taskId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only admins can delete tasks.' });
      return;
    }
    const taskToDelete = tasks.find(t => t.id === taskId);
    if(taskToDelete) {
      remove(ref(rtdb, `tasks/${taskId}`));
      toast({ variant: 'destructive', title: 'Task Deleted', description: `Task "${taskToDelete.title}" has been deleted.` });
      addActivityLog(user.id, 'Task Deleted', taskToDelete.title);
    }
  }, [user, tasks, addActivityLog, toast]);

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;
  
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = newStatus;
  
    if (task.subtasks) {
        for (const assigneeId in task.subtasks) {
            updates[`tasks/${taskId}/subtasks/${assigneeId}/status`] = newStatus;
        }
    }
    update(ref(rtdb), updates);
  }, [user, tasksById]);
  
  const requestTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task) return;
  
    if (newStatus === 'In Progress') {
        const updates: Record<string, any> = {};
        updates[`tasks/${taskId}/status`] = 'In Progress';
        updates[`tasks/${taskId}/subtasks/${user.id}/status`] = 'In Progress';
        updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();
        await update(ref(rtdb), updates);
        addComment(taskId, comment || 'Started progress');
        toast({ title: 'Task status updated to In Progress' });
        return;
    }
  
    const approverId = task.creatorId; 
    if (!approverId) {
        toast({ variant: 'destructive', title: 'No approver set for this task.' });
        return;
    }
  
    const statusRequest = {
        requestedBy: user.id,
        newStatus,
        comment,
        attachment: attachment || null,
        date: new Date().toISOString(),
        status: 'Pending',
    };
  
    const updates: Record<string, any> = {};
    updates[`tasks/${taskId}/statusRequest`] = statusRequest;
    updates[`tasks/${taskId}/approvalState`] = 'status_pending';
    updates[`tasks/${taskId}/status`] = 'Pending Approval';
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();

    await update(ref(rtdb), updates);
  
    addActivityLog(user.id, 'Task Completion Requested', task.title);
    addComment(taskId, comment || 'Marked for completion approval');
  
    const approver = users.find(u => u.id === approverId);
    if (approver?.email) {
        createAndSendNotification(
            approver.email,
            `Approval Required: ${task.title}`,
            'A task has been marked as completed and awaits your approval.',
            {
                Task: task.title,
                RequestedBy: user.name,
                DueDate: format(new Date(task.dueDate), 'PPP'),
                Priority: task.priority,
                Comment: comment,
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
            'View Task'
        );
    }
    toast({ title: 'Completion request sent for approval' });
  }, [user, users, tasksById, addActivityLog, addComment, toast]);
  
  const approveTaskStatusChange = useCallback((taskId: string, comment: string) => {
    if (!user) return;
    const task = tasksById[taskId];
    if (!task || !task.statusRequest || task.statusRequest.status !== 'Pending') return;

    const { newStatus, requestedBy, attachment } = task.statusRequest;

    if (newStatus !== 'Done') {
        toast({ variant: 'destructive', title: 'Invalid Approval Action' });
        return;
    }

    const approvalComment = `Status change to '${newStatus}' approved by ${user.name}. ${comment ? 'Comment: ' + comment : ''}`;
    addComment(taskId, approvalComment);

    const updates: Record<string, any> = {};
    if (requestedBy) {
        updates[`tasks/${taskId}/subtasks/${requestedBy}/status`] = 'Done';
    }

    const currentSubtasks = task.subtasks || {};
    const provisional = { ...currentSubtasks, [requestedBy]: { ...(currentSubtasks[requestedBy] || {}), status: 'Done' } };
    const allDone = Object.values(provisional).every((st: any) => st.status === 'Done');

    if (allDone) {
        updates[`tasks/${taskId}/status`] = 'Done';
        updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
    } else {
        updates[`tasks/${taskId}/status`] = 'In Progress';
    }

    updates[`tasks/${taskId}/statusRequest`] = null;
    updates[`tasks/${taskId}/approvalState`] = 'none';
    if (attachment) updates[`tasks/${taskId}/attachment`] = attachment;

    update(ref(rtdb), updates);
    toast({ title: allDone ? 'Task Completed' : 'Subtask marked done, task still in progress' });
}, [user, tasksById, addComment, toast]);

  const submitTaskForApproval = useCallback((taskId: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;
    if (!task.approverId) return;

    update(ref(rtdb, `tasks/${taskId}`), { status: 'Pending Approval' });
    addActivityLog(user.id, 'Task Submitted for Approval', task.title);

    const approver = users.find(u => u.id === task.approverId);
    if (approver && approver.email) {
      createAndSendNotification(
        approver.email,
        `Task Approval Requested: ${task.title}`,
        'New task requires your approval!',
        {
          'Task': task.title,
          'Requested by': user.name,
          'Due Date': format(new Date(task.dueDate), 'PPP'),
          'Priority': task.priority,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
        'View Task'
      );
    }

  }, [user, users, tasksById, addActivityLog]);

  const approveTask = useCallback((taskId: string, comment: string = '') => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    let updatedComment = `Task approved by ${user.name}.`;
    if (comment.trim()) {
        updatedComment += ` Comment: ${comment}`;
    }

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: updatedComment, date: new Date().toISOString() };
    set(newCommentRef, newComment);

    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = 'In Progress';
    updates[`tasks/${taskId}/approvalState`] = 'approved';
    updates[`tasks/${taskId}/viewedByApprover`] = true;
    updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Task Approved', task.title);

    const assignee = users.find(u => u.id === task.assigneeId);
    if (assignee && assignee.email) {
      createAndSendNotification(
        assignee.email,
        `Task Approved: ${task.title}`,
        'Your task has been approved!',
        {
          'Task': task.title,
          'Approved by': user.name,
          'Due Date': format(new Date(task.dueDate), 'PPP'),
          'Priority': task.priority,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
        'View Task'
      );
    }

  }, [user, users, tasksById, addActivityLog]);

  const returnTask = useCallback((taskId: string, comment: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);
    
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = 'To Do';
    updates[`tasks/${taskId}/approvalState`] = 'returned';
    updates[`tasks/${taskId}/viewedByApprover`] = true;
    updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Task Returned', task.title);

    const assignee = users.find(u => u.id === task.assigneeId);
    if (assignee && assignee.email) {
      createAndSendNotification(
        assignee.email,
        `Task Returned: ${task.title}`,
        'Your task has been returned for changes!',
        {
          'Task': task.title,
          'Returned by': user.name,
          'Due Date': format(new Date(task.dueDate), 'PPP'),
          'Priority': task.priority,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
        'View Task'
      );
    }

  }, [user, users, tasksById, addActivityLog]);
  
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
    if(!user) return;
    update(ref(rtdb, `tasks/${taskId}`), { [`viewedBy/${user.id}`]: true });
  }, [user]);

  const acknowledgeReturnedTask = useCallback((taskId: string) => {
    update(ref(rtdb, `tasks/${taskId}`), { approvalState: 'none' });
  }, []);
  
  const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, comment: string) => {
    if(!user) return;
    const task = tasksById[taskId];
    if(!task) return;
    
    let updatedComment = `Task reassignment requested by ${user.name} to ${users.find(u => u.id === newAssigneeId)?.name}.`;
    if (comment.trim()) {
        updatedComment += ` Comment: ${comment}`;
    }

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: updatedComment, date: new Date().toISOString() };
    set(newCommentRef, newComment);
    
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = 'To Do';
    updates[`tasks/${taskId}/approvalState`] = 'none';
    updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    // Migrate existing subtask
    const subtasks = task.subtasks ? (Array.isArray(task.subtasks) ? task.subtasks : Object.values(task.subtasks)) : [];
    if (subtasks.length > 0) {
      subtasks.forEach(st => {
        updates[`tasks/${taskId}/subtasks/${st.userId}`] = null;
      });
    }
    updates[`tasks/${taskId}/subtasks/${newAssigneeId}`] = { userId: newAssigneeId, status: 'To Do' };
    
    updates[`tasks/${taskId}/assigneeId`] = newAssigneeId;
    updates[`tasks/${taskId}/participants`] = [...task.participants, newAssigneeId];
    update(ref(rtdb), updates);

    addActivityLog(user.id, 'Task Reassigned', task.title);

    const assignee = users.find(u => u.id === newAssigneeId);
    if (assignee && assignee.email) {
      createAndSendNotification(
        assignee.email,
        `Task Reassigned to you: ${task.title}`,
        'A task has been reassigned to you!',
        {
          'Task': task.title,
          'Reassigned by': user.name,
          'Due Date': format(new Date(task.dueDate), 'PPP'),
          'Priority': task.priority,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
        'View Task'
      );
    }

  }, [user, users, tasksById, addActivityLog]);

  const getExpandedPlannerEvents = useCallback((month: Date, userId: string) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDaysInMonth = eachDayOfInterval({ start, end });
  
    const userEvents = plannerEvents.filter(e => e.userId === userId && e.date);
    const expandedEvents: (PlannerEvent & { eventDate: Date })[] = [];
  
    allDaysInMonth.forEach(day => {
      userEvents.forEach(event => {
        const eventStartDate = parseISO(event.date);
        
        if (isAfter(day, eventStartDate) || isSameDay(day, eventStartDate)) {
          let shouldAdd = false;
          switch (event.frequency) {
            case 'once':
              if (isSameDay(day, eventStartDate)) shouldAdd = true;
              break;
            case 'daily':
              shouldAdd = true;
              break;
            case 'daily-except-sundays':
              if (!isSunday(day)) shouldAdd = true;
              break;
            case 'weekly':
              if (getDay(day) === getDay(eventStartDate)) shouldAdd = true;
              break;
            case 'weekends':
              if (isSaturday(day) || isSunday(day)) shouldAdd = true;
              break;
            case 'monthly':
              if (getDate(day) === getDate(eventStartDate)) shouldAdd = true;
              break;
          }
          if (shouldAdd) {
            expandedEvents.push({ ...event, eventDate: day });
          }
        }
      });
    });
  
    return expandedEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }, [plannerEvents]);

  const addPlannerEvent = useCallback((event: Omit<PlannerEvent, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'plannerEvents'));
    const newEvent: Omit<PlannerEvent, 'id'> = {
        ...event,
        creatorId: user.id,
    };
    set(newRef, newEvent);
    addActivityLog(user.id, 'Planner Event Added', event.title);
  
    const notifyUser = users.find(u => u.id === event.userId);
    if (notifyUser && notifyUser.email && event.creatorId !== event.userId) {
      createAndSendNotification(
        notifyUser.email,
        `New Planner Event: ${event.title}`,
        `You have a new planner event from ${user.name}!`,
        {
          'Event': event.title,
          'Date': format(parseISO(event.date), 'PPP'),
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/schedule`,
        'View Planner'
      );
    }
  
  }, [user, users, addActivityLog]);

  const updatePlannerEvent = useCallback((event: PlannerEvent) => {
    if(!user) return;
    const { id, ...data } = event;
    update(ref(rtdb, `plannerEvents/${id}`), data );
    addActivityLog(user.id, 'Planner Event Updated', data.title);
  }, [user, addActivityLog]);

  const deletePlannerEvent = useCallback((eventId: string) => {
    if(!user) return;
    const eventToDelete = plannerEvents.find(e => e.id === eventId);
    if(eventToDelete) {
        remove(ref(rtdb, `plannerEvents/${eventId}`));
        addActivityLog(user.id, 'Planner Event Deleted', eventToDelete.title);
    }
  }, [user, plannerEvents, addActivityLog]);

  const addPlannerEventComment = useCallback(async (plannerUserId: string, day: string, eventId: string, text: string) => {
    if (!user) return;
    
    const dayCommentId = `${day}_${plannerUserId}`;
    const dayCommentRef = ref(rtdb, `dailyPlannerComments/${dayCommentId}`);
    const dayCommentSnapshot = await get(dayCommentRef);
    const dayCommentData = dayCommentSnapshot.val();

    const newComment: Omit<Comment, 'id'> = {
        userId: user.id,
        text,
        date: new Date().toISOString(),
        eventId: eventId,
    };

    const newCommentRef = push(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments`));
    const newCommentWithId = { ...newComment, id: newCommentRef.key! };
    
    let updates: { [key: string]: any } = {};

    if (!dayCommentData) {
        // If the daily comment node doesn't exist, create it first.
        const newDayComment: DailyPlannerComment = {
            id: dayCommentId,
            plannerUserId,
            day,
            comments: { [newCommentRef.key!]: newCommentWithId },
            lastUpdated: new Date().toISOString(),
            viewedBy: { [user.id]: true },
        };
        await set(dayCommentRef, newDayComment);
    } else {
        // If it exists, just push the new comment.
        await set(newCommentRef, newCommentWithId);
        updates[`dailyPlannerComments/${dayCommentId}/lastUpdated`] = new Date().toISOString();
    }

    const event = plannerEvents.find(e => e.id === eventId);
    if(event) {
        const participants = new Set([event.creatorId, event.userId]);
        participants.forEach(pId => {
            if (pId !== user.id) {
                updates[`dailyPlannerComments/${dayCommentId}/viewedBy/${pId}`] = false;
                
                const participant = users.find(u => u.id === pId);
                if (participant?.email) {
                    createAndSendNotification(
                        participant.email,
                        `New comment on planner for ${format(parseISO(day), 'PPP')}`,
                        `New comment from ${user.name} on "${event.title}"`,
                        {
                            'Comment': text,
                        },
                        `${process.env.NEXT_PUBLIC_APP_URL}/schedule?userId=${plannerUserId}&date=${day}`,
                        'View Planner'
                    );
                }
            }
        });
    }
    
    if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
    }
}, [user, users, plannerEvents]);
  
  const markSinglePlannerCommentAsRead = useCallback((plannerUserId: string, day: string, commentId: string) => {
    if(!user) return;
    const dayCommentId = `${day}_${plannerUserId}`;
    update(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments/${commentId}/viewedBy`), { [user.id]: true });
  }, [user]);
  
  const dismissPendingUpdate = useCallback((eventId: string, day: string) => {
    if(!user) return;
    const updateKey = `${eventId}_${day}`;
    update(ref(rtdb, `users/${user.id}/dismissedPendingUpdates`), { [updateKey]: true });
  }, [user]);

  const awardManualAchievement = useCallback((achievement: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'achievements'));
    const newAchievement: Omit<Achievement, 'id'> = {
        ...achievement,
        type: 'manual',
        date: new Date().toISOString(),
        awardedById: user.id,
        status: 'approved',
    };
    set(newRef, newAchievement);
    addActivityLog(user.id, 'Manual Achievement Awarded', achievement.title);
  }, [user, addActivityLog]);

  const updateManualAchievement = useCallback((achievement: Achievement) => {
    const { id, ...data } = achievement;
    update(ref(rtdb, `achievements/${id}`), data);
  }, []);

  const deleteManualAchievement = useCallback((achievementId: string) => {
    remove(ref(rtdb, `achievements/${achievementId}`));
  }, []);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'users'));
    const newUser = { ...userData, avatar: `https://i.pravatar.cc/150?u=${newRef.key}` };
    set(newRef, newUser);
    addActivityLog(user.id, 'User Added', userData.name);
  }, [user, addActivityLog]);

  const updateUserPlanningScore = useCallback((userId: string, score: number) => {
    update(ref(rtdb, `users/${userId}`), { planningScore: score });
  }, []);

  const deleteUser = useCallback((userId: string) => {
    remove(ref(rtdb, `users/${userId}`));
  }, []);
  
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
    set(newRef, driver);
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
    const newIncident: Omit<IncidentReport, 'id'> = {
        ...incident,
        reporterId: user.id,
        reportTime: new Date().toISOString(),
        status: 'New',
        isPublished: false,
        comments: [],
        reportedToUserIds: [],
        viewedBy: { [user.id]: true },
        lastUpdated: new Date().toISOString(),
    };
    set(newRef, newIncident);
  }, [user, addActivityLog]);
  
  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
    if(!user) return;
    const { id, ...data } = incident;

    const newCommentRef = push(ref(rtdb, `incidentReports/${id}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);

    update(ref(rtdb, `incidentReports/${id}`), { ...data, lastUpdated: new Date().toISOString(), comments: [newComment] });
    addActivityLog(user.id, 'Incident Updated', incident.unitArea);

  }, [user, addActivityLog]);
  
  const publishIncident = useCallback((incidentId: string, comment: string) => {
    if(!user) return;
    const incident = incidentReportsById[incidentId];
    if(!incident) return;

    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);

    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/status`] = 'New';
    updates[`incidentReports/${incidentId}/isPublished`] = true;
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`incidentReports/${incidentId}/viewedBy/${user.id}`] = true; // mark viewed by publishing user

    const reporter = users.find(u => u.id === incident.reporterId);
    if(reporter && reporter.supervisorId) {
        updates[`incidentReports/${incidentId}/reportedToUserIds`] = [...incident.reportedToUserIds, reporter.supervisorId];
    }
    
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Incident Published', incident.unitArea);
    
    if(reporter && reporter.supervisorId) {
        const supervisor = users.find(u => u.id === reporter.supervisorId);
        if (supervisor && supervisor.email) {
            createAndSendNotification(
                supervisor.email,
                `New Incident Report: ${incident.unitArea}`,
                'Incident Report',
                {
                    'Reporter': reporter.name,
                    'Location': incident.unitArea,
                    'Details': incident.incidentDetails,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/incident-reports`,
                'View Incident'
            );
        }
    }

  }, [user, users, incidentReportsById, addActivityLog]);
  
  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    if(!user) return;
    const incident = incidentReportsById[incidentId];
    if(!incident) return;
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: text, date: new Date().toISOString() };
    set(newCommentRef, { ...newComment, id: newCommentRef.key });

    const updates: { [key: string]: any } = {};
    const participants = new Set([incident.reporterId, ...incident.reportedToUserIds]);
    participants.forEach(targetUserId => {
      if (targetUserId !== user.id) {
        updates[`incidentReports/${incidentId}/viewedBy/${targetUserId}`] = false;
      }
    });

    update(ref(rtdb), updates);
  }, [user, incidentReportsById]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    if(!user) return;
    const incident = incidentReportsById[incidentId];
    if(!incident) return;

    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);

    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/reportedToUserIds`] = userIds;
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    userIds.forEach(targetUserId => {
      updates[`incidentReports/${incidentId}/viewedBy/${targetUserId}`] = false;
      const targetUser = users.find(u => u.id === targetUserId);
      if (targetUser && targetUser.email) {
        createAndSendNotification(
          targetUser.email,
          `New Incident Report: ${incident.unitArea}`,
          'Incident Report',
          {
            'Reporter': users.find(u => u.id === incident.reporterId)?.name,
            'Location': incident.unitArea,
            'Details': incident.incidentDetails,
          },
          `${process.env.NEXT_PUBLIC_APP_URL}/incident-reports`,
          'View Incident'
        );
      }
    });
    update(ref(rtdb), updates);

  }, [user, users, incidentReportsById]);

  const markIncidentAsViewed = useCallback((incidentId: string) => {
    if(!user) return;
    update(ref(rtdb, `incidentReports/${incidentId}`), { [`viewedBy/${user.id}`]: true });
  }, [user]);

  const addManpowerLog = useCallback(async (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string }, logDate: Date = new Date()): Promise<void> => {
    if (!user) return;
    const logDateStr = format(logDate, 'yyyy-MM-dd');
    const existingLogRef = query(ref(rtdb, 'manpowerLogs'), orderByChild('date'), equalTo(logDateStr));
    const snapshot = await get(existingLogRef);
    
    if (snapshot.exists()) {
      const existingLogs = snapshot.val();
      for (const key in existingLogs) {
        const existingLog = existingLogs[key];
        if (existingLog.projectId === logData.projectId) {
          console.warn(`Manpower log already exists for project ${logData.projectId} on ${logDateStr}. Use updateManpowerLog instead.`);
          toast({ variant: "destructive", title: "Duplicate Log", description: `A log already exists for this project on this date. Please update the existing log.` });
          return;
        }
      }
    }

    const newLogRef = push(ref(rtdb, 'manpowerLogs'));
    const newLog: Omit<ManpowerLog, 'id'> = {
      date: logDateStr,
      ...logData,
      yesterdayCount: logData.countIn || 0,
      total: (logData.countIn || 0) - (logData.countOut || 0),
      updatedBy: user.id,
    } as any;

    set(newLogRef, newLog);
    addActivityLog(user.id, 'Manpower Log Added', `Project: ${projects.find(p => p.id === logData.projectId)?.name}, Date: ${logDateStr}`);

  }, [user, projects, addActivityLog, toast]);

  const updateManpowerLog = useCallback(async (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName'>>) => {
    if (!user) return;

    const log = manpowerLogs.find(l => l.id === logId);
    if (!log) {
      console.error(`Manpower log not found with id: ${logId}`);
      return;
    }

    const updates: Partial<ManpowerLog> = { ...data, updatedBy: user.id };
    
    if(data.countIn !== undefined || data.countOut !== undefined) {
        const newCountIn = data.countIn !== undefined ? data.countIn : log.countIn || 0;
        const newCountOut = data.countOut !== undefined ? data.countOut : log.countOut || 0;
        updates.total = newCountIn - newCountOut;
    }

    update(ref(rtdb, `manpowerLogs/${logId}`), updates);
    const project = projects.find(p => p.id === log.projectId)?.name;
    addActivityLog(user.id, 'Manpower Log Updated', `Project: ${project}, Date: ${log.date}`);
  }, [user, manpowerLogs, projects, addActivityLog]);
  
  const addManpowerProfile = useCallback(async (profile: Omit<ManpowerProfile, 'id'>): Promise<void> => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'manpowerProfiles'));
    const newProfile: Omit<ManpowerProfile, 'id'> = { ...profile };

    set(newRef, newProfile);
    addActivityLog(user.id, 'Manpower Profile Added', profile.name);
  }, [user, addActivityLog]);

  const addMultipleManpowerProfiles = useCallback((profilesData: any[]): number => {
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    profilesData.forEach(profileData => {
      const name = profileData['Name']?.trim();
      if (!name) return;
      
      const hardCopyFileNo = profileData['Hard Copy File No']?.toString().trim();
      const existingProfile = manpowerProfiles.find(p => p.hardCopyFileNo === hardCopyFileNo);

      const parseDateFromExcel = (excelDate: any): string | null => {
        if (!excelDate) return null;
        if (excelDate instanceof Date && isValid(excelDate)) {
            return excelDate.toISOString();
        }
        if (typeof excelDate === 'number') {
            const date = new Date(Date.UTC(1899, 11, 30 + excelDate));
            return isValid(date) ? date.toISOString() : null;
        }
        if (typeof excelDate === 'string') {
            const parsed = parseISO(excelDate);
            if (isValid(parsed)) return parsed.toISOString();
        }
        return null;
      };
        
        const projectName = profileData['EIC']?.trim();
        const project = projects.find(p => p.name === projectName);
      
        const mappedProfile: Partial<ManpowerProfile> = {
          name,
          hardCopyFileNo,
          mobileNumber: profileData['Mobile Number']?.toString(),
          gender: profileData['Gender'],
          workOrderNumber: profileData['Work Order Number'],
          labourLicenseNo: profileData['Labour License No'],
          eic: project ? project.id : '',
          workOrderExpiryDate: parseDateFromExcel(profileData['Work Order Expiry Date']),
          labourLicenseExpiryDate: parseDateFromExcel(profileData['Labour License Expiry Date']),
          joiningDate: parseDateFromExcel(profileData['Joining Date']),
          epNumber: profileData['EP Number']?.toString(),
          aadharNumber: profileData['Aadhar Number']?.toString(),
          dob: parseDateFromExcel(profileData['Date Of Birth']),
          uanNumber: profileData['UAN Number']?.toString(),
          wcPolicyNumber: profileData['WC Policy Number'],
          wcPolicyExpiryDate: parseDateFromExcel(profileData['WC Policy Expiry Date']),
          cardCategory: profileData['Card Category'],
          cardType: profileData['Card Type'],
      };
      
      const finalProfileData = { ...(existingProfile || {}), ...mappedProfile };
      const profileId = existingProfile ? existingProfile.id : push(ref(rtdb)).key;
      
      if(profileId) {
        updates[`manpowerProfiles/${profileId}`] = finalProfileData;
        importedCount++;
      }
    });

    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
      if (user) addActivityLog(user.id, 'Bulk Manpower Import', `Imported/updated ${importedCount} profiles.`);
    }
    
    return importedCount;
  }, [user, manpowerProfiles, projects, addActivityLog]);

  const updateManpowerProfile = useCallback(async (profile: ManpowerProfile): Promise<void> => {
    if (!user) return;
    const { id, ...data } = profile;

    await update(ref(rtdb, `manpowerProfiles/${id}`), data);
    addActivityLog(user.id, 'Manpower Profile Updated', profile.name);
  }, [user, addActivityLog]);
  
  const deleteManpowerProfile = useCallback((profileId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${profileId}`));
  }, []);

  const addLeaveForManpower = useCallback((manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => {
    if(!user) return;
    const updates: { [key: string]: any } = {};
    manpowerIds.forEach(manpowerId => {
      const leaveRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory`));
      const leaveData: Omit<LeaveRecord, 'id'> = {
        leaveType,
        leaveStartDate: startDate.toISOString(),
        plannedEndDate: endDate.toISOString(),
        remarks,
      };
      updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveRef.key}`] = { ...leaveData, id: leaveRef.key };
    });
    update(ref(rtdb), updates);
  }, [user]);

  const extendLeave = useCallback((manpowerId: string, leaveId: string, newEndDate: Date) => {
    if(!user) return;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), { plannedEndDate: newEndDate.toISOString() });
  }, [user]);

  const rejoinFromLeave = useCallback((manpowerId: string, leaveId: string, rejoinedDate: Date) => {
    if(!user) return;
    const updates: { [key: string]: any } = {};
    updates[`manpowerProfiles/${manpowerId}/status`] = 'Working';
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/rejoinedDate`] = rejoinedDate.toISOString();
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/leaveEndDate`] = rejoinedDate.toISOString();
    update(ref(rtdb), updates);
  }, [user]);

  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    if(!user) return;
    const updates: { [key: string]: any } = {};
    updates[`manpowerProfiles/${manpowerId}/status`] = 'On Leave';
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/leaveEndDate`] = null;
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/rejoinedDate`] = null;

    update(ref(rtdb), updates);
  }, [user]);

  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    if(!user) return;
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`));
  }, [user]);

  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => {
    const { id, ...data } = leaveRecord;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${id}`), data);
  }, []);

  const deleteLeaveRecord = useCallback((manpowerId: string, leaveId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`));
  }, []);

  const addMemoOrWarning = useCallback((manpowerId: string, memo: Omit<MemoRecord, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory`));
    const newRecordWithId: MemoRecord = {
      ...memo,
      id: newRef.key!,
      date: new Date().toISOString()
    };
    set(newRef, newRecordWithId);
  }, [user]);

  const updateMemoRecord = useCallback((manpowerId: string, memo: MemoRecord) => {
    const { id, ...data } = memo;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${id}`), data);
  }, []);

  const deleteMemoRecord = useCallback((manpowerId: string, memoId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${memoId}`));
  }, []);

  const addPpeHistoryRecord = useCallback((manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory`));
    const newRecordWithId: PpeHistoryRecord = { ...record, id: newRef.key! };
    set(newRef, newRecordWithId);
  }, [user]);

  const updatePpeHistoryRecord = useCallback((manpowerId: string, record: PpeHistoryRecord) => {
    const { id, ...data } = record;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${id}`), data);
  }, []);

  const deletePpeHistoryRecord = useCallback((manpowerId: string, recordId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${recordId}`));
  }, []);
  
  const addPpeHistoryFromExcel = useCallback(async (data: any[]): Promise<{ importedCount: number; notFoundCount: number; }> => {
    if (!user) return { importedCount: 0, notFoundCount: 0 };
    
    let importedCount = 0;
    let notFoundCount = 0;
    const updates: { [key: string]: any } = {};

    for (const row of data) {
        const employeeName = row['Employee Name']?.trim();
        const size = row['Size']?.toString().trim();
        const issueDateRaw = row['Date'];

        if (!employeeName || !size || !issueDateRaw) {
            console.warn('Skipping row due to missing data:', row);
            continue;
        }

        const profile = manpowerProfiles.find(p => p.name.toLowerCase() === employeeName.toLowerCase());

        if (!profile) {
            console.warn(`Employee not found: ${employeeName}`);
            notFoundCount++;
            continue;
        }

        let issueDate: Date;
        if (issueDateRaw instanceof Date && isValid(issueDateRaw)) {
            issueDate = issueDateRaw;
        } else {
            const parsed = parseISO(issueDateRaw)
            if (isValid(parsed)) {
                issueDate = parsed;
            } else {
                console.warn(`Skipping row due to invalid date format for ${employeeName}:`, issueDateRaw);
                continue;
            }
        }

        const newRecord: Omit<PpeHistoryRecord, 'id'> = {
            ppeType: 'Coverall',
            size: size,
            issueDate: issueDate.toISOString(),
            requestType: 'New', // Default for bulk import
            issuedById: user.id,
            remarks: 'Bulk imported from Excel.'
        };

        const newRef = push(ref(rtdb, `manpowerProfiles/${profile.id}/ppeHistory`));
        updates[`manpowerProfiles/${profile.id}/ppeHistory/${newRef.key}`] = { ...newRecord, id: newRef.key };
        importedCount++;
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
      addActivityLog(user.id, 'Bulk PPE Import', `Imported ${importedCount} coverall records.`);
    }
    
    return { importedCount, notFoundCount };
  }, [user, manpowerProfiles, addActivityLog]);
  
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

  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'internalRequests'));
    
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
        comments: [{ id: `comm-init`, text: 'Request Created', userId: user.id, date: new Date().toISOString() }],
        viewedByRequester: true,
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
    const itemsArray = Array.isArray(request.items) ? request.items : Object.values(request.items || {});
    const itemIndex = itemsArray.findIndex(i => i.id === item.id);
    if (itemIndex === -1) return;
    const updatedItems = [...itemsArray];
    updatedItems[itemIndex] = item;
    
    let comment = `Item updated by ${user.name}:`;
    if (originalItem.description !== item.description) comment += ` Description changed from "${originalItem.description}" to "${item.description}".`;
    if (originalItem.quantity !== item.quantity) comment += ` Quantity changed from ${originalItem.quantity} to ${item.quantity}.`;
    if (originalItem.unit !== item.unit) comment += ` Unit changed from "${originalItem.unit}" to ${item.unit}.`;
    
    addInternalRequestComment(requestId, comment);

    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/items`] = updatedItems;
    update(ref(rtdb), updates);

    toast({ title: 'Item Updated', description: 'The request item has been modified.' });
  }, [user, internalRequestsById, addInternalRequestComment, toast]);
  
  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;
  
    const requestItems = request.items ? (Array.isArray(request.items) ? request.items : Object.values(request.items)) : [];
    
    // Pre-flight check for "Issue All"
    if (status === 'Issued') {
        const itemsToIssue = requestItems.filter(item => item.status === 'Approved');
        for (const item of itemsToIssue) {
            const inventoryItem = inventoryItems.find(i => i.id === item.inventoryItemId || (i.category !== 'General' && i.name.toLowerCase() === item.description.toLowerCase()));
            if (inventoryItem && (inventoryItem.category === 'Daily Consumable' || inventoryItem.category === 'Job Consumable')) {
                const currentStock = inventoryItem.quantity || 0;
                if (currentStock < item.quantity) {
                    toast({
                        variant: 'destructive',
                        title: 'Insufficient Stock',
                        description: `Cannot issue ${item.quantity} of ${item.description}. Only ${currentStock} available. Issuance halted.`,
                    });
                    return; // Halt the entire operation
                }
            }
        }
    }
  
    let commentText = `Bulk action: Status for all items changed to ${status}.`;
    if (status === 'Disputed') {
      commentText = `Dispute raised: ${comment}`;
    } else if (status === 'Rejected' && comment.trim()) {
      commentText = `Request Rejected. Reason: ${comment}`;
    } else if (comment.trim()) {
      commentText += ` Comment: ${comment}`;
    }
  
    addInternalRequestComment(requestId, commentText);
  
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/approverId`] = user.id;
  
    let itemsChanged = false;
    const updatedItems = [...requestItems];
  
    if (status !== 'Disputed') {
      const applicableItems = requestItems.filter(item => {
        if (status === 'Approved' || status === 'Rejected') return item.status === 'Pending';
        if (status === 'Issued') return item.status === 'Approved';
        return false;
      });
      
      if(applicableItems.length === 0 && status !== 'Issued') {
          toast({ title: 'No items to update', description: `No items were in the required state to be changed to ${status}.`});
          return;
      }
  
      applicableItems.forEach((item) => {
        itemsChanged = true;
        const originalItemIndex = requestItems.findIndex(i => i.id === item.id);
        if (originalItemIndex !== -1) {
          updates[`internalRequests/${requestId}/items/${originalItemIndex}/status`] = status;
          updatedItems[originalItemIndex] = { ...updatedItems[originalItemIndex], status: status };
          
          if(status === 'Issued') {
            const inventoryItem = inventoryItems.find(i => i.id === item.inventoryItemId || (i.category !== 'General' && i.name.toLowerCase() === item.description.toLowerCase()));
            if (inventoryItem && (inventoryItem.category === 'Daily Consumable' || inventoryItem.category === 'Job Consumable')) {
              const currentStock = inventoryItem.quantity || 0;
              updates[`inventoryItems/${inventoryItem.id}/quantity`] = Math.max(0, currentStock - item.quantity);
            }
          }
        }
      });
    }
  
    let finalStatus = status;
    if (itemsChanged) {
      const allStatuses = new Set(updatedItems.map(item => item.status));
      
      if (updatedItems.every(i => i.status === 'Issued' || i.status === 'Rejected')) {
        finalStatus = 'Issued';
      } else if (updatedItems.every(i => i.status === 'Approved' || i.status === 'Rejected')) {
        finalStatus = 'Approved';
      } else if (allStatuses.has('Issued')) {
        finalStatus = 'Partially Issued';
      } else if (allStatuses.has('Approved')) {
        finalStatus = 'Partially Approved';
      } else if (updatedItems.every(i => i.status === 'Pending')) {
        finalStatus = 'Pending';
      } else if (updatedItems.some(i => i.status === 'Approved' || i.status === 'Issued')) {
        finalStatus = 'Partially Approved';
      } else if (updatedItems.every(i => i.status === 'Rejected')) {
        finalStatus = 'Rejected';
      } else {
        finalStatus = 'Partially Approved'; // Fallback
      }
    }
    updates[`internalRequests/${requestId}/status`] = finalStatus;
  
    update(ref(rtdb), updates);
    toast({ title: `All applicable items updated to ${status}` });
    addActivityLog(user.id, 'Store Request Status Updated', `Request ID: ${requestId} to ${status}`);
  
    const requester = users.find(u => u.id === request.requesterId);
    if (requester && requester.email) {
      createAndSendNotification(
        requester.email,
        `Update on your Internal Store Request #${requestId.slice(-6)}`,
        `Your request status is now: ${finalStatus}`,
        { 'Request ID': `#${requestId.slice(-6)}`, 'Updated By': user.name, 'Comment': comment },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'View Request'
      );
    }
  }, [user, internalRequestsById, users, inventoryItems, addActivityLog, addInternalRequestComment, toast]);

  const updateInternalRequestItemStatus = useCallback((requestId: string, itemId: string, status: InternalRequestItemStatus, comment: string) => {
    if(!user) return;
    const request = internalRequestsById[requestId];
    if(!request) return;

    const requestItems = request.items ? (Array.isArray(request.items) ? request.items : Object.values(request.items)) : [];
    const itemIndex = requestItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    if (status === 'Issued' && requestItems[itemIndex].status !== 'Approved') {
        toast({
            variant: 'destructive',
            title: 'Action Not Allowed',
            description: 'Only approved items can be marked as issued.',
        });
        return;
    }
    
    // Stock Check before issuing
    if (status === 'Issued') {
        const itemToIssue = requestItems[itemIndex];
        const inventoryItem = inventoryItems.find(i => i.id === itemToIssue.inventoryItemId || (i.category !== 'General' && i.name.toLowerCase() === itemToIssue.description.toLowerCase()));

        if (inventoryItem && (inventoryItem.category === 'Daily Consumable' || inventoryItem.category === 'Job Consumable')) {
            const currentStock = inventoryItem.quantity || 0;
            if (currentStock < itemToIssue.quantity) {
                toast({
                    variant: 'destructive',
                    title: 'Insufficient Stock',
                    description: `Cannot issue ${itemToIssue.quantity} of ${itemToIssue.description}. Only ${currentStock} available.`,
                });
                return; 
            }
        }
    }


    addInternalRequestComment(requestId, `Item "${requestItems[itemIndex].description}" status changed to ${status}. Reason: ${comment}`);
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/items/${itemIndex}/status`] = status;

    // Deduct stock if issued
    if (status === 'Issued') {
        const itemToIssue = requestItems[itemIndex];
        const inventoryItem = inventoryItems.find(i => i.id === itemToIssue.inventoryItemId || (i.category !== 'General' && i.name.toLowerCase() === itemToIssue.description.toLowerCase()));
        if (inventoryItem && (inventoryItem.category === 'Daily Consumable' || inventoryItem.category === 'Job Consumable')) {
            updates[`inventoryItems/${inventoryItem.id}/quantity`] = Math.max(0, (inventoryItem.quantity || 0) - itemToIssue.quantity);
        }
    }
    
    const updatedItems = [...requestItems];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: status };
    
    const allStatuses = new Set(updatedItems.map(item => item.status));
    let newOverallStatus: InternalRequestStatus;

    if (updatedItems.every(i => i.status === 'Issued' || i.status === 'Rejected')) {
      newOverallStatus = 'Issued';
    } else if (updatedItems.every(i => i.status === 'Approved' || i.status === 'Rejected')) {
      newOverallStatus = 'Approved';
    } else if (allStatuses.has('Issued')) {
      newOverallStatus = 'Partially Issued';
    } else if (allStatuses.has('Approved')) {
      newOverallStatus = 'Partially Approved';
    } else if (updatedItems.every(i => i.status === 'Pending')) {
      newOverallStatus = 'Pending';
    } else if (updatedItems.some(i => i.status === 'Approved' || i.status === 'Issued')) {
      newOverallStatus = 'Partially Approved';
    } else if (updatedItems.every(i => i.status === 'Rejected')) {
      newOverallStatus = 'Rejected';
    } else {
      newOverallStatus = 'Partially Approved'; // Fallback
    }

    updates[`internalRequests/${requestId}/status`] = newOverallStatus;
    update(ref(rtdb), updates);

  }, [user, internalRequestsById, inventoryItems, addInternalRequestComment, toast]);
  
  const resolveInternalRequestDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = internalRequestsById[requestId];
    if (!request || request.status !== 'Disputed') return;
  
    const newStatus: InternalRequestStatus = resolution === 'reissue' ? 'Approved' : 'Issued';
    
    const actionComment = resolution === 'reissue'
      ? `Dispute accepted by ${user.name}. Items will be re-issued. Comment: ${comment}`
      : `Dispute reversed by ${user.name}. Items confirmed as issued. Comment: ${comment}`;
    
    updateInternalRequestStatus(requestId, newStatus, actionComment);
  
    const requester = users.find(u => u.id === request.requesterId);
    if(requester && requester.email) {
      createAndSendNotification(
        requester.email,
        `Request Dispute Resolved #${requestId.slice(-6)}`,
        'An issue you claimed has been resolved.',
        { 
          'Resolution': `The dispute was resolved by ${user.name}. The request has been moved to '${newStatus}'.`,
          'Comment': comment
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'View Request'
      );
    }
  }, [user, can.approve_store_requests, internalRequestsById, users, updateInternalRequestStatus]);
  
  const deleteInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const canDelete = user.role === 'Admin' || (request.requesterId === user.id && ['Pending', 'Rejected'].includes(request.status));
    
    if (canDelete) {
        remove(ref(rtdb, `internalRequests/${requestId}`));
        toast({ title: "Request Deleted" });
        addActivityLog(user.id, "Internal Request Deleted", `ID: ${requestId}`);
    } else {
        toast({ variant: 'destructive', title: "Permission Denied", description: "You cannot delete this request." });
    }
  }, [user, internalRequestsById, addActivityLog, toast]);

  const forceDeleteInternalRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({ variant: 'destructive', title: 'Permission Denied' });
      return;
    }
    remove(ref(rtdb, `internalRequests/${requestId}`))
      .then(() => {
        toast({ title: 'Request Force Deleted', description: `Request ${requestId} has been permanently removed.` });
        addActivityLog(user.id, "Force Deleted Internal Request", `ID: ${requestId}`);
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
      });
  }, [user, addActivityLog, toast]);
  
  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true });
  }, [user]);

  const acknowledgeInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true });
    toast({ title: "Request Acknowledged", description: "Thank you for confirming receipt." });
  }, [user, toast]);
  
  const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'managementRequests'));
    const newRequest: Omit<ManagementRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: [{ id: `comm-init`, text: `Request created: "${requestData.subject}"`, userId: user.id, date: new Date().toISOString() }],
        viewedByRequester: true,
    };
    set(newRequestRef, newRequest);
    addActivityLog(user.id, 'Management Request Created', `Subject: ${requestData.subject}`);

    const recipient = users.find(u => u.id === requestData.recipientId);
    if(recipient && recipient.email) {
      createAndSendNotification(
        recipient.email,
        `New Management Request: ${requestData.subject}`,
        `New Request from ${user.name}`,
        {
          'Subject': requestData.subject,
          'Details': requestData.body,
        },
        `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
        'Review Request'
      );
    }
  }, [user, users, addActivityLog]);

  const updateManagementRequest = useCallback((request: ManagementRequest) => {
    if(!user) return;
    const { id, ...data } = request;
    update(ref(rtdb, `managementRequests/${id}`), data);
    addActivityLog(user.id, 'Management Request Updated', `Request ID: ${id}`);
  }, [user, addActivityLog]);

  const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => {
    if (!user) return;
    const request = managementRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Status changed to ${status}. Comment: ${comment}`, date: new Date().toISOString() };
    
    const updates: { [key: string]: any } = {};
    updates[`managementRequests/${requestId}/status`] = status;
    updates[`managementRequests/${requestId}/approverId`] = user.id;
    updates[`managementRequests/${requestId}/viewedByRequester`] = false;
    updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Management Request Status Updated', `Request ID: ${requestId} to ${status}`);

    const requester = users.find(u => u.id === request.requesterId);
    if (requester && requester.email) {
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
  }, [user, managementRequests, users, addActivityLog]);
  
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
    
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: 'Request Created', date: new Date().toISOString() };
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
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

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
        rejoiningDate: employee?.leaveHistory && Object.values(employee.leaveHistory).find(l => l.rejoinedDate)?.rejoinedDate ? format(parseISO(Object.values(employee.leaveHistory).find(l => l.rejoinedDate)!.rejoinedDate!), 'dd MMM, yyyy') : 'N/A',
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
        Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
    );
    update(ref(rtdb, `ppeRequests/${id}`), cleanData);
    addActivityLog(user.id, 'PPE Request Updated', `Request ID: ${id}`);
  }, [user, addActivityLog]);

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
        createAndSendNotification(
            requester.email,
            `New Query on your PPE Request #${request.id.slice(-6)}`,
            `Query from ${user.name}`,
            {
                'Request For': manpowerProfiles.find(p => p.id === request.manpowerId)?.name || 'N/A',
                'Item': `${request.ppeType} (Size: ${request.size})`,
                'Question': commentText,
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
            'Reply to Query'
        );
    }
  }, [user, ppeRequests, users, manpowerProfiles]);

  const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;
  
    let commentText = `Status changed to ${status}.`;
    if (comment.trim()) {
      commentText += ` Comment: ${comment}`;
    }

    addPpeRequestComment(requestId, commentText);
  
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/status`] = status;
  
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
  }, [user, ppeRequests, ppeStock, addActivityLog, users, manpowerProfiles, addPpeRequestComment]);
  
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
    update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true });
  }, [user]);

  const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => {
    if (!user) return;
    const updates = typeof data === 'number' ? { quantity: data } : { sizes: data };
    update(ref(rtdb, `ppeStock/${stockId}`), { ...updates, lastUpdated: new Date().toISOString() });
    addActivityLog(user.id, 'PPE Stock Updated', `Updated ${stockId}`);
  }, [user, addActivityLog]);
  
  const addPpeInwardRecord = useCallback((record: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'ppeInwardHistory'));
    const newRecord = { ...record, date: record.date.toISOString(), addedByUserId: user.id, id: newRef.key! };
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
            if (typeof date === 'number') {
                const date = new Date(Date.UTC(1899, 11, 30 + date));
                return isValid(date) ? date.toISOString() : null;
            }
            if (typeof date === 'string') {
                const parsed = parseISO(date);
                if (isValid(parsed)) return parsed.toISOString();
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
    if(!user) return;
    const { id, ...data } = item;
    const dataToSave = { 
      ...data, 
      lastUpdated: new Date().toISOString(),
      movedToProjectId: data.movedToProjectId || null,
    };
    update(ref(rtdb, `inventoryItems/${id}`), dataToSave);
    addActivityLog(user.id, 'Inventory Item Updated', item.name);
  }, [user, addActivityLog]);

  const updateInventoryItemGroup = useCallback((itemName: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => {
    if (!user || !can.manage_inventory) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    const dbUpdates: { [key: string]: any } = {};
    const itemsToUpdate = inventoryItems.filter(item => item.name === itemName && item.tpInspectionDueDate === updates.tpInspectionDueDate);

    if (itemsToUpdate.length === 0) {
      toast({ title: 'No Matching Items', description: 'No items were found with that name and TP due date.', variant: 'destructive' });
      return;
    }

    itemsToUpdate.forEach(item => {
        dbUpdates[`inventoryItems/${item.id}/certificateUrl`] = updates.certificateUrl;
        dbUpdates[`inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
    });
    update(ref(rtdb), dbUpdates);
    addActivityLog(user.id, 'Bulk TP Cert Update', `Updated ${itemsToUpdate.length} items for ${itemName}`);
    toast({ title: 'Update Successful', description: `${itemsToUpdate.length} items have been updated.` });
}, [user, can.manage_inventory, inventoryItems, addActivityLog, toast]);

const updateInventoryItemGroupByProject = useCallback((
    itemName: string,
    projectId: string,
    updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>
) => {
    if (!user || !can.manage_inventory) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    const dbUpdates: { [key: string]: any } = {};
    const itemsToUpdate = inventoryItems.filter(item => item.name === itemName && item.projectId === projectId);

    if (itemsToUpdate.length === 0) {
        toast({ title: 'No Matching Items', description: 'No items were found with that name and project.', variant: 'destructive' });
        return;
    }

    itemsToUpdate.forEach(item => {
        if (updates.inspectionDate) dbUpdates[`inventoryItems/${item.id}/inspectionDate`] = updates.inspectionDate;
        if (updates.inspectionDueDate) dbUpdates[`inventoryItems/${item.id}/inspectionDueDate`] = updates.inspectionDueDate;
        if (updates.inspectionCertificateUrl) dbUpdates[`inventoryItems/${item.id}/inspectionCertificateUrl`] = updates.inspectionCertificateUrl;
        dbUpdates[`inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
    });

    update(ref(rtdb), dbUpdates);
    addActivityLog(user.id, 'Bulk Inspection Cert Update', `Updated ${itemsToUpdate.length} items for ${itemName}`);
    toast({ title: 'Update Successful', description: `${itemsToUpdate.length} items have been updated.` });
}, [user, can.manage_inventory, inventoryItems, addActivityLog, toast]);

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
  
  const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'certificateRequests'));
    const newRequest: Omit<CertificateRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        status: 'Pending',
        requestDate: new Date().toISOString(),
        comments: [{ id: 'comm-init', userId: user.id, text: `Request for ${requestData.requestType} submitted. Reason: ${requestData.remarks || 'N/A'}`, date: new Date().toISOString() }],
        viewedByRequester: true,
    };
    set(newRef, newRequest);
    addActivityLog(user.id, 'Certificate Requested', `Type: ${requestData.requestType}`);
    const storePersonnel = users.filter(u => u.role === 'Store in Charge' || u.role === 'Assistant Store Incharge');
    storePersonnel.forEach(p => {
        if(p.email) {
            createAndSendNotification(
                p.email,
                `New Certificate Request from ${user.name}`,
                'New Certificate Request',
                {
                    'Request Type': requestData.requestType,
                    'Requested By': user.name,
                    'Remarks': requestData.remarks || 'N/A'
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
                'View Requests'
            );
        }
    });
  }, [user, users, addActivityLog]);

  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = certificateRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };

    const updates: { [key: string]: any } = {};
    updates[`certificateRequests/${requestId}/status`] = 'Completed';
    updates[`certificateRequests/${requestId}/completionDate`] = new Date().toISOString();
    updates[`certificateRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`certificateRequests/${requestId}/viewedByRequester`] = false;

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Certificate Request Fulfilled', `Request ID: ${requestId}`);
  }, [user, certificateRequests, addActivityLog]);
  
  const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);
    update(ref(rtdb, `certificateRequests/${requestId}`), { viewedByRequester: false });
  }, [user]);

  const markFulfilledRequestsAsViewed = useCallback((requestType: 'store' | 'equipment') => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    certificateRequests.forEach(req => {
      const isMyFulfilled = req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester;
      if (!isMyFulfilled) return;
      const matchesType = (requestType === 'store' && req.itemId) || (requestType === 'equipment' && (req.utMachineId || req.dftMachineId));
      if (matchesType) {
        updates[`certificateRequests/${req.id}/viewedByRequester`] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
  }, [user, certificateRequests]);
  
  const acknowledgeFulfilledRequest = useCallback((requestId: string) => {
    remove(ref(rtdb, `certificateRequests/${requestId}`));
  }, []);
  
  const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'utMachines'));
    const dataToSave = { ...machine, movedToProjectId: machine.movedToProjectId || null };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'UT Machine Added', machine.machineName);
  }, [user, addActivityLog]);

  const updateUTMachine = useCallback((machine: UTMachine) => {
    if(!user) return;
    const { id, ...data } = machine;
    const dataToSave = { ...data, movedToProjectId: data.movedToProjectId || null };
    update(ref(rtdb, `utMachines/${id}`), dataToSave);
    addActivityLog(user.id, 'UT Machine Updated', machine.machineName);
  }, [user, addActivityLog]);

  const deleteUTMachine = useCallback((machineId: string) => {
    if(!user) return;
    const machine = utMachines.find(m => m.id === machineId);
    if(machine) {
        remove(ref(rtdb, `utMachines/${machineId}`));
        addActivityLog(user.id, 'UT Machine Deleted', machine.machineName);
    }
  }, [user, utMachines, addActivityLog]);

  const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'dftMachines'));
    const dataToSave = { ...machine, movedToProjectId: machine.movedToProjectId || null };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'DFT Machine Added', machine.machineName);
  }, [user, addActivityLog]);
  
  const updateDftMachine = useCallback((machine: DftMachine) => {
    if(!user) return;
    const { id, ...data } = machine;
    const dataToSave = { ...data, movedToProjectId: data.movedToProjectId || null };
    update(ref(rtdb, `dftMachines/${id}`), dataToSave);
    addActivityLog(user.id, 'DFT Machine Updated', machine.machineName);
  }, [user, addActivityLog]);

  const deleteDftMachine = useCallback((machineId: string) => {
    if(!user) return;
    const machine = dftMachines.find(m => m.id === machineId);
    if(machine) {
        remove(ref(rtdb, `dftMachines/${machineId}`));
        addActivityLog(user.id, 'DFT Machine Deleted', machine.machineName);
    }
  }, [user, dftMachines, addActivityLog]);

  const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'mobileSims'));
    set(newRef, item);
    addActivityLog(user.id, 'Mobile/SIM Added', `${item.type} for ${users.find(u=>u.id === item.allottedToUserId)?.name}`);
  }, [user, users, addActivityLog]);
  
  const updateMobileSim = useCallback((item: MobileSim) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `mobileSims/${id}`), data);
    addActivityLog(user.id, 'Mobile/SIM Updated', item.number);
  }, [user, addActivityLog]);

  const deleteMobileSim = useCallback((itemId: string) => {
    if (!user) return;
    const item = mobileSims.find(i => i.id === itemId);
    if (item) {
      remove(ref(rtdb, `mobileSims/${itemId}`));
      addActivityLog(user.id, 'Mobile/SIM Deleted', item.number);
    }
  }, [user, mobileSims, addActivityLog]);

  const addLaptopDesktop = useCallback((item: Omit<LaptopDesktop, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'laptopsDesktops'));
    set(newRef, item);
    addActivityLog(user.id, 'Laptop/Desktop Added', `${item.make} ${item.model}`);
  }, [user, addActivityLog]);

  const updateLaptopDesktop = useCallback((item: LaptopDesktop) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `laptopsDesktops/${id}`), data);
    addActivityLog(user.id, 'Laptop/Desktop Updated', item.serialNumber);
  }, [user, addActivityLog]);
  
  const deleteLaptopDesktop = useCallback((itemId: string) => {
    if (!user) return;
    const item = laptopsDesktops.find(i => i.id === itemId);
    if (item) {
      remove(ref(rtdb, `laptopsDesktops/${itemId}`));
      addActivityLog(user.id, 'Laptop/Desktop Deleted', item.serialNumber);
    }
  }, [user, laptopsDesktops, addActivityLog]);
  
  const addDigitalCamera = useCallback((camera: Omit<DigitalCamera, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'digitalCameras'));
    set(newRef, camera);
    addActivityLog(user.id, 'Digital Camera Added', camera.serialNumber);
  }, [user, addActivityLog]);

  const updateDigitalCamera = useCallback((camera: DigitalCamera) => {
    if(!user) return;
    const { id, ...data } = camera;
    update(ref(rtdb, `digitalCameras/${id}`), data);
    addActivityLog(user.id, 'Digital Camera Updated', camera.serialNumber);
  }, [user, addActivityLog]);
  
  const deleteDigitalCamera = useCallback((cameraId: string) => {
    if(!user) return;
    remove(ref(rtdb, `digitalCameras/${cameraId}`));
    addActivityLog(user.id, 'Digital Camera Deleted', cameraId);
  }, [user, addActivityLog]);
  
  const addAnemometer = useCallback((anemometer: Omit<Anemometer, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'anemometers'));
    set(newRef, anemometer);
    addActivityLog(user.id, 'Anemometer Added', anemometer.serialNumber);
  }, [user, addActivityLog]);

  const updateAnemometer = useCallback((anemometer: Anemometer) => {
    if(!user) return;
    const { id, ...data } = anemometer;
    update(ref(rtdb, `anemometers/${id}`), data);
    addActivityLog(user.id, 'Anemometer Updated', anemometer.serialNumber);
  }, [user, addActivityLog]);
  
  const deleteAnemometer = useCallback((anemometerId: string) => {
    if(!user) return;
    remove(ref(rtdb, `anemometers/${anemometerId}`));
    addActivityLog(user.id, 'Anemometer Deleted', anemometerId);
  }, [user, addActivityLog]);

  const addOtherEquipment = useCallback((equipment: Omit<OtherEquipment, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'otherEquipments'));
    set(newRef, equipment);
    addActivityLog(user.id, 'Other Equipment Added', equipment.equipmentName);
  }, [user, addActivityLog]);

  const updateOtherEquipment = useCallback((equipment: OtherEquipment) => {
    if(!user) return;
    const { id, ...data } = equipment;
    update(ref(rtdb, `otherEquipments/${id}`), data);
    addActivityLog(user.id, 'Other Equipment Updated', equipment.equipmentName);
  }, [user, addActivityLog]);
  
  const deleteOtherEquipment = useCallback((equipmentId: string) => {
    if(!user) return;
    remove(ref(rtdb, `otherEquipments/${equipmentId}`));
    addActivityLog(user.id, 'Other Equipment Deleted', equipmentId);
  }, [user, addActivityLog]);

  const addMachineLog = useCallback((logData: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => {
    if (!user) return;
    const newLogRef = push(ref(rtdb, 'machineLogs'));
    const newLog: Omit<MachineLog, 'id'> = {
        ...logData,
        machineId,
        loggedByUserId: user.id
    };
    set(newLogRef, newLog);
    const storePersonnel = users.filter(u => u.role === 'Store in Charge' || u.role === 'Assistant Store Incharge');
    storePersonnel.forEach(p => {
        if(p.email) {
            createAndSendNotification(
                p.email,
                `New Log for Machine ID: ${machineId}`,
                'New Machine Log Entry',
                {
                    'Machine ID': machineId,
                    'User': logData.userName,
                    'Job': logData.jobDescription,
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

  const updateBranding = useCallback(async (name: string, logo: string | null) => {
    if(!user || user.role !== 'Admin') return;
    update(ref(rtdb, 'branding'), { appName: name, appLogo: logo });
    addActivityLog(user.id, 'Branding Updated');
  }, [user, addActivityLog]);

  const addAnnouncement = useCallback((data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => {
    if (!user || !user.supervisorId) {
        toast({ variant: 'destructive', title: "No Supervisor", description: "You must have a supervisor assigned to create an announcement." });
        return;
    }
    const newRef = push(ref(rtdb, 'announcements'));
    const newAnnouncement: Omit<Announcement, 'id'> = {
        title: data.title!,
        content: data.content!,
        creatorId: user.id,
        status: 'pending',
        approverId: user.supervisorId,
        createdAt: new Date().toISOString(),
        comments: [],
        dismissedBy: [],
        notifyAll: data.notifyAll || false,
    };
    set(newRef, newAnnouncement);
    addActivityLog(user.id, 'Announcement Submitted', `Title: ${data.title}`);
  }, [user, addActivityLog, toast]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    const { id, ...data } = announcement;
    update(ref(rtdb, `announcements/${id}`), data);
  }, []);
  
  const approveAnnouncement = useCallback((announcementId: string) => {
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;
  
    const updates: { [key: string]: any } = {};
    updates[`announcements/${announcementId}/status`] = 'approved';
  
    if (announcement.notifyAll) {
      const usersToNotify = users.filter(u => u.status === 'active' && u.role !== 'Manager' && u.email);
      usersToNotify.forEach(u => {
        createAndSendNotification(
          u.email!,
          `New Announcement: ${announcement.title}`,
          announcement.title,
          { Content: announcement.content },
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          'View Dashboard'
        );
      });
    }
  
    update(ref(rtdb), updates);
  }, [announcements, users]);

  const rejectAnnouncement = useCallback((announcementId: string) => {
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'rejected' });
  }, []);
  
  const deleteAnnouncement = useCallback((announcementId: string) => {
    remove(ref(rtdb, `announcements/${announcementId}`));
  }, []);

  const returnAnnouncement = useCallback((announcementId: string, comment: string) => {
    if(!user) return;
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;
    
    const newComment = { userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(announcement.comments) ? announcement.comments : [];
    
    update(ref(rtdb, `announcements/${announcementId}`), { 
        status: 'returned',
        comments: [...existingComments, newComment]
    });
  }, [user, announcements]);

  const dismissAnnouncement = useCallback((announcementId: string) => {
    if(!user) return;
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;
    const dismissedBy = announcement.dismissedBy || [];
    if (!dismissedBy.includes(user.id)) {
        update(ref(rtdb, `announcements/${announcementId}`), { dismissedBy: [...dismissedBy, user.id] });
    }
  }, [user, announcements]);
  
  const addBroadcast = useCallback((broadcastData: Omit<Broadcast, 'id'|'creatorId'|'createdAt'|'dismissedBy'>) => {
    if (!user) return;
    const { message, expiryDate, emailTarget, recipientRoles, recipientUserIds } = broadcastData;
    const newRef = push(ref(rtdb, 'broadcasts'));
    const newBroadcast: Omit<Broadcast, 'id'> = {
      message,
      expiryDate,
      creatorId: user.id,
      createdAt: new Date().toISOString(),
      dismissedBy: [],
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
  
  const dismissBroadcast = useCallback((broadcastId: string) => {
    if (!user) return;
    const broadcast = broadcasts.find(b => b.id === broadcastId);
    if (!broadcast) return;
    const dismissedBy = broadcast.dismissedBy || [];
    if (!dismissedBy.includes(user.id)) {
      update(ref(rtdb, `broadcasts/${broadcastId}`), { dismissedBy: [...dismissedBy, user.id] });
    }
  }, [user, broadcasts]);

  const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    const newBuilding: Omit<Building, 'id' | 'rooms'> = { buildingNumber };
    set(newRef, newBuilding);
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
    const beds: Bed[] = Array.from({ length: roomData.numberOfBeds }, (_, i) => ({
      id: `bed-${i + 1}`,
      bedNumber: (i + 1).toString(),
      bedType: 'Bunk',
    }));
    const newRoom: Room = { id: newRoomRef.key!, roomNumber: roomData.roomNumber, beds };
    set(newRoomRef, newRoom);
  }, []);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.rooms) return;

    // Firebase stores array-like objects. Find the key associated with the roomId.
    const roomKey = Object.keys(building.rooms).find(key => building.rooms[key as any].id === roomId);
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
    set(ref(rtdb, `jobSchedules/${schedule.id}`), schedule);
    if (user?.role === 'Supervisor' || user?.role === 'Junior Supervisor') {
      const pcs = users.filter(u => u.permissions?.includes('prepare_master_schedule'));
      pcs.forEach(pc => {
        if(pc.email) {
          createAndSendNotification(
            pc.email,
            `Job Schedule Completed for ${projects.find(p => p.id === schedule.projectId)?.name}`,
            `Schedule Ready for ${format(parseISO(schedule.date), 'PPP')}`,
            {
              'Project': projects.find(p => p.id === schedule.projectId)?.name || 'N/A',
              'Completed By': user.name,
              'Details': `${schedule.items.length} job entries saved.`
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/job-schedule`,
            'View Job Schedule'
          );
        }
      });
    }
  }, [user, users, projects]);
  
  const addJobRecordPlant = useCallback((plantName: string) => {
    const newRef = push(ref(rtdb, 'jobRecordPlants'));
    set(newRef, { name: plantName });
  }, []);

  const deleteJobRecordPlant = useCallback((plantId: string) => {
    remove(ref(rtdb, `jobRecordPlants/${plantId}`));
  }, []);
  
  const addJobCode = useCallback((jobCode: Omit<JobCode, 'id'>) => {
    const newRef = push(ref(rtdb, 'jobCodes'));
    set(newRef, jobCode);
  }, []);

  const updateJobCode = useCallback((jobCode: JobCode) => {
    const { id, ...data } = jobCode;
    update(ref(rtdb, `jobCodes/${id}`), data);
  }, []);

  const deleteJobCode = useCallback((jobCodeId: string) => {
    remove(ref(rtdb, `jobCodes/${jobCodeId}`));
  }, []);

  const saveJobRecord = useCallback((monthKey: string, employeeId: string, day: number | null, codeOrValue: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'dailyComments' | 'sundayDuty') => {
    let path: string;
    let valueToSave = codeOrValue;
  
    switch(type) {
        case 'status':
            const code = (codeOrValue as string)?.toUpperCase() ?? '';
            const isValidCode = jobCodes.some(jc => jc.code === code) || code === '';
            if (!isValidCode) {
                toast({
                    title: "Invalid Job Code",
                    description: `The code "${code}" is not a valid job code.`,
                    variant: "destructive"
                });
                return;
            }
            path = `jobRecords/${monthKey}/records/${employeeId}/days/${day}`;
            if(code === '') valueToSave = null;
            break;
        case 'plant':
            path = `jobRecords/${monthKey}/records/${employeeId}/plant`;
            break;
        case 'dailyOvertime':
            path = `jobRecords/${monthKey}/records/${employeeId}/dailyOvertime/${day}`;
            if (valueToSave === null || valueToSave === 0 || valueToSave === '') valueToSave = null;
            break;
        case 'dailyComments':
            path = `jobRecords/${monthKey}/records/${employeeId}/dailyComments/${day}`;
            if (valueToSave === null || valueToSave === '') valueToSave = null;
            break;
        case 'sundayDuty':
            path = `jobRecords/${monthKey}/records/${employeeId}/additionalSundayDuty`;
            break;
        default:
            return;
    }

    if (valueToSave === null) {
      remove(ref(rtdb, path));
    } else {
      set(ref(rtdb, path), valueToSave);
    }
  }, [jobCodes, toast]);
  
  const savePlantOrder = useCallback((monthKey: string, plantName: string, orderedIds: string[]) => {
      update(ref(rtdb, `jobRecords/${monthKey}/plantsOrder`), { [plantName]: orderedIds });
  }, []);

  const lockJobSchedule = useCallback((date: string) => {
    const updates: { [key: string]: any } = {};
    jobSchedules.forEach(schedule => {
        if (schedule.date === date) {
            updates[`jobSchedules/${schedule.id}/isLocked`] = true;
        }
    });
    update(ref(rtdb), updates);
  }, [jobSchedules]);

  const unlockJobSchedule = useCallback((date: string, projectId: string) => {
    const scheduleId = `${projectId}_${date}`;
    update(ref(rtdb, `jobSchedules/${scheduleId}`), { isLocked: false });
  }, []);
  
  const lockJobRecordSheet = useCallback((monthKey: string) => {
    update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: true });
    toast({ title: "Job Record Locked", description: `The record sheet for ${monthKey} is now locked.`});
  }, [toast]);
  
  const unlockJobRecordSheet = useCallback((monthKey: string) => {
    if (!user || user.role !== 'Admin') return;
    update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: false });
    toast({ title: "Job Record Unlocked", description: `The record sheet for ${monthKey} is now editable.`});
  }, [user, toast]);

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
        date: new Date().toISOString(),
        requesterId: user.id,
        status: 'Paid',
        comments: [{ id: `comm-init`, text: 'Payment logged.', userId: user.id, date: new Date().toISOString() }],
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
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Status changed to ${status}: ${comment}`, date: new Date().toISOString() };
    
    const updates: Partial<Payment> = {
        status,
        approverId: user.id,
        comments: [...(payment.comments || []), {id: newCommentRef.key!, ...newComment}],
    };
    update(ref(rtdb, `payments/${paymentId}`), updates);
    const requester = users.find(u => u.id === payment.requesterId);
    if (requester && requester.email) {
        const vendor = vendors.find(v => v.id === payment.vendorId);
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

  const deleteTpCertList = useCallback((listId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `tpCertLists/${listId}`));
    addActivityLog(user.id, 'TP Certification List Deleted', `List ID: ${listId}`);
  }, [user, addActivityLog]);

  const addDocument = useCallback((docData: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'downloadableDocuments'));
    set(newRef, { ...docData, uploadedBy: user.id, createdAt: new Date().toISOString() });
  }, [user]);

  const updateDocument = useCallback((doc: DownloadableDocument) => {
    const { id, ...data } = doc;
    update(ref(rtdb, `downloadableDocuments/${id}`), data);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    remove(ref(rtdb, `downloadableDocuments/${docId}`));
  }, []);
  
  const addLogbookRequest = useCallback((manpowerId: string, remarks?: string) => {
    if(!user) return;
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
    if(!user) return;
    const request = logbookRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `logbookRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Status changed to ${status}. Reason: ${comment}`, date: new Date().toISOString() };

    const updates: { [key: string]: any } = {};
    updates[`logbookRequests/${requestId}/status`] = status;
    updates[`logbookRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key! };
    
    const profile = manpowerProfiles.find(p => p.id === request.manpowerId);
    if (profile) {
      const logbookUpdate: Partial<LogbookRecord> = { status: status === 'Completed' ? 'Sent back as requested' : 'Received', remarks: comment };
      if (status === 'Completed') {
        logbookUpdate.outDate = new Date().toISOString();
      }
      updates[`manpowerProfiles/${profile.id}/logbook`] = { ...(profile.logbook || {}), ...logbookUpdate };
    }

    update(ref(rtdb), updates);

  }, [user, logbookRequests, manpowerProfiles]);
  
  const addLogbookRequestComment = useCallback((requestId: string, text: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `logbookRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: new Date().toISOString() };
    set(newCommentRef, { ...newComment, id: newCommentRef.key! });
    update(ref(rtdb, `logbookRequests/${requestId}`), { viewedBy: { [user.id]: true } });
  }, [user]);

  const deleteLogbookRecord = useCallback((manpowerId: string, onComplete: () => void) => {
    if(!user || !can.manage_logbook) return;
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/logbook`))
      .then(onComplete)
      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive'}));
  }, [user, can.manage_logbook, toast]);

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

  const deleteInventoryTransferRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({ title: 'Permission Denied', description: 'Only Admins can delete history items.', variant: 'destructive'});
      return;
    }
    remove(ref(rtdb, `inventoryTransferRequests/${requestId}`));
  }, [user, toast]);

  const clearInventoryTransferHistory = useCallback(() => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, 'inventoryTransferRequests'));
    addActivityLog(user.id, 'Inventory Transfer History Cleared');
  }, [user, addActivityLog]);
   
  const approveInventoryTransferRequest = useCallback((request: InventoryTransferRequest, createTpList: boolean) => {
    if (!user) return;
  
    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${request.id}/status`] = 'Approved';
    updates[`inventoryTransferRequests/${request.id}/approverId`] = user.id;
    updates[`inventoryTransferRequests/${request.id}/approvalDate`] = new Date().toISOString();
  
    if (createTpList && request.reason === 'For TP certification') {
      const newListData = {
        name: `Transfer to TP - ${format(new Date(), 'dd-MM-yyyy')}`,
        date: new Date().toISOString().split('T')[0],
        items: request.items.map(item => ({
          materialName: item.name,
          manufacturerSrNo: item.serialNumber,
          itemId: item.itemId,
          itemType: item.itemType,
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

  const rejectInventoryTransferRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = inventoryTransferRequests.find(req => req.id === requestId);
    if (!request) return;

    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Rejected';
    updates[`inventoryTransferRequests/${requestId}/approverId`] = user.id;
    updates[`inventoryTransferRequests/${requestId}/approvalDate`] = new Date().toISOString();
    
    const newCommentRef = push(ref(rtdb, `inventoryTransferRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Rejected: ${comment}`, date: new Date().toISOString() };
    updates[`inventoryTransferRequests/${requestId}/comments/${newCommentRef.key}`] = newComment;

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Inventory Transfer Rejected', `Request ID: ${requestId}`);

    const requester = users.find(u => u.id === request.requesterId);
    if (requester?.email) {
        createAndSendNotification(
            requester.email,
            `Inventory Transfer Rejected: #${requestId.slice(-6)}`,
            'Inventory Transfer Rejected',
            {
                'Request ID': `#${requestId.slice(-6)}`,
                'Rejected By': user.name,
                'Reason': comment,
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/store-inventory`,
            'View Transfers'
        );
    }
  }, [user, inventoryTransferRequests, addActivityLog, users]);

  const disputeInventoryTransfer = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const request = inventoryTransferRequestsById[requestId];
    if (!request || request.status !== 'Approved') return;

    const updates: { [key: string]: any } = {};
    updates[`inventoryTransferRequests/${requestId}/status`] = 'Disputed';
    
    const newCommentRef = push(ref(rtdb, `inventoryTransferRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: `Disputed: ${comment}`, date: new Date().toISOString() };
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
      let path: string;
      switch (item.itemType) {
        case 'Inventory': path = `inventoryItems/${item.itemId}`; break;
        case 'UTMachine': path = `utMachines/${item.itemId}`; break;
        case 'DftMachine': path = `dftMachines/${item.itemId}`; break;
        case 'DigitalCamera': path = `digitalCameras/${item.itemId}`; break;
        case 'Anemometer': path = `anemometers/${item.itemId}`; break;
        case 'OtherEquipment': path = `otherEquipments/${item.itemId}`; break;
        default: return;
      }
      updates[`${path}/projectId`] = request.toProjectId;
      updates[`${path}/lastUpdated`] = new Date().toISOString();
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

  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, inventoryTransferRequests, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, tpCertLists, downloadableDocuments, logbookRequests, inspectionChecklists, appName, appLogo,
    can,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount, pendingInventoryTransferRequestCount, allCompletedTransferRequests, pendingLogbookRequestCount,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markSinglePlannerCommentAsRead, dismissPendingUpdate, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestItem, resolveInternalRequestDispute, updateInternalRequestStatus, updateInternalRequestItemStatus, addInternalRequestComment, deleteInternalRequest, forceDeleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissBroadcast, addBroadcast, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegister, updatePurchaseRegisterPoNumber, deletePurchaseRegister, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, addTpCertList, updateTpCertList, deleteTpCertList, addDocument, updateDocument, deleteDocument, addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, deleteLogbookRecord, addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
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
