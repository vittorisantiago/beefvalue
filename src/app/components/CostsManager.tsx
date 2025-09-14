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
  // Cortes visibles/operativos en la cotización actual
  cutsForQuotation: CutLite[];
  // Estado controlado por el padre
  value: CostRow[];
  onChange: (rows: CostRow[]) => void;
};

export default function CostsManager({
  cutsForQuotation,
  value,
  onChange,
}: Props) {
  const [items, setItems] = useState<CostItem[]>([]);
  const [selectedCutIds, setSelectedCutIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

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

  const addRows = () => {
    if (selectedCutIds.length === 0 || selectedItemIds.length === 0) return;
    const setKey = (r: CostRow) => `${r.cutId}-${r.costItemId}`;
    const existing = new Set(value.map(setKey));

    const newRows: CostRow[] = [];
    selectedCutIds.forEach((cutId) => {
      selectedItemIds.forEach((itemId) => {
        const proto: CostRow = {
          cutId,
          costItemId: itemId,
          currency: "USD",
          prices: { ARS: 0, "ARS + IVA": 0, USD: 0 },
          notes: "",
        };
        if (!existing.has(setKey(proto))) newRows.push(proto);
      });
    });

    if (newRows.length > 0) onChange([...value, ...newRows]);
    // No vaciamos la selección para permitir sumar más fácilmente
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
    next.splice(idx, 1);
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

  return (
    <div className="bg-[var(--background)] border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-lg p-6">
      <h2 className="text-3xl font-bold text-[var(--foreground)] mb-5">
        Costos
      </h2>
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

      <button
        onClick={addRows}
        className="px-5 py-3 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all cursor-pointer mb-8 text-lg font-semibold"
      >
        Agregar combinaciones seleccionadas
      </button>

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
                return (
                  <tr
                    key={`${row.cutId}-${row.costItemId}`}
                    className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : ""}
                  >
                    <td className="p-3">{nameByCutId[row.cutId] || "Corte"}</td>
                    <td className="p-3">{item?.name || "Costo"}</td>
                    <td className="p-3">
                      <select
                        value={row.currency}
                        onChange={(e) =>
                          updateRow(idx, {
                            currency: e.target.value as Currency,
                          })
                        }
                        className="px-3 py-2 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-lg"
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
                            row.prices[row.currency] === 0 ||
                            row.prices[row.currency] === undefined
                              ? ""
                              : row.prices[row.currency]
                          }
                          onFocus={(e) => {
                            if (
                              row.prices[row.currency] === 0 ||
                              row.prices[row.currency] === undefined
                            ) {
                              e.target.value = "";
                            }
                          }}
                          onChange={(e) => {
                            // Allow empty string (user deletes all)
                            const val = e.target.value;
                            if (val === "") {
                              const prices = {
                                ...row.prices,
                                [row.currency]: undefined,
                              };
                              updateRow(idx, { prices });
                            } else {
                              // Only allow valid numbers
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
                        />
                      </div>
                    </td>
                    {/* Notas cell removed */}
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
