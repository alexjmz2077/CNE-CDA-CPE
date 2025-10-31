"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2 } from "lucide-react"

type Contact = {
  rector_name: string
  rector_phone: string | null
  rector_email: string | null
  keys_name: string | null
  keys_phone: string | null
}

export type PrecinctRow = {
  id: string
  code: string
  name: string
  canton: string
  parish: string
  address: string
  is_enabled: boolean
  contact: Contact | null
}

type StatusFilter = "ALL" | "ENABLED" | "DISABLED"

export function CDAPrecinctTable({ precincts, statusFilter }: { precincts: PrecinctRow[]; statusFilter?: StatusFilter }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: "code" | "name" | "location"; order: "asc" | "desc" }>({
    key: "code",
    order: "asc",
  })

  const handleSort = (key: "code" | "name" | "location") => {
    setSortConfig((current) =>
      current.key === key ? { key, order: current.order === "asc" ? "desc" : "asc" } : { key, order: "asc" },
    )
  }

  const getComparableValue = (precinct: PrecinctRow) => {
    switch (sortConfig.key) {
      case "code":
        return precinct.code ?? ""
      case "name":
        return precinct.name ?? ""
      case "location":
        return `${precinct.canton ?? ""} ${precinct.parish ?? ""}`
      default:
        return ""
    }
  }

  const sortedPrecincts = useMemo(() => {
    const sorted = [...precincts].sort((a, b) => {
      const aValue = getComparableValue(a).toLowerCase()
      const bValue = getComparableValue(b).toLowerCase()
      return sortConfig.order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })
    return sorted
  }, [precincts, sortConfig])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("cda_precincts").delete().eq("id", deleteId)

    if (error) {
      alert("Error al eliminar el CDA")
    } else {
      router.refresh()
    }

    setIsDeleting(false)
    setDeleteId(null)
  }

  if (precincts.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No hay CDA registrados.</p>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button type="button" onClick={() => handleSort("code")} className="flex items-center gap-1 font-medium">
                  Código
                  <span className="text-xs text-muted-foreground">
                    {sortConfig.key === "code" ? (sortConfig.order === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => handleSort("name")} className="flex items-center gap-1 font-medium">
                  Nombre
                  <span className="text-xs text-muted-foreground">
                    {sortConfig.key === "name" ? (sortConfig.order === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("location")}
                  className="flex items-center gap-1 font-medium"
                >
                  Cantón / Parroquia
                  <span className="text-xs text-muted-foreground">
                    {sortConfig.key === "location" ? (sortConfig.order === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Rector</TableHead>
              <TableHead>Llaves</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPrecincts.map((precinct) => (
              <TableRow key={precinct.id}>
                <TableCell className="font-medium">{precinct.code}</TableCell>
                <TableCell>{precinct.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{precinct.canton}</p>
                    <p className="text-muted-foreground">{precinct.parish}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs text-sm">{precinct.address}</TableCell>
                <TableCell>
                  <Badge variant={precinct.is_enabled ? "default" : "secondary"}>
                    {precinct.is_enabled ? "Habilitado" : "Deshabilitado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {precinct.contact ? (
                    <>
                      <p>{precinct.contact.rector_name}</p>
                      {precinct.contact.rector_phone && (
                        <p className="text-muted-foreground">{precinct.contact.rector_phone}</p>
                      )}
                      {precinct.contact.rector_email && (
                        <p className="text-muted-foreground">{precinct.contact.rector_email}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sin datos</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {precinct.contact?.keys_name ? (
                    <>
                      <p>{precinct.contact.keys_name}</p>
                      {precinct.contact.keys_phone && (
                        <p className="text-muted-foreground">{precinct.contact.keys_phone}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sin datos</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/cda-precincts/${precinct.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(precinct.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar CDA?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción quitará el recinto y sus contactos asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}