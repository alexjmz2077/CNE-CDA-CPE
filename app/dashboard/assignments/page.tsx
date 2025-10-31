import { createClient } from "@/lib/supabase/server"
import { AssignmentsContent } from "@/components/assignments-content"

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const supabase = await createClient()

  const selectedProcessId =
    typeof resolvedSearchParams.processId === "string" && resolvedSearchParams.processId.length
      ? resolvedSearchParams.processId
      : undefined

  const initialMemberType =
    typeof resolvedSearchParams.memberType === "string" &&
    (resolvedSearchParams.memberType === "CPE" || resolvedSearchParams.memberType === "CDA")
      ? (resolvedSearchParams.memberType as "CPE" | "CDA")
      : "ALL"

  // Fetch processes
  const { data: processes, error: processesError } = await supabase
    .from("electoral_processes")
    .select("id, name")
    .order("start_date", { ascending: false })

  // Fetch assignments only if a process is selected
  let assignmentsData = []
  let assignmentsError = null

  if (selectedProcessId) {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        *,
        electoral_processes(id, name),
        members(id, name, cedula, phone),
        cda_precincts(id, name, canton, parish)
      `,
      )
      .eq("process_id", selectedProcessId)
      .order("created_at", { ascending: false })

    assignmentsData = data || []
    assignmentsError = error
  }

  return (
    <AssignmentsContent
      processes={processes || []}
      selectedProcessId={selectedProcessId}
      assignments={assignmentsData}
      assignmentsError={assignmentsError?.message}
      initialMemberType={initialMemberType}
    />
  )
}
