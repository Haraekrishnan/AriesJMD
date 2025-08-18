

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord, MemoRecord, PpeRequest, PpeRequestStatus, PpeHistoryRecord, PpeStock, Payment, Vendor, PaymentStatus, PurchaseRegister, PasswordResetRequest, IgpOgpRecord, Feedback } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get, query, orderByChild, equalTo } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendEmail } from '@/app/actions/send-email';

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
  addPpeRequest: (request: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => void;
  updatePpeRequest: (request: PpeRequest) => void;
  updatePpeRequestStatus: (requestId: string, status: PpeRequestStatus, comment: string) => void;
  deletePpeRequest: (requestId: string) => void;
  deletePpeAttachment: (requestId: string) => void;
  markPpeRequestAsViewed: (requestId: string) => void;
  updatePpeStock: (stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => void;
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
  addPayment: (payment: Omit<Payment, 'id' | 'requesterId' | 'status' | 'approverId'>) => void;
  updatePayment: (payment: Payment) => void;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, comment: string) => void;
  deletePayment: (paymentId: string) => void;
  addPurchaseRegister: (purchase: Omit<PurchaseRegister, 'id' | 'creatorId' | 'date'>) => void;
  updatePurchaseRegisterPoNumber: (purchaseRegisterId: string, poNumber: string) => void;
  addIgpOgpRecord: (record: Omit<IgpOgpRecord, 'id'|'creatorId'>) => void;
  addPpeHistoryFromExcel: (data: any[]) => Promise<{ importedCount: number; notFoundCount: number; }>;
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

  const updateSubsequentManpowerLogs = useCallback(async (startDate: Date, projectId: string) => {
    // Get all logs for the project from the day after startDate, ordered by date
    const subsequentLogs = manpowerLogs
        .filter(l => l.projectId === projectId && isAfter(new Date(l.date), startDate))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (subsequentLogs.length === 0) return;

    let previousDayTotal = (manpowerLogs.find(l => l.date === format(startDate, 'yyyy-MM-dd') && l.projectId === projectId))?.total || 0;

    const updates: {[key:string]: any} = {};

    for (const log of subsequentLogs) {
        const newTotal = previousDayTotal + log.countIn - log.countOut;
        if (log.total !== newTotal || log.yesterdayCount !== previousDayTotal) {
            updates[`/manpowerLogs/${log.id}/total`] = newTotal;
            updates[`/manpowerLogs/${log.id}/yesterdayCount`] = previousDayTotal;
        }
        previousDayTotal = newTotal;
    }

    if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
    }
  }, [manpowerLogs]);

  const addManpowerLog = useCallback(async (logData: Partial<Omit<ManpowerLog, 'id'| 'updatedBy' | 'date' | 'yesterdayCount' | 'total'>> & { projectId: string }, logDate = new Date()) => {
    if (!user) return;
    const dateStr = format(logDate, 'yyyy-MM-dd');
    const logsForDay = manpowerLogs.filter(l => l.date === dateStr && l.projectId === logData.projectId);
    const existingLog = logsForDay.sort((a,b) => new Date(b.updatedBy).getTime() - new Date(a.updatedBy).getTime())[0];

    if (existingLog) {
        const updates: Partial<ManpowerLog> = { ...logData, updatedBy: user.id };
        if (logData.hasOwnProperty('countIn') || logData.hasOwnProperty('countOut')) {
          const countIn = logData.countIn ?? existingLog.countIn;
          const countOut = logData.countOut ?? existingLog.countOut;
          updates.total = (existingLog.yesterdayCount ?? 0) + countIn - countOut;
        }
        await update(ref(rtdb, `manpowerLogs/${existingLog.id}`), updates);
        addActivityLog(user.id, 'Manpower Log Updated', `Project ID: ${logData.projectId}`);
        await updateSubsequentManpowerLogs(logDate, logData.projectId);
    } else {
        const yesterdayStr = format(sub(logDate, { days: 1 }), 'yyyy-MM-dd');
        const logsForYesterday = manpowerLogs
            .filter(l => l.projectId === logData.projectId && l.date === yesterdayStr)
            .sort((a,b) => new Date(b.updatedBy).getTime() - new Date(a.updatedBy).getTime());
        
        const yesterdayLog = logsForYesterday[0];
        const yesterdayCount = yesterdayLog?.total || 0;
        
        const countIn = logData.countIn || 0;
        const countOut = logData.countOut || 0;
        const newTotal = yesterdayCount + countIn - countOut;

        const newLog: Omit<ManpowerLog, 'id'> = {
            projectId: logData.projectId,
            countIn,
            personInName: logData.personInName || '',
            countOut,
            personOutName: logData.personOutName || '',
            countOnLeave: logData.countOnLeave || 0,
            personOnLeaveName: logData.personOnLeaveName || '',
            reason: logData.reason || '',
            updatedBy: user.id,
            date: dateStr,
            yesterdayCount: yesterdayCount,
            total: newTotal
        };
        
        const newLogRef = push(ref(rtdb, 'manpowerLogs'));
        await set(newLogRef, newLog);
        addActivityLog(user.id, 'Manpower Logged', `Project ID: ${logData.projectId}`);
        await updateSubsequentManpowerLogs(logDate, logData.projectId);
    }
  }, [user, addActivityLog, manpowerLogs, updateSubsequentManpowerLogs]);

  const updateManpowerLog = useCallback(async (logId: string, data: Partial<Pick<ManpowerLog, 'countIn' | 'countOut' | 'personInName' | 'personOutName' | 'reason' | 'countOnLeave' | 'personOnLeaveName'>>) => {
      if(!user) return;
      const logToUpdate = manpowerLogs.find(l => l.id === logId);
      if(!logToUpdate) return;
  
      const countIn = Number(data.countIn ?? logToUpdate.countIn) || 0;
      const countOut = Number(data.countOut ?? logToUpdate.countOut) || 0;
      const newTotal = (logToUpdate.yesterdayCount || 0) + countIn - countOut;
  
      const updates = { ...data, countIn, countOut, total: newTotal, updatedBy: user.id };
  
      await update(ref(rtdb, `manpowerLogs/${logId}`), updates);
      addActivityLog(user.id, 'Manpower Log Updated', `Log ID: ${logId}`);
  
      await updateSubsequentManpowerLogs(new Date(logToUpdate.date), logToUpdate.projectId);
  }, [user, addActivityLog, manpowerLogs, updateSubsequentManpowerLogs]);

  const addManpowerProfile = useCallback((profile: Omit<ManpowerProfile, 'id'>) => {
    if (!user) return;
    const newProfileRef = push(ref(rtdb, 'manpowerProfiles'));
    
    // Helper function to clean undefined values recursively
    const cleanData = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => cleanData(item));
      } else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, cleanData(v)])
        );
      }
      return obj;
    };
  
    const cleanedProfile = cleanData(profile);
    set(newProfileRef, cleanedProfile);
    addActivityLog(user.id, 'Manpower Profile Added', profile.name);
  }, [user, addActivityLog]);
  
  const addMultipleManpowerProfiles = useCallback((profilesToImport: any[]) => {
    if (!user) return 0;
    let importedCount = 0;
    const updates: { [key: string]: any } = {};

    profilesToImport.forEach(item => {
        try {
            const fullName = item[0]?.toString();
            if (!fullName) return; 

            const existingProfile = manpowerProfiles.find(p => p.name === fullName);

            const parseDate = (dateInput: string | number | undefined): string | undefined => {
                if (!dateInput) return undefined;
                if (typeof dateInput === 'number') { // Handle Excel date serial numbers
                    const excelEpoch = new Date(1899, 11, 30);
                    const date = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
                    return isValid(date) ? date.toISOString() : undefined;
                }
                if (typeof dateInput === 'string') {
                    // Try parsing various common formats
                    let parsedDate = parse(dateInput, 'dd/MM/yyyy', new Date());
                    if (!isValid(parsedDate)) {
                        parsedDate = parse(dateInput, 'dd-MM-yyyy', new Date());
                    }
                    return isValid(parsedDate) ? parsedDate.toISOString() : undefined;
                }
                if (dateInput instanceof Date && isValid(dateInput)) {
                    return dateInput.toISOString();
                }
                return undefined;
            };

            const profileData: Partial<ManpowerProfile> = {
                name: fullName,
                mobileNumber: item[1]?.toString(),
                gender: item[2],
                workOrderNumber: item[3]?.toString(),
                labourLicenseNo: item[4]?.toString(),
                eic: item[5],
                workOrderExpiryDate: parseDate(item[6]),
                labourLicenseExpiryDate: parseDate(item[7]),
                joiningDate: parseDate(item[8]),
                epNumber: item[9]?.toString(),
                aadharNumber: item[10]?.toString(),
                dob: parseDate(item[11]),
                uanNumber: item[12]?.toString(),
                wcPolicyNumber: item[13]?.toString(),
                wcPolicyExpiryDate: parseDate(item[14]),
                cardCategory: item[15],
                cardType: item[16],
            };

            const cleanProfileData = Object.fromEntries(Object.entries(profileData).filter(([_, v]) => v != null && v !== ''));

            const key = existingProfile ? existingProfile.id : push(ref(rtdb, 'manpowerProfiles')).key;
            if (key) {
              updates[`/manpowerProfiles/${key}`] = existingProfile 
                ? { ...existingProfile, ...cleanProfileData } 
                : { documents: [], skills: [], leaveHistory: [], ...cleanProfileData, trade: 'Others', otherTrade: 'Imported', status: 'Working' };
              importedCount++;
            }
        } catch(e) { console.error("Skipping invalid manpower row:", item, e); }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
    addActivityLog(user.id, 'Bulk Manpower Import', `Imported/updated ${importedCount} profiles.`);
    return importedCount;
  }, [user, addActivityLog, manpowerProfiles]);

  const updateManpowerProfile = useCallback((profile: ManpowerProfile) => {
    if(!user) return;
    
    // Helper function to clean undefined values recursively, converting them to null
    const cleanData = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => cleanData(item));
      } else if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
          if (obj[key] === undefined) {
             newObj[key] = null;
          } else {
            newObj[key] = cleanData(obj[key]);
          }
        }
        return newObj;
      }
      return obj;
    };

    const { id, ...data } = profile;
    const cleanedData = cleanData(data); // Clean the data before updating

    update(ref(rtdb, `manpowerProfiles/${id}`), cleanedData);
    addActivityLog(user.id, 'Manpower Profile Updated', profile.name);
  }, [user, addActivityLog]);

  const deleteManpowerProfile = useCallback((profileId: string) => {
    if(!user) return;
    const profile = manpowerProfiles.find(p => p.id === profileId);
    remove(ref(rtdb, `manpowerProfiles/${profileId}`));
    if (profile) addActivityLog(user.id, 'Manpower Profile Deleted', profile.name);
  }, [user, manpowerProfiles, addActivityLog]);

  const addLeaveForManpower = useCallback((manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => {
    if(!user) return;
    
    const updates: { [key: string]: any } = {};

    manpowerIds.forEach(id => {
        const profile = manpowerProfiles.find(p => p.id === id);
        if(!profile) return;
        
        const newLeave: any = {
            id: `leave-${Date.now()}-${id.substring(0,4)}`,
            leaveType,
            leaveStartDate: startDate.toISOString(),
            plannedEndDate: endDate.toISOString(),
        };

        if (remarks) {
          newLeave.remarks = remarks;
        }

        const existingHistory = Array.isArray(profile.leaveHistory) ? profile.leaveHistory : [];
        updates[`/manpowerProfiles/${id}/leaveHistory`] = [...existingHistory, newLeave];
    });

    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Leave Planned', `Planned leave for ${manpowerIds.length} employee(s)`);
  }, [user, manpowerProfiles, addActivityLog]);

  const extendLeave = useCallback((manpowerId: string, leaveId: string, newEndDate: Date) => {
    if (!user) return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;
  
    const leaveIndex = profile.leaveHistory.findIndex(l => l.id === leaveId);
    if (leaveIndex === -1) return;
  
    const updatedLeaveHistory = [...profile.leaveHistory];
    updatedLeaveHistory[leaveIndex] = {
      ...updatedLeaveHistory[leaveIndex],
      plannedEndDate: newEndDate.toISOString(),
    };
  
    update(ref(rtdb, `/manpowerProfiles/${manpowerId}`), { leaveHistory: updatedLeaveHistory });
    addActivityLog(user.id, 'Leave Extended', `Extended leave for ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);
  
  const rejoinFromLeave = useCallback((manpowerId: string, leaveId: string, rejoinedDate: Date) => {
    if(!user) return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile) return;
      
    const updates: { [key: string]: any } = {
        [`/manpowerProfiles/${manpowerId}/status`]: 'Working'
    };
      
    const leaveIndex = (profile.leaveHistory || []).findIndex(l => l.id === leaveId);
    if (leaveIndex > -1) {
        updates[`/manpowerProfiles/${manpowerId}/leaveHistory/${leaveIndex}/rejoinedDate`] = rejoinedDate.toISOString();
        updates[`/manpowerProfiles/${manpowerId}/leaveHistory/${leaveIndex}/leaveEndDate`] = rejoinedDate.toISOString();
    }
      
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Employee Rejoined', `${profile.name} has rejoined from leave.`);
  }, [user, manpowerProfiles, addActivityLog]);

  const confirmManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
      const profile = manpowerProfiles.find(p => p.id === manpowerId);
      if (!profile) return;
      
      const updates: { [key: string]: any } = {
          [`/manpowerProfiles/${manpowerId}/status`]: 'On Leave'
      };
      
      const leaveIndex = (profile.leaveHistory || []).findIndex(l => l.id === leaveId);
      if (leaveIndex > -1) {
          updates[`/manpowerProfiles/${manpowerId}/leaveHistory/${leaveIndex}/leaveStartDate`] = new Date().toISOString();
      }
      
      update(ref(rtdb), updates);
  }, [manpowerProfiles]);

  const cancelManpowerLeave = useCallback((manpowerId: string, leaveId: string) => {
      const profile = manpowerProfiles.find(p => p.id === manpowerId);
      if (!profile || !profile.leaveHistory) return;

      const updatedLeaveHistory = profile.leaveHistory.filter(l => l.id !== leaveId);
      
      update(ref(rtdb, `/manpowerProfiles/${manpowerId}`), { leaveHistory: updatedLeaveHistory });
  }, [manpowerProfiles]);

  const updateLeaveRecord = useCallback((manpowerId: string, leaveRecord: LeaveRecord) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;
    const leaveIndex = profile.leaveHistory.findIndex(l => l.id === leaveRecord.id);
    if (leaveIndex === -1) return;
    
    const updatedLeaveHistory = [...profile.leaveHistory];
    updatedLeaveHistory[leaveIndex] = leaveRecord;
    
    update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { leaveHistory: updatedLeaveHistory });
    addActivityLog(user.id, 'Leave Record Updated', `For profile: ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);

  const deleteLeaveRecord = useCallback((manpowerId: string, leaveId: string) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.leaveHistory) return;

    const updatedLeaveHistory = profile.leaveHistory.filter(l => l.id !== leaveId);

    update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { leaveHistory: updatedLeaveHistory });
    addActivityLog(user.id, 'Leave Record Deleted', `For profile: ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);

  const addMemoOrWarning = useCallback((manpowerId: string, memo: Omit<MemoRecord, 'id'>) => {
    if (!user) return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile) return;
    const newMemo: MemoRecord = { ...memo, id: `memo-${Date.now()}` };
    const updatedMemoHistory = [...(profile.memoHistory || []), newMemo];
    update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { memoHistory: updatedMemoHistory });
    addActivityLog(user.id, `Issued ${memo.type}`, `To ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);

  const updateMemoRecord = useCallback((manpowerId: string, memo: MemoRecord) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.memoHistory) return;

    const memoIndex = profile.memoHistory.findIndex(m => m.id === memo.id);
    if (memoIndex === -1) return;

    const updatedMemoHistory = [...profile.memoHistory];
    updatedMemoHistory[memoIndex] = memo;
    
    update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { memoHistory: updatedMemoHistory });
    addActivityLog(user.id, `Updated ${memo.type}`, `For ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);

  const deleteMemoRecord = useCallback((manpowerId: string, memoId: string) => {
    if (!user || user.role !== 'Admin') return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile || !profile.memoHistory) return;

    const updatedMemoHistory = profile.memoHistory.filter(m => m.id !== memoId);

    update(ref(rtdb, `manpowerProfiles/${manpowerId}`), { memoHistory: updatedMemoHistory });
    addActivityLog(user.id, 'Deleted Memo/Warning', `For ${profile.name}`);
  }, [user, manpowerProfiles, addActivityLog]);
  
  const addPpeHistoryRecord = useCallback((manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => {
    if (!user) return;
    const profile = manpowerProfiles.find(p => p.id === manpowerId);
    if (!profile) return;

    const updates: { [key: string]: any } = {};

    const newHistoryItem: PpeHistoryRecord = { ...record, id: `ppe-hist-${Date.now()}` };
    const updatedPpeHistory = [...(profile.ppeHistory || []), newHistoryItem];
    updates[`/manpowerProfiles/${manpowerId}/ppeHistory`] = updatedPpeHistory;

    // Deduct from stock
    if (record.ppeType === 'Coverall') {
      const coverallStock = ppeStock.find(s => s.id === 'coveralls');
      if (coverallStock && coverallStock.sizes) {
          const currentSizeStock = coverallStock.sizes[record.size] || 0;
          const quantityToDeduct = record.quantity || 1;
          const newSizeStock = Math.max(0, currentSizeStock - quantityToDeduct);
          updates[`/ppeStock/coveralls/sizes/${record.size}`] = newSizeStock;
      }
    } else if (record.ppeType === 'Safety Shoes') {
        const shoeStock = ppeStock.find(s => s.id === 'safetyShoes');
        if (shoeStock && shoeStock.quantity) {
            const newQuantity = Math.max(0, shoeStock.quantity - 1);
            updates[`/ppeStock/safetyShoes/quantity`] = newQuantity;
        }
    }
    
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'PPE History Added', `Added ${record.ppeType} for ${profile.name}`);
  }, [user, addActivityLog, manpowerProfiles, ppeStock]);

  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if(user) {
        const newRequestRef = push(ref(rtdb, 'internalRequests'));
        const newRequest: Omit<InternalRequest, 'id'> = { ...requestData, requesterId: user.id, date: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', comments: [], viewedByRequester: true, acknowledgedByRequester: false };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'Internal Request Created');
    }
  }, [user, addActivityLog]);

  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (request && request.requesterId === user.id && !request.viewedByRequester) {
      update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true });
    }
  }, [user, internalRequests]);

  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if (!user) return;
    const request = internalRequests.find(r => r.id === requestId);
    if (!request) return;

    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(request.comments) ? request.comments : (request.comments ? Object.values(request.comments) : []);
    
    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/status`] = status;
    updates[`internalRequests/${requestId}/approverId`] = user.id;
    updates[`internalRequests/${requestId}/viewedByRequester`] = false;
    updates[`internalRequests/${requestId}/comments`] = [...existingComments, newComment];

    update(ref(rtdb), updates);
  }, [user, internalRequests]);

  const updateInternalRequestItems = useCallback((requestId: string, items: InternalRequest['items']) => {
    if (user) {
        const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { userId: user.id, text: 'Request items updated by store keeper.', date: new Date().toISOString() };
        set(newCommentRef, newComment);
        update(ref(rtdb, `internalRequests/${requestId}`), { items, viewedByRequester: false });
    }
  }, [user]);

  const deleteInternalRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `internalRequests/${requestId}`));
    addActivityLog(user.id, 'Internal Request Deleted', `Request ID: ${requestId}`);
  }, [user, addActivityLog]);

  const acknowledgeInternalRequest = useCallback((requestId: string) => {
    if (user) {
      update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true });
      addActivityLog(user.id, 'Acknowledged Store Request', `Request ID: ${requestId}`);
    }
  }, [user, addActivityLog]);
  
  const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => {
    if (user) {
        const newRequestRef = push(ref(rtdb, 'managementRequests'));
        const newRequest: Omit<ManagementRequest, 'id'> = { ...requestData, requesterId: user.id, date: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', comments: [], viewedByRequester: true };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'Management Request Created');
    }
  }, [user, addActivityLog]);
  
  const updateManagementRequest = useCallback((request: ManagementRequest) => {
    if(!user) return;
    const { id, ...data } = request;
    update(ref(rtdb, `managementRequests/${id}`), data);
    addActivityLog(user.id, 'Management Request Updated', request.subject);
  }, [user, addActivityLog]);

  const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => {
    if (user) {
        const request = managementRequests.find(r => r.id === requestId);
        if (!request) return;

        const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
        const existingComments = Array.isArray(request.comments) ? request.comments : (request.comments ? Object.values(request.comments) : []);

        const updates: { [key: string]: any } = {};
        updates[`managementRequests/${requestId}/status`] = status;
        updates[`managementRequests/${requestId}/viewedByRequester`] = false;
        updates[`managementRequests/${requestId}/comments`] = [...existingComments, newComment];

        update(ref(rtdb), updates);
    }
  }, [user, managementRequests]);

  const deleteManagementRequest = useCallback((requestId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `managementRequests/${requestId}`));
    addActivityLog(user.id, 'Management Request Deleted', `Request ID: ${requestId}`);
  }, [user, addActivityLog]);
  
  const markManagementRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    const request = managementRequests.find(r => r.id === requestId);
    if (request && request.requesterId === user.id && !request.viewedByRequester) {
      update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true });
    }
  }, [user, managementRequests]);
  
  const addPpeRequest = useCallback(async (requestData: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
    if (!user) return;

    const newRequestRef = push(ref(rtdb, 'ppeRequests'));
    const requestId = newRequestRef.key || `ppe-${Date.now()}`;
    const updates: { [key: string]: any } = {};
    
    const manager = users.find(u => u.role === 'Manager');
    
    const initialComment: Comment = {
      id: `ppe-comm-${Date.now()}`,
      userId: user.id,
      text: requestData.remarks || 'Request created.',
      date: new Date().toISOString()
    };
    
    const newRequestData: Omit<PpeRequest, 'id'> = {
      ...requestData,
      requesterId: user.id,
      date: new Date().toISOString(),
      status: 'Pending',
      approverId: manager?.id,
      comments: [initialComment],
      viewedByRequester: true,
    };
    updates[`ppeRequests/${requestId}`] = newRequestData;
    addActivityLog(user.id, 'PPE Request Created', `For ${requestData.manpowerId}`);

    const manpowerProfile = manpowerProfiles.find(p => p.id === requestData.manpowerId);
    if (manpowerProfile) {
        if (requestData.ppeType === 'Coverall') {
            updates[`manpowerProfiles/${requestData.manpowerId}/coverallSize`] = requestData.size;
        } else if (requestData.ppeType === 'Safety Shoes') {
            updates[`manpowerProfiles/${requestData.manpowerId}/shoeSize`] = requestData.size;
        }
    }

    await update(ref(rtdb), updates);
    
    if (manpowerProfile) {
      const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
      const stockInfo = requestData.ppeType === 'Coverall' 
          ? `Size ${requestData.size}: ${stockItem?.sizes?.[requestData.size] || 0}`
          : `Total: ${stockItem?.quantity || 0}`;
      
      const subject = `PPE Request from ${user.name} for ${manpowerProfile.name} — ${requestData.ppeType}`;
      const eligibilityHtml = requestData.eligibility ? `
        <p style="margin-top: 20px; padding: 10px; border-left: 4px solid ${requestData.eligibility.eligible ? '#28a745' : '#dc3545'}; background-color: #f8f9fa;">
          <strong style="color: ${requestData.eligibility.eligible ? '#28a745' : '#dc3545'};">Eligibility Status: ${requestData.eligibility.eligible ? 'Eligible' : 'Not Eligible'}</strong><br>
          ${requestData.eligibility.reason}
        </p>
      ` : '';
      
      const justificationHtml = requestData.newRequestJustification ? `
        <p style="margin-top: 20px; padding: 10px; border-left: 4px solid #ffc107; background-color: #fff3cd;">
          <strong style="color: #856404;">Justification for 'New' Request:</strong><br>
          ${requestData.newRequestJustification}
        </p>
      ` : '';

      const lastIssueRecord = manpowerProfile.ppeHistory?.filter(h => h.ppeType === requestData.ppeType).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];
      const lastIssueDate = lastIssueRecord ? format(new Date(lastIssueRecord.issueDate), 'dd MMM, yyyy') : 'N/A';
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;">
          <h2 style="color: #0056b3;">New PPE Request for Approval</h2>
          
          <p><strong>Employee:</strong> ${manpowerProfile.name}</p>
          <p><strong>Type:</strong> ${requestData.ppeType} &middot; <strong>Size:</strong> ${requestData.size} &middot; <strong>Qty:</strong> ${requestData.quantity || 1}</p>
          <p><strong>Request Type:</strong> ${requestData.requestType}</p>
          
           ${justificationHtml}

          <p style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            <strong>Joining Date:</strong> ${manpowerProfile.joiningDate ? format(new Date(manpowerProfile.joiningDate), 'dd MMM, yyyy') : 'N/A'}<br>
            <strong>Last Issue Date:</strong> ${lastIssueDate}<br>
            <strong>Current Stock:</strong> <span style="font-weight: bold; color: #d9534f;">${stockInfo || 'N/A'}</span>
          </p>

          ${eligibilityHtml}

          <p><strong>Remarks:</strong> ${requestData.remarks || 'None'}</p>
          
          ${requestData.attachmentUrl ? `<p><strong>Attachment:</strong> <a href="${requestData.attachmentUrl}" style="color: #0056b3; text-decoration: none;">View Attached Image</a></p>` : ''}
          
          <p><strong>Requested By:</strong> ${user.name}</p>

          <p style="margin-top: 25px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-requests" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; background-color: #007bff; border-top: 12px solid #007bff; border-bottom: 12px solid #007bff; border-right: 18px solid #007bff; border-left: 18px solid #007bff; display: inline-block;">
                Review Request
            </a>
          </p>
        </div>
      `;

      await sendEmail({
          to: 'harikrishnan.bornagain@gmail.com',
          subject,
          html: htmlBody,
      });
    }

  }, [user, users, addActivityLog, manpowerProfiles, ppeStock]);
  
  const updatePpeRequest = useCallback((request: PpeRequest) => {
    if(!user || user.role !== 'Admin') return;
    const { id, ...data } = request;
    update(ref(rtdb, `ppeRequests/${id}`), data);
    addActivityLog(user.id, 'PPE Request Updated by Admin', `Request ID: ${id}`);
  }, [user, addActivityLog]);

  const deletePpeRequest = useCallback((requestId: string) => {
      if(!user || user.role !== 'Admin') return;
      remove(ref(rtdb, `ppeRequests/${requestId}`));
      addActivityLog(user.id, 'PPE Request Deleted', `Request ID: ${requestId}`);
  }, [user, addActivityLog]);
  
  const deletePpeAttachment = useCallback((requestId: string) => {
      if(!user || user.role !== 'Admin') return;
      update(ref(rtdb, `ppeRequests/${requestId}`), { attachmentUrl: null });
      addActivityLog(user.id, 'PPE Attachment Deleted', `For Request ID: ${requestId}`);
  }, [user, addActivityLog]);
  
  const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (!request) return;

    const newComment: Comment = { id: `ppe-comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(request.comments) ? request.comments : (request.comments ? Object.values(request.comments) : []);
    
    const updates: { [key: string]: any } = {};
    updates[`ppeRequests/${requestId}/status`] = status;
    updates[`ppeRequests/${requestId}/approverId`] = user.id;
    updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
    updates[`ppeRequests/${requestId}/comments`] = [...existingComments, newComment];

    if (status === 'Issued') {
        const manpowerId = request.manpowerId;
        const profile = manpowerProfiles.find(p => p.id === manpowerId);
        if (profile) {
            const newHistoryItem: PpeHistoryRecord = {
                id: `ppe-hist-${Date.now()}`,
                ppeType: request.ppeType,
                size: request.size,
                quantity: request.quantity,
                issueDate: new Date().toISOString(),
                requestType: request.requestType,
                remarks: request.remarks,
                storeComment: comment,
                requestId: request.id,
                issuedById: user.id,
                approverId: request.approverId
            };
            const updatedPpeHistory = [...(profile.ppeHistory || []), newHistoryItem];
            updates[`/manpowerProfiles/${manpowerId}/ppeHistory`] = updatedPpeHistory;
        }

        if (request.ppeType === 'Coverall') {
            const coverallStock = ppeStock.find(s => s.id === 'coveralls');
            if (coverallStock?.sizes) {
                const currentSizeStock = coverallStock.sizes[request.size] || 0;
                const quantityToDeduct = request.quantity || 1;
                updates[`/ppeStock/coveralls/sizes/${request.size}`] = Math.max(0, currentSizeStock - quantityToDeduct);
            }
        } else if (request.ppeType === 'Safety Shoes') {
            const shoeStock = ppeStock.find(s => s.id === 'safetyShoes');
            if (shoeStock?.quantity) {
                updates[`/ppeStock/safetyShoes/quantity`] = Math.max(0, shoeStock.quantity - 1);
            }
        }
    }

    update(ref(rtdb), updates);
  }, [user, ppeRequests, manpowerProfiles, ppeStock]);

  const addPpeHistoryFromExcel = useCallback(async (data: any[]): Promise<{ importedCount: number; notFoundCount: number; }> => {
    if (!user) return { importedCount: 0, notFoundCount: 0 };
    
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    const findProfile = (name: string) => {
        const normalizedName = normalize(name);
        return manpowerProfiles.find(p => normalize(p.name) === normalizedName);
    };

    let importedCount = 0;
    let notFoundCount = 0;
    const updates: { [key: string]: any } = {};
    const coverallsStockUpdates: { [size: string]: number } = {};
    
    for (const row of data) {
      const employeeName = row['Employee Name'];
      const size = row['Size']?.toString().toUpperCase();
      const dateValue = row['Date'];
      
      if (!employeeName || !size || !dateValue) continue;

      const profile = findProfile(employeeName);
      
      if (profile) {
        let parsedDate: Date | null = null;
        if (dateValue instanceof Date && isValid(dateValue)) {
            parsedDate = dateValue;
        } else if (typeof dateValue === 'string') {
            const trimmedDate = dateValue.trim();
            // Try parsing various common formats
            const formatsToTry = ['dd-MM-yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'yyyy/MM/dd', 'dd/MM/yy', 'd/M/yy'];
            for (const fmt of formatsToTry) {
                parsedDate = parse(trimmedDate, fmt, new Date());
                if (isValid(parsedDate)) break;
            }
            if (!isValid(parsedDate)) parsedDate = parseISO(trimmedDate);
        } else if (typeof dateValue === 'number') { // Handle Excel date serial numbers
            const excelEpoch = new Date(1899, 11, 30);
            parsedDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        }

        if (!parsedDate || !isValid(parsedDate)) {
            console.warn(`Skipping row due to invalid date for ${employeeName}:`, dateValue);
            notFoundCount++;
            continue;
        }

        const issueDate = parsedDate.toISOString();

        const newHistoryItem: PpeHistoryRecord = {
          id: `ppe-hist-import-${Date.now()}-${importedCount}`,
          ppeType: 'Coverall',
          size,
          quantity: 1,
          issueDate,
          requestType: 'New', // Default for imported records
          issuedById: user.id,
        };

        const existingHistory = Array.isArray(profile.ppeHistory) ? profile.ppeHistory : [];
        updates[`/manpowerProfiles/${profile.id}/ppeHistory`] = [...existingHistory, newHistoryItem];
        
        coverallsStockUpdates[size] = (coverallsStockUpdates[size] || 0) + 1;
        
        importedCount++;
      } else {
        notFoundCount++;
      }
    }
    
    const coverallsStock = ppeStock.find(s => s.id === 'coveralls');
    if (coverallsStock) {
        const currentSizes = coverallsStock.sizes || {};
        for (const size in coverallsStockUpdates) {
            currentSizes[size] = (currentSizes[size] || 0) - coverallsStockUpdates[size];
            if (currentSizes[size] < 0) currentSizes[size] = 0;
        }
        updates['/ppeStock/coveralls/sizes'] = currentSizes;
    }
    
    if (Object.keys(updates).length > 0) {
      await update(ref(rtdb), updates);
      addActivityLog(user.id, 'Bulk PPE Import', `Imported ${importedCount} records. ${notFoundCount} names not found.`);
    }

    return { importedCount, notFoundCount };
  }, [user, manpowerProfiles, ppeStock, addActivityLog]);

  const markPpeRequestAsViewed = useCallback((requestId: string) => {
    if (!user) return;
    const request = ppeRequests.find(r => r.id === requestId);
    if (request && request.requesterId === user.id && !request.viewedByRequester) {
      update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true });
    }
  }, [user, ppeRequests]);

  const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => {
    if (!user) return;
    const stockRef = ref(rtdb, `ppeStock/${stockId}`);
    let updateData: Partial<PpeStock> = { lastUpdated: new Date().toISOString() };
    if (stockId === 'coveralls') {
        updateData.sizes = data as { [key: string]: number };
    } else {
        updateData.quantity = data as number;
    }
    update(stockRef, updateData);
    addActivityLog(user.id, 'PPE Stock Updated', `Updated stock for ${stockId}`);
  }, [user, addActivityLog]);
  
  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    if (!user) return;
    const newItemRef = push(ref(rtdb, 'inventoryItems'));
    set(newItemRef, { ...itemData, lastUpdated: new Date().toISOString() });
    addActivityLog(user.id, 'Inventory Item Added', `Added ${itemData.name} (SN: ${itemData.serialNumber})`);
  }, [user, addActivityLog]);
  
  const deleteInventoryItem = useCallback((itemId: string) => {
    if (!user) return;
    const item = inventoryItems.find(i => i.id === itemId);
    remove(ref(rtdb, `inventoryItems/${itemId}`));
    if(item) addActivityLog(user.id, 'Inventory Item Deleted', `Deleted ${item?.name} (SN: ${item?.serialNumber})`);
  }, [user, inventoryItems, addActivityLog]);
  
  const addMultipleInventoryItems = useCallback((itemsToImport: any[]) => {
    if (!user) return 0;
    let importedCount = 0;
    const updates: { [key: string]: any } = {};
    itemsToImport.forEach(item => {
        try {
            const serialNumber = item['SERIAL NUMBER']?.toString();
            if (!serialNumber) return;
            const existingItem = inventoryItems.find(i => i.serialNumber === serialNumber);
            const project = projects.find(p => p.name.toLowerCase() === item['PROJECT']?.toLowerCase());
            if (!project) return;
            const newItemData = { name: item['ITEM NAME'], serialNumber, chestCrollNo: item['CHEST CROLL NO']?.toString(), ariesId: item['ARIES ID']?.toString(), inspectionDate: new Date(item['INSPECTION DATE']).toISOString(), inspectionDueDate: new Date(item['INSPECTION DUE DATE']).toISOString(), tpInspectionDueDate: new Date(item['TP INSPECTION DUE DATE']).toISOString(), status: item['STATUS'] as InventoryItemStatus || 'In Store', projectId: project.id, lastUpdated: new Date().toISOString() };
            
            const key = existingItem ? existingItem.id : push(ref(rtdb, 'inventoryItems')).key;
            if (key) {
              updates[`/inventoryItems/${key}`] = existingItem ? { ...existingItem, ...newItemData } : { ...newItemData, id: key };
              importedCount++;
            }
        } catch(e) { console.error("Skipping invalid row:", item, e); }
    });
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Bulk Inventory Import', `Imported ${importedCount} items.`);
    return importedCount;
  }, [user, inventoryItems, projects, addActivityLog]);
  
  const updateInventoryItem = useCallback((item: InventoryItem) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `inventoryItems/${id}`), { ...data, lastUpdated: new Date().toISOString() });
    addActivityLog(user.id, 'Inventory Item Updated', `Updated ${item.name} (SN: ${item.serialNumber})`);
  }, [user, addActivityLog]);
  
  const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => {
    if (!user) return;
    const newRequestRef = push(ref(rtdb, 'certificateRequests'));

    const newRequest: Partial<Omit<CertificateRequest, 'id'>> = {
      requesterId: user.id,
      requestType: requestData.requestType,
      status: 'Pending',
      requestDate: new Date().toISOString(),
      viewedByRequester: true
    };
    
    const initialComment = requestData.remarks 
      ? { id: `crc-${Date.now()}`, userId: user.id, text: requestData.remarks, date: new Date().toISOString() } 
      : { id: `crc-${Date.now()}`, userId: user.id, text: 'Request created.', date: new Date().toISOString() };

    newRequest.comments = [initialComment];

    if (requestData.itemId) newRequest.itemId = requestData.itemId;
    if (requestData.utMachineId) newRequest.utMachineId = requestData.utMachineId;
    if (requestData.dftMachineId) newRequest.dftMachineId = requestData.dftMachineId;

    set(newRequestRef, newRequest as Omit<CertificateRequest, 'id'>);
    addActivityLog(user.id, 'Certificate Requested', `Type: ${requestData.requestType}`);
  }, [user, addActivityLog]);
  
  const addCertificateRequestComment = useCallback(async (requestId: string, comment: string) => {
    if (!user) return;
    const requestRef = ref(rtdb, `certificateRequests/${requestId}`);
    const snapshot = await get(requestRef);
    if (!snapshot.exists()) return;
  
    const request = snapshot.val();
    const existingComments = Array.isArray(request.comments) ? request.comments : (request.comments ? Object.values(request.comments) : []);
    
    const newCommentId = push(ref(rtdb, `certificateRequests/${requestId}/comments`)).key;
    if (!newCommentId) return;

    const newComment: Comment = { id: newCommentId, userId: user.id, text: comment, date: new Date().toISOString() };
    const updatedComments = [...existingComments, newComment];
  
    update(requestRef, { 
      comments: updatedComments,
      lastUpdated: new Date().toISOString(), 
      viewedByRequester: false 
    });
  }, [user]);

  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    addCertificateRequestComment(requestId, comment);
    update(ref(rtdb, `certificateRequests/${requestId}`), { 
      status: 'Completed', 
      completionDate: new Date().toISOString(),
      viewedByRequester: false 
    });
    addActivityLog(user.id, 'Certificate Request Fulfilled', `Request ID: ${requestId}`);
  }, [user, addActivityLog, addCertificateRequestComment]);

  const markFulfilledRequestsAsViewed = useCallback((requestType: 'store' | 'equipment') => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    certificateRequests.forEach(req => {
      const isStoreReq = !!req.itemId;
      const isEquipmentReq = !!req.utMachineId || !!req.dftMachineId;

      if (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester) {
        if ((requestType === 'store' && isStoreReq) || (requestType === 'equipment' && isEquipmentReq)) {
            updates[`/certificateRequests/${req.id}/viewedByRequester`] = true;
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

  const addIncidentReport = useCallback((incidentData: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if (!user) return;
    const newIncidentRef = push(ref(rtdb, 'incidentReports'));
    
    const supervisors = new Set<string>();
    if (user.supervisorId) supervisors.add(user.supervisorId);
    
    users.forEach(u => {
      if (u.role === 'HSE' || (u.supervisorId === user.supervisorId && u.role === 'Supervisor')) {
        supervisors.add(u.id);
      }
    });

    const newIncident: Omit<IncidentReport, 'id'> = {
      ...incidentData,
      reporterId: user.id,
      reportTime: new Date().toISOString(),
      status: 'New',
      isPublished: false,
      reportedToUserIds: Array.from(supervisors),
      comments: [{ id: 'comm-1', userId: user.id, text: 'Incident reported.', date: new Date().toISOString() }],
      lastUpdated: new Date().toISOString(),
      viewedBy: [user.id],
    };

    set(newIncidentRef, newIncident);
    addActivityLog(user.id, 'Incident Reported');
  }, [user, users, addActivityLog]);

  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
    if (!user) return;
    const { id, ...data } = incident;

    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
    const existingComments = Array.isArray(incident.comments) ? incident.comments : (incident.comments ? Object.values(incident.comments) : []);

    const updates = {
      ...data,
      comments: [...existingComments, newComment],
      lastUpdated: new Date().toISOString(),
      viewedBy: [user.id],
    };
    
    update(ref(rtdb, `incidentReports/${id}`), updates);
    addActivityLog(user.id, 'Incident Updated', `Incident ID: ${id}`);
  }, [user, addActivityLog]);
  
  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;
    const newComment: Comment = { id: `comm-${Date.now()}`, userId: user.id, text, date: new Date().toISOString() };
    const existingComments = Array.isArray(incident.comments) ? incident.comments : (incident.comments ? Object.values(incident.comments) : []);
    
    update(ref(rtdb, `incidentReports/${incidentId}`), {
      comments: [...existingComments, newComment],
      lastUpdated: new Date().toISOString(),
      viewedBy: [user.id]
    });
  }, [user, incidentReports]);

  const publishIncident = useCallback((incidentId: string, comment: string) => {
    if (!user || user.role !== 'Admin') return;
    addIncidentComment(incidentId, comment);
    update(ref(rtdb, `incidentReports/${incidentId}`), { isPublished: true, viewedBy: [user.id] });
    addActivityLog(user.id, 'Incident Published', `Incident ID: ${incidentId}`);
  }, [user, addActivityLog, addIncidentComment]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;
    addIncidentComment(incidentId, comment);
    const updatedParticipants = Array.from(new Set([...(incident.reportedToUserIds || []), ...userIds]));
    update(ref(rtdb, `incidentReports/${incidentId}`), { reportedToUserIds: updatedParticipants, viewedBy: [user.id] });
  }, [user, incidentReports, addIncidentComment]);
  
  const markIncidentAsViewed = useCallback((incidentId: string) => {
    if (!user) return;
    const incident = incidentReports.find(i => i.id === incidentId);
    if (incident && !incident.viewedBy.includes(user.id)) {
      update(ref(rtdb, `incidentReports/${incidentId}`), { viewedBy: [...incident.viewedBy, user.id] });
    }
  }, [user, incidentReports]);
  
  const addFeedback = useCallback((subject: string, message: string) => {
    if (!user) return;
    const newFeedbackRef = push(ref(rtdb, 'feedback'));
    const newFeedback: Omit<Feedback, 'id'> = {
      userId: user.id,
      subject,
      message,
      date: new Date().toISOString(),
      status: 'New',
      viewedBy: [],
    };
    set(newFeedbackRef, newFeedback);
    addActivityLog(user.id, 'Feedback Submitted', subject);
  }, [user, addActivityLog]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    if (!user || !can.manage_feedback) return;
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
    addActivityLog(user.id, 'Feedback Status Updated', `Set feedback ${feedbackId} to ${status}`);
  }, [user, can.manage_feedback, addActivityLog]);
  
  const markFeedbackAsViewed = useCallback(() => {
    if (!user || !can.manage_feedback) return;
    const updates: { [key: string]: any } = {};
    feedback.forEach(f => {
      const viewedBy = f.viewedBy || [];
      if (!viewedBy.includes(user.id)) {
        updates[`/feedback/${f.id}/viewedBy`] = [...viewedBy, user.id];
      }
    });
    if (Object.keys(updates).length > 0) {
      update(ref(rtdb), updates);
    }
  }, [user, can.manage_feedback, feedback]);

  const computedValue = useMemo(() => {
    if (!user) {
      return { pendingTaskApprovalCount: 0, myNewTaskCount: 0, myPendingTaskRequestCount: 0, myFulfilledStoreCertRequestCount: 0, myFulfilledEquipmentCertRequests: [], workingManpowerCount: 0, onLeaveManpowerCount: 0, pendingStoreCertRequestCount: 0, pendingEquipmentCertRequestCount: 0, plannerNotificationCount: 0, unreadPlannerCommentDays: [], pendingInternalRequestCount: 0, updatedInternalRequestCount: 0, pendingManagementRequestCount: 0, updatedManagementRequestCount: 0, incidentNotificationCount: 0, pendingPpeRequestCount: 0, updatedPpeRequestCount: 0, pendingPaymentApprovalCount: 0, pendingPasswordResetRequestCount: 0, pendingFeedbackCount: 0 };
    }
    const pendingTaskApprovalCount = tasks.filter(t => t.approverId === user.id && t.status === 'Pending Approval').length;
    const myNewTaskCount = tasks.filter(t => t.assigneeIds.includes(user.id) && !(t.viewedBy || []).includes(user.id)).length;
    const myPendingTaskRequestCount = tasks.filter(t => t.assigneeIds.includes(user.id) && (t.status === 'Pending Approval' || t.approvalState === 'returned')).length;
    const myFulfilledStoreCertRequestCount = certificateRequests.filter(req => req.requesterId === user.id && !!req.itemId && req.status === 'Completed' && !req.viewedByRequester).length;
    const myFulfilledEquipmentCertRequests = certificateRequests.filter(req => req.requesterId === user.id && (!!req.utMachineId || !!req.dftMachineId) && req.status === 'Completed' && !req.viewedByRequester);
    const workingManpowerCount = manpowerProfiles.filter(p => p.status === 'Working').length;
    const onLeaveManpowerCount = manpowerProfiles.filter(p => p.status === 'On Leave').length;
    const pendingStoreCertRequestCount = can.manage_inventory ? certificateRequests.filter(req => req.status === 'Pending' && !!req.itemId).length : 0;
    const pendingEquipmentCertRequestCount = can.manage_equipment_status ? certificateRequests.filter(req => req.status === 'Pending' && (!!req.utMachineId || !!req.dftMachineId)).length : 0;
    const unreadPlannerCommentDays = dailyPlannerComments
        .filter(dpc => dpc.plannerUserId === user.id && !(dpc.viewedBy || []).includes(user.id))
        .map(dpc => dpc.day);
    const plannerNotificationCount = unreadPlannerCommentDays.length;
    const pendingInternalRequestCount = can.approve_store_requests ? internalRequests.filter(r => r.status === 'Pending').length : 0;
    const updatedInternalRequestCount = internalRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester && r.status !== 'Pending').length;
    const isManager = user.role === 'Manager' || user.role === 'Admin';
    const pendingManagementRequestCount = managementRequests.filter(r => r.recipientId === user.id && r.status === 'Pending').length;
    const updatedManagementRequestCount = managementRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester && r.status !== 'Pending').length;
    const incidentNotificationCount = incidentReports.filter(i => i.reportedToUserIds.includes(user.id) && !i.viewedBy.includes(user.id)).length;
    const pendingPpeRequestCount = isManager ? ppeRequests.filter(r => r.status === 'Pending').length : 0;
    const updatedPpeRequestCount = ppeRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester && r.status !== 'Pending').length;
    const pendingPaymentApprovalCount = isManager ? payments.filter(p => p.status === 'Pending').length : 0;
    const pendingPasswordResetRequestCount = can.manage_password_resets ? passwordResetRequests.filter(r => r.status === 'pending').length : 0;
    const pendingFeedbackCount = can.manage_feedback ? feedback.filter(f => !f.viewedBy?.includes(user.id)).length : 0;

    return { pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledStoreCertRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount, pendingPpeRequestCount, updatedPpeRequestCount, pendingPaymentApprovalCount, pendingPasswordResetRequestCount, pendingFeedbackCount };
  }, [user, tasks, certificateRequests, manpowerProfiles, can, dailyPlannerComments, internalRequests, managementRequests, incidentReports, ppeRequests, payments, passwordResetRequests, feedback]);


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
    
    














    


