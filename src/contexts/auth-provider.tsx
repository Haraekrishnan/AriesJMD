
'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, Dispatch, SetStateAction, useMemo, useRef } from 'react';
import { User, RoleDefinition, Permission, ALL_PERMISSIONS, PasswordResetRequest, UnlockRequest, Feedback, DailyPlannerComment, PlannerEvent, Role, NotificationSettings } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, get, query, orderByChild, equalTo, update, push, set, remove } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { isSameDay, parseISO } from 'date-fns';

// --- TYPE DEFINITIONS ---

type PermissionsObject = Record<Permission, boolean>;

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  users: User[];
  roles: RoleDefinition[];
  passwordResetRequests: PasswordResetRequest[];
  unlockRequests: UnlockRequest[];
  can: PermissionsObject;
  appName: string;
  appLogo: string | null;
  activeTheme: 'none' | 'christmas' | 'diwali' | 'new-year';

  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User }>;
  logout: () => void;
  updateProfile: (name: string, email: string, avatarFile: File | null, password?: string, signatureFile?: File | null) => void;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPass: string) => Promise<boolean>;
  lockUser: (userId: string) => void;
  unlockUser: (userId: string) => void;
  requestUnlock: (userId: string, userName: string) => void;
  resolveUnlockRequest: (requestId: string, userId: string) => void;
  addUser: (user: Omit<User, 'id' | 'avatar' | 'status'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addRole: (role: Omit<RoleDefinition, 'id' | 'isEditable'>) => void;
  updateRole: (role: RoleDefinition) => void;
  deleteRole: (roleId: string) => void;
  updateBranding: (name: string, logo: string | null) => void;
  updateActiveTheme: (theme: 'none' | 'christmas' | 'diwali' | 'new-year') => void;
  addActivityLog: (userId: string, action: string, details?: string) => void;
  getVisibleUsers: () => User[];
  getAssignableUsers: () => User[];
  updateUserViewPreference: (key: 'jmsTracker' | 'timesheetTracker', value: 'board' | 'list') => void;
  clearInventoryTransferHistory: () => void; // This seems out of place
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [storedUserId, setStoredUserId] = useLocalStorage<string | null>('aries-userId-v1', null);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [rolesById, setRolesById] = useState<Record<string, RoleDefinition>>({});
  const [passwordResetRequestsById, setPasswordResetRequestsById] = useState<Record<string, PasswordResetRequest>>({});
  const [unlockRequestsById, setUnlockRequestsById] = useState<Record<string, UnlockRequest>>({});
  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<'none' | 'christmas' | 'diwali' | 'new-year'>('none');
  
  const users = useMemo(() => Object.values(usersById), [usersById]);
  const roles = useMemo(() => Object.values(rolesById), [rolesById]);
  const passwordResetRequests = useMemo(() => Object.values(passwordResetRequestsById), [passwordResetRequestsById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  
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

  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    if (!userId) return;
    const logRef = push(ref(rtdb, 'activityLogs'));
    const newLog = {
      userId, action, details: details || null, timestamp: new Date().toISOString(),
    };
    set(logRef, newLog);
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<{ success: boolean; user?: User }> => {
    setLoading(true);
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const usersData = snapshot.val();
      const userId = Object.keys(usersData)[0];
      const foundUser: User = { id: userId, ...usersData[userId] };

      if (foundUser.password === pass) {
        // If status is missing, default to 'active'
        const userStatus = foundUser.status || 'active';

        if (userStatus === 'locked' || userStatus === 'deactivated') {
            setUser({ ...foundUser, status: userStatus });
            setStoredUserId(foundUser.id);
            setLoading(false);
            return { success: true, user: { ...foundUser, status: userStatus } };
        } else {
            setStoredUserId(foundUser.id);
            setUser({ ...foundUser, status: 'active' });
            addActivityLog(foundUser.id, 'User Logged In');
            setLoading(false);
            return { success: true, user: { ...foundUser, status: 'active' } };
        }
      }
    }
    setLoading(false);
    return { success: false };
}, [setStoredUserId, addActivityLog]);

  const logout = useCallback(() => {
    setStoredUserId(null);
    setUser(null);
  }, [setStoredUserId]);
  
  const prevUserRef = useRef<User | null>();
  useEffect(() => {
    if (prevUserRef.current && !user) {
      addActivityLog(prevUserRef.current.id, 'User Logged Out');
      router.replace('/login');
    }
    prevUserRef.current = user;
  }, [user, addActivityLog, router]);


  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    const dataToSave: any = { ...data };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
      dataToSave.supervisorId = null;
    }
    
    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            dataToSave[key] = null;
        }
    });

    update(ref(rtdb, `users/${id}`), dataToSave);
    if (user?.id) addActivityLog(user.id, 'User Profile Updated', `Updated details for ${updatedUser.name}`);
    if (user?.id === updatedUser.id) setUser(updatedUser);
  }, [user, addActivityLog]);
  
 const updateProfile = useCallback(async (name: string, email: string, avatarFile: File | null, password?: string, signatureFile?: File | null) => {
    if (user) {
        const updatedUser: User = { ...user, name, email };
        if (password) updatedUser.password = password;

        const uploadPromises = [];
        if (avatarFile) {
            uploadPromises.push(
                uploadFile(avatarFile, `avatars/${user.id}/${avatarFile.name}`)
                    .then(url => ({ type: 'avatar', url }))
                    .catch(err => ({ type: 'avatar', error: err }))
            );
        }
        if (signatureFile) {
            uploadPromises.push(
                uploadFile(signatureFile, `signatures/${user.id}/${signatureFile.name}`)
                    .then(url => ({ type: 'signature', url }))
                    .catch(err => ({ type: 'signature', error: err }))
            );
        }
        
        const results = await Promise.all(uploadPromises);

        results.forEach(result => {
            if ('error' in result) {
                 toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload new ${result.type}.` });
            } else {
                if (result.type === 'avatar') updatedUser.avatar = result.url;
                if (result.type === 'signature') updatedUser.signatureUrl = result.url;
            }
        });
        
        updateUser(updatedUser);
    }
  }, [user, updateUser, toast]);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return false;

    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    const targetUser = { id: userId, ...userData[userId] };

    const settingsSnapshot = await get(ref(rtdb, 'settings/notificationSettings'));
    const notificationSettings: NotificationSettings = settingsSnapshot.val() || { events: {}, additionalRecipients: '' };

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const newRequestRef = push(ref(rtdb, 'passwordResetRequests'));
    await set(newRequestRef, {
        userId: targetUser.id,
        email: targetUser.email,
        date: new Date().toISOString(),
        status: 'pending',
        resetCode: code,
    });

    const htmlBody = `
        <p>You requested a password reset. Your one-time reset code is:</p>
        <h2 style="text-align: center; letter-spacing: 5px; font-size: 24px; margin: 20px 0;">${code}</h2>
        <p>If you did not request this, you can safely ignore this email.</p>
    `;

    try {
        await sendNotificationEmail({
            to: [targetUser.email],
            subject: "Your Password Reset Code",
            htmlBody: htmlBody,
            notificationSettings,
            event: 'onPasswordReset', 
            involvedUser: targetUser,
            creatorUser: null,
        });
    } catch(e) {
        console.error("Failed to send password reset email:", e);
    }
    
    return true;
  }, []);
  
  const resolveResetRequest = useCallback((requestId: string) => {
    update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });
  }, []);

  const resetPassword = useCallback(async (email: string, code: string, newPass: string): Promise<boolean> => {
    const requestsRef = query(ref(rtdb, 'passwordResetRequests'), orderByChild('email'), equalTo(email));
    const snapshot = await get(requestsRef);
    if (!snapshot.exists()) return false;
    
    const requestsData = snapshot.val();
    let validRequest: PasswordResetRequest | null = null;
    let requestId: string | null = null;
    
    for (const key in requestsData) {
      if (requestsData[key].resetCode === code && requestsData[key].status === 'pending') {
        validRequest = { id: key, ...requestsData[key] };
        requestId = key;
        break;
      }
    }
    
    if (!validRequest || !requestId) return false;
    
    await update(ref(rtdb, `users/${validRequest.userId}`), { password: newPass });
    await update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });
    addActivityLog(validRequest.userId, 'Password Reset');
    return true;
  }, [addActivityLog]);

  const lockUser = useCallback((userId: string) => update(ref(rtdb, `users/${userId}`), { status: 'locked' }), []);
  const unlockUser = useCallback((userId: string) => update(ref(rtdb, `users/${userId}`), { status: 'active' }), []);
  
  const requestUnlock = useCallback((userId: string, userName: string) => {
    const newRequestRef = push(ref(rtdb, 'unlockRequests'));
    set(newRequestRef, { userId, userName, date: new Date().toISOString(), status: 'pending' });

  }, [users]);
  
  const resolveUnlockRequest = useCallback((requestId: string, userId: string) => {
    unlockUser(userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [unlockUser]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar' | 'status'>) => {
    const newRef = push(ref(rtdb, 'users'));
    set(newRef, {
      ...userData,
      supervisorId: userData.supervisorId || null,
      avatar: `https://i.pravatar.cc/150?u=${newRef.key}`,
      status: 'active',
      planningScore: 0,
    });
    if (user) addActivityLog(user.id, 'New User Added', `Added user: ${userData.name}`);
  }, [user, addActivityLog]);
  
  const deleteUser = useCallback((userId: string) => {
    remove(ref(rtdb, `users/${userId}`));
    if (user) addActivityLog(user.id, 'User Deleted', `Deleted user ID: ${userId}`);
  }, [user, addActivityLog]);

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
  
  const updateBranding = useCallback((name: string, logo: string | null) => {
    if (!user || user.role !== 'Admin') {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only administrators can change branding settings.' });
      return;
    }
    const updates: { [key: string]: any } = { '/branding/appName': name };
    if (logo !== undefined) updates['/branding/appLogo'] = logo;
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Branding Updated', `App name changed to "${name}"`);
  }, [user, addActivityLog, toast]);

  const updateActiveTheme = useCallback((theme: 'none' | 'christmas' | 'diwali' | 'new-year') => {
    if (user && (user.role === 'Admin' || user.role === 'Project Coordinator')) {
        set(ref(rtdb, 'decorations/activeTheme'), theme);
    }
  }, [user]);

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

    if (user.role === 'Admin' || user.role === 'Manager') {
        return users;
    }

    const visibleUserIds = new Set<string>([user.id]);
    
    // Add supervisor
    if(user.supervisorId) {
        visibleUserIds.add(user.supervisorId);
    }
    
    // Add all subordinates
    const subordinates = getSubordinateChain(user.id, users);
    subordinates.forEach(id => visibleUserIds.add(id));

    return users.filter(u => visibleUserIds.has(u.id));
}, [user, users, getSubordinateChain]);

  const getAssignableUsers = useCallback(() => {
    if (!user) return [];
    return users.filter(u => u.role !== 'Manager');
  }, [user, users]);
  
  const updateUserViewPreference = useCallback((key: 'jmsTracker' | 'timesheetTracker', value: 'board' | 'list') => {
    if (!user) return;
    const path = `users/${user.id}/viewPreferences/${key}`;
    set(ref(rtdb, path), value);
  }, [user]);
  
  const clearInventoryTransferHistory = useCallback(() => {}, []); // Placeholder

  useEffect(() => {
    const unsubscribers = [
      createDataListener('users', setUsersById),
      createDataListener('roles', setRolesById),
      createDataListener('passwordResetRequests', setPasswordResetRequestsById),
      createDataListener('unlockRequests', setUnlockRequestsById),
      onValue(ref(rtdb, 'branding'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAppName(currentAppName => {
            const newName = data.appName || 'Aries Marine';
            if (newName === currentAppName) return currentAppName;
            return newName;
          });
          setAppLogo(currentAppLogo => {
            const newLogo = data.appLogo || null;
            if (newLogo === currentAppLogo) return currentAppLogo;
            return newLogo;
          });
        }
      }),
      onValue(ref(rtdb, 'decorations/activeTheme'), (snapshot) => {
        const theme = snapshot.val() || 'none';
        setActiveTheme(theme);
      }),
    ];

    if (!storedUserId) {
        setLoading(false);
    } else {
      const userRef = ref(rtdb, `users/${storedUserId}`);
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if(snapshot.exists()) {
          const userData = { id: snapshot.key!, ...snapshot.val() };
          setUser(currentUser => {
            if (JSON.stringify(currentUser) === JSON.stringify(userData)) {
              return currentUser;
            }
            return userData;
          });
        } else {
          logout();
        }
        setLoading(false);
      });
      unsubscribers.push(unsubscribeUser);
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [storedUserId, logout]);

  const contextValue: AuthContextType = {
    user, loading, users, roles, passwordResetRequests, unlockRequests, can, appName, appLogo, activeTheme,
    login, logout, updateProfile, requestPasswordReset,
    resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, updateBranding, updateActiveTheme, addActivityLog, getVisibleUsers, getAssignableUsers,
    updateUserViewPreference,
    clearInventoryTransferHistory
  } as AuthContextType;

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
