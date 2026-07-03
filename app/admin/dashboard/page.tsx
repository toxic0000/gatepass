"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Resident = {
  id: string;
  name: string;
  unit: string;
  email: string | null;
  token: string;
  createdAt: string;
};

type AdminData = {
  admin: { username: string; community: { name: string } };
  residents: Resident[];
};

const EMPTY_FORM = { name: "", unit: "", email: "", password: "" };

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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
      alert(err.error ?? "Failed to create resident");
      return;
    }
    const created: Resident = await res.json();
    setNewToken(created.token);
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
  }

  async function deleteResident(id: string, name: string) {
    if (
      !confirm(
        `Delete ${name}? All their guest passes will also be removed.`
      )
    )
      return;
    setDeletingId(id);
    await fetch(`/api/admin/residents/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
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
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const communityName = data?.admin.community.name ?? "";
  const residents = data?.residents ?? [];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">A</span>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Admin Portal</h1>
          <p className="text-xs text-slate-400">{communityName}</p>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Log out
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-5 space-y-5">
        {/* New portal link notification */}
        {newToken && (
          <section className="bg-emerald-900/40 border border-emerald-700 rounded-2xl p-5">
            <p className="text-emerald-400 font-semibold mb-1">
              Resident created!
            </p>
            <p className="text-slate-300 text-sm mb-3">
              Share this portal link with the resident:
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
                {copied === newToken ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setNewToken(null)}
              className="mt-3 text-slate-500 hover:text-slate-400 text-xs transition-colors"
            >
              Dismiss
            </button>
          </section>
        )}

        {/* Residents section */}
        <section className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Residents</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {residents.length}{" "}
                {residents.length === 1 ? "resident" : "residents"}
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setForm(EMPTY_FORM);
              }}
              className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            >
              {showForm ? "Cancel" : "+ New Resident"}
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
                    Full name *
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Unit *
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
                  Email{" "}
                  <span className="text-slate-600">(login username)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                  placeholder="resident@example.com"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:text-slate-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                {submitting ? "Creating…" : "Create Resident"}
              </button>
            </form>
          )}
        </section>

        {/* Residents list */}
        {residents.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center text-slate-500 text-sm">
            No residents yet. Add the first one above.
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700">
            {residents.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{r.name}</span>
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        Unit {r.unit}
                      </span>
                    </div>
                    {r.email && (
                      <p className="text-slate-400 text-sm mt-0.5">{r.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-emerald-400 text-xs font-mono truncate max-w-[220px]">
                        /resident/{r.token}
                      </code>
                      <button
                        onClick={() => copyLink(r.token)}
                        className="text-slate-500 hover:text-slate-300 text-xs transition-colors shrink-0"
                      >
                        {copied === r.token ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteResident(r.id, r.name)}
                    disabled={deletingId === r.id}
                    className="text-red-500 hover:text-red-400 active:text-red-600 disabled:opacity-40 text-sm shrink-0 transition-colors"
                  >
                    {deletingId === r.id ? "Deleting…" : "Delete"}
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
