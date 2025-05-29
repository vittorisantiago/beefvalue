"use client";

import Image from "next/image";
import { initialCuts } from "../../lib/cuts";

interface CutItemProps {
  cut: string;
  display: string;
  onChange: (
    cut: string,
    field: "price" | "currency" | "notes",
    value: string | number
  ) => void;
  data: {
    prices: { ARS: number; "ARS + IVA": number; USD: number };
    notes: string;
    currency: "ARS" | "USD" | "ARS + IVA";
  };
  onClick?: () => void;
  image?: string;
  isDisabled?: boolean;
}

export default function CutItem({
  cut,
  display,
  onChange,
  data,
  onClick,
  image,
  isDisabled,
}: CutItemProps) {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "0") e.target.value = "";
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 border rounded-md p-2 ${
        isDisabled
          ? "border-gray-300 dark:border-gray-700 opacity-50"
          : "border-gray-400 dark:border-gray-500"
      }`}
    >
      <div
        onClick={onClick}
        className="flex items-center gap-2 cursor-pointer text-[var(--foreground)]"
      >
        {image ? (
          <Image
            src={image}
            alt={cut}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
        )}
        <span>{display}</span>
      </div>
      <div className="mt-2 space-y-2 pl-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
            <span className="px-2 text-gray-500">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={data.prices[data.currency]}
              onFocus={handleFocus}
              onChange={(e) => onChange(cut, "price", e.target.value)}
              disabled={isDisabled || initialCuts[cut].isFixedCost}
              className={`w-full sm:w-auto flex-1 px-2 py-1 bg-transparent text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none ${
                isDisabled || initialCuts[cut].isFixedCost
                  ? "cursor-not-allowed"
                  : ""
              }`}
            />
          </div>
          <select
            value={data.currency}
            onChange={(e) => onChange(cut, "currency", e.target.value)}
            disabled={isDisabled || initialCuts[cut].isFixedCost}
            className={`w-full sm:w-32 px-2 py-1 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] ${
              isDisabled || initialCuts[cut].isFixedCost
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
            <option value="ARS + IVA">ARS + IVA</option>
          </select>
        </div>
        <textarea
          value={data.notes}
          onChange={(e) => onChange(cut, "notes", e.target.value)}
          placeholder="Notas (máx. 50 caracteres)"
          maxLength={50}
          disabled={isDisabled}
          className={`w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none h-16 ${
            isDisabled ? "cursor-not-allowed" : ""
          }`}
        />
      </div>
    </div>
  );
}
