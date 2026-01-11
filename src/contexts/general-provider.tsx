
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Announcement, ActivityLog, IncidentReport, Comment, DownloadableDocument, Project, JobCode, Vehicle, Driver, NotificationSettings, Broadcast, Feedback, PasswordResetRequest, UnlockRequest, Role, ManagementRequest, ManagementRequestStatus } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, query, equalTo, get, orderByChild } from 'firebase/database';
import { JOB_CODES as INITIAL_JOB_CODES } from '@/lib/mock-data';
import { useAuth } from './auth-provider';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';


// --- TYPE DEFINITIONS ---

type GeneralContextType = {
  projects: Project[];
  jobCodes: JobCode[];
  activityLogs: ActivityLog[];
  announcements: Announcement[];
  broadcasts: Broadcast[];
  incidentReports: IncidentReport[];
  downloadableDocuments: DownloadableDocument[];
  vehicles: Vehicle[];
  drivers: Driver[];
  notificationSettings: NotificationSettings;
  unlockRequests: UnlockRequest[];
  feedback: Feedback[];
  managementRequests: ManagementRequest[];
  
  addProject: (projectName: string, isPlant?: boolean) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addJobCode: (jobCode: Omit<JobCode, 'id'>) => void;
  updateJobCode: (jobCode: JobCode) => void;
  deleteJobCode: (jobCodeId: string) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  markFeedbackAsViewed: (feedbackId?: string) => void;
  addDocument: (docData: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => void;
  updateDocument: (doc: DownloadableDocument) => void;
  deleteDocument: (docId: string) => void;
  addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => void;
  addDriver: (driverData: Omit<Driver, 'id'>) => void;
  updateDriver: (driver: Driver) => void;
  deleteDriver: (driverId: string) => void;
  addUsersToIncidentReport: (incidentId: string, userIds: string[], comment: string) => void;
  
  addManagementRequest: (requestData: Omit<ManagementRequest, 'id'|'creatorId'|'lastUpdated'|'status'|'comments'|'readBy'>) => void;
  updateManagementRequest: (request: ManagementRequest, comment: string) => void;
  forwardManagementRequest: (originalRequest: ManagementRequest, forwardData: { toUserId: string; ccUserIds: string[]; body: string; }) => void;
  deleteManagementRequest: (requestId: string) => void;
  addManagementRequestComment: (requestId: string, commentText: string, ccUserIds?: string[]) => void;
  markManagementRequestAsViewed: (requestId: string) => void;
};

// --- HELPER FUNCTIONS ---

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

// --- CONTEXT ---

const GeneralContext = createContext<GeneralContextType | undefined>(undefined);

export function GeneralProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog, users } = useAuth();
  const { toast } = useToast();

  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [jobCodesById, setJobCodesById] = useState<Record<string, JobCode>>({});
  const [activityLogsById, setActivityLogsById] = useState<Record<string, ActivityLog>>({});
  const [announcementsById, setAnnouncementsById] = useState<Record<string, Announcement>>({});
  const [broadcastsById, setBroadcastsById] = useState<Record<string, Broadcast>>({});
  const [incidentReportsById, setIncidentReportsById] = useState<Record<string, IncidentReport>>({});
  const [downloadableDocumentsById, setDownloadableDocumentsById] = useState<Record<string, DownloadableDocument>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<string, Vehicle>>({});
  const [driversById, setDriversById] = useState<Record<string, Driver>>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ events: {}, additionalRecipients: '' });
  const [unlockRequestsById, setUnlockRequestsById] = useState<Record<string, UnlockRequest>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, Feedback>>({});
  const [managementRequestsById, setManagementRequestsById] = useState<Record<string, ManagementRequest>>({});

  const projects = useMemo(() => Object.values(projectsById), [projectsById]);
  const jobCodes = useMemo(() => Object.values(jobCodesById), [jobCodesById]);
  const activityLogs = useMemo(() => Object.values(activityLogsById), [activityLogsById]);
  const announcements = useMemo(() => Object.values(announcementsById), [announcementsById]);
  const broadcasts = useMemo(() => Object.values(broadcastsById), [broadcastsById]);
  const incidentReports = useMemo(() => Object.values(incidentReportsById), [incidentReportsById]);
  const downloadableDocuments = useMemo(() => Object.values(downloadableDocumentsById), [downloadableDocumentsById]);
  const vehicles = useMemo(() => Object.values(vehiclesById), [vehiclesById]);
  const drivers = useMemo(() => Object.values(driversById), [driversById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  const feedback = useMemo(() => Object.values(feedbackById), [feedbackById]);
  const managementRequests = useMemo(() => Object.values(managementRequestsById), [managementRequestsById]);

  // --- FUNCTION DEFINITIONS ---

  const addProject = useCallback((projectName: string, isPlant = false) => {
    const newRef = push(ref(rtdb, 'projects'));
    set(newRef, { name: projectName, isPlant });
  }, []);

  const updateProject = useCallback((project: Project) => {
    const { id, ...data } = project;
    update(ref(rtdb, `projects/${id}`), data);
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    remove(ref(rtdb, `projects/${projectId}`));
  }, []);

  const addJobCode = useCallback((jobCode: Omit<JobCode, 'id'>) => {
      const newRef = push(ref(rtdb, 'jobCodes'));
      set(newRef, { ...jobCode, id: newRef.key });
  }, []);

  const updateJobCode = useCallback((jobCode: JobCode) => {
      const { id, ...data } = jobCode;
      update(ref(rtdb, `jobCodes/${id}`), data);
  }, []);

  const deleteJobCode = useCallback((jobCodeId: string) => {
      remove(ref(rtdb, `jobCodes/${jobCodeId}`));
  }, []);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    update(ref(rtdb, `feedback/${feedbackId}`), { status, viewedByUser: false });
  }, []);

  const markFeedbackAsViewed = useCallback(async (feedbackId?: string) => {
    if (!user || !feedbackId) return;

    const feedbackItem = feedback.find(f => f.id === feedbackId);
    if (!feedbackItem) return;

    if (feedbackItem.userId === user.id) {
        await update(ref(rtdb, `feedback/${feedbackId}`), {
            viewedByUser: true,
        });
    }
  }, [user, feedback]);

  const addDocument = useCallback((docData: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'downloadableDocuments'));
    set(newRef, {
      ...docData,
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
    });
  }, [user]);

  const updateDocument = useCallback((doc: DownloadableDocument) => {
    const { id, ...data } = doc;
    update(ref(rtdb, `downloadableDocuments/${id}`), data);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    remove(ref(rtdb, `downloadableDocuments/${docId}`));
  }, []);

  const addVehicle = useCallback((vehicleData: Omit<Vehicle, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'vehicles'));
    const dataToSave = {
        ...vehicleData,
        vapValidity: vehicleData.vapValidity || null,
        insuranceValidity: vehicleData.insuranceValidity || null,
        fitnessValidity: vehicleData.fitnessValidity || null,
        taxValidity: vehicleData.taxValidity || null,
        puccValidity: vehicleData.puccValidity || null,
    };
    set(newRef, dataToSave);
    addActivityLog(user.id, 'Vehicle Added', `Vehicle: ${vehicleData.vehicleNumber}`);
  }, [user, addActivityLog]);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    if (!user) return;
    const { id, ...data } = vehicle;
    update(ref(rtdb, `vehicles/${id}`), data);
    addActivityLog(user.id, 'Vehicle Updated', `Vehicle: ${vehicle.vehicleNumber}`);
  }, [user, addActivityLog]);

  const deleteVehicle = useCallback((vehicleId: string) => {
    if (!user) return;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    remove(ref(rtdb, `vehicles/${vehicleId}`));
    if (vehicle) addActivityLog(user.id, 'Vehicle Deleted', `Vehicle: ${vehicle.vehicleNumber}`);
  }, [user, vehicles, addActivityLog]);

  const addDriver = useCallback((driverData: Omit<Driver, 'id'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'drivers'));
    set(newRef, driverData);
    addActivityLog(user.id, 'Driver Added', `Driver: ${driverData.name}`);
  }, [user, addActivityLog]);

  const updateDriver = useCallback((driver: Driver) => {
    if (!user) return;
    const { id, ...data } = driver;
    update(ref(rtdb, `drivers/${id}`), data);
    addActivityLog(user.id, 'Driver Updated', `Driver: ${driver.name}`);
  }, [user, addActivityLog]);

  const deleteDriver = useCallback((driverId: string) => {
    if (!user) return;
    const driver = drivers.find(d => d.id === driverId);
    remove(ref(rtdb, `drivers/${driverId}`));
    if (driver) addActivityLog(user.id, 'Driver Deleted', `Driver: ${driver.name}`);
  }, [user, drivers, addActivityLog]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    const incident = incidentReportsById[incidentId];
    if (!incident || !user) return;
    const currentReportedTo = incident.reportedToUserIds || [];
    const updatedReportedTo = Array.from(new Set([...currentReportedTo, ...userIds]));
    update(ref(rtdb, `incidentReports/${incidentId}`), { reportedToUserIds: updatedReportedTo });
    
    // Add a comment about adding users
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = {
        id: newCommentRef.key!,
        userId: user.id,
        text: `Added users to report: ${userIds.map(id => users.find(u=>u.id===id)?.name).join(', ')}. Comment: ${comment}`,
        date: new Date().toISOString(),
        eventId: incidentId
    };
    set(newCommentRef, newComment);
  }, [incidentReportsById, user, users]);

  const addManagementRequestComment = useCallback((requestId: string, commentText: string, ccUserIds: string[] = []) => {
    if (!user) return;
    const request = managementRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
    
    const updates: {[key: string]: any} = {};
    updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, viewedBy: { [user.id]: true } };
    updates[`managementRequests/${requestId}/lastUpdated`] = new Date().toISOString();

    const currentParticipants = new Set([request.creatorId, request.toUserId, ...(request.ccUserIds || [])]);
    ccUserIds.forEach(id => currentParticipants.add(id));
    updates[`managementRequests/${requestId}/ccUserIds`] = Array.from(currentParticipants);

    // Mark as unread for all participants except the current user
    const participants = users.filter(u => currentParticipants.has(u.id));
    participants.forEach(p => {
        if (p.id !== user.id) {
            updates[`managementRequests/${requestId}/readBy/${p.id}`] = false;
        }
    });

    update(ref(rtdb), updates);
  }, [user, managementRequestsById, users]);
  
    const addManagementRequest = useCallback((data: Omit<ManagementRequest, 'id'|'creatorId'|'lastUpdated'|'status'|'comments'|'readBy'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'managementRequests'));
        const now = new Date().toISOString();
        const initialComment: Comment = {
            id: 'c0',
            userId: user.id,
            text: data.body,
            date: now,
            viewedBy: { [user.id]: true }
        };
        const newRequest: Omit<ManagementRequest, 'id'> = {
            ...data,
            creatorId: user.id,
            lastUpdated: now,
            status: 'New',
            comments: [initialComment],
            readBy: { [user.id]: true },
        };
        set(newRef, newRequest);

        const recipient = users.find(u => u.id === data.toUserId);
        if (recipient?.email) {
            const htmlBody = `
                <p>You have received a new request from <strong>${user.name}</strong>.</p>
                <hr>
                <h3>${data.subject}</h3>
                <div style="padding: 10px; border-left: 3px solid #ccc;">${data.body}</div>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/management-requests">Click here to view the request and reply.</a></p>
            `;
            sendNotificationEmail({
                to: [recipient.email],
                subject: `New Request: ${data.subject}`,
                htmlBody,
                notificationSettings,
                event: 'onNewTask', 
            });
        }
    }, [user, users, notificationSettings]);

    const forwardManagementRequest = useCallback((originalRequest: ManagementRequest, forwardData: { toUserId: string; ccUserIds: string[]; body: string; }) => {
        if (!user) return;
    
        const newRef = push(ref(rtdb, 'managementRequests'));
        const now = new Date().toISOString();
        const originalCreator = users.find(u => u.id === originalRequest.creatorId);
    
        const forwardedBody = `
    ${forwardData.body}
    
    ---------- Forwarded message ----------
    From: ${originalCreator?.name || 'Unknown'}
    Date: ${format(parseISO(originalRequest.lastUpdated), 'PPP p')}
    Subject: ${originalRequest.subject}
    
    ${originalRequest.body}
    `;
    
        const newRequest: Omit<ManagementRequest, 'id'> = {
            toUserId: forwardData.toUserId,
            ccUserIds: forwardData.ccUserIds,
            subject: `Fwd: ${originalRequest.subject}`,
            body: forwardedBody,
            creatorId: user.id,
            lastUpdated: now,
            status: 'New',
            comments: [],
            readBy: { [user.id]: true },
        };
        set(newRef, newRequest);
    
        // Notify new recipients
        const allNewRecipients = new Set([forwardData.toUserId, ...forwardData.ccUserIds]);
        allNewRecipients.forEach(recipientId => {
          const recipient = users.find(u => u.id === recipientId);
          if (recipient?.email) {
            sendNotificationEmail({
              to: [recipient.email],
              subject: `Fwd: ${originalRequest.subject}`,
              htmlBody: `<p><strong>${user.name}</strong> forwarded a request to you.</p><hr/>` + forwardedBody.replace(/\n/g, '<br/>'),
              notificationSettings,
              event: 'onManagementRequest'
            });
          }
        });
      }, [user, users, notificationSettings]);

    const updateManagementRequest = useCallback((request: ManagementRequest, comment: string) => {
        const { id, ...data } = request;
        update(ref(rtdb, `managementRequests/${id}`), { ...data, lastUpdated: new Date().toISOString() });
        addManagementRequestComment(id, comment);
    }, [addManagementRequestComment]);

    const deleteManagementRequest = useCallback((requestId: string) => {
        if (!user || user.role !== 'Admin') return;
        remove(ref(rtdb, `managementRequests/${requestId}`));
    }, [user]);

    const markManagementRequestAsViewed = useCallback((requestId: string) => {
        if (!user) return;
        update(ref(rtdb, `managementRequests/${requestId}/readBy`), { [user.id]: true });
    }, [user]);


  useEffect(() => {
    const unsubscribers = [
      createDataListener('projects', setProjectsById),
      createDataListener('jobCodes', setJobCodesById),
      createDataListener('activityLogs', setActivityLogsById),
      createDataListener('announcements', setAnnouncementsById),
      createDataListener('broadcasts', setBroadcastsById),
      createDataListener('incidentReports', setIncidentReportsById),
      createDataListener('downloadableDocuments', setDownloadableDocumentsById),
      createDataListener('vehicles', setVehiclesById),
      createDataListener('drivers', setDriversById),
      createDataListener('managementRequests', setManagementRequestsById),
      onValue(ref(rtdb, 'settings/notificationSettings'), (snapshot) => {
        setNotificationSettings(snapshot.val() || { events: {}, additionalRecipients: '' });
      }),
      createDataListener('unlockRequests', setUnlockRequestsById),
      createDataListener('feedback', setFeedbackById),
    ];

    onValue(ref(rtdb, 'jobCodes'), (snapshot) => {
        if (!snapshot.exists()) {
            const updates: { [key: string]: any } = {};
            INITIAL_JOB_CODES.forEach(jc => {
                const newRef = push(ref(rtdb, 'jobCodes'));
                updates[`/jobCodes/${newRef.key}`] = { ...jc, id: newRef.key };
            });
            update(ref(rtdb), updates);
        }
    }, { onlyOnce: true });

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  const contextValue: GeneralContextType = {
    projects, jobCodes, activityLogs, announcements, broadcasts, incidentReports, downloadableDocuments, vehicles, drivers, notificationSettings, unlockRequests, feedback, managementRequests,
    addProject, updateProject, deleteProject, addJobCode, updateJobCode, deleteJobCode, updateFeedbackStatus, markFeedbackAsViewed,
    addDocument, updateDocument, deleteDocument, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addUsersToIncidentReport,
    addManagementRequest, updateManagementRequest, forwardManagementRequest, deleteManagementRequest, addManagementRequestComment, markManagementRequestAsViewed,
  };

  return <GeneralContext.Provider value={contextValue}>{children}</GeneralContext.Provider>;
}

export const useGeneral = (): GeneralContextType => {
  const context = useContext(GeneralContext);
  if (context === undefined) {
    throw new Error('useGeneral must be used within a GeneralProvider');
  }
  return context;
};
