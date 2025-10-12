
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const resetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
type ResetRequestFormValues = z.infer<typeof resetRequestSchema>;

const resetPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address.'),
    resetCode: z.string().length(6, 'Reset code must be 6 digits.'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
});
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const { requestPasswordReset, resetPassword, requestUnlock } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isLockedDialogOpen, setIsLockedDialogOpen] = useState(false);
  const [lockedUser, setLockedUser] = useState<{ userId: string; userName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('request');

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  
  const resetRequestForm = useForm<ResetRequestFormValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });
  
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '', resetCode: '', newPassword: '' },
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    
    if (result.success && result.user) {
        if (result.status === 'locked' || result.status === 'deactivated') {
          router.replace('/status');
        } else {
          router.replace('/dashboard');
        }
    } else {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please try again.',
      });
    }
    setIsLoading(false);
  };

  const handleUnlockRequest = async () => {
    if (!lockedUser) return;
    await requestUnlock(lockedUser.userId, lockedUser.userName);
    toast({
        title: 'Unlock Request Sent',
        description: 'Your request has been sent to the administrator.',
    });
    setIsLockedDialogOpen(false);
  };
  
  const handleResetRequest = async (data: ResetRequestFormValues) => {
    const success = await requestPasswordReset(data.email);
    if(success) {
      toast({
        title: 'Request Sent',
        description: 'Your password reset request has been sent to the administrator.',
      });
      setActiveTab('reset');
    } else {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: 'No user was found with that email address.',
      });
    }
  };
  
  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    const success = await resetPassword(data.email, data.resetCode, data.newPassword);
    if (success) {
      toast({
        title: 'Password Reset Successful',
        description: 'You can now log in with your new password.',
      });
      setIsResetDialogOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: 'The email or reset code is incorrect. Please try again.',
      });
    }
  };

  return (
    <>
    <form onSubmit={loginForm.handleSubmit(handleLogin)}>
      <Card className="bg-card shadow-none border-none">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" {...loginForm.register('email')} />
            {loginForm.formState.errors.email && <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button type="button" variant="link" className="text-xs p-0 h-auto" onClick={() => setIsResetDialogOpen(true)}>Forgot password?</Button>
            </div>
            <Input id="password" type="password" placeholder="••••••••" {...loginForm.register('password')} />
            {loginForm.formState.errors.password && <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </CardFooter>
      </Card>
    </form>

    <AlertDialog open={isLockedDialogOpen} onOpenChange={setIsLockedDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Account Locked</AlertDialogTitle>
                <AlertDialogDescription>
                    Your account is currently locked. You can send a request to your administrator to unlock it.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleUnlockRequest}>Send Unlock Request</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Your Password</DialogTitle>
          <DialogDescription>
            Request a code or enter one you've received from an administrator.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="request">Request Code</TabsTrigger>
                <TabsTrigger value="reset">Enter Code</TabsTrigger>
            </TabsList>
            <TabsContent value="request">
                <form onSubmit={resetRequestForm.handleSubmit(handleResetRequest)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Your Email Address</Label>
                      <Input id="reset-email" type="email" placeholder="name@example.com" {...resetRequestForm.register('email')} />
                      {resetRequestForm.formState.errors.email && <p className="text-xs text-destructive">{resetRequestForm.formState.errors.email.message}</p>}
                    </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Send Request</Button>
                  </DialogFooter>
                </form>
            </TabsContent>
             <TabsContent value="reset">
                <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="reset-pw-email">Your Email Address</Label>
                        <Input id="reset-pw-email" type="email" {...resetPasswordForm.register('email')} />
                         {resetPasswordForm.formState.errors.email && <p className="text-xs text-destructive">{resetPasswordForm.formState.errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reset-code">Reset Code</Label>
                        <Input id="reset-code" {...form.register('resetCode')} />
                         {resetPasswordForm.formState.errors.resetCode && <p className="text-xs text-destructive">{resetPasswordForm.formState.errors.resetCode.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" {...resetPasswordForm.register('newPassword')} />
                         {resetPasswordForm.formState.errors.newPassword && <p className="text-xs text-destructive">{resetPasswordForm.formState.errors.newPassword.message}</p>}
                    </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Set New Password</Button>
                  </DialogFooter>
                </form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  );
}
