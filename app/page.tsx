import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-3xl font-bold">G</span>
        </div>
        <h1 className="text-4xl font-bold text-white">GatePass</h1>
        <p className="text-slate-400 mt-2">Smart guest access for gated communities</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Link
          href="/security"
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Security Portal
        </Link>
        <Link
          href="/resident/res-101-maria"
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Resident Demo
        </Link>
      </div>
      <div className="mt-4 w-full max-w-sm">
        <Link
          href="/admin"
          className="block w-full bg-violet-700 hover:bg-violet-600 text-white rounded-xl py-4 font-medium transition-colors"
        >
          Admin Portal
        </Link>
      </div>
      <p className="text-slate-600 text-xs mt-6">
        Residents access their portal via a unique link shared by the admin.
      </p>
    </main>
  );
}
