import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "No se pudo crear el usuario" },
      { status: 400 }
    );
  }

  const { data: grupo } = await supabaseAdmin
    .from("groups")
    .select("id")
    .eq("name", "Usuario")
    .single();

  if (!grupo) {
    return NextResponse.json(
      { error: "Grupo Usuario no encontrado" },
      { status: 404 }
    );
  }

  await supabaseAdmin.from("user_groups").insert({
    user_id: userId,
    group_id: grupo.id,
  });

  return NextResponse.json({ message: "Usuario creado correctamente" });
}
