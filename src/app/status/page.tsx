
'use client';
import { redirect } from 'next/navigation';

export default function StatusPage() {
  redirect('/dashboard');
  return null;
}
