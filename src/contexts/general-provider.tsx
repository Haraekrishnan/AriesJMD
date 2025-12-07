
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Announcement, ActivityLog, IncidentReport, Comment, DownloadableDocument, Project, JobCode, Vehicle, Driver, Building, Room, Bed, NotificationSettings, Broadcast } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { useAuth } from './auth-provider';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { JOB_CODES as INITIAL_JOB_CODES } from '@/lib/mock-data';
import { saveNotificationSettings } from '@/app/actions/saveNotificationSettings';
import { useToast } from '@/hooks/use-toast';

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
  addProject: (projectName: string, isPlant?: boolean) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  addJobCode: (jobCode: Omit<JobCode, 'id'>) => void;
  updateJobCode: (jobCode: JobCode) => void;
  deleteJobCode: (jobCodeId: string) => void;
  addAnnouncement: (data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => void;
  updateAnnouncement: (announcement: Announcement) => void;
  approveAnnouncement: (announcementId: string) => void;
  rejectAnnouncement: (announcementId: string) => void;
  deleteAnnouncement: (announcementId: string) => void;
  returnAnnouncement: (announcementId: string, comment: string) => void;
  dismissAnnouncement: (announcementId: string) => void;
  addBroadcast: (broadcastData: Omit<Broadcast, 'id' | 'creatorId' | 'createdAt' | 'dismissedBy'>) => void;
  deleteBroadcast: (broadcastId: string) => void;
  dismissBroadcast: (broadcastId: string) => void;
  addIncidentReport: (incident: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => void;
  updateIncident: (incident: IncidentReport, comment: string) => void;
  deleteIncidentReport: (incidentId: string) => void;
  addIncidentComment: (incidentId: string, text: string) => void;
  publishIncident: (incidentId: string, comment: string) => void;
  addUsersToIncidentReport: (incidentId: string, userIds: string[], comment: string) => void;
  markIncidentAsViewed: (incidentId: string) => void;
  addDocument: (data: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => void;
  updateDocument: (doc: DownloadableDocument) => void;
  deleteDocument: (docId: string) => void;
  addVehicle: (vehicleData: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => void;
  addDriver: (driverData: Omit<Driver, 'id' | 'photo'>) => void;
  updateDriver: (driver: Driver) => void;
  deleteDriver: (driverId: string) => void;
  addBuilding: (buildingNumber: string) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  updateRoom: (buildingId: string, room: Room) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  addBed: (buildingId: string, roomId: string) => void;
  updateBed: (buildingId: string, roomId: string, bed: Bed) => void;
  deleteBed: (buildingId: string, roomId: string, bedId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string) => void;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
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

// --- CONTEXT ---

const GeneralContext = createContext<GeneralContextType | undefined>(undefined);

export function GeneralProvider({ children }: { children: ReactNode }) {
  const { user, users, addActivityLog } = useAuth();
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
  const [buildingsById, setBuildingsById] = useState<Record<string, Building>>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({ events: {}, additionalRecipients: '' });
  
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
  
  const addAnnouncement = useCallback((data: Partial<Omit<Announcement, 'id' | 'creatorId' | 'status' | 'createdAt' | 'comments' | 'approverId' | 'dismissedBy'>>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'announcements'));
    const approverId = user.supervisorId || users.find(u => u.role === 'Admin')?.id;
    if (!approverId) return;
    
    const newAnnouncement: Omit<Announcement, 'id'> = {
        title: data.title!, content: data.content!, creatorId: user.id, approverId,
        status: 'pending', createdAt: new Date().toISOString(), comments: [{ userId: user.id, text: 'Announcement created', date: new Date().toISOString(), eventId: newRef.key! }], notifyAll: data.notifyAll || false,
    };
    set(newRef, newAnnouncement);

    const approver = users.find(u => u.id === approverId);
    if (approver?.email) {
        sendNotificationEmail({
            to: [approver.email], 
            subject:`New Announcement for Approval: ${data.title}`, 
            htmlBody: `<p>A new announcement titled "${data.title}" from ${user.name} requires your approval.</p>`,
            notificationSettings,
            event: 'onTaskForApproval',
        });
    }
  }, [user, users, notificationSettings]);

  const updateAnnouncement = useCallback((announcement: Announcement) => {
    const { id, ...data } = announcement;
    update(ref(rtdb, `announcements/${id}`), data);
  }, []);

  const approveAnnouncement = useCallback((announcementId: string) => {
    if(!user) return;
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'approved' });
    const announcement = announcementsById[announcementId];
    if (announcement?.notifyAll) {
        const recipients = users.filter(u => u.email && u.role !== 'Manager').map(u => u.email!);
        if (recipients.length > 0) {
            sendNotificationEmail({
                to: recipients, 
                subject: `New Announcement: ${announcement.title}`, 
                htmlBody: `<h3>${announcement.title}</h3><p>${announcement.content}</p>`,
                notificationSettings,
                event: 'onNewTask',
            });
        }
    }
  }, [user, announcementsById, users, notificationSettings]);

  const rejectAnnouncement = useCallback((announcementId: string) => {
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'rejected' });
  }, []);

  const deleteAnnouncement = useCallback((announcementId: string) => {
    remove(ref(rtdb, `announcements/${announcementId}`));
  }, []);

  const returnAnnouncement = useCallback((announcementId: string, comment: string) => {
    if(!user) return;
    const newCommentRef = push(ref(rtdb, `announcements/${announcementId}/comments`));
    set(newCommentRef, { userId: user.id, text: comment, date: new Date().toISOString(), eventId: announcementId });
    update(ref(rtdb, `announcements/${announcementId}`), { status: 'returned' });
  }, [user]);

  const dismissAnnouncement = useCallback((announcementId: string) => {
    if (!user) return;
    set(ref(rtdb, `announcements/${announcementId}/dismissedBy/${user.id}`), true);
  }, [user]);
  
  const addBroadcast = useCallback((broadcastData: Omit<Broadcast, 'id' | 'creatorId' | 'createdAt' | 'dismissedBy'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'broadcasts'));
    const newBroadcast: Omit<Broadcast, 'id'> = {
        ...broadcastData,
        creatorId: user.id,
        createdAt: new Date().toISOString(),
        dismissedBy: [],
    };
    set(newRef, newBroadcast);

    let recipients: string[] = [];
    if(broadcastData.emailTarget === 'roles' && broadcastData.recipientRoles) {
        recipients = users.filter(u => u.email && broadcastData.recipientRoles!.includes(u.role)).map(u => u.email!);
    } else if (broadcastData.emailTarget === 'individuals' && broadcastData.recipientUserIds) {
        recipients = users.filter(u => u.email && broadcastData.recipientUserIds!.includes(u.id)).map(u => u.email!);
    }
    
    if (recipients.length > 0) {
        sendNotificationEmail({
            to: recipients,
            subject: `Broadcast Message from ${user.name}`,
            htmlBody: `<p>You have a new broadcast message:</p><h3>${broadcastData.message}</h3>`,
            notificationSettings,
            event: 'onNewTask' // Placeholder, consider a dedicated event
        });
    }

  }, [user, users, notificationSettings]);

  const deleteBroadcast = useCallback((broadcastId: string) => {
    if (!user || user.role !== 'Admin') return;
    remove(ref(rtdb, `broadcasts/${broadcastId}`));
    toast({ title: 'Broadcast Deleted', description: 'The broadcast message has been removed.' });
  }, [user, toast]);

  const dismissBroadcast = useCallback((broadcastId: string) => {
    if (!user) return;
    const dismissedByRef = ref(rtdb, `broadcasts/${broadcastId}/dismissedBy`);
    get(dismissedByRef).then(snapshot => {
      const currentDismissedBy = snapshot.val() || [];
      if (!currentDismissedBy.includes(user.id)) {
        set(dismissedByRef, [...currentDismissedBy, user.id]);
      }
    });
  }, [user]);


  const addIncidentReport = useCallback((incident: Omit<IncidentReport, 'id' | 'reporterId' | 'reportTime' | 'status' | 'isPublished' | 'comments' | 'reportedToUserIds' | 'lastUpdated' | 'viewedBy'>) => {
    if(!user) return;
    const newRef = push(ref(rtdb, 'incidentReports'));
    
    const notificationRoles = ['Admin', 'Project Coordinator', 'Senior Safety Supervisor', 'Safety Supervisor', 'HSE'];
    const recipients = users.filter(u => notificationRoles.includes(u.role));
    const reportedToUserIds = recipients.map(u => u.id);
    
    const newIncident: Omit<IncidentReport, 'id'> = {
      ...incident, reporterId: user.id, reportTime: new Date().toISOString(), status: 'New', isPublished: false,
      comments: [{ id: 'comment-initial', userId: user.id, text: 'Incident Reported', date: new Date().toISOString() }],
      reportedToUserIds: Array.from(new Set([user.supervisorId, ...reportedToUserIds].filter(Boolean) as string[])), 
      lastUpdated: new Date().toISOString(), 
      viewedBy: { [user.id]: true }
    };
    set(newRef, newIncident);

    recipients.forEach(recipient => {
        if(recipient.email) {
            const htmlBody = `
                <h3>New Incident Reported by ${user.name}</h3>
                <p><strong>Location:</strong> ${projects.find(p => p.id === incident.projectId)?.name} - ${incident.unitArea}</p>
                <p><strong>Details:</strong> ${incident.incidentDetails}</p>
                <p>Please review the report in the app.</p>
            `;
            sendNotificationEmail({
                to: [recipient.email],
                subject: `New Incident Report: ${incident.unitArea}`,
                htmlBody,
                notificationSettings,
                event: 'onNewIncident',
                creatorUser: user,
                involvedUser: recipient
            });
        }
    });

  }, [user, users, projects, notificationSettings]);
  
  const addIncidentComment = useCallback((incidentId: string, text: string) => {
    const incident = incidentReportsById[incidentId];
    if (!user || !incident) return;
    
    const newCommentRef = push(ref(rtdb, `incidentReports/${incidentId}/comments`));
    const newComment: Omit<Comment, 'id'> = { userId: user.id, text, date: new Date().toISOString(), eventId: incidentId };
    
    const updates: { [key: string]: any } = {};
    updates[`incidentReports/${incidentId}/comments/${newCommentRef.key}`] = { ...newComment, id: newCommentRef.key };
    updates[`incidentReports/${incidentId}/lastUpdated`] = new Date().toISOString();
    
    const participants = new Set(incident.reportedToUserIds);
    participants.add(incident.reporterId);
    
    participants.forEach(pId => {
      updates[`incidentReports/${incidentId}/viewedBy/${pId}`] = pId === user.id;
      
      const participantUser = users.find(u => u.id === pId);
      if (participantUser?.email && pId !== user.id) {
          const htmlBody = `
              <p>There's a new comment on an incident report you are part of.</p>
              <p><strong>Report ID:</strong> #${incident.id.slice(-6)}</p>
              <p><strong>Comment by ${user.name}:</strong> ${text}</p>
              <p>Please review the report in the app.</p>
          `;
          sendNotificationEmail({
              to: [participantUser.email],
              subject: `New Comment on Incident #${incident.id.slice(-6)}`,
              htmlBody,
              notificationSettings,
              event: 'onNewIncident',
              creatorUser: users.find(u => u.id === incident.reporterId),
              involvedUser: participantUser
          });
      }
    });

    update(ref(rtdb), updates);
  }, [user, users, incidentReportsById, notificationSettings]);

  const updateIncident = useCallback((incident: IncidentReport, comment: string) => {
      if(!user) return;
      const { id, ...data } = incident;
      const updates: { [key: string]: any } = {};
      updates[`incidentReports/${id}`] = { ...data, lastUpdated: new Date().toISOString() };
      
      const newCommentRef = push(ref(rtdb, `incidentReports/${id}/comments`));
      updates[`incidentReports/${id}/comments/${newCommentRef.key}`] = {
        id: newCommentRef.key, userId: user.id, text: comment, date: new Date().toISOString()
      };
      
      const participants = new Set(incident.reportedToUserIds);
      participants.add(incident.reporterId);
      participants.forEach(pId => {
          if (pId !== user.id) updates[`incidentReports/${id}/viewedBy/${pId}`] = false;
      });
      
      update(ref(rtdb), updates);
  }, [user]);

  const deleteIncidentReport = useCallback((incidentId: string) => {
    if (!user || user.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'Only administrators can delete incident reports.',
      });
      return;
    }
    remove(ref(rtdb, `incidentReports/${incidentId}`));
    toast({
      title: 'Incident Report Deleted',
      variant: 'destructive',
    });
    addActivityLog(user.id, 'Incident Report Deleted', `Deleted report ID: ${incidentId}`);
  }, [user, addActivityLog, toast]);

  const publishIncident = useCallback((incidentId: string, comment: string) => {
      if(!user || user.role !== 'Admin') return;
      const updates: { [key: string]: any } = {
          [`incidentReports/${incidentId}/isPublished`]: true,
          [`incidentReports/${incidentId}/status`]: 'Closed'
      };
      update(ref(rtdb), updates);
      addIncidentComment(incidentId, comment);
  }, [user, addIncidentComment]);

  const addUsersToIncidentReport = useCallback((incidentId: string, userIds: string[], comment: string) => {
    if (!user) return;
    const incident = incidentReportsById[incidentId];
    if (!incident) return;

    const updatedUserIds = Array.from(new Set([...incident.reportedToUserIds, ...userIds]));
    const updates: { [key: string]: any } = { 
        [`incidentReports/${incidentId}/reportedToUserIds`]: updatedUserIds,
        [`incidentReports/${incidentId}/lastUpdated`]: new Date().toISOString(),
    };
    
    userIds.forEach(id => {
      updates[`incidentReports/${incidentId}/viewedBy/${id}`] = false;
    });

    update(ref(rtdb), updates);
    addIncidentComment(incidentId, comment);

    // Notify newly added users
    userIds.forEach(newUserId => {
        const newUser = users.find(u => u.id === newUserId);
        if (newUser?.email) {
            const htmlBody = `
                <p>You have been added to an incident report by ${user.name}.</p>
                <p><strong>Report ID:</strong> #${incident.id.slice(-6)}</p>
                <p><strong>Details:</strong> ${incident.incidentDetails}</p>
                <p>Please review the report in the app.</p>
            `;
            sendNotificationEmail({
                to: [newUser.email],
                subject: `You've been added to Incident Report #${incident.id.slice(-6)}`,
                htmlBody,
                notificationSettings,
                event: 'onNewIncident',
                creatorUser: users.find(u => u.id === incident.reporterId),
                involvedUser: newUser
            });
        }
    });
}, [user, users, incidentReportsById, addIncidentComment, notificationSettings]);

  const markIncidentAsViewed = useCallback((incidentId: string) => {
    if(!user) return;
    const updates: { [key: string]: any } = {};
    const incident = incidentReportsById[incidentId];
    if (!incident) return;

    updates[`incidentReports/${incidentId}/viewedBy/${user.id}`] = true;

    const comments = Array.isArray(incident.comments) ? incident.comments : Object.values(incident.comments || {});
    comments.forEach(comment => {
        if(comment && comment.userId !== user.id && !comment.viewedBy?.[user.id]) {
            updates[`incidentReports/${incidentId}/comments/${comment.id}/viewedBy/${user.id}`] = true;
        }
    });

    update(ref(rtdb), updates);
  }, [user, incidentReportsById]);

  const addDocument = useCallback((doc: Omit<DownloadableDocument, 'id' | 'uploadedBy' | 'createdAt'>) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'downloadableDocuments'));
    set(newRef, { ...doc, uploadedBy: user.id, createdAt: new Date().toISOString() });
  }, [user]);

  const updateDocument = useCallback((doc: DownloadableDocument) => {
    const { id, ...data } = doc;
    update(ref(rtdb, `downloadableDocuments/${id}`), data);
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    remove(ref(rtdb, `downloadableDocuments/${docId}`));
  }, []);

  const addVehicle = useCallback((vehicleData: Omit<Vehicle, 'id'>) => {
    const newRef = push(ref(rtdb, 'vehicles'));
    const sanitizedData = {
      ...vehicleData,
      vapValidity: vehicleData.vapValidity || null,
      insuranceValidity: vehicleData.insuranceValidity || null,
      fitnessValidity: vehicleData.fitnessValidity || null,
      taxValidity: vehicleData.taxValidity || null,
      puccValidity: vehicleData.puccValidity || null,
    };
    set(newRef, sanitizedData);
  }, []);

  const updateVehicle = useCallback((vehicle: Vehicle) => {
    const { id, ...data } = vehicle;
    const sanitizedData = {
        ...data,
        vapValidity: data.vapValidity || null,
        insuranceValidity: data.insuranceValidity || null,
        fitnessValidity: data.fitnessValidity || null,
        taxValidity: data.taxValidity || null,
        puccValidity: data.puccValidity || null,
    };
    update(ref(rtdb, `vehicles/${id}`), sanitizedData);
  }, []);

  const deleteVehicle = useCallback((vehicleId: string) => {
    remove(ref(rtdb, `vehicles/${vehicleId}`));
  }, []);

  const addDriver = useCallback((driverData: Omit<Driver, 'id' | 'photo'>) => {
    const newRef = push(ref(rtdb, 'drivers'));
    const sanitizedData = {
      ...driverData,
      photo: `https://i.pravatar.cc/150?u=${newRef.key}`,
      epExpiry: driverData.epExpiry || null,
      medicalExpiry: driverData.medicalExpiry || null,
      safetyExpiry: driverData.safetyExpiry || null,
      sdpExpiry: driverData.sdpExpiry || null,
      woExpiry: driverData.woExpiry || null,
      labourContractExpiry: driverData.labourContractExpiry || null,
      wcPolicyExpiry: driverData.wcPolicyExpiry || null,
      licenseExpiry: driverData.licenseExpiry || null,
    };
    set(newRef, sanitizedData);
  }, []);

  const updateDriver = useCallback((driver: Driver) => {
    const { id, ...data } = driver;
    const sanitizedData = {
      ...data,
      epExpiry: data.epExpiry || null,
      medicalExpiry: data.medicalExpiry || null,
      safetyExpiry: data.safetyExpiry || null,
      sdpExpiry: data.sdpExpiry || null,
      woExpiry: data.woExpiry || null,
      labourContractExpiry: data.labourContractExpiry || null,
      wcPolicyExpiry: data.wcPolicyExpiry || null,
      licenseExpiry: data.licenseExpiry || null,
    };
    update(ref(rtdb, `drivers/${id}`), sanitizedData);
  }, []);

  const deleteDriver = useCallback((driverId: string) => {
    remove(ref(rtdb, `drivers/${driverId}`));
  }, []);

    const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    set(newRef, { buildingNumber, rooms: {} });
  }, []);

  const updateBuilding = useCallback((building: Building) => {
    update(ref(rtdb, `buildings/${building.id}`), { buildingNumber: building.buildingNumber });
  }, []);

  const deleteBuilding = useCallback((buildingId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}`));
  }, []);
  
  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    const newRoomRef = push(ref(rtdb, `buildings/${buildingId}/rooms`));
    const beds: { [key: string]: Bed } = {};
    for (let i = 0; i < roomData.numberOfBeds; i++) {
        const newBedRef = push(ref(rtdb, `buildings/${buildingId}/rooms/${newRoomRef.key}/beds`));
        beds[newBedRef.key!] = { id: newBedRef.key!, bedNumber: (i + 1).toString(), bedType: 'Bunk' };
    }
    set(newRoomRef, { id: newRoomRef.key, roomNumber: roomData.roomNumber, beds });
  }, []);

  const updateRoom = useCallback((buildingId: string, room: Room) => {
    const { id, ...data } = room;
    update(ref(rtdb, `buildings/${buildingId}/rooms/${id}`), { roomNumber: data.roomNumber });
  }, []);
  
  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}`));
  }, []);
  
  const addBed = useCallback((buildingId: string, roomId: string) => {
    const newBedRef = push(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds`));
    if (!newBedRef.key) return;

    get(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds`)).then(snapshot => {
      const beds = snapshot.val() || {};
      const bedCount = Object.keys(beds).length;
      const newBed = { id: newBedRef.key, bedNumber: (bedCount + 1).toString(), bedType: 'Bunk' as const };
      set(newBedRef, newBed);
    });
  }, []);

  const updateBed = useCallback((buildingId: string, roomId: string, bed: Bed) => {
    const { id, ...data } = bed;
    update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${id}`), data);
  }, []);
  
  const deleteBed = useCallback((buildingId: string, roomId: string, bedId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`));
  }, []);
  
  const assignOccupant = useCallback((buildingId: string, roomId: string, bedId: string, occupantId: string) => {
    const bedRef = ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`);
    update(bedRef, { occupantId });
  }, []);
  
  const unassignOccupant = useCallback((buildingId: string, roomId: string, bedId: string) => {
    const bedRef = ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`);
    update(bedRef, { occupantId: null });
  }, []);
  
  const updateNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    const result = await saveNotificationSettings(settings);
    if(result.success) {
        setNotificationSettings(settings);
    } else {
        toast({
            variant: "destructive",
            title: "Failed to save settings",
            description: result.error,
        });
    }
  }, [toast]);


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
    ];
    
    // Seed job codes
    get(ref(rtdb, 'jobCodes')).then(snapshot => {
        if (!snapshot.exists()) {
            const updates: { [key: string]: any } = {};
            INITIAL_JOB_CODES.forEach(jc => {
                const newRef = push(ref(rtdb, 'jobCodes'));
                updates[`/jobCodes/${newRef.key}`] = { ...jc, id: newRef.key };
            });
            update(ref(rtdb), updates);
        }
    });

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  const contextValue: GeneralContextType = {
    projects, jobCodes, activityLogs, announcements, broadcasts, incidentReports, downloadableDocuments, vehicles, drivers, buildings, notificationSettings,
    addProject, updateProject, deleteProject, addJobCode, updateJobCode, deleteJobCode,
    addAnnouncement, updateAnnouncement, approveAnnouncement, rejectAnnouncement, deleteAnnouncement, returnAnnouncement, dismissAnnouncement,
    addBroadcast, deleteBroadcast, dismissBroadcast,
    addIncidentReport, updateIncident, deleteIncidentReport, addIncidentComment, publishIncident, addUsersToIncidentReport, markIncidentAsViewed,
    addDocument, updateDocument, deleteDocument,
    addVehicle, updateVehicle, deleteVehicle,
    addDriver, updateDriver, deleteDriver,
    addBuilding, updateBuilding, deleteBuilding, addRoom, updateRoom, deleteRoom, addBed, updateBed, deleteBed, assignOccupant, unassignOccupant,
    updateNotificationSettings,
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
