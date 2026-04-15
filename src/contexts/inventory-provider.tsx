
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { InventoryItem, UTMachine, DftMachine, MobileSim, LaptopDesktop, DigitalCamera, Anemometer, OtherEquipment, MachineLog, CertificateRequest, InventoryTransferRequest, PpeRequest, PpeStock, PpeHistoryRecord, TpCertList, InspectionChecklist, Comment, InternalRequest, InternalRequestStatus, InternalRequestItemStatus, IgpOgpRecord, PpeRequestStatus, Role, ConsumableInwardRecord, Directive, DamageReport, User, NotificationSettings, DamageReportStatus, WeldingMachine, WalkieTalkie, PneumaticDrillingMachine, PneumaticAngleGrinder, WiredDrillingMachine, CordlessDrillingMachine, WiredAngleGrinder, CordlessAngleGrinder, CordlessReciprocatingSaw, DeliveryNote, InwardOutwardRecord, Quotation } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get, runTransaction } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useGeneral } from './general-provider';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { useManpower } from './manpower-provider';
import { sendPpeRequestEmail } from '@/app/actions/sendPpeRequestEmail';
import { format, parseISO, isValid, isAfter } from 'date-fns';
import { useConsumable } from './consumable-provider';
import { uploadFile } from '@/lib/storage';
import { usePurchase } from './purchase-provider';

const _addInternalRequestComment = async (
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

    try {
        await update(ref(rtdb), updates);

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
    } catch (error) {
        console.error("Failed to add internal request comment:", error);
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
  weldingMachines: WeldingMachine[];
  walkieTalkies: WalkieTalkie[];
  pneumaticDrillingMachines: PneumaticDrillingMachine[];
  pneumaticAngleGrinders: PneumaticAngleGrinder[];
  wiredDrillingMachines: WiredDrillingMachine[];
  cordlessDrillingMachines: CordlessDrillingMachine[];
  wiredAngleGrinders: WiredAngleGrinder[];
  cordlessAngleGrinders: CordlessAngleGrinder[];
  cordlessReciprocatingSaws: CordlessReciprocatingSaw[];
  machineLogs: MachineLog[];
  certificateRequests: CertificateRequest[];
  internalRequests: InternalRequest[];
  inventoryTransferRequests: InventoryTransferRequest[];
  ppeRequests: PpeRequest[];
  ppeStock: PpeStock[];
  ppeInwardHistory: PpeInwardRecord[];
  tpCertLists: TpCertList[];
  inspectionChecklists: InspectionChecklist[];
  igpOgpRecords: IgpOgpRecord[];
  deliveryNotes: DeliveryNote[];
  directives: Directive[];
  damageReports: DamageReport[];
  inwardOutwardRecords: InwardOutwardRecord[];
  receiveQuoteItem: (quotationId: string, vendorId: string, itemId: string, quantity: number) => Promise<void>;

  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  addMultipleInventoryItems: (items: any[]) => Promise<number>;
  batchAddInventoryItems: (items: Omit<InventoryItem, 'id' | 'lastUpdated'>[]) => Promise<void>;
  batchCreateAndLogItems: (itemsData: Partial<Omit<InventoryItem, 'id'>>[], source: string) => Promise<number>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  batchUpdateInventoryItems: (updates: { id: string; data: Partial<InventoryItem> }[]) => Promise<void>;
  updateInventoryItemGroup: (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => Promise<void>;
  updateInspectionItemGroup: (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => Promise<void>;
  updateMultipleInventoryItems: (itemsData: any[]) => Promise<number>;
  batchDeleteInventoryItems: (itemIds: string[]) => Promise<void>;
  deleteInventoryItemGroup: (itemName: string) => Promise<void>;
  renameInventoryItemGroup: (oldName: string, newName: string) => Promise<void>;
  revalidateExpiredItems: () => Promise<void>;
  
  addInventoryTransferRequest: (request: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>) => Promise<boolean>;
  updateInventoryTransferRequest: (request: InventoryTransferRequest) => Promise<boolean>;
  deleteInventoryTransferRequest: (requestId: string) => Promise<void>;
  approveInventoryTransferRequest: (request: InventoryTransferRequest, createTpList: boolean) => Promise<void>;
  rejectInventoryTransferRequest: (requestId: string, comment: string) => Promise<void>;
  disputeInventoryTransfer: (requestId: string, comment: string) => Promise<void>;
  acknowledgeTransfer: (requestId: string) => Promise<void>;
  clearInventoryTransferHistory: () => Promise<void>;
  resolveInternalRequestDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => Promise<void>;
  addInwardOutwardRecord: (itemInfo: { itemId: string; itemType: string; name: string; }, quantity: number, type: 'Inward' | 'Outward', source: string, remarks?: string) => Promise<void>;
  updateInwardOutwardRecord: (record: InwardOutwardRecord) => Promise<void>;
  deleteInwardOutwardRecord: (recordId: string) => Promise<void>;
  finalizeInwardPurchase: (recordId: string, newItemsData: Partial<Omit<InventoryItem, 'id'>>[]) => Promise<void>;

  addCertificateRequest: (requestData: Omit<CertificateRequest, 'id' | 'requesterId' | 'status' | 'requestDate' | 'comments' | 'viewedByRequester'>) => Promise<void>;
  fulfillCertificateRequest: (requestId: string, comment: string) => Promise<void>;
  addCertificateRequestComment: (requestId: string, comment: string) => Promise<void>;
  markFulfilledRequestsAsViewed: (requestType: 'store' | 'equipment') => Promise<void>;
  acknowledgeFulfilledRequest: (requestId: string) => Promise<void>;
  
  addUTMachine: (machine: Omit<UTMachine, 'id'>) => Promise<void>;
  updateUTMachine: (machine: UTMachine) => Promise<void>;
  deleteUTMachine: (machineId: string) => Promise<void>;
  
  addDftMachine: (machine: Omit<DftMachine, 'id'>) => Promise<void>;
  updateDftMachine: (machine: DftMachine) => Promise<void>;
  deleteDftMachine: (machineId: string) => Promise<void>;

  addMobileSim: (item: Omit<MobileSim, 'id'>) => Promise<void>;
  updateMobileSim: (item: MobileSim) => Promise<void>;
  deleteMobileSim: (itemId: string) => Promise<void>;

  addLaptopDesktop: (item: Omit<LaptopDesktop, 'id'>) => Promise<void>;
  updateLaptopDesktop: (item: LaptopDesktop) => Promise<void>;
  deleteLaptopDesktop: (itemId: string) => Promise<void>;

  addDigitalCamera: (camera: Omit<DigitalCamera, 'id'>) => Promise<void>;
  updateDigitalCamera: (camera: DigitalCamera) => Promise<void>;
  deleteDigitalCamera: (cameraId: string) => Promise<void>;

  addAnemometer: (anemometer: Omit<Anemometer, 'id'>) => Promise<void>;
  updateAnemometer: (anemometer: Anemometer) => Promise<void>;
  deleteAnemometer: (anemometerId: string) => Promise<void>;

  addOtherEquipment: (equipment: Omit<OtherEquipment, 'id'>) => Promise<void>;
  updateOtherEquipment: (equipment: OtherEquipment) => Promise<void>;
  deleteOtherEquipment: (equipmentId: string) => Promise<void>;
  
  addWeldingMachine: (machine: Omit<WeldingMachine, 'id'>) => Promise<void>;
  updateWeldingMachine: (machine: WeldingMachine) => Promise<void>;
  deleteWeldingMachine: (machineId: string) => Promise<void>;
  
  addWalkieTalkie: (machine: Omit<WalkieTalkie, 'id'>) => Promise<void>;
  updateWalkieTalkie: (machine: WalkieTalkie) => Promise<void>;
  deleteWalkieTalkie: (machineId: string) => Promise<void>;

  addPneumaticDrillingMachine: (item: Omit<PneumaticDrillingMachine, 'id'>) => Promise<void>;
  updatePneumaticDrillingMachine: (item: PneumaticDrillingMachine) => Promise<void>;
  deletePneumaticDrillingMachine: (itemId: string) => Promise<void>;

  addPneumaticAngleGrinder: (item: Omit<PneumaticAngleGrinder, 'id'>) => Promise<void>;
  updatePneumaticAngleGrinder: (item: PneumaticAngleGrinder) => Promise<void>;
  deletePneumaticAngleGrinder: (itemId: string) => Promise<void>;

  addWiredDrillingMachine: (item: Omit<WiredDrillingMachine, 'id'>) => Promise<void>;
  updateWiredDrillingMachine: (item: WiredDrillingMachine) => Promise<void>;
  deleteWiredDrillingMachine: (itemId: string) => Promise<void>;

  addCordlessDrillingMachine: (item: Omit<CordlessDrillingMachine, 'id'>) => Promise<void>;
  updateCordlessDrillingMachine: (item: CordlessDrillingMachine) => Promise<void>;
  deleteCordlessDrillingMachine: (itemId: string) => Promise<void>;

  addWiredAngleGrinder: (item: Omit<WiredAngleGrinder, 'id'>) => Promise<void>;
  updateWiredAngleGrinder: (item: WiredAngleGrinder) => Promise<void>;
  deleteWiredAngleGrinder: (itemId: string) => Promise<void>;

  addCordlessAngleGrinder: (item: Omit<CordlessAngleGrinder, 'id'>) => Promise<void>;
  updateCordlessAngleGrinder: (item: CordlessAngleGrinder) => Promise<void>;
  deleteCordlessAngleGrinder: (itemId: string) => Promise<void>;

  addCordlessReciprocatingSaw: (item: Omit<CordlessReciprocatingSaw, 'id'>) => Promise<void>;
  updateCordlessReciprocatingSaw: (item: CordlessReciprocatingSaw) => Promise<void>;
  deleteCordlessReciprocatingSaw: (itemId: string) => Promise<void>;

  addMachineLog: (log: Omit<MachineLog, 'id'|'machineId'|'loggedByUserId'>, machineId: string) => Promise<void>;
  deleteMachineLog: (logId: string) => Promise<void>;
  getMachineLogs: (machineId: string) => MachineLog[];

  addInternalRequest: (requestData: Omit<InternalRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => Promise<void>;
  deleteInternalRequest: (requestId: string) => Promise<void>;
  forceDeleteInternalRequest: (requestId: string) => Promise<void>;
  addInternalRequestComment: (requestId: string, commentText: string, notify?: boolean, subject?: string) => Promise<void>;
  updateInternalRequestStatus: (requestId: string, status: InternalRequestStatus) => Promise<void>;
  updateInternalRequestItemStatus: (requestId: string, itemId: string, status: InternalRequestItemStatus, comment?: string) => Promise<void>;
  updateInternalRequestItem: (requestId: string, updatedItem: InternalRequestItem, originalItem: InternalRequestItem, reason?: string) => Promise<void>;
  markInternalRequestAsViewed: (requestId: string) => Promise<void>;
  acknowledgeInternalRequest: (requestId: string) => Promise<void>;

  addPpeRequest: (request: Omit<PpeRequest, 'id' | 'requesterId' | 'date' | 'status' | 'comments' | 'viewedByRequester'>) => Promise<void>;
  updatePpeRequest: (request: PpeRequest, reason?: string) => Promise<void>;
  updatePpeRequestStatus: (requestId: string, status: PpeRequestStatus, comment: string) => Promise<void>;
  addPpeRequestComment: (requestId: string, commentText: string, notify?: boolean) => Promise<void>;
  resolvePpeDispute: (requestId: string, resolution: 'reissue' | 'reverse', comment: string) => Promise<void>;
  deletePpeRequest: (requestId: string) => Promise<void>;
  deletePpeAttachment: (requestId: string) => Promise<void>;
  markPpeRequestAsViewed: (requestId: string) => Promise<void>;
  updatePpeStock: (stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => Promise<void>;
  addPpeInwardRecord: (data: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => Promise<void>;
  updatePpeInwardRecord: (record: PpeInwardRecord) => Promise<void>;
  deletePpeInwardRecord: (record: PpeInwardRecord) => Promise<void>;
  
  addTpCertList: (listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => void;
  updateTpCertList: (listData: TpCertList) => void;
  deleteTpCertList: (listId: string) => void;

  addInspectionChecklist: (checklist: Omit<InspectionChecklist, 'id'>) => Promise<void>;
  updateInspectionChecklist: (checklist: InspectionChecklist) => Promise<void>;
  deleteInspectionChecklist: (id: string) => Promise<void>;

  addIgpOgpRecord: (record: Omit<IgpOgpRecord, 'id' | 'creatorId'>) => Promise<void>;
  deleteIgpOgpRecord: (mrnNumber: string) => Promise<void>;

  addDeliveryNote: (note: Omit<DeliveryNote, 'id' | 'creatorId' | 'createdAt'>) => Promise<void>;
  updateDeliveryNote: (noteId: string, updates: Partial<DeliveryNote>) => Promise<void>;
  deleteDeliveryNote: (noteId: string) => Promise<void>;

  addDamageReport: (reportData: Omit<DamageReport, 'id' | 'reporterId' | 'reportDate' | 'status' | 'attachmentDownloadUrl'>) => Promise<{ success: boolean; error?: string }>;
  updateDamageReportStatus: (reportId: string, status: DamageReportStatus, comment?: string) => Promise<void>;
  deleteDamageReport: (reportId: string) => Promise<void>;
  deleteAllDamageReportsAndFiles: () => Promise<void>;

  pendingConsumableRequestCount: number;
  updatedConsumableRequestCount: number;
  pendingGeneralRequestCount: number;
  updatedGeneralRequestCount: number;
  pendingPpeRequestCount: number;
  updatedPpeRequestCount: number;
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
    const { user, users, can, addActivityLog } = useAuth();
    const { projects, notificationSettings, managementRequests } = useGeneral();
    const { manpowerProfiles } = useManpower();
    const { toast } = useToast();
    const { consumableItems, addConsumableInwardRecord, consumableInwardHistory } = useConsumable();
    const { quotations, updateQuotation } = usePurchase();

    // State
    const [inventoryItemsById, setInventoryItemsById] = useState<Record<string, InventoryItem>>({});
    const [utMachinesById, setUtMachinesById] = useState<Record<string, UTMachine>>({});
    const [dftMachinesById, setDftMachinesById] = useState<Record<string, DftMachine>>({});
    const [mobileSimsById, setMobileSimsById] = useState<Record<string, MobileSim>>({});
    const [laptopsDesktopsById, setLaptopsDesktopsById] = useState<Record<string, LaptopDesktop>>({});
    const [digitalCamerasById, setDigitalCamerasById] = useState<Record<string, DigitalCamera>>({});
    const [anemometersById, setAnemometersById] = useState<Record<string, Anemometer>>({});
    const [otherEquipmentsById, setOtherEquipmentsById] = useState<Record<string, OtherEquipment>>({});
    const [weldingMachinesById, setWeldingMachinesById] = useState<Record<string, WeldingMachine>>({});
    const [walkieTalkiesById, setWalkieTalkiesById] = useState<Record<string, WalkieTalkie>>({});
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
    const [deliveryNotesById, setDeliveryNotesById] = useState<Record<string, DeliveryNote>>({});
    const [damageReportsById, setDamageReportsById] = useState<Record<string, DamageReport>>({});
    const [directives, setDirectives] = useState<Directive[]>([]);
    
    const [pneumaticDrillingMachinesById, setPneumaticDrillingMachinesById] = useState<Record<string, PneumaticDrillingMachine>>({});
    const [pneumaticAngleGrindersById, setPneumaticAngleGrindersById] = useState<Record<string, PneumaticAngleGrinder>>({});
    const [wiredDrillingMachinesById, setWiredDrillingMachinesById] = useState<Record<string, WiredDrillingMachine>>({});
    const [cordlessDrillingMachinesById, setCordlessDrillingMachinesById] = useState<Record<string, CordlessDrillingMachine>>({});
    const [wiredAngleGrindersById, setWiredAngleGrindersById] = useState<Record<string, WiredAngleGrinder>>({});
    const [cordlessAngleGrindersById, setCordlessAngleGrindersById] = useState<Record<string, CordlessAngleGrinder>>({});
    const [cordlessReciprocatingSawsById, setCordlessReciprocatingSawsById] = useState<Record<string, CordlessReciprocatingSaw>>({});
    const [inwardOutwardRecordsById, setInwardOutwardRecordsById] = useState<Record<string, InwardOutwardRecord>>({});

    // Memos
    const inventoryItems = useMemo(() => Object.values(inventoryItemsById), [inventoryItemsById]);
    const utMachines = useMemo(() => Object.values(utMachinesById), [utMachinesById]);
    const dftMachines = useMemo(() => Object.values(dftMachinesById), [dftMachinesById]);
    const mobileSims = useMemo(() => Object.values(mobileSimsById), [mobileSimsById]);
    const laptopsDesktops = useMemo(() => Object.values(laptopsDesktopsById), [laptopsDesktopsById]);
    const digitalCameras = useMemo(() => Object.values(digitalCamerasById), [digitalCamerasById]);
    const anemometers = useMemo(() => Object.values(anemometersById), [anemometersById]);
    const otherEquipments = useMemo(() => Object.values(otherEquipmentsById), [otherEquipmentsById]);
    const weldingMachines = useMemo(() => Object.values(weldingMachinesById), [weldingMachinesById]);
    const walkieTalkies = useMemo(() => Object.values(walkieTalkiesById), [walkieTalkiesById]);
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
    const deliveryNotes = useMemo(() => Object.values(deliveryNotesById), [deliveryNotesById]);
    const damageReports = useMemo(() => Object.values(damageReportsById), [damageReportsById]);
    const inwardOutwardRecords = useMemo(() => Object.values(inwardOutwardRecordsById), [inwardOutwardRecordsById]);

    const pneumaticDrillingMachines = useMemo(() => Object.values(pneumaticDrillingMachinesById), [pneumaticDrillingMachinesById]);
    const pneumaticAngleGrinders = useMemo(() => Object.values(pneumaticAngleGrindersById), [pneumaticAngleGrindersById]);
    const wiredDrillingMachines = useMemo(() => Object.values(wiredDrillingMachinesById), [wiredDrillingMachinesById]);
    const cordlessDrillingMachines = useMemo(() => Object.values(cordlessDrillingMachinesById), [cordlessDrillingMachinesById]);
    const wiredAngleGrinders = useMemo(() => Object.values(wiredAngleGrindersById), [wiredAngleGrindersById]);
    const cordlessAngleGrinders = useMemo(() => Object.values(cordlessAngleGrindersById), [cordlessAngleGrindersById]);
    const cordlessReciprocatingSaws = useMemo(() => Object.values(cordlessReciprocatingSawsById), [cordlessReciprocatingSawsById]);
    
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
    
    const addInternalRequestComment = useCallback(async (requestId: string, commentText: string, notify?: boolean, subject?: string) => {
        if (!user) return;
        await _addInternalRequestComment(requestId, commentText, user, internalRequestsById, users, notificationSettings, notify, subject);
    }, [user, internalRequestsById, users, notificationSettings]);

    const addPpeRequestComment = useCallback(async (requestId: string, commentText: string, notify?: boolean) => {
        if (!user) return;
        const request = ppeRequestsById[requestId];
        if (!request) return;
    
        const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
        
        const updates: {[key: string]: any} = {};
        updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
        
        try {
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error("Failed to add PPE request comment:", error);
        }
    }, [user, ppeRequestsById]);

    const updatePpeRequestStatus = useCallback(async (requestId: string, status: PpeRequestStatus, comment: string) => {
        if (!user) return;
        const request = ppeRequestsById[requestId];
        if (!request) return;
    
        const updates: { [key: string]: any } = {};
        const basePath = `ppeRequests/${requestId}`;
        updates[`${basePath}/status`] = status;
        updates[`${basePath}/approverId`] = user.id;
        updates[`${basePath}/viewedByRequester`] = false;
    
        if (status === 'Issued') {
            const stockPath = request.ppeType === 'Coverall' 
                ? `ppeStock/coveralls/sizes/${request.size}` 
                : `ppeStock/safetyShoes/quantity`;
            const itemRef = ref(rtdb, stockPath);

            try {
                const transactionResult = await runTransaction(itemRef, (currentStock) => {
                    const stock = Number(currentStock) || 0;
                    const requestedQty = request.quantity || 1;
                    if (stock < requestedQty) {
                        return; // Abort transaction by returning undefined
                    }
                    return stock - requestedQty;
                });
    
                if (!transactionResult.committed) {
                    toast({ title: "Insufficient Stock", description: `Not enough stock for ${request.ppeType} size ${request.size}.`, variant: "destructive" });
                    return;
                }
    
                const historyRef = push(ref(rtdb, `manpowerProfiles/${request.manpowerId}/ppeHistory`));
                updates[`manpowerProfiles/${request.manpowerId}/ppeHistory/${historyRef.key}`] = {
                    id: historyRef.key, ppeType: request.ppeType, size: request.size, quantity: request.quantity || 1,
                    issueDate: new Date().toISOString(), requestType: request.requestType, remarks: request.remarks,
                    storeComment: comment, requestId: requestId, issuedById: user.id,
                };
            } catch (error) {
                console.error("Error issuing PPE:", error);
                toast({ title: 'Transaction Failed', description: 'Could not update stock. Please try again.', variant: 'destructive'});
                return;
            }
        }
    
        try {
            await update(ref(rtdb), updates);
            await addPpeRequestComment(requestId, `Status changed to ${status}. ${comment}`, true);
        } catch (error) {
            console.error("Error updating PPE request status:", error);
            toast({ title: 'Update Failed', description: 'Could not update PPE request.', variant: 'destructive' });
        }
    }, [user, ppeRequestsById, addPpeRequestComment, toast]);
    
    // Functions
    const addInwardOutwardRecord = useCallback(async (
        itemInfo: { itemId: string; itemType: string; name: string; },
        quantity: number,
        type: 'Inward' | 'Outward',
        source: string,
        remarks?: string
    ) => {
        if (!user) return;
    
        const newRecordRef = push(ref(rtdb, 'inwardOutwardRecords'));
        const newRecord: Omit<InwardOutwardRecord, 'id'> = {
            itemId: itemInfo.itemId, itemType: itemInfo.itemType, itemName: itemInfo.name, type,
            quantity, date: new Date().toISOString(), source, remarks: remarks || '', userId: user.id,
            status: type === 'Outward' ? 'Completed' : 'Pending Details',
        };
        try {
            await set(newRecordRef, newRecord);
        } catch (error) {
            console.error("Error adding inward/outward record:", error);
        }
    }, [user]);
    
    const finalizeInwardPurchase = useCallback(async (recordId: string, newItemsData: Partial<Omit<InventoryItem, 'id'>>[]) => {
        const record = inwardOutwardRecords.find(r => r.id === recordId);
        if (!record || !user) return;
        
        const storeProject = projects.find(p => p.name === 'Store');
        if (!storeProject) {
            toast({ title: 'Error', description: 'Store project not found.', variant: 'destructive'});
            return;
        }

        const updates: { [key: string]: any } = {};
        const now = new Date().toISOString();
        const itemsToCreate = newItemsData.map(itemData => {
            const newRefKey = push(ref(rtdb, 'inventoryItems')).key;
            if (!newRefKey) throw new Error("Could not generate key for new item");
            const newItem: Partial<InventoryItem> = {
                ...itemData, lastUpdated: now, isArchived: false, category: 'General',
                status: 'In Store', projectId: storeProject.id,
            };
            updates[`inventoryItems/${newRefKey}`] = newItem;
            return newRefKey;
        });
    
        updates[`inwardOutwardRecords/${recordId}/status`] = 'Completed';
        updates[`inwardOutwardRecords/${recordId}/finalizedItemIds`] = itemsToCreate;
        updates[`inwardOutwardRecords/${recordId}/quantity`] = newItemsData.length;
    
        try {
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error("Error finalizing inward purchase:", error);
        }
    }, [inwardOutwardRecords, user, projects, toast]);

    const receiveQuoteItem = useCallback(async (quotationId: string, vendorId: string, itemId: string, quantity: number) => {
        if (!user) return;
        const quotation = quotations.find(q => q.id === quotationId);
        if (!quotation) return;

        const vendor = quotation.vendors.find(v => v.vendorId === vendorId);
        const item = quotation.items.find(i => i.itemId === itemId);
        if (!vendor || !item) return;

        const isConsumable = consumableItemIds.has(item.itemId);

        try {
            if (isConsumable) {
                await addConsumableInwardRecord(item.itemId, quantity, new Date());
            } else {
                await addInwardOutwardRecord(
                    { itemId: item.itemId, itemType: item.itemType, name: item.description },
                    quantity, 'Inward', `From Quotation - ${quotation.title}`, `Vendor: ${vendor.name}`
                );
            }

            const clonedQuotation = structuredClone(quotation);
            const vendorIndex = clonedQuotation.vendors.findIndex(v => v.id === vendor.id);
            const quoteIndex = vendor.quotes.findIndex(q => q.itemId === itemId);

            if(vendorIndex > -1 && quoteIndex > -1) {
                const currentReceived = clonedQuotation.vendors[vendorIndex].quotes[quoteIndex].receivedQuantity || 0;
                clonedQuotation.vendors[vendorIndex].quotes[quoteIndex].receivedQuantity = currentReceived + quantity;
        
                const allItemsReceived = clonedQuotation.vendors[vendorIndex].quotes.every((q: any) => (q.receivedQuantity || 0) >= q.quantity);
        
                if (allItemsReceived) {
                    clonedQuotation.status = 'Completed';
                } else {
                    clonedQuotation.status = 'Partially Received';
                }
                
                await updateQuotation(clonedQuotation);
                toast({ title: `Logged ${quantity} of ${item.description} as 'Pending Details'`});
            }
        } catch(error) {
            console.error("Error receiving quote item:", error);
            toast({ title: 'Error', description: 'Failed to receive quote item.', variant: 'destructive'});
        }
    }, [user, quotations, addInwardOutwardRecord, updateQuotation, consumableItemIds, addConsumableInwardRecord, toast]);
    
    const addInventoryItem = useCallback(async (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'inventoryItems'));
        try {
            await set(newRef, { ...item, lastUpdated: new Date().toISOString() });
            addActivityLog(user.id, 'Inventory Item Added', `Added item: ${item.name}`);
            toast({ title: 'Success', description: 'Item added successfully.' });
        } catch(error) {
            console.error("Error adding inventory item:", error);
            toast({ title: 'Error', description: 'Failed to add item.', variant: 'destructive'});
        }
    }, [user, addActivityLog, toast]);

    const addMultipleInventoryItems = useCallback(async (itemsData: any[]): Promise<number> => {
      if(!user) return 0;
      let importedCount = 0;
      const allSerialNumbers = new Set(inventoryItems.map(i => i.serialNumber).filter(Boolean));
      const updates: { [key: string]: any } = {};
  
      itemsData.forEach(row => {
          const serial = row['SERIAL NUMBER'];
          if (!serial || allSerialNumbers.has(serial)) return;
  
          const itemName = row['ITEM NAME'];
          if (!itemName) return;
  
          const inspDate = row['INSPECTION DATE'];
          const inspDueDate = row['INSPECTION DUE DATE'];
          const tpDueDate = row['TP INSPECTION DUE DATE'];
          
          const storeProject = projects.find(p => p.name === 'Store');
          if(!storeProject) return;

          const dataToSave: Partial<InventoryItem> = {
              name: itemName, serialNumber: serial, chestCrollNo: row['CHEST CROLL NO'] || '', ariesId: row['ARIES ID'] || '',
              status: row['STATUS'] || 'In Store', projectId: projects.find(p => p.name === row['PROJECT'])?.id || storeProject.id,
              inspectionDate: inspDate && isValid(new Date(inspDate)) ? new Date(inspDate).toISOString() : '',
              inspectionDueDate: inspDueDate && isValid(new Date(inspDueDate)) ? new Date(inspDueDate).toISOString() : '',
              tpInspectionDueDate: tpDueDate && isValid(new Date(tpDueDate)) ? new Date(tpDueDate).toISOString() : '',
              certificateUrl: row['TP Certificate Link'] || '', inspectionCertificateUrl: row['Inspection Certificate Link'] || '',
              lastUpdated: new Date().toISOString(), isArchived: false, category: 'General',
          };
  
          const newRef = push(ref(rtdb, 'inventoryItems'));
          updates[`/inventoryItems/${newRef.key}`] = dataToSave;
          importedCount++;
          allSerialNumbers.add(serial);
      });
  
      if (Object.keys(updates).length > 0) {
          try {
            await update(ref(rtdb), updates);
            addActivityLog(user.id, 'Bulk Import Items', `Imported ${importedCount} items.`);
          } catch (error) {
            console.error("Error batch adding items:", error);
          }
      }
      return importedCount;
  }, [user, inventoryItems, projects, addActivityLog]);
    
    const batchAddInventoryItems = useCallback(async (items: Omit<InventoryItem, 'id' | 'lastUpdated'>[]) => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        items.forEach(item => {
            const newRef = push(ref(rtdb, 'inventoryItems'));
            updates[`/inventoryItems/${newRef.key}`] = { ...item, lastUpdated: new Date().toISOString() };
        });
        try {
            await update(ref(rtdb), updates);
            addActivityLog(user.id, 'Batch Added Items', `Added ${items.length} items`);
        } catch(error) {
            console.error("Error batch adding items:", error);
        }
    }, [user, addActivityLog]);

    const batchCreateAndLogItems = useCallback(async (itemsData: Partial<Omit<InventoryItem, 'id'>>[], source: string): Promise<number> => {
        if (!user) return 0;

        const storeProject = projects.find(p => p.name === 'Store');
        if(!storeProject) {
            toast({ title: 'Error', description: 'Store project not found.', variant: 'destructive'});
            return 0;
        }

        const updates: { [key: string]: any } = {};
        const now = new Date().toISOString();
    
        itemsData.forEach(itemData => {
            const newRef = push(ref(rtdb, 'inventoryItems'));
            const newItemId = newRef.key!;
            const newItem: Partial<InventoryItem> = {
                ...itemData, lastUpdated: now, isArchived: false, category: 'General',
                status: 'In Store', projectId: storeProject.id,
            };
            updates[`inventoryItems/${newItemId}`] = newItem;
    
            const newRecordRef = push(ref(rtdb, 'inwardOutwardRecords'));
            updates[`inwardOutwardRecords/${newRecordRef.key}`] = {
                itemId: newItemId, itemType: 'Inventory', itemName: itemData.name, type: 'Inward',
                quantity: 1, date: now, source: source, userId: user.id, status: 'Completed',
            };
        });
    
        try {
            await update(ref(rtdb), updates);
            return itemsData.length;
        } catch (error) {
            console.error("Error batch creating and logging items:", error);
            return 0;
        }
    }, [user, projects, toast]);
    
    const updateInventoryItem = useCallback(async (item: InventoryItem) => {
        if (!user) return;
        const { id, ...data } = item;
        try {
            await update(ref(rtdb, `inventoryItems/${id}`), { ...data, lastUpdated: new Date().toISOString() });
        } catch (error) {
            console.error("Error updating inventory item:", error);
        }
    }, [user]);
    
    const batchUpdateInventoryItems = useCallback(async (updatesToApply: { id: string; data: Partial<InventoryItem> }[]) => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        const now = new Date().toISOString();
        updatesToApply.forEach(({ id, data }) => {
            const path = `inventoryItems/${id}`;
            Object.entries(data).forEach(([key, value]) => {
                updates[`${path}/${key}`] = value;
            });
            updates[`${path}/lastUpdated`] = now;
        });
        try {
            await update(ref(rtdb), updates);
        } catch (error) {
            console.error("Error batch updating items:", error);
        }
    }, [user]);

    const updateInventoryItemGroup = useCallback(async (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'tpInspectionDueDate' | 'certificateUrl'>>) => {
        if (!user) return;
        const updatesToApply: { [key: string]: any } = {};
        inventoryItems.forEach(item => {
            if (item.name === itemName && item.tpInspectionDueDate === originalDueDate) {
                if (updates.tpInspectionDueDate) {
                    updatesToApply[`inventoryItems/${item.id}/tpInspectionDueDate`] = updates.tpInspectionDueDate;
                }
                if (updates.certificateUrl) {
                    updatesToApply[`inventoryItems/${item.id}/certificateUrl`] = updates.certificateUrl;
                }
                updatesToApply[`inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
            }
        });
        try {
            await update(ref(rtdb), updatesToApply);
            toast({ title: 'Bulk Update Successful' });
        } catch (error) {
            console.error("Error bulk updating items:", error);
            toast({ title: 'Error', description: 'Could not perform bulk update.', variant: 'destructive'});
        }
    }, [user, inventoryItems, toast]);
    
    const updateInspectionItemGroup = useCallback(async (itemName: string, originalDueDate: string, updates: Partial<Pick<InventoryItem, 'inspectionDate' | 'inspectionDueDate' | 'inspectionCertificateUrl'>>) => {
        if (!user) return;
        const updatesToApply: { [key: string]: any } = {};
        inventoryItems.forEach(item => {
            if (item.name === itemName && item.inspectionDueDate === originalDueDate) {
                if (updates.inspectionDate) {
                    updatesToApply[`inventoryItems/${item.id}/inspectionDate`] = updates.inspectionDate;
                }
                if (updates.inspectionDueDate) {
                    updatesToApply[`inventoryItems/${item.id}/inspectionDueDate`] = updates.inspectionDueDate;
                }
                if (updates.inspectionCertificateUrl) {
                    updatesToApply[`inventoryItems/${item.id}/inspectionCertificateUrl`] = updates.inspectionCertificateUrl;
                }
                updatesToApply[`inventoryItems/${item.id}/lastUpdated`] = new Date().toISOString();
            }
        });
        try {
            await update(ref(rtdb), updatesToApply);
            toast({ title: 'Bulk Update Successful' });
        } catch (error) {
            console.error("Error bulk updating items:", error);
            toast({ title: 'Error', description: 'Could not perform bulk update.', variant: 'destructive'});
        }
    }, [user, inventoryItems, toast]);

    const updateMultipleInventoryItems = useCallback(async (itemsData: any[]): Promise<number> => {
        if (!user) return 0;
        let updatedCount = 0;
        const updates: { [key: string]: any } = {};
  
        itemsData.forEach(row => {
            const serial = row['SERIAL NUMBER'];
            if (!serial) return;
    
            const existingItem = inventoryItems.find(i => i.serialNumber === serial);
            if (!existingItem) return;

            const dataToUpdate: Partial<InventoryItem> = {};
            
            if (row['ITEM NAME']) dataToUpdate.name = row['ITEM NAME'];
            if (row['CHEST CROLL NO']) dataToUpdate.chestCrollNo = row['CHEST CROLL NO'];
            if (row['ARIES ID']) dataToUpdate.ariesId = row['ARIES ID'];
            if (row['STATUS']) dataToUpdate.status = row['STATUS'];
            
            const newProjectId = projects.find(p => p.name === row['PROJECT'])?.id;
            if (newProjectId) dataToUpdate.projectId = newProjectId;
            
            const inspDate = row['INSPECTION DATE'];
            const inspDueDate = row['INSPECTION DUE DATE'];
            const tpDueDate = row['TP INSPECTION DUE DATE'];
            
            if(inspDate && isValid(new Date(inspDate))) dataToUpdate.inspectionDate = new Date(inspDate).toISOString();
            if(inspDueDate && isValid(new Date(inspDueDate))) dataToUpdate.inspectionDueDate = new Date(inspDueDate).toISOString();
            if(tpDueDate && isValid(new Date(tpDueDate))) dataToUpdate.tpInspectionDueDate = new Date(tpDueDate).toISOString();

            if(row['TP Certificate Link']) dataToUpdate.certificateUrl = row['TP Certificate Link'];
            if(row['Inspection Certificate Link']) dataToUpdate.inspectionCertificateUrl = row['Inspection Certificate Link'];
            
            dataToUpdate.lastUpdated = new Date().toISOString();
            
            Object.assign(updates, { [`/inventoryItems/${existingItem.id}`]: { ...existingItem, ...dataToUpdate } });
            updatedCount++;
        });
    
        if (Object.keys(updates).length > 0) {
            try {
                await update(ref(rtdb), updates);
            } catch (error) {
                console.error("Error bulk updating items:", error);
            }
        }
        return updatedCount;
    }, [user, inventoryItems, projects]);

    const batchDeleteInventoryItems = useCallback(async (itemIds: string[]) => {
        if (!user) return;
        const updates: { [key: string]: null } = {};
        itemIds.forEach(id => {
            updates[`inventoryItems/${id}`] = null;
        });
        try {
            await update(ref(rtdb), updates);
            toast({ title: `${itemIds.length} item(s) deleted`, variant: 'destructive' });
        } catch (error) {
            console.error("Error batch deleting items:", error);
            toast({ title: 'Error', description: 'Failed to delete items.', variant: 'destructive'});
        }
    }, [user, toast]);
    
    const deleteInventoryItemGroup = useCallback(async (itemName: string) => {
        if (!user) return;
        const updates: { [key: string]: null } = {};
        inventoryItems.forEach(item => {
            if (item.name === itemName) {
                updates[`inventoryItems/${item.id}`] = null;
            }
        });
        try {
            await update(ref(rtdb), updates);
            toast({ title: 'Item Group Deleted', variant: 'destructive' });
        } catch (error) {
            console.error("Error deleting item group:", error);
            toast({ title: 'Error', description: 'Could not delete item group.', variant: 'destructive'});
        }
    }, [user, inventoryItems, toast]);

    const renameInventoryItemGroup = useCallback(async (oldName: string, newName: string) => {
        if (!user) return;
        const updates: { [key: string]: string } = {};
        inventoryItems.forEach(item => {
            if (item.name === oldName) {
                updates[`inventoryItems/${item.id}/name`] = newName;
            }
        });
        try {
            await update(ref(rtdb), updates);
            toast({ title: 'Item Group Renamed' });
        } catch (error) {
            console.error("Error renaming item group:", error);
            toast({ title: 'Error', description: 'Could not rename item group.', variant: 'destructive'});
        }
    }, [user, inventoryItems, toast]);
    
    const revalidateExpiredItems = useCallback(async () => {
        if (!user) return;
        const updates: { [key: string]: any } = {};
        const now = new Date();
        let changedCount = 0;

        inventoryItems.forEach(item => {
            if (item.status === 'Expired') {
                const isStillExpired = (item.inspectionDueDate && isAfter(now, parseISO(item.inspectionDueDate))) ||
                                      (item.tpInspectionDueDate && isAfter(now, parseISO(item.tpInspectionDueDate)));
                if (!isStillExpired) {
                    updates[`inventoryItems/${item.id}/status`] = 'In Store'; 
                    changedCount++;
                }
            } else if (item.status !== 'Damaged' && item.status !== 'Quarantine') {
                const isExpired = (item.inspectionDueDate && isAfter(now, parseISO(item.inspectionDueDate))) ||
                                  (item.tpInspectionDueDate && isAfter(now, parseISO(item.tpInspectionDueDate)));
                if (isExpired) {
                    updates[`inventoryItems/${item.id}/status`] = 'Expired';
                    changedCount++;
                }
            }
        });

        if (changedCount > 0) {
            try {
                await update(ref(rtdb), updates);
                toast({ title: 'Items Revalidated', description: `${changedCount} item statuses were updated.` });
            } catch (error) {
                console.error("Error revalidating items:", error);
                toast({ title: 'Error', description: 'Failed to revalidate items.', variant: 'destructive'});
            }
        } else {
            toast({ title: 'No Changes', description: 'All item statuses are up-to-date.' });
        }
    }, [user, inventoryItems, toast]);
    
    const addTpCertList = useCallback((listData: Omit<TpCertList, 'id' | 'creatorId' | 'createdAt'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'tpCertLists'));
        try {
            set(newRef, {
                ...listData,
                creatorId: user.id,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error adding TP cert list:", error);
        }
    }, [user]);

    const updateTpCertList = useCallback((listData: TpCertList) => {
        if (!listData?.id) return;
        const { id, ...data } = listData;
        try {
            update(ref(rtdb, `tpCertLists/${id}`), data);
        } catch (error) {
            console.error("Error updating TP cert list:", error);
        }
    }, []);

    const deleteTpCertList = useCallback((listId: string) => {
        if (!listId) return;
        try {
            remove(ref(rtdb, `tpCertLists/${listId}`));
        } catch (error) {
            console.error("Error deleting TP cert list:", error);
        }
    }, []);

    const addInventoryTransferRequest = useCallback(async (request: Omit<InventoryTransferRequest, 'id' | 'requesterId' | 'requestDate' | 'status'>): Promise<boolean> => {
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            return false;
        }
    
        const newRef = push(ref(rtdb, 'inventoryTransferRequests'));
        const newRequest: Omit<InventoryTransferRequest, 'id'> = {
            ...request,
            requesterId: user.id,
            requestDate: new Date().toISOString(),
            status: 'Pending',
            comments: [],
            acknowledgedByRequester: false,
        };
    
        try {
            await set(newRef, newRequest);
            addActivityLog(user.id, 'Inventory Transfer Requested', `From ${projects.find(p => p.id === request.fromProjectId)?.name} to ${projects.find(p => p.id === request.toProjectId)?.name}`);
            return true;
        } catch (error) {
            console.error("Error creating transfer request:", error);
            toast({ title: 'Error', description: 'Could not create transfer request.', variant: 'destructive' });
            return false;
        }
    }, [user, addActivityLog, projects, toast]);

    const updateInventoryTransferRequest = useCallback(async (request: InventoryTransferRequest): Promise<boolean> => {
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            return false;
        }
        const { id, ...data } = request;
        try {
            await update(ref(rtdb, `inventoryTransferRequests/${id}`), {
                ...data,
                lastUpdated: new Date().toISOString(),
            });
            addActivityLog(user.id, 'Inventory Transfer Updated', `Request ID: ...${id.slice(-6)}`);
            return true;
        } catch (error) {
            console.error("Error updating transfer request:", error);
            toast({ title: 'Error', description: 'Could not update transfer request.', variant: 'destructive' });
            return false;
        }
    }, [user, addActivityLog, toast]);

    const placeholderFunctions: any = {};
    const functionNames = [
        'rejectInventoryTransferRequest', 'disputeInventoryTransfer', 'acknowledgeTransfer', 'clearInventoryTransferHistory',
        'resolveInternalRequestDispute', 'updateInwardOutwardRecord', 'deleteInwardOutwardRecord', 'addCertificateRequest',
        'fulfillCertificateRequest', 'addCertificateRequestComment', 'markFulfilledRequestsAsViewed', 'acknowledgeFulfilledRequest',
        'addInspectionChecklist', 'updateInspectionChecklist', 'deleteInspectionChecklist', 'addIgpOgpRecord',
        'deleteIgpOgpRecord', 'addDeliveryNote', 'updateDeliveryNote', 'deleteDeliveryNote', 'addDamageReport',
        'updateDamageReportStatus', 'deleteDamageReport', 'deleteAllDamageReportsAndFiles', 'addInternalRequest',
        'deleteInternalRequest', 'forceDeleteInternalRequest', 'updateInternalRequestStatus', 'updateInternalRequestItemStatus',
        'updateInternalRequestItem', 'markInternalRequestAsViewed', 'acknowledgeInternalRequest', 'addUTMachine', 'updateUTMachine',
        'deleteUTMachine', 'addDftMachine', 'updateDftMachine', 'deleteDftMachine', 'addMobileSim', 'updateMobileSim',
        'deleteMobileSim', 'addLaptopDesktop', 'updateLaptopDesktop', 'deleteLaptopDesktop', 'addDigitalCamera',
        'updateDigitalCamera', 'deleteDigitalCamera', 'addAnemometer', 'updateAnemometer', 'deleteAnemometer',
        'addOtherEquipment', 'updateOtherEquipment', 'deleteOtherEquipment', 'addWeldingMachine', 'updateWeldingMachine',
        'deleteWeldingMachine', 'addWalkieTalkie', 'updateWalkieTalkie', 'deleteWalkieTalkie', 'addPneumaticDrillingMachine',
        'updatePneumaticDrillingMachine', 'deletePneumaticDrillingMachine', 'addPneumaticAngleGrinder', 'updatePneumaticAngleGrinder',
        'deletePneumaticAngleGrinder', 'addWiredDrillingMachine', 'updateWiredDrillingMachine', 'deleteWiredDrillingMachine',
        'addCordlessDrillingMachine', 'updateCordlessDrillingMachine', 'deleteCordlessDrillingMachine', 'addWiredAngleGrinder',
        'updateWiredAngleGrinder', 'deleteWiredAngleGrinder', 'addCordlessAngleGrinder', 'updateCordlessAngleGrinder',
        'deleteCordlessAngleGrinder', 'addCordlessReciprocatingSaw', 'updateCordlessReciprocatingSaw',
        'deleteCordlessReciprocatingSaw', 'addMachineLog', 'deleteMachineLog', 'getMachineLogs', 'deleteInventoryTransferRequest',
        'addPpeRequest', 'updatePpeRequest', 'resolvePpeDispute', 'deletePpeRequest', 'deletePpeAttachment', 'markPpeRequestAsViewed',
        'updatePpeStock', 'addPpeInwardRecord', 'updatePpeInwardRecord', 'deletePpeInwardRecord', 'approveInventoryTransferRequest'
    ];
    functionNames.forEach(name => { placeholderFunctions[name] = useCallback(async () => {}, []) });


    useEffect(() => {
        const createDataListener = <T extends {}>(
            path: string,
            setData: React.Dispatch<React.SetStateAction<Record<string, T>>>,
        ) => {
            const dbRef = ref(rtdb, path);
            const unsubscribe = onValue(dbRef, (snapshot) => {
                const data = (snapshot.val() || {}) as Record<string, T>;
                const processedData = Object.keys(data).reduce((acc, key) => {
                    acc[key] = { ...data[key], id: key };
                    return acc;
                }, {} as Record<string, T>);
                setData(processedData);
            });
            return unsubscribe;
        };

        const unsubscribers = [
            createDataListener('inventoryItems', setInventoryItemsById),
            createDataListener('utMachines', setUtMachinesById),
            createDataListener('dftMachines', setDftMachinesById),
            createDataListener('mobileSims', setMobileSimsById),
            createDataListener('laptopsDesktops', setLaptopsDesktopsById),
            createDataListener('digitalCameras', setDigitalCamerasById),
            createDataListener('anemometers', setAnemometersById),
            createDataListener('otherEquipments', setOtherEquipmentsById),
            createDataListener('weldingMachines', setWeldingMachinesById),
            createDataListener('walkieTalkies', setWalkieTalkiesById),
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
            createDataListener('deliveryNotes', setDeliveryNotesById),
            createDataListener('damageReports', setDamageReportsById),
            createDataListener('inwardOutwardRecords', setInwardOutwardRecordsById),
            createDataListener('pneumaticDrillingMachines', setPneumaticDrillingMachinesById),
            createDataListener('pneumaticAngleGrinders', setPneumaticAngleGrindersById),
            createDataListener('wiredDrillingMachines', setWiredDrillingMachinesById),
            createDataListener('cordlessDrillingMachines', setCordlessDrillingMachinesById),
            createDataListener('wiredAngleGrinders', setWiredAngleGrindersById),
            createDataListener('cordlessAngleGrinders', setCordlessAngleGrindersById),
            createDataListener('cordlessReciprocatingSaws', setCordlessReciprocatingSawsById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: InventoryContextType = {
        inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, weldingMachines, walkieTalkies, machineLogs, certificateRequests, internalRequests, inventoryTransferRequests, ppeRequests, ppeStock, ppeInwardHistory, tpCertLists, inspectionChecklists, igpOgpRecords, deliveryNotes, directives: [], damageReports, inwardOutwardRecords,
        pneumaticDrillingMachines, pneumaticAngleGrinders, wiredDrillingMachines, cordlessDrillingMachines, wiredAngleGrinders, cordlessAngleGrinders, cordlessReciprocatingSaws,
        addInventoryItem, addMultipleInventoryItems, batchAddInventoryItems, batchCreateAndLogItems, updateInventoryItem, batchUpdateInventoryItems, updateInventoryItemGroup, updateInspectionItemGroup, updateMultipleInventoryItems, batchDeleteInventoryItems, deleteInventoryItemGroup, renameInventoryItemGroup, revalidateExpiredItems,
        addInventoryTransferRequest, updateInventoryTransferRequest,
        addTpCertList, updateTpCertList, deleteTpCertList,
        ...placeholderFunctions,
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
