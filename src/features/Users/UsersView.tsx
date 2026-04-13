// 2026-04-13 22:20 - FIX: Vercel Build Errors (Unused & Type Conversion)
// src/features/Users/UsersView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
// CHIRURGISCHER EINGRIFF: Calendar entfernt
import { Users, UserPlus, ShieldAlert, Trash2, Edit2, Tag, Clock, ArrowUpDown, Plus } from 'lucide-react';
import { HelperFormModal } from './HelperFormModal.tsx';
import { UserFormModal } from './UserFormModal.tsx';
import { GroupFormModal } from './GroupFormModal.tsx';
import { ItemFormModal } from '../Shared/ItemFormModal.tsx';
import type { Helper, User, Group, AgendaItem } from '../../core/types/models';

type SortDirection = 'asc' | 'desc' | 'md-asc' | 'md-desc';

const EditableCell: React.FC<{ 
  value: string; 
  onSave: (val: string) => void; 
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  className?: string;
}> = ({ value, onSave, type = 'text', placeholder = '', className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    setIsFocused(false);
    if (tempVal !== value) onSave(tempVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setTempVal(value); setIsEditing(false); }
  };

  if (isEditing) {
    return (
      <input
        type={type === 'date' ? (isFocused || tempVal ? 'date' : 'text') : type}
        onFocus={() => setIsFocused(true)}
        autoFocus 
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full p-1 -m-1 text-sm border-2 border-blue-500 rounded bg-blue-50 outline-none ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`min-h-[24px] cursor-text hover:bg-gray-100 p-1 -m-1 rounded text-sm transition-colors ${!value ? 'text-gray-400 italic' : 'text-gray-900'} ${className}`}
    >
      {type === 'date' && value ? new Date(value).toLocaleDateString() : (value || placeholder)}
    </div>
  );
};

const QuickAddHelperRow: React.FC<{
  onAdd: (data: Partial<Helper>) => Promise<void>;
  existingAliases: string[];
}> = ({ onAdd, existingAliases }) => {
  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [bezug, setBezug] = useState('');
  const [email, setEmail] = useState('');
  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [telefon, setTelefon] = useState('');
  const [consent, setConsent] = useState(false);
  const [aliasModified, setAliasModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDateFocused, setIsDateFocused] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!aliasModified) setAlias(val.trim().split(' ')[0]);
  };

  const handleSave = async () => {
    if (!name.trim() || !alias.trim() || !consent) return;

    if (existingAliases.map(a => (a||'').toLowerCase()).includes(alias.trim().toLowerCase())) {
      alert(`Der Alias "${alias.trim()}" existiert bereits!`);
      return;
    }

    setIsSaving(true);
    let formattedName = name.trim();
    if (formattedName.includes(',')) {
      const parts = formattedName.split(',');
      if (parts.length === 2) formattedName = `${parts[1].trim()} ${parts[0].trim()}`;
    }

    let formattedPhone = telefon.trim().replace(/[^0-9+]/g, '');
    if (formattedPhone) {
      if (formattedPhone.startsWith('00')) {
        formattedPhone = '+' + formattedPhone.substring(2);
      } else if (formattedPhone.startsWith('0') && !formattedPhone.startsWith('00')) {
        formattedPhone = '+49' + formattedPhone.substring(1);
      }
    }

    await onAdd({
      name: formattedName,
      alias: alias.trim(),
      bezug: bezug.trim(),
      email: email.trim(),
      geburtsdatum: geburtsdatum || undefined,
      telefon: formattedPhone,
      consentConfirmed: consent
    });

    setName(''); setAlias(''); setBezug(''); setEmail('');
    setGeburtsdatum(''); setTelefon(''); setConsent(false);
    setAliasModified(false);
    setIsSaving(false);
  };

  return (
    <tr className="bg-blue-50/30 border-t-2 border-blue-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
      <td className="px-6 py-3 whitespace-nowrap">
        <input type="text" value={alias} onChange={e => {setAlias(e.target.value); setAliasModified(true);}} placeholder="Alias *" className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <input type="text" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Neuer Name *" className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <input type="text" value={bezug} onChange={e => setBezug(e.target.value)} placeholder="Freitext" className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-Mail" className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <input 
          type={isDateFocused || geburtsdatum ? "date" : "text"}
          onFocus={() => setIsDateFocused(true)}
          onBlur={() => setIsDateFocused(false)}
          value={geburtsdatum} onChange={e => setGeburtsdatum(e.target.value)} 
          placeholder="Geburtstag"
          className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
        />
      </td>
      <td className="px-6 py-3 whitespace-nowrap">
        <input type="tel" value={telefon} onChange={e => setTelefon(e.target.value)} placeholder="Telefon" className="w-full p-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </td>
      <td className="px-6 py-3 whitespace-nowrap text-right">
        <div className="flex flex-col items-end gap-1.5">
          <label className="flex items-center text-[10px] text-gray-600 font-medium cursor-pointer" title="DSGVO Zustimmung erforderlich">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mr-1.5 w-3 h-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500" /> 
            DSGVO
          </label>
          <button 
            onClick={handleSave} 
            disabled={!name.trim() || !alias.trim() || !consent || isSaving} 
            className="flex items-center justify-center bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full"
          >
            {isSaving ? '...' : <><Plus className="w-3.5 h-3.5 mr-1"/> Hinzufügen</>}
          </button>
        </div>
      </td>
    </tr>
  );
};

export const UsersView: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: user aus Destrukturierung entfernt
  const { users, helpers, groups, events, tasks, fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks, saveAgendaItem, cleanupExpiredHelpers, addHelper, deleteHelper, updateHelper, deleteUser, deleteGroup, isUsersLoading } = useClubStore();
  
  const [activeTab, setActiveTab] = useState<'vorstand' | 'helfer' | 'rollen'>('vorstand');
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState<Helper | undefined>(undefined);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AgendaItem | null>(null);
  const [expiredHelpers, setExpiredHelpers] = useState<Helper[]>([]);
  const [showExpired, setShowExpired] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Helper; direction: SortDirection }>({ key: 'name', direction: 'asc' });

  useEffect(() => {
    fetchUsersAndHelpers();
    fetchTemplatesAndRoutines();
    fetchEvents();
    fetchTasks();
  }, [fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks]);

  const isAdmin = true;

  const handleSort = (key: keyof Helper) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (key === 'geburtsdatum') {
          const nextMap: Record<SortDirection, SortDirection> = {
            'asc': 'desc',
            'desc': 'md-asc',
            'md-asc': 'md-desc',
            'md-desc': 'asc'
          };
          return { key, direction: nextMap[prev.direction] };
        } else {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedHelpers = useMemo(() => {
    const sortable = [...helpers];
    sortable.sort((a, b) => {
      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';

      if (sortConfig.key === 'geburtsdatum') {
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        if (!valA && !valB) return 0;
        if (sortConfig.direction.startsWith('md-')) {
          const mdA = valA.toString().substring(5);
          const mdB = valB.toString().substring(5);
          if (mdA < mdB) return sortConfig.direction === 'md-asc' ? -1 : 1;
          if (mdA > mdB) return sortConfig.direction === 'md-asc' ? 1 : -1;
          return 0;
        }
      }

      const aVal = valA.toString().toLowerCase();
      const bVal = valB.toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [helpers, sortConfig]);

  const handleInlineUpdateHelper = async (h: Helper, field: keyof Helper, newValue: string) => {
    let safeVal = newValue.trim();
    if (field === 'name' && !safeVal) return;
    
    if (field === 'name' && safeVal.includes(',')) {
      const parts = safeVal.split(',');
      if (parts.length === 2) {
        safeVal = `${parts[1].trim()} ${parts[0].trim()}`;
      }
    }

    if (field === 'alias') {
      if (!safeVal) { alert('Der Alias darf nicht leer sein!'); return; }
      const isDuplicate = helpers.some(x => x.id !== h.id && (x.alias || '').toLowerCase() === safeVal.toLowerCase());
      if (isDuplicate) { alert(`Der Alias "${safeVal}" wird bereits verwendet!`); return; }
    }

    if (h[field] === safeVal) return;

    const updatedData = { ...h, [field]: safeVal || undefined };
    
    if (field === 'telefon' && safeVal) {
      let f = safeVal.replace(/[^0-9+]/g, '');
      if (f.startsWith('00')) f = '+' + f.substring(2);
      else if (f.startsWith('0') && !f.startsWith('00')) f = '+49' + f.substring(1);
      updatedData.telefon = f;
    }
    
    if (!safeVal) {
        if (['bezug', 'email', 'telefon', 'geburtsdatum'].includes(field as string)) {
            (updatedData as any)[field] = '';
        }
    }

    updatedData.lastActivityAt = Date.now();
    await updateHelper(updatedData);
  };

  const handleQuickAddHelper = async (data: Partial<Helper>) => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const rawHelper: any = {
      id: `helper-${now}`,
      schemaVersion: '1.0',
      lastActivityAt: now,
      retentionExpiresAt: now + oneYear,
      ...data
    };
    // CHIRURGISCHER EINGRIFF: as unknown as hinzugefügt, um TS2352 zu beheben
    const safeHelper = Object.fromEntries(Object.entries(rawHelper).filter(([_, v]) => v !== undefined)) as unknown as Helper;
    await addHelper(safeHelper);
  };

  const openHelperEditor = (h?: Helper) => { setEditingHelper(h); setIsHelperModalOpen(true); };
  const openUserEditor = (u?: User) => { setEditingUser(u); setIsUserModalOpen(true); };
  const openGroupEditor = (g?: Group) => { setEditingGroup(g); setIsGroupModalOpen(true); };

  const getGroupRoutines = (gId: string) => {
    const routineMap = new Map<string, any>();
    tasks.filter(t => t.isRoutine && t.assigneeGroupIds?.includes(gId)).forEach(t => {
      const entry = routineMap.get(t.title) || { title: t.title, pattern: t.routinePattern, completedCount: 0, createdAt: t.createdAt, endDate: t.routineEndDate };
      if (t.status === 'ERLEDIGT' || t.progress === 100) entry.completedCount++;
      else { entry.activeTask = t; const ev = events.find(e => e.id === t.eventId); if (ev) entry.eventName = ev.title; }
      routineMap.set(t.title, entry);
    });
    return Array.from(routineMap.values());
  };
  
  const handleSafeDeleteHelper = async (h: Helper) => {
    if (window.confirm(`Möchtest du den Helfer "${h.name}" wirklich löschen?`)) {
      if (h.id) await deleteHelper(h.id);
    }
  };
  
  // CHIRURGISCHER EINGRIFF: Ungenutzte Funktion handleSafeDeleteUser entfernt

  const handleSafeDeleteGroup = async (g: Group) => {
    if (window.confirm(`Möchtest du die Rolle "${g.name}" wirklich löschen?`)) {
      if (g.id) await deleteGroup(g.id);
    }
  };

  const handleCheckGDPR = () => {
    const expired = cleanupExpiredHelpers();
    setExpiredHelpers(expired);
    setShowExpired(true);
  };

  const toggleGroupExpanded = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedGroups(next);
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === groups.length && groups.length > 0) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groups.map(g => g.id)));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">User & Gruppen</h1>
        <div className="flex gap-3">
          {activeTab === 'helfer' && (
            <button onClick={() => openHelperEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
              <UserPlus className="w-5 h-5 mr-2" /> Helfer anlegen
            </button>
          )}
          {activeTab === 'vorstand' && <button onClick={() => openUserEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"><UserPlus className="w-5 h-5 mr-2" /> Vorstand anlegen</button>}
          {activeTab === 'rollen' && (
            <>
              <button onClick={toggleAllGroups} className="flex items-center justify-center w-10 h-10 bg-white text-gray-700 border border-gray-300 font-mono font-bold text-lg rounded-lg hover:bg-gray-50 shadow-sm transition-colors" title="Alle Daueraufgaben ein-/ausblenden">+/-</button>
              <button onClick={() => openGroupEditor()} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition"><Tag className="w-5 h-5 mr-2" /> Rolle anlegen</button>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {['vorstand', 'helfer', 'rollen'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab as any); setShowExpired(false); }} className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('vorstand', 'Vorstände').replace('helfer', 'Externe Helfer').replace('rollen', 'Rollen & Ämter')}
          </button>
        ))}
      </div>

      {activeTab === 'helfer' && isAdmin && !showExpired && (
        <div className="mb-6 flex gap-3">
          <button onClick={handleCheckGDPR} className="flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 font-medium rounded-lg hover:bg-yellow-200 transition">
            <ShieldAlert className="w-5 h-5 mr-2" /> DSGVO-Bereinigung prüfen
          </button>
        </div>
      )}

      {showExpired && isAdmin ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-yellow-900 flex items-center"><ShieldAlert className="w-5 h-5 mr-2" /> Abgelaufene Helfer-Profile zur Löschung ({expiredHelpers.length})</h3>
            <button onClick={() => setShowExpired(false)} className="text-sm text-yellow-800 underline">Zurück</button>
          </div>
          {expiredHelpers.length === 0 ? <p className="text-yellow-800">Keine abgelaufenen Profile gefunden. Alles DSGVO-konform!</p> : (
            <div className="space-y-3">
              {expiredHelpers.map((h) => (
                <div key={h.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-yellow-100">
                  <div><div className="font-medium text-gray-900">{h.name}</div><div className="text-sm text-gray-500">Letzte Aktivität: {new Date(h.lastActivityAt || 0).toLocaleDateString()}</div></div>
                  <button onClick={() => handleSafeDeleteHelper(h)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
          {isUsersLoading ? <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div> : (
            <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
              {activeTab === 'vorstand' && users.length === 0 && <div className="p-8 text-center text-gray-500">Keine Vorstände gefunden.</div>}
              
              {activeTab === 'vorstand' && [...users].sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                <div key={u.id} className="p-4 hover:bg-gray-50 flex items-center justify-between transition-colors">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600 mr-4"><Users className="w-6 h-6" /></div>
                    <div><h3 className="font-semibold text-gray-900">{u.name}</h3><span className="text-xs font-medium text-gray-500">{u.amt} · {u.rolle}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openUserEditor(u)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => { if(window.confirm('Löschen?')) deleteUser(u.id); }} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}

              {activeTab === 'helfer' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 pb-20">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        {[
                          { k: 'alias', l: 'ALIAS (Kalender)' },
                          { k: 'name', l: 'Name (Vorname Nachname)' },
                          { k: 'bezug', l: 'Freitext' },
                          { k: 'email', l: 'E-Mail' },
                          { k: 'geburtsdatum', l: 'Geburtstag' },
                          { k: 'telefon', l: 'Telefon / WhatsApp' }
                        ].map(col => (
                          <th key={col.k} onClick={() => handleSort(col.k as any)} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-1">
                              {col.l} 
                              {col.k === 'geburtsdatum' && sortConfig.key === col.k && (
                                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">
                                  {sortConfig.direction.startsWith('md-') ? 'Tag/Monat' : 'Alter'}
                                </span>
                              )}
                              <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === col.k ? 'text-blue-600' : 'text-gray-300'}`} />
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedHelpers.map(h => (
                        <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.alias} onSave={val => handleInlineUpdateHelper(h, 'alias', val)} placeholder="Pflichtfeld" className="font-bold text-blue-700" /></td>
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.name} onSave={val => handleInlineUpdateHelper(h, 'name', val)} placeholder="Vorname Nachname" /></td>
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.bezug || ''} onSave={val => handleInlineUpdateHelper(h, 'bezug', val)} placeholder="--" /></td>
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.email || ''} type="email" onSave={val => handleInlineUpdateHelper(h, 'email', val)} placeholder="--" /></td>
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.geburtsdatum || ''} type="date" onSave={val => handleInlineUpdateHelper(h, 'geburtsdatum', val)} placeholder="--" /></td>
                          <td className="px-6 py-3 whitespace-nowrap"><EditableCell value={h.telefon || ''} type="tel" onSave={val => handleInlineUpdateHelper(h, 'telefon', val)} className="font-mono text-green-700" placeholder="--" /></td>
                          <td className="px-6 py-3 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => openHelperEditor(h)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleSafeDeleteHelper(h)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      <QuickAddHelperRow onAdd={handleQuickAddHelper} existingAliases={helpers.map(h => h.alias)} />
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'rollen' && [...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => {
                const groupRoutines = getGroupRoutines(g.id);
                const isExpanded = expandedGroups.has(g.id);
                return (
                  <div key={g.id} className="p-4 hover:bg-gray-50 flex flex-col justify-center transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mr-4"><Tag className="w-6 h-6" /></div>
                        <div><h3 className="font-semibold text-gray-900">{g.name}</h3>{g.description && <p className="text-sm text-gray-500">{g.description}</p>}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {groupRoutines.length > 0 && <button onClick={() => toggleGroupExpanded(g.id)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-lg font-mono font-bold leading-none transition-colors">{isExpanded ? '-' : '+'}</button>}
                        {isAdmin && (
                          <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-2">
                            <button onClick={() => openGroupEditor(g)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => handleSafeDeleteGroup(g)} className="text-red-400 hover:text-red-600 p-2"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    {isExpanded && groupRoutines.length > 0 && (
                      <div className="mt-4 ml-[60px] pl-4 border-l-2 border-purple-200">
                        <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-3">Stellenbeschreibung: Daueraufgaben</h4>
                        <div className="space-y-2">
                          {groupRoutines.map((r, i) => (
                            <div key={i} onClick={() => { if (r.activeTask) { setEditingTask(r.activeTask); setIsTaskModalOpen(true); } }} className={`bg-white border border-gray-200 p-2.5 rounded-lg flex flex-col shadow-sm ${r.activeTask ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}>
                              <div className="font-bold text-sm text-gray-800 flex justify-between items-start">
                                <span>{r.title}</span>
                                {r.completedCount > 0 && <span className="flex items-center text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Clock className="w-3 h-3 mr-1" /> {r.completedCount}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isHelperModalOpen && <HelperFormModal onClose={() => setIsHelperModalOpen(false)} existingHelper={editingHelper} />}
      {isUserModalOpen && <UserFormModal onClose={() => setIsUserModalOpen(false)} existingUser={editingUser} />}
      {isGroupModalOpen && <GroupFormModal onClose={() => setIsGroupModalOpen(false)} existingGroup={editingGroup} />}
      {isTaskModalOpen && editingTask && <ItemFormModal isOpen={isTaskModalOpen} existingItem={editingTask} onClose={() => setIsTaskModalOpen(false)} onSave={async (data) => { await saveAgendaItem(data); fetchTasks(); setIsTaskModalOpen(false); }} />}
    </div>
  );
};
// --- END OF FILE 439 Zeilen ---