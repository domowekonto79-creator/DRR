import React from 'react';
import { DostawcaICT } from '../types';
import { Edit, Trash2 } from 'lucide-react';

interface ProviderTableProps {
  providers: DostawcaICT[];
  onEdit: (provider: DostawcaICT) => void;
  onDelete: (id: string) => void;
}

const ProviderTable: React.FC<ProviderTableProps> = ({ providers, onEdit, onDelete }) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nazwa Prawna
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              LEI
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Typ
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nr Umowy
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Akcje</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <tr key={provider.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{provider.nazwa_prawna}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.lei}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.typ_dostawcy}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{provider.numer_referencyjny_umowy}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => onEdit(provider)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button onClick={() => onDelete(provider.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                Brak dostawców do wyświetlenia.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProviderTable;