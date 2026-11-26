"use client";

import React, { useState } from "react";
import {
  HEAVY_MACHINERY_SCENARIOS,
  JUDGE_SCENARIOS,
  ScenarioDefinition,
} from "../lib/types";

interface ScenarioLauncherProps {
  activeScenarioId?: string;
  loading?: boolean;
  onRunScenario: (scenario: ScenarioDefinition) => void;
}

export const ScenarioLauncher: React.FC<ScenarioLauncherProps> = ({
  activeScenarioId,
  loading = false,
  onRunScenario,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [mode, setMode] = useState<"heavy_machinery" | "governance">(
    "heavy_machinery"
  );

  const activeList =
    mode === "heavy_machinery" ? HEAVY_MACHINERY_SCENARIOS : JUDGE_SCENARIOS;

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#EEF2FF] border border-blue-200 px-3 py-1 text-xs font-bold text-[#2F55D4]">
            🚜 Uji Skenario Mapping Komplain &amp; Demand Alat Berat
          </span>
          {isOpen && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMode("heavy_machinery")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  mode === "heavy_machinery"
                    ? "bg-[#2F55D4] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                4 Skenario Transkrip Alat Berat
              </button>
              <button
                type="button"
                onClick={() => setMode("governance")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  mode === "governance"
                    ? "bg-[#2F55D4] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                5 Skenario Keamanan &amp; Jadwal
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          {isOpen ? "Sembunyikan Panel Uji Skenario" : "Tampilkan Pilihan Skenario"}
        </button>
      </div>

      {isOpen && (
        <div
          className={`mt-3.5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3.5 ${
            mode === "heavy_machinery"
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-5"
          }`}
        >
          {activeList.map((sc) => {
            const isActive = activeScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                disabled={loading}
                onClick={() => onRunScenario(sc)}
                className={`group flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                  isActive
                    ? "border-[#2F55D4] bg-[#EEF2FF]/70 text-slate-900 shadow-sm ring-2 ring-[#2F55D4]/15"
                    : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-[#2F55D4]/40 hover:bg-white"
                } disabled:opacity-50`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded-md bg-white border border-blue-200 px-2 py-0.5 font-mono text-[10px] font-bold text-[#2F55D4]">
                      {sc.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-snug text-slate-900 group-hover:text-[#2F55D4]">
                    {sc.label.replace(/^Run T\d:\s*/, "")}
                  </p>
                  <p className="mt-1 line-clamp-3 text-[11px] text-slate-500 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ScenarioLauncher;
