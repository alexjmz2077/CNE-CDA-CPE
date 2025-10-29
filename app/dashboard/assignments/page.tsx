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

  const { data: processesData } = await supabase
    .from("electoral_processes")
    .select("id, name")
    .order("created_at", { ascending: false })

  const processes = processesData ?? []

  let assignments: any[] = []
  let assignmentsError: string | null = null

  if (selectedProcessId) {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        *,
        electoral_processes(id, name),
        members(id, name, cedula),
        cda_precincts(id, name, canton, parish)
      `,
      )
      .eq("process_id", selectedProcessId)
      .order("created_at", { ascending: false })

    assignments = data ?? []
    assignmentsError = error?.message ?? null
  }

  return (
    <AssignmentsContent
      processes={processes}
      selectedProcessId={selectedProcessId}
      assignments={assignments}
      assignmentsError={assignmentsError}
      initialMemberType={initialMemberType}
    />
  )
}
