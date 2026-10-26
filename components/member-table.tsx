"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
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
  second_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

type MemberSortKey = "created_at" | "cedula" | "name"
type MemberSortOrder = "asc" | "desc"
type PageSize = number | "all"

type MemberTableProps = {
  members: Member[]
  totalCount: number
  page: number
  pageSize: PageSize
  searchTerm: string
  sortConfig: { key: MemberSortKey; order: MemberSortOrder }
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onSortChange: (key: MemberSortKey) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (value: string) => void
  onDeleted?: () => void
}

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export function MemberTable({
  members,
  totalCount,
  page,
  pageSize,
  searchTerm,
  sortConfig,
  isLoading = false,
  onSearchChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onDeleted,
}: MemberTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getFullName = (member: Member) => {
    return [member.second_name, member.name].filter(Boolean).join(" ")
  }

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)))
  const firstItem =
    totalCount === 0 ? 0 : pageSize === "all" ? 1 : Math.min(page * pageSize + 1, totalCount)
  const lastItem =
    pageSize === "all" ? totalCount : Math.min(totalCount, (page + 1) * pageSize)
  const showPagination = pageSize !== "all" && totalPages > 1
  const showInitialLoading = isLoading && members.length === 0
  const showUpdating = isLoading && members.length > 0
  const recordLabel = totalCount === 1 ? "registro" : "registros"

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("members").delete().eq("id", deleteId)

    if (error) {
      alert("Error al eliminar el miembro")
    } else {
      setDeleteId(null)
      onDeleted?.()
    }
    setIsDeleting(false)
  }

  const renderSortIndicator = (key: MemberSortKey) => {
    if (sortConfig.key !== key) return ""
    return sortConfig.order === "asc" ? "↑" : "↓"
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cédula, nombre, apellido, teléfono o email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-muted-foreground">Mostrar</span>
          <Select value={String(pageSize)} onValueChange={onPageSizeChange}>
            <SelectTrigger className="w-[130px]" aria-label="Registros por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 registros</SelectItem>
              <SelectItem value="20">20 registros</SelectItem>
              <SelectItem value="50">50 registros</SelectItem>
              <SelectItem value="100">100 registros</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          {showUpdating ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">Cargando…</span>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => onSortChange("cedula")}
                  className="flex items-center gap-1 font-medium"
                >
                  Cédula
                  <span className="text-xs text-muted-foreground">{renderSortIndicator("cedula")}</span>
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => onSortChange("name")}
                  className="flex items-center gap-1 font-medium"
                >
                  Nombre Completo
                  <span className="text-xs text-muted-foreground">{renderSortIndicator("name")}</span>
                </button>
              </TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => onSortChange("created_at")}
                  className="flex items-center gap-1 font-medium"
                >
                  Registrado
                  <span className="text-xs text-muted-foreground">
                    {renderSortIndicator("created_at")}
                  </span>
                </button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(showUpdating && "opacity-60 transition-opacity")}>
            {showInitialLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {searchTerm.trim() ? (
                    <>No se encontraron resultados para &quot;{searchTerm}&quot;</>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <span>No hay miembros registrados</span>
                      <Link href="/dashboard/members/new">
                        <Button size="sm">Registrar Primer Miembro</Button>
                      </Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono text-sm">{member.cedula}</TableCell>
                  <TableCell className="font-medium">{getFullName(member)}</TableCell>
                  <TableCell>{member.phone || "-"}</TableCell>
                  <TableCell>{member.email || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(member.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/members/${member.id}/edit`}>
                        <Button variant="ghost" size="sm" aria-label={`Editar ${getFullName(member)}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(member.id)}
                        aria-label={`Eliminar ${getFullName(member)}`}
                      >
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? "Sin registros"
            : pageSize === "all"
              ? totalCount === 1
                ? "Mostrando 1 registro"
                : `Mostrando los ${totalCount} registros`
              : `Mostrando ${firstItem}–${lastItem} de ${totalCount} ${recordLabel}`}
        </p>

        {showPagination ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 0 || isLoading}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages || isLoading}
              aria-label="Página siguiente"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
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
