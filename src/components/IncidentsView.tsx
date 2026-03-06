import React, { useState, useEffect } from 'react';
import { Incident } from '../types';
import { getSupabase } from '../lib/supabase';
import { Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, Calendar } from 'lucide-react';
import IncidentForm from './IncidentForm';

export default function IncidentsView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching incidents:', error);
    } else {
      setIncidents(data as Incident[]);
    }
    setLoading(false);
  };

  const handleSave = () => {
    fetchIncidents();
    setShowForm(false);
    setEditingIncident(null);
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && incident.status !== 'Zamknięty') ||
                          incident.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (showForm) {
    return (
      <IncidentForm
        initialData={editingIncident}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingIncident(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Rejestr Incydentów</h2>
          <p className="text-sm text-slate-500 mt-1">Zarządzanie incydentami bezpieczeństwa zgodnie z DORA i ISO 27001</p>
        </div>
        <button
          onClick={() => {
            setEditingIncident(null);
            setShowForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nowy Incydent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Szukaj incydentu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Wszystkie statusy</option>
            <option value="active">Aktywne (Otwarte)</option>
            <option value="Rejestracja">Rejestracja</option>
            <option value="Analiza">Analiza</option>
            <option value="Mitygacja">Mitygacja</option>
            <option value="Zamknięty">Zamknięte</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
          <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-medium text-slate-900">Brak incydentów</h3>
          <p className="mt-1 text-sm text-slate-500">Nie znaleziono incydentów spełniających kryteria.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => {
                setEditingIncident(incident);
                setShowForm(true);
              }}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {incident.is_major_incident && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800" title="Poważny incydent wg DORA">
                        <AlertTriangle className="w-3 h-3 mr-1" /> DORA Major
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      incident.status === 'Zamknięty' ? 'bg-slate-100 text-slate-800' :
                      incident.status === 'Mitygacja' ? 'bg-amber-100 text-amber-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {incident.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      incident.severity === 'Krytyczny' ? 'bg-rose-100 text-rose-800' :
                      incident.severity === 'Wysoki' ? 'bg-orange-100 text-orange-800' :
                      incident.severity === 'Średni' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(incident.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
                  {incident.title}
                </h3>
                
                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {incident.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex gap-4">
                    <span className="flex items-center" title="Data wystąpienia">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(incident.occurrence_date).toLocaleDateString()}
                    </span>
                    {incident.duration_minutes && (
                      <span className="flex items-center" title="Czas trwania">
                        <Clock className="w-3 h-3 mr-1" />
                        {Math.floor(incident.duration_minutes / 60)}h {incident.duration_minutes % 60}m
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {incident.related_assets?.length > 0 && (
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {incident.related_assets.length} Zasobów
                      </span>
                    )}
                    {incident.related_providers?.length > 0 && (
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">
                        {incident.related_providers.length} Dostawców
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
