export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type Language = 'en' | 'ne';

export interface SpeakerConfig {
  name: string;
  voice: VoiceName;
}

export interface NarrationStyle {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface TextAction {
  id: string;
  name: string;
  description: string;
}

export interface TemplateItem {
  id: string;
  title: string;
  language: Language;
  category: string;
  text: string;
  suggestedVoice: VoiceName;
  suggestedTone: string;
}

export interface AudioGenerationResult {
  url: string;
  base64: string;
  text: string;
  language: Language;
  timestamp: string;
}
