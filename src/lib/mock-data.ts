import { User, Task, Project, Announcement, Event } from '@/types';
import { addMonths, formatISO, subDays, addDays } from 'date-fns';

export const mockUsers: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@aries.com', password: 'password', role: 'Admin', avatar: '/avatars/01.png' },
  { id: 'user-2', name: 'Manager Mike', email: 'manager@aries.com', password: 'password', role: 'Manager', avatar: '/avatars/02.png', supervisorId: 'user-1', directReports: ['user-3', 'user-4'] },
  { id: 'user-3', name: 'Supervisor Sarah', email: 'supervisor@aries.com', password: 'password', role: 'Supervisor', avatar: '/avatars/03.png', supervisorId: 'user-2', directReports: ['user-5', 'user-6'] },
  { id: 'user-4', name: 'Store Keeper Steve', email: 'store@aries.com', password: 'password', role: 'Store Personnel', avatar: '/avatars/04.png', supervisorId: 'user-2' },
  { id: 'user-5', name: 'Employee Emily', email: 'employee1@aries.com', password: 'password', role: 'Employee', avatar: '/avatars/05.png', supervisorId: 'user-3' },
  { id: 'user-6', name: 'Employee Bob', email: 'employee2@aries.com', password: 'password', role: 'Employee', avatar: '/avatars/06.png', supervisorId: 'user-3' },
];

export const mockProjects: Project[] = [
  { id: 'proj-1', name: 'Project Alpha', description: 'Major structural integrity analysis.' },
  { id: 'proj-2', name: 'Project Beta', description: 'Routine maintenance and inspection.' },
  { id: 'proj-3', name: 'Project Gamma', description: 'New system installation.' },
];

const today = new Date();

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Initial brief and project setup',
    description: 'Setup the repository and initial project structure.',
    status: 'Completed',
    priority: 'High',
    dueDate: formatISO(subDays(today, 10)),
    assigneeId: 'user-5',
    creatorId: 'user-3',
    projectId: 'proj-1',
  },
  {
    id: 'task-2',
    title: 'Client meeting for requirements',
    description: 'Discuss final requirements with the client.',
    status: 'Completed',
    priority: 'High',
    dueDate: formatISO(subDays(today, 5)),
    assigneeId: 'user-6',
    creatorId: 'user-3',
    projectId: 'proj-1',
  },
  {
    id: 'task-3',
    title: 'Develop core features',
    description: 'Implement the main features of the application.',
    status: 'In Progress',
    priority: 'High',
    dueDate: formatISO(addDays(today, 15)),
    assigneeId: 'user-5',
    creatorId: 'user-2',
    projectId: 'proj-1',
  },
  {
    id: 'task-4',
    title: 'Design UI/UX mockups',
    description: 'Create mockups in Figma for the new dashboard.',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: formatISO(addDays(today, 5)),
    assigneeId: 'user-6',
    creatorId: 'user-2',
    projectId: 'proj-1',
  },
  {
    id: 'task-5',
    title: 'Setup CI/CD pipeline',
    description: 'Configure continuous integration and deployment.',
    status: 'To Do',
    priority: 'Medium',
    dueDate: formatISO(addDays(today, 20)),
    assigneeId: 'user-5',
    creatorId: 'user-2',
    projectId: 'proj-2',
  },
  {
    id: 'task-6',
    title: 'Order new inventory',
    description: 'Restock safety helmets and gloves.',
    status: 'To Do',
    priority: 'Low',
    dueDate: formatISO(addDays(today, 30)),
    assigneeId: 'user-4',
    creatorId: 'user-2',
    projectId: 'proj-3',
  },
  {
    id: 'task-7',
    title: 'Perform quarterly equipment audit',
    description: 'Check calibration dates for all UT machines.',
    status: 'Overdue',
    priority: 'High',
    dueDate: formatISO(subDays(today, 2)),
    assigneeId: 'user-4',
    creatorId: 'user-2',
    projectId: 'proj-3',
  },
  {
    id: 'task-8',
    title: 'Draft monthly report',
    description: 'Summarize project progress for Project Beta.',
    status: 'To Do',
    priority: 'Medium',
    dueDate: formatISO(addDays(today, 7)),
    assigneeId: 'user-3',
    creatorId: 'user-2',
    projectId: 'proj-2',
  },
  // Add more tasks to show chart data
  {
    id: 'task-9',
    title: 'Last month task 1',
    description: 'A completed task from last month.',
    status: 'Completed',
    priority: 'Medium',
    dueDate: formatISO(subDays(addMonths(today, -1), 5)),
    assigneeId: 'user-5',
    creatorId: 'user-3',
    projectId: 'proj-1',
  },
  {
    id: 'task-10',
    title: 'Last month task 2',
    description: 'Another completed task from last month.',
    status: 'Completed',
    priority: 'Low',
    dueDate: formatISO(subDays(addMonths(today, -1), 15)),
    assigneeId: 'user-6',
    creatorId: 'user-3',
    projectId: 'proj-2',
  },
  {
    id: 'task-11',
    title: 'Task from two months ago',
    description: 'A completed task from two months ago.',
    status: 'Completed',
    priority: 'High',
    dueDate: formatISO(subDays(addMonths(today, -2), 10)),
    assigneeId: 'user-5',
    creatorId: 'user-3',
    projectId: 'proj-1',
  }
];

export const mockAnnouncements: Announcement[] = [
    { id: 'anno-1', title: 'System Maintenance Scheduled', content: 'The system will be down for maintenance on Saturday from 2 AM to 4 AM.', publishedAt: formatISO(subDays(today, 1)) },
    { id: 'anno-2', title: 'New Safety Protocols', content: 'Please review the new safety protocols document available in the resources section.', publishedAt: formatISO(subDays(today, 3)) },
];

export const mockEvents: Event[] = [
    { id: 'event-1', title: 'Project Alpha Kick-off', date: formatISO(today), userId: 'user-2' },
    { id: 'event-2', title: 'Team Building Activity', date: formatISO(addDays(today, 10)), userId: 'user-1' },
];
