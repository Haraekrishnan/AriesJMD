

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, OtherEquipment, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed } from '../lib/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';


type PermissionsObject = Record<Permission, boolean>;

type AppContextType = {
  // Auth
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatar: string, password?: string) => void;

  // Permissions
  can: PermissionsObject;

  // Data
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
  otherEquipments: OtherEquipment[];
  machineLogs: MachineLog[];
  certificateRequests: CertificateRequest[];
  announcements: Announcement[];
  buildings: Building[];
  
  // Computed Data
  pendingTaskApprovalCount: number;
  myNewTaskCount: number;
  myFulfilledUTRequests: CertificateRequest[];
  workingManpowerCount: number;
  onLeaveManpowerCount: number;
  pendingCertRequestCount: number;
  myFulfilledCertRequestCount: number;
  plannerNotificationCount: number;
  unreadPlannerCommentDays: string[];
  pendingInternalRequestCount: number;
  updatedInternalRequestCount: number;
  pendingManagementRequestCount: number;
  updatedManagementRequestCount: number;
  incidentNotificationCount: number;


  // Branding
  appName: string;
  appLogo: string | null;
  updateBranding: (name: string, logo: string | null) => void;

  // Functions
  getVisibleUsers: () => User[];
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
  updateDailyPlannerComment: (commentId: string, plannerUserId: string, day: string, newText: string) => void;
  deleteDailyPlannerComment: (commentId: string, plannerUserId: string, day: string) => void;
  deleteAllDailyPlannerComments: (plannerUserId: string, day: string) => void;
  awardManualAchievement: (achievement: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => void;
  updateManualAchievement: (achievement: Achievement) => void;
  deleteManualAchievement: (achievementId: string) => void;
  approveAchievement: (achievementId: string, points: number) => void;
  rejectAchievement: (achievementId: string) => void;
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
  addManpowerLog: (log: Omit<ManpowerLog, 'id'| 'updatedBy' | 'date'>) => void;
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => void;
  updateManpowerProfile: (profile: ManpowerProfile) => void;
  deleteManpowerProfile: (profileId: string) => void;
  addInternalRequest: (request: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updateInternalRequestItems: (requestId: string, items: InternalRequest['items']) => void;
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus, comment: string) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  addManagementRequest: (request: Omit<ManagementRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updateManagementRequestStatus: (requestId: string, status: ManagementRequestStatus, comment: string) => void;
  markManagementRequestAsViewed: (requestId: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
  addCertificateRequest: (request: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => void;
  fulfillCertificateRequest: (requestId: string, comment: string) => void;
  addCertificateRequestComment: (requestId: string, comment: string) => void;
  markUTRequestsAsViewed: () => void;
  acknowledgeFulfilledUTRequest: (requestId: string) => void;
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => void;
  updateUTMachine: (machine: UTMachine) => void;
  deleteUTMachine: (machineId: string) => void;
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => void;
  updateDftMachine: (machine: DftMachine) => void;
  deleteDftMachine: (machineId: string) => void;
  addMobileSim: (item: Omit<MobileSim, 'id'>) => void;
  updateMobileSim: (item: MobileSim) => void;
  deleteMobileSim: (itemId: string) => void;
  addOtherEquipment: (item: Omit<OtherEquipment, 'id'>) => void;
  updateOtherEquipment: (item: OtherEquipment) => void;
  deleteOtherEquipment: (itemId: string) => void;
  addMachineLog: (log: Omit<MachineLog, 'id'>) => void;
  getMachineLogs: (machineId: string) => MachineLog[];
  addAnnouncement: (data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId'>) => void;
  updateAnnouncement: (announcement: Announcement) => void;
  approveAnnouncement: (announcementId: string) => void;
  rejectAnnouncement: (announcementId: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  returnAnnouncement: (announcementId: string, comment: string) => void;
  addBuilding: (buildingNumber: string) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('aries-user-v8', null);
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
  const [otherEquipments, setOtherEquipments] = useState<OtherEquipment[]>([]);
  const [machineLogs, setMachineLogs] = useState<MachineLog[]>([]);
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!rtdb) {
      console.error("Firebase Realtime Database is not initialized.");
      setLoading(false);
      return;
    }
  
    setLoading(true);
  
    const setupListener = (path: string, setter: Function) => {
      const dbRef = ref(rtdb, path);
      const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (path === 'branding') {
            setter(data);
          } else {
            const dataArray = Object.keys(data).map(key => ({
              id: key,
              ...data[key]
            }));
            setter(dataArray);
          }
        } else {
          setter(path === 'branding' ? { appName: 'Aries Marine', appLogo: null } : []);
        }
      });
      return unsubscribe;
    };

    const handleBrandingData = (data: { appName?: string, appLogo?: string | null }) => {
      setAppName(data.appName || 'Aries Marine');
      setAppLogo(data.appLogo || null);
    };
  
    const listeners = [
      setupListener('users', setUsers),
      setupListener('roles', setRoles),
      setupListener('tasks', setTasks),
      setupListener('projects', setProjects),
      setupListener('activityLogs', setActivityLogs),
      setupListener('branding', handleBrandingData),
      setupListener('inventoryItems', setInventoryItems),
      setupListener('utMachines', setUtMachines),
      setupListener('dftMachines', setDftMachines),
      setupListener('mobileSims', setMobileSims),
      setupListener('otherEquipments', setOtherEquipments),
      setupListener('machineLogs', setMachineLogs),
      setupListener('certificateRequests', setCertificateRequests),
    ];
  
    setLoading(false);
  
    return () => {
      listeners.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    const logRef = push(ref(rtdb, 'activityLogs'));
    const newLog: Omit<ActivityLog, 'id'> = { userId, action, details, timestamp: new Date().toISOString() };
    set(logRef, newLog);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setLoading(true);
    const foundUser = users.find(u => u.email === email && u.password === pass);
    if (foundUser) {
      setUser(foundUser);
      addActivityLog(foundUser.id, 'User Logged In');
      setLoading(false);
      return true;
    }
    setLoading(false);
    return false;
  }, [addActivityLog, setUser, users]);

  const logout = useCallback(() => {
    if (user) addActivityLog(user.id, 'User Logged Out');
    setUser(null);
    router.push('/login');
  }, [user, addActivityLog, setUser, router]);
  
  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    update(ref(rtdb, `users/${id}`), data);
    addActivityLog(user?.id || 'system', 'User Profile Updated', `Updated details for ${updatedUser.name}`);
    if (user?.id === updatedUser.id) setUser(updatedUser);
  }, [user, addActivityLog, setUser]);

  const updateProfile = useCallback((name: string, email: string, avatar: string, password?: string) => {
    if (user) {
      const updatedUser: User = { ...user, name, email, avatar };
      if (password) updatedUser.password = password;
      updateUser(updatedUser);
    }
  }, [user, updateUser]);
  
  const can = useMemo(() => {
    const permissions = new Set<Permission>();
    if (user && !loading) {
        const userRole = roles.find(r => r.name === user.role);
        if (userRole) userRole.permissions.forEach(p => permissions.add(p));
    }
    const canObject: PermissionsObject = {} as any;
    for (const p of ALL_PERMISSIONS) canObject[p] = permissions.has(p);
    return canObject;
  }, [user, roles, loading]);

  const getVisibleUsers = useCallback(() => {
    if (!user) return [];
    if (can.manage_users) return users;
    const subordinates = users.filter(u => u.supervisorId === user.id);
    return [user, ...subordinates];
  }, [user, users, can]);

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
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: commentText, date: new Date().toISOString(), isRead: false };
    set(newCommentRef, newComment);
    addActivityLog(user.id, 'Comment Added', `Task ID: ${taskId}`);
  }, [user, addActivityLog]);

  const requestTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus, commentText: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    addComment(taskId, commentText);

    const updates: Partial<Task> = { 
        status: 'Pending Approval', 
        approvalState: 'pending', 
        previousStatus: task.status, 
        pendingStatus: newStatus,
        attachment: attachment || task.attachment
    };
    update(ref(rtdb, `tasks/${taskId}`), updates);
    addActivityLog(user.id, 'Task Status Change Requested', `Task "${task.title}" to ${newStatus}`);
  }, [user, tasks, addActivityLog, addComment]);

  const approveTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    addComment(taskId, commentText);

    const updates: Partial<Task> = {};

    if (task.pendingAssigneeId) { // Reassignment
      updates.assigneeId = task.pendingAssigneeId;
      updates.assigneeIds = [task.pendingAssigneeId];
      updates.pendingAssigneeId = undefined;
      updates.status = 'To Do';
      updates.approvalState = 'none';
      updates.isViewedByAssignee = false;
      addActivityLog(user.id, 'Task Reassignment Approved', `Task "${task.title}" to ${users.find(u => u.id === task.pendingAssigneeId)?.name}`);
    } else { // Status change
      updates.status = task.pendingStatus || task.status;
      if (task.pendingStatus === 'Completed') updates.completionDate = new Date().toISOString();
      updates.pendingStatus = undefined;
      updates.previousStatus = undefined;
      updates.approvalState = 'approved';
      addActivityLog(user.id, 'Task Status Change Approved', `Task "${task.title}" to ${updates.status}`);
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
      pendingStatus: undefined, 
      previousStatus: undefined, 
      pendingAssigneeId: undefined, 
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
      pendingAssigneeId: newAssigneeId
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
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const daysInMonth = eachDayOfInterval({ start, end });
    const allEventsInView: (PlannerEvent & { eventDate: Date })[] = [];
    daysInMonth.forEach(day => {
        userEvents.forEach(event => {
            const eventDate = new Date(event.date);
            let shouldAdd = false;
            if (isAfter(day, eventDate) || isSameDay(day, eventDate)) {
                switch(event.frequency) {
                    case 'once': if (isSameDay(day, eventDate)) shouldAdd = true; break;
                    case 'daily': shouldAdd = true; break;
                    case 'daily-except-sundays': if (!isSunday(day)) shouldAdd = true; break;
                    case 'weekly': if (getDay(day) === getDay(eventDate)) shouldAdd = true; break;
                    case 'weekends': if (isSaturday(day) || isSunday(day)) shouldAdd = true; break;
                    case 'monthly': if (getDate(day) === getDate(eventDate)) shouldAdd = true; break;
                }
            }
            if (shouldAdd) allEventsInView.push({ ...event, eventDate: day });
        });
    });
    return allEventsInView;
  }, [plannerEvents]);

  const addPlannerEvent = useCallback((eventData: Omit<PlannerEvent, 'id' | 'comments'>) => {
    if (user) setPlannerEvents(prev => [...prev, { ...eventData, id: `event-${Date.now()}`, comments: [] }]);
  }, [user, setPlannerEvents]);
  
  const updatePlannerEvent = useCallback((updatedEvent: PlannerEvent) => {
    setPlannerEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  }, [setPlannerEvents]);

  const deletePlannerEvent = useCallback((eventId: string) => {
    setPlannerEvents(prev => prev.filter(e => e.id !== eventId));
  }, [setPlannerEvents]);
  
  const addPlannerEventComment = useCallback((eventId: string, text: string) => {
    if(user) setPlannerEvents(prev => prev.map(e => e.id === eventId ? { ...e, comments: [...(e.comments || []), { id: `ec-${Date.now()}`, userId: user.id, text, date: new Date().toISOString(), isRead: false }] } : e));
  }, [user, setPlannerEvents]);

  const addDailyPlannerComment = useCallback((plannerUserId: string, day: Date, text: string) => {
    if (!user) return;
    const dayKey = format(day, 'yyyy-MM-dd');
    const newComment: Comment = { id: `dpc-${Date.now()}`, userId: user.id, text, date: new Date().toISOString(), isRead: false };
    const existingDayIndex = dailyPlannerComments.findIndex(dpc => dpc.day === dayKey && dpc.plannerUserId === plannerUserId);
    if (existingDayIndex > -1) {
        const updatedComments = [...dailyPlannerComments];
        updatedComments[existingDayIndex].comments.push(newComment);
        setDailyPlannerComments(updatedComments);
    } else {
        setDailyPlannerComments(prev => [...prev, { id: `dp-${dayKey}-${plannerUserId}`, plannerUserId, day: dayKey, comments: [newComment] }]);
    }
  }, [user, dailyPlannerComments, setDailyPlannerComments]);

  const markPlannerCommentsAsRead = useCallback((plannerUserId: string, day: Date) => {
    if (!user) return;
    const dayKey = format(day, 'yyyy-MM-dd');
    setDailyPlannerComments(prev => prev.map(dpc => (dpc.day === dayKey && dpc.plannerUserId === plannerUserId) ? { ...dpc, comments: dpc.comments.map(c => c.userId !== user.id ? { ...c, isRead: true } : c) } : dpc));
  }, [user, setDailyPlannerComments]);

  const updateDailyPlannerComment = useCallback((commentId: string, plannerUserId: string, day: string, newText: string) => {
    setDailyPlannerComments(prev => prev.map(dpc => (dpc.day === day && dpc.plannerUserId === plannerUserId) ? { ...dpc, comments: dpc.comments.map(c => c.id === commentId ? { ...c, text: newText } : c) } : dpc));
  }, [setDailyPlannerComments]);

  const deleteDailyPlannerComment = useCallback((commentId: string, plannerUserId: string, day: string) => {
    setDailyPlannerComments(prev => prev.map(dpc => (dpc.day === day && dpc.plannerUserId === plannerUserId) ? { ...dpc, comments: dpc.comments.filter(c => c.id !== commentId) } : dpc).filter(dpc => dpc.comments.length > 0));
  }, [setDailyPlannerComments]);
  
  const deleteAllDailyPlannerComments = useCallback((plannerUserId: string, day: string) => {
    setDailyPlannerComments(prev => prev.filter(dpc => !(dpc.day === day && dpc.plannerUserId === plannerUserId)));
  }, [setDailyPlannerComments]);

  const awardManualAchievement = useCallback((achievementData: Omit<Achievement, 'id' | 'date' | 'type' | 'awardedById' | 'status'>) => {
    if (user) setAchievements(prev => [...prev, { ...achievementData, id: `ach-${Date.now()}`, date: new Date().toISOString(), type: 'manual', status: 'pending', awardedById: user.id }]);
  }, [user, setAchievements]);

  const updateManualAchievement = useCallback((updatedAchievement: Achievement) => {
    setAchievements(prev => prev.map(a => a.id === updatedAchievement.id ? updatedAchievement : a));
  }, [setAchievements]);

  const deleteManualAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => prev.filter(a => a.id !== achievementId));
  }, [setAchievements]);

  const approveAchievement = useCallback((achievementId: string, points: number) => {
    setAchievements(prev => prev.map(a => a.id === achievementId ? { ...a, status: 'approved', points } : a));
  }, [setAchievements]);

  const rejectAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => prev.filter(a => a.id !== achievementId));
  }, [setAchievements]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar'>) => {
    const usersRef = ref(rtdb, 'users');
    const newUserRef = push(usersRef);
    set(newUserRef, { ...userData, avatar: `https://placehold.co/100x100.png` });
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
    setVehicles(prev => [...prev, { id: `vehicle-${Date.now()}`, ...vehicle }]);
  }, [setVehicles]);

  const updateVehicle = useCallback((updatedVehicle: Vehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
  }, [setVehicles]);

  const deleteVehicle = useCallback((vehicleId: string) => {
    setVehicles(prev => prev.filter(v => v.id !== vehicleId));
  }, [setVehicles]);
  
  const addDriver = useCallback((driver: Omit<Driver, 'id' | 'photo'>) => {
    setDrivers(prev => [...prev, { ...driver, id: `driver-${Date.now()}`, photo: `https://placehold.co/100x100.png` }]);
  }, [setDrivers]);

  const updateDriver = useCallback((updatedDriver: Driver) => {
    setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
  }, [setDrivers]);

  const deleteDriver = useCallback((driverId: string) => {
    setDrivers(prev => prev.filter(d => d.id !== driverId));
  }, [setDrivers]);

  const addIncidentReport = useCallback((incidentData: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if (user) {
        const recipients = new Set<string>();
        if (user.supervisorId) recipients.add(user.supervisorId);
        const hseUser = users.find(u => u.role === 'HSE');
        if (hseUser) recipients.add(hseUser.id);
        const now = new Date().toISOString();
        const newIncident: IncidentReport = {
            ...incidentData,
            id: `inc-${Date.now()}`,
            reporterId: user.id,
            reportTime: now,
            status: 'New',
            isPublished: false,
            comments: [{ id: `inc-c-${Date.now()}`, userId: user.id, text: `Incident reported.`, date: now, isRead: true }],
            reportedToUserIds: Array.from(recipients),
            lastUpdated: now,
            viewedBy: [user.id]
        };
        setIncidentReports(prev => [newIncident, ...prev]);
    }
  }, [user, users, setIncidentReports]);

  const updateIncident = useCallback((incident: IncidentReport, commentText: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now, isRead: true };
      
      const updatedIncident = {
          ...incident,
          lastUpdated: now,
          viewedBy: [user.id],
          comments: [...(incident.comments || []), newComment]
      };
      
      setIncidentReports(prev => prev.map(i => i.id === updatedIncident.id ? updatedIncident : i));
  }, [user, setIncidentReports]);


  const addIncidentComment = useCallback((incidentId: string, text: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text, date: now, isRead: true };

      setIncidentReports(prev => prev.map(i => {
          if (i.id === incidentId) {
              const updatedIncident = {
                  ...i,
                  comments: [...(i.comments || []), newComment],
                  lastUpdated: now,
                  viewedBy: [user.id]
              };
              return updatedIncident;
          }
          return i;
      }));
  }, [user, setIncidentReports]);

  const publishIncident = useCallback((incidentId: string, commentText: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now, isRead: true };
      setIncidentReports(prev => prev.map(i => i.id === incidentId ? { ...i, isPublished: true, lastUpdated: now, viewedBy: [user.id], comments: [...(i.comments || []), newComment] } : i));
  }, [user, setIncidentReports]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], commentText: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now, isRead: true };
      setIncidentReports(prev => prev.map(i => i.id === incidentId ? { ...i, reportedToUserIds: [...new Set([...(i.reportedToUserIds || []), ...userIds])], lastUpdated: now, viewedBy: [user.id], comments: [...(i.comments || []), newComment] } : i));
  }, [user, setIncidentReports]);
  
  const markIncidentAsViewed = useCallback((incidentId: string) => {
      if (!user) return;
      setIncidentReports(prev => prev.map(i => {
          if (i.id === incidentId && !i.viewedBy.includes(user.id)) {
              return { ...i, viewedBy: [...i.viewedBy, user.id] };
          }
          return i;
      }));
  }, [user, setIncidentReports]);

  const addManpowerLog = useCallback((logData: Omit<ManpowerLog, 'id'| 'updatedBy' | 'date'>) => {
    if (user) setManpowerLogs(prev => [...prev, { ...logData, id: `mplog-${Date.now()}`, updatedBy: user.id, date: format(new Date(), 'yyyy-MM-dd') }]);
  }, [user, setManpowerLogs]);

  const addManpowerProfile = useCallback((profile: Omit<ManpowerProfile, 'id'>) => {
    setManpowerProfiles(prev => [...prev, { ...profile, id: `mp-${Date.now()}` }]);
  }, [setManpowerProfiles]);

  const updateManpowerProfile = useCallback((profile: ManpowerProfile) => {
    setManpowerProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
  }, [setManpowerProfiles]);

  const deleteManpowerProfile = useCallback((profileId: string) => {
    setManpowerProfiles(prev => prev.filter(p => p.id !== profileId));
  }, [setManpowerProfiles]);
  
  const addInternalRequest = useCallback((request: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => {
    if(user) setInternalRequests(prev => [...prev, { ...request, id: `ir-${Date.now()}`, requesterId: user.id, date: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', comments: [], viewedByRequester: true }]);
  }, [user, setInternalRequests]);

  const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus, comment: string) => {
    if(user) setInternalRequests(prev => prev.map(r => r.id === requestId ? {...r, status, approverId: user.id, comments: [...(r.comments || []), { id: `irc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setInternalRequests]);

  const updateInternalRequestItems = useCallback((requestId: string, items: InternalRequest['items']) => {
    if (user) setInternalRequests(prev => prev.map(r => r.id === requestId ? { ...r, items, comments: [...(r.comments || []), { id: `irc-${Date.now()}`, userId: user.id, text: 'Request items updated by store keeper.', date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setInternalRequests]);

  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    setInternalRequests(prev => prev.map(r => r.id === requestId ? { ...r, viewedByRequester: true } : r));
  }, [setInternalRequests]);
  
  const addManagementRequest = useCallback((request: Omit<ManagementRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => {
    if (user) setManagementRequests(prev => [...prev, { ...request, id: `mr-${Date.now()}`, requesterId: user.id, date: format(new Date(), 'yyyy-MM-dd'), status: 'Pending', comments: [], viewedByRequester: true }]);
  }, [user, setManagementRequests]);
  
  const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => {
    if (user) setManagementRequests(prev => prev.map(r => r.id === requestId ? { ...r, status, comments: [...(r.comments || []), { id: `mrc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setManagementRequests]);

  const markManagementRequestAsViewed = useCallback((requestId: string) => {
    setManagementRequests(prev => prev.map(r => r.id === requestId ? { ...r, viewedByRequester: true } : r));
  }, [setManagementRequests]);

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
    addActivityLog(user.id, 'Inventory Item Deleted', `Deleted ${item?.name} (SN: ${item?.serialNumber})`);
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
    const newRequest: Omit<CertificateRequest, 'id'> = { ...requestData, requesterId: user.id, status: 'Pending', requestDate: new Date().toISOString(), comments: requestData.remarks ? [{ id: `crc-${Date.now()}`, userId: user.id, text: requestData.remarks, date: new Date().toISOString() }] : [], viewedByRequester: false };
    set(newRequestRef, newRequest);
    addActivityLog(user.id, 'Certificate Requested', `Type: ${requestData.requestType}`);
  }, [user, addActivityLog]);
  
  const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text: comment, date: new Date().toISOString() };
    set(newCommentRef, newComment);
  }, [user]);

  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if (!user) return;
    addCertificateRequestComment(requestId, comment);
    update(ref(rtdb, `certificateRequests/${requestId}`), { status: 'Completed', completionDate: new Date().toISOString() });
    addActivityLog(user.id, 'Certificate Request Fulfilled', `Request ID: ${requestId}`);
  }, [user, addActivityLog, addCertificateRequestComment]);
  
  const acknowledgeFulfilledUTRequest = useCallback((requestId: string) => {
    remove(ref(rtdb, `certificateRequests/${requestId}`));
  }, []);
  
  const markUTRequestsAsViewed = useCallback(() => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    certificateRequests.forEach(req => {
      if (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester) {
        updates[`/certificateRequests/${req.id}/viewedByRequester`] = true;
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
  
  const addOtherEquipment = useCallback((item: Omit<OtherEquipment, 'id'>) => {
    if (!user) return;
    const newItemRef = push(ref(rtdb, 'otherEquipments'));
    set(newItemRef, item);
    addActivityLog(user.id, 'Other Equipment Added', `Added ${item.equipmentName}`);
  }, [user, addActivityLog]);

  const updateOtherEquipment = useCallback((item: OtherEquipment) => {
    if (!user) return;
    const { id, ...data } = item;
    update(ref(rtdb, `otherEquipments/${id}`), data);
    addActivityLog(user.id, 'Other Equipment Updated', `Updated ${item.equipmentName}`);
  }, [user, addActivityLog]);

  const deleteOtherEquipment = useCallback((itemId: string) => {
    if (!user) return;
    const item = otherEquipments.find(i => i.id === itemId);
    remove(ref(rtdb, `otherEquipments/${itemId}`));
    if(item) addActivityLog(user.id, 'Other Equipment Deleted', `Deleted ${item.equipmentName}`);
  }, [user, otherEquipments, addActivityLog]);

  const addMachineLog = useCallback((log: Omit<MachineLog, 'id'>) => {
    if(user) {
        const newLogRef = push(ref(rtdb, 'machineLogs'));
        set(newLogRef, log);
    }
  }, [user]);
  
  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    setAppName(name);
    setAppLogo(logo);
    update(ref(rtdb, `branding`), { appName: name, appLogo: logo });
    addActivityLog(user?.id || 'system', 'Branding Updated');
  }, [user, setAppName, setAppLogo, addActivityLog]);

  const addAnnouncement = useCallback((data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId'>) => {
    if(user && user.supervisorId) {
        const newAnnouncement: Announcement = { ...data, id: `ann-${Date.now()}`, creatorId: user.id, approverId: user.supervisorId, status: 'pending', createdAt: new Date().toISOString(), comments: [] };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    }
  }, [user, setAnnouncements]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === announcement.id ? announcement : a));
  }, [setAnnouncements]);

  const approveAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? {...a, status: 'approved'} : a));
  }, [setAnnouncements]);

  const rejectAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? {...a, status: 'rejected'} : a));
  }, [setAnnouncements]);

  const deleteAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
  }, [setAnnouncements]);

  const returnAnnouncement = useCallback((announcementId: string, comment: string) => {
    if(user) setAnnouncements(prev => prev.map(a => a.id === announcementId ? {...a, status: 'returned', comments: [...a.comments, { userId: user.id, text: comment, date: new Date().toISOString() }]} : a));
  }, [user, setAnnouncements]);

  const addBuilding = useCallback((buildingNumber: string) => {
    setBuildings(prev => [...prev, { id: `bldg-${Date.now()}`, buildingNumber, rooms: [] }]);
  }, [setBuildings]);

  const updateBuilding = useCallback((building: Building) => {
    setBuildings(prev => prev.map(b => b.id === building.id ? building : b));
  }, [setBuildings]);

  const deleteBuilding = useCallback((buildingId: string) => {
    setBuildings(prev => prev.filter(b => b.id !== buildingId));
  }, [setBuildings]);

  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    const newRoom: Room = { roomNumber: roomData.roomNumber, id: `room-${Date.now()}`, beds: Array.from({ length: roomData.numberOfBeds }).map((_, i) => ({ id: `bed-${Date.now()}-${i}`, bedNumber: String.fromCharCode(65 + i), bedType: 'Bunk' })) };
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, rooms: [...b.rooms, newRoom] } : b));
  }, [setBuildings]);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, rooms: b.rooms.filter(r => r.id !== roomId) } : b));
  }, [setBuildings]);

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, rooms: b.rooms.map(r => r.id === roomId ? { ...r, beds: r.beds.map(bed => bed.id === bedId ? { ...bed, occupantId } : bed) } : r) } : b));
  }, [setBuildings]);

  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, rooms: b.rooms.map(r => r.id === roomId ? { ...r, beds: r.beds.map(bed => bed.id === bedId ? { ...bed, occupantId: undefined } : bed) } : r) } : b));
  }, [setBuildings]);
  
  const pendingTaskApprovalCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => {
        if (task.status !== 'Pending Approval') return false;
        if (task.pendingAssigneeId) return task.creatorId === user.id;
        const assignee = users.find(u => u.id === task.assigneeId);
        if (!assignee || task.assigneeId === user.id) return false;
        return task.creatorId === user.id || assignee.supervisorId === user.id;
    }).length;
  }, [tasks, user, users]);

  const myNewTaskCount = useMemo(() => {
    if (!user) return 0;
    return tasks.filter(task => task.assigneeIds?.includes(user.id) && task.status === 'To Do' && !task.isViewedByAssignee).length;
  }, [tasks, user]);

  const myFulfilledUTRequests = useMemo(() => {
    if (!user) return [];
    return certificateRequests.filter(req => req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester);
  }, [certificateRequests, user]);
  
  const pendingCertRequestCount = useMemo(() => {
      if (!can.manage_inventory) return 0;
      return certificateRequests.filter(req => req.status === 'Pending').length;
  }, [certificateRequests, can.manage_inventory]);

  const myFulfilledCertRequestCount = useMemo(() => {
      if (!user) return 0;
      return certificateRequests.filter(req => req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester).length;
  }, [certificateRequests, user]);

  const unreadPlannerCommentDays = useMemo(() => {
    if (!user) return [];
    const notificationDays = new Set<string>();
    const visibleUsers = getVisibleUsers();
    dailyPlannerComments.forEach(dpc => {
        if (visibleUsers.some(u => u.id === dpc.plannerUserId)) {
            if (dpc.comments.some(c => c.isRead === false && c.userId !== user.id)) notificationDays.add(dpc.day);
        }
    });
    return Array.from(notificationDays);
  }, [dailyPlannerComments, user, getVisibleUsers]);

  const plannerNotificationCount = useMemo(() => unreadPlannerCommentDays.length, [unreadPlannerCommentDays]);
  const pendingInternalRequestCount = useMemo(() => (can.approve_store_requests ? internalRequests.filter(r => r.status === 'Pending').length : 0), [internalRequests, can.approve_store_requests]);
  const updatedInternalRequestCount = useMemo(() => (user ? internalRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester).length : 0), [internalRequests, user]);
  const pendingManagementRequestCount = useMemo(() => (user ? managementRequests.filter(r => r.recipientId === user.id && r.status === 'Pending').length : 0), [managementRequests, user]);
  const updatedManagementRequestCount = useMemo(() => (user ? managementRequests.filter(r => r.requesterId === user.id && !r.viewedByRequester).length : 0), [managementRequests, user]);
  const workingManpowerCount = useMemo(() => manpowerProfiles.filter(p => p.status === 'Working').length, [manpowerProfiles]);
  const onLeaveManpowerCount = useMemo(() => manpowerProfiles.filter(p => p.status === 'On Leave').length, [manpowerProfiles]);

  const incidentNotificationCount = useMemo(() => {
    if (!user) return 0;
    const myIncidents = incidentReports.filter(i => {
        const isParticipant = i.reporterId === user.id || (i.reportedToUserIds || []).includes(user.id);
        return i.isPublished || isParticipant;
    });
    return myIncidents.filter(i => !i.viewedBy.includes(user.id)).length;
  }, [incidentReports, user]);

  const value = useMemo(() => ({
    user, loading, login, logout, updateProfile, can, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, otherEquipments, machineLogs, certificateRequests, announcements, buildings, appName, appLogo, getVisibleUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, approveAchievement, rejectAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, addManpowerProfile, updateManpowerProfile, deleteManpowerProfile, addInternalRequest, updateInternalRequestItems, updateInternalRequestStatus, markInternalRequestAsViewed, addManagementRequest, updateManagementRequestStatus, markManagementRequestAsViewed, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markUTRequestsAsViewed, acknowledgeFulfilledUTRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, pendingTaskApprovalCount, myNewTaskCount, myFulfilledUTRequests, workingManpowerCount, onLeaveManpowerCount, pendingCertRequestCount, myFulfilledCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount
  }), [user, loading, login, logout, updateProfile, can, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, otherEquipments, machineLogs, certificateRequests, announcements, buildings, appName, appLogo, getVisibleUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, approveAchievement, rejectAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, addManpowerProfile, updateManpowerProfile, deleteManpowerProfile, addInternalRequest, updateInternalRequestItems, updateInternalRequestStatus, markInternalRequestAsViewed, addManagementRequest, updateManagementRequestStatus, markManagementRequestAsViewed, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markUTRequestsAsViewed, acknowledgeFulfilledUTRequest, addUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, getMachineLogs, updateBranding, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, addBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, pendingTaskApprovalCount, myNewTaskCount, myFulfilledUTRequests, workingManpowerCount, onLeaveManpowerCount, pendingCertRequestCount, myFulfilledCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


    



