import { createClient } from "@/lib/supabase/server"
import { AssignmentsContent } from "@/components/assignments-content"

type Assignment = {
  id: string
  process_id: string
  member_id: string
  member_type: "CPE" | "CDA"
  role: string | null
  cda_precinct_id: string | null
  cda_precincts: {
    id: string
    name: string
    canton: string | null
    parish: string | null
  } | null
  created_at: string
  electoral_processes: {
    id: string
    name: string
  }
  members: {
    id: string
    name: string
    second_name: string | null
    cedula: string
    phone: string | null
  }
}

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
  let assignmentsData: Assignment[] = []
  let assignmentsError: string | null = null

  if (selectedProcessId) {
    const { data, error } = await supabase
      .from("assignments")
      .select(
        `
        id,
        process_id,
        member_id,
        member_type,
        role,
        cda_precinct_id,
        created_at,
        electoral_processes (
          id,
          name
        ),
        members (
          id,
          name,
          second_name,
          cedula,
          phone
        ),
        cda_precincts (
          id,
          name,
          canton,
          parish
        )
      `,
      )
      .eq("process_id", selectedProcessId)
      .order("created_at", { ascending: false })

    if (data) {
      assignmentsData = data as any as Assignment[]
    }
    assignmentsError = error?.message || null
  }

  return (
    <AssignmentsContent
      processes={processes || []}
      selectedProcessId={selectedProcessId}
      assignments={assignmentsData}
      assignmentsError={assignmentsError}
      initialMemberType={initialMemberType}
    />
  )
}
