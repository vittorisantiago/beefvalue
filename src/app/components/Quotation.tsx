"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import CutItem from "./CutItem";
import BusinessModal from "./BusinessModal";
import { fetchCuts, macros, type Cut } from "@/lib/cuts";

interface Business {
  id: string;
  name: string;
  cuts: string[];
}

interface QuotationProps {
  menuOpen: boolean;
}

interface CutState extends Cut {
  prices: { ARS: number; "ARS + IVA": number; USD: number };
  notes: string;
  currency: "ARS" | "USD" | "ARS + IVA";
}

export default function Quotation({ menuOpen }: QuotationProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dollarRate, setDollarRate] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState("Cargando...");
  const [cuts, setCuts] = useState<Record<string, CutState>>({});
  const [selectedCutImage, setSelectedCutImage] = useState<string | null>(null);
  const [selectedCutName, setSelectedCutName] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessNameError, setBusinessNameError] = useState(false);
  const [selectedCutsModal, setSelectedCutsModal] = useState<string[]>([]);
  const [editBusinessId, setEditBusinessId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [usdPerKg, setUsdPerKg] = useState<number>(0);
  const [mediaResWeight, setMediaResWeight] = useState<number>(0);
  const [showMissingPricesPopup, setShowMissingPricesPopup] = useState(false);
  const [missingPriceCuts, setMissingPriceCuts] = useState<string[]>([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showBusinessSuccessPopup, setShowBusinessSuccessPopup] =
    useState(false);
  const [showBusinessErrorPopup, setShowBusinessErrorPopup] = useState(false);
  const [businessErrorMessage, setBusinessErrorMessage] = useState("");
  const [showNoBusinessPopup, setShowNoBusinessPopup] = useState(false);
  const [showBusinessInUsePopup, setShowBusinessInUsePopup] = useState(false);
  const [businessHasQuotations, setBusinessHasQuotations] = useState<
    Record<string, boolean>
  >({});
  const [lastAction, setLastAction] = useState<
    "created" | "updated" | "deleted" | null
  >(null);

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
    const fetchDollarRate = async () => {
      try {
        const response = await fetch("https://dolarapi.com/v1/dolares/oficial");
        const data = await response.json();
        setDollarRate(data.venta);
        setLastUpdate(
          new Date(data.fechaActualizacion).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch (error) {
        console.error("Error fetching dollar rate:", error);
        setDollarRate(1200.5);
        setLastUpdate(
          new Date().toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        );
      }
    };
    fetchDollarRate();

    const fetchBusinesses = async () => {
      const { data, error } = await supabase.from("businesses").select(`
        id,
        name,
        user_id,
        business_cuts (cut_id)
      `);
      if (error) console.error("Error fetching businesses:", error);
      else {
        const businessesData = data.map((business) => ({
          id: business.id,
          name: business.name,
          cuts: business.business_cuts.map(
            (bc: { cut_id: string }) => bc.cut_id
          ),
        }));
        setBusinesses(businessesData || []);

        // Verificar si cada negocio tiene cotizaciones asociadas
        const quotationsCheck: Record<string, boolean> = {};
        for (const business of businessesData) {
          const { data: quotations } = await supabase
            .from("quotations")
            .select("id")
            .eq("business_id", business.id)
            .limit(1);
          quotationsCheck[business.id] =
            Array.isArray(quotations) && quotations.length > 0;
        }
        setBusinessHasQuotations(quotationsCheck);
      }
    };
    fetchBusinesses();

    const setUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserEmail(session.user.email || "Usuario");
        setUserId(session.user.id);
      }
    };
    setUserData();

    const initializeCuts = async () => {
      const fetchedCuts = await fetchCuts();
      const initialCutsState: Record<string, CutState> = {};
      Object.entries(fetchedCuts).forEach(([name, cut]) => {
        initialCutsState[name] = {
          ...cut,
          prices: { ARS: 0, "ARS + IVA": 0, USD: 0 },
          notes: "",
          currency: "ARS",
        };
      });
      setCuts(initialCutsState);
      setLoading(false);
    };
    initializeCuts();
  }, []);

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

      if (!hasSelectedSubCut) {
        displayCuts.push(macro);
      } else {
        Object.keys(cuts).forEach((cut) => {
          if (cuts[cut].macro === macro) {
            displayCuts.push(cut);
          }
        });
      }
    });
    displayCuts.push("Frío");
    return displayCuts;
  }, [businesses, selectedBusiness, cuts]);

  const validatePrices = useCallback(() => {
    const displayCuts = getDisplayCuts();
    const missing: string[] = [];
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

  useEffect(() => {
    if (selectedBusiness && usdPerKg > 0 && mediaResWeight > 0) {
      validatePrices();
    }
  }, [selectedBusiness, mediaResWeight, usdPerKg, validatePrices]);

  const handleReset = () => {
    setUsdPerKg(0);
    setMediaResWeight(0);
    setSelectedCutImage(null);
    setSelectedCutName(null);
    setSelectedBusiness(null);
    setBusinessName("");
    setSelectedCutsModal([]);
    setEditBusinessId(null);
    setConfirmDelete(null);
    setCuts((prev) => {
      const resetCuts: Record<string, CutState> = {};
      Object.entries(prev).forEach(([name, cut]) => {
        resetCuts[name] = {
          ...cut,
          prices: { ARS: 0, "ARS + IVA": 0, USD: 0 },
          notes: "",
          currency: "ARS",
        };
      });
      return resetCuts;
    });
  };

  const handleCutChange = (
    cut: string,
    field: "price" | "currency" | "notes",
    value: string | number
  ) => {
    setCuts((prev) => {
      if (prev[cut].isFixedCost && field === "price") return prev;

      if (field === "price") {
        const currency = prev[cut].currency;
        const updatedCuts = { ...prev };

        if (prev[cut].macro && Number(value) > 0) {
          const macro = prev[cut].macro!;
          updatedCuts[macro].prices = { ARS: 0, "ARS + IVA": 0, USD: 0 };
        }

        if (macros.includes(cut) && Number(value) > 0) {
          Object.keys(updatedCuts).forEach((c) => {
            if (prev[c].macro === cut) {
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

  const handleBusinessSelect = (businessId: string) => {
    setSelectedBusiness(businessId);
  };

  const openBusinessModal = (mode: "add" | "edit", id?: string) => {
    if (mode === "add") {
      setBusinessName("");
      setSelectedCutsModal([]);
      setEditBusinessId(null);
    } else if (mode === "edit" && id) {
      const business = businesses.find((b) => b.id === id);
      if (business) {
        setBusinessName(business.name);
        setSelectedCutsModal(business.cuts);
        setEditBusinessId(id);
      }
    }
    setShowBusinessModal(true);
    setBusinessNameError(false);
  };

  const saveBusiness = async () => {
    if (!businessName.trim()) {
      setBusinessNameError(true);
      return;
    }
    try {
      if (editBusinessId) {
        await supabase
          .from("business_cuts")
          .delete()
          .eq("business_id", editBusinessId);

        const { error: updateError } = await supabase
          .from("businesses")
          .update({ name: businessName })
          .eq("id", editBusinessId)
          .eq("user_id", userId);

        if (updateError)
          throw new Error(`Error updating business: ${updateError.message}`);

        if (selectedCutsModal.length > 0) {
          const { error: insertError } = await supabase
            .from("business_cuts")
            .insert(
              selectedCutsModal.map((cutId) => ({
                business_id: editBusinessId,
                cut_id: cutId,
              }))
            );
          if (insertError)
            throw new Error(
              `Error inserting business cuts: ${insertError.message}`
            );
        }

        setBusinesses(
          businesses.map((b) =>
            b.id === editBusinessId
              ? { ...b, name: businessName, cuts: selectedCutsModal }
              : b
          )
        );
        setLastAction("updated"); // Establece la acción como actualización
      } else {
        const { data, error } = await supabase
          .from("businesses")
          .insert([{ name: businessName, user_id: userId }])
          .select()
          .single();

        if (error) throw new Error(`Error adding business: ${error.message}`);

        if (data && selectedCutsModal.length > 0) {
          const { error: insertError } = await supabase
            .from("business_cuts")
            .insert(
              selectedCutsModal.map((cutId) => ({
                business_id: data.id,
                cut_id: cutId,
              }))
            );
          if (insertError)
            throw new Error(
              `Error inserting business cuts: ${insertError.message}`
            );
        }

        setBusinesses([
          ...businesses,
          { id: data.id, name: businessName, cuts: selectedCutsModal },
        ]);
        setBusinessHasQuotations((prev) => ({
          ...prev,
          [data.id]: false,
        }));
        setSelectedBusiness(data.id);
        setLastAction("created"); // Establece la acción como creación
      }
      setShowBusinessModal(false);
      setShowBusinessSuccessPopup(true);
    } catch (error) {
      console.error(error);
      setBusinessErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el negocio."
      );
      setShowBusinessErrorPopup(true);
    }
  };

  const deleteBusiness = async (id: string) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }

    // Verificar si el negocio está asociado a alguna cotización
    const { data: quotations, error: quotationError } = await supabase
      .from("quotations")
      .select("id")
      .eq("business_id", id)
      .limit(1);

    if (quotationError) {
      console.error("Error checking quotations:", quotationError);
      setBusinessErrorMessage(
        quotationError instanceof Error
          ? quotationError.message
          : "Error al verificar cotizaciones asociadas."
      );
      setShowBusinessErrorPopup(true);
      setConfirmDelete(null);
      setEditBusinessId(null);
      return;
    }

    if (quotations && quotations.length > 0) {
      setShowBusinessInUsePopup(true);
      setConfirmDelete(null);
      setEditBusinessId(null);
      return;
    }

    // Si no hay cotizaciones asociadas, proceder con la eliminación
    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting business:", error);
      setBusinessErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el negocio."
      );
      setShowBusinessErrorPopup(true);
    } else {
      setBusinesses(businesses.filter((b) => b.id !== id));
      if (selectedBusiness === id) setSelectedBusiness(null);
      setShowBusinessModal(false);
      setConfirmDelete(null);
      setEditBusinessId(null);
      setBusinessHasQuotations((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
      setLastAction("deleted"); // Establece la acción como eliminación
      setShowBusinessSuccessPopup(true);
    }
  };

  const toggleCutSelection = (cutId: string) => {
    setSelectedCutsModal((prev) =>
      prev.includes(cutId) ? prev.filter((c) => c !== cutId) : [...prev, cutId]
    );
  };

  const handleSaveQuotation = async () => {
    // Validar negocio seleccionado
    if (!selectedBusiness) {
      setShowNoBusinessPopup(true);
      return;
    }

    // Validar precios
    if (!validatePrices()) {
      setShowMissingPricesPopup(true);
      return;
    }

    // Si ambas validaciones pasan, guardar la cotización
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

      const { data: quotationData, error: quotationError } = await supabase
        .from("quotations")
        .insert({
          user_id: userId,
          business_id: selectedBusiness,
          media_res_weight: mediaResWeight,
          usd_per_kg: usdPerKg,
          dollar_rate: dollarRate || 1200.5,
          total_initial_usd: totalInitialUSDNum,
          total_cuts_usd: totalCutsUSD,
          difference_usd: differenceUSD,
          difference_percentage: differencePercentage,
        })
        .select()
        .single();

      if (quotationError)
        throw new Error(`Error saving quotation: ${quotationError.message}`);

      const quotationCuts = getDisplayCuts().map((cut) => ({
        quotation_id: quotationData.id,
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
        throw new Error(`Error saving quotation cuts: ${cutsError.message}`);

      // Actualizar el estado de businessHasQuotations
      if (selectedBusiness) {
        setBusinessHasQuotations((prev) => ({
          ...prev,
          [selectedBusiness]: true,
        }));
      }

      setShowSuccessPopup(true);
      handleReset();
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la cotización."
      );
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
              Peso Prom. Media Res (Kg):
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
            <label className="text-[var(--foreground)]">USD/Kg:</label>
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
          {usdPerKg > 0 && mediaResWeight > 0 && (
            <>
              <select
                value={selectedBusiness || ""}
                onChange={(e) => handleBusinessSelect(e.target.value)}
                className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
              >
                <option value="">Seleccionar Negocio</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => openBusinessModal("add")}
                className="px-3 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1 cursor-pointer"
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
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Agregar
              </button>
              {selectedBusiness && !businessHasQuotations[selectedBusiness] && (
                <button
                  onClick={() => openBusinessModal("edit", selectedBusiness)}
                  className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all flex items-center gap-1 cursor-pointer"
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
              )}
            </>
          )}
        </div>
        {usdPerKg > 0 && mediaResWeight > 0 && (
          <div className="flex justify-end gap-4 mt-4">
            <button
              onClick={handleReset}
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
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.992"
                />
              </svg>
              Limpiar
            </button>
            <button
              onClick={handleSaveQuotation}
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
              Guardar Cotización
            </button>
          </div>
        )}
      </div>

      <BusinessModal
        show={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        businessName={businessName}
        setBusinessName={setBusinessName}
        businessNameError={businessNameError}
        setBusinessNameError={setBusinessNameError}
        selectedCutsModal={selectedCutsModal}
        toggleCutSelection={toggleCutSelection}
        editBusinessId={editBusinessId}
        onSave={saveBusiness}
        onDelete={deleteBusiness}
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

      {showMissingPricesPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Precios Faltantes
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Por favor, completa los precios de los siguientes cortes para
              poder guardar la cotización:
            </p>
            <ul className="list-disc pl-5 mb-6 text-[var(--foreground)]">
              {missingPriceCuts.map((cut) => (
                <li key={cut}>{cut}</li>
              ))}
            </ul>
            <div className="flex justify-end">
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

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Éxito
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Cotización guardada exitosamente. Podras verla en historial de
              cotizaciones.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Error
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              {errorMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorPopup(false)}
                className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBusinessSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Éxito
            </h3>
            {(() => {
              let successMessage = "Negocio creado exitosamente.";
              if (lastAction === "updated") {
                successMessage = "Negocio actualizado exitosamente.";
              } else if (lastAction === "deleted") {
                successMessage = "Negocio eliminado exitosamente.";
              }
              return (
                <p className="text-lg text-[var(--foreground)] mb-6">
                  {successMessage}
                </p>
              );
            })()}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowBusinessSuccessPopup(false);
                  setLastAction(null); // Restablece lastAction al cerrar
                }}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBusinessErrorPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Error
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              {businessErrorMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBusinessErrorPopup(false)}
                className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showNoBusinessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Negocio Faltante
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Por favor, selecciona un negocio antes de guardar la cotización.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowNoBusinessPopup(false)}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showBusinessInUsePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Lo sentimos
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              Este negocio no puede ser eliminado porque está asociado a una o
              más cotizaciones.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowBusinessInUsePopup(false)}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[28rem] sm:w-[30rem] lg:w-[29rem] bg-[var(--background)] border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto shrink-0">
          <div className="space-y-4">
            {usdPerKg > 0 && mediaResWeight > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="text-base md:text-lg">
                  Dólar (oficial): $
                  {dollarRate?.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || "Cargando..."}
                </p>
                <p className="text-base md:text-lg">
                  Última actualización: <span>{lastUpdate}</span>
                </p>
              </div>
            )}
            {selectedBusiness ? (
              <div className="space-y-2">
                {getDisplayCuts().map((cut) => {
                  const isMacro = macros.includes(cut);
                  const subCuts = Object.keys(cuts).filter(
                    (c) => cuts[c].macro === cut && !cuts[c].isFixedCost
                  );
                  const hasSubCutPrices = subCuts.some(
                    (c) => cuts[c].prices[cuts[c].currency] > 0
                  );
                  const isDisabled = isMacro && hasSubCutPrices;
                  const hasMissingPrice = missingPriceCuts.includes(cut);

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
                      className={hasMissingPrice ? "border-red-500" : ""}
                    />
                  );
                })}
              </div>
            ) : usdPerKg > 0 && mediaResWeight > 0 ? (
              <p className="text-[var(--foreground)] text-center">
                Por favor, selecciona o agrega un negocio para comenzar.
              </p>
            ) : (
              <p className="text-[var(--foreground)] text-center">
                Ingresa el peso promedio de la media res y el valor por kg en
                dólares para comenzar.
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
                    {mediaResWeight} Kg
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
                      cuts[selectedCutName].macro || selectedCutName;
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
