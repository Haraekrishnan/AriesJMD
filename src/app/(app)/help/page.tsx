'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HelpCircle } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import { useState } from 'react';

const feedbackSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function HelpPage() {
  const { toast } = useToast();
  const { user, addFeedback } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to submit feedback.',
        });
        return;
    }
    setIsSubmitting(true);
    
    try {
        await addFeedback(data.subject, data.message);
        toast({
          title: 'Feedback Sent',
          description: "Thank you! We've received your feedback and will review it shortly.",
        });
        form.reset({ subject: '', message: ''});
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Failed to Send',
            description: 'There was a problem sending your feedback. Please try again later.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <HelpCircle className="h-10 w-10 text-primary" />
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Help & Feedback</h1>
            <p className="text-muted-foreground">Find answers to common questions or send us your feedback.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback or a Complaint</CardTitle>
          <CardDescription>Have a suggestion, a new feature idea, or an issue to report? Let us know.</CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...form.register('subject')} placeholder="e.g., Issue with Task Board" />
                {form.formState.errors.subject && <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" {...form.register('message')} placeholder="Please describe your feedback or issue in detail..." rows={5}/>
                {form.formState.errors.message && <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>}
            </div>
            </CardContent>
            <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
