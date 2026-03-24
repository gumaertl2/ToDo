// src/features/Users/UserFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { User, UserPermissions } from '../../core/types/models';
import { X, Save, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  existingUser?: User;
}

export const UserFormModal: React.FC<Props> = ({ onClose, existingUser }) => {
  const { updateUser, createUser, groups } = useClubStore();
  const [name, setName] = useState(existingUser?.name || '');
  const [email, setEmail] = useState(existingUser?.email || '');
  const [role, setRole] = useState<'ADMIN' | 'VORSTAND'>(existingUser?.rolle || 'VORSTAND');
  const [amt, setAmt] = useState(existingUser?.amt || '');
  
  const [groupIds, setGroupIds] = useState<string[]>(existingUser?.groupIds || []);
  const [permissions, setPermissions] = useState<UserPermissions>(existingUser?.permissions || {
    canCreateTasks: false, canUpdateTaskStatus: false, canManageComments: false, canDeleteOwnTasks: false, canDeleteAnyTask: false
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleGroup = (id: string) => {
    setGroupIds((prev) => (prev || []).includes(id) ? (prev || []).filter(g => g !== id) : [...(prev || []), id]);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { setError('Name und E-Mail sind Pflichtfelder.'); return; }
    setIsSaving(true); setError(null);
    const userData: User = {
      id: existingUser?.id || `user-${Date.now()}`,
      schemaVersion: '1.0',
      name: name.trim(), email: email.trim(), rolle: role, amt: amt.trim(),
      groupIds: groupIds || [], permissions
    };
    try {
      const result = existingUser ? await updateUser(userData) : await createUser(userData);
      if (result.success) onClose();
      else { setError(result.error?.message || 'Fehler beim Speichern.'); setIsSaving(false); }
    } catch (err) { setError('Ein unerwarteter Fehler ist aufgetreten.'); setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{existingUser ? 'Vorstand bearbeiten' : 'Vorstand anlegen'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center">
               <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
               <span className="text-sm">{error}</span>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">System-Rolle</label>
              <select value={role} onChange={(e) => setRole(e.target.value as 'ADMIN'|'VORSTAND')} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500">
                <option value="VORSTAND">Vorstand</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amt</label>
              <input type="text" value={amt} onChange={(e) => setAmt(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Zugewiesene Rollen/Gruppen ({(groupIds || []).length})</h3>
            <div className="flex flex-wrap gap-2">
              {groups.map(g => (
                <label key={g.id} className="flex items-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={(groupIds || []).includes(g.id)} onChange={() => toggleGroup(g.id)} className="w-4 h-4 text-blue-600 mr-2 rounded" />
                  <span className="text-sm font-medium text-gray-700">{g.name}</span>
                </label>
              ))}
              {groups.length === 0 && <span className="text-sm text-gray-500">Keine Rollen im System angelegt.</span>}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Rechte-Matrix (Granular)</h3>
            <div className="space-y-3">
               <label className="flex items-center text-sm text-gray-700 font-medium">
                 <input type="checkbox" checked={permissions.canCreateTasks} onChange={e => setPermissions({...permissions, canCreateTasks: e.target.checked})} className="w-4 h-4 text-blue-600 mr-3 rounded" />
                 Aufgaben anlegen
               </label>
               <label className="flex items-center text-sm text-gray-700 font-medium">
                 <input type="checkbox" checked={permissions.canUpdateTaskStatus} onChange={e => setPermissions({...permissions, canUpdateTaskStatus: e.target.checked})} className="w-4 h-4 text-blue-600 mr-3 rounded" />
                 Status von Aufgaben ändern
               </label>
               <label className="flex items-center text-sm text-gray-700 font-medium">
                 <input type="checkbox" checked={permissions.canManageComments} onChange={e => setPermissions({...permissions, canManageComments: e.target.checked})} className="w-4 h-4 text-blue-600 mr-3 rounded" />
                 Kommentare verwalten
               </label>
               <label className="flex items-center text-sm text-gray-700 font-medium">
                 <input type="checkbox" checked={permissions.canDeleteOwnTasks} onChange={e => setPermissions({...permissions, canDeleteOwnTasks: e.target.checked})} className="w-4 h-4 text-blue-600 mr-3 rounded" />
                 Eigene Aufgaben löschen
               </label>
               <label className="flex items-center text-sm text-gray-700 font-medium">
                 <input type="checkbox" checked={permissions.canDeleteAnyTask} onChange={e => setPermissions({...permissions, canDeleteAnyTask: e.target.checked})} className="w-4 h-4 text-blue-600 mr-3 rounded" />
                 Alle Aufgaben löschen
               </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Speichert...' : 'User Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
