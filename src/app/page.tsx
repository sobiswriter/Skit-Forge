"use client";

import { useState, ChangeEvent, useEffect } from "react";
import { generateSkit } from "@/ai/flows/generate-skit-flow";
import { generateScript } from "@/ai/flows/generate-script-flow";
import { suggestVoice } from "@/ai/flows/suggest-voice-flow";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { GEMINI_VOICES, groupedVoices } from "@/lib/constants";
import { Loader2, Clapperboard, Download, Plus, Trash2, Sparkles, Wand2, BookUser } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Character {
    id: number;
    name: string;
    voice: string;
    personaId: string;
}

interface Persona {
    id: string;
    name: string;
    description: string;
}

const SCRIPT_MODELS = [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
];

const TTS_MODELS = [
    { id: "gemini-2.5-flash-preview-tts", name: "Gemini 2.5 Flash Preview TTS" },
    { id: "gemini-2.5-pro-preview-tts", name: "Gemini 2.5 Pro Preview TTS" },
];

let nextId = 3;

export default function Home() {
  const [scriptPrompt, setScriptPrompt] = useState("A short, funny debate about whether pineapple belongs on pizza.");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [script, setScript] = useState(
`P1: (Sighs) Another day, another mountain of code. I wonder if this is all there is to it.
Anna: (Cheerfully) Oh, come on! We're building worlds with words here. What's not to love? I just tried out this new SkitForge AI. It's supposed to be amazing for generating dialogue.
P1: (Skeptical) An AI writing scripts? Sounds like a shortcut to soulless content.
Anna: I thought so too, but you should hear it! The voices sound so natural. (Excitedly) We should give it a try for the podcast!`
  );
  
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingVoice, setIsSuggestingVoice] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedScriptModel, setSelectedScriptModel] = useState(SCRIPT_MODELS[0].id);
  const [selectedTtsModel, setSelectedTtsModel] = useState(TTS_MODELS[0].id);
  const { toast } = useToast();

  const [isPersonaDialogOpen, setIsPersonaDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [newPersonaName, setNewPersonaName] = useState("");
  const [newPersonaDescription, setNewPersonaDescription] = useState("");

  useEffect(() => {
    const savedPersonas = localStorage.getItem("skitforge_personas");
    if (savedPersonas) {
      setPersonas(JSON.parse(savedPersonas));
    } else {
      // Create default personas if none exist
      const defaultPersonas: Persona[] = [
        { id: 'p1-default', name: 'Skeptical Coder', description: 'A talented but slightly jaded and cynical software developer who questions the utility of new technologies.' },
        { id: 'anna-default', name: 'Tech Optimist', description: 'A friendly, enthusiastic, and cheerful person who is optimistic about how technology can improve creative work.' },
      ];
      setPersonas(defaultPersonas);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("skitforge_personas", JSON.stringify(personas));
  }, [personas]);

   useEffect(() => {
    if (personas.length > 1) {
      setCharacters([
        { id: 1, name: "P1", voice: GEMINI_VOICES[0].id, personaId: personas[0].id },
        { id: 2, name: "Anna", voice: GEMINI_VOICES[15].id, personaId: personas[1].id },
      ]);
    }
  }, [personas.length]);

  const handleAddCharacter = () => {
    const newCharacterName = `Character ${characters.length + 1}`;
    setCharacters([
      ...characters,
      {
        id: nextId++,
        name: newCharacterName,
        voice: GEMINI_VOICES[characters.length % GEMINI_VOICES.length].id,
        personaId: personas[0]?.id || "",
      },
    ]);
  };

  const handleRemoveCharacter = (id: number) => {
    setCharacters(characters.filter((char) => char.id !== id));
  };

  const handleCharacterChange = (id: number, field: 'name' | 'voice' | 'personaId', value: string) => {
    setCharacters(
      characters.map((char) =>
        char.id === id ? { ...char, [field]: value } : char
      )
    );
  };
  
  const handleSuggestVoice = async (characterId: number) => {
    const character = characters.find(c => c.id === characterId);
    if (!character || !character.personaId) {
        toast({ variant: 'destructive', title: 'No Persona Selected', description: 'Please select a persona for the character first.' });
        return;
    }
    const persona = personas.find(p => p.id === character.personaId);
    if (!persona) return;

    setIsSuggestingVoice(characterId);
    try {
        const result = await suggestVoice({ persona: persona.description });
        if (result.voiceId && GEMINI_VOICES.some(v => v.id === result.voiceId)) {
            handleCharacterChange(characterId, 'voice', result.voiceId);
            toast({ title: 'Voice Suggested!', description: `AI recommended a voice for ${character.name}.` });
        } else {
            throw new Error('AI returned an invalid voice ID.');
        }
    } catch (error) {
        console.error("Error suggesting voice:", error);
        toast({ variant: 'destructive', title: 'Suggestion Failed', description: 'Could not suggest a voice at this time.' });
    } finally {
        setIsSuggestingVoice(null);
    }
  };

  const handleAiGenerateScript = async () => {
    if (!scriptPrompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty Prompt',
        description: 'Please enter a prompt for the AI script writer.',
      });
      return;
    }
    setIsGeneratingScript(true);
    try {
      const characterData = characters.map(({ name, personaId }) => {
        const persona = personas.find(p => p.id === personaId);
        return { name, persona: persona?.description || "" };
      });
      const result = await generateScript({
        prompt: scriptPrompt,
        characters: characterData,
        model: selectedScriptModel,
      });
      if (result.script) {
        setScript(result.script);
        setAudioUrl(null);
        toast({
          title: 'Script Generated!',
          description: 'The AI has written your script. You can edit it below.',
        });
      } else {
        throw new Error('Script generation failed.');
      }
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        variant: 'destructive',
        title: 'Script Generation Failed',
        description: 'The AI failed to generate a script. Please try again.',
      });
    } finally {
      setIsGeneratingScript(false);
    }
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
        const persona = personas.find(p => p.id === char.personaId);
        acc[char.name] = { voice: char.voice, persona: persona?.description || "" };
      }
      return acc;
    }, {} as Record<string, { voice: string; persona: string }>);


    setIsLoading(true);
    setAudioUrl(null);
    try {
      const result = await generateSkit({ script, characterVoices, model: selectedTtsModel });
      if (result.audioDataUri) {
        setAudioUrl(result.audioDataUri);
        toast({
            title: "Skit Generated!",
            description: "Your audio is ready for preview.",
        });
      } else {
        throw new Error("Audio generation failed to produce a result.");
      }
    } catch (error: any) {
      console.error("Error generating skit:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message || "Something went wrong. Please check the script format and that all characters are defined in the control panel.",
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

  const handleSavePersona = () => {
    if (!newPersonaName.trim() || !newPersonaDescription.trim()) {
        toast({ variant: 'destructive', title: 'Incomplete Persona', description: 'Please provide both a name and a description.' });
        return;
    }
    if (editingPersona) {
        setPersonas(personas.map(p => p.id === editingPersona.id ? { ...p, name: newPersonaName, description: newPersonaDescription } : p));
    } else {
        setPersonas([...personas, { id: crypto.randomUUID(), name: newPersonaName, description: newPersonaDescription }]);
    }
    setEditingPersona(null);
    setNewPersonaName("");
    setNewPersonaDescription("");
  };

  const handleEditPersona = (persona: Persona) => {
    setEditingPersona(persona);
    setNewPersonaName(persona.name);
    setNewPersonaDescription(persona.description);
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(personas.filter(p => p.id !== id));
  };
  
  const openAddPersona = () => {
    setEditingPersona(null);
    setNewPersonaName("");
    setNewPersonaDescription("");
  };

  const disabled = isLoading || isGeneratingScript;

  return (
    <main className="min-h-screen container mx-auto p-4 md:p-8 2xl:max-w-7xl">
      <header className="flex items-center gap-3 mb-8">
        <Clapperboard className="w-8 h-8 text-primary" />
        <h1 className="text-4xl font-bold font-headline tracking-tight text-white">
          SkitForge <span className="text-primary">AI</span>
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-8 md:items-start">
        {/* Left Column: Script Editor */}
        <div className="md:w-[65%] lg:w-[70%] space-y-8">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-accent"/>
                        AI Script Writer
                    </CardTitle>
                    <CardDescription>
                        Give the AI a prompt and it will write a script for you using your characters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="script-model">Script Model</Label>
                        <Select
                        value={selectedScriptModel}
                        onValueChange={setSelectedScriptModel}
                        disabled={disabled}
                        >
                        <SelectTrigger id="script-model">
                            <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                            {SCRIPT_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                {model.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label htmlFor="script-prompt">Prompt</Label>
                        <Textarea
                            id="script-prompt"
                            placeholder="e.g., A debate between a cat and a dog about who is the better pet."
                            value={scriptPrompt}
                            onChange={(e) => setScriptPrompt(e.target.value)}
                            className="text-base resize-none bg-background/50 focus:bg-background"
                            disabled={disabled}
                            rows={3}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleAiGenerateScript} disabled={disabled || characters.length === 0} className="w-full sm:w-auto">
                        {isGeneratingScript ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Writing...
                        </>
                        ) : (
                        "Generate Script"
                        )}
                    </Button>
                </CardFooter>
            </Card>

          <Card className="h-full bg-card/80 backdrop-blur-sm border-border/50">
             <CardHeader>
                <CardTitle>Script Editor</CardTitle>
                <CardDescription>
                  Write your script below or generate one with AI. Use the format `Character: Dialogue`.
                </CardDescription>
              </CardHeader>
            <CardContent>
              <Textarea
                placeholder="P1: Hello world!
Anna: Hi there, how are you?"
                value={script}
                onChange={handleScriptChange}
                className="min-h-[400px] md:min-h-[500px] text-base resize-none bg-background/50 focus:bg-background"
                disabled={disabled}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Control Panel */}
        <div className="md:w-[35%] lg:w-[30%]">
          <Card className="sticky top-8 bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Control Panel</CardTitle>
              <CardDescription>Manage characters, voices, and generate your skit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[450px] overflow-y-auto pr-3">
              <div className="space-y-1">
                <Label htmlFor="tts-model">Audio Model</Label>
                <Select
                  value={selectedTtsModel}
                  onValueChange={setSelectedTtsModel}
                  disabled={disabled}
                >
                  <SelectTrigger id="tts-model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

               <Dialog open={isPersonaDialogOpen} onOpenChange={setIsPersonaDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <BookUser className="mr-2 h-4 w-4" />
                        Manage Personas
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                    <DialogTitle>{editingPersona ? 'Edit Persona' : 'Persona Library'}</DialogTitle>
                    <DialogDescription>
                        {editingPersona ? 'Update the details for this persona.' : 'Create, edit, and manage reusable character personas for your skits.'}
                    </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        <div className="space-y-4">
                             <h3 className="font-medium text-lg">{editingPersona ? 'Edit Form' : 'Add New Persona'}</h3>
                            <div className="space-y-2">
                                <Label htmlFor="persona-name">Persona Name</Label>
                                <Input id="persona-name" value={newPersonaName} onChange={(e) => setNewPersonaName(e.target.value)} placeholder="e.g., Grumpy Cat" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="persona-desc">Persona Description</Label>
                                <Textarea id="persona-desc" value={newPersonaDescription} onChange={(e) => setNewPersonaDescription(e.target.value)} placeholder="e.g., A cynical cat who secretly enjoys poetry." className="min-h-[120px]"/>
                            </div>
                             <Button onClick={handleSavePersona}>{editingPersona ? 'Save Changes' : 'Add Persona'}</Button>
                             {editingPersona && <Button variant="ghost" onClick={() => setEditingPersona(null)}>Cancel Edit</Button>}
                        </div>
                        <div className="space-y-3">
                            <h3 className="font-medium text-lg">Saved Personas</h3>
                            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                            {personas.length === 0 && <p className="text-sm text-muted-foreground">No personas created yet.</p>}
                            {personas.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 border rounded-md">
                                    <span className="font-medium">{p.name}</span>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => handleEditPersona(p)}>Edit</Button>
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeletePersona(p.id)}>Delete</Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" onClick={() => setIsPersonaDialogOpen(false)}>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
                </Dialog>

              {characters.map((char) => (
                <div key={char.id} className="space-y-3 p-3 border rounded-md relative">
                   <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveCharacter(char.id)}
                    disabled={disabled}
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
                      disabled={disabled}
                    />
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`persona-${char.id}`}>Persona</Label>
                    <Select
                        value={char.personaId}
                        onValueChange={(value) => handleCharacterChange(char.id, 'personaId', value)}
                        disabled={disabled}
                    >
                        <SelectTrigger id={`persona-${char.id}`}>
                            <SelectValue placeholder="Select a persona" />
                        </SelectTrigger>
                        <SelectContent>
                             {personas.map((persona) => (
                              <SelectItem key={persona.id} value={persona.id}>
                                {persona.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Voice</Label>
                     <div className="flex gap-2">
                        <Select
                        value={char.voice}
                        onValueChange={(value) => handleCharacterChange(char.id, 'voice', value)}
                        disabled={disabled}
                        >
                        <SelectTrigger id={`voice-${char.id}`}>
                            <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(groupedVoices).map(([gender, voices]) => (
                            <SelectGroup key={gender}>
                                <SelectLabel>{gender}</SelectLabel>
                                {voices.map((voice) => (
                                <SelectItem key={voice.id} value={voice.id}>
                                    {voice.name}
                                </SelectItem>
                                ))}
                            </SelectGroup>
                            ))}
                        </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => handleSuggestVoice(char.id)} disabled={disabled || isSuggestingVoice !== null} title="Suggest a Voice">
                           {isSuggestingVoice === char.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                        </Button>
                    </div>
                  </div>
                </div>
              ))}
               <Button onClick={handleAddCharacter} variant="outline" className="w-full" disabled={disabled}>
                <Plus className="mr-2 h-4 w-4" />
                Add Character
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button onClick={handleGenerateSkit} disabled={disabled || characters.length === 0} className="w-full text-lg py-6">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Skit...
                  </>
                ) : (
                  "Generate Skit Audio"
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
