'use client';

import React, { createContext, useState, ReactNode, useContext, useCallback, useMemo } from 'react';
import { Task, Project, Announcement, PlannerEvent, Priority, User, Permission, Building, Room, ManpowerProfile, ALL_PERMISSIONS, Achievement, ActivityLog, UTMachine, DftMachine, MobileSim, OtherEquipment, MachineLog, CertificateRequest, ManpowerLog, RoleDefinition, InternalRequest, ManagementRequest, RequestItem } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { TASKS, PROJECTS, ANNOUNCEMENTS, PLANNER_EVENTS, ROLES, BUILDINGS, MANPOWER_PROFILES, ACHIEVEMENTS, ACTIVITY_LOGS, UT_MACHINES, DFT_MACHINES, MOBILE_SIMS, OTHER_EQUIPMENTS, CERTIFICATE_REQUESTS, MANPOWER_LOGS, INTERNAL_REQUESTS, MANAGEMENT_REQUESTS } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from './auth-provider';

type PermissionsCheck = {
  [key in Permission]: boolean;
};

interface AppContextProps {
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  events: PlannerEvent[];
  buildings: Building[];
  manpowerProfiles: ManpowerProfile[];
  achievements: Achievement[];
  activityLogs: ActivityLog[];
  utMachines: UTMachine[];
  dftMachines: DftMachine[];
  mobileSims: MobileSim[];
  otherEquipments: OtherEquipment[];
  myFulfilledUTRequests: CertificateRequest[];
  manpowerLogs: ManpowerLog[];
  internalRequests: InternalRequest[];
  managementRequests: ManagementRequest[];
  pendingInternalRequestCount: number;
  updatedInternalRequestCount: number;
  pendingManagementRequestCount: number;
  updatedManagementRequestCount: number;
  user: User | null;
  users: User[];
  roles: RoleDefinition[];
  updateTask: (updatedTask: Task) => void;
  createTask: (newTask: Omit<Task, 'id' | 'creatorId' | 'projectId' | 'comments' | 'approvalState' | 'assigneeIds'>) => void;
  createAnnouncement: (newAnnouncement: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'publishedAt' | 'comments'| 'approverId'>) => void;
  getPrioritySuggestion: (title: string, description: string) => Promise<Priority | null>;
  getVisibleUsers: () => User[];
  can: PermissionsCheck;
  addBuilding: (buildingNumber: string) => void;
  editBuilding: (buildingId: string, newBuildingNumber: string) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomNumber: string) => void;
  editRoom: (buildingId: string, roomId: string, newRoomNumber: string) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  addBed: (buildingId: string, roomId: string, bedNumber: string, bedType: 'Bunk' | 'Single') => void;
  deleteBed: (buildingId: string, roomId: string, bedId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string | null) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
  addManualAchievement: (userId: string, title: string, description: string, points: number) => void;
  approveAchievement: (achievementId: string, points: number) => void;
  rejectAchievement: (achievementId: string) => void;
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => void;
  editUTMachine: (machineId: string, machine: Partial<UTMachine>) => void;
  deleteUTMachine: (machineId: string) => void;
  addUTMachineLog: (machineId: string, log: Omit<MachineLog, 'id' | 'machineId' | 'userId'>) => void;
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => void;
  editDftMachine: (machineId: string, machine: Partial<DftMachine>) => void;
  deleteDftMachine: (machineId: string) => void;
  addDftMachineLog: (machineId: string, log: Omit<MachineLog, 'id' | 'machineId' | 'userId'>) => void;
  addOtherEquipment: (item: Omit<OtherEquipment, 'id'>) => void;
  editOtherEquipment: (itemId: string, item: Partial<OtherEquipment>) => void;
  deleteOtherEquipment: (itemId: string) => void;
  markUTRequestsAsViewed: () => void;
  acknowledgeFulfilledUTRequest: (requestId: string) => void;
  addManpowerLog: (log: Omit<ManpowerLog, 'id' | 'updatedBy'>) => void;
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => void;
  editManpowerProfile: (profileId: string, profile: Partial<ManpowerProfile>) => void;
  createInternalRequest: (items: RequestItem[]) => void;
  approveInternalRequest: (requestId: string, comment?: string) => void;
  rejectInternalRequest: (requestId: string, comment: string) => void;
  addInternalRequestComment: (requestId: string, comment: string) => void;
  createManagementRequest: (recipientId: string, subject: string, body: string) => void;
  approveManagementRequest: (requestId: string, comment?: string) => void;
  rejectManagementRequest: (requestId: string, comment: string) => void;
  addManagementRequestComment: (requestId: string, comment: string) => void;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const { toast } = useToast();
  
  // States
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks', TASKS);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects', PROJECTS);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements', ANNOUNCEMENTS);
  const [events, setEvents] = useLocalStorage<PlannerEvent[]>('aries-events', PLANNER_EVENTS);
  const [buildings, setBuildings] = useLocalStorage<Building[]>('aries-buildings', BUILDINGS);
  const [manpowerProfiles, setManpowerProfiles] = useLocalStorage<ManpowerProfile[]>('aries-manpower-profiles', MANPOWER_PROFILES);
  const [achievements, setAchievements] = useLocalStorage<Achievement[]>('aries-achievements', ACHIEVEMENTS);
  const [activityLogs, setActivityLogs] = useLocalStorage<ActivityLog[]>('aries-activity-logs', ACTIVITY_LOGS);
  const [utMachines, setUtMachines] = useLocalStorage<UTMachine[]>('aries-ut-machines', UT_MACHINES);
  const [dftMachines, setDftMachines] = useLocalStorage<DftMachine[]>('aries-dft-machines', DFT_MACHINES);
  const [mobileSims, setMobileSims] = useLocalStorage<MobileSim[]>('aries-mobile-sims', MOBILE_SIMS);
  const [otherEquipments, setOtherEquipments] = useLocalStorage<OtherEquipment[]>('aries-other-equipments', OTHER_EQUIPMENTS);
  const [certificateRequests, setCertificateRequests] = useLocalStorage<CertificateRequest[]>('aries-certificate-requests', CERTIFICATE_REQUESTS);
  const [manpowerLogs, setManpowerLogs] = useLocalStorage<ManpowerLog[]>('aries-manpower-logs', MANPOWER_LOGS);
  const [internalRequests, setInternalRequests] = useLocalStorage<InternalRequest[]>('aries-internal-requests', INTERNAL_REQUESTS);
  const [managementRequests, setManagementRequests] = useLocalStorage<ManagementRequest[]>('aries-management-requests', MANAGEMENT_REQUESTS);
  
  // Permissions
  const can = useMemo<PermissionsCheck>(() => {
    const userRole = authContext?.user ? ROLES.find(r => r.name === authContext.user!.role) : undefined;
    const permissions = userRole?.permissions ?? [];
    
    const checks = ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions.includes(permission);
        return acc;
    }, {} as PermissionsCheck);

    return checks;

  }, [authContext?.user]);
  
  // Internal Request Counts
  const pendingInternalRequestCount = useMemo(() => {
    if (!can.approve_store_requests) return 0;
    return internalRequests.filter(r => r.status === 'Pending').length;
  }, [internalRequests, can.approve_store_requests]);

  const updatedInternalRequestCount = useMemo(() => {
    if (!authContext.user) return 0;
    return internalRequests.filter(r => r.requesterId === authContext.user?.id && !r.viewedByRequester).length;
  }, [internalRequests, authContext.user]);
  
  // Management Request Counts
  const pendingManagementRequestCount = useMemo(() => {
    if (!authContext.user) return 0;
    return managementRequests.filter(r => r.recipientId === authContext.user?.id && r.status === 'Pending').length;
  }, [managementRequests, authContext.user]);

  const updatedManagementRequestCount = useMemo(() => {
    if (!authContext.user) return 0;
    return managementRequests.filter(r => r.requesterId === authContext.user?.id && !r.viewedByRequester).length;
  }, [managementRequests, authContext.user]);


  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  };

  const createTask = (newTaskData: Omit<Task, 'id' | 'creatorId' | 'projectId' | 'comments' | 'approvalState' | 'assigneeIds'>) => {
    if(!authContext?.user || !authContext.user.projectId) return;
    const newTask: Task = {
        ...newTaskData,
        id: `task-${Date.now()}`,
        creatorId: authContext.user.id,
        projectId: authContext.user.projectId,
        isViewedByAssignee: false,
        approvalState: 'none',
        comments: [],
        assigneeIds: [newTaskData.assigneeId],
    };
    setTasks([newTask, ...tasks]);
    toast({
        title: 'Task Created',
        description: `Task "${newTask.title}" has been successfully created.`,
    });
  }

  const createAnnouncement = (newAnnouncementData: Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'publishedAt' | 'comments' | 'approverId'>) => {
    if (!authContext?.user) return;
    const newAnnouncement: Announcement = {
      ...newAnnouncementData,
      id: `anno-${Date.now()}`,
      creatorId: authContext.user.id,
      approverId: authContext.user.id, // Self-approved for simplicity
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

  const getPrioritySuggestion = async (title: string, description: string): Promise<Priority | null> => {
    try {
      const response = await fetch('/api/suggest-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch suggestion');
      }
      const data = await response.json();
      return data.priority as Priority;
    } catch (error) {
      console.error('Error getting priority suggestion:', error);
      toast({
        variant: 'destructive',
        title: 'AI Suggestion Failed',
        description: 'Could not get a priority suggestion at this time.',
      });
      return null;
    }
  };

  const getVisibleUsers = useCallback(() => {
    if (!authContext?.user || !authContext.users) {
      return [];
    }

    const { user, users } = authContext;
    if (user.role === 'Admin') {
      return users;
    }
    if (user.role === 'Manager') {
      return users.filter(u => u.supervisorId === user.id || u.id === user.id);
    }
    
    const subordinates = new Set<string>();
    const findSubordinates = (managerId: string) => {
      users.forEach(u => {
        if (u.supervisorId === managerId) {
          subordinates.add(u.id);
          findSubordinates(u.id);
        }
      });
    };
    findSubordinates(user.id);
    subordinates.add(user.id);
    
    return users.filter(u => subordinates.has(u.id));
  }, [authContext]);

  const addBuilding = (buildingNumber: string) => {
    const newBuilding: Building = {
      id: `bldg-${Date.now()}`,
      buildingNumber,
      rooms: [],
    };
    setBuildings([...buildings, newBuilding]);
  };

  const editBuilding = (buildingId: string, newBuildingNumber: string) => {
    setBuildings(
      buildings.map((b) =>
        b.id === buildingId ? { ...b, buildingNumber: newBuildingNumber } : b
      )
    );
  };

  const deleteBuilding = (buildingId: string) => {
    setBuildings(buildings.filter((b) => b.id !== buildingId));
  };

  const addRoom = (buildingId: string, roomNumber: string) => {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      roomNumber,
      beds: [],
    };
    setBuildings(
      buildings.map((b) =>
        b.id === buildingId ? { ...b, rooms: [...b.rooms, newRoom] } : b
      )
    );
  };

  const editRoom = (buildingId: string, roomId: string, newRoomNumber: string) => {
    setBuildings(buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          rooms: b.rooms.map(r => r.id === roomId ? { ...r, roomNumber: newRoomNumber } : r)
        }
      }
      return b;
    }));
  };

  const deleteRoom = (buildingId: string, roomId: string) => {
    setBuildings(buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          rooms: b.rooms.filter(r => r.id !== roomId)
        }
      }
      return b;
    }));
  };

  const addBed = (buildingId: string, roomId: string, bedNumber: string, bedType: 'Bunk' | 'Single') => {
    setBuildings(buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          rooms: b.rooms.map(r => {
            if (r.id === roomId) {
              const newBed = { id: `bed-${Date.now()}`, bedNumber, bedType };
              return { ...r, beds: [...r.beds, newBed] };
            }
            return r;
          })
        }
      }
      return b;
    }));
  };

  const deleteBed = (buildingId: string, roomId: string, bedId: string) => {
     setBuildings(buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          rooms: b.rooms.map(r => {
            if (r.id === roomId) {
              return { ...r, beds: r.beds.filter(bed => bed.id !== bedId) };
            }
            return r;
          })
        }
      }
      return b;
    }));
  };

  const assignOccupant = (buildingId: string, roomId: string, bedId: string, occupantId: string | null) => {
    setBuildings(buildings.map(b => {
      if (b.id === buildingId) {
        return {
          ...b,
          rooms: b.rooms.map(r => {
            if (r.id === roomId) {
              return {
                ...r,
                beds: r.beds.map(bed => bed.id === bedId ? { ...bed, occupantId: occupantId ?? undefined } : bed)
              };
            }
            return r;
          })
        }
      }
      return b;
    }));
  };
  
  const unassignOccupant = (buildingId: string, roomId: string, bedId: string) => {
    assignOccupant(buildingId, roomId, bedId, null);
    toast({ title: 'Occupant Unassigned' });
  };

  const addManualAchievement = (userId: string, title: string, description: string, points: number) => {
    if (!authContext?.user) return;
    const newAchievement: Achievement = {
      id: `ach-${Date.now()}`,
      userId,
      title,
      description,
      points,
      date: new Date().toISOString(),
      type: 'manual',
      status: 'pending',
      awardedById: authContext.user.id,
    };
    setAchievements([newAchievement, ...achievements]);
    toast({ title: 'Achievement Submitted', description: 'The award is pending approval.' });
  };

  const approveAchievement = (achievementId: string, points: number) => {
    setAchievements(
      achievements.map((ach) =>
        ach.id === achievementId ? { ...ach, status: 'approved', points } : ach
      )
    );
  };

  const rejectAchievement = (achievementId: string) => {
    setAchievements(achievements.filter((ach) => ach.id !== achievementId));
  };

  // UT Machine Functions
  const addUTMachine = (machine: Omit<UTMachine, 'id'>) => {
    const newMachine = { ...machine, id: `ut-${Date.now()}` };
    setUtMachines([newMachine, ...utMachines]);
    toast({ title: 'UT Machine Added' });
  };

  const editUTMachine = (machineId: string, machine: Partial<UTMachine>) => {
    setUtMachines(utMachines.map(m => m.id === machineId ? { ...m, ...machine } : m));
    toast({ title: 'UT Machine Updated' });
  };

  const deleteUTMachine = (machineId: string) => {
    setUtMachines(utMachines.filter(m => m.id !== machineId));
    toast({ title: 'UT Machine Deleted', variant: 'destructive' });
  };

  const addUTMachineLog = (machineId: string, log: Omit<MachineLog, 'id' | 'machineId' | 'userId'>) => {
    if(!authContext?.user) return;
    setUtMachines(utMachines.map(m => {
      if (m.id === machineId) {
        const newLog = { ...log, id: `log-${Date.now()}`, machineId, userId: authContext.user!.id };
        const logs = m.logs ? [newLog, ...m.logs] : [newLog];
        return { ...m, logs };
      }
      return m;
    }));
    toast({ title: 'Log Added' });
  };
  
  // DFT Machine Functions
  const addDftMachine = (machine: Omit<DftMachine, 'id'>) => {
    const newMachine = { ...machine, id: `dft-${Date.now()}` };
    setDftMachines([newMachine, ...dftMachines]);
    toast({ title: 'DFT Machine Added' });
  };

  const editDftMachine = (machineId: string, machine: Partial<DftMachine>) => {
    setDftMachines(dftMachines.map(m => m.id === machineId ? { ...m, ...machine } : m));
    toast({ title: 'DFT Machine Updated' });
  };

  const deleteDftMachine = (machineId: string) => {
    setDftMachines(dftMachines.filter(m => m.id !== machineId));
    toast({ title: 'DFT Machine Deleted', variant: 'destructive' });
  };

  const addDftMachineLog = (machineId: string, log: Omit<MachineLog, 'id' | 'machineId' | 'userId'>) => {
    if(!authContext?.user) return;
    setDftMachines(dftMachines.map(m => {
      if (m.id === machineId) {
        const newLog = { ...log, id: `log-${Date.now()}`, machineId, userId: authContext.user!.id };
        const logs = m.logs ? [newLog, ...m.logs] : [newLog];
        return { ...m, logs };
      }
      return m;
    }));
    toast({ title: 'Log Added' });
  };

  // Other Equipment Functions
  const addOtherEquipment = (item: Omit<OtherEquipment, 'id'>) => {
    const newItem = { ...item, id: `other-${Date.now()}` };
    setOtherEquipments([newItem, ...otherEquipments]);
    toast({ title: 'Equipment Added' });
  };

  const editOtherEquipment = (itemId: string, item: Partial<OtherEquipment>) => {
    setOtherEquipments(otherEquipments.map(i => i.id === itemId ? { ...i, ...item } : i));
    toast({ title: 'Equipment Updated' });
  };

  const deleteOtherEquipment = (itemId: string) => {
    setOtherEquipments(otherEquipments.filter(i => i.id !== itemId));
    toast({ title: 'Equipment Deleted', variant: 'destructive' });
  };
  
  // Certificate Request Functions
  const myFulfilledUTRequests = useMemo(() => {
    if (!authContext?.user) return [];
    return certificateRequests.filter(req => req.requesterId === authContext.user?.id && req.status === 'Completed' && !req.viewedByRequester);
  }, [certificateRequests, authContext.user]);

  const markUTRequestsAsViewed = useCallback(() => {
    setCertificateRequests(prev => prev.map(req => 
      myFulfilledUTRequests.some(fulfilledReq => fulfilledReq.id === req.id)
        ? { ...req, viewedByRequester: true }
        : req
    ));
  }, [myFulfilledUTRequests, setCertificateRequests]);

  const acknowledgeFulfilledUTRequest = (requestId: string) => {
    setCertificateRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: 'Acknowledged' } : req
    ));
    toast({ title: 'Request Acknowledged' });
  };

  // Manpower Log Functions
  const addManpowerLog = (log: Omit<ManpowerLog, 'id' | 'updatedBy'>) => {
    if (!authContext?.user) return;

    const newLog: ManpowerLog = {
      id: `mplog-${Date.now()}`,
      ...log,
      updatedBy: authContext.user.id,
    };

    setManpowerLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(l => l.date === newLog.date && l.projectId === newLog.projectId);
      if (existingLogIndex > -1) {
        const updatedLogs = [...prevLogs];
        updatedLogs[existingLogIndex] = newLog;
        return updatedLogs;
      }
      return [newLog, ...prevLogs];
    });
  };

  const addManpowerProfile = (profile: Omit<ManpowerProfile, 'id'>) => {
    const newProfile = { ...profile, id: `mp-prof-${Date.now()}` };
    setManpowerProfiles([newProfile, ...manpowerProfiles]);
    toast({ title: 'Manpower Profile Added' });
  };

  const editManpowerProfile = (profileId: string, profile: Partial<ManpowerProfile>) => {
    setManpowerProfiles(manpowerProfiles.map(p => p.id === profileId ? { ...p, ...profile } : p));
    toast({ title: 'Manpower Profile Updated' });
  };

  // Internal Request Functions
  const createInternalRequest = (items: RequestItem[]) => {
    if (!authContext.user) return;
    const newRequest: InternalRequest = {
      id: `ireq-${Date.now()}`,
      requesterId: authContext.user.id,
      date: new Date().toISOString(),
      items,
      status: 'Pending',
      comments: [],
      viewedByRequester: true,
    };
    setInternalRequests([newRequest, ...internalRequests]);
  };

  const addInternalRequestComment = (requestId: string, text: string) => {
      if (!authContext.user) return;
      const newComment = { id: `c-${Date.now()}`, userId: authContext.user.id, text, date: new Date().toISOString() };
      setInternalRequests(internalRequests.map(r => r.id === requestId ? { ...r, comments: [...r.comments, newComment], viewedByRequester: r.requesterId === authContext.user?.id } : r));
  };
  
  const approveInternalRequest = (requestId: string, comment?: string) => {
    if (!authContext.user) return;
    setInternalRequests(internalRequests.map(r => {
        if (r.id === requestId) {
            const updatedRequest = { ...r, status: 'Approved' as 'Approved', approverId: authContext.user?.id, viewedByRequester: false };
            if (comment) {
                updatedRequest.comments.push({ id: `c-${Date.now()}`, userId: authContext.user!.id, text: comment, date: new Date().toISOString() });
            }
            return updatedRequest;
        }
        return r;
    }));
  };

  const rejectInternalRequest = (requestId: string, comment: string) => {
    if (!authContext.user) return;
    setInternalRequests(internalRequests.map(r => {
        if (r.id === requestId) {
            const updatedRequest = { ...r, status: 'Rejected' as 'Rejected', approverId: authContext.user?.id, viewedByRequester: false };
            updatedRequest.comments.push({ id: `c-${Date.now()}`, userId: authContext.user!.id, text: comment, date: new Date().toISOString() });
            return updatedRequest;
        }
        return r;
    }));
  };
  
  // Management Request Functions
  const createManagementRequest = (recipientId: string, subject: string, body: string) => {
    if (!authContext.user) return;
    const newRequest: ManagementRequest = {
        id: `mreq-${Date.now()}`,
        requesterId: authContext.user.id,
        recipientId,
        date: new Date().toISOString(),
        subject,
        body,
        status: 'Pending',
        comments: [],
        viewedByRequester: true
    };
    setManagementRequests([newRequest, ...managementRequests]);
  };
  
  const addManagementRequestComment = (requestId: string, text: string) => {
      if (!authContext.user) return;
      const newComment = { id: `c-${Date.now()}`, userId: authContext.user.id, text, date: new Date().toISOString() };
      setManagementRequests(managementRequests.map(r => r.id === requestId ? { ...r, comments: [...r.comments, newComment], viewedByRequester: r.requesterId === authContext.user?.id } : r));
  };

  const approveManagementRequest = (requestId: string, comment?: string) => {
      if (!authContext.user) return;
      setManagementRequests(managementRequests.map(r => {
          if (r.id === requestId) {
              const updatedRequest = { ...r, status: 'Approved' as 'Approved', viewedByRequester: false };
              if (comment) {
                  updatedRequest.comments.push({ id: `c-${Date.now()}`, userId: authContext.user!.id, text: comment, date: new Date().toISOString() });
              }
              return updatedRequest;
          }
          return r;
      }));
  };

  const rejectManagementRequest = (requestId: string, comment: string) => {
      if (!authContext.user) return;
      setManagementRequests(managementRequests.map(r => {
          if (r.id === requestId) {
              const updatedRequest = { ...r, status: 'Rejected' as 'Rejected', viewedByRequester: false };
              updatedRequest.comments.push({ id: `c-${Date.now()}`, userId: authContext.user!.id, text: comment, date: new Date().toISOString() });
              return updatedRequest;
          }
          return r;
      }));
  };


  const value = {
    tasks,
    projects,
    announcements,
    events,
    buildings,
    manpowerProfiles,
    achievements,
    activityLogs,
    utMachines,
    dftMachines,
    mobileSims,
    otherEquipments,
    myFulfilledUTRequests,
    manpowerLogs,
    internalRequests,
    managementRequests,
    pendingInternalRequestCount,
    updatedInternalRequestCount,
    pendingManagementRequestCount,
    updatedManagementRequestCount,
    updateTask,
    createTask,
    createAnnouncement,
    getPrioritySuggestion,
    user: authContext?.user || null,
    users: authContext?.users || [],
    roles: ROLES,
    getVisibleUsers,
    can,
    addBuilding,
    editBuilding,
    deleteBuilding,
    addRoom,
    editRoom,
    deleteRoom,
    addBed,
    deleteBed,
    assignOccupant,
    unassignOccupant,
    addManualAchievement,
    approveAchievement,
    rejectAchievement,
    addUTMachine,
    editUTMachine,
    deleteUTMachine,
    addUTMachineLog,
    addDftMachine,
    editDftMachine,
    deleteDftMachine,
    addDftMachineLog,
    addOtherEquipment,
    editOtherEquipment,
    deleteOtherEquipment,
    markUTRequestsAsViewed,
    acknowledgeFulfilledUTRequest,
    addManpowerLog,
    addManpowerProfile,
    editManpowerProfile,
    createInternalRequest,
    addInternalRequestComment,
    approveInternalRequest,
    rejectInternalRequest,
    createManagementRequest,
    addManagementRequestComment,
    approveManagementRequest,
    rejectManagementRequest,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
