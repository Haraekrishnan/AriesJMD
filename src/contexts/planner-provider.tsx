
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { PlannerEvent, DailyPlannerComment, Comment, JobSchedule, JobScheduleItem, JobRecord, JobRecordPlant, VehicleUsageRecord } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, update, get, remove } from 'firebase/database';
import { useAuth } from './auth-provider';
import { eachDayOfInterval, endOfMonth, startOfMonth, format, isSameDay, getDay, isWeekend, parseISO, getDate, endOfWeek, startOfWeek, startOfDay, isBefore, subMonths } from 'date-fns';

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
  getExpandedPlannerEvents: (month: Date, userId: string) => { eventDate: Date, event: PlannerEvent }[];
  addPlannerEventComment: (plannerUserId: string, day: string, eventId: string, text: string) => void;
  markSinglePlannerCommentAsRead: (plannerUserId: string, day: string, commentId: string) => void;
  dismissPendingUpdate: (eventId: string, day: string) => void;
  saveJobSchedule: (schedule: Omit<JobSchedule, 'id'> & { id?: string }) => void;
  savePlantOrder: (monthKey: string, plantName: string, orderedProfileIds: string[]) => void;
  saveJobRecord: (monthKey: string, profileId: string, day: number | null, value: any, field: 'status' | 'dailyOvertime' | 'dailyComments' | 'plant' | 'sundayDuty') => void;
  lockJobRecordSheet: (monthKey: string) => void;
  unlockJobRecordSheet: (monthKey: string) => void;
  addJobRecordPlant: (name: string) => void;
  deleteJobRecordPlant: (id: string) => void;
  carryForwardPlantAssignments: (monthKey: string) => void;
  saveVehicleUsageRecord: (monthKey: string, vehicleId: string, data: Partial<VehicleUsageRecord['records'][string]>) => void;
  lockVehicleUsageSheet: (monthKey: string) => void;
  unlockVehicleUsageSheet: (monthKey: string) => void;
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
        set(newRef, eventData);
        // Add viewedBy for creator automatically
        update(ref(rtdb, `plannerEvents/${newRef.key}/viewedBy`), { [eventData.creatorId]: true });
    }, []);

    const updatePlannerEvent = useCallback((event: PlannerEvent) => {
        const { id, ...data } = event;
        update(ref(rtdb, `plannerEvents/${id}`), data);
    }, []);
    
    const deletePlannerEvent = useCallback((eventId: string) => {
        remove(ref(rtdb, `plannerEvents/${eventId}`));
    }, []);

    const getExpandedPlannerEvents = useCallback((month: Date, userId: string) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
      const userEvents = plannerEvents.filter(e => e.userId === userId);
      const expanded: { eventDate: Date; event: PlannerEvent }[] = [];
    
      eachDayOfInterval({ start: calendarStart, end: calendarEnd }).forEach(day => {
        userEvents.forEach(event => {
          const eventDate = new Date(event.date);
          if (event.frequency === 'once' && isSameDay(day, eventDate)) {
            expanded.push({ eventDate: day, event });
          } else if (event.frequency === 'daily' && day >= eventDate) {
            expanded.push({ eventDate: day, event });
          } else if (event.frequency === 'daily-except-sundays' && day >= eventDate && getDay(day) !== 0) {
            expanded.push({ eventDate: day, event });
          } else if (event.frequency === 'weekly' && day >= eventDate && getDay(day) === getDay(eventDate)) {
            expanded.push({ eventDate: day, event });
          } else if (event.frequency === 'weekends' && day >= eventDate && isWeekend(day)) {
            expanded.push({ eventDate: day, event });
          } else if (event.frequency === 'monthly' && day >= eventDate && getDate(day) === getDate(eventDate)) {
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

        update(ref(rtdb, `dailyPlannerComments/${dayCommentId}`), {
            id: dayCommentId,
            plannerUserId,
            day,
            lastUpdated: new Date().toISOString()
        });
    
        // Mark as unread for other participants
        const event = plannerEvents.find(e => e.id === eventId);
        if (event) {
            const participants = new Set([event.creatorId, event.userId]);
            participants.forEach(pId => {
                if (pId !== user.id) {
                    update(ref(rtdb, `dailyPlannerComments/${dayCommentId}/comments/${newCommentRef.key}/viewedBy`), { [pId]: false });
                }
            });
        }
    }, [user, plannerEvents]);

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

    const saveJobRecord = useCallback((monthKey: string, profileId: string, day: number | null, value: any, field: 'status' | 'dailyOvertime' | 'dailyComments' | 'plant' | 'sundayDuty') => {
        let path: string;
        if (field === 'status' && day !== null) {
            path = `jobRecords/${monthKey}/records/${profileId}/days/${day}`;
        } else if (field === 'dailyOvertime' && day !== null) {
            path = `jobRecords/${monthKey}/records/${profileId}/dailyOvertime/${day}`;
        } else if (field === 'dailyComments' && day !== null) {
            path = `jobRecords/${monthKey}/records/${profileId}/dailyComments/${day}`;
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
    
        // Carry forward plant order SAFELY
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
        const path = `vehicleUsageRecords/${monthKey}/records/${vehicleId}`;
        update(ref(rtdb, path), data);
    }, []);
    
    const lockVehicleUsageSheet = useCallback((monthKey: string) => {
        update(ref(rtdb, `vehicleUsageRecords/${monthKey}`), { isLocked: true });
    }, []);

    const unlockVehicleUsageSheet = useCallback((monthKey: string) => {
        update(ref(rtdb, `vehicleUsageRecords/${monthKey}`), { isLocked: false });
    }, []);

    useEffect(() => {
        const unsubscribers = [
            createDataListener('plannerEvents', setPlannerEventsById),
            createDataListener('dailyPlannerComments', setDailyPlannerCommentsById),
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
        markSinglePlannerCommentAsRead, dismissPendingUpdate,
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
