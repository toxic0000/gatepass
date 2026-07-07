import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-10">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">G</span>
        </div>
        <h1 className="text-4xl font-bold text-white">GatePass</h1>
        <p className="text-slate-400 mt-2">Acceso inteligente de visitas para comunidades privadas</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Link
          href="/security/login"
          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Portal de Seguridad
          <span className="block text-xs font-normal text-emerald-200/70 mt-0.5">
            Escanea pases y registra entradas en la caseta
          </span>
        </Link>
        <Link
          href="/admin"
          className="bg-violet-700 hover:bg-violet-600 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Administración de Comunidad
          <span className="block text-xs font-normal text-violet-200/70 mt-0.5">
            Administra residentes, seguridad y registro de entradas
          </span>
        </Link>
        <Link
          href="/superadmin"
          className="bg-sky-700 hover:bg-sky-600 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Súper Admin
          <span className="block text-xs font-normal text-sky-200/70 mt-0.5">
            Administra comunidades y límites
          </span>
        </Link>
      </div>

      <p className="text-slate-500 text-sm mt-8 max-w-sm">
        <span className="text-slate-300 font-medium">¿Eres residente?</span> Usa el
        enlace personal que te compartió el administrador de tu comunidad — no
        necesitas iniciar sesión.
      </p>
    </main>
  );
}
