"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

export type CreatableEntity =
  | "brand"
  | "zone"
  | "store"
  | "user"
  | "product"
  | "customer"
  | "appointment"

/**
 * Entities that route to a full-page editor instead of opening a Sheet.
 * Use this for flows that need significant real estate (image gallery,
 * preview pane, multi-step content).
 */
const ROUTE_OVERRIDES: Partial<Record<CreatableEntity, string>> = {
  product: "/productos/nuevo",
}

interface CreateMenuContextValue {
  openEntity: CreatableEntity | null
  open: (entity: CreatableEntity) => void
  close: () => void
}

const CreateMenuContext = React.createContext<CreateMenuContextValue | null>(null)

export function CreateMenuProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [openEntity, setOpenEntity] = React.useState<CreatableEntity | null>(null)

  const value = React.useMemo<CreateMenuContextValue>(
    () => ({
      openEntity,
      open: (entity) => {
        const route = ROUTE_OVERRIDES[entity]
        if (route) {
          router.push(route)
          return
        }
        setOpenEntity(entity)
      },
      close: () => setOpenEntity(null),
    }),
    [openEntity, router],
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
