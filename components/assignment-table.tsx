"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useMemo, useState, useEffect } from "react"
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

type Assignment = {
  id: string
  process_id: string
  member_id: string
  member_type: "CPE" | "CDA"
  role: string | null
  cda_precinct_id: string | null
  cda_precincts?: {
    id: string
    name: string
    canton: string | null
    parish: string | null
  } | null
  created_at: string
  electoral_processes: {
    id: string
    name: string
  }
  members: {
    id: string
    name: string
    second_name: string | null
    cedula: string
    phone: string | null
  }
}

const CPE_ROLE_LABELS: Record<string, string> = {
  Supervisor: "Supervisor",
  Revisor: "Revisor de Firmas",
  Digitador: "Digitador",
  Archivador: "Archivo de Actas",
  Receptor: "Receptor de Actas",
  Operador: "Operador de Escáner",
  Administrador: "Administrador Técnico Provincial",
}

type AssignmentTableProps = {
  assignments: Assignment[]
  onFilteredAssignmentsChange?: (filtered: Assignment[]) => void
}

export function AssignmentTable({ assignments, onFilteredAssignmentsChange }: AssignmentTableProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<Array<{ key: "member" | "cedula" | "phone" | "type" | "role"; order: "asc" | "desc" }>>([
    { key: "member", order: "asc" }
  ])

  const handleSort = (key: "member" | "cedula" | "phone" | "type" | "role", ctrlKey: boolean = false) => {
    setSortConfig((current) => {
      const existingIndex = current.findIndex(sort => sort.key === key)
      
      if (!ctrlKey) {
        // Sin Ctrl: ordenar solo por esta columna
        if (existingIndex === 0 && current.length === 1) {
          // Si es la única columna, alternar orden
          return [{ key, order: current[0].order === "asc" ? "desc" : "asc" }]
        }
        // Nueva columna o cambiar a solo esta
        return [{ key, order: "asc" }]
      } else {
        // Con Ctrl: multi-columna
        if (existingIndex !== -1) {
          // Si ya existe, alternar su orden
          const newConfig = [...current]
          newConfig[existingIndex] = {
            ...newConfig[existingIndex],
            order: newConfig[existingIndex].order === "asc" ? "desc" : "asc"
          }
          return newConfig
        } else {
          // Agregar nueva columna al final
          return [...current, { key, order: "asc" }]
        }
      }
    })
  }

  const getFullName = (member: { name: string; second_name: string | null }) => {
    return [member.second_name, member.name].filter(Boolean).join(" ")
  }

  const getComparableValue = (assignment: Assignment, key: "member" | "cedula" | "phone" | "type" | "role") => {
    switch (key) {
      case "member":
        return getFullName(assignment.members)
      case "cedula":
        return assignment.members.cedula ?? ""
      case "phone":
        return assignment.members.phone ?? ""
      case "type":
        return assignment.member_type ?? ""
      case "role":
        return assignment.member_type === "CPE" ? assignment.role ?? "" : assignment.cda_precincts?.name ?? ""
      default:
        return ""
    }
  }

  const getRoleLabel = (role: string | null): string => {
    if (!role) return "Sin rol"
    return CPE_ROLE_LABELS[role] || role
  }

  const filteredAndSortedAssignments = useMemo(() => {
    // Primero filtrar por búsqueda
    let filtered = assignments
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = assignments.filter((assignment) => {
        const fullName = getFullName(assignment.members).toLowerCase()
        const cedula = assignment.members?.cedula?.toLowerCase() || ""
        const phone = assignment.members?.phone?.toLowerCase() || ""
        const type = assignment.member_type?.toLowerCase() || ""
        const role = assignment.member_type === "CPE" 
          ? getRoleLabel(assignment.role).toLowerCase()
          : assignment.cda_precincts?.name?.toLowerCase() || ""
        const location = assignment.member_type === "CDA"
          ? `${assignment.cda_precincts?.canton || ""} ${assignment.cda_precincts?.parish || ""}`.toLowerCase()
          : ""

        return (
          fullName.includes(term) ||
          cedula.includes(term) ||
          phone.includes(term) ||
          type.includes(term) ||
          role.includes(term) ||
          location.includes(term)
        )
      })
    }

    // Luego ordenar con multi-columna
    const sorted = [...filtered].sort((a, b) => {
      for (const sort of sortConfig) {
        const aValue = getComparableValue(a, sort.key)
        const bValue = getComparableValue(b, sort.key)
        
        const comparison = sort.order === "asc"
          ? aValue.localeCompare(bValue, "es", { sensitivity: "base" })
          : bValue.localeCompare(aValue, "es", { sensitivity: "base" })
        
        if (comparison !== 0) {
          return comparison
        }
      }
      return 0
    })
    return sorted
  }, [assignments, sortConfig, searchTerm])

  // Notificar al padre cuando cambien las asignaciones filtradas
  useEffect(() => {
    if (onFilteredAssignmentsChange) {
      onFilteredAssignmentsChange(filteredAndSortedAssignments)
    }
  }, [filteredAndSortedAssignments, onFilteredAssignmentsChange])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("assignments").delete().eq("id", deleteId)

    if (error) {
      alert("Error al eliminar la asignación")
    } else {
      router.refresh()
    }
    setIsDeleting(false)
    setDeleteId(null)
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay asignaciones registradas</p>
        <Link href="/dashboard/assignments/new">
          <Button className="mt-4">Crear Primera Asignación</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono, tipo o rol/recinto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          💡 Mantén presionado Ctrl/Cmd al hacer clic en los encabezados para ordenar por múltiples columnas
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={(e) => handleSort("member", e.ctrlKey || e.metaKey)}
                  className="flex items-center gap-1 font-medium"
                >
                  Miembro
                  {sortConfig.find(s => s.key === "member") && (
                    <span className="text-xs">
                      {sortConfig.find(s => s.key === "member")?.order === "asc" ? "↑" : "↓"}
                      {sortConfig.length > 1 && (
                        <sup className="ml-0.5">{sortConfig.findIndex(s => s.key === "member") + 1}</sup>
                      )}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={(e) => handleSort("cedula", e.ctrlKey || e.metaKey)}
                  className="flex items-center gap-1 font-medium"
                >
                  Cédula
                  {sortConfig.find(s => s.key === "cedula") && (
                    <span className="text-xs">
                      {sortConfig.find(s => s.key === "cedula")?.order === "asc" ? "↑" : "↓"}
                      {sortConfig.length > 1 && (
                        <sup className="ml-0.5">{sortConfig.findIndex(s => s.key === "cedula") + 1}</sup>
                      )}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={(e) => handleSort("phone", e.ctrlKey || e.metaKey)}
                  className="flex items-center gap-1 font-medium"
                >
                  Teléfono
                  {sortConfig.find(s => s.key === "phone") && (
                    <span className="text-xs">
                      {sortConfig.find(s => s.key === "phone")?.order === "asc" ? "↑" : "↓"}
                      {sortConfig.length > 1 && (
                        <sup className="ml-0.5">{sortConfig.findIndex(s => s.key === "phone") + 1}</sup>
                      )}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={(e) => handleSort("type", e.ctrlKey || e.metaKey)}
                  className="flex items-center gap-1 font-medium"
                >
                  Tipo
                  {sortConfig.find(s => s.key === "type") && (
                    <span className="text-xs">
                      {sortConfig.find(s => s.key === "type")?.order === "asc" ? "↑" : "↓"}
                      {sortConfig.length > 1 && (
                        <sup className="ml-0.5">{sortConfig.findIndex(s => s.key === "type") + 1}</sup>
                      )}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={(e) => handleSort("role", e.ctrlKey || e.metaKey)}
                  className="flex items-center gap-1 font-medium"
                >
                  Rol/Recinto
                  {sortConfig.find(s => s.key === "role") && (
                    <span className="text-xs">
                      {sortConfig.find(s => s.key === "role")?.order === "asc" ? "↑" : "↓"}
                      {sortConfig.length > 1 && (
                        <sup className="ml-0.5">{sortConfig.findIndex(s => s.key === "role") + 1}</sup>
                      )}
                    </span>
                  )}
                </button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron resultados para "{searchTerm}"
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{getFullName(assignment.members)}</TableCell>
                  <TableCell className="font-mono text-sm">{assignment.members.cedula}</TableCell>
                  <TableCell className="text-sm">{assignment.members.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={assignment.member_type === "CPE" ? "default" : "secondary"}>
                      {assignment.member_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignment.member_type === "CPE" ? (
                      <span className="text-sm">{getRoleLabel(assignment.role)}</span>
                    ) : (
                      <div className="text-sm">
                        <p className="font-medium">{assignment.cda_precincts?.name ?? "Sin recinto"}</p>
                        <p className="text-xs text-muted-foreground">
                          {[assignment.cda_precincts?.canton, assignment.cda_precincts?.parish]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </p>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/assignments/${assignment.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(assignment.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la asignación del miembro al proceso electoral.
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
