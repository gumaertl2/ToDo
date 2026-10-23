// [2026-10-23] - RECHTE & PAPIERKORB-FIX: Exklusives Admin-Löschrecht (roleProfileId === 'pro-admin') für alle unerledigten (<100%), zugewiesenen oder vererbten Aufgaben durchgesetzt + Nutzung von moveToTrash (inkl. Unterpunkt-Kaskade & deletedBy-Stempel).
// [2026-10-23] - UX-UPGRADE: Automatische Aufklapp-, Scroll- und Fokus-Automatik für unzugewiesene Aufgaben (validationErrorIds) integriert, rekursive Hierarchie-Auflösung für verschachtelte Unterpunkte ergänzt und Schutz gegen das Einrücken von Hauptpunkten mit eigenen Unterpunkten eingebaut.
// [2026-10-19] - UX-FIX: Fokus-Steuerung beim Ein-/Ausklappen von Unterpunkten gehärtet. Wird ein Hauptpunkt eingeklappt, während der Fokus auf einem seiner Unterpunkte (z. B. 2.2) lag, wandert der Fokus automatisch auf den Hauptpunkt (2.).
// [2026-10-19] - ARCHITEKTUR-FIX: Selbstheilende Hierarchie-Sortierung in EventAgendaList integriert (Unterpunkte werden im Standardmodus automatisch fest unter ihrem jeweiligen Oberpunkt gruppiert, sodass Indizes-Konflikte keine Unterpunkte mehr abtrennen können) + Uhrzeit-Anzeige auf 24h-Format ('de-DE') mit 19:00-Fallback bei 00:00-Startzeit korrigiert.
// [2026-06-11] - BUGFIX: JSX Parse Error behoben. Den falsch platzierten JSX-Kommentar direkt nach dem return() in einen sauberen TS-Kommentar VOR das return Statement verschoben.
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
  validationErrorIds?: string[];
  onAddNewItem: () => void;
  onEditItem: (item: AgendaItem) => void;
  onOpenHistory: (item: Task) => void;
  onPlanNextMeeting: () => void;
  onFinishEvent: () => void;
  onDurationPreview: (id: string, val: number) => void;
  onClearPreview: (id: string) => void;
}

export const EventAgendaList: React.FC<EventAgendaListProps> = ({
  eventId, currentEvent, eventAgenda, isReadOnly, tempDurations, searchQuery, validationErrorIds = [],
  onAddNewItem, onEditItem, onOpenHistory,
  onPlanNextMeeting, onFinishEvent, onDurationPreview, onClearPreview
}) => {
  const { moveAgendaItem, saveAgendaItem, moveToTrash, fetchEventAgenda, user, users, groups } = useClubStore();
  const isAdmin = user?.roleProfileId === 'pro-admin';
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

  const finalSortedAgenda = useMemo(() => {
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

    const compareByOrder = (a: AgendaItem, b: AgendaItem) => {
      const idxA = a.protocolIndex !== undefined ? a.protocolIndex : (a.createdAt || 0);
      const idxB = b.protocolIndex !== undefined ? b.protocolIndex : (b.createdAt || 0);
      if (idxA !== idxB) return idxA - idxB;
      return (a.createdAt || 0) - (b.createdAt || 0);
    };

    let orderedList: AgendaItem[] = [];

    if (sortBy === 'assignee') {
      const getAssigneeStr = (item: AgendaItem) => {
        const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
        const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
        return [...uNames, ...gNames].join(', ');
      };

      orderedList = [...visibleAgenda].sort((a, b) => {
        const strA = getAssigneeStr(a);
        const strB = getAssigneeStr(b);
        if (!strA && strB) return 1;
        if (strA && !strB) return -1;
        return strA.localeCompare(strB);
      });
    } else if (sortBy === 'dueDate') {
      orderedList = [...visibleAgenda].sort((a, b) => {
        const dateA = a.dueDate || Number.MAX_SAFE_INTEGER;
        const dateB = b.dueDate || Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      });
    } else {
      // SELBSTHEILENDE HIERARCHIE-SORTIERUNG (inkl. rekursiver Unterpunkt-Auflösung):
      const placedIds = new Set<string>();
      const appendWithChildren = (parent: AgendaItem) => {
        if (placedIds.has(parent.id)) return;
        placedIds.add(parent.id);
        orderedList.push(parent);
        const children = visibleAgenda
          .filter(i => i.isSubItem && i.parentItemId === parent.id)
          .sort(compareByOrder);
        children.forEach(child => appendWithChildren(child));
      };

      const parents = visibleAgenda.filter(i => !i.isSubItem).sort(compareByOrder);
      parents.forEach(parent => appendWithChildren(parent));

      // Falls es Unterpunkte ohne sichtbaren Oberpunkt gibt (z. B. bei aktiver Volltextsuche), nichts verschlucken
      const orphans = visibleAgenda
        .filter(i => !placedIds.has(i.id))
        .sort(compareByOrder);
      orphans.forEach(orphan => appendWithChildren(orphan));
    }

    // Startzeit-Kalkulation (Wenn keine Uhrzeit angegeben wurde -> 00:00 Uhr, starten wir ab 19:00 Uhr im 24h-Format)
    let runningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);
    if (currentEvent.plannedStartTime) {
      const startD = new Date(currentEvent.plannedStartTime);
      if (startD.getHours() === 0 && startD.getMinutes() === 0) {
        const fallbackD = new Date(currentEvent.plannedStartTime);
        fallbackD.setHours(19, 0, 0, 0);
        runningTime = fallbackD.getTime();
      }
    }

    let mainCounter = 0;
    let subCounter = 0;

    return orderedList.map((item, index) => {
      const baseEstimate = item.durationEstimate || 0;
      const effectiveDuration = tempDurations[item.id] !== undefined ? tempDurations[item.id] : baseEstimate;

      const startTimeStr = new Date(runningTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const isOvertime = currentEvent.plannedEndTime ? runningTime > currentEvent.plannedEndTime : false;

      runningTime += effectiveDuration * 60000;

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

      return {
        ...item,
        originalIndex: index,
        calculatedStartTimeStr: startTimeStr,
        calculatedIsOvertime: isOvertime,
        effectiveDuration,
        displayIndexStr
      };
    });
  }, [eventAgenda, tempDurations, currentEvent.plannedStartTime, currentEvent.plannedEndTime, isReadOnly, sortBy, users, groups]);

  // Wenn ein Oberpunkt eingeklappt wird, während der Fokus auf einem seiner Unterpunkte (z. B. 2.2) lag,
  // wandert der Fokus automatisch auf den sichtbaren Oberpunkt (2.).
  useEffect(() => {
    if (!selectedItemId) return;
    const currentSelected = finalSortedAgenda.find(i => i.id === selectedItemId);
    if (currentSelected?.isSubItem && currentSelected.parentItemId && collapsedParents.has(currentSelected.parentItemId)) {
      setSelectedItemId(currentSelected.parentItemId);
    }
  }, [collapsedParents, selectedItemId, finalSortedAgenda]);

  // Wenn Validierungsfehler beim Sitzungsabschluss auftreten:
  // 1. Alle übergeordneten Punkte der fehlerhaften Aufgaben automatisch aufklappen
  // 2. Den ersten fehlerhaften Punkt fokussieren und direkt ins Sichtfeld scrollen
  useEffect(() => {
    if (!validationErrorIds || validationErrorIds.length === 0) return;

    setCollapsedParents(prev => {
      const next = new Set(prev);
      validationErrorIds.forEach(errId => {
        let curr = eventAgenda.find(i => i.id === errId);
        const visited = new Set<string>();
        while (curr?.isSubItem && curr.parentItemId && !visited.has(curr.parentItemId)) {
          next.delete(curr.parentItemId);
          visited.add(curr.parentItemId);
          curr = eventAgenda.find(i => i.id === curr?.parentItemId);
        }
      });
      return next;
    });

    const firstId = validationErrorIds[0];
    setSelectedItemId(firstId);
    setTimeout(() => {
      const el = document.getElementById(`agenda-item-${firstId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }, [validationErrorIds, eventAgenda]);

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
    const isSub = mode === 'subitem' ? true : !!baseItem.isSubItem;
    const parentId = mode === 'subitem' 
      ? (baseItem.isSubItem ? baseItem.parentItemId : baseItem.id) 
      : (baseItem.parentItemId || undefined);

    // Berechne den echten Einfügepunkt innerhalb der gleichen Hierarchie-Ebene
    let anchorItem = baseItem;
    if (!isSub && !baseItem.isSubItem) {
      // Wenn unter einem Hauptpunkt ein neuer Hauptpunkt eingefügt wird, muss er hinter den Kindern des aktuellen Hauptpunkts landen
      const childrenOfBase = finalSortedAgenda.filter(i => i.isSubItem && i.parentItemId === baseItem.id);
      if (childrenOfBase.length > 0) {
        anchorItem = childrenOfBase[childrenOfBase.length - 1];
      }
    }

    const currentIndexInSorted = finalSortedAgenda.findIndex(i => i.id === anchorItem.id);
    const nextItem = finalSortedAgenda[currentIndexInSorted + 1];
    
    let newProtocolIndex = 0;
    const baseIndex = anchorItem.protocolIndex !== undefined ? anchorItem.protocolIndex : anchorItem.originalIndex || 0;
    
    if (nextItem) {
      const nextIndex = nextItem.protocolIndex !== undefined ? nextItem.protocolIndex : nextItem.originalIndex || (baseIndex + 1);
      newProtocolIndex = nextIndex > baseIndex ? baseIndex + ((nextIndex - baseIndex) / 2) : baseIndex + 0.5;
    } else {
      newProtocolIndex = baseIndex + 1;
    }

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
    const isSub = !item.isSubItem;
    
    if (isSub) {
      const hasOwnChildren = finalSortedAgenda.some(c => c.isSubItem && c.parentItemId === item.id);
      if (hasOwnChildren) {
        window.alert('Dieser Hauptpunkt besitzt bereits eigene Unterpunkte und kann daher nicht selbst als Unterpunkt eingerückt werden.');
        return;
      }

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
      if (collapsedParents.has(newParentId)) toggleParent(newParentId);
    } else {
      payload.parentItemId = null as any; 
    }

    await saveAgendaItem(payload as AgendaItem);
    if (eventId) fetchEventAgenda(eventId);
  };

  const handleDeleteSelected = async () => {
    if (!selectedItem) return;
    const { title, type, baseItemId, assigneeUserIds, assigneeGroupIds, progress, status } = selectedItem;

    if (type === 'AUFGABE' && !isAdmin) {
      const isClone = !!baseItemId;
      const isAssigned = (assigneeUserIds && assigneeUserIds.length > 0) || (assigneeGroupIds && assigneeGroupIds.length > 0);
      const isFinished = progress === 100 || status === 'ERLEDIGT';
      
      if (!isFinished) {
        window.alert(`Die unerledigte Aufgabe "${title || 'Dieser Punkt'}" kann nicht gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
        return;
      }
      if (isClone && !selectedItem.isSubItem) {
        window.alert(`Die vererbte Aufgabe "${title}" kann nicht gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
        return;
      }
      if (isAssigned && !selectedItem.isSubItem) {
        window.alert(`Die zugewiesene Aufgabe "${title}" kann nicht mehr gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
        return;
      }
    }
    
    if (window.confirm(`"${title || 'Diesen leeren Punkt'}" wirklich in den Papierkorb verschieben?`)) {
      await moveToTrash(selectedItem.id);
      setSelectedItemId(null);
      if (eventId) fetchEventAgenda(eventId);
    }
  };

  // CHIRURGISCHER EINGRIFF: overflow-visible md:overflow-hidden erlaubt das Wachsen auf dem iPhone und behält den Split-Screen auf Desktop
  return (
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
                
                // Prüft auch mehrstufige Eltern-Ketten (falls ein Unterpunkt selbst Unterpunkte hat)
                let ancestorId = item.isSubItem ? item.parentItemId : undefined;
                const visitedAncestors = new Set<string>();
                while (ancestorId && !visitedAncestors.has(ancestorId)) {
                  if (collapsedParents.has(ancestorId)) return null;
                  visitedAncestors.add(ancestorId);
                  const ancestorObj = finalSortedAgenda.find(x => x.id === ancestorId);
                  ancestorId = ancestorObj?.isSubItem ? ancestorObj.parentItemId : undefined;
                }

                const childCount = finalSortedAgenda.filter(child => child.parentItemId === item.id).length;
                const hasAssignee = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
                const isItemInvalid = validationErrorIds.includes(item.id) && !hasAssignee && item.status !== 'ERLEDIGT' && item.progress !== 100;

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
                    onToggleSubItems={() => { setSelectedItemId(item.id); toggleParent(item.id); }}
                    startTimeStr={item.calculatedStartTimeStr} 
                    isExpanded={expandedIds.has(item.id)} 
                    onToggleExpand={toggleItemExpanded}
                    onMove={sortBy === 'default' ? moveAgendaItem : undefined}
                    onEdit={onEditItem}
                    onOpenHistory={onOpenHistory as any}
                    
                    isSelected={selectedItemId === item.id}
                    onSelect={() => setSelectedItemId(item.id)}
                    hasValidationError={isItemInvalid}

                    searchQuery={searchQuery} 

                    onDelete={async (id, title) => {
                      if (item.type === 'AUFGABE' && !isAdmin) {
                        const isClone = !!item.baseItemId;
                        const isAssigned = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0);
                        const isFinished = item.progress === 100 || item.status === 'ERLEDIGT';
                        
                        if (!isFinished) {
                          window.alert(`Die unerledigte Aufgabe "${title || 'Dieser Punkt'}" kann nicht gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`);
                          return;
                        }
                        if (isClone && !item.isSubItem) { 
                          window.alert(`Die vererbte Aufgabe "${title}" kann nicht gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`); 
                          return; 
                        }
                        if (isAssigned && !item.isSubItem) { 
                          window.alert(`Die zugewiesene Aufgabe "${title}" kann nicht mehr gelöscht werden (nur durch den Administrator möglich).\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn sie beendet ist.`); 
                          return; 
                        }
                      }
                      if (window.confirm(`"${title || 'Diesen leeren Punkt'}" wirklich in den Papierkorb verschieben?`)) {
                        await moveToTrash(id);
                        if (selectedItemId === id) setSelectedItemId(null);
                        if (eventId) fetchEventAgenda(eventId);
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