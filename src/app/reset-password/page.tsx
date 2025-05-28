"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado para el token
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Extraer el token y verificar la sesión
  useEffect(() => {
    const checkSession = async () => {
      // Intenta obtener el token desde los parámetros de consulta
      let extractedToken = searchParams.get("access_token");

      // Si no se encuentra en los parámetros de consulta, intenta leerlo desde el fragmento
      if (!extractedToken) {
        const hash = window.location.hash.substring(1); // Elimina el "#" inicial
        const hashParams = new URLSearchParams(hash);
        extractedToken = hashParams.get("access_token") || null;
      }

      setToken(extractedToken);

      // Depuración
      console.log("Token recibido:", extractedToken);
      console.log("URL completa:", window.location.href);

      if (extractedToken) {
        // Verifica si hay una sesión activa
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error al verificar la sesión:", error.message);
          setErrors({
            general:
              "Error al verificar el enlace. Solicita un nuevo enlace de recuperación.",
          });
          return;
        }

        if (session) {
          setIsAuthenticated(true);
        } else {
          setErrors({
            general:
              "Enlace inválido o sesión no encontrada. Solicita un nuevo enlace de recuperación.",
          });
        }
      } else {
        setErrors({
          general: "Enlace inválido. Solicita un nuevo enlace de recuperación.",
        });
      }
    };

    checkSession();
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Debes confirmar tu contraseña.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (!token || !isAuthenticated) {
      setErrors({
        general:
          "Enlace inválido o sesión no encontrada. Solicita un nuevo enlace de recuperación.",
      });
      console.error(
        "No se encontró el token o la sesión no está autenticada:",
        window.location.href
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      // Actualiza la contraseña
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Error al actualizar la contraseña:", error.message);
        if (
          error.message.includes("network") ||
          error.message.includes("offline")
        ) {
          setErrors({
            general:
              "Sin conexión a internet. Por favor, revisa tu red e intenta de nuevo.",
          });
        } else if (error.message.includes("invalid token")) {
          setErrors({
            general:
              "El enlace ha expirado o es inválido. Solicita un nuevo enlace.",
          });
        } else if (error.message.includes("user")) {
          setErrors({
            general:
              "Error de autenticación. Verifica el enlace o inicia sesión.",
          });
        } else {
          setErrors({
            general: `Error al actualizar la contraseña: ${error.message}. Intenta nuevamente.`,
          });
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Excepción no manejada:", err);
      setErrors({
        general: "Sin conexión a internet o error interno. Intenta de nuevo.",
      });
    }
  };

  // Contador de redirección
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && redirectSeconds > 0) {
      timer = setTimeout(() => setRedirectSeconds((prev) => prev - 1), 1000);
    } else if (success && redirectSeconds === 0) {
      router.push("/login");
    }
    return () => clearTimeout(timer);
  }, [success, redirectSeconds, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-800">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BeefValue
          </h1>
          <p className="text-sm text-gray-400">Restablece tu contraseña</p>
        </div>

        {success && (
          <div className="bg-emerald-900/50 border border-emerald-700 rounded-md p-4 text-center text-emerald-200 animate-fade-in">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-emerald-400 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-lg font-semibold">¡Contraseña actualizada!</p>
            <p className="text-sm">
              Serás redirigido al login en {redirectSeconds} segundos...
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleResetPassword} className="space-y-6" noValidate>
            {errors.general && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-3 text-sm text-red-400 animate-fade-in">
                <svg
                  className="inline w-5 h-5 mr-2 -mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {errors.general}
              </div>
            )}

            <div className="space-y-2 relative">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Nueva Contraseña
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.confirmPassword) validateForm();
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 bg-gray-900 border ${
                  errors.password ? "border-red-600" : "border-gray-600"
                } rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all duration-150 placeholder:text-gray-500 pr-10`}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {showPassword ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  )}
                </svg>
              </button>
              {errors.password && (
                <div
                  id="password-error"
                  className="text-sm text-red-400 flex items-center space-x-1 animate-fade-in"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 relative">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-200"
              >
                Confirmar Nueva Contraseña
              </label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) validateForm();
                }}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 bg-gray-900 border ${
                  errors.confirmPassword ? "border-red-600" : "border-gray-600"
                } rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all duration-150 placeholder:text-gray-500 pr-10`}
                aria-describedby={
                  errors.confirmPassword ? "confirmPassword-error" : undefined
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {showConfirmPassword ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  )}
                </svg>
              </button>
              {errors.confirmPassword && (
                <div
                  id="confirmPassword-error"
                  className="text-sm text-red-400 flex items-center space-x-1 animate-fade-in"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              Actualizar Contraseña
            </button>

            <button
              type="button"
              onClick={() => router.push("/landing")}
              className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md font-medium hover:bg-gray-600 transition-all duration-150 cursor-pointer"
            >
              Ir a Home
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
