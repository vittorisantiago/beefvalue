import { supabase } from "./supabase";

// Tipos de eventos permitidos
export type AuditEventType = "login" | "logout" | "quotation_created";

// Obtiene IP desde el API interno (best-effort)
async function fetchClientIp(): Promise<string | null> {
  try {
    if (typeof fetch === "undefined") return null;
    const res = await fetch("/api/ip");
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

// Registra un evento de auditoría
interface AuditDetails {
  quotation_id?: string;
  business_id?: string;
  business_name?: string;
  total_initial_usd?: number;
  total_cuts_usd?: number;
  difference_usd?: number;
  difference_percentage?: number;
  total_cost_usd?: number;
  final_difference_usd?: number;
  final_difference_percentage?: number;
  [key: string]: unknown; // extensión flexible
}

export async function logAuditEvent(
  event: AuditEventType,
  details?: AuditDetails
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false; // sin sesión no registramos

  const user = session.user;
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : null;
  const ip = await fetchClientIp(); // puede ser null
  const userName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "";

  // Inserción con manejo de errores (no rompe UX)
  const { error } = await supabase.from("audit_logs").insert({
    user_id: user.id,
    user_email: user.email,
    user_name: userName,
    event,
    user_agent: userAgent,
    ip,
    occurred_at: new Date().toISOString(),
    details: details ? JSON.stringify(details) : null,
  });

  if (error) {
    console.error("Audit log insert failed:", error.message);
    return false;
  }
  return true;
}
