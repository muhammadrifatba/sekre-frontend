"use client";

import React from "react";
import { formatSimpleDate } from "../lib/formatTime";

interface CustomerContextPanelProps {
  contextMap: Record<string, any>;
}

export const CustomerContextPanel: React.FC<CustomerContextPanelProps> = ({ contextMap }) => {
  const entries = Object.entries(contextMap || {});
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">
            📋 Konteks &amp; Riwayat Hubungan Penerima
          </h3>
          <p className="text-xs text-slate-500">
            Informasi yang digunakan secara otomatis untuk menyusun isi draf pesan
          </p>
        </div>
      </div>

      {entries.map(([actionId, ctx]: [string, any]) => {
        const isPeer = ctx.category === "peer";
        return (
          <div key={actionId} className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-500">
                Kategori Penerima:{" "}
                <strong className="text-slate-900">
                  {isPeer ? "Rekan Kerja Internal" : `Pelanggan (${ctx.org_name || "Eksternal"})`}
                </strong>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {!isPeer && ctx.character_style && ctx.character_style !== "unknown" && (
                  <span className="rounded-full border border-blue-200 bg-[#EEF2FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2F55D4]">
                    🎭 {ctx.character_style}
                  </span>
                )}
                {!isPeer && ctx.churn_risk_level && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      ctx.churn_risk_level === "high"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : ctx.churn_risk_level === "medium"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Churn: {ctx.churn_risk_level.toUpperCase()}
                  </span>
                )}
                <span
                  className={`rounded-full border px-3 py-0.5 font-semibold ${
                    isPeer
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {isPeer ? "Mode Privasi Rekan Kerja (Hanya Jam Kerja)" : "Konteks Pelanggan Lengkap"}
                </span>
              </div>
            </div>

            {!isPeer && ctx.agent_brief && (
              <div className="rounded-xl border border-blue-200 bg-[#EEF2FF]/60 p-3.5 text-slate-700">
                <p className="font-bold text-[#2F55D4] mb-1">
                  🧭 Ringkasan Panduan AI (Master Profile v3)
                </p>
                <p className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-700">
                  {ctx.agent_brief}
                </p>
              </div>
            )}

            {isPeer ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-sky-900">
                <p className="font-bold text-sky-800">
                  🔒 Perlindungan Privasi Rekan Internal Aktif
                </p>
                <p className="mt-1 text-slate-600 leading-relaxed">
                  Untuk menjaga privasi rekan kerja internal, sistem hanya menggunakan zona waktu lokal (
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-sky-800 border border-sky-200">
                    {ctx.tz_label}
                  </code>
                  ) dan jam kerja (
                  <code className="rounded bg-white px-1 py-0.5 font-mono text-sky-800 border border-sky-200">
                    {ctx.work_hours}
                  </code>
                  ) tanpa memuat catatan pribadi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Keluhan / Komplain Aktif */}
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5">
                  <p className="font-bold text-red-700">
                    🛠️ Komplain / Kendala Layanan Aktif ({ctx.relationship_signals?.length || 0})
                  </p>
                  {(ctx.relationship_signals || []).length === 0 ? (
                    <p className="mt-1 text-slate-500">Tidak ada komplain aktif.</p>
                  ) : (
                    (ctx.relationship_signals || []).map((s: any) => (
                      <div key={s.signal_id} className="mt-1.5 text-slate-700 leading-relaxed">
                        • {s.summary}
                      </div>
                    ))
                  )}
                </div>

                {/* Janji & Komitmen Tindak Lanjut */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <p className="font-bold text-amber-800">
                    🤝 Janji &amp; Komitmen Tindak Lanjut ({ctx.commitments?.length || 0})
                  </p>
                  {(ctx.commitments || []).length === 0 ? (
                    <p className="mt-1 text-slate-500">Tidak ada janji tertunda.</p>
                  ) : (
                    (ctx.commitments || []).map((c: any) => (
                      <div key={c.commitment_id} className="mt-1.5 text-slate-700 leading-relaxed">
                        •{" "}
                        {c.status === "overdue" && (
                          <span className="mr-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                            OVERDUE
                          </span>
                        )}
                        {c.description}{" "}
                        {c.due_date && (
                          <span className="text-slate-500">
                            (Target: {formatSimpleDate(c.due_date)})
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Berita & Kebutuhan Armada Perusahaan */}
                {(ctx.company_news || []).length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 md:col-span-2">
                    <p className="font-bold text-emerald-800">
                      📰 Info Proyek &amp; Kebutuhan Armada Pelanggan
                    </p>
                    {(ctx.company_news || []).map((n: any) => (
                      <div key={n.news_id} className="mt-1 text-slate-700">
                        • <strong className="text-slate-900">{n.headline}:</strong> {n.summary}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CustomerContextPanel;
