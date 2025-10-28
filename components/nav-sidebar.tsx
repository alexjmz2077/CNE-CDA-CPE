"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, Users, Calendar, UserCheck, LogOut } from "lucide-react"

export function NavSidebar() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Procesos Electorales",
      href: "/dashboard/processes",
      icon: Calendar,
    },
    {
      title: "Miembros",
      href: "/dashboard/members",
      icon: Users,
    },
    {
      title: "Asignaciones",
      href: "/dashboard/assignments",
      icon: UserCheck,
    },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold text-primary">CNE</h1>
        <p className="text-sm text-muted-foreground">Sistema de Gestión Electoral</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-3", isActive && "bg-primary/10 text-primary")}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
