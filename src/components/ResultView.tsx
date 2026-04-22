import { AlchemyResult, DecodedStyle } from "@/src/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Music, Video, Sparkles, Palette, Zap, Layout, MessageSquare, Info, Camera, Send, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./VideoPlayer";

interface ResultViewProps {
  decodedStyle: DecodedStyle;
  result: AlchemyResult;
  rawPhotos: string[];
}

export function ResultView({ decodedStyle, result, rawPhotos }: ResultViewProps) {
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Cinematic Preview */}
      <div className="flex flex-col gap-6 items-center">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-serif italic">Cinematic Render</h3>
                <p className="text-base font-mono text-white/60 uppercase tracking-widest">Veo 3.1 // 1080p Vertical</p>
              </div>
            </div>
            <Badge className="bg-primary/20 text-primary border-primary/30 text-base uppercase font-mono">
              {result.decoded_style.aura}
            </Badge>
          </div>

          <Card className="relative aspect-[9/16] w-full bg-black overflow-hidden rounded-2xl border-white/10 shadow-2xl group mx-auto">
            {result.video_url ? (
              <VideoPlayer url={result.video_url} audioUrl={result.audio_url} />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="relative">
                  <Video className="w-12 h-12 text-primary animate-pulse" />
                  <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full animate-pulse" />
                </div>
                <p className="text-sm font-serif italic">Synthesizing cinematic textures...</p>
              </div>
            )}
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="secondary" className="rounded-full h-8 text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md border-white/10">
                Download 1080p
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Production Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card className="bg-white/5 border-white/10 p-5 space-y-4 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-primary">
              <Music className="w-4 h-4" />
              <h3 className="text-base font-mono uppercase tracking-widest">Sound Selection</h3>
            </div>
            {result.music_match.external_link && (
              <a 
                href={result.music_match.external_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-white/40 hover:text-white transition-colors uppercase tracking-widest"
              >
                Open in Deezer
              </a>
            )}
          </div>
          
          <div className="flex gap-4 items-center relative z-10">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-black/40 overflow-hidden animate-[spin_8s_linear_infinite] shadow-2xl">
                {result.music_match.album_art ? (
                  <img src={result.music_match.album_art} alt="Album Art" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                    <Music className="w-8 h-8 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-black rounded-full border-2 border-white/20" />
            </div>
            
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xl font-serif italic text-white truncate">{result.music_match.song}</p>
                <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-white/40 shrink-0">
                  {result.music_match.genre}
                </Badge>
              </div>
              <p className="text-base font-mono text-primary uppercase tracking-tighter truncate">{result.music_match.artist}</p>
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest">{result.music_match.subgenre}</p>
            </div>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/5 relative z-10">
            <p className="text-sm leading-relaxed text-white/60 italic">
              "{result.music_match.why}"
            </p>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 blur-3xl rounded-full" />
        </Card>

        <Card className="bg-white/5 border-white/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Camera className="w-4 h-4" />
            <h3 className="text-base font-mono uppercase tracking-widest">Analysis</h3>
          </div>
          <p className="text-lg leading-relaxed italic text-white/80 line-clamp-4">
            {result.subject_description}
          </p>
        </Card>

        <Card className="bg-white/5 border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-base font-mono uppercase tracking-widest">Storyboard</h3>
            </div>
            <p className="text-base font-mono text-white/60">{result.scenes.length} Scenes</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {result.scenes.slice(0, 3).map((frame, i) => (
              <div key={i} className="text-base space-y-0.5 border-l border-white/10 pl-3 py-0.5">
                <p className="text-primary/90 font-mono uppercase text-xs truncate">{frame.shot}</p>
                <p className="text-white/80 line-clamp-1 text-sm">{frame.action}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Technical Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex gap-6 text-base font-mono text-white/60 uppercase tracking-widest">
          <span className="flex items-center gap-2"><Palette className="w-3 h-3" /> {result.decoded_style.aura}</span>
          <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Production Engine v2</span>
        </div>
        <Button variant="ghost" size="sm" onClick={copyJson} className="h-6 gap-2 text-base font-mono text-white/60 hover:text-white">
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          BLUEPRINT JSON
        </Button>
      </div>
    </div>
  );
}
