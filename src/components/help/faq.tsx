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
      answer: "Go to the 'Manage Tasks' page. Find your task in the 'In Progress' column and click on it to open the details. Add a comment explaining your work and click the 'Request Completion' button. Your task will then be sent to your supervisor for approval."
    },
    {
      question: "What do the different task statuses mean?",
      answer: "To Do: The task is assigned but not yet started. In Progress: You have started working on the task. Pending Approval: You have completed the task and it's waiting for your supervisor to review. Returned: The approver has sent the task back to you for modifications; please check the comments for details. Done: The task has been approved and is complete."
    },
    {
      question: "What is the difference between an Internal Store Request and a Management Request?",
      answer: "Use 'Internal Store Requests' for items that are stocked in the company store (e.g., tools, materials). Use 'Management Requests' for things that require supervisor or manager approval but are not store items, such as requests for software, training, or special permissions."
    },
    {
      question: "How is my performance score calculated?",
      answer: "Your performance score is a combination of several factors: points for completed tasks, point deductions for overdue tasks, your planning score (set by your supervisor), and any special points awarded for manual achievements. Keeping your tasks on schedule and maintaining a good plan are the best ways to improve your score."
    },
    {
        question: "Who can see my personal planner?",
        answer: "By default, your personal planner is visible to you and your direct supervisors, as well as management roles like Project Coordinators and Admins. Your colleagues cannot see your individual planner unless they are your supervisor."
    },
    {
      question: "How do I check the calibration status of equipment?",
      answer: "Go to the 'Equipment' page. Any machine with a calibration certificate expiring within the next 30 days will be flagged in an 'Expiring Calibrations' notice at the top of the page. You can also view the calibration due date for each machine in its respective table."
    },
    {
      question: "What's the difference between the 'Manpower' page and the 'Manpower List'?",
      answer: "The 'Manpower' page provides a daily summary of total manpower counts across different projects. The 'Manpower List', which you can access via a button on the 'Manpower' page, shows the detailed profile, documentation status, and leave history for every individual employee."
    },
    {
      question: "Who sees an incident report when I submit it?",
      answer: "When you submit an incident report, it is automatically sent to your direct supervisor and the HSE (Health, Safety, and Environment) department for review. They will manage the investigation and can add other relevant people to the report as needed."
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
