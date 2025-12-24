

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { InventoryItem, UTMachine, DftMachine, MobileSim, LaptopDesktop, DigitalCamera, Anemometer, OtherEquipment, MachineLog, CertificateRequest, InventoryTransferRequest, PpeRequest, PpeStock, PpeHistoryRecord, PpeInwardRecord, TpCertList, InspectionChecklist, Comment, InternalRequest, InternalRequestItem, InternalRequestStatus, InternalRequestItemStatus, IgpOgpRecord, ManagementRequest, ManagementRequestStatus, PpeRequestStatus, Role, ConsumableInwardRecord, Directive, DirectiveStatus, DamageReport, User, NotificationSettings, DamageReportStatus } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useManpower } from './manpower-provider';
import { sendPpeRequestEmail } from '@/app/actions/sendPpeRequestEmail';
import { format, parseISO, isValid } from 'date-fns';
import { useConsumable } from './consumable-provider';
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/lib/storage';

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
  managementRequests: ManagementRequest[];
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

  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => void;
  addMultipleInventoryItems: (items: any[]) => number;
  updateInventoryItem: (item: InventoryItem) => void;
  updateInventoryItemGroup: (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => void;
  updateInventoryItemGroupByProject: (itemName: string, projectId: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => void;
  updateMultipleInventoryItems: (itemsData: any[]) => number;
  deleteInventoryItem: (itemId: string) => void;
  deleteInventoryItemGroup: (itemName: string) => void;
  renameInventoryItemGroup: (oldName: string, newName: string) => void;
  
  addInventoryTransferRequest: (request: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => void;
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
  updateInternalRequestItem: (requestId: string, updatedItem: InternalRequestItem, originalItem: InternalRequestItem) => void;
  markInternalRequestAsViewed: (requestId: string) => void;
  acknowledgeInternalRequest: (requestId: string) => void;

  addManagementRequest: (requestData: Omit<ManagementRequest, 'id'|'creatorId'|'lastUpdated'|'status'|'comments'|'readBy'>) => void;
  updateManagementRequest: (request: ManagementRequest, comment: string) => void;
  forwardManagementRequest: (originalRequest: ManagementRequest, forwardData: { toUserId: string; ccUserIds: string[]; body: string; }) => void;
  deleteManagementRequest: (requestId: string) => void;
  addManagementRequestComment: (requestId: string, commentText: string, ccUserIds?: string[]) => void;
  markManagementRequestAsViewed: (requestId: string) => void;

  addPpeRequest: (request: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => void;
  updatePpeRequest: (request: PpeRequest) => void;
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

  addDamageReport: (reportData: Pick<DamageReport, 'itemId' | 'otherItemName' | 'reason'> & { attachment?: File }) => Promise<{ success: boolean; error?: string }>;
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

const createDataListener = <T extends {}>(
    path: string,
    setData: React.Dispatch<React.SetStateAction<Record<string, T>>>,
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

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
    const { user, users, can, addActivityLog } = useAuth();
    const { projects, notificationSettings } = useGeneral();
    const { manpowerProfiles } = useManpower();
    const { toast } = useToast();
    const { consumableItems, consumableInwardHistory } = useConsumable();

    // State
    const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
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
    const [managementRequestsById, setManagementRequestsById] = useState<Record<string, ManagementRequest>>({});
    const [damageReportsById, setDamageReportsById] = useState<Record<string, DamageReport>>({});
    const [directives, setDirectives] = useState<Directive[]>([]);
    
    // Memos
    const inventoryItems = useMemo(() => Object.values(inventoryItemsById), [inventoryItemsById]);
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
    const managementRequests = useMemo(() => Object.values(managementRequestsById), [managementRequestsById]);
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

    const addManagementRequestComment = useCallback((requestId: string, commentText: string, ccUserIds: string[] = []) => {
        if (!user) return;
        const request = managementRequestsById[requestId];
        if (!request) return;
    
        const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = {
            id: newCommentRef.key!,
            userId: user.id,
            text: commentText,
            date: new Date().toISOString(),
            eventId: requestId
        };
        
        const allRecipientIds = new Set([request.creatorId, request.toUserId, ...(request.ccUserIds || []), ...ccUserIds]);
        const updates: { [key: string]: any } = {};
        updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment, viewedBy: { [user.id]: true } };
        updates[`managementRequests/${requestId}/lastUpdated`] = new Date().toISOString();
        
        allRecipientIds.forEach(id => {
            if (id !== user.id) {
                updates[`managementRequests/${requestId}/readBy/${id}`] = false;
            }
        });
    
        if (ccUserIds.length > 0) {
            updates[`managementRequests/${requestId}/ccUserIds`] = Array.from(new Set([...(request.ccUserIds || []), ...ccUserIds]));
        }
    
        update(ref(rtdb), updates);

        const emailRecipients = Array.from(allRecipientIds)
            .filter(id => id !== user.id)
            .map(id => users.find(u => u.id === id)?.email)
            .filter((email): email is string => !!email);

        if (emailRecipients.length > 0) {
            const htmlBody = `
                <p>There is a new reply on the request: <strong>${request.subject}</strong></p>
                <p><strong>From:</strong> ${user.name}</p>
                <p><strong>Message:</strong></p>
                <div style="padding: 10px; border-left: 3px solid #ccc;">${commentText}</div>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/management-requests">View Request</a></p>
            `;
            sendNotificationEmail({
                to: emailRecipients,
                subject: `Re: ${request.subject}`,
                htmlBody,
                notificationSettings,
                event: 'onTaskComment', 
            });
        }
    }, [user, managementRequestsById, users, notificationSettings]);

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
    
    // Functions
    const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
        if(!user) return;
        const newRef = push(ref(rtdb, 'inventoryItems'));
        const dataToSave = { 
            ...itemData, 
            chestCrollNo: itemData.chestCrollNo || null,
            lastUpdated: new Date().toISOString(),
            movedToProjectId: itemData.movedToProjectId || null,
            erpId: itemData.erpId || null,
            certification: itemData.certification || null,
            purchaseDate: itemData.purchaseDate || null,
        };
        set(newRef, dataToSave);
        addActivityLog(user.id, 'Inventory Item Added', `${itemData.name} (SN: ${itemData.serialNumber})`);
    }, [user, addActivityLog]);

    const addMultipleInventoryItems = useCallback((itemsData: any[]): number => {
        let importedCount = 0;
        const updates: { [key: string]: any } = {};

        itemsData.forEach(row => {
            const serialNumber = row['SERIAL NUMBER'];
            if (!serialNumber) return;

            const existingItem = inventoryItems.find(i => i.serialNumber === serialNumber);
            if (existingItem) return; // Skip existing items
            
            const parseDateExcel = (date: any): string | null => {
                if (date instanceof Date && isValid(date)) {
                    return date.toISOString();
                }
                return null;
            }

            const dataToSave: Partial<InventoryItem> = {
                name: row['ITEM NAME'] || '',
                serialNumber: serialNumber,
                chestCrollNo: row['CHEST CROLL NO'] || null,
                ariesId: row['ARIES ID'] || '',
                inspectionDate: parseDateExcel(row['INSPECTION DATE']),
                inspectionDueDate: parseDateExcel(row['INSPECTION DUE DATE']),
                tpInspectionDueDate: parseDateExcel(row['TP INSPECTION DUE DATE']),
                status: row['STATUS'] || 'In Store',
                projectId: projects.find(p => p.name === row['PROJECT'])?.id || projects[0].id,
                certificateUrl: row['TP Certificate Link'] || '',
                inspectionCertificateUrl: row['Inspection Certificate Link'] || '',
                lastUpdated: new Date().toISOString()
            };
            
            const newRef = push(ref(rtdb, 'inventoryItems'));
            updates[`/inventoryItems/${newRef.key}`] = dataToSave;
            importedCount++;
        });

        if(Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
        return importedCount;
    }, [inventoryItems, projects]);

    const updateInventoryItem = useCallback((item: InventoryItem) => {
        const { id, ...data } = item;
        const updates = { 
            ...data, 
            lastUpdated: new Date().toISOString(),
            movedToProjectId: data.movedToProjectId || null,
            chestCrollNo: data.chestCrollNo || null,
            erpId: data.erpId || null,
            certification: data.certification || null,
            purchaseDate: data.purchaseDate || null,
        };
        update(ref(rtdb, `inventoryItems/${id}`), updates);
    }, []);
    
    const updateInventoryItemGroup = useCallback((itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => {
        const itemsToUpdate = inventoryItems.filter(item => item.name === itemName && item.tpInspectionDueDate === originalDueDate);
        if(itemsToUpdate.length === 0) return;
        const dbUpdates: { [key: string]: any } = {};
        itemsToUpdate.forEach(item => {
            dbUpdates[`/inventoryItems/${item.id}/tpInspectionDueDate`] = updates.tpInspectionDueDate || item.tpInspectionDueDate;
            dbUpdates[`/inventoryItems/${item.id}/certificateUrl`] = updates.certificateUrl || item.certificateUrl;
        });
        update(ref(rtdb), dbUpdates);
    }, [inventoryItems]);

    const updateInventoryItemGroupByProject = useCallback((itemName: string, projectId: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => {
        const itemsToUpdate = inventoryItems.filter(item => item.name === itemName && item.projectId === projectId);
        if(itemsToUpdate.length === 0) return;
        const dbUpdates: { [key: string]: any } = {};
        itemsToUpdate.forEach(item => {
            dbUpdates[`/inventoryItems/${item.id}/inspectionDate`] = updates.inspectionDate || item.inspectionDate;
            dbUpdates[`/inventoryItems/${item.id}/inspectionDueDate`] = updates.inspectionDueDate || item.inspectionDueDate;
            dbUpdates[`/inventoryItems/${item.id}/inspectionCertificateUrl`] = updates.inspectionCertificateUrl || item.inspectionCertificateUrl;
            dbUpdates[`/inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
        });
        update(ref(rtdb), dbUpdates);
    }, [inventoryItems]);

    const updateMultipleInventoryItems = useCallback((itemsData: any[]): number => {
        let updatedCount = 0;
        const updates: { [key: string]: any } = {};
    
        const parseDateExcel = (date: any): string | null | undefined => {
            if (!date) return undefined; 
            if (date instanceof Date && isValid(date)) {
                return date.toISOString();
            }
            return undefined;
        }
    
        itemsData.forEach(row => {
            const serialNumber = String(row['SERIAL NUMBER'] || '').trim();
            if (!serialNumber) return;
    
            const existingItem = inventoryItems.find(i => String(i.serialNumber) === serialNumber);
            if (!existingItem) return;
    
            const dataToSave: Partial<InventoryItem> = {};
            
            const fieldsToUpdate: (keyof InventoryItem)[] = ['name', 'chestCrollNo', 'ariesId', 'status', 'certificateUrl', 'inspectionCertificateUrl'];
            const excelHeaderMap: Record<string, keyof InventoryItem> = {
                'ITEM NAME': 'name',
                'CHEST CROLL NO': 'chestCrollNo',
                'ARIES ID': 'ariesId',
                'STATUS': 'status',
                'TP Certificate Link': 'certificateUrl',
                'Inspection Certificate Link': 'inspectionCertificateUrl',
            };
    
            Object.keys(excelHeaderMap).forEach(header => {
                const key = excelHeaderMap[header];
                if (row[header] !== undefined && row[header] !== '') {
                    (dataToSave as any)[key] = row[header];
                }
            });
    
            if (row['PROJECT']) {
                const project = projects.find(p => p.name === row['PROJECT']);
                if (project) dataToSave.projectId = project.id;
            }
    
            const dateFields: Record<string, keyof InventoryItem> = {
                'INSPECTION DATE': 'inspectionDate',
                'INSPECTION DUE DATE': 'inspectionDueDate',
                'TP INSPECTION DUE DATE': 'tpInspectionDueDate',
            };
    
            Object.keys(dateFields).forEach(header => {
                const key = dateFields[header];
                const parsedDate = parseDateExcel(row[header]);
                if(parsedDate !== undefined) {
                    (dataToSave as any)[key] = parsedDate;
                }
            });
    
            if (Object.keys(dataToSave).length > 0) {
                dataToSave.lastUpdated = new Date().toISOString();
                updates[`/inventoryItems/${existingItem.id}`] = { ...existingItem, ...dataToSave };
                updatedCount++;
            }
        });
    
        if (Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
        return updatedCount;
    }, [inventoryItems, projects]);

    const deleteInventoryItem = useCallback((itemId: string) => {
        remove(ref(rtdb, `inventoryItems/${itemId}`));
    }, []);

    const deleteInventoryItemGroup = useCallback((itemName: string) => {
        const itemsToDelete = inventoryItems.filter(item => item.name === itemName);
        const updates: { [key: string]: null } = {};
        itemsToDelete.forEach(item => {
            updates[`/inventoryItems/${item.id}`] = null;
        });
        update(ref(rtdb), updates);
    }, [inventoryItems]);
    
    const renameInventoryItemGroup = useCallback((oldName: string, newName: string) => {
        const itemsToRename = inventoryItems.filter(item => item.name === oldName);
        const updates: { [key: string]: any } = {};
        itemsToRename.forEach(item => {
        updates[`/inventoryItems/${item.id}/name`] = newName;
        });
        update(ref(rtdb), updates);
    }, [inventoryItems]);
    
    const addTpCertList = useCallback((listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'tpCertLists'));
        const sanitizedItems = listData.items.map(item => ({
        ...item,
        ariesId: item.ariesId || null,
        chestCrollNo: (item as any).chestCrollNo || null,
        }));
        const newList: Omit<TpCertList, 'id'> = {
            ...listData,
            items: sanitizedItems,
            creatorId: user.id,
            createdAt: new Date().toISOString(),
        };
        set(newRef, newList);
        addActivityLog(user.id, 'TP Certification List Saved', `List Name: ${listData.name}`);
    }, [user, addActivityLog]);

    const updateTpCertList = useCallback((listData: TpCertList) => {
        const { id, ...data } = listData;
        const sanitizedItems = data.items.map(item => ({
        ...item,
        ariesId: item.ariesId || null,
        chestCrollNo: (item as any).chestCrollNo || null,
        }));
        const sanitizedData = { ...data, items: sanitizedItems };
        update(ref(rtdb, `tpCertLists/${id}`), sanitizedData);
    }, []);

    const deleteTpCertList = useCallback((listId: string) => {
        remove(ref(rtdb, `tpCertLists/${listId}`));
    }, []);
    
    const addInventoryTransferRequest = useCallback((requestData: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => {
        if (!user) return;
        const newRequestRef = push(ref(rtdb, 'inventoryTransferRequests'));
        
        const sanitizedItems = requestData.items.map(item => ({
            ...item,
            ariesId: item.ariesId || null,
        }));
    
        const newRequest: Omit<InventoryTransferRequest, 'id'> = {
            ...requestData,
            items: sanitizedItems,
            requesterId: user.id,
            requestDate: new Date().toISOString(),
            status: 'Pending',
            requestedById: requestData.requestedById || null,
        };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'Inventory Transfer Request Created');
    
        const storePersonnel = users.filter(u => ['Store in Charge', 'Assistant Store Incharge', 'Admin'].includes(u.role));
        const fromProjectName = projects.find(p => p.id === requestData.fromProjectId)?.name;
        const toProjectName = projects.find(p => p.id === requestData.toProjectId)?.name;
        const itemsHtml = requestData.items.map(item => `<li>${item.name} (SN: ${item.serialNumber})</li>`).join('');
    
        storePersonnel.forEach(storeUser => {
            if (storeUser.email) {
                const htmlBody = `
                    <p>A new inventory transfer has been requested by ${user.name}.</p>
                    <h3>Details:</h3>
                    <ul>
                        <li><strong>From:</strong> ${fromProjectName || 'Unknown'}</li>
                        <li><strong>To:</strong> ${toProjectName || 'Unknown'}</li>
                        <li><strong>Reason:</strong> ${requestData.reason}</li>
                    </ul>
                    <h3>Items (${requestData.items.length}):</h3>
                    <ul>
                        ${itemsHtml}
                    </ul>
                    <p>Please review the request in the app.</p>
                `;
                sendNotificationEmail({
                    to: [storeUser.email],
                    subject: `Inventory Transfer Request from ${user.name}`,
                    htmlBody,
                    notificationSettings,
                    event: 'onInternalRequest'
                });
            }
        });
    }, [user, addActivityLog, users, projects, notificationSettings]);

    const approveInventoryTransferRequest = useCallback((request: InventoryTransferRequest, createTpList: boolean) => {
        if (!user) return;
    
        const updates: { [key: string]: any } = {};
        updates[`inventoryTransferRequests/${request.id}/status`] = 'Completed';
        updates[`inventoryTransferRequests/${request.id}/approverId`] = user.id;
        updates[`inventoryTransferRequests/${request.id}/approvalDate`] = new Date().toISOString();
        updates[`inventoryTransferRequests/${request.id}/acknowledgedByRequester`] = false;

        request.items.forEach(item => {
            let itemPath: string;
            switch (item.itemType) {
                case 'Inventory': itemPath = 'inventoryItems'; break;
                case 'UTMachine': itemPath = 'utMachines'; break;
                case 'DftMachine': itemPath = 'dftMachines'; break;
                case 'DigitalCamera': itemPath = 'digitalCameras'; break;
                case 'Anemometer': itemPath = 'anemometers'; break;
                case 'OtherEquipment': itemPath = 'otherEquipments'; break;
                default: return;
            }
            updates[`${itemPath}/${item.itemId}/projectId`] = request.toProjectId;
        });

        if (createTpList && (request.reason === 'For TP certification' || request.reason === 'Expired materials')) {
            const listData = {
                name: `From Transfer ${request.id.slice(-6)}`,
                date: new Date().toISOString().split('T')[0],
                items: request.items.map(item => ({
                    materialName: item.name,
                    manufacturerSrNo: item.serialNumber,
                    itemId: item.itemId,
                    itemType: item.itemType,
                    ariesId: item.ariesId || null,
                    chestCrollNo: (item as any).chestCrollNo || null,
                })),
            };
            addTpCertList(listData);
        }
    
        update(ref(rtdb), updates);
        addActivityLog(user.id, 'Inventory Transfer Approved & Completed', `Request ID: ${request.id}`);

        const requester = users.find(u => u.id === request.requesterId);
        
        if(requester && requester.email) {
            const fromProjectName = projects.find(p => p.id === request.fromProjectId)?.name;
            const toProjectName = projects.find(p => p.id === request.toProjectId)?.name;
            const itemsHtml = request.items.map(item => `<li>${item.name} (SN: ${item.serialNumber})</li>`).join('');
            const htmlBody = `
                <p>Your inventory transfer request (ID: #${request.id.slice(-6)}) has been completed by ${user.name}.</p>
                <ul>
                    <li><strong>From:</strong> ${fromProjectName || 'Unknown'}</li>
                    <li><strong>To:</strong> ${toProjectName || 'Unknown'}</li>
                </ul>
                <h3>Transferred Items:</h3>
                <ul>${itemsHtml}</ul>
                <p>The items are now reflected in the new project's inventory.</p>
            `;
            sendNotificationEmail({
                to: [requester.email],
                subject: `Inventory Transfer Completed: #${request.id.slice(-6)}`,
                htmlBody,
                notificationSettings,
                event: 'onInternalRequestUpdate',
                involvedUser: requester
            });
        }
    }, [user, addActivityLog, addTpCertList, users, projects, notificationSettings]);
    
    const rejectInventoryTransferRequest = useCallback((requestId: string, comment: string) => {
        if (!user || !can.approve_store_requests) return;

        const updates: { [key: string]: any } = {};
        updates[`inventoryTransferRequests/${requestId}/status`] = 'Rejected';
        updates[`inventoryTransferRequests/${requestId}/approverId`] = user.id;
        updates[`inventoryTransferRequests/${requestId}/acknowledgedByRequester`] = false;

        update(ref(rtdb), updates);
        addActivityLog(user.id, 'Inventory Transfer Rejected', `Request ID: ${requestId}`);
    }, [user, can.approve_store_requests, addActivityLog]);
    
    const disputeInventoryTransfer = useCallback((requestId: string, comment: string) => {
        if (!user) return;
        const request = inventoryTransferRequests.find(r => r.id === requestId);
        if (!request) return;

        const updates: { [key: string]: any } = {};
        updates[`inventoryTransferRequests/${requestId}/status`] = 'Disputed';
        
        update(ref(rtdb), updates);
        addActivityLog(user.id, 'Inventory Transfer Disputed', `Request ID: ${requestId}`);
    }, [user, inventoryTransferRequests, addActivityLog]);
    
    const acknowledgeTransfer = useCallback((requestId: string) => {
        if (!user) return;
        update(ref(rtdb, `inventoryTransferRequests/${requestId}`), {
            acknowledgedByRequester: true,
            acknowledgedDate: new Date().toISOString(),
        });
        addActivityLog(user.id, 'Inventory Transfer Acknowledged', `Request ID: ${requestId}`);
    }, [user, addActivityLog]);

    const deleteInventoryTransferRequest = useCallback((requestId: string) => {
        if (!user || user.role !== 'Admin') {
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Only an administrator can delete transfer requests.',
        });
        return;
        }
        remove(ref(rtdb, `inventoryTransferRequests/${requestId}`));
        toast({
        title: 'Transfer Request Deleted',
        description: 'The request has been permanently removed.',
        variant: 'destructive',
        });
        addActivityLog(user.id, 'Inventory Transfer Deleted', `Request ID: ${requestId}`);
    }, [user, toast, addActivityLog]);
    
    const clearInventoryTransferHistory = useCallback(() => {
        const allRequests = inventoryTransferRequests;
        const updates: { [key: string]: null } = {};
        allRequests.forEach(req => {
            if (req.status === 'Completed' || req.status === 'Rejected') {
                updates[`/inventoryTransferRequests/${req.id}`] = null;
            }
        });
        if (Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
    }, [inventoryTransferRequests]);
    
    const addCertificateRequestComment = useCallback((requestId: string, comment: string) => {
        if (!user) return;
        const request = certificateRequestsById[requestId];
        if (!request) return;
    
        const newCommentRef = push(ref(rtdb, `certificateRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: comment, date: new Date().toISOString(), eventId: requestId };
        
        const updates: { [key: string]: any } = {};
        updates[`certificateRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`certificateRequests/${requestId}/viewedByRequester`] = false;
    
        update(ref(rtdb), updates);
    }, [user, certificateRequestsById]);

    const addCertificateRequest = useCallback((requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => {
        if (!user) return;
        const newRequestRef = push(ref(rtdb, 'certificateRequests'));
        const newRequest: Omit<CertificateRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        status: 'Pending',
        requestDate: new Date().toISOString(),
        comments: [{ id: 'c-cert-1', userId: user.id, text: 'Request created.', date: new Date().toISOString(), eventId: 'cert-req-1' }],
        };
        set(newRequestRef, newRequest);
        
        addActivityLog(user.id, "Certificate Request Created");

        const storePersonnel = users.filter(u => ['Store in Charge', 'Document Controller', 'Admin'].includes(u.role));
        storePersonnel.forEach(manager => {
            if(manager.email) {
                const htmlBody = `
                    <h3>New Certificate Request</h3>
                    <p><strong>Requested By:</strong> ${user.name}</p>
                    <p><strong>Type:</strong> ${requestData.requestType}</p>
                    <p><strong>Item ID:</strong> ${requestData.itemId || requestData.utMachineId || 'N/A'}</p>
                    <p><strong>Remarks:</strong> ${requestData.remarks || 'None'}</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/store-inventory">View Request</a>
                `;
                sendNotificationEmail({
                    to: [manager.email],
                    subject: `New Certificate Request from ${user.name}`,
                    htmlBody,
                    notificationSettings,
                    event: 'onInternalRequest'
                });
            }
        });
    }, [user, users, addActivityLog, notificationSettings]);

    const fulfillCertificateRequest = useCallback((requestId: string, comment: string) => {
        if (!user) return;
        const request = certificateRequestsById[requestId];
        if (!request) return;

        addCertificateRequestComment(requestId, `Request fulfilled by ${user.name}. Comment: ${comment}`);

        const updates: { [key: string]: any } = {};
        updates[`certificateRequests/${requestId}/status`] = 'Completed';
        updates[`certificateRequests/${requestId}/completionDate`] = new Date().toISOString();
        updates[`certificateRequests/${requestId}/viewedByRequester`] = false;
        
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const match = comment.match(urlRegex);
        if(match) {
            const url = match[0];
            let path: string | null = null;
            if (request.itemId) {
                path = `inventoryItems/${request.itemId}/certificateUrl`;
            } else if (request.utMachineId) {
                path = `utMachines/${request.utMachineId}/certificateUrl`;
            } else if (request.dftMachineId) {
                path = `dftMachines/${request.dftMachineId}/certificateUrl`;
            }
            if (path) {
                updates[path] = url;
            }
        }
        
        update(ref(rtdb), updates);

    }, [user, certificateRequestsById, addCertificateRequestComment]);
    
    const markFulfilledRequestsAsViewed = useCallback((requestType: 'store' | 'equipment') => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        certificateRequests.forEach(req => {
        const isStoreReq = requestType === 'store' && req.itemId;
        const isEquipmentReq = requestType === 'equipment' && (req.utMachineId || req.dftMachineId);
        
        if (req.requesterId === user.id && req.status === 'Completed' && !req.viewedByRequester && (isStoreReq || isEquipmentReq)) {
            updates[`certificateRequests/${req.id}/viewedByRequester`] = true;
        }
        });
        if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
        }
    }, [user, certificateRequests]);
    
    const acknowledgeFulfilledRequest = useCallback((requestId: string) => {
        if (!user) return;
        remove(ref(rtdb, `certificateRequests/${requestId}`));
        toast({ title: 'Request Acknowledged', description: 'The completed request has been cleared from your view.' });
        addActivityLog(user.id, "Acknowledged Certificate Request", `ID: ${requestId}`);
    }, [user, toast, addActivityLog]);
    
    const addUTMachine = useCallback((machine: Omit<UTMachine, 'id'>) => {
        const newRef = push(ref(rtdb, 'utMachines'));
        set(newRef, machine);
    }, []);

    const updateUTMachine = useCallback((machine: UTMachine) => {
        const { id, ...data } = machine;
        update(ref(rtdb, `utMachines/${id}`), data);
    }, []);

    const deleteUTMachine = useCallback((machineId: string) => {
        remove(ref(rtdb, `utMachines/${machineId}`));
    }, []);
    
    const addDftMachine = useCallback((machine: Omit<DftMachine, 'id'>) => {
        const newRef = push(ref(rtdb, 'dftMachines'));
        set(newRef, machine);
    }, []);

    const updateDftMachine = useCallback((machine: DftMachine) => {
        const { id, ...data } = machine;
        update(ref(rtdb, `dftMachines/${id}`), data);
    }, []);

    const deleteDftMachine = useCallback((machineId: string) => {
        remove(ref(rtdb, `dftMachines/${machineId}`));
    }, []);

    const addMobileSim = useCallback((item: Omit<MobileSim, 'id'>) => {
        const newRef = push(ref(rtdb, 'mobileSims'));
        set(newRef, item);
    }, []);

    const updateMobileSim = useCallback((item: MobileSim) => {
        const { id, ...data } = item;
        update(ref(rtdb, `mobileSims/${id}`), data);
    }, []);

    const deleteMobileSim = useCallback((itemId: string) => {
        remove(ref(rtdb, `mobileSims/${itemId}`));
    }, []);

    const addLaptopDesktop = useCallback((item: Omit<LaptopDesktop, 'id'>) => {
        const newRef = push(ref(rtdb, 'laptopsDesktops'));
        set(newRef, item);
    }, []);

    const updateLaptopDesktop = useCallback((item: LaptopDesktop) => {
        const { id, ...data } = item;
        update(ref(rtdb, `laptopsDesktops/${id}`), data);
    }, []);

    const deleteLaptopDesktop = useCallback((itemId: string) => {
        remove(ref(rtdb, `laptopsDesktops/${itemId}`));
    }, []);

    const addDigitalCamera = useCallback((camera: Omit<DigitalCamera, 'id'>) => {
        const newRef = push(ref(rtdb, 'digitalCameras'));
        set(newRef, camera);
    }, []);

    const updateDigitalCamera = useCallback((camera: DigitalCamera) => {
        const { id, ...data } = camera;
        update(ref(rtdb, `digitalCameras/${id}`), data);
    }, []);

    const deleteDigitalCamera = useCallback((cameraId: string) => {
        remove(ref(rtdb, `digitalCameras/${cameraId}`));
    }, []);

    const addAnemometer = useCallback((anemometer: Omit<Anemometer, 'id'>) => {
        const newRef = push(ref(rtdb, 'anemometers'));
        set(newRef, anemometer);
    }, []);

    const updateAnemometer = useCallback((anemometer: Anemometer) => {
        const { id, ...data } = anemometer;
        update(ref(rtdb, `anemometers/${id}`), data);
    }, []);

    const deleteAnemometer = useCallback((anemometerId: string) => {
        remove(ref(rtdb, `anemometers/${anemometerId}`));
    }, []);

    const addOtherEquipment = useCallback((equipment: Omit<OtherEquipment, 'id'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'otherEquipments'));
        const dataToSave: Partial<OtherEquipment> = {
            ...equipment,
            tpInspectionDueDate: equipment.tpInspectionDueDate || null,
            certificateUrl: equipment.certificateUrl || null,
        };
        set(newRef, dataToSave);
        addActivityLog(user.id, 'Other Equipment Added', `${equipment.equipmentName}`);
    }, [user, addActivityLog]);

    const updateOtherEquipment = useCallback((equipment: OtherEquipment) => {
        const { id, ...data } = equipment;
        update(ref(rtdb, `otherEquipments/${id}`), data);
    }, []);

    const deleteOtherEquipment = useCallback((equipmentId: string) => {
        remove(ref(rtdb, `otherEquipments/${equipmentId}`));
    }, []);
    
    const addMachineLog = useCallback((log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => {
        if(!user) return;
        const newRef = push(ref(rtdb, 'machineLogs'));
        const newLog: Omit<MachineLog, 'id'> = { ...log, machineId, loggedByUserId: user.id };
        set(newRef, newLog);
    }, [user]);

    const deleteMachineLog = useCallback((logId: string) => {
        remove(ref(rtdb, `machineLogs/${logId}`));
    }, []);

    const getMachineLogs = useCallback((machineId: string) => {
        return machineLogs.filter(log => log.machineId === machineId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [machineLogs]);

    const addInternalRequest = useCallback((requestData: Omit<InternalRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
        if (!user) return;
        const newRequestRef = push(ref(rtdb, 'internalRequests'));
        
        const itemsWithStatus = requestData.items.map(item => ({...item, status: 'Pending' as InternalRequestItemStatus}));
        
        const newRequest: Omit<InternalRequest, 'id'> = {
          items: itemsWithStatus,
          requesterId: user.id,
          date: new Date().toISOString(),
          status: 'Pending',
          comments: [{ id: 'comment-initial', userId: user.id, text: 'Request created.', date: new Date().toISOString(), eventId: 'internal-request' }],
          viewedByRequester: true,
        };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'Internal Store Request Created');

        const storePersonnel = users.filter(u => ['Store in Charge', 'Assistant Store Incharge', 'Admin'].includes(u.role));
        const fromProjectName = projects.find(p => p.id === user.projectIds?.[0])?.name;
        const itemsHtml = requestData.items.map(item => `<li>${item.quantity} ${item.unit} of ${item.description}</li>`).join('');
    
        storePersonnel.forEach(storeUser => {
            if (storeUser.email) {
                const htmlBody = `
                    <p>A new internal store request has been submitted by ${user.name}.</p>
                    <h3>Details:</h3>
                    <p><strong>From Project:</strong> ${fromProjectName || 'Unknown'}</p>
                    <h3>Items (${requestData.items.length}):</h3>
                    <ul>
                        ${itemsHtml}
                    </ul>
                    <p>Please review the request in the app.</p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-requests">View Request</a>
                `;
                sendNotificationEmail({
                    to: [storeUser.email],
                    subject: `New Store Request from ${user.name}`,
                    htmlBody,
                    notificationSettings,
                    event: 'onInternalRequest'
                });
            }
        });
      }, [user, addActivityLog, users, notificationSettings, projects]);
    
      const deleteInternalRequest = useCallback((requestId: string) => {
        const request = internalRequestsById[requestId];
        if (!request) return;
        
        const canDelete = user?.role === 'Admin' || (request.requesterId === user?.id && request.status === 'Pending');
        
        if (canDelete) {
          remove(ref(rtdb, `internalRequests/${requestId}`));
          toast({ variant: 'destructive', title: 'Request Deleted' });
        } else {
          toast({ variant: 'destructive', title: 'Permission Denied' });
        }
      }, [user, internalRequestsById, toast]);
    
      const forceDeleteInternalRequest = useCallback((requestId: string) => {
        if(user?.role !== 'Admin') return;
        remove(ref(rtdb, `internalRequests/${requestId}`));
      }, [user]);
    
      const updateInternalRequestStatus = useCallback((requestId: string, status: InternalRequestStatus) => {
        if (!user || !can.approve_store_requests) return;
        update(ref(rtdb, `internalRequests/${requestId}`), { status, approverId: user.id, acknowledgedByRequester: false });
      }, [user, can.approve_store_requests]);
    
      const updateInternalRequestItemStatus = useCallback((requestId: string, itemId: string, status: InternalRequestItemStatus, comment?: string) => {
        if (!user || !can.approve_store_requests) return;
        
        const request = internalRequestsById[requestId];
        if (!request) return;
    
        const itemIndex = request.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
        
        const requestedItem = request.items[itemIndex];

        if (status === 'Issued') {
            const itemsToCheck = isConsumable(request) ? consumableItems : inventoryItems;
            const stockItem = itemsToCheck.find(i => i.id === requestedItem.inventoryItemId);
            if (stockItem && stockItem.quantity !== undefined && stockItem.quantity < requestedItem.quantity) {
                toast({
                    variant: 'destructive',
                    title: 'Insufficient Stock',
                    description: `Cannot issue ${requestedItem.quantity} of ${requestedItem.description}. Only ${stockItem.quantity} available.`,
                });
                return;
            }
        }

        const actionComment = `${requestedItem.description}: Status changed to ${status}.`;
        const finalComment = comment ? `${actionComment} Comment: ${comment}` : actionComment;
        
        _addInternalRequestComment(requestId, finalComment, user, internalRequestsById, users, notificationSettings, true, `Update on your request #${requestId.slice(-6)}`);
    
        const updatedItems = [...request.items];
        updatedItems[itemIndex].status = status;
        
        if (status === 'Issued') {
            (updatedItems[itemIndex] as any).issuedDate = new Date().toISOString();
        }
        
        const allIssued = updatedItems.every(i => i.status === 'Issued' || i.status === 'Rejected');
        const someIssued = updatedItems.some(i => i.status === 'Issued' || i.status === 'Rejected');
        const allApproved = updatedItems.every(i => i.status === 'Approved' || i.status === 'Issued' || i.status === 'Rejected');
        const someApproved = updatedItems.some(i => i.status === 'Approved');
    
        let newStatus: InternalRequestStatus = 'Pending';
        if (allIssued) {
          newStatus = 'Issued';
        } else if (someIssued) {
          newStatus = 'Partially Issued';
        } else if (allApproved) {
          newStatus = 'Approved';
        } else if (someApproved) {
          newStatus = 'Partially Approved';
        }
        
        const updates: { [key: string]: any } = {};
        updates[`internalRequests/${requestId}/items/${itemIndex}`] = updatedItems[itemIndex];
        updates[`internalRequests/${requestId}/acknowledgedByRequester`] = false;

        if(request.status !== newStatus) {
            updates[`internalRequests/${requestId}/status`] = newStatus;
        }

        if (status === 'Issued' && requestedItem.inventoryItemId) {
            const stockItem = (isConsumable(request) ? consumableItems : inventoryItems).find(i => i.id === requestedItem.inventoryItemId);
            if (stockItem && stockItem.quantity !== undefined) {
                const newQuantity = Math.max(0, stockItem.quantity - requestedItem.quantity);
                updates[`inventoryItems/${requestedItem.inventoryItemId}/quantity`] = newQuantity;
            }
        }
    
        update(ref(rtdb), updates);
      }, [user, can.approve_store_requests, internalRequestsById, inventoryItems, toast, consumableItems, users, notificationSettings]);
    
      const isConsumable = (request: InternalRequest) => {
          return request.items.some(item => item.inventoryItemId && consumableItemIds.has(item.inventoryItemId));
      }
    
      const updateInternalRequestItem = useCallback((requestId: string, updatedItem: InternalRequestItem, originalItem: InternalRequestItem) => {
        if (!user) return;
        const request = internalRequestsById[requestId];
        if (!request) return;

        if (!can.approve_store_requests && request.requesterId !== user.id) return;
    
        const itemIndex = request.items.findIndex(i => i.id === updatedItem.id);
        if (itemIndex === -1) return;
    
        const sanitizedItem = { ...updatedItem, inventoryItemId: updatedItem.inventoryItemId || null };
        update(ref(rtdb, `internalRequests/${requestId}/items/${itemIndex}`), sanitizedItem);
        addInternalRequestComment(requestId, `Item "${originalItem.description}" updated to "${updatedItem.description}" (Qty: ${updatedItem.quantity}).`, true);
      }, [user, can.approve_store_requests, internalRequestsById, addInternalRequestComment]);
    
      const markInternalRequestAsViewed = useCallback((requestId: string) => {
        if (!user) return;
        const request = internalRequestsById[requestId];
        if (!request || request.requesterId !== user.id) return;
        
        const updates: { [key: string]: any } = {};
        updates[`internalRequests/${requestId}/acknowledgedByRequester`] = true;
    
        const comments = Array.isArray(request.comments) ? request.comments : Object.values(request.comments || {});
        comments.forEach((comment) => {
            if(comment && comment.userId !== user.id && !comment.viewedBy?.[user.id]) {
                const path = `internalRequests/${requestId}/comments/${comment.id}/viewedBy/${user.id}`;
                updates[path] = true;
            }
        });
        update(ref(rtdb), updates);
      }, [user, internalRequestsById]);
    
      const acknowledgeInternalRequest = useCallback((requestId: string) => {
          update(ref(rtdb, `internalRequests/${requestId}`), { acknowledgedByRequester: true });
      }, []);

    const addPpeRequest = useCallback((requestData: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => {
        if (!user) return;
        const newRequestRef = push(ref(rtdb, 'ppeRequests'));
        
        const newRequest: Omit<PpeRequest, 'id'> = {
          ...requestData,
          requesterId: user.id,
          date: new Date().toISOString(),
          status: 'Pending',
          comments: [{ id: 'comment-initial', userId: user.id, text: 'Request created.', date: new Date().toISOString(), eventId: 'ppe-request' }],
          viewedByRequester: true,
        };
        set(newRequestRef, newRequest);
        addActivityLog(user.id, 'PPE Request Created', `For ${requestData.manpowerId}`);
        
        const employee = manpowerProfiles.find(p => p.id === requestData.manpowerId);
        const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));

        const stockInfo = requestData.ppeType === 'Coverall' && stockItem && 'sizes' in stockItem && stockItem.sizes
            ? `${stockItem.sizes[requestData.size] || 0} in stock`
            : (stockItem && 'quantity' in stockItem ? `${stockItem.quantity || 0} in stock` : 'N/A');
        
        const lastIssue = employee?.ppeHistory 
            ? Object.values(employee.ppeHistory).filter(h => h.ppeType === requestData.ppeType).sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0]
            : null;

        const emailData = {
            requesterName: user.name,
            employeeName: employee?.name || 'Unknown',
            ppeType: requestData.ppeType,
            size: requestData.size,
            quantity: requestData.quantity,
            requestType: requestData.requestType,
            remarks: requestData.remarks,
            attachmentUrl: requestData.attachmentUrl,
            joiningDate: employee?.joiningDate ? format(new Date(employee.joiningDate), 'dd MMM, yyyy') : 'N/A',
            rejoiningDate: employee?.leaveHistory ? Object.values(employee.leaveHistory).find(l => l.rejoinedDate)?.rejoinedDate : 'N/A',
            lastIssueDate: lastIssue ? format(new Date(lastIssue.issueDate), 'dd MMM, yyyy') : 'N/A',
            stockInfo,
            eligibility: requestData.eligibility,
            newRequestJustification: requestData.newRequestJustification,
        };
        
        sendPpeRequestEmail(emailData);

    }, [user, addActivityLog, ppeStock, manpowerProfiles]);
    
    const resolvePpeDispute = useCallback(() => {}, []);

    const markPpeRequestAsViewed = useCallback((requestId: string) => {
      update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true });
    }, []);
    
    const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => {
        const path = stockId === 'coveralls' ? 'ppeStock/coveralls/sizes' : 'ppeStock/safetyShoes/quantity';
        set(ref(rtdb, path), data);
    }, []);

    const addPpeInwardRecord = useCallback((record: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'ppeInwardHistory'));
        set(newRef, { ...record, date: record.date.toISOString(), addedByUserId: user.id });

        const stockPath = record.ppeType === 'Coverall' ? 'ppeStock/coveralls/sizes' : 'ppeStock/safetyShoes';
        const stockRef = ref(rtdb, stockPath);
        get(stockRef).then(snapshot => {
            const currentStock = snapshot.val() || {};
            if (record.ppeType === 'Coverall' && record.sizes) {
                const newSizes = { ...currentStock };
                Object.entries(record.sizes).forEach(([size, qty]) => {
                    newSizes[size] = (newSizes[size] || 0) + (qty || 0);
                });
                set(stockRef, newSizes);
            } else if (record.ppeType === 'Safety Shoes' && record.quantity) {
                set(ref(rtdb, `${stockPath}/quantity`), (currentStock.quantity || 0) + record.quantity);
            }
        });
    }, [user]);

    const updatePpeInwardRecord = useCallback((record: PpeInwardRecord) => {
        const { id, ...data } = record;
        update(ref(rtdb, `ppeInwardHistory/${id}`), data);
    }, []);

    const deletePpeInwardRecord = useCallback((record: PpeInwardRecord) => {
        remove(ref(rtdb, `ppeInwardHistory/${record.id}`));
    }, []);

    const addIgpOgpRecord = useCallback((record: Omit<IgpOgpRecord, 'id' | 'creatorId'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'igpOgpRecords'));
        const newRecord = {
            ...record,
            creatorId: user.id,
            date: record.date.toISOString(),
        };
        set(newRef, newRecord);
    }, [user]);

    const deleteIgpOgpRecord = useCallback((mrnNumber: string) => {
        if (!user || user.role !== 'Admin') return;
        const recordsToDelete = igpOgpRecords.filter(r => r.mrnNumber === mrnNumber);
        const updates: { [key: string]: null } = {};
        recordsToDelete.forEach(record => {
            updates[`/igpOgpRecords/${record.id}`] = null;
        });
        update(ref(rtdb), updates);
    }, [user, igpOgpRecords]);
    
    const updatePpeRequest = useCallback((request: PpeRequest) => {
        const { id, ...data } = request;
        update(ref(rtdb, `ppeRequests/${id}`), { ...data, attachmentUrl: data.attachmentUrl || null });
    }, []);
    
    const deletePpeRequest = useCallback((requestId: string) => {
        remove(ref(rtdb, `ppeRequests/${requestId}`));
    }, []);
    
    const deletePpeAttachment = useCallback((requestId: string) => {
        update(ref(rtdb, `ppeRequests/${requestId}`), { attachmentUrl: null });
    }, []);
    
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
    
    const resolveInternalRequestDispute = useCallback(() => {}, []);
    
    const addInspectionChecklist = useCallback(() => {}, []);
    const updateInspectionChecklist = useCallback(() => {}, []);
    const deleteInspectionChecklist = useCallback(() => {}, []);

    const addDamageReport = useCallback(async (reportData: Pick<DamageReport, 'itemId' | 'otherItemName' | 'reason'> & { attachment?: File }): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: "User not authenticated." };
    
      try {
        let attachmentUrl: string | null = null;
        if (reportData.attachment) {
          const file = reportData.attachment;
          const fileName = `damage-reports/${uuidv4()}-${file.name}`;
          attachmentUrl = await uploadFile(file, fileName);
        }
    
        const newReportRef = push(ref(rtdb, 'damageReports'));
        const finalReport: Omit<DamageReport, "id"> = {
          itemId: reportData.itemId || null,
          otherItemName: reportData.otherItemName || null,
          reason: reportData.reason,
          reporterId: user.id,
          reportDate: new Date().toISOString(),
          status: "Pending",
          attachmentUrl: attachmentUrl,
        };
    
        await set(newReportRef, finalReport);
        addActivityLog(user.id, 'Damage Report Submitted');
        return { success: true };
      } catch (error: any) {
        console.error("Failed to submit damage report:", error);
        return { success: false, error: error.message || "An unknown error occurred." };
      }
    }, [user, addActivityLog]);

    const updateDamageReportStatus = useCallback((reportId: string, status: DamageReportStatus, comment?: string) => {
        if (!user) return;
        const report = damageReportsById[reportId];
        if (!report) return;

        const updates: { [key: string]: any } = {
            [`damageReports/${reportId}/status`]: status
        };

        if (status === 'Approved' && report.itemId) {
            const item = inventoryItems.find(i => i.id === report.itemId);
            if (item) {
                updates[`inventoryItems/${report.itemId}/status`] = 'Damaged';
            }
        }
        
        update(ref(rtdb), updates);

        if (comment) {
            // Placeholder for adding comments to damage reports if needed later
        }

    }, [user, damageReportsById, inventoryItems]);
    
    const deleteDamageReport = useCallback((reportId: string) => {
        if (!user || user.role !== 'Admin') {
            toast({ variant: 'destructive', title: 'Permission Denied' });
            return;
        }

        const report = damageReportsById[reportId];
        if (!report) return;

        // Delete from DB first
        remove(ref(rtdb, `damageReports/${reportId}`)).then(() => {
             // Then delete from storage if URL exists and is a Firebase URL
            if (report.attachmentUrl && report.attachmentUrl.includes('firebasestorage.googleapis.com')) {
                const storage = getStorage();
                const fileRef = storageRef(storage, report.attachmentUrl);
                deleteObject(fileRef).catch(error => {
                    console.error("Failed to delete file from storage:", error);
                    toast({ title: 'File Deletion Failed', description: 'Could not delete the file from storage. It may need to be removed manually.', variant: 'destructive'});
                });
            }
        });
    }, [user, damageReportsById, toast]);

    const deleteAllDamageReportsAndFiles = useCallback(async () => {
        if (!user || user.role !== 'Admin') {
            toast({ title: 'Permission Denied', variant: 'destructive' });
            return;
        }
    
        const reportsToDelete = Object.values(damageReportsById);
        const storage = getStorage();
        const updates: { [key: string]: null } = {};
        const deleteFilePromises: Promise<void>[] = [];
    
        reportsToDelete.forEach(report => {
            updates[`/damageReports/${report.id}`] = null;
            if (report.attachmentUrl && report.attachmentUrl.includes('firebasestorage.googleapis.com')) {
                try {
                    const fileRef = storageRef(storage, report.attachmentUrl);
                    deleteFilePromises.push(deleteObject(fileRef));
                } catch (e) {
                    console.error("Could not create storage ref for deletion:", e);
                }
            }
        });
    
        try {
            await Promise.all(deleteFilePromises);
        } catch (error) {
            console.error('Some files could not be deleted from storage:', error);
            toast({ title: 'File Deletion Warning', description: 'Could not delete all files from storage. Check console.', variant: 'destructive' });
        } finally {
            await update(ref(rtdb), updates);
            toast({ title: 'Success', description: 'All damage report database entries have been deleted.' });
        }
    }, [user, damageReportsById, toast]);
    
    useEffect(() => {
        const unsubscribers = [
            createDataListener('inventoryItems', setInventoryItemsById),
            createDataListener('utMachines', setUtMachinesById),
            createDataListener('dftMachines', setDftMachinesById),
            createDataListener('mobileSims', setMobileSimsById),
            createDataListener('laptopsDesktops', setLaptopsDesktopsById),
            createDataListener('digitalCameras', setDigitalCamerasById),
            createDataListener('anemometers', setAnemometersById),
            createDataListener('otherEquipments', setOtherEquipmentsById),
            createDataListener('machineLogs', setMachineLogsById),
            createDataListener('certificateRequests', setCertificateRequestsById),
            createDataListener('internalRequests', setInternalRequestsById),
            createDataListener('inventoryTransferRequests', setInventoryTransferRequestsById),
            createDataListener('ppeRequests', setPpeRequestsById),
            createDataListener('ppeStock', setPpeStockById),
            createDataListener('ppeInwardHistory', setPpeInwardHistoryById),
            createDataListener('tpCertLists', setTpCertListsById),
            createDataListener('inspectionChecklists', setInspectionChecklistsById),
            createDataListener('igpOgpRecords', setIgpOgpRecordsById),
            createDataListener('managementRequests', setManagementRequestsById),
            createDataListener('damageReports', setDamageReportsById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: InventoryContextType = {
        inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, internalRequests, managementRequests, inventoryTransferRequests, ppeRequests, ppeStock, ppeInwardHistory, tpCertLists, inspectionChecklists, igpOgpRecords, consumableInwardHistory, directives: [], damageReports,
        addInventoryItem, addMultipleInventoryItems, updateInventoryItem, updateInventoryItemGroup, updateInventoryItemGroupByProject, updateMultipleInventoryItems, deleteInventoryItem, deleteInventoryItemGroup, renameInventoryItemGroup,
        addInventoryTransferRequest, deleteInventoryTransferRequest, approveInventoryTransferRequest, rejectInventoryTransferRequest, disputeInventoryTransfer, acknowledgeTransfer, clearInventoryTransferHistory,
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
        addManagementRequest, updateManagementRequest, deleteManagementRequest, addManagementRequestComment, markManagementRequestAsViewed, forwardManagementRequest,
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
