'use server';
/**
 * @fileOverview A flow to generate a script from a prompt and character descriptions.
 *
 * - generateScript - A function that handles the script generation process.
 * - GenerateScriptInput - The input type for the generateScript function.
 * - GenerateScriptOutput - The return type for the generateScript function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScriptInputSchema = z.object({
  prompt: z.string().describe('The user prompt for the script.'),
  characters: z.array(z.object({
    name: z.string(),
    persona: z.string(),
  })).describe('A list of characters with their name and persona.'),
});
export type GenerateScriptInput = z.infer<typeof GenerateScriptInputSchema>;

const GenerateScriptOutputSchema = z.object({
  script: z.string().describe('The generated script.'),
});
export type GenerateScriptOutput = z.infer<typeof GenerateScriptOutputSchema>;

export async function generateScript(input: GenerateScriptInput): Promise<GenerateScriptOutput> {
  return generateScriptFlow(input);
}

const scriptPrompt = ai.definePrompt({
    name: 'scriptPrompt',
    input: { schema: GenerateScriptInputSchema },
    output: { schema: GenerateScriptOutputSchema },
    prompt: `You are an expert scriptwriter for short audio skits. Your task is to write a script based on the user's prompt, focusing on natural-sounding dialogue.

You MUST use the characters provided and adhere to their specified personas. The script should be formatted with each line as 'CharacterName: Dialogue'.

IMPORTANT: Use emotional cues or stage directions (in parentheses) sparingly, and only when the tone is not obvious from the dialogue itself. Do NOT have the characters speak the directions out loud. The goal is a realistic, engaging conversation.

User Prompt:
"{{{prompt}}}"

Characters:
{{#each characters}}
- Name: {{{this.name}}}
  Persona: {{{this.persona}}}
{{/each}}

Generate the script now.`,
});

const generateScriptFlow = ai.defineFlow(
  {
    name: 'generateScriptFlow',
    inputSchema: GenerateScriptInputSchema,
    outputSchema: GenerateScriptOutputSchema,
  },
  async (input) => {
    const {output} = await scriptPrompt(input);
    return output!;
  }
);
