import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AccountPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Account</h1>
       <Card>
        <CardHeader>
            <CardTitle>Profile & Management</CardTitle>
            <CardDescription>Update your profile and manage system settings.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will allow users to update their profile information. Admins will find user, role, and project management tables here.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
