'use server';
/**
 * @fileOverview A flow to generate an audio skit from a script with assigned voices.
 *
 * - generateSkit - A function that handles the skit generation process.
 * - GenerateSkitInput - The input type for the generateSkit function.
 * - GenerateSkitOutput - The return type for the generateSkit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

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
    const scriptLines = input.script.split('\n').filter(line => line.trim() !== '');

    const audioPromises = scriptLines.map(async (line, index) => {
      const parts = line.split(/:(.*)/s);
      if (parts.length < 2) return { buffer: null, index };

      const character = parts[0].trim();
      const dialogue = parts[1].trim();
      
      if (!character || !dialogue) {
        return { buffer: null, index };
      }

      const characterInfo = input.characterVoices[character];
      if (!characterInfo) {
        console.warn(`No voice assigned for character: ${character}. Skipping line.`);
        return { buffer: null, index };
      }
      
      const { voice, persona } = characterInfo;

      const prompt = persona 
        ? `(Speaking as ${character}, with the persona: ${persona}) ${dialogue}`
        : dialogue;

      try {
        const {media} = await ai.generate({
          model: `googleai/${input.model}`,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {voiceName: voice},
              },
            },
          },
          prompt: prompt,
        });

        if (!media) {
          console.error(`Failed to generate audio for line: ${line}`);
          return { buffer: null, index };
        }

        const audioBuffer = Buffer.from(
          media.url.substring(media.url.indexOf(',') + 1),
          'base64'
        );
        return { buffer: audioBuffer, index };
      } catch (error) {
        console.error(`Error generating audio for line "${line}":`, error);
        return { buffer: null, index };
      }
    });

    const results = await Promise.all(audioPromises);

    const orderedBuffers = results
        .sort((a, b) => a.index - b.index)
        .map(r => r.buffer)
        .filter((b): b is Buffer => b !== null);


    if (orderedBuffers.length === 0) {
        throw new Error("No audio could be generated from the script. Please check the script format.");
    }

    // Concatenate audio buffers
    const concatenatedAudio = Buffer.concat(orderedBuffers);

    // Convert to WAV format
    const wavDataUri = 'data:audio/wav;base64,' + (await toWav(concatenatedAudio));

    return {audioDataUri: wavDataUri};
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
