
'use server';

import { rtdb } from '@/lib/rtdb';
import { ref, set } from 'firebase/database';
import type { NotificationSettings } from '@/lib/types';

export async function saveNotificationSettings(settings: NotificationSettings) {
  try {
    const dbRef = ref(rtdb, 'settings/notificationSettings');
    await set(dbRef, settings);

    return { success: true };
  } catch (error) {
    console.error("Failed to save notification settings:", error);
    return { success: false, error: (error as Error).message };
  }
}
