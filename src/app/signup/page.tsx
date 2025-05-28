"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [success, setSuccess] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const [isLoading, setIsLoading] = useState(false); // Nuevo estado para la animación de carga
  const router = useRouter();

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = "El correo electrónico es obligatorio.";
    } else if (!email.includes("@") || !email.includes(".")) {
      newErrors.email =
        "El correo debe incluir un '@' y un dominio válido (ej. tu@correo.com).";
    }

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true); // Activar la animación de carga

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "user_normal" } },
      });

      if (signupError) {
        if (
          signupError.message.includes("network") ||
          signupError.message.includes("offline")
        ) {
          setErrors({
            general:
              "Sin conexión a internet. Por favor, revisa tu red e intenta de nuevo.",
          });
        } else if (signupError.message.includes("already registered")) {
          setErrors({
            email:
              "Este correo ya está registrado. Inicia sesión o usa otro correo.",
          });
        } else {
          setErrors({
            general: `Error al registrarte: ${signupError.message}. Intenta nuevamente.`,
          });
        }
        return;
      }

      if (data.user) {
        const userId = data.user.id;

        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("id")
          .eq("name", "user_normal")
          .single();

        if (groupError || !groupData) {
          setErrors({
            general:
              "El grupo por defecto no está disponible. Contacta al administrador.",
          });
          return;
        }

        const { error: userGroupError } = await supabase
          .from("user_groups")
          .insert([{ user_id: userId, group_id: groupData.id }]);

        if (userGroupError) {
          setErrors({
            general: `Error al asignar el grupo: ${userGroupError.message}. Contacta al administrador.`,
          });
          return;
        }

        setSuccess(true);
      }
    } catch {
      setErrors({
        general: "Sin conexión a internet o error interno. Intenta de nuevo.",
      });
    } finally {
      setIsLoading(false); // Desactivar la animación de carga cuando termine la solicitud
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
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BeefValue
          </h1>
          <p className="text-sm text-gray-400">
            Regístrate para crear una cuenta
          </p>
        </div>

        {/* Mensaje de éxito */}
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
            <p className="text-lg font-semibold">¡Registro exitoso!</p>
            <p className="text-sm">
              Serás redirigido al login en {redirectSeconds} segundos...
            </p>
          </div>
        )}

        {/* Formulario */}
        {!success && (
          <form onSubmit={handleSignup} className="space-y-6" noValidate>
            {/* Mensaje de error general */}
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

            {/* Campo Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-200"
              >
                Correo Electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) validateForm();
                }}
                placeholder="tu@correo.com"
                className={`w-full px-4 py-2.5 bg-gray-900 border ${
                  errors.email ? "border-red-600" : "border-gray-600"
                } rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all duration-150 placeholder:text-gray-500`}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <div
                  id="email-error"
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
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Campo Contraseña */}
            <div className="space-y-2 relative">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Contraseña
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

            {/* Campo Confirmar Contraseña */}
            <div className="space-y-2 relative">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-200"
              >
                Confirmar Contraseña
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

            {/* Botón de Registro con Animación de Carga */}
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98] transition-all duration-150 cursor-pointer flex items-center justify-center"
              disabled={isLoading} // Deshabilitar el botón mientras carga
            >
              {isLoading ? (
                <svg
                  className="w-6 h-6 text-white animate-slow-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <style>
                    {`
                      @keyframes slow-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      .animate-slow-spin {
                        animation: slow-spin 1.5s linear infinite;
                      }
                    `}
                  </style>
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.2"
                  />
                  <path
                    d="M12 2a10 10 0 0110 10 10 10 0 01-10 10 10 10 0 01-10-10A10 10 0 0112 2"
                    stroke="url(#gradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient
                      id="gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "#ffffff", stopOpacity: 1 }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "#ffffff", stopOpacity: 0 }}
                      />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                "Registrarse"
              )}
            </button>

            {/* Botón Ir a Home */}
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
