"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Resident = {
  id: string;
  name: string;
  unit: string;
  community: { name: string };
};

const EMPTY_CAR = {
  guestName: "",
  totalPersons: "1",
  vehiclePlate: "",
  carBrand: "",
  carModel: "",
  carColor: "",
};

const EMPTY_FOOT = {
  guestName: "",
  totalPersons: "1",
};

export default function WalkinPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedResident, setSelectedResident] = useState<string>("");
  const [entryType, setEntryType] = useState<"car" | "foot">("car");
  const [carForm, setCarForm] = useState(EMPTY_CAR);
  const [footForm, setFootForm] = useState(EMPTY_FOOT);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ guestName: string; unit: string; residentName: string } | null>(null);

  useEffect(() => {
    fetch("/api/residents")
      .then(r => r.json())
      .then(setResidents);
  }, []);

  const resident = residents.find(r => r.id === selectedResident);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedResident) return;
    setSubmitting(true);

    const body =
      entryType === "car"
        ? {
            residentId: selectedResident,
            entryType: "car",
            guestName: carForm.guestName,
            totalPersons: carForm.totalPersons,
            vehiclePlate: carForm.vehiclePlate,
            carBrand: carForm.carBrand,
            carModel: carForm.carModel,
            carColor: carForm.carColor,
          }
        : {
            residentId: selectedResident,
            entryType: "foot",
            guestName: footForm.guestName,
            totalPersons: footForm.totalPersons,
          };

    const res = await fetch("/api/security/walkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);
    if (!res.ok) { alert("Error registering guest"); return; }

    const data = await res.json();
    setDone({
      guestName: data.pass.guestName,
      unit: data.resident.unit,
      residentName: data.resident.name,
    });
  }

  function reset() {
    setSelectedResident("");
    setEntryType("car");
    setCarForm(EMPTY_CAR);
    setFootForm(EMPTY_FOOT);
    setDone(null);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-slate-800 text-white px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/security")} className="text-slate-400 hover:text-white text-sm">← Back</button>
          <div>
            <h1 className="text-lg font-semibold">Walk-in Registered</h1>
          </div>
        </header>
        <main className="max-w-md mx-auto p-6">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center space-y-4">
            <div className="text-6xl">✓</div>
            <h2 className="text-2xl font-bold text-emerald-700">Access Granted</h2>
            <p className="text-lg font-semibold text-slate-800">{done.guestName}</p>
            <p className="text-slate-600">
              Visiting Unit {done.unit} — {done.residentName}
            </p>
            <p className="text-sm text-slate-400">Entry logged at {new Date().toLocaleString()}</p>
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={reset}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-medium transition-colors"
              >
                Register Another Guest
              </button>
              <button
                onClick={() => router.push("/security")}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 font-medium transition-colors"
              >
                Back to Security Portal
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/security")} className="text-slate-400 hover:text-white text-sm mr-1">←</button>
        <div>
          <h1 className="text-lg font-semibold">Walk-in Guest</h1>
          <p className="text-xs text-slate-400">Register a guest without a prior invite</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">

        {/* Unit / Resident selector */}
        <section className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Who are they visiting?</h2>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Select unit / resident</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={selectedResident}
              onChange={e => setSelectedResident(e.target.value)}
            >
              <option value="">— Choose a unit —</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>
                  Unit {r.unit} — {r.name}
                </option>
              ))}
            </select>
          </div>

          {resident && (
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Selected resident</p>
              <p className="font-semibold text-slate-800">Unit {resident.unit} — {resident.name}</p>
              <p className="text-sm text-slate-500">{resident.community.name}</p>
            </div>
          )}
        </section>

        {/* Guest details form */}
        {selectedResident && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Guest details</h2>

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
                By Car
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
                On Foot
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {entryType === "car" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Guest name *</label>
                    <input
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={carForm.guestName}
                      onChange={e => setCarForm(f => ({ ...f, guestName: e.target.value }))}
                      placeholder="John Smith"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Car brand *</label>
                      <input
                        required
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={carForm.carBrand}
                        onChange={e => setCarForm(f => ({ ...f, carBrand: e.target.value }))}
                        placeholder="Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Car model *</label>
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
                      <label className="block text-sm font-medium text-slate-600 mb-1">Car color *</label>
                      <input
                        required
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={carForm.carColor}
                        onChange={e => setCarForm(f => ({ ...f, carColor: e.target.value }))}
                        placeholder="Silver"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">Plate</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={carForm.vehiclePlate}
                        onChange={e => setCarForm(f => ({ ...f, vehiclePlate: e.target.value }))}
                        placeholder="ABC-1234"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Total persons *</label>
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
                    <label className="block text-sm font-medium text-slate-600 mb-1">Guest name *</label>
                    <input
                      required
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={footForm.guestName}
                      onChange={e => setFootForm(f => ({ ...f, guestName: e.target.value }))}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Total persons *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      value={footForm.totalPersons}
                      onChange={e => setFootForm(f => ({ ...f, totalPersons: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-3 font-medium transition-colors mt-2"
              >
                {submitting ? "Registering…" : "Allow Entry"}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
