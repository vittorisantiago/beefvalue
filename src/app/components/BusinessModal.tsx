"use client";

import { initialCuts } from "@/lib/cuts";

interface BusinessModalProps {
  show: boolean;
  onClose: () => void;
  businessName: string;
  setBusinessName: (name: string) => void;
  businessNameError: boolean;
  setBusinessNameError: (error: boolean) => void;
  selectedCutsModal: string[];
  toggleCutSelection: (cut: string) => void;
  editBusinessId: string | null;
  onSave: () => void;
  onDelete: (id: string) => void;
  confirmDelete: string | null;
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
}: BusinessModalProps) {
  if (!show) return null;

  const selectableCuts = Object.keys(initialCuts).filter(
    (cut) =>
      !["Ral", "Rueda", "Parrillero", "Delantero"].includes(cut) &&
      !initialCuts[cut].isFixedCost
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-20">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-lg">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
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
          className={`w-full px-3 py-2 border ${
            businessNameError
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          } rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] mb-4`}
        />
        {businessNameError && (
          <p className="text-red-500 text-sm mb-2">El nombre es obligatorio</p>
        )}
        <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[var(--foreground)]">
          {selectableCuts.map((cut) => (
            <label key={cut} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCutsModal.includes(cut)}
                onChange={() => toggleCutSelection(cut)}
                className="h-4 w-4 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span>{cut}</span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          {editBusinessId && (
            <button
              onClick={() => onDelete(editBusinessId)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              🗑️ {confirmDelete === editBusinessId ? "¿Seguro?" : "Eliminar"}
            </button>
          )}
          <button
            onClick={onSave}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-all flex items-center gap-1 cursor-pointer"
          >
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
