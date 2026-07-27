// [2026-07-27] - UX-FEATURE: Persistente Filter-Speicherung (localStorage) für die Mitgliederansicht integriert (Status, Teams, Eltern-Info).
// [2026-07-27] - SEC-FEATURE: Frontend-Türsteher für das neue Recht 'viewJugend' implementiert.
// [2026-07-26] - SEC-FIX: Harte RBAC-Filterung für passive Mitglieder im Frontend eingebaut. Normale Mitglieder ohne 'manageMitglieder' oder 'viewEhrungen' können passive Mitglieder nicht mehr sehen, selbst wenn der UI-Filter aktiv ist.
// [2026-05-15] - FEATURE: Deep-Link Auto-Scroll (Springt zu fokussiertem Mitglied & Highlight)
// [2026-05-15] - FEATURE: Option B - Bulk-Editor für Team-Zuweisung (Checkboxen ganz links neben dem Namen) integriert
// 2026-04-19 14:50 - FIX: ReferenceError (X-Icon) & RBAC-Sichtbarkeit für Geburt/Eintritt
// 2026-04-20 16:00 - FEATURE: Standard-Sortierung nach anstehenden Geburtstagen (Jahreswechsel-Logik)
// 2026-04-20 16:15 - FEATURE: Toleranz für vergangene Geburtstage (letzte 14 Tage) hinzugefügt
// 2026-04-23 15:30 - FEATURE: Feld telefonEltern integriert & "no-print" für Geburtsdaten-Hinweis
// 2026-04-23 16:00 - UX-FIX: Tel. Eltern nach rechts verschoben und ausblendbar gemacht (inkl. Druck/Export)
// 2026-04-25 11:00 - UX-FIX: Tel. Eltern Toggle-Button für ALLE Nutzer sichtbar gemacht (unabhängig von canManageMitglieder)
// 2026-04-25 11:30 - UX-FIX: Platzoptimierung für mobile Geräte (enges Padding, w-px für Name) & Click-to-Call Buttons (Phone)
// 2026-04-25 12:00 - UX-FIX: Click-to-Call Icon VOR die Nummer gesetzt & Standard-Sortierung universell auf Vorname (A-Z) geändert
// 2026-04-25 12:30 - UX-FIX: Dynamische Sortier-Icons (ArrowUp/ArrowDown) zur besseren visuellen Rückmeldung implementiert
// 2026-04-30 18:45 - FEATURE: Feld emailEltern in Suche, UI, Export und Druckfunktion integriert
// 2026-05-11 15:30 - BUGFIX: CSV Export entkoppelt vom UI-Toggle (Eltern-Daten werden nun immer fix mit exportiert)
// 2026-05-14 14:30 - FEATURE: 3-Stufen App-Zugangs-Indikator (Grau/Gelb/Grün) basierend auf nativem Gast-Login integriert
// src/features/Users/tabs/MitgliederTab.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Cake, Edit2, Trash2, Filter, Search, X, Printer, FileDown, Eye, EyeOff, Phone, Users } from 'lucide-react';
import { useClubStore } from '../../../store/useClubStore';
import type { Helper } from '../../../core/types/models';
import { EditableCell } from '../components/EditableCell';
import { QuickAddHelperRow } from '../components/QuickAddHelperRow';

type SortDirection = 'asc' | 'desc' | 'md-asc' | 'md-desc' | 'ln-asc' | 'ln-desc';

interface MitgliederTabProps {
  openHelperEditor: (h?: Helper) => void;
  canManageMitglieder: boolean;
}

export const MitgliederTab: React.FC<MitgliederTabProps> = ({ openHelperEditor, canManageMitglieder }) => {
  const { helpers, updateHelper, deleteHelper, addHelper, user, teams, focusedHelperId, setFocusedHelperId, roleProfiles } = useClubStore();
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof Helper; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // CHIRURGISCHER EINGRIFF: Persistenz via localStorage
  const [statusFilter, setStatusFilter] = useState<Set<'AKTIV' | 'PASSIV' | 'JUGEND'>>(() => {
    const saved = localStorage.getItem('papatodo_mitglieder_statusFilter');
    if (saved) return new Set(JSON.parse(saved));
    return new Set(['AKTIV', 'PASSIV', 'JUGEND']);
  });
  
  const [selectedTeamFilter, setSelectedTeamFilter] = useState(() => localStorage.getItem('papatodo_mitglieder_selectedTeamFilter') || '');
  const [showParentInfo, setShowParentInfo] = useState(() => localStorage.getItem('papatodo_mitglieder_showParentInfo') === 'true');

  useEffect(() => { localStorage.setItem('papatodo_mitglieder_statusFilter', JSON.stringify(Array.from(statusFilter))); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('papatodo_mitglieder_selectedTeamFilter', selectedTeamFilter); }, [selectedTeamFilter]);
  useEffect(() => { localStorage.setItem('papatodo_mitglieder_showParentInfo', String(showParentInfo)); }, [showParentInfo]);

  const currentMonth = new Date().getMonth() + 1;
  
  const hasSensitiveAccess = canManageMitglieder || !!user?.permissions?.viewEhrungen;

  const currentProfile = useMemo(() => {
    return roleProfiles.find(p => p.id === user?.roleProfileId) || 
           roleProfiles.find(p => p.name === 'Mitglied') || 
           { permissions: {} as any };
  }, [user, roleProfiles]);

  const hasJugendAccess = canManageMitglieder || !!user?.permissions?.viewJugend || !!currentProfile.permissions.viewJugend;

  useEffect(() => {
    if (focusedHelperId) {
      setTimeout(() => {
        const rowElement = document.getElementById(`helper-row-${focusedHelperId}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          rowElement.classList.add('bg-yellow-100', 'transition-all', 'duration-500');
          setTimeout(() => {
            rowElement.classList.remove('bg-yellow-100');
            setFocusedHelperId(null); 
          }, 2000);
        }
      }, 100);
    }
  }, [focusedHelperId, setFocusedHelperId]);

  const getDaysUntilBirthday = (geburtsdatum?: string): number => {
    if (!geburtsdatum) return 9999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = geburtsdatum.split('-');
    if (parts.length !== 3) return 9999;
    
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    let bdayThisYear = new Date(today.getFullYear(), month, day);
    let diffTime = bdayThisYear.getTime() - today.getTime();
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < -14) {
      let bdayNextYear = new Date(today.getFullYear() + 1, month, day);
      diffTime = bdayNextYear.getTime() - today.getTime();
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return diffDays;
  };

  const handleSort = (key: keyof Helper) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (key === 'geburtsdatum' || key === 'eintrittsdatum') {
          if (prev.direction === 'asc') return { key, direction: 'desc' };
          if (prev.direction === 'desc') return { key, direction: 'md-asc' };
          if (prev.direction === 'md-asc') return { key, direction: 'md-desc' };
          return { key, direction: 'asc' };
        } else if (key === 'name') {
          if (prev.direction === 'asc') return { key, direction: 'desc' };
          if (prev.direction === 'desc') return { key, direction: 'ln-asc' };
          if (prev.direction === 'ln-asc') return { key, direction: 'ln-desc' };
          return { key, direction: 'asc' };
        } else {
          return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredAndSortedHelpers = useMemo(() => {
    const myEmail = user?.email?.toLowerCase() || '';
    const myHelperId = helpers.find(h => h.email?.toLowerCase() === myEmail)?.id;

    const filtered = helpers.filter(h => {
      const isMyOwnRecord = myHelperId && h.id === myHelperId;

      if (!hasSensitiveAccess && h.memberStatus === 'PASSIV' && !isMyOwnRecord) return false;
      if (!hasJugendAccess && h.memberStatus === 'JUGEND' && !isMyOwnRecord) return false;

      const matchStatus = statusFilter.has(h.memberStatus || 'AKTIV');
      if (!matchStatus && !isMyOwnRecord) return false;
      
      if (!searchTerm.trim()) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return (
        (h.name || '').toLowerCase().includes(lowerSearch) ||
        (h.alias || '').toLowerCase().includes(lowerSearch) ||
        (h.email || '').toLowerCase().includes(lowerSearch) ||
        (h.emailEltern || '').toLowerCase().includes(lowerSearch) ||
        (h.telefon || '').includes(lowerSearch) ||
        (h.telefonEltern || '').includes(lowerSearch)
      );
    });

    const sortable = [...filtered];
    sortable.sort((a, b) => {
      if (selectedTeamFilter) {
        const aInTeam = a.teamIds?.includes(selectedTeamFilter) ? 1 : 0;
        const bInTeam = b.teamIds?.includes(selectedTeamFilter) ? 1 : 0;
        if (aInTeam !== bInTeam) {
          return bInTeam - aInTeam; 
        }
      }

      const valA = a[sortConfig.key] || '';
      const valB = b[sortConfig.key] || '';

      if (sortConfig.key === 'geburtsdatum' || sortConfig.key === 'eintrittsdatum') {
        if (!valA && valB) return 1;
        if (valA && !valB) return -1;
        if (!valA && !valB) return 0;
        if (sortConfig.direction.startsWith('md-')) {
          if (sortConfig.key === 'geburtsdatum') {
            const daysA = getDaysUntilBirthday(valA.toString());
            const daysB = getDaysUntilBirthday(valB.toString());
            if (daysA !== daysB) {
              return sortConfig.direction === 'md-asc' ? daysA - daysB : daysB - daysA;
            }
            return 0;
          } else {
            const mdA = valA.toString().substring(5);
            const mdB = valB.toString().substring(5);
            if (mdA < mdB) return sortConfig.direction === 'md-asc' ? -1 : 1;
            if (mdA > mdB) return sortConfig.direction === 'md-asc' ? 1 : -1;
            return 0;
          }
        }
      }

      if (sortConfig.key === 'name' && sortConfig.direction.startsWith('ln-')) {
        const getLastName = (n: string) => {
          const parts = n.trim().split(' ');
          return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : n.trim().toLowerCase();
        };
        const lnA = getLastName(valA.toString());
        const lnB = getLastName(valB.toString());
        if (lnA < lnB) return sortConfig.direction === 'ln-asc' ? -1 : 1;
        if (lnA > lnB) return sortConfig.direction === 'ln-asc' ? 1 : -1;
        const fnA = valA.toString().toLowerCase();
        const fnB = valB.toString().toLowerCase();
        if (fnA < fnB) return sortConfig.direction === 'ln-asc' ? -1 : 1;
        if (fnA > fnB) return sortConfig.direction === 'ln-asc' ? 1 : -1;
        return 0;
      }

      const aVal = valA.toString().toLowerCase();
      const bVal = valB.toString().toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [helpers, sortConfig, statusFilter, searchTerm, selectedTeamFilter, hasSensitiveAccess, hasJugendAccess, user]);

  const handleInlineUpdateHelper = async (h: Helper, field: keyof Helper, newValue: string) => {
    let safeVal = newValue.trim();
    if (field === 'name' && !safeVal) return;
    if (field === 'name' && safeVal.includes(',')) {
      const parts = safeVal.split(',');
      if (parts.length === 2) safeVal = `${parts[1].trim()} ${parts[0].trim()}`;
    }
    if (field === 'alias') {
      if (!safeVal) { alert('Der Alias darf nicht leer sein!'); return; }
      if (helpers.some(x => x.id !== h.id && (x.alias || '').toLowerCase() === safeVal.toLowerCase())) {
        alert(`Der Alias "${safeVal}" wird bereits verwendet!`); return;
      }
    }
    if (h[field] === safeVal) return;
    const updatedData = { ...h, [field]: safeVal || undefined };
    
    if ((field === 'telefon' || field === 'telefonEltern') && safeVal) {
      let f = safeVal.replace(/[^0-9+]/g, '');
      if (f.startsWith('00')) f = '+' + f.substring(2);
      else if (f.startsWith('0') && !f.startsWith('00')) f = '+49' + f.substring(1);
      (updatedData as any)[field] = f;
    }
    
    if (!safeVal && ['bezug', 'email', 'emailEltern', 'telefon', 'telefonEltern', 'geburtsdatum', 'eintrittsdatum'].includes(field as string)) {
      (updatedData as any)[field] = '';
    }
    updatedData.lastActivityAt = Date.now();
    await updateHelper(updatedData);
  };

  const handleToggleTeamMembership = async (h: Helper) => {
    if (!selectedTeamFilter) return;
    const currentTeamIds = h.teamIds || [];
    let newTeamIds;
    if (currentTeamIds.includes(selectedTeamFilter)) {
      newTeamIds = currentTeamIds.filter(id => id !== selectedTeamFilter);
    } else {
      newTeamIds = [...currentTeamIds, selectedTeamFilter];
    }
    await updateHelper({ ...h, teamIds: newTeamIds, lastActivityAt: Date.now() });
  };

  const handleQuickAddHelper = async (data: Partial<Helper>) => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const rawHelper: any = { id: `helper-${now}`, schemaVersion: '1.0', lastActivityAt: now, retentionExpiresAt: now + oneYear, ...data };
    const safeHelper = Object.fromEntries(Object.entries(rawHelper).filter(([_, v]) => v !== undefined)) as unknown as Helper;
    
    if (selectedTeamFilter) {
      safeHelper.teamIds = [selectedTeamFilter];
    }
    
    await addHelper(safeHelper);
  };

  const handleSafeDeleteHelper = async (h: Helper) => {
    if (window.confirm(`Möchtest du das Mitglied "${h.name}" wirklich löschen?`)) {
      if (h.id) await deleteHelper(h.id);
    }
  };

  const handleExportCSV = () => {
    let csv = '\uFEFF' + "Name;Telefon;Email;Status;Alias;Tel. Eltern;Email Eltern";
    if (hasSensitiveAccess) csv += ";Geburt;Eintritt";
    csv += "\n";
    filteredAndSortedHelpers.forEach(h => {
       csv += `${h.name || ''};${h.telefon || ''};${h.email || ''};${h.memberStatus || 'AKTIV'};${h.alias || ''};${h.telefonEltern || ''};${h.emailEltern || ''}`;
       if (hasSensitiveAccess) csv += `;${h.geburtsdatum || ''};${h.eintrittsdatum || ''}`;
       csv += "\n";
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mitgliederliste_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintKorrektur = () => {
    let html = `<html><head><title>Korrekturliste</title><style>body{font-family:sans-serif;padding:20px;}h1{font-size:18px;border-bottom:1px solid #000;padding-bottom:10px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:11px;}th{background:#f0f0f0;}.corr{width:25%;}@media print{@page{size:landscape;} .no-print{display:none;}}</style></head><body><h1>Korrekturliste Mitglieder (Stand: ${new Date().toLocaleDateString()})</h1><p>Bitte Daten prüfen und Korrekturen rechts eintragen. <span class="no-print">Geburtsdaten sind hier ausgeblendet.</span></p><table><thead><tr><th>Name</th><th>Telefon</th><th>Email</th><th>Status</th><th>Alias</th>${showParentInfo ? '<th>Tel. Eltern</th><th>Email Eltern</th>' : ''}<th class="corr">Korrekturen / Unterschrift</th></tr></thead><tbody>`;
    filteredAndSortedHelpers.forEach(h => {
      html += `<tr><td><strong>${h.name}</strong></td><td>${h.telefon || ''}</td><td>${h.email || ''}</td><td>${h.memberStatus || 'AKTIV'}</td><td>${h.alias || ''}</td>${showParentInfo ? `<td>${h.telefonEltern || ''}</td><td>${h.emailEltern || ''}</td>` : ''}<td></td></tr>`;
    });
    html += `</tbody></table><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
    const w = window.open('', '_blank');
    if(w){ w.document.write(html); w.document.close(); }
  };

  const renderSortIcon = (key: keyof Helper) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-50" />;
    }
    const isAsc = sortConfig.direction.endsWith('asc');
    return isAsc ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const renderAppAccessIndicator = (h: Helper) => {
    if (!canManageMitglieder) return null;

    if (!h.hasAppAccess) {
      return (
        <div 
          className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300 shrink-0 cursor-help" 
          title="Kein App-Zugang"
        />
      );
    }

    const lastActive = h.lastAppLoginAt || 0;
    const daysSinceActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);

    if (lastActive > 0 && daysSinceActive <= 30) {
      return (
        <div 
          className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 shadow-sm cursor-help" 
          title={`App-Zugang aktiv (Zuletzt online: ${new Date(lastActive).toLocaleDateString()})`}
        />
      );
    }

    return (
      <div 
        className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0 shadow-sm cursor-help" 
        title={lastActive > 0 ? `Inaktiv (Zuletzt online: ${new Date(lastActive).toLocaleDateString()})` : "Hat App-Zugang, aber noch nie eingeloggt"}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 m-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Filter className="w-4 h-4 text-gray-400 ml-1" />
          {(['AKTIV', 'PASSIV', 'JUGEND'] as const).map(status => {
            if (status === 'PASSIV' && !hasSensitiveAccess) return null;
            if (status === 'JUGEND' && !hasJugendAccess) return null;

            const isActive = statusFilter.has(status);
            let activeClass = isActive ? (status === 'PASSIV' ? 'bg-gray-200 text-gray-700 border-gray-300 shadow-sm' : status === 'JUGEND' ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm' : 'bg-green-100 text-green-700 border-green-200 shadow-sm') : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50';
            return (
              <button key={status} onClick={() => setStatusFilter(prev => { const n = new Set(prev); if (n.has(status)) n.delete(status); else n.add(status); return n; })} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center shadow-sm ${activeClass}`}>
                {status} {isActive && <span className="ml-1.5 text-[10px]">✓</span>}
              </button>
            );
          })}

          {canManageMitglieder && teams.length > 0 && (
            <div className="relative ml-2 flex items-center">
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className={`text-xs border rounded-lg outline-none transition-all py-1.5 pl-2 pr-8 appearance-none shadow-sm cursor-pointer ${
                  selectedTeamFilter 
                    ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <option value="">Alle Teams...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Users className={`absolute right-2.5 w-3.5 h-3.5 pointer-events-none ${selectedTeamFilter ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
          )}
          
          <div className="relative flex-1 max-w-xs ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Suchen..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowParentInfo(!showParentInfo)} 
            className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm border ${showParentInfo ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}`}
            title="Eltern-Kontaktdaten ein-/ausblenden"
          >
            {showParentInfo ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
            Eltern-Info
          </button>
          
          {canManageMitglieder && (
            <>
              <button onClick={handlePrintKorrektur} className="flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg transition-colors shadow-sm">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Drucken
              </button>
              <button onClick={handleExportCSV} className="flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm">
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Export
              </button>
            </>
          )}
        </div>

      </div>

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 pb-20">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th onClick={() => handleSort('name')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors w-px">
                <div className="flex items-center gap-1">
                  {selectedTeamFilter && canManageMitglieder && (
                    <span className="w-5 flex justify-center text-blue-600 mr-1" title="Team-Zuweisung"><Users className="w-4 h-4" /></span>
                  )}
                  Name 
                  {sortConfig.key === 'name' && (
                    <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">
                      {sortConfig.direction.startsWith('ln-') ? 'Nachname' : 'Vorname'}
                    </span>
                  )}
                  {renderSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSort('telefon')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">Telefon {renderSortIcon('telefon')}</div>
              </th>
              <th onClick={() => handleSort('email')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">E-Mail {renderSortIcon('email')}</div>
              </th>
              <th onClick={() => handleSort('memberStatus')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">Status {renderSortIcon('memberStatus')}</div>
              </th>
              <th onClick={() => handleSort('alias')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-1">Alias {renderSortIcon('alias')}</div>
              </th>
              
              {showParentInfo && (
                <>
                  <th onClick={() => handleSort('telefonEltern')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1">Tel. Eltern {renderSortIcon('telefonEltern')}</div>
                  </th>
                  <th onClick={() => handleSort('emailEltern')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-1">E-Mail Eltern {renderSortIcon('emailEltern')}</div>
                  </th>
                </>
              )}

              {hasSensitiveAccess && (
                <th onClick={() => handleSort('geburtsdatum')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-1">
                    Geburt 
                    {sortConfig.key === 'geburtsdatum' && (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">
                        {sortConfig.direction.startsWith('md-') ? 'Tag/Monat' : 'Alter'}
                      </span>
                    )}
                    {renderSortIcon('geburtsdatum')}
                  </div>
                </th>
              )}
              {hasSensitiveAccess && (
                <th onClick={() => handleSort('eintrittsdatum')} className="px-2 sm:px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-1">
                    Eintritt 
                    {sortConfig.key === 'eintrittsdatum' && (
                      <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">
                        {sortConfig.direction.startsWith('md-') ? 'Tag/Monat' : 'Dauer'}
                      </span>
                    )}
                    {renderSortIcon('eintrittsdatum')}
                  </div>
                </th>
              )}
              {canManageMitglieder && <th className="px-2 sm:px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedHelpers.map(h => {
              const isBirthdayMonth = h.geburtsdatum?.split('-')[1] === currentMonth.toString().padStart(2, '0');
              const isSelectedTeamMember = selectedTeamFilter && h.teamIds?.includes(selectedTeamFilter);
              
              return (
                <tr 
                  key={h.id} 
                  id={`helper-row-${h.id}`}
                  className={`transition-colors ${isSelectedTeamMember ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap w-px">
                    <div className="flex items-center gap-2">
                      {selectedTeamFilter && canManageMitglieder && (
                        <input 
                          type="checkbox"
                          checked={isSelectedTeamMember || false}
                          onChange={() => handleToggleTeamMembership(h)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                          title={`${h.name} zum Team hinzufügen/entfernen`}
                        />
                      )}
                      {renderAppAccessIndicator(h)}
                      <EditableCell value={h.name} onSave={val => handleInlineUpdateHelper(h, 'name', val)} disabled={!canManageMitglieder} placeholder="Vorname Nachname" />
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {h.telefon && (
                        <a href={`tel:${h.telefon}`} className="text-blue-600 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors shadow-sm shrink-0" title="Anrufen">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <EditableCell value={h.telefon || ''} type="tel" onSave={val => handleInlineUpdateHelper(h, 'telefon', val)} disabled={!canManageMitglieder} className="font-mono text-gray-700" placeholder="--" />
                    </div>
                  </td>
                  
                  <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap">
                    <EditableCell value={h.email || ''} type="email" onSave={val => handleInlineUpdateHelper(h, 'email', val)} disabled={!canManageMitglieder} placeholder="--" />
                  </td>
                  
                  <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap text-xs font-bold text-gray-600">
                    <span onClick={() => { if(canManageMitglieder) openHelperEditor(h); }} className={`${canManageMitglieder ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} px-2 py-0.5 rounded-full ${h.memberStatus === 'PASSIV' ? 'bg-gray-100 text-gray-500' : h.memberStatus === 'JUGEND' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {h.memberStatus || 'AKTIV'}
                    </span>
                  </td>
                  
                  <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap">
                    <EditableCell value={h.alias} onSave={val => handleInlineUpdateHelper(h, 'alias', val)} disabled={!canManageMitglieder} placeholder="Pflichtfeld" className="font-bold text-blue-700" />
                  </td>
                  
                  {showParentInfo && (
                    <>
                      <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {h.telefonEltern && (
                            <a href={`tel:${h.telefonEltern}`} className="text-blue-600 bg-blue-50 p-1.5 rounded-full hover:bg-blue-100 transition-colors shadow-sm shrink-0" title="Anrufen">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <EditableCell value={h.telefonEltern || ''} type="tel" onSave={val => handleInlineUpdateHelper(h, 'telefonEltern', val)} disabled={!canManageMitglieder} className="font-mono text-gray-700" placeholder="--" />
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap">
                        <EditableCell value={h.emailEltern || ''} type="email" onSave={val => handleInlineUpdateHelper(h, 'emailEltern', val)} disabled={!canManageMitglieder} placeholder="--" />
                      </td>
                    </>
                  )}

                  {hasSensitiveAccess && (
                    <td className={`px-2 sm:px-3 py-1.5 whitespace-nowrap ${isBirthdayMonth ? 'bg-yellow-50' : ''}`}>
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          {isBirthdayMonth && <Cake className="w-4 h-4 text-orange-500 mr-2 animate-pulse" />}
                          <EditableCell value={h.geburtsdatum || ''} type="date" onSave={val => handleInlineUpdateHelper(h, 'geburtsdatum', val)} disabled={!canManageMitglieder} placeholder="--" className={isBirthdayMonth ? 'font-bold text-orange-700' : ''} />
                        </div>
                        {h.geburtsdatum && (
                          <div className="text-[10px] mt-0.5 ml-6">
                            {(() => {
                              const d = getDaysUntilBirthday(h.geburtsdatum);
                              if (d === 0) return <span className="text-pink-600 font-bold">Heute! 🎉</span>;
                              if (d === 1) return <span className="text-orange-600 font-medium">Morgen</span>;
                              if (d === -1) return <span className="text-purple-600 font-medium">Gestern</span>;
                              if (d < 0 && d >= -14) return <span className="text-purple-600 font-medium">vor {Math.abs(d)} Tagen</span>;
                              if (d > 1 && d <= 14) return <span className="text-blue-600 font-medium">in {d} Tagen</span>;
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {hasSensitiveAccess && (
                    <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap"><EditableCell value={h.eintrittsdatum || ''} type="date" onSave={val => handleInlineUpdateHelper(h, 'eintrittsdatum', val)} disabled={!canManageMitglieder} placeholder="--" /></td>
                  )}

                  {canManageMitglieder && (
                    <td className="px-2 sm:px-3 py-1.5 whitespace-nowrap text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openHelperEditor(h)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleSafeDeleteHelper(h)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            
            {canManageMitglieder && (
              <QuickAddHelperRow onAdd={handleQuickAddHelper} existingAliases={helpers.map(h => h.alias)} hasSensitiveAccess={hasSensitiveAccess} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
// --- END OF FILE ---