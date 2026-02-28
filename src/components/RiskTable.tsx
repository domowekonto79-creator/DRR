import React from "react";
import {
  RiskEntry,
  calculatePRI,
  getPRILevel,
  calculatePRR,
  getPRRLevel,
  getToleranceStatus,
} from "../types";
import { Edit2, Trash2 } from "lucide-react";

interface RiskTableProps {
  risks: RiskEntry[];
  onEdit: (risk: RiskEntry) => void;
  onDelete: (id: string) => void;
}

export default function RiskTable({ risks, onEdit, onDelete }: RiskTableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider"
            >
              ID
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider"
            >
              Zasób / Kategoria
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider"
            >
              Scenariusz
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center font-medium text-slate-500 uppercase tracking-wider"
            >
              PRI (N×P)
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center font-medium text-slate-500 uppercase tracking-wider"
            >
              W
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-center font-medium text-slate-500 uppercase tracking-wider"
            >
              PRR
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left font-medium text-slate-500 uppercase tracking-wider"
            >
              Status / Tolerancja
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right font-medium text-slate-500 uppercase tracking-wider"
            >
              Akcje
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {risks.map((risk) => {
            const pri = calculatePRI(risk.pValue, risk.nValue);
            const priLevel = getPRILevel(pri);
            const prr = calculatePRR(pri, risk.wValue);
            const prrLevel = getPRRLevel(prr);
            const toleranceStatus = getToleranceStatus(prr);

            return (
              <tr key={risk.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap font-mono text-xs text-slate-600">
                  {risk.id}
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-slate-900">
                    {risk.assetName}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    {risk.category}
                  </div>
                </td>
                <td
                  className="px-4 py-4 max-w-xs truncate"
                  title={risk.scenario}
                >
                  {risk.scenario}
                </td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      priLevel === "Niskie"
                        ? "bg-emerald-100 text-emerald-800"
                        : priLevel === "Średnie"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {pri} ({priLevel})
                  </span>
                </td>
                <td className="px-4 py-4 text-center font-mono text-xs text-slate-600">
                  {risk.wValue}
                </td>
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prrLevel === "Niskie"
                        ? "bg-emerald-100 text-emerald-800"
                        : prrLevel === "Średnie"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {prr} ({prrLevel})
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-xs text-slate-700">
                    {toleranceStatus}
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
                    {risk.decision}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right font-medium">
                  <button
                    onClick={() => onEdit(risk)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                    title="Edytuj"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(risk.id)}
                    className="text-rose-600 hover:text-rose-900"
                    title="Usuń"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            );
          })}
          {risks.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                Brak wpisów w rejestrze ryzyk.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
