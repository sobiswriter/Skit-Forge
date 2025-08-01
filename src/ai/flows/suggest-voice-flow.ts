'use server';
/**
 * @fileOverview A flow to suggest a voice based on a character persona.
 *
 * - suggestVoice - A function that handles the voice suggestion process.
 * - SuggestVoiceInput - The input type for the suggestVoice function.
 * - SuggestVoiceOutput - The return type for the suggestVoice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GEMINI_VOICES} from '@/lib/constants';

const SuggestVoiceInputSchema = z.object({
  persona: z.string().describe('The detailed persona of the character.'),
});
export type SuggestVoiceInput = z.infer<typeof SuggestVoiceInputSchema>;

const SuggestVoiceOutputSchema = z.object({
  voiceId: z.string().describe('The ID of the suggested voice.'),
});
export type SuggestVoiceOutput = z.infer<typeof SuggestVoiceOutputSchema>;

export async function suggestVoice(input: SuggestVoiceInput): Promise<SuggestVoiceOutput> {
  return suggestVoiceFlow(input);
}

const voiceList = GEMINI_VOICES.map(v => `- ${v.id}: ${v.name}`).join('\n');

const suggestVoicePrompt = ai.definePrompt({
    name: 'suggestVoicePrompt',
    input: { schema: SuggestVoiceInputSchema },
    output: { schema: SuggestVoiceOutputSchema },
    prompt: `You are an expert casting director for audio skits. Your task is to recommend the best voice for a character based on their persona.

Analyze the provided persona and choose the most fitting voice from the list below.

Return ONLY the ID of the voice you choose.

Available Voices:
${voiceList}

Character Persona:
"{{{persona}}}"

Based on the persona, what is the best voice ID?`,
});

const suggestVoiceFlow = ai.defineFlow(
  {
    name: 'suggestVoiceFlow',
    inputSchema: SuggestVoiceInputSchema,
    outputSchema: SuggestVoiceOutputSchema,
  },
  async (input) => {
    const {output} = await suggestVoicePrompt(input);
    return output!;
  }
);
