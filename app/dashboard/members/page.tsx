"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberTable } from "@/components/member-table";
import { ExportButtons } from "@/components/export-buttons";
import { BulkImportButton } from "@/components/bulk-import/bulk-import-button";

const MEMBER_COLUMNS = "id, cedula, name, second_name, phone, email, address, created_at";
const FETCH_BATCH_SIZE = 1000;

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

type PageSize = number | "all";
type MemberSortKey = "created_at" | "cedula" | "name";
type MemberSortOrder = "asc" | "desc";
type MemberSortConfig = { key: MemberSortKey; order: MemberSortOrder };

function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .replace(/[^0-9a-zA-ZáéíóúÁÉÍÓÚñÑüÜ@.+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function buildMembersQuery(search: string, sortConfig: MemberSortConfig) {
  const supabase = createClient();
  let query = supabase.from("members").select(MEMBER_COLUMNS, { count: "exact" });

  const tokens = normalizeSearchTerm(search).split(" ").filter(Boolean).slice(0, 5);

  for (const token of tokens) {
    query = query.or(
      [
        `cedula.ilike.%${token}%`,
        `name.ilike.%${token}%`,
        `second_name.ilike.%${token}%`,
        `phone.ilike.%${token}%`,
        `email.ilike.%${token}%`,
      ].join(","),
    );
  }

  const ascending = sortConfig.order === "asc";

  if (sortConfig.key === "name") {
    query = query
      .order("second_name", { ascending, nullsFirst: false })
      .order("name", { ascending, nullsFirst: false });
  } else {
    query = query.order(sortConfig.key, { ascending, nullsFirst: false });
  }

  return query.order("id", { ascending: true });
}

async function fetchMembersPage(
  search: string,
  sortConfig: MemberSortConfig,
  page: number,
  pageSize: PageSize,
) {
  if (pageSize === "all") {
    const rows: Member[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await buildMembersQuery(search, sortConfig).range(
        from,
        from + FETCH_BATCH_SIZE - 1,
      );

      if (error) throw error;

      const batch = (data ?? []) as Member[];
      rows.push(...batch);

      if (batch.length < FETCH_BATCH_SIZE) break;
      from += FETCH_BATCH_SIZE;
    }

    return { rows, total: rows.length };
  }

  const from = page * pageSize;
  const { data, error, count } = await buildMembersQuery(search, sortConfig).range(
    from,
    from + pageSize - 1,
  );

  if (error) throw error;

  return { rows: (data ?? []) as Member[], total: count ?? 0 };
}

function toExportRow(member: Member) {
  return {
    Cédula: member.cedula,
    Apellidos: member.second_name || "-",
    Nombres: member.name,
    Teléfono: member.phone || "-",
    Email: member.email || "-",
  };
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [sortConfig, setSortConfig] = useState<MemberSortConfig>({
    key: "created_at",
    order: "desc",
  });
  const [reloadToken, setReloadToken] = useState(0);

  const isSearchPending = searchTerm !== debouncedSearch;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    if (isSearchPending) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetchMembersPage(debouncedSearch, sortConfig, page, pageSize)
      .then(({ rows, total }) => {
        if (cancelled) return;

        const lastPage = pageSize === "all" ? 0 : Math.max(0, Math.ceil(total / pageSize) - 1);

        if (page > lastPage) {
          setPage(lastPage);
          if (total === 0) {
            setMembers([]);
            setTotalCount(0);
          }
          return;
        }

        setMembers(rows);
        setTotalCount(total);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los miembros");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, isSearchPending, page, pageSize, reloadToken, sortConfig]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(0);
  }, []);

  const handleSortChange = useCallback((key: MemberSortKey) => {
    setSortConfig((current) =>
      current.key === key
        ? { key, order: current.order === "asc" ? "desc" : "asc" }
        : { key, order: key === "created_at" ? "desc" : "asc" },
    );
    setPage(0);
  }, []);

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(value === "all" ? "all" : Number(value));
    setPage(0);
  }, []);

  const handleReload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const handleBulkImported = useCallback(() => {
    setPage(0);
    handleReload();
  }, [handleReload]);

  const exportData = useMemo(() => members.map(toExportRow), [members]);

  const fetchExportData = useCallback(async () => {
    const { rows } = await fetchMembersPage(debouncedSearch, sortConfig, 0, "all");
    return rows.map(toExportRow);
  }, [debouncedSearch, sortConfig]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personal</h1>
          <p className="text-muted-foreground">Gestión de miembros del equipo electoral</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkImportButton moduleId="members" onImported={handleBulkImported} />
          <ExportButtons
            data={exportData}
            fetchData={fetchExportData}
            filename="personal"
            title="Lista de Personal"
          />
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
          <CardDescription>
            Consulta, busca y administra los miembros registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </div>
          ) : null}

          <MemberTable
            members={members}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            searchTerm={searchTerm}
            sortConfig={sortConfig}
            isLoading={isLoading}
            onSearchChange={handleSearchChange}
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onDeleted={handleReload}
          />
        </CardContent>
      </Card>
    </div>
  );
}
