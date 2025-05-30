import { supabase } from "./supabase";

export interface Cut {
  id: string; // UUID
  name: string;
  percentage: number;
  macro?: string | null;
  isFixedCost: boolean;
}

export const macros = ["Ral", "Rueda", "Parrillero", "Delantero"];

export async function fetchCuts(): Promise<Record<string, Cut>> {
  const { data, error } = await supabase.from("cuts").select("*");
  if (error) {
    console.error("Error fetching cuts:", error);
    throw new Error("Could not fetch cuts");
  }

  const cuts: Record<string, Cut> = {};
  data.forEach((cut) => {
    cuts[cut.name] = {
      id: cut.id,
      name: cut.name,
      percentage: cut.percentage,
      macro: cut.macro,
      isFixedCost: cut.is_fixed_cost,
    };
  });

  return cuts;
}
