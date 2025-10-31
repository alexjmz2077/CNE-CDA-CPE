"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberTable } from "@/components/member-table";
import { ExportButtons } from "@/components/export-buttons";

type Member = {
  id: string;
  cedula: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("members")
        .select("id, cedula, name, phone, email, address, created_at")
        .order("name");

      if (!error && data) {
        setMembers(data);
        setFilteredMembers(data);
      }
      setIsLoading(false);
    };

    fetchMembers();
  }, []);

  const exportData = filteredMembers.map((member) => ({
    Cédula: member.cedula,
    Nombre: member.name,
    Teléfono: member.phone || "-",
    Email: member.email || "-",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personal</h1>
          <p className="text-muted-foreground">Gestión de miembros del equipo electoral</p>
        </div>
        <div className="flex gap-2">
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
