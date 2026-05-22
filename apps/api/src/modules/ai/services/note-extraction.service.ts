import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { DATABASE_TOKEN, type Database } from "../../../config/database.provider";
import { customers, voiceTranscriptions } from "@loreal/database";
import { eq } from "drizzle-orm";
import {
  buildNoteExtractionPrompt,
  parseExtractedNote,
} from "@loreal/domain";
import type { ExtractedNote } from "@loreal/contracts";
import {
  LLM_PROVIDER,
  type LlmProvider,
} from "../providers/llm.provider.interface";
import {
  TRANSCRIPTION_PROVIDER,
  type TranscriptionProvider,
} from "../providers/transcription.provider.interface";
import { AiUsageLogsRepository } from "../repositories/ai-usage-logs.repository";
import { estimateCostUsd } from "../pricing";

const FEATURE_TRANSCRIBE = "voice_transcription";
const FEATURE_EXTRACT = "note_extraction";

export interface ExtractFromTextInput {
  rawText: string;
  customerId?: string;
  language?: string;
  actorUserId: string;
}

export interface ExtractFromAudioInput {
  audio: Buffer;
  mimeType: string;
  customerId?: string;
  language?: string;
  actorUserId: string;
}

export interface NoteExtractionOutput {
  transcript: string;
  extracted: ExtractedNote;
}

@Injectable()
export class NoteExtractionService {
  constructor(
    @Inject(DATABASE_TOKEN) private db: Database,
    @Inject(LLM_PROVIDER) private llm: LlmProvider,
    @Inject(TRANSCRIPTION_PROVIDER) private stt: TranscriptionProvider,
    private readonly usageLogs: AiUsageLogsRepository,
  ) {}

  async fromText(input: ExtractFromTextInput): Promise<NoteExtractionOutput> {
    const extracted = await this.runExtraction({
      rawText: input.rawText,
      customerId: input.customerId,
      language: input.language,
      actorUserId: input.actorUserId,
    });
    return { transcript: input.rawText, extracted };
  }

  async fromAudio(
    input: ExtractFromAudioInput,
  ): Promise<NoteExtractionOutput> {
    const transcription = await this.stt.transcribe({
      audio: input.audio,
      mimeType: input.mimeType,
      language: input.language,
      diarize: true,
    });

    await this.db.insert(voiceTranscriptions).values({
      customerId: input.customerId ?? null,
      authorUserId: input.actorUserId,
      transcript: transcription.transcript,
      language: transcription.language,
      provider: transcription.provider,
      model: transcription.model,
      durationSeconds: transcription.durationSeconds,
    });

    await this.usageLogs.record({
      userId: input.actorUserId,
      feature: FEATURE_TRANSCRIBE,
      provider: transcription.provider,
      model: transcription.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: transcription.latencyMs,
      costUsd: (transcription.durationSeconds / 60) * 0.0043, // Deepgram Nova-3 list price
    });

    const extracted = await this.runExtraction({
      rawText: transcription.transcript,
      customerId: input.customerId,
      language: transcription.language,
      actorUserId: input.actorUserId,
    });

    return { transcript: transcription.transcript, extracted };
  }

  private async runExtraction(args: {
    rawText: string;
    customerId?: string;
    language?: string;
    actorUserId: string;
  }): Promise<ExtractedNote> {
    if (!args.rawText.trim()) {
      throw new BadRequestException("rawText must not be empty");
    }

    let customerFirstName: string | undefined;
    if (args.customerId) {
      const [row] = await this.db
        .select({ firstName: customers.firstName })
        .from(customers)
        .where(eq(customers.id, args.customerId));
      customerFirstName = row?.firstName;
    }

    const prompt = buildNoteExtractionPrompt({
      rawText: args.rawText,
      customerFirstName,
      language: args.language,
    });

    const result = await this.llm.generate({
      system: prompt.system,
      user: prompt.user,
      feature: FEATURE_EXTRACT,
      maxOutputTokens: 800,
      temperature: 0.2,
    });

    await this.usageLogs.record({
      userId: args.actorUserId,
      feature: FEATURE_EXTRACT,
      provider: "anthropic",
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedTokens: result.cachedTokens,
      latencyMs: result.latencyMs,
      costUsd: estimateCostUsd(
        result.model,
        result.inputTokens,
        result.outputTokens,
        result.cachedTokens,
      ),
    });

    const parsed = parseExtractedNote(result.text);
    if (!parsed.ok || !parsed.data) {
      throw new BadRequestException(
        `LLM produced invalid extraction: ${parsed.error ?? "unknown"}`,
      );
    }
    return parsed.data;
  }
}
