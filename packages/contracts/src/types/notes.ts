export interface Note {
  id: string;
  customerId: string;
  body: string;
  productId: string | null;
  isPrivate: boolean;
  createdByUserId: string;
  createdByName: string | null;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNote {
  body: string;
  productId?: string;
  isPrivate?: boolean;
}

export type UpdateNote = Partial<CreateNote>;
