
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Task, TaskStatus, ApprovalState, Comment, Subtask, NotificationEventKey, JobProgress, JobStep, JobStepStatus, Role } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { format, isPast } from 'date-fns';
import { useGeneral } from './general-provider';
import { uploadFile } from '@/lib/storage';

type TaskContextType = {
  tasks: Task[];
  jobProgress: JobProgress[];
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
  createJobProgress: (data: { title: string; steps: Omit<JobStep, 'id' | 'status'>[]; projectId?: string; workOrderNo?: string; foNo?: string; amount?: number; dateFrom?: string | null; dateTo?: string | null; }) => void;
  updateJobStepStatus: (jobId: string, stepId: string, newStatus: JobStepStatus, comment?: string, completionDetails?: { attachmentUrl?: string; customFields?: Record<string, any> }) => void;
  addAndCompleteStep: (jobId: string, currentStepId: string, completionComment: string | undefined, completionAttachment: Task['attachment'] | undefined, completionCustomFields: Record<string, any> | undefined, nextStepData: Omit<JobStep, 'id'|'status'>) => void;
  addJobStepComment: (jobId: string, stepId: string, commentText: string) => void;
  reassignJobStep: (jobId: string, stepId: string, newAssigneeId: string, comment: string) => void;
  assignJobStep: (jobId: string, stepId: string, assigneeId: string) => void;
  completeJobAsFinalStep: (jobId: string, stepId: string, comment: string) => void;
  reopenJob: (jobId: string, reason: string, newStepName: string, newStepAssigneeId: string) => void;
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
  const { user, users, addActivityLog, getAssignableUsers } = useAuth();
  const { notificationSettings } = useGeneral();
  const { toast } = useToast();
  const [tasksById, setTasksById] = useState<Record<string, Task>>({});
  const [jobProgressById, setJobProgressById] = useState<Record<string, JobProgress>>({});
  
  const tasks = useMemo(() => Object.values(tasksById), [tasksById]);
  const jobProgress = useMemo(() => Object.values(jobProgressById), [jobProgressById]);

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

    const createJobProgress = useCallback((data: { title: string; steps: Omit<JobStep, 'id' | 'status'>[], projectId?: string, workOrderNo?: string, foNo?: string, amount?: number, dateFrom?: string | null, dateTo?: string | null }) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'jobProgress'));
        const now = new Date().toISOString();

        const initialSteps: JobStep[] = (data.steps || []).map((step, index) => ({
            ...step,
            id: `step-${index}`,
            status: index === 0 ? 'Pending' : 'Not Started',
            assigneeId: step.assigneeId || null,
            dueDate: step.dueDate || null,
        }));

        const newJob: Omit<JobProgress, 'id'> = {
          title: data.title,
          creatorId: user.id,
          createdAt: now,
          lastUpdated: now,
          status: 'Not Started',
          steps: initialSteps,
          projectId: data.projectId,
          workOrderNo: data.workOrderNo,
          foNo: data.foNo,
          amount: data.amount,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
        };
    
        set(newRef, newJob);
    }, [user]);

    const addJobStepComment = useCallback((jobId: string, stepId: string, commentText: string) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
        
        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        const newCommentRef = push(ref(rtdb, `jobProgress/${jobId}/steps/${stepIndex}/comments`));
        const newComment: Omit<Comment, 'id'> = {
            id: newCommentRef.key!,
            userId: user.id,
            text: commentText,
            date: new Date().toISOString(),
            eventId: jobId
        };
        set(newCommentRef, newComment);
    }, [user, jobProgressById]);

    const updateJobStepStatus = useCallback((jobId: string, stepId: string, newStatus: JobStepStatus, comment?: string, completionDetails?: { attachmentUrl?: string; customFields?: Record<string, any> }) => {
        const job = jobProgressById[jobId];
        if (!job || !user) return;

        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
        const currentStep = job.steps[stepIndex];

        const updates: { [key: string]: any } = {};
        const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;

        if (!currentStep.assigneeId && (newStatus === 'Acknowledged' || newStatus === 'Completed')) {
            updates[`${stepPath}/assigneeId`] = user.id;
        }

        updates[`${stepPath}/status`] = newStatus;
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();
        
        if (newStatus === 'Acknowledged') {
            updates[`${stepPath}/acknowledgedAt`] = new Date().toISOString();
        } else if (newStatus === 'Completed') {
            updates[`${stepPath}/completedAt`] = new Date().toISOString();
            updates[`${stepPath}/completedBy`] = user.id;
            updates[`${stepPath}/completionDetails`] = {
                date: new Date().toISOString(),
                notes: comment || '',
                attachmentUrl: completionDetails?.attachmentUrl || null,
                customFields: completionDetails?.customFields || null,
            };

            if (stepIndex < job.steps.length - 1) {
                updates[`jobProgress/${jobId}/steps/${stepIndex + 1}/status`] = 'Pending';
            }
        }
        
        const allStepsCompleted = job.steps.every((step, index) => 
            index === stepIndex ? newStatus === 'Completed' : step.status === 'Completed'
        );

        if (job.status === 'Not Started' && (newStatus === 'Acknowledged' || newStatus === 'Completed')) {
            updates[`jobProgress/${jobId}/status`] = 'In Progress';
        }

        update(ref(rtdb), updates);

        if (comment) {
            addJobStepComment(jobId, stepId, comment);
        }
    }, [user, jobProgressById, addJobStepComment]);
    
    const addAndCompleteStep = useCallback((jobId: string, currentStepId: string, completionComment: string | undefined, completionAttachment: Task['attachment'] | undefined, completionCustomFields: Record<string, any> | undefined, nextStepData: Omit<JobStep, 'id'|'status'>) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
    
        const stepIndex = job.steps.findIndex(s => s.id === currentStepId);
        if (stepIndex === -1) return;

        if (job.steps[stepIndex].assigneeId !== user.id) {
            toast({ variant: 'destructive', title: 'Not authorized to complete this step.' });
            return;
        }
    
        const updates: { [key: string]: any } = {};
        const currentStepPath = `jobProgress/${jobId}/steps/${stepIndex}`;
    
        // 1. Update current step
        updates[`${currentStepPath}/status`] = 'Completed';
        updates[`${currentStepPath}/completedAt`] = new Date().toISOString();
        updates[`${currentStepPath}/completedBy`] = user.id;
        updates[`${currentStepPath}/completionDetails`] = {
            date: new Date().toISOString(),
            notes: completionComment || '',
            attachmentUrl: completionAttachment?.url || null,
            customFields: completionCustomFields || null,
        };
    
        // 2. Create and add new step
        const newStep: JobStep = {
            ...nextStepData,
            dueDate: nextStepData.dueDate || null,
            assigneeId: nextStepData.assigneeId || null,
            id: `step-${job.steps.length}`,
            status: 'Pending',
        };
        updates[`jobProgress/${jobId}/steps/${job.steps.length}`] = newStep;
    
        // 3. Update job metadata
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();
        updates[`jobProgress/${jobId}/status`] = 'In Progress';
    
        update(ref(rtdb), updates);
    
        if (completionComment) {
            addJobStepComment(jobId, currentStepId, completionComment);
        }
        
        // 4. Notify new assignee
        const newAssignee = users.find(u => u.id === newStep.assigneeId);
        if (newAssignee?.email) {
            const htmlBody = `
                <p>A new step in the job "${job.title}" has been assigned to you by <strong>${user.name}</strong>.</p>
                <hr>
                <h3>Step: ${newStep.name}</h3>
                <p>${newStep.description}</p>
                ${newStep.dueDate ? `<p><strong>Due Date:</strong> ${format(new Date(newStep.dueDate), 'PPP')}</p>` : ''}
                <p>Please review the job in the app.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Job</a>
            `;
            sendNotificationEmail({
                to: [newAssignee.email],
                subject: `New Job Step Assigned: ${job.title}`,
                htmlBody: htmlBody,
                notificationSettings,
                event: 'onNewTask',
                involvedUser: newAssignee,
                creatorUser: user,
            });
        }
    }, [user, jobProgressById, users, addJobStepComment, notificationSettings, toast]);

    const reassignJobStep = useCallback((jobId: string, stepId: string, newAssigneeId: string, comment: string) => {
      if (!user) return;
      const job = jobProgressById[jobId];
      if (!job) return;
  
      const stepIndex = job.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return;
  
      const currentStep = job.steps[stepIndex];
      const assignableUsers = getAssignableUsers();

      if (currentStep.assigneeId !== user.id && user.role !== 'Admin') {
          toast({ title: 'Not authorized', variant: 'destructive' });
          return;
      }
  
      const oldAssignee = users.find(u => u.id === currentStep.assigneeId);
      const newAssignee = users.find(u => u.id === newAssigneeId);
      if (!newAssignee) return;
      
      const reassignComment = `${user.name} reassigned this step from ${oldAssignee?.name || 'Previous Assignee'} to ${newAssignee.name}. Reason: ${comment}`;
  
      const updates: { [key: string]: any } = {};
      const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;
  
      updates[`${stepPath}/assigneeId`] = newAssigneeId;
      updates[`${stepPath}/status`] = 'Pending';
      updates[`${stepPath}/acknowledgedAt`] = null; // Reset acknowledgment
  
      const newCommentRef = push(ref(rtdb, `${stepPath}/comments`));
      const newComment: Omit<Comment, 'id'> = {
          id: newCommentRef.key!,
          userId: user.id,
          text: reassignComment,
          date: new Date().toISOString(),
          eventId: jobId,
      };
      updates[`${stepPath}/comments/${newCommentRef.key}`] = newComment;
      
      updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();
  
      update(ref(rtdb), updates);
  
      toast({ title: "Step Reassigned", description: `Assigned to ${newAssignee.name}.` });
  
      // Notify new assignee
      if (newAssignee.email) {
          const htmlBody = `
              <p>A job step in "${job.title}" has been reassigned to you by <strong>${user.name}</strong>.</p>
              <hr>
              <h3>Step: ${currentStep.name}</h3>
              <p><strong>Reason:</strong> ${comment}</p>
              <p>Please review the job in the app and acknowledge the step.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Job</a>
          `;
          sendNotificationEmail({
              to: [newAssignee.email],
              subject: `Job Step Reassigned: ${job.title}`,
              htmlBody: htmlBody,
              notificationSettings,
              event: 'onNewTask',
              involvedUser: newAssignee,
              creatorUser: user,
          });
      }
    }, [user, jobProgressById, users, toast, notificationSettings, getAssignableUsers]);

    const assignJobStep = useCallback((jobId: string, stepId: string, assigneeId: string) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;

        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        const updates: { [key: string]: any } = {};
        const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;

        updates[`${stepPath}/assigneeId`] = assigneeId;
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();

        update(ref(rtdb), updates);

        const assignee = users.find(u => u.id === assigneeId);
        if (assignee?.email) {
            const assignComment = `${user.name} assigned this step to ${assignee.name}.`;
            addJobStepComment(jobId, stepId, assignComment);
            const htmlBody = `
                <p>A job step in "${job.title}" has been assigned to you by <strong>${user.name}</strong>.</p>
                <hr>
                <h3>Step: ${job.steps[stepIndex].name}</h3>
                <p>${job.steps[stepIndex].description || ''}</p>
                ${job.steps[stepIndex].dueDate ? `<p><strong>Due Date:</strong> ${format(new Date(job.steps[stepIndex].dueDate!), 'PPP')}</p>` : ''}
                <p>Please review the job in the app and acknowledge the step.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Job</a>
            `;
            sendNotificationEmail({
                to: [assignee.email],
                subject: `Job Step Assigned: ${job.title}`,
                htmlBody: htmlBody,
                notificationSettings,
                event: 'onNewTask',
                involvedUser: assignee,
                creatorUser: user,
            });
        }
    }, [user, jobProgressById, users, addJobStepComment, notificationSettings]);

    const completeJobAsFinalStep = useCallback((jobId: string, stepId: string, comment: string) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;

        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
        const currentStep = job.steps[stepIndex];
        const isCurrentUserAssignee = user.id === currentStep.assigneeId;

        const canFinalizeRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        const isAuthorizedRole = canFinalizeRoles.includes(user.role);
        const isCreator = user.id === job.creatorId;

        if (!isAuthorizedRole && !isCreator && !isCurrentUserAssignee) {
             toast({ title: "Permission Denied", variant: "destructive" });
             return;
        }

        const updates: { [key: string]: any } = {};
        const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;

        updates[`${stepPath}/status`] = 'Completed';
        updates[`${stepPath}/completedAt`] = new Date().toISOString();
        updates[`${stepPath}/completedBy`] = user.id;
        updates[`jobProgress/${jobId}/status`] = 'Completed';
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();

        update(ref(rtdb), updates);

        addJobStepComment(jobId, stepId, comment);
        toast({ title: "Job Completed", description: "This JMS has been marked as complete." });

    }, [user, jobProgressById, addJobStepComment, toast]);
    
    const reopenJob = useCallback((jobId: string, reason: string, newStepName: string, newStepAssigneeId: string) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
    
        const canReopenRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        const canReopen = canReopenRoles.includes(user.role) || user.id === job.creatorId;
    
        if (!canReopen) {
            toast({ title: "Permission Denied", variant: "destructive" });
            return;
        }
    
        const newStep: JobStep = {
            id: `step-${job.steps.length}`,
            name: newStepName,
            assigneeId: newStepAssigneeId,
            status: 'Pending',
            description: `Job reopened by ${user.name}.`,
            dueDate: null,
        };
    
        const updates: { [key: string]: any } = {};
        updates[`jobProgress/${jobId}/status`] = 'In Progress';
        updates[`jobProgress/${jobId}/isReopened`] = true;
        updates[`jobProgress/${jobId}/steps/${job.steps.length}`] = newStep;
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();
    
        update(ref(rtdb), updates);
    
        const reopenComment = `Job reopened by ${user.name}. Reason: ${reason}`;
        addJobStepComment(jobId, newStep.id, reopenComment);
    
        toast({ title: "Job Reopened", description: "A new step has been added to the job." });
        
        // Notify new assignee
        const newAssignee = users.find(u => u.id === newStep.assigneeId);
        if (newAssignee?.email) {
            const htmlBody = `
                <p>The job "${job.title}" has been reopened and a new step has been assigned to you by <strong>${user.name}</strong>.</p>
                <hr>
                <h3>Step: ${newStep.name}</h3>
                <p><strong>Reason for Reopening:</strong> ${reason}</p>
                <p>Please review the job in the app.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Job</a>
            `;
            sendNotificationEmail({
                to: [newAssignee.email],
                subject: `Job Reopened & Step Assigned: ${job.title}`,
                htmlBody: htmlBody,
                notificationSettings,
                event: 'onNewTask',
                involvedUser: newAssignee,
                creatorUser: user,
            });
        }
    
    }, [user, jobProgressById, addJobStepComment, toast, users, notificationSettings]);

    useEffect(() => {
        const unsubscribers = [
            createDataListener('tasks', setTasksById),
            createDataListener('jobProgress', setJobProgressById)
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: TaskContextType = {
        tasks,
        jobProgress,
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
        acknowledgeReturnedTask,
        createJobProgress,
        updateJobStepStatus,
        addAndCompleteStep,
        addJobStepComment,
        reassignJobStep,
        assignJobStep,
        completeJobAsFinalStep,
        reopenJob
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
