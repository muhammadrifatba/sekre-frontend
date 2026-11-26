"use client";

import React, { useEffect, useRef, useState } from "react";
import ScenarioLauncher from "../components/ScenarioLauncher";
import ClarifyAndPicModal from "../components/ClarifyAndPicModal";
import ApprovalInbox from "../components/ApprovalInbox";
import OutboxCountdown from "../components/OutboxCountdown";
import CustomerContextPanel from "../components/CustomerContextPanel";
import AuditTimeline from "../components/AuditTimeline";
import LoginGate from "../components/LoginGate";
import OrderFollowUpPanel, { OrderFollowUpItem } from "../components/OrderFollowUpPanel";
import { ScenarioDefinition } from "../lib/types";
import { formatAuditTimestamp } from "../lib/formatTime";
import {
  AuthOwner,
  BACKEND_URL,
  clearAuth,
  fetchCurrentOwner,
  getAuthHeaders,
  logoutOwner,
} from "../lib/auth";

function isPendingRequest(req: any): boolean {
  if (!req) return false;
  if (
    ["approved", "queued", "executed", "handed_off", "rejected", "failed"].includes(
      req.status
    )
  ) {
    return false;
  }
  return (
    req.status === "awaiting_approval" ||
    req.status === "needs_clarify" ||
    req.status === "revalidation_failed" ||
    Boolean(req.interrupt) ||
    Boolean(req.state?.plan)
  );
}

function getRequestSummary(req: any) {
  const plan = req?.interrupt?.plan || req?.state?.plan;
  const firstAction = plan?.actions?.[0];
  const amb = req?.interrupt?.ambiguities?.[0] || req?.state?.ambiguities?.[0];
  const unk = req?.interrupt?.unknown_names?.[0];

  const recipientName =
    firstAction?.who?.name ||
    amb?.queried_name ||
    unk?.raw_name ||
    (req?.status === "needs_clarify" ? "Perlu Klarifikasi Penerima" : "Penerima");
  const orgName =
    firstAction?.who?.org_name ||
    unk?.raw_org ||
    firstAction?.who?.city ||
    "";
  const channel = firstAction?.channel || "whatsapp";
  const destination =
    firstAction
      ? channel === "whatsapp"
        ? firstAction?.who?.phone || "Menunggu nomor WA"
        : firstAction?.who?.email || "Menunggu alamat email"
      : req?.source_refs?.[0] || "Menunggu klarifikasi";

  let statusLabel = "⏳ Menunggu Persetujuan";
  let statusColor = "border-amber-200 bg-amber-50 text-amber-800";

  if (req?.status === "revalidation_failed") {
    statusLabel = "⚠️ Perubahan Terdeteksi — Approval Ulang";
    statusColor = "border-orange-200 bg-orange-50 text-orange-800";
  } else if (req?.status === "failed") {
    statusLabel = "❌ Gagal Diproses";
    statusColor = "border-red-200 bg-red-50 text-red-700";
  } else if (req?.status === "needs_clarify" || req?.interrupt?.type === "CLARIFY") {
    statusLabel = "🔍 Perlu Klarifikasi";
    statusColor = "border-blue-200 bg-blue-50 text-[#2F55D4]";
  } else if (req?.interrupt?.type === "PIC_INTAKE") {
    statusLabel = "👤 Kontak Baru Belum Terdaftar";
    statusColor = "border-amber-200 bg-amber-50 text-amber-800";
  } else if (req?.status === "handed_off") {
    statusLabel = "📲 Diserahkan ke WA";
    statusColor = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (req?.status === "approved" || req?.status === "queued") {
    statusLabel = "⏳ Disetujui / Antre Kirim";
    statusColor = "border-sky-200 bg-sky-50 text-sky-700";
  } else if (req?.status === "executed") {
    statusLabel = "✅ Sudah Dieksekusi";
    statusColor = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (req?.status === "rejected") {
    statusLabel = "❌ Dibatalkan";
    statusColor = "border-red-200 bg-red-50 text-red-700";
  }

  return {
    recipientName,
    orgName,
    channel,
    destination,
    statusLabel,
    statusColor,
    subject: firstAction?.what?.subject || req?.state?.raw_input || "",
  };
}

export default function SekreGovernanceConsole() {
  const [owner, setOwner] = useState<AuthOwner | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDemoScenarios, setShowDemoScenarios] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioDefinition | null>(null);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [orderFollowups, setOrderFollowups] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState<boolean>(false);
  const [queueTab, setQueueTab] = useState<"pending" | "history" | "orders">("pending");
  const [outboxItems, setOutboxItems] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<{ verification: any; events: any[] }>({
    verification: null,
    events: [],
  });
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [undoingActionId, setUndoingActionId] = useState<string | null>(null);
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);

  const lastSyncedSignature = useRef<string>("");
  const selectedRequestIdRef = useRef<string | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchCurrentOwner().then((me) => {
      setOwner(me);
      setAuthChecked(true);
    });
  }, []);

  const handleUnauthorized = () => {
    clearAuth();
    setOwner(null);
  };

  const selectRequest = (reqId: string | null, scrollToDetail = false) => {
    selectedRequestIdRef.current = reqId;
    setSelectedRequestId(reqId);
    setShowAllPending(false);
    setErrorBanner(null);
    if (reqId) {
      refreshAuditAndOutbox(reqId, true);
    }
    if (scrollToDetail && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const refreshAuditAndOutbox = async (reqId?: string, showSpinner = false) => {
    if (showSpinner) setAuditLoading(true);
    try {
      const headers = getAuthHeaders();
      const [obRes, audRes, ordRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/outbox${reqId ? `?request_id=${reqId}` : ""}`, { headers }),
        fetch(`${BACKEND_URL}/api/v1/audit/verify${reqId ? `?request_id=${reqId}` : ""}`, { headers }),
        fetch(`${BACKEND_URL}/api/v1/order-followups`, { headers }),
      ]);
      if (obRes.status === 401 || audRes.status === 401) {
        handleUnauthorized();
        return;
      }
      if (obRes.ok) {
        const obData = await obRes.json();
        setOutboxItems(obData.items || []);
      }
      if (audRes.ok) {
        setAuditData(await audRes.json());
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrderFollowups(ordData.items || []);
      }
    } catch {
      // Ignore network poll errors during offline preview
    } finally {
      if (showSpinner) setAuditLoading(false);
    }
  };

  const syncRequestsFromBackend = async (force = false, preferRequestId?: string, manualRefresh = false) => {
    if (manualRefresh) setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const listResp = await fetch(`${BACKEND_URL}/api/v1/requests`, { headers });
      if (listResp.status === 401) {
        handleUnauthorized();
        return;
      }

      let requestsList: any[] = [];
      if (listResp.ok) {
        const listData = await listResp.json();
        requestsList = listData.requests || [];
      } else {
        const latestResp = await fetch(`${BACKEND_URL}/api/v1/requests/latest`, { headers });
        if (latestResp.ok) {
          const latestData = await latestResp.json();
          if (latestData && latestData.request_id && latestData.status !== "unknown") {
            requestsList = [latestData];
          }
        }
      }

      const sig = requestsList
        .map(
          (r) =>
            `${r.request_id}:${r.status}:${r.interrupt?.type || "none"}:${
              r.interrupt?.approval_hash || r.payload_hash || ""
            }:${r.state?.plan?.actions?.[0]?.who?.phone || ""}`
        )
        .join("|");

      if (force || sig !== lastSyncedSignature.current) {
        lastSyncedSignature.current = sig;
        setAllRequests(requestsList);

        const currentSelected = preferRequestId || selectedRequestIdRef.current;
        const stillExists =
          currentSelected && requestsList.some((r) => r.request_id === currentSelected);

        const nextTargetId = stillExists
          ? currentSelected
          : requestsList.find(isPendingRequest)?.request_id ||
            requestsList[0]?.request_id ||
            null;

        selectedRequestIdRef.current = nextTargetId;
        setSelectedRequestId(nextTargetId);
        await refreshAuditAndOutbox(nextTargetId || undefined, manualRefresh);
      }
    } catch {
      // Ignore offline errors
    } finally {
      setInitialLoading(false);
      if (manualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!owner) return;
    setInitialLoading(true);
    syncRequestsFromBackend(true);
    if (!liveSyncEnabled) return;
    const interval = setInterval(() => {
      syncRequestsFromBackend(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [liveSyncEnabled, owner]);

  const upsertRequestInList = (updatedSnap: any) => {
    if (!updatedSnap?.request_id) return;
    setAllRequests((prev) => {
      const exists = prev.some((r) => r.request_id === updatedSnap.request_id);
      if (exists) {
        return prev.map((r) =>
          r.request_id === updatedSnap.request_id ? updatedSnap : r
        );
      }
      return [updatedSnap, ...prev];
    });
    selectedRequestIdRef.current = updatedSnap.request_id;
    setSelectedRequestId(updatedSnap.request_id);
  };

  const handleRunScenario = async (scenario: ScenarioDefinition) => {
    setLoading(true);
    setErrorBanner(null);
    setActiveScenario(scenario);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/requests`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(scenario.payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErrorBanner(data.detail || "Permintaan ditolak oleh sistem keamanan");
      } else {
        upsertRequestInList(data);
        setQueueTab("pending");
        setShowAllPending(false);
        await syncRequestsFromBackend(true, data.request_id);
      }
    } catch (err: any) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveClarify = async (
    targetRequestId: string,
    contactId: string,
    selectedSlot: string
  ) => {
    if (!targetRequestId) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/requests/${targetRequestId}/clarify`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          contact_id: contactId,
          selected_slot: selectedSlot,
        }),
      });
      if (resp.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setErrorBanner(data.detail || "Gagal menyimpan klarifikasi");
      }
      await syncRequestsFromBackend(true, targetRequestId);
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePicIntake = async (targetRequestId: string, sentence: string) => {
    if (!targetRequestId) return;
    setErrorBanner(`Catatan PIC baru dicatat: "${sentence}". Gunakan manual-enrich / MCP untuk mendaftarkan kontak.`);
  };

  const handleApproveOrEdit = async (
    targetSnapshot: any,
    action: any,
    decision: "approve" | "edit" | "reject",
    cognitiveConfirmation: string,
    editedBody?: string,
    editedSubject?: string
  ) => {
    const reqId = targetSnapshot?.request_id;
    const actId = action?.action_id;
    if (!reqId || !actId) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/requests/${reqId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action_id: actId,
          idempotency_key: action?.idempotency_key || "",
          decision: decision === "edit" ? "approve" : decision,
          cognitive_confirmation: cognitiveConfirmation,
          edited_subject: editedSubject,
          edited_body_draft: editedBody,
        }),
      });
      if (resp.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setErrorBanner(data.detail || "Gagal memproses konfirmasi");
      }
      await syncRequestsFromBackend(true, reqId);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoOutbox = async (actionId: string) => {
    setErrorBanner(null);
    setUndoingActionId(actionId);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/v1/outbox/${actionId}/undo`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (resp.status === 401) {
        handleUnauthorized();
        return;
      }
      const data = await resp.json();
      if (!resp.ok) {
        setErrorBanner(data.detail || "Gagal membatalkan pengiriman");
      }
      await syncRequestsFromBackend(true, selectedRequestIdRef.current || undefined);
    } catch (err: any) {
      setErrorBanner(err?.message || "Gagal membatalkan pengiriman");
    } finally {
      setUndoingActionId(null);
    }
  };

  const handleSubmitOrderDecision = async (
    payload: OrderFollowUpItem & { decision: "approve" | "reject" }
  ) => {
    setErrorBanner(null);
    const resp = await fetch(`${BACKEND_URL}/api/v1/order-followups/approve`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        order_draft_id: payload.order_draft_id,
        decision: payload.decision,
        request_id: payload.request_id || "",
        run_id: payload.run_id || "",
        so_id: payload.so_id || "",
        nama_pemesan: payload.nama_pemesan || "",
        nama_customer: payload.nama_customer || "",
        po_reference: payload.po_reference || "",
        due_date: payload.due_date || "",
        so_status: payload.so_status || "processing",
        billing_status: payload.billing_status || "pending_invoice",
        items: payload.items || [],
        notes: payload.notes || "",
      }),
    });
    if (resp.status === 401) {
      handleUnauthorized();
      return;
    }
    const data = await resp.json();
    if (!resp.ok) {
      setErrorBanner(data.detail || "Gagal memproses persetujuan orderan");
      return;
    }
    await refreshAuditAndOutbox(selectedRequestIdRef.current || undefined);
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#F6F8FC] text-slate-600 flex items-center justify-center text-sm font-medium">
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#2F55D4] border-t-transparent" />
          <span>Memeriksa sesi login...</span>
        </div>
      </main>
    );
  }

  if (!owner) {
    return <LoginGate onLoginSuccess={(loggedInOwner) => setOwner(loggedInOwner)} />;
  }

  const pendingRequests = allRequests.filter(isPendingRequest);
  const completedRequests = allRequests.filter((r) => !isPendingRequest(r));
  const currentTabList = queueTab === "pending" ? pendingRequests : completedRequests;

  const selectedSnapshot =
    allRequests.find((r) => r.request_id === selectedRequestId) ||
    currentTabList[0] ||
    allRequests[0] ||
    null;

  const selectedIndexInTab = selectedSnapshot
    ? currentTabList.findIndex((r) => r.request_id === selectedSnapshot.request_id)
    : -1;

  // When showAllPending is true on the pending tab, render all pending items;
  // otherwise render ONLY the currently selected item so clicking any card in the top list
  // immediately updates the bottom section to that exact item.
  const displayedSnapshots: any[] =
    queueTab === "pending" && showAllPending && pendingRequests.length > 0
      ? pendingRequests
      : selectedSnapshot
      ? [selectedSnapshot]
      : [];

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900">
      {/* Mekari-style Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2F55D4] text-base font-extrabold text-white shadow-sm">
              S
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                SEKRE — Pusat Konfirmasi Pengiriman Pesan
              </h1>
              <p className="text-xs text-slate-500">
                PT Nusantara Alat Berat · WhatsApp &amp; Email · Terhubung Otomatis dengan Tencent WorkBuddy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLiveSyncEnabled(!liveSyncEnabled)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                liveSyncEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/70"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  liveSyncEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {liveSyncEnabled
                ? "Sinkronisasi WorkBuddy: Aktif"
                : "Sinkronisasi WorkBuddy: Nonaktif"}
            </button>
            <button
              onClick={() => syncRequestsFromBackend(true, undefined, true)}
              disabled={refreshing || initialLoading}
              className="rounded-full border border-blue-200 bg-[#EEF2FF] px-3.5 py-1.5 text-xs font-semibold text-[#2F55D4] hover:bg-blue-100/80 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              {refreshing || initialLoading ? "⏳ Memuat..." : "🔄 Muat Ulang"}
            </button>
            <button
              onClick={() => setShowDemoScenarios(!showDemoScenarios)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                showDemoScenarios
                  ? "border-[#2F55D4] bg-[#2F55D4] text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {showDemoScenarios ? "Tutup Demo" : "🧪 Demo"}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1 text-xs">
              <span className="font-semibold text-slate-700">{owner.name}</span>
              <button
                onClick={async () => {
                  await logoutOwner();
                  setOwner(null);
                }}
                className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6 pb-32 space-y-6">
        {showDemoScenarios && (
          <ScenarioLauncher
            activeScenarioId={activeScenario?.id}
            loading={loading}
            onRunScenario={handleRunScenario}
          />
        )}

        {errorBanner && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 shadow-sm">
            ⚠️ Peringatan Sistem: {errorBanner}
          </div>
        )}

        {/* Panel Daftar Antrean Permintaan (Klik kartu mana saja untuk langsung melihat & menyetujui di bawah) */}
        {allRequests.length > 0 && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 mr-1">
                  📥 Daftar Permintaan Pengiriman Pesan
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setQueueTab("pending");
                    if (pendingRequests[0]) {
                      selectRequest(pendingRequests[0].request_id, false);
                    }
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    queueTab === "pending"
                      ? "bg-[#2F55D4] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  ⏳ Perlu Konfirmasi ({pendingRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQueueTab("history");
                    if (completedRequests[0]) {
                      selectRequest(completedRequests[0].request_id, false);
                    }
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    queueTab === "history"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  ✅ Selesai / Riwayat ({completedRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTab("orders")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    queueTab === "orders"
                      ? "bg-[#2F55D4] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  📦 Follow-Up Order ({orderFollowups.length})
                </button>
              </div>

              {queueTab === "pending" && pendingRequests.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllPending(false)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      !showAllPending
                        ? "border-[#2F55D4] bg-[#EEF2FF] text-[#2F55D4]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    🎯 Tampilkan yang Diklik Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllPending(true)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      showAllPending
                        ? "border-[#2F55D4] bg-[#EEF2FF] text-[#2F55D4]"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    📋 Tampilkan Semua Sekaligus ({pendingRequests.length})
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              💡 Klik salah satu kartu di bawah ini untuk langsung membuka dan menyetujui pesan tersebut pada bagian detail di bawah:
            </p>

            {queueTab === "orders" ? (
              <OrderFollowUpPanel
                items={orderFollowups}
                loading={loading}
                onSubmitOrderDecision={handleSubmitOrderDecision}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {currentTabList.map((req, idx) => {
                  const info = getRequestSummary(req);
                  const isSelected =
                    !showAllPending && req.request_id === selectedSnapshot?.request_id;
                  return (
                    <div
                      key={req.request_id}
                      onClick={() => selectRequest(req.request_id, true)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-[#2F55D4] bg-[#EEF2FF]/60 ring-2 ring-[#2F55D4]/20 shadow-sm"
                          : "border-slate-200 bg-white hover:border-[#2F55D4]/40 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${info.statusColor}`}
                        >
                          #{idx + 1} · {info.statusLabel}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatAuditTimestamp(req.updated_at_iso || req.updated_at)}
                        </span>
                      </div>
                      <div className="mt-2.5 text-sm font-bold text-slate-900 truncate">
                        {info.recipientName}{" "}
                        {info.orgName ? (
                          <span className="font-normal text-slate-500">
                            — {info.orgName}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#2F55D4] truncate">
                          {info.channel === "whatsapp" ? "📲 " : "✉️ "}
                          {info.destination}
                        </span>
                        {isSelected && (
                          <span className="rounded-full bg-[#2F55D4] px-2.5 py-0.5 text-[10px] font-bold text-white">
                            Sedang Dibuka
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div ref={detailSectionRef} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {initialLoading && allRequests.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-3">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#2F55D4] border-t-transparent" />
                <h3 className="text-sm font-bold text-slate-900">
                  Memuat Daftar Permintaan dari Server...
                </h3>
                <p className="mx-auto max-w-md text-xs text-slate-500">
                  Sedang mengambil data antrean persetujuan, konteks pelanggan, dan riwayat keamanan.
                </p>
              </div>
            ) : displayedSnapshots.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm space-y-2.5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-2xl">
                  📲
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Menunggu Perintah dari Tencent WorkBuddy
                </h3>
                <p className="mx-auto max-w-md text-xs text-slate-500 leading-relaxed">
                  Kirimkan transkrip suara atau perintah pengiriman pesan di{" "}
                  <strong className="text-slate-700">Tencent WorkBuddy</strong>. Semua draf pesan beserta nomor WhatsApp /
                  alamat Email tujuan akan otomatis tampil di halaman ini untuk Anda setujui.
                </p>
              </div>
            ) : null}

            {displayedSnapshots.map((snapItem, idx) => {
              const intr = snapItem?.interrupt;
              const st = snapItem?.state || {};
              const info = getRequestSummary(snapItem);
              const displayNumber = showAllPending
                ? idx + 1
                : selectedIndexInTab >= 0
                ? selectedIndexInTab + 1
                : 1;
              const totalInCurrentMode = showAllPending
                ? displayedSnapshots.length
                : currentTabList.length;

              return (
                <div key={snapItem.request_id || idx} className="space-y-4">
                  {totalInCurrentMode > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-[#EEF2FF]/70 px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#2F55D4] px-2.5 py-0.5 font-bold text-white">
                          Permintaan #{displayNumber} dari {totalInCurrentMode}
                        </span>
                        <span className="font-bold text-slate-900">
                          {info.recipientName}
                        </span>
                        {info.orgName && (
                          <span className="text-slate-600">— {info.orgName}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500">
                          Waktu Masuk: {formatAuditTimestamp(snapItem.updated_at_iso || snapItem.updated_at)}
                        </span>
                        {!showAllPending && currentTabList.length > 1 && (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              disabled={selectedIndexInTab <= 0}
                              onClick={() => {
                                const prev = currentTabList[selectedIndexInTab - 1];
                                if (prev) selectRequest(prev.request_id, false);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                            >
                              ⬅️ Sebelumnya
                            </button>
                            <button
                              type="button"
                              disabled={
                                selectedIndexInTab < 0 ||
                                selectedIndexInTab >= currentTabList.length - 1
                              }
                              onClick={() => {
                                const next = currentTabList[selectedIndexInTab + 1];
                                if (next) selectRequest(next.request_id, false);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                            >
                              Selanjutnya ➡️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {intr && (intr.type === "CLARIFY" || intr.type === "PIC_INTAKE") && (
                    <ClarifyAndPicModal
                      interrupt={intr}
                      loading={loading}
                      onResolveClarify={(cid, slot) =>
                        handleResolveClarify(snapItem.request_id, cid, slot)
                      }
                      onResolvePicIntake={(sentence) =>
                        handleResolvePicIntake(snapItem.request_id, sentence)
                      }
                    />
                  )}

                  {(intr?.type === "APPROVAL" || intr?.type === "APPROVAL_GATE" || st?.plan) && (
                    <ApprovalInbox
                      requestId={snapItem?.request_id}
                      plan={intr?.plan || st?.plan}
                      findings={intr?.findings || st?.findings || []}
                      injectionFlags={
                        intr?.injection_flags || st?.injection_flags || []
                      }
                      approvalHash={
                        intr?.approval_hash || snapItem?.payload_hash || st?.approval_hash || ""
                      }
                      loading={loading}
                      onApprove={(action, decision, confirmText, editedBody, editedSubject) =>
                        handleApproveOrEdit(
                          snapItem,
                          action,
                          decision,
                          confirmText,
                          editedBody,
                          editedSubject
                        )
                      }
                    />
                  )}

                  {((st?.todo_items && st.todo_items.length > 0) ||
                    (st?.commitments && st.commitments.length > 0)) && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-xs space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">
                        📝 Todo &amp; Komitmen Terdeteksi dari Sumber
                      </h3>
                      {st?.todo_items?.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-semibold text-[#2F55D4]">Todo Items:</div>
                          {st.todo_items.map((t: any, i: number) => (
                            <div key={t.id || i} className="text-slate-700">
                              • {t.title || t.what || JSON.stringify(t)}{" "}
                              {t.status && (
                                <span className="text-slate-400">({t.status})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {st?.commitments?.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-semibold text-amber-700">Komitmen:</div>
                          {st.commitments.map((c: any, i: number) => (
                            <div key={c.id || i} className="text-slate-700">
                              • {c.task || c.description || JSON.stringify(c)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(st?.customer_context || st?.context) && (
                    <CustomerContextPanel contextMap={st.customer_context || st.context} />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            {/* <AuditTimeline
              events={auditData.events}
              verification={auditData.verification}
              loading={auditLoading || initialLoading}
              onVerifyChain={() =>
                refreshAuditAndOutbox(selectedSnapshot?.request_id, true)
              }
            /> */}
          </div>
        </div>

        <OutboxCountdown
          items={outboxItems}
          undoingActionId={undoingActionId}
          onUndo={handleUndoOutbox}
          onRefresh={() => refreshAuditAndOutbox(selectedSnapshot?.request_id)}
        />
      </main>
    </div>
  );
}
