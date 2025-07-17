
'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Role_Dep as Role } from '@/lib/types';
import AddRoleDialog from './add-role-dialog';
import EditRoleDialog from './edit-role-dialog';
import { Badge } from '@/components/ui/badge';

export default function RoleManagementTable() {
    const { user, can, roles, deleteRole } = useAppContext();
    const { toast } = useToast();
    const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
    const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const handleEditClick = (role: Role) => {
        setSelectedRole(role);
        setIsEditRoleDialogOpen(true);
    };

    const handleDelete = (roleId: string) => {
        deleteRole(roleId);
        toast({
            variant: 'destructive',
            title: 'Role Deleted',
            description: 'The role has been removed from the system.',
        });
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-end">
                <Button onClick={() => setIsAddRoleDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Role
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {roles.map(role => {
                        const isActionable = can.manage_roles && (role.isEditable || user?.role === 'Admin');
                        const permissions = role.permissions || [];
                        return (
                        <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-md">
                                    {permissions.map(permission => (
                                        <Badge key={permission} variant="secondary">
                                            {permission.replace(/_/g, ' ')}
                                        </Badge>
                                    ))}
                                    {permissions.length === 0 && <span className="text-xs text-muted-foreground">No permissions</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                {isActionable ? (
                                    <AlertDialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleEditClick(role)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                {role.isEditable && (
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the role "{role.name}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(role.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Locked</span>
                                )}
                            </TableCell>
                        </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <AddRoleDialog isOpen={isAddRoleDialogOpen} setIsOpen={setIsAddRoleDialogOpen} />
            {selectedRole && (
                <EditRoleDialog isOpen={isEditRoleDialogOpen} setIsOpen={setIsEditRoleDialogOpen} role={selectedRole} />
            )}
        </div>
    );
}
