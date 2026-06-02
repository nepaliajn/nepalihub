console.log("Querying running server with Nepali and Dialogue payloads...");

async function testNepali() {
  try {
    const payload = {
      text: "नमस्ते, तपाईँलाई कस्तो छ?",
      language: "ne",
      voice: "Kore",
      tone: "professional",
      isMultiSpeaker: false,
      speakerConfigs: []
    };

    const response = await fetch("http://localhost:3000/api/generate-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Nepali Single Speaker - HTTP Status:", response.status);
    const bodyText = await response.text();
    console.log("Nepali Single Speaker - Response starts with:", bodyText.substring(0, 100));
  } catch (err: any) {
    console.error("Nepali Single Speaker failed:", err);
  }
}

async function testDialogue() {
  try {
    const payload = {
      text: "Joe: How are you?\nJane: I am doing great!",
      language: "en",
      voice: "Kore",
      tone: "professional",
      isMultiSpeaker: true,
      speakerConfigs: [
        { name: "Joe", voice: "Kore" },
        { name: "Jane", voice: "Puck" }
      ]
    };

    const response = await fetch("http://localhost:3000/api/generate-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Dialogue Multi Speaker - HTTP Status:", response.status);
    const bodyText = await response.text();
    console.log("Dialogue Multi Speaker - Response starts with:", bodyText.substring(0, 100));
  } catch (err: any) {
    console.error("Dialogue Multi Speaker failed:", err);
  }
}

async function runAll() {
  await testNepali();
  await testDialogue();
}

runAll();
