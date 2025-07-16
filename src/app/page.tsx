"use client";

import { useEffect, useState } from "react";
import { ref, push, set, onValue } from "firebase/database";
import { rtdb } from "../lib/firebase";

export default function Home() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const tasksRef = ref(rtdb, "tasks");
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formatted = Object.entries(data).map(([id, value]) => ({
        id,
        ...value,
      }));
      setTasks(formatted);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    const tasksRef = ref(rtdb, "tasks");
    const newTaskRef = push(tasksRef);
    await set(newTaskRef, {
      title,
      createdAt: new Date().toISOString(),
    });
    setTitle("");
  };

  return (
    <div>
      <h1>Realtime Tasks</h1>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleAdd}>Add Task</button>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </div>
  );
}
