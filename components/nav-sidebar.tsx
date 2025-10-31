"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LayoutDashboard, Users, Calendar, UserCheck, LogOut, Building2 } from "lucide-react"

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
      title: "Personal",
      href: "/dashboard/members",
      icon: Users,
    },
    {
      title: "Asignaciones",
      href: "/dashboard/assignments",
      icon: UserCheck,
    },
    {
      title: "Recintos",
      href: "/dashboard/cda-precincts",
      icon: Building2,
    },
  ]

  return (
    <div className="flex h-full w-52 flex-col border-r bg-card">
      <div className="border-b p-6">
        <div className="flex items-center gap-3">
          <Image
            src="/images/CNE_Ecuador.webp"
            alt="Logo CNE"
            width={60}
            height={40}
            className="object-contain"
          />

        </div>
        <p className="mt-2 text-sm text-muted-foreground">Sistema de Gestión de Personal</p>
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
        <p className="mb-3 text-center text-xs text-muted-foreground">
          Desarrollado por Jaime Jimenez 2025
        </p>
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
