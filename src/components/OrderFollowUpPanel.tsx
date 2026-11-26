"use client";

import React, { useState } from "react";
import { formatAuditTimestamp } from "../lib/formatTime";

export interface OrderLineItem {
  item: string;
  qty: string | number;
  unit: string;
}

export interface OrderFollowUpItem {
  request_id?: string;
  run_id?: string;
  order_draft_id: string;
  so_id?: string;
  nama_pemesan?: string;
  nama_customer?: string;
  po_reference?: string;
  due_date?: string;
  so_status?: string;
  billing_status?: string;
  items?: OrderLineItem[];
  notes?: string;
  approval_status?: "pending" | "approved" | "rejected";
  approved_order_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

interface OrderFollowUpPanelProps {
  items: OrderFollowUpItem[];
  loading?: boolean;
  onSubmitOrderDecision: (
    payload: OrderFollowUpItem & { decision: "approve" | "reject" }
  ) => Promise<void>;
}

export const OrderFollowUpPanel: React.FC<OrderFollowUpPanelProps> = ({
  items,
  loading = false,
  onSubmitOrderDecision,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<OrderFollowUpItem | null>(null);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Belum ada item follow-up order pada run terbaru.
      </div>
    );
  }

  const startEdit = (item: OrderFollowUpItem, cardKey: string) => {
    setEditingKey(cardKey);
    setDraft({
      ...item,
      nama_pemesan: item.nama_pemesan || "",
      nama_customer: item.nama_customer || "",
      po_reference: item.po_reference || "",
      due_date: item.due_date || "",
      so_status: item.so_status || "processing",
      billing_status: item.billing_status || "pending_invoice",
      notes: item.notes || "",
      items: (item.items || []).map((li) => ({
        item: li.item || "",
        qty: li.qty ?? "",
        unit: li.unit || "",
      })),
    });
  };

  const handleAction = async (
    target: OrderFollowUpItem,
    decision: "approve" | "reject",
    cardKey: string
  ) => {
    setSubmittingKey(cardKey);
    try {
      await onSubmitOrderDecision({ ...target, decision });
      if (editingKey === cardKey) {
        setEditingKey(null);
        setDraft(null);
      }
    } finally {
      setSubmittingKey(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      {items.map((item, idx) => {
        const cardKey = `${item.order_draft_id || idx}-${item.so_id || idx}`;
        const isEditing = editingKey === cardKey && draft !== null;
        const isSubmitting = submittingKey === cardKey || loading;
        const isApproved = item.approval_status === "approved";
        const isRejected = item.approval_status === "rejected";

        return (
          <div
            key={cardKey}
            className={`rounded-xl border p-4 text-xs space-y-3 transition ${
              isApproved
                ? "border-emerald-200 bg-emerald-50/40"
                : isRejected
                ? "border-red-200 bg-red-50/40"
                : "border-slate-200 bg-slate-50/60"
            }`}
          >
            {/* Header & Status Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  📦 {item.nama_customer || "Customer"}
                </span>
                {item.nama_pemesan && (
                  <span className="ml-1.5 text-slate-500">· {item.nama_pemesan}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {isApproved ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    ✅ Orderan Diproses
                  </span>
                ) : isRejected ? (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                    ❌ Ditolak
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    ⏳ Menunggu Persetujuan
                  </span>
                )}
                {item.so_status && (
                  <span className="rounded-full border border-blue-200 bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#2F55D4]">
                    SO: {item.so_status}
                  </span>
                )}
                {item.billing_status && (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    Billing: {item.billing_status}
                  </span>
                )}
              </div>
            </div>

            {isEditing && draft ? (
              <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-3.5 shadow-sm">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Nama Customer
                    </label>
                    <input
                      type="text"
                      value={draft.nama_customer || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, nama_customer: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Nama Pemesan (PIC)
                    </label>
                    <input
                      type="text"
                      value={draft.nama_pemesan || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, nama_pemesan: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      PO Reference
                    </label>
                    <input
                      type="text"
                      value={draft.po_reference || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, po_reference: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Due Date
                    </label>
                    <input
                      type="text"
                      value={draft.due_date || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, due_date: e.target.value })
                      }
                      placeholder="YYYY-MM-DD"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      SO Status
                    </label>
                    <input
                      type="text"
                      value={draft.so_status || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, so_status: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase text-slate-500">
                      Billing Status
                    </label>
                    <input
                      type="text"
                      value={draft.billing_status || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, billing_status: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Editable Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F55D4]">
                      Edit Daftar Item ({(draft.items || []).length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: [...(draft.items || []), { item: "", qty: 1, unit: "unit" }],
                        })
                      }
                      className="rounded-md border border-blue-200 bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#2F55D4] hover:bg-blue-100"
                    >
                      + Tambah Item
                    </button>
                  </div>
                  {(draft.items || []).map((li, liIdx) => (
                    <div key={liIdx} className="grid grid-cols-12 gap-1.5 items-center">
                      <input
                        type="text"
                        value={li.item}
                        placeholder="Nama item / unit"
                        onChange={(e) => {
                          const next = [...(draft.items || [])];
                          next[liIdx] = { ...next[liIdx], item: e.target.value };
                          setDraft({ ...draft, items: next });
                        }}
                        className="col-span-6 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        value={String(li.qty ?? "")}
                        placeholder="Qty"
                        onChange={(e) => {
                          const next = [...(draft.items || [])];
                          next[liIdx] = { ...next[liIdx], qty: e.target.value };
                          setDraft({ ...draft, items: next });
                        }}
                        className="col-span-2 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 font-mono"
                      />
                      <input
                        type="text"
                        value={li.unit}
                        placeholder="Unit"
                        onChange={(e) => {
                          const next = [...(draft.items || [])];
                          next[liIdx] = { ...next[liIdx], unit: e.target.value };
                          setDraft({ ...draft, items: next });
                        }}
                        className="col-span-3 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (draft.items || []).filter((_, i) => i !== liIdx);
                          setDraft({ ...draft, items: next });
                        }}
                        className="col-span-1 rounded-lg bg-red-50 border border-red-200 py-1 text-center text-red-600 hover:bg-red-100"
                        title="Hapus item"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-500">
                    Catatan Pemrosesan Order (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={draft.notes || ""}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="Mis. Prioritas kirim ke site Samarinda minggu depan..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-[#2F55D4] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setEditingKey(null);
                      setDraft(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAction(draft, "approve", cardKey)}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Memproses..." : "✅ Simpan & Setujui Orderan"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 font-mono">
                  <span>
                    SO: <strong className="text-[#2F55D4]">{item.so_id || "-"}</strong>
                  </span>
                  <span>
                    PO: <strong className="text-slate-900">{item.po_reference || "-"}</strong>
                  </span>
                  <span>
                    Due: <strong className="text-amber-700">{item.due_date || "-"}</strong>
                  </span>
                </div>

                {Array.isArray(item.items) && item.items.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Daftar Item ({item.items.length})
                    </div>
                    {item.items.map((li, liIdx) => (
                      <div
                        key={liIdx}
                        className="flex items-center justify-between text-[11px] text-slate-700"
                      >
                        <span>• {li.item || "-"}</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {li.qty ?? "-"} {li.unit || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {item.notes && (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-500">Catatan: </span>
                    {item.notes}
                  </div>
                )}

                {isApproved && item.approved_order_id && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                    ✅ Disetujui &amp; masuk antrean proses order (
                    <code className="font-mono font-bold text-emerald-700">
                      {item.approved_order_id}
                    </code>
                    )
                    {item.approved_by ? ` oleh ${item.approved_by}` : ""}
                    {item.approved_at ? ` · ${formatAuditTimestamp(item.approved_at)}` : ""}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => startEdit(item, cardKey)}
                    className="rounded-lg border border-blue-200 bg-[#EEF2FF] px-3 py-1.5 text-xs font-semibold text-[#2F55D4] hover:bg-blue-100 disabled:opacity-50 transition"
                  >
                    ✏️ {isApproved ? "Edit Ulang" : "Edit Order"}
                  </button>
                  {!isApproved && (
                    <>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAction(item, "reject", cardKey)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        ❌ Tolak
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAction(item, "approve", cardKey)}
                        className="rounded-lg bg-[#2F55D4] px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#2444B3] disabled:opacity-50 transition"
                      >
                        {isSubmitting ? "Memproses..." : "✅ Setujui & Proses Orderan"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OrderFollowUpPanel;
