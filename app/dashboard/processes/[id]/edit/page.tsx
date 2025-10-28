import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcessForm } from "@/components/process-form"
import { notFound } from "next/navigation"

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: process, error } = await supabase.from("electoral_processes").select("*").eq("id", id).single()

  if (error || !process) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Proceso Electoral</h1>
        <p className="text-muted-foreground">Actualizar información del proceso</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Proceso</CardTitle>
          <CardDescription>Modifique los datos del proceso electoral</CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessForm process={process} />
        </CardContent>
      </Card>
    </div>
  )
}
