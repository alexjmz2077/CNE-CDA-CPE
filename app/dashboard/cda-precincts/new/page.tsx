import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CDAPrecinctForm } from "@/components/cda-precinct-form"

export default function NewCDAPrecinctPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nuevo CDA</h1>
        <p className="text-muted-foreground">Registre un nuevo recinto CDA y su información de contacto</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del CDA</CardTitle>
          <CardDescription>Complete la información requerida</CardDescription>
        </CardHeader>
        <CardContent>
          <CDAPrecinctForm />
        </CardContent>
      </Card>
    </div>
  )
}