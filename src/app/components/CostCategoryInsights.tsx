"use client";
import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Currency = "ARS" | "ARS + IVA" | "USD";

type CostInsightRow = {
  cost_item_id: string;
  currency: Currency;
  price_ars: number;
  price_ars_iva: number;
  price_usd: number;
  quotation_id: string;
  quotation_date: string;
};

type CostItemMeta = {
  id: string;
  name: string;
  category?: string | null;
};

type DateRange = { from: string; to: string };

type Props = {
  rows: CostInsightRow[];
  costItems: CostItemMeta[];
  dateRange: DateRange;
};

const currencyLabels: Record<Currency, string> = {
  USD: "USD",
  ARS: "ARS",
  "ARS + IVA": "ARS + IVA",
};

const pickValue = (row: CostInsightRow, currency: Currency) => {
  if (currency === "USD") return row.price_usd || 0;
  if (currency === "ARS") return row.price_ars || 0;
  return row.price_ars_iva || 0;
};

const palette = [
  "#0ea5e9",
  "#34d399",
  "#f43f5e",
  "#f97316",
  "#a855f7",
  "#22d3ee",
  "#fde047",
];

const formatMoney = (value: number) =>
  value.toLocaleString("es-AR", { minimumFractionDigits: 2 });

function CostCategoryInsights({ rows, costItems, dateRange }: Props) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minUses, setMinUses] = useState<number>(3);
  const [topLimit, setTopLimit] = useState<number>(5);

  const categoryIndex = useMemo(() => {
    const map: Record<string, string> = {};
    costItems.forEach((item) => {
      const key = item.id;
      const category = item.category?.trim();
      map[key] = category && category.length > 0 ? category : "Sin categoría";
    });
    return map;
  }, [costItems]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    Object.values(categoryIndex).forEach((c) => set.add(c));
    return ["all", ...Array.from(set).sort()];
  }, [categoryIndex]);

  const midpoint = useMemo(() => {
    const start = new Date(`${dateRange.from}T00:00:00`).getTime();
    const end = new Date(`${dateRange.to}T23:59:59`).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return start;
    }
    return start + (end - start) / 2;
  }, [dateRange.from, dateRange.to]);

  const baseAggregated = useMemo(() => {
    const buckets: Record<
      string,
      {
        name: string;
        uses: number;
        total: number;
        avgTicket: number;
        quotations: Set<string>;
        items: Set<string>;
        firstHalf: number;
        secondHalf: number;
      }
    > = {};

    rows.forEach((row) => {
      const name = categoryIndex[row.cost_item_id] || "Sin categoría";
      if (!buckets[name]) {
        buckets[name] = {
          name,
          uses: 0,
          total: 0,
          avgTicket: 0,
          quotations: new Set<string>(),
          items: new Set<string>(),
          firstHalf: 0,
          secondHalf: 0,
        };
      }
      const bucket = buckets[name];
      const value = pickValue(row, selectedCurrency);
      bucket.uses += 1;
      bucket.total += value;
      bucket.quotations.add(row.quotation_id);
      bucket.items.add(row.cost_item_id);
      const rowDate = new Date(`${row.quotation_date}T00:00:00`).getTime();
      if (!Number.isNaN(rowDate)) {
        if (rowDate <= midpoint) {
          bucket.firstHalf += value;
        } else {
          bucket.secondHalf += value;
        }
      }
    });

    const arr = Object.values(buckets).map((bucket) => {
      const avgTicket = bucket.uses ? bucket.total / bucket.uses : 0;
      const growth = bucket.firstHalf
        ? ((bucket.secondHalf - bucket.firstHalf) / bucket.firstHalf) * 100
        : bucket.secondHalf > 0
        ? 100
        : 0;
      return {
        name: bucket.name,
        uses: bucket.uses,
        total: bucket.total,
        avgTicket,
        quotations: bucket.quotations.size,
        items: bucket.items.size,
        growth,
      };
    });

    const totalUniverse = arr.reduce((sum, cat) => sum + cat.total, 0);
    const ordered = arr
      .map((cat) => ({
        ...cat,
        share: totalUniverse ? (cat.total / totalUniverse) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { ordered, totalUniverse };
  }, [rows, categoryIndex, selectedCurrency, midpoint]);

  const filtered = useMemo(() => {
    return baseAggregated.ordered.filter((cat) => {
      if (categoryFilter !== "all" && cat.name !== categoryFilter) {
        return false;
      }
      return cat.uses >= minUses;
    });
  }, [baseAggregated.ordered, categoryFilter, minUses]);

  const chartData = useMemo(() => {
    const subset = filtered.slice(0, topLimit);
    return {
      labels: subset.map((cat) => cat.name),
      datasets: [
        {
          label: `Total ${currencyLabels[selectedCurrency]}`,
          data: subset.map((cat) => cat.total),
          backgroundColor: subset.map(
            (_, idx) => palette[idx % palette.length]
          ),
          borderRadius: 8,
        },
      ],
    };
  }, [filtered, selectedCurrency, topLimit]);

  const leader = filtered[0];
  const riser = useMemo(() => {
    return [...filtered].sort((a, b) => b.growth - a.growth)[0];
  }, [filtered]);

  const maxMinUses = useMemo(() => {
    return Math.max(1, ...baseAggregated.ordered.map((cat) => cat.uses));
  }, [baseAggregated.ordered]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col gap-2 mb-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Conocimiento por categoría de costo
        </h2>
        <p className="text-sm text-gray-500">
          Identificá categorías que concentran el gasto y cómo evolucionaron en
          la primera y segunda mitad del rango seleccionado ({dateRange.from} a{" "}
          {dateRange.to}). Ajustá la vista con los filtros para aislar
          categorías específicas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-gray-500">Moneda</label>
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as Currency)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
            <option value="ARS + IVA">ARS + IVA</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">
            Categoría específica
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "Todas" : cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">
            Mínimo de usos
          </label>
          <input
            type="range"
            min={1}
            max={Math.max(5, maxMinUses)}
            value={minUses}
            onChange={(e) => setMinUses(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">{minUses}+ usos</div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">
            Top para el gráfico
          </label>
          <select
            value={topLimit}
            onChange={(e) => setTopLimit(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
          >
            {[3, 5, 7, 10].map((value) => (
              <option key={value} value={value}>
                Top {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900">
          <div className="text-xs uppercase tracking-wide text-blue-500 font-semibold">
            Categoría dominante
          </div>
          {leader ? (
            <>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-1">
                {leader.name}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-200">
                {leader.share.toFixed(1)}% del total en{" "}
                {currencyLabels[selectedCurrency]}
              </div>
            </>
          ) : (
            <div className="text-sm text-blue-700">
              Sin datos en el filtro actual.
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900">
          <div className="text-xs uppercase tracking-wide text-emerald-500 font-semibold">
            Mayor aceleración
          </div>
          {riser ? (
            <>
              <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                {riser.name}
              </div>
              <div
                className={`text-sm ${
                  riser.growth >= 0 ? "text-emerald-700" : "text-emerald-400"
                }`}
              >
                {riser.growth >= 0 ? "+" : ""}
                {riser.growth.toFixed(1)}% versus primera mitad del rango
              </div>
            </>
          ) : (
            <div className="text-sm text-emerald-700">
              Ajustá filtros para ver tendencias.
            </div>
          )}
        </div>
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900">
          <div className="text-xs uppercase tracking-wide text-amber-500 font-semibold">
            Categorías analizadas
          </div>
          <div className="text-lg font-bold text-amber-900 dark:text-amber-100 mt-1">
            {filtered.length}
          </div>
          <div className="text-sm text-amber-700 dark:text-amber-200">
            de {baseAggregated.ordered.length} totales ({minUses}+ usos)
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Distribución de gasto por categoría
          </h3>
          <span className="text-xs text-gray-500">
            Mostrando top {Math.min(topLimit, filtered.length)} - Valores en{" "}
            {currencyLabels[selectedCurrency]}
          </span>
        </div>
        {filtered.length ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[700px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) =>
                          `${ctx.dataset.label}: $${formatMoney(
                            ctx.parsed.y ?? ctx.parsed.x ?? 0
                          )}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#6b7280" },
                    },
                    y: {
                      ticks: {
                        callback: (value) => `$${value}`,
                        color: "#6b7280",
                      },
                    },
                  },
                }}
                height={100}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No hay categorías que cumplan los filtros seleccionados.
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr className="text-left text-[var(--foreground)]">
              <th className="p-3">Categoría</th>
              <th className="p-3">Items</th>
              <th className="p-3">Usos</th>
              <th className="p-3">Cotizaciones</th>
              <th className="p-3">Ticket medio</th>
              <th className="p-3">
                Total ({currencyLabels[selectedCurrency]})
              </th>
              <th className="p-3">Participación</th>
              <th className="p-3">Tendencia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((cat) => (
                <tr
                  key={cat.name}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="p-3 font-medium text-[var(--foreground)]">
                    {cat.name}
                  </td>
                  <td className="p-3">{cat.items}</td>
                  <td className="p-3">{cat.uses}</td>
                  <td className="p-3">{cat.quotations}</td>
                  <td className="p-3">${formatMoney(cat.avgTicket)}</td>
                  <td className="p-3 font-semibold">
                    ${formatMoney(cat.total)}
                  </td>
                  <td className="p-3">{cat.share.toFixed(1)}%</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        cat.growth > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : cat.growth < 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.growth > 0 ? "+" : ""}
                      {cat.growth.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">
                  Ajustá los filtros para ver datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CostCategoryInsights;
