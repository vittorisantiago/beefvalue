"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();

  // Efecto para animaciones de entrada
  useEffect(() => {
    const elements = document.querySelectorAll(".animate-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
          }
        });
      },
      { threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white relative overflow-hidden">
      {/* Fondo Animado Sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/10 to-transparent opacity-30 animate-pulse-slow"></div>
      </div>

      {/* Navbar */}
      <nav className="bg-gray-900/80 backdrop-blur-sm shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y Nombre */}
            <div className="flex items-center">
              <Image
                src="/images/vaca.png"
                alt="BeefValue Logo"
                width={36}
                height={36}
                className="mr-3 transform hover:scale-110 transition-transform duration-300"
              />
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                BeefValue
              </h1>
            </div>
            {/* Botones */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 transform hover:scale-105 cursor-pointer"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
            Bienvenido a <span className="text-emerald-400">BeefValue</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200 animate-on-scroll">
            Optimiza la gestión de tu negocio cárnico con nuestra plataforma
            intuitiva y eficiente.
          </p>
          <button
            onClick={() => router.push("/signup")}
            className="px-8 py-4 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300 transform hover:scale-105 opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-400 animate-on-scroll cursor-pointer"
          >
            Comienza Ahora
          </button>
        </div>
      </section>

      {/* Qué Hace BeefValue */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
            ¿Qué Hace BeefValue?
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200 animate-on-scroll">
            BeefValue es una plataforma diseñada para simplificar la gestión de
            negocios cárnicos. Administra cortes, calcula costos, analiza
            márgenes y optimiza tu operación, todo desde un solo lugar.
          </p>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold text-white text-center mb-16 tracking-tight opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
            ¿Por Qué Elegir BeefValue?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Tarjeta 1 - Gestión Simplificada */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] border border-gray-700/30 relative overflow-hidden group opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-2xl font-semibold text-white text-center mb-4 relative">
                  Gestión Simplificada
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 mt-2"></div>
                </h3>
                <p className="text-gray-400 text-center leading-relaxed text-lg mt-4">
                  Organiza todos tus cortes y negocios en una interfaz intuitiva
                  y fácil de usar.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
            {/* Tarjeta 2 - Ahorro de Tiempo */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] border border-gray-700/30 relative overflow-hidden group opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200 animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-2xl font-semibold text-white text-center mb-4 relative">
                  Ahorro de Tiempo
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 mt-2"></div>
                </h3>
                <p className="text-gray-400 text-center leading-relaxed text-lg mt-4">
                  Automatiza cálculos y procesos para que puedas enfocarte en lo
                  que más importa.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
            {/* Tarjeta 3 - Análisis de Márgenes */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 hover:scale-[1.03] border border-gray-700/30 relative overflow-hidden group opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-400 animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-bl from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex flex-col items-center">
                <h3 className="text-2xl font-semibold text-white text-center mb-4 relative">
                  Análisis de Márgenes
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 mt-2"></div>
                </h3>
                <p className="text-gray-400 text-center leading-relaxed text-lg mt-4">
                  Obtén insights claros para maximizar tus ganancias y optimizar
                  tus costos.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-extrabold text-white text-center mb-16 tracking-tight opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
            Características Principales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Característica 1 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-700/30 relative overflow-hidden group flex items-center space-x-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex-shrink-0">
                <Image
                  src="/icons/business.png"
                  alt="Gestión de Negocios y Usuarios"
                  width={48}
                  height={48}
                  className="flex-shrink-0 transition-transform duration-300 group-hover:rotate-12"
                />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Gestión de Negocios y Usuarios
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Administra fácilmente tus negocios y usuarios, con
                  herramientas para organizar y personalizar tus datos.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-l from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
            {/* Característica 2 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-700/30 relative overflow-hidden group flex items-center space-x-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200 animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex-shrink-0">
                <Image
                  src="/icons/meat.png"
                  alt="Análisis Detallado de Cortes"
                  width={48}
                  height={48}
                  className="flex-shrink-0 transition-transform duration-300 group-hover:rotate-12"
                />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Análisis Detallado de Cortes
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Calcula costos y márgenes de cada corte con precisión, con
                  soporte para múltiples monedas.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
            {/* Característica 3 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-700/30 relative overflow-hidden group flex items-center space-x-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-400 animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex-shrink-0">
                <Image
                  src="/icons/history.png"
                  alt="Histórico de Cotizaciones"
                  width={48}
                  height={48}
                  className="flex-shrink-0 transition-transform duration-300 group-hover:rotate-12"
                />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Histórico de Cotizaciones
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Guarda y revisa tus cotizaciones pasadas para un mejor control
                  de tu negocio.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-l from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
            {/* Característica 4 */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-500 border border-gray-700/30 relative overflow-hidden group flex items-center space-x-6 opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-600 animate-on-scroll">
              <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent opacity-70"></div>
              <div className="relative z-10 flex-shrink-0">
                <Image
                  src="/icons/money.png"
                  alt="Conversión de Monedas"
                  width={48}
                  height={48}
                  className="flex-shrink-0 transition-transform duration-300 group-hover:rotate-12"
                />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Conversión de Monedas
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Trabaja con precios en ARS y USD, con tasas de cambio
                  actualizadas automáticamente.
                </p>
              </div>
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/80 backdrop-blur-sm text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <div className="w-full text-center">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
              BeefValue
            </h3>
            <p className="text-sm text-gray-400">
              © 2025 BeefValue. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Estilos para animaciones */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
