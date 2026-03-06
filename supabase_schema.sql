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
END $$;
