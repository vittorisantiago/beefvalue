"use client";

import Layout from "@/app/components/Layout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

type AuditEvent = "login" | "logout" | "quotation_created";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  event: AuditEvent;
  user_agent: string | null;
  ip: string | null;
  occurred_at: string; // ISO timestamp
  details?: unknown; // JSON con datos extra (cotización)
}

export default function AuditoriasClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Mostrar errores
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<
    null | "daily" | "distribution" | "top"
  >(null);

  // filters
  const [eventFilter, setEventFilter] = useState<AuditEvent | "all">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const softColors = useMemo(
    () => ["#22c55e", "#2563eb", "#f59e0b", "#ef4444", "#a21caf"],
    []
  );

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("audit_logs")
        .select(
          "id,user_id,user_email,user_name,event,user_agent,ip,occurred_at,details",
          { count: "exact" }
        )
        .order("occurred_at", { ascending: false });

      if (eventFilter !== "all") query = query.eq("event", eventFilter);
      if (fromDate)
        query = query.gte("occurred_at", new Date(fromDate).toISOString());
      if (toDate) {
        const end = new Date(toDate);
        // include end day by going to 23:59:59
        end.setHours(23, 59, 59, 999);
        query = query.lte("occurred_at", end.toISOString());
      }
      if (search.trim()) {
        query = query.or(
          `user_email.ilike.%${search}%,user_name.ilike.%${search}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      setRows((data || []) as AuditLog[]);
      setTotal(count || 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, search, fromDate, toDate, page, pageSize]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const dailyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const d = new Date(r.occurred_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      map[k] = (map[k] || 0) + 1;
    });
    const arr = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    return {
      labels: arr.map(([k]) => k),
      datasets: [
        {
          label: "Eventos por día",
          data: arr.map(([, v]) => v),
          backgroundColor: softColors[1],
        },
      ],
    };
  }, [rows, softColors]);

  const eventDistribution = useMemo(() => {
    const map: Record<string, number> = {
      login: 0,
      logout: 0,
      quotation_created: 0,
    };
    rows.forEach((r) => (map[r.event] = (map[r.event] || 0) + 1));
    return {
      labels: ["Login", "Logout", "Cotización"],
      datasets: [
        {
          label: "Eventos",
          data: [map.login || 0, map.logout || 0, map.quotation_created || 0],
          backgroundColor: [softColors[0], softColors[3], softColors[2]],
        },
      ],
    };
  }, [rows, softColors]);

  // Nuevo: top negocios por cantidad de cotizaciones creadas (usa details.business_id)
  const businessQuotationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.event === "quotation_created" && r.details) {
        try {
          const d =
            typeof r.details === "string" ? JSON.parse(r.details) : r.details;
          const name = d.business_name || d.business_id || "(sin negocio)";
          counts[name] = (counts[name] || 0) + 1;
        } catch {}
      }
    });
    const ordered = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      labels: ordered.map(([n]) => n),
      datasets: [
        {
          label: "Cotizaciones creadas",
          data: ordered.map(([, v]) => v),
          backgroundColor: softColors[4],
        },
      ],
    };
  }, [rows, softColors]);

  // Opciones comunes para que los charts respeten la altura del contenedor
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
      },
      // Puedes ajustar padding si lo quisieras aún más compacto
      layout: { padding: 4 },
    }),
    []
  );

  const resetFilters = () => {
    setEventFilter("all");
    setSearch("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <Layout>
      <div className="p-6 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Auditorías</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div>
            <label className="block text-sm mb-1">Evento</label>
            <select
              value={eventFilter}
              onChange={(e) => {
                setPage(1);
                setEventFilter(e.target.value as AuditEvent | "all");
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
            >
              <option value="all">Todos</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="quotation_created">Cotización creada</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">
              Buscar (email o nombre)
            </label>
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
              placeholder="ej. juan@correo.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPage(1);
                setFromDate(e.target.value);
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Por página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-700"
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
              title="Limpiar filtros"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 6h18M9 6v12m6-12v12M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"
                />
              </svg>
              Limpiar
            </button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Eventos por día</h3>
              <button
                onClick={() => setExpanded("daily")}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                title="Expandir"
                aria-label="Expandir gráfico"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"
                  />
                </svg>
              </button>
            </div>
            <div className="h-64">
              <Bar data={dailyCounts} options={chartOptions} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Distribución de eventos</h3>
              <button
                onClick={() => setExpanded("distribution")}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                title="Expandir"
                aria-label="Expandir gráfico"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"
                  />
                </svg>
              </button>
            </div>
            <div className="h-64">
              <Pie data={eventDistribution} options={chartOptions} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Top negocios (cotizaciones)</h3>
              <button
                onClick={() => setExpanded("top")}
                className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                title="Expandir"
                aria-label="Expandir gráfico"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5"
                  />
                </svg>
              </button>
            </div>
            <div className="h-64">
              <Bar data={businessQuotationCounts} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Modal de gráficos ampliados */}
        {expanded && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] p-4">
              <button
                onClick={() => setExpanded(null)}
                className="absolute top-3 right-3 p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <div className="h-full">
                {expanded === "daily" && (
                  <Bar data={dailyCounts} options={chartOptions} />
                )}
                {expanded === "distribution" && (
                  <Pie data={eventDistribution} options={chartOptions} />
                )}
                {expanded === "top" && (
                  <Bar data={businessQuotationCounts} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Evento</th>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">User Agent</th>
                  <th className="px-4 py-2 text-left">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center">
                      Cargando...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-gray-200 dark:border-gray-700"
                    >
                      <td className="px-4 py-2">
                        {new Date(r.occurred_at).toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-2 capitalize">{r.event}</td>
                      <td className="px-4 py-2">{r.user_name || "-"}</td>
                      <td className="px-4 py-2">{r.user_email || "-"}</td>
                      <td className="px-4 py-2">{r.ip || "-"}</td>
                      <td
                        className="px-4 py-2 truncate max-w-[260px]"
                        title={r.user_agent || undefined}
                      >
                        {r.user_agent || "-"}
                      </td>
                      <td
                        className="px-4 py-2 max-w-[260px] truncate"
                        title={
                          typeof r.details === "string"
                            ? r.details
                            : JSON.stringify(r.details)
                        }
                      >
                        {r.event === "quotation_created" && r.details
                          ? (() => {
                              try {
                                const d =
                                  typeof r.details === "string"
                                    ? JSON.parse(r.details)
                                    : r.details;
                                return d.business_name || d.business_id || "—";
                              } catch {
                                return "—";
                              }
                            })()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm">
            <div>
              Mostrando {rows.length > 0 ? (page - 1) * pageSize + 1 : 0}-
              {(page - 1) * pageSize + rows.length} de {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Anterior
              </button>
              <span>
                Página {page} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                Siguiente
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
