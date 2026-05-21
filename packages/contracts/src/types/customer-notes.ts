export interface CustomerNote {
  id: string;
  customerId: string;
  body: string;
  productId: string | null;
  private: boolean;
  authorUserId: string;
  authorName: string | null;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerNote {
  body: string;
  productId?: string;
  private?: boolean;
}

export type UpdateCustomerNote = Partial<CreateCustomerNote>;
