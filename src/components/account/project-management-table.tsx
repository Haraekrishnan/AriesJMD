
'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import AddProjectDialog from './add-project-dialog';
import EditProjectDialog from './edit-project-dialog';
import { Project } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function ProjectManagementTable() {
    const { projects, deleteProject } = useAppContext();
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const handleEditClick = (project: Project) => {
        setSelectedProject(project);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (projectId: string) => {
        deleteProject(projectId);
        toast({
            variant: 'destructive',
            title: 'Project Deleted',
            description: 'The project has been removed from the system.',
        });
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Project
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map(project => (
                        <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.name}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(project)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the "{project.name}" project.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(project.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                     {projects.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center">No projects found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <AddProjectDialog isOpen={isAddDialogOpen} setIsOpen={setIsAddDialogOpen} />
            {selectedProject && (
                <EditProjectDialog
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    project={selectedProject}
                />
            )}
        </>
    );
}

    