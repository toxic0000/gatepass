"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Community = {
  id: string;
  name: string;
  slug: string;
  maxResidents: number;
  isActive: boolean;
  createdAt: string;
  counts: { residents: number; admins: number; security: number };
};

type DashboardData = {
  user: { username: string };
  communities: Community[];
};

const EMPTY_FORM = {
  name: "",
  maxResidents: "50",
  adminUsername: "",
  adminPassword: "",
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/superadmin/communities");
    if (res.status === 401) {
      router.push("/superadmin");
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createCommunity(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/superadmin/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo crear la comunidad");
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
  }

  async function toggleActive(c: Community) {
    if (
      c.isActive &&
      !confirm(
        `¿Deshabilitar ${c.name}? Sus administradores, seguridad y residentes perderán el acceso de inmediato.`
      )
    )
      return;
    setTogglingId(c.id);
    const res = await fetch(`/api/superadmin/communities/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo actualizar la comunidad");
      return;
    }
    await load();
  }

  async function saveLimit(c: Community) {
    const res = await fetch(`/api/superadmin/communities/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxResidents: limitDraft }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo actualizar el límite");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/superadmin");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  const communities = data?.communities ?? [];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">S</span>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Súper Admin</h1>
          <p className="text-xs text-slate-400">
            {data?.user.username} · Administración del programa
          </p>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-5 space-y-5">
        {/* Communities section */}
        <section className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Comunidades</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {communities.length}{" "}
                {communities.length === 1 ? "comunidad" : "comunidades"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setForm(EMPTY_FORM);
              }}
              className="bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              {showForm ? "Cancelar" : "+ Nueva comunidad"}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <form
              onSubmit={createCommunity}
              className="px-5 pb-5 border-t border-slate-700 pt-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Nombre de la comunidad *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="Lomas del Sol"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Máximo de residentes *
                  </label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.maxResidents}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxResidents: e.target.value }))
                    }
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Usuario del administrador *
                  </label>
                  <input
                    required
                    autoComplete="off"
                    value={form.adminUsername}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adminUsername: e.target.value }))
                    }
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="sunset-admin"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Contraseña del administrador *
                  </label>
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={form.adminPassword}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, adminPassword: e.target.value }))
                    }
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                {submitting ? "Creando…" : "Crear comunidad"}
              </button>
            </form>
          )}
        </section>

        {/* Communities list */}
        {communities.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            Aún no hay comunidades. Agrega la primera arriba.
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700">
            {communities.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{c.name}</span>
                      {c.isActive ? (
                        <span className="bg-emerald-900/60 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                          Activa
                        </span>
                      ) : (
                        <span className="bg-red-900/60 text-red-400 text-xs px-2 py-0.5 rounded-full">
                          Deshabilitada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                      <span>
                        Residentes{" "}
                        <span className="text-slate-200 font-medium">
                          {c.counts.residents}/{c.maxResidents}
                        </span>
                      </span>
                      <span>
                        Administradores{" "}
                        <span className="text-slate-200 font-medium">
                          {c.counts.admins}
                        </span>
                      </span>
                      <span>
                        Seguridad{" "}
                        <span className="text-slate-200 font-medium">
                          {c.counts.security}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2">
                      {editingId === c.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            value={limitDraft}
                            onChange={(e) => setLimitDraft(e.target.value)}
                            className="w-24 bg-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                          />
                          <button
                            onClick={() => saveLimit(c)}
                            className="text-sky-400 hover:text-sky-300 text-xs font-medium transition-colors"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-slate-500 hover:text-slate-400 text-xs transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setLimitDraft(String(c.maxResidents));
                          }}
                          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                        >
                          Editar límite de residentes
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={togglingId === c.id}
                    className={`text-sm shrink-0 transition-colors disabled:opacity-40 ${
                      c.isActive
                        ? "text-red-500 hover:text-red-400"
                        : "text-emerald-500 hover:text-emerald-400"
                    }`}
                  >
                    {togglingId === c.id
                      ? "Guardando…"
                      : c.isActive
                        ? "Deshabilitar"
                        : "Habilitar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
