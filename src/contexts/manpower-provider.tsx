'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { ManpowerProfile, LeaveRecord, ManpowerLog, MemoRecord, PpeHistoryRecord, LogbookRecord, LogbookStatus, LogbookRequest, Comment, Role } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { useAuth } from './auth-provider';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { useGeneral } from './general-provider';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---

type ManpowerContextType = {
  manpowerProfiles: ManpowerProfile[];
  manpowerLogs: ManpowerLog[];
  logbookRequests: LogbookRequest[];
  addManpowerProfile: (profile: Omit<ManpowerProfile, 'id'>) => void;
  updateManpowerProfile: (profile: ManpowerProfile) => void;
  addMultipleManpowerProfiles: (profilesData: any[]) => number;
  deleteManpowerProfile: (profileId: string) => void;
  addLeaveForManpower: (manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => void;
  deleteLeaveRecord: (profileId: string, leaveId: string) => void;
  confirmManpowerLeave: (profileId: string, leaveId: string) => void;
  cancelManpowerLeave: (profileId: string, leaveId: string) => void;
  rejoinFromLeave: (profileId: string, leaveId: string, rejoinDate: Date) => void;
  extendLeave: (profileId: string, leaveId: string, newEndDate: Date) => void;
  addManpowerLog: (logData: Partial<Omit<ManpowerLog, 'id' | 'updatedBy' | 'updatedAt' | 'total' | 'openingManpower'>>, logDate?: Date) => void;
  updateManpowerLog: (logId: string, data: Partial<ManpowerLog>) => void;
  addMemoOrWarning: (manpowerId: string, memoData: Omit<MemoRecord, 'id'>) => void;
  updateMemoRecord: (manpowerId: string, memo: MemoRecord) => void;
  deleteMemoRecord: (manpowerId: string, memoId: string) => void;
  addPpeHistoryRecord: (manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => void;
  updatePpeHistoryRecord: (manpowerId: string, record: PpeHistoryRecord) => void;
  deletePpeHistoryRecord: (manpowerId: string, recordId: string) => void;
  
  isManpowerUpdatedToday: (projectId: string) => boolean;
  lastManpowerUpdate: string | null;

  deleteLogbookRecord: (manpowerId: string, recordId: string) => void;
  addLogbookHistoryRecord: (manpowerId: string, recordData: Partial<Omit<LogbookRecord, 'id'>>) => void;
  deleteLogbookHistoryRecord: (manpowerId: string, recordId: string) => void;
  
  addLogbookRequest: (manpowerId: string, remarks?: string) => void;
  updateLogbookRequestStatus: (requestId: string, status: 'Completed' | 'Rejected', comment: string) => void;
  addLogbookRequestComment: (requestId: string, commentText: string, notify?: boolean) => void;
  markLogbookRequestAsViewed: (requestId: string) => void;
  deleteLogbookRequest: (requestId: string) => void;
  myLogbookRequestUpdates: number;
};

// --- HELPER FUNCTIONS ---

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

const ManpowerContext = createContext<ManpowerContextType | undefined>(undefined);

export function ManpowerProvider({ children }: { children: ReactNode }) {
    const { user, users, can, addActivityLog } = useAuth();
    const { projects, notificationSettings } = useGeneral();
    const { toast } = useToast();
    
    const [manpowerProfilesById, setManpowerProfilesById] = useState<Record<string, ManpowerProfile>>({});
    const [manpowerLogsById, setManpowerLogsById] = useState<Record<string, ManpowerLog>>({});
    const [logbookRequestsById, setLogbookRequestsById] = useState<Record<string, LogbookRequest>>({});
    
    const manpowerProfiles = useMemo(() => Object.values(manpowerProfilesById), [manpowerProfilesById]);
    const manpowerLogs = useMemo(() => Object.values(manpowerLogsById), [manpowerLogsById]);
    const logbookRequests = useMemo(() => Object.values(logbookRequestsById), [logbookRequestsById]);

    const addManpowerProfile = (profile: Omit<ManpowerProfile, 'id'>) => {
        const newRef = push(ref(rtdb, 'manpowerProfiles'));
        set(newRef, profile);
    };

    const updateManpowerProfile = (profile: ManpowerProfile) => {
        const { id, ...data } = profile;
        update(ref(rtdb, `manpowerProfiles/${id}`), data);
    };
    
    const addMultipleManpowerProfiles = useCallback((profilesData: any[]): number => {
        let importedCount = 0;
        const updates: { [key: string]: any } = {};

        profilesData.forEach(row => {
            const fileNo = row[20]; // Column U
            if (!fileNo) return;

            const existingProfile = manpowerProfiles.find(p => p.hardCopyFileNo === fileNo);
            
            const parseDateExcel = (date: any): string | undefined => {
                if (date instanceof Date && !isNaN(date.getTime())) {
                    return date.toISOString();
                }
                return undefined;
            }

            const profileData: Partial<ManpowerProfile> = {
                name: row[0] || '',
                mobileNumber: String(row[1] || ''),
                gender: row[2] || undefined,
                workOrderNumber: row[3] || '',
                labourLicenseNo: row[4] || '',
                eic: projects.find(p => p.name === row[5])?.id || '',
                workOrderExpiryDate: parseDateExcel(row[6]),
                labourLicenseExpiryDate: parseDateExcel(row[7]),
                joiningDate: parseDateExcel(row[8]),
                epNumber: String(row[9] || ''),
                aadharNumber: String(row[10] || ''),
                dob: parseDateExcel(row[11]),
                uanNumber: String(row[12] || ''),
                wcPolicyNumber: String(row[13] || ''),
                wcPolicyExpiryDate: parseDateExcel(row[14]),
                cardCategory: row[15] || '',
                cardType: row[16] || '',
                hardCopyFileNo: fileNo,
            };
            
            if (existingProfile) {
                updates[`/manpowerProfiles/${existingProfile.id}`] = { ...existingProfile, ...profileData };
            } else {
                const newRef = push(ref(rtdb, 'manpowerProfiles'));
                updates[`/manpowerProfiles/${newRef.key}`] = { ...profileData, trade: 'Unknown', status: 'Working' };
            }
            importedCount++;
        });

        if(Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
        return importedCount;
    }, [manpowerProfiles, projects]);

    const deleteManpowerProfile = (profileId: string) => {
        remove(ref(rtdb, `manpowerProfiles/${profileId}`));
    };

    const addLeaveForManpower = (manpowerIds: string[], leaveType: 'Annual' | 'Emergency', startDate: Date, endDate: Date, remarks?: string) => {
        const updates: { [key: string]: any } = {};
        manpowerIds.forEach(id => {
            const newLeaveRef = push(ref(rtdb, `manpowerProfiles/${id}/leaveHistory`));
            updates[`manpowerProfiles/${id}/leaveHistory/${newLeaveRef.key}`] = {
                id: newLeaveRef.key,
                leaveType,
                leaveStartDate: startDate.toISOString(),
                plannedEndDate: endDate.toISOString(),
                remarks,
            };
        });
        update(ref(rtdb), updates);
    };

    const deleteLeaveRecord = (profileId: string, leaveId: string) => {
        remove(ref(rtdb, `manpowerProfiles/${profileId}/leaveHistory/${leaveId}`));
    };

    const confirmManpowerLeave = (profileId: string, leaveId: string) => {
        const updates: { [key: string]: any } = {};
        updates[`manpowerProfiles/${profileId}/status`] = 'On Leave';
        updates[`manpowerProfiles/${profileId}/leaveHistory/${leaveId}/isConfirmed`] = true;
        update(ref(rtdb), updates);
    };

    const cancelManpowerLeave = (profileId: string, leaveId: string) => {
        update(ref(rtdb, `manpowerProfiles/${profileId}/leaveHistory/${leaveId}`), {
            status: 'Cancelled'
        });
    };
    
    const rejoinFromLeave = (profileId: string, leaveId: string, rejoinDate: Date) => {
        const updates: { [key: string]: any } = {};
        updates[`manpowerProfiles/${profileId}/status`] = 'Working';
        updates[`manpowerProfiles/${profileId}/leaveHistory/${leaveId}/rejoinedDate`] = rejoinDate.toISOString();
        update(ref(rtdb), updates);
    };

    const extendLeave = (profileId: string, leaveId: string, newEndDate: Date) => {
        update(ref(rtdb, `manpowerProfiles/${profileId}/leaveHistory/${leaveId}`), {
            plannedEndDate: newEndDate.toISOString()
        });
    };

    const addManpowerLog = useCallback(async (logData: Partial<Omit<ManpowerLog, 'id' | 'updatedBy' | 'updatedAt' | 'total' | 'openingManpower'>>, logDate: Date = new Date()) => {
        if (!user) return;
        const dateStr = format(logDate, 'yyyy-MM-dd');
        
        const previousLogs = manpowerLogs
            .filter(l => l.projectId === logData.projectId && isBefore(parseISO(l.date), startOfDay(logDate)))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const mostRecentPreviousLog = previousLogs[0];
        
        const openingManpower = mostRecentPreviousLog?.total ?? 0;
        const total = openingManpower + (logData.countIn || 0) - (logData.countOut || 0);

        const newLog: Partial<ManpowerLog> = {
            ...logData,
            date: dateStr,
            updatedBy: user.id,
            updatedAt: new Date().toISOString(),
            openingManpower,
            total
        };

        const logsForProjectDay = manpowerLogs.filter(log => log.date === dateStr && log.projectId === logData.projectId);
        const latestLogForDay = logsForProjectDay.length > 0
            ? logsForProjectDay.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
            : null;
        
        if (latestLogForDay) {
            await update(ref(rtdb, `manpowerLogs/${latestLogForDay.id}`), newLog);
        } else {
            const newRef = push(ref(rtdb, 'manpowerLogs'));
            await set(newRef, newLog);
        }
    }, [user, manpowerLogs]);

    const updateManpowerLog = useCallback((logId: string, data: Partial<ManpowerLog>) => {
        if (!user) return;
        const existingLog = manpowerLogs.find(l => l.id === logId);
        if (!existingLog) return;
        
        const total = (data.openingManpower ?? existingLog.openingManpower) + (data.countIn ?? existingLog.countIn) - (data.countOut ?? existingLog.countOut);

        update(ref(rtdb, `manpowerLogs/${logId}`), { 
            ...data, 
            total,
            updatedBy: user.id,
            updatedAt: new Date().toISOString()
        });
    }, [user, manpowerLogs]);
    
    const { isManpowerUpdatedToday, lastManpowerUpdate } = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayLogs = manpowerLogs.filter(log => log.date === todayStr);

        const lastUpdate = todayLogs.length > 0 
            ? todayLogs.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt
            : null;
            
        return {
            isManpowerUpdatedToday: (projectId: string) => todayLogs.some(log => log.projectId === projectId),
            lastManpowerUpdate: lastUpdate
        }
    }, [manpowerLogs]);

    const addMemoOrWarning = (manpowerId: string, memoData: Omit<MemoRecord, 'id'>) => {
        const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory`));
        set(newRef, { ...memoData, id: newRef.key });
    };

    const updateMemoRecord = (manpowerId: string, memo: MemoRecord) => {
        const { id, ...data } = memo;
        update(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${id}`), data);
    };
    
    const deleteMemoRecord = (manpowerId: string, memoId: string) => {
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/memoHistory/${memoId}`));
    };
    
    const addPpeHistoryRecord = (manpowerId: string, record: Omit<PpeHistoryRecord, 'id'>) => {
        const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory`));
        set(newRef, { ...record, id: newRef.key });
    };
    
    const updatePpeHistoryRecord = (manpowerId: string, record: PpeHistoryRecord) => {
        const { id, ...data } = record;
        update(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${id}`), data);
    };

    const deletePpeHistoryRecord = (manpowerId: string, recordId: string) => {
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/ppeHistory/${recordId}`));
    };
    
    const deleteLogbookRecord = useCallback((manpowerId: string, recordId: string) => {
        const profile = manpowerProfilesById[manpowerId];
        if (!profile) return;
        
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/logbookHistory/${recordId}`));

        // Find the new latest history record to update the root logbook status
        const remainingHistory = Object.values(profile.logbookHistory || {}).filter(h => h.id !== recordId);
        const newLatestRecord = remainingHistory.sort((a,b) => parseISO(b.entryDate!).getTime() - parseISO(a.entryDate!).getTime())[0];
        
        if (newLatestRecord) {
            update(ref(rtdb, `manpowerProfiles/${manpowerId}/logbook`), {
                status: newLatestRecord.status,
                inDate: newLatestRecord.inDate,
                outDate: newLatestRecord.outDate,
                remarks: newLatestRecord.remarks,
            });
        } else {
            // If no history remains, clear the root logbook object
            set(ref(rtdb, `manpowerProfiles/${manpowerId}/logbook`), null);
        }
    }, [manpowerProfilesById]);


    const addLogbookHistoryRecord = useCallback((manpowerId: string, recordData: Partial<Omit<LogbookRecord, 'id'>>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, `manpowerProfiles/${manpowerId}/logbookHistory`));
        const recordToWrite: Partial<LogbookRecord> = {
            ...recordData,
            entryDate: recordData.entryDate || new Date().toISOString(),
            enteredById: user.id,
            outDate: recordData.outDate || null,
            inDate: recordData.inDate || null,
            requestedById: recordData.requestedById || null,
        };

        if (recordData.remarks) {
            recordToWrite.requestRemarks = recordData.remarks;
        }
        
        set(newRef, { ...recordToWrite, id: newRef.key });
        
        // Update the main logbook object on the profile
        const rootUpdates: Partial<LogbookRecord> = {};
        if (recordData.status) rootUpdates.status = recordData.status;
        if (recordData.outDate) rootUpdates.outDate = recordData.outDate;
        if (recordData.inDate) rootUpdates.inDate = recordData.inDate;
        if (recordData.remarks) rootUpdates.remarks = recordData.remarks;

        if (Object.keys(rootUpdates).length > 0) {
            update(ref(rtdb, `manpowerProfiles/${manpowerId}/logbook`), rootUpdates);
        }
    }, [user]);

    const deleteLogbookHistoryRecord = (manpowerId: string, recordId: string) => {
        remove(ref(rtdb, `manpowerProfiles/${manpowerId}/logbookHistory/${recordId}`));
    };
    
    const addLogbookRequest = useCallback((manpowerId: string, remarks?: string) => {
        if(!user) return;
        const newRef = push(ref(rtdb, 'logbookRequests'));
        set(newRef, {
            manpowerId, requesterId: user.id, requestDate: new Date().toISOString(), status: 'Pending', remarks,
            viewedBy: { [user.id]: true }
        });
    }, [user]);

    const addLogbookRequestComment = useCallback((requestId: string, text: string, notify?: boolean) => {
        if (!user) return;
        const request = logbookRequests.find(r => r.id === requestId);
        if(!request) return;
        
        const newCommentRef = push(ref(rtdb, `logbookRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = {
            id: newCommentRef.key!,
            userId: user.id,
            text,
            date: new Date().toISOString(),
            eventId: requestId
        };
        set(newCommentRef, newComment);
        
        const updates: {[key: string]: any} = {};
        // Mark as unread for the other party
        const otherPartyId = request.requesterId === user.id ? request.approverId : request.requesterId;
        if (otherPartyId) {
            updates[`logbookRequests/${requestId}/viewedBy/${otherPartyId}`] = false;
        }
        
        update(ref(rtdb), updates);

    }, [user, logbookRequests]);

    const updateLogbookRequestStatus = useCallback((requestId: string, status: 'Completed' | 'Rejected', comment: string) => {
        if (!user) return;
        const request = logbookRequests.find(r => r.id === requestId);
        if (!request) return;

        update(ref(rtdb, `logbookRequests/${requestId}`), { status, approverId: user.id, approvalDate: new Date().toISOString() });
        addLogbookRequestComment(requestId, comment, true);

        if (status === 'Completed') {
            const manpowerId = request.manpowerId;
            const newHistoryRecord: Partial<Omit<LogbookRecord, 'id'>> = {
                status: 'Sent back as requested',
                outDate: new Date().toISOString(),
                requestDate: request.requestDate,
                requestedById: request.requesterId,
                requestRemarks: request.remarks,
                approverId: user.id,
                approvalDate: new Date().toISOString(),
                approverComment: comment,
                requestId: requestId,
            };
            addLogbookHistoryRecord(manpowerId, newHistoryRecord);
        }

    }, [user, logbookRequests, addLogbookHistoryRecord, addLogbookRequestComment]);


    const markLogbookRequestAsViewed = useCallback((requestId: string) => {
        if(!user) return;
        const request = logbookRequests.find(r => r.id === requestId);
        if (!request) return;
    
        const updates: { [key: string]: boolean } = {};
        updates[`logbookRequests/${requestId}/viewedBy/${user.id}`] = true;
    
        const comments = Array.isArray(request.comments) ? request.comments : Object.values(request.comments || {});
        comments.forEach(c => {
          if (c && c.userId !== user.id) {
            updates[`logbookRequests/${requestId}/comments/${c.id}/viewedBy/${user.id}`] = true;
          }
        });
    
        update(ref(rtdb), updates);
    }, [user, logbookRequests]);

    const deleteLogbookRequest = useCallback((requestId: string) => {
        remove(ref(rtdb, `logbookRequests/${requestId}`));
    }, []);
    
    const myLogbookRequestUpdates = useMemo(() => {
        if (!user) return 0;
        return logbookRequests.filter(r => r.requesterId === user.id && !r.viewedBy?.[user.id] && r.status !== 'Pending').length;
    }, [logbookRequests, user]);

    useEffect(() => {
        const unsubscribers = [
            createDataListener('manpowerProfiles', setManpowerProfilesById),
            createDataListener('manpowerLogs', setManpowerLogsById),
            createDataListener('logbookRequests', setLogbookRequestsById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: ManpowerContextType = {
        manpowerProfiles, manpowerLogs, logbookRequests,
        addManpowerProfile, updateManpowerProfile, addMultipleManpowerProfiles, deleteManpowerProfile,
        addLeaveForManpower, deleteLeaveRecord, confirmManpowerLeave, cancelManpowerLeave, rejoinFromLeave, extendLeave,
        addManpowerLog, updateManpowerLog, isManpowerUpdatedToday, lastManpowerUpdate,
        addMemoOrWarning, updateMemoRecord, deleteMemoRecord,
        addPpeHistoryRecord, updatePpeHistoryRecord, deletePpeHistoryRecord,
        deleteLogbookRecord, addLogbookHistoryRecord, deleteLogbookHistoryRecord,
        addLogbookRequest, updateLogbookRequestStatus, addLogbookRequestComment, markLogbookRequestAsViewed, deleteLogbookRequest, myLogbookRequestUpdates
    };

    return <ManpowerContext.Provider value={contextValue}>{children}</ManpowerContext.Provider>;
}

export const useManpower = (): ManpowerContextType => {
  const context = useContext(ManpowerContext);
  if (context === undefined) {
    throw new Error('useManpower must be used within a ManpowerProvider');
  }
  return context;
};
