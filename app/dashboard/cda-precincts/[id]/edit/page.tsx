import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CDAPrecinctForm } from "@/components/cda-precinct-form"

export default async function EditCDAPrecinctPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("cda_precincts")
    .select(
      `
      *,
      cda_precinct_contacts(
        id,
        rector_name,
        rector_phone,
        rector_email,
        keys_name,
        keys_phone
      )
    `,
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const contact = data.cda_precinct_contacts?.[0] ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Editar CDA</h1>
        <p className="text-muted-foreground">Actualice la información del recinto CDA</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del CDA</CardTitle>
          <CardDescription>Modifique los campos necesarios</CardDescription>
        </CardHeader>
        <CardContent>
          <CDAPrecinctForm
            precinct={{
              id: data.id,
              code: data.code,
              name: data.name,
              canton: data.canton,
              parish: data.parish,
              address: data.address,
              is_enabled: data.is_enabled,
            }}
            contact={
              contact
                ? {
                    id: contact.id,
                    rector_name: contact.rector_name,
                    rector_phone: contact.rector_phone,
                    rector_email: contact.rector_email,
                    keys_name: contact.keys_name,
                    keys_phone: contact.keys_phone,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}