"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { generateQRDataURL } from "@/lib/qr";

type PublicPass = {
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
  community: { name: string };
  unit: string;
};

export default function GuestPassPage() {
  const { id } = useParams<{ id: string }>();
  const [pass, setPass] = useState<PublicPass | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/passes/${id}/public`);
      if (!res.ok) { setNotFound(true); return; }
      const data: PublicPass = await res.json();
      setPass(data);
      setQr(await generateQRDataURL(data.id, window.location.origin));
    })();
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-slate-600">Pase no encontrado.</p>
        </div>
      </div>
    );
  }

  if (!pass) return null;

  const now = new Date();
  const from = new Date(pass.validFrom);
  const to = new Date(pass.validTo);
  const status = now < from ? "upcoming" : now > to ? "expired" : "valid";

  const parsedNames = pass.guestNames
    ? (JSON.parse(pass.guestNames) as string[]).filter(Boolean)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            {pass.community.name} · Unidad {pass.unit}
          </p>
          <h1 className="text-xl font-bold text-slate-800 mt-1">{pass.guestName}</h1>
          {pass.entryType === "car" && (
            <p className="text-sm text-slate-500 mt-0.5">
              {[pass.carColor, pass.carBrand, pass.carModel].filter(Boolean).join(" ")}
              {pass.vehiclePlate && ` · ${pass.vehiclePlate}`}
            </p>
          )}
          {pass.entryType === "foot" && parsedNames && parsedNames.length > 1 && (
            <p className="text-sm text-slate-500 mt-0.5">{parsedNames.join(", ")}</p>
          )}
        </div>

        <span
          className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
            status === "valid"
              ? "bg-emerald-100 text-emerald-700"
              : status === "expired"
                ? "bg-slate-100 text-slate-400"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {status === "valid" ? "Vigente" : status === "expired" ? "Vencido" : "Próximo"}
        </span>

        {qr && (
          // eslint-disable-next-line @next/next/no-img-element -- base64 data URL, next/image can't optimize it
          <img src={qr} alt="Código QR" className="mx-auto rounded-lg" />
        )}

        <div className="inline-flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Código</span>
          <span className="font-mono font-bold text-slate-800 tracking-widest text-base">
            {pass.shortCode}
          </span>
        </div>

        <p className="text-xs text-slate-400">
          {from.toLocaleString("es-MX")} → {to.toLocaleString("es-MX")}
        </p>

        <p className="text-xs text-slate-400">Muestra este código en la caseta de seguridad.</p>
      </div>
    </div>
  );
}
