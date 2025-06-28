"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import CutItem from "../../components/CutItem";
import BusinessModal from "../../components/BusinessModal";
import { macros } from "@/lib/cuts";
import { useRouter, useParams } from "next/navigation";

// Interfaz para los datos de quotation_cuts
interface QuotationCut {
  cut_id: string;
  price_ars: number;
  price_ars_iva: number;
  price_usd: number;
  currency: "ARS" | "USD" | "ARS + IVA";
  notes: string | null;
  cuts:
    | {
        name: string;
        percentage: number;
        macro: string | null;
        is_fixed_cost: boolean;
      }
    | Array<{
        name: string;
        percentage: number;
        macro: string | null;
        is_fixed_cost: boolean;
      }>;
}

interface Business {
  id: string;
  name: string;
  cuts: string[];
}

interface QuotationProps {
  menuOpen: boolean;
}

export default function EditarCotizacion({ menuOpen }: QuotationProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dollarRate, setDollarRate] = useState<number | null>(null);
  const [lastUpdate] = useState("Cargando...");
  const [cuts, setCuts] = useState<
    Record<
      string,
      {
        id: string;
        prices: { ARS: number; "ARS + IVA": number; USD: number };
        notes: string;
        currency: "ARS" | "USD" | "ARS + IVA";
        percentage: number;
        macro?: string | null;
        isFixedCost: boolean;
      }
    >
  >({});
  const [selectedCutImage, setSelectedCutImage] = useState<string | null>(null);
  const [selectedCutName, setSelectedCutName] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessNameError, setBusinessNameError] = useState(false);
  const [selectedCutsModal, setSelectedCutsModal] = useState<string[]>([]);
  const [editBusinessId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [usdPerKg, setUsdPerKg] = useState<number>(0);
  const [mediaResWeight, setMediaResWeight] = useState<number>(0);
  const [showMissingPricesPopup, setShowMissingPricesPopup] = useState(false);
  const [missingPriceCuts, setMissingPriceCuts] = useState<string[]>([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { id } = useParams();

  const imageMap: Record<string, string> = {
    "Colita de cuadril": "/images/colita_de_cuadril.png",
    "Nalga sin tapa": "/images/nalga_de_adentro_sin_tapa.png",
    "Tapa de nalga": "/images/tapa_de_nalga.png",
    Peceto: "/images/peceto.png",
    Cuadrada: "/images/cuadrada.png",
    "Bola de lomo": "/images/bola_de_lomo.png",
    Tortuguita: "/images/tortuguita.png",
    Garrón: "/images/garron.png",
    "Asado 10 costillas": "/images/asado_10_costillas.png",
    Vacío: "/images/vacio.png",
    Matambre: "/images/matambre.png",
    Entraña: "/images/entraña.png",
    Falda: "/images/falda.png",
    Frío: "/icons/bolsa-de-hielo.png",
    Chingolo: "/images/chingolo.png",
    Aguja: "/images/aguja.png",
    Brazuelo: "/images/brazuelo.png",
    "Carnaza de paleta": "/images/carnaza_de_paleta.png",
    Cogote: "/images/cogote.png",
    Marucha: "/images/marucha.png",
    "Corazón de cuadril": "/images/corazon_de_cuadril.png",
    "Bife ancho sin tapa": "/images/bife_ancho_sin_tapa.png",
    "Tapa de cuadril": "/images/tapa_de_cuadril.png",
  };

  useEffect(() => {
    const fetchQuotation = async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select(
          `
          id,
          business_id,
          media_res_weight,
          usd_per_kg,
          dollar_rate,
          quotation_cuts (
            cut_id,
            price_ars,
            price_ars_iva,
            price_usd,
            currency,
            notes,
            cuts (name, percentage, macro, is_fixed_cost)
          )
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching quotation:", error);
        setErrorMessage("No se pudo cargar la cotización.");
        setShowErrorPopup(true);
        return;
      }

      setSelectedBusiness(data.business_id);
      setMediaResWeight(data.media_res_weight);
      setUsdPerKg(data.usd_per_kg);
      setDollarRate(data.dollar_rate);

      const cutsData: Record<
        string,
        {
          id: string;
          prices: { ARS: number; "ARS + IVA": number; USD: number };
          notes: string;
          currency: "ARS" | "USD" | "ARS + IVA";
          percentage: number;
          macro?: string | null;
          isFixedCost: boolean;
        }
      > = {};
      data.quotation_cuts.forEach((qc: QuotationCut) => {
        const cut = Array.isArray(qc.cuts) ? qc.cuts[0] : qc.cuts;
        cutsData[cut.name] = {
          id: qc.cut_id,
          prices: {
            ARS: qc.price_ars,
            "ARS + IVA": qc.price_ars_iva,
            USD: qc.price_usd,
          },
          notes: qc.notes || "",
          currency: qc.currency,
          percentage: cut.percentage,
          macro: cut.macro,
          isFixedCost: cut.is_fixed_cost,
        };
      });
      setCuts(cutsData);
    };

    const fetchBusinesses = async () => {
      const { data, error } = await supabase.from("businesses").select(`
        id,
        name,
        user_id,
        business_cuts (cut_id)
    `);
      if (error) {
        console.error("Error fetching businesses:", error);
        setErrorMessage("No se pudo cargar los negocios.");
        setShowErrorPopup(true);
      } else {
        const businessesData = data.map((business) => ({
          id: business.id,
          name: business.name,
          cuts: business.business_cuts.map(
            (bc: { cut_id: string }) => bc.cut_id
          ),
        }));
        setBusinesses(businessesData || []);
      }
    };

    const setUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email || "Usuario");
        setUserId(session.user.id);
      }
      setLoading(false);
    };

    fetchQuotation();
    fetchBusinesses();
    setUserData();
  }, [id, router]);

  const handleCutChange = (
    cut: string,
    field: "price" | "currency" | "notes",
    value: string | number
  ) => {
    setCuts((prev) => {
      // Si el corte no existe en el estado, no hacemos nada
      if (!prev[cut]) {
        console.warn(`Corte ${cut} no encontrado en el estado cuts.`);
        return prev;
      }

      if (prev[cut].isFixedCost && field === "price") return prev;

      if (field === "price") {
        const currency = prev[cut].currency;
        const updatedCuts = { ...prev };

        if (prev[cut].macro && Number(value) > 0) {
          const macro = prev[cut].macro!;
          if (updatedCuts[macro]) {
            updatedCuts[macro].prices = { ARS: 0, "ARS + IVA": 0, USD: 0 };
          }
        }

        if (macros.includes(cut) && Number(value) > 0) {
          Object.keys(updatedCuts).forEach((c) => {
            if (updatedCuts[c].macro === cut) {
              updatedCuts[c].prices = { ARS: 0, "ARS + IVA": 0, USD: 0 };
            }
          });
        }

        return {
          ...updatedCuts,
          [cut]: {
            ...updatedCuts[cut],
            prices: { ...updatedCuts[cut].prices, [currency]: Number(value) },
          },
        };
      }

      if (field === "currency") {
        return {
          ...prev,
          [cut]: {
            ...prev[cut],
            currency: value as "ARS" | "USD" | "ARS + IVA",
            prices: {
              ARS: value === "ARS" ? prev[cut].prices.ARS : 0,
              "ARS + IVA":
                value === "ARS + IVA" ? prev[cut].prices["ARS + IVA"] : 0,
              USD: value === "USD" ? prev[cut].prices.USD : 0,
            },
          },
        };
      }

      return { ...prev, [cut]: { ...prev[cut], notes: value as string } };
    });
  };

  const handleCutSelect = (cut: string) => {
    setSelectedCutImage(imageMap[cut] || null);
    setSelectedCutName(cut);
  };

  const getDisplayCuts = useCallback(() => {
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business) return [];

    const displayCuts: string[] = [];
    macros.forEach((macro) => {
      const subCuts = Object.keys(cuts).filter(
        (cut) => cuts[cut].macro === macro && !cuts[cut].isFixedCost
      );
      const hasSelectedSubCut = subCuts.some((cut) =>
        business.cuts.includes(cuts[cut].id)
      );

      if (!hasSelectedSubCut && cuts[macro]) {
        displayCuts.push(macro);
      } else {
        Object.keys(cuts).forEach((cut) => {
          if (cuts[cut].macro === macro) {
            displayCuts.push(cut);
          }
        });
      }
    });

    // Solo añadimos "Frío" si existe en cuts
    if (cuts["Frío"]) {
      displayCuts.push("Frío");
    }

    return displayCuts;
  }, [businesses, selectedBusiness, cuts]);

  const calculateTotalUSD = () => {
    if (!dollarRate) return "0.00";
    let total = 0;

    const displayCuts = getDisplayCuts();
    displayCuts.forEach((cut) => {
      const { prices, currency, percentage } = cuts[cut];
      const price = prices[currency];
      if (price > 0) {
        const usdValue =
          currency === "USD"
            ? price
            : currency === "ARS + IVA"
            ? price / 1.105 / dollarRate
            : currency === "ARS"
            ? price / dollarRate
            : 0;
        const kg = (percentage / 100) * mediaResWeight;
        total += usdValue * kg;
      }
    });

    return total.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateTotalPercentage = () => {
    const displayCuts = getDisplayCuts();
    return displayCuts
      .reduce((sum, cut) => sum + cuts[cut].percentage, 0)
      .toFixed(2);
  };

  const validatePrices = useCallback(() => {
    const allowedZeroCuts = new Set([
      "Manipuleo de ral",
      "Frío",
      "Hueso de rueda",
      "Grasa de parrillero",
      "Manipuleo de rueda",
      "Manipuleo de delantero",
      "Grasa de delantero",
      "Hueso de delantero",
      "Hueso de ral",
      "Grasa de ral",
      "Grasa de rueda",
      "Manipuleo de parrillero",
    ]);
    const displayCuts = getDisplayCuts();
    const missing: string[] = [];
    displayCuts.forEach((cut) => {
      const { prices, currency } = cuts[cut];
      const price = prices[currency];
      if (!allowedZeroCuts.has(cut) && price <= 0) {
        missing.push(cut);
      }
    });
    setMissingPriceCuts(missing);
    return missing.length === 0;
  }, [cuts, getDisplayCuts]);

  const handleUpdateQuotation = async () => {
    if (!validatePrices()) {
      setShowMissingPricesPopup(true);
      return;
    }

    try {
      const totalInitialUSDNum = mediaResWeight * usdPerKg;
      const rawTotalCutsUSD = calculateTotalUSD();
      const totalCutsUSD = Number(
        rawTotalCutsUSD.replace(/\./g, "").replace(",", ".")
      );
      const differenceUSD = totalInitialUSDNum - totalCutsUSD;
      const differencePercentage =
        totalInitialUSDNum === 0
          ? 0
          : Number(((differenceUSD / totalInitialUSDNum) * 100).toFixed(2));

      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          media_res_weight: mediaResWeight,
          usd_per_kg: usdPerKg,
          dollar_rate: dollarRate || 1200.5,
          total_initial_usd: totalInitialUSDNum,
          total_cuts_usd: totalCutsUSD,
          difference_usd: differenceUSD,
          difference_percentage: differencePercentage,
        })
        .eq("id", id);

      if (updateError)
        throw new Error(`Error updating quotation: ${updateError.message}`);

      await supabase.from("quotation_cuts").delete().eq("quotation_id", id);

      const quotationCuts = getDisplayCuts().map((cut) => ({
        quotation_id: id,
        cut_id: cuts[cut].id,
        price_ars: cuts[cut].prices.ARS,
        price_ars_iva: cuts[cut].prices["ARS + IVA"],
        price_usd: cuts[cut].prices.USD,
        currency: cuts[cut].currency,
        notes: cuts[cut].notes,
      }));

      const { error: cutsError } = await supabase
        .from("quotation_cuts")
        .insert(quotationCuts);

      if (cutsError)
        throw new Error(`Error updating quotation cuts: ${cutsError.message}`);

      setShowSuccessPopup(true);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la cotización."
      );
      setShowErrorPopup(true);
    }
  };

  const handleExit = () => {
    setShowExitConfirmation(true);
  };

  const confirmExit = () => {
    router.push("/historial");
  };

  const handleBusinessSave = async () => {
    if (!businessName.trim()) {
      setBusinessNameError(true);
      return;
    }
    try {
      if (editBusinessId) {
        const { error } = await supabase
          .from("businesses")
          .update({ name: businessName })
          .eq("id", editBusinessId)
          .eq("user_id", userId);
        if (error) throw new Error(`Error updating business: ${error.message}`);
        await supabase
          .from("business_cuts")
          .delete()
          .eq("business_id", editBusinessId);
        const businessCuts = selectedCutsModal.map((cutId) => ({
          business_id: editBusinessId,
          cut_id: cutId,
        }));
        await supabase.from("business_cuts").insert(businessCuts);
        setBusinesses(
          businesses.map((b) =>
            b.id === editBusinessId
              ? { ...b, name: businessName, cuts: selectedCutsModal }
              : b
          )
        );
      }
      setShowBusinessModal(false);
      setShowSuccessPopup(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo guardar el negocio.");
      setShowErrorPopup(true);
    }
  };

  const handleBusinessDelete = async (id: string) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }
    try {
      const { error } = await supabase
        .from("businesses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw new Error("Error deleting business: " + error.message);
      setBusinesses(businesses.filter((b) => b.id !== id));
      if (selectedBusiness === id) setSelectedBusiness(null);
      setShowBusinessModal(false);
      setConfirmDelete(null);
      setShowSuccessPopup(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("No se pudo eliminar el negocio.");
      setShowErrorPopup(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--foreground)]">Cargando...</p>
      </div>
    );
  }

  if (!userEmail) return null;

  const totalInitialUSDNum = mediaResWeight * usdPerKg;
  const totalInitialUSD = totalInitialUSDNum.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const rawTotalCutsUSD = calculateTotalUSD();
  const totalCutsUSD = Number(
    rawTotalCutsUSD.replace(/\./g, "").replace(",", ".")
  );
  const differenceUSD = totalInitialUSDNum - totalCutsUSD;
  const differencePercentage =
    totalInitialUSDNum === 0
      ? 0
      : Number(((differenceUSD / totalInitialUSDNum) * 100).toFixed(2));

  return (
    <div className="flex flex-1 flex-col p-6 overflow-hidden">
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[var(--foreground)]">
              Peso Media Res (kg):
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={mediaResWeight}
              onFocus={(e) => {
                if (e.target.value === "0") e.target.value = "";
              }}
              onChange={(e) => setMediaResWeight(Number(e.target.value))}
              className="px-2 py-1 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] w-24"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[var(--foreground)]">USD/kg:</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={usdPerKg}
              onFocus={(e) => {
                if (e.target.value === "0") e.target.value = "";
              }}
              onChange={(e) => setUsdPerKg(Number(e.target.value))}
              className="px-2 py-1 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] w-24"
              required
            />
          </div>
          {usdPerKg > 0 && mediaResWeight > 0 && selectedBusiness && (
            <div className="flex items-center gap-2">
              <label className="text-[var(--foreground)]">Negocio:</label>
              <span className="px-2 py-1 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)]">
                {businesses.find((b) => b.id === selectedBusiness)?.name ||
                  "Cargando..."}
              </span>
            </div>
          )}
        </div>
        {usdPerKg > 0 && mediaResWeight > 0 && (
          <div className="flex justify-end gap-4 mt-4">
            <button
              onClick={handleExit}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all flex items-center gap-1 cursor-pointer"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Salir
            </button>
            <button
              onClick={handleUpdateQuotation}
              className="px-4 py-2 bg-green-400 text-white rounded-md hover:bg-green-500 transition-all flex items-center gap-1 cursor-pointer"
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              ¿Salir sin guardar?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Los cambios no guardados se perderán. ¿Estás seguro?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowExitConfirmation(false)}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExit}
                className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all cursor-pointer text-lg font-medium"
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg text-center">
            <svg
              className="w-14 h-14 mx-auto mb-4 text-emerald-400 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              ¡Éxito!
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Cotización actualizada exitosamente.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowSuccessPopup(false);
                  router.push("/historial");
                }}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Error
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              {errorMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowErrorPopup(false);
                  router.push("/historial");
                }}
                className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showMissingPricesPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg text-center">
            <svg
              className="w-14 h-14 mx-auto mb-4 text-yellow-400 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M

    12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              Precios Faltantes
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Por favor, completa los precios de los siguientes cortes para
              guardar los cambios:
            </p>
            <ul className="list-disc pl-5 mb-6 text-[var(--foreground)] text-left inline-block">
              {missingPriceCuts.map((cut) => (
                <li key={cut}>{cut}</li>
              ))}
            </ul>
            <div className="flex justify-center">
              <button
                onClick={() => setShowMissingPricesPopup(false)}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <BusinessModal
        show={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        businessName={businessName}
        setBusinessName={setBusinessName}
        businessNameError={businessNameError}
        setBusinessNameError={setBusinessNameError}
        selectedCutsModal={selectedCutsModal}
        toggleCutSelection={(cut) => {
          setSelectedCutsModal((prev) =>
            prev.includes(cut) ? prev.filter((c) => c !== cut) : [...prev, cut]
          );
        }}
        editBusinessId={editBusinessId}
        onSave={handleBusinessSave}
        onDelete={handleBusinessDelete}
        confirmDelete={confirmDelete}
        cuts={Object.fromEntries(
          Object.entries(cuts).map(([name, cut]) => [
            name,
            {
              id: cut.id,
              name,
              percentage: cut.percentage,
              macro: cut.macro ?? null,
              is_fixed_cost: cut.isFixedCost,
            },
          ])
        )}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[28rem] sm:w-[30rem] lg:w-[29rem] bg-[var(--background)] border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto shrink-0">
          <div className="space-y-4">
            {usdPerKg > 0 && mediaResWeight > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Dólar (oficial): $
                  {dollarRate?.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "Cargando..."}
                </p>
                <p>
                  Última actualización: <span>{lastUpdate}</span>
                </p>
              </div>
            )}
            {selectedBusiness ? (
              <div className="space-y-2">
                {getDisplayCuts().map((cut) => {
                  // Verificamos que el corte exista en cuts antes de renderizar
                  if (!cuts[cut]) {
                    console.warn(
                      `Corte ${cut} no encontrado en cuts, omitiendo...`
                    );
                    return null;
                  }

                  const isMacro = macros.includes(cut);
                  const subCuts = Object.keys(cuts).filter(
                    (c) => cuts[c].macro === cut && !cuts[c].isFixedCost
                  );
                  const hasSubCutPrices = subCuts.some(
                    (c) => cuts[c].prices[cuts[c].currency] > 0
                  );
                  const isDisabled = isMacro && hasSubCutPrices;

                  return (
                    <CutItem
                      key={cut}
                      cut={cut}
                      display={`${cut} (${cuts[cut].percentage.toFixed(2)}%)`}
                      onChange={handleCutChange}
                      data={cuts[cut]}
                      image={imageMap[cut]}
                      onClick={
                        imageMap[cut] ? () => handleCutSelect(cut) : undefined
                      }
                      isDisabled={isDisabled}
                      hasMissingPrice={missingPriceCuts.includes(cut)}
                    />
                  );
                })}
              </div>
            ) : usdPerKg > 0 && mediaResWeight > 0 ? (
              <p className="text-[var(--foreground)] text-center">
                Negocio cargado, pero no editable desde esta pantalla.
              </p>
            ) : (
              <p className="text-[var(--foreground)] text-center">
                Ingresa el peso de la media res y el valor por kg en USD para
                comenzar.
              </p>
            )}
          </div>
        </aside>

        <main
          className={`flex-1 p-6 overflow-y-auto transition-all duration-300 ${
            menuOpen ? "ml-64" : "ml-14"
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {usdPerKg > 0 && mediaResWeight > 0 && (
              <div className="bg-[var(--background)] border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg p-6 col-span-2">
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                  Información Inicial
                </h2>
                <div className="flex flex-col gap-2 text-lg text-[var(--foreground)]">
                  <p>
                    <span className="font-semibold">Peso:</span>{" "}
                    {mediaResWeight} kg
                  </p>
                  <p>
                    <span className="font-semibold">Valor por kg:</span> $
                    {usdPerKg.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USD
                  </p>
                  <p>
                    <span className="font-semibold">Total:</span> $
                    {totalInitialUSD} USD
                  </p>
                </div>
              </div>
            )}
            <div className="bg-[var(--background)] border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Cortes Asociados
              </h2>
              {selectedCutName ? (
                <div className="font-mono text-[var(--foreground)]">
                  {(() => {
                    const macro =
                      cuts[selectedCutName]?.macro || selectedCutName;
                    const relatedCuts = Object.keys(cuts).filter(
                      (cut) =>
                        (cuts[cut].macro === macro || cut === macro) &&
                        !cuts[cut].isFixedCost
                    );
                    return relatedCuts.map((cut) => (
                      <p
                        key={cut}
                        className={
                          cut === selectedCutName ? "text-blue-500" : ""
                        }
                      >
                        {cut}
                      </p>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-gray-500">
                  Selecciona un corte para ver sus asociaciones
                </p>
              )}
            </div>
            <div className="bg-[var(--background)] border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                Imagen del Corte
              </h2>
              {selectedCutName && (
                <p className="text-lg text-[var(--foreground)] mb-4">
                  {selectedCutName}
                </p>
              )}
              {selectedCutImage ? (
                <Image
                  src={selectedCutImage}
                  alt="Corte seleccionado"
                  width={400}
                  height={300}
                  className="w-full h-auto rounded-md"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                  Selecciona un corte para ver su imagen
                </div>
              )}
            </div>
            {usdPerKg > 0 && mediaResWeight > 0 && (
              <div className="bg-[var(--background)] border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg p-6 col-span-2">
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                  Cuadro Comparativo
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-[var(--foreground)]">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="p-2 text-left">Corte</th>
                        <th className="p-2 text-left">%</th>
                        <th className="p-2 text-left">Kg</th>
                        <th className="p-2 text-left">Precio ARS</th>
                        <th className="p-2 text-left">Precio ARS + IVA</th>
                        <th className="p-2 text-left">Precio USD</th>
                        <th className="p-2 text-left">USD Final</th>
                        <th className="p-2 text-left max-w-[150px]">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDisplayCuts().map((cut, i) => {
                        if (!cuts[cut]) return null; // Evitamos renderizar cortes no existentes

                        const { prices, currency, percentage } = cuts[cut];
                        const usdValue =
                          currency === "USD"
                            ? prices.USD
                            : currency === "ARS + IVA" && dollarRate
                            ? prices["ARS + IVA"] / 1.105 / dollarRate
                            : currency === "ARS" && dollarRate
                            ? prices.ARS / dollarRate
                            : 0;
                        const kg = (percentage / 100) * mediaResWeight;
                        const usdFinal =
                          prices[currency] > 0 ? usdValue * kg : 0;

                        return (
                          <tr
                            key={cut}
                            className={
                              i % 2 === 0 ? "bg-white dark:bg-gray-800" : ""
                            }
                          >
                            <td className="p-2">{cut}</td>
                            <td className="p-2">{percentage.toFixed(2)}%</td>
                            <td className="p-2">
                              {kg.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="p-2">
                              {prices.ARS > 0
                                ? prices.ARS.toLocaleString("es-AR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "-"}
                            </td>
                            <td className="p-2">
                              {prices["ARS + IVA"] > 0
                                ? prices["ARS + IVA"].toLocaleString("es-AR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "-"}
                            </td>
                            <td className="p-2">
                              {prices[currency] > 0 && dollarRate
                                ? usdValue.toLocaleString("es-AR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "-"}
                            </td>
                            <td className="p-2">
                              {usdFinal > 0
                                ? usdFinal.toLocaleString("es-AR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : "-"}
                            </td>
                            <td className="p-2 max-w-[150px] break-words">
                              {cuts[cut].notes || "-"}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold bg-gray-100 dark:bg-gray-700">
                        <td className="p-2">Total</td>
                        <td className="p-2">{calculateTotalPercentage()}%</td>
                        <td className="p-2">
                          {mediaResWeight.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-2">-</td>
                        <td className="p-2">-</td>
                        <td className="p-2">-</td>
                        <td className="p-2">${calculateTotalUSD()}</td>
                        <td className="p-2">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6">
                  <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                    Comparación Final
                  </h2>
                  <div className="flex flex-col gap-3 text-xl text-[var(--foreground)]">
                    <p>
                      <span className="font-semibold">Inicial:</span> $
                      {totalInitialUSD} USD
                    </p>
                    <p>
                      <span className="font-semibold">Total Cortes:</span> $
                      {calculateTotalUSD()} USD
                    </p>
                    <p
                      className={`font-semibold ${
                        differenceUSD > 0 ? "text-red-500" : "text-green-500"
                      }`}
                    >
                      Diferencia: {differenceUSD > 0 ? "-" : "+"}$
                      {Math.abs(differenceUSD).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD ({differenceUSD > 0 ? "-" : "+"}
                      {Math.abs(differencePercentage)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
