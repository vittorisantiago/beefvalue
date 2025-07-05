"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface BusinessModalProps {
  show: boolean;
  onClose: () => void;
  businessName: string;
  setBusinessName: (name: string) => void;
  businessNameError: boolean;
  setBusinessNameError: (error: boolean) => void;
  selectedCutsModal: string[];
  toggleCutSelection: (cutId: string) => void;
  editBusinessId: string | null;
  onSave: () => void;
  onDelete: (id: string) => void;
  confirmDelete: string | null;
  onCancelDelete: () => void; // Nuevo prop para cancelar confirmación
  cuts: Record<
    string,
    {
      id: string;
      name: string;
      percentage: number;
      macro: string | null;
      is_fixed_cost: boolean;
    }
  >;
}

export default function BusinessModal({
  show,
  onClose,
  businessName,
  setBusinessName,
  businessNameError,
  setBusinessNameError,
  selectedCutsModal,
  toggleCutSelection,
  editBusinessId,
  onSave,
  onDelete,
  confirmDelete,
  onCancelDelete,
}: BusinessModalProps) {
  const [availableCuts, setAvailableCuts] = useState<
    {
      id: string;
      name: string;
      percentage: number;
      macro: string | null;
      is_fixed_cost: boolean;
    }[]
  >([]);

  useEffect(() => {
    const loadCuts = async () => {
      const { data, error } = await supabase
        .from("cuts")
        .select("*")
        .not("name", "in", '("Ral","Rueda","Parrillero","Delantero")')
        .eq("is_fixed_cost", false);
      if (error) console.error("Error fetching cuts:", error);
      else setAvailableCuts(data || []);
    };
    loadCuts();
  }, []);

  const handleDeleteClick = () => {
    if (editBusinessId) {
      onDelete(editBusinessId); // Esto establece confirmDelete en Quotation.tsx
    }
  };

  const confirmDeleteAction = () => {
    if (editBusinessId) {
      onDelete(editBusinessId); // Llama a onDelete nuevamente para confirmar la eliminación
    }
  };

  const cancelDeleteAction = () => {
    onCancelDelete(); // Solo cierra el popup de confirmación
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-20">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-lg">
        <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">
          {editBusinessId ? "Editar Negocio" : "Agregar Negocio"}
        </h2>
        <input
          type="text"
          value={businessName}
          onChange={(e) => {
            setBusinessName(e.target.value);
            setBusinessNameError(false);
          }}
          placeholder="Nombre del negocio"
          className={`w-full px-4 py-2 border text-lg ${
            businessNameError
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          } rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] mb-4`}
        />
        {businessNameError && (
          <p className="text-red-500 text-base mb-4">
            El nombre es obligatorio
          </p>
        )}
        {/* Leyenda de cortes seleccionados */}
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Los cortes con{" "}
            <span className="text-blue-500 font-semibold">borde azul</span> son
            los seleccionados para este negocio.
          </span>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto font-mono text-lg text-[var(--foreground)]">
          {availableCuts.map((cut) => {
            const isSelected = selectedCutsModal.includes(cut.id);
            return (
              <label
                key={cut.id}
                className={`flex items-center gap-3 px-2 py-1 rounded-md border transition-all ${
                  isSelected
                    ? "border-blue-500 border-2 bg-blue-50 dark:bg-blue-900/10"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCutSelection(cut.id)}
                  className="h-5 w-5 text-[var(--primary)] focus:ring-[var(--primary)] rounded"
                />
                <span>{cut.name}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
          >
            Cancelar
          </button>
          {editBusinessId && (
            <button
              onClick={handleDeleteClick}
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
          )}
          <button
            onClick={onSave}
            className="px-5 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all flex items-center gap-2 cursor-pointer text-lg font-medium"
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
            Guardar
          </button>
        </div>
      </div>

      {/* Pop-up de Confirmación para Eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg">
            <h3 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              ¿Estás seguro?
            </h3>
            <p className="text-lg text-[var(--foreground)] mb-6">
              ¿Deseas eliminar este negocio? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDeleteAction}
                className="px-5 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer text-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteAction}
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
  );
}
