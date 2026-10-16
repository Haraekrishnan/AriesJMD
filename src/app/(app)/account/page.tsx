'use client';
import styles from '@/components/account/account.module.css';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMemo, useState, useEffect, useRef } from 'react';
import type { User as UserType } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Layers, Lock, Unlock, Eye, EyeOff, DatabaseZap, PartyPopper, Signature, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AddEmployeeDialog from '@/components/account/add-employee-dialog';
import EditEmployeeDialog from '@/components/account/edit-employee-dialog';
import AddRoleDialog from '@/components/account/add-role-dialog';
import RoleManagementTable from '@/components/account/role-management-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ProjectManagementTable from '@/components/account/project-management-table';
import { Skeleton } from '@/components/ui/skeleton';
import FeedbackManagement from '@/components/account/FeedbackManagement';
import { Badge } from '@/components/ui/badge';
import UnlockRequests from '@/components/account/UnlockRequests';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DecorationTheme } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AccountPage() {
  const { user, users, can, deleteUser, updateProfile, loading, getVisibleUsers, lockUser, unlockUser, appName, appLogo, updateBranding, activeTheme, updateActiveTheme } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [signaturePreview, setSignaturePreview] = useState(user?.signatureBase64 || '');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const [newAppName, setNewAppName] = useState(appName);
  const [newAppLogo, setNewAppLogo] = useState<string | null>(appLogo);
  const [selectedTheme, setSelectedTheme] = useState<DecorationTheme>(activeTheme || 'none');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userPage, setUserPage] = useState(1);
  const pageSize = 10;
  const sections = [
    { id: 'profile', label: 'My profile', allowed: true },
    { id: 'users', label: 'Users', allowed: can?.manage_users },
    { id: 'roles', label: 'Roles & permissions', allowed: can?.manage_roles || user?.role === 'Admin' },
    { id: 'projects', label: 'Projects', allowed: can?.manage_projects },
    { id: 'unlocks', label: 'Unlock requests', allowed: can?.manage_user_lock_status },
    { id: 'feedback', label: 'Feedback', allowed: can?.manage_feedback },
    { id: 'branding', label: 'Branding', allowed: can?.manage_branding },
    { id: 'decoration', label: 'Appearance', allowed: user?.role === 'Admin' || user?.role === 'Project Coordinator' },
  ].filter(section => section.allowed);
  const selectedSection = sections.some(section => section.id === activeSection) ? activeSection : 'profile';
  useEffect(() => { setUserPage(1); }, [userSearch, roleFilter, statusFilter]);


  useEffect(() => {
    setNewAppName(appName);
    setNewAppLogo(appLogo);
    setSelectedTheme(activeTheme || 'none');
  }, [appName, appLogo, activeTheme]);
  
  useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setAvatarPreview(user.avatar || '');
        setSignaturePreview(user.signatureBase64 || '');
    }
  }, [user]);

  const availableUsers = useMemo(() => {
    if (!user) return [];
    return getVisibleUsers().filter(u => u.id !== user.id);
  }, [user, getVisibleUsers, users]);
  const roleOptions = [...new Set(availableUsers.map(u => u.role))].sort();
  const visibleUsers = availableUsers.filter(u =>
    [u.name, u.email, u.role].join(' ').toLowerCase().includes(userSearch.trim().toLowerCase()) &&
    (roleFilter === 'all' || u.role === roleFilter) &&
    (statusFilter === 'all' || (u.status || 'active') === statusFilter)
  );
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
  const currentPage = Math.min(userPage, pageCount);
  const pageUsers = visibleUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading || !user || !can) {
    return (
        <div className={styles.page}>
            <Skeleton className="h-8 w-64" />
            <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="lg:col-span-2">
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        </div>
    );
  }
  
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const success = await updateProfile(name, email, avatarFile, password, signatureFile);
        
        if (success) {
          toast({
            title: 'Profile Updated',
            description: 'Your profile information has been saved successfully.',
          });
          
          setPassword('');
          setAvatarFile(null);
          setSignatureFile(null);
          
          if (avatarInputRef.current) avatarInputRef.current.value = "";
          if (signatureInputRef.current) signatureInputRef.current.value = "";
          
        } else {
          toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save your profile changes.',
          });
        }
    } catch (error) {
        console.error("[Account] Profile save exception:", error);
        toast({
            variant: 'destructive',
            title: 'Unexpected Error',
            description: 'An error occurred while saving your profile.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setSignaturePreview(reader.result as string);
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
  
  const handleRemoveAccess = (userId: string) => {
    deleteUser(userId);
    toast({
        variant: 'destructive',
        title: 'User Access Removed',
        description: 'The user account has been deactivated. Historical records remain preserved.',
    });
  };

  const handleLockToggle = (targetUser: UserType) => {
    if (targetUser.status === 'locked') {
        unlockUser(targetUser.id);
        toast({ title: 'User Unlocked', description: `${targetUser.name}'s account has been unlocked.` });
    } else {
        lockUser(targetUser.id);
        toast({ variant: 'destructive', title: 'User Locked', description: `${targetUser.name}'s account has been locked.` });
    }
  }

  const handleThemeSave = () => {
    updateActiveTheme(selectedTheme);
    toast({ title: 'Decorations Updated', description: 'The theme has been applied across the app.' });
  };

  return (
    <div className={styles.page}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, team members, and application settings.</p>
      </div>
      
      <label className={styles.mobileSection}>
        <span>Account section</span>
        <select aria-label="Account section" value={selectedSection} onChange={e => setActiveSection(e.target.value)}>
          {sections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}
        </select>
      </label>
      <nav className={styles.sectionNav} aria-label="Account sections">
        {sections.map(section => (
          <button key={section.id} type="button" aria-pressed={selectedSection === section.id}
            aria-controls={'account-panel-' + section.id} onClick={() => setActiveSection(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>
      <form id="account-panel-profile" hidden={selectedSection !== 'profile'} onSubmit={handleProfileSave}>
        <div className={styles.profileGrid}>
          <div className="lg:col-span-1 space-y-8">
            <Card>
              <CardHeader className="items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={avatarPreview} alt={name} />
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <CardTitle>{name}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.role}</p>
              </CardHeader>
            </Card>

          </div>
          <div className="lg:col-span-2">
              <Card>
                  <CardHeader>
                  <CardTitle>Update Profile</CardTitle>
                  <CardDescription>Edit your personal information. Save your changes when you are ready.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" required value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" required type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <div className="relative">
                      <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} disabled value={user.password} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input id="password" type={showNewPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="avatar-upload">Change Profile Picture</Label>
                      <Input id="avatar-upload" type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept=".jpg, .jpeg, .png" />
                  </div>
                  </CardContent>
              </Card>
          </div>
        </div>
        
        {can.manage_signatures && (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Signature /> Digital Signature</CardTitle>
                    <CardDescription>Upload your signature for use in reports and documents.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Current Signature Preview</Label>
                        <div className="w-full h-32 border rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {signaturePreview ? (
                                <img src={signaturePreview} alt="Signature" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <p className="text-sm text-muted-foreground">No signature uploaded</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="signature-upload">Upload New Signature</Label>
                        <Input id="signature-upload" type="file" ref={signatureInputRef} onChange={handleSignatureChange} accept=".png,.jpg,.jpeg" />
                        <p className="text-xs text-muted-foreground">For best results, use a transparent PNG background. Selecting the same file again will work.</p>
                    </div>
                </CardContent>
            </Card>
        )}

        <CardFooter className="px-0 pt-6">
            <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving changes..." : "Save All Changes"}
            </Button>
        </CardFooter>
      </form>

      {can.manage_user_lock_status && (
        <section id="account-panel-unlocks" hidden={selectedSection !== 'unlocks'} aria-label="Account unlock requests">
          <UnlockRequests />
        </section>
      )}
      {can.manage_feedback && (
        <Card id="account-panel-feedback" hidden={selectedSection !== 'feedback'}>
            <CardHeader>
                <CardTitle>Feedback & Complaints</CardTitle>
                <CardDescription>Review and manage user-submitted feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.listArea}>
                <FeedbackManagement />
              </div>
            </CardContent>
        </Card>
      )}
      
       {(user.role === 'Admin' || user.role === 'Project Coordinator') && (
        <Card id="account-panel-decoration" hidden={selectedSection !== 'decoration'}>
            <CardHeader>
                <CardTitle id="account-decoration" className="flex items-center gap-2"><PartyPopper/> Decoration Settings</CardTitle>
                <CardDescription>Activate a global theme for special occasions.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Select value={selectedTheme} onValueChange={(value) => setSelectedTheme(value as DecorationTheme)}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a theme..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="christmas">Christmas</SelectItem>
                        <SelectItem value="diwali">Diwali</SelectItem>
                        <SelectItem value="new-year">New Year</SelectItem>
                    </SelectContent>
                </Select>
            </CardContent>
             <CardFooter>
                <Button onClick={handleThemeSave}>Save Theme</Button>
            </CardFooter>
        </Card>
       )}

      {can.manage_branding && (
        <Card id="account-panel-branding" hidden={selectedSection !== 'branding'}>
          <form onSubmit={handleBrandingSave}>
            <CardHeader>
              <CardTitle id="account-branding">Branding Settings</CardTitle>
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
                  <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-transparent">
                    {newAppLogo ? (
                        <img src={newAppLogo} alt="App Logo" className="h-full w-full object-contain rounded-md" />
                    ) : (
                        <Layers className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <Input id="logo-upload" type="file" onChange={handleLogoFileChange} accept=".jpg, .jpeg, .png" />
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
          <Card id="account-panel-projects" hidden={selectedSection !== 'projects'}>
            <CardHeader>
                <CardTitle id="account-projects">Project Management</CardTitle>
                <CardDescription>Add, edit, or remove project locations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.listArea}>
                <ProjectManagementTable />
              </div>
            </CardContent>
          </Card>
      )}

      {(can.manage_roles || user.role === 'Admin') && (
          <Card id="account-panel-roles" hidden={selectedSection !== 'roles'}>
            <CardHeader>
                <CardTitle id="account-roles">Roles & Permissions</CardTitle>
                <CardDescription>Define custom roles and assign granular permissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={styles.listArea}>
                <RoleManagementTable />
              </div>
            </CardContent>
          </Card>
      )}

      {can.manage_users && (
      <Card id="account-panel-users" hidden={selectedSection !== 'users'}>
          <CardHeader className={styles.sectionHeader}>
              <div>
                  <CardTitle id="account-users">User Accounts</CardTitle>
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
            <div className={styles.filters}><Input aria-label="Search user accounts" placeholder="Search name, email or role..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <select aria-label="Filter users by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <select aria-label="Filter users by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option><option value="active">Active</option>
                <option value="locked">Locked</option><option value="deactivated">Deactivated</option>
              </select>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{visibleUsers.length} users</p>
            <div className={styles.listArea}>
              <Table className={styles.userTable}>
                  <TableHeader>
                      <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Supervisor</TableHead>
                          <TableHead>Transfer approval</TableHead><TableHead>Status</TableHead>
                          {can.manage_users && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TooltipProvider>
                      {pageUsers.map(report => {
                          const supervisor = users.find(u => u.id === report.supervisorId);
                          const isLocked = report.status === 'locked';
                          return (
                            <TableRow key={report.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={report.avatar} alt={report.name} />
                                            <AvatarFallback>{report.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium flex items-center gap-2">
                                            <p>{report.name}</p>
                                            
                                          </div>
                                          <p className="text-xs text-muted-foreground">{report.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell data-label="Role">{report.role}</TableCell>
                                <TableCell data-label="Supervisor">{supervisor?.name || 'N/A'}</TableCell>
                                <TableCell data-label="Transfer approval">
{report.canApproveTransfers ? <span className={styles.approval}><ShieldCheck size={16} /> Enabled</span> : 'Not enabled'}
</TableCell>
<TableCell data-label="Status"><span className={isLocked ? styles.locked : report.status === 'deactivated' ? styles.inactive : styles.active}>
{isLocked ? 'Locked' : report.status === 'deactivated' ? 'Deactivated' : 'Active'}</span></TableCell>
                                {can.manage_users && (
                                    <TableCell data-label="Actions" className="text-right"><div className={styles.actions}><Button variant="outline" size="sm" onClick={() => handleEditClick(report)} aria-label={'Edit ' + report.name}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                                        <AlertDialog>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Actions for {report.name}</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => handleEditClick(report)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                    {can.manage_user_lock_status && (
                                                        <DropdownMenuItem onSelect={() => handleLockToggle(report)}>
                                                            {isLocked ? <Unlock className="mr-2 h-4 w-4"/> : <Lock className="mr-2 h-4 w-4"/>}
                                                            {isLocked ? 'Unlock' : 'Lock'}
                                                        </DropdownMenuItem>
                                                    )}
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Remove Access</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <AlertDialogContent className={styles.dialog}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove User Access?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will deactivate the account for <strong>{report.name}</strong>. 
                                                        They will no longer be able to log in, but all historical logs, tasks, and data associated with their name will be preserved for auditing.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRemoveAccess(report.id)}>Confirm Removal</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog></div>
                                    </TableCell>
                                )}
                            </TableRow>
                          );
                      })}
                    </TooltipProvider>
                    {visibleUsers.length === 0 && <TableRow><TableCell colSpan={6} className={styles.empty}>
                      <p>No users match your search or filters.</p>
                      <Button variant="outline" onClick={() => { setUserSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}>Clear filters</Button>
                    </TableCell></TableRow>}
                  </TableBody>
              </Table>
              </div>
              <div className={styles.pagination}>
                <span>{visibleUsers.length ? 'Showing ' + ((currentPage - 1) * pageSize + 1) + '–' + Math.min(currentPage * pageSize, visibleUsers.length) + ' of ' + visibleUsers.length + ' users' : '0 users'}</span>
                <div><Button variant="outline" disabled={currentPage === 1} onClick={() => setUserPage(currentPage - 1)}>Previous</Button>
                  <span aria-live="polite">Page {currentPage} of {pageCount}</span>
                  <Button variant="outline" disabled={currentPage === pageCount} onClick={() => setUserPage(currentPage + 1)}>Next</Button></div>
              </div>
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
