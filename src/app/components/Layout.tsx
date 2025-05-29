"use client";

import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Valor inicial seguro
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });

  // Leer el estado del menú desde localStorage al montar el componente
  useEffect(() => {
    const savedState = localStorage.getItem("menuOpen");
    if (savedState !== null) {
      setIsMenuOpen(JSON.parse(savedState));
    }
  }, []);

  // Guardar el estado del menú en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem("menuOpen", JSON.stringify(isMenuOpen));
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/landing");
    setShowConfirmLogout(false);
  };

  const menuItems = [
    {
      name: "Inicio",
      href: "/",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h5v-6h4v6h5a1 1 0 001-1V10"
          />
        </svg>
      ),
    },
    {
      name: "Gestionar Cotización",
      href: "/nueva-cotizacion",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h4m-7 4h10a2 2 0 002-2V7.5a1 1 0 00-.293-.707l-3.5-3.5A1 1 0 0014.5 3H6a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      name: "Historial Cotizaciones",
      href: "/historial",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "Reportes",
      href: "/reportes",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      name: "Gestionar Usuarios",
      href: "/gestion-usuarios",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
        {/* Menú Lateral */}
        <div
          className={`${
            isMenuOpen ? "w-64" : "w-14"
          } bg-gray-800/90 backdrop-blur-sm transition-all duration-300 fixed h-full z-50 flex flex-col`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            {isMenuOpen ? (
              <div className="flex items-center">
                <Image
                  src="/images/vaca.png"
                  alt="BeefValue Logo"
                  width={32}
                  height={32}
                  className="mr-2"
                />
                <h1 className="text-xl font-bold">BeefValue</h1>
              </div>
            ) : (
              <div className="w-8 h-8" /> // Espacio vacío para mantener el diseño
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white focus:outline-none cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>

          <nav className="mt-4 flex flex-col flex-1">
            {menuItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  localStorage.setItem("menuOpen", JSON.stringify(isMenuOpen));
                  router.push(item.href);
                  if (!isMenuOpen) {
                    setIsMenuOpen(false); // Asegurar que el menú permanezca colapsado
                  }
                }}
                onMouseEnter={(e) => {
                  if (!isMenuOpen) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      visible: true,
                      text: item.name,
                      x: rect.right + window.scrollX,
                      y: rect.top + window.scrollY + rect.height / 2,
                    });
                  }
                }}
                onMouseLeave={() => {
                  if (!isMenuOpen) setTooltip({ ...tooltip, visible: false });
                }}
                className={`flex items-center p-3 rounded-md transition-colors duration-300 ${
                  isMenuOpen ? "justify-start" : "justify-center"
                } ${
                  pathname === item.href
                    ? "bg-gradient-to-r from-sky-300/10 to-sky-600/20 text-sky-200 border-l-4 border-sky-400/60"
                    : "text-gray-300 hover:bg-gradient-to-r from-gray-700 to-gray-800 hover:text-white"
                }`}
                style={{
                  display: "flex",
                  position: "relative",
                }}
              >
                {item.icon}
                <span
                  className={`text-lg ${
                    isMenuOpen ? "block" : "hidden"
                  } whitespace-nowrap overflow-hidden`}
                >
                  {item.name}
                </span>
              </a>
            ))}

            {/* Cerrar Sesión al final */}
            <button
              onClick={() => setShowConfirmLogout(true)}
              onMouseEnter={(e) => {
                if (!isMenuOpen) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    visible: true,
                    text: "Cerrar Sesión",
                    x: rect.right + window.scrollX,
                    y: rect.top + window.scrollY + rect.height / 2,
                  });
                }
              }}
              onMouseLeave={() => {
                if (!isMenuOpen) setTooltip({ ...tooltip, visible: false });
              }}
              className={`mt-auto flex items-center p-3 rounded-md transition-colors duration-300 cursor-pointer ${
                isMenuOpen ? "justify-start" : "justify-center"
              } ${
                isMenuOpen
                  ? "text-white hover:bg-gradient-to-r from-gray-700 to-gray-800 hover:text-red-500"
                  : "text-red-500"
              }`}
              style={{ position: "relative" }}
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span
                className={`text-lg ${
                  isMenuOpen ? "block" : "hidden"
                } whitespace-nowrap overflow-hidden`}
              >
                Cerrar Sesión
              </span>
            </button>
          </nav>
        </div>

        {/* Contenido Principal */}
        <div
          className={`flex-1 transition-all duration-300 ${
            isMenuOpen ? "ml-64" : "ml-14"
          } p-6 overflow-y-auto`}
        >
          {children}
        </div>

        {/* Tooltip */}
        {tooltip.visible && !isMenuOpen && (
          <div
            className="absolute bg-gray-800 text-white text-sm px-3 py-1 rounded-md shadow-lg whitespace-nowrap"
            style={{
              top: tooltip.y,
              left: tooltip.x + 5, // Ajustar para que aparezca a la derecha
              transform: "translateY(-50%)", // Centrar verticalmente respecto al ícono
              zIndex: 1000,
            }}
            onMouseEnter={() => setTooltip({ ...tooltip, visible: true })}
            onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}
          >
            {tooltip.text}
            <div className="absolute top-1/2 left-[-5px] transform -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-gray-800"></div>
          </div>
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirmLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#1f2937] text-white rounded-md p-6 w-full max-w-sm shadow-xl">
            <p className="text-base mb-6 text-gray-200">
              ¿Estás seguro de que deseas cerrar sesión? <br />
              <span className="text-sm text-gray-400">
                Los datos no guardados se perderán.
              </span>
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded-md transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition cursor-pointer"
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
