"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string | null;
  groupIds: string[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  // Add permissions if needed for future use
  // permissions?: string[];
}

interface NewUserForm {
  email: string;
  password: string;
}

interface EditUserForm {
  email: string;
  groupIds: string[];
}

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]); // Ensure groups is an array
  const [newUser, setNewUser] = useState<NewUserForm>({
    email: "",
    password: "",
  });
  const [editUser, setEditUser] = useState<{
    id: string;
    form: EditUserForm;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmEditSave, setConfirmEditSave] = useState<{
    id: string;
    form: EditUserForm;
  } | null>(null);
  const [confirmEditCancel, setConfirmEditCancel] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const [createFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("../api/admin/users");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch users");

      const mappedUsers = result.users.map(
        (user: { id: string; email: string | null }) => ({
          id: user.id,
          email: user.email ?? null,
          groupIds:
            result.userGroups
              ?.filter((ug: { user_id: string }) => ug.user_id === user.id)
              .map((ug: { group_id: string }) => ug.group_id) || [],
        })
      );

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*");
      if (groupsError) throw groupsError;
      if (!Array.isArray(groupsData)) {
        console.error("Unexpected groups data format:", groupsData);
        setGroups([]);
      } else {
        setGroups(groupsData);
      }

      setUsers(mappedUsers);
    } catch (err) {
      setError("Error fetching data: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validateForm = (form: NewUserForm | EditUserForm): boolean => {
    // Validación para formulario de creación (tiene password)
    if ("password" in form) {
      if (!form.email.trim() && !form.password.trim()) {
        setError("Por favor, complete todos los datos.");
        return false;
      }
      if (!form.email.trim()) {
        setError("Por favor, ingrese un correo electrónico.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError("Correo inválido.");
        return false;
      }
      if (!form.password || form.password.length < 6) {
        setError("Contraseña debe tener al menos 6 caracteres.");
        return false;
      }
    } else {
      // Validación para edición (no tiene password)
      if (!form.email.trim()) {
        setError("Por favor, ingrese un correo electrónico.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError("Correo inválido.");
        return false;
      }
      if (form.groupIds.length === 0) {
        setError("Debe asignar al menos un grupo.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(newUser)) return;
    setLoading(true);
    try {
      const res = await fetch("../api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create user");
      setNewUser({ email: "", password: "" });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      setError("Error creating user: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !validateForm(editUser.form)) return;
    setConfirmEditSave(editUser);
  };

  const confirmUpdateUser = async () => {
    if (!confirmEditSave) return;
    setLoading(true);
    try {
      const res = await fetch("../api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: confirmEditSave.id,
          email: confirmEditSave.form.email,
          groupIds: confirmEditSave.form.groupIds,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update user");
      setEditUser(null);
      setShowEditModal(false);
      setConfirmEditSave(null);
      fetchData();
    } catch (err) {
      setError("Error updating user: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setConfirmEditCancel(true);
  };

  const confirmCancelEdit = () => {
    setEditUser(null);
    setShowEditModal(false);
    setConfirmEditCancel(false);
    setError(null);
  };

  const deleteUser = async (userId: string) => {
    setConfirmDelete(userId);
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    setLoading(true);
    try {
      const user = users.find((u) => u.id === confirmDelete);
      if (
        user?.groupIds.some(
          (g) => groups.find((grp) => grp.id === g)?.name === "Administrador"
        )
      ) {
        setError(
          "Los usuarios del grupo Administrador no pueden ser eliminados."
        );
        setConfirmDelete(null);
        return;
      }
      const res = await fetch("../api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmDelete }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete user");
      fetchData();
    } catch (err) {
      setError("Error deleting user: " + (err as Error).message);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  if (loading) return <p className="text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">
          Gestión de Usuarios
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
          Crear Nuevo Usuario
        </button>
      </div>

      {createFormError && (
        <div className="w-full mb-4 flex items-center justify-center">
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-2 rounded-md text-center text-sm animate-fade-in">
            {createFormError}
          </div>
        </div>
      )}

      <table className="w-full border-collapse bg-gray-800/50 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-700">
            <th className="border p-2 text-[var(--foreground)] text-center">
              Correo
            </th>
            <th className="border p-2 text-[var(--foreground)] text-center">
              Grupo(s)
            </th>
            <th className="border p-2 text-[var(--foreground)] text-center">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.map((user) => {
            const userGroups = user.groupIds
              .map((gId) => groups.find((g) => g.id === gId)?.name)
              .filter(Boolean);
            const isAdmin = user.groupIds.some(
              (g) =>
                groups.find((grp) => grp.id === g)?.name === "Administrador"
            );
            return (
              <tr
                key={user.id}
                className="border-t hover:bg-gray-700/30 transition-colors"
              >
                <td className="border p-2 text-[var(--foreground)] text-center">
                  {user.email || "No disponible"}
                </td>
                <td className="border p-2 text-[var(--foreground)] text-center">
                  {userGroups.join(", ") || "Sin grupo"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        setEditUser({
                          id: user.id,
                          form: {
                            email: user.email || "",
                            groupIds: user.groupIds,
                          },
                        });
                        setShowEditModal(true);
                      }
                    }}
                    className={`p-2 text-yellow-400 hover:text-yellow-300 rounded cursor-pointer ${
                      isAdmin ? "opacity-50" : "hover:bg-yellow-900"
                    }`}
                    disabled={isAdmin}
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
                    onClick={() => deleteUser(user.id)}
                    className={`p-2 text-red-500 hover:text-red-400 rounded ml-2 cursor-pointer ${
                      isAdmin ? "opacity-50" : "hover:bg-red-900"
                    }`}
                    disabled={isAdmin}
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        <span className="text-[var(--foreground)]">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          disabled={currentPage === totalPages}
        >
          Siguiente
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Crear Nuevo Usuario
            </h3>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4 text-center animate-fade-in">
                {error}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const valid = validateForm(newUser);
                if (!valid) {
                  return;
                }
                await createUser(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Correo
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => {
                    setNewUser({ ...newUser, email: e.target.value });
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Correo electrónico"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => {
                    setNewUser({ ...newUser, password: e.target.value });
                    if (error) setError(null);
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Contraseña"
                />
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                  disabled={loading}
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Editar Usuario
            </h3>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4 text-center animate-fade-in">
                {error}
              </div>
            )}
            <form onSubmit={updateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Correo
                </label>
                <input
                  type="email"
                  value={editUser.form.email || ""}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      form: { ...editUser.form, email: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Correo electrónico"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200">
                  Grupos
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <label
                      key={group.id}
                      className="flex items-center space-x-2 text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={editUser.form.groupIds.includes(group.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...editUser.form.groupIds, group.id]
                            : editUser.form.groupIds.filter(
                                (id) => id !== group.id
                              );
                          setEditUser({
                            ...editUser,
                            form: { ...editUser.form, groupIds: updated },
                          });
                          if (error) setError(null);
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                  disabled={loading}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-200 mb-4">
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no
              se puede deshacer.
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
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Save Confirmation Modal */}
      {confirmEditSave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Confirmar Edición
            </h3>
            <p className="text-gray-200 mb-4">
              ¿Estás seguro de que deseas guardar los cambios en este usuario?
            </p>
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-2 text-sm text-red-400 mb-4">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmEditSave(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpdateUser}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cancel Confirmation Modal */}
      {confirmEditCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Confirmar Cancelación
            </h3>
            <p className="text-gray-200 mb-4">
              ¿Estás seguro de que deseas cancelar la edición? Los cambios no
              guardados se perderán.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setConfirmEditCancel(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
              >
                No
              </button>
              <button
                onClick={confirmCancelEdit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                Sí
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
