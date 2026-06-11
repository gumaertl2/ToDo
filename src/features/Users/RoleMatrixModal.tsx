// 2026-04-18 19:00 - FIX: Neue Reihen für App-Nutzer und Rollen 
// 2026-04-30 10:00 - SEC-FEATURE: Ansichtsschalter für 'Alle Erinnerungen sehen' hinzugefügt
// 2026-04-30 16:50 - FEATURE: Rechte für Team-PINs (Wettkampf-Tresor) in die Matrix eingefügt
// 2026-05-11 18:40 - LOGIK-FIX: viewRoles Label angepasst und Schreibzugriff entkoppelt.
// 2026-05-13 17:30 - CHIRURGISCHER EINGRIFF: Veraltete Schreib-Rechte aus Matrix entfernt (Implizit via Participation-First).
// src/features/Users/RoleMatrixModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, ShieldAlert, Plus, Trash2, Check } from 'lucide-react';
import type { RoleProfile, RolePermissions } from '../../core/types/models';

interface Props {
  onClose: () => void;
}

// CHIRURGISCHER EINGRIFF: Default Perms an das entschlackte Modell angepasst
const DEFAULT_PERMS: Partial<RolePermissions> = {
  viewDashboard: true, viewEvents: false, viewTasks: false, viewCalendar: true, viewUsers: false, viewReports: false, 
  viewReminders: true, viewTemplates: false, 
  viewAppUsers: false, viewRoles: false, 
  viewEhrungen: false, viewAllReminders: false, viewTeamPins: false, manageTeamPins: false, manageMitglieder: false, manageCalendarSetup: false, manageEvents: false, deleteAnyItem: false
};

const PERMISSION_ROWS = [
  { key: 'viewDashboard', label: 'Dashboard sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewCalendar', label: 'Kalender sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewTasks', label: 'Kanban sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewEvents', label: 'Sitzungen sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewUsers', label: 'Helfer sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewReminders', label: 'Erinnerungen sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewTemplates', label: 'Vorlagen & Routinen sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewReports', label: 'Reports sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewEhrungen', label: 'Ehrungen sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewTeamPins', label: 'Wettkampf-Codes sehen', group: 'Sichtbarkeit (Menü & Tabs)' },
  { key: 'viewRoles', label: 'Rollen & Ämter sehen', group: 'Sichtbarkeit (Menü & Tabs)' },

  { key: 'viewAllReminders', label: 'Alle Erinnerungen sehen (Admin)', group: 'Aktionen & Rechte' }, 
  { key: 'viewAppUsers', label: 'App-Nutzer verwalten (Logins)', group: 'Aktionen & Rechte' }, 
  { key: 'manageMitglieder', label: 'Mitglieder verwalten (Adressbuch)', group: 'Aktionen & Rechte' },
  { key: 'manageTeamPins', label: 'Wettkampf-Codes verwalten', group: 'Aktionen & Rechte' },
  { key: 'manageCalendarSetup', label: 'Kalender Abos, Dienste u. Termine verwalten', group: 'Aktionen & Rechte' },
  { key: 'manageEvents', label: 'Sitzungen anlegen & schließen', group: 'Aktionen & Rechte' },
  
  // CHIRURGISCHER EINGRIFF: createItems, editAnyItem, deleteOwnItems wurden aus dieser Ansicht entfernt.
  // Das Recht 'deleteAnyItem' dient nun explizit als Erlaubnis für das Leeren des Papierkorbs.
  { key: 'deleteAnyItem', label: 'Alles löschen / Papierkorb (Admin)', group: 'Aktionen & Rechte' }
];

export const RoleMatrixModal: React.FC<Props> = ({ onClose }) => {
  const { roleProfiles, saveRoleProfile, deleteRoleProfile } = useClubStore();
  const [newProfileName, setNewProfileName] = useState('');

  const handleToggle = async (profile: RoleProfile, permKey: keyof RolePermissions) => {
    const updated = { ...profile, permissions: { ...profile.permissions, [permKey]: !profile.permissions[permKey] } };
    await saveRoleProfile(updated);
  };

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return;
    const newProfile: RoleProfile = {
      id: `pro-${Date.now()}`,
      schemaVersion: '1.0',
      name: newProfileName.trim(),
      permissions: { ...DEFAULT_PERMS } as RolePermissions
    };
    await saveRoleProfile(newProfile);
    setNewProfileName('');
  };

  const handleDelete = async (profile: RoleProfile) => {
    if (profile.isSystemRole) {
      alert("System-Rollen (wie ADMIN) können nicht gelöscht werden.");
      return;
    }
    if (window.confirm(`Möchtest du das Profil "${profile.name}" wirklich löschen?`)) {
      await deleteRoleProfile(profile.id);
    }
  };

  let currentGroup = '';

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center">
            <ShieldAlert className="w-5 h-5 mr-2 text-blue-600" />
            Berechtigungs-Matrix (App-Profile)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-4 bg-white border-b border-gray-100 flex gap-2 shrink-0">
          <input 
            type="text" 
            placeholder="Neues Profil anlegen (z.B. Trainer)" 
            value={newProfileName} 
            onChange={e => setNewProfileName(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm w-64 focus:border-blue-500 outline-none" 
            onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
          />
          <button 
            onClick={handleAddProfile} 
            disabled={!newProfileName.trim()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-1" /> Hinzufügen
          </button>
        </div>

        <div className="overflow-x-auto flex-1 bg-gray-50 custom-scrollbar p-4">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm table-fixed border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr>
                <th className="bg-gray-100 border-b border-gray-200 p-3 text-left font-bold text-gray-700 w-64 sticky left-0 z-40 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                  Recht / Funktion
                </th>
                {roleProfiles.map(p => (
                  <th key={p.id} className="bg-gray-100 border-b border-gray-200 p-3 text-center align-top border-l border-gray-50 min-w-[140px] h-[70px]">
                    <div className="flex flex-col h-full justify-start items-center">
                      <span className="font-bold text-gray-800 text-sm flex items-center justify-center leading-tight h-8">
                        {p.name}
                        {p.isSystemRole && <ShieldAlert className="w-3.5 h-3.5 text-blue-500 ml-1.5 shrink-0" />}
                      </span>
                      {!p.isSystemRole && (
                        <button onClick={() => handleDelete(p)} className="mt-1 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors" title="Profil löschen">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_ROWS.map(row => {
                const showGroupHeader = row.group !== currentGroup;
                if (showGroupHeader) currentGroup = row.group;

                return (
                  <React.Fragment key={row.key}>
                    {showGroupHeader && (
                      <tr>
                        <td colSpan={roleProfiles.length + 1} className="bg-gray-50 px-3 py-2 text-[10px] font-bold text-blue-800 uppercase tracking-widest border-b border-gray-200 sticky left-0 z-20 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                          {row.group}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors">
                      <td className="p-3 font-medium text-gray-800 text-sm sticky left-0 bg-white shadow-[1px_0_0_rgba(0,0,0,0.05)] z-10">
                        {row.label}
                      </td>
                      {roleProfiles.map(p => {
                        const hasPerm = (p.permissions as any)[row.key];
                        return (
                          <td key={`${p.id}-${row.key}`} className="p-2 text-center border-l border-gray-50 bg-inherit">
                            <button 
                              onClick={() => handleToggle(p, row.key as keyof RolePermissions)}
                              className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${hasPerm ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-transparent hover:bg-gray-200 hover:text-gray-400'}`}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex justify-end shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm transition-colors">
            Fertig & Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---