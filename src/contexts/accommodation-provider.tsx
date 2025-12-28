'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction } from 'react';
import { Building, Room, Bed } from '@/lib/types';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, set, push, remove, update, get, runTransaction } from 'firebase/database';
import { useAuth } from './auth-provider';
import { useManpower } from './manpower-provider';

type AccommodationContextType = {
  buildings: Building[];
  addBuilding: (buildingNumber: string) => void;
  updateBuilding: (building: Building) => void;
  deleteBuilding: (buildingId: string) => void;
  addRoom: (buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => void;
  updateRoom: (buildingId: string, room: Room) => void;
  deleteRoom: (buildingId: string, roomId: string) => void;
  addBed: (buildingId: string, roomId: string) => void;
  updateBed: (buildingId: string, roomId: string, bed: Bed) => void;
  deleteBed: (buildingId: string, roomId: string, bedId: string) => void;
  assignOccupant: (buildingId: string, roomId: string, bedId: string, occupantId: string) => Promise<void>;
  unassignOccupant: (buildingId: string, roomId: string, bedId: string) => Promise<void>;
};

const createDataListener = <T extends {}>(
    path: string,
    setData: Dispatch<SetStateAction<Record<string, T>>>,
) => {
    const dbRef = ref(rtdb, path);
    const listener = onValue(dbRef, (snapshot) => {
        const data = snapshot.val() || {};
        // The processing into an array of objects with IDs is handled in useMemo now
        setData(data);
    });
    return () => listener();
};

const AccommodationContext = createContext<AccommodationContextType | undefined>(undefined);

export function AccommodationProvider({ children }: { children: ReactNode }) {
  const { user, addActivityLog } = useAuth();
  const { manpowerProfiles } = useManpower();
  const [buildingsById, setBuildingsById] = useState<Record<string, Building>>({});
  
  const buildings = useMemo(() => {
    return Object.entries(buildingsById).map(([id, building]) => {
      const roomsArray: Room[] = building.rooms ? Object.entries(building.rooms).map(([roomId, room]) => {
          const bedsArray = room.beds ? Object.entries(room.beds).map(([bedId, bed]) => ({ ...bed, id: bedId })) : [];
          return { ...room, id: roomId, beds: bedsArray };
      }) : [];
      return { ...building, id, rooms: roomsArray };
    });
  }, [buildingsById]);

  const addBuilding = useCallback((buildingNumber: string) => {
    const newRef = push(ref(rtdb, 'buildings'));
    set(newRef, { buildingNumber, rooms: {} });
  }, []);

  const updateBuilding = useCallback((building: Building) => {
    const { id, ...data } = building;
    const roomsAsObject = (data.rooms || []).reduce((acc: { [key: string]: any }, room) => {
      const bedsAsObject = (room.beds || []).reduce((bedAcc: { [key: string]: any }, bed) => {
        bedAcc[bed.id] = bed;
        return bedAcc;
      }, {});
      acc[room.id] = { ...room, beds: bedsAsObject };
      return acc;
    }, {});
    update(ref(rtdb, `buildings/${id}`), { ...data, rooms: roomsAsObject });
  }, []);

  const deleteBuilding = useCallback((buildingId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}`));
  }, []);

  const addRoom = useCallback((buildingId: string, roomData: { roomNumber: string, numberOfBeds: number }) => {
    const newRoomRef = push(ref(rtdb, `buildings/${buildingId}/rooms`));
    const bedsObject: { [key: string]: Bed } = {};
    for (let i = 0; i < roomData.numberOfBeds; i++) {
        const newBedRef = push(ref(rtdb, `buildings/${buildingId}/rooms/${newRoomRef.key}/beds`));
        bedsObject[newBedRef.key!] = { id: newBedRef.key!, bedNumber: `${i + 1}`, bedType: 'Bunk' };
    }
    set(newRoomRef, { id: newRoomRef.key, roomNumber: roomData.roomNumber, beds: bedsObject });
  }, []);
  
  const updateRoom = useCallback((buildingId: string, room: Room) => {
    const { id, ...data } = room;
    const bedsAsObject = (data.beds || []).reduce((acc: { [key: string]: any }, bed) => {
      acc[bed.id] = bed;
      return acc;
    }, {});
    update(ref(rtdb, `buildings/${buildingId}/rooms/${id}`), { ...data, beds: bedsAsObject });
  }, []);

  const deleteRoom = useCallback((buildingId: string, roomId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}`));
  }, []);

  const addBed = useCallback((buildingId: string, roomId: string) => {
    const newBedRef = push(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds`));
    set(newBedRef, { id: newBedRef.key, bedNumber: `New`, bedType: 'Bunk' });
  }, []);

  const updateBed = useCallback((buildingId: string, roomId: string, bed: Bed) => {
    const { id, ...data } = bed;
    update(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${id}`), data);
  }, []);

  const deleteBed = useCallback((buildingId: string, roomId: string, bedId: string) => {
    remove(ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`));
  }, []);

  const assignOccupant = useCallback(async (
    buildingId: string,
    roomId: string,
    bedId: string,
    occupantId: string
  ) => {
    const bedRef = ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`);
    const accRef = ref(rtdb, `manpowerProfiles/${occupantId}/accommodation`);
    const bedOccupantRef = ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}/occupantId`);

    const accSnap = await get(accRef);
    if (accSnap.exists()) {
        throw new Error('This person is already assigned to a bed.');
    }
    
    await runTransaction(bedRef, (bed) => {
        if (bed) {
            if (bed.occupantId) {
                // Bed is occupied, abort by returning undefined
                return;
            }
            bed.occupantId = occupantId;
        }
        return bed;
    });

    const finalBedSnap = await get(bedOccupantRef);
    if (finalBedSnap.val() !== occupantId) {
        throw new Error('This bed was assigned to another person simultaneously. Please try again.');
    }

    await set(accRef, { buildingId, roomId, bedId });
  }, []);
  
  const unassignOccupant = useCallback(async (
    buildingId: string,
    roomId: string,
    bedId: string
  ) => {
    const bedRef = ref(rtdb, `buildings/${buildingId}/rooms/${roomId}/beds/${bedId}`);
    
    const bedSnapshot = await get(bedRef);
    if (!bedSnapshot.exists()) {
      console.error("Bed not found, cannot unassign.");
      return;
    }
  
    const bedData = bedSnapshot.val();
    const occupantId = bedData.occupantId;
  
    if (!occupantId) {
      return;
    }
  
    const updates: { [key: string]: any } = {};
    updates[`buildings/${buildingId}/rooms/${roomId}/beds/${bedId}/occupantId`] = null;
    updates[`manpowerProfiles/${occupantId}/accommodation`] = null;
  
    await update(ref(rtdb), updates);
  
  }, []);

  useEffect(() => {
    const unsubscribers = [
      createDataListener('buildings', setBuildingsById),
    ];
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  const contextValue: AccommodationContextType = {
    buildings,
    addBuilding, updateBuilding, deleteBuilding,
    addRoom, updateRoom, deleteRoom,
    addBed, updateBed, deleteBed,
    assignOccupant, unassignOccupant,
  };

  return <AccommodationContext.Provider value={contextValue}>{children}</AccommodationContext.Provider>;
}

export const useAccommodation = (): AccommodationContextType => {
  const context = useContext(AccommodationContext);
  if (context === undefined) {
    throw new Error('useAccommodation must be used within an AccommodationProvider');
  }
  return context;
};
