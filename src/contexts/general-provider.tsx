
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Announcement, ActivityLog, IncidentReport, Comment, DownloadableDocument, Project, JobCode, Vehicle, Driver, Building, Room, Bed, NotificationSettings, Broadcast, Feedback, PasswordResetRequest, UnlockRequest, Role } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, query, equalTo, get, orderByChild } from 'firebase/database';
import { JOB_CODES as INITIAL_JOB_CODES } from '@/lib/mock-data';
import { useAuth } from './auth-provider';

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
  buildings: Building[];
  notificationSettings: NotificationSettings;
  appName: string;
  appLogo: string | null;
  unlockRequests: UnlockRequest[];
  feedback: Feedback[];
  
  addProject: (projectName: string, isPlant?: boolean) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addJobCode: (jobCode: Omit<JobCode, 'id'>) => void;
  updateJobCode: (jobCode: JobCode) => void;
  deleteJobCode: (jobCodeId: string) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  markFeedbackAsViewed: () => void;
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
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({});
  const [jobCodesById, setJobCodesById] = useState<Record<string, JobCode>>({});
  const [activityLogsById, setActivityLogsById] = useState<Record<string, ActivityLog>>({});
  const [announcementsById, setAnnouncementsById] = useState<Record<string, Announcement>>({});
  const [broadcastsById, setBroadcastsById] = useState<Record<string, Broadcast>>({});
  const [incidentReportsById, setIncidentReportsById] = useState<Record<string, IncidentReport>>({});
  const [downloadableDocumentsById, setDownloadableDocumentsById] = useState<Record<string, DownloadableDocument>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<string, Vehicle>>({});
  const [driversById, setDriversById] = useState<Record<string, Driver>>({});
  const [buildingsById, setBuildingsById] = useState<Record<string, Building>>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ events: {}, additionalRecipients: '' });
  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [unlockRequestsById, setUnlockRequestsById] = useState<Record<string, UnlockRequest>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, Feedback>>({});

  const projects = useMemo(() => Object.values(projectsById), [projectsById]);
  const jobCodes = useMemo(() => Object.values(jobCodesById), [jobCodesById]);
  const activityLogs = useMemo(() => Object.values(activityLogsById), [activityLogsById]);
  const announcements = useMemo(() => Object.values(announcementsById), [announcementsById]);
  const broadcasts = useMemo(() => Object.values(broadcastsById), [broadcastsById]);
  const incidentReports = useMemo(() => Object.values(incidentReportsById), [incidentReportsById]);
  const downloadableDocuments = useMemo(() => Object.values(downloadableDocumentsById), [downloadableDocumentsById]);
  const vehicles = useMemo(() => Object.values(vehiclesById), [vehiclesById]);
  const drivers = useMemo(() => Object.values(driversById), [driversById]);
  const buildings = useMemo(() => Object.values(buildingsById), [buildingsById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  const feedback = useMemo(() => Object.values(feedbackById), [feedbackById]);

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
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
  }, []);

  const markFeedbackAsViewed = useCallback(() => {
    if (!user) return;
    feedback.forEach(f => {
      if (!f.viewedBy?.[user.id]) {
        update(ref(rtdb, `feedback/${f.id}/viewedBy`), { [user.id]: true });
      }
    });
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
      createDataListener('buildings', setBuildingsById),
      onValue(ref(rtdb, 'settings/notificationSettings'), (snapshot) => {
        setNotificationSettings(snapshot.val() || { events: {}, additionalRecipients: '' });
      }),
      onValue(ref(rtdb, 'branding/appName'), (snapshot) => {
        setAppName(snapshot.val() || 'Aries Marine');
      }),
      onValue(ref(rtdb, 'branding/appLogo'), (snapshot) => {
        setAppLogo(snapshot.val());
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
    projects, jobCodes, activityLogs, announcements, broadcasts, incidentReports, downloadableDocuments, vehicles, drivers, buildings, notificationSettings, appName, appLogo, unlockRequests, feedback,
    addProject, updateProject, deleteProject, addJobCode, updateJobCode, deleteJobCode, updateFeedbackStatus, markFeedbackAsViewed,
    addDocument, updateDocument, deleteDocument, addVehicle, updateVehicle, deleteVehicle, addDriver, updateDriver, deleteDriver, addUsersToIncidentReport
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

