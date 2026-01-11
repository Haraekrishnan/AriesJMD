

'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, Dispatch, SetStateAction, useMemo } from 'react';
import { User, RoleDefinition, Permission, ALL_PERMISSIONS, PasswordResetRequest, UnlockRequest, Feedback, Comment } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { rtdb } from '@/lib/rtdb';
import { ref, onValue, get, query, orderByChild, equalTo, update, push, set, remove } from 'firebase/database';
import useLocalStorage from '@/hooks/use-local-storage';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { uploadFile } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---

type PermissionsObject = Record<Permission, boolean>;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  users: User[];
  roles: RoleDefinition[];
  passwordResetRequests: PasswordResetRequest[];
  unlockRequests: UnlockRequest[];
  feedback: Feedback[];
  can: PermissionsObject;
  appName: string;
  appLogo: string | null;
  myFeedbackUpdates: number;

  login: (email: string, pass: string) => Promise<{ success: boolean; user?: User }>;
  logout: () => void;
  updateProfile: (data: Partial<User & { avatarFile?: File, signatureFile?: File, password?: string }>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resolveResetRequest: (requestId: string) => void;
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
  addFeedback: (subject: string, message: string) => void;
  updateFeedbackStatus: (feedbackId: string, status: Feedback['status']) => void;
  addFeedbackComment: (feedbackId: string, text: string) => void;
  markFeedbackAsViewed: () => void;
  updateBranding: (name: string, logo: string | null) => void;
  addActivityLog: (userId: string, action: string, details?: string) => void;
  getVisibleUsers: () => User[];
  getAssignableUsers: () => User[];
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
  const [feedbackById, setFeedbackById] = useState<Record<string, Feedback>>({});
  const [appName, setAppName] = useState('Aries Marine');
  const [appLogo, setAppLogo] = useState<string | null>(null);

  const users = useMemo(() => Object.values(usersById), [usersById]);
  const roles = useMemo(() => Object.values(rolesById), [rolesById]);
  const passwordResetRequests = useMemo(() => Object.values(passwordResetRequestsById), [passwordResetRequestsById]);
  const unlockRequests = useMemo(() => Object.values(unlockRequestsById), [unlockRequestsById]);
  const feedback = useMemo(() => Object.values(feedbackById), [feedbackById]);
  
  const myFeedbackUpdates = useMemo(() => {
    if (!user) return 0;
    return feedback.filter(f => {
        if (f.userId !== user.id) return false;
        
        const hasUnreadComment = (Array.isArray(f.comments) ? f.comments : Object.values(f.comments || {}))
            .some(c => c && c.userId !== user.id && !c.viewedBy?.[user.id]);
        
        const hasUnreadStatus = !f.viewedBy?.[user.id];

        return hasUnreadComment || hasUnreadStatus;
    }).length;
  }, [user, feedback]);

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
        setStoredUserId(foundUser.id);
        setUser(foundUser);
        addActivityLog(foundUser.id, 'User Logged In');
        setLoading(false);
        return { success: true, user: foundUser };
      }
    }
    setLoading(false);
    return { success: false };
  }, [setStoredUserId, addActivityLog]);

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
  
  const updateProfile = useCallback(async (data: Partial<User & { avatarFile?: File, signatureFile?: File, password?: string }>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...data };
    
    if (data.avatarFile) {
        try {
            const avatarUrl = await uploadFile(data.avatarFile, `avatars/${user.id}/${data.avatarFile.name}`);
            updatedUser.avatar = avatarUrl;
        } catch (error) {
            console.error("Avatar upload failed:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload new profile picture." });
        }
    }

    if (data.signatureFile) {
        try {
            const signatureUrl = await uploadFile(data.signatureFile, `signatures/${user.id}/${data.signatureFile.name}`);
            updatedUser.signatureUrl = signatureUrl;
        } catch (error) {
            console.error("Signature upload failed:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload new signature." });
        }
    }

    // This will perform a shallow update, preserving fields not in the `updatedUser` object on the DB
    const { id, ...rest } = updatedUser;
    const { avatarFile, signatureFile, ...dbData } = rest; // Exclude files from DB write
    await update(ref(rtdb, `users/${id}`), dbData);

    if (user.id === id) {
        setUser(updatedUser); // Update local state
    }
}, [user, toast]);


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
        
        if (targetUser.email) {
            sendNotificationEmail({
                to: [targetUser.email], 
                subject:`Your Password Reset Code`, 
                htmlBody: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code will expire. Please use it to reset your password in the app.</p>`,
                notificationSettings: {} as any, // Placeholder for now
                event: 'onPasswordReset', // This might need a new event type
            });
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

    const admins = users.filter(u => u.role === 'Admin' && u.email);
    admins.forEach(admin => {
        sendNotificationEmail({
            to: [admin.email!],
            subject: `Account Unlock Request from ${userName}`,
            htmlBody: `<p>User <strong>${userName}</strong> (ID: ${userId}) has requested to have their account unlocked. Please log in to the admin panel to review the request.</p>`,
            notificationSettings: {} as any, // Placeholder
            event: 'onUnlockRequest',
        });
    });
  }, [users]);
  
  const resolveUnlockRequest = useCallback((requestId: string, userId: string) => {
    unlockUser(userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [unlockUser]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'avatar' | 'status'>) => {
    if (!user) return;
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
  
  const addFeedback = useCallback((subject: string, message: string) => {
    if (!user) return;
    const newRef = push(ref(rtdb, 'feedback'));
    set(newRef, {
      userId: user.id, subject, message, date: new Date().toISOString(), status: 'New', viewedBy: { [user.id]: true }, comments: [],
    });
  }, [user]);
  
    const addFeedbackComment = useCallback((feedbackId: string, text: string) => {
    if(!user) return;
    const feedbackItem = feedback.find(f => f.id === feedbackId);
    if (!feedbackItem) return;

    const newCommentRef = push(ref(rtdb, `feedback/${feedbackId}/comments`));
    const newComment: Omit<Comment, 'id'> = {
        id: newCommentRef.key!,
        userId: user.id,
        text,
        date: new Date().toISOString(),
        eventId: feedbackId,
    };
    set(newCommentRef, { ...newComment, viewedBy: { [user.id]: true }});
    
    // Notify user
    const feedbackCreator = users.find(u => u.id === feedbackItem.userId);
    if(feedbackCreator && feedbackCreator.email && feedbackCreator.id !== user.id) {
        sendNotificationEmail({
            to: [feedbackCreator.email],
            subject: `Update on your feedback: "${feedbackItem.subject}"`,
            htmlBody: `
                <p>There's an update on your submitted feedback.</p>
                <p><strong>Reply from ${user.name}:</strong></p>
                <p>${text}</p>
            `,
            notificationSettings: {} as any,
            event: 'onInternalRequestUpdate' // Re-using an existing event type
        });
    }

    // Mark as unread for the creator
    update(ref(rtdb, `feedback/${feedbackId}/viewedBy`), { [feedbackItem.userId]: false });

  }, [user, feedback, users]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    if (!user) return;
    const updates: { [key: string]: any } = {
        [`feedback/${feedbackId}/status`]: status,
        [`feedback/${feedbackId}/viewedBy/${feedback.find(f => f.id === feedbackId)?.userId}`]: false,
    };
    update(ref(rtdb), updates);
    addFeedbackComment(feedbackId, `Status changed to ${status}`);
  }, [user, addFeedbackComment, feedback]);

  const markFeedbackAsViewed = useCallback(() => {
    if (!user) return;
    const updates: { [key: string]: any } = {};
    feedback.forEach(f => {
      if (f.userId === user.id) {
        const hasUnread = !f.viewedBy?.[user.id] || 
          Object.values(f.comments || {}).some(c => c.userId !== user.id && !c.viewedBy?.[user.id]);
        
        if (hasUnread) {
          updates[`feedback/${f.id}/viewedBy/${user.id}`] = true;
          Object.values(f.comments || {}).forEach(c => {
            if (c.userId !== user.id && !c.viewedBy?.[user.id]) {
                updates[`feedback/${f.id}/comments/${c.id}/viewedBy/${user.id}`] = true;
            }
          });
        }
      }
    });
    if (Object.keys(updates).length > 0) {
        update(ref(rtdb), updates);
    }
  }, [user, feedback]);
  
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
    const unsubscribers = [
      createDataListener('users', setUsersById),
      createDataListener('roles', setRolesById),
      createDataListener('passwordResetRequests', setPasswordResetRequestsById),
      createDataListener('unlockRequests', setUnlockRequestsById),
      createDataListener('feedback', setFeedbackById),
      onValue(ref(rtdb, 'branding'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAppName(data.appName || 'Aries Marine');
          setAppLogo(data.appLogo || null);
        }
      })
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
        setUser(foundUser);
      } else {
        // This case handles when a user is deleted from the DB
        logout();
      }
       setLoading(false);
    } else if (!storedUserId) {
      setLoading(false);
    }
  }, [storedUserId, users, logout]);

  const contextValue: AuthContextType = {
    user, loading, users, roles, passwordResetRequests, unlockRequests, feedback, can, appName, appLogo,
    login, logout, updateProfile, requestPasswordReset,
    resolveResetRequest, resetPassword, lockUser, unlockUser, requestUnlock, resolveUnlockRequest, addUser, updateUser, deleteUser, addRole, updateRole, deleteRole, addFeedback, updateFeedbackStatus, markFeedbackAsViewed, updateBranding, addActivityLog, getVisibleUsers, getAssignableUsers, addFeedbackComment,
    myFeedbackUpdates,
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

