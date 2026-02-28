import React, { useState } from 'react';
import { Klif } from '../types';
import { Edit2, Trash2, Eye, Download, Search, Activity } from 'lucide-react';

interface KlifTableProps {
  klifs: Klif[];
  onEdit: (klif: Klif) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export default function KlifTable({ klifs, onEdit, onDelete, isLoading }: KlifTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredKlifs = klifs.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? k.classification_type === filterType : true;
    return matchesSearch && matchesType;
  });

  const handleExportCSV = () => {
    const headers = ['Nazwa', 'Typ', 'Właściciel', 'RTO', 'Data przeglądu'];
    const values = filteredKlifs.map(k => [
      `"${k.name.replace(/"/g, '""')}"`,
      k.classification_type,
      `"${k.owner.replace(/"/g, '""')}"`,
      `${k.rto_value} ${k.rto_unit}`,
      k.last_review_date
    ].join(','));

    const csvContent = `${headers.join(',')}\n${values.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rejestr_klif.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500">Ładowanie danych...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-1 gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Szukaj KLIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-48 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Wszystkie typy</option>
            <option value="Krytyczna">Krytyczna</option>
            <option value="Istotna">Istotna</option>
            <option value="Wspierająca">Wspierająca</option>
          </select>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Download className="h-4 w-4 mr-2" />
          Eksportuj CSV
        </button>
      </div>

      {filteredKlifs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
          <Activity className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">Brak funkcji KLIF</h3>
          <p className="mt-1 text-sm text-slate-500">
            Nie znaleziono żadnych funkcji pasujących do kryteriów.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nazwa</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Typ</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Właściciel</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">RTO</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data przeglądu</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredKlifs.map((klif) => (
                  <tr key={klif.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {klif.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        klif.classification_type === 'Krytyczna' ? 'bg-rose-100 text-rose-800' :
                        klif.classification_type === 'Istotna' ? 'bg-amber-100 text-amber-800' :
                        klif.classification_type === 'Wspierająca' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {klif.classification_type || 'Brak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {klif.owner}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {klif.rto_value ? `${klif.rto_value} ${klif.rto_unit}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {klif.last_review_date || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onEdit(klif)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"
                        title="Edytuj KLIF"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(klif.id)}
                        className="text-rose-600 hover:text-rose-900 transition-colors"
                        title="Usuń KLIF"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
