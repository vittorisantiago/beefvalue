"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "../components/Layout";
import CostCategoryInsights from "../components/CostCategoryInsights";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Currency = "ARS" | "ARS + IVA" | "USD";
type CostItem = { id: string; name: string; category?: string };
type QCost = {
  cost_item_id: string;
  currency: Currency;
  price_ars: number;
  price_ars_iva: number;
  price_usd: number;
  quotation_id: string;
  quotation_date: string; // YYYY-MM-DD
};

export default function ClientCostos() {
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<QCost[]>([]);
  const [selectedEvolutionId, setSelectedEvolutionId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(
    () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: firstDay.toISOString().slice(0, 10),
        to: lastDay.toISOString().slice(0, 10),
      };
    }
  );

  // Fetch cost items and costs within date range
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          { data: items, error: itemsErr },
          { data: qs, error: qErr, quotations },
        ] = await Promise.all([
          supabase.from("cost_items").select("id,name,category"),
          // First, get quotation ids within date range
          (async () => {
            const { data: quotations, error: qe } = await supabase
              .from("quotations")
              .select("id, created_at")
              .gte("created_at", `${dateRange.from} 00:00:00`)
              .lte("created_at", `${dateRange.to} 23:59:59`);
            if (qe) throw qe;
            const ids = (quotations || []).map((q) => q.id);
            if (ids.length === 0)
              return { data: [] as QCost[], error: null, quotations: [] };
            const { data, error } = await supabase
              .from("quotation_cut_costs")
              .select(
                "cost_item_id, currency, price_ars, price_ars_iva, price_usd, quotation_id"
              )
              .in("quotation_id", ids);
            return { data: (data || []) as QCost[], error, quotations };
          })(),
        ]);

        if (itemsErr) throw itemsErr;
        setCostItems(items || []);
        if (qErr) throw qErr;
        // Map quotation id -> date (YYYY-MM-DD)
        const mapDates: Record<string, string> = {};
        (quotations || []).forEach((q: { id: string; created_at: string }) => {
          mapDates[q.id] = new Date(q.created_at).toISOString().slice(0, 10);
        });
        const enriched = (qs as QCost[]).map((r) => ({
          ...r,
          quotation_date: mapDates[r.quotation_id] || dateRange.to,
        }));
        setRows(enriched);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los datos de costos.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateRange.from, dateRange.to]);

  // Aggregations per cost item
  const itemMap = useMemo(() => {
    const m: Record<string, CostItem> = {};
    costItems.forEach((it) => (m[it.id] = it));
    return m;
  }, [costItems]);

  type ItemAgg = {
    id: string;
    name: string;
    category?: string;
    usedCount: number; // veces (filas/cortes)
    quotationsCount: number; // cotizaciones únicas
    totalUSD: number;
    totalARS: number;
    totalARSIVA: number;
    avgUSD: number;
    avgARS: number;
    avgARSIVA: number;
  };

  const byItem: ItemAgg[] = useMemo(() => {
    const map: Record<string, { rows: QCost[] }> = {};
    rows.forEach((r) => {
      if (!map[r.cost_item_id]) map[r.cost_item_id] = { rows: [] };
      map[r.cost_item_id].rows.push(r);
    });
    const result: ItemAgg[] = [];
    Object.entries(map).forEach(([id, bucket]) => {
      const uniqQuo = new Set(bucket.rows.map((r) => r.quotation_id));
      const totalUSD = bucket.rows.reduce((s, r) => s + (r.price_usd || 0), 0);
      const totalARS = bucket.rows.reduce((s, r) => s + (r.price_ars || 0), 0);
      const totalARSIVA = bucket.rows.reduce(
        (s, r) => s + (r.price_ars_iva || 0),
        0
      );
      const usdRows = bucket.rows.filter((r) => r.currency === "USD");
      const arsRows = bucket.rows.filter((r) => r.currency === "ARS");
      const arsIvaRows = bucket.rows.filter((r) => r.currency === "ARS + IVA");
      const avgUSD = usdRows.length
        ? usdRows.reduce((s, r) => s + (r.price_usd || 0), 0) / usdRows.length
        : 0;
      const avgARS = arsRows.length
        ? arsRows.reduce((s, r) => s + (r.price_ars || 0), 0) / arsRows.length
        : 0;
      const avgARSIVA = arsIvaRows.length
        ? arsIvaRows.reduce((s, r) => s + (r.price_ars_iva || 0), 0) /
          arsIvaRows.length
        : 0;
      const meta = itemMap[id] || { id, name: "(Desconocido)" };
      result.push({
        id,
        name: meta.name,
        category: meta.category,
        usedCount: bucket.rows.length,
        quotationsCount: uniqQuo.size,
        totalUSD,
        totalARS,
        totalARSIVA,
        avgUSD,
        avgARS,
        avgARSIVA,
      });
    });
    // Order by totalUSD desc
    result.sort((a, b) => b.totalUSD - a.totalUSD);
    return result;
  }, [rows, itemMap]);

  // Per-day totals for chart con fechas reales
  const chartData = useMemo(() => {
    const start = new Date(`${dateRange.from}T00:00:00`);
    const end = new Date(`${dateRange.to}T00:00:00`);
    const labels: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      labels.push(new Date(d).toISOString().slice(0, 10));
    }
    const pos: Record<string, number> = {};
    labels.forEach((l, i) => (pos[l] = i));
    const usd = labels.map(() => 0);
    const ars = labels.map(() => 0);
    const arsIva = labels.map(() => 0);
    rows.forEach((r) => {
      const idx = pos[r.quotation_date];
      if (idx === undefined) return;
      usd[idx] += r.price_usd || 0;
      ars[idx] += r.price_ars || 0;
      arsIva[idx] += r.price_ars_iva || 0;
    });
    return {
      labels,
      datasets: [
        {
          label: "Total USD",
          data: usd,
          borderColor: "#16a34a",
          backgroundColor: "rgba(22,163,74,0.25)",
          tension: 0.25,
        },
        {
          label: "Total ARS",
          data: ars,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.25)",
          tension: 0.25,
        },
        {
          label: "Total ARS + IVA",
          data: arsIva,
          borderColor: "#eab308",
          backgroundColor: "rgba(234,179,8,0.25)",
          tension: 0.25,
        },
      ],
    };
  }, [rows, dateRange.from, dateRange.to]);

  // Datos de evolución para modal de costo específico
  const evolutionData = useMemo(() => {
    if (!selectedEvolutionId) return null;
    const filtered = rows.filter((r) => r.cost_item_id === selectedEvolutionId);
    if (filtered.length === 0) return null;
    const dates = Array.from(
      new Set(filtered.map((r) => r.quotation_date))
    ).sort();
    const pos: Record<string, number> = {};
    dates.forEach((d, i) => (pos[d] = i));
    const usd = dates.map(() => 0);
    const ars = dates.map(() => 0);
    const arsIva = dates.map(() => 0);
    filtered.forEach((r) => {
      const i = pos[r.quotation_date];
      usd[i] += r.price_usd || 0;
      ars[i] += r.price_ars || 0;
      arsIva[i] += r.price_ars_iva || 0;
    });
    const meta = itemMap[selectedEvolutionId];
    return {
      title: meta ? meta.name : "Costo",
      labels: dates,
      datasets: [
        {
          label: "USD",
          data: usd,
          borderColor: "#16a34a",
          backgroundColor: "rgba(22,163,74,0.25)",
          tension: 0.25,
        },
        {
          label: "ARS",
          data: ars,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.25)",
          tension: 0.25,
        },
        {
          label: "ARS + IVA",
          data: arsIva,
          borderColor: "#eab308",
          backgroundColor: "rgba(234,179,8,0.25)",
          tension: 0.25,
        },
      ],
    };
  }, [selectedEvolutionId, rows, itemMap]);

  const overallTotals = useMemo(() => {
    return {
      usd: rows.reduce((s, r) => s + (r.price_usd || 0), 0),
      ars: rows.reduce((s, r) => s + (r.price_ars || 0), 0),
      arsIva: rows.reduce((s, r) => s + (r.price_ars_iva || 0), 0),
      rows: rows.length,
      quotations: new Set(rows.map((r) => r.quotation_id)).size,
    };
  }, [rows]);

  return (
    <Layout>
      <div className="flex flex-col gap-8 p-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Gestionar Costos
        </h1>
        <p className="text-lg text-gray-500 mb-2">
          Analiza cómo se usan tus costos en el período seleccionado. Filtra por
          fechas, revisa totales por tipo y observá la tendencia general.
        </p>

        {/* Filtro de fechas + presets */}
        <div className="flex flex-wrap gap-4 items-center mb-2">
          <label className="text-base font-semibold text-[var(--foreground)]">
            Rango de fechas:
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) =>
              setDateRange((r) => ({ ...r, from: e.target.value }))
            }
            className="px-2 py-1 border rounded-md w-40"
          />
          <span className="mx-2">a</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) =>
              setDateRange((r) => ({ ...r, to: e.target.value }))
            }
            className="px-2 py-1 border rounded-md w-40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getFullYear(), now.getMonth(), 1)
                  .toISOString()
                  .slice(0, 10);
                const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                  .toISOString()
                  .slice(0, 10);
                setDateRange({ from, to });
              }}
            >
              Mes actual
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                const to = new Date();
                const from = new Date();
                from.setDate(to.getDate() - 6);
                setDateRange({
                  from: from.toISOString().slice(0, 10),
                  to: to.toISOString().slice(0, 10),
                });
              }}
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                const to = new Date();
                const from = new Date();
                from.setDate(to.getDate() - 29);
                setDateRange({
                  from: from.toISOString().slice(0, 10),
                  to: to.toISOString().slice(0, 10),
                });
              }}
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getFullYear(), 0, 1)
                  .toISOString()
                  .slice(0, 10);
                const to = new Date(now.getFullYear(), 11, 31)
                  .toISOString()
                  .slice(0, 10);
                setDateRange({ from, to });
              }}
            >
              Este año
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                const now = new Date();
                const from = new Date(now.getFullYear() - 1, 0, 1)
                  .toISOString()
                  .slice(0, 10);
                const to = new Date(now.getFullYear() - 1, 11, 31)
                  .toISOString()
                  .slice(0, 10);
                setDateRange({ from, to });
              }}
            >
              Año anterior
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                setDateRange({
                  from: "2020-01-01",
                  to: new Date().toISOString().slice(0, 10),
                });
              }}
            >
              Todo
            </button>
          </div>
        </div>
        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500" />
          </div>
        ) : (
          <>
            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">Total USD</div>
                <div className="text-2xl font-bold text-green-600">
                  $
                  {overallTotals.usd.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">Total ARS</div>
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {overallTotals.ars.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">Total ARS + IVA</div>
                <div className="text-2xl font-bold text-yellow-600">
                  $
                  {overallTotals.arsIva.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500">Actividad</div>
                <div className="text-2xl font-bold text-[var(--foreground)]">
                  {overallTotals.rows} filas • {overallTotals.quotations}{" "}
                  cotizaciones
                </div>
              </div>
            </div>

            <CostCategoryInsights
              rows={rows}
              costItems={costItems}
              dateRange={dateRange}
            />

            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-100 border border-blue-100 dark:border-blue-800 rounded-lg">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 8.5H12.01M11 11H12V16H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm">
                Tip: hacé clic en una fila de la tabla para ver su evolución
                diaria.
              </p>
            </div>

            {/* Tabla detallada por costo */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 font-semibold text-[var(--foreground)] text-lg border-b border-gray-200 dark:border-gray-700">
                Costos por tipo
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-[var(--foreground)]">
                      <th className="p-3">Costo</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Usos (cortes)</th>
                      <th className="p-3">Cotizaciones</th>
                      <th className="p-3">Prom. USD</th>
                      <th className="p-3">Prom. ARS</th>
                      <th className="p-3">Prom. ARS + IVA</th>
                      <th className="p-3">Total USD</th>
                      <th className="p-3">Total ARS</th>
                      <th className="p-3">Total ARS + IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byItem.map((it, i) => (
                      <tr
                        key={it.id}
                        onClick={() => setSelectedEvolutionId(it.id)}
                        title="Ver evolución"
                        className={`${
                          i % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50 dark:bg-gray-800"
                        } cursor-pointer hover:ring-2 hover:ring-blue-400 transition`}
                      >
                        <td className="p-3 font-medium text-[var(--foreground)]">
                          {it.name}
                        </td>
                        <td className="p-3 text-gray-500">
                          {it.category || "-"}
                        </td>
                        <td className="p-3">{it.usedCount}</td>
                        <td className="p-3">{it.quotationsCount}</td>
                        <td className="p-3">
                          $
                          {it.avgUSD.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3">
                          $
                          {it.avgARS.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3">
                          $
                          {it.avgARSIVA.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3 font-semibold text-green-700">
                          $
                          {it.totalUSD.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3 font-semibold text-blue-700">
                          $
                          {it.totalARS.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3 font-semibold text-yellow-700">
                          $
                          {it.totalARSIVA.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                    {byItem.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-4 text-center text-gray-500"
                        >
                          No hay datos en el rango seleccionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico horizontal grande */}
            <div className="mt-8">
              <div className="px-1 py-2 font-semibold text-[var(--foreground)] text-lg">
                Evolución de costos por día
              </div>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[900px]">
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "top" as const } },
                      scales: {
                        x: { title: { display: true, text: "Fecha" } },
                        y: {
                          title: { display: true, text: "Monto" },
                          ticks: { callback: (v) => `$${v}` },
                        },
                      },
                    }}
                    height={400}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        {selectedEvolutionId && evolutionData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl p-6 relative">
              <button
                className="absolute top-3 right-3 px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700 cursor-pointer"
                onClick={() => setSelectedEvolutionId(null)}
              >
                Cerrar
              </button>
              <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">
                Evolución: {evolutionData.title}
              </h2>
              <div className="h-[420px]">
                <Line
                  data={{
                    labels: evolutionData.labels,
                    datasets: evolutionData.datasets,
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" as const } },
                    scales: {
                      x: { title: { display: true, text: "Fecha" } },
                      y: {
                        title: { display: true, text: "Monto" },
                        ticks: { callback: (v) => `$${v}` },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
