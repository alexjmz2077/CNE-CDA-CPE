import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, UserCheck, Plus } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch statistics
  const [{ count: processCount }, { count: memberCount }, { count: assignmentCount }] = await Promise.all([
    supabase.from("electoral_processes").select("*", { count: "exact", head: true }),
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("assignments").select("*", { count: "exact", head: true }),
  ])

  const stats = [
    {
      title: "Procesos Electorales",
      value: processCount || 0,
      description: "Total de procesos registrados",
      icon: Calendar,
      href: "/dashboard/processes",
      color: "text-blue-600",
    },
    {
      title: "Miembros",
      value: memberCount || 0,
      description: "CPE y CDA registrados",
      icon: Users,
      href: "/dashboard/members",
      color: "text-green-600",
    },
    {
      title: "Asignaciones",
      value: assignmentCount || 0,
      description: "Miembros asignados a procesos",
      icon: UserCheck,
      href: "/dashboard/assignments",
      color: "text-purple-600",
    },
  ]

  const quickActions = [
    {
      title: "Nuevo Proceso Electoral",
      description: "Crear un nuevo proceso electoral",
      href: "/dashboard/processes/new",
      icon: Calendar,
    },
    {
      title: "Registrar Miembro",
      description: "Agregar un nuevo miembro CPE o CDA",
      href: "/dashboard/members/new",
      icon: Users,
    },
    {
      title: "Crear Asignación",
      description: "Asignar miembros a procesos",
      href: "/dashboard/assignments/new",
      icon: UserCheck,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen del sistema de gestión electoral</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Acciones Rápidas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card key={action.title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription className="text-xs">{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={action.href}>
                    <Button className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Crear
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
