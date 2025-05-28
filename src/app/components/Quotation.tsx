"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import CutItem from "./CutItem";
import BusinessModal from "./BusinessModal";
import { initialCuts, macros } from "@/lib/cuts";

interface Business {
  id: string;
  name: string;
  cuts: string[];
}

interface QuotationProps {
  menuOpen: boolean; // Prop para determinar si el menú está abierto o guardado
}

export default function Quotation({ menuOpen }: QuotationProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dollarRate, setDollarRate] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState("Cargando...");
  const [cuts, setCuts] = useState(initialCuts);
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
        const response = await fetch(
          "https://dolarapi.com/v1/dolares/mayorista"
        );
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
      const { data, error } = await supabase.from("businesses").select("*");
      if (error) console.error("Error fetching businesses:", error);
      else setBusinesses(data || []);
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
      setLoading(false);
    };
    setUserData();
  }, []);

  const handleReset = () => {
    setUsdPerKg(0);
    setMediaResWeight(0);
    setCuts(initialCuts);
    setSelectedCutImage(null);
    setSelectedCutName(null);
    setSelectedBusiness(null);
    setBusinessName("");
    setSelectedCutsModal([]);
    setEditBusinessId(null);
    setConfirmDelete(null);
  };

  const handleCutChange = (
    cut: string,
    field: "price" | "currency" | "notes",
    value: string | number
  ) => {
    setCuts((prev) => {
      if (initialCuts[cut].isFixedCost && field === "price") return prev;

      if (field === "price") {
        const currency = prev[cut].currency;
        const updatedCuts = { ...prev };

        if (initialCuts[cut].macro && Number(value) > 0) {
          const macro = initialCuts[cut].macro!;
          updatedCuts[macro].prices = { ARS: 0, "ARS + IVA": 0, USD: 0 };
        }

        if (macros.includes(cut) && Number(value) > 0) {
          Object.keys(updatedCuts).forEach((c) => {
            if (initialCuts[c].macro === cut) {
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

  const getDisplayCuts = () => {
    const business = businesses.find((b) => b.id === selectedBusiness);
    if (!business) return [];

    const displayCuts: string[] = [];
    macros.forEach((macro) => {
      const subCuts = Object.keys(initialCuts).filter(
        (cut) =>
          initialCuts[cut].macro === macro && !initialCuts[cut].isFixedCost
      );
      const hasSelectedSubCut = subCuts.some((cut) =>
        business.cuts.includes(cut)
      );

      if (!hasSelectedSubCut) {
        displayCuts.push(macro);
      } else {
        Object.keys(initialCuts).forEach((cut) => {
          if (initialCuts[cut].macro === macro) {
            displayCuts.push(cut);
          }
        });
      }
    });
    displayCuts.push("Frío");
    return displayCuts;
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
      .reduce((sum, cut) => sum + initialCuts[cut].percentage, 0)
      .toFixed(2);
  };

  const handleBusinessSelect = (businessId: string) => {
    setSelectedBusiness(businessId);
    setCuts(initialCuts);
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
        const { error } = await supabase
          .from("businesses")
          .update({ name: businessName, cuts: selectedCutsModal })
          .eq("id", editBusinessId)
          .eq("user_id", userId);
        if (error) throw new Error(`Error updating business: ${error.message}`);
        setBusinesses(
          businesses.map((b) =>
            b.id === editBusinessId
              ? { ...b, name: businessName, cuts: selectedCutsModal }
              : b
          )
        );
      } else {
        const { data, error } = await supabase
          .from("businesses")
          .insert([
            { name: businessName, cuts: selectedCutsModal, user_id: userId },
          ])
          .select();
        if (error) throw new Error(`Error adding business: ${error.message}`);
        if (data) {
          setBusinesses([...businesses, data[0]]);
          setSelectedBusiness(data[0].id);
        }
      }
      setShowBusinessModal(false);
    } catch (error) {
      console.error(error);
      alert("No se pudo guardar el negocio.");
    }
  };

  const deleteBusiness = async (id: string) => {
    if (!confirmDelete) {
      setConfirmDelete(id);
      return;
    }
    const { error } = await supabase
      .from("businesses")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) console.error("Error deleting business:", error);
    else {
      setBusinesses(businesses.filter((b) => b.id !== id));
      if (selectedBusiness === id) setSelectedBusiness(null);
      setShowBusinessModal(false);
      setConfirmDelete(null);
    }
  };

  const toggleCutSelection = (cut: string) => {
    setSelectedCutsModal((prev) =>
      prev.includes(cut) ? prev.filter((c) => c !== cut) : [...prev, cut]
    );
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
    <div className="flex flex-1 flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-4 mb-6">
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
              <span>+</span> Agregar
            </button>
            {selectedBusiness && (
              <button
                onClick={() => openBusinessModal("edit", selectedBusiness)}
                className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-all flex items-center gap-1 cursor-pointer"
              >
                ✏️ Editar
              </button>
            )}
            <button
              onClick={() => alert("Guardando histórico...")}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer"
            >
              Guardar Cotización
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all cursor-pointer"
            >
              Limpiar
            </button>
          </>
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
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`${
            menuOpen
              ? "w-[24rem] sm:w-[26rem] lg:w-[28rem]"
              : "w-[20rem] sm:w-[22rem] lg:w-[24rem]"
          } bg-[var(--background)] border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto transition-all duration-300`}
        >
          <div className="space-y-4">
            {usdPerKg > 0 && mediaResWeight > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Dólar (mayorista): $
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
                  const isMacro = macros.includes(cut);
                  const subCuts = Object.keys(initialCuts).filter(
                    (c) =>
                      initialCuts[c].macro === cut &&
                      !initialCuts[c].isFixedCost
                  );
                  const hasSubCutPrices = subCuts.some(
                    (c) => cuts[c].prices[cuts[c].currency] > 0
                  );
                  const isDisabled = isMacro && hasSubCutPrices;

                  return (
                    <CutItem
                      key={cut}
                      cut={cut}
                      display={`${cut} (${initialCuts[cut].percentage.toFixed(
                        2
                      )}%)`}
                      onChange={handleCutChange}
                      data={cuts[cut]}
                      image={imageMap[cut]}
                      onClick={
                        imageMap[cut] ? () => handleCutSelect(cut) : undefined
                      }
                      isDisabled={isDisabled}
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
                Ingresa el peso de la media res y el valor por kg en USD para
                comenzar.
              </p>
            )}
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
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
                      initialCuts[selectedCutName].macro || selectedCutName;
                    const relatedCuts = Object.keys(initialCuts).filter(
                      (cut) =>
                        (initialCuts[cut].macro === macro || cut === macro) &&
                        !initialCuts[cut].isFixedCost
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
