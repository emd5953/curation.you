export interface DecodedStyle {
  aura: string;
  palette_and_tone: string;
  texture: string;
  composition: string;
  color_palette: string[];
}

export interface Scene {
  shot: string;
  action: string;
  text_overlay: string;
}

export interface MusicMatch {
  genre: string;
  subgenre: string;
  artist: string;
  song: string;
  why: string;
  bpm_range: string;
  mood_tags: string[];
  preview_url?: string;
  album_art?: string;
  external_link?: string;
}

export interface AlchemyResult {
  decoded_style: DecodedStyle;
  subject_description: string;
  video_prompt: string;
  music_prompt: string;
  music_match: MusicMatch;
  scenes: Scene[];
  hook: string;
  vibe_score: number;
  video_url?: string;
  audio_url?: string;
}
