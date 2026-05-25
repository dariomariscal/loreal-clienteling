// Clerk-backed users mirror
export { users, usersRelations } from "./auth";

// Tenancy & geography
export { brands } from "./brands";
export { brandConfigs } from "./brand-configs";
export { municipalities } from "./municipalities";
export { zones, zoneMunicipalities } from "./zones";
export { stores } from "./stores";
export { brandStores } from "./brand-stores";

// Customers & their beauty data
export { customers } from "./customers";
export { beautyProfiles, shadeMatches } from "./beauty-profiles";
export { customerRoutines } from "./customer-routines";
export { customerMedia } from "./customer-media";
export { notes } from "./notes";

// Catalog & inventory
export { products, productVariants } from "./products";
export { inventoryLevels } from "./inventory-levels";

// Commerce
export { orders, lineItems } from "./orders";
export { samples } from "./samples";
export { recommendations } from "./recommendations";
export { wishlists, wishlistItems } from "./wishlists";
export { productReservations } from "./product-reservations";
export { abandonedCarts } from "./abandoned-carts";

// Appointments & events
export { serviceTypes } from "./service-types";
export { appointments } from "./appointments";
export { storeEvents, eventInvitations } from "./store-events";

// Communications & outreach
export { messages } from "./messages";
export { messageTemplates } from "./message-templates";
export { trackingLinks } from "./tracking-links";
export { suggestedActions } from "./suggested-actions";
export { customerSegments } from "./customer-segments";

// Compliance & audit
export { consents } from "./consents";
export { privacyNotices } from "./privacy-notices";
export { auditLogs } from "./audit-logs";

// AI infrastructure — embeddings, summaries, voice, telemetry
export { customerEmbeddings } from "./customer-embeddings";
export { noteEmbeddings } from "./note-embeddings";
export { productEmbeddings } from "./product-embeddings";
export { customerAiSummaries } from "./customer-ai-summaries";
export { voiceTranscriptions } from "./voice-transcriptions";
export { aiUsageLogs } from "./ai-usage-logs";
