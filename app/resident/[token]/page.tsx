"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { generateQRDataURL, getPassUrl } from "@/lib/qr";

type Entry = { id: string; enteredAt: string; note: string | null };
type GuestPass = {
  id: string;
  shortCode: string;
  entryType: string;
  guestName: string;
  totalPersons: number;
  vehiclePlate: string | null;
  carBrand: string | null;
  carModel: string | null;
  carColor: string | null;
  guestNames: string | null;
  validFrom: string;
  validTo: string;
  createdAt: string;
  entries: Entry[];
};
type Resident = {
  id: string;
  name: string;
  unit: string;
  community: { name: string };
  guestPasses: GuestPass[];
};

const EMPTY_CAR_FORM = {
  entryType: "car" as const,
  guestName: "",
  totalPersons: "1",
  vehiclePlate: "",
  carBrand: "",
  carModel: "",
  carColor: "",
};

const EMPTY_FOOT_FORM = {
  entryType: "foot" as const,
  totalPersons: "1",
};

type DisabledInfo = {
  reason: "resident_disabled" | "community_disabled";
  disabledNote?: string | null;
  residentName?: string;
  unit?: string;
  communityName?: string;
};

export default function ResidentPage() {
  const { token } = useParams<{ token: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState<DisabledInfo | null>(null);
  const [entryType, setEntryType] = useState<"car" | "foot">("car");
  const [carForm, setCarForm] = useState(EMPTY_CAR_FORM);
  const [footForm, setFootForm] = useState(EMPTY_FOOT_FORM);
  const [footNames, setFootNames] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [selectedPass, setSelectedPass] = useState<string | null>(null);

  const loadResident = useCallback(async () => {
    const res = await fetch(`/api/residents/${token}`);
    if (res.status === 403) {
      const info = await res.json();
      setDisabled(info);
      return;
    }
    if (!res.ok) { setError("Enlace no encontrado."); return; }
    const data: Resident = await res.json();
    setResident(data);

    const map: Record<string, string> = {};
    for (const pass of data.guestPasses) {
      map[pass.id] = await generateQRDataURL(pass.id, window.location.origin);
    }
    setQrMap(map);
  }, [token]);

  useEffect(() => { loadResident(); }, [loadResident]);

  function handleTotalPersonsChange(val: string) {
    const n = Math.max(1, parseInt(val) || 1);
    setFootForm(f => ({ ...f, totalPersons: String(n) }));
    setFootNames(prev => {
      const names = [...prev];
      while (names.length < n) names.push("");
      return names.slice(0, n);
    });
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const body =
      entryType === "car"
        ? {
            residentToken: token,
            entryType: "car",
            guestName: carForm.guestName,
            totalPersons: carForm.totalPersons,
            vehiclePlate: carForm.vehiclePlate,
            carBrand: carForm.carBrand,
            carModel: carForm.carModel,
            carColor: carForm.carColor,
          }
        : {
            residentToken: token,
            entryType: "foot",
            guestName: footNames[0] || "Invitado",
            totalPersons: footForm.totalPersons,
            guestNames: footNames,
          };

    const res = await fetch("/api/passes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // Disabled mid-session: reload so the disabled screen takes over.
      if (res.status === 403) { await loadResident(); return; }
      alert(err.error ?? "Error al crear el pase");
      return;
    }

    setCarForm(EMPTY_CAR_FORM);
    setFootForm(EMPTY_FOOT_FORM);
    setFootNames([""]);
    await loadResident();
  }

  function sharePass(passId: string) {
    const url = getPassUrl(passId, window.location.origin);
    if (navigator.share) {
      navigator.share({ title: "Pase de invitado", url });
    } else {
      navigator.clipboard.writeText(url);
      alert("¡Enlace del pase copiado al portapapeles!");
    }
  }

  if (disabled) {
    const isCommunity = disabled.reason === "community_disabled";
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isCommunity ? "Comunidad deshabilitada" : "Acceso deshabilitado"}
          </h1>
          {!isCommunity && disabled.residentName && (
            <p className="text-slate-500 text-sm">
              Unidad {disabled.unit} — {disabled.residentName}
              {disabled.communityName ? ` · ${disabled.communityName}` : ""}
            </p>
          )}
          <p className="text-slate-600">
            {isCommunity
              ? `${disabled.communityName ?? "Esta comunidad"} está deshabilitada por el momento. No se pueden crear ni usar pases de invitado.`
              : "El administrador de tu comunidad deshabilitó tu acceso al portal de pases."}
          </p>
          {!isCommunity && disabled.disabledNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">
                Mensaje del administrador de tu comunidad
              </p>
              <p className="text-sm text-amber-900">{disabled.disabledNote}</p>
            </div>
          )}
          <p className="text-slate-400 text-sm">
            {isCommunity
              ? "Contacta a la administración de tu comunidad para más información."
              : "Si crees que se trata de un error, contacta al administrador de tu comunidad."}
          </p>
        </div>
      </div>
    );
  }

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-red-500 text-lg">{error}</p>
    </div>
  );

  if (!resident) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400">Cargando…</p>
    </div>
  );

  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white px-6 py-4">
        <p className="text-xs text-slate-400 uppercase tracking-widest">{resident.community.name}</p>
        <h1 className="text-xl font-semibold">Unidad {resident.unit} — {resident.name}</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">

        {/* Create pass form */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Crear pase de invitado</h2>

          {/* Entry type toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setEntryType("car")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                entryType === "car"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              En auto
            </button>
            <button
              type="button"
              onClick={() => setEntryType("foot")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                entryType === "foot"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              A pie
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {entryType === "car" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del invitado principal *</label>
                  <input
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={carForm.guestName}
                    onChange={e => setCarForm(f => ({ ...f, guestName: e.target.value }))}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Marca del auto *</label>
                    <input
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={carForm.carBrand}
                      onChange={e => setCarForm(f => ({ ...f, carBrand: e.target.value }))}
                      placeholder="Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Modelo del auto *</label>
                    <input
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={carForm.carModel}
                      onChange={e => setCarForm(f => ({ ...f, carModel: e.target.value }))}
                      placeholder="Corolla"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Color del auto *</label>
                    <input
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={carForm.carColor}
                      onChange={e => setCarForm(f => ({ ...f, carColor: e.target.value }))}
                      placeholder="Plateado"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Placas</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={carForm.vehiclePlate}
                      onChange={e => setCarForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                      placeholder="ABC-1234"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Total de personas *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={carForm.totalPersons}
                    onChange={e => setCarForm(f => ({ ...f, totalPersons: e.target.value }))}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Total de personas *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    value={footForm.totalPersons}
                    onChange={e => handleTotalPersonsChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-600">Nombres de los invitados *</label>
                  {footNames.map((name, i) => (
                    <input
                      key={i}
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={name}
                      onChange={e => {
                        const updated = [...footNames];
                        updated[i] = e.target.value;
                        setFootNames(updated);
                      }}
                      placeholder={i === 0 ? "Invitado 1 (principal)" : `Invitado ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-800 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creando…" : "Generar pase"}
            </button>
          </form>
        </section>

        {/* Existing passes */}
        {resident.guestPasses.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Tus pases</h2>
            {resident.guestPasses.map(pass => {
              const active = new Date(pass.validFrom) <= now && now <= new Date(pass.validTo);
              const expired = now > new Date(pass.validTo);
              const parsedNames: string[] | null = pass.guestNames ? JSON.parse(pass.guestNames) : null;

              return (
                <div key={pass.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">{pass.guestName}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium uppercase tracking-wide">
                          {pass.entryType === "car" ? "En auto" : "A pie"}
                        </span>
                      </div>

                      {pass.entryType === "car" && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {[pass.carColor, pass.carBrand, pass.carModel].filter(Boolean).join(" ")}
                          {pass.vehiclePlate && ` · ${pass.vehiclePlate}`}
                        </p>
                      )}

                      {pass.entryType === "foot" && parsedNames && parsedNames.length > 1 && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {parsedNames.join(", ")}
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        {pass.totalPersons} persona{pass.totalPersons !== 1 ? "s" : ""} ·{" "}
                        {new Date(pass.validFrom).toLocaleString("es-MX")} → {new Date(pass.validTo).toLocaleString("es-MX")}
                      </p>

                      {pass.entries.length > 0 && (
                        <p className="text-xs text-emerald-600 mt-1">
                          Entró {pass.entries.length} {pass.entries.length === 1 ? "vez" : "veces"} — última: {new Date(pass.entries[0].enteredAt).toLocaleString("es-MX")}
                        </p>
                      )}
                    </div>

                    <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                      active ? "bg-emerald-100 text-emerald-700" :
                      expired ? "bg-slate-100 text-slate-400" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {active ? "Vigente" : expired ? "Vencido" : "Próximo"}
                    </span>
                  </div>

                  {/* Short code */}
                  <div className="mt-3 inline-flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">Código</span>
                    <span className="font-mono font-bold text-slate-800 tracking-widest text-base">{pass.shortCode}</span>
                  </div>

                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => setSelectedPass(selectedPass === pass.id ? null : pass.id)}
                      className="text-sm text-slate-600 underline"
                    >
                      {selectedPass === pass.id ? "Ocultar QR" : "Mostrar QR"}
                    </button>
                    <button
                      onClick={() => sharePass(pass.id)}
                      className="text-sm text-slate-600 underline"
                    >
                      Compartir enlace
                    </button>
                  </div>

                  {selectedPass === pass.id && qrMap[pass.id] && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, next/image can't optimize it */}
                      <img src={qrMap[pass.id]} alt="Código QR" className="rounded-lg" />
                      <p className="text-xs text-slate-400">
                        ¿No se puede escanear? Dale al guardia el código{" "}
                        <span className="font-mono font-bold text-slate-700 tracking-widest">{pass.shortCode}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
