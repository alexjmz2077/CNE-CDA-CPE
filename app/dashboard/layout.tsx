// app/dashboard/layout.tsx (SIN "use client")
import { createClient } from "@/lib/supabase/server"
import { NavSidebar } from "@/components/nav-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex h-screen">
      <NavSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Le pasas el usuario como prop al header */}
        <DashboardHeader user={user} /> 
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  )
}