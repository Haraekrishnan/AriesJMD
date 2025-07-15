'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, Task, Project, Announcement, PlannerEvent } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockUsers, mockTasks, mockProjects, mockAnnouncements, mockEvents } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

interface AppContextProps {
  isLoading: boolean;
  user: User | null;
  users: User[];
  tasks: Task[];
  projects: Project[];
  announcements: Announcement[];
  events: PlannerEvent[];
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  updateTask: (updatedTask: Task) => void;
  createTask: (newTask: Omit<Task, 'id' | 'creatorId'>) => void;
  getPrioritySuggestion: (title: string, description: string) => Promise<string | null>;
}

export const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>('aries-user', null);
  const [users, setUsers] = useLocalStorage<User[]>('aries-users', mockUsers);
  const [tasks, setTasks] = useLocalStorage<Task[]>('aries-tasks', mockTasks);
  const [projects, setProjects] = useLocalStorage<Project[]>('aries-projects', mockProjects);
  const [announcements, setAnnouncements] = useLocalStorage<Announcement[]>('aries-announcements', mockAnnouncements);
  const [events, setEvents] = useLocalStorage<PlannerEvent[]>('aries-events', mockEvents);

  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const login = (email: string, pass: string): boolean => {
    const foundUser = users.find((u) => u.email === email && u.password === pass);
    if (foundUser) {
      setUser(foundUser);
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${foundUser.name}!`,
      });
      router.push('/dashboard');
      return true;
    }
    toast({
      variant: 'destructive',
      title: 'Login Failed',
      description: 'Invalid email or password.',
    });
    return false;
  };

  const logout = () => {
    setUser(null);
    router.push('/login');
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  };

  const createTask = (newTaskData: Omit<Task, 'id' | 'creatorId'>) => {
    if(!user) return;
    const newTask: Task = {
        ...newTaskData,
        id: `task-${Date.now()}`,
        creatorId: user.id,
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
    isLoading,
    user,
    users,
    tasks,
    projects,
    announcements,
    events,
    login,
    logout,
    updateTask,
    createTask,
    getPrioritySuggestion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
