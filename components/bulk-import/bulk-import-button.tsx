"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getBulkImportModule } from "@/lib/bulk-import"
import type { BulkImportModuleId } from "@/lib/bulk-import/types"
import { BulkImportDialog } from "./bulk-import-dialog"

type BulkImportButtonProps = {
  moduleId: BulkImportModuleId
  onImported?: () => void
  label?: string
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}

export function BulkImportButton({
  moduleId,
  onImported,
  label = "Carga masiva",
  className,
  variant = "outline",
  size,
}: BulkImportButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const bulkImportModule = getBulkImportModule(moduleId)

  const handleImported = () => {
    if (onImported) {
      onImported()
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title="Importar registros desde un archivo de Excel"
      >
        <Upload className="h-4 w-4" />
        {label}
      </Button>

      <BulkImportDialog
        module={bulkImportModule}
        open={open}
        onOpenChange={setOpen}
        onImported={handleImported}
      />
    </>
  )
}
