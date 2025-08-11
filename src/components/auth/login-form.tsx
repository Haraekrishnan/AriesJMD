
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/app-provider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const resetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const { requestPasswordReset } = useAppContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const resetForm = useForm<ResetRequestFormValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    const success = await login(data.email, data.password);
    
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
      setIsLoading(false);
    }
  };
  
  const handleResetRequest = async (data: ResetRequestFormValues) => {
    const success = await requestPasswordReset(data.email);
    if(success) {
      toast({
        title: 'Request Sent',
        description: 'Your password reset request has been sent to the administrator.',
      });
      setIsResetDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'No user was found with that email address.',
      });
    }
  };

  return (
    <>
    <form onSubmit={form.handleSubmit(handleLogin)}>
      <Card className="bg-card shadow-none border-none">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" {...form.register('email')} />
            {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button type="button" variant="link" className="text-xs p-0 h-auto" onClick={() => setIsResetDialogOpen(true)}>Forgot password?</Button>
            </div>
            <Input id="password" type="password" placeholder="••••••••" {...form.register('password')} />
            {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </CardFooter>
      </Card>
    </form>

    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Password Reset</DialogTitle>
          <DialogDescription>
            Enter your email address to request a password reset. An administrator will be notified.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={resetForm.handleSubmit(handleResetRequest)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Your Email Address</Label>
              <Input id="reset-email" type="email" placeholder="name@example.com" {...resetForm.register('email')} />
              {resetForm.formState.errors.email && <p className="text-xs text-destructive">{resetForm.formState.errors.email.message}</p>}
            </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
            <Button type="submit">Send Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
