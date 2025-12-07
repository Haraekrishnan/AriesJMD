'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, Dispatch, SetStateAction, useMemo } from 'react';
import { User, RoleDefinition, Permission, ALL_PERMISSIONS } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, get, query, orderByChild, equalTo, update, push, set, remove } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---

type PermissionsObject = Record<Permission, boolean>;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  users: User[];
  roles: RoleDefinition[];
  can: PermissionsObject;
  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User }>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatarFile: File | null, password?: string) => void;
  resetPassword: (email: string, code: string, newPass: string) => Promise<boolean>;
  lockUser: (userId: string) => void;
  unlockUser: (userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar' | 'status'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addRole: (role: Omit<RoleDefinition, 'id' | 'isEditable'>) => void;
  updateRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => void;
  getVisibleUsers: () => User[];
  getAssignableUsers: () => User[];
};

// --- HELPER FUNCTIONS ---

const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `hashed_${hash}`;
};

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [storedUserId, setStoredUserId] = useLocalStorage<string | null>('aries-userId-v1', null);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [rolesById, setRolesById] = useState<Record<string, RoleDefinition>>({});
  
  const users = useMemo(() => Object.values(usersById), [usersById]);
  const roles = useMemo(() => Object.values(rolesById), [rolesById]);
  
  const { toast } = useToast();
  const router = useRouter();

  const can: PermissionsObject = useMemo(() => {
    const userRole = roles.find(r => r.name === user?.role);
    const permissions = userRole?.permissions || [];
    const canObject: PermissionsObject = {} as PermissionsObject;
    for (const permission of ALL_PERMISSIONS) {
      canObject[permission] = permissions.includes(permission);
    }
    return canObject;
  }, [user, roles]);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; user?: User }> => {
    setLoading(true);
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const userId = Object.keys(usersData)[0];
      const foundUser = { id: userId, ...usersData[userId] };
      const hashedPassword = hashPassword(pass);
      
      if (foundUser.password === hashedPassword) {
        setStoredUserId(foundUser.id);
        setUser(foundUser);
        setLoading(false);
        return { success: true, user: foundUser };
      }
    }
    setLoading(false);
    return { success: false };
  }, [setStoredUserId]);

  const logout = useCallback(() => {
    setStoredUserId(null);
    setUser(null);
    router.push('/login');
  }, [setStoredUserId, router]);

  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    const dataToSave: any = { ...data };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
      dataToSave.supervisorId = null;
    }
    if (dataToSave.password && !dataToSave.password.startsWith('hashed_')) {
        dataToSave.password = hashPassword(dataToSave.password);
    }

    update(ref(rtdb, `users/${id}`), dataToSave);
    if (user?.id === updatedUser.id) setUser(updatedUser);
  }, [user]);
  
  const updateProfile = useCallback(async (name: string, email: string, avatarFile: File | null, password?: string) => {
    if (user) {
        const updatedUser: User = { ...user, name, email };
        if (password) updatedUser.password = password;

        if (avatarFile) {
            try {
                const avatarUrl = await uploadFile(avatarFile, `avatars/${user.id}/${avatarFile.name}`);
                updatedUser.avatar = avatarUrl;
            } catch (error) {
                console.error("Avatar upload failed:", error);
                toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload new profile picture." });
            }
        }
        updateUser(updatedUser);
    }
  }, [user, updateUser, toast]);

    const resetPassword = useCallback(async (email: string, code: string, newPass: string): Promise<boolean> => {
        // This function needs access to passwordResetRequests, so it's moved to the combined provider
        // This is a placeholder to prevent crashes, the real logic is in AppProvider
        console.error("resetPassword should be called from useAppContext");
        return false;
    }, []);

  const lockUser = useCallback((userId: string) => update(ref(rtdb, `users/${userId}`), { status: 'locked' }), []);
  const unlockUser = useCallback((userId: string) => update(ref(rtdb, `users/${userId}`), { status: 'active' }), []);
  
  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar' | 'status'>) => {
    const newRef = push(ref(rtdb, 'users'));
    set(newRef, {
      ...userData,
      password: hashPassword(userData.password!),
      supervisorId: userData.supervisorId || null,
      avatar: `https://i.pravatar.cc/150?u=${newRef.key}`,
      status: 'active',
      planningScore: 0,
    });
  }, []);
  
  const deleteUser = useCallback((userId: string) => {
    remove(ref(rtdb, `users/${userId}`));
  }, []);

  const addRole = useCallback((role: Omit<RoleDefinition, 'id' | 'isEditable'>) => {
    const newRef = push(ref(rtdb, 'roles'));
    set(newRef, { ...role, isEditable: true });
  }, []);
  const updateRole = useCallback((role: RoleDefinition) => {
    const { id, ...data } = role;
    update(ref(rtdb, `roles/${id}`), data);
  }, []);
  const deleteRole = useCallback((roleId: string) => {
    remove(ref(rtdb, `roles/${roleId}`));
  }, []);
  
  const getSubordinateChain = useCallback((userId: string, allUsers: User[]): Set<string> => {
    const subordinates = new Set<string>();
    const queue = [userId];
    const visited = new Set<string>();
  
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if(visited.has(currentId)) continue;
      visited.add(currentId);

      const directReports = allUsers.filter(u => u.supervisorId === currentId);
      directReports.forEach(report => {
        if (!subordinates.has(report.id)) {
          subordinates.add(report.id);
          queue.push(report.id);
        }
      });
    }
    return subordinates;
  }, []);

  const getVisibleUsers = useCallback(() => {
    if (!user) return [];
    
    const highLevelRoles: RoleDefinition['name'][] = ['Admin', 'Manager', 'Project Coordinator', 'Document Controller', 'Store in Charge', 'Assistant Store Incharge'];
    const supervisorRoles: RoleDefinition['name'][] = ['Supervisor', 'Junior Supervisor', 'Senior Safety Supervisor', 'Safety Supervisor'];
  
    if (highLevelRoles.includes(user.role)) {
      if (user.role === 'Manager' || user.role === 'Admin') return users;
      if (user.role === 'Project Coordinator') return users.filter(u => u.role !== 'Manager');
      if (['Store in Charge', 'Document Controller', 'Assistant Store Incharge'].includes(user.role)) {
        return users.filter(u => u.role !== 'Admin' && u.role !== 'Project Coordinator');
      }
    }
  
    let visibleUserIds = new Set<string>([user.id]);
    const myDirectReports = users.filter(u => u.supervisorId === user.id);
    myDirectReports.forEach(u => visibleUserIds.add(u.id));

    if (supervisorRoles.includes(user.role) && user.supervisorId) {
      const directSupervisor = users.find(u => u.id === user.supervisorId);
      if (directSupervisor && supervisorRoles.includes(directSupervisor.role)) {
        getSubordinateChain(directSupervisor.id, users).forEach(id => visibleUserIds.add(id));
      }
    }
  
    return users.filter(u => visibleUserIds.has(u.id) && u.id !== user.supervisorId);
  }, [user, users, getSubordinateChain]);

  const getAssignableUsers = useCallback(() => {
    if (!user) return [];
    
    let assignableUsers = getVisibleUsers();
    assignableUsers = assignableUsers.filter(u => u.role !== 'Manager');
  
    const supervisorChain = new Set<string>();
    let currentUser: User | undefined = user;
    while(currentUser?.supervisorId) {
        supervisorChain.add(currentUser.supervisorId);
        currentUser = users.find(u => u.id === currentUser?.supervisorId);
        if (!currentUser) break;
    }
    return assignableUsers.filter(u => !supervisorChain.has(u.id));
  }, [user, users, getVisibleUsers]);
  
  useEffect(() => {
    const unsubUsers = createDataListener('users', setUsersById);
    const unsubRoles = createDataListener('roles', setRolesById);

    if (!storedUserId) {
        setLoading(false);
    }

    return () => {
      unsubUsers();
      unsubRoles();
    };
  }, [storedUserId]);

  useEffect(() => {
    if (storedUserId && users.length > 0) {
      const foundUser = users.find(u => u.id === storedUserId);
      if (foundUser) {
        setUser(foundUser);
      } else {
        logout();
      }
       setLoading(false);
    } else if (!storedUserId) {
      setLoading(false);
    }
  }, [storedUserId, users, logout]);

  const contextValue: AuthContextType = {
    user, loading, users, roles, can,
    login, logout, updateProfile, resetPassword, lockUser, unlockUser, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, getVisibleUsers, getAssignableUsers
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
