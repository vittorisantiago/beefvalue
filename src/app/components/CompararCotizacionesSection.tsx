import React, { useState, useMemo } from "react";
import { Bar, Line, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Quotation {
  id: string;
  created_at: string;
  business_id: string;
  media_res_weight: number;
  usd_per_kg: number;
  total_initial_usd: number;
  total_cuts_usd: number;
  difference_usd: number;
  difference_percentage: number;
  business: { name: string };
}

interface Props {
  quotations: Quotation[];
}

const softColors = [
  "#6B7280",
  "#93C5FD",
  "#FCA5A5",
  "#A3E635",
  "#C4B5FD",
  "#FCD34D",
];

const gradientColors = [
  "rgba(59,130,246,0.6)", // azul
  "rgba(34,197,94,0.6)", // verde
  "rgba(168,85,247,0.6)", // violeta
];

export default function CompararCotizacionesSection({ quotations }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedChart, setExpandedChart] = useState<null | string>(null);

  // Selector de cotizaciones (máximo 5, mínimo 2)
  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else if (selectedIds.length < 5) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedQuotations = useMemo(
    () => quotations.filter((q) => selectedIds.includes(q.id)),
    [selectedIds, quotations]
  );

  // Datos para gráficos
  const labels = selectedQuotations.map(
    (q, i) => `#${i + 1} - ${q.business?.name}`
  );

  // Gráfico de barras: diferencia total USD
  const diffUsdData = {
    labels,
    datasets: [
      {
        label: "Diferencia Total (USD)",
        data: selectedQuotations.map((q) => -q.difference_usd), // Invertir signo
        backgroundColor: gradientColors[2],
        borderRadius: 12,
        barThickness: 40,
      },
    ],
  };

  // Gráfico radar: variación porcentual y total USD
  const radarData = {
    labels: [
      "USD/kg (precio promedio)",
      "Peso Medio (kg)",
      "Diferencia Total (USD)",
    ],
    datasets: selectedQuotations.map((q, i) => ({
      label: labels[i],
      data: [q.usd_per_kg, q.media_res_weight, Math.abs(q.difference_usd)],
      backgroundColor: softColors[i] + "33",
      borderColor: softColors[i],
      borderWidth: 2,
      pointBackgroundColor: softColors[i],
    })),
  };

  // Gráfico de área: USD/kg y Peso medio
  const areaData = {
    labels,
    datasets: [
      {
        label: "USD/kg",
        data: selectedQuotations.map((q) => q.usd_per_kg),
        borderColor: gradientColors[0],
        backgroundColor: "rgba(59,130,246,0.15)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Peso Medio Res (kg)",
        data: selectedQuotations.map((q) => q.media_res_weight),
        borderColor: gradientColors[1],
        backgroundColor: "rgba(34,197,94,0.15)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { color: "#fff" } },
      tooltip: {},
    },
    scales: {
      x: { ticks: { color: "#fff" }, grid: { color: "#fff2" } },
      y: { ticks: { color: "#fff" }, grid: { color: "#fff2" } },
    },
  };

  // Modal animado para expandir gráficos
  const chartModalClass =
    "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-all duration-300";
  const chartContentClass =
    "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 relative w-full max-w-5xl h-[80vh] flex flex-col animate-fade-in";

  // Tooltip SVG
  const InfoIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-blue-500 hover:text-blue-700 transition-colors duration-200"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1 2.5-2.5 3.5v1m0 2h.01"
      />
    </svg>
  );

  return (
    <div className="flex flex-1 flex-col p-6 overflow-hidden mt-16">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">
        Comparar Cotizaciones
      </h1>
      <p className="mb-4 text-gray-600 dark:text-gray-300">
        Selecciona entre 2 y 5 cotizaciones para comparar sus principales
        indicadores.
      </p>
      <div className="mb-8 flex flex-wrap gap-3">
        {quotations.map((q) => (
          <button
            key={q.id}
            onClick={() => handleSelect(q.id)}
            className={`px-4 py-2 rounded-lg border transition-all shadow text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 cursor-pointer ${
              selectedIds.includes(q.id)
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-gray-100 dark:bg-gray-100 text-gray-700 border-gray-300 hover:bg-blue-100"
            }`}
            disabled={!selectedIds.includes(q.id) && selectedIds.length >= 5}
          >
            {q.business?.name || "Sin Negocio"} -{" "}
            {new Date(q.created_at).toLocaleDateString("es-AR")}
          </button>
        ))}
      </div>
      {selectedIds.length < 2 && (
        <div className="text-yellow-600 dark:text-yellow-400 mb-4">
          Selecciona al menos 2 cotizaciones para comparar.
        </div>
      )}
      {selectedIds.length >= 2 && selectedIds.length <= 5 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de barras */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative group">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
                Diferencia Total (USD)
                <span className="relative group">
                  <InfoIcon />
                  <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-justify">
                    Este gráfico muestra la diferencia total en USD de cada
                    cotización seleccionada. Un valor más negativo indica una
                    mayor pérdida o menor ganancia respecto al valor de
                    referencia. Permite comparar rápidamente el resultado
                    económico global de cada cotización.
                  </span>
                </span>
              </h2>
              <button
                onClick={() => setExpandedChart("bar")}
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Expandir gráfico"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2"
                  />
                </svg>
              </button>
            </div>
            <div className="transition-all duration-300 h-[320px]">
              <Bar data={diffUsdData} options={chartOptions} />
            </div>
          </div>
          {/* Gráfico radar */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative group">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
                Comparativa Radar
                <span className="relative group">
                  <InfoIcon />
                  <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-justify">
                    Este gráfico compara visualmente el precio promedio USD/kg,
                    el peso medio de la media res y la diferencia total en USD
                    de cada cotización seleccionada. Permite ver de un vistazo
                    cuál cotización es más alta o baja en cada eje.
                  </span>
                </span>
              </h2>
              <button
                onClick={() => setExpandedChart("radar")}
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Expandir gráfico"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2"
                  />
                </svg>
              </button>
            </div>
            <div className="transition-all duration-300 h-[320px]">
              <Radar
                data={radarData}
                options={{
                  ...chartOptions,
                  scales: {
                    r: {
                      angleLines: { color: "#fff2" },
                      pointLabels: { color: "#fff" },
                      grid: { color: "#fff2" },
                      ticks: { display: false }, // Oculta los números de los círculos
                    },
                  },
                }}
              />
            </div>
          </div>
          {/* Gráfico de área aesthetic */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative group">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)] flex items-center gap-2">
                Área USD/kg y Peso Medio
                <span className="relative group">
                  <InfoIcon />
                  <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none text-justify">
                    Este gráfico compara el precio promedio USD/kg y el peso
                    medio de la media res para cada cotización seleccionada.
                    Permite visualizar tendencias y diferencias en estos dos
                    indicadores clave de manera simultánea.
                  </span>
                </span>
              </h2>
              <button
                onClick={() => setExpandedChart("area")}
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Expandir gráfico"
              >
                <svg
                  className="w-6 h-6 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2"
                  />
                </svg>
              </button>
            </div>
            <div className="transition-all duration-300 h-[320px]">
              <Line
                data={areaData}
                options={{
                  ...chartOptions,
                  elements: { line: { fill: true } },
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Modal de gráfico expandido */}
      {expandedChart && (
        <div className={chartModalClass}>
          <div
            className={chartContentClass + " animate-fade-in-scale"}
            style={{ animation: "fadeInScale 0.3s" }}
          >
            <button
              onClick={() => setExpandedChart(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl font-bold transition-colors z-10 cursor-pointer"
              aria-label="Cerrar"
              style={{ transition: "color 0.2s" }}
            >
              ×
            </button>
            <div className="flex-1 flex items-center justify-center">
              {/* Quitar gráfico de líneas expandido */}
              {expandedChart === "bar" && (
                <Bar
                  data={diffUsdData}
                  options={{ ...chartOptions, maintainAspectRatio: false }}
                  height={undefined}
                  width={undefined}
                />
              )}
              {expandedChart === "radar" && (
                <Radar
                  data={radarData}
                  options={{
                    ...chartOptions,
                    scales: {
                      r: {
                        angleLines: { color: "#fff2" },
                        pointLabels: { color: "#fff" },
                        grid: { color: "#fff2" },
                        ticks: { display: false }, // Oculta los números de los círculos
                      },
                    },
                    maintainAspectRatio: false,
                  }}
                  height={undefined}
                  width={undefined}
                />
              )}
              {expandedChart === "area" && (
                <Line
                  data={areaData}
                  options={{
                    ...chartOptions,
                    elements: { line: { fill: true } },
                    maintainAspectRatio: false,
                  }}
                  height={undefined}
                  width={undefined}
                />
              )}
            </div>
          </div>
          <style jsx>{`
            @keyframes fadeInScale {
              0% {
                opacity: 0;
                transform: scale(0.85);
              }
              100% {
                opacity: 1;
                transform: scale(1);
              }
            }
            .animate-fade-in-scale {
              animation: fadeInScale 0.3s;
            }
            .animate-fade-out-scale {
              animation: fadeOutScale 0.25s;
            }
            @keyframes fadeOutScale {
              0% {
                opacity: 1;
                transform: scale(1);
              }
              100% {
                opacity: 0;
                transform: scale(0.85);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
