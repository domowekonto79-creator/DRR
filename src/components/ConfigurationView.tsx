import React, { useState, useEffect } from 'react';
import { Database, Key, Link as LinkIcon, CheckCircle2, Copy, BookOpen, Save } from 'lucide-react';
import { initSupabase, getSupabase } from '../lib/supabase';

export const SQL_SCRIPT = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    manager_id UUID,
    is_critical_unit BOOLEAN DEFAULT FALSE,
    recovery_time_objective TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    position TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    security_role TEXT,
    is_key_personnel BOOLEAN DEFAULT FALSE,
    last_security_training_date DATE,
    background_check_status TEXT,
    employment_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ICT Assets Table (JSONB based)
CREATE TABLE IF NOT EXISTS ict_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Risks Table (JSONB based)
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Providers Table (Column based)
CREATE TABLE IF NOT EXISTS dostawcy_ict (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    autor_wpisu TEXT,
    nazwa_prawna TEXT NOT NULL,
    lei TEXT,
    nip TEXT,
    kraj_rejestracji TEXT,
    adres_siedziby TEXT,
    typ_dostawcy TEXT,
    czy_grupa_kapitalowa BOOLEAN DEFAULT FALSE,
    nazwa_jednostki_dominujacej TEXT,
    lei_jednostki_dominujacej TEXT,
    czy_kluczowy_dostawca_esa BOOLEAN DEFAULT FALSE,
    numer_referencyjny_umowy TEXT,
    data_zawarcia_umowy DATE,
    data_wygasniecia_umowy DATE,
    opcje_przedluzenia BOOLEAN DEFAULT FALSE,
    opcje_przedluzenia_opis TEXT,
    waluta TEXT,
    wartosc_kontraktu NUMERIC,
    prawo_wlasciwe TEXT,
    jurysdykcja_sadu TEXT,
    klauzula_prawo_audytu BOOLEAN DEFAULT FALSE,
    klauzula_prawo_wypowiedzenia BOOLEAN DEFAULT FALSE,
    klauzula_raportowanie_incydentow BOOLEAN DEFAULT FALSE,
    klauzula_sla BOOLEAN DEFAULT FALSE,
    klauzula_bcp_dostawcy BOOLEAN DEFAULT FALSE,
    klauzula_zmiany_podwykonawcow BOOLEAN DEFAULT FALSE,
    kraje_przetwarzania TEXT[],
    kraje_przechowywania TEXT[],
    czy_poza_eog BOOLEAN DEFAULT FALSE,
    uzasadnienie_poza_eog TEXT,
    typy_danych TEXT[],
    model_wdrozenia TEXT,
    ryzyko_koncentracji TEXT,
    zastepowanosc TEXT,
    alternatywni_dostawcy TEXT,
    ocena_ryzyka_wartosc NUMERIC,
    ocena_ryzyka_uzasadnienie TEXT,
    wplyw_poufnosc TEXT,
    wplyw_integralnosc TEXT,
    wplyw_dostepnosc TEXT,
    data_ostatniej_oceny DATE,
    data_kolejnego_przegladu DATE,
    rto_wartosc NUMERIC,
    rto_jednostka TEXT,
    rpo_wartosc NUMERIC,
    rpo_jednostka TEXT,
    czy_certyfikowany_bcp BOOLEAN DEFAULT FALSE,
    bcp_certyfikat TEXT,
    exit_plan_okres_wypowiedzenia NUMERIC,
    exit_plan_opis_migracji TEXT,
    exit_plan_ryzyko_danych TEXT,
    exit_plan_czas_migracji_dni NUMERIC,
    prawo_audytu_status BOOLEAN DEFAULT FALSE,
    data_ostatniego_audytu DATE,
    wynik_audytu TEXT,
    data_ostatniego_przegladu DATE,
    uwagi TEXT
);

-- 6. KLIF Table (Column based)
CREATE TABLE IF NOT EXISTS klif (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
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
    drp_status BOOLEAN DEFAULT FALSE,
    drp_description TEXT,
    exit_plan_status BOOLEAN DEFAULT FALSE,
    redundancy TEXT,
    testing_frequency TEXT,
    last_test_date DATE,
    test_result TEXT,
    last_review_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. KLIF Relations
CREATE TABLE IF NOT EXISTS klif_procesy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS klif_zasoby_ict (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
    asset_id UUID,
    asset_name TEXT,
    asset_type TEXT,
    is_spof BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS klif_dostawcy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
    name TEXT,
    service_type TEXT,
    concentration_risk TEXT,
    is_klif_contract BOOLEAN DEFAULT FALSE,
    is_subcontractor BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS klif_zaleznosci (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    klif_id UUID REFERENCES klif(id) ON DELETE CASCADE,
    dependency_klif_id UUID,
    dependency_klif_name TEXT,
    dependency_type TEXT
);

-- 8. Incidents Table (JSONB based relations)
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT, -- 'Rejestracja', 'Analiza', 'Mitygacja', 'Zamknięty'
    severity TEXT, -- 'Niski', 'Średni', 'Wysoki', 'Krytyczny'
    is_major_incident BOOLEAN DEFAULT FALSE, -- DORA definition
    uksc_incident_type TEXT, -- 'Brak', 'Zwykły', 'Istotny', 'Poważny', 'Krytyczny'
    
    -- Dates
    detection_date TIMESTAMPTZ,
    occurrence_date TIMESTAMPTZ,
    resolution_date TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- DORA Classification Criteria
    affected_clients_count INTEGER,
    affected_clients_percent NUMERIC,
    data_loss_type TEXT, -- 'Brak', 'Poufność', 'Integralność', 'Dostępność', 'Wiele'
    financial_impact_value NUMERIC,
    reputational_impact TEXT, -- 'Brak', 'Niski', 'Średni', 'Wysoki'
    geographic_spread TEXT, -- 'Lokalny', 'Krajowy', 'Transgraniczny (UE)', 'Globalny'
    
    -- Relations (stored as JSONB arrays of objects {id, name})
    related_assets JSONB DEFAULT '[]'::jsonb,
    related_providers JSONB DEFAULT '[]'::jsonb,
    related_klifs JSONB DEFAULT '[]'::jsonb,
    
    -- ISO 27001 & RCA
    root_cause_category TEXT,
    root_cause_description TEXT,
    actions_taken TEXT,
    lessons_learned TEXT,
    
    -- Reporting
    reported_to_knf BOOLEAN DEFAULT FALSE,
    reported_to_csirt BOOLEAN DEFAULT FALSE,
    reporting_date TIMESTAMPTZ,
    
    -- Assignment & Tracking
    assigned_to TEXT,
    involved_persons TEXT[],
    audit_log JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    author TEXT
);

-- RLS Policies (Simplified for dev)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ict_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dostawcy_ict ENABLE ROW LEVEL SECURITY;
ALTER TABLE klif ENABLE ROW LEVEL SECURITY;
ALTER TABLE klif_procesy ENABLE ROW LEVEL SECURITY;
ALTER TABLE klif_zasoby_ict ENABLE ROW LEVEL SECURITY;
ALTER TABLE klif_dostawcy ENABLE ROW LEVEL SECURITY;
ALTER TABLE klif_zaleznosci ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    -- Departments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'departments' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON departments FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Employees policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON employees FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- ICT Assets policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ict_assets' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON ict_assets FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Risks policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'risks' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON risks FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Providers policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dostawcy_ict' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON dostawcy_ict FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- KLIF policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klif' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON klif FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- KLIF Relations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klif_procesy' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON klif_procesy FOR ALL USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klif_zasoby_ict' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON klif_zasoby_ict FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klif_dostawcy' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON klif_dostawcy FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'klif_zaleznosci' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON klif_zaleznosci FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Incidents policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'incidents' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON incidents FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
`;

export default function ConfigurationView() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_key');
    if (savedUrl) setUrl(savedUrl);
    if (savedKey) setKey(savedKey);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      setSaveStatus('saving');
      try {
        initSupabase(url, key);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err) {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
          Konfiguracja Systemu
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolumna lewa - Formularz i SQL */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Sekcja: Podłączenie bazy danych */}
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <Database className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Połączenie z bazą danych (Supabase)</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Wprowadź dane dostępowe do swojego projektu Supabase. Dane te są zapisywane wyłącznie w pamięci Twojej przeglądarki (localStorage).
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-slate-700">Project URL</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="url"
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                      placeholder="https://twoj-projekt.supabase.co"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="key" className="block text-sm font-medium text-slate-700">API Key (anon public)</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      id="key"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md p-2 border"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5c..."
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    {saveStatus === 'saving' ? 'Zapisywanie...' : 
                     saveStatus === 'success' ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Zapisano pomyślnie</> : 
                     <><Save className="h-4 w-4 mr-2" /> Zapisz konfigurację</>}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sekcja: Skrypt SQL */}
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-medium text-slate-900">Skrypt inicjalizujący bazę danych</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Skopiuj poniższy kod SQL i uruchom go w zakładce <strong>SQL Editor</strong> w panelu Supabase, aby utworzyć niezbędne tabele dla aplikacji.
              </p>
              <div className="relative">
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg text-xs overflow-x-auto font-mono max-h-96">
                  {SQL_SCRIPT}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors flex items-center"
                  title="Kopiuj do schowka"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Kolumna prawa - Dokumentacja */}
        <div className="space-y-8">
          <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden sticky top-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center">
              <BookOpen className="h-5 w-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Dokumentacja</h3>
            </div>
            <div className="p-6 prose prose-sm prose-slate max-w-none">
              <h4 className="text-base font-semibold text-slate-800 mt-0">Pierwsze kroki</h4>
              <ol className="list-decimal pl-4 space-y-2 text-slate-600">
                <li>Załóż darmowe konto na <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Supabase</a>.</li>
                <li>Utwórz nowy projekt.</li>
                <li>Skopiuj <strong>Project URL</strong> oraz <strong>anon public API Key</strong> z ustawień projektu (Settings &gt; API).</li>
                <li>Wklej dane w formularzu obok i zapisz.</li>
                <li>Przejdź do <strong>SQL Editor</strong> w Supabase, wklej skrypt inicjalizujący i uruchom go (Run).</li>
              </ol>

              <h4 className="text-base font-semibold text-slate-800 mt-6">Moduły aplikacji</h4>
              
              <ul className="list-disc pl-4 space-y-3 text-slate-600">
                <li>
                  <strong>Pulpit:</strong> Główne zestawienie statystyk i wykresów obrazujących stan ryzyk ICT w organizacji.
                </li>
                <li>
                  <strong>Rejestr Ryzyka:</strong> Lista zidentyfikowanych ryzyk ICT. Pozwala na dodawanie, edycję i ocenę ryzyk (prawdopodobieństwo x wpływ) oraz planowanie działań mitygujących.
                </li>
                <li>
                  <strong>Zasoby ICT:</strong> Ewidencja sprzętu, oprogramowania i usług. Zgodnie z wymogami DORA, pozwala na śledzenie cyklu życia, właścicieli i powiązań z dostawcami.
                </li>
                <li>
                  <strong>KLIF:</strong> Rejestr Kluczowych i Ważnych Funkcji. Pozwala na przeprowadzenie analizy BIA (Business Impact Analysis), określenie parametrów RTO/MTPD oraz mapowanie zależności od procesów, zasobów i dostawców.
                </li>
              </ul>

              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h5 className="text-sm font-semibold text-amber-800 mb-1">Ważna uwaga bezpieczeństwa</h5>
                <p className="text-xs text-amber-700 m-0">
                  Domyślny skrypt SQL wyłącza zabezpieczenia RLS (Row Level Security) dla ułatwienia testów. W środowisku produkcyjnym należy bezwzględnie włączyć RLS i skonfigurować polityki dostępu!
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
