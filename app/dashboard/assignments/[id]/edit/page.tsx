import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentForm } from "@/components/assignment-form"
import { notFound } from "next/navigation"

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: assignment }, { data: processes }, { data: members }] = await Promise.all([
    supabase.from("assignments").select("*, members(member_type)").eq("id", id).single(),
    supabase.from("electoral_processes").select("id, name").order("name"),
    supabase.from("members").select("id, name, cedula, member_type").order("name"),
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
          <AssignmentForm assignment={assignment} processes={processes || []} members={members || []} />
        </CardContent>
      </Card>
    </div>
  )
}
