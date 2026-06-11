// [2026-06-11] - UX-FIX: "Weg B" (Natürliches Scrollen) komplettiert. Innere Container auf 'overflow-visible md:overflow-y-auto' bzw. 'overflow-visible md:overflow-hidden' umgestellt, damit die mobile Listen-Ansicht nicht mehr durch eine eigene Scrollbar eingesperrt ist, sondern dem natürlichen Scroll-Flow der übergeordneten EventDetailView folgt.
// [2026-06-11] - ARCHITEKTUR-FIX: Fate-Binding in EventAgendaList integriert. Kosmetik-Filter entfernt und durch isHistorical-Prüfung ersetzt. Legacy-Fallback für alte Daten (isHistorical === undefined) beibehalten.
// [2026-06-10] - BUGFIX: Sperre beim Löschen für Unterpunkte aufgehoben. Unterpunkte in aktiven Sitzungen können nun per Soft-Delete (TRASH) entfernt werden, ohne dass die Haupt-Routine blockiert.
// [2026-06-03] - ARCHITEKTUR-FIX (Container-Swap): Wenn der Oberpunkt eines Containers (Routine) auf 100% (Erledigt) gesetzt wird, filtert das UI ab sofort den GESAMTEN Container (inkl. aller offenen/erledigten Unterpunkte) unsichtbar ins Schattenreich, da ihr frisch geklonter Container-Zwilling sofort den Platz in der Agenda einnimmt.
// [2026-06-03] - BUGFIX: 'isReadOnly={isReadOnly}' Prop an ItemFormModal durchgereicht. Dadurch öffnet sich das Detail-Modal bei abgeschlossenen Protokollen nun korrekt im Read-Only-Modus.
// [2026-06-01] - BUGFIX: 'searchQuery' Prop an AgendaItemRow durchgereicht, damit das Highlighting in den Zeilen ankommt.
// [2026-05-31] - UX-FIX: Suchfeld ("Volltext / Ähnlichkeitssuche") re-integriert. 
// --- START OF FILE ---
// src/features/Events/EventAgendaList.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom'; 
import { useClubStore } from '../../store/useClubStore';
import { Plus, Calendar, Filter, Edit2, Trash2, ArrowLeftToLine, ArrowRightToLine, CornerDownRight, PlusCircle } from 'lucide-react';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import type { Event, AgendaItem, Task } from '../../core/types/models';

interface EventAgendaListProps {
  eventId: string;
  currentEvent: Event;
  eventAgenda: AgendaItem[];
  isReadOnly: boolean;
  tempDurations: Record<string, number>;
  searchQuery?: string;
  onAddNewItem: () => void;
  onEditItem: (item: AgendaItem) => void;
  onOpenHistory: (item: Task) => void;
  onPlanNextMeeting: () => void;
  onFinishEvent: () => void;
  onDurationPreview: (id: string, val: number) => void;
  onClearPreview: (id: string) => void;
}

export const EventAgendaList: React.FC<EventAgendaListProps> = ({
  eventId, currentEvent, eventAgenda, isReadOnly, tempDurations, searchQuery,
  onAddNewItem, onEditItem, onOpenHistory,
  onPlanNextMeeting, onFinishEvent, onDurationPreview, onClearPreview
}) => {
  const { moveAgendaItem, saveAgendaItem, fetchEventAgenda, users, groups } = useClubStore();
  const location = useLocation(); 

  const [sortBy, setSortBy] = useState<'default' | 'assignee' | 'dueDate'>('default');
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  const [cyclePhase, setCyclePhase] = useState(0); 
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const initialCollapseDone = useRef(false);

  useEffect(() => {
    setExpandedIds(new Set());
    setCollapsedParents(new Set());
    setCyclePhase(0);
    setSelectedItemId(null);
    initialCollapseDone.current = false;
  }, [eventId]);

  useEffect(() => {
    if (initialCollapseDone.current) return;

    if (eventAgenda.length > 0) {
      if (eventAgenda.some(i => i.eventId !== eventId)) return;

      const allParents = new Set<string>();
      eventAgenda.forEach(i => {
        if (i.isSubItem && i.parentItemId) allParents.add(i.parentItemId);
      });

      const targetId = location.state?.targetItemId;
      if (targetId) {
        const targetItem = eventAgenda.find(i => i.id === targetId);
        if (targetItem?.isSubItem && targetItem.parentItemId) {
           allParents.delete(targetItem.parentItemId);
        }
      }

      setCollapsedParents(allParents);
      setExpandedIds(new Set()); 
      initialCollapseDone.current = true;
    }
  }, [eventAgenda, eventId, location.state]);

  useEffect(() => {
    const targetId = location.state?.targetItemId;
    if (targetId && eventAgenda.length > 0 && !eventAgenda.some(i => i.eventId !== eventId)) {
      setSelectedItemId(targetId);
      window.history.replaceState({}, document.title);
      
      setTimeout(() => {
        const el = document.getElementById(`agenda-item-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [location.state, eventAgenda, eventId]);

  const processedAgenda = useMemo(() => {
    const visibleAgenda = eventAgenda.filter(item => {
        if (item.status === 'TRASH') return false;

        // ---> CHIRURGISCHER EINGRIFF: FATE-BINDING FILTER <---
        if (!isReadOnly && item.isHistorical === true) {
            return false;
        }

        // FALLBACK: Wenn isHistorical noch undefined ist (Altdaten)
        if (!isReadOnly && item.isHistorical === undefined) {
            const isRoutine = item.isRoutine === true || String(item.isRoutine) === 'true';
            const isCompleted = item.progress === 100 || item.status === 'ERLEDIGT';
            
            if (isRoutine && isCompleted) return false;

            if (item.isSubItem && item.parentItemId) {
                const parent = eventAgenda.find(p => p.id === item.parentItemId);
                if (parent && parent.status !== 'TRASH') {
                    const parentIsRoutine = parent.isRoutine === true || String(parent.isRoutine) === 'true';
                    const parentIsCompleted = parent.progress === 100 || parent.status === 'ERLEDIGT';
                    if (parentIsRoutine && parentIsCompleted) return false;
                }
            }
        }

        return true;
    });

    let runningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);
    
    return visibleAgenda.map((item, index) => {
      const baseEstimate = item.isSubItem ? (item.durationEstimate || 0) : (item.durationEstimate || 0);
      const effectiveDuration = tempDurations[item.id] !== undefined ? tempDurations[item.id] : baseEstimate;
      
      const startTimeStr = new Date(runningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isOvertime = currentEvent.plannedEndTime ? runningTime > currentEvent.plannedEndTime : false;
      
      runningTime += effectiveDuration * 60000; 

      return {
        ...item,
        originalIndex: index,
        calculatedStartTimeStr: startTimeStr,
        calculatedIsOvertime: isOvertime,
        effectiveDuration
      };
    });
  }, [eventAgenda, tempDurations, currentEvent.plannedStartTime, currentEvent.plannedEndTime, isReadOnly]);

  const sortedAgenda = useMemo(() => {
    const list = [...processedAgenda];

    if (sortBy === 'assignee') {
      const getAssigneeStr = (item: AgendaItem) => {
        const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
        const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
        return [...uNames, ...gNames].join(', ');
      };

      list.sort((a, b) => {
        const strA = getAssigneeStr(a);
        const strB = getAssigneeStr(b);
        if (!strA && strB) return 1;
        if (strA && !strB) return -1;
        return strA.localeCompare(strB);
      });
    } else if (sortBy === 'dueDate') {
      list.sort((a, b) => {
        const dateA = a.dueDate || Number.MAX_SAFE_INTEGER;
        const dateB = b.dueDate || Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
    } else {
      list.sort((a, b) => {
        const idxA = a.protocolIndex !== undefined ? a.protocolIndex : a.originalIndex;
        const idxB = b.protocolIndex !== undefined ? b.protocolIndex : b.originalIndex; 
        return idxA - idxB;
      });
    }

    return list;
  }, [processedAgenda, sortBy, users, groups]);

  const finalSortedAgenda = useMemo(() => {
    let mainCounter = 0;
    let subCounter = 0;
    
    return sortedAgenda.map(item => {
      let displayIndexStr = '-';
      if (sortBy === 'default') {
        if (!item.isSubItem) {
          mainCounter++;
          subCounter = 0;
          displayIndexStr = `${mainCounter}.`;
        } else {
          subCounter++;
          displayIndexStr = mainCounter === 0 ? `0.${subCounter}` : `${mainCounter}.${subCounter}`;
        }
      }
      return { ...item, displayIndexStr };
    });
  }, [sortedAgenda, sortBy]);

  const mainLevelPositions = useMemo(() => {
    const options: { index: number, label: string }[] = [];
    finalSortedAgenda.forEach((item, idx) => {
      if (!item.isSubItem) {
        const labelStr = `${item.displayIndexStr} ${item.title || 'Neuer Punkt'}`;
        const truncatedLabel = labelStr.length > 60 ? labelStr.substring(0, 57) + '...' : labelStr;
        options.push({ index: idx, label: truncatedLabel });
      }
    });
    if (finalSortedAgenda.length > 0) {
      options.push({ index: finalSortedAgenda.length, label: 'Ende' });
    }
    return options;
  }, [finalSortedAgenda]);

  const subLevelPositions = useMemo(() => {
    const map: Record<string, { index: number, label: string }[]> = {};
    finalSortedAgenda.forEach((item, idx) => {
      if (item.isSubItem && item.parentItemId) {
        if (!map[item.parentItemId]) {
          map[item.parentItemId] = [];
        }
        const labelStr = `${item.displayIndexStr} ${item.title || 'Neuer Punkt'}`;
        const truncatedLabel = labelStr.length > 60 ? labelStr.substring(0, 57) + '...' : labelStr;
        map[item.parentItemId].push({ index: idx, label: truncatedLabel });
      }
    });
    return map;
  }, [finalSortedAgenda]);

  const selectedItem = useMemo(() => {
    return finalSortedAgenda.find(i => i.id === selectedItemId);
  }, [finalSortedAgenda, selectedItemId]);

  const toggleParent = (parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const toggleItemExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAllLevels = () => {
    const hasSubItems = eventAgenda.some(i => i.isSubItem);
    const itemsWithDesc = eventAgenda.filter(i => !!i.description);
    const hasDescriptions = itemsWithDesc.length > 0;

    if (!hasSubItems && !hasDescriptions) return; 

    if (hasSubItems && hasDescriptions) {
      const nextPhase = (cyclePhase + 1) % 4;
      setCyclePhase(nextPhase);

      const allParents = new Set(
        eventAgenda.filter(i => i.isSubItem && i.parentItemId).map(i => i.parentItemId as string)
      );

      if (nextPhase === 0) {
        setCollapsedParents(allParents);
        setExpandedIds(new Set());
      } else if (nextPhase === 1 || nextPhase === 3) {
        setCollapsedParents(new Set());
        setExpandedIds(new Set());
      } else if (nextPhase === 2) {
        setCollapsedParents(new Set());
        setExpandedIds(new Set(itemsWithDesc.map(i => i.id)));
      }
    } else if (hasSubItems && !hasDescriptions) {
      const nextPhase = (cyclePhase + 1) % 2;
      setCyclePhase(nextPhase);
      const allParents = new Set(
        eventAgenda.filter(i => i.isSubItem && i.parentItemId).map(i => i.parentItemId as string)
      );
      if (nextPhase === 0) setCollapsedParents(allParents);
      else setCollapsedParents(new Set());
    } else if (!hasSubItems && hasDescriptions) {
      const nextPhase = (cyclePhase + 1) % 2;
      setCyclePhase(nextPhase);
      if (nextPhase === 0) setExpandedIds(new Set());
      else setExpandedIds(new Set(itemsWithDesc.map(i => i.id)));
    }
  };

  const handleInsertBelow = async (baseItem: typeof finalSortedAgenda[0], mode: 'sibling' | 'subitem') => {
    const currentIndexInSorted = finalSortedAgenda.findIndex(i => i.id === baseItem.id);
    const nextItem = finalSortedAgenda[currentIndexInSorted + 1];
    
    let newProtocolIndex = 0;
    const baseIndex = baseItem.protocolIndex !== undefined ? baseItem.protocolIndex : baseItem.originalIndex || 0;
    
    if (nextItem) {
      const nextIndex = nextItem.protocolIndex !== undefined ? nextItem.protocolIndex : nextItem.originalIndex || (baseIndex + 1);
      newProtocolIndex = baseIndex + ((nextIndex - baseIndex) / 2);
    } else {
      newProtocolIndex = baseIndex + 1;
    }

    const isSub = mode === 'subitem' ? true : !!baseItem.isSubItem;
    const parentId = mode === 'subitem' 
      ? (baseItem.isSubItem ? baseItem.parentItemId : baseItem.id) 
      : (baseItem.parentItemId || undefined);

    const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newItem: Partial<AgendaItem> = {
      id: newId,
      eventId: eventId,
      type: baseItem.type, 
      title: '', 
      status: 'OFFEN',
      progress: 0,
      schemaVersion: '1.0',
      createdAt: Date.now(),
      protocolIndex: newProtocolIndex,
      isSubItem: isSub,
      assigneeUserIds: [],
      assigneeGroupIds: [],
      comments: [],
      checkliste: []
    };

    if (parentId) {
      newItem.parentItemId = parentId;
      if (collapsedParents.has(parentId)) toggleParent(parentId);
    } else {
      newItem.parentItemId = null as any; 
    }

    await saveAgendaItem(newItem as AgendaItem);
    if (eventId) fetchEventAgenda(eventId);
    
    setSelectedItemId(newId);
    onEditItem(newItem as AgendaItem);
  };

  const handleToggleSubItem = async (item: typeof finalSortedAgenda[0]) => {
    let newParentId: string | null = null;
    let isSub = !item.isSubItem;
    
    if (isSub) {
      const idx = finalSortedAgenda.findIndex(i => i.id === item.id);
      for (let i = idx - 1; i >= 0; i--) {
        if (!finalSortedAgenda[i].isSubItem) {
          newParentId = finalSortedAgenda[i].id;
          break;
        }
      }
    }
    
    const payload = { ...item, isSubItem: isSub };
    if (newParentId) {
      payload.parentItemId = newParentId;
    } else {
      payload.parentItemId = null as any; 
    }

    await saveAgendaItem(payload as AgendaItem);
    if (eventId) fetchEventAgenda(eventId);
  };

  const handleDeleteSelected = () => {
    if (!selectedItem) return;
    const { title, type, baseItemId, assigneeUserIds, assigneeGroupIds } = selectedItem;

    if (type === 'AUFGABE') {
      const isClone = !!baseItemId;
      const isAssigned = (assigneeUserIds && assigneeUserIds.length > 0) || (assigneeGroupIds && assigneeGroupIds.length > 0);
      
      if (isClone && !selectedItem.isSubItem) {
        window.alert(`Die vererbte Aufgabe "${title}" kann nicht gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
        return;
      }
      if (isAssigned && !selectedItem.isSubItem) {
        window.alert(`Die zugewiesene Aufgabe "${title}" kann nicht mehr gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
        return;
      }
    }
    
    if (window.confirm(`"${title || 'Diesen leeren Punkt'}" wirklich in den Papierkorb verschieben?`)) {
      saveAgendaItem({ ...selectedItem, status: 'TRASH', deletedAt: Date.now() });
      setSelectedItemId(null);
    }
  };

  return (
    {/* CHIRURGISCHER EINGRIFF: overflow-visible md:overflow-hidden erlaubt das Wachsen auf dem iPhone und behält den Split-Screen auf Desktop */}
    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-visible md:overflow-hidden landscape:h-auto landscape:overflow-visible landscape:border-none landscape:shadow-none lg:!h-full lg:!overflow-hidden lg:!border lg:!border-gray-200 lg:!shadow-sm lg:!rounded-xl print:!shadow-none print:!border-none print:!rounded-none print:!overflow-visible print:!block">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2 sticky top-0 z-30 landscape:bg-white landscape:py-2 lg:!bg-gray-50 lg:!py-4 print:!bg-transparent print:!border-b-2 print:!border-black print:!px-0 print:!pt-0">
        
        <div className="flex items-center">
          <h2 className="text-lg font-bold text-gray-800 print:!text-black">Agenda & Protokoll</h2>
          
          {!isReadOnly && selectedItem && (
            <div className="hidden md:flex items-center gap-1.5 border-l border-gray-300 pl-4 ml-4 animate-in fade-in slide-in-from-left-2">
              <span className="text-xs font-bold text-blue-800 mr-2 bg-blue-50 px-2 py-1 rounded truncate max-w-[150px] shadow-sm">
                {selectedItem.title || 'Neuer Punkt'}
              </span>
              
              <button onClick={() => toggleItemExpanded(selectedItem.id)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-gray-700 transition-colors" title="Notizen ein/ausblenden">
                <span className="font-mono font-bold leading-none">{expandedIds.has(selectedItem.id) ? '-' : '+'}</span>
              </button>
              
              <div className="h-5 w-px bg-gray-300 mx-1"></div>
              
              <button onClick={() => handleToggleSubItem(selectedItem)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-blue-600 transition-colors" title={selectedItem.isSubItem ? "Zum Hauptpunkt machen" : "Zum Unterpunkt machen"}>
                {selectedItem.isSubItem ? <ArrowLeftToLine className="w-4 h-4" /> : <ArrowRightToLine className="w-4 h-4" />}
              </button>
              {!selectedItem.isSubItem && (
                <button onClick={() => handleInsertBelow(selectedItem, 'subitem')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-blue-600 transition-colors" title="Neuen Unterpunkt hinzufügen">
                  <CornerDownRight className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => handleInsertBelow(selectedItem, 'sibling')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-emerald-600 transition-colors" title="Neuen Punkt darunter einfügen">
                <PlusCircle className="w-4 h-4" />
              </button>
              
              <div className="h-5 w-px bg-gray-300 mx-1"></div>
              
              <button onClick={() => onEditItem(selectedItem)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-blue-600 transition-colors" title="Details bearbeiten">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={handleDeleteSelected} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-red-50 text-red-500 transition-colors" title="Punkt in den Papierkorb">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 print:!hidden print:!absolute print:!w-0 print:!h-0">
          <div className="flex items-center bg-white border border-gray-300 rounded px-2 py-1 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-transparent text-gray-700 font-medium outline-none cursor-pointer"
            >
              <option value="default">Chronologisch (Standard)</option>
              <option value="assignee">Nach Verantwortlichen</option>
              <option value="dueDate">Nach Erledigungsdatum</option>
            </select>
          </div>

          <button onClick={handleToggleAllLevels} className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-700 font-mono font-bold text-lg rounded hover:bg-gray-300 transition-colors" title="Ebenen schrittweise ein-/ausblenden">+/-</button>
          
          {!isReadOnly && (
            <button onClick={onAddNewItem} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 text-sm">
              <Plus className="w-4 h-4 mr-1" />Freier Punkt
            </button>
          )}
        </div>
      </div>
      
      {/* CHIRURGISCHER EINGRIFF: overflow-visible md:overflow-y-auto zwingt Mobile zum Durchreichen der Höhe, sperrt aber den Scroll-Container für Desktop ein */}
      <div className="flex-1 overflow-visible md:overflow-y-auto landscape:overflow-visible bg-gray-50/10 p-4 lg:!overflow-y-auto print:!overflow-visible print:!p-0 print:!pt-4 print:!bg-white">
        {eventAgenda.length === 0 ? (
          <div className="text-center text-gray-400 py-10"><p>Die Agenda ist noch leer.</p></div>
        ) : (
          <>
            <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm print:!border-none print:!shadow-none print:!overflow-visible print:!block">
              {finalSortedAgenda.map((item, idx) => {
                
                if (item.isSubItem && item.parentItemId && collapsedParents.has(item.parentItemId)) {
                  return null;
                }

                const childCount = finalSortedAgenda.filter(child => child.parentItemId === item.id).length;

                return (
                  <AgendaItemRow
                    key={item.id} 
                    item={item}
                    index={idx}
                    positionOptions={item.isSubItem && item.parentItemId ? subLevelPositions[item.parentItemId] : mainLevelPositions} 
                    displayIndexStr={item.displayIndexStr} 
                    totalItems={eventAgenda.length} 
                    subItemCount={childCount}
                    isSubItemsCollapsed={collapsedParents.has(item.id)}
                    onToggleSubItems={() => toggleParent(item.id)}
                    startTimeStr={item.calculatedStartTimeStr} 
                    isExpanded={expandedIds.has(item.id)} 
                    onToggleExpand={toggleItemExpanded}
                    onMove={sortBy === 'default' ? moveAgendaItem : undefined}
                    onEdit={onEditItem}
                    onOpenHistory={onOpenHistory as any}
                    
                    isSelected={selectedItemId === item.id}
                    onSelect={() => setSelectedItemId(item.id)}

                    searchQuery={searchQuery} 

                    onDelete={(id, title) => {
                      if (item.type === 'AUFGABE') {
                        const isClone = !!item.baseItemId;
                        const isAssigned = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
                        
                        if (isClone && !item.isSubItem) { 
                          window.alert(`Die vererbte Aufgabe "${title}" kann nicht gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`); 
                          return; 
                        }
                        if (isAssigned && !item.isSubItem) { 
                          window.alert(`Die zugewiesene Aufgabe "${title}" kann nicht mehr gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`); 
                          return; 
                        }
                      }
                      if (window.confirm(`"${title || 'Diesen leeren Punkt'}" wirklich in den Papierkorb verschieben?`)) {
                        saveAgendaItem({ ...item, status: 'TRASH', deletedAt: Date.now() });
                        if (selectedItemId === id) setSelectedItemId(null);
                      }
                    }}
                    
                    onInsertBelow={!isReadOnly && sortBy === 'default' ? (mode) => handleInsertBelow(item, mode) : undefined}
                    onToggleSubItem={!isReadOnly && sortBy === 'default' ? () => handleToggleSubItem(item) : undefined}
                    
                    effectiveDuration={item.effectiveDuration}
                    onDurationPreview={(val) => onDurationPreview(item.id, val)}
                    onSaveInline={async (updatedItem) => {
                      await saveAgendaItem(updatedItem);
                      onClearPreview(item.id);
                      if (eventId) fetchEventAgenda(eventId);
                    }}
                    isReadOnly={isReadOnly}
                    isOvertime={item.calculatedIsOvertime}
                    showMinimalDesktopActions={true} 
                  />
                );
              })}
            </div>

            {!isReadOnly && currentEvent.status === 'AKTIV' && (
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm landscape:mb-20 lg:!mb-0 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
                <div>
                  <h3 className="text-lg font-bold text-blue-900 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-700" />
                    Sitzung abschließen & Nächste Sitzung planen
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">Protokoll wird versiegelt, offene Aufgaben & Routinen werden ins neue Meeting übernommen.</p>
                </div>
                <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
                  <button onClick={onPlanNextMeeting} className="px-5 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap">Nächste Sitzung planen</button>
                  <button onClick={onFinishEvent} className="text-xs text-blue-600 hover:underline mt-3">Projekt abschließen (Kein Folgetermin)</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---