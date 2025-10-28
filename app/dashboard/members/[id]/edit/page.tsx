import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MemberForm } from "@/components/member-form"
import { notFound } from "next/navigation"

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: member, error } = await supabase.from("members").select("*").eq("id", id).single()

  if (error || !member) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar Miembro</h1>
        <p className="text-muted-foreground">Actualizar información del miembro</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Miembro</CardTitle>
          <CardDescription>Modifique los datos del miembro</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm member={member} />
        </CardContent>
      </Card>
    </div>
  )
}
