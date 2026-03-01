import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { DostawcaICT } from '../types';
import ProviderTable from './ProviderTable';
import ProviderForm from './ProviderForm';
import { PlusCircle } from 'lucide-react';

const ProvidersView: React.FC = () => {
  const [providers, setProviders] = useState<DostawcaICT[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<DostawcaICT | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.from('dostawcy_ict').select('*');
      if (error) {
        console.error('Error fetching providers:', error);
      } else if (data) {
        setProviders(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAdd = () => {
    setSelectedProvider(null);
    setIsFormVisible(true);
  };

  const handleEdit = (provider: DostawcaICT) => {
    setSelectedProvider(provider);
    setIsFormVisible(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego dostawcę?')) {
            const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.from('dostawcy_ict').delete().eq('id', id);
      if (error) {
        console.error('Error deleting provider:', error);
      } else {
        fetchProviders();
      }
    }
  };

  const handleSave = () => {
    setIsFormVisible(false);
    setSelectedProvider(null);
    fetchProviders();
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setSelectedProvider(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Rejestr Dostawców ICT</h1>
        <button
          onClick={handleAdd}
          className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Dodaj dostawcę
        </button>
      </div>

      {isFormVisible ? (
        <ProviderForm
          provider={selectedProvider}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <>
          {loading ? (
            <p>Ładowanie danych...</p>
          ) : (
            <ProviderTable
              providers={providers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProvidersView;