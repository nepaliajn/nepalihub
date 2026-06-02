/**
 * Decodes raw PCM little-endian 16-bit Mono bytes from base64 and encodes them into a valid WAV file blob.
 */
export function base64ToWavBlob(base64Data: string, sampleRate: number = 24000): Blob {
  const rawBinary = window.atob(base64Data);
  const sampleCount = Math.floor(rawBinary.length / 2);
  const samples = new Int16Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const b1 = rawBinary.charCodeAt(i * 2);
    const b2 = rawBinary.charCodeAt(i * 2 + 1);
    // Reconstruct 16-bit signed integer channel values
    let val = b1 | (b2 << 8);
    if (val & 0x8000) {
      val |= ~0xffff; // sign extension
    }
    samples[i] = val;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let j = 0; j < str.length; j++) {
      v.setUint8(offset + j, str.charCodeAt(j));
    }
  };

  // 1. RIFF Identifier
  writeString(view, 0, "RIFF");
  // 2. Combined size of subchunk2 and preceding headers
  view.setUint32(4, 36 + samples.length * 2, true);
  // 3. Format identifier "WAVE"
  writeString(view, 8, "WAVE");
  // 4. Sub-chunk identifier "fmt "
  writeString(view, 12, "fmt ");
  // 5. Size of fmt sub-chunk (16 for PCM)
  view.setUint32(16, 16, true);
  // 6. Audio Format code (1 for non-compressed Linear PCM)
  view.setUint16(20, 1, true);
  // 7. Channels (1 = Mono, 2 = Stereo)
  view.setUint16(22, 1, true);
  // 8. Output Sample rate (24000Hz is normal for Gemini TTS)
  view.setUint32(24, sampleRate, true);
  // 9. Byte rate: sampleRate * channels * bitsPerSample / 8
  view.setUint32(28, sampleRate * 2, true);
  // 10. Block align: channels * bitsPerSample / 8
  view.setUint16(32, 2, true);
  // 11. Bits per sample: 16-bits
  view.setUint16(34, 16, true);
  // 12. Data chunk identifier "data"
  writeString(view, 36, "data");
  // 13. Sub-chunk 2 data size
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit Int samples
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Format raw seconds to clean time stamp text "MM:SS"
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
