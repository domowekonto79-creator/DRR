import React, { useState } from 'react';
import { initSupabase } from '../lib/supabase';
import { Database, Key, Link as LinkIcon, CheckCircle2, Copy } from 'lucide-react';

interface SetupScreenProps {
  onConfigured: () => void;
}

const SQL_SCRIPT = `
-- 1. Tworzenie tabeli dla zasobów ICT
CREATE TABLE IF NOT EXISTS ict_assets (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tworzenie tabeli dla ryzyk
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tworzenie tabel dla KLIF
CREATE TABLE IF NOT EXISTS klif (
  id UUID PRIMARY KEY,
  name TEXT,
  classification_type TEXT,
  classification_justification TEXT,
  owner TEXT,
  owner_unit TEXT,
  classification_methodology TEXT,
  author TEXT,
  financial_impact TEXT,
  regulatory_impact TEXT,
  operational_impact TEXT,
  reputational_impact TEXT,
  rto_value NUMERIC,
  rto_unit TEXT,
  mtpd_value NUMERIC,
  mtpd_unit TEXT,
  mbco_description TEXT,
  drp_status BOOLEAN,
  drp_description TEXT,
  exit_plan_status BOOLEAN,
  redundancy TEXT,
  testing_frequency TEXT,
  last_test_date DATE,
  test_result TEXT,
  last_review_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS klif_procesy (
  id UUID PRIMARY KEY,
  klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS klif_zasoby_ict (
  id UUID PRIMARY KEY,
  klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
  asset_id TEXT,
  asset_name TEXT,
  asset_type TEXT,
  is_spof BOOLEAN
);

CREATE TABLE IF NOT EXISTS klif_dostawcy (
  id UUID PRIMARY KEY,
  klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
  name TEXT,
  service_type TEXT,
  concentration_risk TEXT,
  is_klif_contract BOOLEAN,
  is_subcontractor BOOLEAN
);

CREATE TABLE IF NOT EXISTS klif_zaleznosci (
  id UUID PRIMARY KEY,
  klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
  dependency_klif_id TEXT,
  dependency_klif_name TEXT,
  dependency_type TEXT
);

-- 4. Wyłączenie RLS (Row Level Security) dla ułatwienia testów
-- UWAGA: W środowisku produkcyjnym należy włączyć RLS i skonfigurować polityki!
ALTER TABLE ict_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE klif DISABLE ROW LEVEL SECURITY;
ALTER TABLE klif_procesy DISABLE ROW LEVEL SECURITY;
ALTER TABLE klif_zasoby_ict DISABLE ROW LEVEL SECURITY;
ALTER TABLE klif_dostawcy DISABLE ROW LEVEL SECURITY;
ALTER TABLE klif_zaleznosci DISABLE ROW LEVEL SECURITY;
`;

export default function SetupScreen({ onConfigured }: SetupScreenProps) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      initSupabase(url, key);
      onConfigured();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="flex justify-center">
          <div className="bg-indigo-100 p-3 rounded-full">
            <Database className="h-12 w-12 text-indigo-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          Konfiguracja Bazy Danych (Supabase)
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Aplikacja działa w trybie SPA (bez własnego backendu). Aby zapisywać dane, podłącz własną instancję Supabase.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-200">
          
          <div className="mb-8">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">Krok 1: Przygotowanie bazy danych</h3>
            <p className="text-sm text-slate-600 mb-4">
              Zaloguj się do panelu Supabase, przejdź do zakładki <strong>SQL Editor</strong> i uruchom poniższy kod, aby utworzyć wymagane tabele.
            </p>
            <div className="relative">
              <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-sm overflow-x-auto font-mono">
                {SQL_SCRIPT}
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors flex items-center"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">Krok 2: Podłączenie aplikacji</h3>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-slate-700">
                  Project URL
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="url"
                    name="url"
                    id="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2.5 border"
                    placeholder="https://xxxx.supabase.co"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="key" className="block text-sm font-medium text-slate-700">
                  Project API Key (anon / public)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    name="key"
                    id="key"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2.5 border"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Zapisz konfigurację i uruchom aplikację
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
