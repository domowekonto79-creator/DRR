import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { DostawcaICT, ZakresUmowy } from '../types';
import { Save, X, AlertCircle, Plus, Trash2, Loader2, Edit2 } from 'lucide-react';

interface ProviderFormProps {
  provider: DostawcaICT | null;
  onSave: () => void;
  onCancel: () => void;
}

const TOTAL_STEPS = 6;

const SERVICE_CATEGORIES = [
  { code: 'S01', name: 'Zarządzanie projektami ICT' },
  { code: 'S02', name: 'Rozwój ICT' },
  { code: 'S03', name: 'Dział pomocy technicznej ICT i wsparcie pierwszej linii' },
  { code: 'S04', name: 'Usługi zarządzania bezpieczeństwem ICT' },
  { code: 'S05', name: 'Przekazywanie danych' },
  { code: 'S06', name: 'Analiza danych' },
  { code: 'S07', name: 'ICT, infrastruktura i usługi hostingu (z wyłączeniem usług w chmurze)' },
  { code: 'S08', name: 'Zasoby obliczeniowe' },
  { code: 'S09', name: 'Przechowywanie danych poza chmurą' },
  { code: 'S10', name: 'Usługi telekomunikacyjne' },
  { code: 'S11', name: 'Infrastruktura sieciowa' },
  { code: 'S12', name: 'Sprzęt i urządzenia fizyczne' },
  { code: 'S13', name: 'Licencjonowanie oprogramowania (z wyłączeniem SaaS)' },
  { code: 'S14', name: 'Zarządzanie operacjami ICT (w tym utrzymanie)' },
  { code: 'S15', name: 'Doradztwo w zakresie ICT' },
  { code: 'S16', name: 'Zarządzanie ryzykiem związanym z ICT' },
  { code: 'S17', name: 'Usługi w chmurze: IaaS' },
  { code: 'S18', name: 'Usługi w chmurze: PaaS' },
  { code: 'S19', name: 'Usługi w chmurze: SaaS' },
];

const ProviderForm: React.FC<ProviderFormProps> = ({ provider, onSave, onCancel }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<DostawcaICT>>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingLei, setLoadingLei] = useState(false);
  const [leiStatusAlert, setLeiStatusAlert] = useState<string | null>(null);
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [loadingNameSearch, setLoadingNameSearch] = useState(false);

  const fetchParentData = async (lei: string) => {
    try {
        const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`);
        if (!response.ok) return;
        const json = await response.json();
        const name = json.data.attributes.entity.legalName.name;
        
        setFormData(prev => ({
            ...prev,
            lei_jednostki_dominujacej: lei,
            nazwa_jednostki_dominujacej: name
        }));
    } catch (e) {
        console.error("Error fetching parent data", e);
    }
  };

  const fetchNipFromKrs = async (krs: string) => {
    try {
      const response = await fetch(`https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krs}?rejestr=P&format=json`);
      if (!response.ok) return null;
      const json = await response.json();
      return json.odpis?.dane?.dzial1?.danePodmiotu?.identyfikatory?.nip;
    } catch (e) {
      console.warn("KRS API fetch failed", e);
      return null;
    }
  };

  const fetchGleifData = async (lei: string) => {
    if (!lei || lei.length !== 20) return;

    setLoadingLei(true);
    setLeiStatusAlert(null);

    try {
      // Include direct and ultimate parents to check for capital group
      const response = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}?include=direct-parent,ultimate-parent`);
      if (!response.ok) throw new Error('Nie udało się pobrać danych z GLEIF');
      
      const json = await response.json();
      const data = json.data.attributes;
      // relationships are in json.data.relationships when using include
      const relationships = json.data.relationships;

      const legalName = data.entity.legalName.name;
      const country = data.entity.legalAddress.country;
      
      const addressParts = [
        data.entity.legalAddress.addressLines?.join(', '),
        data.entity.legalAddress.city,
        data.entity.legalAddress.postalCode,
        data.entity.legalAddress.country
      ].filter(Boolean);
      const address = addressParts.join(', ');

      const status = data.registration.registrationStatus;
      if (status !== 'ISSUED') {
        setLeiStatusAlert(`⚠️ LEI ma status: ${status}. Aktywny status to ISSUED.`);
      }

      let nip = null;
      const regAuth = data.registration.registrationAuthority;
      if (regAuth && regAuth.registrationAuthorityId === 'RA000535' && regAuth.registrationAuthorityEntityId) {
          const krs = regAuth.registrationAuthorityEntityId;
          nip = await fetchNipFromKrs(krs);
      }

      setFormData(prev => ({
        ...prev,
        nazwa_prawna: legalName,
        kraj_rejestracji: country,
        adres_siedziby: address,
        nip: nip || prev.nip
      }));
      setIsNameLocked(true);

      // Check for parent relationships
      const directParent = relationships?.['direct-parent']?.data;
      const ultimateParent = relationships?.['ultimate-parent']?.data;
      const parent = directParent || ultimateParent;

      if (parent) {
        setFormData(prev => ({ ...prev, czy_grupa_kapitalowa: true }));
        await fetchParentData(parent.id);
      } else {
        setFormData(prev => ({ ...prev, czy_grupa_kapitalowa: false }));
      }

    } catch (error) {
      console.error(error);
      setLeiStatusAlert('Błąd pobierania danych z GLEIF.');
    } finally {
      setLoadingLei(false);
    }
  };

  const fetchByLegalName = async (name: string) => {
      if (!name || name.length < 3) return;
      
      setLoadingNameSearch(true);
      try {
          const response = await fetch(`https://api.gleif.org/api/v1/lei-records?filter[entity.legalName]=${encodeURIComponent(name)}&page[size]=1`);
          if (!response.ok) throw new Error('GLEIF Search failed');
          
          const json = await response.json();
          if (json.data && json.data.length > 0) {
              const record = json.data[0];
              const lei = record.attributes.lei;
              setFormData(prev => ({ ...prev, lei }));
              await fetchGleifData(lei);
          }
      } catch (e) {
          console.error("Name search failed", e);
      } finally {
          setLoadingNameSearch(false);
      }
  };

  useEffect(() => {
    if (provider) {
      setFormData(provider);
    } else {
      setFormData({
        id: crypto.randomUUID(),
        nazwa_prawna: '',
        lei: '',
        numer_referencyjny_umowy: '',
        data_zawarcia_umowy: '',
        typ_dostawcy: 'Zewnętrzny',
        autor_wpisu: 'user@example.com',
        kraj_rejestracji: 'PL',
        czy_grupa_kapitalowa: false,
        czy_kluczowy_dostawca_esa: false,
        zakres_umowy: [],
      });
    }
    setErrors({});
  }, [provider]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData({ ...formData, [name]: processedValue });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleZakresAdd = () => {
    setFormData(prev => ({
      ...prev,
      zakres_umowy: [
        ...(prev.zakres_umowy || []),
        { id: crypto.randomUUID(), rodzaj_postanowienia: '', kategoria_uslugi: '' }
      ]
    }));
  };

  const handleZakresChange = (id: string, field: keyof ZakresUmowy, value: string) => {
    setFormData(prev => ({
      ...prev,
      zakres_umowy: (prev.zakres_umowy || []).map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleZakresRemove = (id: string) => {
    setFormData(prev => ({
      ...prev,
      zakres_umowy: (prev.zakres_umowy || []).filter(item => item.id !== id)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nazwa_prawna) newErrors.nazwa_prawna = 'Nazwa prawna jest wymagana';
    if (!formData.lei) newErrors.lei = 'LEI jest wymagane';
    if (!formData.numer_referencyjny_umowy) newErrors.numer_referencyjny_umowy = 'Numer umowy jest wymagany';
    if (!formData.data_zawarcia_umowy) newErrors.data_zawarcia_umowy = 'Data zawarcia umowy jest wymagana';
    if (!formData.kraj_rejestracji) newErrors.kraj_rejestracji = 'Kraj rejestracji jest wymagany';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Find the step of the first error
      if (newErrors.nazwa_prawna || newErrors.lei || newErrors.kraj_rejestracji) setStep(1);
      else if (newErrors.numer_referencyjny_umowy || newErrors.data_zawarcia_umowy) setStep(2);
      
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Popraw błędy w formularzu przed zapisaniem.');
      return;
    }

    setSaving(true);

    try {
      const dataToSave: Partial<DostawcaICT> = { ...formData };

      const arrayFields: (keyof DostawcaICT)[] = ['kraje_przetwarzania', 'kraje_przechowywania', 'typy_danych'];
      arrayFields.forEach(field => {
        if (dataToSave[field] && typeof dataToSave[field] === 'string') {
          (dataToSave[field] as any) = (dataToSave[field] as string).split(',').map(s => s.trim()).filter(s => s);
        }
      });

      const numericFields: (keyof DostawcaICT)[] = [
        'wartosc_kontraktu', 'ocena_ryzyka_wartosc', 'rto_wartosc', 'rpo_wartosc',
        'exit_plan_okres_wypowiedzenia', 'exit_plan_czas_migracji_dni'
      ];
      numericFields.forEach(field => {
        const value = dataToSave[field];
        if (value === '' || value === undefined || value === null) {
          (dataToSave[field] as any) = null;
        } else if (typeof value === 'string') {
          const parsed = parseFloat(value);
          (dataToSave[field] as any) = isNaN(parsed) ? null : parsed;
        }
      });

      const dateFields: (keyof DostawcaICT)[] = [
        'data_zawarcia_umowy', 'data_wygasniecia_umowy', 'data_ostatniej_oceny',
        'data_kolejnego_przegladu', 'data_ostatniego_audytu', 'data_ostatniego_przegladu'
      ];
      dateFields.forEach(field => {
        if (dataToSave[field] === '') {
          (dataToSave[field] as any) = null;
        }
      });

      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Błąd konfiguracji Supabase.');
      }

      const { error } = provider?.id
        ? await supabase.from('dostawcy_ict').update(dataToSave).eq('id', provider.id)
        : await supabase.from('dostawcy_ict').insert([dataToSave]);

      if (error) {
        throw error;
      }

      alert('Dostawca zapisany pomyślnie!');
      onSave();

    } catch (err: any) {
      console.error('Błąd podczas zapisywania dostawcy:', err);
      alert(`Zapis nie powiódł się: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 1: Identyfikacja dostawcy</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="lei" className="block text-sm font-medium text-gray-700">LEI *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input 
                    type="text" 
                    name="lei" 
                    id="lei" 
                    value={formData.lei || ''} 
                    onChange={handleChange} 
                    onBlur={(e) => fetchGleifData(e.target.value)}
                    className={`block w-full rounded-md sm:text-sm ${errors.lei ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} 
                  />
                  {loadingLei && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
                {errors.lei && <p className="mt-2 text-sm text-red-600">{errors.lei}</p>}
                {leiStatusAlert && <p className="mt-2 text-sm text-amber-600 font-medium">{leiStatusAlert}</p>}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="nazwa_prawna" className="block text-sm font-medium text-gray-700">Nazwa Prawna *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input 
                    type="text" 
                    name="nazwa_prawna" 
                    id="nazwa_prawna" 
                    value={formData.nazwa_prawna || ''} 
                    onChange={handleChange} 
                    onBlur={(e) => !isNameLocked && fetchByLegalName(e.target.value)}
                    readOnly={isNameLocked}
                    className={`block w-full rounded-md sm:text-sm ${errors.nazwa_prawna ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} ${isNameLocked ? 'bg-gray-100 text-gray-500' : ''}`} 
                  />
                  {loadingNameSearch && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    </div>
                  )}
                  {isNameLocked && !loadingNameSearch && (
                    <button
                      type="button"
                      onClick={() => setIsNameLocked(false)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                {errors.nazwa_prawna && <p className="mt-2 text-sm text-red-600">{errors.nazwa_prawna}</p>}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="nip" className="block text-sm font-medium text-gray-700">NIP</label>
                <input type="text" name="nip" id="nip" value={formData.nip || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="kraj_rejestracji" className="block text-sm font-medium text-gray-700">Kraj Rejestracji (kod 2-literowy) *</label>
                <input type="text" name="kraj_rejestracji" id="kraj_rejestracji" value={formData.kraj_rejestracji || ''} onChange={handleChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.kraj_rejestracji ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} maxLength={2} />
                {errors.kraj_rejestracji && <p className="mt-2 text-sm text-red-600">{errors.kraj_rejestracji}</p>}
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="adres_siedziby" className="block text-sm font-medium text-gray-700">Adres Siedziby</label>
                <textarea name="adres_siedziby" id="adres_siedziby" value={formData.adres_siedziby || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="typ_dostawcy" className="block text-sm font-medium text-gray-700">Typ Dostawcy</label>
                <select name="typ_dostawcy" id="typ_dostawcy" value={formData.typ_dostawcy || 'Zewnętrzny'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option>Zewnętrzny</option>
                  <option>Wewnątrzgrupowy</option>
                </select>
              </div>

              <div className="sm:col-span-6 flex items-center">
                <input type="checkbox" name="czy_grupa_kapitalowa" id="czy_grupa_kapitalowa" checked={formData.czy_grupa_kapitalowa || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="czy_grupa_kapitalowa" className="ml-2 block text-sm text-gray-900">Część grupy kapitałowej?</label>
              </div>

              {formData.czy_grupa_kapitalowa && (
                <div className="sm:col-span-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 pl-6 border-l-2 border-gray-200">
                  <div className="sm:col-span-3">
                    <label htmlFor="nazwa_jednostki_dominujacej" className="block text-sm font-medium text-gray-700">Nazwa jednostki dominującej</label>
                    <input type="text" name="nazwa_jednostki_dominujacej" id="nazwa_jednostki_dominujacej" value={formData.nazwa_jednostki_dominujacej || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="lei_jednostki_dominujacej" className="block text-sm font-medium text-gray-700">LEI jednostki dominującej</label>
                    <input type="text" name="lei_jednostki_dominujacej" id="lei_jednostki_dominujacej" value={formData.lei_jednostki_dominujacej || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                </div>
              )}

              <div className="sm:col-span-6 flex items-center">
                <input type="checkbox" name="czy_kluczowy_dostawca_esa" id="czy_kluczowy_dostawca_esa" checked={formData.czy_kluczowy_dostawca_esa || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="czy_kluczowy_dostawca_esa" className="ml-2 block text-sm text-gray-900">Kluczowy dostawca ESA?</label>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 2: Dane umowne</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="numer_referencyjny_umowy" className="block text-sm font-medium text-gray-700">Numer Referencyjny Umowy *</label>
                <input type="text" name="numer_referencyjny_umowy" id="numer_referencyjny_umowy" value={formData.numer_referencyjny_umowy || ''} onChange={handleChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.numer_referencyjny_umowy ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.numer_referencyjny_umowy && <p className="mt-2 text-sm text-red-600">{errors.numer_referencyjny_umowy}</p>}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_zawarcia_umowy" className="block text-sm font-medium text-gray-700">Data Zawarcia Umowy *</label>
                <input type="date" name="data_zawarcia_umowy" id="data_zawarcia_umowy" value={formData.data_zawarcia_umowy || ''} onChange={handleChange} className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${errors.data_zawarcia_umowy ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`} />
                {errors.data_zawarcia_umowy && <p className="mt-2 text-sm text-red-600">{errors.data_zawarcia_umowy}</p>}
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_wygasniecia_umowy" className="block text-sm font-medium text-gray-700">Data Wygaśnięcia Umowy</label>
                <input type="date" name="data_wygasniecia_umowy" id="data_wygasniecia_umowy" value={formData.data_wygasniecia_umowy || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6 flex items-center pt-2">
                <input type="checkbox" name="opcje_przedluzenia" id="opcje_przedluzenia" checked={formData.opcje_przedluzenia || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="opcje_przedluzenia" className="ml-2 block text-sm text-gray-900">Opcje przedłużenia</label>
              </div>

              {formData.opcje_przedluzenia && (
                <div className="sm:col-span-6">
                  <label htmlFor="opcje_przedluzenia_opis" className="block text-sm font-medium text-gray-700">Opis opcji przedłużenia</label>
                  <textarea name="opcje_przedluzenia_opis" id="opcje_przedluzenia_opis" value={formData.opcje_przedluzenia_opis || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                </div>
              )}

              <div className="sm:col-span-2">
                <label htmlFor="waluta" className="block text-sm font-medium text-gray-700">Waluta (kod 3-literowy)</label>
                <input type="text" name="waluta" id="waluta" value={formData.waluta || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" maxLength={3} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="wartosc_kontraktu" className="block text-sm font-medium text-gray-700">Wartość kontraktu</label>
                <input type="number" name="wartosc_kontraktu" id="wartosc_kontraktu" value={formData.wartosc_kontraktu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="prawo_wlasciwe" className="block text-sm font-medium text-gray-700">Prawo właściwe</label>
                <input type="text" name="prawo_wlasciwe" id="prawo_wlasciwe" value={formData.prawo_wlasciwe || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="jurysdykcja_sadu" className="block text-sm font-medium text-gray-700">Jurysdykcja sądu</label>
                <input type="text" name="jurysdykcja_sadu" id="jurysdykcja_sadu" value={formData.jurysdykcja_sadu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-medium text-gray-800">Zakres umowy</h4>
                  <button
                    type="button"
                    onClick={handleZakresAdd}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Dodaj postanowienie umowne
                  </button>
                </div>
                
                {formData.zakres_umowy && formData.zakres_umowy.length > 0 ? (
                  <div className="space-y-3">
                    {formData.zakres_umowy.map((item) => (
                      <div key={item.id} className="flex gap-4 items-start bg-gray-50 p-3 rounded-md">
                        <div className="flex-1">
                          <label htmlFor={`rodzaj_${item.id}`} className="block text-xs font-medium text-gray-500 mb-1">Rodzaj postanowienia</label>
                          <input
                            type="text"
                            id={`rodzaj_${item.id}`}
                            value={item.rodzaj_postanowienia || ''}
                            onChange={(e) => handleZakresChange(item.id, 'rodzaj_postanowienia', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Wpisz rodzaj..."
                          />
                        </div>
                        <div className="flex-1">
                          <label htmlFor={`kategoria_${item.id}`} className="block text-xs font-medium text-gray-500 mb-1">Kategoria usługi</label>
                          <select
                            id={`kategoria_${item.id}`}
                            value={item.kategoria_uslugi || ''}
                            onChange={(e) => handleZakresChange(item.id, 'kategoria_uslugi', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">Wybierz kategorię...</option>
                            {SERVICE_CATEGORIES.map(cat => (
                              <option key={cat.code} value={cat.code}>
                                {cat.code} - {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleZakresRemove(item.id)}
                          className="mt-6 text-red-600 hover:text-red-800"
                          title="Usuń"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Brak dodanych postanowień umownych.</p>
                )}
              </div>

              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-800 mb-2">Klauzule umowne</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_prawo_audytu" id="klauzula_prawo_audytu" checked={formData.klauzula_prawo_audytu || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_prawo_audytu" className="ml-2 block text-sm text-gray-900">Prawo do audytu</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_prawo_wypowiedzenia" id="klauzula_prawo_wypowiedzenia" checked={formData.klauzula_prawo_wypowiedzenia || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_prawo_wypowiedzenia" className="ml-2 block text-sm text-gray-900">Prawo do wypowiedzenia</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_raportowanie_incydentow" id="klauzula_raportowanie_incydentow" checked={formData.klauzula_raportowanie_incydentow || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_raportowanie_incydentow" className="ml-2 block text-sm text-gray-900">Raportowanie incydentów</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_sla" id="klauzula_sla" checked={formData.klauzula_sla || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_sla" className="ml-2 block text-sm text-gray-900">SLA</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_bcp_dostawcy" id="klauzula_bcp_dostawcy" checked={formData.klauzula_bcp_dostawcy || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_bcp_dostawcy" className="ml-2 block text-sm text-gray-900">BCP Dostawcy</label>
                  </div>
                  <div className="flex items-center">
                    <input type="checkbox" name="klauzula_zmiany_podwykonawcow" id="klauzula_zmiany_podwykonawcow" checked={formData.klauzula_zmiany_podwykonawcow || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="klauzula_zmiany_podwykonawcow" className="ml-2 block text-sm text-gray-900">Zmiany podwykonawców</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 3: Przetwarzanie danych i model wdrożenia</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="kraje_przetwarzania" className="block text-sm font-medium text-gray-700">Kraje przetwarzania (kody, oddzielone przecinkami)</label>
                <input type="text" name="kraje_przetwarzania" id="kraje_przetwarzania" value={Array.isArray(formData.kraje_przetwarzania) ? formData.kraje_przetwarzania.join(',') : formData.kraje_przetwarzania || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="kraje_przechowywania" className="block text-sm font-medium text-gray-700">Kraje przechowywania (kody, oddzielone przecinkami)</label>
                <input type="text" name="kraje_przechowywania" id="kraje_przechowywania" value={Array.isArray(formData.kraje_przechowywania) ? formData.kraje_przechowywania.join(',') : formData.kraje_przechowywania || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6 flex items-center">
                <input type="checkbox" name="czy_poza_eog" id="czy_poza_eog" checked={formData.czy_poza_eog || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="czy_poza_eog" className="ml-2 block text-sm text-gray-900">Przetwarzanie/przechowywanie poza EOG?</label>
              </div>

              {formData.czy_poza_eog && (
                <div className="sm:col-span-6">
                  <label htmlFor="uzasadnienie_poza_eog" className="block text-sm font-medium text-gray-700">Uzasadnienie przetwarzania poza EOG</label>
                  <textarea name="uzasadnienie_poza_eog" id="uzasadnienie_poza_eog" value={formData.uzasadnienie_poza_eog || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                </div>
              )}

              <div className="sm:col-span-3">
                <label htmlFor="typy_danych" className="block text-sm font-medium text-gray-700">Typy danych (oddzielone przecinkami)</label>
                <input type="text" name="typy_danych" id="typy_danych" value={Array.isArray(formData.typy_danych) ? formData.typy_danych.join(',') : formData.typy_danych || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="model_wdrozenia" className="block text-sm font-medium text-gray-700">Model wdrożenia</label>
                <select name="model_wdrozenia" id="model_wdrozenia" value={formData.model_wdrozenia || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="">Wybierz...</option>
                  <option>Chmura publiczna</option>
                  <option>Chmura prywatna</option>
                  <option>Chmura hybrydowa</option>
                  <option>On-premise</option>
                  <option>Mieszany</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 4: Ocena ryzyka i ciągłość działania</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="ryzyko_koncentracji" className="block text-sm font-medium text-gray-700">Ryzyko koncentracji</label>
                <select name="ryzyko_koncentracji" id="ryzyko_koncentracji" value={formData.ryzyko_koncentracji || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="">Wybierz...</option>
                  <option>Niskie</option>
                  <option>Średnie</option>
                  <option>Wysokie</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="zastepowanosc" className="block text-sm font-medium text-gray-700">Zastępowalność</label>
                <select name="zastepowanosc" id="zastepowanosc" value={formData.zastepowanosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="">Wybierz...</option>
                  <option>Łatwa</option>
                  <option>Trudna</option>
                  <option>Niemożliwa</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="ocena_ryzyka_wartosc" className="block text-sm font-medium text-gray-700">Ocena ryzyka (wartość)</label>
                <input type="number" name="ocena_ryzyka_wartosc" id="ocena_ryzyka_wartosc" value={formData.ocena_ryzyka_wartosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="alternatywni_dostawcy" className="block text-sm font-medium text-gray-700">Alternatywni dostawcy</label>
                <textarea name="alternatywni_dostawcy" id="alternatywni_dostawcy" value={formData.alternatywni_dostawcy || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="ocena_ryzyka_uzasadnienie" className="block text-sm font-medium text-gray-700">Uzasadnienie oceny ryzyka</label>
                <textarea name="ocena_ryzyka_uzasadnienie" id="ocena_ryzyka_uzasadnienie" value={formData.ocena_ryzyka_uzasadnienie || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
              </div>

              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-800 mb-2">Wpływ na</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="wplyw_poufnosc" className="block text-sm font-medium text-gray-700">Poufność</label>
                    <select name="wplyw_poufnosc" id="wplyw_poufnosc" value={formData.wplyw_poufnosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                      <option value="">Wybierz...</option>
                      <option>Niski</option>
                      <option>Średni</option>
                      <option>Wysoki</option>
                      <option>Krytyczny</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="wplyw_integralnosc" className="block text-sm font-medium text-gray-700">Integralność</label>
                    <select name="wplyw_integralnosc" id="wplyw_integralnosc" value={formData.wplyw_integralnosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                      <option value="">Wybierz...</option>
                      <option>Niski</option>
                      <option>Średni</option>
                      <option>Wysoki</option>
                      <option>Krytyczny</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="wplyw_dostepnosc" className="block text-sm font-medium text-gray-700">Dostępność</label>
                    <select name="wplyw_dostepnosc" id="wplyw_dostepnosc" value={formData.wplyw_dostepnosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                      <option value="">Wybierz...</option>
                      <option>Niski</option>
                      <option>Średni</option>
                      <option>Wysoki</option>
                      <option>Krytyczny</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_ostatniej_oceny" className="block text-sm font-medium text-gray-700">Data ostatniej oceny</label>
                <input type="date" name="data_ostatniej_oceny" id="data_ostatniej_oceny" value={formData.data_ostatniej_oceny || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_kolejnego_przegladu" className="block text-sm font-medium text-gray-700">Data kolejnego przeglądu</label>
                <input type="date" name="data_kolejnego_przegladu" id="data_kolejnego_przegladu" value={formData.data_kolejnego_przegladu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 5: BCP i Exit Plan</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="rto_wartosc" className="block text-sm font-medium text-gray-700">RTO</label>
                <div className="flex space-x-2">
                  <input type="number" name="rto_wartosc" id="rto_wartosc" value={formData.rto_wartosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  <select name="rto_jednostka" id="rto_jednostka" value={formData.rto_jednostka || 'godziny'} onChange={handleChange} className="mt-1 block w-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option>minuty</option>
                    <option>godziny</option>
                    <option>dni</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="rpo_wartosc" className="block text-sm font-medium text-gray-700">RPO</label>
                <div className="flex space-x-2">
                  <input type="number" name="rpo_wartosc" id="rpo_wartosc" value={formData.rpo_wartosc || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  <select name="rpo_jednostka" id="rpo_jednostka" value={formData.rpo_jednostka || 'godziny'} onChange={handleChange} className="mt-1 block w-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                    <option>minuty</option>
                    <option>godziny</option>
                    <option>dni</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6 flex items-center">
                <input type="checkbox" name="czy_certyfikowany_bcp" id="czy_certyfikowany_bcp" checked={formData.czy_certyfikowany_bcp || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="czy_certyfikowany_bcp" className="ml-2 block text-sm text-gray-900">Certyfikowany BCP?</label>
              </div>

              {formData.czy_certyfikowany_bcp && (
                <div className="sm:col-span-6">
                  <label htmlFor="bcp_certyfikat" className="block text-sm font-medium text-gray-700">Nazwa certyfikatu BCP</label>
                  <input type="text" name="bcp_certyfikat" id="bcp_certyfikat" value={formData.bcp_certyfikat || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                </div>
              )}

              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-800 mb-2">Exit Plan</h4>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="exit_plan_okres_wypowiedzenia" className="block text-sm font-medium text-gray-700">Okres wypowiedzenia (dni)</label>
                    <input type="number" name="exit_plan_okres_wypowiedzenia" id="exit_plan_okres_wypowiedzenia" value={formData.exit_plan_okres_wypowiedzenia || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-3">
                    <label htmlFor="exit_plan_czas_migracji_dni" className="block text-sm font-medium text-gray-700">Szacowany czas migracji (dni)</label>
                    <input type="number" name="exit_plan_czas_migracji_dni" id="exit_plan_czas_migracji_dni" value={formData.exit_plan_czas_migracji_dni || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="exit_plan_opis_migracji" className="block text-sm font-medium text-gray-700">Opis procesu migracji danych</label>
                    <textarea name="exit_plan_opis_migracji" id="exit_plan_opis_migracji" value={formData.exit_plan_opis_migracji || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="exit_plan_ryzyko_danych" className="block text-sm font-medium text-gray-700">Ryzyko związane z przeniesieniem danych</label>
                    <textarea name="exit_plan_ryzyko_danych" id="exit_plan_ryzyko_danych" value={formData.exit_plan_ryzyko_danych || ''} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Krok 6: Audyt i przegląd</h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6 flex items-center">
                <input type="checkbox" name="prawo_audytu_status" id="prawo_audytu_status" checked={formData.prawo_audytu_status || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="prawo_audytu_status" className="ml-2 block text-sm text-gray-900">Prawo do audytu</label>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_ostatniego_audytu" className="block text-sm font-medium text-gray-700">Data ostatniego audytu</label>
                <input type="date" name="data_ostatniego_audytu" id="data_ostatniego_audytu" value={formData.data_ostatniego_audytu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="wynik_audytu" className="block text-sm font-medium text-gray-700">Wynik audytu</label>
                <select name="wynik_audytu" id="wynik_audytu" value={formData.wynik_audytu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                  <option value="">Wybierz...</option>
                  <option>Pozytywny</option>
                  <option>Z zastrzeżeniami</option>
                  <option>Negatywny</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="data_ostatniego_przegladu" className="block text-sm font-medium text-gray-700">Data ostatniego przeglądu</label>
                <input type="date" name="data_ostatniego_przegladu" id="data_ostatniego_przegladu" value={formData.data_ostatniego_przegladu || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="uwagi" className="block text-sm font-medium text-gray-700">Uwagi</label>
                <textarea name="uwagi" id="uwagi" value={formData.uwagi || ''} onChange={handleChange} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Nieznany krok</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            {provider ? 'Edytuj dostawcę' : 'Dodaj nowego dostawcę'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Formularz zawiera błędy</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.values(errors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {renderStepContent()}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Krok {step} z {TOTAL_STEPS}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={saving}
            >
              Anuluj
            </button>
            
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={saving}
              >
                Wstecz
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Dalej
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderForm;