export interface RiskEntry {
  id: string;
  assetName: string;
  assetId: string;
  category: string;
  scenario: string;
  criticalFunction: string;
  consequenceDesc: string;
  nValue: 3 | 6 | 9;
  pValue: 1 | 2 | 3 | 4 | 5;
  mitigants: string;
  wValue: 0.2 | 0.4 | 0.7 | 1;
  decision: "minimalizacja" | "unikanie" | "dzielenie" | "akceptacja" | "";
  justification: string;
  treatmentPlan: string;
  riskOwner: string;
  deadline: string;
  actionStatus: "planowane" | "w trakcie" | "zakończone" | "opóźnione" | "";
  lastReviewDate: string;
  nextReviewDate: string;
  comments: string;
}

export interface IctProvider {
  id: string;
  name: string;
  serviceType: string;
}

export interface BusinessFunction {
  id: string;
  name: string;
}

export interface IctRisk {
  id: string;
  description: string;
  remediationStatus: string;
}

export interface IctVulnerability {
  id: string;
  cveId: string;
  description: string;
  status: string;
}

export interface RelatedAsset {
  id: string;
  assetId: string;
  assetName: string;
}



export interface ZakresUmowy {
  id: string;
  rodzaj_postanowienia: string;
  kategoria_uslugi: string;
}

export interface DostawcaICT {
  id: string;
  created_at: string;
  updated_at: string;
  autor_wpisu: string;
  nazwa_prawna: string;
  lei: string;
  nip?: string;
  kraj_rejestracji: string;
  adres_siedziby?: string;
  typ_dostawcy: 'Zewnętrzny' | 'Wewnątrzgrupowy';
  czy_grupa_kapitalowa: boolean;
  nazwa_jednostki_dominujacej?: string;
  lei_jednostki_dominujacej?: string;
  czy_kluczowy_dostawca_esa: boolean;
  numer_referencyjny_umowy: string;
  data_zawarcia_umowy: string;
  data_wygasniecia_umowy?: string;
  opcje_przedluzenia: boolean;
  opcje_przedluzenia_opis?: string;
  waluta?: string;
  wartosc_kontraktu?: number;
  prawo_wlasciwe?: string;
  jurysdykcja_sadu?: string;
  zakres_umowy?: ZakresUmowy[];
  klauzula_prawo_audytu: boolean;
  klauzula_prawo_wypowiedzenia: boolean;
  klauzula_raportowanie_incydentow: boolean;
  klauzula_sla: boolean;
  klauzula_bcp_dostawcy: boolean;
  klauzula_zmiany_podwykonawcow: boolean;
  kraje_przetwarzania: string[];
  kraje_przechowywania: string[];
  czy_poza_eog: boolean;
  uzasadnienie_poza_eog?: string;
  typy_danych: string[];
  model_wdrozenia?: 'Chmura publiczna' | 'Chmura prywatna' | 'Chmura hybrydowa' | 'On-premise' | 'Mieszany';
  ryzyko_koncentracji?: 'Niskie' | 'Średnie' | 'Wysokie';
  zastepowanosc?: 'Łatwa' | 'Trudna' | 'Niemożliwa';
  alternatywni_dostawcy?: string;
  ocena_ryzyka_wartosc?: number;
  ocena_ryzyka_uzasadnienie?: string;
  wplyw_poufnosc?: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny';
  wplyw_integralnosc?: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny';
  wplyw_dostepnosc?: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny';
  data_ostatniej_oceny?: string;
  data_kolejnego_przegladu?: string;
  rto_wartosc?: number;
  rto_jednostka?: 'minuty' | 'godziny' | 'dni';
  rpo_wartosc?: number;
  rpo_jednostka?: 'minuty' | 'godziny' | 'dni';
  czy_certyfikowany_bcp: boolean;
  bcp_certyfikat?: string;
  exit_plan_okres_wypowiedzenia?: number;
  exit_plan_opis_migracji?: string;
  exit_plan_ryzyko_danych?: string;
  exit_plan_czas_migracji_dni?: number;
  prawo_audytu_status: boolean;
  data_ostatniego_audytu?: string;
  wynik_audytu?: 'Pozytywny' | 'Z zastrzeżeniami' | 'Negatywny';
  data_ostatniego_przegladu?: string;
  uwagi?: string;
}

export interface UslugaICT {
  id: string;
  dostawca_id: string;
  identyfikator_uslugi: string;
  kategoria_uslugi: string;
  opis_uslugi?: string;
  czy_wspiera_klif: boolean;
}

export interface PowiazanieKLIF {
  id: string;
  dostawca_id: string;
  usluga_id: string;
  klif_id?: string;
  klif_nazwa: string;
  numer_referencyjny_umowy: string;
}

export interface Podwykonawca {
  id: string;
  dostawca_id: string;
  nazwa_poddostawcy: string;
  lei_poddostawcy?: string;
  kraj?: string;
  kategoria_uslugi?: string;
  ranga_lancucha: number;
}

export interface IctAsset {
  id: string;
  name: string;
  category: "Sprzęt" | "Oprogramowanie" | "Usługa ICT" | "Zasób informacyjny" | "Sieć" | "Inne" | "";
  lifecycleStatus: "Nabycie" | "Eksploatacja" | "Konserwacja" | "Wycofanie" | "";
  deploymentDate: string;
  retirementDate: string;
  isLegacy: boolean;
  legacyJustification: string;

  owner: string;
  ownerUnit: string;
  physicalLocation: string;
  logicalLocation: string;
  externalNetworkExposure: "Tak" | "Nie" | "Częściowe" | "";
  providers: IctProvider[];

  businessFunctions: BusinessFunction[];
  criticality: "Krytyczna" | "Ważna" | "Standardowa" | "";
  criticalityJustification: string;

  rtoValue: number | "";
  rtoUnit: "minuty" | "godziny" | "dni";
  rpoValue: number | "";
  rpoUnit: "minuty" | "godziny" | "dni";
  confidentialityImpact: "Niski" | "Średni" | "Wysoki" | "Krytyczny" | "";
  integrityImpact: "Niski" | "Średni" | "Wysoki" | "Krytyczny" | "";
  availabilityImpact: "Niski" | "Średni" | "Wysoki" | "Krytyczny" | "";
  risks: IctRisk[];

  accessControlMfa: boolean;
  accessControlLeastPrivilege: boolean;
  accessControlPam: boolean;
  accessControlSso: boolean;
  encryptionAtRest: "Tak" | "Nie" | "Częściowe" | "";
  encryptionInTransit: "Tak" | "Nie" | "Częściowe" | "";
  cryptoStandard: string;
  vulnerabilities: IctVulnerability[];

  relatedAssets: RelatedAsset[];
  dataFlowIn: string;
  dataFlowOut: string;
  dataAtRestDesc: string;

  registryAddDate: string;
  lastUpdateDate: string;
  author: string;
  notes: string;
}

export interface KlifProcess {
  id: string;
  klif_id?: string;
  name: string;
  description: string;
}

export interface KlifIctAsset {
  id: string;
  klif_id?: string;
  asset_id: string;
  asset_name: string;
  asset_type: string;
  is_spof: boolean;
}

export interface KlifProvider {
  id: string;
  klif_id?: string;
  name: string;
  service_type: string;
  concentration_risk: 'Niskie' | 'Średnie' | 'Wysokie' | '';
  is_klif_contract: boolean;
  is_subcontractor: boolean;
}

export interface KlifDependency {
  id: string;
  klif_id?: string;
  dependency_klif_id: string;
  dependency_klif_name: string;
  dependency_type: string;
}

export interface Klif {
  id: string;
  name: string;
  classification_type: 'Krytyczna' | 'Istotna' | 'Wspierająca' | '';
  classification_justification: string;
  owner: string;
  owner_unit: string;
  classification_methodology: 'BIA' | 'RTO-based' | 'Hybrydowa' | 'Inna' | '';
  author: string;

  financial_impact: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny' | '';
  regulatory_impact: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny' | '';
  operational_impact: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny' | '';
  reputational_impact: 'Niski' | 'Średni' | 'Wysoki' | 'Krytyczny' | '';
  
  rto_value: number | '';
  rto_unit: 'minuty' | 'godziny' | 'dni';
  mtpd_value: number | '';
  mtpd_unit: 'minuty' | 'godziny' | 'dni';
  mbco_description: string;

  drp_status: boolean;
  drp_description: string;
  exit_plan_status: boolean;
  redundancy: 'Pełna' | 'Częściowa' | 'Brak' | '';
  testing_frequency: string;
  last_test_date: string;
  test_result: string;
  last_review_date: string;
  notes: string;

  processes: KlifProcess[];
  ict_assets: KlifIctAsset[];
  providers: KlifProvider[];
  dependencies: KlifDependency[];
}

export function calculatePRI(p: number, n: number): number {
  return p * n;
}

export function getPRILevel(pri: number): "Niskie" | "Średnie" | "Wysokie" {
  if (pri <= 8) return "Niskie";
  if (pri <= 23) return "Średnie";
  return "Wysokie";
}

export function calculatePRR(pri: number, w: number): number {
  return Number((pri * w).toFixed(2));
}

export function getPRRLevel(prr: number): "Niskie" | "Średnie" | "Wysokie" {
  if (prr <= 8) return "Niskie";
  if (prr < 21) return "Średnie";
  return "Wysokie";
}

export function getToleranceStatus(prr: number): string {
  if (prr <= 8) return "W granicach tolerancji";
  if (prr < 21) return "W granicach tolerancji, wymaga wzmocnionego nadzoru";
  return "Poza tolerancją (nieakceptowalne)";
}
