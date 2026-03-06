import React, { useState, useEffect } from 'react';
import { Incident, IctAsset, DostawcaICT, Klif, Employee } from '../types';
import { getSupabase } from '../lib/supabase';
import { Save, X, AlertCircle, Calculator, AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';

interface IncidentFormProps {
  initialData?: Incident | null;
  onSave: (shouldClose?: boolean) => void;
  onCancel: () => void;
}

const DEFAULT_INCIDENT: Incident = {
  id: '',
  title: '',
  description: '',
  status: 'Rejestracja',
  severity: 'Niski',
  is_major_incident: false,
  uksc_incident_type: 'Brak',
  detection_date: new Date().toISOString().slice(0, 16),
  occurrence_date: new Date().toISOString().slice(0, 16),
  data_loss_type: 'Brak',
  reputational_impact: 'Brak',
  geographic_spread: 'Lokalny',
  related_assets: [],
  related_providers: [],
  related_klifs: [],
  root_cause_category: 'Inne',
  reported_to_knf: false,
  reported_to_csirt: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  author: ''
};

export default function IncidentForm({ initialData: initialDataProp, onSave, onCancel }: IncidentFormProps) {
  const [initialData, setInitialData] = useState(initialDataProp);
  const [formData, setFormData] = useState<Incident>(
    initialData || { ...DEFAULT_INCIDENT, id: crypto.randomUUID() }
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Data for relations
  const [assets, setAssets] = useState<IctAsset[]>([]);
  const [providers, setProviders] = useState<DostawcaICT[]>([]);
  const [klifs, setKlifs] = useState<Klif[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      const [assetsRes, providersRes, klifsRes, empsRes] = await Promise.all([
        supabase.from('ict_assets').select('data'),
        supabase.from('dostawcy_ict').select('*'),
        supabase.from('klif').select('*'),
        supabase.from('employees').select('*')
      ]);

      if (assetsRes.data) setAssets(assetsRes.data.map((row: any) => row.data as IctAsset));
      if (providersRes.data) setProviders(providersRes.data as DostawcaICT[]);
      if (klifsRes.data) setKlifs(klifsRes.data as Klif[]);
      if (empsRes.data) setEmployees(empsRes.data as Employee[]);
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateClassification = () => {
    let severity: Incident['severity'] = 'Niski';
    let isMajor = false;
    const reasons: string[] = [];

    // 1. Duration
    const duration = formData.duration_minutes || 0;
    if (duration > 24 * 60) {
      severity = 'Krytyczny';
      isMajor = true;
      reasons.push('Czas trwania > 24h');
    } else if (duration > 4 * 60) {
      severity = 'Wysoki';
      reasons.push('Czas trwania > 4h');
    }

    // 2. Clients
    const clientsCount = formData.affected_clients_count || 0;
    const clientsPercent = formData.affected_clients_percent || 0;
    
    if (clientsPercent > 10 || clientsCount > 100000) {
      severity = 'Krytyczny';
      isMajor = true;
      reasons.push('Wpływ na >10% klientów lub >100k');
    } else if (clientsPercent > 1) {
      if (severity !== 'Krytyczny') severity = 'Wysoki';
      reasons.push('Wpływ na >1% klientów');
    }

    // 3. Data Loss
    if (formData.data_loss_type === 'Integralność' || formData.data_loss_type === 'Dostępność') {
       if (severity !== 'Krytyczny') severity = 'Wysoki';
       reasons.push('Naruszenie integralności/dostępności');
    }

    // 4. Critical Functions (KLIF)
    const hasCriticalKlif = formData.related_klifs.some(k => {
      const fullKlif = klifs.find(x => x.id === k.id);
      return fullKlif?.classification_type === 'Krytyczna';
    });

    if (hasCriticalKlif) {
      severity = 'Krytyczny';
      isMajor = true;
      reasons.push('Wpływ na funkcję krytyczną (KLIF)');
    }

    // 5. Economic Impact
    if ((formData.financial_impact_value || 0) > 100000) {
       severity = 'Krytyczny';
       isMajor = true;
       reasons.push('Wpływ finansowy > 100k');
    }

    setFormData(prev => ({
      ...prev,
      severity,
      is_major_incident: isMajor
    }));

    alert(`Zaktualizowano klasyfikację:\nPoziom: ${severity}\nPoważny incydent (DORA): ${isMajor ? 'TAK' : 'NIE'}\n\nPowody:\n- ${reasons.join('\n- ')}`);
  };

  const handleSave = async (isFinal: boolean = false) => {
    if (!formData.title) {
      alert('Tytuł jest wymagany');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      alert('Błąd: Brak połączenia z bazą danych.');
      return;
    }

    try {
      // Create audit log entry
      const currentUser = 'Użytkownik'; 
      let action = 'Edycja';
      let details = '';

      const originalData = initialData || DEFAULT_INCIDENT;

      if (!initialData) {
        action = 'Utworzenie';
        details = 'Utworzono nowy incydent';
      } else {
        // Calculate changes
        const changes: string[] = [];
        if (originalData.title !== formData.title) changes.push(`Tytuł: "${originalData.title}" -> "${formData.title}"`);
        if (originalData.description !== formData.description) changes.push('Zmieniono opis');
        if (originalData.status !== formData.status) changes.push(`Status: ${originalData.status} -> ${formData.status}`);
        if (originalData.severity !== formData.severity) changes.push(`Krytyczność: ${originalData.severity} -> ${formData.severity}`);
        if (originalData.assigned_to !== formData.assigned_to) changes.push(`Przypisano: ${originalData.assigned_to || 'Brak'} -> ${formData.assigned_to || 'Brak'}`);
        if (originalData.is_major_incident !== formData.is_major_incident) changes.push(`Poważny incydent: ${originalData.is_major_incident ? 'TAK' : 'NIE'} -> ${formData.is_major_incident ? 'TAK' : 'NIE'}`);
        if (originalData.uksc_incident_type !== formData.uksc_incident_type) changes.push(`Klasyfikacja UKSC: ${originalData.uksc_incident_type} -> ${formData.uksc_incident_type}`);
        if (originalData.detection_date !== formData.detection_date) changes.push('Zmieniono datę wykrycia');
        if (originalData.occurrence_date !== formData.occurrence_date) changes.push('Zmieniono datę wystąpienia');
        
        if (originalData.affected_clients_count !== formData.affected_clients_count) changes.push(`Liczba klientów: ${formData.affected_clients_count}`);
        if (originalData.affected_clients_percent !== formData.affected_clients_percent) changes.push(`Procent klientów: ${formData.affected_clients_percent}%`);
        if (originalData.financial_impact_value !== formData.financial_impact_value) changes.push(`Wpływ finansowy: ${formData.financial_impact_value} PLN`);
        if (originalData.data_loss_type !== formData.data_loss_type) changes.push(`Typ utraty danych: ${formData.data_loss_type}`);
        if (originalData.geographic_spread !== formData.geographic_spread) changes.push(`Zasięg: ${formData.geographic_spread}`);
        
        if (JSON.stringify(originalData.involved_persons?.sort()) !== JSON.stringify(formData.involved_persons?.sort())) changes.push('Zaktualizowano listę osób zaangażowanych');
        if (JSON.stringify(originalData.related_assets?.sort()) !== JSON.stringify(formData.related_assets?.sort())) changes.push('Zmieniono powiązane zasoby');
        if (JSON.stringify(originalData.related_providers?.sort()) !== JSON.stringify(formData.related_providers?.sort())) changes.push('Zmieniono powiązanych dostawców');
        if (JSON.stringify(originalData.related_klifs?.sort()) !== JSON.stringify(formData.related_klifs?.sort())) changes.push('Zmieniono powiązane funkcje KLIF');

        if (originalData.root_cause_category !== formData.root_cause_category) changes.push(`Przyczyna: ${originalData.root_cause_category} -> ${formData.root_cause_category}`);
        if (originalData.reported_to_knf !== formData.reported_to_knf) changes.push(`Zgłoszono KNF: ${formData.reported_to_knf ? 'TAK' : 'NIE'}`);
        if (originalData.reported_to_csirt !== formData.reported_to_csirt) changes.push(`Zgłoszono CSIRT: ${formData.reported_to_csirt ? 'TAK' : 'NIE'}`);

        if (changes.length === 0) {
          details = 'Zapisano bez zmian';
        } else {
          details = changes.join(', ');
        }
      }
      
      const newLogEntry = {
        date: new Date().toISOString(),
        user: currentUser,
        action: action,
        details: details
      };

      const updatedFormData = {
        ...formData,
        audit_log: [...(formData.audit_log || []), newLogEntry],
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('incidents').upsert(updatedFormData);
      
      if (error) {
        console.error('Supabase upsert error:', error);
        alert('Błąd zapisu: ' + error.message);
        return;
      }

      setInitialData(updatedFormData);
      setFormData(updatedFormData);
      alert('Zmiany zostały zapisane pomyślnie.');
      onSave(true); // Always close the window after successful save

    } catch (error: any) {
      console.error('Unexpected error in handleSave:', error);
      alert('Wystąpił nieoczekiwany błąd: ' + (error.message || 'Nieznany błąd'));
    }
  };

  // Relation handlers
  const addRelation = (type: 'assets' | 'providers' | 'klifs', item: { id: string, name: string }) => {
    setFormData(prev => {
      const key = `related_${type}` as keyof Incident;
      const current = prev[key] as { id: string, name: string }[];
      if (current.find(x => x.id === item.id)) return prev;
      return { ...prev, [key]: [...current, item] };
    });
  };

  const removeRelation = (type: 'assets' | 'providers' | 'klifs', id: string) => {
    setFormData(prev => {
      const key = `related_${type}` as keyof Incident;
      const current = prev[key] as { id: string, name: string }[];
      return { ...prev, [key]: current.filter(x => x.id !== id) };
    });
  };

  const handleInvolvedPersonToggle = (personId: string) => {
    setFormData(prev => {
      const current = prev.involved_persons || [];
      if (current.includes(personId)) {
        return { ...prev, involved_persons: current.filter(id => id !== personId) };
      } else {
        return { ...prev, involved_persons: [...current, personId] };
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">
          {initialData ? 'Edycja Incydentu' : 'Rejestracja Incydentu'}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex flex-col items-center cursor-pointer" onClick={() => setCurrentStep(step)}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep === step ? 'bg-indigo-600 text-white' : 
                currentStep > step ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {step}
              </div>
              <span className="text-xs mt-1 text-slate-500">
                {step === 1 && 'Info'}
                {step === 2 && 'Klasyfikacja'}
                {step === 3 && 'Powiązania'}
                {step === 4 && 'Analiza'}
                {step === 5 && 'Raport'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto flex-1">
        
        {/* Step 1: Identification */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">1. Identyfikacja</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Tytuł incydentu *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="np. Niedostępność systemu bankowości..." />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Opis sytuacji</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data wykrycia</label>
                <input type="datetime-local" name="detection_date" value={formData.detection_date} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data wystąpienia</label>
                <input type="datetime-local" name="occurrence_date" value={formData.occurrence_date} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Zgłaszający (Autor)</label>
                <select name="author" value={formData.author} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  {employees.map(e => (
                    <option key={e.id} value={`${e.first_name} ${e.last_name}`}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="Rejestracja">Rejestracja</option>
                  <option value="Analiza">Analiza</option>
                  <option value="Mitygacja">Mitygacja</option>
                  <option value="Zamknięty">Zamknięty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Przypisany do (Właściciel)</label>
                <select name="assigned_to" value={formData.assigned_to || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz osobę odpowiedzialną...</option>
                  {employees.map(e => (
                    <option key={e.id} value={`${e.first_name} ${e.last_name}`}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Osoby zaangażowane / powiadomione</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50">
                  {employees.map(e => (
                    <label key={e.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={(formData.involved_persons || []).includes(`${e.first_name} ${e.last_name}`)}
                        onChange={() => handleInvolvedPersonToggle(`${e.first_name} ${e.last_name}`)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{e.first_name} {e.last_name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Audit Log Display */}
            {formData.audit_log && formData.audit_log.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-4">Historia zmian (Audit Log)</h4>
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <ul className="divide-y divide-slate-200">
                    {formData.audit_log.map((log, idx) => (
                      <li key={idx} className="px-4 py-3 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-900">{log.action}</span>
                          <span className="text-slate-500">{new Date(log.date).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-slate-600">
                          <span>{log.details || '-'}</span>
                          <span className="text-slate-400 italic">przez: {log.user}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Classification (DORA) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="text-lg font-medium text-slate-900">2. Klasyfikacja (DORA / NIS2)</h3>
              <button onClick={calculateClassification} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                <Calculator className="h-4 w-4 mr-1" /> Oblicz klasyfikację
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex gap-4">
                <div className={`flex-1 p-3 rounded border ${formData.is_major_incident ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Czy poważny incydent (DORA)?</label>
                  <div className="mt-1 flex items-center">
                    {formData.is_major_incident ? <AlertTriangle className="h-5 w-5 text-rose-600 mr-2" /> : <CheckCircle2 className="h-5 w-5 text-slate-400 mr-2" />}
                    <span className={`text-lg font-bold ${formData.is_major_incident ? 'text-rose-700' : 'text-slate-700'}`}>
                      {formData.is_major_incident ? 'TAK' : 'NIE'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-3 rounded border bg-white border-slate-200">
                  <label className="block text-xs font-medium text-slate-500 uppercase">Poziom krytyczności</label>
                  <div className="mt-1 text-lg font-bold text-slate-700">{formData.severity}</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* DORA Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800 space-y-3">
                <h4 className="font-semibold">Przesłanki klasyfikacji (DORA - Art. 18)</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><b>Poważny incydent:</b> Czas trwania &gt; 24h, LUB wpływ na &gt;10% klientów, LUB wpływ na funkcję krytyczną (KLIF), LUB wpływ finansowy &gt; 100k PLN.</li>
                  <li><b>Krytyczność 'Wysoki':</b> Czas trwania &gt; 4h, LUB wpływ na &gt;1% klientów, LUB naruszenie integralności/danych.</li>
                </ul>
                <a href="https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32022R2554" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block">Zobacz Art. 18 DORA</a>
                
                <div className="pt-2 space-y-4 bg-white/60 p-3 rounded-md border border-blue-200">
                  <h5 className="text-xs font-bold text-slate-600 uppercase">Pola do oceny DORA</h5>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Liczba dotkniętych klientów</label>
                    <input type="number" name="affected_clients_count" value={formData.affected_clients_count || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Procent bazy klientów (%)</label>
                    <input type="number" name="affected_clients_percent" value={formData.affected_clients_percent || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Wpływ finansowy (PLN)</label>
                    <input type="number" name="financial_impact_value" value={formData.financial_impact_value || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border" />
                  </div>
                </div>
              </div>

              {/* UKSC/NIS2 Section */}
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm text-amber-800 space-y-3">
                <h4 className="font-semibold">Przesłanki klasyfikacji (NIS2 / UKSC)</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><b>Incydent Poważny (NIS2):</b> Znaczne zakłócenie usługi kluczowej LUB straty finansowe, LUB duża szkoda.</li>
                  <li><b>Incydent Istotny (UKSC):</b> Dotyczy usługi kluczowej, wpływa na ciągłość, powoduje zagrożenie.</li>
                  <li><b>Incydent Krytyczny (UKSC):</b> Skutki o znacznej skali.</li>
                </ul>
                <a href="https://legislacja.rcl.gov.pl/projekt/12379430" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline block">Zobacz proces legislacyjny (UKSC/NIS2)</a>
                
                 <div className="pt-2 space-y-4 bg-white/60 p-3 rounded-md border border-amber-200">
                  <h5 className="text-xs font-bold text-slate-600 uppercase">Pola do oceny UKSC</h5>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Klasyfikacja incydentu (UKSC)</label>
                    <select name="uksc_incident_type" value={formData.uksc_incident_type} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border">
                      <option value="Brak">Brak / Nie dotyczy</option>
                      <option value="Zwykły">Zwykły</option>
                      <option value="Istotny">Istotny (Zgłoszenie S46)</option>
                      <option value="Poważny">Poważny (wg. NIS2, Zgłoszenie S46)</option>
                      <option value="Krytyczny">Krytyczny (Zgłoszenie S46)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Incydenty <span className="font-semibold">Istotne, Poważne i Krytyczne</span> podlegają zgłoszeniu do CSIRT (S46) w ciągu 24h.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Fields */}
            <div className="pt-4">
              <h4 className="text-sm font-semibold text-slate-600 mb-2 border-b pb-1">Pola wspólne dla DORA i UKSC</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Czas trwania (minuty)</label>
                  <input type="number" name="duration_minutes" value={formData.duration_minutes || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Utrata danych</label>
                  <select name="data_loss_type" value={formData.data_loss_type} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm text-sm p-2 border">
                    <option value="Brak">Brak</option>
                    <option value="Poufność">Poufność (Wyciek)</option>
                    <option value="Integralność">Integralność (Zmiana)</option>
                    <option value="Dostępność">Dostępność (Brak dostępu)</option>
                    <option value="Wiele">Wiele</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Zasięg geograficzny</label>
                  <select name="geographic_spread" value={formData.geographic_spread} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="Lokalny">Lokalny</option>
                    <option value="Krajowy">Krajowy</option>
                    <option value="Transgraniczny (UE)">Transgraniczny (UE)</option>
                    <option value="Globalny">Globalny</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Relations */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">3. Powiązania</h3>
            
            {/* Assets */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Dotknięte Zasoby ICT</label>
                <select 
                  className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-1 border w-64"
                  onChange={(e) => {
                    const asset = assets.find(a => a.id === e.target.value);
                    if (asset) addRelation('assets', { id: asset.id, name: asset.name });
                    e.target.value = '';
                  }}
                >
                  <option value="">Dodaj zasób...</option>
                  {assets.filter(a => !formData.related_assets.find(r => r.id === a.id)).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.related_assets.map(item => (
                  <span key={item.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {item.name}
                    <button onClick={() => removeRelation('assets', item.id)} className="ml-1.5 text-indigo-600 hover:text-indigo-900"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {formData.related_assets.length === 0 && <span className="text-sm text-slate-400 italic">Brak powiązanych zasobów</span>}
              </div>
            </div>

            {/* Providers */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Dotknięci Dostawcy</label>
                <select 
                  className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-1 border w-64"
                  onChange={(e) => {
                    const provider = providers.find(p => p.id === e.target.value);
                    if (provider) addRelation('providers', { id: provider.id, name: provider.nazwa_prawna });
                    e.target.value = '';
                  }}
                >
                  <option value="">Dodaj dostawcę...</option>
                  {providers.filter(p => !formData.related_providers.find(r => r.id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.nazwa_prawna}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.related_providers.map(item => (
                  <span key={item.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    {item.name}
                    <button onClick={() => removeRelation('providers', item.id)} className="ml-1.5 text-emerald-600 hover:text-emerald-900"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {formData.related_providers.length === 0 && <span className="text-sm text-slate-400 italic">Brak powiązanych dostawców</span>}
              </div>
            </div>

            {/* KLIF */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Dotknięte Funkcje Krytyczne (KLIF)</label>
                <select 
                  className="text-sm border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-1 border w-64"
                  onChange={(e) => {
                    const klif = klifs.find(k => k.id === e.target.value);
                    if (klif) addRelation('klifs', { id: klif.id, name: klif.name });
                    e.target.value = '';
                  }}
                >
                  <option value="">Dodaj KLIF...</option>
                  {klifs.filter(k => !formData.related_klifs.find(r => r.id === k.id)).map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.related_klifs.map(item => (
                  <span key={item.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                    {item.name}
                    <button onClick={() => removeRelation('klifs', item.id)} className="ml-1.5 text-rose-600 hover:text-rose-900"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {formData.related_klifs.length === 0 && <span className="text-sm text-slate-400 italic">Brak powiązanych funkcji biznesowych</span>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Analysis & RCA */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">4. Analiza i RCA (ISO 27001)</h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria przyczyny źródłowej</label>
                <select name="root_cause_category" value={formData.root_cause_category} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="Błąd ludzki">Błąd ludzki</option>
                  <option value="Awaria sprzętu">Awaria sprzętu</option>
                  <option value="Błąd oprogramowania">Błąd oprogramowania</option>
                  <option value="Atak cybernetyczny">Atak cybernetyczny</option>
                  <option value="Błąd procesowy">Błąd procesowy</option>
                  <option value="Dostawca">Dostawca</option>
                  <option value="Siła wyższa">Siła wyższa</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Opis przyczyny źródłowej (Root Cause)</label>
                <textarea name="root_cause_description" value={formData.root_cause_description || ''} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Dlaczego do tego doszło? (5 Why)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Podjęte działania naprawcze</label>
                <textarea name="actions_taken" value={formData.actions_taken || ''} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Co zrobiono, aby przywrócić działanie?" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wnioski (Lessons Learned)</label>
                <textarea name="lessons_learned" value={formData.lessons_learned || ''} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Co zrobić, aby sytuacja się nie powtórzyła?" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Reporting */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">5. Raportowanie (DORA / NIS2)</h3>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="text-sm text-slate-600 mb-4">
                Zgodnie z DORA, poważne incydenty ICT należy zgłaszać do właściwych organów (KNF) w określonych terminach:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Wstępne zgłoszenie: do 24h od wykrycia</li>
                  <li>Raport pośredni: do 72h</li>
                  <li>Raport końcowy: do 1 miesiąca od zamknięcia</li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input type="checkbox" id="reported_to_knf" name="reported_to_knf" checked={formData.reported_to_knf} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                  <label htmlFor="reported_to_knf" className="ml-2 block text-sm font-medium text-slate-900">Zgłoszono do KNF (Organ Nadzoru)</label>
                </div>

                <div className="flex items-center">
                  <input type="checkbox" id="reported_to_csirt" name="reported_to_csirt" checked={formData.reported_to_csirt} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                  <label htmlFor="reported_to_csirt" className="ml-2 block text-sm font-medium text-slate-900">Zgłoszono do CSIRT (jeśli dotyczy)</label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data zgłoszenia</label>
                  <input type="datetime-local" name="reporting_date" value={formData.reporting_date || ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" disabled={!formData.reported_to_knf && !formData.reported_to_csirt} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          Wstecz
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" /> Zapisz zmiany
          </button>

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Dalej
            </button>
          ) : (
            <button
              onClick={() => handleSave(true)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 flex items-center"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Zakończ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
