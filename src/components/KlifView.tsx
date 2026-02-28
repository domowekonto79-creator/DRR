import React, { useState, useEffect } from 'react';
import { Klif } from '../types';
import { getSupabase } from '../lib/supabase';
import KlifForm from './KlifForm';
import KlifTable from './KlifTable';
import { Plus, List } from 'lucide-react';

export default function KlifView() {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [klifs, setKlifs] = useState<Klif[]>([]);
  const [editingKlif, setEditingKlif] = useState<Klif | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKlifs = async () => {
    setIsLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: klifData, error: klifError } = await supabase.from('klif').select('*');
      if (klifError) throw klifError;

      if (klifData) {
        // Fetch relations for each KLIF
        const klifsWithRelations = await Promise.all(klifData.map(async (k) => {
          const [processes, assets, providers, dependencies] = await Promise.all([
            supabase.from('klif_procesy').select('*').eq('klif_id', k.id),
            supabase.from('klif_zasoby_ict').select('*').eq('klif_id', k.id),
            supabase.from('klif_dostawcy').select('*').eq('klif_id', k.id),
            supabase.from('klif_zaleznosci').select('*').eq('klif_id', k.id)
          ]);

          return {
            ...k,
            processes: processes.data || [],
            ict_assets: assets.data || [],
            providers: providers.data || [],
            dependencies: dependencies.data || []
          } as Klif;
        }));
        
        setKlifs(klifsWithRelations);
      }
    } catch (err) {
      console.error("Error fetching KLIFs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKlifs();
  }, []);

  const handleAdd = () => {
    setEditingKlif(null);
    setActiveTab('form');
  };

  const handleEdit = (klif: Klif) => {
    setEditingKlif(klif);
    setActiveTab('form');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tę funkcję KLIF?")) {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
        const { error } = await supabase.from('klif').delete().eq('id', id);
        if (error) throw error;
        setKlifs(klifs.filter((k) => k.id !== id));
      } catch (err) {
        console.error("Error deleting KLIF:", err);
        alert("Błąd podczas usuwania KLIF.");
      }
    }
  };

  const handleSave = () => {
    fetchKlifs();
    setActiveTab('list');
  };

  const handleCancel = () => {
    setActiveTab('list');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
          Kluczowe i Ważne Funkcje (KLIF)
        </h2>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'list'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <List className="h-4 w-4 mr-2" />
            Rejestr KLIF
          </button>
          <button
            onClick={handleAdd}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'form'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nowa KLIF
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <KlifTable klifs={klifs} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />
      ) : (
        <KlifForm initialData={editingKlif} onSave={handleSave} onCancel={handleCancel} />
      )}
    </div>
  );
}
