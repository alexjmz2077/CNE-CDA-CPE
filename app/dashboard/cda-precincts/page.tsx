import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportButtons } from "@/components/export-buttons"
import { PrecinctRow } from "@/components/cda-precinct-table"
import { CDAPrecinctsContent } from "@/components/cda-precincts-content"

export default async function CDAPrecinctsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("cda_precincts")
    .select(
      `
      *,
      cda_precinct_contacts(
        id,
        rector_name,
        rector_phone,
        rector_email,
        keys_name,
        keys_phone
      )
    `,
    )
    .order("name")

  const precincts: PrecinctRow[] =
    data?.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      canton: item.canton,
      parish: item.parish,
      address: item.address,
      is_enabled: item.is_enabled,
      contact: item.cda_precinct_contacts?.[0]
        ? {
            rector_name: item.cda_precinct_contacts[0].rector_name,
            rector_phone: item.cda_precinct_contacts[0].rector_phone,
            rector_email: item.cda_precinct_contacts[0].rector_email,
            keys_name: item.cda_precinct_contacts[0].keys_name,
            keys_phone: item.cda_precinct_contacts[0].keys_phone,
          }
        : null,
    })) ?? []

  return <CDAPrecinctsContent precincts={precincts} error={error?.message} />
}