"use client";

import React, { useState } from "react";
import { formatScheduleTime } from "../lib/formatTime";

interface ClarifyAndPicModalProps {
  interrupt: any;
  loading?: boolean;
  onResolveClarify: (contactId: string, selectedSlot: string) => void;
  onResolvePicIntake: (singleSentence: string) => void;
}

export const ClarifyAndPicModal: React.FC<ClarifyAndPicModalProps> = ({
  interrupt,
  loading = false,
  onResolveClarify,
  onResolvePicIntake,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>("c_budi_h");
  const [selectedSlot, setSelectedSlot] = useState<string>("2026-10-23 13:30 WIB");
  const [picSentence, setPicSentence] = useState<string>(
    "Pak Hendra Direktur PT BKT di Balikpapan nomor 08123456789 prefer WA"
  );

  if (!interrupt) return null;

  if (interrupt.type === "CLARIFY") {
    const ambiguities = interrupt.ambiguities || [];
    const firstAmb = ambiguities[0];
    const candidates = firstAmb?.candidates || [];

    return (
      <div className="rounded-2xl border border-indigo-500/50 bg-indigo-950/30 p-6 shadow-xl space-y-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/40">
            🔍 Konfirmasi Pilihan Kontak &amp; Klarifikasi
          </span>
          <h3 className="mt-1.5 text-base font-bold text-white">
            {candidates.length > 0
              ? "Ditemukan Lebih dari Satu Nama yang Sama"
              : "Butuh Klarifikasi Sebelum Draft Dapat Dibuat"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            {candidates.length > 0
              ? "Silakan pilih penerima yang Anda maksud beserta jadwal pengiriman yang tersedia (di luar waktu istirahat/Sholat Jumat 11:30–13:00):"
              : "Expert menahan pembuatan draft karena beberapa detail penting belum jelas:"}
          </p>
        </div>

        {candidates.length === 0 && ambiguities.length > 0 && (
          <div className="space-y-2">
            {ambiguities.map((amb: any, idx: number) => (
              <div
                key={amb.id || idx}
                className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3.5 text-xs space-y-1"
              >
                <div className="font-bold text-amber-300 uppercase text-[10px]">
                  Field: {amb.field || "detail"}
                </div>
                <p className="text-slate-200">{amb.clarification_question || amb.description}</p>
                {amb.description && amb.clarification_question && (
                  <p className="text-slate-400 text-[11px]">{amb.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {candidates.map((cand: any) => {
            const isSelected = selectedContactId === cand.contact_id;
            return (
              <div
                key={cand.contact_id}
                onClick={() => {
                  setSelectedContactId(cand.contact_id);
                  if (cand.proposed_friday_slots?.[0]) {
                    setSelectedSlot(cand.proposed_friday_slots[0]);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-900/40 shadow-md"
                    : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{cand.name}</span>
                  <span className="rounded-md bg-slate-800 px-2.5 py-0.5 font-mono text-xs text-amber-300">
                    {cand.city} ({cand.tz_label})
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {cand.unit} · <strong>{cand.org_name}</strong>
                </p>
                {(cand.phone || cand.email) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {cand.phone && (
                      <span className="rounded bg-emerald-950/60 px-2 py-0.5 font-mono text-emerald-300 border border-emerald-500/30">
                        📲 {cand.phone}
                      </span>
                    )}
                    {cand.email && (
                      <span className="rounded bg-sky-950/60 px-2 py-0.5 font-mono text-sky-300 border border-sky-500/30">
                        ✉️ {cand.email}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-400">
                    Pilih Jam Pengiriman yang Tersedia:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(cand.proposed_friday_slots || []).map((slot: string) => (
                      <button
                        type="button"
                        key={slot}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedContactId(cand.contact_id);
                          setSelectedSlot(slot);
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs transition ${
                          isSelected && selectedSlot === slot
                            ? "bg-indigo-500 text-white font-bold"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        🗓️ {formatScheduleTime(slot, cand.tz_label)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <button
            disabled={loading}
            onClick={() => onResolveClarify(selectedContactId, selectedSlot)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Menyimpan Klarifikasi...</span>
              </>
            ) : (
              "Lanjutkan dengan Kontak & Jadwal Ini"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (interrupt.type === "PIC_INTAKE") {
    const unknownList = interrupt.unknown_names || [];
    return (
      <div className="rounded-2xl border border-amber-500/50 bg-amber-950/30 p-6 shadow-xl space-y-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40">
            👤 Kontak Baru Belum Terdaftar
          </span>
          <h3 className="mt-1.5 text-base font-bold text-white">
            Tambahkan Informasi Kontak dengan Satu Kalimat
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Masukkan nama, jabatan/perusahaan, kota, serta nomor WhatsApp atau alamat email penerima:
          </p>
        </div>

        {unknownList.map((u: any, i: number) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200">
            Kontak yang dicari: <strong>{u.raw_name}</strong> ({u.raw_org || "Perusahaan Pelanggan"})
          </div>
        ))}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Detail Kontak (Otomatis menyesuaikan format nomor +62 &amp; zona waktu kota):
          </label>
          <input
            type="text"
            value={picSentence}
            onChange={(e) => setPicSentence(e.target.value)}
            placeholder="Contoh: Pak Hendra Direktur PT BKT di Balikpapan nomor 08123456789 prefer WA"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => onResolvePicIntake(picSentence)}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-amber-500"
          >
            Simpan Kontak &amp; Buat Draf Pesan
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default ClarifyAndPicModal;
