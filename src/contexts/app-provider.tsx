
'use client';

import React, { createContext, useState, ReactNode, useContext, useCallback, useMemo } from 'react';
import { Task, Project, Announcement, PlannerEvent, Priority, User, Permission, Building, Room, ManpowerProfile, ALL_PERMISSIONS } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { TASKS, PROJECTS, ANNOUNCEMENTS, PLANNER_EVENTS, ROLES, BUILDINGS, MANPOWER_PROFILES } from '@/lib/mock-data';
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
  user: User | null;
  users: User[];
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
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks', TASKS);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects', PROJECTS);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements', ANNOUNCEMENTS);
  const [events, setEvents] = useLocalStorage<PlannerEvent[]>('aries-events', PLANNER_EVENTS);
  const [buildings, setBuildings] = useLocalStorage<Building[]>('aries-buildings', BUILDINGS);
  const [manpowerProfiles, setManpowerProfiles] = useLocalStorage<ManpowerProfile[]>('aries-manpower-profiles', MANPOWER_PROFILES);


  const { toast } = useToast();

  const can = useMemo<PermissionsCheck>(() => {
    const userRole = authContext?.user ? ROLES.find(r => r.name === authContext.user!.role) : undefined;
    const permissions = userRole?.permissions ?? [];
    
    const checks = ALL_PERMISSIONS.reduce((acc, permission) => {
        acc[permission] = permissions.includes(permission);
        return acc;
    }, {} as PermissionsCheck);

    return checks;

  }, [authContext?.user]);


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


  const value = {
    tasks,
    projects,
    announcements,
    events,
    buildings,
    manpowerProfiles,
    updateTask,
    createTask,
    createAnnouncement,
    getPrioritySuggestion,
    user: authContext?.user || null,
    users: authContext?.users || [],
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
