"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButtons } from "@/components/export-buttons"
import { CDAPrecinctTable, PrecinctRow } from "@/components/cda-precinct-table"
import { CDAPrecinctFilters } from "@/components/cda-precinct-filters"

type StatusFilter = "ALL" | "ENABLED" | "DISABLED"

type CDAPrecinctsContentProps = {
  precincts: PrecinctRow[]
  error?: string | null
}

export function CDAPrecinctsContent({ precincts, error }: CDAPrecinctsContentProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")

  const filteredPrecincts = useMemo(() => {
    if (statusFilter === "ALL") {
      return precincts
    }
    return precincts.filter((precinct) =>
      statusFilter === "ENABLED" ? precinct.is_enabled : !precinct.is_enabled,
    )
  }, [precincts, statusFilter])

  const exportData = useMemo(
    () =>
      filteredPrecincts.map((precinct) => ({
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
      })),
    [filteredPrecincts],
  )

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

      <CDAPrecinctFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />

      <Card>
        <CardHeader>
          <CardTitle>Listado de CDA</CardTitle>
          <CardDescription>Centros registrados y contactos asociados</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Error al cargar los CDA</p>
          ) : (
            <CDAPrecinctTable precincts={filteredPrecincts} statusFilter={statusFilter} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}