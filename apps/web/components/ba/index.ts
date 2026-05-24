// Visual devices for the Beauty Advisor app. Each component uses a
// distinct visual container chosen for the information it carries —
// cards for heterogeneous browsing, callouts for AI voice, lists for
// homogeneous scanning, timelines for chronology, pills for fast
// pick-and-edit actions.

export { CustomerSummaryCard } from "./customer-summary-card";
export { AIContextBlock } from "./ai-context-block";
export { NextStepCard } from "./next-step-card";
export { NoteItem } from "./note-item";
export { PurchaseRow } from "./purchase-row";
export { ActivityTimeline } from "./activity-timeline";
export type { ActivityItem, ActivityKind } from "./activity-timeline";
export { MessageBubble } from "./message-bubble";
export { AISuggestionChip } from "./ai-suggestion-chip";
export { VoiceNoteRecorder } from "./voice-note-recorder";
export { TimePill } from "./time-pill";
export { DayGroupHeader } from "./day-group-header";
export { ChannelGlyphOverlay } from "./channel-glyph-overlay";
export type { CommunicationChannel } from "./channel-glyph-overlay";
export { ConversationRow } from "./conversation-row";
export { AppointmentRow } from "./appointment-row";
export type {
  AppointmentRowStatus,
  AppointmentRowEmphasis,
} from "./appointment-row";
export { NewAppointmentSheet } from "./new-appointment-sheet";
