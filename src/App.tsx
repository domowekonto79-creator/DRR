/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, LayoutDashboard, List, Plus, Server, LogOut, Activity, Settings, Users } from "lucide-react";
import { RiskEntry, IctAsset } from "./types";
import { INITIAL_RISKS } from "./constants";
import Dashboard from "./components/Dashboard";
import RiskTable from "./components/RiskTable";
import RiskForm from "./components/RiskForm";
import IctAssetForm from "./components/IctAssetForm";
import IctAssetTable from "./components/IctAssetTable";
import KlifView from "./components/KlifView";
import ConfigurationView from "./components/ConfigurationView";
import ProvidersView from "./components/ProvidersView";
import SetupScreen from "./components/SetupScreen";
import { getSupabase, clearSupabaseConfig } from "./lib/supabase";

export default function App() {
  const [isConfigured, setIsConfigured] = useState<boolean>(!!getSupabase());
  const [activeTab, setActiveTab] = useState<"dashboard" | "register" | "assets" | "klif" | "config" | "providers">(
    "dashboard",
  );
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskEntry | null>(null);
  
  const [assets, setAssets] = useState<IctAsset[]>([]);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<IctAsset | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      setIsLoading(true);
      const supabase = getSupabase();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch risks
        const { data: risksData, error: risksError } = await supabase.from('risks').select('data');
        if (risksError) throw risksError;

        if (risksData && risksData.length > 0) {
          setRisks(risksData.map(d => d.data));
        } else {
          setRisks(INITIAL_RISKS);
          for (const risk of INITIAL_RISKS) {
            await supabase.from('risks').insert({ id: risk.id, data: risk });
          }
        }

        // Fetch assets
        const { data: assetsData, error: assetsError } = await supabase.from('ict_assets').select('data');
        if (assetsError) throw assetsError;

        if (assetsData && assetsData.length > 0) {
          setAssets(assetsData.map(d => d.data));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        alert("Błąd pobierania danych z Supabase. Sprawdź konfigurację lub czy tabele zostały utworzone.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isConfigured]);

  if (!isConfigured) {
    return <SetupScreen onConfigured={() => setIsConfigured(true)} />;
  }

  const handleAddRisk = () => {
    setEditingRisk(null);
    setIsFormOpen(true);
  };

  const handleEditRisk = (risk: RiskEntry) => {
    setEditingRisk(risk);
    setIsFormOpen(true);
  };

  const handleDeleteRisk = async (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć to ryzyko?")) {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { error } = await supabase.from('risks').delete().eq('id', id);
        if (error) throw error;
        setRisks(risks.filter((r) => r.id !== id));
      } catch (err) {
        console.error("Error deleting risk:", err);
        alert("Błąd podczas usuwania ryzyka.");
      }
    }
  };

  const handleSaveRisk = async (risk: RiskEntry) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('risks').upsert({ id: risk.id, data: risk });
      if (error) throw error;

      if (editingRisk) {
        setRisks(risks.map((r) => (r.id === risk.id ? risk : r)));
      } else {
        setRisks([...risks, risk]);
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error("Error saving risk:", err);
      alert("Błąd podczas zapisywania ryzyka.");
    }
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setIsAssetFormOpen(true);
  };

  const handleEditAsset = (asset: IctAsset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleDeleteAsset = async (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten zasób?")) {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { error } = await supabase.from('ict_assets').delete().eq('id', id);
        if (error) throw error;
        setAssets(assets.filter((a) => a.id !== id));
      } catch (err) {
        console.error("Error deleting asset:", err);
        alert("Błąd podczas usuwania zasobu.");
      }
    }
  };

  const handleSaveAsset = async () => {
    // The actual saving to Supabase happens inside IctAssetForm.
    // Here we just need to refresh the list of assets from Supabase to ensure we have the latest data.
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase.from('ict_assets').select('data');
      if (error) throw error;
      
      if (data) {
        setAssets(data.map(d => d.data));
      }
      setIsAssetFormOpen(false);
    } catch (err) {
      console.error("Error fetching updated assets:", err);
    }
  };

  const handleCancelAsset = () => {
    setIsAssetFormOpen(false);
  };

  const handleLogout = () => {
    clearSupabaseConfig();
    setIsConfigured(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 flex flex-col items-center">
          <Shield className="h-12 w-12 text-indigo-400 mb-4 animate-pulse" />
          Ładowanie danych z Supabase...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-indigo-400 mr-3" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  DORA Risk Register
                </h1>
                <p className="text-xs text-slate-400">
                  Zarządzanie Ryzykiem ICT
                </p>
              </div>
            </div>
            <div className="flex space-x-2 sm:space-x-4">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <LayoutDashboard className="h-4 w-4 mr-2 hidden sm:block" />
                Pulpit
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "register"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <List className="h-4 w-4 mr-2 hidden sm:block" />
                Rejestr
              </button>
              <button
                onClick={() => setActiveTab("assets")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "assets"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Server className="h-4 w-4 mr-2 hidden sm:block" />
                Zasoby ICT
              </button>
              <button
                onClick={() => setActiveTab("klif")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "klif"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Activity className="h-4 w-4 mr-2 hidden sm:block" />
                KLIF
              </button>
              <button
                onClick={() => setActiveTab("providers")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "providers"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4 mr-2 hidden sm:block" />
                Dostawcy
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "config"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Settings className="h-4 w-4 mr-2 hidden sm:block" />
                Konfiguracja
              </button>
              <div className="h-6 w-px bg-slate-700 mx-2"></div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-rose-900/50 hover:text-rose-400 transition-colors"
                title="Odłącz bazę danych"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && <Dashboard risks={risks} />}

        {activeTab === "register" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
                Rejestr Ryzyka ICT
              </h2>
              <button
                onClick={handleAddRisk}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Ryzyko
              </button>
            </div>
            <RiskTable
              risks={risks}
              onEdit={handleEditRisk}
              onDelete={handleDeleteRisk}
            />
          </div>
        )}

        {activeTab === "assets" && (
          <div className="space-y-6">
            {!isAssetFormOpen ? (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
                    Zasoby ICT
                  </h2>
                  <button
                    onClick={handleAddAsset}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj zasób ICT
                  </button>
                </div>
                <IctAssetTable
                  assets={assets}
                  onEdit={handleEditAsset}
                  onDelete={handleDeleteAsset}
                  onCancel={handleCancelAsset}
                />
              </>
            ) : (
              <IctAssetForm
                initialData={editingAsset}
                onSave={handleSaveAsset}
                onCancel={handleCancelAsset}
              />
            )}
          </div>
        )}

        {activeTab === "klif" && <KlifView />}
        {activeTab === "config" && <ConfigurationView />}
        {activeTab === "providers" && <ProvidersView />}
      </main>

      {/* Modals */}
      {isFormOpen && (
        <RiskForm
          initialData={editingRisk}
          onSubmit={handleSaveRisk}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
