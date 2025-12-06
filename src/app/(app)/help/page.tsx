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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const feedbackSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const faqs = [
    {
      question: "How do I create a new task?",
      answer: "Navigate to the 'Manage Tasks' page. Click the 'New Task' button, fill in the details like title, description, assignee, priority, and due date, then click 'Create Task'."
    },
    {
      question: "How does task approval work?",
      answer: "When an assignee marks a task as 'Completed', it is sent to the task creator for approval. The creator can then approve it to finalize it or return it with comments if changes are needed. You can find tasks awaiting your approval in the 'Pending Approvals' dialog on the task board."
    },
    {
      question: "How do I request an item from the store?",
      answer: "Go to the 'My Requests' page and select the 'Internal Store Requests' tab. Click 'New Store Request', fill out the items you need, and submit. The request will be sent to the store in-charge for approval."
    },
    {
      question: "How do I assign an employee to a bed?",
      answer: "Navigate to the 'Accommodation' page. Find the building and room you wish to modify. Click the 'Assign' button on an available bed and select an employee from the list. Only employees not currently assigned to a bed will appear."
    },
    {
      question: "How do I track equipment calibration due dates?",
      answer: "Go to the 'Equipment' page. Any equipment with calibration expiring within the next 30 days will be highlighted in the 'Expiring Calibrations' card at the top. You can also see the due date for each machine in its respective table (e.g., UT Machines, DFT Machines)."
    },
    {
      question: "Where can I see which vehicle documents are expiring?",
      answer: "On the 'Fleet Management' page, an 'Expiring Documents' card will appear if any vehicle or driver has documentation (like VAP, insurance, license, etc.) that is due to expire within 30 days."
    },
    {
      question: "How do I request a certificate for an inventory item?",
      answer: "Go to the 'Store Inventory' page. Find the item you need a certificate for in the table. In the 'Actions' column, click the menu button (...) and select 'Request Certificate'. Fill out the form and submit it."
    },
    {
        question: "What is the difference between Job Schedule and the Planner?",
        answer: "'Job Schedule' is for planning daily work for specific projects, including assigning manpower and vehicles. The 'Planner' is a monthly calendar for organizing personal or team events, meetings, and daily notes."
    },
    {
        question: "How do I update my profile information?",
        answer: "Go to the 'Account' page. You can edit your name, email, and upload a new profile picture. You can also change your password here."
    }
];


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
            <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </CardContent>
      </Card>

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
