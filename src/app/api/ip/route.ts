import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // más fácil capturar cabeceras en edge

export async function GET(req: NextRequest) {
  // Intenta X-Forwarded-For primero
  const xff = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");

  let ip: string | null = null;
  if (xff) {
    ip = xff.split(",")[0]?.trim() || null;
  } else if (realIp) {
    ip = realIp;
  }
  // Fallback: usa la ip de la conexión si está disponible
  // Nota: En Edge, req.ip no existe, por lo que devolvemos null si no hay cabeceras
  return NextResponse.json({ ip });
}
