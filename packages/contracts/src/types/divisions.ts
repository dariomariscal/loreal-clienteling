export interface Division {
  id: string;
  code: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDivision {
  code: string;
  displayName: string;
  isActive?: boolean;
}

export type UpdateDivision = Partial<Omit<CreateDivision, "code">> & {
  isActive?: boolean;
};
