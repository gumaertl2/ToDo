// 2026-04-24 19:00 - BUGFIX: Zählung korrigiert - sucht nun im globalen 'tasks' Array statt in der lokalen 'eventAgenda'
// 2026-05-13 20:00 - BUGFIX: Geister-Austreibung! Zähler ignorieren nun TRASH-Elemente und verwaiste Unterpunkte (Orphans).
// 2026-05-13 22:15 - UX-CLEANUP: Redundanten Header entfernt. Buttons werden nun zentral von UsersView gesteuert.
// 2026-05-13 22:45 - RESTORE: Online-Status & Last-Activity Anzeige in das neue Tabellen-Layout integriert.
// 2026-05-13 23:05 - BUGFIX: Vercel TS6133 (Unused UserIcon) entfernt.
// src/features/Users/tabs/AppUserTab.tsx
import React from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { Edit2, ShieldAlert, LogIn, Repeat, Trash2, Clock } from 'lucide-react';
import type { User } from '../../../core/types/models';

interface AppUserTabProps {
  openUserEditor: (u?: User) => void;
  openMatrixEditor: () => void;
  openSuccessionEditor: (u: User) => void; 
  isAdmin: boolean;
}

export const AppUserTab: React.FC<AppUserTabProps> = ({ openUserEditor, openSuccessionEditor }) => {
  const { users, deleteUser, roleProfiles, groups, user: currentUser, tasks, templates } = useClubStore();

  const isAdminProfile = (roleProfileId?: string) => roleProfileId === 'pro-admin';

  // Hilfsfunktion für den Online-Status (5 Minuten Schwelle)
  const getOnlineStatus = (lastActivity?: number) => {
    if (!lastActivity) return { isOnline: false, label: 'Noch nie angemeldet' };
    const diff = Date.now() - lastActivity;
    const isOnline = diff < 5 * 60 * 1000;
    
    if (isOnline) return { isOnline: true, label: 'Gerade online' };
    
    const date = new Date(lastActivity);
    return { 
      isOnline: false, 
      label: `Zuletzt aktiv: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
    };
  };

  const handleSafeDelete = (u: User, openCount: number, progressCount: number, templateCount: number) => {
    if (u.id === currentUser?.id) {
      window.alert("🚨 Du kannst dich nicht selbst löschen!");
      return;
    }
    if (isAdminProfile(u.roleProfileId)) {
      const totalAdmins = users.filter(x => x.roleProfileId === 'pro-admin').length;
      if (totalAdmins <= 1) {
        window.alert("🚨 Du kannst den letzten Administrator nicht löschen!");
        return;
      }
    }
    if (openCount > 0 || progressCount > 0 || templateCount > 0) {
      window.alert(`🚨 Halt! ${u.name} hat noch aktive Aufgaben (${openCount + progressCount}) oder Vorlagen (${templateCount}).\n\nBitte nutze zuerst den blauen Übergabe-Button (🔄), um das Amt sauber an einen Nachfolger zu übergeben.`);
      return;
    }
    
    if (window.confirm(`Möchtest du den Login für ${u.name} wirklich unwiderruflich löschen?\n\nDie Person verliert sofort den Zugang zur App.`)) {
      deleteUser(u.id);
    }
  };

  const getValidTasks = () => tasks.filter(t => {
    if (t.status === 'TRASH') return false;
    if (t.isSubItem && t.parentItemId) {
       const parent = tasks.find(p => p.id === t.parentItemId);
       if (!parent || parent.status === 'TRASH') return false;
    }
    return true;
  });

  const getValidTemplates = () => templates.filter(t => {
    if (t.status === 'TRASH') return false;
    if (t.isSubItem && t.parentItemId) {
       const parent = templates.find(p => p.id === t.parentItemId);
       if (!parent || parent.status === 'TRASH') return false;
    }
    return true;
  });

  const validTasks = getValidTasks();
  const validTemplates = getValidTemplates();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
          <tr>
            <th className="px-6 py-3">Name / Status</th>
            <th className="px-6 py-3">Profil & Amt</th>
            <th className="px-6 py-3 text-center border-x border-gray-200" colSpan={4}>Amt / Statistik (Tickets)</th>
            <th className="px-6 py-3 text-right">Aktionen</th>
          </tr>
          <tr className="bg-gray-100 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
            <th colSpan={2}></th>
            <th className="px-2 py-1 text-center border-l border-gray-200">Offen</th>
            <th className="px-2 py-1 text-center border-l border-gray-200">In Arbeit</th>
            <th className="px-2 py-1 text-center border-l border-gray-200">Vorlagen</th>
            <th className="px-2 py-1 text-center border-x border-gray-200">Erledigt</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.length === 0 ? (
            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">Noch keine App-Nutzer angelegt.</td></tr>
          ) : (
            users.map(u => {
              const rp = roleProfiles.find(p => p.id === u.roleProfileId);
              const isSysAdmin = isAdminProfile(u.roleProfileId);
              const assignedRoles = u.groupIds?.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ') || 'Keine Rolle im Verein';
              
              const status = getOnlineStatus(u.lastActivityAt);
              const userTasks = validTasks.filter(t => t.type === 'AUFGABE' && t.assigneeUserIds?.includes(u.id) && !t.isTemplate);
              const openCount = userTasks.filter(t => t.status === 'OFFEN').length;
              const progressCount = userTasks.filter(t => t.status === 'IN_ARBEIT').length;
              const doneCount = userTasks.filter(t => t.status === 'ERLEDIGT').length;
              const templateCount = validTemplates.filter(t => t.assigneeUserIds?.includes(u.id)).length;

              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${status.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                        {status.isOnline && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="truncate">{u.name}</span>
                          {u.id === currentUser?.id && <span className="shrink-0 text-[9px] font-extrabold bg-green-100 text-green-800 px-1 py-0.5 rounded tracking-wide uppercase">Du</span>}
                        </div>
                        <div className="text-gray-400 text-[11px] flex flex-col gap-0.5 mt-0.5">
                           <div className="flex items-center"><LogIn className="w-2.5 h-2.5 mr-1" /> {u.email}</div>
                           <div className="flex items-center font-medium"><Clock className="w-2.5 h-2.5 mr-1" /> {status.label}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center">
                        {isSysAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <ShieldAlert className="w-3 h-3 mr-1" /> {rp?.name || 'ADMIN'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            {rp?.name || 'Unbekannt'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-600 truncate max-w-[150px]" title={assignedRoles}>{assignedRoles}</div>
                      {u.amt && <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{u.amt}</div>}
                    </div>
                  </td>
                  
                  <td className="px-2 py-3 border-l border-gray-100 align-middle text-center">
                    <div className="font-bold text-orange-700 bg-orange-50 rounded py-1 border border-orange-100 text-xs shadow-sm">{openCount}</div>
                  </td>
                  <td className="px-2 py-3 border-l border-gray-100 align-middle text-center">
                    <div className="font-bold text-blue-700 bg-blue-50 rounded py-1 border border-blue-100 text-xs shadow-sm">{progressCount}</div>
                  </td>
                  <td className="px-2 py-3 border-l border-gray-100 align-middle text-center">
                    <div className="font-bold text-purple-700 bg-purple-50 rounded py-1 border border-purple-100 text-xs shadow-sm">{templateCount}</div>
                  </td>
                  <td className="px-2 py-3 border-x border-gray-100 align-middle text-center">
                    <div className="font-bold text-gray-600 bg-gray-50 rounded py-1 border border-gray-200 text-xs shadow-sm">{doneCount}</div>
                  </td>

                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => openSuccessionEditor(u)} className="text-blue-500 hover:bg-blue-50 hover:text-blue-700 p-2 rounded transition-colors" title="Amt & Aufgaben an Nachfolger übergeben"><Repeat className="w-4 h-4" /></button>
                      <button onClick={() => openUserEditor(u)} className="text-gray-400 hover:bg-gray-100 hover:text-blue-600 p-2 rounded transition-colors" title="Nutzer bearbeiten"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleSafeDelete(u, openCount, progressCount, templateCount)} className="text-red-400 hover:bg-red-50 hover:text-red-600 p-2 rounded transition-colors" title="Nutzer löschen"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
// --- END OF FILE ---