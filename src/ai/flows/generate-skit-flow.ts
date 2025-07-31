'use server';
/**
 * @fileOverview A flow to generate an audio skit from a script with assigned voices using multi-speaker TTS.
 *
 * - generateSkit - A function that handles the skit generation process.
 * - GenerateSkitInput - The input type for the generateSkit function.
 * - GenerateSkitOutput - The return type for the generateSkit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import {googleAI} from '@genkit-ai/googleai';

const GenerateSkitInputSchema = z.object({
  script: z.string().describe('The script for the skit.'),
  characterVoices: z.record(z.string(), z.object({
    voice: z.string(),
    persona: z.string(),
  })).describe('A map of character names to their voice and persona.'),
  model: z.string().describe('The name of the model to use for generation.'),
});
export type GenerateSkitInput = z.infer<typeof GenerateSkitInputSchema>;

const GenerateSkitOutputSchema = z.object({
  audioDataUri: z.string().describe('The audio data URI of the generated skit.'),
});
export type GenerateSkitOutput = z.infer<typeof GenerateSkitOutputSchema>;

export async function generateSkit(input: GenerateSkitInput): Promise<GenerateSkitOutput> {
  return generateSkitFlow(input);
}

const generateSkitFlow = ai.defineFlow(
  {
    name: 'generateSkitFlow',
    inputSchema: GenerateSkitInputSchema,
    outputSchema: GenerateSkitOutputSchema,
  },
  async input => {
    // Validate that the script is not empty
    if (!input.script.trim()) {
        throw new Error("The script is empty. Please provide a script to generate audio.");
    }
    
    const speakers = Object.keys(input.characterVoices);
    if (speakers.length === 0) {
        throw new Error("No characters defined. Please add characters in the Control Panel.");
    }

    const speakerVoiceConfigs = speakers.map(speaker => {
        const character = input.characterVoices[speaker];
        if (!character) {
            // This case should ideally not happen if speakers are derived from characterVoices keys
            throw new Error(`Configuration for speaker "${speaker}" not found.`);
        }
        return {
            speaker: speaker,
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: character.voice }
            }
        };
    });

    try {
        const { media } = await ai.generate({
            model: googleAI.model(input.model as any),
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakerVoiceConfigs,
                    },
                },
            },
            prompt: input.script,
        });

        if (!media) {
            throw new Error("The model did not return any audio data. Please check your script and character configuration.");
        }

        const audioBuffer = Buffer.from(
            media.url.substring(media.url.indexOf(',') + 1),
            'base64'
        );
        
        const wavDataUri = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

        return { audioDataUri: wavDataUri };

    } catch (error: any) {
        console.error(`Error during multi-speaker TTS generation:`, error);
        // Provide a more user-friendly error message
        throw new Error(`Failed to generate skit. The service reported: ${error.message}. Please check that all characters in the script are defined in the control panel and your script format is correct.`);
    }
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
