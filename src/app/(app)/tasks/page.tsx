// This component is intentionally left with a placeholder implementation.
// A full Kanban board implementation is a significant feature.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TasksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Kanban Board</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A fully interactive drag-and-drop Kanban board is under construction.
            This will allow you to manage tasks across different stages: To Do, In Progress, and Completed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
