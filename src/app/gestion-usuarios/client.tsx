"use client";

import Layout from "@/app/components/Layout";
import GroupManager from "../components/GroupManager";
import UserManager from "../components/UserManager";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function GestionUsuariosClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        window.location.href = "/"; // Redirige si no hay sesión
        return;
      }

      const userId = session.user.id;

      // Obtener permisos del usuario
      const { data: groupData, error: groupError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", userId);

      if (groupError) {
        setError(groupError.message);
        setLoading(false);
        return;
      }

      const userPermissions = new Set<string>();
      if (groupData?.length) {
        const groupIds = groupData.map((g) => g.group_id);
        const { data: permissionData, error: permError } = await supabase
          .from("group_permissions")
          .select("permission_id")
          .in("group_id", groupIds);

        if (permError) {
          setError(permError.message);
          setLoading(false);
          return;
        }

        const permissionIds = permissionData.map((p) => p.permission_id);
        const { data: permNames, error: nameError } = await supabase
          .from("permissions")
          .select("name")
          .in("id", permissionIds);

        if (nameError) {
          setError(nameError.message);
          setLoading(false);
          return;
        }

        permNames.forEach((p) => userPermissions.add(p.name));
        setPermissions([...userPermissions]);
      }

      // Verificar permiso "Gestionar Usuarios"
      if (!userPermissions.has("Gestionar Usuarios")) {
        window.location.href = "/"; // Redirige si no tiene permiso
        return;
      }

      setLoading(false);
    };

    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Cargando...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Error: {error}</p>
        </div>
      </Layout>
    );
  }

  if (permissions.length === 0 || !permissions.includes("Gestionar Usuarios")) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <p className="text-[var(--foreground)]">Acceso no autorizado</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-1 flex-col p-6 overflow-hidden bg-[var(--background)] min-h-screen">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-6">
          Gestionar Usuarios
        </h1>
        <section className="bg-gray-800/90 rounded-lg shadow-md p-6 mb-8">
          <GroupManager />
        </section>
        <section className="bg-gray-800/90 rounded-lg shadow-md p-6">
          <UserManager />
        </section>
      </div>
    </Layout>
  );
}
