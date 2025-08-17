'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqItems = [
    {
      question: "How do I reset my password?",
      answer: "On the login page, click the 'Forgot password?' link. You will be prompted to enter your email address. This will send a request to the administrator, who will provide you with a one-time reset code to set a new password."
    },
    {
      question: "How do I change my profile picture or update my details?",
      answer: "Navigate to the 'Account' page from the sidebar. Here, you can upload a new profile picture and update your personal information like your name and password."
    },
    {
      question: "How do I submit a task for approval?",
      answer: "Go to the 'Manage Tasks' page. Find your task in the 'In Progress' column and click on it. In the task details dialog, add a comment explaining your work and click the 'Request Completion' button. Your task will then be sent to your supervisor for approval."
    },
    {
      question: "What do the different task statuses mean?",
      answer: "To Do: The task is assigned but not yet started. In Progress: You have started working on the task. Pending Approval: You have completed the task and it's waiting for your supervisor to review. Returned: The approver has sent the task back to you for modifications. Please check the comments. Done: The task has been approved and is complete."
    },
    {
      question: "How do I request an item from the store or for my personal use (PPE)?",
      answer: "Go to the 'My Requests' page. From there, you can choose to create a 'PPE Request' for safety items or an 'Internal Store Request' for other materials. Fill out the required details, and your request will be sent for approval."
    },
    {
        question: "Who can see my personal planner?",
        answer: "By default, your personal planner is visible to you and your direct supervisors, as well as management roles like Project Coordinators and Admins. Your colleagues cannot see your individual planner unless they are your supervisor."
    }
];

export default function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqItems.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
