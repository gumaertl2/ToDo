// [2026-05-31] - UX-FEATURE: Echtes Erledigungsdatum (completedAt) integriert. Wird bei 100% Fortschritt neben dem Slider im Protokoll angezeigt.
// [2026-05-29] - PRINT-FIX: Erledigungsgrad wird im Druck-Layout direkt unter dem Datum platziert und die normale Spalte für den Druck ausgeblendet.
// 2026-05-12 15:15 - RESTORE: 1:1 Layout-Rekonstruktion der rechten Status-Spalte aus Turn 8.
// 2026-05-12 17:15 - BUGFIX: TS6133 - Ungenutzten Import 'RefreshCw' entfernt.
// 2026-05-13 18:25 - CHIRURGISCHER EINGRIFF: Inline-Buttons für den Papierkorb (Wiederherstellen / Endgültig löschen) integriert.
// src/features/Shared/components/AgendaItem/ItemStatusSection.tsx
import React from 'react';
import { 
  User, CheckSquare, Calendar, Eye, Edit2, Trash2, 
  ArrowLeftToLine, ArrowRightToLine, CornerDownRight, PlusCircle,
  ArchiveRestore, AlertTriangle, CheckCircle2 // CHIRURGISCHER EINGRIFF: CheckCircle2 importiert
} from 'lucide-react';
import { InlineDateInput, RoutinePickerPopup } from './InlineEditors';
import type { AgendaItem } from '../../../../core/types/models';

interface ItemStatusSectionProps {
  item: AgendaItem;
  isReadOnly: boolean;
  showMinimalDesktopActions: boolean;
  assigneesText: string;
  todayStr: string;
  onEdit: (item: AgendaItem) => void;
  onDelete: (id: string, title: string) => void;
  onToggleExpand: (id: string) => void;
  isExpanded: boolean;
  hasDescription: boolean;
  performScrollPreservedToggle: (e: React.MouseEvent, action: () => void) => void;
  onToggleSubItem?: () => void;
  onInsertBelow?: (mode: 'sibling' | 'subitem') => void;
  // Date States
  isEditingDate: boolean;
  setIsEditingDate: (val: boolean) => void;
  editDateVal: string;
  setEditDateVal: (val: string) => void;
  handleInlineSaveDate: () => void;
  // Routine States
  isEditingRoutine: boolean;
  setIsEditingRoutine: (val: boolean) => void;
  editRoutinePattern: any;
  setEditRoutinePattern: (val: any) => void;
  editRoutineEndDateStr: string;
  setEditRoutineEndDateStr: (val: string) => void;
  handleInlineSaveRoutine: () => void;
  startEditRoutine: () => void;
  getDueDateColor: (item: AgendaItem) => string;
  getRoutineText: (item: AgendaItem) => string;
  
  onRestoreFromTrash?: () => void;
  onPermanentDelete?: () => void;
  canDeleteAnyItem?: boolean;
}

export const ItemStatusSection: React.FC<ItemStatusSectionProps> = (props) => {
  const { 
    item, isReadOnly, showMinimalDesktopActions, assigneesText, todayStr, 
    onEdit, onDelete, onToggleExpand, isExpanded, hasDescription, 
    performScrollPreservedToggle, onToggleSubItem, onInsertBelow,
    getDueDateColor, getRoutineText,
    onRestoreFromTrash, onPermanentDelete, canDeleteAnyItem
  } = props;

  const isTrash = item.status === 'TRASH';
  const isCompleted = item.progress === 100 || item.status === 'ERLEDIGT'; // CHIRURGISCHER EINGRIFF

  const getRelativeTimeText = (item: AgendaItem) => { 
    if (item.leadTimeUnit === 'same_day') return 'Am gleichen Tag'; 
    if (item.leadTimeUnit === 'days_before') return `${item.leadTimeValue} Tage vorher`; 
    if (item.leadTimeUnit === 'days_after') return `${item.leadTimeValue} Tage nachher`; 
    return 'Abweichend'; 
  };

  return (
    <div className="col-span-2 md:col-span-1 flex flex-col mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-100 md:border-t-0 print:!col-span-1 print:!border-t-0 print:!mt-0 print:!pt-0">
      
      {/* Obere Zeile: Metadaten & Aktionen */}
      <div className="flex flex-wrap md:flex-nowrap items-center shrink-0 pt-1 print:!pt-0 gap-y-2 gap-x-3 md:gap-x-0 md:justify-end">
        
        {/* Verantwortliche */}
        <div onClick={(e) => { e.stopPropagation(); if(!isReadOnly && !isTrash) onEdit(item); }} className={`w-auto flex-1 md:flex-none md:w-[140px] flex items-start text-xs text-gray-600 border-r border-transparent print:!border-r-0 print:!w-[120px] print:!pr-2 ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-50 rounded -ml-1 pl-1 md:pr-4 transition-colors print:!bg-transparent print:!m-0 print:!p-0'}`} title={isReadOnly ? "" : "Klicken um Verantwortliche zu ändern"}> 
          <User className="w-3 h-3 mr-1.5 shrink-0 text-gray-400 mt-0.5 print:!hidden" /> 
          <span className="truncate whitespace-pre-wrap print:!whitespace-normal">{assigneesText}</span> 
        </div>
        
        {/* Fortschritt & Erledigt-Datum */}
        <div className="w-auto md:w-[110px] flex flex-col md:pr-4 group relative print:!hidden" onClick={e => e.stopPropagation()}> 
          {item.type === 'AUFGABE' ? ( 
            <>
              <div className={`flex items-center font-medium text-xs ${isTrash ? 'text-gray-400' : (isCompleted ? 'text-green-600' : 'text-blue-600')}`}> 
                <CheckSquare className="w-3 h-3 shrink-0" /> 
                <span className="w-7 text-right inline-block ml-1">{item.progress || 0}%</span> 
              </div>
              {/* CHIRURGISCHER EINGRIFF: completedAt Anzeige */}
              {isCompleted && item.completedAt && (
                <div className="text-[9px] text-green-600 mt-0.5 ml-4 flex items-center font-semibold" title="Erledigt am">
                   <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                   {new Date(item.completedAt).toLocaleDateString()}
                </div>
              )}
            </>
          ) : <div className="w-full"></div>} 
        </div>
        
        {/* Datum */}
        <div className="w-auto md:w-[120px] flex justify-start md:pr-2 print:!w-[80px] print:!pr-0"> 
          {item.type === 'AUFGABE' && (
            props.isEditingDate ? ( 
              <div onClick={e => e.stopPropagation()} className="relative">
                <InlineDateInput 
                  value={props.editDateVal} todayStr={todayStr} 
                  onChange={props.setEditDateVal} onSave={props.handleInlineSaveDate} 
                  onCancel={() => props.setIsEditingDate(false)} 
                />
              </div>
            ) : ( 
              <div className="flex flex-col">
                <div 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (!isReadOnly && !isTrash) { 
                      props.setEditDateVal(item.dueDate ? new Date(item.dueDate).toISOString().substring(0,10) : ''); 
                      props.setIsEditingDate(true); 
                    } 
                  }} 
                  className={`flex items-center text-xs ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors print:!bg-transparent print:!m-0 print:!p-0'} ${isTrash ? 'text-gray-400' : getDueDateColor(item)} print:!text-gray-800`} 
                  title={isReadOnly ? "" : "Klicken zum Bearbeiten"} 
                > 
                  {item.isDueNextMeeting ? ( 
                    <span className={`flex items-center font-bold px-1.5 py-0.5 rounded text-xs print:!bg-transparent print:!border print:!border-gray-300 print:!text-gray-800 print:!p-0 ${isTrash ? 'bg-gray-100 text-gray-500' : 'bg-purple-50'}`}>
                      <Calendar className="w-3 h-3 mr-1 shrink-0 print:!hidden" /> Nächste
                    </span> 
                  ) : ( 
                    <>
                      <Calendar className="w-3 h-3 mr-1 shrink-0 print:!hidden" />
                      <span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Kein Datum'}</span>
                    </> 
                  )} 
                </div> 
                
                {/* CHIRURGISCHER EINGRIFF: Fortschritt für den Druck unter das Datum schieben */}
                <div className="hidden print:!flex items-center text-[11px] mt-0.5 text-gray-800 font-bold">
                  <CheckSquare className="w-3 h-3 mr-1 shrink-0" /> {item.progress || 0}%
                </div>
              </div>
            )
          )} 
        </div>
        
        {/* Desktop Aktionen */}
        <div className={`w-full md:w-auto flex items-center justify-end md:border-l border-gray-200 md:pl-3 gap-1 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-gray-50 md:border-t-0 ${showMinimalDesktopActions ? 'md:flex' : 'md:hidden'} print:!hidden`}>
          
          {!showMinimalDesktopActions && (
            <button onClick={(e) => performScrollPreservedToggle(e, () => onToggleExpand(item.id))} className={`w-7 h-7 flex items-center justify-center rounded text-lg font-mono font-bold leading-none transition-colors ${hasDescription ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'}`} title={hasDescription ? "Notizen einklappen/ausklappen" : "Notizen hinzufügen"}> 
              {isExpanded ? '-' : '+'} 
            </button>
          )}

          {!isTrash && (
            <>
              {!isReadOnly && !showMinimalDesktopActions && ( 
                <>
                  <button onClick={(e) => { e.stopPropagation(); onToggleSubItem && onToggleSubItem(); }} className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${item.isSubItem ? 'text-blue-500 hover:bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} title={item.isSubItem ? "Zum Hauptpunkt machen" : "Zum Unterpunkt machen"}> 
                    {item.isSubItem ? <ArrowLeftToLine className="w-4 h-4" /> : <ArrowRightToLine className="w-4 h-4" />} 
                  </button> 
                  
                  {onInsertBelow && !item.isSubItem && ( 
                    <button onClick={(e) => { e.stopPropagation(); onInsertBelow('subitem'); }} className="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded" title="Neuen Unterpunkt hinzufügen"> 
                      <CornerDownRight className="w-4 h-4" /> 
                    </button> 
                  )} 
                  
                  {onInsertBelow && ( 
                    <button onClick={(e) => { e.stopPropagation(); onInsertBelow('sibling'); }} className="w-7 h-7 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 rounded" title="Neuen Punkt darunter einfügen"> 
                      <PlusCircle className="w-4 h-4" /> 
                    </button> 
                  )} 
                </> 
              )}

              <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded" title={isReadOnly ? "Details ansehen" : "Details bearbeiten"}> 
                {isReadOnly ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />} 
              </button> 
              
              {!isReadOnly && !showMinimalDesktopActions && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(item.id, item.title); }} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded" title="In den Papierkorb verschieben"> 
                  <Trash2 className="w-4 h-4" /> 
                </button>
              )}
            </>
          )}

          {isTrash && (
            <>
              {onRestoreFromTrash && (
                <button onClick={(e) => { e.stopPropagation(); onRestoreFromTrash(); }} className="w-7 h-7 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 rounded" title="Aufgabe wiederherstellen"> 
                  <ArchiveRestore className="w-4 h-4" /> 
                </button>
              )}
              {onPermanentDelete && canDeleteAnyItem && (
                <button onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }} className="w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-100 rounded" title="Endgültig löschen (Admin)"> 
                  <AlertTriangle className="w-4 h-4" /> 
                </button>
              )}
            </>
          )}

        </div>
      </div>
      
      {/* Untere Zeile: Routine / Regeln */}
      {(item.isRoutine || (item.isSubItem && item.leadTimeUnit && item.type === 'AUFGABE')) && ( 
        <div className="mt-2 md:mt-1 flex flex-wrap items-center gap-2 md:gap-4 w-full md:justify-end print:!mt-0.5"> 
          
          {item.isRoutine && ( 
            props.isEditingRoutine ? ( 
              <div onClick={e => e.stopPropagation()} className="relative">
                <RoutinePickerPopup 
                  pattern={props.editRoutinePattern} onPatternChange={props.setEditRoutinePattern}
                  endDate={props.editRoutineEndDateStr} onEndDateChange={props.setEditRoutineEndDateStr}
                  onCancel={() => props.setIsEditingRoutine(false)} onSave={props.handleInlineSaveRoutine}
                  todayStr={todayStr}
                />
              </div>
            ) : ( 
              <div 
                onClick={(e) => { e.stopPropagation(); if (!isTrash) props.startEditRoutine(); }} 
                className={`text-[11px] font-bold rounded px-1.5 py-0.5 leading-tight inline-flex items-center -ml-1 print:!text-gray-500 print:!font-normal print:!m-0 print:!p-0 ${isTrash ? 'text-gray-400 bg-gray-50' : 'text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors'}`} 
                title={isReadOnly || isTrash ? "" : "Routine bearbeiten"} 
              > 
                {getRoutineText(item)} 
              </div> 
            ) 
          )} 
          
          {item.isSubItem && item.leadTimeUnit && item.type === 'AUFGABE' && !props.isEditingRoutine && ( 
            <div 
              onClick={(e) => { e.stopPropagation(); if(!isReadOnly && !isTrash) onEdit(item); }} 
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded leading-tight print:!text-gray-500 print:!font-normal print:!m-0 print:!p-0 ${isTrash ? 'text-gray-400 bg-gray-50' : 'text-purple-600 hover:bg-purple-50 cursor-pointer transition-colors'}`} 
              title={isReadOnly || isTrash ? "" : "Abweichung bearbeiten"} 
            > 
              Regel: {getRelativeTimeText(item)} 
            </div> 
          )} 
        </div> 
      )}
    </div>
  );
};
// --- END OF FILE ---