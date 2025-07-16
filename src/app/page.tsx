'use client';
import { useState } from 'react';
import { addTaskToFirebase } from '@/lib/firebase-actions';

export default function Home() {
  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    if (!title.trim()) return; // Prevent adding empty tasks
    await addTaskToFirebase(title);
    setTitle('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Add a New Task</h1>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            className="flex-grow p-2 border border-gray-300 rounded-md"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
