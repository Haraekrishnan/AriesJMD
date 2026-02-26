
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { PlannerEvent, DailyPlannerComment, Comment, JobSchedule, JobScheduleItem, JobRecord, JobRecordPlant, VehicleUsageRecord, User, Role, JobStep, JobProgress, JobStepStatus, Timesheet, TimesheetStatus } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, update, get, remove } from 'firebase/database';
import { useAuth } from './auth-provider';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, isSameDay, getDay, isWeekend, parseISO, getDate, endOfWeek, startOfWeek, startOfDay, isBefore, subMonths, isSameMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useGeneral } from './general-provider';
import { JOB_PROGRESS_STEPS, REOPEN_JOB_STEPS } from '@/lib/types';


type PlannerContextType = {
  plannerEvents: PlannerEvent[];
  jobSchedules: JobSchedule[];
  dailyPlannerComments: DailyPlannerComment[];
  jobRecords: { [key: string]: JobRecord };
  jobRecordPlants: JobRecordPlant[];
  vehicleUsageRecords: { [key: string]: VehicleUsageRecord };
  timesheets: Timesheet[];
  jobProgress: JobProgress[];
  jmsAndTimesheetNotificationCount: number;
  addPlannerEvent: (eventData: Omit<PlannerEvent, 'id'>) => void;
  updatePlannerEvent: (event: PlannerEvent) => void;
  deletePlannerEvent: (eventId: string) => void;
  getExpandedPlannerEvents: (start: Date, end: Date, userId: string) => { eventDate: Date, event: PlannerEvent }[];
  addPlannerEventComment: (plannerUserId: string, day: string, eventId: string, text: string) => void;
  markSinglePlannerCommentAsRead: (plannerUserId: string, day: string, commentId: string) => void;
  dismissPendingUpdate: (eventId: string, day: string) => void;
  saveJobSchedule: (schedule: Omit<JobSchedule, 'id'> & { id?: string }) => void;
  savePlantOrder: (monthKey: string, plantName: string, orderedProfileIds: string[]) => void;
  saveJobRecord: (monthKey: string, profileId: string, day: number | null, value: any, field: 'status' | 'dailyOvertime' | 'dailyComments' | 'plant' | 'sundayDuty' | 'isHoliday') => void;
  lockJobRecordSheet: (monthKey: string) => void;
  unlockJobRecordSheet: (monthKey: string) => void;
  addJobRecordPlant: (name: string) => void;
  deleteJobRecordPlant: (id: string) => void;
  carryForwardPlantAssignments: (monthKey: string) => void;
  saveVehicleUsageRecord: (monthKey: string, vehicleId: string, data: Partial<VehicleUsageRecord['records'][string]>) => Promise<void>;
  lockVehicleUsageSheet: (monthKey: string, vehicleId: string) => void;
  unlockVehicleUsageSheet: (monthKey: string, vehicleId: string) => void;
  createJobProgress: (data: { title: string; steps: Omit<JobStep, 'id' | 'status'>[]; projectId?: string; plantUnit?: string; workOrderNo?: string; foNo?: string; amount?: number; dateFrom?: string | null; dateTo?: string | null; }) => void;
  updateJobProgress: (jobId: string, data: Partial<Omit<JobProgress, 'id' | 'steps' | 'creatorId' | 'createdAt'>>) => void;
  deleteJobProgress: (jobId: string) => void;
  updateJobStep: (jobId: string, stepId: string, newStepData: Partial<JobStep>) => void;
  updateJobStepStatus: (jobId: string, stepId: string, newStatus: JobStepStatus, comment?: string, completionDetails?: { attachmentUrl?: string; customFields?: Record<string, any> }) => void;
  addAndCompleteStep: (jobId: string, currentStepId: string, completionComment: string | undefined, completionAttachment: { name: string; url: string; } | undefined, completionCustomFields: Record<string, any> | undefined, nextStepData: Omit<JobStep, 'id'|'status'>) => void;
  addJobStepComment: (jobId: string, stepId: string, commentText: string) => void;
  reassignJobStep: (jobId: string, stepId: string, newAssigneeId: string, comment: string) => void;
  assignJobStep: (jobId: string, stepId: string, assigneeId: string) => void;
  completeJobAsFinalStep: (jobId: string, stepId: string, comment: string) => void;
  returnJobStep: (jobId: string, stepId: string, reason: string) => void;
  reopenJob: (jobId: string, reason: string, newStepName: string, newStepAssigneeId: string) => void;
  addTimesheet: (data: Omit<Timesheet, 'id' | 'submitterId' | 'submissionDate' | 'status'>) => void;
  updateTimesheet: (timesheet: Timesheet) => void;
  addTimesheetComment: (timesheetId: string, text: string) => void;
  updateTimesheetStatus: (timesheetId: string, status: TimesheetStatus, comment?: string) => void;
  deleteTimesheet: (timesheetId: string) => void;
};

const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listener = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        const processedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { ...data[key], id: key };
            return acc;
        }, {} as Record<string, T>);
        setData(processedData);
    });
    return () => listener();
};

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: ReactNode }) {
    const { user, users, getAssignableUsers, can } = useAuth();
    const { notificationSettings, projects } = useGeneral();
    const { toast } = useToast();
    const [plannerEventsById, setPlannerEventsById] = useState<Record<string, PlannerEvent>>({});
    const [dailyPlannerCommentsById, setDailyPlannerCommentsById] = useState<Record<string, DailyPlannerComment>>({});
    const [jobSchedulesById, setJobSchedulesById] = useState<Record<string, JobSchedule>>({});
    const [jobRecords, setJobRecords] = useState<{[key: string]: JobRecord}>({});
    const [jobRecordPlantsById, setJobRecordPlantsById] = useState<Record<string, JobRecordPlant>>({});
    const [vehicleUsageRecords, setVehicleUsageRecords] = useState<{ [key: string]: VehicleUsageRecord }>({});
    const [timesheetsById, setTimesheetsById] = useState<Record<string, Timesheet>>({});
    const [jobProgressById, setJobProgressById] = useState<Record<string, JobProgress>>({});

    const plannerEvents = useMemo(() => Object.values(plannerEventsById), [plannerEventsById]);
    const dailyPlannerComments = useMemo(() => Object.values(dailyPlannerCommentsById), [dailyPlannerCommentsById]);
    const jobSchedules = useMemo(() => Object.values(jobSchedulesById), [jobSchedulesById]);
    const jobRecordPlants = useMemo(() => Object.values(jobRecordPlantsById), [jobRecordPlantsById]);
    const timesheets = useMemo(() => Object.values(timesheetsById), [timesheetsById]);
    const jobProgress = useMemo(() => Object.values(jobProgressById), [jobProgressById]);

    const jmsAndTimesheetNotificationCount = useMemo(() => {
      if (!user) return 0;
      let count = 0;

      const canAcknowledgeOffice = ['Admin', 'Document Controller', 'Project Coordinator'].includes(user.role);
      timesheets.forEach(ts => {
          if ((ts.status === 'Pending' && ts.submittedToId === user.id) || 
              (ts.status === 'Sent To Office' && canAcknowledgeOffice) ||
              (ts.status === 'Rejected' && ts.submitterId === user.id)) {
              count++;
          }
      });

      // JMS steps awaiting my action
      jobProgress.forEach(job => {
          const currentStep = job.steps.find(s => s.status === 'Pending' || s.isReturned);
          if (currentStep && currentStep.assigneeId === user.id) {
              count++;
          }
      });

      return count;
    }, [user, timesheets, jobProgress]);
    
    const addPlannerEventComment = useCallback((plannerUserId: string, day: string, eventId: string, text: string) => {
        if (!user) return;
        const dayCommentId = `${day}_${plannerUserId}`;
        const newCommentRef = push(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments`));
        const newComment: Comment = {
          id: newCommentRef.key!,
          userId: user.id,
          text,
          date: new Date().toISOString(),
          eventId,
          viewedBy: { [user.id]: true }
        };
        set(newCommentRef, newComment);

        const updates: { [key: string]: any } = {};
        updates[`dailyPlannerComments/${dayCommentId}/id`] = dayCommentId;
        updates[`dailyPlannerComments/${dayCommentId}/plannerUserId`] = plannerUserId;
        updates[`dailyPlannerComments/${dayCommentId}/day`] = day;
        updates[`dailyPlannerComments/${dayCommentId}/lastUpdated`] = new Date().toISOString();
        
        // Mark as unread for other participants
        const event = plannerEvents.find(e => e.id === eventId);
        if (event) {
            const participants = new Set([event.creatorId, event.userId]);
            participants.forEach(pId => {
                if (pId !== user.id) {
                    updates[`plannerEvents/${eventId}/viewedBy/${pId}`] = false;
                    updates[`dailyPlannerComments/${dayCommentId}/comments/${newComment.id}/viewedBy/${pId}`] = false;
                }
            });
        }
    
        update(ref(rtdb), updates);

    }, [user, plannerEvents]);
    
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
            eventId: jobId,
        };
        set(newCommentRef, newComment);
    }, [user, jobProgressById]);

    const addPlannerEvent = useCallback((eventData: Omit<PlannerEvent, 'id'>) => {
        const newRef = push(ref(rtdb, 'plannerEvents'));
        const eventWithId = { ...eventData, id: newRef.key! };
        set(newRef, eventWithId);
        
        // Mark as read for creator
        update(ref(rtdb, `plannerEvents/${newRef.key}/viewedBy`), { [eventData.creatorId]: true });

        // Add a comment if it's a delegation
        if (eventData.creatorId !== eventData.userId) {
            const dayStr = format(new Date(eventData.date), 'yyyy-MM-dd');
            const commentText = `Event "${eventData.title}" delegated by ${users.find(u => u.id === eventData.creatorId)?.name || 'Unknown'}`;
            addPlannerEventComment(eventData.userId, dayStr, newRef.key!, commentText);
        }
    }, [users, addPlannerEventComment]);

    const updatePlannerEvent = useCallback((event: PlannerEvent) => {
        const { id, ...data } = event;
        update(ref(rtdb, `plannerEvents/${id}`), data);
    }, []);
    
    const deletePlannerEvent = useCallback((eventId: string) => {
        remove(ref(rtdb, `plannerEvents/${eventId}`));
    }, []);

    const getExpandedPlannerEvents = useCallback((startDate: Date, endDate: Date, userId: string): { eventDate: Date, event: PlannerEvent }[] => {
        const userEvents = plannerEvents.filter(e => e.userId === userId);
        const expanded: { eventDate: Date; event: PlannerEvent }[] = [];
        
        const interval = { start: startOfDay(startDate), end: startOfDay(endDate) };

        eachDayOfInterval(interval).forEach(day => {
            userEvents.forEach(event => {
                const eventStartDate = startOfDay(parseISO(event.date));
                
                if (isBefore(day, eventStartDate)) return;

                let match = false;
                switch(event.frequency) {
                    case 'once':
                        match = isSameDay(day, eventStartDate);
                        break;
                    case 'daily':
                        match = true;
                        break;
                    case 'daily-except-sundays':
                        match = getDay(day) !== 0; // 0 is Sunday
                        break;
                    case 'weekly':
                        match = getDay(day) === getDay(eventStartDate);
                        break;
                    case 'weekends':
                        match = isWeekend(day);
                        break;
                    case 'monthly':
                        match = getDate(day) === getDate(eventStartDate);
                        break;
                }
                
                if(match) {
                    expanded.push({ eventDate: day, event });
                }
            });
        });
        return expanded;
    }, [plannerEvents]);

    const markSinglePlannerCommentAsRead = useCallback((plannerUserId: string, day: string, commentId: string) => {
        if (!user) return;
        const path = `dailyPlannerComments/${day}_${plannerUserId}/comments/${commentId}/viewedBy/${user.id}`;
        set(ref(rtdb, path), true);
    }, [user]);
    
    const dismissPendingUpdate = useCallback((eventId: string, day: string) => {
      if(!user) return;
      const path = `users/${user.id}/dismissedPendingUpdates/${eventId}_${day}`;
      set(ref(rtdb, path), true);
    }, [user]);

    const saveJobSchedule = useCallback((schedule: Omit<JobSchedule, 'id'> & { id?: string }) => {
        const id = schedule.id || `schedule_${schedule.date}`;
        update(ref(rtdb, `jobSchedules/${id}`), { ...schedule, id });
    }, []);

    const savePlantOrder = useCallback((monthKey: string, plantName: string, orderedProfileIds: string[]) => {
        const path = `jobRecords/${monthKey}/plantsOrder/${plantName}`;
        set(ref(rtdb, path), orderedProfileIds);
    }, []);

    const saveJobRecord = useCallback((monthKey: string, profileId: string, day: number | null, value: any, field: 'status' | 'dailyOvertime' | 'dailyComments' | 'plant' | 'sundayDuty' | 'isHoliday') => {
        let path: string;
        if (day !== null && ['status', 'dailyOvertime', 'dailyComments', 'isHoliday'].includes(field)) {
            if (field === 'status') {
                path = `jobRecords/${monthKey}/records/${profileId}/days/${day}`;
            } else if (field === 'isHoliday') {
                 path = `jobRecords/${monthKey}/records/${profileId}/days/${day}/isHoliday`;
            } else {
                 path = `jobRecords/${monthKey}/records/${profileId}/${field}/${day}`;
            }
        } else if (field === 'plant') {
            path = `jobRecords/${monthKey}/records/${profileId}/plant`;
        } else if (field === 'sundayDuty') {
            path = `jobRecords/${monthKey}/records/${profileId}/additionalSundayDuty`;
        } else {
            return;
        }
        set(ref(rtdb, path), value);
    }, []);
    

    const lockJobRecordSheet = useCallback((monthKey: string) => {
        update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: true });
    }, []);

    const unlockJobRecordSheet = useCallback((monthKey: string) => {
        update(ref(rtdb, `jobRecords/${monthKey}`), { isLocked: false });
    }, []);
    
    const addJobRecordPlant = useCallback((name: string) => {
        const newRef = push(ref(rtdb, 'jobRecordPlants'));
        set(newRef, { id: newRef.key, name });
    }, []);

    const deleteJobRecordPlant = useCallback((id: string) => {
        remove(ref(rtdb, `jobRecordPlants/${id}`));
    }, []);
    
    const carryForwardPlantAssignments = useCallback(async (monthKey: string) => {
        const prevMonthDate = subMonths(new Date(monthKey), 1);
        const prevMonthKey = format(prevMonthDate, 'yyyy-MM');
    
        const prevMonthSnapshot = await get(ref(rtdb, `jobRecords/${prevMonthKey}`));
        if (!prevMonthSnapshot.exists()) return;
    
        const prevMonthData = prevMonthSnapshot.val();
        const updates: { [key: string]: any } = {};
    
        // Carry forward plant assignments
        if (prevMonthData.records) {
            for (const profileId in prevMonthData.records) {
                const plant = prevMonthData.records[profileId]?.plant;
                if (plant) {
                    updates[`jobRecords/${monthKey}/records/${profileId}/plant`] = plant;
                }
            }
        }
    
        // ✅ Carry forward plant order SAFELY
        if (prevMonthData.plantsOrder) {
            for (const plantName in prevMonthData.plantsOrder) {
                updates[`jobRecords/${monthKey}/plantsOrder/${plantName}`] =
                    prevMonthData.plantsOrder[plantName];
            }
        }
    
        if (Object.keys(updates).length > 0) {
            await update(ref(rtdb), updates);
        }
    }, []);
    
    const saveVehicleUsageRecord = useCallback(async (monthKey: string, vehicleId: string, data: Partial<VehicleUsageRecord['records'][string]>) => {
        if (!user) return;
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}`;
        const updates = { 
            ...data,
            lastUpdated: new Date().toISOString(),
            lastUpdatedById: user.id,
        };
        return update(ref(rtdb, path), updates);
    }, [user]);
    
    const lockVehicleUsageSheet = useCallback((monthKey: string, vehicleId: string) => {
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}/isLocked`;
        set(ref(rtdb, path), true);
    }, []);

    const unlockVehicleUsageSheet = useCallback((monthKey: string, vehicleId: string) => {
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}/isLocked`;
        set(ref(rtdb, path), false);
    }, []);

    const addTimesheet = useCallback((data: Omit<Timesheet, 'id' | 'submitterId' | 'submissionDate' | 'status'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'timesheets'));
        const newTimesheet: Omit<Timesheet, 'id'> = {
            ...data,
            submitterId: user.id,
            submissionDate: new Date().toISOString(),
            status: 'Pending',
        };
        set(newRef, newTimesheet);

        const recipient = users.find(u => u.id === data.submittedToId);
        if (recipient?.email) {
            const startDate = data.startDate ? format(parseISO(data.startDate), 'dd MMM, yyyy') : 'N/A';
            const endDate = data.endDate ? format(parseISO(data.endDate), 'dd MMM, yyyy') : 'N/A';
            const htmlBody = `
                <p>A new timesheet from <strong>${user.name}</strong> requires your acknowledgement.</p>
                <p><strong>Period:</strong> ${startDate} - ${endDate}</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Timesheet</a></p>
            `;
            sendNotificationEmail({
                to: [recipient.email],
                subject: `New Timesheet from ${user.name}`,
                htmlBody,
                notificationSettings,
                event: 'onTaskForApproval',
                involvedUser: recipient,
                creatorUser: user,
            });
        }
    }, [user, users, notificationSettings]);
    
    const addTimesheetComment = useCallback((timesheetId: string, text: string) => {
        if (!user) return;
        const newCommentRef = push(ref(rtdb, `timesheets/${timesheetId}/comments`));
        const newComment: Omit<Comment, 'id'> = {
            id: newCommentRef.key!,
            userId: user.id,
            text,
            date: new Date().toISOString(),
            eventId: timesheetId,
        };
        set(newCommentRef, newComment);
    }, [user]);

    const updateTimesheet = useCallback((timesheet: Timesheet) => {
        const { id, ...data } = timesheet;

        const updates: Partial<Timesheet> & { lastUpdated?: string } = {
            ...data,
            lastUpdated: new Date().toISOString() 
        };
        
        const previousStatus = timesheetsById[id]?.status;

        // If status is changing back to Pending from Rejected, clear workflow fields but keep rejection history
        if (updates.status === 'Pending' && previousStatus === 'Rejected') {
            updates.acknowledgedById = undefined;
            updates.acknowledgedDate = undefined;
            updates.sentToOfficeById = undefined;
            updates.sentToOfficeDate = undefined;
            updates.officeAcknowledgedById = undefined;
            updates.officeAcknowledgedDate = undefined;
            // Note: rejectedById, rejectedDate, and rejectionReason are NOT cleared
        }

        // To remove fields in firebase, they must be set to null
        const finalUpdates: { [key: string]: any } = {};
        for (const key in updates) {
            finalUpdates[key] = (updates as any)[key] === undefined ? null : (updates as any)[key];
        }
        delete finalUpdates.comments;

        update(ref(rtdb, `timesheets/${id}`), finalUpdates);
    }, [timesheetsById]);

    const updateTimesheetStatus = useCallback((timesheetId: string, status: TimesheetStatus, comment?: string) => {
        if (!user) return;
        const timesheet = timesheetsById[timesheetId];
        if (!timesheet) return;

        const updates: { [key: string]: any } = {};
        const basePath = `timesheets/${timesheetId}`;
        updates[`${basePath}/status`] = status;
        updates[`${basePath}/lastUpdated`] = new Date().toISOString();


        if (comment) {
            let commentText = comment;
            if (status === 'Rejected') {
                updates[`${basePath}/rejectedById`] = user.id;
                updates[`${basePath}/rejectedDate`] = new Date().toISOString();
                updates[`${basePath}/rejectionReason`] = comment;
                commentText = `Timesheet Rejected. Reason: ${comment}`;
            }
            addTimesheetComment(timesheetId, commentText);
        }
    
        if (status === 'Acknowledged') {
            updates[`${basePath}/acknowledgedById`] = user.id;
            updates[`${basePath}/acknowledgedDate`] = new Date().toISOString();
            updates[`${basePath}/rejectedById`] = null;
            updates[`${basePath}/rejectedDate`] = null;
            updates[`${basePath}/rejectionReason`] = null;
        } else if (status === 'Sent To Office') {
            updates[`${basePath}/sentToOfficeById`] = user.id;
            updates[`${basePath}/sentToOfficeDate`] = new Date().toISOString();
        } else if (status === 'Office Acknowledged') {
            updates[`${basePath}/officeAcknowledgedById`] = user.id;
            updates[`${basePath}/officeAcknowledgedDate`] = new Date().toISOString();
        } else if (status === 'Rejected') {
            updates[`${basePath}/acknowledgedById`] = null;
            updates[`${basePath}/acknowledgedDate`] = null;
            updates[`${basePath}/sentToOfficeById`] = null;
            updates[`${basePath}/sentToOfficeDate`] = null;
            updates[`${basePath}/officeAcknowledgedById`] = null;
            updates[`${basePath}/officeAcknowledgedDate`] = null;
        }
        
        update(ref(rtdb), updates);

        const submitter = users.find(u => u.id === timesheet.submitterId);
        if (submitter?.email && submitter.id !== user.id) {
            const htmlBody = `
                <p>The status of your timesheet for <strong>${projects.find(p => p.id === timesheet.projectId)?.name || ''} - ${timesheet.plantUnit}</strong> has been updated to <strong>${status}</strong> by ${user.name}.</p>
                ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Timesheet</a></p>
            `;
            sendNotificationEmail({
                to: [submitter.email],
                subject: `Timesheet Status Updated: ${status}`,
                htmlBody,
                notificationSettings,
                event: 'onTaskStatusSubmitted', 
                involvedUser: submitter,
                creatorUser: user,
            });
        }
        if (status === 'Sent To Office') {
            const officeUsers = users.filter(u => ['Admin', 'Document Controller', 'Project Coordinator'].includes(u.role));
            const submitterName = users.find(u => u.id === timesheet.submitterId)?.name || 'a user';
            const projectName = projects.find(p => p.id === timesheet.projectId)?.name || 'a project';
            officeUsers.forEach(officeUser => {
                 if (officeUser.email) {
                     const htmlBody = `
                        <p>A timesheet from <strong>${submitterName}</strong> for project <strong>${projectName} - ${timesheet.plantUnit}</strong> has been sent to the office for acknowledgement.</p>
                        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Timesheet</a></p>
                    `;
                    sendNotificationEmail({
                        to: [officeUser.email],
                        subject: `Timesheet Sent to Office: ${timesheet.plantUnit}`,
                        htmlBody,
                        notificationSettings,
                        event: 'onTaskForApproval',
                        involvedUser: officeUser,
                        creatorUser: user
                    });
                 }
            });
        }
    }, [user, timesheetsById, users, projects, notificationSettings, addTimesheetComment]);

    const deleteTimesheet = useCallback((timesheetId: string) => {
        remove(ref(rtdb, `timesheets/${timesheetId}`));
    }, []);

    const createJobProgress = useCallback((data: { title: string; steps: Omit<JobStep, 'id' | 'status'>[]; projectId?: string; plantUnit?: string; workOrderNo?: string; foNo?: string; amount?: number; dateFrom?: string | null; dateTo?: string | null; }) => {
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
          plantUnit: data.plantUnit,
          workOrderNo: data.workOrderNo,
          foNo: data.foNo,
          amount: data.amount,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
        };
    
        set(newRef, newJob);
    }, [user]);

    const updateJobProgress = useCallback((jobId: string, data: Partial<Omit<JobProgress, 'id' | 'steps' | 'creatorId' | 'createdAt'>>) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
    
        const canEditRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        const canEdit = canEditRoles.includes(user.role) || user.id === job.creatorId;
        if (!canEdit) {
          toast({ title: 'Permission Denied', variant: 'destructive' });
          return;
        }
    
        const updates: { [key: string]: any } = {};
        const jobPath = `jobProgress/${jobId}`;
    
        Object.entries(data).forEach(([key, value]) => {
          updates[`${jobPath}/${key}`] = value === undefined ? null : value;
        });
    
        updates[`${jobPath}/lastUpdated`] = new Date().toISOString();
    
        update(ref(rtdb), updates);
    
        const commentText = `${user.name} updated the main job details.`;
        addJobStepComment(jobId, job.steps[0].id, commentText);
      }, [user, jobProgressById, addJobStepComment, toast]);

    const deleteJobProgress = useCallback((jobId: string) => {
        if (user?.role !== 'Admin') {
            toast({ title: 'Permission Denied', variant: 'destructive' });
            return;
        }
        remove(ref(rtdb, `jobProgress/${jobId}`));
        toast({ title: 'JMS Deleted', variant: 'destructive' });
    }, [user, toast]);
    
    const updateJobStep = useCallback((jobId: string, stepId: string, newStepData: Partial<JobStep>) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
    
        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;
    
        const updates: { [key: string]: any } = {};
        const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;
    
        const changes: string[] = [];
        Object.entries(newStepData).forEach(([key, value]) => {
            if (job.steps[stepIndex][key as keyof JobStep] !== value) {
                changes.push(`${key} changed`);
            }
            updates[`${stepPath}/${key}`] = value;
        });
    
        if (changes.length === 0) return;
    
        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();
    
        update(ref(rtdb), updates);
    
        const commentText = `Step "${job.steps[stepIndex].name}" was modified by ${user.name}.`;
        addJobStepComment(jobId, stepId, commentText);
    
    }, [user, jobProgressById, addJobStepComment]);

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
            updates[`${stepPath}/isReturned`] = null; // Clear the flag
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
    
    const addAndCompleteStep = useCallback((jobId: string, currentStepId: string, completionComment: string | undefined, completionAttachment: { name: string; url: string; } | undefined, completionCustomFields: Record<string, any> | undefined, nextStepData: Omit<JobStep, 'id'|'status'>) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;
    
        const stepIndex = job.steps.findIndex(s => s.id === currentStepId);
        if (stepIndex === -1) return;

        const currentStep = job.steps[stepIndex];
        const isProjectMember = user.projectIds?.includes(job.projectId || '');
        const canActOnUnassigned = !currentStep.assigneeId && isProjectMember;

        if (currentStep.assigneeId !== user.id && !canActOnUnassigned && user.role !== 'Admin' && !can.manage_job_progress) {
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
        
        if (completionCustomFields?.jmsNo) {
            updates[`jobProgress/${jobId}/jmsNo`] = completionCustomFields.jmsNo;
        }
    
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
    }, [user, jobProgressById, users, addJobStepComment, notificationSettings, toast, can.manage_job_progress]);

    const reassignJobStep = useCallback((jobId: string, stepId: string, newAssigneeId: string, comment: string) => {
      if (!user) return;
      const job = jobProgressById[jobId];
      if (!job) return;
  
      const stepIndex = job.steps.findIndex(s => s.id === stepId);
      if (stepIndex === -1) return;
  
      const currentStep = job.steps[stepIndex];
      const assignableUsers = getAssignableUsers();

      const canReassignRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
      if (!canReassignRoles.includes(user.role)) {
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
      updates[`${stepPath}/isReturned`] = null;
  
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
    }, [user, jobProgressById, users, toast, notificationSettings, getAssignableUsers, addJobStepComment]);

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
        const isProjectMember = user.projectIds?.includes(job.projectId || '');
        const canActOnUnassigned = !currentStep.assigneeId && isProjectMember;
        const isCurrentUserAssignee = user.id === currentStep.assigneeId;

        const canFinalizeRoles: Role[] = ['Admin', 'Project Coordinator', 'Document Controller'];
        const isAuthorizedRole = canFinalizeRoles.includes(user.role);
        const isCreator = user.id === job.creatorId;

        if (!isAuthorizedRole && !isCreator && !isCurrentUserAssignee && !canActOnUnassigned) {
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

    const returnJobStep = useCallback((jobId: string, stepId: string, reason: string) => {
        if (!user) return;
        const job = jobProgressById[jobId];
        if (!job) return;

        const stepIndex = job.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        const currentStep = job.steps[stepIndex];
        const updates: { [key: string]: any } = {};
        const stepPath = `jobProgress/${jobId}/steps/${stepIndex}`;

        updates[`${stepPath}/assigneeId`] = null;
        updates[`${stepPath}/status`] = 'Pending';
        updates[`${stepPath}/acknowledgedAt`] = null;
        updates[`${stepPath}/isReturned`] = true;

        updates[`jobProgress/${jobId}/lastUpdated`] = new Date().toISOString();

        update(ref(rtdb), updates);

        const returnComment = `Step "${currentStep.name}" was returned by ${user.name}. Reason: ${reason}`;
        addJobStepComment(jobId, stepId, returnComment);
        
        toast({ title: "Step Returned", description: "The step has been unassigned and is now pending." });

        // Create a set of people to notify
        const recipients = new Set<User>();
        const creator = users.find(u => u.id === job.creatorId);
        if (creator && creator.id !== user.id) recipients.add(creator);
        
        if (stepIndex > 0) {
            const prevStepAssigneeId = job.steps[stepIndex - 1].assigneeId;
            const prevStepAssignee = users.find(u => u.id === prevStepAssigneeId);
            if (prevStepAssignee && prevStepAssignee.id !== user.id) {
                recipients.add(prevStepAssignee);
            }
        }
        
        // Notify recipients
        recipients.forEach(recipient => {
            if (recipient.email) {
                const htmlBody = `
                    <p>A step in the job "${job.title}" was returned by <strong>${user.name}</strong>.</p>
                    <hr>
                    <h3>Step: ${currentStep.name}</h3>
                    <p><strong>Reason for return:</strong> ${reason}</p>
                    <p>Please review the job in the app.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/job-progress">View Job</a>
                `;
                sendNotificationEmail({
                    to: [recipient.email],
                    subject: `Step Returned for Job: ${job.title}`,
                    htmlBody: htmlBody,
                    notificationSettings,
                    event: 'onTaskReturned', 
                    involvedUser: recipient,
                    creatorUser: user,
                });
            }
        });

    }, [user, jobProgressById, addJobStepComment, toast, users, notificationSettings]);
    
    useEffect(() => {
        const unsubscribers = [
            createDataListener('plannerEvents', setPlannerEventsById),
            onValue(ref(rtdb, 'dailyPlannerComments'), (snapshot) => {
                const data = snapshot.val() || {};
                setDailyPlannerCommentsById(data);
            }),
            createDataListener('jobSchedules', setJobSchedulesById),
            createDataListener('jobRecordPlants', setJobRecordPlantsById),
            onValue(ref(rtdb, 'jobRecords'), (snapshot) => {
                const data = snapshot.val() || {};
                const monthRecords = Object.fromEntries(
                    Object.entries(data).filter(([key]) => /^\d{4}-\d{2}$/.test(key))
                );
                setJobRecords(monthRecords);
            }),
             onValue(ref(rtdb, 'vehicleUsageRecords'), (snapshot) => {
                const data = snapshot.val() || {};
                setVehicleUsageRecords(data);
            }),
            createDataListener('timesheets', setTimesheetsById),
            createDataListener('jobProgress', setJobProgressById)
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: PlannerContextType = {
        plannerEvents, dailyPlannerComments, jobSchedules, jobRecords, jobRecordPlants, vehicleUsageRecords, timesheets, jobProgress,
        jmsAndTimesheetNotificationCount,
        addPlannerEvent, updatePlannerEvent, deletePlannerEvent,
        getExpandedPlannerEvents, addPlannerEventComment,
        markSinglePlannerCommentAsRead, dismissPendingUpdate,
        saveJobSchedule, savePlantOrder, saveJobRecord,
        lockJobRecordSheet, unlockJobRecordSheet, addJobRecordPlant,
        deleteJobRecordPlant, carryForwardPlantAssignments,
        saveVehicleUsageRecord, lockVehicleUsageSheet, unlockVehicleUsageSheet,
        createJobProgress, updateJobProgress, deleteJobProgress, updateJobStep, updateJobStepStatus,
        addAndCompleteStep, reassignJobStep, assignJobStep,
        completeJobAsFinalStep, returnJobStep, reopenJob,
        addTimesheet,
        updateTimesheet,
        updateTimesheetStatus,
        deleteTimesheet,
        addTimesheetComment,
    };

    return <PlannerContext.Provider value={contextValue}>{children}</PlannerContext.Provider>;
}

export const usePlanner = (): PlannerContextType => {
  const context = useContext(PlannerContext);
  if (context === undefined) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};
