"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCostItems, type CostItem } from "@/lib/cost_items";

type Currency = "ARS" | "ARS + IVA" | "USD";

export type CostRow = {
  cutId: string;
  costItemId: string;
  currency: Currency;
  prices: { ARS: number; "ARS + IVA": number; USD: number };
  notes: string;
};

type CutLite = {
  id: string; // cuts[cutName].id
  name: string; // "Bife ancho..."
};

type Props = {
  cutsForQuotation: CutLite[];
  value: CostRow[];
  onChange: (rows: CostRow[]) => void;
  costTotals: Record<string, { value: number | ""; currency: Currency }>;
  useTotalCost: boolean;
  onTotalsChange: (
    totals: Record<string, { value: number | ""; currency: Currency }>
  ) => void;
  onUseTotalCostChange: (useTotal: boolean) => void;
};

export default function CostsManager({
  cutsForQuotation,
  value,
  onChange,
  costTotals,
  useTotalCost,
  onTotalsChange,
  onUseTotalCostChange,
}: Props) {
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedCutIds, setSelectedCutIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  // useTotalCost y costTotals ahora vienen del padre

  useEffect(() => {
    (async () => setItems(await fetchCostItems()))();
  }, []);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, CostItem[]> = {};
    items.forEach((i) => {
      const key = i.category || "Otros";
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return map;
  }, [items]);

  const toggleCut = (cutId: string) => {
    setSelectedCutIds((prev) =>
      prev.includes(cutId)
        ? prev.filter((id) => id !== cutId)
        : [...prev, cutId]
    );
  };
  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Agregar selección actual al listado sin borrar lo anterior
  const addSelectionToList = () => {
    if (selectedItemIds.length === 0 || selectedCutIds.length === 0) return;
    const existing = [...value];
    const existingKeys = new Set(
      existing.map((r) => `${r.cutId}::${r.costItemId}`)
    );
    const additions: CostRow[] = [];
    selectedItemIds.forEach((itemId) => {
      selectedCutIds.forEach((cutId) => {
        const key = `${cutId}::${itemId}`;
        if (!existingKeys.has(key)) {
          additions.push({
            costItemId: itemId,
            cutId: cutId,
            currency: "USD",
            prices: { ARS: 0, "ARS + IVA": 0, USD: 0 },
            notes: "",
          });
        }
      });
    });
    if (additions.length > 0) onChange([...existing, ...additions]);
  };

  const updateRow = (idx: number, patch: Partial<CostRow>) => {
    const next = [...value];
    next[idx] = {
      ...next[idx],
      ...patch,
      prices: patch.currency
        ? {
            ARS: patch.currency === "ARS" ? next[idx].prices.ARS : 0,
            "ARS + IVA":
              patch.currency === "ARS + IVA"
                ? next[idx].prices["ARS + IVA"]
                : 0,
            USD: patch.currency === "USD" ? next[idx].prices.USD : 0,
          }
        : patch.prices || next[idx].prices,
    };
    onChange(next);
  };

  const removeRow = (idx: number) => {
    const next = [...value];
    const removed = next[idx];
    next.splice(idx, 1);
    // Si ya no hay ningún corte con ese costItemId, eliminamos el costo total
    const stillExists = next.some(
      (row) => row.costItemId === removed.costItemId
    );
    if (!stillExists) {
      const copy = { ...costTotals };
      delete copy[removed.costItemId];
      onTotalsChange(copy);
    }
    onChange(next);
  };

  const nameByCutId = useMemo(() => {
    const map: Record<string, string> = {};
    cutsForQuotation.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [cutsForQuotation]);

  const itemById = useMemo(() => {
    const map: Record<string, CostItem> = {};
    items.forEach((i) => (map[i.id] = i));
    return map;
  }, [items]);

  // Lista de cortes que no deben aparecer para costos
  const excludedCuts = new Set([
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

  const filteredCuts = cutsForQuotation.filter(
    (c) => !excludedCuts.has(c.name)
  );

  // Cortes sin costos asignados (para advertencia)
  const cutsWithCosts = useMemo(
    () => new Set(value.map((r) => r.cutId)),
    [value]
  );
  const missingCostCuts = useMemo(
    () => filteredCuts.filter((c) => !cutsWithCosts.has(c.id)),
    [filteredCuts, cutsWithCosts]
  );

  return (
    <div className="bg-[var(--background)] border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg p-6">
      <h2 className="text-3xl font-bold text-[var(--foreground)] mb-5">
        Costos
      </h2>
      <div className="mb-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={useTotalCost}
          onChange={() => onUseTotalCostChange(!useTotalCost)}
          id="useTotalCost"
          className="w-5 h-5 accent-blue-500 cursor-pointer"
        />
        <label
          htmlFor="useTotalCost"
          className="text-lg font-semibold text-blue-800 dark:text-blue-200 cursor-pointer"
        >
          Cargar costo total y dividir automáticamente entre los cortes
          seleccionados
        </label>
      </div>

      {/* Advertencia sobre cortes sin costos */}
      {missingCostCuts.length > 0 && (
        <div className="mb-5 p-3 rounded bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200">
          <div className="font-semibold mb-1">
            Faltan costos en {missingCostCuts.length}{" "}
            {missingCostCuts.length === 1 ? "corte" : "cortes"}
          </div>
          <div className="text-sm flex flex-wrap gap-2">
            {missingCostCuts.map((c) => (
              <span
                key={c.id}
                className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-800"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {/* Mensaje de ayuda y selección múltiple de cortes */}
      <div className="flex items-center gap-3 mb-5">
        <svg
          className="w-6 h-6 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-yellow-600 text-base font-medium">
          Podés seleccionar más de un corte para aplicar los mismos costos.
          Seleccioná los cortes y luego asigná el/los costo/s que desees.
        </span>
      </div>

      {/* Selección múltiple de cortes */}
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
          Cortes
        </h3>
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
            onClick={() => setSelectedCutIds(filteredCuts.map((c) => c.id))}
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
            onClick={() => setSelectedCutIds([])}
          >
            Limpiar selección
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
            onClick={() => {
              const cutsWithCosts = new Set(value.map((r) => r.cutId));
              const missing = filteredCuts
                .filter((c) => !cutsWithCosts.has(c.id))
                .map((c) => c.id);
              setSelectedCutIds(missing);
            }}
          >
            Seleccionar cortes sin costos
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer"
            onClick={() => {
              setSelectedCutIds([]);
              setSelectedItemIds([]);
            }}
          >
            Nueva selección
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 transition-all cursor-pointer"
            onClick={addSelectionToList}
          >
            Agregar al listado
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {filteredCuts.map((c) => (
            <label
              key={c.id}
              className="inline-flex items-center gap-3 text-[var(--foreground)] text-lg"
            >
              <input
                type="checkbox"
                className="cursor-pointer w-5 h-5"
                checked={selectedCutIds.includes(c.id)}
                onChange={() => toggleCut(c.id)}
              />
              <span className="text-lg">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Selección múltiple de costos */}
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
          Tipos de costo
        </h3>
        <div className="space-y-4">
          {Object.keys(itemsByCategory).map((cat) => (
            <div key={cat}>
              <div className="text-base font-semibold opacity-80 mb-2">
                {cat}
              </div>
              <div className="flex flex-wrap gap-4">
                {itemsByCategory[cat].map((it) => (
                  <label
                    key={it.id}
                    className="inline-flex items-center gap-3 text-[var(--foreground)] text-lg"
                  >
                    <input
                      type="checkbox"
                      className="cursor-pointer w-5 h-5"
                      checked={selectedItemIds.includes(it.id)}
                      onChange={() => toggleItem(it.id)}
                    />
                    <span className="text-lg">{it.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inputs de costos totales, basados en los ítems presentes en la tabla */}
      {useTotalCost && value.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
            Costos totales por tipo (ingrese el importe total para cada costo)
          </h3>
          <div className="flex flex-wrap gap-6 items-end">
            {[...new Set(value.map((r) => r.costItemId))].map((itemId) => (
              <div key={itemId} className="flex items-center gap-3">
                <span className="text-base font-medium text-blue-700 dark:text-blue-200">
                  {itemById[itemId]?.name || "Costo"}:
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(() => {
                    const v = costTotals[itemId]?.value;
                    if (v === undefined || v === "") return "";
                    const num = typeof v === "number" ? v : Number(v);
                    if (!isFinite(num)) return "";
                    const rounded = Math.round(num * 1e6) / 1e6; // limitar precisión
                    if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
                      return String(Math.round(rounded));
                    }
                    // trim trailing zeros
                    return String(rounded).replace(/(\.\d*?[1-9])0+$/, "$1");
                  })()}
                  onChange={(e) => {
                    const val =
                      e.target.value === "" ? "" : Number(e.target.value);
                    onTotalsChange({
                      ...costTotals,
                      [itemId]: {
                        value: val,
                        currency: costTotals[itemId]?.currency || "USD",
                      },
                    });
                  }}
                  className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md w-48 text-lg font-bold text-blue-900 dark:text-blue-100"
                />
                <select
                  value={costTotals[itemId]?.currency || "USD"}
                  onChange={(e) => {
                    onTotalsChange({
                      ...costTotals,
                      [itemId]: {
                        value: costTotals[itemId]?.value ?? "",
                        currency: e.target.value as Currency,
                      },
                    });
                  }}
                  className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-lg"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                  <option value="ARS + IVA">ARS + IVA</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grilla de costos seleccionados */}
      {value.length === 0 ? (
        <p className="text-[var(--foreground)] text-lg">
          No hay costos agregados.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[var(--foreground)] text-lg">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="p-3 text-left">Corte</th>
                <th className="p-3 text-left">Costo</th>
                <th className="p-3 text-left">Moneda</th>
                <th className="p-3 text-left">Precio</th>
                {/* Notas column removed */}
                <th className="p-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {value.map((row, idx) => {
                const item = itemById[row.costItemId];
                let priceValue = row.prices[row.currency];
                let currencyValue = row.currency;
                if (useTotalCost && costTotals[row.costItemId]) {
                  // Solo dividir entre los cortes que tienen ese costo
                  const sameRows = value.filter(
                    (r) => r.costItemId === row.costItemId
                  );
                  const total = costTotals[row.costItemId].value;
                  const currency = costTotals[row.costItemId].currency;
                  priceValue =
                    sameRows.length > 0 && total !== ""
                      ? Number((Number(total) / sameRows.length).toFixed(2))
                      : 0;
                  currencyValue = currency;
                }
                return (
                  <tr
                    key={`${row.cutId}-${row.costItemId}`}
                    className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : ""}
                  >
                    <td className="p-3">{nameByCutId[row.cutId] || "Corte"}</td>
                    <td className="p-3">{item?.name || "Costo"}</td>
                    <td className="p-3">
                      <select
                        value={currencyValue}
                        onChange={(e) =>
                          updateRow(idx, {
                            currency: e.target.value as Currency,
                          })
                        }
                        className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-lg"
                        disabled={useTotalCost}
                      >
                        <option value="USD">USD</option>
                        <option value="ARS">ARS</option>
                        <option value="ARS + IVA">ARS + IVA</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <span className="mr-1 text-gray-500 text-lg">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={
                            priceValue === 0 || priceValue === undefined
                              ? ""
                              : priceValue
                          }
                          onFocus={(e) => {
                            if (priceValue === 0 || priceValue === undefined) {
                              e.target.value = "";
                            }
                          }}
                          onChange={(e) => {
                            if (useTotalCost) return;
                            const val = e.target.value;
                            if (val === "") {
                              const prices = {
                                ...row.prices,
                                [row.currency]: undefined,
                              };
                              updateRow(idx, { prices });
                            } else {
                              const num = Number(val.replace(/,/g, "."));
                              if (!isNaN(num)) {
                                const prices = {
                                  ...row.prices,
                                  [row.currency]: num,
                                };
                                updateRow(idx, { prices });
                              }
                            }
                          }}
                          className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md w-32 text-lg"
                          disabled={useTotalCost}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => removeRow(idx)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all cursor-pointer text-lg"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
