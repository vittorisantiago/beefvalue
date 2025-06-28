import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { id } = await req.json();

  try {
    // Delete the user from auth.users
    const { error: deleteUserError } =
      await supabaseAdmin.auth.admin.deleteUser(id);
    if (deleteUserError) throw deleteUserError;

    // Clean up associated user_groups entries
    const { error: deleteGroupsError } = await supabaseAdmin
      .from("user_groups")
      .delete()
      .eq("user_id", id);
    if (deleteGroupsError) throw deleteGroupsError;

    return NextResponse.json({ message: "Usuario eliminado correctamente" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
