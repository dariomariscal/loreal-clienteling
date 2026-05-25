export interface CreateTemplate {
  name: string;
  brandId?: string;
  channel: string;
  /** Matches messages.campaignType — birthday | replenishment | win_back | ... */
  campaignType: string;
  body: string;
}

export type UpdateTemplate = Partial<CreateTemplate>;
