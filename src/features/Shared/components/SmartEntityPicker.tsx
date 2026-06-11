// [2026-06-03] - UX-FIX: SmartEntityPicker stark verbessert. Suchfeld wird nun auch bei Obergruppen ("Alle", "Aktiv") gelöscht, wenn es der einzige Treffer ist. Fokus bleibt danach im Suchfeld. Ein X-Button zum schnellen Löschen wurde hinzugefügt, und der Text im Eingabefeld wird bei Klicks automatisch markiert (Auto-Select), um ihn direkt überschreiben zu können (Frictionless UI).
// [2026-05-16] - UX-FIX: closeOnSelect Prop hinzugefügt, um Single-Select-Dropdowns (wie Absender) nach Auswahl sofort zu schließen
// [2026-05-16] - UX-FIX: Badge-Rendering für USER und GROUP hinzugefügt
// [2026-05-16] - UX-FIX: Fokus-Magie (Bulk-Select) implementiert. Liste schließt sich nur noch bei alleinigem Suchtreffer automatisch.
// [2026-05-16] - FIX: Typisierungsfehler (implicit 'any' für tId) im TEAM Klick-Handler behoben, indem targetHelpers streng typisiert wurde.
// [2026-05-16] - FEATURE: Zeilenkompression und virtuelle Obergruppen (Aktiv, Passiv, Jugend) mit Badge-Absorber integriert.
// src/features/Shared/components/SmartEntityPicker.tsx
import React, { useState, useMemo, useRef } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { Search, User, Users, Shield, Check, X, Filter } from 'lucide-react';

export interface EntitySelection {
  userIds: string[];
  groupIds: string[];
  teamIds: string[];
  helperIds: string[];
}

export type EntityType = 'USER' | 'GROUP' | 'TEAM' | 'HELPER';

interface SmartEntityPickerProps {
  selections: EntitySelection;
  onChange: (newSelections: EntitySelection) => void;
  placeholder?: string;
  excludeHelpers?: boolean;
  allowedTypes?: EntityType[]; 
  showBadges?: boolean; 
  closeOnSelect?: boolean;
}

interface UnifiedEntity {
  id: string;
  name: string;
  type: EntityType;
  subtext?: string;
  isSelected: boolean;
}

const VIRTUAL_GROUPS = [
  { id: 'vgroup-all', name: 'Alle Vereinsmitglieder', statusMatch: 'ALL' },
  { id: 'vgroup-aktiv', name: 'Obergruppe: Aktiv', statusMatch: 'Aktiv' },
  { id: 'vgroup-passiv', name: 'Obergruppe: Passiv', statusMatch: 'Passiv' },
  { id: 'vgroup-jugend', name: 'Obergruppe: Jugend', statusMatch: 'Jugend' }
];

export const SmartEntityPicker: React.FC<SmartEntityPickerProps> = ({ 
  selections, 
  onChange, 
  placeholder = "Suchen...",
  excludeHelpers = false,
  allowedTypes = ['USER', 'GROUP', 'TEAM', 'HELPER'],
  showBadges = false,
  closeOnSelect = false
}) => {
  const { users, groups, teams, helpers } = useClubStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // BADGE-ABSORBER LOGIK: Ermittelt alle Helfer, die bereits von einem ausgewählten Team oder einer Obergruppe abgedeckt sind
  const coveredHelperIds = useMemo(() => {
    const set = new Set<string>();
    selections.teamIds.forEach(tId => {
      if (tId.startsWith('vgroup-')) {
        const match = VIRTUAL_GROUPS.find(v => v.id === tId)?.statusMatch;
        helpers.forEach(h => {
          if (match === 'ALL' || h.memberStatus?.toLowerCase() === match?.toLowerCase()) {
            set.add(h.id!);
          }
        });
      } else {
        helpers.forEach(h => {
          if (h.teamIds?.includes(tId)) set.add(h.id!);
        });
      }
    });
    return set;
  }, [selections.teamIds, helpers]);

  // 1. Erlaubte Töpfe basierend auf dem expliziten Auswahl-State befüllen
  const allEntities = useMemo(() => {
    const list: UnifiedEntity[] = [];

    if (allowedTypes.includes('USER')) {
      users.forEach(u => {
        list.push({
          id: u.id, name: u.name, type: 'USER',
          subtext: u.amt || 'App-Nutzer', isSelected: selections.userIds.includes(u.id)
        });
      });
    }

    if (allowedTypes.includes('GROUP')) {
      groups.forEach(g => {
        list.push({
          id: g.id, name: g.name, type: 'GROUP',
          subtext: 'Amt (Fügt App-Nutzer hinzu)', isSelected: selections.groupIds.includes(g.id)
        });
      });
    }

    if (allowedTypes.includes('TEAM')) {
      teams.forEach(t => {
        list.push({
          id: t.id, name: t.name, type: 'TEAM',
          subtext: 'Team (Fügt Kader hinzu)', isSelected: selections.teamIds.includes(t.id)
        });
      });
    }

    if (!excludeHelpers && allowedTypes.includes('HELPER')) {
      VIRTUAL_GROUPS.forEach(vg => {
        list.push({
          id: vg.id, name: vg.name, type: 'TEAM', 
          subtext: 'Automatischer Struktur-Filter', isSelected: selections.teamIds.includes(vg.id)
        });
      });

      helpers.forEach(h => {
        if (h.id) {
          list.push({
            id: h.id, name: h.name, type: 'HELPER',
            subtext: h.memberStatus || 'Mitglied', isSelected: selections.helperIds.includes(h.id)
          });
        }
      });
    }

    return list;
  }, [users, groups, teams, helpers, selections, excludeHelpers, allowedTypes]);

  // 2. Filtern und differenzierte Sortierung
  const displayEntities = useMemo(() => {
    let filtered = allEntities;
    if (searchTerm.trim()) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
         e.name.toLowerCase().includes(lowerTerm) || 
         (e.subtext && e.subtext.toLowerCase().includes(lowerTerm))
      );
    }

    return filtered.sort((a, b) => {
      if (a.id.startsWith('vgroup-') && !b.id.startsWith('vgroup-')) return -1;
      if (!a.id.startsWith('vgroup-') && b.id.startsWith('vgroup-')) return 1;

      if (a.isSelected && !b.isSelected) return -1;
      if (!a.isSelected && b.isSelected) return 1;

      if (a.type === 'TEAM' && b.type !== 'TEAM') return -1;
      if (a.type !== 'TEAM' && b.type === 'TEAM') return 1;

      if (a.type === 'GROUP' && b.type === 'USER') return -1;
      if (a.type === 'USER' && b.type === 'GROUP') return 1;

      return a.name.localeCompare(b.name);
    });
  }, [allEntities, searchTerm]);

  // 3. Klick-Handler: Makros, Schnittmengen-Schutz & Bulk-Toggling
  const toggleEntity = (entity: { id: string; name: string; type: EntityType; isSelected: boolean }) => {
    const nextSelections = { ...selections };

    const toggleInArray = (arr: string[], id: string) => arr.includes(id) ? arr.filter(i => i !== id) : [...arr, id];

    switch (entity.type) {
      case 'USER':
        nextSelections.userIds = toggleInArray(nextSelections.userIds, entity.id);
        if (!nextSelections.userIds.includes(entity.id)) {
          nextSelections.groupIds = nextSelections.groupIds.filter(gId => {
            const groupUsers = users.filter(u => u.groupIds?.includes(gId)).map(u => u.id);
            return !groupUsers.includes(entity.id);
          });
        }
        break;
      
      case 'HELPER':
        nextSelections.helperIds = toggleInArray(nextSelections.helperIds, entity.id);
        if (!nextSelections.helperIds.includes(entity.id)) {
          nextSelections.teamIds = nextSelections.teamIds.filter(tId => {
            if (tId.startsWith('vgroup-')) {
               const vgMatch = VIRTUAL_GROUPS.find(v => v.id === tId)?.statusMatch;
               const vgroupHelpers = helpers.filter(h => vgMatch === 'ALL' || h.memberStatus?.toLowerCase() === vgMatch?.toLowerCase()).map(h => h.id!);
               return !vgroupHelpers.includes(entity.id);
            }
            const teamHelpers = helpers.filter(h => h.teamIds?.includes(tId)).map(h => h.id!);
            return !teamHelpers.includes(entity.id);
          });
        }
        break;
      
      case 'GROUP': {
        const isGroupSelected = nextSelections.groupIds.includes(entity.id);
        
        if (isGroupSelected) {
          const remainingGroupIds = nextSelections.groupIds.filter(id => id !== entity.id);
          nextSelections.groupIds = remainingGroupIds;
          
          const groupUsersToRemove = users.filter(u => u.groupIds?.includes(entity.id));
          const userIdsToRemove = groupUsersToRemove.filter(u => {
            const belongsToOtherSelectedGroup = u.groupIds?.some(gId => remainingGroupIds.includes(gId));
            return !belongsToOtherSelectedGroup;
          }).map(u => u.id);
          
          nextSelections.userIds = nextSelections.userIds.filter(id => !userIdsToRemove.includes(id));
        } else {
          nextSelections.groupIds = [...nextSelections.groupIds, entity.id];
          const groupUsersToAdd = users.filter(u => u.groupIds?.includes(entity.id));
          const userIdsToAdd = groupUsersToAdd.map(u => u.id).filter(id => !nextSelections.userIds.includes(id));
          nextSelections.userIds = [...nextSelections.userIds, ...userIdsToAdd];
        }
        break;
      }
      
      case 'TEAM': {
        const isTeamSelected = nextSelections.teamIds.includes(entity.id);
        const isVirtualGroup = entity.id.startsWith('vgroup-');
        
        let targetHelpers: typeof helpers = [];
        if (isVirtualGroup) {
          const match = VIRTUAL_GROUPS.find(v => v.id === entity.id)?.statusMatch;
          if (match === 'ALL') targetHelpers = helpers;
          else targetHelpers = helpers.filter(h => h.memberStatus?.toLowerCase() === match?.toLowerCase());
        } else {
          targetHelpers = helpers.filter(h => h.teamIds?.includes(entity.id));
        }

        if (isTeamSelected) {
          const remainingTeamIds = nextSelections.teamIds.filter(id => id !== entity.id);
          nextSelections.teamIds = remainingTeamIds;
          
          const helperIdsToRemove = targetHelpers.filter(h => {
            const inOtherTeam = h.teamIds?.some((tId: string) => remainingTeamIds.includes(tId));
            const inOtherVGroup = remainingTeamIds.some(rtId => {
               if (!rtId.startsWith('vgroup-')) return false;
               const vMatch = VIRTUAL_GROUPS.find(v => v.id === rtId)?.statusMatch;
               return vMatch === 'ALL' || h.memberStatus?.toLowerCase() === vMatch?.toLowerCase();
            });
            return !inOtherTeam && !inOtherVGroup;
          }).map(h => h.id!);
          
          nextSelections.helperIds = nextSelections.helperIds.filter(id => !helperIdsToRemove.includes(id));
        } else {
          nextSelections.teamIds = [...nextSelections.teamIds, entity.id];
          const helperIdsToAdd = targetHelpers.map(h => h.id!).filter(id => !nextSelections.helperIds.includes(id));
          nextSelections.helperIds = [...nextSelections.helperIds, ...helperIdsToAdd];
        }
        break;
      }
    }

    // CHIRURGISCHER EINGRIFF: Fokus-Magie & Auto-Select
    if (closeOnSelect) {
      setSearchTerm('');
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (displayEntities.length === 1) { 
      // Suchfeld löschen (auch bei V-Groups) und Cursor hartnäckig im Feld belassen
      setSearchTerm('');
      inputRef.current?.focus(); 
    } else {
      // Bei mehreren Treffern: Text markieren, damit der nächste Tastendruck ihn direkt überschreibt (Auto-Select)
      setTimeout(() => {
        inputRef.current?.select();
      }, 0);
    }

    onChange(nextSelections);
  };

  const getIcon = (type: EntityType, isSelected: boolean, isVGroup: boolean = false) => {
    const colorClass = isSelected ? 'text-blue-600' : 'text-gray-400';
    if (isVGroup) return <Filter className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-indigo-400'}`} />;

    switch (type) {
      case 'USER': return <User className={`w-3.5 h-3.5 ${colorClass}`} />;
      case 'GROUP': return <Shield className={`w-3.5 h-3.5 ${colorClass}`} />;
      case 'TEAM': return <Users className={`w-3.5 h-3.5 ${colorClass}`} />;
      case 'HELPER': return <User className={`w-3.5 h-3.5 ${colorClass}`} />;
    }
  };

  const getBadgeColor = (type: EntityType, isVGroup: boolean = false) => {
    if (isVGroup) return 'bg-indigo-100 text-indigo-700';
    switch (type) {
      case 'USER': return 'bg-purple-100 text-purple-700';
      case 'GROUP': return 'bg-amber-100 text-amber-700';
      case 'TEAM': return 'bg-blue-100 text-blue-700';
      case 'HELPER': return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white w-full">
      
      {/* Horizontaler Quer-Badge Block */}
      {showBadges && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50/50 border-b border-gray-100 min-h-[34px] max-h-32 overflow-y-auto">
          
          {allowedTypes.includes('USER') && selections.userIds.map(id => {
            const u = users.find(x => x.id === id);
            return u ? (
              <span key={`badge-u-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-600 text-white shadow-sm">
                <User className="w-3 h-3 mr-1 opacity-80" />
                {u.name}
                <button type="button" onClick={() => toggleEntity({ id: u.id, name: u.name, type: 'USER', isSelected: true })} className="ml-1 hover:text-purple-200">
                  <X className="w-3 h-3"/>
                </button>
              </span>
            ) : null;
          })}

          {allowedTypes.includes('GROUP') && selections.groupIds.map(id => {
            const g = groups.find(x => x.id === id);
            return g ? (
              <span key={`badge-g-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white shadow-sm">
                <Shield className="w-3 h-3 mr-1 opacity-80" />
                {g.name}
                <button type="button" onClick={() => toggleEntity({ id: g.id, name: g.name, type: 'GROUP', isSelected: true })} className="ml-1 hover:text-amber-200">
                  <X className="w-3 h-3"/>
                </button>
              </span>
            ) : null;
          })}

          {selections.teamIds.map(id => {
            if (id.startsWith('vgroup-') && allowedTypes.includes('HELPER')) {
              const vg = VIRTUAL_GROUPS.find(v => v.id === id);
              return vg ? (
                <span key={`badge-vg-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white shadow-sm">
                  <Filter className="w-3 h-3 mr-1 opacity-80" />
                  {vg.name}
                  <button type="button" onClick={() => toggleEntity({ id: vg.id, name: vg.name, type: 'TEAM', isSelected: true })} className="ml-1 hover:text-indigo-200">
                    <X className="w-3 h-3"/>
                  </button>
                </span>
              ) : null;
            } else if (allowedTypes.includes('TEAM') && !id.startsWith('vgroup-')) {
              const t = teams.find(x => x.id === id);
              return t ? (
                <span key={`badge-t-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white shadow-sm">
                  <Users className="w-3 h-3 mr-1 opacity-80" />
                  {t.name}
                  <button type="button" onClick={() => toggleEntity({ id: t.id, name: t.name, type: 'TEAM', isSelected: true })} className="ml-1 hover:text-blue-200">
                    <X className="w-3 h-3"/>
                  </button>
                </span>
              ) : null;
            }
            return null;
          })}
          
          {allowedTypes.includes('HELPER') && selections.helperIds.map(id => {
            if (coveredHelperIds.has(id)) return null; 
            const h = helpers.find(x => x.id === id);
            return h ? (
              <span key={`badge-h-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-600 text-white shadow-sm">
                <User className="w-3 h-3 mr-1 opacity-80" />
                {h.alias || h.name.split(' ')[0]}
                <button type="button" onClick={() => toggleEntity({ id: h.id!, name: h.name, type: 'HELPER', isSelected: true })} className="ml-1 hover:text-teal-200">
                  <X className="w-3 h-3"/>
                </button>
              </span>
            ) : null;
          })}
          
          {selections.userIds.length === 0 && selections.groupIds.length === 0 && selections.teamIds.length === 0 && selections.helperIds.length === 0 && (
            <span className="text-[11px] text-gray-400 italic">Keine Auswahl getroffen</span>
          )}
        </div>
      )}

      {/* Suchfeld */}
      <div className="p-2 bg-gray-50 flex items-center shrink-0 relative group">
        <Search className="w-4 h-4 text-gray-400 ml-2 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={(e) => { 
            e.target.select(); // CHIRURGISCHER EINGRIFF: Auto-Select Text
            setIsFocused(true); 
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 text-sm outline-none pr-8"
        />
        
        {/* CHIRURGISCHER EINGRIFF: Das "X" zum schnellen Löschen */}
        {searchTerm && (
          <button
            type="button"
            onMouseDown={(e) => { 
               // preventDefault ist hier extrem wichtig, damit das Input-Feld beim Klick nicht den Fokus verliert!
               e.preventDefault(); 
               setSearchTerm(''); 
               inputRef.current?.focus(); 
            }}
            className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 bg-gray-200/50 hover:bg-gray-200 rounded-full transition-colors"
            title="Eingabe löschen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Smarte Liste */}
      {(searchTerm.trim() !== '' || isFocused) && (
        <div className="border-t border-gray-100 max-h-56 overflow-y-auto custom-scrollbar p-1 bg-white">
          <div className="space-y-0.5">
            {displayEntities.map((entity) => {
              const isVGroup = entity.id.startsWith('vgroup-');
              return (
                <div
                  key={`${entity.type}-${entity.id}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleEntity(entity)}
                  className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                    entity.isSelected 
                      ? (isVGroup ? 'bg-indigo-50 border border-indigo-200' : 'bg-blue-50 border border-blue-200') 
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="shrink-0">{getIcon(entity.type, entity.isSelected, isVGroup)}</div>
                    <div className="min-w-0">
                      <div className={`text-[13px] leading-tight truncate ${entity.isSelected ? (isVGroup ? 'font-bold text-indigo-900' : 'font-bold text-blue-900') : 'font-medium text-gray-700'}`}>
                        {entity.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-[1px]">
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-1 py-[1px] rounded ${getBadgeColor(entity.type, isVGroup)}`}>
                          {isVGroup ? 'Filter' : entity.type === 'USER' ? 'App' : entity.type === 'GROUP' ? 'Amt' : entity.type === 'TEAM' ? 'Team' : 'Mitglied'}
                        </span>
                        {entity.subtext && (
                          <span className="text-[10px] text-gray-500 truncate">{entity.subtext}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2">
                    {entity.isSelected ? (
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isVGroup ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---