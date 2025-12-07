'use client';
import { createContext, useContext, ReactNode, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth-provider';
import { GeneralProvider, useGeneral } from './general-provider';
import { InventoryProvider, useInventory } from './inventory-provider';
import { ManpowerProvider, useManpower } from './manpower-provider';
import { PlannerProvider, usePlanner } from './planner-provider';
import { PurchaseProvider, usePurchase } from './purchase-provider';
import { TaskProvider, useTask } from './task-provider';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { add, isPast } from 'date-fns';
import { rtdb } from '@/lib/rtdb';
import { ref, set, push, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import type { PasswordResetRequest, UnlockRequest, Feedback } from '@/lib/types';


const AppContext = createContext({} as any);

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
        <GeneralProvider>
            <TaskProvider>
            <PlannerProvider>
                <ManpowerProvider>
                <PurchaseProvider>
                    <InventoryProvider>
                    <CombinedProvider>
                        {children}
                    </CombinedProvider>
                    </InventoryProvider>
                </PurchaseProvider>
                </ManpowerProvider>
            </PlannerProvider>
            </TaskProvider>
        </GeneralProvider>
    </AuthProvider>
  );
}

// A helper component to combine all context values and cross-context logic
function CombinedProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const general = useGeneral();
  const inventory = useInventory();
  const manpower = useManpower();
  const planner = usePlanner();
  const purchase = usePurchase();
  const task = useTask();
  const { toast } = useToast();
  
  const addActivityLog = useCallback((userId: string, action: string, details?: string) => {
    const newRef = push(ref(rtdb, 'activityLogs'));
    set(newRef, { userId, action, details, timestamp: new Date().toISOString() });
  }, []);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    if (!auth.user || auth.user.role !== 'Admin') {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only administrators can change branding settings.' });
      return;
    }
    const updates: { [key: string]: any } = { '/branding/appName': name };
    if (logo !== undefined) {
        updates['/branding/appLogo'] = logo;
    }
    update(ref(rtdb), updates);
    addActivityLog(auth.user.id, 'Branding Updated', `App name changed to "${name}"`);
  }, [auth.user, addActivityLog, toast]);

    const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    const usersRef = query(ref(rtdb, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return false;

    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    const targetUser = { id: userId, ...userData[userId] };

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = add(new Date(), { minutes: 15 }).toISOString();

    const newRequestRef = push(ref(rtdb, 'passwordResetRequests'));
    await set(newRequestRef, {
        userId: targetUser.id,
        email: targetUser.email,
        date: new Date().toISOString(),
        status: 'pending',
        resetCode: code,
        expiresAt: expiryDate
    });

    if (targetUser.email) {
        sendNotificationEmail({
            to: [targetUser.email],
            subject: `Your Password Reset Code`,
            htmlBody: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code will expire in 15 minutes. Please use it to reset your password in the app.</p>`,
            notificationSettings: general.notificationSettings,
            event: 'onPasswordReset',
        });
    }
    return true;
}, [general.notificationSettings]);
  
  const resolveResetRequest = useCallback((requestId: string) => {
    update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });
  }, []);

  const requestUnlock = useCallback((userId: string, userName: string) => {
    const newRequestRef = push(ref(rtdb, 'unlockRequests'));
    set(newRequestRef, { userId, userName, date: new Date().toISOString(), status: 'pending' });

    const admins = auth.users.filter(u => u.role === 'Admin' && u.email);
    admins.forEach(admin => {
        sendNotificationEmail({
            to: [admin.email!],
            subject: `Account Unlock Request from ${userName}`,
            htmlBody: `<p>User <strong>${userName}</strong> (ID: ${userId}) has requested to have their account unlocked. Please log in to the admin panel to review the request.</p>`,
            notificationSettings: general.notificationSettings,
            event: 'onUnlockRequest',
        });
    });
  }, [auth.users, general.notificationSettings]);
  
  const resolveUnlockRequest = useCallback((requestId: string, userId: string) => {
    auth.unlockUser(userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [auth.unlockUser]);

  const addFeedback = useCallback((subject: string, message: string) => {
    if (!auth.user) return;
    const newRef = push(ref(rtdb, 'feedback'));
    set(newRef, {
      userId: auth.user.id, subject, message, date: new Date().toISOString(), status: 'New', viewedBy: { [auth.user.id]: true },
    });
  }, [auth.user]);

  const updateFeedbackStatus = useCallback((feedbackId: string, status: Feedback['status']) => {
    update(ref(rtdb, `feedback/${feedbackId}`), { status });
  }, []);

  const markFeedbackAsViewed = useCallback(() => {
    if (!auth.user) return;
    const updates: { [key: string]: boolean } = {};
    let needsUpdate = false;
    general.feedback.forEach(f => {
      if (f && f.id && !f.viewedBy?.[auth.user!.id]) {
        updates[`feedback/${f.id}/viewedBy/${auth.user!.id}`] = true;
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
        update(ref(rtdb), updates);
    }
  }, [auth.user, general.feedback]);

  const combinedValue = {
    ...auth,
    ...general,
    ...inventory,
    ...manpower,
    ...planner,
    ...purchase,
    ...task,
    // Overwrite with cross-context functions
    addActivityLog,
    updateBranding,
    requestPasswordReset,
    resolveResetRequest,
    requestUnlock,
    resolveUnlockRequest,
    addFeedback,
    updateFeedbackStatus,
    markFeedbackAsViewed,
  };

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
