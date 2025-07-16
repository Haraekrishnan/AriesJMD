// src/app/page.tsx
"use client";
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
  return null;
}
const handleAdd = async () => {
  const tasksRef = ref(rtdb, "tasks");
  const newTaskRef = push(tasksRef);
  await set(newTaskRef, {
    title,
    createdAt: new Date().toISOString(),
  });
  setTitle("");
};