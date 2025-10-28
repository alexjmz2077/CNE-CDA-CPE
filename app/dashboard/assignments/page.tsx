import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { AssignmentTable } from "@/components/assignment-table"
import { ExportButtons } from "@/components/export-buttons"

export default async function AssignmentsPage() {
  const supabase = await createClient()

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select(
      `
      *,
      electoral_processes(id, name),
      members(id, name, cedula, member_type)
    `,
    )
    .order("created_at", { ascending: false })

  const exportData =
    assignments?.map((a) => ({
      Proceso: a.electoral_processes.name,
      Miembro: a.members.name,
      Cédula: a.members.cedula,
      Tipo: a.members.member_type,
      "Rol/Recinto": a.members.member_type === "CPE" ? a.role || "-" : `Recinto: ${a.precinct || "-"}`,
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asignaciones</h1>
          <p className="text-muted-foreground">Gestión de asignaciones de miembros a procesos</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={exportData} filename="asignaciones" title="Lista de Asignaciones" />
          <Link href="/dashboard/assignments/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Asignación
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Asignaciones</CardTitle>
          <CardDescription>Todas las asignaciones registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">Error al cargar las asignaciones</div>
          ) : (
            <AssignmentTable assignments={assignments || []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
