
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Task, TaskStatus, ApprovalState, Comment, Subtask, NotificationEventKey } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { format, isPast } from 'date-fns';
import { useGeneral } from './general-provider';

type TaskContextType = {
  tasks: Task[];
  myNewTaskCount: number;
  pendingTaskApprovalCount: number;
  myPendingTaskRequestCount: number;
  createTask: (taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'approvalState'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  addComment: (taskId: string, commentText: string, notify?: boolean) => void;
  requestTaskStatusChange: (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => void;
  approveTaskStatusChange: (taskId: string, comment: string) => void;
  returnTaskStatusChange: (taskId: string, comment: string) => void;
  requestTaskReassignment: (taskId: string, newAssigneeId: string, comment: string) => void;
  markTaskAsViewed: (taskId: string) => void;
  acknowledgeReturnedTask: (taskId: string) => void;
};

const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listeners = [
        onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            const processedData = Object.keys(data).reduce((acc, key) => {
                acc[key] = { ...data[key], id: key };
                return acc;
            }, {} as Record<string, T>);
            setData(processedData);
        })
    ];
    return () => listeners.forEach(listener => listener());
};

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user, users, addActivityLog } = useAuth();
  const { notificationSettings } = useGeneral();
  const { toast } = useToast();
  const [tasksById, setTasksById] = useState<Record<string, Task>>({});
  
  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);

  const { myNewTaskCount, pendingTaskApprovalCount, myPendingTaskRequestCount } = useMemo(() => {
    if (!user) return { myNewTaskCount: 0, pendingTaskApprovalCount: 0, myPendingTaskRequestCount: 0 };
    
    let myNew = 0;
    let pendingApproval = 0;
    let myPending = 0;

    tasks.forEach(task => {
        // My new tasks
        if (task.assigneeIds?.includes(user.id) && !task.viewedBy?.[user.id] && task.status !== 'Done' && task.approvalState !== 'returned') {
            myNew++;
        }
        // My returned tasks
        if (task.assigneeIds?.includes(user.id) && task.approvalState === 'returned' && !task.viewedBy?.[user.id]){
            myNew++;
        }
        // Tasks awaiting my approval
        if (task.creatorId === user.id && task.statusRequest?.status === 'Pending') {
            pendingApproval++;
        }
        // My tasks awaiting someone else's approval
        if (task.statusRequest?.requestedBy === user.id && task.statusRequest?.status === 'Pending') {
            myPending++;
        }
    });

    return { myNewTaskCount: myNew, pendingTaskApprovalCount: pendingApproval, myPendingTaskRequestCount: myPending };

  }, [tasks, user]);

    const createTask = useCallback((taskData: Omit<Task, 'id' | 'creatorId' | 'status' | 'comments' | 'approvalState'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'tasks'));
        const subtasks: { [userId: string]: Subtask } = {};
        taskData.assigneeIds.forEach(id => {
            subtasks[id] = { userId: id, status: 'To Do', updatedAt: new Date().toISOString() };
        });

        const newTask = {
            ...taskData,
            id: newRef.key,
            creatorId: user.id,
            status: 'To Do' as TaskStatus,
            approvalState: 'none' as ApprovalState,
            comments: [],
            lastUpdated: new Date().toISOString(),
            viewedBy: { [user.id]: true },
            subtasks,
        };
        set(newRef, newTask);
        addActivityLog(user.id, 'Task Created', `Created task: "${taskData.title}"`);
        
        const assignees = users.filter(u => taskData.assigneeIds.includes(u.id));
        assignees.forEach(assignee => {
            if (assignee.email) {
                 const htmlBody = `
                    <p>A new task has been assigned to you by <strong>${user.name}</strong>.</p>
                    <hr>
                    <h3>${taskData.title}</h3>
                    <p>${taskData.description}</p>
                    <p><strong>Due Date:</strong> ${format(new Date(taskData.dueDate), 'PPP')}</p>
                    <p><strong>Priority:</strong> ${taskData.priority}</p>
                    ${taskData.link ? `<p><strong>Attachment:</strong> <a href="${taskData.link}">View Attachment</a></p>` : ''}
                    <p>Please review the task in the app.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks">View Task</a>
                `;
                sendNotificationEmail({
                    to: [assignee.email],
                    subject: `New Task Assigned: ${taskData.title}`,
                    htmlBody: htmlBody,
                    notificationSettings,
                    event: 'onNewTask',
                    involvedUser: assignee,
                    creatorUser: user,
                });
            }
        });

    }, [user, addActivityLog, users, notificationSettings]);

    const updateTask = useCallback((task: Task) => {
        const { id, ...data } = task;
        const updateData = { ...data, lastUpdated: new Date().toISOString() };
        update(ref(rtdb, `tasks/${id}`), updateData);
    }, []);

    const deleteTask = useCallback((taskId: string) => {
        if (!user || user.role !== 'Admin') {
            toast({ variant: 'destructive', title: 'Permission Denied' });
            return;
        }
        remove(ref(rtdb, `tasks/${taskId}`));
        toast({ variant: 'destructive', title: 'Task Deleted' });
    }, [user, toast]);

    const addComment = useCallback((taskId: string, commentText: string, notify: boolean = true) => {
        if (!user) return;
        const task = tasksById[taskId];
        if (!task) return;
    
        const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
        const newComment: Comment = {
            id: newCommentRef.key!,
            userId: user.id,
            text: commentText,
            date: new Date().toISOString(),
            eventId: taskId,
            viewedBy: { [user.id]: true }
        };
        set(newCommentRef, newComment);

        const participants = new Set([...(task.assigneeIds || []), task.creatorId]);
        
        if (notify) {
            participants.forEach(pId => {
                if (pId !== user.id) {
                    const participantUser = users.find(u => u.id === pId);
                    if (participantUser?.email) {
                         sendNotificationEmail({
                            to: [participantUser.email],
                            subject: `New comment on task: ${task.title}`,
                            htmlBody: `<p>${user.name} commented: "${commentText}"</p><br/><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks">View Task</a>`,
                            notificationSettings,
                            event: 'onTaskComment',
                            involvedUser: participantUser,
                            creatorUser: users.find(u => u.id === task.creatorId)
                        });
                    }
                    set(ref(rtdb, `tasks/${taskId}/viewedBy/${pId}`), false);
                }
            });
        }
    }, [user, tasksById, users, notificationSettings]);
    
    const requestTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, comment: string, attachment?: Task['attachment']) => {
        if (!user) return;
        const task = tasksById[taskId];
        if (!task) return;
    
        const updates: { [key: string]: any } = {};
        
        if (task.subtasks?.[user.id]) {
          updates[`tasks/${taskId}/subtasks/${user.id}/status`] = newStatus;
          updates[`tasks/${taskId}/subtasks/${user.id}/updatedAt`] = new Date().toISOString();
        }
        
        const allSubtasks = Object.values(task.subtasks || {});
        
        const isAnyInProgress = allSubtasks.some(st => (st.userId === user.id ? newStatus === 'In Progress' : st.status === 'In Progress'));
        const allDone = allSubtasks.every(st => (st.userId === user.id ? newStatus === 'Done' : st.status === 'Done'));

        if (allDone) {
            updates[`tasks/${taskId}/status`] = 'Pending Approval';
            updates[`tasks/${taskId}/statusRequest`] = {
                requestedBy: user.id,
                newStatus: 'Done',
                comment,
                attachment: attachment || null,
                date: new Date().toISOString(),
                status: 'Pending',
            };
            updates[`tasks/${taskId}/approvalState`] = 'status_pending';
            
            const creator = users.find(u => u.id === task.creatorId);
            if (creator?.email) {
                sendNotificationEmail({
                    to: [creator.email],
                    subject: `Task for Approval: ${task.title}`,
                    htmlBody: `<p>${user.name} has submitted the task "${task.title}" for your approval.</p><p>Comment: "${comment}"</p><br/><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks">View Task</a>`,
                    notificationSettings,
                    event: 'onTaskForApproval',
                    creatorUser: creator,
                    involvedUser: user
                });
            }

        } else if (isAnyInProgress) {
            updates[`tasks/${taskId}/status`] = 'In Progress';
            updates[`tasks/${taskId}/approvalState`] = 'none';
        } else {
            updates[`tasks/${taskId}/status`] = 'To Do';
            updates[`tasks/${taskId}/approvalState`] = 'none';
        }

        if (comment) {
            const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
            updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = {
                id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString(), eventId: taskId
            };
        }
        
        update(ref(rtdb), updates);
    }, [user, users, tasksById, notificationSettings]);
      

    const approveTaskStatusChange = useCallback((taskId: string, comment: string) => {
        if (!user) return;
        const task = tasksById[taskId];
        if (!task || !task.statusRequest) return;
        
        const updates: { [key: string]: any } = {};
        updates[`tasks/${taskId}/status`] = task.statusRequest.newStatus;
        updates[`tasks/${taskId}/completionDate`] = new Date().toISOString();
        updates[`tasks/${taskId}/approvalState`] = 'approved';
        updates[`tasks/${taskId}/statusRequest`] = null; 

        if (comment) {
          const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
          updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = {
            id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString(), eventId: taskId
          };
        }
        
        update(ref(rtdb), updates);
        toast({ title: 'Task Approved' });

        const requestor = users.find(u => u.id === task.statusRequest!.requestedBy);
        if (requestor?.email) {
            sendNotificationEmail({
                to: [requestor.email],
                subject: `Task Approved: ${task.title}`,
                htmlBody: `<p>Your submitted task "${task.title}" has been approved by ${user.name}.</p><p>Comment: "${comment}"</p><br/><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks">View Task</a>`,
                notificationSettings,
                event: 'onTaskApproved',
                involvedUser: requestor,
                creatorUser: user
            });
        }

    }, [user, users, tasksById, toast, notificationSettings]);

    const returnTaskStatusChange = useCallback((taskId: string, comment: string) => {
        if (!user) return;
        const task = tasksById[taskId];
        if (!task || !task.statusRequest) return;
    
        const updates: { [key: string]: any } = {};
        updates[`tasks/${taskId}/approvalState`] = 'returned';
        updates[`tasks/${taskId}/statusRequest`] = null; 
        
        updates[`tasks/${taskId}/status`] = 'In Progress';
    
        const requesterId = task.statusRequest.requestedBy;
        if (task.subtasks?.[requesterId]) {
            updates[`tasks/${taskId}/subtasks/${requesterId}/status`] = 'In Progress';
        }
        
        if (comment) {
            const newCommentRef = push(ref(rtdb, `tasks/${taskId}/comments`));
            updates[`tasks/${taskId}/comments/${newCommentRef.key}`] = {
                id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString(), eventId: taskId
            };
        }
        update(ref(rtdb), updates);
    
        const requestor = users.find(u => u.id === task.statusRequest!.requestedBy);
        if (requestor?.email) {
            sendNotificationEmail({
                to: [requestor.email],
                subject: `Task Returned: ${task.title}`,
                htmlBody: `<p>Your submitted task "${task.title}" has been returned by ${user.name}.</p><p>Comment: "${comment}"</p><br/><a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks">View Task</a>`,
                notificationSettings,
                event: 'onTaskReturned',
                involvedUser: requestor,
                creatorUser: user
            });
        }
    
    }, [user, users, tasksById, notificationSettings]);

    const requestTaskReassignment = useCallback((taskId: string, newAssigneeId: string, comment: string) => {
        if (!user) return;
        const task = tasksById[taskId];
        if (!task) return;
        
        const updates: { [key: string]: any } = {};
        updates[`tasks/${taskId}/pendingAssigneeId`] = newAssigneeId;
        updates[`tasks/${taskId}/status`] = 'Pending Approval';
        updates[`tasks/${taskId}/approverId`] = task.creatorId; 

        if (comment) {
            addComment(taskId, `Reassignment requested to ${users.find(u=>u.id===newAssigneeId)?.name || 'new user'}: ${comment}`);
        }
    
        update(ref(rtdb), updates);
    }, [user, tasksById, users, addComment]);

    const markTaskAsViewed = useCallback((taskId: string) => {
        if (!user || tasksById[taskId]?.viewedBy?.[user.id]) return;
        set(ref(rtdb, `tasks/${taskId}/viewedBy/${user.id}`), true);
    }, [user, tasksById]);
    
    const acknowledgeReturnedTask = useCallback((taskId: string) => {
        if (!user) return;
        update(ref(rtdb, `tasks/${taskId}`), { approvalState: 'none' });
    }, [user]);

    useEffect(() => {
        const unsubscribe = createDataListener('tasks', setTasksById);
        return () => unsubscribe();
    }, []);

    const contextValue: TaskContextType = {
        tasks,
        myNewTaskCount,
        pendingTaskApprovalCount,
        myPendingTaskRequestCount,
        createTask,
        updateTask,
        deleteTask,
        addComment,
        requestTaskStatusChange,
        approveTaskStatusChange,
        returnTaskStatusChange,
        requestTaskReassignment,
        markTaskAsViewed,
        acknowledgeReturnedTask
    };

    return <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>;
}

export const useTask = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};