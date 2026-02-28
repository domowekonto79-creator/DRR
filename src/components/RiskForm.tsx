import React, { useState, useEffect } from "react";
import { RiskEntry, calculatePRI, calculatePRR, getPRRLevel, IctAsset, Klif } from "../types";
import { CATEGORIES, DECISIONS, ACTION_STATUSES } from "../constants";
import { X, Save } from "lucide-react";
import { getSupabase } from "../lib/supabase";

interface RiskFormProps {
  initialData?: RiskEntry | null;
  onSubmit: (data: RiskEntry) => void;
  onCancel: () => void;
}

const generateRiskId = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RYZ-${year}-${randomNum}`;
};

const DEFAULT_RISK: RiskEntry = {
  id: "",
  assetName: "",
  assetId: "",
  category: CATEGORIES[0],
  scenario: "",
  criticalFunction: "",
  consequenceDesc: "",
  nValue: 3,
  pValue: 1,
  mitigants: "",
  wValue: 1,
  decision: "",
  justification: "",
  treatmentPlan: "",
  riskOwner: "",
  deadline: "",
  actionStatus: "",
  lastReviewDate: new Date().toISOString().split("T")[0],
  nextReviewDate: "",
  comments: "",
};

export default function RiskForm({
  initialData,
  onSubmit,
  onCancel,
}: RiskFormProps) {
  const [formData, setFormData] = useState<RiskEntry>(
    initialData || { ...DEFAULT_RISK, id: generateRiskId() },
  );
  const [assets, setAssets] = useState<IctAsset[]>([]);
  const [klifs, setKlifs] = useState<Klif[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ ...DEFAULT_RISK, id: generateRiskId() });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const [assetsResponse, klifsResponse] = await Promise.all([
          supabase.from('ict_assets').select('*'),
          supabase.from('klif').select('*')
        ]);

        if (assetsResponse.data) {
          setAssets(assetsResponse.data.map((row: any) => row.data as IctAsset));
        }
        if (klifsResponse.data) {
          setKlifs(klifsResponse.data as Klif[]);
        }
      } catch (error) {
        console.error("Error fetching data for RiskForm:", error);
      }
    };

    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    let parsedValue: any = value;
    if (name === "nValue" || name === "pValue") {
      parsedValue = parseInt(value, 10);
    } else if (name === "wValue") {
      parsedValue = parseFloat(value);
    }

    setFormData((prev) => {
      const newData = { ...prev, [name]: parsedValue };
      
      // Auto-fill assetId when assetName changes
      if (name === "assetName") {
        const selectedAsset = assets.find(a => a.name === value);
        if (selectedAsset) {
          newData.assetId = selectedAsset.id;
        } else {
          newData.assetId = "";
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const pri = calculatePRI(formData.pValue, formData.nValue);
  const prr = calculatePRR(pri, formData.wValue);
  const prrLevel = getPRRLevel(prr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">
            {initialData ? "Edytuj Ryzyko" : "Dodaj Nowe Ryzyko"}
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="risk-form" onSubmit={handleSubmit} className="space-y-8">
            {/* Sekcja 1: Identyfikacja */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                1. Identyfikacja
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ID Ryzyka
                  </label>
                  <input
                    required
                    type="text"
                    name="id"
                    value={formData.id}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="np. R-ICT-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Zasób ICT / Informacyjny
                  </label>
                  <select
                    required
                    name="assetName"
                    value={formData.assetName}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz zasób...</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.name}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ID Zasobu
                  </label>
                  <input
                    type="text"
                    name="assetId"
                    value={formData.assetId}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-slate-50"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kategoria Ryzyka ICT
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Proces / Funkcja Krytyczna (KLIF)
                  </label>
                  <select
                    name="criticalFunction"
                    value={formData.criticalFunction}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz funkcję...</option>
                    {klifs.map((klif) => (
                      <option key={klif.id} value={klif.name}>
                        {klif.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Scenariusz Ryzyka / Opis
                </label>
                <textarea
                  required
                  name="scenario"
                  value={formData.scenario}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Następstwo (Opis)
                </label>
                <textarea
                  required
                  name="consequenceDesc"
                  value={formData.consequenceDesc}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
            </div>

            {/* Sekcja 2: Szacowanie Ryzyka */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                2. Szacowanie Ryzyka
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Prawdopodobieństwo (P)
                  </label>
                  <select
                    name="pValue"
                    value={formData.pValue}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value={1}>1 - Bardzo niskie</option>
                    <option value={2}>2 - Niskie</option>
                    <option value={3}>3 - Średnie</option>
                    <option value={4}>4 - Wysokie</option>
                    <option value={5}>5 - Bardzo wysokie</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Następstwo (N)
                  </label>
                  <select
                    name="nValue"
                    value={formData.nValue}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value={3}>3 - Niski</option>
                    <option value={6}>6 - Średni</option>
                    <option value={9}>9 - Wysoki</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Poziom Ryzyka Inherentnego (PRI = P × N)
                  </div>
                  <div className="text-lg font-mono font-semibold text-slate-900">
                    {pri}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mityganty Ryzyka (Kontrole)
                </label>
                <textarea
                  name="mitigants"
                  value={formData.mitigants}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Współczynnik Ograniczający (W)
                  </label>
                  <select
                    name="wValue"
                    value={formData.wValue}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value={0.2}>0.2 - Znaczące obniżenie</option>
                    <option value={0.4}>0.4 - Istotne obniżenie</option>
                    <option value={0.7}>0.7 - Nieznaczne obniżenie</option>
                    <option value={1}>1.0 - Brak obniżenia</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-medium text-slate-500 mb-1">
                    Poziom Ryzyka Rezydualnego (PRR = PRI × W)
                  </div>
                  <div
                    className={`text-lg font-mono font-semibold ${prrLevel === "Wysokie" ? "text-rose-600" : "text-slate-900"}`}
                  >
                    {prr} ({prrLevel})
                  </div>
                </div>
              </div>
            </div>

            {/* Sekcja 3: Postępowanie */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                3. Postępowanie z Ryzykiem
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Decyzja
                  </label>
                  <select
                    name="decision"
                    value={formData.decision}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    {DECISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Uzasadnienie (dla akceptacji)
                  </label>
                  <input
                    type="text"
                    name="justification"
                    value={formData.justification}
                    onChange={handleChange}
                    disabled={formData.decision !== "akceptacja"}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Plan Postępowania - Działania
                </label>
                <textarea
                  name="treatmentPlan"
                  value={formData.treatmentPlan}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Właściciel Ryzyka
                  </label>
                  <input
                    type="text"
                    name="riskOwner"
                    value={formData.riskOwner}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Termin Realizacji
                  </label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Status Działań
                  </label>
                  <select
                    name="actionStatus"
                    value={formData.actionStatus}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    {ACTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Ostatniego Przeglądu
                  </label>
                  <input
                    type="date"
                    name="lastReviewDate"
                    value={formData.lastReviewDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Data Następnego Przeglądu
                  </label>
                  <input
                    type="date"
                    name="nextReviewDate"
                    value={formData.nextReviewDate}
                    onChange={handleChange}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Uwagi
                </label>
                <textarea
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            form="risk-form"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Save className="h-4 w-4 mr-2" />
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}
