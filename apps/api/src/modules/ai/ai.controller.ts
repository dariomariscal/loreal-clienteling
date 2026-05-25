import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { Roles } from "../../auth/decorators/roles.decorator";
import { Session } from "../../auth/decorators/session.decorator";
import type { UserSession } from "../../common/types/session";
import { CustomerSummaryService } from "./services/customer-summary.service";
import { NoteExtractionService } from "./services/note-extraction.service";
import { MessageSuggestionService } from "./services/message-suggestion.service";
import { SemanticSearchService } from "./services/semantic-search.service";
import { DailySuggestedActionsService } from "./services/daily-suggested-actions.service";
import {
  ExtractNoteFromTextDto,
  SemanticSearchDto,
  SuggestedActionsQueryDto,
} from "../../dtos/ai.dto";

const BA_ROLES = ["ba", "manager", "supervisor", "admin"] as const;

@ApiTags("AI")
@ApiBearerAuth()
@Controller()
export class AiController {
  constructor(
    @Inject(CustomerSummaryService)
    private readonly summaryService: CustomerSummaryService,
    @Inject(NoteExtractionService)
    private readonly noteExtractionService: NoteExtractionService,
    @Inject(MessageSuggestionService)
    private readonly messageSuggestionService: MessageSuggestionService,
    @Inject(SemanticSearchService)
    private readonly semanticSearchService: SemanticSearchService,
    @Inject(DailySuggestedActionsService)
    private readonly dailySuggestedActionsService: DailySuggestedActionsService,
  ) {}

  // ── Customer AI summary ────────────────────────────────────────────────

  @Get("customers/:id/ai-summary")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  getCustomerSummary(
    @Param("id") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.summaryService.getOrGenerate(customerId, session.user.id);
  }

  @Post("customers/:id/ai-summary/regenerate")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  regenerateCustomerSummary(
    @Param("id") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.summaryService.generate(customerId, session.user.id);
  }

  // ── Note extraction (text + audio) ─────────────────────────────────────

  @Post("notes/extract")
  @Roles([...BA_ROLES])
  @ApiBody({ type: ExtractNoteFromTextDto })
  extractFromText(
    @Body() body: ExtractNoteFromTextDto,
    @Session() session: UserSession,
  ) {
    return this.noteExtractionService.fromText({
      rawText: body.rawText,
      customerId: body.customerId,
      language: body.language,
      actorUserId: session.user.id,
    });
  }

  @Post("notes/extract/audio")
  @Roles([...BA_ROLES])
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("audio"))
  extractFromAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body("customerId") customerId: string | undefined,
    @Body("language") language: string | undefined,
    @Session() session: UserSession,
  ) {
    if (!file) {
      throw new BadRequestException("audio file is required");
    }
    return this.noteExtractionService.fromAudio({
      audio: file.buffer,
      mimeType: file.mimetype,
      customerId,
      language,
      actorUserId: session.user.id,
    });
  }

  // ── Message suggestions ────────────────────────────────────────────────

  @Post("customers/:id/message-suggestions")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  messageSuggestions(
    @Param("id") customerId: string,
    @Session() session: UserSession,
  ) {
    return this.messageSuggestionService.generate(customerId, session.user.id);
  }

  // ── Semantic search ────────────────────────────────────────────────────

  @Get("customers/semantic-search")
  @Roles([...BA_ROLES])
  semanticSearch(
    @Query() query: SemanticSearchDto,
    @Session() session: UserSession,
  ) {
    return this.semanticSearchService.search(
      query.q,
      session.user,
      query.limit,
    );
  }

  // ── Daily suggested actions ────────────────────────────────────────────

  @Get("suggested-actions/daily")
  @Roles([...BA_ROLES])
  dailySuggestedActions(
    @Query() query: SuggestedActionsQueryDto,
    @Session() session: UserSession,
  ) {
    const dueDate = query.dueDate ?? new Date().toISOString().slice(0, 10);
    return this.dailySuggestedActionsService.listForBa(
      session.user.id,
      dueDate,
      query.limit ?? 5,
    );
  }

  @Post("suggested-actions/:id/dismiss")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  dismissSuggestedAction(@Param("id") id: string) {
    return this.dailySuggestedActionsService.dismiss(id);
  }

  @Post("suggested-actions/:id/complete")
  @Roles([...BA_ROLES])
  @ApiParam({ name: "id", type: String })
  completeSuggestedAction(@Param("id") id: string) {
    return this.dailySuggestedActionsService.markCompleted(id);
  }
}
