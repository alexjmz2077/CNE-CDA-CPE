"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BulkImportDialog } from "@/components/bulk-import/bulk-import-dialog"
import { getBulkImportModule } from "@/lib/bulk-import"
import type { BulkImportModuleId } from "@/lib/bulk-import/types"

const MODULE_IDS: BulkImportModuleId[] = [
  "members",
  "processes",
  "cda-precincts",
  "assignments",
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Range": "0-0/0",
    },
  })
}

export default function BulkImportPreviewPage() {
  const [moduleId, setModuleId] = useState<BulkImportModuleId>("members")
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)

    localStorage.setItem(
      "sb-example-auth-token",
      JSON.stringify({
        access_token: "preview-token",
        refresh_token: "preview-refresh",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "preview-user",
          aud: "authenticated",
          role: "authenticated",
          email: "preview@example.com",
        },
      }),
    )

    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input)

      if (!url.includes("example.supabase.co")) {
        return originalFetch(input, init)
      }

      const method = (
        init?.method ??
        (input instanceof Request ? input.method : "GET")
      ).toUpperCase()

      if (url.includes("/auth/v1/user")) {
        return jsonResponse({
          id: "preview-user",
          aud: "authenticated",
          role: "authenticated",
          email: "preview@example.com",
        })
      }

      if (url.includes("/rest/v1/members")) {
        if (method === "GET") {
          return jsonResponse([
            { id: "m-existing", cedula: "1234567890" },
          ])
        }
        return jsonResponse({}, 201)
      }

      if (url.includes("/rest/v1/cda_precincts")) {
        return jsonResponse([])
      }

      if (url.includes("/rest/v1/electoral_processes")) {
        return jsonResponse([{ id: "p1", name: "Elecciones Generales 2027" }])
      }

      if (url.includes("/rest/v1/assignments")) {
        return jsonResponse([])
      }

      return jsonResponse([], 200)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return (
    <div className="min-h-screen space-y-4 bg-slate-100 p-6">
      <div className="flex flex-wrap gap-2">
        {MODULE_IDS.map((id) => (
          <Button
            key={id}
            variant={id === moduleId ? "default" : "outline"}
            onClick={() => {
              setModuleId(id)
              setOpen(true)
            }}
          >
            {id}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Harness temporal de verificación visual para la carga masiva.
      </p>

      <BulkImportDialog
        module={getBulkImportModule(moduleId)}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}
