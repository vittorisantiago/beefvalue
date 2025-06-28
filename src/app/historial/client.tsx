"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";

interface Quotation {
  id: string;
  created_at: string;
  business: { name: string };
  media_res_weight: number;
  usd_per_kg: number;
  dollar_rate: number;
  total_initial_usd: number;
  total_cuts_usd: number;
  difference_usd: number;
  difference_percentage: number;
}

export default function HistorialClient() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const router = useRouter();
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/"; // Redirige si no hay sesión
        return;
      }

      const userId = session.user.id;

      // Obtener permisos del usuario
      const { data: groupData, error: groupError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", userId);

      if (groupError) {
        setError(groupError.message);
        setLoading(false);
        return;
      }

      const userPermissions = new Set<string>();
      if (groupData?.length) {
        const groupIds = groupData.map((g) => g.group_id);
        const { data: permissionData, error: permError } = await supabase
          .from("group_permissions")
          .select("permission_id")
          .in("group_id", groupIds);

        if (permError) {
          setError(permError.message);
          setLoading(false);
          return;
        }

        const permissionIds = permissionData.map((p) => p.permission_id);
        const { data: permNames, error: nameError } = await supabase
          .from("permissions")
          .select("name")
          .in("id", permissionIds);

        if (nameError) {
          setError(nameError.message);
          setLoading(false);
          return;
        }

        permNames.forEach((p) => userPermissions.add(p.name));
        setPermissions([...userPermissions]);
      }

      // Verificar permiso "Historial Cotizaciones"
      if (!userPermissions.has("Historial Cotizaciones")) {
        window.location.href = "/"; // Redirige si no tiene permiso
        return;
      }

      // Fetch quotations solo si tiene permiso
      const { data, error, count } = await supabase
        .from("quotations")
        .select(
          `
          id,
          created_at,
          business: business_id (name),
          media_res_weight,
          usd_per_kg,
          dollar_rate,
          total_initial_usd,
          total_cuts_usd,
          difference_usd,
          difference_percentage
        `
        )
        .eq("user_id", userId) // Añadido filtro por user_id
        .order("created_at", { ascending: sortOrder === "asc" })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) {
        setError(error.message);
      } else {
        const mappedQuotations: Quotation[] = (data || []).map((item) => {
          const businessObj = Array.isArray(item.business)
            ? item.business[0]
            : item.business;
          return {
            id: item.id,
            created_at: item.created_at,
            business:
              businessObj && businessObj.name
                ? { name: businessObj.name }
                : { name: "Sin negocio" },
            media_res_weight: item.media_res_weight,
            usd_per_kg: item.usd_per_kg,
            dollar_rate: item.dollar_rate,
            total_initial_usd: item.total_initial_usd,
            total_cuts_usd: item.total_cuts_usd,
            difference_usd: item.difference_usd,
            difference_percentage: item.difference_percentage,
          };
        });
        setQuotations(mappedQuotations);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
      setLoading(false);
    };

    fetchData();
  }, [page, sortOrder]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("quotations").delete().eq("id", id);
    if (error) {
      console.error("Error deleting quotation:", error);
      alert("No se pudo eliminar la cotización.");
    } else {
      setQuotations(quotations.filter((q) => q.id !== id));
      setShowDeleteConfirmation(null);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/editar-cotizacion/${id}`);
  };

  // Filtrar cotizaciones por nombre de negocio
  const filteredQuotations = quotations.filter((q) =>
    q.business.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  if (
    permissions.length === 0 ||
    !permissions.includes("Historial Cotizaciones")
  ) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Acceso no autorizado</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-1 flex-col p-6 overflow-hidden">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">
          Historial de Cotizaciones
        </h1>
        <div className="flex flex-col md:flex-row md:justify-between mb-4 gap-4">
          <button
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
          >
            Ordenar por Fecha (
            {sortOrder === "desc" ? "Más reciente" : "Más antiguo"})
          </button>
          <input
            type="text"
            placeholder="Buscar por negocio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] bg-[var(--background)] focus:ring-2 focus:ring-[var(--primary)] w-full md:w-80"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              Anterior
            </button>
            <span className="self-center text-[var(--foreground)]">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all disabled:opacity-50 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--foreground)]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Negocio</th>
                <th className="p-2 text-left">Peso (kg)</th>
                <th className="p-2 text-left">USD/kg</th>
                <th className="p-2 text-left">Dólar</th>
                <th className="p-2 text-left">Total Inicial (USD)</th>
                <th className="p-2 text-left">Total Cortes (USD)</th>
                <th className="p-2 text-left">Diferencia (USD)</th>
                <th className="p-2 text-left">Diferencia (%)</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((quotation, i) => (
                <tr
                  key={quotation.id}
                  className={i % 2 === 0 ? "bg-white dark:bg-gray-800" : ""}
                >
                  <td className="p-2">
                    {new Date(quotation.created_at).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-2">{quotation.business.name}</td>
                  <td className="p-2">{quotation.media_res_weight}</td>
                  <td className="p-2">{quotation.usd_per_kg}</td>
                  <td className="p-2">{quotation.dollar_rate}</td>
                  <td className="p-2">
                    {quotation.total_initial_usd.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2">
                    {quotation.total_cuts_usd.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2">
                    {quotation.difference_usd > 0 ? "-" : "+"}
                    {Math.abs(quotation.difference_usd).toLocaleString(
                      "es-AR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </td>
                  <td className="p-2">
                    {quotation.difference_percentage > 0 ? "-" : "+"}
                    {Math.abs(quotation.difference_percentage)}%
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      onClick={() => handleEdit(quotation.id)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                        />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirmation(quotation.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showDeleteConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
                ¿Estás seguro?
              </h3>
              <p className="text-lg text-[var(--foreground)] mb-6">
                ¿Deseas eliminar esta cotización? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirmation(null)}
                  className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirmation)}
                  className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all flex items-center gap-2 cursor-pointer text-lg font-medium"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
