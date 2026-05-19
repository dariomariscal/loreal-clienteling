import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "../schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://loreal:loreal@localhost:5433/loreal_clienteling",
});
const db = drizzle(pool, { schema });

// ─── Helpers ────────────────────────────────────────────────────────────────

function uuid() {
  return crypto.randomUUID();
}

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Better Auth uses @noble/hashes scrypt with N=16384, r=16, p=1, dkLen=64.
// node:crypto.scrypt defaults to r=8, so we must pass r=16 explicitly.
async function hashPassword(password: string): Promise<string> {
  const crypto = await import("node:crypto");
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

// ─── Seed Data ──────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // Truncate all tables
  console.log("Truncating tables...");
  await db.execute(sql`TRUNCATE TABLE
    audit_logs, communications, message_templates, consents,
    appointments, appointment_event_types, samples, purchase_items, purchases,
    recommendations, product_availability, beauty_profile_shades,
    beauty_profiles, customers, products, brand_configs,
    stores, zones, brands, two_factors, sessions, accounts, verifications, users
    CASCADE`);

  // ─── 1. Zones ──────────────────────────────────────────────────────────────
  console.log("Seeding zones...");
  const zoneData = [
    { id: uuid(), code: "CENTRO", displayName: "Zona Centro", region: "Ciudad de México y Estado de México" },
    { id: uuid(), code: "NORTE", displayName: "Zona Norte", region: "Monterrey y Nuevo León" },
    { id: uuid(), code: "OCCIDENTE", displayName: "Zona Occidente", region: "Guadalajara y Jalisco" },
  ];
  await db.insert(schema.zones).values(zoneData);

  // ─── 2. Brands ─────────────────────────────────────────────────────────────
  console.log("Seeding brands...");
  const brandData = [
    { id: uuid(), code: "LANCOME", displayName: "Lancôme", tier: "luxury" },
    { id: uuid(), code: "KIEHLS", displayName: "Kiehl's", tier: "premium" },
    { id: uuid(), code: "YSL", displayName: "YSL Beauty", tier: "luxury" },
    { id: uuid(), code: "MAYBELLINE", displayName: "Maybelline New York", tier: "mass" },
    { id: uuid(), code: "LOREAL_PARIS", displayName: "L'Oréal Paris", tier: "mass" },
  ];
  await db.insert(schema.brands).values(brandData);

  // ─── 3. Brand Configs ──────────────────────────────────────────────────────
  console.log("Seeding brand configs...");
  const brandConfigData = [
    { brandId: brandData[0].id, primaryColor: "#000000", secondaryColor: "#E8D5B5", accentColor: "#C4A265", logoUrl: "/logos/lancome.png", fontFamily: "Garamond", vipThresholdAmount: "20000.00", vipThresholdPeriodMonths: 12, communicationRules: { maxPerWeek: 2, quietHoursStart: 21, quietHoursEnd: 9 }, enabledModules: { virtualTryon: true, samples: true, lookbooks: true, aiRecommendations: true } },
    { brandId: brandData[1].id, primaryColor: "#1A1A1A", secondaryColor: "#FFFFFF", accentColor: "#4A7C59", logoUrl: "/logos/kiehls.png", fontFamily: "Helvetica", vipThresholdAmount: "15000.00", vipThresholdPeriodMonths: 12, communicationRules: { maxPerWeek: 3, quietHoursStart: 21, quietHoursEnd: 9 }, enabledModules: { virtualTryon: false, samples: true, lookbooks: true, aiRecommendations: true } },
    { brandId: brandData[2].id, primaryColor: "#000000", secondaryColor: "#FFFFFF", accentColor: "#FF0000", logoUrl: "/logos/ysl.png", fontFamily: "YSL Display", vipThresholdAmount: "25000.00", vipThresholdPeriodMonths: 12, communicationRules: { maxPerWeek: 2, quietHoursStart: 21, quietHoursEnd: 9 }, enabledModules: { virtualTryon: true, samples: true, lookbooks: true, aiRecommendations: true } },
    { brandId: brandData[3].id, primaryColor: "#000000", secondaryColor: "#FFFFFF", accentColor: "#FF69B4", logoUrl: "/logos/maybelline.png", fontFamily: "Gotham", vipThresholdAmount: "8000.00", vipThresholdPeriodMonths: 12, communicationRules: { maxPerWeek: 4, quietHoursStart: 22, quietHoursEnd: 8 }, enabledModules: { virtualTryon: true, samples: true, lookbooks: false, aiRecommendations: true } },
    { brandId: brandData[4].id, primaryColor: "#000000", secondaryColor: "#FFFFFF", accentColor: "#FFD700", logoUrl: "/logos/loreal-paris.png", fontFamily: "LP Didot", vipThresholdAmount: "10000.00", vipThresholdPeriodMonths: 12, communicationRules: { maxPerWeek: 3, quietHoursStart: 21, quietHoursEnd: 9 }, enabledModules: { virtualTryon: false, samples: true, lookbooks: false, aiRecommendations: true } },
  ];
  await db.insert(schema.brandConfigs).values(brandConfigData);

  // ─── 4. Stores ─────────────────────────────────────────────────────────────
  console.log("Seeding stores...");
  const storeData = [
    { id: uuid(), code: "LIV_POLANCO", displayName: "Liverpool Polanco", chain: "liverpool", zoneId: zoneData[0].id, address: "Av. Molière 222", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "LIV_SANTA_FE", displayName: "Liverpool Santa Fe", chain: "liverpool", zoneId: zoneData[0].id, address: "Av. Vasco de Quiroga 3800", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "LIV_MTY", displayName: "Liverpool Monterrey", chain: "liverpool", zoneId: zoneData[1].id, address: "Av. Gonzalitos 500", city: "Monterrey", state: "Nuevo León" },
    { id: uuid(), code: "LIV_GDL", displayName: "Liverpool Guadalajara", chain: "liverpool", zoneId: zoneData[2].id, address: "Av. Mariano Otero 1589", city: "Guadalajara", state: "Jalisco" },
    { id: uuid(), code: "PDH_POLANCO", displayName: "Palacio de Hierro Polanco", chain: "palacio", zoneId: zoneData[0].id, address: "Av. Molière 222", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "PDH_SANTA_FE", displayName: "Palacio de Hierro Santa Fe", chain: "palacio", zoneId: zoneData[0].id, address: "Av. Vasco de Quiroga 3850", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "PDH_MTY", displayName: "Palacio de Hierro Monterrey", chain: "palacio", zoneId: zoneData[1].id, address: "Calzada del Valle 400", city: "San Pedro Garza García", state: "Nuevo León" },
    { id: uuid(), code: "BOUT_LANCOME", displayName: "Boutique Lancôme Polanco", chain: "owned", zoneId: zoneData[0].id, address: "Av. Presidente Masaryk 340", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "BOUT_YSL", displayName: "Boutique YSL Santa Fe", chain: "owned", zoneId: zoneData[0].id, address: "Centro Santa Fe Local B-12", city: "Ciudad de México", state: "CDMX" },
    { id: uuid(), code: "BOUT_KIEHLS", displayName: "Boutique Kiehl's Polanco", chain: "owned", zoneId: zoneData[0].id, address: "Av. Presidente Masaryk 460", city: "Ciudad de México", state: "CDMX" },
  ];
  await db.insert(schema.stores).values(storeData);

  // ─── 5. Users (Better Auth format) ─────────────────────────────────────────
  console.log("Seeding users...");
  const defaultPasswordHash = await hashPassword("Password123!");

  type UserSeed = {
    id: string; name: string; email: string; fullName: string;
    role: string; storeId: string | null; zoneId: string | null; brandId: string | null;
  };

  const usersData: UserSeed[] = [
    // Admin
    { id: uuid(), name: "Admin Central", email: "admin@loreal.mx", fullName: "Administrador Central", role: "admin", storeId: null, zoneId: null, brandId: null },
    // Supervisors (one per zone)
    { id: uuid(), name: "Gabriela Torres", email: "g.torres@loreal.mx", fullName: "Gabriela Torres Méndez", role: "supervisor", storeId: null, zoneId: zoneData[0].id, brandId: null },
    { id: uuid(), name: "Roberto Garza", email: "r.garza@loreal.mx", fullName: "Roberto Garza Villarreal", role: "supervisor", storeId: null, zoneId: zoneData[1].id, brandId: null },
    { id: uuid(), name: "Patricia López", email: "p.lopez@loreal.mx", fullName: "Patricia López Hernández", role: "supervisor", storeId: null, zoneId: zoneData[2].id, brandId: null },
    // Managers (one per store, first 5 stores)
    { id: uuid(), name: "Ana Martínez", email: "a.martinez@loreal.mx", fullName: "Ana Martínez Ruiz", role: "manager", storeId: storeData[0].id, zoneId: null, brandId: brandData[0].id },
    { id: uuid(), name: "Carlos Hernández", email: "c.hernandez@loreal.mx", fullName: "Carlos Hernández López", role: "manager", storeId: storeData[1].id, zoneId: null, brandId: brandData[1].id },
    { id: uuid(), name: "Laura Díaz", email: "l.diaz@loreal.mx", fullName: "Laura Díaz Fernández", role: "manager", storeId: storeData[2].id, zoneId: null, brandId: brandData[2].id },
    { id: uuid(), name: "Miguel Ángel Reyes", email: "m.reyes@loreal.mx", fullName: "Miguel Ángel Reyes Soto", role: "manager", storeId: storeData[3].id, zoneId: null, brandId: brandData[3].id },
    { id: uuid(), name: "Fernanda Ortiz", email: "f.ortiz@loreal.mx", fullName: "Fernanda Ortiz García", role: "manager", storeId: storeData[4].id, zoneId: null, brandId: brandData[0].id },
    // BAs (2 per first 5 stores = 10 BAs)
    { id: uuid(), name: "Valentina Rojas", email: "v.rojas@loreal.mx", fullName: "Valentina Rojas Pérez", role: "ba", storeId: storeData[0].id, zoneId: null, brandId: brandData[0].id },
    { id: uuid(), name: "Sofía Castillo", email: "s.castillo@loreal.mx", fullName: "Sofía Castillo Moreno", role: "ba", storeId: storeData[0].id, zoneId: null, brandId: brandData[0].id },
    { id: uuid(), name: "Daniela Rivera", email: "d.rivera@loreal.mx", fullName: "Daniela Rivera Cruz", role: "ba", storeId: storeData[1].id, zoneId: null, brandId: brandData[1].id },
    { id: uuid(), name: "Camila Flores", email: "c.flores@loreal.mx", fullName: "Camila Flores Vega", role: "ba", storeId: storeData[1].id, zoneId: null, brandId: brandData[1].id },
    { id: uuid(), name: "Isabella Guzmán", email: "i.guzman@loreal.mx", fullName: "Isabella Guzmán Torres", role: "ba", storeId: storeData[2].id, zoneId: null, brandId: brandData[2].id },
    { id: uuid(), name: "Mariana Salazar", email: "m.salazar@loreal.mx", fullName: "Mariana Salazar Díaz", role: "ba", storeId: storeData[2].id, zoneId: null, brandId: brandData[2].id },
    { id: uuid(), name: "Regina Morales", email: "r.morales@loreal.mx", fullName: "Regina Morales Jiménez", role: "ba", storeId: storeData[3].id, zoneId: null, brandId: brandData[3].id },
    { id: uuid(), name: "Andrea Navarro", email: "a.navarro@loreal.mx", fullName: "Andrea Navarro Ramírez", role: "ba", storeId: storeData[3].id, zoneId: null, brandId: brandData[3].id },
    { id: uuid(), name: "Renata Vargas", email: "r.vargas@loreal.mx", fullName: "Renata Vargas Mendoza", role: "ba", storeId: storeData[4].id, zoneId: null, brandId: brandData[0].id },
    { id: uuid(), name: "Ximena Aguilar", email: "x.aguilar@loreal.mx", fullName: "Ximena Aguilar Herrera", role: "ba", storeId: storeData[4].id, zoneId: null, brandId: brandData[0].id },
  ];

  // Insert users
  for (const u of usersData) {
    await db.insert(schema.users).values({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      fullName: u.fullName,
      role: u.role,
      storeId: u.storeId,
      zoneId: u.zoneId,
      brandId: u.brandId,
      active: true,
    });
    // Insert Better Auth account (email/password credential)
    await db.insert(schema.accounts).values({
      id: uuid(),
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: defaultPasswordHash,
    });
  }

  // Helper: get BAs by store
  const basByStore = (storeId: string) => usersData.filter((u) => u.role === "ba" && u.storeId === storeId);

  // ─── 5b. Appointment Event Types ─────────────────────────────────────────
  console.log("Seeding appointment event types...");
  const eventTypeData = [
    { id: uuid(), code: "cabin_service", displayName: "Servicio de cabina", durationMinutes: 60, color: "#5B7FA5", description: "Servicio completo en cabina de belleza", sortOrder: 0 },
    { id: uuid(), code: "facial", displayName: "Facial", durationMinutes: 45, color: "#4A7C59", description: "Tratamiento facial personalizado", sortOrder: 1 },
    { id: uuid(), code: "anniversary_event", displayName: "Evento aniversario", durationMinutes: 120, color: "#C9A96E", description: "Evento especial para aniversario de clienta", sortOrder: 2 },
    { id: uuid(), code: "vip_cabin", displayName: "Cabina VIP", durationMinutes: 90, color: "#C9A96E", description: "Servicio premium en cabina VIP", maxCapacity: 1, requiresConfirmation: true, sortOrder: 3 },
    { id: uuid(), code: "product_followup", displayName: "Seguimiento de producto", durationMinutes: 30, color: "#6B6B6B", description: "Revisión y seguimiento de productos adquiridos", sortOrder: 4 },
    { id: uuid(), code: "custom", displayName: "Personalizado", durationMinutes: 60, color: "#9B9B9B", description: "Evento personalizado", sortOrder: 5 },
  ];
  await db.insert(schema.appointmentEventTypes).values(eventTypeData);
  const eventTypeByCode = Object.fromEntries(eventTypeData.map((e) => [e.code, e]));

  // ─── 6. Products ───────────────────────────────────────────────────────────
  console.log("Seeding products...");

  // Unsplash image URLs for seed data (categorized for realistic product images)
  const skincareImages = [
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1570194065650-d99fb4a38691?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=400&h=400&fit=crop",
  ];
  const makeupImages = [
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1583241800698-e8ab01830a07?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1557205465-f3762edea6d3?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1590156546946-ce55a12a0a68?w=400&h=400&fit=crop",
  ];
  const fragranceImages = [
    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1594035910387-fea081ae5276?w=400&h=400&fit=crop",
  ];

  const skincareSubs = ["serum", "moisturizer", "cleanser", "toner", "eye_cream", "mask", "sunscreen"];
  const makeupSubs = ["foundation", "concealer", "lipstick", "mascara", "blush", "eyeshadow", "powder"];
  const fragranceSubs = ["eau_de_parfum", "eau_de_toilette"];

  const productsList: Array<{
    id: string; sku: string; brandId: string; name: string;
    category: string; subcategory: string; price: string;
    estimatedDurationDays: number | null; description: string;
    images: string[];
  }> = [];

  // Generate 50 products per brand
  for (const brand of brandData) {
    const prefix = brand.code.substring(0, 3).toUpperCase();
    let skuCounter = 1;

    // 20 skincare
    const skincareNames = [
      "Advanced Génifique Sérum", "Hydra Zen Crema", "Absolue Crema Rica", "UV Expert Protector",
      "Tonique Confort", "Absolue Eye Cream", "Rénergie Lift Sérum", "Hydra Zen Gel",
      "Clarifique Sérum", "Advanced Génifique Eye", "Absolue Cleanser", "Hydra Zen Mask",
      "UV Defender", "Rénergie Nuit", "Tonique Douceur", "Bi-Facil Eye Makeup Remover",
      "Absolue Soft Cream", "Hydra Zen SPF30", "Génifique Night", "Rénergie Eye Cream",
    ];
    for (let i = 0; i < 20; i++) {
      productsList.push({
        id: uuid(), sku: `${prefix}-SK-${String(skuCounter++).padStart(4, "0")}`,
        brandId: brand.id, name: skincareNames[i] || `Skincare Product ${i + 1}`,
        category: "skincare", subcategory: pick(skincareSubs),
        price: (Math.round((Math.random() * 3000 + 500) * 100) / 100).toFixed(2),
        estimatedDurationDays: Math.floor(Math.random() * 60) + 30,
        description: `Tratamiento de skincare premium de ${brand.displayName}`,
        images: [pick(skincareImages)],
      });
    }
    // 20 makeup
    const makeupNames = [
      "Teint Idole Ultra Wear", "Effacernes Concealer", "L'Absolu Rouge", "Hypnôse Mascara",
      "Blush Subtil", "Color Design Eyeshadow", "Dual Finish Powder", "Teint Miracle",
      "Grandiôse Mascara", "Color Design Lip", "Le Crayon Khôl", "Belle de Teint",
      "Monsieur Big Mascara", "L'Absolu Lacquer", "Le Stylo Waterproof", "Skin Feels Good",
      "Sourcils Gel", "L'Absolu Gloss", "Teint Particulier", "Blush Crème",
    ];
    for (let i = 0; i < 20; i++) {
      productsList.push({
        id: uuid(), sku: `${prefix}-MK-${String(skuCounter++).padStart(4, "0")}`,
        brandId: brand.id, name: makeupNames[i] || `Makeup Product ${i + 1}`,
        category: "makeup", subcategory: pick(makeupSubs),
        price: (Math.round((Math.random() * 2000 + 300) * 100) / 100).toFixed(2),
        estimatedDurationDays: Math.floor(Math.random() * 90) + 60,
        description: `Maquillaje profesional de ${brand.displayName}`,
        images: [pick(makeupImages)],
      });
    }
    // 10 fragrance
    const fragranceNames = [
      "La Vie Est Belle EDP", "Trésor EDP", "Idôle EDP", "Miracle EDP",
      "Ô de Lancôme EDT", "La Nuit Trésor", "Idôle Intense", "Trésor in Love",
      "Hypnôse EDP", "La Vie Est Belle Intensément",
    ];
    for (let i = 0; i < 10; i++) {
      productsList.push({
        id: uuid(), sku: `${prefix}-FR-${String(skuCounter++).padStart(4, "0")}`,
        brandId: brand.id, name: fragranceNames[i] || `Fragrance ${i + 1}`,
        category: "fragrance", subcategory: pick(fragranceSubs),
        price: (Math.round((Math.random() * 4000 + 1000) * 100) / 100).toFixed(2),
        estimatedDurationDays: null, // Fragrances don't have predictable depletion
        description: `Fragancia de ${brand.displayName}`,
        images: [pick(fragranceImages)],
      });
    }
  }

  // Insert in batches of 50
  for (let i = 0; i < productsList.length; i += 50) {
    await db.insert(schema.products).values(productsList.slice(i, i + 50));
  }
  console.log(`  ${productsList.length} products created`);

  // ─── 7. Product Availability ───────────────────────────────────────────────
  console.log("Seeding product availability...");
  const stockStatuses = ["available", "available", "available", "low", "out_of_stock"];
  const availabilityData: Array<{ productId: string; storeId: string; stockStatus: string }> = [];
  for (const product of productsList) {
    // Each product available in 3-5 random stores
    const stores = pickN(storeData, Math.floor(Math.random() * 3) + 3);
    for (const store of stores) {
      availabilityData.push({
        productId: product.id,
        storeId: store.id,
        stockStatus: pick(stockStatuses),
      });
    }
  }
  for (let i = 0; i < availabilityData.length; i += 100) {
    await db.insert(schema.productAvailability).values(availabilityData.slice(i, i + 100));
  }
  console.log(`  ${availabilityData.length} availability records created`);

  // ─── 8. Message Templates ──────────────────────────────────────────────────
  console.log("Seeding message templates...");
  const templateData = [];
  for (const brand of brandData) {
    templateData.push(
      { brandId: brand.id, name: "Seguimiento 3 meses", channel: "whatsapp", body: `¡Hola {{customer.first_name}}! Soy tu asesora de ${brand.displayName}. Han pasado 3 meses desde tu última visita. ¿Te gustaría agendar una cita?`, followupType: "3_months" },
      { brandId: brand.id, name: "Feliz cumpleaños", channel: "whatsapp", body: `¡Feliz cumpleaños {{customer.first_name}}! 🎂 En ${brand.displayName} queremos celebrarte. Tenemos un regalo especial esperándote en tienda.`, followupType: "birthday" },
      { brandId: brand.id, name: "Reposición de producto", channel: "whatsapp", body: `Hola {{customer.first_name}}, es probable que tu {{product.name}} esté por terminarse. ¿Te gustaría que te aparte uno en tienda?`, followupType: "replenishment" },
    );
  }
  // Global templates
  templateData.push(
    { brandId: null, name: "Confirmación de cita", channel: "whatsapp", body: "Hola {{customer.first_name}}, te confirmamos tu cita el {{appointment.date}} a las {{appointment.time}}. ¡Te esperamos!", followupType: "custom" },
    { brandId: null, name: "Seguimiento 6 meses", channel: "email", body: "Estimada {{customer.first_name}}, ha pasado tiempo desde tu última visita. Nos encantaría volver a atenderte.", followupType: "6_months" },
  );
  await db.insert(schema.messageTemplates).values(templateData);

  // ─── 9. Customers ──────────────────────────────────────────────────────────
  console.log("Seeding customers...");
  const firstNames = ["María", "Ana", "Lucía", "Carmen", "Laura", "Sofía", "Elena", "Isabel", "Patricia", "Rosa", "Andrea", "Gabriela", "Verónica", "Diana", "Alejandra", "Paulina", "Fernanda", "Mónica", "Claudia", "Adriana", "Carolina", "Margarita", "Silvia", "Karla", "Paola", "Beatriz", "Teresa", "Alicia", "Sandra", "Erika", "Lorena", "Cecilia", "Leticia", "Rocío", "Marisol", "Ivonne", "Nancy", "Elizabeth", "Guadalupe", "Norma", "Gloria", "Martha", "Yolanda", "Lidia", "Consuelo", "Pilar", "Dolores", "Amparo", "Susana", "Hortensia"];
  const lastNames = ["García", "Rodríguez", "Hernández", "López", "Martínez", "González", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Cruz", "Morales", "Reyes", "Gutiérrez", "Ortiz", "Castillo", "Ruiz", "Mendoza", "Aguilar", "Vargas", "Jiménez"];
  const segments = ["new", "returning", "vip", "at_risk"];
  const genders = ["female", "male", "non_binary", "prefer_not_say"];

  const customerData: Array<{
    id: string; firstName: string; lastName: string; email: string;
    phone: string; gender: string; birthDate: string;
    registeredAtStoreId: string; registeredByUserId: string;
    lastBaUserId: string; lifecycleSegment: string;
    customerSince: Date; lastContactAt: Date | null; lastTransactionAt: Date | null;
  }> = [];

  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

  for (let i = 0; i < 120; i++) {
    const store = pick(storeData.slice(0, 5)); // first 5 stores have BAs
    const bas = basByStore(store.id);
    if (bas.length === 0) continue;
    const ba = pick(bas);
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const segment = pick(segments);
    const since = randomDate(twoYearsAgo, now);

    customerData.push({
      id: uuid(),
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${ln.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}${i}@email.com`,
      phone: `55${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
      gender: i < 100 ? "female" : pick(genders),
      birthDate: `${1960 + Math.floor(Math.random() * 45)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      registeredAtStoreId: store.id,
      registeredByUserId: ba.id,
      lastBaUserId: ba.id,
      lifecycleSegment: segment,
      customerSince: since,
      lastContactAt: segment === "at_risk" ? randomDate(oneYearAgo, new Date(now.getTime() - 120 * 86400000)) : randomDate(since, now),
      lastTransactionAt: segment === "new" ? null : randomDate(since, now),
    });
  }

  for (let i = 0; i < customerData.length; i += 50) {
    await db.insert(schema.customers).values(customerData.slice(i, i + 50));
  }
  console.log(`  ${customerData.length} customers created`);

  // ─── 10. Beauty Profiles ───────────────────────────────────────────────────
  console.log("Seeding beauty profiles + shades...");
  const skinTypes = ["dry", "oily", "combination", "sensitive", "normal"];
  const skinTones = ["fair", "light", "medium", "tan", "deep"];
  const skinSubtones = ["cool", "neutral", "warm"];
  const concerns = ["acne", "aging", "pigmentation", "dryness", "sensitivity", "pores"];
  const shadeCategories = ["foundation", "concealer", "lipstick", "blush"];

  const profileCustomers = customerData.slice(0, 95); // 80% have profile
  for (const c of profileCustomers) {
    const profileId = uuid();
    await db.insert(schema.beautyProfiles).values({
      id: profileId,
      customerId: c.id,
      skinType: pick(skinTypes),
      skinTone: pick(skinTones),
      skinSubtone: pick(skinSubtones),
      skinConcerns: pickN(concerns, Math.floor(Math.random() * 3) + 1),
      preferredIngredients: pickN(["retinol", "niacinamide", "vitamin_c", "hyaluronic_acid", "peptides"], 2),
      avoidedIngredients: pickN(["alcohol", "parabens", "sulfates", "fragrance"], 1),
      fragrancePreferences: pickN(["floral", "woody", "citrus", "oriental", "fresh"], 2),
      interests: pickN(["skincare", "makeup", "fragrance"], Math.floor(Math.random() * 2) + 1),
    });

    // 1-3 shades per profile
    const numShades = Math.floor(Math.random() * 3) + 1;
    for (let s = 0; s < numShades; s++) {
      const brandForShade = pick(brandData);
      const matchingProducts = productsList.filter((p) => p.brandId === brandForShade.id && p.category === "makeup");
      if (matchingProducts.length === 0) continue;
      await db.insert(schema.beautyProfileShades).values({
        beautyProfileId: profileId,
        category: pick(shadeCategories),
        brandId: brandForShade.id,
        productId: pick(matchingProducts).id,
        shadeCode: `${pick(["N", "W", "C"])}${Math.floor(Math.random() * 40) + 10}`,
        capturedByUserId: c.registeredByUserId,
      });
    }
  }

  // ─── 11. Consents ──────────────────────────────────────────────────────────
  console.log("Seeding consents...");
  for (const c of customerData) {
    // All customers have privacy notice consent
    await db.insert(schema.consents).values({
      customerId: c.id,
      type: "privacy_notice",
      version: "1.0",
      source: "in_store_registration",
    });
    // ~70% have marketing consents
    if (Math.random() < 0.7) {
      await db.insert(schema.consents).values({
        customerId: c.id,
        type: "marketing_whatsapp",
        version: "1.0",
        source: "in_store_registration",
      });
    }
    if (Math.random() < 0.5) {
      await db.insert(schema.consents).values({
        customerId: c.id,
        type: "marketing_email",
        version: "1.0",
        source: "in_store_registration",
      });
    }
  }

  // ─── 12. Purchases ─────────────────────────────────────────────────────────
  console.log("Seeding purchases...");
  const purchaseSources = ["manual", "manual", "manual", "pos_integration"];
  const attributionReasons = ["active_recommendation", "last_consultation", "direct_assistance"];
  let totalPurchases = 0;
  let totalItems = 0;

  for (const c of customerData) {
    if (c.lifecycleSegment === "new" && Math.random() > 0.3) continue;
    const numPurchases = c.lifecycleSegment === "vip" ? Math.floor(Math.random() * 6) + 4
      : c.lifecycleSegment === "returning" ? Math.floor(Math.random() * 4) + 2
      : Math.floor(Math.random() * 2) + 1;

    for (let p = 0; p < numPurchases; p++) {
      const purchaseId = uuid();
      const ba = pick(basByStore(c.registeredAtStoreId) || usersData.filter((u) => u.role === "ba"));
      const numItems = Math.floor(Math.random() * 3) + 1;
      const storeProducts = productsList.filter((pr) => ba.brandId && pr.brandId === ba.brandId);
      if (storeProducts.length === 0) continue;

      const items = pickN(storeProducts, numItems);
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.price), 0);

      await db.insert(schema.purchases).values({
        id: purchaseId,
        customerId: c.id,
        storeId: c.registeredAtStoreId,
        purchasedAt: randomDate(c.customerSince, now),
        totalAmount: totalAmount.toFixed(2),
        source: pick(purchaseSources),
        attributedBaUserId: ba.id,
        attributionReason: pick(attributionReasons),
      });

      for (const item of items) {
        await db.insert(schema.purchaseItems).values({
          purchaseId,
          productId: item.id,
          sku: item.sku,
          quantity: 1,
          unitPrice: item.price,
        });
        totalItems++;
      }
      totalPurchases++;
    }
  }
  console.log(`  ${totalPurchases} purchases, ${totalItems} items`);

  // ─── 13. Recommendations ───────────────────────────────────────────────────
  console.log("Seeding recommendations...");
  const recSources = ["manual", "manual", "replenishment_alert"];
  const visitReasons = ["new_purchase", "rebuy", "gift", "concern", "promotion", "browsing"];
  let totalRecs = 0;

  for (const c of customerData.slice(0, 80)) {
    const numRecs = Math.floor(Math.random() * 3) + 1;
    const ba = pick(basByStore(c.registeredAtStoreId) || usersData.filter((u) => u.role === "ba"));
    const storeProducts = productsList.filter((pr) => ba.brandId && pr.brandId === ba.brandId);
    if (storeProducts.length === 0) continue;

    for (let r = 0; r < numRecs; r++) {
      const converted = Math.random() < 0.4;
      await db.insert(schema.recommendations).values({
        customerId: c.id,
        productId: pick(storeProducts).id,
        baUserId: ba.id,
        storeId: c.registeredAtStoreId,
        recommendedAt: randomDate(c.customerSince, now),
        source: pick(recSources),
        visitReason: pick(visitReasons),
        notes: Math.random() < 0.3 ? "Clienta interesada en rutina de noche" : null,
        convertedToPurchase: converted,
      });
      totalRecs++;
    }
  }
  console.log(`  ${totalRecs} recommendations`);

  // ─── 14. Samples ───────────────────────────────────────────────────────────
  console.log("Seeding samples...");
  let totalSamples = 0;
  for (const c of customerData.slice(0, 60)) {
    const ba = pick(basByStore(c.registeredAtStoreId) || usersData.filter((u) => u.role === "ba"));
    const storeProducts = productsList.filter((pr) => ba.brandId && pr.brandId === ba.brandId);
    if (storeProducts.length === 0) continue;
    const converted = Math.random() < 0.3;
    await db.insert(schema.samples).values({
      customerId: c.id,
      productId: pick(storeProducts).id,
      baUserId: ba.id,
      storeId: c.registeredAtStoreId,
      deliveredAt: randomDate(c.customerSince, now),
      convertedToPurchase: converted,
    });
    totalSamples++;
  }
  console.log(`  ${totalSamples} samples`);

  // ─── 15. Appointments ──────────────────────────────────────────────────────
  console.log("Seeding appointments...");
  const eventTypes = ["cabin_service", "facial", "anniversary_event", "vip_cabin", "product_followup"];
  const statuses = ["completed", "completed", "completed", "scheduled", "confirmed", "cancelled", "no_show", "rescheduled"];
  let totalAppts = 0;

  for (const c of customerData.slice(0, 70)) {
    const numAppts = Math.floor(Math.random() * 3) + 1;
    const ba = pick(basByStore(c.registeredAtStoreId) || usersData.filter((u) => u.role === "ba"));

    for (let a = 0; a < numAppts; a++) {
      const scheduledAt = randomDate(c.customerSince, new Date(now.getTime() + 30 * 86400000));
      const status = scheduledAt > now ? pick(["scheduled", "confirmed"]) : pick(statuses);
      const chosenEventType = pick(eventTypes);
      const matchedEventType = eventTypeByCode[chosenEventType];
      if (!matchedEventType) continue;
      await db.insert(schema.appointments).values({
        customerId: c.id,
        baUserId: ba.id,
        storeId: c.registeredAtStoreId,
        eventTypeId: matchedEventType.id,
        scheduledAt,
        durationMinutes: matchedEventType.durationMinutes ?? pick([30, 45, 60, 90]),
        status,
        comments: Math.random() < 0.4 ? "Tratamiento facial personalizado" : null,
        isVirtual: Math.random() < 0.1,
      });
      totalAppts++;
    }
  }
  console.log(`  ${totalAppts} appointments`);

  // ─── 16. Communications ────────────────────────────────────────────────────
  console.log("Seeding communications...");
  const channels = ["whatsapp", "whatsapp", "whatsapp", "email", "sms"];
  const followupTypes = ["3_months", "6_months", "birthday", "replenishment", "special_event", "custom"];
  let totalComms = 0;

  for (const c of customerData.slice(0, 80)) {
    const numComms = Math.floor(Math.random() * 3) + 1;
    const ba = pick(basByStore(c.registeredAtStoreId) || usersData.filter((u) => u.role === "ba"));

    for (let cm = 0; cm < numComms; cm++) {
      const sentAt = randomDate(c.customerSince, now);
      await db.insert(schema.communications).values({
        customerId: c.id,
        sentByUserId: ba.id,
        channel: pick(channels),
        body: `Hola ${c.firstName}, esperamos que estés disfrutando tus productos. ¿Necesitas algo?`,
        followupType: pick(followupTypes),
        sentAt,
        deliveredAt: Math.random() < 0.9 ? new Date(sentAt.getTime() + 5000) : null,
        readAt: Math.random() < 0.6 ? new Date(sentAt.getTime() + 3600000) : null,
      });
      totalComms++;
    }
  }
  console.log(`  ${totalComms} communications`);

  // ─── Done ──────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed completed!");
  console.log(`
Summary:
  - ${zoneData.length} zones
  - ${brandData.length} brands + configs
  - ${storeData.length} stores
  - ${usersData.length} users (1 admin, 3 supervisors, 5 managers, 10 BAs)
  - ${productsList.length} products
  - ${availabilityData.length} availability records
  - ${templateData.length} message templates
  - ${customerData.length} customers
  - ${profileCustomers.length} beauty profiles
  - ${totalPurchases} purchases (${totalItems} items)
  - ${totalRecs} recommendations
  - ${totalSamples} samples
  - ${totalAppts} appointments
  - ${totalComms} communications

Login credentials (all users):
  Password: Password123!
  Admin: admin@loreal.mx
  BA example: v.rojas@loreal.mx
  Manager example: a.martinez@loreal.mx
  Supervisor example: g.torres@loreal.mx
`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end();
  process.exit(1);
});
