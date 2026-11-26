"use client";

import React, { useEffect, useState } from "react";
import { formatScheduleTime } from "../lib/formatTime";

interface ApprovalInboxProps {
  requestId: string;
  plan: any;
  findings: any[];
  injectionFlags: any[];
  approvalHash: string;
  loading?: boolean;
  onApprove: (
    action: any,
    decision: "approve" | "edit" | "reject",
    cognitiveConfirmation: string,
    editedBody?: string,
    editedSubject?: string
  ) => void;
  onSimulateTamper?: () => void;
}

export const ApprovalInbox: React.FC<ApprovalInboxProps> = ({
  requestId,
  plan,
  findings = [],
  injectionFlags = [],
  approvalHash,
  loading = false,
  onApprove,
  onSimulateTamper,
}) => {
  const [stepUpChecked, setStepUpChecked] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [showTechDetails, setShowTechDetails] = useState(false);

  const firstAction = plan?.actions?.[0];
  const defaultConfirmPhrase = firstAction
    ? `Confirm external recipient: ${firstAction.who?.org_name || firstAction.who?.name}`
    : "";

  // Reset confirmation state when a new request arrives
  useEffect(() => {
    setStepUpChecked(false);
    setConfirmationText("");
    setEditModeId(null);
  }, [requestId, approvalHash]);

  if (!plan || !plan.actions) return null;

  if (plan.actions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-xs text-slate-600 shadow-sm space-y-1.5">
        <div className="font-bold text-slate-900">
          📭 Belum Ada Draft Pesan yang Perlu Direview
        </div>
        <p className="text-slate-500">
          Draft ditahan (mis. status{" "}
          <code className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 border border-amber-200">
            needs_clarify
          </code>{" "}
          karena penerima/detail belum ter-resolve) atau tidak ada action kirim pada permintaan ini.
        </p>
      </div>
    );
  }

  const hasHighRisk = plan.actions.some((a: any) => a.risk_tier === "high");
  const isAlreadyExecuted = plan.actions.every((a: any) =>
    ["approved", "queued", "queued_outbox", "executed", "handed_off", "sent"].includes(
      a.status
    )
  );
  const isRejected = plan.actions.every((a: any) => a.status === "rejected");
  const isRevalidationFailed = plan.actions.some(
    (a: any) => a.status === "revalidation_failed"
  );
  const missingDestination = Boolean(
    firstAction &&
      ((firstAction.channel === "email" && !firstAction.who?.email) ||
        (firstAction.channel === "whatsapp" && !firstAction.who?.phone))
  );

  const getChannelLabel = (channel: string) => {
    if (channel === "whatsapp") return "📲 WhatsApp";
    if (channel === "email") return "✉️ Email";
    if (channel === "crm") return "🗂️ Tiket CRM";
    return channel.toUpperCase();
  };

  const getDestinationContact = (who: any, channel: string) => {
    if (channel === "whatsapp") {
      return who?.phone || "Nomor belum tersedia";
    }
    if (channel === "email") {
      return who?.email || "Email belum tersedia";
    }
    return who?.phone || who?.email || who?.org_name || "-";
  };

  const getDestinationLabel = (channel: string) => {
    if (channel === "whatsapp") return "Nomor WhatsApp Tujuan";
    if (channel === "email") return "Alamat Email Tujuan";
    return "Kontak Tujuan";
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Peringatan Keamanan jika ada instruksi mencurigakan di dokumen */}
      {injectionFlags.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
            <span>🛡️ Peringatan Keamanan: Instruksi Mencurigakan Diblokir</span>
          </div>
          <p className="mt-1 text-xs text-red-700">
            Sistem mendeteksi dan menghapus perintah tersembunyi dari dokumen lampiran agar tidak dieksekusi:
          </p>
          {injectionFlags.map((flg: any) => (
            <p
              key={flg.flag_id}
              className="mt-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 font-mono text-xs text-red-700"
            >
              &quot;{flg.offending_excerpt}&quot;
            </p>
          ))}
        </div>
      )}

      {/* Header Kartu Persetujuan */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${
              isAlreadyExecuted
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : isRejected
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-[#EEF2FF] text-[#2F55D4]"
            }`}
          >
            {isAlreadyExecuted
              ? "✅ Pesan Telah Disetujui & Siap Dikirim"
              : isRejected
              ? "❌ Pengiriman Dibatalkan"
              : "📬 Konfirmasi Pengiriman Pesan"}
          </span>
          <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
            Periksa Tujuan &amp; Isi Pesan Sebelum Dikirim
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          {showTechDetails ? "Sembunyikan Info Teknis" : "Info Keamanan"}
        </button>
      </div>

      {showTechDetails && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500">
          <span>
            ID Permintaan:{" "}
            <code className="font-mono font-semibold text-slate-800">{requestId}</code>
          </span>
          <span>
            Kode Verifikasi Draf:{" "}
            <code className="font-mono font-semibold text-[#2F55D4]">
              {approvalHash?.slice(0, 20)}...
            </code>
          </span>
        </div>
      )}

      {/* Daftar Pesan yang Akan Dikirim */}
      <div className="space-y-4">
        {plan.actions.map((action: any) => {
          const isEditing = editModeId === action.action_id;
          const isWA = action.channel === "whatsapp";
          const destinationValue = getDestinationContact(action.who, action.channel);
          const destinationLabel = getDestinationLabel(action.channel);

          return (
            <div
              key={action.action_id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4"
            >
              {/* Baris Atas: Saluran & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      isWA
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-[#2F55D4] border-blue-200"
                    }`}
                  >
                    {getChannelLabel(action.channel)}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                    {action.who?.category === "customer" ? "Pelanggan Eksternal" : "Rekan Internal"}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Jadwal Kirim:{" "}
                  <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-800 border border-slate-200">
                    🗓️{" "}
                    {formatScheduleTime(
                      action.when?.send_at || action.when?.scheduled_send_at,
                      action.when?.tz_label || action.who?.tz_label || action.when?.tz
                    )}
                  </span>
                </div>
              </div>

              {/* Kotak Informasi Penerima & Nomor/Email Tujuan */}
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Penerima &amp; Perusahaan
                  </div>
                  <div className="mt-1 text-base font-extrabold text-slate-900">
                    {action.who?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {action.who?.org_name || "Internal"} · {action.who?.city} (
                    {action.when?.tz_label || action.who?.tz_label || "WIB"})
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-[#EEF2FF]/60 p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#2F55D4]">
                    {destinationLabel}
                  </div>
                  <div className="mt-1 font-mono text-base font-extrabold text-slate-900 break-all">
                    {destinationValue}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {isWA
                      ? "Pesan akan diarahkan langsung ke nomor WhatsApp ini"
                      : "Email akan dikirimkan ke alamat ini"}
                  </div>
                </div>
              </div>

              {/* Subjek & Isi Draf Pesan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-600">
                    {!isWA || action.what?.subject ? (
                      <>
                        Subjek / Perihal:{" "}
                        <span className="font-bold text-slate-900">
                          {action.what?.subject || "(Tanpa subjek)"}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">Pesan WhatsApp (tanpa subjek)</span>
                    )}
                  </div>
                  {!isEditing && !isAlreadyExecuted && !isRejected && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditModeId(action.action_id);
                        setEditedSubject(action.what?.subject || "");
                        setEditedBody(action.what?.body_draft ?? action.what?.body ?? "");
                      }}
                      className="rounded-lg border border-blue-200 bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#2F55D4] hover:bg-blue-100 transition"
                    >
                      ✏️ Ubah Isi Pesan
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2.5 pt-1">
                    {!isWA && (
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={(e) => setEditedSubject(e.target.value)}
                        placeholder="Subjek email..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#2F55D4] focus:ring-2 focus:ring-[#2F55D4]/15 focus:outline-none"
                      />
                    )}
                    <textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-[#2F55D4] focus:ring-2 focus:ring-[#2F55D4]/15 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setEditModeId(null)}
                        className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={loading || missingDestination}
                        onClick={() => {
                          onApprove(
                            action,
                            "approve",
                            confirmationText || defaultConfirmPhrase,
                            editedBody,
                            isWA ? undefined : editedSubject
                          );
                          setEditModeId(null);
                        }}
                        className="rounded-lg bg-[#2F55D4] px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#2444B3] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? "⏳ Menyimpan..." : "Simpan & Setujui Draf"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Isi Pesan {isWA ? "WhatsApp" : "Email"}:
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                      {action.what?.body_draft ?? action.what?.body ?? ""}
                    </p>
                  </div>
                )}
              </div>

              {/* Tombol Buka WhatsApp setelah di-Approve */}
              {isAlreadyExecuted && action.wa_handoff_link && (
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-emerald-800">
                        ✅ Pesan WhatsApp Siap Dikirim!
                      </div>
                      <div className="mt-0.5 text-xs text-emerald-700">
                        Penerima: <strong>{action.who?.name}</strong> ({action.who?.org_name}) · Nomor WA:{" "}
                        <strong className="font-mono underline">{action.who?.phone}</strong>
                      </div>
                    </div>
                    <a
                      href={action.wa_handoff_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <span>📲 Buka &amp; Kirim ke WhatsApp ({action.who?.phone})</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Catatan Pemeriksaan Otomatis */}
      {findings.length > 0 && showTechDetails && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-xs font-bold text-slate-700">
            Pemeriksaan Otomatis Sebelum Kirim:
          </p>
          <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
            {findings.map((f: any) => (
              <li key={f.finding_id} className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bagian Konfirmasi Pengiriman (Proses Accept) */}
      {!isAlreadyExecuted && !isRejected && firstAction && (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-[#F8FAFF] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2F55D4]">
                Ringkasan Konfirmasi Pengiriman
              </div>
              <div className="mt-1 text-sm text-slate-700">
                Anda akan mengirim <strong className="text-slate-900">{getChannelLabel(firstAction.channel)}</strong> kepada{" "}
                <strong className="text-slate-900">{firstAction.who?.name}</strong> (
                {firstAction.who?.org_name || firstAction.who?.city}) di tujuan:{" "}
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-700 border border-emerald-200">
                  {getDestinationContact(firstAction.who, firstAction.channel)}
                </span>
              </div>
            </div>
          </div>

          {hasHighRisk && (
            <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-amber-200 bg-amber-50 p-3.5 hover:bg-amber-100/60 transition">
              <input
                type="checkbox"
                checked={stepUpChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setStepUpChecked(checked);
                  if (checked) {
                    setConfirmationText(defaultConfirmPhrase);
                  } else {
                    setConfirmationText("");
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-[#2F55D4]"
              />
              <div className="text-xs leading-relaxed text-amber-900">
                <span className="font-bold text-amber-800">
                  Konfirmasi Penerima Eksternal:{" "}
                </span>
                Saya telah memeriksa isi pesan di atas dan menyetujui pengiriman ke{" "}
                <strong>{firstAction.who?.name}</strong> ({firstAction.who?.org_name}) melalui{" "}
                <strong className="font-mono underline">
                  {getDestinationContact(firstAction.who, firstAction.channel)}
                </strong>
                .
              </div>
            </label>
          )}

          {missingDestination && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️{" "}
              <strong>
                {firstAction.channel === "email"
                  ? "Alamat email penerima belum tersedia."
                  : "Nomor WhatsApp penerima belum tersedia."}
              </strong>{" "}
              Lengkapi kontak penerima terlebih dahulu sebelum menyetujui pengiriman.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {onSimulateTamper && showTechDetails && (
              <button
                type="button"
                onClick={onSimulateTamper}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Simulasi Manipulasi Draf
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => onApprove(firstAction, "reject", "")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {loading ? "⏳ Memproses..." : "Tolak / Batalkan"}
            </button>
            <button
              type="button"
              disabled={loading || (hasHighRisk && !stepUpChecked) || missingDestination}
              onClick={() =>
                onApprove(
                  firstAction,
                  "approve",
                  (confirmationText || defaultConfirmPhrase).trim()
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#2F55D4] px-6 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-[#2444B3] disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memproses Konfirmasi...</span>
                </>
              ) : isRevalidationFailed ? (
                "🔁 Setujui Ulang Draf"
              ) : (
                `✅ Setujui & Kirim ke ${getDestinationContact(firstAction.who, firstAction.channel)}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalInbox;
