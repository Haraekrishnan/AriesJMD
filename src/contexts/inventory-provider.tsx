
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { InventoryItem, UTMachine, DftMachine, MobileSim, LaptopDesktop, DigitalCamera, Anemometer, OtherEquipment, MachineLog, CertificateRequest, InventoryTransferRequest, PpeRequest, PpeStock, PpeHistoryRecord, PpeInwardRecord, TpCertList, InspectionChecklist, Comment, InternalRequest, InternalRequestItem, InternalRequestStatus, InternalRequestItemStatus, IgpOgpRecord, ManagementRequest, ManagementRequestStatus, PpeRequestStatus, Role, ConsumableInwardRecord } from '@/lib/types';
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

  addManagementRequest: (requestData: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => void;
  updateManagementRequest: (request: ManagementRequest) => void;
  deleteManagementRequest: (requestId: string) => void;
  updateManagementRequestStatus: (requestId: string, status: ManagementRequestStatus, comment: string) => void;
  addManagementRequestComment: (requestId: string, commentText: string) => void;
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

  pendingConsumableRequestCount: number;
  updatedConsumableRequestCount: number;
  pendingGeneralRequestCount: number;
  updatedGeneralRequestCount: number;
  pendingManagementRequestCount: number;
  updatedManagementRequestCount: number;
  pendingPpeRequestCount: number;
  updatedPpeRequestCount: number;
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
    const [managementRequestsById, setManagementRequestsById] = useState<Record<string, ManagementRequest>>({});
    const [inventoryTransferRequestsById, setInventoryTransferRequestsById] = useState<Record<string, InventoryTransferRequest>>({});
    const [ppeRequestsById, setPpeRequestsById] = useState<Record<string, PpeRequest>>({});
    const [ppeStockById, setPpeStockById] = useState<Record<string, PpeStock>>({});
    const [ppeInwardHistoryById, setPpeInwardHistoryById] = useState<Record<string, PpeInwardRecord>>({});
    const [tpCertListsById, setTpCertListsById] = useState<Record<string, TpCertList>>({});
    const [inspectionChecklistsById, setInspectionChecklistsById] = useState<Record<string, InspectionChecklist>>({});
    const [igpOgpRecordsById, setIgpOgpRecordsById] = useState<Record<string, IgpOgpRecord>>({});
    
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
    const managementRequests = useMemo(() => Object.values(managementRequestsById), [managementRequestsById]);
    const inventoryTransferRequests = useMemo(() => Object.values(inventoryTransferRequestsById), [inventoryTransferRequestsById]);
    const ppeRequests = useMemo(() => Object.values(ppeRequestsById), [ppeRequestsById]);
    const ppeStock = useMemo(() => Object.values(ppeStockById), [ppeStockById]);
    const ppeInwardHistory = useMemo(() => Object.values(ppeInwardHistoryById), [ppeInwardHistoryById]);
    const tpCertLists = useMemo(() => Object.values(tpCertListsById), [tpCertListsById]);
    const inspectionChecklists = useMemo(() => Object.values(inspectionChecklistsById), [inspectionChecklistsById]);
    const igpOgpRecords = useMemo(() => Object.values(igpOgpRecordsById), [igpOgpRecordsById]);
    
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

    const { pendingManagementRequestCount, updatedManagementRequestCount } = useMemo(() => {
        if (!user) return { pendingManagementRequestCount: 0, updatedManagementRequestCount: 0 };
        
        const pendingCount = managementRequests.filter(r => r.recipientId === user.id && r.status === 'Pending').length;
        const updatedCount = managementRequests.filter(r => r.requesterId === user.id && r.status !== 'Pending' && !r.viewedByRequester).length;

        return { pendingManagementRequestCount: pendingCount, updatedManagementRequestCount: updatedCount };
    }, [user, managementRequests]);

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

    // Functions
    const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
        if(!user) return;
        const newRef = push(ref(rtdb, 'inventoryItems'));
        const dataToSave = { 
            ...itemData, 
            chestCrollNo: itemData.chestCrollNo || null,
            lastUpdated: new Date().toISOString(),
            movedToProjectId: itemData.movedToProjectId || null,
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
                    subject:`Inventory Transfer Request from ${user.name}`,
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
        const newRef = push(ref(rtdb, 'otherEquipments'));
        set(newRef, equipment);
    }, []);

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

    const addPpeRequest = useCallback((requestData: Omit<PpeRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'ppeRequests'));
        const newRequest: Omit<PpeRequest, 'id'> = {
        ...requestData,
        requesterId: user.id,
        date: new Date().toISOString(),
        status: 'Pending',
        comments: [{ id: 'comment-initial', userId: user.id, text: 'Request created.', date: new Date().toISOString(), eventId: 'ppe-request' }],
        viewedByRequester: true,
        };
        set(newRef, newRequest);
        const manpower = manpowerProfiles.find(p => p.id === requestData.manpowerId);
        
        const historyArray = Array.isArray(manpower?.ppeHistory) ? manpower.ppeHistory : Object.values(manpower?.ppeHistory || {});
        const lastIssue = historyArray
        .filter(h => h && h.ppeType === requestData.ppeType)
        .sort((a,b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())[0];

        const stockItem = ppeStock.find(s => s.id === (requestData.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'));
        const stockInfo = requestData.ppeType === 'Coverall' && stockItem && 'sizes' in stockItem && stockItem.sizes
            ? `${stockItem.sizes[requestData.size] || 0} in stock`
            : (stockItem && 'quantity' in stockItem ? `${stockItem.quantity || 0} in stock` : 'N/A');
        
        sendPpeRequestEmail({
            requesterName: user.name,
            employeeName: manpower?.name,
            ppeType: requestData.ppeType,
            size: requestData.size,
            quantity: requestData.quantity,
            requestType: requestData.requestType,
            remarks: requestData.remarks,
            attachmentUrl: requestData.attachmentUrl,
            joiningDate: manpower?.joiningDate ? format(parseISO(manpower.joiningDate), 'dd-MM-yyyy') : 'N/A',
            rejoiningDate: 'N/A',
            lastIssueDate: lastIssue ? format(parseISO(lastIssue.issueDate), 'dd-MM-yyyy') : 'N/A',
            stockInfo: stockInfo,
            eligibility: requestData.eligibility,
            newRequestJustification: requestData.newRequestJustification
        });        
        
    }, [user, users, manpowerProfiles, ppeStock]);

    const addPpeRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean) => {
        if (!user) return;
        const request = ppeRequests.find(r => r.id === requestId);
        if (!request) return;

        const newCommentRef = push(ref(rtdb, `ppeRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: 'ppe-request' };
        
        const updates: { [key: string]: any } = {};
        updates[`ppeRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`ppeRequests/${requestId}/viewedByRequester`] = false;

        update(ref(rtdb), updates);

        const approvers = users.filter(u => ['Manager', 'Admin'].includes(u.role));
        const requester = users.find(u => u.id === request.requesterId);
        const employee = manpowerProfiles.find(p => p.id === request.manpowerId);

        if (notify) {
            const recipients = user.id === request.requesterId ? approvers : (requester ? [requester] : []);
            recipients.forEach(recipient => {
                if(recipient.email) {
                     const htmlBody = `
                        <h3>Query on PPE Request for ${employee?.name || '...'}</h3>
                        <p><strong>From:</strong> ${user.name}</p>
                        <p><strong>Comment:</strong> ${commentText}</p>
                        <p>Please review the request in the app.</p>
                     `;
                     sendNotificationEmail({
                        to: [recipient.email],
                        subject: `New Query on PPE Request for ${employee?.name || '...'}`,
                        htmlBody,
                        notificationSettings,
                        event: 'onPpeRequest',
                        involvedUser: recipient,
                        creatorUser: requester
                    });
                }
            })
        }
    }, [user, ppeRequests, users, manpowerProfiles, notificationSettings]);

    const updatePpeRequestStatus = useCallback((requestId: string, status: PpeRequestStatus, comment: string) => {
        if (!user) return;
        const request = ppeRequests.find(r => r.id === requestId);
        if (!request) return;
    
        const updates: { [key: string]: any } = {};
        updates[`ppeRequests/${requestId}/status`] = status;
        updates[`ppeRequests/${requestId}/viewedByRequester`] = false;
    
        if (status === 'Approved') {
            updates[`ppeRequests/${requestId}/approverId`] = user.id;
        } else if (status === 'Issued') {
            updates[`ppeRequests/${requestId}/issuedById`] = user.id;
            const newHistoryRef = push(ref(rtdb, `manpowerProfiles/${request.manpowerId}/ppeHistory`));
            const historyRecord: PpeHistoryRecord = {
                id: newHistoryRef.key!,
                ppeType: request.ppeType,
                size: request.size,
                quantity: request.quantity || 1,
                issueDate: new Date().toISOString(),
                requestType: request.requestType,
                remarks: `Issued based on request ID: ${requestId.slice(-6)}. ${request.remarks || ''}`,
                issuedById: user.id,
                approverId: request.approverId,
                requestId: requestId,
            };
            updates[`manpowerProfiles/${request.manpowerId}/ppeHistory/${newHistoryRef.key}`] = historyRecord;
            
            const stockPath = `/ppeStock/${request.ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'}`;
            get(ref(rtdb, stockPath)).then(snapshot => {
                const stockData = snapshot.val();
                if (request.ppeType === 'Coverall') {
                    const currentSizeStock = stockData?.sizes?.[request.size] || 0;
                    const newStock = Math.max(0, currentSizeStock - (request.quantity || 1));
                    update(ref(rtdb, `${stockPath}/sizes`), { ...stockData.sizes, [request.size]: newStock });
                } else {
                    const newStock = Math.max(0, (stockData?.quantity || 0) - (request.quantity || 1));
                    update(ref(rtdb, stockPath), { quantity: newStock });
                }
            });
        }
    
        update(ref(rtdb), updates);
        addPpeRequestComment(requestId, comment || `Status changed to ${status}`, true);
        
        const requester = users.find(u => u.id === request.requesterId);
        if (requester?.email) {
            const htmlBody = `
                <p>The status of your PPE request for ${manpowerProfiles.find(p => p.id === request.manpowerId)?.name} has been updated to <strong>${status}</strong> by ${user.name}.</p>
                <p><strong>Comment:</strong> ${comment}</p>
                <p>You can view the details in the app.</p>
            `;
            sendNotificationEmail({
                to: [requester.email],
                subject: `PPE Request ${status}`,
                htmlBody,
                notificationSettings,
                event: 'onInternalRequestUpdate',
                involvedUser: requester
            });
        }
    
    }, [user, users, ppeRequests, addPpeRequestComment, notificationSettings, manpowerProfiles]);
    
    const updatePpeRequest = useCallback((request: PpeRequest) => {
        const { id, ...data } = request;
        const updates: { [key: string]: any } = { ...data };
        if (data.attachmentUrl === undefined) {
          updates.attachmentUrl = null;
        }
        update(ref(rtdb, `ppeRequests/${id}`), updates);
      }, []);
    
    const resolvePpeDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
        if (!user) return;
        addPpeRequestComment(requestId, comment);
        if (resolution === 'reissue') {
            update(ref(rtdb, `ppeRequests/${requestId}`), { status: 'Approved' });
        } else { // reverse
            update(ref(rtdb, `ppeRequests/${requestId}`), { status: 'Issued' });
        }
    }, [user, addPpeRequestComment]);

    const deletePpeRequest = useCallback((requestId: string) => {
        remove(ref(rtdb, `ppeRequests/${requestId}`));
    }, []);

    const deletePpeAttachment = useCallback((requestId: string) => {
        update(ref(rtdb, `ppeRequests/${requestId}`), { attachmentUrl: null });
    }, []);

    const markPpeRequestAsViewed = useCallback((requestId: string) => {
        if(!user) return;
        const request = ppeRequests.find(r => r.id === requestId);
        if(request?.requesterId === user.id) {
            update(ref(rtdb, `ppeRequests/${requestId}`), { viewedByRequester: true });
        }
    }, [user, ppeRequests]);
    
    const updatePpeStock = useCallback((stockId: 'coveralls' | 'safetyShoes', data: { [key: string]: number } | number) => {
        const path = stockId === 'coveralls' ? 'sizes' : 'quantity';
        const updates = { [path]: data, lastUpdated: new Date().toISOString() };
        update(ref(rtdb, `ppeStock/${stockId}`), updates);
    }, []);
    
    const addPpeInwardRecord = useCallback((recordData: Omit<PpeInwardRecord, 'id' | 'addedByUserId'>) => {
        if(!user) return;
        const newRef = push(ref(rtdb, 'ppeInwardHistory'));
        set(newRef, { ...recordData, addedByUserId: user.id });

        const { ppeType, sizes, quantity } = recordData;
        const stockPath = `/ppeStock/${ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'}`;
        
        get(ref(rtdb, stockPath)).then(snapshot => {
            const stockData = snapshot.val();
            if (ppeType === 'Coverall' && sizes) {
                const currentSizes = stockData?.sizes || {};
                Object.keys(sizes).forEach(size => {
                    currentSizes[size] = (currentSizes[size] || 0) + (sizes[size] || 0);
                });
                update(ref(rtdb, `${stockPath}/sizes`), currentSizes);
            } else if (ppeType === 'Safety Shoes' && quantity) {
                update(ref(rtdb, stockPath), { quantity: (stockData?.quantity || 0) + quantity });
            }
        });
    }, [user]);

    const updatePpeInwardRecord = useCallback((record: PpeInwardRecord) => {
        const { id, ...data } = record;
        update(ref(rtdb, `ppeInwardHistory/${id}`), {
          ...data,
          sizes: data.sizes || null,
          quantity: data.quantity || null,
        });
    }, []);
    
    const deletePpeInwardRecord = useCallback((record: PpeInwardRecord) => {
        remove(ref(rtdb, `ppeInwardHistory/${record.id}`));
        
        const { ppeType, sizes, quantity } = record;
        const stockPath = `/ppeStock/${ppeType === 'Coverall' ? 'coveralls' : 'safetyShoes'}`;
        
        get(ref(rtdb, stockPath)).then(snapshot => {
            const stockData = snapshot.val();
            if (ppeType === 'Coverall' && sizes) {
                const currentSizes = stockData?.sizes || {};
                Object.keys(sizes).forEach(size => {
                    currentSizes[size] = Math.max(0, (currentSizes[size] || 0) - (sizes[size] || 0));
                });
                update(ref(rtdb, `${stockPath}/sizes`), currentSizes);
            } else if (ppeType === 'Safety Shoes' && quantity) {
                update(ref(rtdb, stockPath), { quantity: Math.max(0, (stockData?.quantity || 0) - quantity) });
            }
        });

    }, []);

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

        const storePersonnel = users.filter(u => ['Store in Charge', 'Assistant Store Incharge'].includes(u.role));
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
    
    const addInternalRequestComment = useCallback((requestId: string, commentText: string, notify?: boolean, subject?: string) => {
        if (!user) return;
        const request = internalRequestsById[requestId];
        if (!request) return;
    
        const newCommentRef = push(ref(rtdb, `internalRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
        
        const updates: {[key: string]: any} = {};
        updates[`internalRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`internalRequests/${requestId}/acknowledgedByRequester`] = false;
        
        update(ref(rtdb), updates);
    
        const requester = users.find(u => u.id === request.requesterId);
        const isFromRequester = user.id === request.requesterId;
        const approvers = users.filter(u => ['Store in Charge', 'Assistant Store Incharge', 'Admin'].includes(u.role));

        const recipients = isFromRequester ? approvers : (requester ? [requester] : []);

        if (notify) {
            recipients.forEach(recipient => {
                 if (recipient.email && recipient.id !== user.id) {
                     const htmlBody = `
                        <h3>${subject || `Query on your request #${requestId.slice(-6)}`}</h3>
                        <p><strong>From:</strong> ${user.name}</p>
                        <p><strong>Comment:</strong> ${commentText}</p>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-requests">View Request</a>
                    `;
                    sendNotificationEmail({
                        to: [recipient.email],
                        subject: subject || `Query on your request #${requestId.slice(-6)}`,
                        htmlBody,
                        notificationSettings,
                        event: 'onInternalRequestUpdate',
                        involvedUser: recipient,
                        creatorUser: requester
                    });
                }
            })
        }
      }, [user, internalRequestsById, users, can, notificationSettings]);

    
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

        const actionComment = `${requestedItem.description}: Status changed to ${status}.`;
        const finalComment = comment ? `${actionComment} Comment: ${comment}` : actionComment;
        
        addInternalRequestComment(requestId, finalComment, true, `Update on your request #${requestId.slice(-6)}`);
    
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
            const stockItem = inventoryItems.find(i => i.id === requestedItem.inventoryItemId);
            if (stockItem && stockItem.quantity !== undefined) {
                const newQuantity = Math.max(0, stockItem.quantity - requestedItem.quantity);
                updates[`inventoryItems/${requestedItem.inventoryItemId}/quantity`] = newQuantity;
            }
        }
    
        update(ref(rtdb), updates);
      }, [user, can.approve_store_requests, internalRequestsById, addInternalRequestComment, inventoryItems]);
    
    
      const updateInternalRequestItem = useCallback((requestId: string, updatedItem: InternalRequestItem, originalItem: InternalRequestItem) => {
        if (!user || !can.approve_store_requests) return;
        
        const request = internalRequestsById[requestId];
        if (!request) return;
    
        const itemIndex = request.items.findIndex(i => i.id === updatedItem.id);
        if (itemIndex === -1) return;
    
        update(ref(rtdb, `internalRequests/${requestId}/items/${itemIndex}`), updatedItem);
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

    const addManagementRequest = useCallback((requestData: Omit<ManagementRequest, 'id'|'requesterId'|'date'|'status'|'comments'|'viewedByRequester'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'managementRequests'));
        set(newRef, {
            ...requestData,
            requesterId: user.id,
            date: new Date().toISOString(),
            status: 'Pending',
            comments: [{ id: 'comment-initial', userId: user.id, text: `Request created for ${requestData.subject}.`, date: new Date().toISOString() }],
            viewedByRequester: true,
        });

        const recipient = users.find(u => u.id === requestData.recipientId);
        if (recipient?.email) {
            const htmlBody = `
                <p>You have received a new management request from ${user.name}.</p>
                <h3>${requestData.subject}</h3>
                <p>${requestData.body}</p>
                <p>Please log in to the app to review and respond.</p>
            `;
            sendNotificationEmail({
                to: [recipient.email],
                subject: `New Management Request: ${requestData.subject}`,
                htmlBody,
                notificationSettings,
                event: 'onManagementRequest'
            });
        }
    }, [user, users, notificationSettings]);

    const updateManagementRequest = useCallback((request: ManagementRequest) => {
        const { id, ...data } = request;
        update(ref(rtdb, `managementRequests/${id}`), data);
    }, []);

    const deleteManagementRequest = useCallback((requestId: string) => {
        remove(ref(rtdb, `managementRequests/${requestId}`));
    }, []);

    const addManagementRequestComment = useCallback((requestId: string, commentText: string) => {
        if (!user) return;
        const request = managementRequestsById[requestId];
        if (!request) return;

        const newCommentRef = push(ref(rtdb, `managementRequests/${requestId}/comments`));
        const newComment: Omit<Comment, 'id'> = { id: newCommentRef.key!, userId: user.id, text: commentText, date: new Date().toISOString(), eventId: requestId };
        
        const updates: {[key: string]: any} = {};
        updates[`managementRequests/${requestId}/comments/${newCommentRef.key}`] = { ...newComment };
        updates[`managementRequests/${requestId}/viewedByRequester`] = false;
        
        update(ref(rtdb), updates);

        const isFromRequester = user.id === request.requesterId;
        const recipient = users.find(u => u.id === (isFromRequester ? request.recipientId : request.requesterId));

        if (recipient?.email) {
            const htmlBody = `
                <h3>New comment on your management request: "${request.subject}"</h3>
                <p><strong>From:</strong> ${user.name}</p>
                <p><strong>Comment:</strong> ${commentText}</p>
                <p>Please review the request in the app.</p>
            `;
            sendNotificationEmail({
                to: [recipient.email],
                subject: `Reply on request: ${request.subject}`,
                htmlBody,
                notificationSettings,
                event: 'onManagementRequest'
            });
        }
    }, [user, users, managementRequestsById, notificationSettings]);
    
    const updateManagementRequestStatus = useCallback((requestId: string, status: ManagementRequestStatus, comment: string) => {
        if (!user) return;
        const updates: {[key: string]: any} = {};
        updates[`managementRequests/${requestId}/status`] = status;
        updates[`managementRequests/${requestId}/approverId`] = user.id;
        updates[`managementRequests/${requestId}/viewedByRequester`] = false;
        update(ref(rtdb), updates);
        addManagementRequestComment(requestId, `Status updated to ${status}. ${comment}`);
    }, [user, addManagementRequestComment]);
    
    const markManagementRequestAsViewed = useCallback((requestId: string) => {
        if (!user) return;
        const request = managementRequestsById[requestId];
        if (!request || request.requesterId !== user.id) return;
        update(ref(rtdb, `managementRequests/${requestId}`), { viewedByRequester: true });
    }, [user, managementRequestsById]);

    const addInspectionChecklist = useCallback((checklist: Omit<InspectionChecklist, 'id'>) => {
        if (!user) return;
        const newRef = push(ref(rtdb, 'inspectionChecklists'));
        
        const dataToSave: Partial<InspectionChecklist> = {
            ...checklist,
            purchaseDate: checklist.purchaseDate || null,
            firstUseDate: checklist.firstUseDate || null,
        };
        
        const newChecklist = { ...dataToSave, id: newRef.key! };
        set(newRef, newChecklist);

        update(ref(rtdb, `inventoryItems/${checklist.itemId}`), {
        inspectionDueDate: checklist.nextDueDate,
        lastUpdated: new Date().toISOString()
        });

        addActivityLog(user.id, "Inspection Checklist Created", `For item ID: ${checklist.itemId}`);
    }, [user, addActivityLog]);

    const updateInspectionChecklist = useCallback((checklist: InspectionChecklist) => {
        if (!user) return;
        const { id, ...data } = checklist;
        update(ref(rtdb, `inspectionChecklists/${id}`), data);
    }, [user]);
    
    const deleteInspectionChecklist = useCallback((id: string) => {
        if (!user) return;
        remove(ref(rtdb, `inspectionChecklists/${id}`));
    }, [user]);

    const resolveInternalRequestDispute = useCallback((requestId: string, resolution: 'reissue' | 'reverse', comment: string) => {
        // Dummy implementation, needs to be filled out
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
            createDataListener('managementRequests', setManagementRequestsById),
            createDataListener('inventoryTransferRequests', setInventoryTransferRequestsById),
            createDataListener('ppeRequests', setPpeRequestsById),
            createDataListener('ppeStock', setPpeStockById),
            createDataListener('ppeInwardHistory', setPpeInwardHistoryById),
            createDataListener('tpCertLists', setTpCertListsById),
            createDataListener('inspectionChecklists', setInspectionChecklistsById),
            createDataListener('igpOgpRecords', setIgpOgpRecordsById),
        ];
        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, []);

    const contextValue: InventoryContextType = {
        inventoryItems, utMachines, dftMachines, mobileSims, laptopsDesktops, digitalCameras, anemometers, otherEquipments, machineLogs, certificateRequests, internalRequests, managementRequests, inventoryTransferRequests, ppeRequests, ppeStock, ppeInwardHistory, tpCertLists, inspectionChecklists, igpOgpRecords, consumableInwardHistory,
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
        addManagementRequest, updateManagementRequest, deleteManagementRequest, updateManagementRequestStatus, addManagementRequestComment, markManagementRequestAsViewed,
        addPpeRequest, updatePpeRequest, updatePpeRequestStatus, addPpeRequestComment, resolvePpeDispute, deletePpeRequest, deletePpeAttachment, markPpeRequestAsViewed,
        updatePpeStock, addPpeInwardRecord, updatePpeInwardRecord, deletePpeInwardRecord,
        addTpCertList, updateTpCertList, deleteTpCertList,
        addInspectionChecklist, updateInspectionChecklist, deleteInspectionChecklist,
        addIgpOgpRecord, deleteIgpOgpRecord,
        pendingConsumableRequestCount, updatedConsumableRequestCount,
        pendingGeneralRequestCount, updatedGeneralRequestCount,
        pendingManagementRequestCount, updatedManagementRequestCount,
        pendingPpeRequestCount, updatedPpeRequestCount,
        resolveInternalRequestDispute,
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
