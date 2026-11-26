"use client";

import React, { useState } from "react";
import { AuthOwner, loginWithPassword } from "../lib/auth";

interface LoginGateProps {
  onLoginSuccess: (owner: AuthOwner) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState("owner_rifat");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { owner } = await loginWithPassword(identifier.trim(), password);
      onLoginSuccess(owner);
    } catch (err: any) {
      setError(err?.message || "Kredensial tidak valid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F6F8FC] via-white to-[#EEF2FF] text-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_36px_rgba(15,23,42,0.08)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#2F55D4] via-[#4B61D1] to-[#0EA5E9]" />
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F55D4] text-sm font-extrabold text-white shadow-sm">
                S
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight text-slate-900">
                  SEKRE Portal
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  Approval Gate · JWT Auth
                </div>
              </div>
            </div>

            <div className="pt-1">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Masuk ke Pusat Konfirmasi Pesan
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                PT Nusantara Alat Berat · Gunakan akun owner (
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-[#2F55D4]">
                  owner_rifat
                </code>{" "}
                atau{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-[#2F55D4]">
                  owner_andi
                </code>
                ).
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Owner ID atau Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="owner_rifat"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2F55D4] focus:ring-2 focus:ring-[#2F55D4]/15 focus:outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2F55D4] focus:ring-2 focus:ring-[#2F55D4]/15 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#2F55D4] py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#2444B3] disabled:opacity-50 transition"
            >
              {submitting ? "Memverifikasi..." : "Masuk ke Approval Gate"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        Terhubung Otomatis dengan Tencent WorkBuddy · PT Nusantara Alat Berat
      </p>
    </main>
  );
};

export default LoginGate;
