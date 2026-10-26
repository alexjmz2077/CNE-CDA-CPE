"use client"

import { type AssignmentSelectionItem } from "@/components/assignment-selection-list"
import { CredentialsExportDialog } from "@/components/credentials-export-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, File, IdCard } from "lucide-react"
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils"
import { exportCredentials } from "@/lib/export-credentials"
import { getAssignmentRoleLabel } from "@/lib/assignment-utils"
import { useMemo, useState } from "react"

type ExportButtonsProps = {
  data: any[]
  filename: string
  title: string
  enableCredentials?: boolean
  processImageUrl?: string | null
}

export function ExportButtons({ 
  data, 
  filename, 
  title, 
  enableCredentials = false,
  processImageUrl 
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [credentialsOpen, setCredentialsOpen] = useState(false)

  const assignmentSelectionItems = useMemo<AssignmentSelectionItem[]>(
    () =>
      data.map((item, index) => {
        const member = item.members
        const memberType =
          item.member_type === "CDA" ? "CDA" : item.member_type === "CPE" ? "CPE" : ""
        const role = item.role
          ? getAssignmentRoleLabel(item.member_type, item.role)
          : item.member_type || ""
        const precinct =
          memberType === "CDA"
            ? [item.cda_precincts?.name, item.cda_precincts?.canton, item.cda_precincts?.parish]
                .filter(Boolean)
                .join(" / ") || null
            : null

        return {
          id: String(item.id ?? `assignment-${index}`),
          name: [member?.second_name, member?.name].filter(Boolean).join(" ") || "Sin nombre",
          cedula: member?.cedula || "",
          memberType,
          role,
          precinct,
        }
      }),
    [data],
  )

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    setIsExporting(true)
    try {
      const isAssignmentData = data.length > 0 && data[0].members !== undefined
      
      let processedDataForTable
      
      if (isAssignmentData) {
        processedDataForTable = data.map((item) => {
          const rol = getAssignmentRoleLabel(item.member_type, item.role)
          const recinto =
            item.member_type === "CDA"
              ? [item.cda_precincts?.name, item.cda_precincts?.canton, item.cda_precincts?.parish]
                  .filter(Boolean)
                  .join(" / ") || "N/A"
              : "N/A"

          return {
            "Cédula": item.members?.cedula || "",
            "Miembro": `${item.members?.name || ""} ${item.members?.second_name || ""}`.trim(),
            "Teléfono": item.members?.phone || "N/A",
            "Tipo": item.member_type,
            "Rol": rol,
            "Recinto": recinto,
          }
        })
      } else {
        processedDataForTable = data
      }

      switch (format) {
        case "csv":
          exportToCSV(processedDataForTable, filename)
          break
        case "xlsx":
          await exportToExcel(processedDataForTable, filename)
          break
        case "pdf":
          await exportToPDF(processedDataForTable, filename, title)
          break
      }
    } catch (error) {
      console.error("Error exporting:", error)
      alert("Error al exportar los datos")
    } finally {
      setIsExporting(false)
    }
  }

  const handleCredentialsExport = async (selectedIds: string[]) => {
    if (!selectedIds.length) return

    setIsExporting(true)
    try {
      const selectedIdSet = new Set(selectedIds)
      const selectedRows = data.filter((item, index) =>
        selectedIdSet.has(String(item.id ?? `assignment-${index}`)),
      )

      const credentialsData = selectedRows.map((item) => ({
        name: item.members?.name || "",
        secondName: item.members?.second_name || "",
        cedula: item.members?.cedula || "",
        role: item.role
          ? getAssignmentRoleLabel(item.member_type, item.role)
          : item.member_type || "",
      }))

      await exportCredentials(credentialsData, title, processImageUrl)
      setCredentialsOpen(false)
    } catch (error) {
      console.error("Error exporting credentials:", error)
      alert("Error al exportar las credenciales")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent" disabled={isExporting || data.length === 0}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {enableCredentials && (
            <DropdownMenuItem onClick={() => setCredentialsOpen(true)}>
              <IdCard className="mr-2 h-4 w-4" />
              Exportar Credenciales
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleExport("csv")}>
            <File className="mr-2 h-4 w-4" />
            Listado CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("xlsx")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Listado Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            Listado PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {enableCredentials ? (
        <CredentialsExportDialog
          open={credentialsOpen}
          onOpenChange={setCredentialsOpen}
          items={assignmentSelectionItems}
          isExporting={isExporting}
          onExport={handleCredentialsExport}
        />
      ) : null}
    </>
  )
}
