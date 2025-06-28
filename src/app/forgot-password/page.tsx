"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string; general?: string }>(
    {}
  );
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    if (!email) {
      return "Por favor completa el correo electrónico.";
    }
    if (!email.includes("@") || !email.includes(".")) {
      return "El correo electrónico no es válido.";
    }
    return "";
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const validationMsg = validateForm();
    if (validationMsg) {
      setErrors({ general: validationMsg });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (
          error.message.includes("network") ||
          error.message.includes("offline")
        ) {
          setErrors({
            general:
              "Sin conexión a internet. Por favor, revisa tu red e intenta de nuevo.",
          });
        } else if (error.message.includes("user not found")) {
          setErrors({
            email: "No existe un usuario registrado con este correo.",
          });
        } else if (error.message.includes("limit")) {
          setErrors({
            general:
              "Límite de emails alcanzado (2 por hora). Intenta de nuevo más tarde.",
          });
        } else {
          setErrors({
            general: `Error al enviar el enlace: ${error.message}. Intenta nuevamente.`,
          });
        }
        return;
      }

      setSuccess(true);
    } catch {
      setErrors({
        general: "Sin conexión a internet o error interno. Intenta de nuevo.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-800">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            BeefValue
          </h1>
          <p className="text-sm text-gray-400">Recupera tu contraseña</p>
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
            <p className="text-lg font-semibold">¡Enlace enviado!</p>
            <p className="text-sm">
              Revisa tu correo para restablecer tu contraseña. Si no lo
              encuentras, revisa tu carpeta de spam.
            </p>
          </div>
        )}

        {!success && (
          <form
            onSubmit={handleForgotPassword}
            className="space-y-6"
            noValidate
          >
            {errors.general && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-3 text-center text-red-300 font-medium mb-2 animate-fade-in">
                {errors.general}
              </div>
            )}

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
                  if (errors.email || errors.general) setErrors({});
                }}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all duration-150 placeholder:text-gray-500"
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

            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 active:scale-[0.98] transition-all duration-150 cursor-pointer"
            >
              Enviar Enlace de Recuperación
            </button>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md font-medium hover:bg-gray-600 transition-all duration-150 cursor-pointer"
            >
              Volver a Login
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
