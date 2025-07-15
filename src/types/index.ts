export type UserRole = 'Admin' | 'Manager' | 'Supervisor' | 'Employee' | 'Store Personnel';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar: string;
  directReports?: string[];
  supervisorId?: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed' | 'Overdue' | 'Pending Approval';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  creatorId: string;
  projectId: string;
  comments?: { userId: string; comment: string; createdAt: string }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  userId: string;
}
