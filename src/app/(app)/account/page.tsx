'use client';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect } from 'react';
import type { User as UserType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Layers, ShieldPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddEmployeeDialog from '@/components/account/add-employee-dialog';
import EditEmployeeDialog from '@/components/account/edit-employee-dialog';
import AddRoleDialog from '@/components/account/add-role-dialog';
import RoleManagementTable from '@/components/account/role-management-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProjectManagementTable from '@/components/account/project-management-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountPage() {
  const { user, users, can, deleteUser, updateProfile, appName, appLogo, updateBranding, loading } = useAppContext();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const [newAppName, setNewAppName] = useState(appName);
  const [newAppLogo, setNewAppLogo] = useState<string | null>(appLogo);

  useEffect(() => {
    setNewAppName(appName);
    setNewAppLogo(appLogo);
  }, [appName, appLogo]);
  
  useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setAvatar(user.avatar);
    }
  }, [user]);

  const visibleUsers = useMemo(() => {
    if (!user) return [];
    // Only show other users in the management list
    const allVisible = user.role === 'Manager' || user.role === 'Admin' ? users : [user];
    return allVisible.filter(u => u.id !== user.id);
  }, [user, users]);

  if (loading || !user || !can) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="md:col-span-2">
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        </div>
    );
  }
  
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(name, email, avatar, password);
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved.',
    });
    setPassword('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewAppLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBrandingSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding(newAppName, newAppLogo);
    toast({
      title: 'Branding Updated',
      description: 'The application name and logo have been updated.',
    });
  };

  const handleEditClick = (userToEdit: UserType) => {
    setSelectedUser(userToEdit);
    setIsEditEmployeeDialogOpen(true);
  };
  
  const handleDelete = (userId: string) => {
    deleteUser(userId);
    toast({
        variant: 'destructive',
        title: 'User Deleted',
        description: 'The user has been removed from the system.',
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, team members, and application settings.</p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1 space-y-8">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={avatar} alt={name} data-ai-hint="user avatar" />
                <AvatarFallback>{name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle>{name}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.role}</p>
            </CardHeader>
          </Card>
        </div>
        <div className="md:col-span-2">
          <form onSubmit={handleProfileSave}>
            <Card>
                <CardHeader>
                <CardTitle>Update Profile</CardTitle>
                <CardDescription>Edit your personal information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="avatar-upload">Change Profile Picture</Label>
                    <Input id="avatar-upload" type="file" onChange={handleFileChange} accept="image/*" />
                </div>
                </CardContent>
                <CardFooter>
                <Button type="submit">Save Changes</Button>
                </CardFooter>
            </Card>
          </form>
        </div>
      </div>
      
      {can.manage_branding && (
        <Card>
          <form onSubmit={handleBrandingSave}>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>Customize the application's logo and title. Changes will apply across the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Application Name</Label>
                <Input id="appName" value={newAppName} onChange={e => setNewAppName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Application Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-md">
                    <AvatarImage src={newAppLogo || undefined} alt="App Logo" />
                    <AvatarFallback className="rounded-md bg-muted">
                      <Layers className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <Input id="logo-upload" type="file" onChange={handleLogoFileChange} accept="image/*" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center gap-2">
              <Button type="submit">Save Branding</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {can.manage_projects && (
          <Card>
            <CardHeader>
                <CardTitle>Project Management</CardTitle>
                <CardDescription>Add, edit, or remove project locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectManagementTable />
            </CardContent>
          </Card>
      )}

      {can.manage_roles && (
          <Card>
            <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>Define custom roles and assign granular permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <RoleManagementTable />
            </CardContent>
          </Card>
      )}

      {can.manage_users && (
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>User Account Management</CardTitle>
                  <CardDescription>View, add, edit, or remove user accounts.</CardDescription>
              </div>
              {can.manage_users && (
                <Button onClick={() => setIsAddEmployeeDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
              )}
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Supervisor</TableHead>
                          {can.manage_users && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {visibleUsers.map(report => {
                          const supervisor = users.find(u => u.id === report.supervisorId);
                          return (
                            <TableRow key={report.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={report.avatar} alt={report.name} />
                                            <AvatarFallback>{report.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">
                                            <p>{report.name}</p>
                                            <p className="text-xs text-muted-foreground">{report.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{report.role}</TableCell>
                                <TableCell>{supervisor?.name || 'N/A'}</TableCell>
                                {can.manage_users && (
                                    <TableCell className="text-right">
                                        <AlertDialog>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleEditClick(report)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the user account.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(report.id)}>Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                )}
                            </TableRow>
                          );
                      })}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      )}

      <AddEmployeeDialog isOpen={isAddEmployeeDialogOpen} setIsOpen={setIsAddEmployeeDialogOpen} />
      {selectedUser && (
        <EditEmployeeDialog isOpen={isEditEmployeeDialogOpen} setIsOpen={setIsEditEmployeeDialogOpen} user={selectedUser} />
      )}
      <AddRoleDialog isOpen={isAddRoleDialogOpen} setIsOpen={setIsAddRoleDialogOpen} />
    </div>
  );
}
