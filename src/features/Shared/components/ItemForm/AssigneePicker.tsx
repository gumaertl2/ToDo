// [2026-05-16] - FIX: Unused local 'helpers' entfernt, um strict TS6133 Compilation-Error zu beheben.
// [2026-05-16] - UX-FIX: Festen Höhen-Container entfernt und showBadges={true} aktiviert für einklappbare Such-UX und Team-Badges.
// [2026-05-16] - REFACTOR: Händische Helfer-Suche durch wiederverwendbaren SmartEntityPicker ersetzt (inkl. Team-Makros)
// 2026-05-12 13:25 - REFACTOR: Extraktion der Zuweisungs-Logik (Nutzer/Helfer) aus ItemFormModal.
// 2026-05-12 19:10 - FEATURE: Participation-First Zuweisung. Filtert App-Nutzer basierend auf Event-Teilnehmern, wenn eine eventId übergeben wird.
// src/features/Shared/components/ItemForm/AssigneePicker.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../../../store/useClubStore';
import { Search, User, Users, X } from 'lucide-react';
import { SmartEntityPicker } from '../SmartEntityPicker';

interface AssigneePickerProps {
  assigneeUserIds: string[];
  setAssigneeUserIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  assigneeHelperIds: string[];
  setAssigneeHelperIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  isReadOnly: boolean;
  eventId?: string;
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  assigneeUserIds,
  setAssigneeUserIds,
  assigneeHelperIds,
  setAssigneeHelperIds,
  isReadOnly,
  eventId
}) => {
  const { users, events } = useClubStore();
  
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [isInternalFocused, setIsInternalFocused] = useState(false);
  
  // Temporärer Speicher für aktivierte Team-Haken im aktuellen Formular-Kontext
  const [modalTeamIds, setModalTeamIds] = useState<string[]>([]);

  // Filter-Logik für die App-Nutzer (Spalte Links)
  const filteredInternal = useMemo(() => {
    const term = internalSearchTerm.toLowerCase();
    const res: { id: string; label: string; sub: string }[] = [];
    const currentEvent = eventId ? events.find(e => e.id === eventId) : null;
    
    users.forEach(u => {
      let isParticipant = true;
      
      // HARD-GATE: Im Event-Kontext dürfen nur echte Teilnehmer zugewiesen werden
      if (currentEvent) {
        const inUserList = currentEvent.participantUserIds?.includes(u.id);
        const inGroupList = currentEvent.participantGroupIds?.some(gId => u.groupIds?.includes(gId));
        isParticipant = !!(inUserList || inGroupList);
      }

      if (isParticipant && !assigneeUserIds.includes(u.id) && u.name.toLowerCase().includes(term)) {
        res.push({ id: u.id, label: `👤 ${u.name}`, sub: `Nutzer (${u.rolle})` });
      }
    });
    
    return res;
  }, [internalSearchTerm, users, assigneeUserIds, eventId, events]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      
      {/* LINKSE SEITE: App Nutzer Zuweisung */}
      <div className="bg-blue-50/40 p-2.5 rounded-lg border border-blue-100 flex flex-col">
        <label className="block text-xs font-bold text-blue-800 mb-1.5 flex items-center">
          <User className="w-3.5 h-3.5 mr-1" /> App Nutzer Zuweisung
        </label>
        
        <div className="flex flex-wrap gap-1.5 mb-2">
          {assigneeUserIds.map(id => {
            const u = users.find(x => x.id === id);
            return u ? (
              <span key={`u-${id}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white shadow-sm">
                {u.name}
                {!isReadOnly && (
                  <button onClick={() => setAssigneeUserIds(prev => prev.filter(x => x !== id))} className="ml-1 hover:text-blue-200">
                    <X className="w-3 h-3"/>
                  </button>
                )}
              </span>
            ) : null;
          })}
          {assigneeUserIds.length === 0 && <span className="text-[11px] text-blue-600/60 italic">Niemand zugewiesen</span>}
        </div>
        
        {!isReadOnly && (
          <div className="relative mt-auto">
            <div className="flex items-center border border-blue-200 rounded bg-white px-2 focus-within:border-blue-400 shadow-sm">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <input 
                type="text" value={internalSearchTerm} onChange={e => setInternalSearchTerm(e.target.value)}
                onFocus={() => setIsInternalFocused(true)} 
                onBlur={() => setTimeout(() => setIsInternalFocused(false), 200)}
                className="w-full p-1.5 text-xs outline-none bg-transparent font-medium" placeholder="Nutzer suchen..."
              />
            </div>
            {isInternalFocused && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
                {filteredInternal.length > 0 ? filteredInternal.map(a => (
                    <button 
                      key={a.id} 
                      onClick={() => { 
                        setAssigneeUserIds(prev => [...prev, a.id]); 
                        setInternalSearchTerm(''); 
                      }} 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex flex-col"
                    >
                      <span className="text-xs font-bold text-gray-800">{a.label}</span>
                    </button>
                  )) : <div className="px-3 py-2 text-xs text-gray-500 italic">{eventId ? 'Keine Event-Teilnehmer gefunden.' : 'Keine Treffer.'}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RECHTE SEITE: Externe Helfer & Teams via SmartEntityPicker */}
      <div className="bg-teal-50/40 p-2.5 rounded-lg border border-teal-100 flex flex-col justify-between">
        <label className="block text-xs font-bold text-teal-800 mb-1.5 flex items-center">
          <Users className="w-3.5 h-3.5 mr-1" /> Externe Helfer & Kader
        </label>
        
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden mt-1">
          <SmartEntityPicker
            selections={{
              userIds: [],
              groupIds: [],
              teamIds: modalTeamIds,
              helperIds: assigneeHelperIds
            }}
            onChange={(sel) => {
              setModalTeamIds(sel.teamIds);
              setAssigneeHelperIds(sel.helperIds);
            }}
            allowedTypes={['TEAM', 'HELPER']}
            showBadges={true}
            placeholder="Helfer oder Team suchen..."
          />
        </div>
      </div>
      
    </div>
  );
};
// --- END OF FILE ---