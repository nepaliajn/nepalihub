import { TemplateItem, SpeakerConfig } from "./types";

export const TEMPLATES: TemplateItem[] = [
  {
    id: "social-1-en",
    title: "Viral Tech Reel / Hook (English)",
    language: "en",
    category: "Social Media",
    suggestedVoice: "Puck",
    suggestedTone: "enthusiastic",
    text: "Wait! Don't scroll past! Did you know that you can now generate complete voiceovers and multi-speaker dialogues in seconds? Check this out, it's perfect for your next video!"
  },
  {
    id: "social-2-ne",
    title: "Enthusiastic Vlog Hook (Nepali)",
    language: "ne",
    category: "Social Media",
    suggestedVoice: "Zephyr",
    suggestedTone: "excited",
    text: "नमस्ते साथीहरू! के तपाईंहरू आफ्नो युट्युब वा टिकटक भिडियोका लागि राम्रो आवाज खोज्दै हुनुहुन्छ? चिन्ता नगर्नुहोस्, अब तपाईं आफैले चाहे जस्तो मिठो नेपाली आवाज सजिलै निकाल्न सक्नुहुन्छ!"
  },
  {
    id: "news-1-en",
    title: "Standard News Bulletin (English)",
    language: "en",
    category: "News Broadcast",
    suggestedVoice: "Charon",
    suggestedTone: "formal and precise",
    text: "Good evening, from the central newsdesk. International observers report a surge in sustainable travel across Southeast Asia, with eco-tourism numbers hitting a record high this quarter. We'll bring you the full story shortly."
  },
  {
    id: "news-2-ne",
    title: "Formal News Broadcast (Nepali)",
    language: "ne",
    category: "News Broadcast",
    suggestedVoice: "Kore",
    suggestedTone: "professional news anchor",
    text: "नमस्कार, यो सगरमाथा समाचार डेस्क हो। आजको मुख्य समाचार: पर्यटन क्षेत्रमा व्यापक सुधार भएसँगै यस वर्ष नेपाल आउने बाह्य पर्यटकको संख्यामा उल्लेख्य वृद्धि भएको छ। व्यवसायीहरू उत्साहित देखिएका छन्।"
  },
  {
    id: "story-1-en",
    title: "Cinematic Documentary Intro (English)",
    language: "en",
    category: "Story / Narration",
    suggestedVoice: "Charon",
    suggestedTone: "epic and dramatic",
    text: "Deep in the heart of the ancient mountains, a hidden valley guards a secret untouched by centuries of human footprint. Time, here, behaves differently, moving at the slow rhythm of ancient stone."
  },
  {
    id: "story-2-ne",
    title: "Poetic Storytelling (Nepali)",
    language: "ne",
    category: "Story / Narration",
    suggestedVoice: "Fenrir",
    suggestedTone: "warm and nostalgic",
    text: "त्यो साँझ निकै शान्त थियो। पहाडको कुनाबाट बग्ने चिसो चौतारीमा बसेर उसले पुराना दिनहरू सम्झँदै थियो। गाउँको यो सुमधुर परिवेश सधैंभरि यस्तै प्रिय लागिरहन्छ।"
  },
  {
    id: "ad-1-en",
    title: "Product Promo Hook (English)",
    language: "en",
    category: "Ad / Promotion",
    suggestedVoice: "Kore",
    suggestedTone: "confident and clear",
    text: "Tired of complicated software? Meet the simplest way to design, create, and launch your business ideas. Start free today and experience the difference yourself."
  },
  {
    id: "ad-2-ne",
    title: "Energetice Brand Promo (Nepali)",
    language: "ne",
    category: "Ad / Promotion",
    suggestedVoice: "Puck",
    suggestedTone: "youthful and bright",
    text: "तपाईंको व्यवसायलाई नयाँ उचाई दिन चाहनुहुन्छ? हाम्रो नयाँ प्रविधि प्रयोग गरेर सजिलै धेरै ग्राहकसम्म पुग्नुहोस्। आज नै सम्पर्क गर्नुहोस् र आफ्नो ब्रान्डलाई अफरको साथ सुरु गर्नुहोस्!"
  }
];

export const DIALOGUE_TEMPLATES = [
  {
    id: "podcast-en",
    title: "Short Podcast Interview (English)",
    language: "en",
    suggestedSpeakers: [
      { name: "Host", voice: "Zephyr" },
      { name: "Guest", voice: "Puck" }
    ],
    text: `Host: Welcome to the Creators Sandbox! Today we have an extraordinary guest discussing AI speed tools. How’s the journey, Jane?
Guest: Hey! Thanks for having me. It’s been absolutely mind-blowing seeing how quickly things are evolving lately!`
  },
  {
    id: "podcast-ne",
    title: "Podcast Catchup (Nepali)",
    language: "ne",
    suggestedSpeakers: [
      { name: "रोहन", voice: "Fenrir" },
      { name: "पूजा", voice: "Kore" }
    ],
    text: `रोहन: स्वागत छ पूजा! आज हामी नेपाली आवाज सिर्जना गर्ने प्रविधिको बारेमा कुरा गर्दैछौं। तपाईंलाई कस्तो लाग्छ यसको भविष्य?
पूजा: नमस्ते रोहन, मलाई त धेरै नै उज्ज्वल लाग्छ! यो प्रविधिले गर्दा अब आम नेपाली सिर्जनाकर्ताले सजिलै राम्रो सामग्री बनाउन सक्छन्।`
  },
  {
    id: "interview-ne",
    title: "News Reporter & Expert (Nepali)",
    language: "ne",
    suggestedSpeakers: [
      { name: "पत्रकार", voice: "Charon" },
      { name: "विशेषज्ञ", voice: "Kore" }
    ],
    text: `पत्रकार: सर, नेपालमा जलवायु परिवर्तनको असर न्यूनीकरण गर्न हामीले कस्ता कदम चाल्नुपर्छ?
विशेषज्ञ: मुख्यतया हामीले वन क्षेत्रको संरक्षण र नवीकरणीय ऊर्जाको प्रयोगलाई व्यापक रूपमा बढावा दिनुपर्दछ।`
  }
];
