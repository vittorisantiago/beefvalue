"use client";

import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const savedState = localStorage.getItem("menuOpen");
    if (savedState !== null) {
      setIsMenuOpen(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("menuOpen", JSON.stringify(isMenuOpen));
  }, [isMenuOpen]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      const userId = session.user.id;
      const email = session.user.email || "";
      setUserEmail(email);
      console.log("Checking user:", userId);

      const { data: groupData, error: groupError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", userId);
      if (groupError) {
        console.error("Group fetch error:", groupError.message);
        return;
      }
      if (groupData && groupData.length > 0) {
        const groupIds = groupData.map((g) => g.group_id);

        const { data: permissionData, error: permError } = await supabase
          .from("group_permissions")
          .select("permission_id")
          .in("group_id", groupIds);
        if (permError) {
          console.error("Permission fetch error:", permError.message);
          return;
        }
        const permissionIds = permissionData.map((p) => p.permission_id);

        const { data: permNames, error: nameError } = await supabase
          .from("permissions")
          .select("name")
          .in("id", permissionIds);
        if (nameError) {
          console.error("Permission name fetch error:", nameError.message);
          return;
        }
        const uniquePermissions = [...new Set(permNames.map((p) => p.name))];
        console.log("User permissions:", uniquePermissions);
        setPermissions(uniquePermissions);
      } else {
        setPermissions([]);
      }
    };
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    // Limpiar el hint de Tab para el usuario actual
    try {
      const session = await supabase.auth.getSession();
      const userId = session?.data?.session?.user?.id;
      if (typeof window !== "undefined" && userId) {
        const key = `tabHintDismissed_${userId}`;
        window.localStorage.removeItem(key);
      }
    } catch {}
    await supabase.auth.signOut();
    router.push("/landing");
    setShowConfirmLogout(false);
  };

  const getDisplayName = (email: string) => {
    if (!email) return "";
    return email.split("@")[0];
  };

  const menuItems = [
    {
      name: "Inicio",
      href: "/",
      permission: null,
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9.75L12 3l9 6.75M4.5 10.5V20a1 1 0 001 1H9a1 1 0 001-1v-5h4v5a1 1 0 001 1h3.5a1 1 0 001-1v-9.5"
          />
        </svg>
      ),
    },
    {
      name: "Gestionar Cotización",
      href: "/nueva-cotizacion",
      permission: "Gestionar Cotización",
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
      permission: "Historial Cotizaciones",
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
      name: "Gestionar Costos",
      href: "/costos",
      permission: "Gestionar Costos",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
    {
      name: "Reportes",
      href: "/reportes",
      permission: "Reportes",
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
      name: "Auditorías",
      href: "/auditorias",
      permission: "Auditorías",
      icon: (
        <svg
          className="w-5 h-5 mr-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      ),
    },
    {
      name: "Gestionar Usuarios",
      href: "/gestion-usuarios",
      permission: "Gestionar Usuarios",
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

  const filteredMenuItems = menuItems.filter(
    (item) => item.permission === null || permissions.includes(item.permission)
  );

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
              <div className="w-8 h-8" />
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
            {filteredMenuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                prefetch={false}
                className={`flex items-center p-3 rounded-md transition-colors duration-300 ${
                  isMenuOpen ? "justify-start" : "justify-center"
                } ${
                  pathname === item.href
                    ? "bg-gradient-to-r from-sky-300/10 to-sky-600/20 text-sky-200 border-l-4 border-sky-400/60"
                    : "text-gray-300 hover:bg-gradient-to-r from-gray-700 to-gray-800 hover:text-white"
                }`}
                style={{ display: "flex", position: "relative" }}
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
              >
                {item.icon}
                <span
                  className={`text-lg ${
                    isMenuOpen ? "block" : "hidden"
                  } whitespace-nowrap overflow-hidden`}
                >
                  {item.name}
                </span>
              </Link>
            ))}

            {/* Usuario actual */}
            <div
              className={`flex items-center p-3 rounded-md transition-colors duration-300 ${
                isMenuOpen ? "justify-start" : "justify-center"
              } text-gray-300 mt-auto mb-2`}
              style={{ position: "relative" }}
              onMouseEnter={(e) => {
                if (!isMenuOpen) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    visible: true,
                    text: userEmail,
                    x: rect.right + window.scrollX,
                    y: rect.top + window.scrollY + rect.height / 2,
                  });
                }
              }}
              onMouseLeave={() => {
                if (!isMenuOpen) setTooltip({ ...tooltip, visible: false });
              }}
            >
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
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span
                className={`text-lg ${
                  isMenuOpen ? "block" : "hidden"
                } whitespace-nowrap overflow-hidden`}
                title={userEmail}
              >
                {getDisplayName(userEmail)}
              </span>
            </div>

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
              className={`flex items-center p-3 rounded-md transition-colors duration-300 cursor-pointer ${
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

        <div
          className={`flex-1 transition-all duration-300 ${
            isMenuOpen ? "ml-64" : "ml-14"
          } p-6 overflow-y-auto`}
        >
          {children}
        </div>

        {tooltip.visible && !isMenuOpen && (
          <div
            className="absolute bg-gray-800 text-white text-sm px-3 py-1 rounded-md shadow-lg whitespace-nowrap"
            style={{
              top: tooltip.y,
              left: tooltip.x + 5,
              transform: "translateY(-50%)",
              zIndex: 1000,
            }}
            onMouseEnter={() => setTooltip({ ...tooltip, visible: true })}
            onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}
          >
            {tooltip.text}
            <div className="absolute top-1/2 left-[-5px] transform -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-gray-800"></div>
          </div>
        )}

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
                  className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded-md cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md cursor-pointer"
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
