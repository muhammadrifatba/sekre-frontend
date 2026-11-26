"use client";

import React from "react";
import { formatAuditTimestamp } from "../lib/formatTime";

interface AuditTimelineProps {
  events: any[];
  verification: {
    valid: boolean;
    total_events: number;
    head_hash?: string;
    reason?: string;
  } | null;
  loading?: boolean;
  onVerifyChain: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  ingested_and_sanitized: "1. Pesan Diterima & Diperiksa Keamanannya",
  injection_detected: "⚠️ Instruksi Mencurigakan Diblokir",
  extracted: "2. Inti Pesan & Tujuan Diekstrak",
  planned: "3. Rencana Pengiriman Disusun",
  resolved_and_evaluated: "4. Kontak & Zona Waktu Disesuaikan",
  interrupt_clarify: "⏸️ Menunggu Pilihan Kontak/Jadwal",
  clarify_resolved: "✅ Kontak & Jadwal Dipilih",
  interrupt_pic_intake: "⏸️ Menunggu Info Kontak Baru",
  pic_intake_saved: "✅ Kontak Baru Disimpan",
  context_built: "5. Riwayat Komplain & Komitmen Dimuat",
  drafted: "6. Draf Pesan Selesai Dibuat",
  pre_send_checked: "7. Pemeriksaan Kelayakan Pesan Selesai",
  validated: "8. Validasi Keamanan Lulus",
  approval_gate_reached: "📬 Menunggu Konfirmasi Pengiriman Anda",
  plan_approved: "✅ Pengiriman Disetujui oleh Pengguna",
  plan_rejected: "❌ Pengiriman Ditolak",
  action_executed: "🚀 Pesan Diproses / Siap Dikirim",
  outbox_queued: "⏳ Masuk Antrean Pengaman 60 Detik",
  outbox_undone: "↩️ Pengiriman Dibatalkan oleh Pengguna",
  outbox_sent: "✉️ Pesan Berhasil Dikirim",
  run_started: "🔄 Siklus Scheduler Dimulai",
  input_ingested: "📥 Pesan Sumber Masuk",
  ingest_completed: "📦 Ingest Sumber Selesai",
  result_staged: "📝 Draf Hasil Analisis Disiapkan",
  input_processed: "✅ Pemrosesan Sumber Selesai",
  action_queued: "⏳ Masuk Antrean Pengaman 60 Detik",
  action_approved: "✅ Pengiriman Disetujui oleh Pengguna",
  action_rejected: "❌ Pengiriman Ditolak",
  action_cancelled: "↩️ Pengiriman Dibatalkan oleh Pengguna",
  action_revalidation_failed: "⚠️ Perubahan Terdeteksi — Perlu Approval Ulang",
  clarification_resolved: "✅ Klarifikasi Penerima Tersimpan",
};

export const AuditTimeline: React.FC<AuditTimelineProps> = ({
  events = [],
  verification,
  loading = false,
  onVerifyChain,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            🛡️ Riwayat Aktivitas &amp; Keamanan
          </h3>
          <p className="text-xs text-slate-500">
            Catatan otomatis setiap proses dari penerimaan hingga pengiriman
          </p>
        </div>

        <button
          disabled={loading}
          onClick={onVerifyChain}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
        >
          {loading ? "⏳ Memeriksa..." : "Segarkan Status"}
        </button>
      </div>

      {loading && !verification ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#2F55D4] border-t-transparent" />
          <span>Memverifikasi integritas rantai audit...</span>
        </div>
      ) : verification ? (
        <div
          className={`rounded-xl border p-3 text-xs ${
            verification.valid
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <strong>
            {verification.valid
              ? `✅ Sistem Aman (${verification.total_events} aktivitas tercatat utuh)`
              : `⚠️ Peringatan Keamanan: ${
                  verification.reason || (verification as any).message || "Integritas rantai audit perlu diperiksa"
                }`}
          </strong>
        </div>
      ) : null}

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {loading && events.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">
            ⏳ Memuat riwayat aktivitas...
          </p>
        ) : events.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Belum ada aktivitas. Kirim pesan dari WorkBuddy atau pilih contoh skenario di atas.
          </p>
        ) : (
          events.map((ev: any, idx: number) => (
            <div
              key={ev.id || ev.event_id || idx}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-800">
                  {EVENT_LABELS[ev.event_type] || ev.event_type}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-slate-500 border border-slate-200">
                  {formatAuditTimestamp(ev.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditTimeline;
