'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Announcement, ActivityLog, IncidentReport, Comment, DownloadableDocument, Project, JobCode, Vehicle, Driver, Building, Room, Bed, NotificationSettings, Broadcast, Feedback, PasswordResetRequest, UnlockRequest } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, query, equalTo, get, orderByChild } from 'firebase/database';
import { JOB_CODES as INITIAL_JOB_CODES } from '@/lib/mock-data';

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
    // This function will now be handled in the CombinedProvider to get user access
  }, []);


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
