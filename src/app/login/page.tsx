"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación personalizada
    if (!email || !password) {
      setError("Por favor, completa todos los campos.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message.includes("network") ||
          error.message.includes("offline")
        ) {
          setError(
            "Sin conexión a internet. Por favor, revisa tu red e intenta de nuevo."
          );
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Correo o contraseña incorrectos. Verifica tus datos.");
        } else {
          setError("Ocurrió un error inesperado. Intenta nuevamente.");
        }
      } else {
        router.push("/"); // Redirige a la página principal después del login
      }
    } catch {
      setError(
        "Sin conexión a internet. Por favor, revisa tu red e intenta de nuevo."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-[var(--background)] border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-8 space-y-8">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
            BeefValue
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Inicia sesión para acceder a tu cuenta
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all duration-150 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-gray-300 dark:border-gray-600 rounded-md text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all duration-150 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
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
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2.5 bg-[var(--primary)] text-white rounded-md font-medium hover:bg-[var(--primary-hover)] focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 dark:focus:ring-offset-gray-800 active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
