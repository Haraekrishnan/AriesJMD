
'use client';

import React, { createContext, useState, ReactNode, useContext, useCallback } from 'react';
import { Task, Project, Announcement, PlannerEvent, Priority, User } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { TASKS, PROJECTS, ANNOUNCEMENTS, PLANNER_EVENTS } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from './auth-provider';

interface AppContextProps {
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  events: PlannerEvent[];
  user: User | null;
  users: User[];
  updateTask: (updatedTask: Task) => void;
  createTask: (newTask: Omit<Task, 'id' | 'creatorId' | 'projectId' | 'comments' | 'approvalState' | 'assigneeIds'>) => void;
  getPrioritySuggestion: (title: string, description: string) => Promise<Priority | null>;
  getVisibleUsers: () => User[];
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const authContext = useContext(AuthContext);
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks', TASKS);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects', PROJECTS);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements', ANNOUNCEMENTS);
  const [events, setEvents] = useLocalStorage<PlannerEvent[]>('aries-events', PLANNER_EVENTS);

  const { toast } = useToast();

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

  const value = {
    tasks,
    projects,
    announcements,
    events,
    updateTask,
    createTask,
    getPrioritySuggestion,
    user: authContext?.user || null,
    users: authContext?.users || [],
    getVisibleUsers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
