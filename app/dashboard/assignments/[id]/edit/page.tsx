import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentForm } from "@/components/assignment-form"
import { notFound } from "next/navigation"

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("assignments")
    .select(`
      id,
      process_id,
      member_id,
      member_type,
      role,
      cda_precinct_id,
      members (
        id,
        name,
        second_name,
        cedula
      )
    `)
    .eq("id", id)
    .single()

  const { data: processes } = await supabase.from("electoral_processes").select("id, name").order("name")
  const { data: members } = await supabase
    .from("members")
    .select("id, name, second_name, cedula")
    .order("name", { ascending: true })
  const { data: precincts } = await supabase
    .from("cda_precincts")
    .select("id, code, second_name, name, canton, parish")
    .eq("is_enabled", true)
    .order("name")

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
