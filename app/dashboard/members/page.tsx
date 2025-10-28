import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { MemberTable } from "@/components/member-table"
import { ExportButtons } from "@/components/export-buttons"

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase.from("members").select("*").order("created_at", { ascending: false })

  if (params.type && (params.type === "CPE" || params.type === "CDA")) {
    query = query.eq("member_type", params.type)
  }

  const { data: members, error } = await query

  const exportData =
    members?.map((m) => ({
      Cédula: m.cedula,
      Nombre: m.name,
      Tipo: m.member_type,
      Teléfono: m.phone || "-",
      Email: m.email || "-",
      Dirección: m.address || "-",
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Miembros</h1>
          <p className="text-muted-foreground">Gestión de miembros CPE y CDA</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={exportData} filename="miembros" title="Lista de Miembros CPE/CDA" />
          <Link href="/dashboard/members/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Miembro
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Miembros</CardTitle>
          <CardDescription>Todos los miembros registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-destructive">Error al cargar los miembros</div>
          ) : (
            <MemberTable members={members || []} currentFilter={params.type} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
