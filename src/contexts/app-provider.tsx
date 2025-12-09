
'use client';
import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth-provider';
import { GeneralProvider, useGeneral } from './general-provider';
import { InventoryProvider, useInventory } from './inventory-provider';
import { ManpowerProvider, useManpower } from './manpower-provider';
import { PlannerProvider, usePlanner } from './planner-provider';
import { PurchaseProvider, usePurchase } from './purchase-provider';
import { TaskProvider, useTask } from './task-provider';
import { rtdb } from '@/lib/rtdb';
import { ref, push, set, update } from 'firebase/database';
import { sendNotificationEmail } from '@/app/actions/sendNotificationEmail';
import { add, isPast } from 'date-fns';
import { useRouter, usePathname } from 'next/navigation';

const AppContext = createContext({} as any);

function CombinedProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const general = useGeneral();
  const inventory = useInventory();
  const manpower = useManpower();
  const planner = usePlanner();
  const purchase = usePurchase();
  const task = useTask();
  const router = useRouter();
  const pathname = usePathname();

  // Centralized redirection logic
  useEffect(() => {
    const { user, loading } = auth;
    if (loading) return;

    const isAuthPage = pathname === '/login';
    const isStatusPage = pathname === '/status';

    if (!user && !isAuthPage) {
      router.replace('/login');
    } else if (user) {
      if (user.status === 'locked') {
        if (!isStatusPage) {
          router.replace('/status');
        }
      } else if (user.status === 'active') {
        if (isAuthPage || isStatusPage) {
          router.replace('/dashboard');
        }
      }
    }
  }, [auth.user, auth.loading, pathname, router]);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    const { users, passwordResetRequests } = auth;
    const { notificationSettings } = general;
    
    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return false;

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
            notificationSettings: notificationSettings,
            event: 'onPasswordReset',
        });
    }
    return true;
  }, [auth.users, general.notificationSettings]);

  const resolveResetRequest = useCallback((requestId: string) => {
    update(ref(rtdb, `passwordResetRequests/${requestId}`), { status: 'handled' });
  }, []);

  const requestUnlock = useCallback((userId: string, userName: string) => {
    const { users } = auth;
    const { notificationSettings } = general;
    const newRequestRef = push(ref(rtdb, 'unlockRequests'));
    set(newRequestRef, { userId, userName, date: new Date().toISOString(), status: 'pending' });

    const admins = users.filter(u => u.role === 'Admin' && u.email);
    admins.forEach(admin => {
        sendNotificationEmail({
            to: [admin.email!],
            subject: `Account Unlock Request from ${userName}`,
            htmlBody: `<p>User <strong>${userName}</strong> (ID: ${userId}) has requested to have their account unlocked. Please log in to the admin panel to review the request.</p>`,
            notificationSettings: notificationSettings,
            event: 'onUnlockRequest',
        });
    });
  }, [auth.users, general.notificationSettings]);

  const resolveUnlockRequest = useCallback((requestId: string, userId: string) => {
    auth.unlockUser(userId);
    update(ref(rtdb, `unlockRequests/${requestId}`), { status: 'resolved' });
  }, [auth.unlockUser]);
  
  const addFeedback = useCallback((subject: string, message: string) => {
    const { user } = auth;
    if (!user) return;
    const newRef = push(ref(rtdb, 'feedback'));
    set(newRef, {
      userId: user.id, subject, message, date: new Date().toISOString(), status: 'New', viewedBy: { [user.id]: true },
    });
  }, [auth.user]);

  const updateBranding = useCallback((name: string, logo: string | null) => {
    const { user, addActivityLog } = auth;
    if (!user || user.role !== 'Admin') return;
    const updates: { [key: string]: any } = { '/branding/appName': name };
    if (logo !== undefined) {
        updates['/branding/appLogo'] = logo;
    }
    update(ref(rtdb), updates);
    addActivityLog(user.id, 'Branding Updated', `App name changed to "${name}"`);
  }, [auth.user, auth.addActivityLog]);

  const combinedValue = {
    ...auth,
    ...general,
    ...inventory,
    ...manpower,
    ...planner,
    ...purchase,
    ...task,
    requestPasswordReset,
    resolveResetRequest,
    requestUnlock,
    resolveUnlockRequest,
    addFeedback,
    updateBranding,
  };

  return (
    <AppContext.Provider value={combinedValue}>
      {children}
    </AppContext.Provider>
  );
}

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

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
