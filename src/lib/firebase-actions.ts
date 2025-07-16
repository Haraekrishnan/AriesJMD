// src/lib/firebase-actions.ts
import { ref, push, set } from 'firebase/database';
import { rtdb } from './firebase';

export async function addTaskToFirebase(title: string) {
  const tasksRef = ref(rtdb, "tasks");
  const newTaskRef = push(tasksRef);
  await set(newTaskRef, {
    title,
    createdAt: new Date().toISOString(),
  });
}
