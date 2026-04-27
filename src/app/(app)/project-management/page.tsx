'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import WorkOrderManagement from '@/components/project-management/WorkOrderManagement';
import { Briefcase } from 'lucide-react';

export default function ProjectManagementPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Briefcase className="h-10 w-10 text-primary" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
            <p className="text-muted-foreground">Manage work orders and other project-related settings.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Work Order Management</CardTitle>
            <CardDescription>Add, edit, or remove Work Order (WO) and ARC/OTC numbers.</CardDescription>
        </CardHeader>
        <CardContent>
            <WorkOrderManagement />
        </CardContent>
      </Card>
    </div>
  );
}
