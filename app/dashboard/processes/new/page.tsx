import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProcessForm } from "@/components/process-form"

export default function NewProcessPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo Proceso Electoral</h1>
        <p className="text-muted-foreground">Registrar un nuevo proceso electoral</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Proceso</CardTitle>
          <CardDescription>Complete los datos del proceso electoral</CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessForm />
        </CardContent>
      </Card>
    </div>
  )
}
