// [2026-10-26] - UX-FEATURE: Callback onExtractSubItem durchgereicht an RichTextEditor, damit markierte Notizabschnitte oder Aufzählungspunkte direkt als Unterpunkte ausgelagert werden können.
// [2026-10-25] - UX-FIX: Kein Ansichten-Sprung und kein Verlust der Textmarkierung mehr in den Notizen. Im aufgeklappten Zustand wird direkt der RichTextEditor gerendert (inkl. "Notiztext leeren" & "Undo"); beim Verlassen (onBlur) klappt ein leeres Notizfeld automatisch wieder ein.
// [2026-10-23] - UX-UPGRADE: Durchgehende "Familien-Klammer" in Warm-Amber (Gold-Orange) für Oberpunkte und ihre Unterpunkte (6. -> 6.1 -> 6.2). Blau bleibt exklusiv für den Zeilen-Fokus reserviert; doppelter Mittelstrich nach der Uhrzeit entfernt und durch eine durchgehende Baum-Leitlinie links ersetzt.
// [2026-10-23] - UX-UPGRADE: Validierungs-Hervorhebung (hasValidationError) für unzugewiesene Aufgaben beim Sitzungsabschluss integriert (roter Rahmen + direkt klickbares Warn-Badge).
// [2026-10-19] - UX-UPGRADE: Sofortiger Zeilen-Fokus via onClickCapture (verhindert hängenbleibenden Fokus durch stopPropagation in Kind-Elementen) sowie deutliche farbliche und strukturelle Abhebung von Unterpunkten (Indigo/Slate-Hierarchie) und aktiver Auswahl.
// [2026-06-12] - UX-REFACTOR: Time-Badges (Heatmap) in die linke Gliederungsspalte verschoben und strikt linksbündig ausgerichtet. Verhindert optisches "Flattern" der Textlängen und räumt den Platz neben dem Titel auf.
// [2026-06-12] - BUGFIX: 'isTemplateMode' aus dem Schutzschild der Heatmap (getTimeCategory) entfernt. Die TasksListView nutzt diesen Modus für das Layout, was fälschlicherweise die Farben blockiert hatte.
// [2026-06-12] - BUGFIX: Heatmap und Time-Badges durch 'showTimeCategory'-Prop gekapselt.
// [2026-06-12] - UX-UPGRADE: "Heatmap" (Farbiger linker Rand) & "Time-Badges" ([in X T]) integriert.
// src/features/Shared/AgendaItemRow.tsx
import React, { useState, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { 
  ChevronRight, ChevronDown, AlignLeft
} from 'lucide-react';
import type { AgendaItem } from '../../core/types/models';
import { RichTextEditor, RichTextRenderer } from './RichText';

// Neue Sub-Komponenten & Utilities
import { DurationPickerPopup } from './components/AgendaItem/InlineEditors';
import { RowContextMenu } from './components/AgendaItem/RowContextMenu';
import { ItemMetadata } from './components/AgendaItem/ItemMetadata';
import { ItemStatusSection } from './components/AgendaItem/ItemStatusSection';
import { highlightText } from './utils/textUtils';

// Hilfsfunktionen (für Props-Mapping beibehalten)
const getDueDateColor = (item: AgendaItem) => {
  if (item.type !== 'AUFGABE') return 'text-gray-600';
  if (item.status === 'ERLEDIGT' || item.progress === 100) return 'text-green-600 font-bold';
  if (item.isDueNextMeeting) return 'text-purple-600 font-bold';
  if (!item.dueDate) return 'text-gray-500';
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = new Date(item.dueDate); due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return 'text-red-600 font-bold';
  if (diffDays <= 14) return 'text-orange-500 font-bold';
  return 'text-gray-600';
};

const getRoutineText = (item: AgendaItem) => {
  if (!item.isRoutine || !item.routinePattern) return '';
  const pMap: any = { 
    every_meeting: 'Bei jeder Sitzung', weekly: 'Wöchentlich', monthly: 'Monatlich', 
    quarterly: 'Quartalsweise', half_yearly: 'Halbjährlich', yearly: 'Jährlich' 
  };
  const pText = pMap[item.routinePattern] || item.routinePattern;
  const eText = item.routineEndDate ? `bis ${new Date(item.routineEndDate).toLocaleDateString()}` : 'ohne Ende';
  return `${pText}, ${eText}`;
};

interface AgendaItemRowProps {
  item: AgendaItem; 
  index?: number; 
  displayIndexStr?: string; 
  positionOptions?: { index: number, label: string }[]; 
  totalItems?: number; 
  subItemCount?: number; 
  isSubItemsCollapsed?: boolean; 
  onToggleSubItems?: () => void; 
  startTimeStr?: string; 
  isExpanded: boolean; 
  onToggleExpand: (id: string) => void; 
  onMove?: (id: string, newIdx: number) => void; 
  onEdit: (item: AgendaItem) => void; 
  onOpenHistory?: (item: AgendaItem) => void; 
  onDelete: (id: string, title: string) => void; 
  
  onRestoreFromTrash?: () => void;
  onPermanentDelete?: () => void;
  canDeleteAnyItem?: boolean;

  onSaveInline: (item: AgendaItem) => void; 
  onInsertBelow?: (mode: 'sibling' | 'subitem') => void; 
  onToggleSubItem?: () => void; 
  onExtractSubItem?: (sourceItem: AgendaItem, extractedText: string, remainingMarkdown: string) => void;
  parentContextTitle?: string; 
  isTemplateMode?: boolean; 
  isReadOnly?: boolean; 
  isOvertime?: boolean; 
  effectiveDuration?: number; 
  onDurationPreview?: (val: number) => void; 
  isSelected?: boolean; 
  onSelect?: () => void; 
  searchQuery?: string;
  showMinimalDesktopActions?: boolean; 
  showTimeCategory?: boolean;
  hasValidationError?: boolean;
}

export const AgendaItemRow: React.FC<AgendaItemRowProps> = ({ 
  item, index, displayIndexStr, positionOptions, totalItems, subItemCount, isSubItemsCollapsed, 
  onToggleSubItems, startTimeStr, isExpanded, onToggleExpand, onMove, onEdit, onOpenHistory, 
  onDelete, onRestoreFromTrash, onPermanentDelete, canDeleteAnyItem, onSaveInline, onInsertBelow, onToggleSubItem, onExtractSubItem, parentContextTitle, isTemplateMode = false, 
  isReadOnly = false, isOvertime = false, effectiveDuration, onDurationPreview, isSelected, onSelect,
  searchQuery, showMinimalDesktopActions = false, showTimeCategory = false, hasValidationError = false
}) => {
  const { users, groups, allAgendaItems } = useClubStore();
  
  const hasDescription = !!item.description;
  const [editField, setEditField] = useState<'title' | 'description' | null>(null);
  const [editVal, setEditVal] = useState('');
  const [descDraft, setDescDraft] = useState(item.description || '');
  const [autoFocusNewDesc, setAutoFocusNewDesc] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateVal, setEditDateVal] = useState(''); 
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [localDur, setLocalDur] = useState(item.durationEstimate || 0);
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [editRoutinePattern, setEditRoutinePattern] = useState(item.routinePattern || 'every_meeting');
  const [editRoutineEndDateStr, setEditRoutineEndDateStr] = useState(item.routineEndDate ? new Date(item.routineEndDate).toISOString().substring(0,10) : '');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Synchronisiere lokalen Notiz-Entwurf, wenn sich item.description von außen ändert
  useEffect(() => {
    setDescDraft(item.description || '');
  }, [item.description]);

  const todayStr = new Date().toISOString().substring(0, 10);

  const bloodlineId = item.baseItemId || item.id;
  const historyCount = allAgendaItems.filter(t => {
    const tBloodlineId = t.baseItemId || t.id;
    return tBloodlineId === bloodlineId && (t.status === 'ERLEDIGT' || t.progress === 100);
  }).length;

  const getTimeCategory = () => {
    if (!showTimeCategory) return null;
    
    if (item.type !== 'AUFGABE' || isReadOnly) return null;
    if (item.status === 'ERLEDIGT' || item.progress === 100) return null;
    if (item.status === 'TRASH') return null;
    
    if (item.isDueNextMeeting) return { colorClass: 'border-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', text: 'Sitzung' };
    if (!item.dueDate) return { colorClass: 'border-gray-200', badgeClass: 'bg-gray-100 text-gray-500 border-gray-200', text: 'Zukunft' };

    const now = new Date(); now.setHours(0, 0, 0, 0);
    const due = new Date(item.dueDate); due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return { colorClass: 'border-red-500', badgeClass: 'bg-red-100 text-red-700 border-red-200', text: `Seit ${Math.abs(diffDays)} T` };
    if (diffDays === 0) return { colorClass: 'border-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', text: 'Heute' };
    if (diffDays === 1) return { colorClass: 'border-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', text: 'Morgen' };
    if (diffDays <= 7) return { colorClass: 'border-orange-500', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', text: `in ${diffDays} T` };
    if (diffDays <= 30) return { colorClass: 'border-blue-500', badgeClass: 'bg-blue-50 text-blue-600 border-blue-200', text: `in ${diffDays} T` };
    
    return { colorClass: 'border-gray-200', badgeClass: 'bg-gray-100 text-gray-500 border-gray-200', text: `in ${diffDays} T` };
  };

  const timeCategory = getTimeCategory();

  useEffect(() => {
    const handleWindowClick = () => { if (contextMenu) setContextMenu(null); };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [contextMenu]);

  const handleSafeEdit = (itemToEdit: AgendaItem) => { setEditField(null); onEdit(itemToEdit); };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isReadOnly && item.status !== 'TRASH') return; 
    e.preventDefault(); 
    const safeX = Math.min(e.clientX, window.innerWidth - 240);
    const safeY = Math.min(e.clientY, window.innerHeight - 320);
    setContextMenu({ x: safeX, y: safeY });
    if (onSelect) onSelect();
  };

  const getAssigneesText = () => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames].sort((a, b) => (a as string).localeCompare(b as string));
    if (all.length > 0) return all.join(', ');
    return item.type === 'INFO' ? 'Allgemeine Info' : 'Nicht zugewiesen';
  };

  const handleInlineSaveText = () => {
    if (editField === 'title') { 
      const finalTitle = editVal.trim() === '' ? 'Neuer Punkt' : editVal.trim(); 
      if (finalTitle !== item.title) onSaveInline({ ...item, title: finalTitle }); 
      setEditField(null); 
    } else if (editField === 'description') { 
      if (descDraft.trim() !== (item.description || '')) onSaveInline({ ...item, description: descDraft.trim() }); 
      setEditField(null); 
      setAutoFocusNewDesc(false);
    }
  };

  const handleSaveDescriptionDraft = (autoCollapseIfEmpty = true) => {
    const finalDesc = descDraft.trim();
    if (finalDesc !== (item.description || '')) {
      onSaveInline({ ...item, description: finalDesc });
    }
    setEditField(null);
    setAutoFocusNewDesc(false);
    if (autoCollapseIfEmpty && finalDesc === '' && isExpanded) {
      onToggleExpand(item.id);
    }
  };

  const handleInlineSaveDate = () => { 
    if (editDateVal) { 
      const newDate = new Date(editDateVal).getTime(); 
      if (!isNaN(newDate) && newDate !== item.dueDate) onSaveInline({ ...item, dueDate: newDate, isDueNextMeeting: false }); 
    } 
    setIsEditingDate(false); 
  };
  
  const handleInlineSaveRoutine = () => { 
    const endDate = editRoutineEndDateStr ? new Date(editRoutineEndDateStr).getTime() : undefined; 
    onSaveInline({ ...item, routinePattern: editRoutinePattern, routineEndDate: endDate }); 
    setIsEditingRoutine(false); 
  };

  const performScrollPreservedToggle = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); e.preventDefault();
    if (onSelect) onSelect();
    const row = e.currentTarget.closest('.agenda-row-wrapper'); 
    const container = row?.closest('.overflow-y-auto') || row?.closest('.custom-scrollbar');
    if (!row || !container) { action(); return; }
    const prevTop = row.getBoundingClientRect().top; 
    action();
    setTimeout(() => { 
      requestAnimationFrame(() => { 
        const newTop = row.getBoundingClientRect().top; 
        const diff = newTop - prevTop; 
        if (Math.abs(diff) > 0.5) container.scrollTop += diff; 
      }); 
    }, 10);
  };

  const isVisualSubItem = !!(item.isSubItem && !parentContextTitle);
  const hasSubItems = subItemCount !== undefined && subItemCount > 0;
  const isExpandedParent = hasSubItems && !isSubItemsCollapsed;

  // Hintergrund: Blau ist exklusiv für den Fokus (isSelected), Amber verbindet ausgeklappte Oberpunkte und ihre Unterpunkte
  const wrapperClass = hasValidationError
    ? "bg-red-50/90 ring-2 ring-inset ring-red-500 shadow-sm z-10"
    : isSelected 
      ? "bg-blue-50/90 ring-2 ring-inset ring-blue-500 shadow-sm z-10" 
      : isVisualSubItem
        ? (isReadOnly ? "bg-amber-50/35" : "bg-amber-50/35 hover:bg-amber-50/70 transition-colors cursor-pointer")
        : isExpandedParent
          ? (isReadOnly ? "bg-amber-50/15" : "bg-amber-50/15 hover:bg-amber-50/40 transition-colors cursor-pointer")
          : (isReadOnly ? "bg-white" : "bg-white hover:bg-blue-50/30 transition-colors cursor-pointer");
    
  // Linke Rand-Klammer: Verbindet den Oberpunkt (z. B. 6.) nahtlos mit allen seinen Unterpunkten (6.1, 6.2) in Warm-Amber
  const borderLeftClass = hasValidationError
    ? 'border-l-4 border-l-red-600'
    : timeCategory
      ? `border-l-4 ${timeCategory.colorClass}`
      : isSelected
        ? 'border-l-4 border-l-blue-600'
        : isExpandedParent
          ? 'border-l-4 border-l-amber-500'
          : isVisualSubItem
            ? 'border-l-4 border-l-amber-400'
            : hasSubItems
              ? 'border-l-4 border-l-amber-300'
              : 'border-l-4 border-l-transparent';

  const indexBadgeClass = isVisualSubItem
    ? "appearance-none text-center font-bold text-amber-900 bg-amber-100/90 group-hover:bg-amber-200 border border-amber-300 rounded text-xs py-0.5 px-1.5 cursor-pointer outline-none shadow-2xs"
    : isExpandedParent
      ? "appearance-none text-center font-extrabold text-amber-950 bg-amber-100 group-hover:bg-amber-200 border border-amber-400 rounded text-xs py-0.5 px-1.5 cursor-pointer outline-none shadow-2xs"
      : "appearance-none text-center font-extrabold text-slate-800 bg-slate-200/80 group-hover:bg-slate-300 border border-slate-300 rounded text-xs py-0.5 px-1.5 cursor-pointer outline-none";

  const staticIndexBadgeClass = isVisualSubItem
    ? "font-bold text-amber-900 bg-amber-100/90 border border-amber-300 rounded text-xs py-0.5 px-1.5 ml-1 mt-0.5 z-10 shadow-2xs"
    : isExpandedParent
      ? "font-extrabold text-amber-950 bg-amber-100 border border-amber-400 rounded text-xs py-0.5 px-1.5 ml-1 mt-0.5 z-10 shadow-2xs"
      : "font-extrabold text-slate-800 bg-slate-200/80 border border-slate-300 rounded text-xs py-0.5 px-1.5 ml-1 mt-0.5 z-10";

  return (
    <div 
      id={`agenda-item-${item.id}`}
      onClickCapture={() => { if (onSelect) onSelect(); }}
      onClick={() => { if (onSelect) onSelect(); }} 
      onDoubleClick={(e) => { e.stopPropagation(); if (!isReadOnly) handleSafeEdit(item); }}
      onContextMenu={handleContextMenu}
      className={`agenda-row-wrapper ${wrapperClass} ${borderLeftClass} flex flex-col border-b ${isVisualSubItem || isExpandedParent ? 'border-amber-200/70' : 'border-gray-200'} last:border-0 min-w-full md:min-w-[700px] print:!min-w-0 print:!w-full print:!border-l-0 print:!border-b print:!border-gray-300 relative`}
    >
      {/* Durchgehende vertikale Baum-Leitlinie für Unterpunkte (verbindet 6. -> 6.1 -> 6.2 optisch miteinander) */}
      {isVisualSubItem && !showTimeCategory && (
        <div className="pointer-events-none absolute left-3 md:left-4 top-0 bottom-0 w-4 print:!hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-300/90" />
          <div className="absolute left-0 top-5 w-2.5 h-[2px] bg-amber-300/90 rounded-r" />
        </div>
      )}

      {contextMenu && (
        <RowContextMenu 
          x={contextMenu.x} y={contextMenu.y} isExpanded={isExpanded} isReadOnly={isReadOnly} 
          isSubItem={!!item.isSubItem} onClose={() => setContextMenu(null)}
          onToggleExpand={() => onToggleExpand(item.id)} onToggleSubItem={onToggleSubItem}
          onInsertBelow={onInsertBelow} onEdit={() => handleSafeEdit(item)} onDelete={() => onDelete(item.id, item.title)}
          isTrash={item.status === 'TRASH'}
          onRestoreFromTrash={onRestoreFromTrash}
          onPermanentDelete={onPermanentDelete}
          canDeleteAnyItem={canDeleteAnyItem}
        />
      )}

      <div className={`p-3 grid grid-cols-[auto_1fr] ${isTemplateMode ? 'md:grid-cols-[80px_1fr_auto]' : 'md:grid-cols-[120px_1fr_auto]'} gap-2 md:gap-3 items-start print:!grid-cols-[50px_1fr_auto] print:!gap-2 print:!p-2`}>
        
        {/* CHIRURGISCHER EINGRIFF: Die linke Gliederungsspalte. Wenn ToDo-Modus (showTimeCategory), dann sitzt hier das linksbündige Badge! */}
        <div className={`relative flex items-start gap-1.5 pt-1 print:!pt-0 ${isVisualSubItem ? 'pl-4 md:pl-6' : ''}`}>
          
          {showTimeCategory ? (
            timeCategory ? (
              <span className={`z-10 ml-1 md:ml-2 mt-0.5 shrink-0 text-[11px] font-bold px-2 py-0.5 rounded border print:!hidden ${timeCategory.badgeClass}`}>
                {timeCategory.text}
              </span>
            ) : null
          ) : (
            <>
              {onMove && index !== undefined && !isReadOnly && (!item.isSubItem || (positionOptions && positionOptions.length > 0)) ? (
                <>
                  <div className="relative inline-flex group print:!hidden mt-0.5 z-10">
                    <div className={indexBadgeClass}>
                      {displayIndexStr !== undefined ? displayIndexStr : `${index + 1}.`}
                    </div>
                    <select 
                      value={index} 
                      onChange={(e) => onMove(item.id, Number(e.target.value))} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Position / Reihenfolge ändern"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {positionOptions
                        ? positionOptions.map((opt) => <option key={opt.index} value={opt.index}>{opt.label}</option>)
                        : Array.from({length: totalItems || 0}).map((_, i) => <option key={i} value={i}>{i + 1}</option>)
                      }
                    </select>
                  </div>
                  <span className="hidden print:!inline font-bold text-gray-500 text-sm mt-0.5">{displayIndexStr !== undefined ? displayIndexStr : `${index + 1}.`}</span>
                </>
              ) : (
                <span className={staticIndexBadgeClass}>{displayIndexStr !== undefined ? displayIndexStr : (index !== undefined ? `${index + 1}.` : '-')}</span>
              )}

              {!isTemplateMode && (
                <div className="flex flex-col items-center ml-0.5 z-10">
                  <span onClick={(e) => { e.stopPropagation(); if (!isReadOnly) { setLocalDur(item.durationEstimate || 0); setIsEditingDuration(true); } }} className={`font-bold text-sm whitespace-nowrap flex flex-col items-center leading-tight ${isOvertime ? 'text-red-600' : (isVisualSubItem ? 'text-slate-700' : 'text-gray-900')} ${isReadOnly ? '' : 'cursor-pointer hover:bg-blue-50 hover:text-blue-600 rounded px-1 -ml-1 transition-colors'} print:!ml-1 print:!bg-transparent`}>
                    <span>{startTimeStr}</span>
                    <span className="text-[10px] text-gray-400 font-medium mt-[1px] print:!hidden">({effectiveDuration !== undefined ? effectiveDuration : (item.durationEstimate || 0)}m)</span>
                  </span>
                  {isEditingDuration && <DurationPickerPopup localDur={localDur} onPreviewChange={(v) => { setLocalDur(v); onDurationPreview?.(v); }} onCancel={() => { onDurationPreview?.(item.durationEstimate || 0); setIsEditingDuration(false); }} onCommit={() => { onSaveInline({ ...item, durationEstimate: localDur }); setIsEditingDuration(false); }} />}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col min-w-0 pr-1 md:pr-4 pt-1 print:!pr-2 print:!pt-0">
          <div className={`flex flex-col flex-1 ${isVisualSubItem ? 'pl-2 sm:pl-4' : ''}`}>
            {parentContextTitle && <div className="text-[10px] font-bold text-gray-400 mb-0.5 flex items-center uppercase tracking-wider">🏷️ {parentContextTitle} <ChevronRight className="w-3 h-3 mx-1" /></div>}
            
            {editField === 'title' ? (
              <input autoFocus value={editVal} onClick={e => e.stopPropagation()} onChange={e => setEditVal(e.target.value)} onBlur={handleInlineSaveText} onKeyDown={e => e.key === 'Enter' && handleInlineSaveText()} className="w-full font-bold text-gray-900 text-sm border-b-2 border-blue-500 outline-none bg-blue-50 p-0.5" />
            ) : (
              <div className="flex items-start justify-between w-full gap-2 group/title">
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  {subItemCount !== undefined && subItemCount > 0 && onToggleSubItems && ( 
                    <button
                      onClick={(e) => performScrollPreservedToggle(e, onToggleSubItems)}
                      className={`mt-0 p-1 rounded-md transition-colors shrink-0 border shadow-2xs print:!hidden ${isSubItemsCollapsed ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100' : 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'}`}
                      title={isSubItemsCollapsed ? `${subItemCount} Unterpunkte aufklappen` : 'Unterpunkte einklappen'}
                    > 
                      {isSubItemsCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} 
                    </button> 
                  )}
                  <div className={`${isVisualSubItem ? 'font-semibold text-slate-800' : 'font-bold text-gray-900'} text-sm break-words ${isReadOnly ? '' : 'cursor-text hover:bg-gray-100/80 rounded px-1 -ml-1 transition-colors print:!m-0 print:!p-0'} ${item.title ? '' : 'text-gray-400 italic'}`} onClick={(e) => { e.stopPropagation(); if(!isReadOnly) { setEditVal(item.title); setEditField('title'); } }}> 
                    
                    {item.type === 'AGENDA' && <span className="text-indigo-600 mr-1.5" title="Arbeitspunkt (Diskussion & Entscheidung)">A:</span>}
                    {item.type === 'INFO' && <span className="text-blue-600 mr-1.5" title="Kenntnisnahme (Reiner Wissenstransfer)">I:</span>}

                    {highlightText(item.title || 'Neuer Punkt', searchQuery)}
                    {isSubItemsCollapsed && subItemCount! > 0 && <span className="ml-2 text-[10px] font-bold bg-amber-50 border border-amber-300 text-amber-800 px-1.5 py-0.5 rounded-full align-middle inline-block print:!hidden">{subItemCount} Unterpunkte</span>}
                    {hasValidationError && (
                      <span
                        onClick={(e) => { e.stopPropagation(); if (!isReadOnly) handleSafeEdit(item); }}
                        className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-sm cursor-pointer hover:bg-red-700 align-middle print:!hidden"
                        title="Klicken, um einen Verantwortlichen zuzuweisen"
                      >
                        ⚠️ Verantwortlicher fehlt!
                      </span>
                    )}
                  </div>
                </div>
                <div 
                  className={`shrink-0 mt-0.5 ml-2 cursor-pointer transition-all print:!hidden p-1 rounded-md ${isExpanded ? 'bg-blue-100 text-blue-700 shadow-inner' : (hasDescription ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm' : 'text-gray-300 hover:text-blue-500')}`} 
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); if (isExpanded) { handleSaveDescriptionDraft(false); performScrollPreservedToggle(e, () => onToggleExpand(item.id)); } else { setDescDraft(item.description || ''); setAutoFocusNewDesc(!hasDescription && !isReadOnly); performScrollPreservedToggle(e, () => onToggleExpand(item.id)); } }}
                >
                  <AlignLeft className="w-4 h-4" />
                </div>
              </div>
            )}
            
            <ItemMetadata 
              item={item} isTemplateMode={isTemplateMode} 
              historyCount={historyCount} onOpenHistory={onOpenHistory} 
            />
          </div>
        </div>

        <ItemStatusSection 
          item={item} isReadOnly={isReadOnly} showMinimalDesktopActions={showMinimalDesktopActions}
          assigneesText={getAssigneesText()} todayStr={todayStr}
          onEdit={handleSafeEdit} onDelete={onDelete} onToggleExpand={onToggleExpand}
          isExpanded={isExpanded} hasDescription={hasDescription}
          performScrollPreservedToggle={performScrollPreservedToggle}
          onToggleSubItem={onToggleSubItem} onInsertBelow={onInsertBelow}
          isEditingDate={isEditingDate} setIsEditingDate={setIsEditingDate}
          editDateVal={editDateVal} setEditDateVal={setEditDateVal} handleInlineSaveDate={handleInlineSaveDate}
          isEditingRoutine={isEditingRoutine} setIsEditingRoutine={setIsEditingRoutine}
          editRoutinePattern={editRoutinePattern} setEditRoutinePattern={setEditRoutinePattern}
          editRoutineEndDateStr={editRoutineEndDateStr} setEditRoutineEndDateStr={setEditRoutineEndDateStr}
          handleInlineSaveRoutine={handleInlineSaveRoutine} 
          startEditRoutine={() => { setEditRoutinePattern(item.routinePattern || 'every_meeting'); setEditRoutineEndDateStr(item.routineEndDate ? new Date(item.routineEndDate).toISOString().substring(0,10) : ''); setIsEditingRoutine(true); }}
          getDueDateColor={getDueDateColor} getRoutineText={getRoutineText}
          
          onRestoreFromTrash={onRestoreFromTrash}
          onPermanentDelete={onPermanentDelete}
          canDeleteAnyItem={canDeleteAnyItem}
        />
      </div>
      
      {isExpanded && (
        <div className={`px-3 pb-3 print:!pl-[60px] print:!pr-2 print:!pb-2 print:!pt-0 ${hasDescription ? 'print:!block' : 'print:!hidden'}`}> 
          {isReadOnly ? (
            <div className="text-sm bg-gray-50 p-3 rounded border border-gray-100 shadow-inner print:!bg-white print:!p-0"> 
              {item.description ? <RichTextRenderer text={item.description} searchQuery={searchQuery} /> : <span className="text-gray-400 italic text-xs">Keine Notizen vorhanden</span>} 
            </div>
          ) : (
            <>
              {/* Bei aktiver Volltextsuche zeigen wir zusätzlich den gelb hervorgehobenen Suchtreffer an */}
              {searchQuery && searchQuery.trim().length > 0 && item.description && (
                <div className="mb-1.5 text-sm bg-yellow-50/60 p-2 rounded border border-yellow-200 print:!hidden">
                  <RichTextRenderer text={item.description} searchQuery={searchQuery} />
                </div>
              )}
              <div className="mt-1 mb-1 print:!hidden" onClick={e => e.stopPropagation()}>
                <RichTextEditor
                  value={descDraft}
                  onChange={setDescDraft}
                  onBlur={() => handleSaveDescriptionDraft(true)}
                  placeholder="Notizen oder Beschreibung hier eingeben..."
                  autoFocus={autoFocusNewDesc}
                  onExtractSubItem={
                    onExtractSubItem
                      ? (extractedText, remainingMarkdown) => {
                          onExtractSubItem({ ...item, description: descDraft }, extractedText, remainingMarkdown);
                        }
                      : undefined
                  }
                />
              </div>
              {item.description && (
                <div className="hidden print:!block text-sm print:!bg-white print:!p-0">
                  <RichTextRenderer text={item.description} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---