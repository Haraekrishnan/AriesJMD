'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { PlannerEvent, DailyPlannerComment, Comment, JobSchedule, JobScheduleItem, JobRecord, JobRecordPlant, VehicleUsageRecord, User } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, update, get, remove } from 'firebase/database';
import { useAuth } from './auth-provider';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, isSameDay, getDay, isWeekend, parseISO, getDate, endOfWeek, startOfWeek, startOfDay, isBefore, subMonths, isSameMonth } from 'date-fns';

type PlannerContextType = {
  plannerEvents: PlannerEvent[];
  jobSchedules: JobSchedule[];
  dailyPlannerComments: DailyPlannerComment[];
  jobRecords: { [key: string]: JobRecord };
  jobRecordPlants: JobRecordPlant[];
  vehicleUsageRecords: { [key: string]: VehicleUsageRecord };
  addPlannerEvent: (eventData: Omit<PlannerEvent, 'id'>) => void;
  updatePlannerEvent: (event: PlannerEvent) => void;
  deletePlannerEvent: (eventId: string) => void;
  getExpandedPlannerEvents: (start: Date, end: Date, userId: string) => { eventDate: Date, event: PlannerEvent }[];
  addPlannerEventComment: (plannerUserId: string, day: string, eventId: string, text: string) => void;
  markSinglePlannerCommentAsRead: (plannerUserId: string, day: string, commentId: string) => void;
  markPlannerEventAsViewed: (eventId: string) => void;
  dismissPendingUpdate: (eventId: string, day: string) => void;
  saveJobSchedule: (schedule: Omit<JobSchedule, 'id'> & { id?: string }) => void;
  savePlantOrder: (monthKey: string, plantName: string, orderedProfileIds: string[]) => void;
  saveJobRecord: (monthKey: string, profileId: string, day: number | null, value: any, field: 'status' | 'dailyOvertime' | 'dailyComments' | 'plant' | 'sundayDuty' | 'isHoliday') => void;
  lockJobRecordSheet: (monthKey: string) => void;
  unlockJobRecordSheet: (monthKey: string) => void;
  addJobRecordPlant: (name: string) => void;
  deleteJobRecordPlant: (id: string) => void;
  carryForwardPlantAssignments: (monthKey: string) => void;
  saveVehicleUsageRecord: (monthKey: string, vehicleId: string, data: Partial<VehicleUsageRecord['records'][string]>) => void;
  lockVehicleUsageSheet: (monthKey: string, vehicleId: string) => void;
  unlockVehicleUsageSheet: (monthKey: string, vehicleId: string) => void;
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

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

export function PlannerProvider({ children }: { children: ReactNode }) {
    const { user, users } = useAuth();
    const [plannerEventsById, setPlannerEventsById] = useState<Record<string, PlannerEvent>>({});
    const [dailyPlannerCommentsById, setDailyPlannerCommentsById] = useState<Record<string, DailyPlannerComment>>({});
    const [jobSchedulesById, setJobSchedulesById] = useState<Record<string, JobSchedule>>({});
    const [jobRecords, setJobRecords] = useState<{[key: string]: JobRecord}>({});
    const [jobRecordPlantsById, setJobRecordPlantsById] = useState<Record<string, JobRecordPlant>>({});
    const [vehicleUsageRecords, setVehicleUsageRecords] = useState<{ [key: string]: VehicleUsageRecord }>({});

    const plannerEvents = useMemo(() => Object.values(plannerEventsById), [plannerEventsById]);
    const dailyPlannerComments = useMemo(() => Object.values(dailyPlannerCommentsById), [dailyPlannerCommentsById]);
    const jobSchedules = useMemo(() => Object.values(jobSchedulesById), [jobSchedulesById]);
    const jobRecordPlants = useMemo(() => Object.values(jobRecordPlantsById), [jobRecordPlantsById]);

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
    }, [users]);

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

    const markSinglePlannerCommentAsRead = useCallback((plannerUserId: string, day: string, commentId: string) => {
        if (!user) return;
        const path = `dailyPlannerComments/${day}_${plannerUserId}/comments/${commentId}/viewedBy/${user.id}`;
        set(ref(rtdb, path), true);
    }, [user]);

    const markPlannerEventAsViewed = useCallback((eventId: string) => {
        if (!user) return;
        update(ref(rtdb, `plannerEvents/${eventId}/viewedBy`), { [user.id]: true });
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
    
    const saveVehicleUsageRecord = useCallback((monthKey: string, vehicleId: string, data: Partial<VehicleUsageRecord['records'][string]>) => {
        if (!user) return;
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}`;
        const updates = { 
            ...data,
            lastUpdated: new Date().toISOString(),
            lastUpdatedById: user.id,
        };
        update(ref(rtdb, path), updates);
    }, [user]);
    
    const lockVehicleUsageSheet = useCallback((monthKey: string, vehicleId: string) => {
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}/isLocked`;
        set(ref(rtdb, path), true);
    }, []);

    const unlockVehicleUsageSheet = useCallback((monthKey: string, vehicleId: string) => {
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}/isLocked`;
        set(ref(rtdb, path), false);
    }, []);

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
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: PlannerContextType = {
        plannerEvents, dailyPlannerComments, jobSchedules, jobRecords, jobRecordPlants, vehicleUsageRecords,
        addPlannerEvent, updatePlannerEvent, deletePlannerEvent,
        getExpandedPlannerEvents, addPlannerEventComment,
        markSinglePlannerCommentAsRead, dismissPendingUpdate, markPlannerEventAsViewed,
        saveJobSchedule, savePlantOrder, saveJobRecord,
        lockJobRecordSheet, unlockJobRecordSheet, addJobRecordPlant,
        deleteJobRecordPlant, carryForwardPlantAssignments,
        saveVehicleUsageRecord, lockVehicleUsageSheet, unlockVehicleUsageSheet,
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
