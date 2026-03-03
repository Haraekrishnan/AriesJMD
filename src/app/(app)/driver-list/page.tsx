'use client';
import { redirect } from 'next/navigation';

// This page's functionality has been merged into the Fleet Management page
// at /vehicle-status.
export default function DriverListPage() {
    redirect('/vehicle-status?tab=drivers');
}
