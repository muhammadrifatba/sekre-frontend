"use client";

import React, { useEffect, useState } from "react";

interface OutboxItem {
  outbox_id: string;
  action_id: string;
  request_id: string;
  channel: string;
  recipient_name: string;
  recipient_address: string;
  subject: string;
  remaining_seconds: number;
  status: string;
  updated_at?: string;
  release_at?: string;
}

interface OutboxCountdownProps {
  items: OutboxItem[];
  undoingActionId?: string | null;
  onUndo: (actionId: string) => void;
  onRefresh?: () => void;
}

const RECENT_COMPLETED_MS = 2 * 60 * 1000;

function isRecentlyFinished(item: OutboxItem): boolean {
  const ts = item.release_at || item.updated_at;
  if (!ts) return false;
  const parsed = Date.parse(ts);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= RECENT_COMPLETED_MS;
}

export const OutboxCountdown: React.FC<OutboxCountdownProps> = ({
  items,
  undoingActionId = null,
  onUndo,
  onRefresh,
}) => {
  const [secondsLeftMap, setSecondsLeftMap] = useState<Record<string, number>>({});
  const [dismissedMap, setDismissedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      if (item.status === "queued_outbox") {
        initial[item.action_id] = item.remaining_seconds ?? 60;
      }
    });
    setSecondsLeftMap(initial);
    // Un-dismiss an item if it re-enters active countdown
    setDismissedMap((prev) => {
      let changed = false;
      const next = { ...prev };
      items.forEach((item) => {
        if (item.status === "queued_outbox" && next[item.outbox_id]) {
          delete next[item.outbox_id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeftMap((prev) => {
        let hasHitZero = false;
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key] > 0) {
            next[key] -= 1;
            if (next[key] === 0) hasHitZero = true;
          }
        }
        if (hasHitZero && onRefresh) {
          onRefresh();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const visibleItems = (items || []).filter((item) => {
    if (item.status === "queued_outbox") return true;
    if (dismissedMap[item.outbox_id]) return false;
    return isRecentlyFinished(item);
  });

  if (visibleItems.length === 0) return null;

  const hasActiveQueue = visibleItems.some((i) => i.status === "queued_outbox");
  const hasEmail = visibleItems.some((i) => i.channel === "email");
  const hasWhatsApp = visibleItems.some((i) => i.channel === "whatsapp");
  const channelTitle =
    hasEmail && hasWhatsApp ? "Pesan" : hasWhatsApp ? "WhatsApp" : "Email";

  const headerTitle = hasActiveQueue
    ? `⏳ Antrean Pengiriman ${channelTitle} (Waktu Tunda Pengaman 60 Detik)`
    : hasWhatsApp && !hasEmail
    ? "📲 Status Pengiriman WhatsApp"
    : `📬 Status Pengiriman ${channelTitle}`;

  const headerSubtitle = hasActiveQueue
    ? "Anda masih dapat membatalkan pengiriman sebelum hitung mundur selesai"
    : hasWhatsApp && !hasEmail
    ? "Klik tombol Buka & Kirim ke WhatsApp di atas untuk mengirim pesan"
    : "Pengiriman selesai diproses";

  const dismissCompleted = () => {
    setDismissedMap((prev) => {
      const next = { ...prev };
      visibleItems.forEach((item) => {
        if (item.status !== "queued_outbox") {
          next[item.outbox_id] = true;
        }
      });
      return next;
    });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_36px_rgba(15,23,42,0.14)] backdrop-blur">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-xs font-extrabold uppercase tracking-wider ${
            hasActiveQueue ? "text-amber-700" : "text-[#2F55D4]"
          }`}
        >
          {headerTitle}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{headerSubtitle}</span>
          {!hasActiveQueue && (
            <button
              type="button"
              onClick={dismissCompleted}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              ✕ Tutup
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {visibleItems.map((item) => {
          const rem = secondsLeftMap[item.action_id] ?? item.remaining_seconds ?? 0;
          const pct = Math.min(100, Math.max(0, Math.round((rem / 60) * 100)));
          const isQueued = item.status === "queued_outbox";
          const isWA = item.channel === "whatsapp";

          return (
            <div
              key={item.outbox_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
            >
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${
                      isWA
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-blue-200 bg-[#EEF2FF] text-[#2F55D4]"
                    }`}
                  >
                    {item.channel}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    Kepada: {item.recipient_name}
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-[#2F55D4] border border-slate-200">
                    {item.recipient_address}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === "undone"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : isQueued
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isQueued
                      ? "Menunggu Dikirim"
                      : item.status === "undone"
                      ? "Dibatalkan"
                      : isWA
                      ? "Siap di WhatsApp"
                      : "Terkirim"}
                  </span>
                </div>
                {item.subject && item.subject.trim() !== "" && (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    Subjek: {item.subject}
                  </p>
                )}

                {isQueued && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-amber-500 transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {isQueued ? (
                  <>
                    <span className="font-mono text-sm font-extrabold text-amber-700">
                      {rem} dtk
                    </span>
                    <button
                      disabled={undoingActionId === item.action_id}
                      onClick={() => onUndo(item.action_id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      {undoingActionId === item.action_id ? (
                        <>
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Membatalkan...</span>
                        </>
                      ) : (
                        "Batalkan Pengiriman"
                      )}
                    </button>
                  </>
                ) : item.status === "undone" ? (
                  <span className="text-xs font-bold text-red-600">
                    Pengiriman Dibatalkan
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-700">
                    {isWA ? "Siap Dikirim via WA" : "Berhasil Dikirim"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OutboxCountdown;
