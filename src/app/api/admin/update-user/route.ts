import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { id, email, groupIds } = await req.json();

  try {
    // Validate input
    if (!id || !email || !Array.isArray(groupIds) || groupIds.length === 0) {
      throw new Error("ID, email, and at least one group are required");
    }

    // Get current user to compare email
    const { data: currentUser, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(id);
    if (userError) throw userError;

    // Update email if provided and different
    if (currentUser.user?.email !== email) {
      const { error: updateEmailError } =
        await supabaseAdmin.auth.admin.updateUserById(id, { email });
      if (updateEmailError) throw updateEmailError; // This will catch duplicate email errors
    }

    // Update groups
    await supabaseAdmin.from("user_groups").delete().eq("user_id", id);
    const inserts = groupIds.map((groupId: string) => ({
      user_id: id,
      group_id: groupId,
    }));
    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("user_groups")
        .insert(inserts);
      if (insertError) throw insertError;
    }

    return NextResponse.json({ message: "Usuario actualizado correctamente" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
