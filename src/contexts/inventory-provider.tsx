'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { InventoryItem, UTMachine, DftMachine, MobileSim, LaptopDesktop, DigitalCamera, Anemometer, OtherEquipment, MachineLog, CertificateRequest, InventoryTransferRequest, PpeRequest, PpeStock, PpeHistoryRecord, PpeInwardRecord, TpCertList, InspectionChecklist, Comment, InternalRequest, InternalRequestStatus, InternalRequestItemStatus, IgpOgpRecord, PpeRequestStatus, Role, ConsumableInwardRecord, Directive, DirectiveStatus, DamageReport, User, NotificationSettings, DamageReportStatus } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useManpower } from './manpower-provider';
import { sendPpeRequestEmail } from '@/app/actions/sendPpeRequestEmail';
import { format, parseISO, isValid, isAfter } from 'date-fns';
import { useConsumable } from './consumable-provider';
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/storage';
import { normalizeGoogleDriveLink } from '@/lib/utils';

const db = getFirestore();

const createFirestoreListener = <T extends {}>(
    path: string,
    setData: React.Dispatch<React.SetStateAction<T[]>>,
) => {
    return onSnapshot(query(collection(db, path), where("isArchived", "==", false)), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(data);
    });
};

const _addInternalRequestComment = (
    requestId: string,
    commentText: string,
    user: User,
    internalRequestsById: Record<string, InternalRequest>,
    users: User[],
    notificationSettings: NotificationSettings,
    notify?: boolean,
    subject?: string
) => {
    if (!user) return;
    const request = internalRequestsById[requestId];
    if (!request) return;

    const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
    const newComment: Omit<Comment, 'id'> = {
        id: newCommentRef.key!,
        userId: user.id,
        text: commentText,
        date: new Date().toISOString(),
        eventId: requestId,
    };

    const updates: { [key: string]: any } = {};
    updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, viewedBy: { [user.id]: true } };
    updates[`internalRequests/${requestId}/acknowledgedByRequester`] = false;

    update(ref(rtdb), updates);

    if (notify) {
        const requester = users.find(u => u.id === request.requesterId);
        if (requester?.email && requester.id !== user.id) {
            const htmlBody = `
                <p>There is an update on your store request (ID: #${requestId.slice(-6)}).</p>
                <p><strong>From:</strong> ${user.name}</p>
                <p><strong>Message:</strong></p>
                <div style="padding: 10px; border-left: 3px solid #ccc;">${commentText}</div>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/my-requests">View Request</a></p>
            `;
            sendNotificationEmail({
                to: [requester.email],
                subject: subject || `Update on Store Request #${requestId.slice(-6)}`,
                htmlBody,
                notificationSettings,
                event: 'onInternalRequestUpdate',
                involvedUser: requester,
                creatorUser: user
            });
        }
    }
};


type InventoryContextType = {
  // New Firestore-based states
  harnesses: InventoryItem[];
  tripods: InventoryItem[];
  lifelines: InventoryItem[];
  gasDetectors: InventoryItem[];
  
  inventoryItems: InventoryItem[];
  utMachines: UTMachine[];
  dftMachines: DftMachine[];
  mobileSims: MobileSim[];
  laptopsDesktops: LaptopDesktop[];
  digitalCameras: DigitalCamera[];
  anemometers: Anemometer[];
  otherEquipments: OtherEquipment[];
  machineLogs: MachineLog[];
  certificateRequests: CertificateRequest[];
  internalRequests: InternalRequest[];
  inventoryTransferRequests: InventoryTransferRequest[];
  ppeRequests: PpeRequest[];
  ppeStock: PpeStock[];
  ppeInwardHistory: PpeInwardRecord[];
  consumableInwardHistory: ConsumableInwardRecord[];
  tpCertLists: TpCertList[];
  inspectionChecklists: InspectionChecklist[];
  igpOgpRecords: IgpOgpRecord[];
  directives: Directive[];
  damageReports: DamageReport[];

  addInventoryRow: (category: string) => void;
  deleteInventoryItems: (itemIds: string[], category: string) => void;
  updateInventoryItem: (item: Partial<InventoryItem> & { id: string }, category: string) => void;

  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItemGroup: (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => void;
  updateInventoryItemGroupByProject: (itemName: string, projectId: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => void;
  updateMultipleInventoryItems: (itemsData: any[]) => number;
  deleteInventoryItem: (itemId: string) => void;
  deleteInventoryItemGroup: (itemName: string) => void;
  renameInventoryItemGroup: (oldName: string, newName: string) => void;
  revalidateExpiredItems: () => void;
  
  addInventoryTransferRequest: (request: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => void;
  updateInventoryTransferRequest: (request: InventoryTransferRequest) => void;
  deleteInventoryTransferRequest: (requestId: string) => void;
  approveInventoryTransferRequest: (request: InventoryTransferRequest, createTpList: boolean) => void;
  rejectInventoryTransferRequest: (requestId: string, comment: string) => void;
  disputeInventoryTransfer: (requestId: string, comment: string) => void;
  acknowledgeTransfer: (requestId: string) => void;
  clearInventoryTransferHistory: () => void;
  resolveInternalRequestDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => void;

  addCertificateRequest: (requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => void;
  fulfillCertificateRequest: (requestId: string, comment: string) => void;
  addCertificateRequestComment: (requestId: string, comment: string) => void;
  markFulfilledRequestsAsViewed: (requestType: 'store' | 'equipment') => void;
  acknowledgeFulfilledRequest: (requestId: string) => void;
  
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => void;
  updateUTMachine: (machine: UTMachine) => void;
  deleteUTMachine: (machineId: string) => void;
  
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => void;
  updateDftMachine: (machine: DftMachine) => void;
  deleteDftMachine: (machineId: string) => void;

  addMobileSim: (item: Omit<MobileSim, 'id'>) => void;
  updateMobileSim: (item: MobileSim) => void;
  deleteMobileSim: (itemId: string) => void;

  addLaptopDesktop: (item: Omit<LaptopDesktop, 'id'>) => void;
  updateLaptopDesktop: (item: LaptopDesktop) => void;
  deleteLaptopDesktop: (itemId: string) => void;

  addDigitalCamera: (camera: Omit<DigitalCamera, 'id'>) => void;
  updateDigitalCamera: (camera: DigitalCamera) => void;
  deleteDigitalCamera: (cameraId: string) => void;

  addAnemometer: (anemometer: Omit<Anemometer, 'id'>) => void;
  updateAnemometer: (anemometer: Anemometer) => void;
  deleteAnemometer: (anemometerId: string) => void;

  addOtherEquipment: (equipment: Omit<OtherEquipment, 'id'>) => void;
  updateOtherEquipment: (equipment: OtherEquipment) => void;
  deleteOtherEquipment: (equipmentId: string) => void;
  
  addMachineLog: (log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => void;
  deleteMachineLog: (logId: string) => void;
  getMachineLogs: (machineId: string) => MachineLog[];

  addInternalRequest: (requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  deleteInternalRequest: (requestId: string) => void;
  forceDeleteInternalRequest: (requestId: string) => void;
  addInternalRequestComment: (requestId: string, commentText: string, notify?: boolean, subject?: string) => void;
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus) => void;
  updateInternalRequestItemStatus: (requestId: string, itemId: string, status: InternalRequestItemStatus, comment?: string) => void;
  updateInternalRequestItem: (requestId: string, updatedItem: InternalRequestItem, originalItem: InternalRequestItem, reason?: string) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  acknowledgeInternalRequest: (requestId: string) => void;

  addPpeRequest: (request: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updatePpeRequest: (request: PpeRequest, reason?: string) => void;
  updatePpeRequestStatus: (requestId: string, status: PpeRequestStatus, comment: string) => void;
  addPpeRequestComment: (requestId: string, commentText: string, notify?: boolean) => void;
  resolvePpeDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => void;
  deletePpeRequest: (requestId: string) => void;
  deletePpeAttachment: (requestId: string) => void;
  markPpeRequestAsViewed: (requestId: string) => void;
  updatePpeStock: (stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => void;
  addPpeInwardRecord: (record: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => void;
  updatePpeInwardRecord: (record: PpeInwardRecord) => void;
  deletePpeInwardRecord: (record: PpeInwardRecord) => void;
  
  addTpCertList: (listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => void;
  updateTpCertList: (listData: TpCertList) => void;
  deleteTpCertList: (listId: string) => void;

  addInspectionChecklist: (checklist: Omit<InspectionChecklist, 'id'>) => void;
  updateInspectionChecklist: (checklist: InspectionChecklist) => void;
  deleteInspectionChecklist: (id: string) => void;

  addIgpOgpRecord: (record: Omit<IgpOgpRecord, 'id' | 'creatorId'>) => void;
  deleteIgpOgpRecord: (mrnNumber: string) => void;

  addDamageReport: (reportData: Omit<DamageReport, 'id' | 'reporterId' | 'reportDate' | 'status' | 'attachmentDownloadUrl'>) => Promise<{ success: boolean; error?: string }>;
  updateDamageReportStatus: (reportId: string, status: DamageReportStatus, comment?: string) => void;
  deleteDamageReport: (reportId: string) => void;
  deleteAllDamageReportsAndFiles: () => void;

  pendingConsumableRequestCount: number;
  updatedConsumableRequestCount: number;
  pendingGeneralRequestCount: number;
  updatedGeneralRequestCount: number;
  pendingPpeRequestCount: number;
  updatedPpeRequestCount: number;
};

const createDataListenerRTDB = <T extends {}>(
    path: string,
    setData: React.Dispatch<React.SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        const processedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { ...data[key], id: key };
            return acc;
        }, {} as Record<string, T>);
        setData(processedData);
    });
    return unsubscribe;
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
    const { user, addActivityLog } = useAuth();
    const { projects, notificationSettings, managementRequests, users } = useGeneral();
    const { manpowerProfiles } = useManpower();
    const { toast } = useToast();
    const { consumableItems, consumableInwardHistory } = useConsumable();

    // Firestore states
    const [harnesses, setHarnesses] = useState<InventoryItem[]>([]);
    const [tripods, setTripods] = useState<InventoryItem[]>([]);
    const [lifelines, setLifelines] = useState<InventoryItem[]>([]);
    const [gasDetectors, setGasDetectors] = useState<InventoryItem[]>([]);
    
    // RTDB states
    const [utMachinesById, setUtMachinesById] = useState<Record<string, UTMachine>>({});
    const [dftMachinesById, setDftMachinesById] = useState<Record<string, DftMachine>>({});
    const [mobileSimsById, setMobileSimsById] = useState<Record<string, MobileSim>>({});
    const [laptopsDesktopsById, setLaptopsDesktopsById] = useState<Record<string, LaptopDesktop>>({});
    const [digitalCamerasById, setDigitalCamerasById] = useState<Record<string, DigitalCamera>>({});
    const [anemometersById, setAnemometersById] = useState<Record<string, Anemometer>>({});
    const [otherEquipmentsById, setOtherEquipmentsById] = useState<Record<string, OtherEquipment>>({});
    const [machineLogsById, setMachineLogsById] = useState<Record<string, MachineLog>>({});
    const [certificateRequestsById, setCertificateRequestsById] = useState<Record<string, CertificateRequest>>({});
    const [internalRequestsById, setInternalRequestsById] = useState<Record<string, InternalRequest>>({});
    const [inventoryTransferRequestsById, setInventoryTransferRequestsById] = useState<Record<string, InventoryTransferRequest>>({});
    const [ppeRequestsById, setPpeRequestsById] = useState<Record<string, PpeRequest>>({});
    const [ppeStockById, setPpeStockById] = useState<Record<string, PpeStock>>({});
    const [ppeInwardHistoryById, setPpeInwardHistoryById] = useState<Record<string, PpeInwardRecord>>({});
    const [tpCertListsById, setTpCertListsById] = useState<Record<string, TpCertList>>({});
    const [inspectionChecklistsById, setInspectionChecklistsById] = useState<Record<string, InspectionChecklist>>({});
    const [igpOgpRecordsById, setIgpOgpRecordsById] = useState<Record<string, IgpOgpRecord>>({});
    const [damageReportsById, setDamageReportsById] = useState<Record<string, DamageReport>>({});
    const [directives, setDirectives] = useState<Directive[]>([]);
    
    // Memos
    const inventoryItems = useMemo(() => [...harnesses, ...tripods, ...lifelines, ...gasDetectors], [harnesses, tripods, lifelines, gasDetectors]);
    const utMachines = useMemo(() => Object.values(utMachinesById), [utMachinesById]);
    const dftMachines = useMemo(() => Object.values(dftMachinesById), [dftMachinesById]);
    const mobileSims = useMemo(() => Object.values(mobileSimsById), [mobileSimsById]);
    const laptopsDesktops = useMemo(() => Object.values(laptopsDesktopsById), [laptopsDesktopsById]);
    const digitalCameras = useMemo(() => Object.values(digitalCamerasById), [digitalCamerasById]);
    const anemometers = useMemo(() => Object.values(anemometersById), [anemometersById]);
    const otherEquipments = useMemo(() => Object.values(otherEquipmentsById), [otherEquipmentsById]);
    const machineLogs = useMemo(() => Object.values(machineLogsById), [machineLogsById]);
    const certificateRequests = useMemo(() => Object.values(certificateRequestsById), [certificateRequestsById]);
    const internalRequests = useMemo(() => Object.values(internalRequestsById), [internalRequestsById]);
    const inventoryTransferRequests = useMemo(() => Object.values(inventoryTransferRequestsById), [inventoryTransferRequestsById]);
    const ppeRequests = useMemo(() => Object.values(ppeRequestsById), [ppeRequestsById]);
    const ppeStock = useMemo(() => Object.values(ppeStockById), [ppeStockById]);
    const ppeInwardHistory = useMemo(() => Object.values(ppeInwardHistoryById), [ppeInwardHistoryById]);
    const tpCertLists = useMemo(() => Object.values(tpCertListsById), [tpCertListsById]);
    const inspectionChecklists = useMemo(() => Object.values(inspectionChecklistsById), [inspectionChecklistsById]);
    const igpOgpRecords = useMemo(() => Object.values(igpOgpRecordsById), [igpOgpRecordsById]);
    const damageReports = useMemo(() => Object.values(damageReportsById), [damageReportsById]);
    
    const consumableItemIds = useMemo(() => new Set(consumableItems.map(item => item.id)), [consumableItems]);

    const { 
        pendingConsumableRequestCount, updatedConsumableRequestCount,
        pendingGeneralRequestCount, updatedGeneralRequestCount
    } = useMemo(() => {
        if (!user) return { pendingConsumableRequestCount: 0, updatedConsumableRequestCount: 0, pendingGeneralRequestCount: 0, updatedGeneralRequestCount: 0 };
        
        let pendingConsumable = 0, updatedConsumable = 0;
        let pendingGeneral = 0, updatedGeneral = 0;
        
        const isStoreApprover = can.approve_store_requests;

        internalRequests.forEach(r => {
            const isConsumable = r.items?.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId));
            
            if (isStoreApprover && (r.status === 'Pending' || r.status === 'Partially Approved')) {
                if (isConsumable) pendingConsumable++;
                else pendingGeneral++;
            }

            if (r.requesterId === user.id) {
                const isRejectedButActive = r.status === 'Rejected' && !r.acknowledgedByRequester;
                const isStandardUpdate = (r.status === 'Approved' || r.status === 'Issued' || r.status === 'Partially Issued' || r.status === 'Partially Approved') && !r.acknowledgedByRequester;
                
                if (isRejectedButActive || isStandardUpdate) {
                    if (isConsumable) updatedConsumable++;
                    else updatedGeneral++;
                }
            }
        });
        
        return { pendingConsumableRequestCount: pendingConsumable, updatedConsumableRequestCount: updatedConsumable, pendingGeneralRequestCount: pendingGeneral, updatedGeneralRequestCount: updatedGeneral };
    }, [user, internalRequests, can.approve_store_requests, consumableItemIds]);

    const { pendingPpeRequestCount, updatedPpeRequestCount } = useMemo(() => {
        if (!user) return { pendingPpeRequestCount: 0, updatedPpeRequestCount: 0 };
    
        const canApprove = ['Admin', 'Manager'].includes(user.role);
        const canIssue = ['Store in Charge', 'Assistant Store Incharge', 'Admin', 'Project Coordinator'].includes(user.role);
    
        const pendingApproval = canApprove ? ppeRequests.filter(r => r.status === 'Pending').length : 0;
        const pendingIssuance = canIssue ? ppeRequests.filter(r => r.status === 'Approved').length : 0;
        const pendingDisputes = (canApprove || canIssue) ? ppeRequests.filter(r => r.status === 'Disputed').length : 0;
        
        const myRequests = ppeRequests.filter(r => r.requesterId === user.id);
        const myUpdates = myRequests.filter(r => 
            (r.status === 'Approved' || r.status === 'Rejected' || r.status === 'Issued') && !r.viewedByRequester
        ).length;

        const myQueries = myRequests.filter(req => {
            const comments = req.comments ? (Array.isArray(req.comments) ? req.comments : Object.values(req.comments)) : [];
            const lastComment = comments[comments.length - 1];
            return lastComment && lastComment.userId !== user.id && !req.viewedByRequester;
        }).length;

        return {
            pendingPpeRequestCount: pendingApproval + pendingIssuance + pendingDisputes,
            updatedPpeRequestCount: myUpdates + myQueries
        };
    }, [user, ppeRequests]);
    
    const addInternalRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean, subject?: string) => {
        if (!user) return;
        _addInternalRequestComment(requestId, commentText, user, internalRequestsById, users, notificationSettings, notify, subject);
    }, [user, internalRequestsById, users, notificationSettings]);

    const addPpeRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean) => {
        if (!user) return;
        const request = ppeRequestsById[requestId];
        if (!request) return;
    
        const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
        
        const updates: {[key: string]: any} = {};
        updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
        
        update(ref(rtdb), updates);
    }, [user, ppeRequestsById]);

    const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        updates[`ppeRequests/${requestId}/status`] = status;
        updates[`ppeRequests/${requestId}/approverId`] = user.id;
        updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
        
        if (status === 'Issued') {
            const request = ppeRequestsById[requestId];
            const stockPath = request.ppeType === 'Coverall' ? `ppeStock/coveralls/sizes/${request.size}` : `ppeStock/safetyShoes/quantity`;
            get(ref(rtdb, stockPath)).then(snapshot => {
                const currentStock = snapshot.val() || 0;
                const newStock = Math.max(0, currentStock - (request.quantity || 1));
                updates[stockPath] = newStock;
                
                const historyRef = push(ref(rtdb, `manpowerProfiles/${request.manpowerId}/ppeHistory`));
                updates[`manpowerProfiles/${request.manpowerId}/ppeHistory/${historyRef.key}`] = {
                    id: historyRef.key,
                    ppeType: request.ppeType,
                    size: request.size,
                    quantity: request.quantity || 1,
                    issueDate: new Date().toISOString(),
                    requestType: request.requestType,
                    remarks: request.remarks,
                    storeComment: comment,
                    requestId: requestId,
                    issuedById: user.id,
                };

                update(ref(rtdb), updates);
            });
        } else {
            update(ref(rtdb), updates);
        }

        addPpeRequestComment(requestId, `Status changed to ${status}. ${comment}`, true);
    }, [user, ppeRequestsById, addPpeRequestComment]);
    
    // Firestore Functions
    const addInventoryRow = useCallback(async (category: string) => {
      if (!user) return;
      const collectionName = `inventory_${category.toLowerCase().replace(' ', '_')}`;
      try {
        await addDoc(collection(db, collectionName), {
          name: category,
          serialNumber: 'Double-click to add',
          ariesId: '',
          status: 'Idle',
          projectId: '',
          inspectionDueDate: null,
          tpInspectionDueDate: null,
          lastUpdated: serverTimestamp(),
          createdBy: user.id,
          isArchived: false
        });
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    }, [user]);

    const deleteInventoryItems = useCallback(async (itemIds: string[], category: string) => {
      if (!user || !can.manage_inventory_database) return;
      const collectionName = `inventory_${category.toLowerCase().replace(' ', '_')}`;
      const batch = writeBatch(db);
      itemIds.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.update(docRef, { isArchived: true });
      });
      await batch.commit();
      toast({ title: `${itemIds.length} item(s) deleted.` });
    }, [user, can.manage_inventory_database, toast]);

    const updateInventoryItem = useCallback(async (item: Partial<InventoryItem> & { id: string }, category: string) => {
      if (!user || !can.manage_inventory_database) return;
      const collectionName = `inventory_${category.toLowerCase().replace(' ', '_')}`;
      const { id, ...data } = item;
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, { ...data, lastUpdated: serverTimestamp() });
    }, [user, can.manage_inventory_database]);

    // Dummy implementations for RTDB functions to avoid breaking changes
    const addInventoryItem = () => {};
    const addMultipleInventoryItems = (): number => 0;
    const updateInventoryItemGroup = () => {};
    const updateInventoryItemGroupByProject = () => {};
    const updateMultipleInventoryItems = (): number => 0;
    const deleteInventoryItem = () => {};
    const deleteInventoryItemGroup = () => {};
    const renameInventoryItemGroup = () => {};
    const revalidateExpiredItems = () => {};
    const addInventoryTransferRequest = () => {};
    const updateInventoryTransferRequest = () => {};
    const deleteInventoryTransferRequest = () => {};
    const approveInventoryTransferRequest = () => {};
    const rejectInventoryTransferRequest = () => {};
    const disputeInventoryTransfer = () => {};
    const acknowledgeTransfer = () => {};
    const clearInventoryTransferHistory = () => {};
    const resolveInternalRequestDispute = () => {};
    const addCertificateRequest = () => {};
    const fulfillCertificateRequest = () => {};
    const addCertificateRequestComment = () => {};
    const markFulfilledRequestsAsViewed = () => {};
    const acknowledgeFulfilledRequest = () => {};
    const addUTMachine = () => {};
    const updateUTMachine = () => {};
    const deleteUTMachine = () => {};
    const addDftMachine = () => {};
    const updateDftMachine = () => {};
    const deleteDftMachine = () => {};
    const addMobileSim = () => {};
    const updateMobileSim = () => {};
    const deleteMobileSim = () => {};
    const addLaptopDesktop = () => {};
    const updateLaptopDesktop = () => {};
    const deleteLaptopDesktop = () => {};
    const addDigitalCamera = () => {};
    const updateDigitalCamera = () => {};
    const deleteDigitalCamera = () => {};
    const addAnemometer = () => {};
    const updateAnemometer = () => {};
    const deleteAnemometer = () => {};
    const addOtherEquipment = () => {};
    const updateOtherEquipment = () => {};
    const deleteOtherEquipment = () => {};
    const addMachineLog = () => {};
    const deleteMachineLog = () => {};
    const getMachineLogs = (): MachineLog[] => [];
    const addInternalRequest = () => {};
    const deleteInternalRequest = () => {};
    const forceDeleteInternalRequest = () => {};
    const updateInternalRequestStatus = () => {};
    const updateInternalRequestItemStatus = () => {};
    const updateInternalRequestItem = () => {};
    const markInternalRequestAsViewed = () => {};
    const acknowledgeInternalRequest = () => {};
    const addPpeRequest = () => {};
    const updatePpeRequest = () => {};
    const updatePpeRequestStatus = () => {};
    const resolvePpeDispute = () => {};
    const deletePpeRequest = () => {};
    const deletePpeAttachment = () => {};
    const markPpeRequestAsViewed = () => {};
    const updatePpeStock = () => {};
    const addPpeInwardRecord = () => {};
    const updatePpeInwardRecord = () => {};
    const deletePpeInwardRecord = () => {};
    const addTpCertList = () => {};
    const updateTpCertList = () => {};
    const deleteTpCertList = () => {};
    const addInspectionChecklist = () => {};
    const updateInspectionChecklist = () => {};
    const deleteInspectionChecklist = () => {};
    const addIgpOgpRecord = () => {};
    const deleteIgpOgpRecord = () => {};
    const addDamageReport = async (): Promise<{ success: boolean; error?: string }> => ({ success: false, error: "Not implemented" });
    const updateDamageReportStatus = () => {};
    const deleteDamageReport = () => {};
    const deleteAllDamageReportsAndFiles = () => {};
    
    useEffect(() => {
        const unsubs: (()=>void)[] = [];
        // Firestore Listeners
        unsubs.push(createFirestoreListener('inventory_harness', setHarnesses));
        unsubs.push(createFirestoreListener('inventory_tripod', setTripods));
        unsubs.push(createFirestoreListener('inventory_lifeline', setLifelines));
        unsubs.push(createFirestoreListener('inventory_gas_detectors', setGasDetectors));
        // RTDB Listeners
        unsubs.push(createDataListenerRTDB('utMachines', setUtMachinesById));
        unsubs.push(createDataListenerRTDB('dftMachines', setDftMachinesById));
        unsubs.push(createDataListenerRTDB('mobileSims', setMobileSimsById));
        unsubs.push(createDataListenerRTDB('laptopsDesktops', setLaptopsDesktopsById));
        unsubs.push(createDataListenerRTDB('digitalCameras', setDigitalCamerasById));
        unsubs.push(createDataListenerRTDB('anemometers', setAnemometersById));
        unsubs.push(createDataListenerRTDB('otherEquipments', setOtherEquipmentsById));
        unsubs.push(createDataListenerRTDB('machineLogs', setMachineLogsById));
        unsubs.push(createDataListenerRTDB('certificateRequests', setCertificateRequestsById));
        unsubs.push(createDataListenerRTDB('internalRequests', setInternalRequestsById));
        unsubs.push(createDataListenerRTDB('inventoryTransferRequests', setInventoryTransferRequestsById));
        unsubs.push(createDataListenerRTDB('ppeRequests', setPpeRequestsById));
        unsubs.push(createDataListenerRTDB('ppeStock', setPpeStockById));
        unsubs.push(createDataListenerRTDB('ppeInwardHistory', setPpeInwardHistoryById));
        unsubs.push(createDataListenerRTDB('tpCertLists', setTpCertListsById));
        unsubs.push(createDataListenerRTDB('inspectionChecklists', setInspectionChecklistsById));
        unsubs.push(createDataListenerRTDB('igpOgpRecords', setIgpOgpRecordsById));
        unsubs.push(createDataListenerRTDB('damageReports', setDamageReportsById));

        return () => unsubs.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: InventoryContextType = {
        harnesses, tripods, lifelines, gasDetectors,
        inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, internalRequests, managementRequests, inventoryTransferRequests, ppeRequests, ppeStock, ppeInwardHistory, tpCertLists, inspectionChecklists, igpOgpRecords, consumableInwardHistory, directives: [], damageReports,
        addInventoryRow, deleteInventoryItems, updateInventoryItem, addInventoryItem, addMultipleInventoryItems, updateInventoryItemGroup, updateInventoryItemGroupByProject, updateMultipleInventoryItems, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup, revalidateExpiredItems,
        addInventoryTransferRequest, updateInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory,
        addCertificateRequest, fulfillCertificateRequest, addCertificateRequestComment, markFulfilledRequestsAsViewed, acknowledgeFulfilledRequest,
        addUTMachine, updateUTMachine, deleteUTMachine,
        addDftMachine, updateDftMachine, deleteDftMachine,
        addMobileSim, updateMobileSim, deleteMobileSim,
        addLaptopDesktop, updateLaptopDesktop, deleteLaptopDesktop,
        addDigitalCamera, updateDigitalCamera, deleteDigitalCamera,
        addAnemometer, updateAnemometer, deleteAnemometer,
        addOtherEquipment, updateOtherEquipment, deleteOtherEquipment,
        addMachineLog, deleteMachineLog, getMachineLogs,
        addInternalRequest, deleteInternalRequest, forceDeleteInternalRequest, addInternalRequestComment, updateInternalRequestStatus, updateInternalRequestItemStatus, updateInternalRequestItem, markInternalRequestAsViewed, acknowledgeInternalRequest,
        addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed,
        updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord,
        addTpCertList, updateTpCertList, deleteTpCertList,
        addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
        addIgpOgpRecord, deleteIgpOgpRecord, addDamageReport, updateDamageReportStatus,
        pendingConsumableRequestCount, updatedConsumableRequestCount,
        pendingGeneralRequestCount, updatedGeneralRequestCount,
        pendingPpeRequestCount, updatedPpeRequestCount,
        resolveInternalRequestDispute,
        deleteDamageReport,
        deleteAllDamageReportsAndFiles,
    };

    return <InventoryContext.Provider value={contextValue}>{children}</InventoryContext.Provider>;
}

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
