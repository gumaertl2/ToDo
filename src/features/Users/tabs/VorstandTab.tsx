// 2026-04-18 10:00 - FEATURE: Button für Berechtigungs-Matrix eingebaut
// src/features/Users/tabs/VorstandTab.tsx
import React from 'react';
import { Users, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { useClubStore } from '../../../store/useClubStore';
import type { User } from '../../../core/types/models';

interface VorstandTabProps {
  openUserEditor: (u?: User) => void;
  openMatrixEditor: () => void; // NEU
  isAdmin: boolean;
}

export const VorstandTab: React.FC<VorstandTabProps> = ({ openUserEditor, openMatrixEditor, isAdmin }) => {
  const { users, deleteUser, roleProfiles } = useClubStore();

  return (
    <>
      {isAdmin && (
        <div className="bg-blue-50 border-b border-blue-100 p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-blue-900 text-sm">App-Profile & Rechte</h3>
            <p className="text-xs text-blue-700">Verwalte die Rechte-Matrix für die verschiedenen Nutzergruppen.</p>
          </div>
          <button 
            onClick={openMatrixEditor}
            className="flex items-center px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-sm font-bold rounded hover:bg-blue-100 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> Matrix anpassen
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Keine App-Nutzer angelegt.</div>
      ) : (
        [...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => {
          // Den echten Namen aus den dynamischen Profilen suchen
          const profileName = roleProfiles.find(p => p.id === u.roleProfileId)?.name || u.rolle;
          
          return (
            <div key={u.id} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors border-b border-gray-100 last:border-0">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 mr-4"><Users className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-gray-900">{u.name}</h3>
                  <span className="text-xs font-bold text-gray-500">{u.amt} · Profil: {profileName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openUserEditor(u)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 className="w-5 h-5" /></button>
                <button onClick={() => { if(window.confirm('Löschen?')) deleteUser(u.id); }} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>
              </div>
            </div>
          );
        })
      )}
    </>
  );
};
// --- END OF FILE ---