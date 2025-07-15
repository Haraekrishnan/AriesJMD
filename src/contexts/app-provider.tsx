'use client';

import React, { createContext, useState, ReactNode, useContext } from 'react';
import { Task, Project, Announcement, PlannerEvent } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { TASKS, PROJECTS, ANNOUNCEMENTS, PLANNER_EVENTS } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { AuthContext } from './auth-provider';

interface AppContextProps {
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  events: PlannerEvent[];
  updateTask: (updatedTask: Task) => void;
  createTask: (newTask: Omit<Task, 'id' | 'creatorId' | 'projectId'>) => void;
  getPrioritySuggestion: (title: string, description: string) => Promise<string | null>;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks', TASKS);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects', PROJECTS);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements', ANNOUNCEMENTS);
  const [events, setEvents] = useLocalStorage<PlannerEvent[]>('aries-events', PLANNER_EVENTS);

  const { toast } = useToast();

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  };

  const createTask = (newTaskData: Omit<Task, 'id' | 'creatorId' | 'projectId'>) => {
    if(!user || !user.projectId) return;
    const newTask: Task = {
        ...newTaskData,
        id: `task-${Date.now()}`,
        creatorId: user.id,
        projectId: user.projectId,
        isViewedByAssignee: false,
        approvalState: 'none',
        comments: [],
    };
    setTasks([newTask, ...tasks]);
    toast({
        title: 'Task Created',
        description: `Task "${newTask.title}" has been successfully created.`,
    });
  }

  const getPrioritySuggestion = async (title: string, description: string): Promise<string | null> => {
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
      return data.priority;
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

  const value = {
    tasks,
    projects,
    announcements,
    events,
    updateTask,
    createTask,
    getPrioritySuggestion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
