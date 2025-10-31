import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MemberForm } from "@/components/member-form"

export default function NewMemberPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Personal</h1>
        <p className="text-muted-foreground">Registrar a nuevo personal </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Miembro</CardTitle>
          <CardDescription>Complete los datos del miembro</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm />
        </CardContent>
      </Card>
    </div>
  )
}
