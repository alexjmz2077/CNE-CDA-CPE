"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
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
  role: string | null
  precinct: string | null
  created_at: string
  electoral_processes: {
    id: string
    name: string
  }
  members: {
    id: string
    name: string
    cedula: string
    member_type: "CPE" | "CDA"
  }
}

export function AssignmentTable({ assignments }: { assignments: Assignment[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proceso Electoral</TableHead>
              <TableHead>Miembro</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Rol/Recinto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">{assignment.electoral_processes.name}</TableCell>
                <TableCell>{assignment.members.name}</TableCell>
                <TableCell className="font-mono text-sm">{assignment.members.cedula}</TableCell>
                <TableCell>
                  <Badge variant={assignment.members.member_type === "CPE" ? "default" : "secondary"}>
                    {assignment.members.member_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {assignment.members.member_type === "CPE" ? (
                    <span className="text-sm">{assignment.role}</span>
                  ) : (
                    <span className="text-sm">Recinto: {assignment.precinct}</span>
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
            ))}
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
