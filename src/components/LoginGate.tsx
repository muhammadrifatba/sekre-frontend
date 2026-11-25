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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-7 shadow-2xl space-y-5">
        <div className="space-y-1">
          <span className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/15 px-3 py-0.5 text-[11px] font-bold text-indigo-300">
            🔐 SEKRE Approval Gate · JWT Auth
          </span>
          <h1 className="text-xl font-extrabold text-white">
            Masuk ke Pusat Konfirmasi Pesan
          </h1>
          <p className="text-xs text-slate-400">
            PT Nusantara Alat Berat · Gunakan akun owner (`owner_rifat` atau `owner_andi`).
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-950/60 p-3 text-xs font-semibold text-red-200">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Owner ID atau Email
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="owner_rifat"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {submitting ? "Memverifikasi..." : "Masuk ke Approval Gate"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default LoginGate;
