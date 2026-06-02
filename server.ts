import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Enable JSON bodies (limit raised for potential larger translation payloads or scripts)
app.use(express.json({ limit: "20mb" }));

// Lazy initializer for the Gemini AI SDK
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

/**
 * API: Enhance or translate scripts/text using gemini-3.5-flash
 */
app.post("/api/enhance-text", async (req, res) => {
  try {
    const { text, action, vibe, additionalPrompt } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Input text is required" });
      return;
    }

    const ai = getAI();
    let prompt = "";

    switch (action) {
      case "translate-en-ne":
        prompt = `Translate the following English text into natural, spoken, and beautiful Nepali (written in Devanagari script). 
Ensure the translation sounds appropriate and fluid when read aloud by a Text-to-Speech system. Do not use awkward literal translations.
Text: "${text}"`;
        break;
      case "translate-ne-en":
        prompt = `Translate the following Nepali text into natural, conversational, and highly fluent English. 
Ensure the translation flows perfectly when spoken aloud.
Text: "${text}"`;
        break;
      case "social_media":
        prompt = `Rewrite this text into an extremely engaging, lively, and captivating script for a social media post (Tik Tok, Instagram Reel, or YouTube Short). 
Add a strong hook at the start, use direct address phrases like "Hey there!", make the tone energetic, and use short, punchy sentences that are fun to speak. Keep the script clean, without unneeded bracketed instructions.
${vibe ? `Vibe requested: ${vibe}` : ""}
Text: "${text}"`;
        break;
      case "news":
        prompt = `Rewrite this text into a formal, highly authentic, and authoritative news broadcast or news flash bulletin script. 
Begin with a professional news hook (e.g., "Good evening, this is a special bulletin" or "This is the hourly news update"), speak with direct and clear sentences, and conclude with a formal wrap-up.
${vibe ? `Vibe requested: ${vibe}` : ""}
Text: "${text}"`;
        break;
      case "story":
        prompt = `Rewrite this text into a vivid, dramatic, and expressive story narration or documentary script. 
Use rich, cinematic adjective-noun pairings, insert subtle structural pauses denoted by punctuation like ellipsis (...) or dashes, and craft a deep, emotional narrative rhythm.
${vibe ? `Vibe requested: ${vibe}` : ""}
Text: "${text}"`;
        break;
      case "dialogue_split":
        prompt = `Convert the following narrative text or topic into a highly engaging, conversational dialogue or interview between two speakers. 
The dialogue structure MUST be exactly formatted with speaker names, like this:
Speaker A: [lines]
Speaker B: [lines]

Make sure it sounds natural, with questions, answers, and friendly back-and-forth cues. Keep the conversion accurate to the core data in the input.
Text: "${text}"`;
        break;
      case "enhance":
      default:
        prompt = `Polish and refine this text so it sounds absolutely spectacular and natural when read aloud by an AI synthesized voice.
Improve grammatical flow, add intuitive commas, semicolons, and periods to guide natural breathing pauses, spell out abbreviations that sound awkward when spoken, and strip out raw URLs or excessive hashtags.
${vibe ? `Vibe/Tone requested: ${vibe}` : ""}
Text: "${text}"`;
        break;
    }

    if (additionalPrompt) {
      prompt += `\nAdditional Custom Instruction: ${additionalPrompt}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const resultText = response.text || "";
    res.json({ text: resultText });
  } catch (error: any) {
    console.error("Text enhancement error:", error);
    res.status(500).json({ error: error.message || "Failed to process text" });
  }
});

/**
 * API: Generate Audio narration using gemini-3.1-flash-tts-preview
 */
app.post("/api/generate-voice", async (req, res) => {
  try {
    const { text, language, voice, tone, isMultiSpeaker, speakerConfigs } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text to speak is required" });
      return;
    }

    const ai = getAI();

    // Map style/tone requests to speech instructions
    let languageInstruction = "";
    if (language === "ne") {
      languageInstruction = "You are a professional native Nepali speaker. Read the following Nepali text with correct local accents, cultural emphasis, natural intonation, and a warm tone.";
    } else {
      languageInstruction = "You are a clear and articulate native English speaker. Speak with proper pauses, precise pronunciation, and an elegant flow.";
    }

    let toneInstruction = "";
    if (tone) {
      toneInstruction = `Deliver the speech with a distinct ${tone} emotion and style. Include appropriate micro-pauses for maximum emotional impact.`;
    }

    const finalPrompt = `${languageInstruction} ${toneInstruction}\n\n${text}`;

    let response;

    if (isMultiSpeaker && Array.isArray(speakerConfigs) && speakerConfigs.length > 0) {
      // Build the multi-speaker configurations
      const speakerVoiceConfigs = speakerConfigs.map((cfg: any) => ({
        speaker: cfg.name,
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: cfg.voice || "Kore" },
        },
      }));

      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: finalPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerVoiceConfigs,
            },
          },
        },
      });
    } else {
      // Single speaker configuration
      response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: finalPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || "Kore" },
            },
          },
        },
      });
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(500).json({ error: "The voice synthesizer didn't yield any audio stream. Try rewriting the script or reducing its length." });
      return;
    }

    // Success! Return the base64 audio to the client.
    res.json({
      audio: base64Audio,
      sampleRate: 24000, // Gemini TTS uses 24000Hz PCM
      success: true,
    });
  } catch (error: any) {
    console.error("Voice generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate voice" });
  }
});

// Setup Vite Dev middleware or production static hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support React SPA routing by serving index.html on missing routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Server] Active on port ${PORT}`);
  });
}

startServer();
