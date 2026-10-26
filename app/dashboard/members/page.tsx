"use client";

import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberTable } from "@/components/member-table";
import { ExportButtons } from "@/components/export-buttons";
import { BulkImportButton } from "@/components/bulk-import/bulk-import-button";

type Member = {
  id: string;
  cedula: string;
  name: string;
  second_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMembers = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("members")
      .select("id, cedula, name, second_name, phone, email, address, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMembers(data);
      setFilteredMembers(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const exportData = filteredMembers.map((member) => ({
    Cédula: member.cedula,
    Apellidos: member.second_name || "-",
    Nombres: member.name,
    Teléfono: member.phone || "-",
    Email: member.email || "-",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personal</h1>
          <p className="text-muted-foreground">Gestión de miembros del equipo electoral</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImportButton
            moduleId="members"
            onImported={() => void loadMembers(false)}
          />
          <ExportButtons data={exportData} filename="personal" title="Lista de Personal" />
          <Link href="/dashboard/members/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Miembro
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Miembros</CardTitle>
          <CardDescription>Todos los miembros registrados en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Cargando...</p>
          ) : (
            <MemberTable members={members} onFilteredMembersChange={setFilteredMembers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
