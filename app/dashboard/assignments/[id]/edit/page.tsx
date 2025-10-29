import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentForm } from "@/components/assignment-form"
import { notFound } from "next/navigation"

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: assignment }, { data: processes }, { data: members }, { data: precincts }] = await Promise.all([
    supabase.from("assignments").select("*").eq("id", id).single(),
    supabase.from("electoral_processes").select("id, name").order("name"),
    supabase.from("members").select("id, name, cedula").order("name"),
    supabase
      .from("cda_precincts")
      .select("id, code, name, canton, parish")
      .eq("is_enabled", true)
      .order("name"),
  ])

  if (!assignment) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Asignación</h1>
        <p className="text-muted-foreground">Actualizar información de la asignación</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Asignación</CardTitle>
          <CardDescription>Modifique los datos de la asignación</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignmentForm
            assignment={assignment}
            processes={processes ?? []}
            members={members ?? []}
            precincts={
              precincts?.map((precinct) => ({
                ...precinct,
                parroquia: precinct.parish,
              })) ?? []
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
