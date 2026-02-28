import { RiskEntry } from "./types";

export const CATEGORIES = [
  "Bezpieczeństwo informacji",
  "Cyberzagrożenia",
  "Podatności",
  "Awarie i błędy",
  "Nieuprawniony dostęp",
  "Utrata dostępności",
  "Utrata integralności",
  "Utrata poufności",
  "Utrata autentyczności",
  "Zależności od dostawców",
];

export const DECISIONS = [
  "minimalizacja",
  "unikanie",
  "dzielenie",
  "akceptacja",
];

export const ACTION_STATUSES = [
  "planowane",
  "w trakcie",
  "zakończone",
  "opóźnione",
];

export const INITIAL_RISKS: RiskEntry[] = [
  {
    id: "R-ICT-001",
    assetName: "System transakcyjny",
    assetId: "SYS-001",
    category: "Utrata dostępności",
    scenario:
      "Awaria głównego serwera bazy danych powodująca niedostępność systemu dla klientów.",
    criticalFunction: "Obsługa transakcji klientów",
    consequenceDesc:
      "Brak możliwości realizacji transakcji, straty finansowe, utrata reputacji.",
    nValue: 9,
    pValue: 3,
    mitigants:
      "Klaster HA bazy danych, regularne kopie zapasowe, testy odtwarzania.",
    wValue: 0.4,
    decision: "minimalizacja",
    justification: "",
    treatmentPlan:
      "Wdrożenie dodatkowego węzła w klastrze w lokalizacji zapasowej.",
    riskOwner: "Dyrektor IT",
    deadline: "2026-12-31",
    actionStatus: "planowane",
    lastReviewDate: "2026-01-15",
    nextReviewDate: "2027-01-15",
    comments:
      "Zgodnie z DORA, testy ciągłości działania muszą być przeprowadzane co najmniej raz w roku.",
  },
  {
    id: "R-ICT-002",
    assetName: "Dane osobowe klientów",
    assetId: "DB-002",
    category: "Cyberzagrożenia",
    scenario: "Atak ransomware szyfrujący dane i żądający okupu.",
    criticalFunction: "Zarządzanie danymi klientów",
    consequenceDesc: "Naruszenie RODO, kary finansowe, utrata zaufania.",
    nValue: 9,
    pValue: 4,
    mitigants:
      "System EDR, segmentacja sieci, szkolenia pracowników z zakresu phishingu.",
    wValue: 0.2,
    decision: "minimalizacja",
    justification: "",
    treatmentPlan:
      "Zwiększenie częstotliwości szkoleń, wdrożenie rozwiązania klasy XDR.",
    riskOwner: "CISO / PBI",
    deadline: "2026-06-30",
    actionStatus: "w trakcie",
    lastReviewDate: "2026-02-01",
    nextReviewDate: "2026-08-01",
    comments:
      "Wymaga priorytetowego traktowania i eskalacji w przypadku incydentu.",
  },
  {
    id: "R-ICT-003",
    assetName: "Aplikacja mobilna",
    assetId: "APP-003",
    category: "Podatności",
    scenario:
      "Wykorzystanie znanej podatności (0-day) w bibliotece open-source używanej w aplikacji.",
    criticalFunction: "Dostęp mobilny do usług",
    consequenceDesc: "Przejęcie kont użytkowników, nieautoryzowane operacje.",
    nValue: 6,
    pValue: 3,
    mitigants: "Skanowanie podatności w procesie CI/CD, WAF.",
    wValue: 0.7,
    decision: "akceptacja",
    justification:
      "Ryzyko rezydualne na poziomie średnim, wdrożenie dodatkowych kontroli nieproporcjonalne do kosztów.",
    treatmentPlan: "Monitorowanie biuletynów bezpieczeństwa.",
    riskOwner: "Kierownik Rozwoju Oprogramowania",
    deadline: "2026-03-31",
    actionStatus: "zakończone",
    lastReviewDate: "2026-02-10",
    nextReviewDate: "2027-02-10",
    comments: "Zarząd zaakceptował ryzyko rezydualne na poziomie 12.6.",
  },
];
