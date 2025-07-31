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
  characterVoices: z.record(z.string(), z.string()).describe('A map of character names to voice names.'),
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
    const scriptLines = input.script.split('\n');
    const audioBuffers: Buffer[] = [];

    for (const line of scriptLines) {
      const [character, dialogue] = line.split(/:(.*)/s).map(s => s.trim());
      if (!character || !dialogue) {
        continue;
      }

      const voiceName = input.characterVoices[character];
      if (!voiceName) {
        console.warn(`No voice assigned for character: ${character}. Skipping line.`);
        continue;
      }

      const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {voiceName: voiceName},
            },
          },
        },
        prompt: `${character}: ${dialogue}`,
      });

      if (!media) {
        console.error(`Failed to generate audio for line: ${line}`);
        continue;
      }

      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );
      audioBuffers.push(audioBuffer);
    }

    // Concatenate audio buffers
    const concatenatedAudio = Buffer.concat(audioBuffers);

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
