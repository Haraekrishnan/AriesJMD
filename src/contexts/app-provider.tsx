
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get, query, orderByChild, equalTo } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendPpeRequestEmail } from '@/app/actions/send-email';

type PermissionsObject = Record<Permission, boolean>;

type AppContextType = {
  // State
  user: User | null;
  loading: boolean;
  users: User[];
  roles: RoleDefinition[];
  tasks: Task[];
  projects: Project[];
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
  buildings: Building[];
  jobSchedules: JobSchedule[];
  ppeRequests: PpeRequest[];
  ppeStock: PpeStock[];
  payments: Payment[];
  vendors: Vendor[];
  purchaseRegisters: PurchaseRegister[];
  passwordResetRequests: PasswordResetRequest[];
  igpOgpRecords: IgpOgpRecord[];
  feedback: Feedback[];
  appName: string;
  appLogo: string | null;

  // Auth
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatar: string, password?: string) => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  generateResetCode: (requestId: string) => void;
  resolveResetRequest: (requestId: string) => void;
  resetPassword: (email: string, code: string, newPass: string) => Promise<boolean>;

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
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => void;
  addMultipleManpowerProfiles: (profiles: any[]) => number;
  updateManpowerProfile: (profile: ManpowerProfile) => void;
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
  addInternalRequest: (request: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => void;
  updateInternalRequestItems: (requestId: string, items: InternalRequest['items']) => void;
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus, comment: string) => void;
  deleteInternalRequest: (requestId: string) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  acknowledgeInternalRequest: (requestId: string) => void;
  addManagementRequest: (request: Omit<ManagementRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updateManagementRequest: (request: ManagementRequest) => void;
  updateManagementRequestStatus: (requestId: string, status: ManagementRequestStatus, comment: string) => void;
  deleteManagementRequest: (requestId: string) => void;
  markManagementRequestAsViewed: (requestId: string) => void;
  addPpeRequest: (requestData: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => void;
  updatePpeRequest: (request: PpeRequest) => void;
  updatePpeRequestStatus: (requestId: string, status: PpeRequestStatus, comment: string) => void;
  deletePpeRequest: (requestId: string) => void;
  deletePpeAttachment: (requestId: string) => void;
  markPpeRequestAsViewed: (requestId: string) => void;
  updatePpeStock: (stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => void;
  addPpeHistoryFromExcel: (data: any[]) => Promise<{ importedCount: number; notFoundCount: number; }>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
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
  addAnnouncement: (data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>) => void;
  updateAnnouncement: (announcement: Announcement) => void;
  approveAnnouncement: (announcementId: string) => void;
  rejectAnnouncement: (announcementId: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  returnAnnouncement: (announcementId: string, comment: string) => void;
  dismissAnnouncement: (announcementId: string) => void;
  addBuilding: (buildingNumber: string) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
  saveJobSchedule: (schedule: JobSchedule) => void;
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
const createDataListener = <T extends {}>(path: string, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
  const dbRef = ref(rtdb, path);
  return onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    const value = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
    setData(value);
  }, (error) => {
    console.error(`Error fetching ${path}:`, error);
    setData([]);
  });
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [dailyPlannerComments, setDailyPlannerComments] = useState<DailyPlannerComment[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [manpowerLogs, setManpowerLogs] = useState<ManpowerLog[]>([]);
  const [manpowerProfiles, setManpowerProfiles] = useState<ManpowerProfile[]>([]);
  const [internalRequests, setInternalRequests] = useState<InternalRequest[]>([]);
  const [managementRequests, setManagementRequests] = useState<ManagementRequest[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [utMachines, setUtMachines] = useState<UTMachine[]>([]);
  const [dftMachines, setDftMachines] = useState<DftMachine[]>([]);
  const [mobileSims, setMobileSims] = useState<MobileSim[]>([]);
  const [laptopsDesktops, setLaptopsDesktops] = useState<LaptopDesktop[]>([]);
  const [digitalCameras, setDigitalCameras] = useState<DigitalCamera[]>([]);
  const [anemometers, setAnemometers] = useState<Anemometer[]>([]);
  const [otherEquipments, setOtherEquipments] = useState<OtherEquipment[]>([]);
  const [machineLogs, setMachineLogs] = useState<MachineLog[]>([]);
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [jobSchedules, setJobSchedules] = useState<JobSchedule[]>([]);
  const [ppeRequests, setPpeRequests] = useState<PpeRequest[]>([]);
  const [ppeStock, setPpeStock] = useState<PpeStock[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseRegisters, setPurchaseRegisters] = useState<PurchaseRegister[]>([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [igpOgpRecords, setIgpOgpRecords] = useState<IgpOgpRecord[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);

  const [storedUser, setStoredUser] = useLocalStorage<User | null>('aries-user-v8', null);
  const user = storedUser;
  
  const { toast } = useToast();
  const router = useRouter();
  
  useEffect(() => {
    if (!rtdb) {
      console.error("Firebase Realtime Database is not initialized.");
      setLoading(false);
      return;
    }
  
    if (!user) {
      setLoading(false);
      // Clear all state when user logs out
      setUsers([]); setRoles([]); setTasks([]); setProjects([]); setPlannerEvents([]);
      setDailyPlannerComments([]); setAchievements([]); setActivityLogs([]);
      setVehicles([]); setDrivers([]); setIncidentReports([]); setManpowerLogs([]);
      setManpowerProfiles([]); setInternalRequests([]); setManagementRequests([]);
      setInventoryItems([]); setUtMachines([]); setDftMachines([]); setMobileSims([]);
      setLaptopsDesktops([]); setDigitalCameras([]); setAnemometers([]); setOtherEquipments([]); setMachineLogs([]); setCertificateRequests([]);
      setAnnouncements([]); setBuildings([]); setJobSchedules([]); setPpeRequests([]); setPpeStock([]); setPayments([]);
      setVendors([]); setPurchaseRegisters([]); setPasswordResetRequests([]); setIgpOgpRecords([]); setFeedback([]);
      return;
    }
  
    const listeners = [
      createDataListener('users', setUsers),
      createDataListener('roles', setRoles),
      createDataListener('tasks', setTasks),
      createDataListener('projects', setProjects),
      createDataListener('plannerEvents', setPlannerEvents),
      createDataListener('dailyPlannerComments', setDailyPlannerComments),
      createDataListener('achievements', setAchievements),
      createDataListener('activityLogs', setActivityLogs),
      createDataListener('vehicles', setVehicles),
      createDataListener('drivers', setDrivers),
      createDataListener('incidentReports', setIncidentReports),
      createDataListener('manpowerLogs', setManpowerLogs),
      createDataListener('manpowerProfiles', setManpowerProfiles),
      createDataListener('internalRequests', setInternalRequests),
      createDataListener('managementRequests', setManagementRequests),
      createDataListener('inventoryItems', setInventoryItems),
      createDataListener('utMachines', setUtMachines),
      createDataListener('dftMachines', setDftMachines),
      createDataListener('mobileSims', setMobileSims),
      createDataListener('laptopsDesktops', setLaptopsDesktops),
      createDataListener('digitalCameras', setDigitalCameras),
      createDataListener('anemometers', setAnemometers),
      createDataListener('otherEquipments', setOtherEquipments),
      createDataListener('machineLogs', setMachineLogs),
      createDataListener('certificateRequests', setCertificateRequests),
      createDataListener('announcements', setAnnouncements),
      createDataListener('buildings', setBuildings),
      createDataListener('jobSchedules', setJobSchedules),
      createDataListener('ppeRequests', setPpeRequests),
      createDataListener('ppeStock', setPpeStock),
      createDataListener('payments', setPayments),
      createDataListener('vendors', setVendors),
      createDataListener('purchaseRegisters', setPurchaseRegisters),
      createDataListener('passwordResetRequests', setPasswordResetRequests),
      createDataListener('igpOgpRecords', setIgpOgpRecords),
      createDataListener('feedback', setFeedback),
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

  // Effect for cleaning up old activity logs
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
  }, [user, activityLogs]);

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

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    const dbUsers = snapshot.val();
    const usersArray: User[] = dbUsers ? Object.keys(dbUsers).map(k => ({ id: k, ...dbUsers[k] })) : [];

    const foundUser = usersArray.find(u => u.email === email && u.password === pass);
    if (foundUser) {
      setStoredUser(foundUser);
      addActivityLog(foundUser.id, 'User Logged In');
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
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

  const updateProfile = useCallback((name: string, email: string, avatar: string, password?: string) => {
    if (user) {
      const updatedUser: User = { ...user, name, email, avatar };
      if (password) updatedUser.password = password;
      updateUser(updatedUser);
    }
  }, [user, updateUser]);
  
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
    return true;
  }, []);
  
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

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'participants' | 'lastUpdated' | 'viewedBy' | 'viewedByApprover' | 'viewedByRequester'> & { assigneeIds: string[] }) => {
    if(!user) return;
    const { assigneeIds, ...rest } = taskData;
    const tasksRef = ref(rtdb, 'tasks');
    const newTaskRef = push(tasksRef);
    const now = new Date().toISOString();
    const newTask: Omit<Task, 'id'> = {
        ...rest,
        creatorId: user.id,
        status: 'To Do',
        assigneeId: assigneeIds[0], // Keep first for backwards compatibility for now
        assigneeIds: assigneeIds,
        comments: [],
        participants: [user.id, ...assigneeIds],
        lastUpdated: now,
        viewedBy: [user.id],
        approvalState: 'none',
        viewedByApprover: true,
        viewedByRequester: false,
    };
    set(newTaskRef, newTask);
    const assigneeNames = users.filter(u => assigneeIds.includes(u.id)).map(u => u.name).join(', ');
    addActivityLog(user.id, 'Task Created', `Task "${newTask.title}" for ${assigneeNames}`);
  }, [user, users, addActivityLog]);

  const updateTask = useCallback((taskData: Task) => {
    if (!user) return;
    const { id, ...data } = taskData;
    update(ref(rtdb, `tasks/${id}`), data);
    addActivityLog(user.id, 'Task Updated', `Task: "${taskData.title}"`);
  }, [user, addActivityLog]);

  const deleteTask = useCallback((taskId: string) => {
    if (!user) return;
    const taskToDelete = tasks.find(t => t.id === taskId);
    if(taskToDelete) {
      remove(ref(rtdb, `tasks/${taskId}`));
      addActivityLog(user.id, 'Task Deleted', `Task: "${taskToDelete.title}"`);
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
      viewedBy: [user.id],
      lastUpdated: new Date().toISOString(),
    };

    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Comment Added', `Task ID: ${taskId}`);
  }, [user, tasks, addActivityLog]);

  const requestTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    addComment(taskId, comment);

    const approverId = task.creatorId;

    const updates: Partial<Task> = { 
        status: 'Pending Approval', 
        approvalState: 'pending', 
        previousStatus: task.status, 
        pendingStatus: newStatus,
        approverId: approverId,
        viewedBy: [user.id],
        lastUpdated: new Date().toISOString(),
    };

    if (attachment) {
      updates.attachment = attachment;
    }
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Status Change Requested', `Task "${task.title}" to ${newStatus}`);
  }, [user, tasks, addActivityLog, addComment]);

  const approveTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);

    const updates: Partial<Task> = {
        approvalState: 'approved',
        pendingStatus: null,
        previousStatus: null,
        viewedBy: [user.id],
        lastUpdated: new Date().toISOString(),
    };

    if (task.pendingAssigneeId) { // Reassignment
      updates.assigneeId = task.pendingAssigneeId;
      updates.assigneeIds = [task.pendingAssigneeId];
      updates.pendingAssigneeId = null;
      updates.status = 'To Do';
      updates.approvalState = 'none';
      updates.participants = Array.from(new Set([...(task.participants || []), task.pendingAssigneeId]));
      addActivityLog(user.id, 'Task Reassignment Approved', `Task "${task.title}" to ${users.find(u => u.id === task.pendingAssigneeId)?.name}`);
    } else { // Status change
      updates.status = task.pendingStatus === 'Completed' ? 'Done' : (task.pendingStatus || task.status);
      if (task.pendingStatus === 'Completed') updates.completionDate = new Date().toISOString();
      updates.approvalState = 'approved';
      addActivityLog(user.id, 'Task Status Change Approved', `Task "${updates.status}"`);
    }

    update(ref(rtdb, `tasks/${taskId}`), updates);
  }, [user, tasks, users, addActivityLog, addComment]);

  const returnTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);
    
    const updates: Partial<Task> = { 
      status: task.previousStatus || 'To Do', 
      pendingStatus: null, 
      previousStatus: null, 
      pendingAssigneeId: null, 
      approvalState: 'returned',
      viewedBy: [user.id],
      lastUpdated: new Date().toISOString(),
    };
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Request Returned', `Task: "${task.title}"`);
  }, [user, tasks, addActivityLog, addComment]);
  
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
      viewedBy: [user.id],
      lastUpdated: new Date().toISOString(),
    };
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Reassignment Requested', `Task "${task.title}" to ${users.find(u => u.id === newAssigneeId)?.name}`);
  }, [user, tasks, users, addActivityLog, addComment]);

  const markTaskAsViewed = useCallback((taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
  
    const currentViewedBy = task.viewedBy || [];
    if (!currentViewedBy.includes(user.id)) {
      update(ref(rtdb, `tasks/${taskId}`), { viewedBy: [...currentViewedBy, user.id] });
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
    }
  }, [user, addActivityLog]);
  
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
    
    updates[`${basePath}/viewedBy`] = [user.id];
  
    const existingEntry = dailyPlannerComments.find(dpc => dpc.id === dayKey);
    if (!existingEntry) {
      updates[`${basePath}/plannerUserId`] = plannerUserId;
      updates[`${basePath}/day`] = format(day, 'yyyy-MM-dd');
    }
  
    update(ref(rtdb), updates);
  }, [user, dailyPlannerComments]);


  const markPlannerCommentsAsRead = useCallback((plannerUserId: string, day: Date) => {
    if (!user) return;
    const dayKey = `${format(day, 'yyyy-MM-dd')}_${plannerUserId}`;
    const dayRef = ref(rtdb, `dailyPlannerComments/${dayKey}`);
    const currentViewedBy = dailyPlannerComments.find(dpc => dpc.id === dayKey)?.viewedBy || [];
    if (!currentViewedBy.includes(user.id)) {
      update(dayRef, { viewedBy: [...currentViewedBy, user.id] });
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
      };
      const newRef = push(ref(rtdb, 'announcements'));
      set(newRef, newAnnouncement);
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
    addActivityLog(user?.id || 'system', 'Project Added', `Added project: ${projectName}`);
  }, [user, addActivityLog]);

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
    if(!user) return;
    const supervisor = users.find(u => u.id === user.supervisorId);
    const hse = users.find(u => u.role === 'HSE');
    const projectCoordinator = users.find(u => u.role === 'Project Coordinator');

    const reportedToUserIds = Array.from(new Set([
        user.supervisorId,
        hse?.id,
        projectCoordinator?.id
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
        viewedBy: [user.id]
    };
    set(newRef, newIncident);
    addActivityLog(user.id, 'Incident Reported', `Incident in ${incidentData.unitArea}`);
  }, [user, users, addActivityLog]);

  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
    if(!user) return;
    const { id, ...data } = incident;
    const updates: Partial<typeof data> = data;
    
    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(incident.comments) ? incident.comments : (incident.comments ? Object.values(incident.comments) : []);
    
    updates.comments = [...existingComments, newComment];
    updates.lastUpdated = new Date().toISOString();
    updates.viewedBy = [user.id];

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
        viewedBy: [user.id],
    };
    
    update(ref(rtdb, `incidentReports/${incidentId}`), updates);
  }, [user, incidentReports]);

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

    const currentViewedBy = incident.viewedBy || [];
    if (!currentViewedBy.includes(user.id)) {
      update(ref(rtdb, `incidentReports/${incidentId}`), { viewedBy: [...currentViewedBy, user.id] });
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
  }, [user, manpowerLogs, addActivityLog]);

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

  const addManpowerProfile = useCallback((profile: Omit<ManpowerProfile, 'id'>) => {
    const newRef = push(ref(rtdb, 'manpowerProfiles'));
    set(newRef, { ...profile, id: newRef.key });
    if(user) addActivityLog(user.id, 'Manpower Profile Added', profile.name);
  }, [user, addActivityLog]);
  
  const addMultipleManpowerProfiles = useCallback((profiles: any[]): number => {
    let importedCount = 0;
    const updates: { [key: string]: any } = {};
  
    profiles.forEach((p, index) => {
      // Check if p is an array and has a minimum length
      if (!Array.isArray(p) || p.length < 13) {
        console.warn(`Skipping row ${index + 2}: insufficient data.`);
        return;
      }
      
      // A - Full Name, K - Aadhar Number. Let's use File No. as the unique key.
      // Column B -> mobile, Column T -> file no.
      const hardCopyFileNo = p[19]?.toString().trim();
      if (!hardCopyFileNo) {
        console.warn(`Skipping row ${index + 2}: Hard Copy File No. is required for import.`);
        return;
      }
  
      const existingProfile = manpowerProfiles.find(mp => mp.hardCopyFileNo === hardCopyFileNo);
  
      const parseExcelDate = (date: any): string | undefined => {
          if (!date) return undefined;
          // Excel stores dates as numbers (days since 1900). `cellDates: true` in xlsx handles this.
          if (date instanceof Date) {
              return isValid(date) ? date.toISOString() : undefined;
          }
          if (typeof date === 'string') {
              const parsed = parse(date, 'yyyy-MM-dd', new Date());
              if (isValid(parsed)) return parsed.toISOString();
              const parsed2 = parseISO(date);
              if (isValid(parsed2)) return parsed2.toISOString();
          }
          return undefined;
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
      };
  
      const profileId = existingProfile ? existingProfile.id : push(ref(rtdb)).key;
      if (!profileId) return;
  
      // If new, set some defaults
      const finalData = existingProfile 
          ? { ...existingProfile, ...profileData }
          : { 
              status: 'Working' as const, 
              trade: 'Others', 
              documents: [], 
              ...profileData 
            };
  
      updates[`manpowerProfiles/${profileId}`] = finalData;
      importedCount++;
    });
  
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
      if (user) addActivityLog(user.id, 'Bulk Manpower Import', `Imported/updated ${importedCount} profiles.`);
    }
    
    return importedCount;
  }, [user, manpowerProfiles, addActivityLog]);
  

  const updateManpowerProfile = useCallback((profile: ManpowerProfile) => {
    const { id, ...data } = profile;
    const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
    );
    update(ref(rtdb, `manpowerProfiles/${id}`), cleanData);
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
    const updates: { [key: string]: any } = {};
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/rejoinedDate`] = rejoinedDate.toISOString();
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/leaveEndDate`] = rejoinedDate.toISOString();
    updates[`manpowerProfiles/${manpowerId}/status`] = 'Working';
    update(ref(rtdb), updates);
  }, []);
  
  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    const updates: { [key: string]: any } = {};
    updates[`manpowerProfiles/${manpowerId}/status`] = 'On Leave';
    updates[`manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}/status`] = 'Confirmed';
    update(ref(rtdb), updates);
  }, []);
  
  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
    remove(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveId}`));
  }, []);
  
  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => {
    update(ref(rtdb, `manpowerProfiles/${manpowerId}/leaveHistory/${leaveRecord.id}`), leaveRecord);
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
  }, [user, addActivityLog]);
  
  const updateInternalRequestItems = useCallback((requestId: string, items: InternalRequest['items']) => {
    if(!user || !can.approve_store_requests) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;

    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/items`] = items;
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const commentText = "The item list for this request has been updated by the store manager.";
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { id: newCommentRef.key, userId: user.id, text: commentText, date: new Date().toISOString() };
    
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Store Request Items Updated', `Request ID: ${requestId}`);
  }, [user, can.approve_store_requests, internalRequests, addActivityLog]);

  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if(!user) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const commentText = `Status changed to ${status}. ${comment}`;
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/status`] = status;
    updates[`internalRequests/${requestId}/approverId`] = user.id;
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Store Request Status Updated', `Request ID: ${requestId} to ${status}`);
  }, [user, internalRequests, addActivityLog]);

  const deleteInternalRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `internalRequests/${requestId}`));
    addActivityLog(user.id, 'Internal Request Deleted', `ID: ${requestId}`);
  }, [user, addActivityLog]);
  
  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true });
  }, [user]);

  const acknowledgeInternalRequest = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true });
    toast({ title: "Request Acknowledged", description: "Thank you for confirming receipt." });
  }, [user, toast]);
  
  const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => {
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
  }, [user, addActivityLog]);

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
  }, [user, managementRequests, addActivityLog]);
  
  const deleteManagementRequest = useCallback((requestId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `managementRequests/${requestId}`));
    addActivityLog(user.id, 'Management Request Deleted', `ID: ${requestId}`);
  }, [user, addActivityLog]);

  const markManagementRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true });
  }, [user]);

  const addPpeRequest = useCallback((requestData: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
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
    
    const lastIssue = employee?.ppeHistory
      ?.filter(h => h.ppeType === requestData.ppeType)
      .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

    const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
    const stockInfo = requestData.ppeType === 'Coverall'
      ? `${stockItem?.sizes?.[requestData.size] || 0} in stock`
      : `${stockItem?.quantity || 0} in stock`;

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
        rejoiningDate: employee?.leaveHistory?.find(l => l.rejoinedDate)?.rejoinedDate ? format(parseISO(employee.leaveHistory.find(l => l.rejoinedDate)!.rejoinedDate!), 'dd MMM, yyyy') : 'N/A',
        lastIssueDate: lastIssue ? format(parseISO(lastIssue.issueDate), 'dd MMM, yyyy') : 'N/A',
        stockInfo,
        eligibility: requestData.eligibility,
        newRequestJustification: requestData.newRequestJustification,
    };

    sendPpeRequestEmail(emailData);

  }, [user, manpowerProfiles, ppeStock, addActivityLog]);
  
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
    const commentText = `Status changed to ${status}. ${comment}`;
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
  
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/status`] = status;
    updates[`ppeRequests/${requestId}/approverId`] = user.id;
    updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
    updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };

    if (status === 'Issued') {
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

      const stockRefPath = request.ppeType === 'Coverall' ? 'ppeStock/coveralls' : 'ppeStock/safetyShoes';
      const stockItems = ppeStock.find(s => s.id === (request.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
      if(stockItems) {
        if(request.ppeType === 'Coverall' && stockItems.sizes) {
          const currentSizeStock = stockItems.sizes[request.size] || 0;
          updates[`${stockRefPath}/sizes/${request.size}`] = Math.max(0, currentSizeStock - (request.quantity || 1));
        } else if (request.ppeType === 'Safety Shoes' && typeof stockItems.quantity === 'number') {
          updates[`${stockRefPath}/quantity`] = Math.max(0, stockItems.quantity - 1);
        }
      }
    }
  
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'PPE Request Status Updated', `Request ID: ${requestId} to ${status}`);
  }, [user, ppeRequests, ppeStock, addActivityLog]);
  
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

      const parseExcelDate = (date: any): string => {
        if (!date) return new Date().toISOString();
        if (date instanceof Date && isValid(date)) {
          return date.toISOString();
        }
        if (typeof date === 'string') {
          const parsed = parse(date, 'yyyy-MM-dd', new Date());
          if (isValid(parsed)) return parsed.toISOString();
        }
        return new Date().toISOString();
      };
      
      const itemData: Partial<InventoryItem> = {
          name: item['ITEM NAME'],
          serialNumber: serialNumber,
          chestCrollNo: item['CHEST CROLL NO']?.toString(),
          ariesId: item['ARIES ID']?.toString(),
          inspectionDate: parseExcelDate(item['INSPECTION DATE']),
          inspectionDueDate: parseExcelDate(item['INSPECTION DUE DATE']),
          tpInspectionDueDate: parseExcelDate(item['TP INSPECTION DUE DATE']),
          status: item['STATUS'] as InventoryItemStatus || 'In Store',
          projectId: projects.find(p => p.name === item['PROJECT'])?.id || projects[0].id,
          lastUpdated: new Date().toISOString(),
      };
      
      const itemId = existingItem ? existingItem.id : push(ref(rtdb)).key;
      if (!itemId) return;

      const finalData = existingItem ? { ...existingItem, ...itemData } : itemData;
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
  }, [user, addActivityLog]);

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
  }, [user]);

  const deleteMachineLog = useCallback((logId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `machineLogs/${logId}`));
  }, [user]);

  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    if(!user || user.role !== 'Admin') return;
    update(ref(rtdb, 'branding'), { appName: name, appLogo: logo });
    addActivityLog(user.id, 'Branding Updated');
  }, [user, addActivityLog]);

  const addAnnouncement = useCallback((data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>) => {
    if (!user || !user.supervisorId) {
        toast({ variant: 'destructive', title: "No Supervisor", description: "You must have a supervisor assigned to create an announcement." });
        return;
    }
    const newRef = push(ref(rtdb, 'announcements'));
    const newAnnouncement: Omit<Announcement, 'id'> = {
        ...data,
        creatorId: user.id,
        status: 'pending',
        approverId: user.supervisorId,
        createdAt: new Date().toISOString(),
        comments: [],
        dismissedBy: []
    };
    set(newRef, newAnnouncement);
    addActivityLog(user.id, 'Announcement Submitted', `Title: ${data.title}`);
  }, [user, addActivityLog, toast]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    const { id, ...data } = announcement;
    update(ref(rtdb, `announcements/${id}`), data);
  }, []);
  
  const approveAnnouncement = useCallback((announcementId: string) => {
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'approved' });
  }, []);

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
  
  const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    const newBuilding: Omit<Building, 'id'> = { buildingNumber, rooms: [] };
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
    const newRoom: Omit<Room, 'id'> = { roomNumber: roomData.roomNumber, beds };
    set(newRoomRef, newRoom);
  }, []);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}`));
  }, []);

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    const bed = buildings.find(b => b.id === buildingId)?.rooms.find(r => r.id === roomId)?.beds.find(b => b.id === bedId);
    if(bed) {
      update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bed.id}`), { occupantId: occupantId });
    } else {
        // This is a bit of a hack to find the index of the bed since we don't store bed IDs at the top level
        const building = buildings.find(b => b.id === buildingId);
        const room = building?.rooms.find(r => r.id === roomId);
        const bedIndex = room?.beds.findIndex(b => b.bedNumber === bedId); // Assuming bedId is bedNumber here from old code
        if (bedIndex !== undefined && bedIndex > -1) {
            update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedIndex}`), { occupantId: occupantId });
        }
    }
  }, [buildings]);

  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    const bed = buildings.find(b => b.id === buildingId)?.rooms.find(r => r.id === roomId)?.beds.find(b => b.id === bedId);
    if(bed) {
      update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bed.id}`), { occupantId: null });
    } else {
        const building = buildings.find(b => b.id === buildingId);
        const room = building?.rooms.find(r => r.id === roomId);
        const bedIndex = room?.beds.findIndex(b => b.bedNumber === bedId);
         if (bedIndex !== undefined && bedIndex > -1) {
            update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedIndex}`), { occupantId: null });
        }
    }
  }, [buildings]);

  const saveJobSchedule = useCallback((schedule: JobSchedule) => {
    set(ref(rtdb, `jobSchedules/${schedule.id}`), schedule);
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
  }, [user]);
  
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
  }, [user, payments]);

  const deletePayment = useCallback((paymentId: string) => {
    if(!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `payments/${paymentId}`));
  }, [user]);

  const addPurchaseRegister = useCallback((purchase: Omit<PurchaseRegister, 'id'|'creatorId'|'date'>) => {
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
      durationFrom: purchase.durationFrom,
      durationTo: purchase.durationTo,
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
        viewedBy: [user.id]
    };
    set(newRef, newFeedback);
  }, [user]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
  }, []);
  
  const markFeedbackAsViewed = useCallback(() => {
    if (!user || !can.manage_feedback) return;
    const updates: { [key: string]: any } = {};
    feedback.forEach(f => {
      if (!f.viewedBy?.includes(user.id)) {
        updates[`feedback/${f.id}/viewedBy`] = [...(f.viewedBy || []), user.id];
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
  }, [user, feedback, can.manage_feedback]);

  const computedValue = useMemo(() => {
    if (!user) return {
      pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, unreadPlannerCommentDays: [], pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0
    };
    
    const pendingTaskApprovalCount = tasks.filter(t => t.status === 'Pending Approval' && t.approverId === user.id).length;
    const myNewTaskCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && !(t.viewedBy || []).includes(user.id)).length;
    const myPendingTaskRequestCount = tasks.filter(t => t.assigneeIds?.includes(user.id) && t.approvalState === 'returned').length;

    const myFulfilledStoreCertRequestCount = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && r.itemId && !r.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && (r.utMachineId || r.dftMachineId) && !r.viewedByRequester);

    const isStoreManager = can.approve_store_requests;
    const pendingStoreCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && r.itemId).length : 0;
    const pendingEquipmentCertRequestCount = isStoreManager ? certificateRequests.filter(r => r.status === 'Pending' && (r.utMachineId || r.dftMachineId)).length : 0;
    
    const unreadPlannerCommentDays = dailyPlannerComments
      .filter(dpc => dpc.plannerUserId === user.id && !(dpc.viewedBy || []).includes(user.id))
      .map(dpc => dpc.day);
    const plannerNotificationCount = unreadPlannerCommentDays.length;

    const pendingInternalRequestCount = isStoreManager ? internalRequests.filter(r => r.status === 'Pending').length : 0;
    const updatedInternalRequestCount = internalRequests.filter(r => r.requesterId === user.id && (r.status === 'Approved' || r.status === 'Rejected') && !r.viewedByRequester).length;
    
    const isRecipientOfMgmtReq = (req: ManagementRequest) => req.recipientId === user.id;
    const pendingManagementRequestCount = managementRequests.filter(r => r.status === 'Pending' && isRecipientOfMgmtReq(r)).length;
    const updatedManagementRequestCount = managementRequests.filter(r => r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester).length;

    const incidentNotificationCount = incidentReports.filter(i => {
      const isParticipant = i.reporterId === user.id || i.reportedToUserIds.includes(user.id);
      const isUnread = !(i.viewedBy || []).includes(user.id);
      return isParticipant && isUnread;
    }).length;
    
    const isPpeManager = user.role === 'Manager' || user.role === 'Admin';
    const canIssuePpe = ['Store in Charge', 'Assistant Store Incharge'].includes(user.role);
    const pendingPpeRequestCount = isPpeManager ? ppeRequests.filter(r => r.status === 'Pending').length : (canIssuePpe ? ppeRequests.filter(r => r.status === 'Approved').length : 0);
    const updatedPpeRequestCount = ppeRequests.filter(r => r.requesterId === user.id && (r.status === 'Approved' || r.status === 'Rejected') && !r.viewedByRequester).length;
    
    const canApprovePayments = user.role === 'Admin' || user.role === 'Manager';
    const pendingPaymentApprovalCount = canApprovePayments ? payments.filter(p => p.status === 'Pending').length : 0;
    const pendingPasswordResetRequestCount = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.includes(user.id)).length : 0;

    const { workingManpowerCount, onLeaveManpowerCount } = manpowerProfiles.reduce((acc, profile) => {
        if(profile.status === 'Working') acc.workingManpowerCount++;
        if(profile.status === 'On Leave') acc.onLeaveManpowerCount++;
        return acc;
    }, { workingManpowerCount: 0, onLeaveManpowerCount: 0 });

    return {
      pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount
    };
  }, [user, tasks, certificateRequests, can, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, manpowerProfiles, feedback]);
  
  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, buildings, jobSchedules, ppeRequests, ppeStock, payments, vendors, purchaseRegisters, passwordResetRequests, igpOgpRecords, feedback, appName, appLogo,
    login, logout, updateProfile, requestPasswordReset, generateResetCode, resolveResetRequest, resetPassword, can, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, acknowledgeReturnedTask, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, extendLeave, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addMemoOrWarning, updateMemoRecord, deleteMemoRecord, addPpeHistoryRecord, addInternalRequest, updateInternalRequestItems, updateInternalRequestStatus, deleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addPpeRequest, updatePpeRequest, updatePpeRequestStatus, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed, updatePpeStock, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, saveJobSchedule, addVendor, updateVendor, deleteVendor, addPayment, updatePayment, updatePaymentStatus, deletePayment, addPurchaseRegister, updatePurchaseRegisterPoNumber, addIgpOgpRecord, addPpeHistoryFromExcel, addFeedback, updateFeedbackStatus, markFeedbackAsViewed,
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
    
    














    







    



    

