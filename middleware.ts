import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
      },
    }
  );

  console.log(`Middleware triggered for: ${req.nextUrl.pathname}`);

  try {
    // Obtener la sesión del usuario
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error fetching session:", sessionError.message);
      return NextResponse.redirect(new URL("/landing", req.url));
    }

    console.log(
      `Session status: ${session ? "authenticated" : "not authenticated"}`
    );

    // Rutas públicas accesibles sin autenticación
    const publicRoutes = ["/landing", "/login", "/signup", "/unauthorized"];

    // Rutas protegidas con sus permisos requeridos (sincronizadas con menuItems de Layout)
    const protectedRoutes = [
      { path: "/nueva-cotizacion", permission: "Gestionar Cotización" },
      { path: "/historial", permission: "Historial Cotizaciones" },
      { path: "/reportes", permission: "Reportes" },
      { path: "/gestion-usuarios", permission: "Gestionar Usuarios" },
      { path: "/costos", permission: "Gestionar Costos" },
      { path: "/auditorias", permission: "Auditorías" },
    ];

    // Manejo de usuarios no autenticados
    if (!session) {
      console.log("User not authenticated");
      if (req.nextUrl.pathname === "/") {
        console.log("Redirecting to /landing due to no session");
        return NextResponse.redirect(new URL("/landing", req.url));
      }
      if (!publicRoutes.includes(req.nextUrl.pathname)) {
        console.log(`Redirecting to /login from ${req.nextUrl.pathname}`);
        return NextResponse.redirect(new URL("/login", req.url));
      }
      return res;
    }

    console.log("User authenticated, checking route");

    // Manejo de usuarios autenticados en rutas públicas
    if (publicRoutes.includes(req.nextUrl.pathname)) {
      console.log(
        `Redirecting to / from public route: ${req.nextUrl.pathname}`
      );
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Verificar permisos para rutas protegidas
    const currentRoute = protectedRoutes.find(
      (route) => route.path === req.nextUrl.pathname
    );

    if (currentRoute) {
      console.log(`Checking permission for route: ${currentRoute.path}`);
      const requiredPermission = currentRoute.permission;

      // Obtener permisos del usuario
      const { data: groupData, error: groupError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", session.user.id);

      if (groupError) {
        console.error("Error fetching user groups:", groupError.message);
        return NextResponse.redirect(new URL("/landing", req.url));
      }

      const userPermissions = new Set<string>();
      if (groupData?.length) {
        const groupIds = groupData.map((g) => g.group_id);
        console.log(`User group IDs: ${groupIds}`);

        const { data: permissionData, error: permError } = await supabase
          .from("group_permissions")
          .select("permission_id")
          .in("group_id", groupIds);

        if (permError) {
          console.error("Error fetching group permissions:", permError.message);
          return NextResponse.redirect(new URL("/landing", req.url));
        }

        const permissionIds = permissionData.map((p) => p.permission_id);
        console.log(`Permission IDs: ${permissionIds}`);

        const { data: permNames, error: nameError } = await supabase
          .from("permissions")
          .select("name")
          .in("id", permissionIds);

        if (nameError) {
          console.error("Error fetching permission names:", nameError.message);
          return NextResponse.redirect(new URL("/landing", req.url));
        }

        permNames.forEach((p) => userPermissions.add(p.name));
        console.log(`User permissions: ${[...userPermissions]}`);
      }

      // Bloquear acceso si el usuario no tiene el permiso requerido
      if (!userPermissions.has(requiredPermission)) {
        console.log(
          `User lacks required permission: ${requiredPermission}, redirecting to /`
        );
        return NextResponse.redirect(new URL("/", req.url));
      }
      console.log(`Permission check passed for: ${currentRoute.path}`);
    } else {
      console.log(
        `Route ${req.nextUrl.pathname} not in protected routes, allowing access`
      );
    }

    console.log(`Access granted to ${req.nextUrl.pathname}`);
    return res;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Middleware error:", error.message);
    } else {
      console.error("Middleware error:", error);
    }
    return NextResponse.redirect(new URL("/landing", req.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
