/**
 * Provider-agnostic speech-to-text contract. Today: Deepgram. Tomorrow:
 * Whisper, AssemblyAI, etc. Implementations hide model/region/auth details.
 */

export interface TranscriptionOptions {
  audio: Buffer;
  mimeType: string;
  /** BCP-47 language code; defaults to provider default if omitted. */
  language?: string;
  /** Whether to identify multiple speakers (advisor vs customer). */
  diarize?: boolean;
}

export interface TranscriptionResult {
  transcript: string;
  language: string;
  model: string;
  provider: string;
  durationSeconds: number;
  latencyMs: number;
}

export interface TranscriptionProvider {
  transcribe(options: TranscriptionOptions): Promise<TranscriptionResult>;
}

export const TRANSCRIPTION_PROVIDER = "TRANSCRIPTION_PROVIDER";
