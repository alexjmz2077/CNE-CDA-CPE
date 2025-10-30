"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState, useMemo } from "react"
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

type Member = {
  id: string
  cedula: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

export function MemberTable({ members, currentFilter }: { members: Member[]; currentFilter?: string }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: "cedula" | "name"; order: "asc" | "desc" }>({
    key: "cedula",
    order: "asc",
  })

  const handleSort = (key: "cedula" | "name") => {
    setSortConfig((current) =>
      current.key === key ? { key, order: current.order === "asc" ? "desc" : "asc" } : { key, order: "asc" },
    )
  }

  const getComparableValue = (member: Member) => {
    switch (sortConfig.key) {
      case "cedula":
        return member.cedula ?? ""
      case "name":
        return member.name ?? ""
      default:
        return ""
    }
  }

  const sortedMembers = useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      const aValue = getComparableValue(a).toLowerCase()
      const bValue = getComparableValue(b).toLowerCase()
      return sortConfig.order === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
    })
    return sorted
  }, [members, sortConfig])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("members").delete().eq("id", deleteId)

    if (error) {
      alert("Error al eliminar el miembro")
    } else {
      router.refresh()
    }
    setIsDeleting(false)
    setDeleteId(null)
  }

  const handleFilterChange = (type: string | null) => {
    if (type) {
      router.push(`/dashboard/members?type=${type}`)
    } else {
      router.push("/dashboard/members")
    }
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay miembros registrados</p>
        <Link href="/dashboard/members/new">
          <Button className="mt-4">Registrar Primer Miembro</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("cedula")}
                  className="flex items-center gap-1 font-medium"
                >
                  Cédula
                  <span className="text-xs text-muted-foreground">
                    {sortConfig.key === "cedula" ? (sortConfig.order === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => handleSort("name")}
                  className="flex items-center gap-1 font-medium"
                >
                  Nombre
                  <span className="text-xs text-muted-foreground">
                    {sortConfig.key === "name" ? (sortConfig.order === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              </TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-mono text-sm">{member.cedula}</TableCell>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.phone || "-"}</TableCell>
                <TableCell>{member.email || "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/members/${member.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(member.id)}>
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
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el miembro y todas sus asignaciones asociadas.
            </AlertDialogDescription>
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
