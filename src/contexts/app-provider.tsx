'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback, Subtask, UnlockRequest, PpeInwardRecord, Broadcast, JobRecord, JobRecordPlant, JobCode } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid, parseISO } from 'date-fns';
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
  appName: string;
  appLogo: string | null;

  // Auth
  login: (email: string, pass: string) => Promise<{ success: boolean; status?: User['status']; user?: User }>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatarFile: File | null, password?: string) => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  generateResetCode: (requestId: string) => void;
  resolveResetRequest: (requestId: string) => void;
  resetPassword: (email: string, code: string, newPass: string) => Promise<boolean>;
  requestUnlock: (userId: string, userName: string) => void;

  // Permissions
  can: PermissionsObject;

  // Computed Data
  pendingTaskApprovalCount: number;
  myNewTaskCount: number;
  myPendingTaskRequestCount: number;
  myFulfilledStoreCertRequestCount: number;
  myFulfilledEquipmentCertRequests: CertificateRequest[];
  workingManpowerCount: number;
  onLeaveManpowerCount: number;
  pendingStoreCertRequestCount: number;
  pendingEquipmentCertRequestCount: number;
  plannerNotificationCount: number;
  unreadPlannerCommentDays: string[];
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
  requestTaskStatusChange: (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => void;
  approveTaskStatusChange: (taskId: string, comment: string) => void;
  returnTaskStatusChange: (taskId: string, comment: string) => void;
  addComment: (taskId: string, commentText: string) => void;
  markTaskAsViewed: (taskId: string) => void;
  acknowledgeReturnedTask: (taskId: string) => void;
  requestTaskReassignment: (taskId: string, newAssigneeId: string, comment: string) => void;
  getExpandedPlannerEvents: (month: Date, userId: string) => (PlannerEvent & { eventDate: Date })[];
  addPlannerEvent: (event: Omit<PlannerEvent, 'id' | 'comments'>) => void;
  updatePlannerEvent: (event: PlannerEvent) => void;
  deletePlannerEvent: (eventId: string) => void;
  addPlannerEventComment: (eventId: string, text: string) => void;
  markPlannerCommentsAsRead: (plannerUserId: string, day: Date) => void;
  addDailyPlannerComment: (plannerUserId: string, day: Date, text: string) => void;
  updateDailyPlannerComment: (commentId: string, dayKey: string, newText: string) => void;
  deleteDailyPlannerComment: (commentId: string, dayKey: string) => void;
  deleteAllDailyPlannerComments: (dayKey: string) => void;
  awardManualAchievement: (achievement: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => void;
  updateManualAchievement: (achievement: Achievement) => void;
  deleteManualAchievement: (achievementId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar'>) => void;
  updateUser: (user: User) => void;
  updateUserPlanningScore: (userId: string, score: number) => void;
  deleteUser: (userId: string) => void;
  lockUser: (userId: string) => void;
  unlockUser: (userId: string) => void;
  deactivateUser: (userId: string) => void;
  reactivateUser: (userId: string) => void;
  resolveUnlockRequest: (requestId: string) => void;
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
  addManpowerLog: (log: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string }, logDate?: Date) => Promise<void>;
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
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus, comment: string) => void;
  deleteInternalRequest: (requestId: string) => void;
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
  resolvePpeDispute: (requestId: string, resolution: 'reverse' | 'reissue', comment: string) => void;
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
  deleteInventoryItem: (itemId: string) => void;
  deleteInventoryItemGroup: (itemName: string) => void;
  renameInventoryItemGroup: (oldName: string, newName: string) => void;
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
  dismissAnnouncement: (announcementId: string) => void;
  addBroadcast: (broadcastData: Omit<Broadcast, 'id'|'creatorId'|'createdAt'|'dismissedBy'>) => void;
  dismissBroadcast: (broadcastId: string) => void;
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
  saveJobRecord: (monthKey: string, employeeId: string, day: number | null, codeOrPlant: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'sundayDuty') => void;
  savePlantOrder: (monthKey: string, plantName: string, orderedIds: string[]) => void;
  lockJobSchedule: (date: string) => void;
  unlockJobSchedule: (date: string, projectId: string) => void;
  lockJobRecordSheet: (monthKey: string) => void;
  unlockJobRecordSheet: (monthKey: string) => void;
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (vendorId: string) => void;
  addPayment: (payment: Omit<Payment, 'id'|'requesterId'|'status'|'approverId'>) => void;
  updatePayment: (payment: Payment) => void;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, comment: string) => void;
  deletePayment: (paymentId: string) => void;
  addPurchaseRegister: (purchase: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => void;
  updatePurchaseRegisterPoNumber: (purchaseRegisterId: string, poNumber: string) => void;
  addIgpOgpRecord: (record: Omit<IgpOgpRecord, 'id'|'creatorId'>) => void;
  addFeedback: (subject: string, message: string) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  markFeedbackAsViewed: () => void;
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
  const [loading, setLoading] = useState(true);
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

  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  
  // Memoize arrays from objects
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

  const [storedUser, setStoredUser] = useLocalStorage<User | null>('aries-user-v8', null);
  const user = storedUser;
  
  const { toast } = useToast();
  const router = useRouter();

  // Listen for status changes on the current user
  useEffect(() => {
    if (user && user.id) {
        const userRef = ref(rtdb, `users/${user.id}`);
        const unsubscribe = onValue(userRef, (snapshot) => {
            if (!snapshot.exists()) {
                setStoredUser(null);
                router.replace('/login');
                return;
            }
            const updatedUser = { id: snapshot.key, ...snapshot.val() };
            if (updatedUser.status && updatedUser.status !== 'active') {
                setStoredUser(updatedUser); 
                router.replace('/status');
            } else if (JSON.stringify(user) !== JSON.stringify(updatedUser)) {
              setStoredUser(updatedUser);
            }
        });
        return () => unsubscribe();
    }
  }, [user, setStoredUser, router]);
  
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

    if (!user) {
      setLoading(false);
      // Clear all state when user logs out
      const clearState = (setter: Dispatch<SetStateAction<any>>) => setter({});
      clearState(setUsersById); clearState(setRolesById); clearState(setTasksById); clearState(setProjectsById); clearState(setJobRecordPlantsById); clearState(setJobCodesById); clearState(setPlannerEventsById);
      clearState(setDailyPlannerCommentsById); clearState(setAchievementsById); clearState(setActivityLogsById);
      clearState(setVehiclesById); clearState(setDriversById); clearState(setIncidentReportsById); clearState(setManpowerLogsById); clearState(setManpowerProfilesById);
      clearState(setInternalRequestsById); clearState(setManagementRequestsById); clearState(setInventoryItemsById); clearState(setUtMachinesById); clearState(setDftMachinesById); clearState(setMobileSimsById); clearState(setLaptopsDesktopsById); clearState(setDigitalCamerasById); clearState(setAnemometersById); clearState(setOtherEquipmentsById); clearState(setMachineLogsById); clearState(setCertificateRequestsById); clearState(setAnnouncementsById); clearState(setBroadcastsById); clearState(setBuildingsById); clearState(setJobSchedulesById); clearState(setJobRecordsById); clearState(setPpeRequestsById); clearState(setPaymentsById); clearState(setVendorsById); clearState(setPurchaseRegistersById); clearState(setPasswordResetRequestsById); clearState(setIgpOgpRecordsById); clearState(setFeedbackById); clearState(setUnlockRequestsById);
      clearState(setPpeStockById); clearState(setPpeInwardHistoryById);
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
    ];
  
    const brandingRef = ref(rtdb, 'branding');
    const brandingListener = onValue(brandingRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAppName(data.appName || 'Aries Marine');
        setAppLogo(data.appLogo || null);
      }
    });
  
    setLoading(false);
  
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
      brandingListener();
    };
  }, [user]);

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

  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    const logRef = push(ref(rtdb, 'activityLogs'));
    const newLog: Omit<ActivityLog, 'id' | 'details'> & { details?: string } = {
        userId,
        action,
        timestamp: new Date().toISOString()
    };
    if (details) {
        newLog.details = details;
    }
    set(logRef, newLog);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; status?: User['status']; user?: User }> => {
    setLoading(true);
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    const dbUsers = snapshot.val();
    const usersArray: User[] = dbUsers ? Object.keys(dbUsers).map(k => ({ id: k, ...dbUsers[k] })) : [];

    const foundUser = usersArray.find(u => u.email === email && u.password === pass);
    
    setLoading(false);
    if (foundUser) {
        setStoredUser(foundUser);
        if (foundUser.status && foundUser.status !== 'active') {
            return { success: true, status: foundUser.status, user: foundUser };
        }
        addActivityLog(foundUser.id, 'User Logged In');
        return { success: true, status: 'active', user: foundUser };
    }
    return { success: false };
  }, [addActivityLog, setStoredUser]);

  const logout = useCallback(() => {
    if (user) {
      addActivityLog(user.id, 'User Logged Out');
    }
    setStoredUser(null);
    router.push('/login');
  }, [user, addActivityLog, setStoredUser, router]);
  
  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    const dataToSave: any = { ...data };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
      dataToSave.supervisorId = null;
    }
    update(ref(rtdb, `users/${id}`), dataToSave);
    if (user) {
      addActivityLog(user.id, 'User Profile Updated', `Updated details for ${updatedUser.name}`);
      if (user.id === updatedUser.id) setStoredUser(updatedUser);
    }
  }, [user, addActivityLog, setStoredUser]);

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
    
    // Update user's password
    await update(ref(rtdb, `users/${validRequest.userId}`), { password: newPass });
    // Mark request as handled
    await update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });

    addActivityLog(validRequest.userId, 'Password Reset');
    return true;

  }, [addActivityLog]);

  const lockUser = useCallback((userId: string) => {
    if (!user) return;
    update(ref(rtdb, `users/${userId}`), { status: 'locked' });
    addActivityLog(user.id, 'User Locked', `Locked account for user ID: ${userId}`);
  }, [user, addActivityLog]);

  const unlockUser = useCallback((userId: string) => {
    if (!user) return;
    update(ref(rtdb, `users/${userId}`), { status: 'active' });
    addActivityLog(user.id, 'User Unlocked', `Unlocked account for user ID: ${userId}`);
  }, [user, addActivityLog]);
  
  const deactivateUser = useCallback((userId: string) => {
    if (!user) return;
    update(ref(rtdb, `users/${userId}`), { status: 'deactivated' });
    addActivityLog(user.id, 'User Deactivated', `Deactivated account for user ID: ${userId}`);
  }, [user, addActivityLog]);
  
  const reactivateUser = useCallback((userId: string) => {
    if (!user) return;
    update(ref(rtdb, `users/${userId}`), { status: 'active' });
    addActivityLog(user.id, 'User Reactivated', `Reactivated account for user ID: ${userId}`);
  }, [user, addActivityLog]);
  
  const requestUnlock = useCallback((userId: string, userName: string) => {
    const newRequestRef = push(ref(rtdb, 'unlockRequests'));
    const newRequest: Omit<UnlockRequest, 'id'> = {
        userId,
        userName,
        date: new Date().toISOString(),
        status: 'pending',
    };
    set(newRequestRef, newRequest);

    const admins = users.filter(u => u.role === 'Admin');
    admins.forEach(admin => {
        if (admin.email) {
            createAndSendNotification(
                admin.email,
                `Account Unlock Request from ${userName}`,
                'Account Unlock Request',
                { 'User': userName },
                `${process.env.NEXT_PUBLIC_APP_URL}/account`,
                'View Requests'
            );
        }
    });

  }, [users]);

  const resolveUnlockRequest = useCallback((requestId: string) => {
    if (!user) return;
    const request = unlockRequests.find(r => r.id === requestId);
    if (!request) return;

    unlockUser(request.userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [user, unlockRequests, unlockUser]);

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

  const getSubordinateChain = useCallback((userId: string, allUsers: User[]): Set<string> => {
    const subordinates = new Set<string>();
    const queue = [userId];
    while(queue.length > 0) {
        const currentId = queue.shift()!;
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
    if (user.role === 'Admin' || user.role === 'Manager') {
        return users;
    }
    if (user.role === 'Project Coordinator') {
        return users.filter(u => u.role !== 'Manager');
    }
    if (user.role === 'Store in Charge' || user.role === 'Document Controller') {
        return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator');
    }
  
    const subordinateIds = getSubordinateChain(user.id, users);
    return users.filter(u => u.id === user.id || subordinateIds.has(u.id));
  }, [user, users, getSubordinateChain]);

  const getAssignableUsers = useCallback(() => {
    if (!user) return [];
    
    const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge'];
    if (storeRoles.includes(user.role)) {
        return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator' && u.role !== 'Manager');
    }

    if (user.role === 'Document Controller') {
      const rolesToExclude: Role[] = ['Admin', 'Manager', 'Project Coordinator'];
      return users.filter(u => !rolesToExclude.includes(u.role));
    }

    if (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Project Coordinator') {
        return users.filter(u => u.role !== 'Manager');
    }

    const subordinateIds = getSubordinateChain(user.id, users);
    return users.filter(u => (u.id === user.id || subordinateIds.has(u.id)) && u.role !== 'Manager');

  }, [user, users, getSubordinateChain]);

  const computedValue = useMemo(() => {
    if (!user) return {
      pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, unreadPlannerCommentDays: [], pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0, pendingUnlockRequestCount: 0,
    };
    
    const pendingTaskApprovalCount = tasks.filter(t => t.status === 'Pending Approval' && t.approverId === user.id).length;
    const myNewTaskCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && !t.viewedBy?.[user.id]).length;
    const myPendingTaskRequestCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && t.approvalState === 'returned').length;

    const myFulfilledStoreCertRequestCount = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    
    const unreadPlannerCommentDays = dailyPlannerComments
      .filter(dpc => dpc.plannerUserId === user.id && !dpc.viewedBy?.[user.id])
      .map(dpc => dpc.day);
    const plannerNotificationCount = unreadPlannerCommentDays.length;

    const pendingInternalRequestCount = isStoreManager ? internalRequests.filter(r => r.status === 'Pending').length : 0;
    const updatedInternalRequestCount = internalRequests.filter(r => r.requesterId === user.id && (r.status === 'Approved' || r.status === 'Rejected') && !r.viewedByRequester).length;
    
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
    const pendingPpeRequestCount = pendingApproval + pendingIssuance + pendingDisputes;

    const updatedPpeRequestCount = ppeRequests.filter(r => r.requesterId === user.id && (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester).length;
    
    const canApprovePayments = user.role === 'Admin' || user.role === 'Manager';
    const pendingPaymentApprovalCount = canApprovePayments ? payments.filter(p => p.status === 'Pending').length : 0;
    const pendingPasswordResetRequestCount = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.[user.id]).length : 0;
    const pendingUnlockRequestCount = can.manage_user_lock_status ? unlockRequests.filter(r => r.status === 'pending').length : 0;

    const { workingManpowerCount, onLeaveManpowerCount } = manpowerProfiles.reduce((acc, profile) => {
        if(profile.status === 'Working') acc.workingManpowerCount++;
        if(profile.status === 'On Leave') acc.onLeaveManpowerCount++;
        return acc;
    }, { workingManpowerCount: 0, onLeaveManpowerCount: 0 });

    return {
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount, pendingUnlockRequestCount
    };
  }, [can, user, tasks, certificateRequests, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback, unlockRequests, manpowerProfiles]);
  
  const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'participants' | 'lastUpdated' | 'viewedBy' | 'viewedByApprover' | 'viewedByRequester'> & { assigneeIds: string[] }) => {
    if(!user) return;
    const { assigneeIds, ...rest } = taskData;
    const tasksRef = ref(rtdb, 'tasks');
    const newTaskRef = push(tasksRef);
    const now = new Date().toISOString();
    
    const subtasks: { [userId: string]: Subtask } = {};
    assigneeIds.forEach(userId => {
        subtasks[userId] = {
            userId,
            status: 'To Do',
            updatedAt: now,
        };
    });

    const newTask: Omit<Task, 'id'> = {
        ...rest,
        creatorId: user.id,
        status: 'To Do',
        assigneeId: assigneeIds[0],
        assigneeIds: assigneeIds,
        subtasks,
        comments: [],
        participants: [user.id, ...assigneeIds],
        lastUpdated: now,
        viewedBy: { [user.id]: true },
        approvalState: 'none',
        viewedByApprover: true,
        viewedByRequester: false,
    };
    set(newTaskRef, newTask);
    const assigneeNames = users.filter(u => assigneeIds.includes(u.id)).map(u => u.name).join(', ');
    addActivityLog(user.id, 'Task Created', `Task "${newTask.title}" for ${assigneeNames}`);

    const assignees = users.filter(u => assigneeIds.includes(u.id));
    assignees.forEach(assignee => {
        if(assignee.email) {
            createAndSendNotification(
                assignee.email,
                `New Task Assigned: ${newTask.title}`,
                'You have a new task',
                {
                    'Title': newTask.title,
                    'Description': newTask.description,
                    'Due Date': format(parseISO(newTask.dueDate), 'PPP'),
                    'Priority': newTask.priority,
                    'Assigned By': user.name,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
                'View Task'
            );
        }
    });

  }, [user, users, addActivityLog]);

  const updateTask = useCallback((taskData: Task) => {
    if (!user) return;
    const { id, ...data } = taskData;
    update(ref(rtdb, `tasks/${id}`), data);
    addActivityLog(user.id, 'Task Updated', `Task: "${taskData.title}"`);
  }, [user, addActivityLog]);

  const deleteTask = useCallback((taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if(taskToDelete && user) {
      if (user.id === taskToDelete.creatorId || user.role === 'Admin') {
        remove(ref(rtdb, `tasks/${taskId}`));
        addActivityLog(user.id, 'Task Deleted', `Task: "${taskToDelete.title}"`);
      }
    }
  }, [user, tasks, addActivityLog]);
  
  const addComment = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    set(newCommentRef, newComment);
    
    // Update participants list and reset viewedBy
    const updatedParticipants = Array.from(new Set([...(task.participants || [task.creatorId, ...task.assigneeIds]), user.id]));
    const updates: Partial<Task> = {
      participants: updatedParticipants,
      viewedBy: { [user.id]: true },
      lastUpdated: new Date().toISOString(),
    };

    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Comment Added', `Task ID: ${taskId}`);

    const allParticipants = users.filter(u => updatedParticipants.includes(u.id) && u.id !== user.id);
    allParticipants.forEach(participant => {
        if(participant.email) {
            createAndSendNotification(
                participant.email,
                `New comment on task: ${task.title}`,
                'New Task Comment',
                {
                    'Task': task.title,
                    'Comment By': user.name,
                    'Comment': commentText
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
                'View Task'
            );
        }
    });

  }, [user, tasks, users, addActivityLog]);

  const requestTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    addComment(taskId, comment);

    const approverId = task.creatorId;
    const now = new Date().toISOString();

    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/subtasks/${user.id}`] = { userId: user.id, status: newStatus, updatedAt: now };

    const allSubtasksDone = Object.values(task.subtasks || {}).every(st => st.status === 'Done' || st.userId === user.id && newStatus === 'Done');
    
    if (newStatus === 'Done' && allSubtasksDone) {
        updates[`tasks/${taskId}/status`] = 'Pending Approval';
        updates[`tasks/${taskId}/approvalState`] = 'pending';
        updates[`tasks/${taskId}/approverId`] = approverId;
        addActivityLog(user.id, 'Task Completion Requested', `Task "${task.title}"`);
    } else if(newStatus === 'In Progress' && task.status === 'To Do') {
        updates[`tasks/${taskId}/status`] = 'In Progress';
    }

    if (attachment) {
      updates[`tasks/${taskId}/attachment`] = attachment;
    }
    
    updates[`tasks/${taskId}/lastUpdated`] = now;
    updates[`tasks/${taskId}/viewedBy`] = { [user.id]: true };

    update(ref(rtdb), updates);
  }, [user, tasks, addActivityLog, addComment]);
  
  const approveTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);

    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/approvalState`] = 'approved';
    updates[`tasks/${taskId}/viewedBy`] = { [user.id]: true };
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();
    
    const isReassignment = !!task.pendingAssigneeId;

    if (isReassignment) {
      const newAssigneeId = task.pendingAssigneeId!;
      updates[`tasks/${taskId}/assigneeIds`] = [newAssigneeId];
      updates[`tasks/${taskId}/subtasks`] = {
          [newAssigneeId]: { userId: newAssigneeId, status: 'To Do', updatedAt: new Date().toISOString() }
      };
      updates[`tasks/${taskId}/pendingAssigneeId`] = null;
      updates[`tasks/${taskId}/status`] = 'To Do';
      addActivityLog(user.id, 'Task Reassignment Approved', `Task "${task.title}" to ${users.find(u => u.id === newAssigneeId)?.name}`);
      
      const newAssignee = users.find(u => u.id === newAssigneeId);
      if (newAssignee?.email) {
          createAndSendNotification(
              newAssignee.email,
              `Task Reassigned to You: ${task.title}`,
              'A task has been reassigned to you',
              { Title: task.title, 'Assigned By': user.name, 'Due Date': format(parseISO(task.dueDate), 'PPP') },
              `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
              'View Task'
          );
      }
    } else {
      updates[`tasks/${taskId}/status`] = 'Done';
      updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
      addActivityLog(user.id, 'Task Completion Approved', `Task "${task.title}"`);
      
      task.assigneeIds.forEach(assigneeId => {
          const assignee = users.find(u => u.id === assigneeId);
          if (assignee?.email) {
              createAndSendNotification(
                  assignee.email,
                  `Task Approved: ${task.title}`,
                  'Your submitted task has been approved',
                  { Title: task.title, 'Approved By': user.name },
                  `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
                  'View Task'
              );
          }
      });
    }

    update(ref(rtdb), updates);
  }, [user, tasks, users, addActivityLog, addComment]);

  const returnTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);
    
    const updates: { [key: string]: any } = {};
    updates[`tasks/${taskId}/status`] = task.previousStatus || 'In Progress';
    updates[`tasks/${taskId}/approvalState`] = 'returned';
    updates[`tasks/${taskId}/viewedBy`] = { [user.id]: true };
    updates[`tasks/${taskId}/lastUpdated`] = new Date().toISOString();

    // Revert subtask statuses
    const newSubtasks = { ...task.subtasks };
    for (const subtask of Object.values(newSubtasks)) {
        if (subtask.status === 'Done') {
            subtask.status = 'In Progress';
        }
    }
    updates[`tasks/${taskId}/subtasks`] = newSubtasks;

    if (task.pendingAssigneeId) {
        updates[`tasks/${taskId}/pendingAssigneeId`] = null; // Clear the pending reassignment
    }

    addActivityLog(user.id, 'Task Request Returned', `Task: "${task.title}"`);
    update(ref(rtdb), updates);

    task.assigneeIds.forEach(assigneeId => {
        const assignee = users.find(u => u.id === assigneeId);
        if (assignee?.email) {
            createAndSendNotification(
                assignee.email,
                `Task Returned: ${task.title}`,
                'A task has been returned to you',
                { Title: task.title, 'Returned By': user.name, Comment: commentText },
                `${process.env.NEXT_PUBLIC_APP_URL}/tasks`,
                'View Task'
            );
        }
    });

  }, [user, tasks, users, addActivityLog, addComment]);
  
  const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);
    
    const updates: Partial<Task> = {
      status: 'Pending Approval',
      approvalState: 'pending',
      previousStatus: task.status,
      pendingAssigneeId: newAssigneeId,
      approverId: task.creatorId,
      viewedBy: { [user.id]: true },
      lastUpdated: new Date().toISOString(),
    };
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Reassignment Requested', `Task "${task.title}" to ${users.find(u => u.id === newAssigneeId)?.name}`);
  }, [user, tasks, users, addActivityLog, addComment]);

  const markTaskAsViewed = useCallback((taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
  
    const currentViewedBy = task.viewedBy || {};
    if (!currentViewedBy[user.id]) {
      update(ref(rtdb, `tasks/${taskId}/viewedBy`), { ...currentViewedBy, [user.id]: true });
    }
  }, [user, tasks]);
  
  const acknowledgeReturnedTask = useCallback((taskId: string) => {
    update(ref(rtdb, `tasks/${taskId}`), { approvalState: 'none' });
  }, []);

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    update(ref(rtdb, `tasks/${taskId}`), { status: newStatus });
  }, []);

  const submitTaskForApproval = useCallback((taskId: string) => {
    update(ref(rtdb, `tasks/${taskId}`), { status: 'Pending Approval' });
  }, []);

  const approveTask = useCallback((taskId: string, comment?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if(task && user) {
        if(comment) addComment(taskId, comment);
        update(ref(rtdb, `tasks/${taskId}`), { status: 'Done' });
    }
  }, [tasks, user, addComment]);

  const returnTask = useCallback((taskId: string, comment: string) => {
    const task = tasks.find(t => t.id === taskId);
    if(task && user) {
        addComment(taskId, comment);
        update(ref(rtdb, `tasks/${taskId}`), { status: 'In Progress' });
    }
  }, [tasks, user, addComment]);

  const getExpandedPlannerEvents = useCallback((month: Date, userId: string) => {
    const userEvents = plannerEvents.filter(event => event.userId === userId);
    if (!userEvents.length) return [];
  
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  
    const matchingEvents: (PlannerEvent & { eventDate: Date })[] = [];
  
    daysInMonth.forEach(dayInMonth => {
      userEvents.forEach(event => {
        const eventStartDate = startOfDay(new Date(event.date));
        
        if (isAfter(eventStartDate, dayInMonth)) {
          return;
        }
  
        let shouldAdd = false;
        switch (event.frequency) {
          case 'once':
            if (isSameDay(dayInMonth, eventStartDate)) shouldAdd = true;
            break;
          case 'daily':
            shouldAdd = true;
            break;
          case 'daily-except-sundays':
            if (!isSunday(dayInMonth)) shouldAdd = true;
            break;
          case 'weekly':
            if (getDay(dayInMonth) === getDay(eventStartDate)) shouldAdd = true;
            break;
          case 'weekends':
            if (isSaturday(dayInMonth) || isSunday(dayInMonth)) shouldAdd = true;
            break;
          case 'monthly':
            if (getDate(dayInMonth) === getDate(eventStartDate)) shouldAdd = true;
            break;
        }
  
        if (shouldAdd) {
          matchingEvents.push({ ...event, eventDate: dayInMonth });
        }
      });
    });
  
    return matchingEvents;
  }, [plannerEvents]);
  

  const addPlannerEvent = useCallback((eventData: Omit<PlannerEvent, 'id' | 'comments'>) => {
    if (user) {
        const newEventRef = push(ref(rtdb, 'plannerEvents'));
        set(newEventRef, eventData);
        addActivityLog(user.id, 'Planner Event Added', `Added event: ${eventData.title}`);
        
        const eventForUser = users.find(u => u.id === eventData.userId);
        if(eventForUser && eventForUser.email && eventForUser.id !== user.id) {
            createAndSendNotification(
                eventForUser.email,
                `New Event Added to Your Planner: ${eventData.title}`,
                'New Planner Event',
                {
                    'Title': eventData.title,
                    'Date': format(parseISO(eventData.date), 'PPP'),
                    'Frequency': eventData.frequency,
                    'Created By': user.name,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/schedule`,
                'View Planner'
            );
        }
    }
  }, [user, users, addActivityLog]);
  
  const updatePlannerEvent = useCallback((updatedEvent: PlannerEvent) => {
    if (user) {
        const { id, ...data } = updatedEvent;
        update(ref(rtdb, `plannerEvents/${id}`), data);
        addActivityLog(user.id, 'Planner Event Updated', `Updated event: ${updatedEvent.title}`);
    }
  }, [user, addActivityLog]);

  const deletePlannerEvent = useCallback((eventId: string) => {
    if (user) {
        const event = plannerEvents.find(e => e.id === eventId);
        remove(ref(rtdb, `plannerEvents/${eventId}`));
        if (event) addActivityLog(user.id, 'Planner Event Deleted', `Deleted event: ${event.title}`);
    }
  }, [user, plannerEvents, addActivityLog]);
  
  const addPlannerEventComment = useCallback((eventId: string, text: string) => {
    if(user) {
        const newCommentRef = push(ref(rtdb, `plannerEvents/${eventId}/comments`));
        const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: new Date().toISOString() };
        set(newCommentRef, newComment);
    }
  }, [user]);

  const addDailyPlannerComment = useCallback((plannerUserId: string, day: Date, text: string) => {
    if (!user) return;
    const dayKey = `${format(day, 'yyyy-MM-dd')}_${plannerUserId}`;
    const commentId = push(ref(rtdb)).key;
    if (!commentId) return;
  
    const newComment: Comment = { id: commentId, userId: user.id, text, date: new Date().toISOString() };
    const updates: { [key: string]: any } = {};
    const basePath = `dailyPlannerComments/${dayKey}`;
    
    updates[`${basePath}/comments/${commentId}`] = newComment;
    updates[`${basePath}/lastUpdated`] = new Date().toISOString();
    
    updates[`${basePath}/viewedBy`] = { [user.id]: true };
  
    const existingEntry = dailyPlannerComments.find(dpc => dpc.id === dayKey);
    if (!existingEntry) {
      updates[`${basePath}/plannerUserId`] = plannerUserId;
      updates[`${basePath}/day`] = format(day, 'yyyy-MM-dd');
    }
  
    update(ref(rtdb), updates);

    const plannerUser = users.find(u => u.id === plannerUserId);
    if(plannerUser && plannerUser.email && plannerUser.id !== user.id) {
        createAndSendNotification(
            plannerUser.email,
            `New comment on your planner for ${format(day, 'PPP')}`,
            'New Planner Comment',
            {
                'Date': format(day, 'PPP'),
                'Comment By': user.name,
                'Comment': text
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/schedule`,
            'View Planner'
        );
    }

  }, [user, dailyPlannerComments, users]);


  const markPlannerCommentsAsRead = useCallback((plannerUserId: string, day: Date) => {
    if (!user) return;
    const dayKey = `${format(day, 'yyyy-MM-dd')}_${plannerUserId}`;
    const dayRef = ref(rtdb, `dailyPlannerComments/${dayKey}`);
    const currentViewedBy = dailyPlannerComments.find(dpc => dpc.id === dayKey)?.viewedBy || {};
    if (!currentViewedBy[user.id]) {
      update(dayRef, { viewedBy: { ...currentViewedBy, [user.id]: true } });
    }
  }, [user, dailyPlannerComments]);

  const updateDailyPlannerComment = useCallback((commentId: string, dayKey: string, newText: string) => {
    const commentRef = ref(rtdb, `dailyPlannerComments/${dayKey}/comments/${commentId}`);
    update(commentRef, { text: newText });
  }, []);

  const deleteDailyPlannerComment = useCallback((commentId: string, dayKey: string) => {
    const commentRef = ref(rtdb, `dailyPlannerComments/${dayKey}/comments/${commentId}`);
    remove(commentRef);
  }, []);
  
  const deleteAllDailyPlannerComments = useCallback((dayKey: string) => {
    remove(ref(rtdb, `dailyPlannerComments/${dayKey}`));
  }, []);

  const awardManualAchievement = useCallback((achievementData: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => {
    if (!user) return;
    if (!can.manage_achievements) return;

    const newAchRef = push(ref(rtdb, 'achievements'));
    const newAchievement: Omit<Achievement, 'id'> = { ...achievementData, date: new Date().toISOString(), type: 'manual', status: 'approved', awardedById: user.id };
    set(newAchRef, newAchievement);
    addActivityLog(user.id, 'Achievement Awarded', `Awarded "${achievementData.title}"`);

    const awardedUser = users.find(u => u.id === achievementData.userId);
    if (awardedUser) {
      const newAnnouncement: Partial<Announcement> = {
          title: `New Achievement: ${newAchievement.title}!`,
          content: `Congratulations to ${awardedUser.name} for receiving the "${newAchievement.title}" award for: ${newAchievement.description}.`,
          creatorId: user.id,
          approverId: user.id,
          status: 'approved',
          createdAt: new Date().toISOString(),
          comments: [],
          notifyAll: true,
      };
      addAnnouncement(newAnnouncement);
    }
  }, [user, users, can.manage_achievements, addActivityLog]);

  const updateManualAchievement = useCallback((updatedAchievement: Achievement) => {
    if (user && can.manage_achievements) {
        const { id, ...data } = updatedAchievement;
        update(ref(rtdb, `achievements/${id}`), data);
        addActivityLog(user.id, 'Achievement Updated', `Updated "${updatedAchievement.title}"`);
    }
  }, [user, can.manage_achievements, addActivityLog]);

  const deleteManualAchievement = useCallback((achievementId: string) => {
    if (user && can.manage_achievements) {
        const ach = achievements.find(a => a.id === achievementId);
        remove(ref(rtdb, `achievements/${achievementId}`));
        if (ach) addActivityLog(user.id, 'Achievement Deleted', `Deleted "${ach.title}"`);
    }
  }, [user, can.manage_achievements, achievements, addActivityLog]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar'>) => {
    const usersRef = ref(rtdb, 'users');
    const newUserRef = push(usersRef);
    const dataToSave: any = { ...userData };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
        dataToSave.supervisorId = null;
    }
    set(newUserRef, { ...dataToSave, avatar: `https://placehold.co/100x100.png` });
    addActivityLog(user?.id || 'system', 'User Added', `Added new user: ${userData.name}`);
  }, [user, addActivityLog]);
  
  const updateUserPlanningScore = useCallback((userId: string, score: number) => {
    update(ref(rtdb, `users/${userId}`), { planningScore: score });
    addActivityLog(user?.id || 'system', 'Planning Score Updated', `Updated score for user ID ${userId}`);
  }, [user, addActivityLog]);

  const deleteUser = useCallback((userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    remove(ref(rtdb, `users/${userId}`));
    if (userToDelete) {
      addActivityLog(user?.id || 'system', 'User Deleted', `Deleted user: ${userToDelete.name}`);
    }
  }, [user, users, addActivityLog]);

  const addRole = useCallback((newRole: Omit<RoleDefinition, 'id'| 'isEditable'>) => {
    const rolesRef = ref(rtdb, 'roles');
    const newRoleRef = push(rolesRef);
    set(newRoleRef, { ...newRole, isEditable: true });
    addActivityLog(user?.id || 'system', 'Role Added', `Added new role: ${newRole.name}`);
  }, [user, addActivityLog]);

  const updateRole = useCallback((updatedRole: RoleDefinition) => {
    const { id, ...data } = updatedRole;
    update(ref(rtdb, `roles/${id}`), data);
    addActivityLog(user?.id || 'system', 'Role Updated', `Updated role: ${updatedRole.name}`);
  }, [user, addActivityLog]);

  const deleteRole = useCallback((roleId: string) => {
    const roleToDelete = roles.find(r => r.id === roleId);
    remove(ref(rtdb, `roles/${roleId}`));
    if (roleToDelete) {
      addActivityLog(user?.id || 'system', 'Role Deleted', `Deleted role: ${roleToDelete.name}`);
    }
  }, [user, roles, addActivityLog]);

  const addProject = useCallback((projectName: string) => {
    const projectsRef = ref(rtdb, 'projects');
    const newProjectRef = push(projectsRef);
    set(newProjectRef, { name: projectName });
    addActivityLog(user?.id || 'system', 'Project Added', `Added: ${projectName}`);
  }, [user, addActivityLog]);
  
  const addJobRecordPlant = useCallback((plantName: string) => {
    const newRef = push(ref(rtdb, 'jobRecordPlants'));
    set(newRef, { name: plantName, id: newRef.key });
    addActivityLog(user?.id || 'system', 'Job Record Plant Added', `Added: ${plantName}`);
  }, [user, addActivityLog]);

  const deleteJobRecordPlant = useCallback((plantId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `jobRecordPlants/${plantId}`));
    addActivityLog(user.id, 'Job Record Plant Deleted', `ID: ${plantId}`);
  }, [user, addActivityLog]);

  const addJobCode = useCallback((jobCode: Omit<JobCode, 'id'>) => {
    if(!user || user.role !== 'Admin') return;
    const newRef = push(ref(rtdb, 'jobCodes'));
    set(newRef, { ...jobCode, id: newRef.key });
    addActivityLog(user.id, 'Job Code Added', `Code: ${jobCode.code}`);
  }, [user, addActivityLog]);

  const updateJobCode = useCallback((jobCode: JobCode) => {
    if(!user || user.role !== 'Admin') return;
    const { id, ...data } = jobCode;
    update(ref(rtdb, `jobCodes/${id}`), data);
    addActivityLog(user.id, 'Job Code Updated', `Code: ${jobCode.code}`);
  }, [user, addActivityLog]);

  const deleteJobCode = useCallback((jobCodeId: string) => {
    if(!user || user.role !== 'Admin') return;
    const code = jobCodes.find(jc => jc.id === jobCodeId);
    remove(ref(rtdb, `jobCodes/${jobCodeId}`));
    if(code) addActivityLog(user.id, 'Job Code Deleted', `Code: ${code.code}`);
  }, [user, jobCodes, addActivityLog]);

  const updateProject = useCallback((updatedProject: Project) => {
    const { id, ...data } = updatedProject;
    update(ref(rtdb, `projects/${id}`), data);
    addActivityLog(user?.id || 'system', 'Project Updated', `Updated project: ${updatedProject.name}`);
  }, [user, addActivityLog]);

  const deleteProject = useCallback((projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    remove(ref(rtdb, `projects/${projectId}`));
    if (projectToDelete) {
      addActivityLog(user?.id || 'system', 'Project Deleted', `Deleted project: ${projectToDelete.name}`);
    }
  }, [user, projects, addActivityLog]);

  const addVehicle = useCallback((vehicle: Omit<Vehicle, 'id'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'vehicles'));
    set(newRef, vehicle);
    addActivityLog(user.id, 'Vehicle Added', vehicle.vehicleNumber);
  }, [user, addActivityLog]);

  const updateVehicle = useCallback((updatedVehicle: Vehicle) => {
    if(!user) return;
    const { id, ...data } = updatedVehicle;
    // Clean undefined values before updating
    const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
    );
    update(ref(rtdb, `vehicles/${id}`), cleanData);
    addActivityLog(user.id, 'Vehicle Updated', updatedVehicle.vehicleNumber);
  }, [user, addActivityLog]);

  const deleteVehicle = useCallback((vehicleId: string) => {
    if(!user) return;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    remove(ref(rtdb, `vehicles/${vehicleId}`));
    if (vehicle) addActivityLog(user.id, 'Vehicle Deleted', vehicle.vehicleNumber);
  }, [user, vehicles, addActivityLog]);
  
  const addDriver = useCallback((driver: Omit<Driver, 'id' | 'photo'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'drivers'));
    const cleanDriver = Object.fromEntries(Object.entries(driver).filter(([_, v]) => v !== undefined && v !== ''));
    set(newRef, { ...cleanDriver, photo: `https://placehold.co/100x100.png` });
    addActivityLog(user.id, 'Driver Added', driver.name);
  }, [user, addActivityLog]);

  const updateDriver = useCallback((updatedDriver: Driver) => {
    if(!user) return;
    const { id, ...data } = updatedDriver;
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined && v !== ''));
    update(ref(rtdb, `drivers/${id}`), cleanData);
    addActivityLog(user.id, 'Driver Updated', updatedDriver.name);
  }, [user, addActivityLog]);

  const deleteDriver = useCallback((driverId: string) => {
    if(!user) return;
    const driver = drivers.find(d => d.id === driverId);
    remove(ref(rtdb, `drivers/${driverId}`));
    if (driver) addActivityLog(user.id, 'Driver Deleted', driver.name);
  }, [user, drivers, addActivityLog]);

  const addIncidentReport = useCallback((incidentData: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if (!user) return;
    
    // Find all users with roles that should be notified
    const rolesToNotify: Role[] = ['Admin', 'HSE', 'Project Coordinator', 'Manager'];
    const hseAndAdminIds = users
        .filter(u => rolesToNotify.includes(u.role))
        .map(u => u.id);

    const supervisorId = user.supervisorId;

    const reportedToUserIds = Array.from(new Set([
        ...hseAndAdminIds,
        supervisorId,
    ].filter(Boolean) as string[]));

    const newRef = push(ref(rtdb, 'incidentReports'));
    const newIncident: Omit<IncidentReport, 'id'> = {
        ...incidentData,
        reporterId: user.id,
        reportTime: new Date().toISOString(),
        status: 'New',
        isPublished: false,
        reportedToUserIds,
        comments: [],
        lastUpdated: new Date().toISOString(),
        viewedBy: { [user.id]: true }
    };
    set(newRef, newIncident);
    addActivityLog(user.id, 'Incident Reported', `Incident in ${incidentData.unitArea}`);

    const notifiedUsers = users.filter(u => reportedToUserIds.includes(u.id));
    notifiedUsers.forEach(recipient => {
        if(recipient.email) {
            createAndSendNotification(
                recipient.email,
                `New Incident Report: ${incidentData.unitArea}`,
                `New Incident Reported by ${user.name}`,
                {
                    'Project': projects.find(p => p.id === incidentData.projectId)?.name || 'N/A',
                    'Area': incidentData.unitArea,
                    'Details': incidentData.incidentDetails,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/incident-reporting`,
                'View Incident'
            );
        }
    });

}, [user, users, addActivityLog, projects]);

  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
    if(!user) return;
    const { id, ...data } = incident;
    const updates: Partial<typeof data> = data;
    
    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(incident.comments) ? incident.comments : (incident.comments ? Object.values(incident.comments) : []);
    
    updates.comments = [...existingComments, newComment];
    updates.lastUpdated = new Date().toISOString();
    updates.viewedBy = { [user.id]: true };

    update(ref(rtdb, `incidentReports/${id}`), updates);
    addActivityLog(user.id, 'Incident Updated', `Updated incident: ${id}`);
  }, [user, addActivityLog]);

  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;

    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text, date: new Date().toISOString() };
    const existingComments = Array.isArray(incident.comments) ? incident.comments : (incident.comments ? Object.values(incident.comments) : []);

    const updates: Partial<IncidentReport> = {
        comments: [...existingComments, newComment],
        lastUpdated: new Date().toISOString(),
        viewedBy: { [user.id]: true },
    };
    
    update(ref(rtdb, `incidentReports/${incidentId}`), updates);

    const participants = users.filter(u => incident.reportedToUserIds.includes(u.id) && u.id !== user.id);
    participants.forEach(recipient => {
        if (recipient.email) {
            createAndSendNotification(
                recipient.email,
                `Update on Incident: ${incident.unitArea}`,
                `New Comment on Incident Report`,
                {
                    'Project': projects.find(p => p.id === incident.projectId)?.name || 'N/A',
                    'Comment By': user.name,
                    'Comment': text,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/incident-reporting`,
                'View Incident'
            );
        }
    });

  }, [user, incidentReports, users, projects]);

  const publishIncident = useCallback((incidentId: string, comment: string) => {
    if(!user || user.role !== 'Admin') return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if(incident) {
      updateIncident(incident, comment);
      update(ref(rtdb, `incidentReports/${incidentId}`), { isPublished: true });
      addActivityLog(user.id, 'Incident Published', `Incident ID: ${incidentId}`);
    }
  }, [user, incidentReports, addActivityLog, updateIncident]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;
    updateIncident(incident, comment);
    
    const updatedUserIds = Array.from(new Set([...(incident.reportedToUserIds || []), ...userIds]));
    update(ref(rtdb, `incidentReports/${incidentId}`), { reportedToUserIds: updatedUserIds });
    addActivityLog(user.id, 'Users Added to Incident', `Added ${userIds.length} users to incident ${incidentId}`);
  }, [user, incidentReports, updateIncident, addActivityLog]);

  const markIncidentAsViewed = useCallback((incidentId: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;

    const currentViewedBy = incident.viewedBy || {};
    if (!currentViewedBy[user.id]) {
      update(ref(rtdb, `incidentReports/${incidentId}/viewedBy`), { ...currentViewedBy, [user.id]: true });
    }
  }, [user, incidentReports]);
  
  const addManpowerLog = useCallback(async (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string }, logDate: Date = new Date()) => {
    if (!user) return;
    const dateStr = format(logDate, 'yyyy-MM-dd');
    
    // Find the latest log for this project on any previous day to get starting total
    const previousLogs = manpowerLogs
        .filter(l => l.projectId === logData.projectId && isBefore(parseISO(l.date), startOfDay(logDate)))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const yesterdayCount = previousLogs[0]?.total || 0;
    
    // Find if a log already exists for today
    const todayLog = manpowerLogs.find(l => l.date === dateStr && l.projectId === logData.projectId);
    
    const countIn = logData.countIn || 0;
    const countOut = logData.countOut || 0;
    const countOnLeave = logData.countOnLeave || 0;
    const total = yesterdayCount + countIn - countOut;
    
    const logEntry: Omit<ManpowerLog, 'id'> = {
      projectId: logData.projectId,
      date: dateStr,
      countIn,
      personInName: logData.personInName || '',
      countOut,
      personOutName: logData.personOutName || '',
      countOnLeave: countOnLeave,
      personOnLeaveName: logData.personOnLeaveName || '',
      reason: logData.reason || 'Daily Update',
      updatedBy: user.id,
      yesterdayCount: yesterdayCount,
      total: total,
    };
    
    const logId = todayLog ? todayLog.id : push(ref(rtdb)).key;
    if (!logId) return;

    await set(ref(rtdb, `manpowerLogs/${logId}`), logEntry);
    addActivityLog(user.id, 'Manpower Logged', `Project: ${logData.projectId}, Total: ${total}`);

    const rolesToNotify: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
    const usersToNotify = users.filter(u => rolesToNotify.includes(u.role));
    usersToNotify.forEach(u => {
        if(u.email) {
            createAndSendNotification(
                u.email,
                `Manpower Log Update for ${projects.find(p => p.id === logData.projectId)?.name}`,
                'Manpower Log Updated',
                {
                    'Project': projects.find(p => p.id === logData.projectId)?.name || 'N/A',
                    'In': countIn,
                    'Out': countOut,
                    'On Leave': countOnLeave,
                    'New Total': total,
                    'Updated By': user.name,
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/manpower`,
                'View Manpower Logs'
            );
        }
    });

  }, [user, users, projects, manpowerLogs, addActivityLog]);

  const updateManpowerLog = useCallback(async (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName'>>) => {
      if(!user) return;
      const log = manpowerLogs.find(l => l.id === logId);
      if(!log) return;
      
      const updatedData = { ...log, ...data, updatedBy: user.id };
      const total = updatedData.yesterdayCount + updatedData.countIn - updatedData.countOut;
      updatedData.total = total;

      await update(ref(rtdb, `manpowerLogs/${logId}`), updatedData);
      addActivityLog(user.id, 'Manpower Log Updated', `Log ID: ${logId}`);
  }, [user, manpowerLogs, addActivityLog]);

  const addManpowerProfile = useCallback(async (profile: Omit<ManpowerProfile, 'id'>) => {
    const newRef = push(ref(rtdb, 'manpowerProfiles'));
    await set(newRef, { ...profile, id: newRef.key });
    if(user) addActivityLog(user.id, 'Manpower Profile Added', profile.name);
  }, [user, addActivityLog]);
  
  const addMultipleManpowerProfiles = useCallback((profilesData: any[]): number => {
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    profilesData.forEach((p, index) => {
        if (!Array.isArray(p) || p.length < 13) {
            console.warn(`Skipping row ${index + 2}: insufficient data.`);
            return;
        }
        
        const hardCopyFileNo = p[19]?.toString().trim();
        if (!hardCopyFileNo) {
            console.warn(`Skipping row ${index + 2}: Hard Copy File No. is required for import.`);
            return;
        }

        const existingProfile = manpowerProfiles.find(mp => mp.hardCopyFileNo === hardCopyFileNo);

        const parseExcelDate = (date: any): string | null => {
            if (!date) return null;
            if (date instanceof Date && isValid(date)) {
                return date.toISOString();
            }
            if (typeof date === 'string') {
                const parsed = parse(date, 'yyyy-MM-dd', new Date());
                if (isValid(parsed)) return parsed.toISOString();
                const parsed2 = parseISO(date);
                if (isValid(parsed2)) return parsed2.toISOString();
            }
            return null;
        };
        
        const profileData: Partial<ManpowerProfile> = {
            name: p[0] || 'No Name Provided',
            mobileNumber: p[1]?.toString() || '',
            gender: p[2],
            workOrderNumber: p[3]?.toString(),
            labourLicenseNo: p[4]?.toString(),
            eic: p[5]?.toString(),
            workOrderExpiryDate: parseExcelDate(p[6]),
            labourLicenseExpiryDate: parseExcelDate(p[7]),
            joiningDate: parseExcelDate(p[8]),
            epNumber: p[9]?.toString(),
            aadharNumber: p[10]?.toString(),
            dob: parseExcelDate(p[11]),
            uanNumber: p[12]?.toString(),
            wcPolicyNumber: p[13]?.toString(),
            wcPolicyExpiryDate: parseExcelDate(p[14]),
            cardCategory: p[15]?.toString(),
            cardType: p[16]?.toString(),
            hardCopyFileNo: hardCopyFileNo,
            status: 'Working',
            trade: 'Others',
            documents: [],
        };

        const profileId = existingProfile ? existingProfile.id : push(ref(rtdb)).key;
        if (!profileId) return;

        const finalData = existingProfile 
            ? { ...existingProfile, ...profileData }
            : profileData;
        
        Object.keys(finalData).forEach(key => {
            if (finalData[key as keyof typeof finalData] === undefined) {
                finalData[key as keyof typeof finalData] = null;
            }
        });

        updates[`manpowerProfiles/${profileId}`] = finalData;
        importedCount++;
    });

    if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
        if (user) addActivityLog(user.id, 'Bulk Manpower Import', `Imported/updated ${importedCount} profiles.`);
    }
    
    return importedCount;
}, [user, manpowerProfiles, addActivityLog]);

  const updateManpowerProfile = useCallback(async (profile: ManpowerProfile) => {
    const { id, ...data } = profile;
    const cleanData: {[key:string]: any} = {};
  
    for (const key in data) {
      const value = data[key as keyof typeof data];
      if (value instanceof Date) {
        cleanData[key] = value.toISOString();
      } else if (value !== undefined) {
        cleanData[key] = value;
      } else {
        cleanData[key] = null;
      }
    }
  
    await update(ref(rtdb, `manpowerProfiles/${id}`), cleanData);
    if (user) addActivityLog(user.id, 'Manpower Profile Updated', profile.name);
  }, [user, addActivityLog]);

  const deleteManpowerProfile = useCallback((profileId: string) => {
    const profile = manpowerProfiles.find(p => p.id === profileId);
    if (profile) {
      remove(ref(rtdb, `manpowerProfiles/${profileId}`));
      if(user) addActivityLog(user.id, 'Manpower Profile Deleted', profile.name);
    }
  }, [user, manpowerProfiles, addActivityLog]);
  
  const addLeaveForManpower = useCallback((manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => {
    const updates: { [key: string]: any } = {};
    manpowerIds.forEach(id => {
        const leaveRecord: Omit<LeaveRecord, 'id'> = {
            leaveType,
            leaveStartDate: startDate.toISOString(),
            plannedEndDate: endDate.toISOString(),
            remarks,
        };
        const newRef = push(ref(rtdb, `manpowerProfiles/${id}/leaveHistory`));
        updates[`manpowerProfiles/${id}/leaveHistory/${newRef.key}`] = { ...leaveRecord, id: newRef.key };
    });
    update(ref(rtdb), updates);
  }, []);
  
  const extendLeave = useCallback((manpowerId: string, leaveId: string, newEndDate: Date) => {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`), {
          plannedEndDate: newEndDate.toISOString()
      });
  }, []);

  const rejoinFromLeave = useCallback((manpowerId: string, leaveId: string, rejoinedDate: Date) => {
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile) return;

    // Firebase stores array-like objects, so we may need to find the correct key
    const leaveKey = profile.leaveHistory ? Object.keys(profile.leaveHistory).find(key => profile.leaveHistory![key].id === leaveId) : undefined;
    
    if (!leaveKey) {
        console.error(`Could not find leave with ID ${leaveId} for user ${manpowerId}`);
        return;
    }
    
    const updates: { [key: string]: any } = {};
    updates[`/manpowerProfiles/${manpowerId}/status`] = 'Working';
    updates[`/manpowerProfiles/${manpowerId}/leaveHistory/${leaveKey}/rejoinedDate`] = rejoinedDate.toISOString();
    updates[`/manpowerProfiles/${manpowerId}/leaveHistory/${leaveKey}/leaveEndDate`] = rejoinedDate.toISOString();
    
    update(ref(rtdb), updates);
}, [manpowerProfiles]);

  
  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    const updates: { [key: string]: any } = {};
    updates[`manpowerProfiles/${manpowerId}/status`] = 'On Leave';
    update(ref(rtdb), updates);
  }, []);
  
  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;
    
    const leaveKey = Object.keys(profile.leaveHistory).find(key => profile.leaveHistory![key].id === leaveId);
    if (leaveKey) {
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveKey}`));
    }
  }, [manpowerProfiles]);
  
  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;
    const leaveKey = Object.keys(profile.leaveHistory).find(key => profile.leaveHistory![key].id === leaveRecord.id);
    if(leaveKey) {
      update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveKey}`), leaveRecord);
    }
  }, [user, manpowerProfiles]);
  
  const deleteLeaveRecord = useCallback((manpowerId: string, leaveId: string) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;
    
    const leaveKey = Object.keys(profile.leaveHistory).find(key => profile.leaveHistory![key]?.id === leaveId);

    if (leaveKey) {
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveKey}`));
    }
  }, [user, manpowerProfiles]);

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
    if (!user) return;
    const newRecordRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory`));
    const newRecordWithId = { ...record, id: newRecordRef.key! };
    set(newRecordRef, newRecordWithId);
  }, [user]);
  
  const updatePpeHistoryRecord = useCallback((manpowerId: string, record: PpeHistoryRecord) => {
    if (!user || user.role !== 'Admin') return;
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${record.id}`), record);
  }, [user]);

  const deletePpeHistoryRecord = useCallback(async (manpowerId: string, recordId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${recordId}`));
  }, [user]);
  
  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'internalRequests'));
    const newRequest: Omit<InternalRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: [{ id: `comm-init`, text: 'Request Created', userId: user.id, date: new Date().toISOString() }],
        viewedByRequester: true,
        acknowledgedByRequester: false,
    };
    set(newRequestRef, newRequest);
    addActivityLog(user.id, 'Internal Store Request Created');
    
    const storeApproverRoles = roles.filter(r => r.permissions?.includes('approve_store_requests')).map(r => r.name);
    const approvers = users.filter(u => storeApproverRoles.includes(u.role));
    approvers.forEach(approver => {
        if(approver.email) {
            createAndSendNotification(
                approver.email,
                `New Internal Store Request from ${user.name}`,
                'New Internal Store Request for Approval',
                {
                    'Requested By': user.name,
                    'Items': requestData.items.map(i => `${i.quantity} ${i.unit} of ${i.description}`).join(', '),
                },
                `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
                'Review Request'
            );
        }
    });

  }, [user, roles, users, addActivityLog]);
  
  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if(!user) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const commentText = `Status changed to ${status}. Comment: ${comment}`;
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/status`] = status;
    updates[`internalRequests/${requestId}/approverId`] = user.id;
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    if (status === 'Approved' || status === 'Issued' || status === 'Rejected') {
        const updatedItems = request.items.map(item => ({ ...item, status }));
        updates[`internalRequests/${requestId}/items`] = updatedItems;
    }

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Store Request Status Updated', `Request ID: ${requestId} to ${status}`);

    const requester = users.find(u => u.id === request.requesterId);
    if (requester && requester.email) {
        createAndSendNotification(
            requester.email,
            `Update on your Internal Store Request #${requestId.slice(-6)}`,
            `Your request status is now: ${status}`,
            {
                'Request ID': `#${requestId.slice(-6)}`,
                'Updated By': user.name,
                'Comment': comment,
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
            'View Request'
        );
    }
  }, [user, internalRequests, users, addActivityLog]);

  const deleteInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    const requestToDelete = internalRequests.find(r => r.id === requestId);
    if (!requestToDelete) {
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not find the request to delete." });
        return;
    }
    const canDelete = user.role === 'Admin' || (user.id === requestToDelete.requesterId && requestToDelete.status === 'Pending');
    if (!canDelete) {
        toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to delete this request." });
        return;
    }
    remove(ref(rtdb, `internalRequests/${requestId}`))
        .then(() => {
            toast({ title: 'Request Deleted' });
            addActivityLog(user.id, 'Internal Request Deleted', `ID: ${requestId}`);
        })
        .catch((error) => {
            toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
        });
  }, [user, internalRequests, addActivityLog, toast]);
  
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
    const commentText = `Status changed to ${status}. Comment: ${comment}`;
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
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
            },
            `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`,
            'View Request'
        );
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
    const newRequest: Omit<PpeRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: [{ id: `comm-init`, text: 'PPE Request Created', userId: user.id, date: new Date().toISOString() }],
        viewedByRequester: true,
    };
    set(newRequestRef, newRequest);
    
    const employee = manpowerProfiles.find(p => p.id === requestData.manpowerId);
    const employeeName = employee?.name || 'Unknown Employee';
    
    addActivityLog(user.id, 'PPE Request Created', `Requested ${requestData.ppeType} for ${employeeName}`);
    
    const ppeHistoryArray = Array.isArray(employee?.ppeHistory) ? employee.ppeHistory : Object.values(employee?.ppeHistory || {});
    const lastIssue = ppeHistoryArray
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
    update(ref(rtdb, `ppeRequests/${id}`), data);
    addActivityLog(user.id, 'PPE Request Updated', `Request ID: ${id}`);
  }, [user, addActivityLog]);

  const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
    const commentText = `Status changed to ${status}. Comment: ${comment}`;
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };

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
            if (stock && stock.sizes) {
                const currentSizeQty = stock.sizes[request.size] || 0;
                updates[`ppeStock/coveralls/sizes/${request.size}`] = Math.max(0, currentSizeQty - (request.quantity || 1));
            }
        } else {
            const stock = ppeStock.find(s => s.id === 'safetyShoes');
            if (stock) {
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
            }, `${process.env.NEXT_PUBLIC_APP_URL}/my-requests`, 'View Request')
    }
  }, [user, ppeRequests, ppeStock, addActivityLog, users, manpowerProfiles]);
  
  const deletePpeRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `ppeRequests/${requestId}`));
    addActivityLog(user.id, 'PPE Request Deleted', `ID: ${requestId}`);
  }, [user, addActivityLog]);

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
    set(newRef, { ...itemData, lastUpdated: new Date().toISOString() });
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
            if (typeof date === 'string') {
                const parsed = parse(date, 'yyyy-MM-dd', new Date());
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
    const { id, ...data } = item;
    update(ref(rtdb, `inventoryItems/${id}`), { ...data, lastUpdated: new Date().toISOString() });
    if(user) addActivityLog(user.id, 'Inventory Item Updated', item.name);
  }, [user, addActivityLog]);

  const deleteInventoryItem = useCallback((itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    remove(ref(rtdb, `inventoryItems/${itemId}`));
    if(user && item) addActivityLog(user.id, 'Inventory Item Deleted', item.name);
  }, [user, inventoryItems, addActivityLog]);

  const deleteInventoryItemGroup = useCallback((itemName: string) => {
    if (!user || user.role !== 'Admin') return;
    const updates: { [key: string]: null } = {};
    const itemsToDelete = inventoryItems.filter(item => item.name === itemName);
    itemsToDelete.forEach(item => {
        updates[`inventoryItems/${item.id}`] = null;
    });
    update(ref(rtdb), updates);
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
        comments: [{id: 'comm-init', userId: user.id, text: `Request for ${requestData.requestType} submitted. Reason: ${requestData.remarks || 'N/A'}`, date: new Date().toISOString()}],
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
    const requestsToMark = certificateRequests.filter(req => {
        const isMyFulfilled = req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester;
        if (!isMyFulfilled) return false;
        if (requestType === 'store') return !!req.itemId;
        if (requestType === 'equipment') return !!req.utMachineId || !!req.dftMachineId;
        return false;
    });
    requestsToMark.forEach(req => {
        updates[`certificateRequests/${req.id}/viewedByRequester`] = true;
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
    set(newRef, machine);
    addActivityLog(user.id, 'UT Machine Added', machine.machineName);
  }, [user, addActivityLog]);

  const updateUTMachine = useCallback((machine: UTMachine) => {
    if(!user) return;
    const { id, ...data } = machine;
    update(ref(rtdb, `utMachines/${id}`), data);
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
    set(newRef, machine);
    addActivityLog(user.id, 'DFT Machine Added', machine.machineName);
  }, [user, addActivityLog]);
  
  const updateDftMachine = useCallback((machine: DftMachine) => {
    if(!user) return;
    const { id, ...data } = machine;
    update(ref(rtdb, `dftMachines/${id}`), data);
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
  }, [user, users, projects, vehicles, manpowerProfiles]);
  
  const saveJobRecord = useCallback((monthKey: string, employeeId: string, day: number | null, codeOrPlant: string | number | null, type: 'status' | 'plant' | 'dailyOvertime' | 'sundayDuty') => {
    if (type === 'status') {
      const code = (codeOrPlant as string)?.toUpperCase() ?? '';
      const isValidCode = jobCodes.some(jc => jc.code === code) || code === '';
      if (!isValidCode) {
        toast({
            title: "Invalid Job Code",
            description: `The code "${code}" is not a valid job code.`,
            variant: "destructive"
        });
        return;
      }
      update(ref(rtdb, `jobRecords/${monthKey}/records/${employeeId}/days`), { [day!]: code || null });
    } else if (type === 'plant') {
      update(ref(rtdb, `jobRecords/${monthKey}/records/${employeeId}`), { plant: codeOrPlant });
    } else if (type === 'dailyOvertime') {
      const overtimeDay = day!;
      const hours = codeOrPlant as (number | null);
      const path = `jobRecords/${monthKey}/records/${employeeId}/dailyOvertime/${overtimeDay}`;
      if (hours && hours > 0) {
        set(ref(rtdb, path), hours);
      } else {
        remove(ref(rtdb, path));
      }
    } else if (type === 'sundayDuty') {
      const sundayDuty = day;
      update(ref(rtdb, `jobRecords/${monthKey}/records/${employeeId}`), { additionalSundayDuty: sundayDuty });
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
  
  const addPayment = useCallback((payment: Omit<Payment, 'id'|'requesterId'|'status'|'approverId'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'payments'));
    const newPayment: Omit<Payment, 'id'> = {
        ...payment,
        requesterId: user.id,
        status: 'Pending',
        comments: [],
    };
    set(newRef, newPayment);
    const approvers = users.filter(u => u.role === 'Admin' || u.role === 'Manager');
    approvers.forEach(approver => {
        if (approver.email) {
            const vendor = vendors.find(v => v.id === payment.vendorId);
            createAndSendNotification(
                approver.email,
                `New Payment for Approval: ${vendor?.name}`,
                `A new payment of ${payment.amount} has been logged by ${user.name} and requires your approval.`, {
                    'Vendor': vendor?.name || 'N/A',
                    'Amount': payment.amount,
                    'Requested By': user.name,
                }, `${process.env.NEXT_PUBLIC_APP_URL}/vendor-management`, 'Review Payment')
        }
    });
  }, [user, users, vendors]);
  
  const updatePayment = useCallback((payment: Payment) => {
    const { id, ...data } = payment;
    update(ref(rtdb, `payments/${id}`), data);
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

    // Also create a corresponding payment ledger entry
    const paymentData = {
      vendorId: purchase.vendorId,
      amount: purchase.grandTotal,
      durationFrom: purchase.durationTo,
      emailSentDate: purchase.emailSentDate,
      purchaseRegisterId: newRef.key!,
      remarks: `From Purchase Register #${newRef.key?.slice(-6)}`,
    };
    addPayment(paymentData);

  }, [user, addPayment]);

  const updatePurchaseRegisterPoNumber = useCallback((purchaseRegisterId: string, poNumber: string) => {
    update(ref(rtdb, `purchaseRegisters/${purchaseRegisterId}`), { poNumber });
  }, []);
  
  const addIgpOgpRecord = useCallback((record: Omit<IgpOgpRecord, 'id' | 'creatorId'>) => {
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
  
  const resolvePpeDispute = useCallback((requestId: string, resolution: 'reverse' | 'reissue', comment: string) => {
    if (!user || !can.approve_store_requests) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request || request.status !== 'Disputed') return;
  
    const newStatus = resolution === 'reissue' ? 'Approved' : 'Issued';
    const actionComment = resolution === 'reissue'
      ? `Dispute accepted by ${user.name}. Item will be re-issued. Comment: ${comment}`
      : `Dispute reversed by ${user.name}. Marked as issued. Comment: ${comment}`;
    
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
  }, [user, ppeRequests, can, updatePpeRequestStatus, users]);

  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, jobRecordPlants, jobCodes, JOB_CODE_COLORS, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, broadcasts, buildings, jobSchedules, jobRecords, ppeRequests, ppeStock, ppeInwardHistory, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, unlockRequests, appName, appLogo,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, requestUnlock, can, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, lockUser, unlockUser, deactivateUser, reactivateUser, resolveUnlockRequest, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord, addPpeHistoryFromExcel, addInternalRequest, updateInternalRequestStatus, deleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissAnnouncement, addBroadcast, dismissBroadcast, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, saveJobSchedule, addJobRecordPlant, deleteJobRecordPlant, addJobCode, updateJobCode, deleteJobCode, saveJobRecord, savePlantOrder, lockJobSchedule, unlockJobSchedule, lockJobRecordSheet, unlockJobRecordSheet, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegisterPoNumber, addIgpOgpRecord, addFeedback, updateFeedbackStatus, markFeedbackAsViewed,
    ...computedValue,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


    









    

    




    

