"use client";

import { useState, ChangeEvent } from "react";
import { generateSkit } from "@/ai/flows/generate-skit-flow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GEMINI_VOICES } from "@/lib/constants";
import { Loader2, Clapperboard, Download, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Character {
    id: number;
    name: string;
    voice: string;
}

let nextId = 3;

export default function Home() {
  const [script, setScript] = useState(
`P1: Hey, did you see that new AI tool, SkitForge?
Anna: Oh, the one that generates dialogue? I tried it yesterday. It's surprisingly good!
Robot: Affirmative. My analysis indicates a 98.7% increase in creative workflow efficiency.
P1: Wow, even the robot is impressed. What did you make, Anna?
Anna: I wrote a short scene for my animation project. The voice acting was perfect for the initial storyboard. Saved me a ton of time.
Robot: I have generated 1,200 unique audio dramas in the last 24 hours. They are... compelling.
P1: Okay, I'm sold. I'm trying this out right now.`
  );
  const [characters, setCharacters] = useState<Character[]>([
    { id: 1, name: "P1", voice: GEMINI_VOICES[0].id },
    { id: 2, name: "Anna", voice: GEMINI_VOICES[1].id },
    { id: 0, name: "Robot", voice: GEMINI_VOICES[2].id },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddCharacter = () => {
    const newCharacterName = `Character ${characters.length + 1}`;
    setCharacters([
      ...characters,
      {
        id: nextId++,
        name: newCharacterName,
        voice: GEMINI_VOICES[characters.length % GEMINI_VOICES.length].id,
      },
    ]);
  };

  const handleRemoveCharacter = (id: number) => {
    setCharacters(characters.filter((char) => char.id !== id));
  };

  const handleCharacterChange = (id: number, field: 'name' | 'voice', value: string) => {
    setCharacters(
      characters.map((char) =>
        char.id === id ? { ...char, [field]: value } : char
      )
    );
  };


  const handleGenerateSkit = async () => {
    if (script.trim() === "") {
        toast({
            variant: "destructive",
            title: "Empty Script",
            description: "Please write a script before generating.",
        });
        return;
    }
    
    const characterVoices = characters.reduce((acc, char) => {
      if (char.name) {
        acc[char.name] = char.voice;
      }
      return acc;
    }, {} as Record<string, string>);


    setIsLoading(true);
    setAudioUrl(null);
    try {
      const result = await generateSkit({ script, characterVoices });
      if (result.audioDataUri) {
        setAudioUrl(result.audioDataUri);
        toast({
            title: "Skit Generated!",
            description: "Your audio is ready for preview.",
        });
      } else {
        throw new Error("Audio generation failed to produce a result.");
      }
    } catch (error) {
      console.error("Error generating skit:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Something went wrong. Please check the script format (e.g., 'Character:') and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleScriptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setScript(e.target.value);
    if(audioUrl) {
      setAudioUrl(null);
    }
  };

  return (
    <main className="min-h-screen container mx-auto p-4 md:p-8">
      <header className="flex items-center gap-3 mb-8">
        <Clapperboard className="w-8 h-8 text-primary" />
        <h1 className="text-4xl font-bold font-headline tracking-tight text-white">
          SkitForge <span className="text-primary">AI</span>
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Script Editor */}
        <div className="md:w-[65%] lg:w-[70%]">
          <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50">
             <CardHeader>
                <CardTitle>Script Editor</CardTitle>
                <CardDescription>
                  Write your script below. Use the format `Character: Dialogue` for each line.
                </CardDescription>
              </CardHeader>
            <CardContent>
              <Textarea
                placeholder="P1: Hello world!
P2: Hi there, how are you?"
                value={script}
                onChange={handleScriptChange}
                className="min-h-[400px] md:min-h-[500px] text-base resize-none bg-background/50 focus:bg-background"
                disabled={isLoading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Control Panel */}
        <div className="md:w-[35%] lg:w-[30%]">
          <Card className="sticky top-8 bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Control Panel</CardTitle>
              <CardDescription>Manage characters and their voices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[350px] overflow-y-auto pr-3">
              {characters.map((char) => (
                <div key={char.id} className="space-y-3 p-3 border rounded-md relative">
                   <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCharacter(char.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove {char.name}</span>
                  </Button>
                  <div className="space-y-1">
                    <Label htmlFor={`name-${char.id}`}>Character Name</Label>
                    <Input
                      id={`name-${char.id}`}
                      value={char.name}
                      onChange={(e) => handleCharacterChange(char.id, 'name', e.target.value)}
                      placeholder="e.g., Narrator"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`voice-${char.id}`}>Voice</Label>
                    <Select
                      value={char.voice}
                      onValueChange={(value) => handleCharacterChange(char.id, 'voice', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id={`voice-${char.id}`}>
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {GEMINI_VOICES.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
               <Button onClick={handleAddCharacter} variant="outline" className="w-full" disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Character
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button onClick={handleGenerateSkit} disabled={isLoading || characters.length === 0} className="w-full text-lg py-6">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Skit...
                  </>
                ) : (
                  "Generate Skit"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {audioUrl && (
        <div className="mt-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle>Your Skit is Ready!</CardTitle>
                    <CardDescription>Preview your generated audio below or download it.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <audio controls src={audioUrl} className="w-full sm:w-auto flex-grow">
                        Your browser does not support the audio element.
                    </audio>
                    <a
                        href={audioUrl}
                        download="skit.wav"
                    >
                        <Button variant="outline" className="w-full sm:w-auto">
                            <Download className="mr-2 h-4 w-4" />
                            Download Audio
                        </Button>
                    </a>
                </CardContent>
            </Card>
        </div>
      )}
    </main>
  );
}
