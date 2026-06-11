// 2026-04-24 22:00 - FEATURE: Speichert nun 'isTemplate: true', um beliebige Typen (Aufgabe, Info) in Vorlagen zu halten
// 2026-04-25 08:00 - BUGFIX: 'Block-Move' implementiert - Verschieben eines Hauptpunktes nimmt nun alle Unterpunkte mit
// 2026-05-09 11:55 - FEATURE: Intelligenter 4-Phasen +/- Button für Vorlagen übernommen
// 2026-05-09 12:15 - UX-FIX: +/- Button nutzt dynamisch 2-Phasen oder 4-Phasen Zyklus, je nachdem ob Unterpunkte existieren
// 2026-05-09 13:00 - UX-FIX: +/- Chamäleon-Logik erkennt nun auch, wenn nur Unterpunkte, aber keine Texte existieren.
// 2026-05-09 13:15 - FEATURE: Master-Toolbar für Desktop (inkl. Row-Selection State) analog zur Agenda in die Vorlagen integriert.
// 2026-05-11 14:45 - BUGFIX: positionOptions auf das neue Objekt-Array-Interface {index, label} aktualisiert, um Build-Error (TS2322) zu beheben und Split-Moves zu verhindern.
// 2026-05-11 14:50 - UX-FEATURE: "Neuen Punkt darunter einfügen" öffnet nun auch hier nach dem Einfügen sofort automatisch das Modal.
// 2026-05-13 20:30 - CHIRURGISCHER EINGRIFF: Soft-Delete (TRASH) & Geister-Filter auf korrekter Code-Basis implementiert.
// src/features/Templates/TemplatesView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Plus, ArrowLeftToLine, ArrowRightToLine, CornerDownRight, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import type { AgendaItem } from '../../core/types/models';

export const TemplatesView: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: deleteAgendaItem entfernt, da wir saveAgendaItem für Soft-Delete nutzen
  const { templates, fetchTemplatesAndRoutines, isTemplatesLoading, saveAgendaItem } = useClubStore();
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  
  const [returnToTask, setReturnToTask] = useState<AgendaItem | null>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
  
  const [cyclePhase, setCyclePhase] = useState(1);
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplatesAndRoutines();
  }, [fetchTemplatesAndRoutines]);

  const handleCreateTemplate = () => {
    setEditingItem(null);
    setReturnToTask(null);
    setIsItemModalOpen(true);
  };

  // CHIRURGISCHER EINGRIFF: Soft-Delete (TRASH) implementiert
  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Möchtest du die Vorlage "${title || 'Diesen leeren Punkt'}" wirklich in den Papierkorb verschieben?`)) {
      const itemToDelete = templates.find(t => t.id === id);
      if (itemToDelete) {
        await saveAgendaItem({ ...itemToDelete, status: 'TRASH', deletedAt: Date.now() });
      }
      if (selectedItemId === id) setSelectedItemId(null);
    }
  };

  const handleToggleAllLevels = () => {
    // CHIRURGISCHER EINGRIFF: Ignoriert TRASH-Elemente für die Toggle-Logik
    const activeTemplates = templates.filter(t => t.status !== 'TRASH');
    const hasSubItems = activeTemplates.some(i => i.isSubItem);
    const itemsWithDesc = activeTemplates.filter(i => !!i.description);
    const hasDescriptions = itemsWithDesc.length > 0;

    if (!hasSubItems && !hasDescriptions) return; 

    if (hasSubItems && hasDescriptions) {
      const nextPhase = (cyclePhase + 1) % 4;
      setCyclePhase(nextPhase);

      const allParents = new Set(
        activeTemplates.filter(i => i.isSubItem && i.parentItemId).map(i => i.parentItemId as string)
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
        activeTemplates.filter(i => i.isSubItem && i.parentItemId).map(i => i.parentItemId as string)
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

  const toggleItemExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedIds(next);
  };

  const toggleParent = (parentId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const finalSortedTemplates = useMemo(() => {
    // CHIRURGISCHER EINGRIFF: TRASH-Elemente und "Geister-Unterpunkte" radikal herausgefiltert
    const activeTemplates = templates.filter(t => t.status !== 'TRASH');
    const parents = activeTemplates.filter(t => !t.isSubItem).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const result: (AgendaItem & { displayIndexStr: string })[] = [];
    let mainCounter = 0;

    parents.forEach(p => {
      mainCounter++;
      result.push({ ...p, displayIndexStr: `${mainCounter}.` });
      
      // Nur Unterpunkte suchen, deren Elternpunkt auch existiert (keine Orphans)
      const children = activeTemplates.filter(t => t.isSubItem && t.parentItemId === p.id).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      let subCounter = 0;
      children.forEach(c => {
        subCounter++;
        result.push({ ...c, displayIndexStr: `${mainCounter}.${subCounter}` });
      });
    });
    return result;
  }, [templates]);

  const positionOptions = useMemo(() => {
    const options: { index: number, label: string }[] = [];
    finalSortedTemplates.forEach((item, idx) => {
      if (!item.isSubItem) {
        options.push({ index: idx, label: item.displayIndexStr });
      }
    });
    if (finalSortedTemplates.length > 0) {
      options.push({ index: finalSortedTemplates.length, label: 'Ende' });
    }
    return options;
  }, [finalSortedTemplates]);

  const selectedItem = useMemo(() => {
    return finalSortedTemplates.find(i => i.id === selectedItemId);
  }, [finalSortedTemplates, selectedItemId]);

  const handleMove = async (id: string, newIdx: number) => {
    const oldIdx = finalSortedTemplates.findIndex(t => t.id === id);
    if (oldIdx < 0 || oldIdx === newIdx) return;

    const itemToMove = finalSortedTemplates[oldIdx];
    const targetItemOld = finalSortedTemplates[newIdx];

    let blockIds = [itemToMove.id];
    if (!itemToMove.isSubItem) {
      const children = finalSortedTemplates.filter(i => i.isSubItem && i.parentItemId === itemToMove.id);
      blockIds = [...blockIds, ...children.map(c => c.id)];
    }

    const blockToMove = finalSortedTemplates.filter(i => blockIds.includes(i.id));
    const remaining = finalSortedTemplates.filter(i => !blockIds.includes(i.id));

    let insertIndex = remaining.length;
    if (targetItemOld) {
      if (blockIds.includes(targetItemOld.id)) return;

      const targetIndexInRemaining = remaining.findIndex(i => i.id === targetItemOld.id);
      if (targetIndexInRemaining !== -1) {
        if (newIdx > oldIdx && !targetItemOld.isSubItem) {
          let lastChildIdx = targetIndexInRemaining;
          for (let i = targetIndexInRemaining + 1; i < remaining.length; i++) {
            if (remaining[i].isSubItem && remaining[i].parentItemId === targetItemOld.id) {
              lastChildIdx = i;
            } else {
              break;
            }
          }
          insertIndex = lastChildIdx + 1;
        } else if (newIdx > oldIdx && targetItemOld.isSubItem) {
          insertIndex = targetIndexInRemaining + 1;
        } else {
          insertIndex = targetIndexInRemaining;
        }
      }
    }

    remaining.splice(insertIndex, 0, ...blockToMove);

    const baseTime = Date.now();
    const promises = remaining.map((item, idx) => {
      return saveAgendaItem({ ...item, createdAt: baseTime + (idx * 1000) });
    });
    
    await Promise.all(promises);
    fetchTemplatesAndRoutines();
  };

  const handleInsertBelow = async (baseItem: AgendaItem, mode: 'sibling' | 'subitem') => {
    const currentIndex = finalSortedTemplates.findIndex(i => i.id === baseItem.id);
    const nextItem = finalSortedTemplates[currentIndex + 1];

    let newCreatedAt = Date.now();
    if (nextItem && baseItem.createdAt && nextItem.createdAt) {
      newCreatedAt = baseItem.createdAt + (nextItem.createdAt - baseItem.createdAt) / 2;
    } else if (baseItem.createdAt) {
      newCreatedAt = baseItem.createdAt + 1000;
    }

    const isSub = mode === 'subitem' ? true : !!baseItem.isSubItem;
    const parentId = mode === 'subitem' 
      ? (baseItem.isSubItem ? baseItem.parentItemId : baseItem.id) 
      : (baseItem.parentItemId || undefined);

    const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newItem: Partial<AgendaItem> = {
      id: newId,
      type: baseItem.type,
      title: '', 
      status: 'OFFEN',
      progress: 0,
      schemaVersion: '1.0',
      createdAt: newCreatedAt,
      isSubItem: isSub,
      isTemplate: true,
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
    fetchTemplatesAndRoutines();
    
    setEditingItem(newItem as AgendaItem);
    setIsItemModalOpen(true);
  };

  const handleToggleSubItem = async (item: AgendaItem) => {
    let newParentId: string | null = null;
    let isSub = !item.isSubItem;
    
    if (isSub) {
      const idx = finalSortedTemplates.findIndex(i => i.id === item.id);
      for (let i = idx - 1; i >= 0; i--) {
        if (!finalSortedTemplates[i].isSubItem) {
          newParentId = finalSortedTemplates[i].id;
          break;
        }
      }
    }
    
    await saveAgendaItem({ ...item, isSubItem: isSub, parentItemId: newParentId || null as any });
    fetchTemplatesAndRoutines();
  };

  const editingParentTask = editingItem?.parentItemId ? templates.find(t => t.id === editingItem.parentItemId) : undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        
        <div className="flex flex-col md:flex-row md:items-center mb-4 md:mb-0">
          <h1 className="text-2xl font-bold text-gray-900">Alle Vorlagen & Bausteine</h1>
          
          {selectedItem && (
            <div className="hidden md:flex items-center gap-1.5 border-l border-gray-300 pl-4 ml-4 animate-in fade-in slide-in-from-left-2 mt-2 md:mt-0">
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
              
              <button onClick={() => { setEditingItem(selectedItem); setIsItemModalOpen(true); }} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-gray-50 text-blue-600 transition-colors" title="Details bearbeiten">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(selectedItem.id, selectedItem.title)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded hover:bg-red-50 text-red-500 transition-colors" title="In den Papierkorb verschieben">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleToggleAllLevels} className="flex items-center justify-center w-10 h-10 bg-white text-gray-700 border border-gray-300 font-mono font-bold text-lg rounded-lg hover:bg-gray-50 shadow-sm transition-colors" title="Ebenen schrittweise ein-/ausblenden">
            +/-
          </button>
          <button onClick={handleCreateTemplate} className="flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition">
            <Plus className="w-5 h-5 mr-2" />
            Neue Vorlage anlegen
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl shadow-inner border border-gray-200 flex-1 overflow-hidden flex flex-col p-4">
        {isTemplatesLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Lade Daten...</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {finalSortedTemplates.length === 0 && <div className="p-8 text-center text-gray-500">Noch keine Vorlagen vorhanden.</div>}
            
            {finalSortedTemplates.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm">
                {finalSortedTemplates.map((t, index) => {
                  if (t.isSubItem && t.parentItemId && collapsedParents.has(t.parentItemId)) return null;

                  const childCount = finalSortedTemplates.filter(child => child.parentItemId === t.id).length;

                  return (
                    <AgendaItemRow 
                      key={t.id} 
                      item={t} 
                      index={index}
                      positionOptions={positionOptions}
                      displayIndexStr={t.displayIndexStr}
                      totalItems={finalSortedTemplates.length}
                      subItemCount={childCount}
                      isSubItemsCollapsed={collapsedParents.has(t.id)}
                      onToggleSubItems={() => toggleParent(t.id)}
                      isExpanded={expandedIds.has(t.id)}
                      onToggleExpand={toggleItemExpanded}
                      onMove={handleMove}
                      onEdit={(item) => { setEditingItem(item); setIsItemModalOpen(true); }} 
                      onDelete={handleDelete} 
                      onInsertBelow={(mode) => handleInsertBelow(t, mode)}
                      onToggleSubItem={() => handleToggleSubItem(t)}
                      onSaveInline={async (updatedItem) => {
                        await saveAgendaItem(updatedItem);
                        fetchTemplatesAndRoutines();
                      }}
                      isTemplateMode={true}
                      isSelected={selectedItemId === t.id}
                      onSelect={() => setSelectedItemId(t.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isItemModalOpen && (
        <ItemFormModal 
          key={editingItem ? editingItem.id : 'new'}
          isOpen={isItemModalOpen} 
          existingItem={editingItem || { type: 'VORLAGE' }}
          parentItemContext={editingParentTask}
          
          onNavigateToParent={() => {
            if (editingParentTask) {
               setReturnToTask(editingItem);
               setEditingItem(editingParentTask);
            }
          }}
          returnItemContext={returnToTask || undefined}
          onNavigateBack={() => {
            if (returnToTask) {
               setEditingItem(returnToTask);
               setReturnToTask(null);
            }
          }}
          
          isFixedType={false}
          
          onClose={() => { 
            setIsItemModalOpen(false); 
            setEditingItem(null);
            setReturnToTask(null);
          }} 
          onSave={async (data) => { 
            const payload = { ...data, isTemplate: true };
            if (!editingItem) {
              payload.createdAt = Date.now();
            }
            const result = await saveAgendaItem(payload);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            await fetchTemplatesAndRoutines(); 
            setIsItemModalOpen(false); 
            setEditingItem(null);
            setReturnToTask(null);
          }} 
        />
      )}
    </div>
  );
};
// --- END OF FILE ---