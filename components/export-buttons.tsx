"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, File, IdCard } from "lucide-react"
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils"
import { exportCredentials } from "@/lib/export-credentials"
import { useState } from "react"

type ExportButtonsProps = {
  data: any[]
  filename: string
  title: string
  enableCredentials?: boolean
}

export function ExportButtons({ data, filename, title, enableCredentials = false }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: "csv" | "xlsx" | "pdf" | "credentials") => {
    setIsExporting(true)
    try {
      switch (format) {
        case "csv":
          exportToCSV(data, filename)
          break
        case "xlsx":
          await exportToExcel(data, filename)
          break
        case "pdf":
          await exportToPDF(data, filename, title)
          break
        case "credentials":
          const credentialsData = data.map((item) => ({
            name: item.members?.name || "",
            secondName: item.members?.second_name || "",
            cedula: item.members?.cedula || "",
            role: item.role || item.member_type || "",
          }))
          await exportCredentials(credentialsData, title)
          break
      }
    } catch (error) {
      console.error("Error exporting:", error)
      alert("Error al exportar los datos")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent" disabled={isExporting || data.length === 0}>
          <Download className="h-4 w-4" />
          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {enableCredentials && (
          <DropdownMenuItem onClick={() => handleExport("credentials")}>
            <IdCard className="mr-2 h-4 w-4" />
            Exportar Credenciales
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <File className="mr-2 h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
