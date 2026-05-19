"use client"

import { Menu } from "@base-ui/react/menu"
import {
  PlusIcon,
  TagIcon,
  MapIcon,
  StoreIcon,
  UserPlusIcon,
  PackageIcon,
  HeartIcon,
  CalendarPlusIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { can, type Permission } from "@/lib/permissions"
import { useSidebar } from "@/components/dashboard/sidebar-context"
import {
  useCreateMenu,
  type CreatableEntity,
} from "@/components/providers/create-menu-provider"

interface CreateMenuItem {
  entity: CreatableEntity
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission: Permission
}

const ITEMS: readonly CreateMenuItem[] = [
  { entity: "brand", label: "Marca", icon: TagIcon, permission: "brand.create" },
  { entity: "zone", label: "Zona", icon: MapIcon, permission: "zone.create" },
  { entity: "store", label: "Tienda", icon: StoreIcon, permission: "store.create" },
  { entity: "user", label: "Beauty Advisor", icon: UserPlusIcon, permission: "user.manage" },
  { entity: "product", label: "Producto", icon: PackageIcon, permission: "product.create" },
  { entity: "customer", label: "Cliente", icon: HeartIcon, permission: "customer.create" },
  { entity: "appointment", label: "Cita", icon: CalendarPlusIcon, permission: "appointment.create" },
]

interface CreateMenuButtonProps {
  role: string
}

export function CreateMenuButton({ role }: CreateMenuButtonProps) {
  const { collapsed } = useSidebar()
  const { open } = useCreateMenu()
  const visible = ITEMS.filter((item) => can(role, item.permission))

  if (visible.length === 0) return null

  return (
    <div className={cn("px-3", collapsed ? "py-2" : "pt-3 pb-1")}>
      <Menu.Root>
        <Menu.Trigger
          className={cn(
            "group flex w-full items-center gap-2 rounded-xl bg-accent text-accent-foreground transition-all duration-200 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            collapsed
              ? "size-10 justify-center"
              : "h-10 px-3 text-[13px] font-medium",
          )}
          aria-label="Crear nuevo"
        >
          <PlusIcon className="size-4 shrink-0" />
          {!collapsed && <span>Crear</span>}
          {!collapsed && (
            <kbd className="ml-auto hidden rounded bg-accent-foreground/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wide opacity-70 md:inline-block">
              C
            </kbd>
          )}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="right" align="start" sideOffset={8} className="z-50">
            <Menu.Popup className="min-w-[200px] overflow-hidden rounded-xl border border-border/60 bg-popover p-1 shadow-lg ring-1 ring-foreground/[0.06] outline-none">
              {visible.map((item) => (
                <Menu.Item
                  key={item.entity}
                  onClick={() => open(item.entity)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-highlighted:bg-muted"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
