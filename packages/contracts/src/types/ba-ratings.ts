export type BaRatingSource =
  | "post_visit_survey"
  | "whatsapp_survey"
  | "manager_attested"
  | "counter_kiosk";

export interface BaRating {
  id: string;
  reviewedUserId: string;
  customerId: string;
  storeId: string;
  appointmentId: string | null;
  score: number;
  comment: string | null;
  source: BaRatingSource;
  submittedByUserId: string | null;
  createdAt: string;
}

export interface CreateBaRating {
  reviewedUserId: string;
  customerId: string;
  appointmentId?: string;
  score: number;
  comment?: string;
  source: BaRatingSource;
}

/** NPS aggregate for a BA over a period. */
export interface BaNps {
  userId: string;
  fullName: string;
  responseCount: number;
  promoters: number; // score >= 9
  passives: number; // 7..8
  detractors: number; // 0..6
  averageScore: number;
  nps: number; // -100..100
}
