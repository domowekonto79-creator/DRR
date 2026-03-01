import React, { useState, useEffect } from 'react';
import { Database, Key, Link as LinkIcon, CheckCircle2, Copy, BookOpen, Save } from 'lucide-react';
import { initSupabase, getSupabase } from '../lib/supabase';

export const SQL_SCRIPT = `
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

-- 5. Tworzenie tabeli dla dostawców ICT
CREATE TABLE IF NOT EXISTS dostawcy_ict (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  autor_wpisu TEXT NOT NULL,
  nazwa_prawna TEXT NOT NULL,
  lei TEXT NOT NULL UNIQUE,
  nip TEXT,
  kraj_rejestracji CHAR(2) NOT NULL,
  adres_siedziby TEXT,
  typ_dostawcy TEXT CHECK (typ_dostawcy IN ('Zewnętrzny','Wewnątrzgrupowy')) NOT NULL,
  czy_grupa_kapitalowa BOOLEAN DEFAULT FALSE,
  nazwa_jednostki_dominujacej TEXT,
  lei_jednostki_dominujacej TEXT,
  czy_kluczowy_dostawca_esa BOOLEAN DEFAULT FALSE,
  numer_referencyjny_umowy TEXT NOT NULL UNIQUE,
  data_zawarcia_umowy DATE NOT NULL,
  data_wygasniecia_umowy DATE,
  opcje_przedluzenia BOOLEAN DEFAULT FALSE,
  opcje_przedluzenia_opis TEXT,
  waluta CHAR(3),
  wartosc_kontraktu NUMERIC,
  prawo_wlasciwe TEXT,
  jurysdykcja_sadu TEXT,
  klauzula_prawo_audytu BOOLEAN DEFAULT FALSE,
  klauzula_prawo_wypowiedzenia BOOLEAN DEFAULT FALSE,
  klauzula_raportowanie_incydentow BOOLEAN DEFAULT FALSE,
  klauzula_sla BOOLEAN DEFAULT FALSE,
  klauzula_bcp_dostawcy BOOLEAN DEFAULT FALSE,
  klauzula_zmiany_podwykonawcow BOOLEAN DEFAULT FALSE,
  zakres_umowy JSONB DEFAULT '[]'::jsonb,
  kraje_przetwarzania TEXT[],
  kraje_przechowywania TEXT[],
  czy_poza_eog BOOLEAN DEFAULT FALSE,
  uzasadnienie_poza_eog TEXT,
  typy_danych TEXT[],
  model_wdrozenia TEXT CHECK (model_wdrozenia IN ('Chmura publiczna', 'Chmura prywatna', 'Chmura hybrydowa', 'On-premise', 'Mieszany')),
  ryzyko_koncentracji TEXT CHECK (ryzyko_koncentracji IN ('Niskie', 'Średnie', 'Wysokie')),
  zastepowanosc TEXT CHECK (zastepowanosc IN ('Łatwa', 'Trudna', 'Niemożliwa')),
  alternatywni_dostawcy TEXT,
  ocena_ryzyka_wartosc NUMERIC,
  ocena_ryzyka_uzasadnienie TEXT,
  wplyw_poufnosc TEXT CHECK (wplyw_poufnosc IN ('Niski', 'Średni', 'Wysoki', 'Krytyczny')),
  wplyw_integralnosc TEXT CHECK (wplyw_integralnosc IN ('Niski', 'Średni', 'Wysoki', 'Krytyczny')),
  wplyw_dostepnosc TEXT CHECK (wplyw_dostepnosc IN ('Niski', 'Średni', 'Wysoki', 'Krytyczny')),
  data_ostatniej_oceny DATE,
  data_kolejnego_przegladu DATE,
  rto_wartosc INTEGER,
  rto_jednostka TEXT CHECK (rto_jednostka IN ('minuty', 'godziny', 'dni')),
  rpo_wartosc INTEGER,
  rpo_jednostka TEXT CHECK (rpo_jednostka IN ('minuty', 'godziny', 'dni')),
  czy_certyfikowany_bcp BOOLEAN DEFAULT FALSE,
  bcp_certyfikat TEXT,
  exit_plan_okres_wypowiedzenia INTEGER,
  exit_plan_opis_migracji TEXT,
  exit_plan_ryzyko_danych TEXT,
  exit_plan_czas_migracji_dni INTEGER,
  prawo_audytu_status BOOLEAN DEFAULT FALSE,
  data_ostatniego_audytu DATE,
  wynik_audytu TEXT CHECK (wynik_audytu IN ('Pozytywny', 'Z zastrzeżeniami', 'Negatywny')),
  data_ostatniego_przegladu DATE,
  uwagi TEXT
);
ALTER TABLE dostawcy_ict DISABLE ROW LEVEL SECURITY;

-- 6. Aktualizacja schematu (jeśli tabela już istnieje)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dostawcy_ict' AND column_name = 'zakres_umowy') THEN
        ALTER TABLE dostawcy_ict ADD COLUMN zakres_umowy JSONB DEFAULT '[]'::jsonb;
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
