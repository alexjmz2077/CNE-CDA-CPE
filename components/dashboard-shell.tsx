"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"
import { NavSidebar } from "@/components/nav-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

const SIDEBAR_STORAGE_KEY = "cne-dashboard-sidebar-open"

type DashboardShellProps = {
  user: User | null
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname()
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (storedValue === "false") {
      setIsDesktopSidebarOpen(false)
    }
  }, [])

  const toggleDesktopSidebar = useCallback(() => {
    setIsDesktopSidebarOpen((current) => {
      const nextValue = !current
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue))
      return nextValue
    })
  }, [])

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false)
  }, [])

  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  useEffect(() => {
    if (!isMobileSidebarOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileSidebar()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [closeMobileSidebar, isMobileSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden">
      <div
        className={cn(
          "hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block",
          isDesktopSidebarOpen ? "w-52" : "w-0",
        )}
      >
        <NavSidebar className="w-52" />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden",
          isMobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileSidebar}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full transform shadow-xl transition-transform duration-200 ease-out lg:hidden",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        aria-hidden={!isMobileSidebarOpen}
        inert={!isMobileSidebarOpen}
      >
        <NavSidebar className="w-64 max-w-[85vw] sm:w-72" onClose={closeMobileSidebar} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          user={user}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          onToggleDesktopSidebar={toggleDesktopSidebar}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
