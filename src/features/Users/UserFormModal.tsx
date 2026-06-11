// 2026-04-18 21:00 - FIX: Rollback auf die bewährte, stabile Speicher-Logik & Original-Texte
// 2026-05-13 19:20 - BUGFIX: Vercel TS2322 (Unbekannte Properties im UserPermissions-Fallback) entfernt.
// src/features/Users/UserFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { User } from '../../core/types/models';
import { X, Save, Lock, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  existingUser?: User;
}

export const UserFormModal: React.FC<Props> = ({ onClose, existingUser }) => {
  const { createUser, updateUser, roleProfiles, groups, users } = useClubStore();
  
  const [name, setName] = useState(existingUser?.name || '');
  const [email, setEmail] = useState(existingUser?.email || '');
  const [amt, setAmt] = useState(existingUser?.amt || '');
  const [telefon, setTelefon] = useState(existingUser?.telefon || '');
  
  const [roleProfileId, setRoleProfileId] = useState<string>(existingUser?.roleProfileId || '');
  const [groupIds, setGroupIds] = useState<string[]>(existingUser?.groupIds || []);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!roleProfileId && roleProfiles.length > 0) {
      setRoleProfileId(roleProfiles[0].id);
    }
  }, [roleProfiles, roleProfileId]);

  const toggleGroup = (id: string) => {
    setGroupIds((prev) => (prev || []).includes(id) ? (prev || []).filter(g => g !== id) : [...(prev || []), id]);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { 
      setError('Name und E-Mail sind Pflichtfelder.'); 
      return; 
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const isDuplicateEmail = users.some(u => u.id !== existingUser?.id && u.email && u.email.toLowerCase() === normalizedEmail);
    if (isDuplicateEmail) {
      setError(`Die E-Mail-Adresse "${email.trim()}" wird bereits von einem anderen Benutzer verwendet.`);
      return;
    }

    const isDuplicateName = users.some(u => u.id !== existingUser?.id && u.name && u.name.toLowerCase() === normalizedName);
    if (isDuplicateName) {
      setError(`Der Name "${name.trim()}" existiert bereits im System. Bitte nutze einen Zusatz (z.B. Initiale).`);
      return;
    }

    if (!roleProfileId) {
      setError('Bitte wähle ein Berechtigungs-Profil aus.');
      return;
    }

    if (existingUser && existingUser.roleProfileId === 'pro-admin' && roleProfileId !== 'pro-admin') {
      const totalAdmins = users.filter(x => x.roleProfileId === 'pro-admin').length;
      if (totalAdmins <= 1) {
        setError("🚨 Letzter Admin! Du kannst diesem Nutzer die Admin-Rechte nicht entziehen.");
        return;
      }
    }

    setIsSaving(true); 
    setError(null);

    const selectedGroupNames = groups.filter(g => groupIds.includes(g.id)).map(g => g.name).join(', ');

    const userData: User = {
      id: existingUser?.id || `user-${Date.now()}`,
      schemaVersion: '1.0',
      name: name.trim(), 
      email: email.trim(), 
      rolle: selectedGroupNames || 'Mitglied', 
      amt: amt.trim(),
      telefon: telefon.trim(),
      groupIds: groupIds || [], 
      roleProfileId: roleProfileId,
      permissions: existingUser?.permissions || {
        canUpdateTaskStatus: false, canManageComments: false, canDeleteAnyTask: false,
        canManageUsers: false, canManageRoles: false
      }
    };

    try {
      const result = existingUser ? await updateUser(userData) : await createUser(userData);
      if (result.success) {
        onClose();
      } else { 
        setError(result.error?.message || 'Fehler beim Speichern.'); 
        setIsSaving(false); 
      }
    } catch (err) { 
      setError('Ein unerwarteter Fehler ist aufgetreten.'); 
      setIsSaving(false); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{existingUser ? 'App-Nutzer bearbeiten' : 'App-Nutzer anlegen'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center">
               <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
               <span className="text-sm font-medium">{error}</span>
             </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800 flex items-start">
             <Lock className="w-5 h-5 mr-3 shrink-0 mt-0.5" />
             Diese Person erhält Login-Zugriff auf die App basierend auf dem gewählten Profil.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Name *</label>
              <input 
                type="text" 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                disabled={isSaving} 
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-50 outline-none" 
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">E-Mail (Login) *</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                disabled={isSaving} 
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-50 outline-none" 
              />
            </div>
            
            <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
              <label className="block font-bold text-gray-900 mb-1">App-Rechte-Profil *</label>
              <p className="text-xs text-gray-500 mb-3">Bestimmt, welche Menüs und Buttons diese Person in der App sehen und anklicken darf.</p>
              <select 
                value={roleProfileId} 
                onChange={(e) => setRoleProfileId(e.target.value)} 
                disabled={isSaving} 
                className="w-full p-2 border border-blue-300 rounded focus:ring-blue-500 font-bold text-blue-800 outline-none disabled:opacity-50"
              >
                {roleProfiles.length === 0 && <option value="">Lade Profile...</option>}
                {roleProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="block font-bold text-gray-900 mb-3">Zugeordnete Vereins-Funktionen (aus "Rollen & Ämter")</label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer bg-white transition-colors">
                    <input 
                      type="checkbox" 
                      checked={(groupIds || []).includes(g.id)} 
                      onChange={() => toggleGroup(g.id)} 
                      disabled={isSaving}
                      className="w-4 h-4 text-blue-600 mr-2 rounded border-gray-300 focus:ring-blue-500" 
                    />
                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                  </label>
                ))}
                {groups.length === 0 && <span className="text-sm text-gray-500 italic">Noch keine Rollen & Ämter im System angelegt.</span>}
              </div>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Individueller Zusatz (Amt / Titel)</label>
              <input 
                type="text" 
                value={amt} 
                onChange={(e) => setAmt(e.target.value)} 
                disabled={isSaving} 
                placeholder="z.B. Ehrenvorsitzender"
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-50 outline-none" 
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Telefon</label>
              <input 
                type="tel" 
                value={telefon} 
                onChange={(e) => setTelefon(e.target.value)} 
                disabled={isSaving} 
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-50 outline-none" 
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} disabled={isSaving} className="px-5 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            Abbrechen
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex items-center px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors shadow-sm"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---