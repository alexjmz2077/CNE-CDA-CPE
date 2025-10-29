import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButtons } from "@/components/export-buttons"
import { CDAPrecinctTable, PrecinctRow } from "@/components/cda-precinct-table"

export default async function CDAPrecinctsPage() {
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
    .order("name")

  const precincts: PrecinctRow[] =
    data?.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      canton: item.canton,
      parish: item.parish,
      address: item.address,
      is_enabled: item.is_enabled,
      contact: item.cda_precinct_contacts?.[0]
        ? {
            rector_name: item.cda_precinct_contacts[0].rector_name,
            rector_phone: item.cda_precinct_contacts[0].rector_phone,
            rector_email: item.cda_precinct_contacts[0].rector_email,
            keys_name: item.cda_precinct_contacts[0].keys_name,
            keys_phone: item.cda_precinct_contacts[0].keys_phone,
          }
        : null,
    })) ?? []

  const exportData = precincts.map((precinct) => ({
    Código: precinct.code,
    Nombre: precinct.name,
    Cantón: precinct.canton,
    Parroquia: precinct.parish,
    Dirección: precinct.address,
    Habilitado: precinct.is_enabled ? "Sí" : "No",
    "Rector - Nombre": precinct.contact?.rector_name ?? "-",
    "Rector - Teléfono": precinct.contact?.rector_phone ?? "-",
    "Rector - Email": precinct.contact?.rector_email ?? "-",
    "Llaves - Nombre": precinct.contact?.keys_name ?? "-",
    "Llaves - Teléfono": precinct.contact?.keys_phone ?? "-",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recintos CDA</h1>
          <p className="text-muted-foreground">Gestione los centros de digitación avanzada</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={exportData} filename="recintos-cda" title="Recintos CDA" />
          <Link href="/dashboard/cda-precincts/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo CDA
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de CDA</CardTitle>
          <CardDescription>Centros registrados y contactos asociados</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Error al cargar los CDA</p>
          ) : (
            <CDAPrecinctTable precincts={precincts} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}