import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type DeepgramClient } from "@deepgram/sdk";
import type {
  TranscriptionOptions,
  TranscriptionProvider,
  TranscriptionResult,
} from "./transcription.provider.interface";

@Injectable()
export class DeepgramProvider implements TranscriptionProvider {
  private readonly logger = new Logger(DeepgramProvider.name);
  private clientInstance: DeepgramClient | null = null;
  private readonly defaultModel: string;
  private readonly defaultLanguage: string;

  constructor(private readonly config: ConfigService) {
    this.defaultModel = config.get<string>("DEEPGRAM_MODEL") ?? "nova-3";
    this.defaultLanguage = config.get<string>("DEEPGRAM_LANGUAGE") ?? "es";
  }

  private get client(): DeepgramClient {
    if (this.clientInstance) return this.clientInstance;
    const apiKey = this.config.get<string>("DEEPGRAM_API_KEY");
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured");
    }
    this.clientInstance = createClient(apiKey);
    return this.clientInstance;
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    const startedAt = Date.now();
    const model = this.defaultModel;
    const language = options.language ?? this.defaultLanguage;

    const { result, error } = await this.client.listen.prerecorded.transcribeFile(
      options.audio,
      {
        model,
        language,
        smart_format: true,
        punctuate: true,
        diarize: options.diarize ?? false,
        mimetype: options.mimeType,
      },
    );

    if (error || !result) {
      this.logger.error("Deepgram transcription failed", error);
      throw new Error(
        `Transcription failed: ${error?.message ?? "unknown error"}`,
      );
    }

    const channel = result.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    const transcript = alternative?.transcript ?? "";
    const duration = result.metadata?.duration ?? 0;

    return {
      transcript,
      language,
      model,
      provider: "deepgram",
      durationSeconds: Math.round(duration),
      latencyMs: Date.now() - startedAt,
    };
  }
}
