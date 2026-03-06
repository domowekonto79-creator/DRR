import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import { Employee, Department } from '../types';
import { Plus, Edit2, Trash2, Users, Building, Loader2, Save, X } from 'lucide-react';

export default function EmployeesView() {
  const [activeTab, setActiveTab] = useState<'employees' | 'departments'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [isDepartmentFormOpen, setIsDepartmentFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  // Form data
  const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({});
  const [departmentFormData, setDepartmentFormData] = useState<Partial<Department>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: depts, error: deptsError } = await supabase.from('departments').select('*');
      if (deptsError) throw deptsError;
      setDepartments(depts || []);

      const { data: emps, error: empsError } = await supabase.from('employees').select('*');
      if (empsError) throw empsError;
      
      // Map department names to employees
      const employeesWithDept = (emps || []).map(emp => ({
        ...emp,
        department_name: depts?.find(d => d.id === emp.department_id)?.name || 'Nieprzypisany'
      }));
      
      setEmployees(employeesWithDept);
    } catch (error) {
      console.error('Error fetching data:', error);
      // alert('Błąd pobierania danych. Upewnij się, że tabele "employees" i "departments" istnieją.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmployee = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const dataToSave = {
        ...employeeFormData,
        id: editingEmployee ? editingEmployee.id : crypto.randomUUID()
      };
      
      // Remove department_name as it is a computed field
      delete (dataToSave as any).department_name;

      const { error } = await supabase.from('employees').upsert(dataToSave);
      if (error) throw error;

      setIsEmployeeFormOpen(false);
      setEditingEmployee(null);
      setEmployeeFormData({});
      fetchData();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Błąd zapisu pracownika.');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego pracownika?')) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Błąd usuwania pracownika.');
    }
  };

  const handleSaveDepartment = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const dataToSave = {
        ...departmentFormData,
        id: editingDepartment ? editingDepartment.id : crypto.randomUUID()
      };

      const { error } = await supabase.from('departments').upsert(dataToSave);
      if (error) throw error;

      setIsDepartmentFormOpen(false);
      setEditingDepartment(null);
      setDepartmentFormData({});
      fetchData();
    } catch (error) {
      console.error('Error saving department:', error);
      alert('Błąd zapisu departamentu.');
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten departament?')) return;

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Błąd usuwania departamentu. Upewnij się, że nie ma przypisanych pracowników.');
    }
  };

  const openEmployeeForm = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData(employee);
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({});
    }
    setIsEmployeeFormOpen(true);
  };

  const openDepartmentForm = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setDepartmentFormData(department);
    } else {
      setEditingDepartment(null);
      setDepartmentFormData({});
    }
    setIsDepartmentFormOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">
          Zarządzanie Personelem
        </h2>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'employees' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Pracownicy
            </div>
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'departments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Zespoły / Departamenty
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'employees' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => openEmployeeForm()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Pracownika
            </button>
          </div>

          {isEmployeeFormOpen && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 mb-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                {editingEmployee ? 'Edytuj pracownika' : 'Nowy pracownik'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                  <input
                    type="text"
                    value={employeeFormData.first_name || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, first_name: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                  <input
                    type="text"
                    value={employeeFormData.last_name || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, last_name: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={employeeFormData.email || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, email: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stanowisko</label>
                  <input
                    type="text"
                    value={employeeFormData.position || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, position: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Departament / Zespół</label>
                  <select
                    value={employeeFormData.department_id || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, department_id: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* DORA & ISO 27001 Fields */}
                <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
                  <h4 className="text-sm font-medium text-slate-900 mb-3">Bezpieczeństwo i Zgodność (DORA / ISO 27001)</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rola bezpieczeństwa</label>
                  <select
                    value={employeeFormData.security_role || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, security_role: e.target.value as any})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    <option value="Użytkownik">Użytkownik</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Właściciel Biznesowy">Właściciel Biznesowy</option>
                    <option value="Właściciel Ryzyka">Właściciel Ryzyka</option>
                    <option value="Audytor">Audytor</option>
                    <option value="CISO">CISO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rodzaj zatrudnienia</label>
                  <select
                    value={employeeFormData.employment_type || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, employment_type: e.target.value as any})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    <option value="Umowa o pracę">Umowa o pracę</option>
                    <option value="B2B">B2B</option>
                    <option value="Zlecenie">Zlecenie</option>
                    <option value="Inne">Inne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status weryfikacji (Screening)</label>
                  <select
                    value={employeeFormData.background_check_status || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, background_check_status: e.target.value as any})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="">Wybierz...</option>
                    <option value="Zweryfikowany">Zweryfikowany</option>
                    <option value="W toku">W toku</option>
                    <option value="Brak">Brak</option>
                    <option value="Nie dotyczy">Nie dotyczy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data ost. szkolenia bezp.</label>
                  <input
                    type="date"
                    value={employeeFormData.last_security_training_date || ''}
                    onChange={e => setEmployeeFormData({...employeeFormData, last_security_training_date: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>

                <div className="md:col-span-2 flex items-center">
                  <input
                    type="checkbox"
                    id="is_key_personnel"
                    checked={employeeFormData.is_key_personnel || false}
                    onChange={e => setEmployeeFormData({...employeeFormData, is_key_personnel: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="is_key_personnel" className="ml-2 block text-sm text-slate-900">
                    Kluczowy personel (krytyczny dla BCP/DRP)
                  </label>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setIsEmployeeFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Zapisz
                </button>
              </div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-slate-200">
              {employees.map((employee) => (
                <li key={employee.id}>
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm">
                          <p className="font-medium text-indigo-600 truncate">{employee.first_name} {employee.last_name}</p>
                          <p className="ml-1 flex-shrink-0 font-normal text-slate-500">
                            {employee.position}
                          </p>
                        </div>
                        <div className="mt-2 flex">
                          <div className="flex items-center text-sm text-slate-500">
                            <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                            <p>{employee.department_name || 'Brak departamentu'}</p>
                          </div>
                          <div className="ml-6 flex items-center text-sm text-slate-500">
                            <p>{employee.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => openEmployeeForm(employee)}
                        className="text-indigo-600 hover:text-indigo-900 p-2"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-rose-600 hover:text-rose-900 p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {employees.length === 0 && (
                <li className="px-4 py-8 text-center text-slate-500 italic">
                  Brak pracowników. Dodaj pierwszego pracownika.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => openDepartmentForm()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj Departament
            </button>
          </div>

          {isDepartmentFormOpen && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 mb-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                {editingDepartment ? 'Edytuj departament' : 'Nowy departament'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa</label>
                  <input
                    type="text"
                    value={departmentFormData.name || ''}
                    onChange={e => setDepartmentFormData({...departmentFormData, name: e.target.value})}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
                  <textarea
                    value={departmentFormData.description || ''}
                    onChange={e => setDepartmentFormData({...departmentFormData, description: e.target.value})}
                    rows={3}
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">RTO (Recovery Time Objective)</label>
                  <input
                    type="text"
                    value={departmentFormData.recovery_time_objective || ''}
                    onChange={e => setDepartmentFormData({...departmentFormData, recovery_time_objective: e.target.value})}
                    placeholder="np. 4h, 1 dzień"
                    className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_critical_unit"
                    checked={departmentFormData.is_critical_unit || false}
                    onChange={e => setDepartmentFormData({...departmentFormData, is_critical_unit: e.target.checked})}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="is_critical_unit" className="ml-2 block text-sm text-slate-900">
                    Jednostka krytyczna (wspiera funkcje krytyczne)
                  </label>
                </div>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setIsDepartmentFormOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleSaveDepartment}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Zapisz
                </button>
              </div>

              {editingDepartment && (
                <div className="mt-8 border-t border-slate-200 pt-6">
                  <h4 className="text-sm font-medium text-slate-900 mb-4 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-slate-500" />
                    Przypisani pracownicy ({employees.filter(e => e.department_id === editingDepartment.id).length})
                  </h4>
                  
                  {employees.filter(e => e.department_id === editingDepartment.id).length > 0 ? (
                    <div className="bg-slate-50 rounded-md border border-slate-200 overflow-hidden">
                      <ul className="divide-y divide-slate-200">
                        {employees
                          .filter(e => e.department_id === editingDepartment.id)
                          .map(emp => (
                            <li key={emp.id} className="px-4 py-3 text-sm flex justify-between items-center hover:bg-slate-100 transition-colors">
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700">{emp.first_name} {emp.last_name}</span>
                                <span className="text-xs text-slate-500">{emp.email}</span>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {emp.position}
                              </span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-md border border-slate-200">
                      Brak pracowników przypisanych do tego departamentu.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-slate-200">
              {departments.map((dept) => (
                <li key={dept.id}>
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm">
                          <p className="font-medium text-indigo-600 truncate">{dept.name}</p>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-slate-500">{dept.description || 'Brak opisu'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-5 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => openDepartmentForm(dept)}
                        className="text-indigo-600 hover:text-indigo-900 p-2"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="text-rose-600 hover:text-rose-900 p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {departments.length === 0 && (
                <li className="px-4 py-8 text-center text-slate-500 italic">
                  Brak departamentów. Dodaj pierwszy departament.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
