import React, { useState, useEffect } from 'react';
import { Klif, KlifProcess, KlifIctAsset, KlifProvider, KlifDependency, IctAsset, DostawcaICT, Employee, Department } from '../types';
import { getSupabase } from '../lib/supabase';
import { Save, X, Plus, Trash2, AlertCircle } from 'lucide-react';
import IctAssetForm from './IctAssetForm';

interface KlifFormProps {
  initialData?: Klif | null;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_KLIF: Klif = {
  id: '',
  name: '',
  classification_type: '',
  classification_justification: '',
  owner: '',
  owner_unit: '',
  classification_methodology: '',
  author: '',
  financial_impact: '',
  regulatory_impact: '',
  operational_impact: '',
  reputational_impact: '',
  rto_value: '',
  rto_unit: 'godziny',
  mtpd_value: '',
  mtpd_unit: 'godziny',
  mbco_description: '',
  drp_status: false,
  drp_description: '',
  exit_plan_status: false,
  redundancy: '',
  testing_frequency: '',
  last_test_date: '',
  test_result: '',
  last_review_date: new Date().toISOString().split('T')[0],
  notes: '',
  processes: [],
  ict_assets: [],
  providers: [],
  dependencies: []
};

export default function KlifForm({ initialData, onSave, onCancel }: KlifFormProps) {
  const [formData, setFormData] = useState<Klif>(
    initialData || { ...DEFAULT_KLIF, id: crypto.randomUUID() }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [assets, setAssets] = useState<IctAsset[]>([]);
  const [availableProviders, setAvailableProviders] = useState<DostawcaICT[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);

  const fetchAssets = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('ict_assets').select('*');
      if (error) throw error;
      if (data) {
        setAssets(data.map((row: any) => row.data as IctAsset));
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchProviders = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('dostawcy_ict').select('*');
      if (error) throw error;
      if (data) {
        setAvailableProviders(data as DostawcaICT[]);
      }
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  const fetchEmployeesAndDepartments = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
      const { data: emps } = await supabase.from('employees').select('*');
      if (emps) setEmployees(emps);
      
      const { data: depts } = await supabase.from('departments').select('*');
      if (depts) setDepartments(depts);
    } catch (error) {
      console.error("Error fetching employees/departments:", error);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchProviders();
    fetchEmployeesAndDepartments();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ ...DEFAULT_KLIF, id: crypto.randomUUID() });
    }
    setErrors({});
    setCurrentStep(1);
  }, [initialData]);

  const handleSaveNewAsset = async () => {
    await fetchAssets();
    setIsAssetFormOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nazwa funkcji jest wymagana';
    if (!formData.classification_type) newErrors.classification_type = 'Typ klasyfikacji jest wymagany';
    if (formData.classification_justification.length < 50) newErrors.classification_justification = 'Uzasadnienie musi mieć min. 50 znaków';
    if (!formData.owner.trim()) newErrors.owner = 'Właściciel funkcji jest wymagany';
    if (!formData.author.trim()) newErrors.author = 'Autor wpisu jest wymagany';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      alert('Popraw błędy w formularzu przed zapisaniem.');
      setCurrentStep(1); // Go to first step to show errors
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      alert('Brak połączenia z bazą danych Supabase.');
      return;
    }

    try {
      // 1. Save main KLIF record
      const klifData: any = { ...formData };
      delete klifData.processes;
      delete klifData.ict_assets;
      delete klifData.providers;
      delete klifData.dependencies;

      // Convert empty strings to null for numeric and date fields
      if (klifData.rto_value === '') klifData.rto_value = null;
      if (klifData.mtpd_value === '') klifData.mtpd_value = null;
      if (klifData.last_test_date === '') klifData.last_test_date = null;
      if (klifData.last_review_date === '') klifData.last_review_date = null;

      const { error: klifError } = await supabase.from('klif').upsert(klifData);
      if (klifError) throw klifError;

      // 2. Delete existing relations
      await Promise.all([
        supabase.from('klif_procesy').delete().eq('klif_id', formData.id),
        supabase.from('klif_zasoby_ict').delete().eq('klif_id', formData.id),
        supabase.from('klif_dostawcy').delete().eq('klif_id', formData.id),
        supabase.from('klif_zaleznosci').delete().eq('klif_id', formData.id)
      ]);

      // 3. Insert new relations
      const promises = [];
      
      if (formData.processes.length > 0) {
        promises.push(supabase.from('klif_procesy').insert(
          formData.processes.map(p => ({ ...p, klif_id: formData.id }))
        ));
      }
      
      if (formData.ict_assets.length > 0) {
        promises.push(supabase.from('klif_zasoby_ict').insert(
          formData.ict_assets.map(a => ({ ...a, klif_id: formData.id }))
        ));
      }
      
      if (formData.providers.length > 0) {
        promises.push(supabase.from('klif_dostawcy').insert(
          formData.providers.map(p => ({ ...p, klif_id: formData.id }))
        ));
      }
      
      if (formData.dependencies.length > 0) {
        promises.push(supabase.from('klif_zaleznosci').insert(
          formData.dependencies.map(d => ({ ...d, klif_id: formData.id }))
        ));
      }

      const results = await Promise.all(promises);
      const relationErrors = results.filter(r => r.error).map(r => r.error);
      if (relationErrors.length > 0) {
        console.error('Errors saving relations:', relationErrors);
        throw new Error('Błąd podczas zapisywania powiązań KLIF.');
      }

      alert('KLIF zapisana pomyślnie!');
      onSave();
    } catch (error: any) {
      console.error('Error saving KLIF:', error);
      alert(`Wystąpił błąd podczas zapisu do bazy danych: ${error.message || 'Nieznany błąd'}`);
    }
  };

  // Dynamic lists handlers
  const addProcess = () => setFormData(p => ({ ...p, processes: [...p.processes, { id: crypto.randomUUID(), name: '', description: '' }] }));
  const removeProcess = (id: string) => setFormData(p => ({ ...p, processes: p.processes.filter(x => x.id !== id) }));
  const updateProcess = (id: string, field: string, value: string) => {
    setFormData(p => ({
      ...p,
      processes: p.processes.map(x => x.id === id ? { ...x, [field]: value } : x)
    }));
  };

  const addAsset = () => setFormData(p => ({ ...p, ict_assets: [...p.ict_assets, { id: crypto.randomUUID(), asset_id: '', asset_name: '', asset_type: '', is_spof: false }] }));
  const removeAsset = (id: string) => setFormData(p => ({ ...p, ict_assets: p.ict_assets.filter(x => x.id !== id) }));
  const updateAsset = (id: string, field: string, value: any) => {
    setFormData(p => ({
      ...p,
      ict_assets: p.ict_assets.map(x => x.id === id ? { ...x, [field]: value } : x)
    }));
  };

  const addProvider = () => setFormData(p => ({ ...p, providers: [...p.providers, { id: crypto.randomUUID(), name: '', service_type: '', concentration_risk: '', is_klif_contract: false, is_subcontractor: false }] }));
  const removeProvider = (id: string) => setFormData(p => ({ ...p, providers: p.providers.filter(x => x.id !== id) }));
  const updateProvider = (id: string, field: string, value: any) => {
    setFormData(p => ({
      ...p,
      providers: p.providers.map(x => x.id === id ? { ...x, [field]: value } : x)
    }));
  };

  const addDependency = () => setFormData(p => ({ ...p, dependencies: [...p.dependencies, { id: crypto.randomUUID(), dependency_klif_id: '', dependency_klif_name: '', dependency_type: '' }] }));
  const removeDependency = (id: string) => setFormData(p => ({ ...p, dependencies: p.dependencies.filter(x => x.id !== id) }));
  const updateDependency = (id: string, field: string, value: string) => {
    setFormData(p => ({
      ...p,
      dependencies: p.dependencies.map(x => x.id === id ? { ...x, [field]: value } : x)
    }));
  };

  const renderImpactSelect = (name: string, label: string) => {
    const value = (formData as any)[name];
    let colorClass = 'bg-white';
    if (value === 'Niski') colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (value === 'Średni') colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
    if (value === 'Wysoki') colorClass = 'bg-orange-50 text-orange-700 border-orange-200';
    if (value === 'Krytyczny') colorClass = 'bg-rose-50 text-rose-700 border-rose-200';

    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <select
          name={name}
          value={value}
          onChange={handleChange}
          className={`w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm p-2 border ${colorClass}`}
        >
          <option value="">Wybierz...</option>
          <option value="Niski">Niski</option>
          <option value="Średni">Średni</option>
          <option value="Wysoki">Wysoki</option>
          <option value="Krytyczny">Krytyczny</option>
        </select>
      </div>
    );
  };

  const getProviderProvisions = (providerName: string) => {
    const provider = availableProviders.find(p => p.nazwa_prawna === providerName);
    return provider?.zakres_umowy || [];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Stepper Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-slate-800">
            {initialData ? 'Edycja KLIF' : 'Nowa KLIF'}
          </h2>
          <div className="flex gap-2">
            <button onClick={onCancel} className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">
              <X className="h-4 w-4 mr-2" /> Anuluj
            </button>
            <button onClick={handleSave} className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
              <Save className="h-4 w-4 mr-2" /> Zapisz KLIF
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className="flex flex-col items-center w-full">
              <button
                onClick={() => setCurrentStep(step)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep === step ? 'bg-indigo-600 text-white' : 
                  currentStep > step ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {step}
              </button>
              <span className="text-xs mt-1 text-slate-500 hidden sm:block">Krok {step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Sekcja 1 */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">1. Identyfikacja funkcji</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa funkcji <span className="text-rose-500">*</span></label>
                <input type="text" name="name" value={formData.name ?? ''} onChange={handleChange} className={`w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.name ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'}`} />
                {errors.name && <p className="mt-1 text-sm text-rose-500">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Typ klasyfikacji <span className="text-rose-500">*</span></label>
                <div className="flex flex-wrap gap-4">
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${formData.classification_type === 'Krytyczna' ? 'bg-rose-50 border-rose-200' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="classification_type" value="Krytyczna" checked={formData.classification_type === 'Krytyczna'} onChange={handleChange} className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-slate-300" />
                    <span className="ml-2 text-sm font-medium text-slate-900">🔴 Krytyczna</span>
                  </label>
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${formData.classification_type === 'Istotna' ? 'bg-amber-50 border-amber-200' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="classification_type" value="Istotna" checked={formData.classification_type === 'Istotna'} onChange={handleChange} className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-300" />
                    <span className="ml-2 text-sm font-medium text-slate-900">🟠 Istotna</span>
                  </label>
                  <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${formData.classification_type === 'Wspierająca' ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name="classification_type" value="Wspierająca" checked={formData.classification_type === 'Wspierająca'} onChange={handleChange} className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300" />
                    <span className="ml-2 text-sm font-medium text-slate-900">🟢 Wspierająca</span>
                  </label>
                </div>
                {errors.classification_type && <p className="mt-1 text-sm text-rose-500">{errors.classification_type}</p>}
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-sm font-medium text-slate-700">Uzasadnienie klasyfikacji <span className="text-rose-500">*</span></label>
                  <span className={`text-xs ${formData.classification_justification.length < 50 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {formData.classification_justification.length} / min. 50 znaków
                  </span>
                </div>
                <textarea name="classification_justification" value={formData.classification_justification ?? ''} onChange={handleChange} rows={3} className={`w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.classification_justification ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'}`} placeholder="Min. 50 znaków..." />
                {errors.classification_justification && <p className="mt-1 text-sm text-rose-500">{errors.classification_justification}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Właściciel funkcji <span className="text-rose-500">*</span></label>
                <select 
                  name="owner" 
                  value={formData.owner ?? ''} 
                  onChange={handleChange} 
                  className={`w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.owner ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'}`}
                >
                  <option value="">Wybierz właściciela...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                      {emp.first_name} {emp.last_name} ({emp.position})
                    </option>
                  ))}
                </select>
                {errors.owner && <p className="mt-1 text-sm text-rose-500">{errors.owner}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jednostka organizacyjna</label>
                <select 
                  name="owner_unit" 
                  value={formData.owner_unit ?? ''} 
                  onChange={handleChange} 
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                >
                  <option value="">Wybierz jednostkę...</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Metodyka klasyfikacji</label>
                <select name="classification_methodology" value={formData.classification_methodology} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="BIA">BIA</option>
                  <option value="RTO-based">RTO-based</option>
                  <option value="Hybrydowa">Hybrydowa</option>
                  <option value="Inna">Inna</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Autor wpisu <span className="text-rose-500">*</span></label>
                <select 
                  name="author" 
                  value={formData.author ?? ''} 
                  onChange={handleChange} 
                  className={`w-full rounded-md shadow-sm sm:text-sm p-2 border ${errors.author ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'}`}
                >
                  <option value="">Wybierz autora...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
                {errors.author && <p className="mt-1 text-sm text-rose-500">{errors.author}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Sekcja 2 */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">2. Analiza wpływu BIA</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderImpactSelect('financial_impact', 'Wpływ finansowy')}
              {renderImpactSelect('regulatory_impact', 'Wpływ regulacyjny')}
              {renderImpactSelect('operational_impact', 'Wpływ operacyjny')}
              {renderImpactSelect('reputational_impact', 'Wpływ reputacyjny')}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RTO (Recovery Time Objective)</label>
                <div className="flex gap-2">
                  <input type="number" name="rto_value" value={formData.rto_value ?? ''} onChange={handleChange} className="w-2/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  <select name="rto_unit" value={formData.rto_unit} onChange={handleChange} className="w-1/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="minuty">Minuty</option>
                    <option value="godziny">Godziny</option>
                    <option value="dni">Dni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">MTPD (Maximum Tolerable Period of Disruption)</label>
                <div className="flex gap-2">
                  <input type="number" name="mtpd_value" value={formData.mtpd_value ?? ''} onChange={handleChange} className="w-2/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  <select name="mtpd_unit" value={formData.mtpd_unit} onChange={handleChange} className="w-1/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="minuty">Minuty</option>
                    <option value="godziny">Godziny</option>
                    <option value="dni">Dni</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">MBCO (Minimum Business Continuity Objective)</label>
                <textarea name="mbco_description" value={formData.mbco_description ?? ''} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Opis minimalnego poziomu działania..." />
              </div>
            </div>
          </div>
        )}

        {/* Sekcja 3 */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">3. Powiązane procesy i zasoby ICT</h3>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-slate-800">Procesy biznesowe</h4>
                <button type="button" onClick={addProcess} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                  <Plus className="h-4 w-4 mr-1" /> Dodaj proces
                </button>
              </div>
              {formData.processes.length === 0 && <p className="text-sm text-slate-500 italic">Brak dodanych procesów.</p>}
              <div className="space-y-3">
                {formData.processes.map((p) => (
                  <div key={p.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex-1 space-y-3">
                      <input type="text" placeholder="Nazwa procesu" value={p.name ?? ''} onChange={(e) => updateProcess(p.id, 'name', e.target.value)} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                      <input type="text" placeholder="Opis" value={p.description ?? ''} onChange={(e) => updateProcess(p.id, 'description', e.target.value)} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                    </div>
                    <button type="button" onClick={() => removeProcess(p.id)} className="text-rose-500 hover:text-rose-700 p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-slate-800">Zasoby ICT</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsAssetFormOpen(true)} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-emerald-700 bg-emerald-100 hover:bg-emerald-200">
                    <Plus className="h-4 w-4 mr-1" /> Nowy zasób ICT
                  </button>
                  <button type="button" onClick={addAsset} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                    <Plus className="h-4 w-4 mr-1" /> Dodaj powiązanie
                  </button>
                </div>
              </div>
              {formData.ict_assets.length === 0 && <p className="text-sm text-slate-500 italic">Brak dodanych zasobów.</p>}
              <div className="space-y-3">
                {formData.ict_assets.map((a) => (
                  <div key={a.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <select
                      value={a.asset_id}
                      onChange={(e) => {
                        const selectedAsset = assets.find(asset => asset.id === e.target.value);
                        if (selectedAsset) {
                          updateAsset(a.id, 'asset_id', selectedAsset.id);
                          updateAsset(a.id, 'asset_name', selectedAsset.name);
                          updateAsset(a.id, 'asset_type', selectedAsset.type);
                        } else {
                          updateAsset(a.id, 'asset_id', '');
                          updateAsset(a.id, 'asset_name', '');
                          updateAsset(a.id, 'asset_type', '');
                        }
                      }}
                      className="w-full sm:w-1/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                      <option value="">Wybierz zasób z rejestru...</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id}>{asset.name}</option>
                      ))}
                    </select>
                    <input type="text" placeholder="ID z Rejestru" title="ID z Rejestru Zasobów ICT" value={a.asset_id ?? ''} readOnly className="w-full sm:w-1/4 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono text-xs bg-slate-100" />
                    <input type="text" placeholder="Typ" value={a.asset_type ?? ''} readOnly className="w-full sm:w-1/4 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-slate-100" />
                    <label className="flex items-center whitespace-nowrap text-sm text-slate-700">
                      <input type="checkbox" checked={a.is_spof} onChange={(e) => updateAsset(a.id, 'is_spof', e.target.checked)} className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                      SPOF
                    </label>
                    <button type="button" onClick={() => removeAsset(a.id)} className="text-rose-500 hover:text-rose-700 p-2 ml-auto"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sekcja 4 */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">4. Dostawcy ICT</h3>
            
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-slate-500">Zewnętrzni dostawcy usług ICT wspierający tę funkcję.</p>
              <button type="button" onClick={addProvider} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                <Plus className="h-4 w-4 mr-1" /> Dodaj dostawcę
              </button>
            </div>
            {formData.providers.length === 0 && <p className="text-sm text-slate-500 italic">Brak dodanych dostawców.</p>}
            <div className="space-y-4">
              {formData.providers.map((p) => (
                <div key={p.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nazwa dostawcy</label>
                    <select
                      value={p.name ?? ''}
                      onChange={(e) => {
                        updateProvider(p.id, 'name', e.target.value);
                        updateProvider(p.id, 'service_type', '');
                      }}
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                      <option value="">Wybierz dostawcę...</option>
                      {availableProviders.map(prov => (
                        <option key={prov.id} value={prov.nazwa_prawna}>{prov.nazwa_prawna}</option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Rodzaj postanowienia</label>
                    <select
                      value={p.service_type ?? ''}
                      onChange={(e) => updateProvider(p.id, 'service_type', e.target.value)}
                      className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      disabled={!p.name}
                    >
                      <option value="">Wybierz...</option>
                      {getProviderProvisions(p.name).map((z, idx) => (
                        <option key={idx} value={z.rodzaj_postanowienia}>{z.rodzaj_postanowienia}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ryzyko koncentracji</label>
                    <select value={p.concentration_risk ?? ''} onChange={(e) => updateProvider(p.id, 'concentration_risk', e.target.value)} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                      <option value="">Wybierz...</option>
                      <option value="Niskie">Niskie</option>
                      <option value="Średnie">Średnie</option>
                      <option value="Wysokie">Wysokie</option>
                    </select>
                  </div>
                  <div className="lg:col-span-4 flex gap-6 mt-2">
                    <label className="flex items-center text-sm text-slate-700">
                      <input type="checkbox" checked={p.is_klif_contract} onChange={(e) => updateProvider(p.id, 'is_klif_contract', e.target.checked)} className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                      Umowa KLIF
                    </label>
                    <label className="flex items-center text-sm text-slate-700">
                      <input type="checkbox" checked={p.is_subcontractor} onChange={(e) => updateProvider(p.id, 'is_subcontractor', e.target.checked)} className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                      Podwykonawstwo
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removeProvider(p.id)} className="text-rose-500 hover:text-rose-700 p-2"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sekcja 5 */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">5. Zależności między KLIF</h3>
            
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-slate-500">Inne funkcje KLIF, od których zależy ta funkcja lub które zależą od niej.</p>
              <button type="button" onClick={addDependency} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                <Plus className="h-4 w-4 mr-1" /> Dodaj zależność
              </button>
            </div>
            {formData.dependencies.length === 0 && <p className="text-sm text-slate-500 italic">Brak dodanych zależności.</p>}
            <div className="space-y-3">
              {formData.dependencies.map((d) => (
                <div key={d.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <input type="text" placeholder="ID KLIF" value={d.dependency_klif_id ?? ''} onChange={(e) => updateDependency(d.id, 'dependency_klif_id', e.target.value)} className="w-full sm:w-1/4 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono text-xs" />
                  <input type="text" placeholder="Nazwa KLIF" value={d.dependency_klif_name ?? ''} onChange={(e) => updateDependency(d.id, 'dependency_klif_name', e.target.value)} className="w-full sm:w-1/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                  <select value={d.dependency_type ?? ''} onChange={(e) => updateDependency(d.id, 'dependency_type', e.target.value)} className="w-full sm:w-1/3 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                    <option value="">Typ zależności...</option>
                    <option value="Wymaga">Wymaga (zależy od)</option>
                    <option value="Wspiera">Wspiera (jest wymagana przez)</option>
                  </select>
                  <button type="button" onClick={() => removeDependency(d.id)} className="text-rose-500 hover:text-rose-700 p-2 ml-auto"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sekcja 6 */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2">6. Odporność, ciągłość i metadane</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-900">Plan Ciągłości Działania (DRP)</label>
                  <p className="text-xs text-slate-500">Czy istnieje dedykowany plan?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="drp_status" checked={formData.drp_status} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="text-sm font-medium text-slate-900">Strategia Wyjścia (Exit Plan)</label>
                  <p className="text-xs text-slate-500">Dla dostawców wspierających KLIF</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="exit_plan_status" checked={formData.exit_plan_status} onChange={handleChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.drp_status && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Opis DRP / Link do dokumentu</label>
                  <input type="text" name="drp_description" value={formData.drp_description ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Redundancja</label>
                <select name="redundancy" value={formData.redundancy ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Pełna">Pełna (Active-Active)</option>
                  <option value="Częściowa">Częściowa (Active-Passive)</option>
                  <option value="Brak">Brak</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Częstotliwość testów</label>
                <select name="testing_frequency" value={formData.testing_frequency ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Kwartalnie">Kwartalnie</option>
                  <option value="Półrocznie">Półrocznie</option>
                  <option value="Rocznie">Rocznie</option>
                  <option value="Rzadziej">Rzadziej</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data ostatniego testu</label>
                <input type="date" name="last_test_date" value={formData.last_test_date ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wynik ostatniego testu</label>
                <select name="test_result" value={formData.test_result ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Pozytywny">Pozytywny</option>
                  <option value="Pozytywny z uwagami">Pozytywny z uwagami</option>
                  <option value="Negatywny">Negatywny</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data ostatniego przeglądu</label>
                <input type="date" name="last_review_date" value={formData.last_review_date ?? ''} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Uwagi dodatkowe</label>
                <textarea name="notes" value={formData.notes ?? ''} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Wstecz
          </button>
          
          <div className="flex items-center gap-4">
            {Object.keys(errors).length > 0 && currentStep === totalSteps && (
              <span className="text-sm text-rose-500 font-medium flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                Popraw błędy w formularzu
              </span>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Dalej
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Zapisz KLIF
              </button>
            )}
          </div>
        </div>
      </div>

      {isAssetFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl">
            <IctAssetForm
              onSave={handleSaveNewAsset}
              onCancel={() => setIsAssetFormOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
