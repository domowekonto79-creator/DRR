import React, { useState, useEffect } from 'react';
import { IctAsset, IctProvider, BusinessFunction, IctRisk, IctVulnerability, RelatedAsset } from '../types';
import { Save, Download, Trash2, Plus, X, AlertCircle } from 'lucide-react';
import { getSupabase } from '../lib/supabase';

const DEFAULT_ASSET: IctAsset = {
  id: '',
  name: '',
  category: '',
  lifecycleStatus: '',
  deploymentDate: '',
  retirementDate: '',
  isLegacy: false,
  legacyJustification: '',

  owner: '',
  ownerUnit: '',
  physicalLocation: '',
  logicalLocation: '',
  externalNetworkExposure: '',
  providers: [],

  businessFunctions: [],
  criticality: '',
  criticalityJustification: '',

  rtoValue: '',
  rtoUnit: 'godziny',
  rpoValue: '',
  rpoUnit: 'godziny',
  confidentialityImpact: '',
  integrityImpact: '',
  availabilityImpact: '',
  risks: [],

  accessControlMfa: false,
  accessControlLeastPrivilege: false,
  accessControlPam: false,
  accessControlSso: false,
  encryptionAtRest: '',
  encryptionInTransit: '',
  cryptoStandard: '',
  vulnerabilities: [],

  relatedAssets: [],
  dataFlowIn: '',
  dataFlowOut: '',
  dataAtRestDesc: '',

  registryAddDate: new Date().toISOString().split('T')[0],
  lastUpdateDate: new Date().toISOString().split('T')[0],
  author: '',
  notes: '',
};

interface IctAssetFormProps {
  initialData?: IctAsset | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function IctAssetForm({ initialData, onSave, onCancel }: IctAssetFormProps) {
  const [formData, setFormData] = useState<IctAsset>(
    initialData || {
      ...DEFAULT_ASSET,
      id: crypto.randomUUID(),
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableKlifs, setAvailableKlifs] = useState<{ id: string, name: string }[]>([]);
  const [availableRisks, setAvailableRisks] = useState<{ id: string, scenario: string, actionStatus: string }[]>([]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        ...DEFAULT_ASSET,
        id: crypto.randomUUID(),
      });
    }
    setErrors({});
    setCurrentStep(1);
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        
        const [klifsRes, risksRes] = await Promise.all([
          supabase.from('klif').select('id, name').order('name'),
          supabase.from('risks').select('id, scenario, actionStatus').order('scenario')
        ]);
        
        if (klifsRes.error) throw klifsRes.error;
        if (risksRes.error) throw risksRes.error;
        
        setAvailableKlifs(klifsRes.data || []);
        setAvailableRisks(risksRes.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  const calculateCompleteness = () => {
    let totalFields = 0;
    let filledFields = 0;

    const checkField = (val: any) => {
      totalFields++;
      if (val !== '' && val !== null && val !== undefined && (!Array.isArray(val) || val.length > 0)) {
        filledFields++;
      }
    };

    checkField(formData.name);
    checkField(formData.category);
    checkField(formData.lifecycleStatus);
    checkField(formData.deploymentDate);
    checkField(formData.owner);
    checkField(formData.ownerUnit);
    checkField(formData.physicalLocation);
    checkField(formData.logicalLocation);
    checkField(formData.externalNetworkExposure);
    checkField(formData.criticality);
    checkField(formData.rtoValue);
    checkField(formData.rpoValue);
    checkField(formData.confidentialityImpact);
    checkField(formData.integrityImpact);
    checkField(formData.availabilityImpact);

    if (formData.criticality === 'Krytyczna' || formData.criticality === 'Ważna') {
      checkField(formData.encryptionAtRest);
      checkField(formData.encryptionInTransit);
      checkField(formData.cryptoStandard);
    }

    if (formData.criticality === 'Krytyczna') {
      checkField(formData.dataFlowIn);
      checkField(formData.dataFlowOut);
      checkField(formData.dataAtRestDesc);
    }

    return Math.round((filledFields / totalFields) * 100);
  };

  const completeness = calculateCompleteness();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleProviderAdd = () => {
    setFormData(prev => ({
      ...prev,
      providers: [...prev.providers, { id: crypto.randomUUID(), name: '', serviceType: '' }]
    }));
  };

  const handleProviderChange = (id: string, field: keyof IctProvider, value: string) => {
    setFormData(prev => ({
      ...prev,
      providers: prev.providers.map(p => p.id === id ? { ...p, [field]: value } : p)
    }));
  };

  const handleProviderRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      providers: prev.providers.filter(p => p.id !== id)
    }));
  };

  const handleBusinessFunctionAdd = () => {
    setFormData(prev => ({
      ...prev,
      businessFunctions: [...prev.businessFunctions, { id: crypto.randomUUID(), name: '' }]
    }));
  };

  const handleBusinessFunctionChange = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessFunctions: prev.businessFunctions.map(b => b.id === id ? { ...b, name: value } : b)
    }));
  };

  const handleBusinessFunctionRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      businessFunctions: prev.businessFunctions.filter(b => b.id !== id)
    }));
  };

  const handleRiskAdd = () => {
    setFormData(prev => ({
      ...prev,
      risks: [...prev.risks, { id: crypto.randomUUID(), description: '', remediationStatus: '' }]
    }));
  };

  const handleRiskChange = (id: string, field: keyof IctRisk, value: string) => {
    setFormData(prev => ({
      ...prev,
      risks: prev.risks.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  const handleRiskRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      risks: prev.risks.filter(r => r.id !== id)
    }));
  };

  const handleVulnerabilityAdd = () => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: [...prev.vulnerabilities, { id: crypto.randomUUID(), cveId: '', description: '', status: '' }]
    }));
  };

  const handleVulnerabilityChange = (id: string, field: keyof IctVulnerability, value: string) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: prev.vulnerabilities.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const handleVulnerabilityRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      vulnerabilities: prev.vulnerabilities.filter(v => v.id !== id)
    }));
  };

  const handleRelatedAssetAdd = () => {
    setFormData(prev => ({
      ...prev,
      relatedAssets: [...prev.relatedAssets, { id: crypto.randomUUID(), assetId: '', assetName: '' }]
    }));
  };

  const handleRelatedAssetChange = (id: string, field: keyof RelatedAsset, value: string) => {
    setFormData(prev => ({
      ...prev,
      relatedAssets: prev.relatedAssets.map(a => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const handleRelatedAssetRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      relatedAssets: prev.relatedAssets.filter(a => a.id !== id)
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nazwa zasobu jest wymagana';
    if (!formData.owner.trim()) newErrors.owner = 'Właściciel zasobu jest wymagany';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      const updatedData = { ...formData, lastUpdateDate: new Date().toISOString().split('T')[0] };
      setFormData(updatedData);
      
      const supabase = getSupabase();
      if (!supabase) {
        alert('Brak połączenia z bazą danych Supabase.');
        return;
      }

      try {
        const { error } = await supabase
          .from('ict_assets')
          .upsert({ id: updatedData.id, data: updatedData });
          
        if (error) throw error;
        
        alert('Zapisano pomyślnie w bazie Supabase!');
        onSave();
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        alert('Wystąpił błąd podczas zapisu do bazy danych Supabase.');
      }
    } else {
      alert('Popraw błędy w formularzu przed zapisaniem.');
    }
  };

  const handleClear = () => {
    if (window.confirm('Czy na pewno chcesz anulować? Niezapisane zmiany zostaną utracone.')) {
      onCancel();
    }
  };

  const handleExportCSV = () => {
    // Flatten the data for CSV
    const flatData = {
      ...formData,
      providers: formData.providers.map(p => `${p.name} (${p.serviceType})`).join('; '),
      businessFunctions: formData.businessFunctions.map(b => b.name).join('; '),
      risks: formData.risks.map(r => `${r.description} [${r.remediationStatus}]`).join('; '),
      vulnerabilities: formData.vulnerabilities.map(v => `${v.cveId}: ${v.description} [${v.status}]`).join('; '),
      relatedAssets: formData.relatedAssets.map(a => `${a.assetId} - ${a.assetName}`).join('; '),
    };

    const headers = Object.keys(flatData).join(',');
    const values = Object.values(flatData).map(val => {
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');

    const csvContent = `${headers}\n${values}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `zasob_${formData.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showSecuritySection = formData.criticality === 'Krytyczna' || formData.criticality === 'Ważna';
  const showDependenciesSection = formData.criticality === 'Krytyczna';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Progress */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Karta Zasobu ICT</h2>
            <p className="text-sm text-slate-500">Wypełnij dane zasobu zgodnie z wymogami DORA</p>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-48">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Kompletność</span>
                <span className="font-medium text-slate-700">{completeness}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    completeness < 50 ? 'bg-rose-500' : completeness < 100 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} 
                  style={{ width: `${completeness}%` }}
                ></div>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button onClick={handleExportCSV} className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" title="Eksportuj do CSV">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={handleClear} className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-rose-600 bg-white hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500" title="Anuluj">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Stepper Navigation */}
        <div className="flex items-center justify-between mt-6">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => {
            let isHidden = false;
            if (step === 4 && !showSecuritySection) isHidden = true;
            if (step === 6 && !showDependenciesSection) isHidden = true;

            return (
              <div key={step} className={`flex flex-col items-center w-full ${isHidden ? 'opacity-30' : ''}`}>
                <button
                  onClick={() => !isHidden && setCurrentStep(step)}
                  disabled={isHidden}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step ? 'bg-indigo-600 text-white' : 
                    currentStep > step && !isHidden ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
                  } ${isHidden ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {step}
                </button>
                <span className="text-xs mt-1 text-slate-500 hidden sm:block">Krok {step}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        
        {/* 1. Identyfikacja zasobu */}
        {currentStep === 1 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">1. Identyfikacja zasobu</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID Zasobu</label>
              <input type="text" name="id" value={formData.id} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nazwa zasobu <span className="text-rose-500">*</span>
              </label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm p-2 border ${errors.name ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-indigo-500'}`} />
              {errors.name && <p className="mt-1 text-xs text-rose-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Typ/kategoria zasobu</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <option value="">Wybierz...</option>
                <option value="Sprzęt">Sprzęt</option>
                <option value="Oprogramowanie">Oprogramowanie</option>
                <option value="Usługa ICT">Usługa ICT</option>
                <option value="Zasób informacyjny">Zasób informacyjny</option>
                <option value="Sieć">Sieć</option>
                <option value="Inne">Inne</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status cyklu życia</label>
              <select name="lifecycleStatus" value={formData.lifecycleStatus} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                <option value="">Wybierz...</option>
                <option value="Nabycie">Nabycie</option>
                <option value="Eksploatacja">Eksploatacja</option>
                <option value="Konserwacja">Konserwacja</option>
                <option value="Wycofanie">Wycofanie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data wdrożenia</label>
              <input type="date" name="deploymentDate" value={formData.deploymentDate} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Planowana data wycofania</label>
              <input type="date" name="retirementDate" value={formData.retirementDate} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>

            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center mb-3">
                <input type="checkbox" id="isLegacy" name="isLegacy" checked={formData.isLegacy} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                <label htmlFor="isLegacy" className="ml-2 block text-sm font-medium text-slate-900">
                  Zasób typu Legacy (przestarzały, nieobsługiwany)
                </label>
              </div>
              {formData.isLegacy && (
                <div className="mt-2 pl-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Uzasadnienie utrzymania zasobu legacy</label>
                  <textarea name="legacyJustification" value={formData.legacyJustification} onChange={handleChange} rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Dlaczego zasób jest nadal używany mimo statusu legacy?"></textarea>
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* 2. Własność i lokalizacja */}
        {currentStep === 2 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">2. Własność i lokalizacja</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Właściciel zasobu <span className="text-rose-500">*</span>
              </label>
              <input type="text" name="owner" value={formData.owner} onChange={handleChange} className={`w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm p-2 border ${errors.owner ? 'border-rose-500 focus:border-rose-500' : 'border-slate-300 focus:border-indigo-500'}`} />
              {errors.owner && <p className="mt-1 text-xs text-rose-500 flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.owner}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jednostka organizacyjna właściciela</label>
              <input type="text" name="ownerUnit" value={formData.ownerUnit} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lokalizacja fizyczna</label>
              <input type="text" name="physicalLocation" value={formData.physicalLocation} onChange={handleChange} placeholder="np. Datacenter Warszawa, Rack A3" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lokalizacja logiczna</label>
              <input type="text" name="logicalLocation" value={formData.logicalLocation} onChange={handleChange} placeholder="np. Chmura AWS eu-central-1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Narażenie na sieci zewnętrzne</label>
              <div className="flex space-x-6">
                <label className="inline-flex items-center">
                  <input type="radio" name="externalNetworkExposure" value="Tak" checked={formData.externalNetworkExposure === 'Tak'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                  <span className="ml-2 text-sm text-slate-700">Tak</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="externalNetworkExposure" value="Nie" checked={formData.externalNetworkExposure === 'Nie'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                  <span className="ml-2 text-sm text-slate-700">Nie</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="externalNetworkExposure" value="Częściowe" checked={formData.externalNetworkExposure === 'Częściowe'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                  <span className="ml-2 text-sm text-slate-700">Częściowe</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Powiązani zewnętrzni dostawcy ICT</label>
                <button type="button" onClick={handleProviderAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <Plus className="h-3 w-3 mr-1" /> Dodaj dostawcę
                </button>
              </div>
              {formData.providers.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak powiązanych dostawców.</p>
              ) : (
                <div className="space-y-2">
                  {formData.providers.map((provider) => (
                    <div key={provider.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                      <input type="text" placeholder="Nazwa dostawcy" value={provider.name} onChange={(e) => handleProviderChange(provider.id, 'name', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                      <input type="text" placeholder="Rodzaj usługi" value={provider.serviceType} onChange={(e) => handleProviderChange(provider.id, 'serviceType', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                      <button type="button" onClick={() => handleProviderRemove(provider.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* 3. Krytyczność i funkcje biznesowe */}
        {currentStep === 3 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">3. Krytyczność i funkcje biznesowe</h3>
          <div className="grid grid-cols-1 gap-6">
            
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-3">Klasyfikacja krytyczności</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${formData.criticality === 'Krytyczna' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300'}`}>
                  <input type="radio" name="criticality" value="Krytyczna" checked={formData.criticality === 'Krytyczna'} onChange={handleChange} className="sr-only" />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className={`block text-sm font-medium ${formData.criticality === 'Krytyczna' ? 'text-rose-900' : 'text-slate-900'}`}>Krytyczna</span>
                      <span className="mt-1 flex items-center text-xs text-slate-500">Wspiera krytyczne funkcje biznesowe.</span>
                    </span>
                  </span>
                  <CheckCircleIcon className={`h-5 w-5 ${formData.criticality === 'Krytyczna' ? 'text-rose-600' : 'invisible'}`} />
                </label>
                
                <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${formData.criticality === 'Ważna' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-300'}`}>
                  <input type="radio" name="criticality" value="Ważna" checked={formData.criticality === 'Ważna'} onChange={handleChange} className="sr-only" />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className={`block text-sm font-medium ${formData.criticality === 'Ważna' ? 'text-amber-900' : 'text-slate-900'}`}>Ważna</span>
                      <span className="mt-1 flex items-center text-xs text-slate-500">Istotny wpływ na działalność.</span>
                    </span>
                  </span>
                  <CheckCircleIcon className={`h-5 w-5 ${formData.criticality === 'Ważna' ? 'text-amber-600' : 'invisible'}`} />
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none ${formData.criticality === 'Standardowa' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-300'}`}>
                  <input type="radio" name="criticality" value="Standardowa" checked={formData.criticality === 'Standardowa'} onChange={handleChange} className="sr-only" />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className={`block text-sm font-medium ${formData.criticality === 'Standardowa' ? 'text-emerald-900' : 'text-slate-900'}`}>Standardowa</span>
                      <span className="mt-1 flex items-center text-xs text-slate-500">Standardowe wsparcie operacyjne.</span>
                    </span>
                  </span>
                  <CheckCircleIcon className={`h-5 w-5 ${formData.criticality === 'Standardowa' ? 'text-emerald-600' : 'invisible'}`} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Uzasadnienie klasyfikacji</label>
              <textarea name="criticalityJustification" value={formData.criticalityJustification} onChange={handleChange} rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Wspierane funkcje biznesowe</label>
                <button type="button" onClick={handleBusinessFunctionAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <Plus className="h-3 w-3 mr-1" /> Dodaj funkcję
                </button>
              </div>
              {formData.businessFunctions.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak zdefiniowanych funkcji biznesowych.</p>
              ) : (
                <div className="space-y-2">
                  {formData.businessFunctions.map((func) => (
                    <div key={func.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                      <select
                        value={func.name}
                        onChange={(e) => handleBusinessFunctionChange(func.id, e.target.value)}
                        className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                      >
                        <option value="">Wybierz KLIF...</option>
                        {availableKlifs.map(klif => (
                          <option key={klif.id} value={klif.name}>{klif.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleBusinessFunctionRemove(func.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        )}

        {/* 4. Ciągłość działania i ryzyko */}
        {currentStep === 3 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">Ciągłość działania i ryzyko</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">RTO (Recovery Time Objective)</label>
                <input type="number" name="rtoValue" value={formData.rtoValue} onChange={handleChange} min="0" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">&nbsp;</label>
                <select name="rtoUnit" value={formData.rtoUnit} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="minuty">minuty</option>
                  <option value="godziny">godziny</option>
                  <option value="dni">dni</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">RPO (Recovery Point Objective)</label>
                <input type="number" name="rpoValue" value={formData.rpoValue} onChange={handleChange} min="0" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">&nbsp;</label>
                <select name="rpoUnit" value={formData.rpoUnit} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="minuty">minuty</option>
                  <option value="godziny">godziny</option>
                  <option value="dni">dni</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wpływ na Poufność</label>
                <select name="confidentialityImpact" value={formData.confidentialityImpact} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Niski">Niski</option>
                  <option value="Średni">Średni</option>
                  <option value="Wysoki">Wysoki</option>
                  <option value="Krytyczny">Krytyczny</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wpływ na Integralność</label>
                <select name="integrityImpact" value={formData.integrityImpact} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Niski">Niski</option>
                  <option value="Średni">Średni</option>
                  <option value="Wysoki">Wysoki</option>
                  <option value="Krytyczny">Krytyczny</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Wpływ na Dostępność</label>
                <select name="availabilityImpact" value={formData.availabilityImpact} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border">
                  <option value="">Wybierz...</option>
                  <option value="Niski">Niski</option>
                  <option value="Średni">Średni</option>
                  <option value="Wysoki">Wysoki</option>
                  <option value="Krytyczny">Krytyczny</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Zidentyfikowane ryzyka ICT</label>
                <button type="button" onClick={handleRiskAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <Plus className="h-3 w-3 mr-1" /> Dodaj ryzyko
                </button>
              </div>
              {formData.risks.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak powiązanych ryzyk.</p>
              ) : (
                <div className="space-y-2">
                  {formData.risks.map((risk) => (
                    <div key={risk.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                      <select
                        value={risk.description}
                        onChange={(e) => {
                          const selectedRisk = availableRisks.find(r => r.scenario === e.target.value);
                          handleRiskChange(risk.id, 'description', e.target.value);
                          if (selectedRisk) {
                            handleRiskChange(risk.id, 'remediationStatus', selectedRisk.actionStatus);
                          }
                        }}
                        className="flex-[2] rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border"
                      >
                        <option value="">Wybierz ryzyko z rejestru...</option>
                        {availableRisks.map(r => (
                          <option key={r.id} value={r.scenario}>{r.scenario}</option>
                        ))}
                      </select>
                      <input type="text" placeholder="Status remedjacji" value={risk.remediationStatus} onChange={(e) => handleRiskChange(risk.id, 'remediationStatus', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                      <button type="button" onClick={() => handleRiskRemove(risk.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </section>
        )}

        {/* 4. Bezpieczeństwo i zgodność */}
        {currentStep === 4 && showSecuritySection && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">
              4. Bezpieczeństwo i zgodność 
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Wymagane dla {formData.criticality}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">Wymagania kontroli dostępu</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input type="checkbox" id="mfa" name="accessControlMfa" checked={formData.accessControlMfa} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                    <label htmlFor="mfa" className="ml-2 block text-sm text-slate-900">MFA (Multi-Factor Authentication)</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="leastPrivilege" name="accessControlLeastPrivilege" checked={formData.accessControlLeastPrivilege} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                    <label htmlFor="leastPrivilege" className="ml-2 block text-sm text-slate-900">Zasada najmniejszych uprawnień</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="pam" name="accessControlPam" checked={formData.accessControlPam} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                    <label htmlFor="pam" className="ml-2 block text-sm text-slate-900">PAM (Privileged Access Management)</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" id="sso" name="accessControlSso" checked={formData.accessControlSso} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                    <label htmlFor="sso" className="ml-2 block text-sm text-slate-900">SSO (Single Sign-On)</label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Szyfrowanie w spoczynku</label>
                  <div className="flex space-x-6">
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionAtRest" value="Tak" checked={formData.encryptionAtRest === 'Tak'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Tak</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionAtRest" value="Nie" checked={formData.encryptionAtRest === 'Nie'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Nie</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionAtRest" value="Częściowe" checked={formData.encryptionAtRest === 'Częściowe'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Częściowe</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Szyfrowanie w tranzycie</label>
                  <div className="flex space-x-6">
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionInTransit" value="Tak" checked={formData.encryptionInTransit === 'Tak'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Tak</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionInTransit" value="Nie" checked={formData.encryptionInTransit === 'Nie'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Nie</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" name="encryptionInTransit" value="Częściowe" checked={formData.encryptionInTransit === 'Częściowe'} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300" />
                      <span className="ml-2 text-sm text-slate-700">Częściowe</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Standard kryptograficzny</label>
                  <input type="text" name="cryptoStandard" value={formData.cryptoStandard} onChange={handleChange} placeholder="np. AES-256, TLS 1.3" className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Zidentyfikowane podatności</label>
                  <button type="button" onClick={handleVulnerabilityAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <Plus className="h-3 w-3 mr-1" /> Dodaj podatność
                  </button>
                </div>
                {formData.vulnerabilities.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak zidentyfikowanych podatności.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.vulnerabilities.map((vuln) => (
                      <div key={vuln.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                        <input type="text" placeholder="CVE ID" value={vuln.cveId} onChange={(e) => handleVulnerabilityChange(vuln.id, 'cveId', e.target.value)} className="w-32 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                        <input type="text" placeholder="Opis" value={vuln.description} onChange={(e) => handleVulnerabilityChange(vuln.id, 'description', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                        <input type="text" placeholder="Status" value={vuln.status} onChange={(e) => handleVulnerabilityChange(vuln.id, 'status', e.target.value)} className="w-32 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                        <button type="button" onClick={() => handleVulnerabilityRemove(vuln.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

        {/* 5. Dostawcy zewnętrzni */}
        {currentStep === 5 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">5. Dostawcy zewnętrzni</h3>
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">Powiązani zewnętrzni dostawcy ICT</label>
                <button type="button" onClick={handleProviderAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <Plus className="h-3 w-3 mr-1" /> Dodaj dostawcę
                </button>
              </div>
              {formData.providers.length === 0 ? (
                <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak powiązanych dostawców.</p>
              ) : (
                <div className="space-y-2">
                  {formData.providers.map((provider) => (
                    <div key={provider.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                      <input type="text" placeholder="Nazwa dostawcy" value={provider.name} onChange={(e) => handleProviderChange(provider.id, 'name', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                      <input type="text" placeholder="Rodzaj usługi" value={provider.serviceType} onChange={(e) => handleProviderChange(provider.id, 'serviceType', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                      <button type="button" onClick={() => handleProviderRemove(provider.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. Mapowanie zależności */}
        {currentStep === 6 && showDependenciesSection && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">
              6. Mapowanie zależności
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                Wymagane dla Krytyczna
              </span>
            </h3>
            <div className="grid grid-cols-1 gap-6">
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Powiązane zasoby ICT</label>
                  <button type="button" onClick={handleRelatedAssetAdd} className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <Plus className="h-3 w-3 mr-1" /> Dodaj powiązanie
                  </button>
                </div>
                {formData.relatedAssets.length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-md border border-slate-200">Brak powiązanych zasobów.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.relatedAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-200">
                        <input type="text" placeholder="ID zasobu" value={asset.assetId} onChange={(e) => handleRelatedAssetChange(asset.id, 'assetId', e.target.value)} className="w-48 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border font-mono" />
                        <input type="text" placeholder="Nazwa zasobu" value={asset.assetName} onChange={(e) => handleRelatedAssetChange(asset.id, 'assetName', e.target.value)} className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1.5 border" />
                        <button type="button" onClick={() => handleRelatedAssetRemove(asset.id)} className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Przepływy informacji – dane wchodzące</label>
                  <textarea name="dataFlowIn" value={formData.dataFlowIn} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Przepływy informacji – dane wychodzące</label>
                  <textarea name="dataFlowOut" value={formData.dataFlowOut} onChange={handleChange} rows={3} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dane w spoczynku – opis</label>
                  <textarea name="dataAtRestDesc" value={formData.dataAtRestDesc} onChange={handleChange} rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
                </div>
              </div>

            </div>
          </section>
        )}

        {/* 7. Metadane rejestru */}
        {currentStep === 7 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4">7. Metadane rejestru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data dodania do rejestru</label>
              <input type="date" name="registryAddDate" value={formData.registryAddDate} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data ostatniej aktualizacji</label>
              <input type="date" name="lastUpdateDate" value={formData.lastUpdateDate} readOnly className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-slate-100 text-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Autor wpisu</label>
              <input type="text" name="author" value={formData.author} onChange={handleChange} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Uwagi dodatkowe</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
            </div>
          </div>
        </section>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between border-t border-slate-200 pt-4">
          <button
            onClick={() => {
              let nextStep = currentStep - 1;
              if (nextStep === 6 && !showDependenciesSection) nextStep = 5;
              if (nextStep === 4 && !showSecuritySection) nextStep = 3;
              setCurrentStep(Math.max(1, nextStep));
            }}
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
                onClick={() => {
                  let nextStep = currentStep + 1;
                  if (nextStep === 4 && !showSecuritySection) nextStep = 5;
                  if (nextStep === 6 && !showDependenciesSection) nextStep = 7;
                  setCurrentStep(Math.min(totalSteps, nextStep));
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Dalej
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Zapisz Zasób
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
