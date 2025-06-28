"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Permission {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  permissions: string[];
}

export default function GroupManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    permissions: [] as string[],
  });
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name, group_permissions(permission_id)");
    if (error) {
      setError("Error fetching groups: " + error.message);
      return;
    }
    if (data) {
      setGroups(
        data.map((group) => ({
          id: group.id,
          name: group.name || "",
          permissions: group.group_permissions.map((gp) => gp.permission_id),
        }))
      );
    }
  };

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from("permissions")
      .select("id, name");
    if (error) {
      setError("Error fetching permissions: " + error.message);
      return;
    }
    if (data) setPermissions(data);
  };

  useEffect(() => {
    fetchGroups();
    fetchPermissions();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      setError("El nombre del grupo es obligatorio.");
      return;
    }
    if (newGroup.permissions.length === 0) {
      setError("Debe seleccionar al menos un permiso.");
      return;
    }
    setError(null);

    const { data, error } = await supabase
      .from("groups")
      .insert({ name: newGroup.name })
      .select()
      .single();

    if (error) {
      setError("Error al crear el grupo: " + error.message);
      return;
    }

    if (newGroup.permissions.length > 0) {
      const groupPermissions = newGroup.permissions.map((permId) => ({
        group_id: data.id,
        permission_id: permId,
      }));
      const { error: permError } = await supabase
        .from("group_permissions")
        .insert(groupPermissions);
      if (permError) {
        setError("Error al asignar permisos: " + permError.message);
        await supabase.from("groups").delete().eq("id", data.id); // Rollback
        return;
      }
    }

    setNewGroup({ name: "", permissions: [] });
    setShowCreateModal(false);
    fetchGroups();
  };

  const handleEditGroup = async () => {
    if (!editGroup || editGroup.name === "Administrador") {
      setError("El grupo Administrador no puede ser editado.");
      return;
    }
    if (!editGroup.name.trim()) {
      setError("El nombre del grupo es obligatorio.");
      return;
    }
    if (editGroup.permissions.length === 0) {
      setError("Debe seleccionar al menos un permiso.");
      return;
    }
    setError(null);

    const { error } = await supabase
      .from("groups")
      .update({ name: editGroup.name })
      .eq("id", editGroup.id);

    if (error) {
      setError("Error al editar el grupo: " + error.message);
      return;
    }

    await supabase
      .from("group_permissions")
      .delete()
      .eq("group_id", editGroup.id);
    if (editGroup.permissions.length > 0) {
      const groupPermissions = editGroup.permissions.map((permId) => ({
        group_id: editGroup.id,
        permission_id: permId,
      }));
      const { error: permError } = await supabase
        .from("group_permissions")
        .insert(groupPermissions);
      if (permError) {
        setError("Error al actualizar permisos: " + permError.message);
        return;
      }
    }

    setEditGroup(null);
    setShowEditModal(false);
    fetchGroups();
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (groupName === "Administrador" || groupName === "Usuario") {
      setError(`El grupo ${groupName} no puede ser eliminado.`);
      return;
    }

    // Check if the group is associated with any user
    const { data: userGroups, error: checkError } = await supabase
      .from("user_groups")
      .select("group_id")
      .eq("group_id", groupId);
    if (checkError) {
      setError("Error checking group association: " + checkError.message);
      return;
    }
    if (userGroups && userGroups.length > 0) {
      setError(
        "Este grupo no puede ser eliminado porque está asociado a un usuario."
      );
      return;
    }

    setConfirmDelete({ id: groupId, name: groupName });
  };

  const confirmDeleteGroup = async () => {
    if (confirmDelete) {
      const { error } = await supabase
        .from("groups")
        .delete()
        .eq("id", confirmDelete.id);
      if (error) {
        setError("Error al eliminar el grupo: " + error.message);
      } else {
        setError(null);
      }
      setConfirmDelete(null);
      fetchGroups();
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Gestión de Grupos
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-md cursor-pointer transition-all"
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Crear Grupo
        </button>
      </div>

      {/* Error global solo si no hay modales abiertos */}
      {!showCreateModal && !showEditModal && !confirmDelete && error && (
        <div className="bg-red-900/20 border border-red-700 rounded-md p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div
            key={group.id}
            className="bg-gray-800/50 rounded-xl p-4 shadow hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-semibold text-white">{group.name}</h3>
              <div className="flex gap-2">
                {group.name !== "Administrador" && group.name !== "Usuario" && (
                  <>
                    <button
                      onClick={() => {
                        setEditGroup({ ...group });
                        setShowEditModal(true);
                      }}
                      className="text-yellow-400 hover:text-yellow-300 cursor-pointer"
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 20h9"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="text-red-500 hover:text-red-400 cursor-pointer"
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 11v6m4-6v6"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-300">
              Permisos:
              <ul className="list-disc pl-5 mt-1">
                {permissions
                  .filter((p) => group.permissions.includes(p.id))
                  .map((perm) => (
                    <li key={perm.id}>{perm.name}</li>
                  ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Creating Group */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Crear Nuevo Grupo
            </h3>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) =>
                    setNewGroup({ ...newGroup, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nombre del grupo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Permisos
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {permissions.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center space-x-2 text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={newGroup.permissions.includes(perm.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...newGroup.permissions, perm.id]
                            : newGroup.permissions.filter(
                                (id) => id !== perm.id
                              );
                          setNewGroup({ ...newGroup, permissions: updated });
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroup({ name: "", permissions: [] });
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Editing Group */}
      {showEditModal && editGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Editar Grupo
            </h3>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editGroup.name || ""}
                  onChange={(e) =>
                    setEditGroup({ ...editGroup, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nombre del grupo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Permisos
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {permissions.map((perm) => (
                    <label
                      key={perm.id}
                      className="flex items-center space-x-2 text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={editGroup.permissions.includes(perm.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...editGroup.permissions, perm.id]
                            : editGroup.permissions.filter(
                                (id) => id !== perm.id
                              );
                          setEditGroup({ ...editGroup, permissions: updated });
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditGroup(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditGroup}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-200 mb-4">
              ¿Estás seguro de que deseas eliminar el grupo &quot;
              {confirmDelete.name}&quot;? Esta acción no se puede deshacer.
            </p>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteGroup}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
