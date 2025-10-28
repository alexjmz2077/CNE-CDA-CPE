import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ProcessTable } from "@/components/process-table"
import { ExportButtons } from "@/components/export-buttons"

export default async function ProcessesPage() {
  const supabase = await createClient()

  const { data: processes, error } = await supabase
    .from("electoral_processes")
    .select("*")
    .order("created_at", { ascending: false })

  const exportData =
    processes?.map((p) => ({
      Nombre: p.name,
      "Fecha Inicio": new Date(p.start_date).toLocaleDateString("es-EC"),
      "Fecha Fin": new Date(p.end_date).toLocaleDateString("es-EC"),
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Procesos Electorales</h1>
          <p className="text-muted-foreground">Gestión de procesos electorales</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={exportData} filename="procesos-electorales" title="Lista de Procesos Electorales" />
          <Link href="/dashboard/processes/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Proceso
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Procesos</CardTitle>
          <CardDescription>Todos los procesos electorales registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">Error al cargar los procesos</div>
          ) : (
            <ProcessTable processes={processes || []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
