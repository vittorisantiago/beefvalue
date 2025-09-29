"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "../components/Layout";

// Configuración y reportes de costos
export default function ClientCostos() {
  type CostItem = {
    id: string;
    name: string;
    category?: string;
  };
  type CostSummaryRow = {
    cost_item_id: string;
    currency: "ARS" | "ARS + IVA" | "USD";
    price_ars: number;
    price_ars_iva: number;
    price_usd: number;
    quotation_id?: string;
    created_at?: string;
  };
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [costsSummary, setCostsSummary] = useState<CostSummaryRow[]>([]);

  useEffect(() => {
    // Cargar items de costo
    const fetchCostItems = async () => {
      const { data, error } = await supabase.from("cost_items").select();
      if (!error && data) setCostItems(data);
    };
    // Cargar resumen de costos por tipo
    const fetchCostsSummary = async () => {
      const { data, error } = await supabase
        .from("quotation_cut_costs")
        .select("cost_item_id, currency, price_ars, price_ars_iva, price_usd")
        .limit(100);
      if (!error && data) setCostsSummary(data);
    };
    Promise.all([fetchCostItems(), fetchCostsSummary()]).then(() =>
      setLoading(false)
    );
  }, []);
  // Estado para filtro de fechas
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

  // Agrupar por tipo de costo
  const summaryByItem = costItems.map((item) => {
    const related = costsSummary.filter((row) => row.cost_item_id === item.id);
    const totalUSD = related.reduce((sum, r) => sum + (r.price_usd || 0), 0);
    const totalARS = related.reduce((sum, r) => sum + (r.price_ars || 0), 0);
    const totalARSIVA = related.reduce(
      (sum, r) => sum + (r.price_ars_iva || 0),
      0
    );
    // Obtener cotizaciones únicas
    const uniqueQuotations = new Set(related.map((r) => r.quotation_id));
    return {
      ...item,
      totalUSD,
      totalARS,
      totalARSIVA,
      usedCount: related.length,
      uniqueQuotations: uniqueQuotations.size,
    };
  });

  return (
    <Layout>
      <div className="flex flex-col gap-8 p-8">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Gestionar Costos
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Aquí puedes ver y analizar los tipos de costos utilizados en tus
          cotizaciones. Explora el resumen, filtra por rango de fechas y
          visualiza el impacto de los costos en tus operaciones.
        </p>
        {/* Filtro de fechas */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <label className="text-base font-semibold text-[var(--foreground)]">
            Filtrar por mes/rango:
          </label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => {
              setDateRange((r) => ({ ...r, from: e.target.value }));
            }}
            className="px-2 py-1 border rounded-md w-40"
          />
          <span className="mx-2">a</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => {
              setDateRange((r) => ({ ...r, to: e.target.value }));
            }}
            className="px-2 py-1 border rounded-md w-40"
          />
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaryByItem.map((item) => (
              <div
                key={item.id}
                className="p-6 flex flex-col gap-2 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  {item.name}
                </h2>
                <p className="text-gray-500">{item.category}</p>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-green-600 font-bold">
                    Total USD: $
                    {item.totalUSD.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-blue-600 font-bold">
                    Total ARS: $
                    {item.totalARS.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-yellow-600 font-bold">
                    Total ARS + IVA: $
                    {item.totalARSIVA.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-gray-700">
                    Usado {item.usedCount}{" "}
                    {item.usedCount === 1 ? "vez" : "veces"} en{" "}
                    {item.uniqueQuotations}{" "}
                    {item.uniqueQuotations === 1
                      ? "cotización"
                      : "cotizaciones"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Aquí podrías agregar gráficos, edición de tipos de costo, etc. */}
      </div>
    </Layout>
  );
}
