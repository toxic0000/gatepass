"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Resident = {
  id: string;
  name: string;
  unit: string;
  email: string | null;
  token: string;
  isActive: boolean;
  disabledNote: string | null;
  createdAt: string;
};

type AdminData = {
  admin: {
    username: string;
    community: { name: string; maxResidents: number };
  };
  residents: Resident[];
};

type EntryRow = {
  id: string;
  enteredAt: string;
  note: string | null;
  guestPass: {
    guestName: string;
    entryType: string;
    shortCode: string;
    totalPersons: number;
    resident: { name: string; unit: string };
  };
};

type SecurityUser = {
  id: string;
  username: string;
  createdAt: string;
};

type Tab = "residents" | "entries" | "security";

const EMPTY_FORM = { name: "", unit: "", email: "" };
const EMPTY_SECURITY_FORM = { username: "", password: "" };

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("residents");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  // Residents tab
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Entry log tab
  const [entries, setEntries] = useState<EntryRow[] | null>(null);

  // Security tab
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[] | null>(
    null
  );
  const [showSecurityForm, setShowSecurityForm] = useState(false);
  const [securityForm, setSecurityForm] = useState(EMPTY_SECURITY_FORM);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/residents");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    setData(await res.json());
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEntries = useCallback(async () => {
    const res = await fetch("/api/admin/entries");
    if (res.ok) setEntries(await res.json());
  }, []);

  const loadSecurity = useCallback(async () => {
    const res = await fetch("/api/admin/security");
    if (res.ok) setSecurityUsers(await res.json());
  }, []);

  useEffect(() => {
    if (tab === "entries" && entries === null) loadEntries();
    if (tab === "security" && securityUsers === null) loadSecurity();
  }, [tab, entries, securityUsers, loadEntries, loadSecurity]);

  async function createResident(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/residents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo crear el residente");
      return;
    }
    const created: Resident = await res.json();
    setNewToken(created.token);
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
  }

  async function toggleResident(r: Resident) {
    let disabledNote: string | null = null;
    if (r.isActive) {
      disabledNote = prompt(
        `¿Deshabilitar a ${r.name}? Perderá el acceso a su portal.\n\nNota opcional que verá el residente (p. ej. el motivo):`
      );
      if (disabledNote === null) return; // cancelled
    }
    setTogglingId(r.id);
    const res = await fetch(`/api/admin/residents/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive, disabledNote }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo actualizar el residente");
      return;
    }
    await load();
  }

  async function createSecurityUser(e: React.FormEvent) {
    e.preventDefault();
    setSecuritySubmitting(true);
    const res = await fetch("/api/admin/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(securityForm),
    });
    setSecuritySubmitting(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo crear el usuario de seguridad");
      return;
    }
    setSecurityForm(EMPTY_SECURITY_FORM);
    setShowSecurityForm(false);
    await loadSecurity();
  }

  async function removeSecurityUser(u: SecurityUser) {
    if (!confirm(`¿Eliminar al usuario de seguridad ${u.username}?`)) return;
    setRemovingId(u.id);
    const res = await fetch(`/api/admin/security/${u.id}`, {
      method: "DELETE",
    });
    setRemovingId(null);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "No se pudo eliminar el usuario de seguridad");
      return;
    }
    await loadSecurity();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin");
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/resident/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Cargando…</p>
      </div>
    );
  }

  const communityName = data?.admin.community.name ?? "";
  const maxResidents = data?.admin.community.maxResidents ?? 0;
  const residents = data?.residents ?? [];
  const activeCount = residents.filter((r) => r.isActive).length;
  const atCap = activeCount >= maxResidents;

  const TABS: { key: Tab; label: string }[] = [
    { key: "residents", label: "Residentes" },
    { key: "entries", label: "Registro de entradas" },
    { key: "security", label: "Seguridad" },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">A</span>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Portal de Administración</h1>
          <p className="text-xs text-slate-400">{communityName}</p>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-5 space-y-5">
        {/* Tabs */}
        <div className="bg-slate-800 rounded-2xl p-1.5 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ============ RESIDENTS TAB ============ */}
        {tab === "residents" && (
          <>
            {/* New portal link notification */}
            {newToken && (
              <section className="bg-emerald-900/40 border border-emerald-700 rounded-2xl p-5">
                <p className="text-emerald-400 font-semibold mb-1">
                  ¡Residente creado!
                </p>
                <p className="text-slate-300 text-sm mb-3">
                  Comparte este enlace del portal con el residente:
                </p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-slate-900 text-emerald-400 rounded-xl px-3 py-2 text-sm truncate font-mono">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/resident/${newToken}`
                      : `/resident/${newToken}`}
                  </code>
                  <button
                    onClick={() => copyLink(newToken)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 text-sm font-medium transition-colors shrink-0"
                  >
                    {copied === newToken ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
                <button
                  onClick={() => setNewToken(null)}
                  className="mt-3 text-slate-500 hover:text-slate-400 text-xs transition-colors"
                >
                  Descartar
                </button>
              </section>
            )}

            {/* Residents section */}
            <section className="bg-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold">Residentes</h2>
                  <p
                    className={`text-xs mt-0.5 ${
                      atCap ? "text-amber-400" : "text-slate-500"
                    }`}
                  >
                    {activeCount}/{maxResidents} activos
                    {atCap ? " · límite alcanzado" : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(!showForm);
                    setForm(EMPTY_FORM);
                  }}
                  disabled={!showForm && atCap}
                  className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                >
                  {showForm ? "Cancelar" : "+ Nuevo residente"}
                </button>
              </div>

              {/* Create form */}
              {showForm && (
                <form
                  onSubmit={createResident}
                  className="px-5 pb-5 border-t border-slate-700 pt-4 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Nombre completo *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                        placeholder="María López"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Unidad *
                      </label>
                      <input
                        required
                        value={form.unit}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, unit: e.target.value }))
                        }
                        className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                        placeholder="101"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Correo electrónico{" "}
                      <span className="text-slate-600">
                        (opcional, solo contacto)
                      </span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                      placeholder="residente@ejemplo.com"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
                  >
                    {submitting ? "Creando…" : "Crear residente"}
                  </button>
                </form>
              )}
            </section>

            {/* Residents list */}
            {residents.length === 0 ? (
              <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
                Aún no hay residentes. Agrega el primero arriba.
              </div>
            ) : (
              <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700">
                {residents.map((r) => (
                  <div
                    key={r.id}
                    className={`px-5 py-4 ${r.isActive ? "" : "opacity-70"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">
                            {r.name}
                          </span>
                          <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                            Unidad {r.unit}
                          </span>
                          {!r.isActive && (
                            <span className="bg-red-900/60 text-red-400 text-xs px-2 py-0.5 rounded-full">
                              Deshabilitado
                            </span>
                          )}
                        </div>
                        {r.email && (
                          <p className="text-slate-400 text-sm mt-0.5">
                            {r.email}
                          </p>
                        )}
                        {!r.isActive && r.disabledNote && (
                          <p className="text-amber-400/90 text-xs mt-1">
                            Nota: {r.disabledNote}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-emerald-400 text-xs font-mono truncate max-w-[220px]">
                            /resident/{r.token}
                          </code>
                          <button
                            onClick={() => copyLink(r.token)}
                            className="text-slate-500 hover:text-slate-300 text-xs transition-colors shrink-0"
                          >
                            {copied === r.token ? "¡Copiado!" : "Copiar enlace"}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleResident(r)}
                        disabled={togglingId === r.id}
                        className={`text-sm shrink-0 transition-colors disabled:opacity-40 ${
                          r.isActive
                            ? "text-red-500 hover:text-red-400"
                            : "text-emerald-500 hover:text-emerald-400"
                        }`}
                      >
                        {togglingId === r.id
                          ? "Guardando…"
                          : r.isActive
                            ? "Deshabilitar"
                            : "Habilitar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ============ ENTRY LOG TAB ============ */}
        {tab === "entries" && (
          <section className="bg-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Registro de entradas</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Últimas {entries?.length ?? 0} entradas en caseta
                </p>
              </div>
              <button
                onClick={loadEntries}
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Actualizar
              </button>
            </div>
            {entries === null ? (
              <p className="px-5 pb-5 text-slate-500 text-sm">Cargando…</p>
            ) : entries.length === 0 ? (
              <p className="px-5 pb-5 text-slate-500 text-sm">
                Aún no hay entradas registradas.
              </p>
            ) : (
              <div className="divide-y divide-slate-700 border-t border-slate-700">
                {entries.map((e) => (
                  <div key={e.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {e.guestPass.guestName}
                          {e.guestPass.totalPersons > 1 && (
                            <span className="text-slate-400 font-normal">
                              {" "}
                              +{e.guestPass.totalPersons - 1}
                            </span>
                          )}
                          <span className="text-slate-500 font-normal">
                            {" "}
                            · {e.guestPass.entryType === "car" ? "en auto" : "a pie"}
                          </span>
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5 truncate">
                          Invitado de {e.guestPass.resident.name} · Unidad{" "}
                          {e.guestPass.resident.unit}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <p className="text-slate-500 text-xs shrink-0 text-right">
                        {new Date(e.enteredAt).toLocaleString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============ SECURITY TAB ============ */}
        {tab === "security" && (
          <section className="bg-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Usuarios de seguridad</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Cuentas del personal de caseta de {communityName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSecurityForm(!showSecurityForm);
                  setSecurityForm(EMPTY_SECURITY_FORM);
                }}
                className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              >
                {showSecurityForm ? "Cancelar" : "+ Nuevo usuario"}
              </button>
            </div>

            {showSecurityForm && (
              <form
                onSubmit={createSecurityUser}
                className="px-5 pb-5 border-t border-slate-700 pt-4 space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Usuario *
                    </label>
                    <input
                      required
                      autoComplete="off"
                      value={securityForm.username}
                      onChange={(e) =>
                        setSecurityForm((f) => ({
                          ...f,
                          username: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                      placeholder="gate-north"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Contraseña *
                    </label>
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      value={securityForm.password}
                      onChange={(e) =>
                        setSecurityForm((f) => ({
                          ...f,
                          password: e.target.value,
                        }))
                      }
                      className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={securitySubmitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
                >
                  {securitySubmitting ? "Creando…" : "Crear usuario de seguridad"}
                </button>
              </form>
            )}

            {securityUsers === null ? (
              <p className="px-5 pb-5 text-slate-500 text-sm">Cargando…</p>
            ) : securityUsers.length === 0 ? (
              <p className="px-5 pb-5 text-slate-500 text-sm">
                Aún no hay usuarios de seguridad. El portal de caseta necesita al menos uno.
              </p>
            ) : (
              <div className="divide-y divide-slate-700 border-t border-slate-700">
                {securityUsers.map((u) => (
                  <div
                    key={u.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {u.username}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Agregado el {new Date(u.createdAt).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeSecurityUser(u)}
                      disabled={removingId === u.id}
                      className="text-red-500 hover:text-red-400 disabled:opacity-40 text-sm shrink-0 transition-colors"
                    >
                      {removingId === u.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
