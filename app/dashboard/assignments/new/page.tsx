import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentForm } from "@/components/assignment-form"

export default async function NewAssignmentPage() {
  const supabase = await createClient()

  const [{ data: processes }, { data: members }, { data: precincts }] = await Promise.all([
    supabase.from("electoral_processes").select("id, name").order("created_at", { ascending: false }),
    supabase.from("members").select("id, name, cedula").order("name"),
    supabase
      .from("cda_precincts")
      .select("id, code, name, canton, parish")
      .eq("is_enabled", true)
      .order("name"),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nueva Asignación</h1>
        <p className="text-muted-foreground">Asignar un miembro a un proceso electoral</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Asignación</CardTitle>
          <CardDescription>Complete los datos de la asignación</CardDescription>
        </CardHeader>
        <CardContent>
          <AssignmentForm
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
