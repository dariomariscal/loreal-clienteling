"use client"

import * as React from "react"

export type CreatableEntity =
  | "brand"
  | "zone"
  | "store"
  | "user"
  | "product"
  | "customer"
  | "appointment"

interface CreateMenuContextValue {
  openEntity: CreatableEntity | null
  open: (entity: CreatableEntity) => void
  close: () => void
}

const CreateMenuContext = React.createContext<CreateMenuContextValue | null>(null)

export function CreateMenuProvider({ children }: { children: React.ReactNode }) {
  const [openEntity, setOpenEntity] = React.useState<CreatableEntity | null>(null)

  const value = React.useMemo<CreateMenuContextValue>(
    () => ({
      openEntity,
      open: (entity) => setOpenEntity(entity),
      close: () => setOpenEntity(null),
    }),
    [openEntity],
  )

  return (
    <CreateMenuContext.Provider value={value}>
      {children}
    </CreateMenuContext.Provider>
  )
}

export function useCreateMenu() {
  const ctx = React.useContext(CreateMenuContext)
  if (!ctx) {
    throw new Error("useCreateMenu must be used within CreateMenuProvider")
  }
  return ctx
}
