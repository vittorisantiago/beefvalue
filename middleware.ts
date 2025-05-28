import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // Manejo de errores al obtener la sesión
    if (error) {
      console.error("Error fetching session:", error);
      return NextResponse.redirect(new URL("/error", req.url));
    }

    // Rutas públicas que no requieren autenticación
    const publicRoutes = ["/landing", "/login", "/signup"];

    // Si no hay sesión y se intenta acceder a una ruta protegida, redirige a /login
    if (
      !session &&
      !publicRoutes.includes(req.nextUrl.pathname) &&
      req.nextUrl.pathname !== "/error"
    ) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Si no hay sesión y se accede a la raíz (/), redirige a /landing
    if (!session && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/landing", req.url));
    }

    // Si hay sesión y se intenta acceder a /login o /signup, redirige a /
    if (
      session &&
      (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/error", req.url));
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/quotation",
    "/historial",
    "/reportes",
    "/gestion-usuarios",
  ],
};
