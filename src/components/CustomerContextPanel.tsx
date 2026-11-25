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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            📋 Konteks &amp; Riwayat Hubungan Penerima
          </h3>
          <p className="text-xs text-slate-400">
            Informasi yang digunakan secara otomatis untuk menyusun isi draf pesan
          </p>
        </div>
      </div>

      {entries.map(([actionId, ctx]: [string, any]) => {
        const isPeer = ctx.category === "peer";
        return (
          <div key={actionId} className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">
                Kategori Penerima:{" "}
                <strong className="text-slate-200">
                  {isPeer ? "Rekan Kerja Internal" : `Pelanggan (${ctx.org_name || "Eksternal"})`}
                </strong>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {!isPeer && ctx.character_style && ctx.character_style !== "unknown" && (
                  <span className="rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300">
                    🎭 {ctx.character_style}
                  </span>
                )}
                {!isPeer && ctx.churn_risk_level && (
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      ctx.churn_risk_level === "high"
                        ? "border-red-500/40 bg-red-500/15 text-red-300"
                        : ctx.churn_risk_level === "medium"
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    Churn: {ctx.churn_risk_level.toUpperCase()}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-0.5 font-semibold ${
                    isPeer
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}
                >
                  {isPeer ? "Mode Privasi Rekan Kerja (Hanya Jam Kerja)" : "Konteks Pelanggan Lengkap"}
                </span>
              </div>
            </div>

            {!isPeer && ctx.agent_brief && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/25 p-3.5 text-slate-200">
                <p className="font-bold text-indigo-300 mb-1">
                  🧭 Ringkasan Panduan AI (Master Profile v3)
                </p>
                <p className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-200">
                  {ctx.agent_brief}
                </p>
              </div>
            )}

            {isPeer ? (
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3.5 text-sky-200">
                <p className="font-semibold">
                  🔒 Perlindungan Privasi Rekan Internal Aktif
                </p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  Untuk menjaga privasi rekan kerja internal, sistem hanya menggunakan zona waktu lokal (
                  <code>{ctx.tz_label}</code>) dan jam kerja (<code>{ctx.work_hours}</code>) tanpa memuat catatan pribadi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Keluhan / Komplain Aktif */}
                <div className="rounded-xl border border-red-500/25 bg-red-950/15 p-3.5">
                  <p className="font-bold text-red-300">
                    🛠️ Komplain / Kendala Layanan Aktif ({ctx.relationship_signals?.length || 0})
                  </p>
                  {(ctx.relationship_signals || []).length === 0 ? (
                    <p className="mt-1 text-slate-400">Tidak ada komplain aktif.</p>
                  ) : (
                    (ctx.relationship_signals || []).map((s: any) => (
                      <div key={s.signal_id} className="mt-1.5 text-slate-200 leading-relaxed">
                        • {s.summary}
                      </div>
                    ))
                  )}
                </div>

                {/* Janji & Komitmen Tindak Lanjut */}
                <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-3.5">
                  <p className="font-bold text-amber-300">
                    🤝 Janji &amp; Komitmen Tindak Lanjut ({ctx.commitments?.length || 0})
                  </p>
                  {(ctx.commitments || []).length === 0 ? (
                    <p className="mt-1 text-slate-400">Tidak ada janji tertunda.</p>
                  ) : (
                    (ctx.commitments || []).map((c: any) => (
                      <div key={c.commitment_id} className="mt-1.5 text-slate-200 leading-relaxed">
                        •{" "}
                        {c.status === "overdue" && (
                          <span className="mr-1 rounded bg-red-500/25 px-1.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40">
                            OVERDUE
                          </span>
                        )}
                        {c.description}{" "}
                        {c.due_date && (
                          <span className="text-slate-400">
                            (Target: {formatSimpleDate(c.due_date)})
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Berita & Kebutuhan Armada Perusahaan */}
                {(ctx.company_news || []).length > 0 && (
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3.5 md:col-span-2">
                    <p className="font-bold text-emerald-300">
                      📰 Info Proyek &amp; Kebutuhan Armada Pelanggan
                    </p>
                    {(ctx.company_news || []).map((n: any) => (
                      <div key={n.news_id} className="mt-1 text-slate-200">
                        • <strong>{n.headline}:</strong> {n.summary}
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
