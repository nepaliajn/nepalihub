import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Download,
  Sparkles,
  Mic,
  Users,
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Volume2,
  Check,
  FileAudio,
  Languages,
  ArrowRight,
  Info,
  Clock,
  RotateCcw,
  VolumeX,
} from "lucide-react";
import { VoiceName, Language, SpeakerConfig, TemplateItem, AudioGenerationResult } from "./types";
import { TEMPLATES, DIALOGUE_TEMPLATES } from "./templates";
import { base64ToWavBlob, formatTime } from "./utils";

const SPEAKERS: { name: VoiceName; desc: string; characteristics: string; gender: string }[] = [
  { name: "Kore", desc: "Professional & Articulate", characteristics: "Perfect for news broadcasts, clear corporate prompts, formal voiceovers", gender: "Female timbre" },
  { name: "Puck", desc: "Energetic & Upbeat", characteristics: "Designed for high-energy social media hooks, viral shorts, and youth-focused ads", gender: "Youthful / Bright" },
  { name: "Charon", desc: "Deep & Authoritative", characteristics: "Immersive narrative guide. Best for news headers, movies, and historical summaries", gender: "Deep Male timbre" },
  { name: "Fenrir", desc: "Warm & Sincere", characteristics: "Friendly and approachable. Optimal for podcasts, storytelling, and warm promotions", gender: "Resonant Male" },
  { name: "Zephyr", desc: "Calm & Sophisticated", characteristics: "Soft, clear, and reassuring. Best for audiobooks, tutorials, and corporate insights", gender: "Clear Executive" },
];

const TONE_OPTIONS = [
  { id: "professional", label: "Formal News / Corporate", help: "Speaks with formal newscaster inflection" },
  { id: "enthusiastic", label: "High-Energy Reel", help: "Excited, fast-paced voice for social media success" },
  { id: "dramatic", label: "Dramatic Narrative", help: "Deep, theatrical spacing for storytelling" },
  { id: "calm", label: "Calm Tutorial", help: "Steady, measured pace for clear understanding" },
  { id: "warm", label: "Warm & Conversational", help: "Friendly, casual everyday speaking rhythm" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"narration" | "dialogue">("narration");

  // Single-Speaker State
  const [language, setLanguage] = useState<Language>("en");
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>("Kore");
  const [selectedTone, setSelectedTone] = useState<string>("professional");
  const [narrationText, setNarrationText] = useState<string>(TEMPLATES[0].text);
  const [customVibePrompt, setCustomVibePrompt] = useState<string>("");

  // Dialogue State
  const [dialogueLanguage, setDialogueLanguage] = useState<Language>("en");
  const [dialogueText, setDialogueText] = useState<string>(DIALOGUE_TEMPLATES[0].text);
  const [dialogueSpeakers, setDialogueSpeakers] = useState<SpeakerConfig[]>([
    { name: "Host", voice: "Zephyr" },
    { name: "Guest", voice: "Puck" },
  ]);

  // Loading & Processing States
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [enhanceAction, setEnhanceAction] = useState<string>("enhance");

  // Interactive Results & Wave Player
  const [currentResult, setCurrentResult] = useState<AudioGenerationResult | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // History Log
  const [history, setHistory] = useState<AudioGenerationResult[]>([]);

  // DOM Elements Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  // Sync templates on language toggle
  const handleSingleLangChange = (lang: Language) => {
    setLanguage(lang);
    const filter = TEMPLATES.find((t) => t.language === lang);
    if (filter) {
      setNarrationText(filter.text);
      setSelectedVoice(filter.suggestedVoice);
      setSelectedTone(filter.suggestedTone);
    }
  };

  const handleDialogueLangChange = (lang: Language) => {
    setDialogueLanguage(lang);
    const template = DIALOGUE_TEMPLATES.find((t) => t.language === lang);
    if (template) {
      setDialogueText(template.text);
      setDialogueSpeakers(template.suggestedSpeakers as SpeakerConfig[]);
    }
  };

  const handleApplyTemplate = (item: TemplateItem) => {
    setLanguage(item.language);
    setNarrationText(item.text);
    setSelectedVoice(item.suggestedVoice);
    setSelectedTone(item.suggestedTone);
  };

  const handleApplyDialogueTemplate = (tpl: typeof DIALOGUE_TEMPLATES[0]) => {
    setDialogueLanguage(tpl.language as Language);
    setDialogueText(tpl.text);
    setDialogueSpeakers(tpl.suggestedSpeakers as SpeakerConfig[]);
  };

  // Add/Remove speakers for conversational dialogues
  const handleAddSpeaker = () => {
    const defaultNames = ["Reporter", "Expert", "Narrator", "Speaker C", "Voice D"];
    const currentNames = dialogueSpeakers.map(s => s.name.toLowerCase());
    const nextName = defaultNames.find(n => !currentNames.includes(n.toLowerCase())) || `Speaker ${dialogueSpeakers.length + 1}`;
    
    // Cycle voices
    const voices: VoiceName[] = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr"];
    const nextVoice = voices[dialogueSpeakers.length % voices.length];

    setDialogueSpeakers([...dialogueSpeakers, { name: nextName, voice: nextVoice }]);
  };

  const handleRemoveSpeaker = (index: number) => {
    if (dialogueSpeakers.length <= 1) return;
    const list = [...dialogueSpeakers];
    list.splice(index, 1);
    setDialogueSpeakers(list);
  };

  const handleUpdateSpeaker = (index: number, key: keyof SpeakerConfig, value: string) => {
    const list = [...dialogueSpeakers];
    list[index] = { ...list[index], [key]: value };
    setDialogueSpeakers(list);
  };

  // Pre-process & enhance/translate scripts via Server API
  const handleEnhanceScript = async (action: string) => {
    setIsEnhancing(true);
    setStatusMessage("Refining your text with Gemini...");
    try {
      const activeText = activeTab === "narration" ? narrationText : dialogueText;
      const toneChoice = TONE_OPTIONS.find(t => t.id === selectedTone)?.label || selectedTone;
      
      const response = await fetch("/api/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeText,
          action: action,
          vibe: toneChoice,
          additionalPrompt: customVibePrompt,
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to refine text";
        try {
          const rawText = await response.text();
          try {
            const errData = JSON.parse(rawText);
            errMsg = errData.error || errMsg;
          } catch {
            errMsg = `Server error (${response.status}): ${rawText.substring(0, 120)}`;
          }
        } catch (readErr: any) {
          errMsg = `Server error (${response.status}): Failed to read response stream (${readErr?.message || readErr})`;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (activeTab === "narration") {
        setNarrationText(data.text);
      } else {
        setDialogueText(data.text);
        
        // Dynamically parse speaker tags from dialogue output if available
        const lines = data.text.split("\n");
        const foundSpeakers: string[] = [];
        lines.forEach((line: string) => {
          const match = line.match(/^([^:]+):/);
          if (match) {
            const spNode = match[1].trim();
            if (!foundSpeakers.includes(spNode) && spNode.length < 20) {
              foundSpeakers.push(spNode);
            }
          }
        });

        if (foundSpeakers.length > 0) {
          const voices: VoiceName[] = ["Puck", "Kore", "Charon", "Fenrir", "Zephyr"];
          const newConfigs: SpeakerConfig[] = foundSpeakers.map((name, idx) => ({
            name: name,
            voice: voices[idx % voices.length]
          }));
          setDialogueSpeakers(newConfigs);
        }
      }
      setStatusMessage("Script updated successfully!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Enhancement failed: ${err.message}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Main voice synthesizer trigger
  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    setStatusMessage("Synthesizing premium voice output...");
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const isMulti = activeTab === "dialogue";
      const textToSpeak = isMulti ? dialogueText : narrationText;
      const langChoice = isMulti ? dialogueLanguage : language;

      const payload = {
        text: textToSpeak,
        language: langChoice,
        voice: selectedVoice,
        tone: selectedTone + (customVibePrompt ? `. Custom: ${customVibePrompt}` : ""),
        isMultiSpeaker: isMulti,
        speakerConfigs: isMulti ? dialogueSpeakers : [],
      };

      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMsg = "Synthesis failure";
        try {
          const rawText = await response.text();
          try {
            const errData = JSON.parse(rawText);
            errMsg = errData.error || errMsg;
          } catch {
            errMsg = `Server error (${response.status}): ${rawText.substring(0, 120)}`;
          }
        } catch (readErr: any) {
          errMsg = `Server error (${response.status}): Failed to read response stream (${readErr?.message || readErr})`;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error || "Synthesis failure");

      // Decode PCM bytes directly to WAV on the client side
      const wavBlob = base64ToWavBlob(data.audio, data.sampleRate);
      const audioUrl = URL.createObjectURL(wavBlob);

      const newRecord: AudioGenerationResult = {
        url: audioUrl,
        base64: data.audio,
        text: textToSpeak.length > 80 ? textToSpeak.substring(0, 80) + "..." : textToSpeak,
        language: langChoice,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };

      setCurrentResult(newRecord);
      setHistory((prev) => [newRecord, ...prev]);

      setStatusMessage("AI Vocals prepared successfully!");
      setTimeout(() => setStatusMessage(""), 4000);

      // Play immediately
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          audioRef.current.playbackRate = playbackRate;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
      }, 100);

    } catch (err: any) {
      console.error("Vocal synthesis failed", err);
      setStatusMessage(`Synthesis failed: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Playback Control Handling
  useEffect(() => {
    const audioObj = audioRef.current;
    if (!audioObj) return;

    const onTimeUpdate = () => setCurrentTime(audioObj.currentTime);
    const onLoadedMetadata = () => setDuration(audioObj.duration);
    const onEnded = () => setIsPlaying(false);

    audioObj.addEventListener("timeupdate", onTimeUpdate);
    audioObj.addEventListener("loadedmetadata", onLoadedMetadata);
    audioObj.addEventListener("ended", onEnded);

    return () => {
      audioObj.removeEventListener("timeupdate", onTimeUpdate);
      audioObj.removeEventListener("loadedmetadata", onLoadedMetadata);
      audioObj.removeEventListener("ended", onEnded);
    };
  }, [currentResult]);

  // Adjust volume / speed / mute on states change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    if (audioRef.current && duration > 0) {
      const targetTime = (percent / 100) * duration;
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleDownload = (record: AudioGenerationResult) => {
    try {
      const blob = base64ToWavBlob(record.base64);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voiceover-${record.language}-${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("WAV download trigger error:", error);
    }
  };

  const handleLoadHistory = (record: AudioGenerationResult) => {
    setCurrentResult(record);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-slate-200 flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0f0f0f] px-6 py-4 sticky top-0 z-40" id="header_section">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg" id="brand_logo">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Narration<span className="text-indigo-400">Pro</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-speaker narration & conversations with custom vocal delivery controls
              </p>
            </div>
          </div>

          {/* Quick Stats or Details in margin - simple and formal */}
          <div className="flex items-center gap-3 text-xs bg-[#1a1a1a] border border-white/5 rounded-full px-4 py-1.5 self-start md:self-auto text-slate-300">
            <Languages className="w-4 h-4 text-indigo-400" />
            <span>English + Nepali (नेपाली)</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6" id="workspace_hub">
        
        {/* Left Column: Generator Inputs Workspace */}
        <section className="lg:col-span-7 flex flex-col gap-6" id="input_controls_panel">
          
          {/* Mode Switcher Tabs */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-1.5 flex gap-1">
            <button
              onClick={() => setActiveTab("narration")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "narration"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab_trigger_narration"
            >
              <FileAudio className="w-4 h-4" />
              Narration Mode (Single Voice)
            </button>
            <button
              onClick={() => setActiveTab("dialogue")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                activeTab === "dialogue"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              id="tab_trigger_dialogue"
            >
              <Users className="w-4 h-4" />
              Dialogue Mode (Multi-Speaker)
            </button>
          </div>

          {/* Workspace Configurations Cards */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {activeTab === "narration" ? (
                <motion.div
                  key="single_narration"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5"
                >
                  {/* Language and Voice setup */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                        1. Target Language
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSingleLangChange("en")}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all font-semibold ${
                            language === "en"
                              ? "bg-indigo-650 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                              : "border-white/5 bg-[#1a1a1a]/50 text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="text-base leading-none">🇺🇸</span>
                          English (US)
                        </button>
                        <button
                          onClick={() => handleSingleLangChange("ne")}
                          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all font-semibold ${
                            language === "ne"
                              ? "bg-indigo-650 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                              : "border-white/5 bg-[#1a1a1a]/50 text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="text-base leading-none">🇳🇵</span>
                          नेपाली (Nepali)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                        2. Narrative Vibe / Tone
                      </label>
                      <select
                        value={selectedTone}
                        onChange={(e) => setSelectedTone(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
                      >
                        {TONE_OPTIONS.map((item) => (
                          <option key={item.id} value={item.id} className="bg-[#111] text-white">
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Character Speaker selector cards */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2.5">
                      3. Select Speaker Voice
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2" id="speaker_voice_grid">
                      {SPEAKERS.map((v) => {
                        const isChosen = selectedVoice === v.name;
                        return (
                          <button
                            key={v.name}
                            onClick={() => setSelectedVoice(v.name)}
                            className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                              isChosen
                                ? "bg-white/5 border-indigo-500/55 ring-1 ring-indigo-500/30 text-white shadow-md"
                                : "border-white/5 bg-white/[0.02] hover:bg-white/5 text-slate-400 hover:text-slate-205"
                            }`}
                          >
                            <div className="flex items-center justify-between pointer-events-none mb-1 w-full">
                              <span className="text-xs font-bold text-white">{v.name}</span>
                              {isChosen && (
                                <span className="bg-indigo-500 rounded-full p-0.5" id={`checked_${v.name}`}>
                                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-indigo-400 leading-snug">{v.gender}</span>
                            <span className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-snug">{v.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Chosen Speaker bio */}
                    <div className="mt-2 text-[11px] text-slate-400 flex items-start gap-1.5 px-1">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-300">{selectedVoice}</strong>: {SPEAKERS.find(s => s.name === selectedVoice)?.characteristics}
                      </span>
                    </div>
                  </div>

                  {/* Preset quick templates select block */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                      4. Quick Presets Templates ({language === "en" ? "English" : "Nepali"})
                    </label>
                    <div className="flex flex-wrap gap-1.5" id="preset_tags_wrap">
                      {TEMPLATES.filter((tpl) => tpl.language === language).map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleApplyTemplate(tpl)}
                          className="text-xs font-medium border border-white/5 bg-white/[0.02] hover:bg-white/5 text-slate-300 rounded-lg py-1 px-2.5 transition-colors"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Editor for narration text */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                        5. Script Copywriting & Narration Text
                      </label>
                      <span className="text-xs text-slate-500 font-mono">
                        {narrationText.length} chars | {narrationText.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>
                    <textarea
                      value={narrationText}
                      onChange={(e) => setNarrationText(e.target.value)}
                      placeholder={
                        language === "en"
                          ? "Write or paste standard English story, news reporting, or social media script here..."
                          : "आफ्नो नेपाली स्क्रिप्ट यहाँ लेख्नुहोस्..."
                      }
                      rows={6}
                      className="w-full bg-[#111] border border-white/5 rounded-2xl p-4 text-base leading-relaxed text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600 resize-y shadow-inner"
                      id="narration_text_editor"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="multi_dialogue"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-5"
                >
                  {/* Language */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                      1. Conversational Language
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-w-sm">
                      <button
                        onClick={() => handleDialogueLangChange("en")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all font-semibold ${
                          dialogueLanguage === "en"
                            ? "bg-indigo-650 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                            : "border-white/5 bg-[#1a1a1a]/55 text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        🇺🇸 English conversation
                      </button>
                      <button
                        onClick={() => handleDialogueLangChange("ne")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all font-semibold ${
                          dialogueLanguage === "ne"
                            ? "bg-indigo-650 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                            : "border-white/5 bg-[#1a1a1a]/55 text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        🇳🇵 नेपाली संवाद
                      </button>
                    </div>
                  </div>

                  {/* Character Speaker management mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                        2. Manage Conversation Speakers
                      </label>
                      <button
                        onClick={handleAddSpeaker}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition-colors"
                        id="btn_add_speaker"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Character Speaker
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0a0a0a] p-3 rounded-xl border border-white/5">
                      {dialogueSpeakers.map((sp, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-[#151515] border border-white/5 p-2 rounded-xl">
                          <input
                            type="text"
                            value={sp.name}
                            onChange={(e) => handleUpdateSpeaker(idx, "name", e.target.value)}
                            placeholder="Person Name"
                            className="w-1/3 bg-[#0a0a0a] text-xs text-white p-1.5 border border-white/5 rounded-lg focus:outline-none focus:border-indigo-500/40"
                          />
                          <select
                            value={sp.voice}
                            onChange={(e) => handleUpdateSpeaker(idx, "voice", e.target.value as VoiceName)}
                            className="w-1/2 bg-[#0a0a0a] text-xs text-slate-300 p-1.5 border border-white/5 rounded-lg focus:outline-none focus:border-indigo-500/40"
                          >
                            {SPEAKERS.map(item => (
                              <option key={item.name} value={item.name} className="bg-[#111] text-white">
                                {item.name} ({item.gender.split(" ")[0]})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemoveSpeaker(idx)}
                            disabled={dialogueSpeakers.length <= 1}
                            className="p-1.5 text-slate-550 hover:text-red-400 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conversational Dialog templates */}
                  <div>
                    <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                      3. Conversation Presets Templates
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {DIALOGUE_TEMPLATES.filter((tpl) => tpl.language === dialogueLanguage).map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => handleApplyDialogueTemplate(tpl)}
                          className="text-xs font-medium border border-white/5 bg-white/[0.02] hover:bg-white/5 text-slate-300 rounded-lg py-1 px-2.5 transition-colors"
                        >
                          {tpl.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Script editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                          4. Dialogue Script
                        </label>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Use format <strong className="text-indigo-400">"Speaker: Text"</strong> exactly aligned with speaker names above.
                        </p>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {dialogueText.length} chars
                      </span>
                    </div>
                    <textarea
                      value={dialogueText}
                      onChange={(e) => setDialogueText(e.target.value)}
                      placeholder="Write conversational scripts e.g.&#10;Host: lines...&#10;Guest: lines..."
                      rows={6}
                      className="w-full bg-[#111] border border-white/5 rounded-2xl p-4 text-base leading-relaxed text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600 resize-y font-mono shadow-inner"
                      id="dialogue_text_editor"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Vibe prompt guidelines */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-2">
                Custom Vocal Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={customVibePrompt}
                onChange={(e) => setCustomVibePrompt(e.target.value)}
                placeholder="e.g. 'Speak with an excited radio RJ accent', 'Add deep breath loops and soft dramatic breaks', 'Slow'"
                className="w-full bg-[#111] border border-white/5 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {/* Script Text Processing / AI Assistance bar */}
            <div className="bg-[#151515] border border-white/5 rounded-xl p-3 md:p-4 flex flex-col gap-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Gemini Text Pre-Processor & Accent Translator
                </span>
                <span className="text-[10px] text-slate-500">Convert text for ultimate voice reads</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEnhanceScript("enhance")}
                  disabled={isEnhancing || isSynthesizing}
                  className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs text-indigo-300 disabled:opacity-40 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  Polish Flow
                </button>
                <button
                  type="button"
                  onClick={() => handleEnhanceScript(language === "ne" ? "translate-ne-en" : "translate-en-ne")}
                  disabled={isEnhancing || isSynthesizing}
                  className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/5 hover:bg-white/5 text-xs text-slate-300 disabled:opacity-40 transition-colors"
                >
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  Translate ({activeTab === "narration" ? (language === "en" ? "EN ➔ NE" : "NE ➔ EN") : (dialogueLanguage === "en" ? "EN ➔ NE" : "NE ➔ EN")})
                </button>
                <button
                  type="button"
                  onClick={() => handleEnhanceScript("social_media")}
                  disabled={isEnhancing || isSynthesizing}
                  className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/5 hover:bg-white/5 text-xs text-slate-300 disabled:opacity-40 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  Social Media Reel
                </button>
                <button
                  type="button"
                  onClick={() => handleEnhanceScript("news")}
                  disabled={isEnhancing || isSynthesizing}
                  className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/5 hover:bg-white/5 text-xs text-slate-300 disabled:opacity-40 transition-colors"
                >
                  <FileAudio className="w-3.5 h-3.5 text-slate-400" />
                  News Broadcast
                </button>
                {activeTab === "narration" && (
                  <button
                    type="button"
                    onClick={() => handleEnhanceScript("dialogue_split")}
                    disabled={isEnhancing || isSynthesizing}
                    className="flex-1 min-w-[124px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-xs text-purple-300 disabled:opacity-40 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Split to Dialogue
                  </button>
                )}
              </div>
            </div>

            {/* Synthesizer action button */}
            <div className="pt-2">
              <button
                disabled={isSynthesizing || isEnhancing || (activeTab === "narration" ? !narrationText : !dialogueText)}
                onClick={handleSynthesize}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 relative overflow-hidden flex items-center justify-center gap-2.5 disabled:opacity-40"
                id="btn_synthesize_trigger"
              >
                {isSynthesizing ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                    <span>Preparing Custom Vocal Synthesis...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4.5 h-4.5 text-white" />
                    <span className="font-semibold">Generate Professional AI Audio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Audio Output Deck & Logging Details */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="audio_deck_panel">
          
          {/* Active Audio Player Deck */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-5 md:p-6 flex flex-col gap-5 shadow-xl shadow-black relative overflow-hidden">
            
            {/* Visual gradient accent */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-indigo-400" />
                Vocal Synthesis Hub
              </h3>
              {currentResult && (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full">
                  Prepared
                </span>
              )}
            </div>

            {currentResult ? (
              <div className="flex flex-col gap-5">
                {/* Visual equalizer wave simulation */}
                <div className="h-24 bg-[#0a0a0a] border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                  <audio
                    ref={audioRef}
                    src={currentResult.url}
                    className="hidden"
                    key={currentResult.url}
                  />

                  {/* Equalizer animation Bars */}
                  <div className="flex items-end gap-1.5 h-12 w-full max-w-[280px] justify-between z-10 px-4">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const delays = [0.1, 0.4, 0.2, 0.7, 0.5, 0.3, 0.1, 0.9, 0.6, 0.2, 0.8, 0.4, 0.3, 0.7, 0.1, 0.5];
                      return (
                        <span
                          key={i}
                          style={{
                            animationDelay: `${delays[i]}s`,
                            animationDuration: isPlaying ? "0.9s" : "0s",
                          }}
                          className={`w-1.5 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-full transition-all ${
                            isPlaying ? "animate-bounce h-full" : "h-1 bg-slate-700"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 font-mono z-10 select-none">
                    Sample Rate: 24000Hz (PCM Mono)
                  </div>
                  <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 font-mono z-10 select-none flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    <span>Generated {currentResult.timestamp}</span>
                  </div>
                </div>

                {/* Scrubber tracker slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    ref={sliderRef}
                    value={duration > 0 ? (currentTime / duration) * 100 : 0}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    style={{
                      background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                        duration > 0 ? (currentTime / duration) * 100 : 0
                      }%, #1a1a1a ${
                        duration > 0 ? (currentTime / duration) * 100 : 0
                      }%, #1a1a1a 100%)`
                    }}
                  />
                </div>

                {/* Control buttons dashboard */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlayback}
                      className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full h-12 w-12 flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                      id="btn_play_pause"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 stroke-[2.5]" /> : <Play className="w-5 h-5 fill-white stroke-[2.5] pr-0.5" />}
                    </button>
                    
                    {/* Restart Audio */}
                    <button
                      onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; setCurrentTime(0); } }}
                      className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-350 rounded-full hover:text-white transition-colors"
                      title="Restart playback"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed PlaybackRate toggle */}
                  <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-white/5 py-1.5 px-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">SPEED:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="bg-transparent text-xs text-slate-300 pointer-events-auto border-none outline-none font-mono font-semibold"
                    >
                      <option value="0.5">0.5x</option>
                      <option value="0.75">0.75x</option>
                      <option value="1.0">1.0x (Normal)</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                      <option value="1.75">1.75x</option>
                      <option value="2.0">2.0x</option>
                    </select>
                  </div>

                  {/* Volume Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        setIsMuted(false);
                      }}
                      className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Subtitle / Script lines box preview */}
                <div className="bg-[#0a0a0a] p-3 rounded-xl border border-white/5 max-h-36 overflow-y-auto">
                  <span className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase block mb-1">
                    Spoken Script Recap
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {currentResult.text}
                  </p>
                </div>

                {/* Premium direct download block */}
                <div className="border-t border-white/5 pt-4">
                  <div className="p-4 rounded-xl border border-white/10 bg-[#151515] flex items-center justify-between w-full">
                    <div className="flex-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight mb-1">Ready to Download</div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-white truncate max-w-[180px]">vibe_narration_{currentResult.language}.wav</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(currentResult)}
                      className="w-10 h-10 rounded-lg bg-[#222] border border-white/5 flex items-center justify-center hover:bg-[#2a2a2a] transition-all text-indigo-400 hover:text-indigo-300"
                      id="btn_download_active"
                      title="Download audio clip"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-black/20">
                <FileAudio className="w-12 h-12 text-slate-700 stroke-[1.25] mb-3 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ready for Audio Synthesis
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 max-w-[240px] leading-relaxed font-sans">
                  Compose or customize scripts, choose narrator setting, and hit "Generate Professional AI Audio" to synthesize.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Status / Loading Toast banner notifications */}
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
                statusMessage.includes("failed") || statusMessage.includes("Failure")
                  ? "bg-red-500/10 border-red-500/25 text-red-300"
                  : statusMessage.includes("synthesiz") || statusMessage.includes("Refining")
                  ? "bg-[#151515] border-indigo-500/25 text-indigo-300"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              }`}
              id="status_notification_toast"
            >
              {isSynthesizing || isEnhancing ? (
                <RefreshCw className="w-4.5 h-4.5 animate-spin text-current shrink-0" />
              ) : (
                <Check className="w-4.5 h-4.5 text-current shrink-0" />
              )}
              <span className="font-semibold">{statusMessage}</span>
            </motion.div>
          )}

          {/* Historical Clips Log */}
          <div className="bg-[#0f0f0f] border border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Clip Generation History ({history.length})
            </h3>
            
            {history.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1" id="history_clips_list">
                {history.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 bg-[#0a0a0a] border border-white/5 hover:bg-white/[0.04] rounded-lg transition-colors group"
                  >
                    <div className="flex-1 min-w-0 pr-3 cursor-pointer" onClick={() => handleLoadHistory(record)}>
                      <p className="text-xs text-slate-200 font-mono truncate">
                        {record.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-mono">
                          {record.timestamp}
                        </span>
                        <span className="text-[9px] bg-[#151515] text-slate-400 py-0.5 px-1.5 border border-white/5 rounded uppercase">
                          {record.language === "en" ? "US English" : "Nepali"}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadHistory(record)}
                        className="p-1 px-2 border border-white/5 hover:bg-white/10 rounded bg-[#151515] text-[10px] font-semibold text-xs text-indigo-400 transition-colors"
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleDownload(record)}
                        title="Download clip"
                        className="p-1.5 hover:bg-white/10 bg-[#151515] border border-white/5 rounded text-slate-400 hover:text-white transition-colors"
                        id={`btn_download_history_${index}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                No recent clips produced in this session.
              </p>
            )}
          </div>

          {/* Quick FAQ / Guide */}
          <div className="bg-[#0f0f0f] border border-white/5 p-4 rounded-xl flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              Acoustic & Translation Guidelines
            </h4>
            <ul className="text-[11px] text-slate-400 flex flex-col gap-1.5 list-disc pl-4 leading-normal">
              <li>
                <strong className="text-slate-300">Long Inputs</strong>: Gemini TTS easily handles sentences and scripts of considerable size. For heavy books/text, split into paragraphs.
              </li>
              <li>
                <strong className="text-slate-300">Accent Precision</strong>: If your text contains both languages, use Devanagari script for flawless, organic Nepali phonetic delivery.
              </li>
              <li>
                <strong className="text-slate-300">WAV Codec Support</strong>: Every generated audio converts to standard 24kHz WAV PCM, making it directly editable in premium software like Audacity or Premiere.
              </li>
            </ul>
          </div>
        </section>
      </main>

      {/* Bottom Status Bar */}
      <footer className="h-12 bg-[#0a0a0a] border-t border-white/5 px-6 flex items-center justify-between text-[10px] text-slate-500 font-mono mt-auto shrink-0">
        <div className="flex space-x-4">
          <span>ENGINE: Gemini-V3-Neural</span>
          <span>SAMPLE RATE: 24kHz PCM</span>
        </div>
        <div className="flex space-x-4 uppercase font-bold tracking-wider">
          <span className="hidden sm:inline">FORMAT: Lossless WAV</span>
          <span className="text-indigo-400/70">SYSTEM ONLINE</span>
        </div>
      </footer>
    </div>
  );
}
