"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateForm = () => {
    if (!email || !password) {
      return "Por favor completa todos los campos.";
    }
    if (!email.includes("@") || !email.includes(".")) {
      return "El correo electrónico no es válido.";
    }
    return "";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const validationMsg = validateForm();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        setError(
          loginError.message.includes("Invalid login credentials")
            ? "Correo o contraseña incorrectos."
            : "Error de conexión."
        );
      } else if (data.user) {
        setSuccess(true);
        setRedirectSeconds(5);
        setTimeout(() => router.push("/"), 5000);
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && redirectSeconds > 0) {
      timer = setTimeout(() => setRedirectSeconds((prev) => prev - 1), 1000);
    } else if (success && redirectSeconds === 0) {
      router.push("/");
    }
    return () => clearTimeout(timer);
  }, [success, redirectSeconds, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-800">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">BeefValue</h1>
          <p className="text-sm text-gray-400">Inicia sesión</p>
        </div>

        {success && (
          <div className="bg-emerald-900/50 border border-emerald-700 rounded-md p-4 text-center text-emerald-200">
            <p className="text-lg font-semibold">¡Inicio de sesión exitoso!</p>
            <p className="text-sm">
              Redirigiendo en {redirectSeconds} segundos...
            </p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-md p-3 text-center text-red-300 font-medium mb-2">
                {error}
              </div>
            )}
            <div>
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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-md text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Cargando..." : "Iniciar Sesión"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/landing")}
              className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-md font-medium hover:bg-gray-600 cursor-pointer"
            >
              Ir a Home
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
