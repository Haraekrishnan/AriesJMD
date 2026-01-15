'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, Dispatch, SetStateAction, useMemo } from 'react';
import { User, RoleDefinition, Permission, ALL_PERMISSIONS, PasswordResetRequest, UnlockRequest, Feedback, DailyPlannerComment, PlannerEvent } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, get, query, orderByChild, equalTo, update, push, set, remove } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { isSameDay, parseISO } from 'date-fns';

// --- TYPE DEFINITIONS ---

type PermissionsObject = Record<Permission, boolean>;

type AuthContextType = {
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
  plannerNotificationCount: number;

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
  clearInventoryTransferHistory: () => void;
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
  const [plannerEventsById, setPlannerEventsById] = useState<Record<string, PlannerEvent>>({});
  const [dailyPlannerCommentsById, setDailyPlannerCommentsById] = useState<Record<string, DailyPlannerComment>>({});

  const users = useMemo(() => Object.values(usersById), [usersById]);
  const roles = useMemo(() => Object.values(rolesById), [rolesById]);
  const passwordResetRequests = useMemo(() => Object.values(passwordResetRequestsById), [passwordResetRequestsById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  const plannerEvents = useMemo(() => Object.values(plannerEventsById), [plannerEventsById]);
  const dailyPlannerComments = useMemo(() => Object.values(dailyPlannerCommentsById), [dailyPlannerCommentsById]);
  
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const can: PermissionsObject = useMemo(() => {
    const userRole = roles.find(r => r.name === user?.role);
    const permissions = userRole?.permissions || [];
    const canObject: PermissionsObject = {} as PermissionsObject;
    for (const permission of ALL_PERMISSIONS) {
      canObject[permission] = permissions.includes(permission);
    }
    return canObject;
  }, [user, roles]);

  const plannerNotificationCount = useMemo(() => {
    if (!user) return 0;

    const newDelegatedEvents = plannerEvents.filter(e =>
      e.userId === user.id &&
      e.creatorId !== user.id &&
      !e.viewedBy?.[user.id]
    );

    const unreadComments = dailyPlannerComments.filter(dayComment => {
      if (!dayComment.day || !dayComment.comments) return false;
      
      const comments = Array.isArray(dayComment.comments)
        ? dayComment.comments
        : Object.values(dayComment.comments || {});
      
      return comments.some(c => {
        if (!c) return false;
        const event = plannerEvents.find(e => e.id === c.eventId);
        if (!event) return false;
        const isParticipant = event.userId === user.id || event.creatorId === user.id;
        return isParticipant && c.userId !== user.id && !c.viewedBy?.[user.id];
      });
    });

    return newDelegatedEvents.length + unreadComments.length;
  }, [user, plannerEvents, dailyPlannerComments]);

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
      const foundUser = { id: userId, ...usersData[userId] };

      if (foundUser.password === pass) {
        if (foundUser.status === 'locked' || foundUser.status === 'deactivated') {
            setStoredUserId(foundUser.id);
            setUser(foundUser);
            setLoading(false);
            router.replace('/status');
            return { success: true, user: foundUser };
        }
        setStoredUserId(foundUser.id);
        setUser(foundUser);
        addActivityLog(foundUser.id, 'User Logged In');
        setLoading(false);
        return { success: true, user: foundUser };
      }
    }
    setLoading(false);
    return { success: false };
  }, [setStoredUserId, addActivityLog, router]);

  const logout = useCallback(() => {
    if (user) addActivityLog(user.id, 'User Logged Out');
    setStoredUserId(null);
    setUser(null);
    router.push('/login');
  }, [user, setStoredUserId, router, addActivityLog]);

  const updateUser = useCallback((updatedUser: User) => {
    const { id, ...data } = updatedUser;
    const dataToSave: any = { ...data };
    if (dataToSave.supervisorId === 'none' || dataToSave.supervisorId === undefined) {
      dataToSave.supervisorId = null;
    }
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

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        const newRequestRef = push(ref(rtdb, 'passwordResetRequests'));
        await set(newRequestRef, {
            userId: targetUser.id,
            email: targetUser.email,
            date: new Date().toISOString(),
            status: 'pending',
            resetCode: code,
        });
        
        // This feature is currently disabled
        // if (targetUser.email) {
        //     sendNotificationEmail({
        //         to: [targetUser.email], 
        //         subject:`Your Password Reset Code`, 
        //         htmlBody: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code will expire. Please use it to reset your password in the app.</p>`,
        //         notificationSettings: {} as any, // Placeholder for now
        //         event: 'onPasswordReset', // This might need a new event type
        //     });
        // }
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

    const admins = users.filter(u => u.role === 'Admin' && u.email);
    admins.forEach(admin => {
        // Disabled for now
        // sendNotificationEmail({
        //     to: [admin.email!],
        //     subject: `Account Unlock Request from ${userName}`,
        //     htmlBody: `<p>User <strong>${userName}</strong> (ID: ${userId}) has requested to have their account unlocked. Please log in to the admin panel to review the request.</p>`,
        //     notificationSettings: {} as any, // Placeholder
        //     event: 'onUnlockRequest',
        // });
    });
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
    set(ref(rtdb, 'decorations/activeTheme'), theme);
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
  
  const clearInventoryTransferHistory = useCallback(() => {
    // This is a placeholder now. The real implementation is in useInventory.
  }, []);

  useEffect(() => {
    const unsubscribers = [
      createDataListener('users', setUsersById),
      createDataListener('roles', setRolesById),
      createDataListener('passwordResetRequests', setPasswordResetRequestsById),
      createDataListener('unlockRequests', setUnlockRequestsById),
      onValue(ref(rtdb, 'branding'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAppName(data.appName || 'Aries Marine');
          setAppLogo(data.appLogo || null);
        }
      }),
      onValue(ref(rtdb, 'decorations/activeTheme'), (snapshot) => {
        setActiveTheme(snapshot.val() || 'none');
      }),
      createDataListener('plannerEvents', setPlannerEventsById),
      onValue(ref(rtdb, 'dailyPlannerComments'), (snapshot) => {
          const data = snapshot.val() || {};
          setDailyPlannerCommentsById(data);
      }),
    ];

    if (!storedUserId) {
        setLoading(false);
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [storedUserId]);

  useEffect(() => {
    if (storedUserId && users.length > 0) {
      const foundUser = users.find(u => u.id === storedUserId);
      if (foundUser) {
        if (foundUser.status === 'locked') {
          router.replace('/status');
        }
        setUser(foundUser);
      } else {
        logout();
      }
       setLoading(false);
    } else if (!storedUserId) {
      setLoading(false);
    }
  }, [storedUserId, users, logout, router]);

  const contextValue: AuthContextType = {
    user, loading, users, roles, passwordResetRequests, unlockRequests, can, appName, appLogo, activeTheme, plannerNotificationCount,
    login, logout, updateProfile, requestPasswordReset,
    resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, updateBranding, updateActiveTheme, addActivityLog, getVisibleUsers, getAssignableUsers, clearInventoryTransferHistory,
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
