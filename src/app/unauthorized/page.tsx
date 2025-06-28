// app/unauthorized/page.tsx
import Link from "next/link";

export default function Unauthorized() {
  return (
    <div>
      <h1>No autorizado</h1>
      <p>No tienes permisos para acceder a esta página.</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
