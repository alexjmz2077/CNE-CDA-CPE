"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, File } from "lucide-react"
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils"
import { useState } from "react"

type ExportButtonsProps = {
  data: any[]
  filename: string
  title: string
}

export function ExportButtons({ data, filename, title }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
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
