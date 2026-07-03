"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

type Entry = { id: string; enteredAt: string };
type GuestPass = {
  id: string;
  shortCode: string;
  guestName: string;
  entryType: string;
  totalPersons: number;
  vehiclePlate: string | null;
  carBrand: string | null;
  carModel: string | null;
  carColor: string | null;
  validFrom: string;
  validTo: string;
  entries: Entry[];
  resident: {
    name: string;
    unit: string;
    community: { name: string };
  };
};

type RecentEntry = {
  id: string;
  enteredAt: string;
  guestPass: {
    guestName: string;
    entryType: string;
    vehiclePlate: string | null;
    resident: { name: string; unit: string };
  };
};

type PassStatus = "valid" | "expired" | "upcoming" | "not_found";
type ActionState = "idle" | "denying" | "allowed" | "denied";

const statusConfig: Record<PassStatus, { bg: string; border: string; text: string; label: string; icon: string }> = {
  valid:     { bg: "bg-emerald-50",  border: "border-emerald-300", text: "text-emerald-700",  label: "VALID",          icon: "✓" },
  expired:   { bg: "bg-red-50",      border: "border-red-300",     text: "text-red-700",      label: "EXPIRED",        icon: "✗" },
  upcoming:  { bg: "bg-amber-50",    border: "border-amber-300",   text: "text-amber-700",    label: "NOT YET VALID",  icon: "⏳" },
  not_found: { bg: "bg-red-50",      border: "border-red-300",     text: "text-red-700",      label: "PASS NOT FOUND", icon: "✗" },
};

export default function SecurityPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [scanning, setScanning] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [pass, setPass] = useState<GuestPass | null>(null);
  const [status, setStatus] = useState<PassStatus | null>(null);
  const [logging, setLogging] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [denialInput, setDenialInput] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [allowedAt, setAllowedAt] = useState<string | null>(null);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);

  const loadRecentEntries = useCallback(async () => {
    const res = await fetch("/api/security/entries");
    if (res.status === 401) {
      router.push("/security/login");
      return;
    }
    if (res.ok) setRecentEntries(await res.json());
  }, [router]);

  useEffect(() => { loadRecentEntries(); }, [loadRecentEntries]);
  useEffect(() => () => { controlsRef.current?.stop(); }, []);

  function resetResult() {
    setPass(null);
    setStatus(null);
    setActionState("idle");
    setDenialInput("");
    setDenialReason("");
    setAllowedAt(null);
  }

  async function lookupPass(raw: string) {
    const passId = extractId(raw);
    if (!passId) return;

    resetResult();

    const res = await fetch(`/api/passes/${passId}`);
    if (!res.ok) { setStatus("not_found"); return; }

    const data: GuestPass = await res.json();
    setPass(data);

    const now = new Date();
    if (now < new Date(data.validFrom)) setStatus("upcoming");
    else if (now > new Date(data.validTo)) setStatus("expired");
    else setStatus("valid");
  }

  function extractId(raw: string): string {
    try {
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1];
    } catch {
      return raw.trim();
    }
  }

  async function startScanner() {
    resetResult();
    setScanning(true);

    const codeReader = new BrowserQRCodeReader();
    if (!videoRef.current) return;

    controlsRef.current = await codeReader.decodeFromVideoDevice(
      undefined,
      videoRef.current,
      async (result, err) => {
        if (result) {
          controlsRef.current?.stop();
          setScanning(false);
          await lookupPass(result.getText());
        }
        if (err && !(err.message?.includes("No MultiFormat"))) console.warn(err);
      }
    );
  }

  function stopScanner() {
    controlsRef.current?.stop();
    setScanning(false);
  }

  async function logEntry() {
    if (!pass) return;
    setLogging(true);
    const res = await fetch(`/api/passes/${pass.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setLogging(false);
    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Error logging entry");
      return;
    }
    setAllowedAt(new Date().toLocaleString());
    setActionState("allowed");
    await loadRecentEntries();
  }

  function confirmDenial() {
    const reason = denialInput.trim();
    if (!reason) return;
    setDenialReason(reason);
    setActionState("denied");
  }

  const cfg = status ? statusConfig[status] : null;

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">G</span>
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Security Portal</h1>
          <p className="text-xs text-slate-400">Gate access verification</p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/security/login");
          }}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          Log out
        </button>
      </header>

      <main className="max-w-md mx-auto p-5 space-y-5">

        {/* QR Scanner */}
        <section className="bg-slate-800 rounded-2xl overflow-hidden">
          <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
            <video ref={videoRef} className="w-full h-full object-cover" />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="text-4xl opacity-30">📷</div>
                <p className="text-slate-500 text-sm">Camera inactive</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-52 border-2 border-emerald-400 rounded-xl opacity-80" />
              </div>
            )}
          </div>
          <div className="p-4">
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-xl py-4 font-semibold text-base transition-colors"
              >
                Scan QR Code
              </button>
            ) : (
              <button
                onClick={stopScanner}
                className="w-full bg-slate-600 hover:bg-slate-500 text-white rounded-xl py-4 font-semibold text-base transition-colors"
              >
                Stop Camera
              </button>
            )}
          </div>
        </section>

        {/* Short code input */}
        <section className="bg-slate-800 rounded-2xl p-5">
          <p className="text-slate-300 text-sm font-medium mb-3">Enter guest code manually</p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-700 text-white rounded-xl px-4 py-3 text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-500 placeholder:normal-case placeholder:tracking-normal placeholder:text-sm"
              placeholder="6-char code or pass link"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && lookupPass(codeInput)}
              maxLength={200}
            />
            <button
              onClick={() => lookupPass(codeInput)}
              className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white rounded-xl px-5 font-semibold transition-colors"
            >
              Check
            </button>
          </div>
        </section>

        {/* ── Result area ── */}

        {/* Access allowed confirmation */}
        {actionState === "allowed" && pass && (
          <section className="rounded-2xl border-2 bg-emerald-50 border-emerald-300 p-6 text-center space-y-3">
            <div className="text-6xl leading-none">✓</div>
            <p className="text-2xl font-bold text-emerald-700">Access Granted</p>
            <p className="text-lg font-semibold text-slate-800">{pass.guestName}</p>
            <p className="text-slate-600 text-sm">
              Visiting Unit {pass.resident.unit} — {pass.resident.name}
            </p>
            {allowedAt && <p className="text-xs text-slate-400">Entry logged at {allowedAt}</p>}
            <button
              onClick={resetResult}
              className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              Check next guest
            </button>
          </section>
        )}

        {/* Entry denied confirmation */}
        {actionState === "denied" && pass && (
          <section className="rounded-2xl border-2 bg-red-50 border-red-300 p-6 text-center space-y-3">
            <div className="text-6xl leading-none">✗</div>
            <p className="text-2xl font-bold text-red-700">Entry Denied</p>
            <p className="text-lg font-semibold text-slate-800">{pass.guestName}</p>
            <div className="bg-red-100 rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-red-500 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-sm text-red-800">{denialReason}</p>
            </div>
            <button
              onClick={resetResult}
              className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 font-semibold transition-colors"
            >
              Check next guest
            </button>
          </section>
        )}

        {/* Pass result card (idle or denying) */}
        {cfg && actionState !== "allowed" && actionState !== "denied" && (
          <section className={`rounded-2xl border-2 p-6 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-center justify-between mb-5">
              <span className={`text-3xl font-bold ${cfg.text}`}>{cfg.label}</span>
              <span className="text-5xl leading-none">{cfg.icon}</span>
            </div>

            {pass && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Guest</p>
                  <p className="text-xl font-bold text-slate-800">{pass.guestName}</p>
                  {pass.entryType === "car" && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {[pass.carColor, pass.carBrand, pass.carModel].filter(Boolean).join(" ")}
                      {pass.vehiclePlate && (
                        <span className="ml-2 font-mono font-bold text-slate-700">{pass.vehiclePlate}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pass.totalPersons} person{pass.totalPersons !== 1 ? "s" : ""} · {pass.entryType === "car" ? "By car" : "On foot"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Visiting</p>
                  <p className="text-slate-700 font-semibold">Unit {pass.resident.unit} — {pass.resident.name}</p>
                  <p className="text-sm text-slate-500">{pass.resident.community.name}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Valid window</p>
                  <p className="text-sm text-slate-600">
                    {new Date(pass.validFrom).toLocaleString()} → {new Date(pass.validTo).toLocaleString()}
                  </p>
                </div>

                {pass.entries.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Previous entries</p>
                    <p className="text-sm text-slate-600">{pass.entries.length} time(s)</p>
                  </div>
                )}

                {/* Action buttons — only when pass is valid and not yet acted on */}
                {status === "valid" && actionState === "idle" && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={logEntry}
                      disabled={logging}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl py-4 font-semibold text-base transition-colors"
                    >
                      {logging ? "Logging…" : "Log Entry & Allow Access"}
                    </button>
                    <button
                      onClick={() => setActionState("denying")}
                      className="w-full bg-white hover:bg-red-50 border-2 border-red-300 text-red-600 rounded-xl py-3 font-semibold text-base transition-colors"
                    >
                      Deny Entry
                    </button>
                  </div>
                )}

                {/* Denial reason form */}
                {actionState === "denying" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Reason for denial
                      </label>
                      <textarea
                        autoFocus
                        rows={3}
                        className="w-full border-2 border-red-300 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none placeholder:text-slate-400"
                        placeholder="e.g. Expired ID, unrecognized vehicle, resident did not confirm visit…"
                        value={denialInput}
                        onChange={e => setDenialInput(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={confirmDenial}
                        disabled={!denialInput.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl py-3 font-semibold transition-colors"
                      >
                        Confirm Denial
                      </button>
                      <button
                        onClick={() => { setActionState("idle"); setDenialInput(""); }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Walk-in button */}
        <section>
          <button
            onClick={() => router.push("/security/walkin")}
            className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-2xl py-5 font-semibold text-base transition-colors border border-slate-600"
          >
            Guest has no invite?
            <span className="block text-xs font-normal text-slate-400 mt-0.5">Register a walk-in guest</span>
          </button>
        </section>

        {/* Recent entries */}
        <section className="pb-6">
          <h2 className="text-slate-400 text-xs uppercase tracking-widest mb-3 px-1">Recent entries</h2>
          {recentEntries.length === 0 ? (
            <div className="bg-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
              No entries yet today
            </div>
          ) : (
            <div className="bg-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-700">
              {recentEntries.map(entry => (
                <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-base">
                    {entry.guestPass.entryType === "car" ? "🚗" : "🚶"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.guestPass.guestName}</p>
                    <p className="text-slate-400 text-xs truncate">
                      Unit {entry.guestPass.resident.unit} — {entry.guestPass.resident.name}
                      {entry.guestPass.vehiclePlate && (
                        <span className="ml-1 font-mono">· {entry.guestPass.vehiclePlate}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs shrink-0">
                    {new Date(entry.enteredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
