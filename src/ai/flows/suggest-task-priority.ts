'use server';

/**
 * @fileOverview This file defines a Genkit flow to suggest task priority based on the task title and description.
 *
 * @remarks
 * The flow takes a task's title and description as input and returns a suggested priority (Low, Medium, High).
 *
 * @exports suggestTaskPriority - The main function to trigger the task priority suggestion flow.
 * @exports SuggestTaskPriorityInput - The input type for the suggestTaskPriority function.
 * @exports SuggestTaskPriorityOutput - The output type for the suggestTaskPriority function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskPriorityInputSchema = z.object({
  title: z.string().describe('The title of the task.'),
  description: z.string().describe('The description of the task.'),
});
export type SuggestTaskPriorityInput = z.infer<typeof SuggestTaskPriorityInputSchema>;

const SuggestTaskPriorityOutputSchema = z.object({
  priority: z
    .enum(['Low', 'Medium', 'High'])
    .describe('The suggested priority for the task.'),
});
export type SuggestTaskPriorityOutput = z.infer<typeof SuggestTaskPriorityOutputSchema>;

export async function suggestTaskPriority(
  input: SuggestTaskPriorityInput
): Promise<SuggestTaskPriorityOutput> {
  return suggestTaskPriorityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskPriorityPrompt',
  input: {schema: SuggestTaskPriorityInputSchema},
  output: {schema: SuggestTaskPriorityOutputSchema},
  prompt: `You are an expert project manager. Evaluate the urgency and importance of the following task based on its title and description.

Task Title: {{{title}}}
Task Description: {{{description}}}

Based on your evaluation, suggest a priority for the task. The priority should be one of the following: Low, Medium, or High.

Return a JSON object with a single key, \"priority\", whose value is the suggested priority.

{
  "priority": "<Low|Medium|High>"
}`,
});

const suggestTaskPriorityFlow = ai.defineFlow(
  {
    name: 'suggestTaskPriorityFlow',
    inputSchema: SuggestTaskPriorityInputSchema,
    outputSchema: SuggestTaskPriorityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
