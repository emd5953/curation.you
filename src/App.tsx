import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Wand2, ArrowRight, RefreshCcw, Camera, Palette, Music, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/src/components/ImageUploader";
import { ResultView } from "@/src/components/ResultView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { decodeStyle, performAlchemy, generateVideo, refineAlchemy, searchMusic } from "@/src/lib/gemini";
import { AlchemyResult, DecodedStyle } from "@/src/types";
import { Skeleton } from "@/components/ui/skeleton";

type Step = "welcome" | "inspo" | "raw" | "processing" | "results";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [inspoImages, setInspoImages] = useState<string[]>([]);
  const [rawPhotos, setRawPhotos] = useState<string[]>([]);
  const [decodedStyle, setDecodedStyle] = useState<DecodedStyle | null>(null);
  const [result, setResult] = useState<AlchemyResult | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingSubMessage, setLoadingSubMessage] = useState("");
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [refinePrompt, setRefinePrompt] = useState("");

  const checkApiKey = async () => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyDialog(true);
        return false;
      }
    }
    return true;
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setShowKeyDialog(false);
      startAlchemy(); // Proceed after selection
    }
  };

  const startAlchemy = async () => {
    const hasKey = await checkApiKey();
    if (!hasKey) return;

    setErrorMessage(null);
    try {
      setStep("processing");
      setLoadingMessage("Analyzing Visual DNA...");
      setLoadingSubMessage("Extracting textures, lighting, and cinematic language...");
      const decoded = await decodeStyle(inspoImages);
      setDecodedStyle(decoded);

      setLoadingMessage("Drafting Production Blueprint...");
      setLoadingSubMessage("Synthesizing your assets with the target aesthetic...");
      const alchemyResult = await performAlchemy(decoded, rawPhotos);
      
      setLoadingMessage("Rendering Cinematic Concept...");
      setLoadingSubMessage("Veo 3.1 is crafting your vertical production. This usually takes 2-5 minutes...");
      
      // Start a timer to update sub-messages during video generation
      const subMessages = [
        "Applying cinematic color grading...",
        "Synchronizing edit rhythm...",
        "Synthesizing spatial textures...",
        "Finalizing cinematic render...",
        "Polishing the visual hook...",
        "Optimizing for vertical display...",
        "Refining the artistic vision..."
      ];
      let msgIndex = 0;
      const interval = setInterval(() => {
        setLoadingSubMessage(subMessages[msgIndex % subMessages.length]);
        msgIndex++;
        
        // Add a "Still working" warning after 5 minutes (20 intervals of 15s)
        if (msgIndex === 20) {
          setLoadingMessage("Still Rendering...");
          setLoadingSubMessage("The AI queue is busy, but your production is still in progress. Please don't close this tab.");
        }
      }, 15000);

      const [videoUrl, musicData] = await Promise.all([
        generateVideo(alchemyResult.video_prompt),
        searchMusic(alchemyResult.music_match.song, alchemyResult.music_match.artist)
      ]);
      clearInterval(interval);
      
      setResult({ 
        ...alchemyResult, 
        video_url: videoUrl, 
        audio_url: musicData?.preview || undefined,
        music_match: {
          ...alchemyResult.music_match,
          song: musicData?.song || alchemyResult.music_match.song,
          artist: musicData?.artist || alchemyResult.music_match.artist,
          preview_url: musicData?.preview,
          album_art: musicData?.albumArt,
          external_link: musicData?.link
        }
      });
      
      setStep("results");
    } catch (error: any) {
      console.error("Alchemy failed:", error);
      
      let msg = "The alchemy failed. Please try again.";
      const errorStr = error.message || "";
      
      if (errorStr.includes("spending cap")) {
        msg = "Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend to manage it.";
      } else if (errorStr.includes("prepayment credits")) {
        msg = "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your billing.";
      } else if (errorStr.includes("RESOURCE_EXHAUSTED")) {
        msg = "Your Gemini API credits are depleted or quota exceeded. Please check your billing in AI Studio.";
      } else if (errorStr.includes("Requested entity was not found")) {
        msg = "The selected API key is invalid or was not found. Please re-select your key.";
        setShowKeyDialog(true);
      } else {
        try {
          const errorData = JSON.parse(errorStr);
          if (errorData.error?.message) msg = errorData.error.message;
        } catch (e) {
          if (errorStr) msg = errorStr;
        }
      }
      
      setErrorMessage(msg);
      setStep("raw");
    }
  };

  const handleRefine = async (refinementPrompt: string) => {
    if (!decodedStyle || !result) return;
    
    setIsRefining(true);
    setErrorMessage(null);
    try {
      const refinedAlchemy = await refineAlchemy(result, rawPhotos, refinementPrompt);
      const [videoUrl, musicData] = await Promise.all([
        generateVideo(refinedAlchemy.video_prompt),
        searchMusic(refinedAlchemy.music_match.song, refinedAlchemy.music_match.artist)
      ]);
      setResult({ 
        ...refinedAlchemy, 
        video_url: videoUrl, 
        audio_url: musicData?.preview || undefined,
        music_match: {
          ...refinedAlchemy.music_match,
          song: musicData?.song || refinedAlchemy.music_match.song,
          artist: musicData?.artist || refinedAlchemy.music_match.artist,
          preview_url: musicData?.preview,
          album_art: musicData?.albumArt,
          external_link: musicData?.link
        }
      });
    } catch (err: any) {
      console.error("[App] Refinement error:", err);
      let msg = "The refinement failed. Please try again.";
      const errorStr = err.message || "";
      
      if (errorStr.includes("spending cap")) {
        msg = "Your project has exceeded its monthly spending cap. Please go to AI Studio at https://ai.studio/spend to manage it.";
      } else if (errorStr.includes("prepayment credits")) {
        msg = "Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your billing.";
      } else if (errorStr.includes("RESOURCE_EXHAUSTED")) {
        msg = "Your Gemini API credits are depleted or quota exceeded. Please check your billing in AI Studio.";
      } else {
        try {
          const errorData = JSON.parse(errorStr);
          if (errorData.error?.message) msg = errorData.error.message;
        } catch (e) {
          if (errorStr) msg = errorStr;
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const reset = () => {
    setStep("welcome");
    setInspoImages([]);
    setRawPhotos([]);
    setDecodedStyle(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Left Panel: The Control Center (Chat/Workflow) */}
      <aside className="w-full lg:w-[40%] border-r border-white/5 flex flex-col h-screen overflow-y-auto glass-dark relative z-10">
        <header className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
            <div className="p-2 bg-white/5 rounded-full border border-white/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-lg font-serif italic tracking-tighter uppercase">Curation.you</h1>
          </div>
          {step !== "welcome" && (
            <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-base font-mono uppercase tracking-widest text-muted-foreground hover:text-white">
              <RefreshCcw className="w-3 h-3 mr-2" />
              Reset
            </Button>
          )}
        </header>

        <main className="flex-1 p-8 flex flex-col">
          <AnimatePresence mode="wait">
            {showKeyDialog && (
              <motion.div
                key="key-dialog"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6 text-center py-12"
              >
                <div className="p-3 bg-white/5 rounded-full w-fit mx-auto border border-white/10">
                  <Wand2 className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif italic">Paid API Key Required</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To generate cinematic videos with Veo 3, you must select a paid Gemini API key with billing enabled.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleOpenKeyDialog} className="w-full rounded-full bg-white text-black hover:bg-white/90">
                    Select API Key
                  </Button>
                  <Button variant="ghost" onClick={() => setShowKeyDialog(false)} className="w-full rounded-full text-sm">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "welcome" && !showKeyDialog && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                <div className="space-y-6">
                  <Badge variant="outline" className="px-4 py-1 rounded-full border-white/10 text-white font-mono tracking-widest uppercase text-base bg-white/5">
                    Cinematic Curation Lab
                  </Badge>
                  <h2 className="text-7xl font-serif italic leading-[0.9] tracking-tighter">
                    Cinematic Vision. <br /> Perfectly Curated.
                  </h2>
                  <p className="text-white/80 text-2xl font-serif italic leading-relaxed">
                    "Transform your raw assets into high-fidelity cinematic moments."
                  </p>
                </div>

                <div className="space-y-6 border-t border-white/5 pt-8">
                  <div className="space-y-2">
                    <h3 className="font-serif italic text-lg text-primary">Aesthetic Transfer</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">Infuse your media with the visual language and lighting of any inspiration.</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif italic text-lg text-primary">Director's Cut</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">Generate curated short-form videos powered by Veo 3.1.</p>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  onClick={() => setStep("inspo")}
                  className="w-full rounded-full py-8 text-lg bg-white text-black hover:bg-white/90 shadow-2xl group font-serif italic"
                >
                  Begin Transformation
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}

            {step === "inspo" && !showKeyDialog && (
              <motion.div
                key="inspo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif italic">Step 1: Visual Inspiration</h2>
                  <p className="text-base text-muted-foreground">Upload your curation or moodboard images to define the target aesthetic.</p>
                </div>
                
                <Card className="bg-white/5 border-white/10 p-6">
                  <ImageUploader 
                    images={inspoImages} 
                    setImages={setInspoImages} 
                    label="Moodboard Images" 
                    maxImages={10} 
                  />
                </Card>

                <Button 
                  disabled={inspoImages.length === 0}
                  onClick={() => setStep("raw")}
                  className="w-full rounded-full py-6 bg-white text-black hover:bg-white/90"
                >
                  Next: Raw Assets
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === "raw" && !showKeyDialog && (
              <motion.div
                key="raw"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif italic">Step 2: Raw Assets</h2>
                  <p className="text-base text-muted-foreground">Upload 1-5 photos or clips you want to transform.</p>
                </div>
                
                {errorMessage && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                    <p className="text-destructive text-sm font-medium">{errorMessage}</p>
                    {errorMessage.includes("credits are depleted") && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowKeyDialog(true)}
                        className="w-full border-destructive/20 text-destructive hover:bg-destructive/5 text-sm"
                      >
                        Switch API Key
                      </Button>
                    )}
                  </div>
                )}

                <Card className="bg-white/5 border-white/10 p-6">
                  <ImageUploader 
                    images={rawPhotos} 
                    setImages={setRawPhotos} 
                    label="Photos of You" 
                    maxImages={5} 
                  />
                </Card>

                <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setStep("inspo")} className="flex-1 rounded-full border border-white/10">
                    Back
                  </Button>
                  <Button 
                    disabled={rawPhotos.length === 0}
                    onClick={startAlchemy}
                    className="flex-[2] rounded-full bg-primary text-black hover:bg-primary/90 production-glow"
                  >
                    Start Production
                    <Sparkles className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "processing" && !showKeyDialog && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-12 py-12"
              >
                <div className="space-y-6">
                  <h2 className="text-5xl font-serif italic text-gradient animate-pulse">
                    {loadingMessage}
                  </h2>
                  <p className="text-base text-muted-foreground font-mono uppercase tracking-widest">
                    {loadingSubMessage}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 180, ease: "linear" }}
                    />
                  </div>
                  <p className="text-sm font-mono text-muted-foreground uppercase text-center">Synthesis in progress...</p>
                </div>
                
                <div className="space-y-4">
                  <Card className="bg-white/5 border-white/10 p-4 flex items-center gap-3">
                    <Palette className="w-4 h-4 text-primary" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-1.5 w-full bg-white/5" />
                      <Skeleton className="h-1.5 w-2/3 bg-white/5" />
                    </div>
                  </Card>
                  <Card className="bg-white/5 border-white/10 p-4 flex items-center gap-3">
                    <Video className="w-4 h-4 text-primary" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-1.5 w-full bg-white/5" />
                      <Skeleton className="h-1.5 w-2/3 bg-white/5" />
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {step === "results" && !showKeyDialog && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8 flex-1 flex flex-col"
              >
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif italic">Production Ready</h2>
                  <p className="text-base text-muted-foreground">Your cinematic production has been synthesized. Use the command bar below to refine the edit.</p>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-base font-mono text-primary uppercase tracking-widest mb-2">AI Creative Director</p>
                    <p className="text-lg text-white/80 leading-relaxed italic">
                      "The visual balance is set. I've synthesized your assets into a {result.decoded_style.aura} production. How should we polish this further?"
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-white/60">
                      <Camera className="w-3 h-3" />
                      <p className="text-base font-mono uppercase tracking-widest">Visual Anchor (Subject Identity)</p>
                    </div>
                    <p className="text-lg text-white/70 leading-relaxed italic">
                      {result.subject_description}
                    </p>
                    <p className="text-base text-primary/80 font-mono uppercase">Reference this description in your prompts for consistency.</p>
                  </div>

                  {isRefining && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-lg animate-pulse">
                      <p className="text-sm font-mono text-white/40 uppercase tracking-widest mb-2">Processing Refinement</p>
                      <p className="text-base italic text-white/60">Updating the blueprint and re-rendering the cinematic textures...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4 mt-auto">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (refinePrompt.trim()) {
                        handleRefine(refinePrompt);
                        setRefinePrompt("");
                      }
                    }} 
                    className="relative group"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative flex items-center gap-2 p-1 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                      <input
                        type="text"
                        value={refinePrompt}
                        onChange={(e) => setRefinePrompt(e.target.value)}
                        placeholder="Refine (e.g. 'Make it more moody')..."
                        className="flex-1 bg-transparent border-none outline-none px-6 py-3 text-base font-serif italic placeholder:text-muted-foreground/50 text-white"
                        disabled={isRefining}
                      />
                      <Button 
                        type="submit" 
                        size="icon" 
                        disabled={!refinePrompt.trim() || isRefining}
                        className="rounded-full bg-white text-black hover:bg-white/90"
                      >
                        {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </form>

                  <Button variant="outline" onClick={reset} className="w-full rounded-full border-white/10 hover:bg-white/5 text-sm h-12">
                    Start New Production
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="p-6 border-t border-white/5 shrink-0">
          <p className="text-base font-mono text-muted-foreground uppercase tracking-[0.2em] text-center">
            Curation.you // Cinematic Studio
          </p>
        </footer>
      </aside>

      {/* Right Panel: The Stage (Canvas/Preview) */}
      <section className="hidden lg:flex flex-1 bg-[#050505] relative items-center justify-center p-12 overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

        <div className="w-full h-full max-w-4xl flex flex-col items-center justify-center relative z-10">
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="stage-welcome"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="relative group"
              >
                <div className="absolute -inset-20 bg-primary/10 rounded-full blur-[100px] opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
                <div className="w-[300px] aspect-[9/16] bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60" />
                  <Sparkles className="w-12 h-12 text-white/20 animate-pulse" />
                  <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                    <p className="text-base font-mono text-white/40 uppercase tracking-widest">Awaiting Input</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === "inspo" && (
              <motion.div
                key="stage-inspo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center gap-8"
              >
                <h3 className="text-base font-mono uppercase tracking-[0.3em] text-white/40">Target Aesthetic Gallery</h3>
                <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                  {inspoImages.length > 0 ? (
                    inspoImages.map((img, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 group"
                      >
                        <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                      </motion.div>
                    ))
                  ) : (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl border border-dashed border-white/5 bg-white/[0.02]" />
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {step === "raw" && (
              <motion.div
                key="stage-raw"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center gap-8"
              >
                <h3 className="text-base font-mono uppercase tracking-[0.3em] text-white/40">Raw Asset Inventory</h3>
                <div className="grid grid-cols-2 gap-6 w-full max-w-xl">
                  {rawPhotos.length > 0 ? (
                    rawPhotos.map((img, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5 relative group"
                      >
                        <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-sm font-mono text-white px-3 py-1 bg-black/60 rounded-full">ASSET {i + 1}</span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="aspect-[3/4] rounded-2xl border border-dashed border-white/5 bg-white/[0.02]" />
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="stage-processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center"
              >
                <div className="relative w-64 h-64">
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_infinite]" />
                  <div className="absolute inset-4 rounded-full border border-primary/40 animate-[ping_2s_infinite]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-primary/10 backdrop-blur-3xl border border-primary/20 flex items-center justify-center">
                      <Wand2 className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="mt-12 text-center space-y-2">
                  <p className="text-3xl font-serif italic text-white/80">Synthesizing Cinematic Reality</p>
                  <p className="text-base font-mono text-white/40 uppercase tracking-[0.4em]">Veo 3.1 Engine Active</p>
                </div>
              </motion.div>
            )}

            {step === "results" && decodedStyle && result && (
              <motion.div
                key="stage-results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <ResultView 
                  decodedStyle={decodedStyle} 
                  result={result} 
                  rawPhotos={rawPhotos}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Mobile Fallback (Simple scroll) */}
      <div className="lg:hidden fixed inset-0 z-50 bg-black flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-2xl font-serif italic">Desktop Experience Required</h2>
          <p className="text-sm text-muted-foreground">The Curation.you Studio is optimized for widescreen cinematic production.</p>
        </div>
      </div>
    </div>
  );
}

