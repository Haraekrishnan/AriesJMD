

'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppContext } from '@/contexts/app-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { User } from '@/lib/types';
import { useMemo, useState } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Badge } from '../ui/badge';

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required'),
  supervisorId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AddEmployeeDialog({ isOpen, setIsOpen }: AddEmployeeDialogProps) {
  const { addUser, projects, roles, users } = useAppContext();
  const { toast } = useToast();
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: undefined,
      projectIds: [],
    },
  });

  const possibleSupervisors = useMemo(() => {
    return users.filter(u => u.role === 'Admin' || u.role === 'Project Coordinator' || u.role === 'Supervisor' || u.role === 'Senior Safety Supervisor');
  }, [users]);

  const onSubmit = (data: EmployeeFormValues) => {
    const roleName = roles.find(r => r.id === data.role)?.name;
    if (!roleName) {
        toast({
            variant: 'destructive',
            title: 'Invalid Role',
            description: 'Could not find the selected role.',
        });
        return;
    }
    addUser({ ...data, role: roleName });
    toast({
      title: 'User Added',
      description: `${data.name} has been added to the system.`,
    });
    setIsOpen(false);
    form.reset();
  };
  
  const handleOpenChange = (open: boolean) => {
      if (!open) {
          form.reset();
      }
      setIsOpen(open);
  }

  const selectedProjectIds = form.watch('projectIds') || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Fill in the details to add a new member to the team.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[70vh] p-1">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register('name')} placeholder="John Doe" />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} placeholder="john.doe@example.com" />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register('password')} placeholder="••••••••" />
                {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {form.formState.errors.role && <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label>Supervisor</Label>
                <Controller
                  control={form.control}
                  name="supervisorId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <SelectTrigger><SelectValue placeholder="Assign a supervisor" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">No Supervisor</SelectItem>
                          {possibleSupervisors.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                  <Label>Project / Location</Label>
                  <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10">
                              <div className="flex flex-wrap gap-1">
                                  {selectedProjectIds.length > 0 ? selectedProjectIds.map(id => (
                                      <Badge key={id} variant="secondary">{projects.find(p=>p.id === id)?.name}</Badge>
                                  )) : "Select projects..."}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Search projects..." />
                              <CommandList>
                                  <CommandEmpty>No projects found.</CommandEmpty>
                                  <CommandGroup>
                                      {projects.map(project => (
                                          <CommandItem
                                              key={project.id}
                                              value={project.name}
                                              onSelect={() => {
                                                  const newSelection = [...selectedProjectIds];
                                                  const index = newSelection.indexOf(project.id);
                                                  if (index > -1) {
                                                      newSelection.splice(index, 1);
                                                  } else {
                                                      newSelection.push(project.id);
                                                  }
                                                  form.setValue('projectIds', newSelection);
                                              }}
                                          >
                                              <Check className={`mr-2 h-4 w-4 ${selectedProjectIds.includes(project.id) ? 'opacity-100' : 'opacity-0'}`} />
                                              {project.name}
                                          </CommandItem>
                                      ))}
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Add User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
