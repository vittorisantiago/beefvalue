"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Layout from "@/app/components/Layout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// === COSTOS: tipos auxiliares
type Moneda = "USD" | "ARS" | "ARS + IVA";

interface Quotation {
  id: string;
  created_at: string;
  business: { name: string };
  media_res_weight: number;
  usd_per_kg: number;
  dollar_rate: number;
  total_initial_usd: number;
  total_cuts_usd: number;
  difference_usd: number; // SIN costos
  difference_percentage: number; // SIN costos
}

interface QuotationCutPDF {
  qcutId: string;
  name: string;
  percentage: number;
  macro: string | null;
  isFixedCost: boolean;
  priceARS: number;
  priceARSIVA: number;
  priceUSD: number;
  currency: Moneda;
  notes: string;
}

/* interface QuotationCostPDF {
  quotation_cut_id: string;
  cutName: string;
  costName: string;
  currency: Moneda;
  priceARS: number;
  priceARSIVA: number;
  priceUSD: number;
  notes: string;
}
*/

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
  const [costTotalsUSD, setCostTotalsUSD] = useState<Record<string, number>>(
    {}
  ); // COSTOS: totales por quotation_id
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
        window.location.href = "/";
        return;
      }
      const userId = session.user.id;

      // Permisos
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
      if (!userPermissions.has("Historial Cotizaciones")) {
        window.location.href = "/";
        return;
      }

      // === Cotizaciones (con count para paginar)
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
        `,
          { count: "exact" }
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: sortOrder === "asc" })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const mapped: Quotation[] = (data || []).map((item) => {
        const businessObj = Array.isArray(item.business)
          ? item.business[0]
          : item.business;
        return {
          id: item.id,
          created_at: item.created_at,
          business: businessObj?.name
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
      setQuotations(mapped);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / itemsPerPage)));

      // === COSTOS: una sola query para los ids de esta página
      const ids = mapped.map((q) => q.id);
      if (ids.length) {
        const { data: costsPage, error: costsErr } = await supabase
          .from("quotation_cut_costs")
          .select("quotation_id, currency, price_ars, price_ars_iva, price_usd")
          .in("quotation_id", ids);

        if (!costsErr && costsPage) {
          const totals: Record<string, number> = {};
          for (const row of costsPage as {
            quotation_id: string;
            currency: Moneda;
            price_ars: number;
            price_ars_iva: number;
            price_usd: number;
          }[]) {
            const rate =
              mapped.find((q) => q.id === row.quotation_id)?.dollar_rate || 1;
            const usd =
              row.currency === "USD"
                ? -(row.price_usd || 0)
                : row.currency === "ARS + IVA"
                ? -((row.price_ars_iva || 0) / 1.105 / rate)
                : -((row.price_ars || 0) / rate);
            totals[row.quotation_id] = (totals[row.quotation_id] || 0) + usd;
          }
          setCostTotalsUSD(totals);
        } else {
          setCostTotalsUSD({});
        }
      } else {
        setCostTotalsUSD({});
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

  const handleEdit = (id: string) => router.push(`/editar-cotizacion/${id}`);

  // === COSTOS: helpers
  function currencyToField(currency: string) {
    if (currency === "USD") return "priceUSD";
    if (currency === "ARS + IVA") return "priceARSIVA";
    if (currency === "ARS") return "priceARS";
    return "priceUSD";
  }
  const fmt = (n: number) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  /*
  const convertToUSD = (
    currency: Moneda,
    ars: number,
    arsIva: number,
    usd: number,
    dollarRate: number
  ) => {
    if (currency === "USD") return usd || 0;
    if (currency === "ARS + IVA")
      return (arsIva || 0) / 1.105 / (dollarRate || 1);
    if (currency === "ARS") return (ars || 0) / (dollarRate || 1);
    return 0;
  };
*/
  // Descargar PDF de cotización
  const handleDownload = async (quotation: Quotation) => {
    // Obtener los cortes de la cotización
    const { data: cutsData } = await supabase
      .from("quotation_cuts")
      .select(
        `cut_id, price_ars, price_ars_iva, price_usd, currency, notes, cuts:cut_id(name, percentage, macro, is_fixed_cost)`
      )
      .eq("quotation_id", quotation.id);
    if (!cutsData) return;
    // Normalizar cortes con tipo explícito y manejo seguro de cuts
    const cuts: QuotationCutPDF[] = cutsData.map((c) => {
      const cutObjRaw = c.cuts;
      let cutObj: Record<string, unknown> | undefined = undefined;
      if (Array.isArray(cutObjRaw)) {
        cutObj = cutObjRaw.length > 0 ? cutObjRaw[0] : undefined;
      } else if (typeof cutObjRaw === "object" && cutObjRaw !== null) {
        cutObj = cutObjRaw;
      }
      return {
        qcutId: typeof c.cut_id === "string" ? c.cut_id : "",
        name: cutObj && typeof cutObj.name === "string" ? cutObj.name : "-",
        percentage:
          cutObj && typeof cutObj.percentage === "number"
            ? cutObj.percentage
            : 0,
        macro:
          cutObj && (typeof cutObj.macro === "string" || cutObj.macro === null)
            ? (cutObj.macro as string | null)
            : null,
        isFixedCost:
          cutObj && typeof cutObj.is_fixed_cost === "boolean"
            ? cutObj.is_fixed_cost
            : false,
        priceARS: c.price_ars,
        priceARSIVA: c.price_ars_iva,
        priceUSD: c.price_usd,
        currency: c.currency,
        notes: c.notes || "-",
      };
    });

    // === COSTOS: obtener los costos asociados a la cotización
    const { data: costsData } = await supabase
      .from("quotation_cut_costs")
      .select(
        `cut_id, cost_item_id, currency, price_ars, price_ars_iva, price_usd, notes, cuts:cut_id(name), cost_items:cost_item_id(name)`
      )
      .eq("quotation_id", quotation.id);
    // Normalizar costos
    const costs = ((costsData as Record<string, unknown>[]) || []).map(
      (row) => {
        const cutName =
          (row.cuts as { name?: string } | undefined)?.name || "-";
        const costName =
          (row.cost_items as { name?: string } | undefined)?.name || "-";
        const currency = row.currency as Moneda;
        const priceARS = typeof row.price_ars === "number" ? row.price_ars : 0;
        const priceARSIVA =
          typeof row.price_ars_iva === "number" ? row.price_ars_iva : 0;
        const priceUSD = typeof row.price_usd === "number" ? row.price_usd : 0;
        const notes = typeof row.notes === "string" ? row.notes : "-";
        let usdValue = 0;
        if (currency === "USD") {
          usdValue = priceUSD;
        } else if (currency === "ARS + IVA" && quotation.dollar_rate) {
          usdValue = priceARSIVA / 1.105 / quotation.dollar_rate;
        } else if (currency === "ARS" && quotation.dollar_rate) {
          usdValue = priceARS / quotation.dollar_rate;
        }
        return {
          cutName,
          costName,
          currency,
          priceARS,
          priceARSIVA,
          priceUSD,
          notes,
          usdValue,
        };
      }
    );
    // El valor de costos siempre debe ser positivo y RESTAR
    const totalCostsUSD = costs.reduce(
      (acc, c) => acc - Math.abs(c.usdValue),
      0
    );
    // Calcular diferencia final con costos: totalInicialUSD - totalCortesUSD - totalCostosUSD
    const difFinalUSD =
      (quotation.total_initial_usd || 0) -
      (quotation.total_cuts_usd || 0) -
      totalCostsUSD;
    const difFinalPct =
      (quotation.total_initial_usd || 0) > 0
        ? (difFinalUSD / quotation.total_initial_usd) * 100
        : 0;
    // Crear PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    // Logo
    const logoPath = "/images/vaca.png";
    const img = new window.Image();
    img.src = logoPath;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    // Definir variables para el logo y la cabecera
    const logoWidth = 18;
    const logoHeight = 18;
    const logoX = 14;
    const logoY = 10;
    doc.addImage(img, "PNG", logoX, logoY, logoWidth, logoHeight);
    // Título centrado
    doc.setFontSize(24);
    doc.text("BeefValue", pageWidth / 2, 22, { align: "center" });
    // Fecha a la derecha
    doc.setFontSize(12);
    doc.text(
      `Fecha: ${new Date(quotation.created_at).toLocaleDateString("es-AR")}`,
      pageWidth - 14,
      22,
      { align: "right" }
    );
    y = 32;
    // Datos de la cotización
    doc.setFontSize(12);
    doc.text(`Negocio: ${quotation.business.name}`, 14, y);
    y += 8;
    doc.text(`Peso Prom. Media Res (Kg): ${quotation.media_res_weight}`, 14, y);
    y += 6;
    doc.text(`USD/Kg: $${quotation.usd_per_kg}`, 14, y);
    y += 6;
    doc.text(`Dólar: $${quotation.dollar_rate}`, 14, y);
    y += 10;
    // Comparación final primero
    doc.setFontSize(16);
    doc.text("Comparación Final", pageWidth / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(12);
    doc.text(
      `Total Inicial: $${quotation.total_initial_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`,
      14,
      y
    );
    y += 6;
    doc.text(
      `Total Cortes: $${quotation.total_cuts_usd.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`,
      14,
      y
    );
    y += 6;
    doc.text(
      `Costos: $${totalCostsUSD.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD`,
      14,
      y
    );
    y += 6;
    doc.text(
      `Dif. Final: ${difFinalUSD < 0 ? "+" : "-"}$${Math.abs(
        difFinalUSD
      ).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} USD (${difFinalUSD < 0 ? "+" : "-"}${Math.abs(difFinalPct).toFixed(
        2
      )}%)`,
      14,
      y
    );
    y += 10;
    // Cuadro comparativo debajo
    doc.setFontSize(16);
    doc.text("Cuadro Comparativo", pageWidth / 2, y, { align: "center" });
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [
        [
          "Corte",
          "%",
          "Kg",
          "Precio ARS",
          "Precio ARS+IVA",
          "Precio USD",
          "USD Final",
          "Notas",
        ],
      ],
      body: cuts.map((c) => {
        // Calcular kg y USD Final igual que en la UI
        const kg = (c.percentage / 100) * (quotation.media_res_weight || 0);
        let usdValue = 0;
        if (c.currency === "USD") {
          usdValue = c.priceUSD;
        } else if (c.currency === "ARS + IVA" && quotation.dollar_rate) {
          usdValue = c.priceARSIVA / 1.105 / quotation.dollar_rate;
        } else if (c.currency === "ARS" && quotation.dollar_rate) {
          usdValue = c.priceARS / quotation.dollar_rate;
        }
        const usdFinal = c[currencyToField(c.currency)] > 0 ? usdValue * kg : 0;
        return [
          c.name,
          c.percentage.toFixed(2) + "%",
          kg > 0
            ? kg.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
          c.priceARS > 0
            ? c.priceARS.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
          c.priceARSIVA > 0
            ? c.priceARSIVA.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
          c.priceUSD > 0
            ? c.priceUSD.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
          usdFinal > 0
            ? usdFinal.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "-",
          c.notes,
        ];
      }),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 10, right: 10 },
      theme: "grid",
    });

    // Cuadro de costos: salto de página para evitar superposición
    doc.addPage();
    let afterTableY = 20;
    doc.setFontSize(16);
    doc.text("Cuadro de Costos", pageWidth / 2, afterTableY, {
      align: "center",
    });
    afterTableY += 6;
    autoTable(doc, {
      startY: afterTableY,
      head: [
        [
          "Corte",
          "Costo",
          "Moneda",
          "Precio ARS",
          "Precio ARS+IVA",
          "Precio USD",
          "USD Final",
          "Notas",
        ],
      ],
      body:
        costs.length > 0
          ? costs.map((c) => [
              c.cutName,
              c.costName,
              c.currency,
              c.priceARS > 0
                ? c.priceARS.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-",
              c.priceARSIVA > 0
                ? c.priceARSIVA.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-",
              c.priceUSD > 0
                ? c.priceUSD.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-",
              c.usdValue > 0
                ? c.usdValue.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-",
              c.notes,
            ])
          : [["No hay costos registrados", "", "", "", "", "", "", ""]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [22, 163, 74] },
      margin: { left: 10, right: 10 },
      theme: "grid",
    });

    // Descargar
    doc.save(
      `beefvalue_cotizacion_${quotation.business.name.replace(
        /\s+/g,
        "_"
      )}_${new Date(quotation.created_at).toLocaleDateString("es-AR")}.pdf`
    );
  };

  // Filtrar por negocio
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
                <th className="p-2 text-left">Dif. (USD, sin costos)</th>
                <th className="p-2 text-left">Dif. (%) sin costos</th>
                {/* COSTOS: nuevas columnas */}
                <th className="p-2 text-left">Costos (USD)</th>
                <th className="p-2 text-left">Dif. Final (USD)</th>
                <th className="p-2 text-left">Dif. Final (%)</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((q, i) => {
                const costos = costTotalsUSD[q.id] || 0;
                const difFinal = (q.difference_usd || 0) - costos;
                const difFinalPct =
                  (q.total_initial_usd || 0) > 0
                    ? (difFinal / q.total_initial_usd) * 100
                    : 0;

                return (
                  <tr
                    key={q.id}
                    className={i % 2 === 0 ? "bg-white dark:bg-gray-800" : ""}
                  >
                    <td className="p-2">
                      {new Date(q.created_at).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-2">{q.business.name}</td>
                    <td className="p-2">{q.media_res_weight}</td>
                    <td className="p-2">{q.usd_per_kg}</td>
                    <td className="p-2">{q.dollar_rate}</td>
                    <td className="p-2">{fmt(q.total_initial_usd)}</td>
                    <td className="p-2">{fmt(q.total_cuts_usd)}</td>

                    {/* === SIGNO CORRECTO SIN COSTOS */}
                    <td className="p-2">
                      {q.difference_usd > 0
                        ? "-"
                        : q.difference_usd < 0
                        ? "+ "
                        : ""}
                      {fmt(Math.abs(q.difference_usd))}
                    </td>
                    <td className="p-2">
                      {q.difference_percentage > 0
                        ? "-"
                        : q.difference_percentage < 0
                        ? "+"
                        : ""}
                      {fmt(Math.abs(q.difference_percentage))}%
                    </td>

                    {/* COSTOS y DIF FINAL */}
                    <td className="p-2">{fmt(costos)}</td>
                    <td className="p-2">
                      {difFinal > 0 ? "- " : difFinal < 0 ? "+" : ""}
                      {fmt(Math.abs(difFinal))}
                    </td>
                    <td className="p-2">
                      {difFinalPct > 0 ? "- " : difFinalPct < 0 ? "+" : ""}
                      {fmt(Math.abs(difFinalPct))}%
                    </td>

                    <td className="p-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(q.id)}
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
                        onClick={() => setShowDeleteConfirmation(q.id)}
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
                      <button
                        onClick={() => handleDownload(q)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all flex items-center gap-1 cursor-pointer"
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
                            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                          />
                        </svg>
                        Descargar
                      </button>
                    </td>
                  </tr>
                );
              })}
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
                  onClick={() => handleDelete(showDeleteConfirmation!)}
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
