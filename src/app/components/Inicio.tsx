"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function Inicio() {
  useEffect(() => {
    // Activar animaciones con IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-12 max-w-6xl mx-auto px-4">
      <div className="flex flex-col items-center">
        <Image
          src="/images/vaca.png"
          alt="BeefValue Logo"
          width={120}
          height={120}
          className="mb-4 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll"
        />
        <h1 className="text-5xl font-extrabold text-[var(--foreground)] mb-8 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll delay-200">
          BeefValue
        </h1>
      </div>

      {/* Tutorial Paso a Paso */}
      <div className="space-y-6">
        <h2 className="text-3xl font-semibold text-center mb-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll delay-400">
          Guía Rápida para Comenzar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16">
          {/* Paso 1 */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] transition-all duration-300 w-full h-84 flex flex-col justify-between opacity-0 translate-y-15 transition-all duration-1000 ease-out animate-on-scroll delay-600">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Paso 1: Explora el Menú
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Encuentra las opciones disponibles en el menú lateral a la
                izquierda.
              </p>
            </div>
            <svg
              className="w-6 h-6 text-emerald-400 mt-4 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          {/* Paso 2 */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] transition-all duration-300 w-full h-84 flex flex-col justify-between opacity-0 translate-y-15 transition-all duration-1000 ease-out animate-on-scroll delay-800">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Paso 2: Seleccionar Opción
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Haz clic en &apos;Gestionar Cotización&apos; desde el menú.
              </p>
            </div>
            <svg
              className="w-6 h-6 text-emerald-400 mt-4 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          {/* Paso 3 */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] transition-all duration-300 w-full h-84 flex flex-col justify-between opacity-0 translate-y-15 transition-all duration-1000 ease-out animate-on-scroll delay-1000">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Paso 3: Completar Datos
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Ingresa los datos solicitados y selecciona un negocio.
              </p>
            </div>
            <svg
              className="w-6 h-6 text-emerald-400 mt-4 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          {/* Paso 4 */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] transition-all duration-300 w-full h-84 flex flex-col justify-between opacity-0 translate-y-15 transition-all duration-1000 ease-out animate-on-scroll delay-1200">
            <div>
              <h3 className="text-xl font-semibold mb-2">Paso 4: Guardar</h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Guarda tu cotización para consultarla más tarde.
              </p>
            </div>
            <svg
              className="w-6 h-6 text-emerald-400 mt-4 ml-auto"
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
          </div>
        </div>
      </div>

      {/* Estilos para animaciones */}
      <style jsx global>{`
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 1s ease-out, transform 1s ease-out;
        }
        .animate-on-scroll.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
