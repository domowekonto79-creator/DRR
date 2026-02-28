import React from "react";
import { RiskEntry, calculatePRI, calculatePRR, getPRRLevel } from "../types";
import {
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  Activity,
} from "lucide-react";

interface DashboardProps {
  risks: RiskEntry[];
}

export default function Dashboard({ risks }: DashboardProps) {
  const totalRisks = risks.length;

  const prrLevels = risks.reduce(
    (acc, risk) => {
      const pri = calculatePRI(risk.pValue, risk.nValue);
      const prr = calculatePRR(pri, risk.wValue);
      const level = getPRRLevel(prr);
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    { Niskie: 0, Średnie: 0, Wysokie: 0 } as Record<string, number>,
  );

  const outsideTolerance = risks.filter((risk) => {
    const pri = calculatePRI(risk.pValue, risk.nValue);
    const prr = calculatePRR(pri, risk.wValue);
    return getPRRLevel(prr) === "Wysokie";
  }).length;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
        Pulpit menedżerski (DORA)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Wszystkie ryzyka
            </h3>
            <Activity className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-light text-slate-900 mt-4">
            {totalRisks}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Niskie PRR
            </h3>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-light text-slate-900 mt-4">
            {prrLevels["Niskie"]}
          </p>
          <p className="text-xs text-slate-500 mt-1">W granicach tolerancji</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Średnie PRR
            </h3>
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-light text-slate-900 mt-4">
            {prrLevels["Średnie"]}
          </p>
          <p className="text-xs text-slate-500 mt-1">Wymaga nadzoru</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Wysokie PRR
            </h3>
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-3xl font-light text-slate-900 mt-4">
            {prrLevels["Wysokie"]}
          </p>
          <p className="text-xs text-slate-500 mt-1">Poza tolerancją</p>
        </div>
      </div>

      {outsideTolerance > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-rose-800">
                Uwaga: Zidentyfikowano ryzyka poza tolerancją
              </h3>
              <div className="mt-2 text-sm text-rose-700">
                <p>
                  Liczba ryzyk (PRR &gt; 21): {outsideTolerance}. Zgodnie z
                  rozporządzeniem DORA oraz procedurami wewnętrznymi, ryzyka te
                  wymagają pilnego planu postępowania (redukcja, transfer,
                  unikanie) oraz eskalacji do Zarządu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
