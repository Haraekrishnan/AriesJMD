'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, Vehicle, Driver, IncidentReport, ManpowerLog, ManpowerProfile, InternalRequest, ManagementRequest, InventoryItem, UTMachine, CertificateRequest, CertificateRequestStatus, DftMachine, MobileSim, OtherEquipment, MachineLog, Announcement, InventoryItemStatus, CertificateRequestType, Comment, InternalRequestStatus, ManagementRequestStatus, Frequency, DailyPlannerComment, ApprovalState, Permission, ALL_PERMISSIONS, Building, Room, Bed, Role } from '@/types';
import { useRouter } from 'next/navigation';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay, getDay, isSaturday, isSunday, getDate, isPast, add, sub, isAfter } from 'date-fns';
import { USERS, TASKS, PLANNER_EVENTS, ACHIEVEMENTS, ROLES, PROJECTS, ACTIVITY_LOGS, VEHICLES, DRIVERS, INCIDENTS, MANPOWER_LOGS, MANPOWER_PROFILES, INTERNAL_REQUESTS, MANAGEMENT_REQUESTS, INVENTORY_ITEMS, UT_MACHINES, CERTIFICATE_REQUESTS, DFT_MACHINES, MOBILE_SIMS, OTHER_EQUIPMENTS, ANNOUNCEMENTS, DAILY_PLANNER_COMMENTS, BUILDINGS } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

type PermissionsObject = Record<Permission, boolean>;

export type AppContextType = {
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
  createTask: (task: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeIds' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'projectId'> & { assigneeId: string }) => void;
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
  addProject: (projectName: string, description: string) => void;
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
  addManpowerLog: (log: Omit<ManpowerLog, 'id'| 'updatedBy' >) => void;
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => void;
  updateManpowerProfile: (profile: ManpowerProfile) => void;
  deleteManpowerProfile: (profileId: string) => void;
  createInternalRequest: (items: InternalRequest['items']) => void;
  updateInternalRequestItems: (requestId: string, items: InternalRequest['items']) => void;
  approveInternalRequest: (requestId: string, comment: string) => void;
  rejectInternalRequest: (requestId: string, comment: string) => void;
  addInternalRequestComment: (requestId: string, comment: string) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  createManagementRequest: (recipientId: string, subject: string, body: string) => void;
  approveManagementRequest: (requestId: string, comment: string) => void;
  rejectManagementRequest: (requestId: string, comment: string) => void;
  addManagementRequestComment: (requestId: string, comment: string) => void;
  markManagementRequestAsViewed: (requestId: string) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
  addCertificateRequest: (request: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments'>) => void;
  fulfillCertificateRequest: (requestId: string, comment: string) => void;
  addCertificateRequestComment: (requestId: string, comment: string) => void;
  markUTRequestsAsViewed: () => void;
  acknowledgeFulfilledUTRequest: (requestId: string) => void;
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => void;
  editUTMachine: (machineId: string, machine: Partial<UTMachine>) => void;
  deleteUTMachine: (machineId: string) => void;
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => void;
  updateDftMachine: (machine: DftMachine) => void;
  deleteDftMachine: (machineId: string) => void;
  addMobileSim: (item: Omit<MobileSim, 'id'>) => void;
  updateMobileSim: (item: MobileSim) => void;
  deleteMobileSim: (itemId: string) => void;
  addOtherEquipment: (item: Omit<OtherEquipment, 'id'>) => void;
  editOtherEquipment: (itemId: string, item: Partial<OtherEquipment>) => void;
  deleteOtherEquipment: (itemId: string) => void;
  addMachineLog: (log: Omit<MachineLog, 'id'>) => void;
  getMachineLogs: (machineId: string) => MachineLog[];
  createAnnouncement: (data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'publishedAt' | 'comments' | 'approverId'>) => void;
  updateAnnouncement: (announcement: Announcement) => void;
  approveAnnouncement: (announcementId: string) => void;
  rejectAnnouncement: (announcementId: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  returnAnnouncement: (announcementId: string, comment: string) => void;
  addBuilding: (buildingNumber: string) => void;
  editBuilding: (buildingId: string, newBuildingNumber: string) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string | null) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('aries-user-v8', null);
  const [users, setUsers] = useLocalStorage<User[]>('aries-users-v8', USERS);
  const [roles, setRoles] = useLocalStorage<RoleDefinition[]>('aries-roles-v8', ROLES);
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks-v8', TASKS);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects-v8', PROJECTS);
  const [plannerEvents, setPlannerEvents] = useLocalStorage<PlannerEvent[]>('aries-events-v8', PLANNER_EVENTS);
  const [dailyPlannerComments, setDailyPlannerComments] = useLocalStorage<DailyPlannerComment[]>('aries-daily-planner-comments-v8', DAILY_PLANNER_COMMENTS);
  const [achievements, setAchievements] = useLocalStorage<Achievement[]>('aries-achievements-v8', ACHIEVEMENTS);
  const [activityLogs, setActivityLogs] = useLocalStorage<ActivityLog[]>('aries-activity-logs-v8', ACTIVITY_LOGS);
  const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>('aries-vehicles-v8', VEHICLES);
  const [drivers, setDrivers] = useLocalStorage<Driver[]>('aries-drivers-v8', DRIVERS);
  const [incidentReports, setIncidentReports] = useLocalStorage<IncidentReport[]>('aries-incidents-v8', INCIDENTS);
  const [manpowerLogs, setManpowerLogs] = useLocalStorage<ManpowerLog[]>('aries-manpower-logs-v8', MANPOWER_LOGS);
  const [manpowerProfiles, setManpowerProfiles] = useLocalStorage<ManpowerProfile[]>('aries-manpower-profiles-v8', MANPOWER_PROFILES);
  const [internalRequests, setInternalRequests] = useLocalStorage<InternalRequest[]>('aries-internal-requests-v8', INTERNAL_REQUESTS);
  const [managementRequests, setManagementRequests] = useLocalStorage<ManagementRequest[]>('aries-mgmt-requests-v8', MANAGEMENT_REQUESTS);
  const [inventoryItems, setInventoryItems] = useLocalStorage<InventoryItem[]>('aries-inventory-items-v8', INVENTORY_ITEMS);
  const [utMachines, setUtMachines] = useLocalStorage<UTMachine[]>('aries-ut-machines-v8', UT_MACHINES);
  const [dftMachines, setDftMachines] = useLocalStorage<DftMachine[]>('aries-dft-machines-v8', DFT_MACHINES);
  const [mobileSims, setMobileSims] = useLocalStorage<MobileSim[]>('aries-mobile-sims-v8', MOBILE_SIMS);
  const [otherEquipments, setOtherEquipments] = useLocalStorage<OtherEquipment[]>('aries-other-equipments-v8', OTHER_EQUIPMENTS);
  const [machineLogs, setMachineLogs] = useLocalStorage<MachineLog[]>('aries-machine-logs-v8', []);
  const [certificateRequests, setCertificateRequests] = useLocalStorage<CertificateRequest[]>('aries-cert-requests-v8', CERTIFICATE_REQUESTS);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements-v8', ANNOUNCEMENTS);
  const [buildings, setBuildings] = useLocalStorage<Building[]>('aries-buildings-v8', BUILDINGS);
  const [appName, setAppName] = useLocalStorage('aries-appName-v8', 'Aries Marine');
  const [appLogo, setAppLogo] = useLocalStorage<string | null>('aries-appLogo-v8', null);
  
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
  }, []);

  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    const newLog: ActivityLog = { id: `log-${Date.now()}`, userId, action, details, timestamp: new Date().toISOString() };
    setActivityLogs(prev => [newLog, ...prev]);
  }, [setActivityLogs]);

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
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (user?.id === updatedUser.id) setUser(updatedUser);
  }, [user, setUsers, setUser]);

  const updateProfile = useCallback((name: string, email: string, avatar: string, password?: string) => {
    if (user) {
      const updatedUser: User = { ...user, name, email, avatar };
      if (password) updatedUser.password = password;
      updateUser(updatedUser);
      addActivityLog(user.id, 'Profile Updated');
    }
  }, [user, updateUser, addActivityLog]);
  
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

  const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'assigneeIds' | 'assigneeId' | 'approvalState' | 'isViewedByAssignee' | 'projectId'> & { assigneeId: string }) => {
    if(!user || !user.projectId) return;
    const { assigneeId, ...rest } = taskData;
    const newTask: Task = {
        ...rest,
        id: `task-${Date.now()}`,
        creatorId: user.id,
        status: 'To Do',
        projectId: user.projectId,
        assigneeId: assigneeId,
        assigneeIds: [assigneeId],
        comments: [],
        isViewedByAssignee: false,
        approvalState: 'none'
    };
    setTasks(prev => [newTask, ...prev]);
    const assignee = users.find(u => u.id === newTask.assigneeId);
    addActivityLog(user.id, 'Task Created', `Task "${newTask.title}" for ${assignee?.name}`);
  }, [user, setTasks, users, addActivityLog]);

  const updateTask = useCallback((taskData: Task) => {
    setTasks(prev => prev.map(t => (t.id === taskData.id ? taskData : t)));
    addActivityLog(user!.id, 'Task Updated', `Task: "${taskData.title}"`);
  }, [user, setTasks, addActivityLog]);

  const deleteTask = useCallback((taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if(taskToDelete) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      addActivityLog(user!.id, 'Task Deleted', `Task: "${taskToDelete.title}"`);
    }
  }, [user, tasks, setTasks, addActivityLog]);
  
  const addComment = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: user.id, text: commentText, date: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...(t.comments || []), newComment] } : t));
    addActivityLog(user.id, 'Comment Added', `Task ID: ${taskId}`);
  }, [user, setTasks, addActivityLog]);

  const requestTaskStatusChange = useCallback((taskId: string, newStatus: TaskStatus, commentText: string, attachment?: Task['attachment']) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: user.id, text: commentText, date: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Pending Approval', approvalState: 'pending', previousStatus: t.status, pendingStatus: newStatus, attachment: attachment || t.attachment, comments: [...(t.comments || []), newComment] } : t));
    addActivityLog(user.id, 'Task Status Change Requested', `Task "${task.title}" to ${newStatus}`);
  }, [user, tasks, setTasks, addActivityLog]);

  const approveTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: user.id, text: commentText, date: new Date().toISOString() };
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (t.pendingAssigneeId) { // Reassignment
          addActivityLog(user.id, 'Task Reassignment Approved', `Task "${t.title}" to ${users.find(u => u.id === t.pendingAssigneeId)?.name}`);
          return { ...t, assigneeId: t.pendingAssigneeId, assigneeIds: [t.pendingAssigneeId], pendingAssigneeId: undefined, status: 'To Do', approvalState: 'none', isViewedByAssignee: false, comments: [...(t.comments || []), newComment] };
        } else { // Status change
          addActivityLog(user.id, 'Task Status Change Approved', `Task "${t.title}" to ${t.pendingStatus}`);
          return { ...t, status: t.pendingStatus || t.status, completionDate: t.pendingStatus === 'Completed' || t.pendingStatus === 'Done' ? new Date().toISOString() : t.completionDate, pendingStatus: undefined, previousStatus: undefined, approvalState: 'approved', comments: [...(t.comments || []), newComment] };
        }
      }
      return t;
    }));
  }, [user, tasks, users, setTasks, addActivityLog]);

  const returnTaskStatusChange = useCallback((taskId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: user.id, text: commentText, date: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.previousStatus || 'To Do', pendingStatus: undefined, previousStatus: undefined, pendingAssigneeId: undefined, approvalState: 'returned', comments: [...(t.comments || []), newComment] } : t));
    addActivityLog(user.id, 'Task Request Returned', `Task: "${task.title}"`);
  }, [user, tasks, setTasks, addActivityLog]);
  
  const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, commentText: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newComment: Comment = { id: `comment-${Date.now()}`, userId: user.id, text: commentText, date: new Date().toISOString() };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Pending Approval', approvalState: 'pending', previousStatus: t.status, pendingAssigneeId: newAssigneeId, comments: [...(t.comments || []), newComment] } : t));
    addActivityLog(user.id, 'Task Reassignment Requested', `Task "${task.title}" to ${users.find(u => u.id === newAssigneeId)?.name}`);
  }, [user, tasks, users, setTasks, addActivityLog]);

  const markTaskAsViewed = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isViewedByAssignee: true } : t));
  }, [setTasks]);

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    updateTask({ ...tasks.find(t => t.id === taskId)!, status: newStatus });
  }, [tasks, updateTask]);

  const submitTaskForApproval = useCallback((taskId: string) => {
    updateTask({ ...tasks.find(t => t.id === taskId)!, status: 'Pending Approval' });
  }, [tasks, updateTask]);

  const approveTask = useCallback((taskId: string, comment?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if(task) updateTask({ ...task, status: 'Done', comments: comment ? [...task.comments, { id: `c-${Date.now()}`, userId: user!.id, text: comment, date: new Date().toISOString() }] : task.comments });
  }, [tasks, user, updateTask]);

  const returnTask = useCallback((taskId: string, comment: string) => {
    const task = tasks.find(t => t.id === taskId);
    if(task) updateTask({ ...task, status: 'In Progress', comments: [...task.comments, { id: `c-${Date.now()}`, userId: user!.id, text: comment, date: new Date().toISOString() }] });
  }, [tasks, user, updateTask]);

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
    if(user) setPlannerEvents(prev => prev.map(e => e.id === eventId ? { ...e, comments: [...(e.comments || []), { id: `ec-${Date.now()}`, userId: user.id, text, date: new Date().toISOString() }] } : e));
  }, [user, setPlannerEvents]);

  const addDailyPlannerComment = useCallback((plannerUserId: string, day: Date, text: string) => {
    if (!user) return;
    const dayKey = format(day, 'yyyy-MM-dd');
    const newComment: Comment = { id: `dpc-${Date.now()}`, userId: user.id, text, date: new Date().toISOString() };
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
    setDailyPlannerComments(prev => prev.map(dpc => {
      if (dpc.day === dayKey && dpc.plannerUserId === plannerUserId) {
        return {
          ...dpc,
          comments: dpc.comments.map(c => c.userId !== user.id ? { ...c, isRead: true } : c)
        }
      }
      return dpc;
    }));
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
    setUsers(prev => [...prev, { ...userData, id: `user-${Date.now()}`, avatar: `https://placehold.co/100x100.png` }]);
  }, [setUsers]);
  
  const updateUserPlanningScore = useCallback((userId: string, score: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, planningScore: score } : u));
  }, [setUsers]);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, [setUsers]);

  const addRole = useCallback((newRole: Omit<RoleDefinition, 'id'| 'isEditable'>) => {
    setRoles(prev => [...prev, { ...newRole, id: `role-${Date.now()}`, isEditable: true }]);
  }, [setRoles]);

  const updateRole = useCallback((updatedRole: RoleDefinition) => {
    setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
  }, [setRoles]);

  const deleteRole = useCallback((roleId: string) => {
    setRoles(prev => prev.filter(r => r.id !== roleId));
  }, [setRoles]);

  const addProject = useCallback((projectName: string, description: string) => {
    setProjects(prev => [...prev, { id: `project-${Date.now()}`, name: projectName, description }]);
  }, [setProjects]);

  const updateProject = useCallback((updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  }, [setProjects]);

  const deleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  }, [setProjects]);

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
            comments: [{ id: `inc-c-${Date.now()}`, userId: user.id, text: `Incident reported.`, date: now }],
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
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
      
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
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text, date: now };

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
      const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
      setIncidentReports(prev => prev.map(i => i.id === incidentId ? { ...i, isPublished: true, lastUpdated: now, viewedBy: [user.id], comments: [...(i.comments || []), newComment] } : i));
  }, [user, setIncidentReports]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], commentText: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newComment: Comment = { id: `inc-c-${Date.now()}`, userId: user.id, text: commentText, date: now };
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

  const addManpowerLog = useCallback((logData: Omit<ManpowerLog, 'id'| 'updatedBy'>) => {
    if (user) setManpowerLogs(prev => [...prev, { ...logData, id: `mplog-${Date.now()}`, updatedBy: user.id }]);
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
  
  const createInternalRequest = useCallback((items: InternalRequest['items']) => {
    if(user) setInternalRequests(prev => [...prev, { id: `ir-${Date.now()}`, requesterId: user.id, date: new Date().toISOString(), status: 'Pending', items, comments: [], viewedByRequester: true }]);
  }, [user, setInternalRequests]);

  const approveInternalRequest = useCallback((requestId: string, comment: string) => {
    if(user) setInternalRequests(prev => prev.map(r => r.id === requestId ? {...r, status: 'Approved', approverId: user.id, comments: [...(r.comments || []), { id: `irc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setInternalRequests]);
  
  const rejectInternalRequest = useCallback((requestId: string, comment: string) => {
    if(user) setInternalRequests(prev => prev.map(r => r.id === requestId ? {...r, status: 'Rejected', approverId: user.id, comments: [...(r.comments || []), { id: `irc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setInternalRequests]);

  const addInternalRequestComment = useCallback((requestId: string, comment: string) => {
    if (user) {
      const newComment: Comment = { id: `irc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
      setInternalRequests(prev => prev.map(r => r.id === requestId ? {...r, comments: [...(r.comments || []), newComment], viewedByRequester: r.requesterId === user.id} : r));
    }
  }, [user, setInternalRequests]);

  const updateInternalRequestItems = useCallback((requestId: string, items: InternalRequest['items']) => {
    if (user) setInternalRequests(prev => prev.map(r => r.id === requestId ? { ...r, items, comments: [...(r.comments || []), { id: `irc-${Date.now()}`, userId: user.id, text: 'Request items updated by store keeper.', date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setInternalRequests]);

  const markInternalRequestAsViewed = useCallback((requestId: string) => {
    setInternalRequests(prev => prev.map(r => r.id === requestId ? { ...r, viewedByRequester: true } : r));
  }, [setInternalRequests]);
  
  const createManagementRequest = useCallback((recipientId: string, subject: string, body: string) => {
    if (user) setManagementRequests(prev => [...prev, { id: `mr-${Date.now()}`, requesterId: user.id, recipientId, subject, body, date: new Date().toISOString(), status: 'Pending', comments: [], viewedByRequester: true }]);
  }, [user, setManagementRequests]);
  
  const approveManagementRequest = useCallback((requestId: string, comment: string) => {
    if (user) setManagementRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Approved', comments: [...(r.comments || []), { id: `mrc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setManagementRequests]);
  
  const rejectManagementRequest = useCallback((requestId: string, comment: string) => {
    if (user) setManagementRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'Rejected', comments: [...(r.comments || []), { id: `mrc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }], viewedByRequester: false } : r));
  }, [user, setManagementRequests]);

  const addManagementRequestComment = useCallback((requestId: string, comment: string) => {
    if (user) {
      const newComment: Comment = { id: `mrc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() };
      setManagementRequests(prev => prev.map(r => r.id === requestId ? {...r, comments: [...(r.comments || []), newComment], viewedByRequester: r.requesterId === user.id} : r));
    }
  }, [user, setManagementRequests]);

  const markManagementRequestAsViewed = useCallback((requestId: string) => {
    setManagementRequests(prev => prev.map(r => r.id === requestId ? { ...r, viewedByRequester: true } : r));
  }, [setManagementRequests]);

  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    setInventoryItems(prev => [...prev, { ...itemData, id: `inv-${Date.now()}`, lastUpdated: new Date().toISOString() }]);
  }, [setInventoryItems]);

  const deleteInventoryItem = useCallback((itemId: string) => {
    setInventoryItems(prev => prev.filter(i => i.id !== itemId));
  }, [setInventoryItems]);
  
  const addMultipleInventoryItems = useCallback((itemsToImport: any[]): number => {
    let importedCount = 0;
    const updatedItems = [...inventoryItems];
    itemsToImport.forEach(item => {
        try {
            const serialNumber = item['SERIAL NUMBER']?.toString();
            if (!serialNumber) return;
            const existingItemIndex = updatedItems.findIndex(i => i.serialNumber === serialNumber);
            const project = projects.find(p => p.name.toLowerCase() === item['PROJECT']?.toLowerCase());
            if (!project) return;
            const newItemData = { name: item['ITEM NAME'], serialNumber, chestCrollNo: item['CHEST CROLL NO']?.toString(), ariesId: item['ARIES ID']?.toString(), inspectionDate: new Date(item['INSPECTION DATE']).toISOString(), inspectionDueDate: new Date(item['INSPECTION DUE DATE']).toISOString(), tpInspectionDueDate: new Date(item['TP INSPECTION DUE DATE']).toISOString(), status: item['STATUS'] as InventoryItemStatus || 'In Store', projectId: project.id, lastUpdated: new Date().toISOString() };
            if (existingItemIndex > -1) updatedItems[existingItemIndex] = { ...updatedItems[existingItemIndex], ...newItemData };
            else updatedItems.push({ ...newItemData, id: `inv-${Date.now()}-${importedCount}` });
            importedCount++;
        } catch(e) { console.error("Skipping invalid row:", item, e); }
    });
    setInventoryItems(updatedItems);
    return importedCount;
  }, [inventoryItems, projects, setInventoryItems]);

  const updateInventoryItem = useCallback((item: InventoryItem) => {
    setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...item, lastUpdated: new Date().toISOString() } : i));
  }, [setInventoryItems]);
  
  const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments'>) => {
    if(user) setCertificateRequests(prev => [...prev, { ...requestData, id: `cert-${Date.now()}`, requesterId: user.id, status: 'Pending', requestDate: new Date().toISOString(), comments: requestData.remarks ? [{ id: `crc-${Date.now()}`, userId: user.id, text: requestData.remarks, date: new Date().toISOString() }] : [], viewedByRequester: false }]);
  }, [user, setCertificateRequests]);

  const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
    if (user) setCertificateRequests(prev => prev.map(req => req.id === requestId ? { ...req, comments: [...(req.comments || []), { id: `crc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }] } : req));
  }, [user, setCertificateRequests]);
  
  const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
    if (user) setCertificateRequests(prev => prev.map(req => req.id === requestId ? { ...req, status: 'Completed', completionDate: new Date().toISOString(), comments: [...(req.comments || []), { id: `crc-${Date.now()}`, userId: user.id, text: comment, date: new Date().toISOString() }] } : req));
  }, [user, setCertificateRequests]);
  
  const acknowledgeFulfilledUTRequest = useCallback((requestId: string) => {
    setCertificateRequests(prev => prev.filter(req => req.id !== requestId));
  }, [setCertificateRequests]);
  
  const markUTRequestsAsViewed = useCallback(() => {
    if (!user) return;
    setCertificateRequests(prev => prev.map(req => (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester) ? { ...req, viewedByRequester: true } : req));
  }, [user, setCertificateRequests]);
  
  const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => {
    setUtMachines(prev => [...prev, { ...machine, id: `ut-${Date.now()}`}]);
  }, [setUtMachines]);

  const editUTMachine = useCallback((machineId: string, machine: Partial<UTMachine>) => {
    setUtMachines(utMachines.map(m => m.id === machineId ? { ...m, ...machine } : m));
    toast({ title: 'UT Machine Updated' });
  }, [utMachines, setUtMachines, toast]);

  const updateUTMachine = useCallback((machine: UTMachine) => {
    setUtMachines(prev => prev.map(m => m.id === machine.id ? machine : m));
  }, [setUtMachines]);

  const deleteUTMachine = useCallback((machineId: string) => {
    setUtMachines(prev => prev.filter(m => m.id !== machineId));
  }, [setUtMachines]);

  const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => {
    setDftMachines(prev => [...prev, { ...machine, id: `dft-${Date.now()}`}]);
  }, [setDftMachines]);

  const updateDftMachine = useCallback((machine: DftMachine) => {
    setDftMachines(prev => prev.map(m => m.id === machine.id ? machine : m));
  }, [setDftMachines]);

  const deleteDftMachine = useCallback((machineId: string) => {
    setDftMachines(prev => prev.filter(m => m.id !== machineId));
  }, [setDftMachines]);

  const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => {
    setMobileSims(prev => [...prev, { ...item, id: `ms-${Date.now()}`}]);
  }, [setMobileSims]);

  const updateMobileSim = useCallback((item: MobileSim) => {
    setMobileSims(prev => prev.map(m => m.id === item.id ? item : m));
  }, [setMobileSims]);

  const deleteMobileSim = useCallback((itemId: string) => {
    setMobileSims(prev => prev.filter(m => m.id !== itemId));
  }, [setMobileSims]);
  
  const addOtherEquipment = useCallback((item: Omit<OtherEquipment, 'id'>) => {
    setOtherEquipments(prev => [...prev, { ...item, id: `oth-${Date.now()}`}]);
  }, [setOtherEquipments]);

  const editOtherEquipment = useCallback((itemId: string, item: Partial<OtherEquipment>) => {
    setOtherEquipments(otherEquipments.map(i => i.id === itemId ? { ...i, ...item } : i));
    toast({ title: 'Equipment Updated' });
  }, [otherEquipments, setOtherEquipments, toast]);

  const updateOtherEquipment = useCallback((item: OtherEquipment) => {
    setOtherEquipments(prev => prev.map(m => m.id === item.id ? item : m));
  }, [setOtherEquipments]);

  const deleteOtherEquipment = useCallback((itemId: string) => {
    setOtherEquipments(prev => prev.filter(m => m.id !== itemId));
  }, [setOtherEquipments]);

  const addMachineLog = useCallback((log: Omit<MachineLog, 'id'>) => {
    if(user) setMachineLogs(prev => [...prev, { ...log, id: `mlog-${Date.now()}` }]);
  }, [user, setMachineLogs]);

  const getMachineLogs = useCallback((machineId: string) => {
    return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [machineLogs]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    setAppName(name);
    setAppLogo(logo);
  }, [setAppName, setAppLogo]);

  const createAnnouncement = (newAnnouncementData: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'publishedAt' | 'comments' | 'approverId'>) => {
    if (!user) return;
    const newAnnouncement: Announcement = {
      ...newAnnouncementData,
      id: `anno-${Date.now()}`,
      creatorId: user.id,
      approverId: user.id, // Self-approved for simplicity
      status: 'approved',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      comments: [],
    };
    setAnnouncements([newAnnouncement, ...announcements]);
    toast({
      title: 'Announcement Published',
      description: 'Your announcement is now live.',
    });
  };

  const addAnnouncement = useCallback((data: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'publishedAt'>) => {
    if(user && user.supervisorId) {
        const newAnnouncement: Announcement = { ...data, id: `ann-${Date.now()}`, creatorId: user.id, approverId: user.supervisorId, status: 'pending', createdAt: new Date().toISOString(), publishedAt: '', comments: [] };
        setAnnouncements(prev => [newAnnouncement, ...prev]);
    }
  }, [user, setAnnouncements]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    setAnnouncements(prev => prev.map(a => a.id === announcement.id ? announcement : a));
  }, [setAnnouncements]);

  const approveAnnouncement = useCallback((announcementId: string) => {
    setAnnouncements(prev => prev.map(a => a.id === announcementId ? {...a, status: 'approved', publishedAt: new Date().toISOString() } : a));
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

  const editBuilding = (buildingId: string, newBuildingNumber: string) => {
    setBuildings(
      buildings.map((b) =>
        b.id === buildingId ? { ...b, buildingNumber: newBuildingNumber } : b
      )
    );
  };

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

  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string | null) => {
    setBuildings(prev => prev.map(b => b.id === buildingId ? { ...b, rooms: b.rooms.map(r => r.id === roomId ? { ...r, beds: r.beds.map(bed => bed.id === bedId ? { ...bed, occupantId: occupantId ?? undefined } : bed) } : r) } : b));
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
    user, loading, login, logout, updateProfile, can, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, otherEquipments, machineLogs, certificateRequests, announcements, buildings, appName, appLogo, getVisibleUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, approveAchievement, rejectAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, addManpowerProfile, updateManpowerProfile, deleteManpowerProfile, createInternalRequest, updateInternalRequestItems, approveInternalRequest, rejectInternalRequest, addInternalRequestComment, markInternalRequestAsViewed, createManagementRequest, approveManagementRequest, rejectManagementRequest, addManagementRequestComment, markManagementRequestAsViewed, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markUTRequestsAsViewed, acknowledgeFulfilledUTRequest, addUTMachine, editUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addOtherEquipment, editOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, getMachineLogs, updateBranding, createAnnouncement, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, addBuilding, editBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, pendingTaskApprovalCount, myNewTaskCount, myFulfilledUTRequests, workingManpowerCount, onLeaveManpowerCount, pendingCertRequestCount, myFulfilledCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount
  }), [user, loading, login, logout, updateProfile, can, users, roles, tasks, projects, plannerEvents, dailyPlannerComments, achievements, activityLogs, vehicles, drivers, incidentReports, manpowerLogs, manpowerProfiles, internalRequests, managementRequests, inventoryItems, utMachines, dftMachines, mobileSims, otherEquipments, machineLogs, certificateRequests, announcements, buildings, appName, appLogo, getVisibleUsers, createTask, updateTask, deleteTask, updateTaskStatus, submitTaskForApproval, approveTask, returnTask, requestTaskStatusChange, approveTaskStatusChange, returnTaskStatusChange, addComment, markTaskAsViewed, requestTaskReassignment, getExpandedPlannerEvents, addPlannerEvent, updatePlannerEvent, deletePlannerEvent, addPlannerEventComment, markPlannerCommentsAsRead, addDailyPlannerComment, updateDailyPlannerComment, deleteDailyPlannerComment, deleteAllDailyPlannerComments, awardManualAchievement, updateManualAchievement, deleteManualAchievement, approveAchievement, rejectAchievement, addUser, updateUser, updateUserPlanningScore, deleteUser, addRole, updateRole, deleteRole, addProject, updateProject, deleteProject, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addIncidentReport, updateIncident, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed, addManpowerLog, addManpowerProfile, updateManpowerProfile, deleteManpowerProfile, createInternalRequest, updateInternalRequestItems, approveInternalRequest, rejectInternalRequest, addInternalRequestComment, markInternalRequestAsViewed, createManagementRequest, approveManagementRequest, rejectManagementRequest, addManagementRequestComment, markManagementRequestAsViewed, addInventoryItem, addMultipleInventoryItems, updateInventoryItem, deleteInventoryItem, addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markUTRequestsAsViewed, acknowledgeFulfilledUTRequest, addUTMachine, editUTMachine, updateUTMachine, deleteUTMachine, addDftMachine, updateDftMachine, deleteDftMachine, addMobileSim, updateMobileSim, deleteMobileSim, addOtherEquipment, editOtherEquipment, updateOtherEquipment, deleteOtherEquipment, addMachineLog, getMachineLogs, updateBranding, createAnnouncement, addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, addBuilding, editBuilding, updateBuilding, deleteBuilding, addRoom, deleteRoom, assignOccupant, unassignOccupant, pendingTaskApprovalCount, myNewTaskCount, myFulfilledUTRequests, workingManpowerCount, onLeaveManpowerCount, pendingCertRequestCount, myFulfilledCertRequestCount, plannerNotificationCount, unreadPlannerCommentDays, pendingInternalRequestCount, updatedInternalRequestCount, pendingManagementRequestCount, updatedManagementRequestCount, incidentNotificationCount]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};