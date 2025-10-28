import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentForm } from "@/components/assignment-form"

export default async function NewAssignmentPage() {
  const supabase = await createClient()

  const [{ data: processes }, { data: members }] = await Promise.all([
    supabase.from("electoral_processes").select("id, name").order("name"),
    supabase.from("members").select("id, name, cedula, member_type").order("name"),
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
          <AssignmentForm processes={processes || []} members={members || []} />
        </CardContent>
      </Card>
    </div>
  )
}
