import { supabase } from "@/lib/supabase";

export type CostItem = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
};

export async function fetchCostItems(): Promise<CostItem[]> {
  const { data, error } = await supabase
    .from("cost_items")
    .select("id, name, category, description")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching cost items:", error);
    return [];
  }
  return data || [];
}
