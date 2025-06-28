"use client";

import Layout from "@/app/components/Layout";
import { useState, useEffect } from "react";
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
  TooltipItem,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Registrar los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
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

interface MonthlyData {
  month: string;
  count: number;
}

interface BusinessData {
  name: string;
  totalGain: number;
  count?: number;
}

export default function Reportes() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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
          return;
        }

        const permissionIds = permissionData.map((p) => p.permission_id);
        const { data: permNames, error: nameError } = await supabase
          .from("permissions")
          .select("name")
          .in("id", permissionIds);

        if (nameError) {
          setError(nameError.message);
          return;
        }

        permNames.forEach((p) => userPermissions.add(p.name));
        setPermissions([...userPermissions]);
      }

      // Verificar permiso "Reportes"
      if (!userPermissions.has("Reportes")) {
        window.location.href = "/"; // Redirige si no tiene permiso
        return;
      }

      // Fetch quotations solo si tiene permiso
      const { data, error } = await supabase
        .from("quotations")
        .select(
          `
          id,
          created_at,
          business_id,
          media_res_weight,
          usd_per_kg,
          total_initial_usd,
          total_cuts_usd,
          difference_usd,
          difference_percentage,
          business: business_id (name)
        `
        )
        .eq("user_id", userId); // Añadido filtro por user_id

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
            business_id: item.business_id,
            media_res_weight: item.media_res_weight,
            usd_per_kg: item.usd_per_kg,
            total_initial_usd: item.total_initial_usd,
            total_cuts_usd: item.total_cuts_usd,
            difference_usd: item.difference_usd,
            difference_percentage: item.difference_percentage,
            business:
              businessObj && businessObj.name
                ? { name: businessObj.name }
                : { name: "Sin Negocio" },
          };
        });
        setQuotations(mappedQuotations);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Procesar datos (mismo código que antes)
  const processMonthlyData = (): MonthlyData[] => {
    const monthlyMap: Record<string, number> = {};
    quotations.forEach((q) => {
      const date = new Date(q.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      monthlyMap[monthYear] = (monthlyMap[monthYear] || 0) + 1;
    });
    return Object.entries(monthlyMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const processBusinessData = (): BusinessData[] => {
    const businessMap: Record<string, { totalGain: number; count: number }> =
      {};
    quotations.forEach((q) => {
      const businessName = q.business?.name || "Sin Negocio";
      if (!businessMap[businessName]) {
        businessMap[businessName] = { totalGain: 0, count: 0 };
      }
      businessMap[businessName].totalGain += Math.abs(q.difference_usd);
      businessMap[businessName].count += 1;
    });
    return Object.entries(businessMap)
      .map(([name, data]) => ({
        name,
        totalGain: data.totalGain,
        count: data.count,
      }))
      .sort((a, b) => b.totalGain - a.totalGain);
  };

  const monthlyData = processMonthlyData();
  const businessData = processBusinessData();

  // Colores y datos para gráficos (mismo código que antes)
  const softColors = [
    "#6B7280",
    "#93C5FD",
    "#FCA5A5",
    "#A3E635",
    "#C4B5FD",
    "#FCD34D",
  ];

  const monthlyChartData = {
    labels: monthlyData.map((d) => d.month),
    datasets: [
      {
        label: "Cotizaciones por Mes",
        data: monthlyData.map((d) => d.count),
        backgroundColor: (
          context: import("chart.js").ScriptableContext<"bar">
        ) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return softColors[1];
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          gradient.addColorStop(0, softColors[1] + "33");
          gradient.addColorStop(1, softColors[1] + "99");
          return gradient;
        },
        borderColor: softColors[1],
        borderWidth: 2,
        barThickness: 40,
      },
    ],
  };

  const businessCountChartData = {
    labels: businessData.map((d) => d.name),
    datasets: [
      {
        label: "Cotizaciones por Negocio",
        data: businessData.map((d) => d.count),
        backgroundColor: softColors.slice(0, businessData.length),
      },
    ],
  };

  const businessGainChartData = {
    labels: businessData.map((d) => d.name),
    datasets: [
      {
        label: "Ganancia Total por Negocio (USD)",
        data: businessData.map((d) => d.totalGain),
        backgroundColor: softColors.slice(0, businessData.length),
        borderColor: softColors.slice(0, businessData.length),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { color: "#E5E7EB" } },
    },
  };

  const monthlyChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { text: "Meses", color: "#E5E7EB" },
        ticks: { color: "#E5E7EB" },
      },
      y: {
        title: { text: "Cantidad de Cotizaciones", color: "#E5E7EB" },
        ticks: { color: "#E5E7EB", beginAtZero: true },
      },
    },
    indexAxis: "x" as const,
  };

  const businessCountChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"pie">) => {
            const label = context.label || "";
            const value = context.parsed;
            return `${label}: ${value} cotización${value !== 1 ? "es" : ""}`;
          },
        },
      },
    },
  };

  const businessGainChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"bar">) => {
            const label = context.label || "";
            const value = context.parsed.x;
            return `${label}: $${value.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { text: "Negocios", color: "#E5E7EB" },
        ticks: { color: "#E5E7EB" },
      },
      y: {
        title: { text: "Ganancia Total (USD)", color: "#E5E7EB" },
        ticks: {
          color: "#E5E7EB",
          callback: (tickValue: string | number) => tickValue,
        },
      },
    },
    indexAxis: "y" as const,
  };

  // KPIs (mismo código que antes)
  const maxAbsBenefitQuotation =
    quotations.length > 0
      ? quotations.reduce((max, q) =>
          Math.abs(q.difference_usd) > Math.abs(max.difference_usd) ? q : max
        )
      : null;
  const totalQuotations = quotations.length;
  const mostActiveBusiness = businessData.reduce(
    (max, b) => ((b.count ?? 0) > (max.count ?? 0) ? b : max),
    businessData[0] || { name: "N/A", count: 0 }
  );
  const busiestMonth = monthlyData.reduce(
    (max, m) => (m.count > max.count ? m : max),
    monthlyData[0] || { month: "N/A", count: 0 }
  );

  // Logo y función de descarga (mismo código que antes)
  const logoPath = "/images/vaca.png";

  const handleDownload = async (type: "Gráfico" | "Informe Escrito") => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const img = new window.Image();
    img.src = logoPath;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    doc.addImage(img, "PNG", pageWidth - 35, 10, 18, 18);

    doc.setFontSize(24);
    doc.text("BeefValue", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(12);
    doc.text(
      `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 10;

    if (type === "Gráfico") {
      doc.setFillColor(245, 245, 245);
      doc.rect(
        0,
        0,
        doc.internal.pageSize.getWidth(),
        doc.internal.pageSize.getHeight(),
        "F"
      );

      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.addImage(img, "PNG", 12, 6, 14, 14);
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("BeefValue", pageWidth / 2, 16, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
        pageWidth - 18,
        12,
        { align: "right" }
      );
      let y = 34;

      const kpiSelectors = [
        ".bg-gradient-to-r.from-blue-500",
        ".bg-gradient-to-r.from-green-500",
        ".bg-gradient-to-r.from-purple-500",
        ".bg-gradient-to-r.from-yellow-500",
      ];
      const kpiBgHex = ["#2563eb", "#22c55e", "#a21caf", "#eab308"];
      const originalKpiBgs: string[] = [];
      const kpiCanvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < kpiSelectors.length; i++) {
        const el = document.querySelector(kpiSelectors[i]) as HTMLElement;
        if (el) {
          originalKpiBgs[i] = el.style.background;
          el.style.background = kpiBgHex[i];
          const canvas = await html2canvas(el, {
            backgroundColor: null,
            scale: 0.9,
          });
          kpiCanvases.push(canvas);
          el.style.background = originalKpiBgs[i] || "";
        }
      }
      if (kpiCanvases.length === 4) {
        const kpiW = Math.max(kpiCanvases[0].width, kpiCanvases[1].width);
        const kpiH = Math.max(kpiCanvases[0].height, kpiCanvases[2].height);
        const comboCanvas = document.createElement("canvas");
        comboCanvas.width = kpiW * 2;
        comboCanvas.height = kpiH * 2;
        const ctx = comboCanvas.getContext("2d");
        ctx?.drawImage(kpiCanvases[0], 0, 0);
        ctx?.drawImage(kpiCanvases[1], kpiW, 0);
        ctx?.drawImage(kpiCanvases[2], 0, kpiH);
        ctx?.drawImage(kpiCanvases[3], kpiW, kpiH);
        const imgData = comboCanvas.toDataURL("image/png");
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = pageWidth - 40;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        doc.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      }

      const chartSections = [
        {
          selector: '[data-chart="monthly"]',
          title: "Cotizaciones por Mes",
          description: "Cantidad de cotizaciones realizadas cada mes.",
          table: monthlyData.map((d) => `${d.month}: ${d.count}`).join("\n"),
        },
        {
          selector: '[data-chart="business"]',
          title: "Distribución de Cotizaciones por Negocio",
          description: "Cantidad de cotizaciones por cada negocio.",
          table: businessData.map((d) => `${d.name}: ${d.count}`).join("\n"),
        },
        {
          selector: '[data-chart="businessGain"]',
          title: "Top 5 Negocios por Ganancia (USD)",
          description: "Negocios con mayor ganancia total acumulada en USD.",
          table: businessData
            .slice(0, 5)
            .map(
              (d) =>
                `${d.name}: $${d.totalGain.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
            )
            .join("\n"),
        },
      ];
      for (const section of chartSections) {
        const el = document.querySelector(section.selector) as HTMLElement;
        if (el) {
          const originalBg = el.style.background;
          el.style.background = "#fff";
          let showTitle = true;
          const canvas = await html2canvas(el, { backgroundColor: "#fff" });
          const imgData = canvas.toDataURL("image/png");
          const imgProps = doc.getImageProperties(imgData);
          const imgWidth = pageWidth - 40;
          const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
          if (y + 14 + imgHeight > 280) {
            doc.addPage();
            doc.setFillColor(245, 245, 245);
            doc.rect(
              0,
              0,
              doc.internal.pageSize.getWidth(),
              doc.internal.pageSize.getHeight(),
              "F"
            );
            doc.setFillColor(22, 163, 74);
            doc.rect(0, 0, pageWidth, 28, "F");
            doc.addImage(img, "PNG", 12, 6, 14, 14);
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("BeefValue", pageWidth / 2, 16, { align: "center" });
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text(
              `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
              pageWidth - 18,
              12,
              { align: "right" }
            );
            y = 34;
            showTitle = true;
          }
          if (showTitle) {
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(section.title, pageWidth / 2, y + 8, { align: "center" });
            y += 14;
          }
          doc.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
          y += imgHeight + 4;
          el.style.background = originalBg;
        }
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text(section.description, 20, y);
        y += 6;
        const tableLines = section.table.split("\n");
        for (const line of tableLines) {
          doc.text(line, 24, y);
          y += 5;
        }
        y += 8;
      }
      doc.save(
        `beefvalue_graficos_${new Date().toLocaleDateString("es-AR")}.pdf`
      );
    } else if (type === "Informe Escrito") {
      doc.setFillColor(245, 245, 245);
      doc.rect(
        0,
        0,
        doc.internal.pageSize.getWidth(),
        doc.internal.pageSize.getHeight(),
        "F"
      );

      doc.setFillColor(22, 163, 74);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.addImage(img, "PNG", 12, 6, 14, 14);
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("BeefValue", pageWidth / 2, 16, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Fecha: ${new Date().toLocaleDateString("es-AR")}`,
        pageWidth - 18,
        12,
        { align: "right" }
      );
      let y = 34;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, y, pageWidth - 24, 32, 4, 4, "F");
      doc.setFontSize(15);
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text("Resumen de KPIs", pageWidth / 2, y + 8, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      y += 15;
      doc.text(`Total Cotizaciones: ${totalQuotations}`, 18, y);
      y += 7;
      if (maxAbsBenefitQuotation) {
        doc.text(
          `Mayor Diferencia Absoluta (USD): $${Math.abs(
            maxAbsBenefitQuotation.difference_usd
          ).toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}  |  ${maxAbsBenefitQuotation.business.name} - ${new Date(
            maxAbsBenefitQuotation.created_at
          ).toLocaleDateString("es-AR")}`,
          18,
          y
        );
      } else {
        doc.text("Mayor Diferencia Absoluta (USD): Sin datos", 18, y);
      }
      y += 7;
      doc.text(
        `Negocio Más Activo: ${mostActiveBusiness.name} (${
          mostActiveBusiness.count
        } ${mostActiveBusiness.count === 1 ? "cotización" : "cotizaciones"})`,
        18,
        y
      );
      y += 7;
      doc.text(
        `Mes Más Activo: ${busiestMonth.month} (${busiestMonth.count} ${
          busiestMonth.count === 1 ? "cotización" : "cotizaciones"
        })`,
        18,
        y
      );
      y += 12;

      doc.setDrawColor(200, 200, 200);
      doc.line(16, y, pageWidth - 16, y);
      y += 8;

      doc.setFontSize(15);
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text("Datos de Gráficos", pageWidth / 2, y, { align: "center" });
      y += 7;
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.setFont("helvetica", "normal");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("Cotizaciones por Mes:", 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      y += 6;
      monthlyData.forEach((d) => {
        doc.text(`• ${d.month}: ${d.count}`, 22, y);
        y += 6;
      });
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("Cotizaciones por Negocio:", 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      y += 6;
      businessData.forEach((d) => {
        doc.text(
          `• ${d.name}: ${d.count} cotización${d.count !== 1 ? "es" : ""}`,
          22,
          y
        );
        y += 6;
      });
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("Top 5 Negocios por Ganancia (USD):", 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      y += 6;
      businessData.slice(0, 5).forEach((d) => {
        doc.text(
          `• ${d.name}: $${d.totalGain.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          22,
          y
        );
        y += 6;
      });
      doc.save(
        `beefvalue_informe_${new Date().toLocaleDateString("es-AR")}.pdf`
      );
    }
    setShowDownloadModal(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Cargando reportes...</p>
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

  if (permissions.length === 0 || !permissions.includes("Reportes")) {
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
          Reportes Generales
        </h1>
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all cursor-pointer flex items-center gap-2 text-base shadow font-medium"
            title="Descargar reporte"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
              />
            </svg>
            Descargar
          </button>
        </div>
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-2xl w-full max-w-xl relative flex flex-col gap-8">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-2xl font-bold transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                ×
              </button>
              <h3 className="text-2xl font-semibold mb-2 text-[var(--foreground)] text-center">
                Selecciona el formato de descarga
              </h3>
              <div className="flex flex-col md:flex-row justify-center gap-8 mt-4">
                <button
                  onClick={() => handleDownload("Gráfico")}
                  className="flex-1 px-6 py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all text-lg font-semibold shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                >
                  <svg
                    className="w-6 h-6 inline-block mr-2 align-middle"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Gráfico
                </button>
                <button
                  onClick={() => handleDownload("Informe Escrito")}
                  className="flex-1 px-6 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all text-lg font-semibold shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                >
                  <svg
                    className="w-6 h-6 inline-block mr-2 align-middle"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16h8M8 12h8m-8-4h8M4 6h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                    />
                  </svg>
                  Informe Escrito
                </button>
              </div>
            </div>
          </div>
        )}
        {/* KPIs (Tarjetas Visuales) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold">Total Cotizaciones</h3>
            <p className="text-3xl font-bold">{totalQuotations}</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-700 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold">
              Mayor Diferencia en Cotización (USD)
            </h3>
            <p className="text-3xl font-bold">
              {maxAbsBenefitQuotation
                ? `$${Math.abs(
                    maxAbsBenefitQuotation.difference_usd
                  ).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "-"}
            </p>
            <p className="text-sm">
              {maxAbsBenefitQuotation
                ? `${maxAbsBenefitQuotation.business.name} - ${new Date(
                    maxAbsBenefitQuotation.created_at
                  ).toLocaleDateString("es-AR")}`
                : "Sin datos"}
            </p>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold">Negocio Más Activo</h3>
            <p className="text-xl font-bold">{mostActiveBusiness.name}</p>
            <p className="text-sm">
              ({mostActiveBusiness.count}{" "}
              {mostActiveBusiness.count === 1 ? "cotización" : "cotizaciones"})
            </p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold">Mes Más Activo</h3>
            <p className="text-xl font-bold">{busiestMonth.month}</p>
            <p className="text-sm">
              ({busiestMonth.count}{" "}
              {busiestMonth.count === 1 ? "cotización" : "cotizaciones"})
            </p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Cotizaciones por Mes */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Cotizaciones por Mes
              </h2>
            </div>
            <div
              className={["transition-all", "duration-300", "h-[400px]"].join(
                " "
              )}
              data-chart="monthly"
            >
              <Bar data={monthlyChartData} options={monthlyChartOptions} />
            </div>
          </div>

          {/* Distribución por Negocio */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Distribución de Cotizaciones por Negocio
              </h2>
            </div>
            <div
              className={["transition-all", "duration-300", "h-[400px]"].join(
                " "
              )}
              data-chart="business"
            >
              <Pie
                data={businessCountChartData}
                options={businessCountChartOptions}
              />
            </div>
          </div>

          {/* Top 5 Negocios por Ganancia */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Top 5 Negocios por Ganancia (USD)
              </h2>
            </div>
            <div
              className={["transition-all", "duration-300", "h-[400px]"].join(
                " "
              )}
              data-chart="businessGain"
            >
              <Bar
                data={businessGainChartData}
                options={businessGainChartOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
