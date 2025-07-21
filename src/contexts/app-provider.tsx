

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, LaptopDesktop, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role, DigitalCamera, Anemometer, OtherEquipment, JobSchedule, LeaveRecord } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter, startOfDay, parse, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';

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
  appName: string;
  appLogo: string | null;

  // Auth
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatar: string, password?: string) => void;

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

  // Functions
  getVisibleUsers: () => User[];
  getAssignableUsers: () => User[];
  createTask: (task: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeIds' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee'> & { assigneeId: string }) => void;
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
  rejoinFromLeave: (manpowerId: string, leaveId: string, rejoinedDate: Date) => void;
  confirmManpowerLeave: (manpowerId: string, leaveId: string) => void;
  cancelManpowerLeave: (manpowerId: string, leaveId: string) => void;
  updateLeaveRecord: (manpowerId: string, leaveRecord: LeaveRecord) => void;
  deleteLeaveRecord: (manpowerId: string, leaveId: string) => void;
  addInternalRequest: (request: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
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
  addMachineLog: (log: Omit<MachineLog, 'id'>) => void;
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
      setAnnouncements([]); setBuildings([]); setJobSchedules([]);
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
    if (user.role === 'Admin' || user.role === 'Project Coordinator') {
        return users;
    }
     if (user.role === 'Document Controller') {
        return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator');
    }

    const subordinateIds = getSubordinateChain(user.id, users);
    return users.filter(u => u.id === user.id || subordinateIds.has(u.id));
  }, [user, users, getSubordinateChain]);

  const getAssignableUsers = useCallback(() => {
    if (!user) return [];
    if (user.role === 'Admin' || user.role === 'Project Coordinator') {
        return users.filter(u => u.role !== 'Admin');
    }
    if (user.role === 'Document Controller') {
      return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator');
    }

    const subordinateIds = getSubordinateChain(user.id, users);
    return users.filter(u => u.id === user.id || subordinateIds.has(u.id));
  }, [user, users, getSubordinateChain]);

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeIds' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee'> & { assigneeId: string }) => {
    if(!user) return;
    const { assigneeId, ...rest } = taskData;
    const tasksRef = ref(rtdb, 'tasks');
    const newTaskRef = push(tasksRef);
    const newTask: Omit<Task, 'id'> = {
        ...rest,
        creatorId: user.id,
        status: 'To Do',
        assigneeId: assigneeId,
        assigneeIds: [assigneeId],
        comments: [],
        isViewedByAssignee: false,
        approvalState: 'none'
    };
    set(newTaskRef, newTask);
    const assignee = users.find(u => u.id === newTask.assigneeId);
    addActivityLog(user.id, 'Task Created', `Task "${newTask.title}" for ${assignee?.name}`);
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
    const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString() };
    set(newCommentRef, newComment);
    addActivityLog(user.id, 'Comment Added', `Task ID: ${taskId}`);
  }, [user, addActivityLog]);

  const requestTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus, commentText: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    addComment(taskId, commentText);

    const approverId = task.creatorId;

    const updates: Partial<Task> = { 
        status: 'Pending Approval', 
        approvalState: 'pending', 
        previousStatus: task.status, 
        pendingStatus: newStatus,
        approverId: approverId
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
    };

    if (task.pendingAssigneeId) { // Reassignment
      updates.assigneeId = task.pendingAssigneeId;
      updates.assigneeIds = [task.pendingAssigneeId];
      updates.pendingAssigneeId = null;
      updates.status = 'To Do';
      updates.approvalState = 'none';
      updates.isViewedByAssignee = false;
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
      approvalState: 'returned' 
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
      approverId: task.creatorId
    };
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Reassignment Requested', `Task "${task.title}" to ${users.find(u => u.id === newAssigneeId)?.name}`);
  }, [user, tasks, users, addActivityLog, addComment]);

  const markTaskAsViewed = useCallback((taskId: string) => {
    update(ref(rtdb, `tasks/${taskId}`), { isViewedByAssignee: true });
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
    update(ref(rtdb, `vehicles/${id}`), data);
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
    if(!user) return;
    const newProfileRef = push(ref(rtdb, 'manpowerProfiles'));
    set(newProfileRef, profile);
    addActivityLog(user.id, 'Manpower Profile Added', profile.name);
  }, [user, addActivityLog]);
  
  const addMultipleManpowerProfiles = useCallback((profilesToImport: any[]): number => {
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
                    const parsedDate = parse(dateInput, 'dd-MM-yyyy', new Date());
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
    
    // Helper function to clean undefined values recursively
    const cleanData = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(item => cleanData(item)).filter(item => item !== null);
      } else if (obj !== null && typeof obj === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
          if (obj[key] !== undefined) {
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
  
  const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester' | 'acknowledgedByRequester'>) => {
    if(user) {
        const newRequestRef = push(ref(rtdb, 'internalRequests'));
        const newRequest: Omit<InternalRequest, 'id'> = { ...requestData, requesterId: user.id, date: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', comments: [], viewedByRequester: true, acknowledgedByRequester: false };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'Internal Request Created');
    }
  }, [user, addActivityLog]);

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

  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    update(ref(rtdb, `internalRequests/${requestId}`), { viewedByRequester: true });
  }, []);
  
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
    update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true });
  }, []);

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
  
  const addMultipleInventoryItems = useCallback((itemsToImport: any[]): number => {
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
  
  const acknowledgeFulfilledRequest = useCallback((requestId: string) => {
    remove(ref(rtdb, `certificateRequests/${requestId}`));
  }, []);
  
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
  
  const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => {
    if (!user) return;
    const newMachineRef = push(ref(rtdb, 'utMachines'));
    set(newMachineRef, machine);
    addActivityLog(user.id, 'UT Machine Added', `Added ${machine.machineName}`);
  }, [user, addActivityLog]);
  
  const updateUTMachine = useCallback((machine: UTMachine) => {
    if (!user) return;
    const { id, ...data } = machine;
    update(ref(rtdb, `utMachines/${id}`), data);
    addActivityLog(user.id, 'UT Machine Updated', `Updated ${machine.machineName}`);
  }, [user, addActivityLog]);

  const deleteUTMachine = useCallback((machineId: string) => {
    if (!user) return;
    remove(ref(rtdb, `utMachines/${machineId}`));
    addActivityLog(user.id, 'UT Machine Deleted', `Machine ID: ${machineId}`);
  }, [user, addActivityLog]);

  const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => {
    if (!user) return;
    const newMachineRef = push(ref(rtdb, 'dftMachines'));
    set(newMachineRef, machine);
    addActivityLog(user.id, 'DFT Machine Added', `Added ${machine.machineName}`);
  }, [user, addActivityLog]);

  const updateDftMachine = useCallback((machine: DftMachine) => {
    if (!user) return;
    const { id, ...data } = machine;
    update(ref(rtdb, `dftMachines/${id}`), data);
    addActivityLog(user.id, 'DFT Machine Updated', `Updated ${machine.machineName}`);
  }, [user, addActivityLog]);

  const deleteDftMachine = useCallback((machineId: string) => {
    if (!user) return;
    remove(ref(rtdb, `dftMachines/${machineId}`));
    addActivityLog(user.id, 'DFT Machine Deleted', `Machine ID: ${machineId}`);
  }, [user, addActivityLog]);

  const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => {
    if (!user) return;
    const newItemRef = push(ref(rtdb, 'mobileSims'));
    set(newItemRef, item);
    addActivityLog(user.id, 'Mobile/SIM Added', `Added ${item.type} with number ${item.number}`);
  }, [user, addActivityLog]);
  
  const updateMobileSim = useCallback((item: MobileSim) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `mobileSims/${id}`), data);
    addActivityLog(user.id, 'Mobile/SIM Updated', `Updated ${item.number}`);
  }, [user, addActivityLog]);
  
  const deleteMobileSim = useCallback((itemId: string) => {
    if (!user) return;
    const item = mobileSims.find(i => i.id === itemId);
    remove(ref(rtdb, `mobileSims/${itemId}`));
    if(item) addActivityLog(user.id, 'Mobile/SIM Deleted', `Deleted ${item.number}`);
  }, [user, mobileSims, addActivityLog]);
  
  const addLaptopDesktop = useCallback((item: Omit<LaptopDesktop, 'id'>) => {
    if (!user) return;
    const newItemRef = push(ref(rtdb, 'laptopsDesktops'));
    set(newItemRef, item);
    addActivityLog(user.id, 'Laptop/Desktop Added', `Added ${item.make} ${item.model}`);
  }, [user, addActivityLog]);

  const updateLaptopDesktop = useCallback((item: LaptopDesktop) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `laptopsDesktops/${id}`), data);
    addActivityLog(user.id, 'Laptop/Desktop Updated', `Updated ${item.make} ${item.model}`);
  }, [user, addActivityLog]);

  const deleteLaptopDesktop = useCallback((itemId: string) => {
    if (!user) return;
    const item = laptopsDesktops.find(i => i.id === itemId);
    remove(ref(rtdb, `laptopsDesktops/${itemId}`));
    if(item) addActivityLog(user.id, 'Laptop/Desktop Deleted', `Deleted ${item.make} ${item.model}`);
  }, [user, laptopsDesktops, addActivityLog]);
  
  const addDigitalCamera = useCallback((camera: Omit<DigitalCamera, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'digitalCameras'));
    set(newRef, camera);
    addActivityLog(user.id, 'Digital Camera Added', `Added ${camera.make} ${camera.model}`);
  }, [user, addActivityLog]);

  const updateDigitalCamera = useCallback((camera: DigitalCamera) => {
    if (!user) return;
    const { id, ...data } = camera;
    update(ref(rtdb, `digitalCameras/${id}`), data);
    addActivityLog(user.id, 'Digital Camera Updated', `Updated ${camera.make} ${camera.model}`);
  }, [user, addActivityLog]);

  const deleteDigitalCamera = useCallback((cameraId: string) => {
    if (!user) return;
    const camera = digitalCameras.find(c => c.id === cameraId);
    remove(ref(rtdb, `digitalCameras/${cameraId}`));
    if (camera) addActivityLog(user.id, 'Digital Camera Deleted', `Deleted ${camera.make} ${camera.model}`);
  }, [user, addActivityLog, digitalCameras]);

  const addAnemometer = useCallback((anemometer: Omit<Anemometer, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'anemometers'));
    const dataToSave = {
        ...anemometer,
        calibrationDueDate: anemometer.calibrationDueDate ? new Date(anemometer.calibrationDueDate).toISOString() : null
    };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'Anemometer Added', `Added ${anemometer.make} ${anemometer.model}`);
  }, [user, addActivityLog]);

  const updateAnemometer = useCallback((anemometer: Anemometer) => {
    if (!user) return;
    const { id, ...data } = anemometer;
    update(ref(rtdb, `anemometers/${id}`), data);
    addActivityLog(user.id, 'Anemometer Updated', `Updated ${anemometer.make} ${anemometer.model}`);
  }, [user, addActivityLog]);

  const deleteAnemometer = useCallback((anemometerId: string) => {
    if (!user) return;
    const anemometer = anemometers.find(a => a.id === anemometerId);
    remove(ref(rtdb, `anemometers/${anemometerId}`));
    if (anemometer) addActivityLog(user.id, 'Anemometer Deleted', `Deleted ${anemometer.make} ${anemometer.model}`);
  }, [user, addActivityLog, anemometers]);

  const addOtherEquipment = useCallback((equipment: Omit<OtherEquipment, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'otherEquipments'));
    set(newRef, equipment);
    addActivityLog(user.id, 'Other Equipment Added', `Added ${equipment.equipmentName}`);
  }, [user, addActivityLog]);

  const updateOtherEquipment = useCallback((equipment: OtherEquipment) => {
    if (!user) return;
    const { id, ...data } = equipment;
    update(ref(rtdb, `otherEquipments/${id}`), data);
    addActivityLog(user.id, 'Other Equipment Updated', `Updated ${equipment.equipmentName}`);
  }, [user, addActivityLog]);

  const deleteOtherEquipment = useCallback((equipmentId: string) => {
    if (!user) return;
    const equipment = otherEquipments.find(e => e.id === equipmentId);
    remove(ref(rtdb, `otherEquipments/${equipmentId}`));
    if (equipment) addActivityLog(user.id, 'Other Equipment Deleted', `Deleted ${equipment.equipmentName}`);
  }, [user, addActivityLog, otherEquipments]);

  const addMachineLog = useCallback((log: Omit<MachineLog, 'id'>) => {
    if(user) {
        const newLogRef = push(ref(rtdb, 'machineLogs'));
        set(newLogRef, log);
    }
  }, [user]);

  const deleteMachineLog = useCallback((logId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    remove(ref(rtdb, `machineLogs/${logId}`));
    addActivityLog(user.id, 'Machine Log Deleted', `Log ID: ${logId}`);
  }, [user, addActivityLog, toast]);
  
  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    if (user && can.manage_branding) {
      const brandingRef = ref(rtdb, 'branding');
      update(brandingRef, { appName: name, appLogo: logo });
      addActivityLog(user.id, 'Branding Updated');
    }
  }, [user, can.manage_branding, addActivityLog]);

  const addAnnouncement = useCallback((data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>) => {
    if(user) {
        const isPrivileged = user.role === 'Admin' || user.role === 'Project Coordinator';
        const newAnnouncement: Partial<Announcement> = { 
            ...data,
            creatorId: user.id, 
            status: isPrivileged ? 'approved' : 'pending', 
            createdAt: new Date().toISOString(), 
            comments: [],
            dismissedBy: []
        };
        if (!isPrivileged) {
          newAnnouncement.approverId = user.supervisorId || '';
        }

        const newRef = push(ref(rtdb, 'announcements'));
        set(newRef, newAnnouncement);
    }
  }, [user]);

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
    if(user) {
        const newComment = { userId: user.id, text: comment, date: new Date().toISOString() };
        const newCommentRef = push(ref(rtdb, `announcements/${announcementId}/comments`));
        set(newCommentRef, newComment);
        update(ref(rtdb, `announcements/${announcementId}`), { status: 'returned' });
    }
  }, [user]);
  
  const dismissAnnouncement = useCallback((announcementId: string) => {
    if (!user) return;
    const announcement = announcements.find(a => a.id === announcementId);
    if (!announcement) return;
    const dismissedBy = announcement.dismissedBy || [];
    if (!dismissedBy.includes(user.id)) {
        update(ref(rtdb, `announcements/${announcementId}`), { dismissedBy: [...dismissedBy, user.id] });
    }
  }, [user, announcements]);

  const addBuilding = useCallback((buildingNumber: string) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'buildings'));
    set(newRef, { buildingNumber, rooms: [] });
    addActivityLog(user.id, 'Building Added', buildingNumber);
  }, [user, addActivityLog]);

  const updateBuilding = useCallback((building: Building) => {
    if(!user) return;
    const { id, ...data } = building;
    update(ref(rtdb, `buildings/${id}`), data);
    addActivityLog(user.id, 'Building Updated', building.buildingNumber);
  }, [user, addActivityLog]);

  const deleteBuilding = useCallback((buildingId: string) => {
    if(!user) return;
    const building = buildings.find(b => b.id === buildingId);
    remove(ref(rtdb, `buildings/${buildingId}`));
    if (building) addActivityLog(user.id, 'Building Deleted', building.buildingNumber);
  }, [user, buildings, addActivityLog]);

  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    if(!user) return;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const newRoom: Room = { 
      id: `room-${Date.now()}`,
      roomNumber: roomData.roomNumber, 
      beds: Array.from({ length: roomData.numberOfBeds }).map((_, i) => ({ 
        id: `bed-${Date.now()}-${i}`, 
        bedNumber: String.fromCharCode(65 + i), 
        bedType: 'Bunk' 
      })) 
    };

    const updatedRooms = [...(building.rooms || []), newRoom];
    update(ref(rtdb, `buildings/${buildingId}`), { rooms: updatedRooms });
    addActivityLog(user.id, 'Room Added', `Room ${roomData.roomNumber} to Building ${building.buildingNumber}`);
  }, [user, buildings, addActivityLog]);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    if(!user) return;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    const room = building.rooms.find(r => r.id === roomId);
    const updatedRooms = building.rooms.filter(r => r.id !== roomId);
    update(ref(rtdb, `buildings/${buildingId}`), { rooms: updatedRooms });
    if(room) addActivityLog(user.id, 'Room Deleted', `Room ${room.roomNumber} from Building ${building.buildingNumber}`);
  }, [user, buildings, addActivityLog]);

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    if(!user) return;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    const occupant = manpowerProfiles.find(p => p.id === occupantId);
    const updatedRooms = (building.rooms || []).map(r => r.id === roomId ? { ...r, beds: r.beds.map(b => b.id === bedId ? { ...b, occupantId } : b) } : r);
    set(ref(rtdb, `buildings/${buildingId}/rooms`), updatedRooms);
    addActivityLog(user.id, 'Occupant Assigned', `${occupant?.name} to bed in Building ${building.buildingNumber}`);
  }, [user, buildings, manpowerProfiles, addActivityLog]);

  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    if(!user) return;
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    let occupantName = '';
    const updatedRooms = (building.rooms || []).map(r => {
      if (r.id === roomId) {
        return {
          ...r,
          beds: r.beds.map(bed => {
            if (bed.id === bedId) {
              const occupant = manpowerProfiles.find(p => p.id === bed.occupantId);
              occupantName = occupant?.name || 'occupant';
              return { ...bed, occupantId: undefined };
            }
            return bed;
          })
        };
      }
      return r;
    });
    set(ref(rtdb, `buildings/${buildingId}/rooms`), updatedRooms);
    addActivityLog(user.id, 'Occupant Unassigned', `${occupantName} from bed in Building ${building.buildingNumber}`);
  }, [user, buildings, manpowerProfiles, addActivityLog]);

  const addIncidentReport = useCallback((incidentData: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if (user) {
        const recipients = new Set<string>();
        if (user.supervisorId) recipients.add(user.supervisorId);
        const hseUser = users.find(u => u.role === 'HSE');
        if (hseUser) recipients.add(hseUser.id);
        const now = new Date().toISOString();
        const newIncidentRef = push(ref(rtdb, 'incidentReports'));
        const newIncident: Omit<IncidentReport, 'id'> = {
            ...incidentData,
            reporterId: user.id,
            reportTime: now,
            incidentTime: now,
            projectId: incidentData.projectId,
            unitArea: incidentData.unitArea,
            incidentDetails: incidentData.incidentDetails,
            status: 'New',
            isPublished: false,
            comments: [{ id: `inc-c-${Date.now()}`, userId: user.id, text: `Incident reported.`, date: now }],
            reportedToUserIds: Array.from(recipients),
            lastUpdated: now,
            viewedBy: [user.id]
        };
        set(newIncidentRef, newIncident);
    }
  }, [user, users]);

  const updateIncident = useCallback((incident: IncidentReport, commentText: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
      
      const existingComments = Array.isArray(incident.comments) 
        ? incident.comments 
        : Object.values(incident.comments || {});

      const updatedIncident = {
          ...incident,
          lastUpdated: now,
          viewedBy: [user.id],
          comments: [...existingComments, newComment]
      };
      
      const { id, ...data } = updatedIncident;
      update(ref(rtdb, `incidentReports/${id}`), data);
  }, [user]);


  const addIncidentComment = useCallback((incidentId: string, text: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: now };
      const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
      set(newCommentRef, newComment);
      update(ref(rtdb, `incidentReports/${incidentId}`), { lastUpdated: now, viewedBy: [user.id] });
  }, [user]);

  const publishIncident = useCallback((incidentId: string, commentText: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Omit<Comment, 'id'> = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
      const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
      set(newCommentRef, newComment);
      update(ref(rtdb, `incidentReports/${incidentId}`), { isPublished: true, lastUpdated: now, viewedBy: [user.id] });
  }, [user]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], commentText: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newComment: Omit<Comment, 'id'> = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
    const incident = incidentReports.find(i => i.id === incidentId);
    if (!incident) return;
    const updatedUserIds = [...new Set([...(incident.reportedToUserIds || []), ...userIds])];
    
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    set(newCommentRef, newComment);
    update(ref(rtdb, `incidentReports/${incidentId}`), { reportedToUserIds: updatedUserIds, lastUpdated: now, viewedBy: [user.id] });
  }, [user, incidentReports]);
  
  const markIncidentAsViewed = useCallback((incidentId: string) => {
      if (!user) return;
      const incident = incidentReports.find(i => i.id === incidentId);
      if (incident && !incident.viewedBy.includes(user.id)) {
          update(ref(rtdb, `incidentReports/${incidentId}`), { viewedBy: [...incident.viewedBy, user.id] });
      }
  }, [user, incidentReports]);

  const saveJobSchedule = useCallback((schedule: JobSchedule) => {
    if (!user) return;
    const scheduleRef = ref(rtdb, `jobSchedules/${schedule.id}`);
    set(scheduleRef, schedule);
    addActivityLog(user.id, 'Job Schedule Saved', `Saved schedule for project ID ${schedule.projectId} on ${schedule.date}`);
  }, [user, addActivityLog]);

  // Computed Values for Notifications
  const pendingTaskApprovalCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => task.status === 'Pending Approval' && task.approverId === user.id).length;
  }, [tasks, user]);

  const myNewTaskCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => task.assigneeIds?.includes(user.id) && task.status === 'To Do' && !task.isViewedByAssignee).length;
  }, [tasks, user]);

  const myPendingTaskRequestCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => task.creatorId === user.id && task.status === 'Pending Approval').length;
  }, [tasks, user]);
  
  const myFulfilledEquipmentCertRequests = useMemo(() => {
    if (!user) return [];
    return certificateRequests.filter(req => 
      req.requesterId === user.id && 
      req.status === 'Completed' && 
      (req.utMachineId || req.dftMachineId)
    );
  }, [certificateRequests, user]);
  
  const pendingStoreCertRequestCount = useMemo(() => {
    if (!user) return 0;
    const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'];
    if (!storeRoles.includes(user.role)) return 0;
    return certificateRequests.filter(req => req.status === 'Pending' && req.itemId).length;
  }, [certificateRequests, user]);

  const pendingEquipmentCertRequestCount = useMemo(() => {
    if (!user) return 0;
    const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'];
    if (!storeRoles.includes(user.role)) return 0;
    return certificateRequests.filter(req => req.status === 'Pending' && (req.utMachineId || req.dftMachineId)).length;
  }, [certificateRequests, user]);

  const myFulfilledStoreCertRequestCount = useMemo(() => {
      if (!user) return 0;
      return certificateRequests.filter(r => r.requesterId === user.id && r.status === 'Completed' && !r.viewedByRequester && r.itemId).length;
  }, [certificateRequests, user]);

  const unreadPlannerCommentDays = useMemo(() => {
    if (!user) return [];
    return dailyPlannerComments
        .filter(dpc => {
             const plannerUserId = dpc.id.split('_')[1];
             return plannerUserId === user.id && !dpc.viewedBy?.includes(user.id);
        })
        .map(dpc => dpc.id);
  }, [dailyPlannerComments, user]);

  const plannerNotificationCount = useMemo(() => {
    if (!user) return 0;
    const myUnreadComments = dailyPlannerComments.filter(dpc => {
      const plannerUserId = dpc.plannerUserId;
      // Notify me if a comment is on my planner and I haven't seen it yet.
      return plannerUserId === user.id && !dpc.viewedBy?.includes(user.id);
    });
    return myUnreadComments.length;
  }, [dailyPlannerComments, user]);

  const pendingInternalRequestCount = useMemo(() => {
    if (!user) return 0;
    const storeRoles: Role[] = ['Store in Charge', 'Assistant Store Incharge'];
    if (!storeRoles.includes(user.role)) {
        return 0;
    }
    return internalRequests.filter(r => r.status === 'Pending').length;
  }, [internalRequests, user]);

  const updatedInternalRequestCount = useMemo(() => (user ? internalRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester).length : 0), [internalRequests, user]);
  const pendingManagementRequestCount = useMemo(() => (user ? managementRequests.filter(r => r.recipientId === user.id && r.status === 'Pending').length : 0), [managementRequests, user]);
  const updatedManagementRequestCount = useMemo(() => (user ? managementRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester).length : 0), [managementRequests, user]);
  
  const onLeaveManpowerCount = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let totalLeave = 0;
    projects.forEach(project => {
        const latestLogForProjectDay = manpowerLogs
            .filter(log => log.date === todayStr && log.projectId === project.id)
            .sort((a,b) => new Date(b.updatedBy).getTime() - new Date(a.updatedBy).getTime())[0];
        
        if (latestLogForProjectDay) {
            totalLeave += (latestLogForProjectDay.countOnLeave || 0);
        }
    });
    return totalLeave;
  }, [manpowerLogs, projects]);

  const workingManpowerCount = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(sub(new Date(), { days: 1 }), 'yyyy-MM-dd');

    const projectTotals = new Map<string, number>();

    projects.forEach(project => {
        const logsForProjectBeforeToday = manpowerLogs
            .filter(l => l.projectId === project.id && l.date <= yesterdayStr)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        let startingCount = 0;
        if(logsForProjectBeforeToday.length > 0) {
          startingCount = logsForProjectBeforeToday[0].total || 0;
        }
        
        const logsForProjectToday = manpowerLogs
            .filter(l => l.projectId === project.id && l.date === todayStr)
            .sort((a, b) => new Date(b.updatedBy).getTime() - new Date(a.updatedBy).getTime());
        
        const latestLogToday = logsForProjectToday[0];

        if (latestLogToday) {
            projectTotals.set(project.id, latestLogToday.total);
        } else {
            projectTotals.set(project.id, startingCount);
        }
    });

    return Array.from(projectTotals.values()).reduce((sum, count) => sum + count, 0);
  }, [manpowerLogs, projects]);
  
  const incidentNotificationCount = useMemo(() => {
    if (!user) return 0;
    const myIncidents = incidentReports.filter(i => {
        const isParticipant = i.reporterId === user.id || (i.reportedToUserIds || []).includes(user.id);
        return i.isPublished || isParticipant;
    });
    return myIncidents.filter(i => !i.viewedBy.includes(user.id)).length;
  }, [incidentReports, user]);

  const contextValue: AppContextType = {
    user, loading, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, announcements, buildings, jobSchedules, appName, appLogo,
    login, logout, updateProfile, can, getVisibleUsers, getAssignableUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, updateManpowerLog, addManpowerProfile, addMultipleManpowerProfiles, updateManpowerProfile, deleteManpowerProfile, addLeaveForManpower, rejoinFromLeave, confirmManpowerLeave, cancelManpowerLeave, updateLeaveRecord, deleteLeaveRecord, addInternalRequest, updateInternalRequestItems, updateInternalRequestStatus, deleteInternalRequest, markInternalRequestAsViewed, acknowledgeInternalRequest, addManagementRequest, updateManagementRequest, updateManagementRequestStatus, deleteManagementRequest, markManagementRequestAsViewed, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop, addDigitalCamera, updateDigitalCamera, deleteDigitalCamera, addAnemometer, updateAnemometer, deleteAnemometer, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, deleteMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, saveJobSchedule,
    pendingTaskApprovalCount, myNewTaskCount, myPendingTaskRequestCount, myFulfilledEquipmentCertRequests, workingManpowerCount, onLeaveManpowerCount, pendingStoreCertRequestCount, pendingEquipmentCertRequestCount, myFulfilledStoreCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount
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

    

