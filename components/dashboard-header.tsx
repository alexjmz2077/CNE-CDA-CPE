"use client"

import type { User } from "@supabase/supabase-js"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

type DashboardHeaderProps = {
  user: User | null
  isDesktopSidebarOpen?: boolean
  onToggleDesktopSidebar?: () => void
  onOpenMobileSidebar?: () => void
}

export function DashboardHeader({
  user,
  isDesktopSidebarOpen = true,
  onToggleDesktopSidebar,
  onOpenMobileSidebar,
}: DashboardHeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenMobileSidebar}
            aria-label="Abrir menú de navegación"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={onToggleDesktopSidebar}
            aria-label={
              isDesktopSidebarOpen ? "Ocultar menú de navegación" : "Mostrar menú de navegación"
            }
          >
            {isDesktopSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </Button>

          <h2 className="truncate text-lg font-semibold">Panel de Administración</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="max-w-[220px] truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  )
}
