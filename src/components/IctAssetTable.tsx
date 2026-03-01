import React from 'react';
import { IctAsset } from '../types';
import { Edit2, Trash2, Server, ShieldAlert } from 'lucide-react';

interface IctAssetTableProps {
  assets: IctAsset[];
  onEdit: (asset: IctAsset) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export default function IctAssetTable({ assets, onEdit, onDelete, onCancel }: IctAssetTableProps) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200 shadow-sm">
        <Server className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-2 text-sm font-medium text-slate-900">Brak zasobów ICT</h3>
        <p className="mt-1 text-sm text-slate-500">
          Rozpocznij od dodania pierwszego zasobu do rejestru.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Nazwa i Kategoria
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Właściciel
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Krytyczność
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Server className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{asset.name}</div>
                      <div className="text-sm text-slate-500">{asset.category || 'Brak kategorii'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{asset.owner || '-'}</div>
                  <div className="text-sm text-slate-500">{asset.ownerUnit || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    asset.criticality === 'Krytyczna' ? 'bg-rose-100 text-rose-800' :
                    asset.criticality === 'Ważna' ? 'bg-amber-100 text-amber-800' :
                    asset.criticality === 'Standardowa' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {asset.criticality || 'Nie określono'}
                  </span>
                  {asset.isLegacy && (
                    <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800" title="System Legacy">
                      Legacy
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {asset.lifecycleStatus || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(asset)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4 transition-colors"
                    title="Edytuj zasób"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(asset.id)}
                    className="text-rose-600 hover:text-rose-900 transition-colors"
                    title="Usuń zasób"
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
  );
}
