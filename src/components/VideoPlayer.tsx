import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  url: string;
  audioUrl?: string;
}

export function VideoPlayer({ url, audioUrl }: VideoPlayerProps) {
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current && audioRef.current) {
      const video = videoRef.current;
      const audio = audioRef.current;

      const syncAudio = () => {
        audio.currentTime = video.currentTime;
        if (video.paused) audio.pause();
        else audio.play();
      };

      video.addEventListener("play", () => audio.play());
      video.addEventListener("pause", () => audio.pause());
      video.addEventListener("seeking", () => {
        audio.currentTime = video.currentTime;
      });
      video.addEventListener("ratechange", () => {
        audio.playbackRate = video.playbackRate;
      });

      return () => {
        video.removeEventListener("play", () => audio.play());
        video.removeEventListener("pause", () => audio.pause());
      };
    }
  }, [videoBlobUrl, audioUrl]);

  useEffect(() => {
    let isMounted = true;

    async function fetchVideo() {
      try {
        setLoading(true);
        setError(null);

        // The API key is injected into the environment
        const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;

        if (!apiKey) {
          throw new Error("API key not found for video playback");
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "x-goog-api-key": apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (isMounted) {
          const blobUrl = URL.createObjectURL(blob);
          setVideoBlobUrl(blobUrl);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Video fetch error:", err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchVideo();

    return () => {
      isMounted = false;
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [url]);

  if (loading) {
    return <Skeleton className="w-full h-full bg-white/5" />;
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-destructive p-4 text-center">
        <AlertCircle className="w-8 h-8" />
        <p className="text-xs font-mono uppercase tracking-wider">Playback Error</p>
        <p className="text-[10px] opacity-60">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={videoBlobUrl || ""}
        controls
        autoPlay
        loop
        playsInline
        muted={!!audioUrl}
        className="w-full h-full object-cover"
      />
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          loop
          className="hidden"
        />
      )}
    </div>
  );
}
