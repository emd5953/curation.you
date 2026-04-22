import { GoogleGenAI, Type } from "@google/genai";
import { AlchemyResult, DecodedStyle } from "@/src/types";

// --- API Key Helpers ---

function getFreeAi() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

function getPaidAi() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Paid API_KEY not set. Falling back to GEMINI_API_KEY.");
    const fallback = process.env.GEMINI_API_KEY;
    if (!fallback) throw new Error("No API key available.");
    return new GoogleGenAI({ apiKey: fallback });
  }
  console.log(`Using paid API key: ${apiKey.substring(0, 4)}...`);
  return new GoogleGenAI({ apiKey });
}

// --- Image Helper ---

async function toInlineImage(img: string) {
  if (img.startsWith("data:")) {
    return { inlineData: { mimeType: "image/jpeg", data: img.split(",")[1] } };
  }
  try {
    const res = await fetch(img);
    const buf = await res.arrayBuffer();
    return { inlineData: { mimeType: "image/jpeg", data: Buffer.from(buf).toString("base64") } };
  } catch (err) {
    console.error("Failed to fetch image:", img, err);
    return null;
  }
}

// --- Shared Alchemy Response Schema ---

const alchemySchema = {
  type: Type.OBJECT,
  properties: {
    decoded_style: { type: Type.OBJECT },
    subject_description: { type: Type.STRING },
    video_prompt: { type: Type.STRING },
    music_prompt: { type: Type.STRING },
    music_match: {
      type: Type.OBJECT,
      properties: {
        genre: { type: Type.STRING },
        subgenre: { type: Type.STRING },
        artist: { type: Type.STRING },
        song: { type: Type.STRING },
        why: { type: Type.STRING },
        bpm_range: { type: Type.STRING },
        mood_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["genre", "subgenre", "artist", "song", "why", "bpm_range", "mood_tags"],
    },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          shot: { type: Type.STRING },
          action: { type: Type.STRING },
          text_overlay: { type: Type.STRING },
        },
        required: ["shot", "action", "text_overlay"],
      },
    },
    hook: { type: Type.STRING },
    vibe_score: { type: Type.NUMBER },
  },
  required: [
    "decoded_style", "subject_description", "video_prompt",
    "music_prompt", "music_match", "scenes", "hook", "vibe_score",
  ],
} as const;

// --- 1. Decode Style from Inspo/Pinterest Images ---

export async function decodeStyle(inspoImages: string[]): Promise<DecodedStyle> {
  console.log("[Gemini] Decoding style for", inspoImages.length, "images");
  const ai = getFreeAi();
  const images = (await Promise.all(inspoImages.map(toInlineImage))).filter(Boolean) as any[];

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          text: `These are Pinterest/mood board images. Extract the visual aesthetic as technical specs I can use to recreate this look in a short-form vertical video.

I need:
- aura: 2-3 word aesthetic name (like "Dark Academia" or "Clean Girl" or "Mob Wife")
- palette_and_tone: the color grading (like "warm golden tones" or "cool desaturated blues")
- texture: the camera/film look (like "grainy film" or "sharp digital" or "soft glow")
- composition: how shots are framed (like "tight close-ups" or "wide symmetrical" or "handheld movement")
- color_palette: exactly 5 hex codes that capture this vibe

ONLY describe the style, lighting, and camera work. Ignore the people/objects.`,
        },
        ...images,
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aura: { type: Type.STRING },
          palette_and_tone: { type: Type.STRING },
          texture: { type: Type.STRING },
          composition: { type: Type.STRING },
          color_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["aura", "palette_and_tone", "texture", "composition", "color_palette"],
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (err) {
    console.error("[Gemini] DecodeStyle parse error:", err);
    throw new Error("Failed to decode the visual style.");
  }
}

// --- 2. Alchemy: Inspo Style + Your Photos → Video Plan + Sound Match ---

export async function performAlchemy(
  decodedStyle: DecodedStyle,
  rawPhotos: string[]
): Promise<AlchemyResult> {
  console.log("[Gemini] Performing alchemy with", rawPhotos.length, "photos");
  const ai = getFreeAi();

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          text: `I have a target aesthetic and photos of my subject. I need you to do two things:

A) Plan a TikTok video that puts MY subject into the TARGET aesthetic.
B) Match a song to it — like TikTok's sound recommendation but smarter.

TARGET AESTHETIC:
- Vibe: ${decodedStyle.aura}
- Color grading: ${decodedStyle.palette_and_tone}
- Texture/film look: ${decodedStyle.texture}
- Shot style: ${decodedStyle.composition}
- Colors: ${decodedStyle.color_palette.join(", ")}

The attached photos are of MY subject. Study them carefully.

Return:
- subject_description: Detailed literal description of the person in the photos — what they look like, what they're wearing, hair, accessories. Be extremely specific so the video AI doesn't swap them for someone else.
- video_prompt: A single paragraph starting with "A cinematic 1080p vertical video of [subject_description]..." that describes the video. Apply the target aesthetic's lighting, color grading, and composition to the subject. Describe what they're doing, the environment, camera movement. Be literal and specific, not poetic.
- scenes: 3-4 key shots for the video. Each has: shot type, what happens, and optional text overlay.
- hook: The first 2-3 seconds that stops the scroll.
- music_match: This is the important one. Think like TikTok's algorithm when it suggests sounds. Don't just pick a genre, pick a *niche*:
  - genre: main genre (e.g. "R&B", "Phonk", "Indie Pop")
  - subgenre: more specific (e.g. "Dark R&B", "Brazilian Phonk", "Bedroom Pop", "Slowed + Reverb", "Sped Up")
  - artist: a real artist that fits this exact vibe (e.g. "Lana Del Rey", "Playboi Carti", "Tame Impala")
  - song: a specific real song by that artist — pick something that's actually trending or iconic for this aesthetic.
  - why: one sentence on why this song matches the visual energy (e.g. "The ethereal vocals match the soft-glow lighting.")
  - bpm_range: estimated BPM range that fits the edit pace (e.g. "85-95")
  - mood_tags: 3-5 tags like ["confident", "moody", "nightlife", "slow-burn", "ethereal"]
- music_prompt: A prompt for AI music generation that captures this vibe. BE SPECIFIC: "A slowed + reverb dark R&B track with heavy bass and ethereal synths, 90 BPM, moody and cinematic."
- vibe_score: 0-100 how well the raw photos can be elevated into this aesthetic.
- decoded_style: just pass back the target aesthetic as-is.

RULES:
- The ONLY subject is the person from the attached photos. Ignore anyone in the inspo images.
- Be specific and literal in the video_prompt. No metaphors.
- The music match should feel like what TikTok would suggest — trendy, genre-aware, vibe-matched.`,
        },
        ...rawPhotos.map((img) => ({
          inlineData: { mimeType: "image/jpeg", data: img.split(",")[1] },
        })),
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: alchemySchema,
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (err) {
    console.error("[Gemini] Alchemy parse error:", err);
    console.error("[Gemini] Raw (first 500):", response.text?.substring(0, 500));
    throw new Error("AI blueprint was corrupted. Try again with fewer images.");
  }
}

// --- 3. Refine: User Gives Feedback, We Adjust ---

export async function refineAlchemy(
  previousResult: AlchemyResult,
  rawPhotos: string[],
  refinementPrompt: string
): Promise<AlchemyResult> {
  console.log("[Gemini] Refining with:", refinementPrompt);
  const ai = getFreeAi();

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        {
          text: `I have an existing TikTok video plan that I want to tweak.

CURRENT PLAN:
- Subject: ${previousResult.subject_description}
- Video prompt: ${previousResult.video_prompt}
- Music: ${previousResult.music_match.song} by ${previousResult.music_match.artist} (${previousResult.music_match.genre})
- Hook: ${previousResult.hook}
- Scenes: ${previousResult.scenes.map((s, i) => `${i + 1}. ${s.action}`).join(" | ")}

USER WANTS TO CHANGE: "${refinementPrompt}"

Apply that change. The subject photos are attached — the subject must stay the SAME person.

RULES:
- Keep subject_description identical: "${previousResult.subject_description}"
- video_prompt must still start with "A cinematic 1080p vertical video of ${previousResult.subject_description}..."
- If the vibe changed, update the music_match to a better fitting song.
- If the vibe didn't change, keep the same music.
- decoded_style stays the same unless the refinement explicitly changes the aesthetic.`,
        },
        ...rawPhotos.map((img) => ({
          inlineData: { mimeType: "image/jpeg", data: img.split(",")[1] },
        })),
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: alchemySchema,
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (err) {
    console.error("[Gemini] Refine parse error:", err);
    throw new Error("Refinement failed. Try a simpler request.");
  }
}

// --- 4. Generate Video via Veo ---

export async function generateVideo(
  prompt: string,
  referenceImage?: string
): Promise<string> {
  console.log("[Gemini] Generating video, prompt length:", prompt.length);
  const ai = getPaidAi();

  const videoConfig: any = {
    model: "veo-3.1-generate-preview",
    prompt,
    config: { numberOfVideos: 1, resolution: "1080p", aspectRatio: "9:16" },
  };

  if (referenceImage) {
    console.log("[Gemini] Adding reference image conditioning");
    videoConfig.image = {
      imageBytes: referenceImage.startsWith("data:")
        ? referenceImage.split(",")[1]
        : referenceImage,
      mimeType: "image/jpeg",
    };
  }

  let operation;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  while (retryCount < MAX_RETRIES) {
    try {
      operation = await ai.models.generateVideos(videoConfig);
      console.log("[Gemini] Video operation started");
      break;
    } catch (err: any) {
      retryCount++;
      console.error(`[Gemini] Video generation attempt ${retryCount} failed:`, err);
      if (retryCount >= MAX_RETRIES) throw err;
      // Wait before retrying internal server errors
      await new Promise(r => setTimeout(r, 5000 * retryCount));
    }
  }

  const MAX_ATTEMPTS = 60;
  let attempts = 0;
  while (!operation.done && attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`[Gemini] Polling video (attempt ${attempts})...`);
    await new Promise((r) => setTimeout(r, 10000));
    try {
      operation = await ai.operations.getVideosOperation({ operation });
    } catch (err) {
      console.error("[Gemini] Poll error:", err);
      if (attempts > MAX_ATTEMPTS - 5) throw err;
    }
  }

  if (attempts >= MAX_ATTEMPTS) throw new Error("Video generation timed out (10 min).");
  if (operation.error) throw new Error(`Video failed: ${operation.error.message}`);

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("No video in response");
  return uri;
}

// --- 5. Deezer Music Search ---

export async function searchMusic(
  song: string,
  artist: string
): Promise<{ preview: string; albumArt: string; link: string; song: string; artist: string } | null> {
  console.log(`[Deezer] Searching: ${song} by ${artist}`);
  try {
    const q = `artist:"${artist}" track:"${song}"`;
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      const track = data.data[0];
      return {
        preview: track.preview,
        albumArt: track.album.cover_medium,
        link: track.link,
        song: track.title,
        artist: track.artist.name
      };
    }
    
    // Fallback search if exact match fails
    const fallbackQ = `${song} ${artist}`;
    const fallbackRes = await fetch(`/api/music/search?q=${encodeURIComponent(fallbackQ)}`);
    const fallbackData = await fallbackRes.json();
    
    if (fallbackData.data && fallbackData.data.length > 0) {
      const track = fallbackData.data[0];
      return {
        preview: track.preview,
        albumArt: track.album.cover_medium,
        link: track.link,
        song: track.title,
        artist: track.artist.name
      };
    }
    
    return null;
  } catch (err) {
    console.error("[Deezer] Search error:", err);
    return null;
  }
}
