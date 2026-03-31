// src/features/Shared/AgendaItemRow.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Calendar, User, CheckSquare, Edit2, Trash2, Clock, Minus, Plus, Check } from 'lucide-react';
import type { AgendaItem } from '../../core/types/models';

const getDueDateColor = (item: AgendaItem) => {
  if (item.type !== 'AUFGABE') return 'text-gray-600';
  if (item.status === 'ERLEDIGT' || item.progress === 100) return 'text-green-600 font-bold';
  if (item.isDueNextMeeting) return 'text-purple-600 font-bold';
  if (!item.dueDate) return 'text-gray-500';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(item.dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays < 0) return 'text-red-600 font-bold';
  if (diffDays <= 14) return 'text-orange-500 font-bold';
  return 'text-gray-600';
};

const getRoutineText = (item: AgendaItem) => {
  if (!item.isRoutine || !item.routinePattern) return '';
  const pMap: any = { every_meeting: 'Bei jeder Sitzung', weekly: 'Wöchentlich', monthly: 'Monatlich', quarterly: 'Quartalsweise', yearly: 'Jährlich' };
  const pText = pMap[item.routinePattern] || item.routinePattern;
  const eText = item.routineEndDate ? `bis ${new Date(item.routineEndDate).toLocaleDateString()}` : 'ohne Ende';
  return `${pText}, ${eText}`;
};

interface AgendaItemRowProps {
  item: AgendaItem;
  index: number;
  totalItems: number;
  startTimeStr?: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onMove?: (id: string, newIdx: number) => void;
  onEdit: (item: AgendaItem) => void;
  onOpenHistory?: (item: AgendaItem) => void;
  onDelete: (id: string, title: string) => void;
  onSaveInline: (item: AgendaItem) => void;
  isTemplateMode?: boolean;
  isReadOnly?: boolean;
  isOvertime?: boolean;
  effectiveDuration?: number;
  onDurationPreview?: (val: number) => void;
}

export const AgendaItemRow: React.FC<AgendaItemRowProps> = ({ 
  item, index, totalItems, startTimeStr, isExpanded, onToggleExpand, onMove, onEdit, onOpenHistory, onDelete, onSaveInline, isTemplateMode = false, isReadOnly = false, isOvertime = false, effectiveDuration, onDurationPreview
}) => {
  const { users, groups } = useClubStore();
  const hasDescription = !!item.description;

  const [editField, setEditField] = useState<'title' | 'description' | null>(null);
  const [editVal, setEditVal] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [localDur, setLocalDur] = useState(item.durationEstimate || 0);
  
  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [editRoutinePattern, setEditRoutinePattern] = useState<'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(item.routinePattern || 'every_meeting');
  const [editRoutineEndDateStr, setEditRoutineEndDateStr] = useState(item.routineEndDate ? new Date(item.routineEndDate).toISOString().substring(0,10) : '');

  const todayStr = new Date().toISOString().substring(0, 10);

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter((n): n is string => Boolean(n));
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter((n): n is string => Boolean(n));
    const all = [...uNames, ...gNames].sort((a, b) => a.localeCompare(b));
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  const startEdit = (field: 'title' | 'description', currentVal: string) => {
    if (isReadOnly) return;
    setEditVal(currentVal);
    setEditField(field);
  };

  const startEditRoutine = () => {
    if (isReadOnly) return;
    setEditRoutinePattern(item.routinePattern || 'every_meeting');
    setEditRoutineEndDateStr(item.routineEndDate ? new Date(item.routineEndDate).toISOString().substring(0,10) : '');
    setIsEditingRoutine(true);
  };

  const handleInlineSaveText = () => {
    if (editField === 'title' && editVal.trim() !== item.title) onSaveInline({ ...item, title: editVal.trim() });
    if (editField === 'description' && editVal.trim() !== item.description) onSaveInline({ ...item, description: editVal.trim() });
    setEditField(null);
  };

  const handleInlineDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      onSaveInline({ ...item, dueDate: new Date(e.target.value).getTime(), isDueNextMeeting: false });
      setIsEditingDate(false);
    }
  };

  const handleInlineProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    onSaveInline({ ...item, progress: val, status: val === 100 ? 'ERLEDIGT' : (val === 0 ? 'OFFEN' : 'IN_ARBEIT') });
  };

  const handleInlineSaveRoutine = () => {
    const endDate = editRoutineEndDateStr ? new Date(editRoutineEndDateStr).getTime() : undefined;
    onSaveInline({ ...item, routinePattern: editRoutinePattern, routineEndDate: endDate });
    setIsEditingRoutine(false);
  };

  // CHIRURGISCHER EINGRIFF: Die überarbeiteten Wow-Methoden für den Time-Tuner
  const currentDur = effectiveDuration !== undefined ? effectiveDuration : (item.durationEstimate || 0);

  const handlePreviewChange = (e: React.MouseEvent, newVal: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (newVal < 0) newVal = 0;
    setLocalDur(newVal); // Lokaler State für das rasend schnelle Popover
    if (onDurationPreview) onDurationPreview(newVal); // Globaler State für die Echtzeit-Vorschau der restlichen Agenda
  };

  const commitDuration = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveInline({ ...item, durationEstimate: localDur });
    setIsEditingDuration(false);
  };

  const cancelDuration = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDurationPreview) onDurationPreview(item.durationEstimate || 0);
    setIsEditingDuration(false);
  };

  const rowHoverClass = isReadOnly ? "bg-white" : "bg-white hover:bg-blue-50/30 transition-colors";

  return (
    <div className={`${rowHoverClass} flex flex-col border-b border-gray-200 last:border-0 min-w-[700px] print:!min-w-0 print:!w-full print:!border-b print:!border-gray-300 print:!break-inside-avoid print:!bg-white print:!shadow-none`}>
      <div className={`p-3 grid ${isTemplateMode ? 'grid-cols-[60px_1fr_auto]' : 'grid-cols-[85px_1fr_auto]'} gap-3 items-start print:!grid-cols-[50px_1fr_auto] print:!gap-2 print:!p-2`}>
        
        <div className="relative flex items-start gap-2 pt-1 print:!pt-0">
          {isTemplateMode || isReadOnly ? (
            <span className="font-bold text-gray-500 text-sm ml-2 print:!ml-0 mt-0.5">{index + 1}.</span>
          ) : (
            <>
              <select value={index} onChange={(e) => onMove && onMove(item.id, Number(e.target.value))} className="appearance-none text-center font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent rounded text-sm py-0 px-1 mt-[-1px] cursor-pointer outline-none print:!hidden">
                {Array.from({length: totalItems}).map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
              </select>
              <span className="hidden print:!inline font-bold text-gray-500 text-sm mt-0.5">{index + 1}.</span>
            </>
          )}

          {!isTemplateMode && (
            <div className="flex flex-col items-center ml-0.5">
              <span 
                onClick={(e) => { 
                  e.stopPropagation();
                  if (!isReadOnly) { 
                    setLocalDur(item.durationEstimate || 0);
                    setIsEditingDuration(true); 
                  } 
                }} 
                className={`font-bold text-sm whitespace-nowrap flex flex-col items-center leading-tight ${isOvertime ? 'text-red-600' : 'text-gray-900'} ${isReadOnly ? '' : 'cursor-pointer hover:bg-blue-50 hover:text-blue-600 rounded px-1 -ml-1 transition-colors'} print:!ml-1 print:!bg-transparent print:!m-0 print:!p-0`} 
                title={isReadOnly ? "" : "Zeitfenster anpassen"}
              >
                <span>{startTimeStr}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-[1px] print:!hidden">({currentDur}m)</span>
              </span>

              {/* CHIRURGISCHER EINGRIFF: Popover rechts verschoben und Bubbling blockiert */}
              {isEditingDuration && (
                <>
                  <div className="fixed inset-0 z-[50]" onClick={cancelDuration} />
                  <div 
                    className="absolute left-full top-[-20px] ml-4 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-[60] p-4 origin-top-left print:hidden"
                    onClick={(e) => e.stopPropagation()} // Verhindert Bubbling vom Panel nach draußen
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zeitfenster</h4>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Minuten</span>
                    </div>

                    <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 rounded-xl p-2 mb-4">
                      <button onClick={(e) => handlePreviewChange(e, localDur - 5)} className="w-10 h-10 flex items-center justify-center text-blue-600 bg-white rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"><Minus className="w-5 h-5" /></button>
                      <span className="font-black text-blue-900 text-3xl font-mono">{localDur}</span>
                      <button onClick={(e) => handlePreviewChange(e, localDur + 5)} className="w-10 h-10 flex items-center justify-center text-blue-600 bg-white rounded-lg shadow-sm border border-blue-100 hover:bg-blue-600 hover:text-white transition-all"><Plus className="w-5 h-5" /></button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-5">
                      {[5, 10, 15, 20].map(m => (
                        <button key={m} onClick={(e) => handlePreviewChange(e, m)} className={`py-1.5 text-xs font-bold rounded-lg transition-all border ${localDur === m ? 'bg-blue-100 border-blue-300 text-blue-800 shadow-inner' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{m}</button>
                      ))}
                    </div>

                    <div className="flex justify-between gap-2">
                      <button onClick={cancelDuration} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg flex-1 transition-colors">Abbrechen</button>
                      <button onClick={commitDuration} className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm flex-1 flex items-center justify-center transition-colors"><Check className="w-3.5 h-3.5 mr-1" /> Speichern</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 pr-4 pt-1 print:!pr-2 print:!pt-0">
          {editField === 'title' ? (
            <input 
              autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={handleInlineSaveText} onKeyDown={e => e.key === 'Enter' && handleInlineSaveText()}
              className="w-full font-bold text-gray-900 text-sm border-b-2 border-blue-500 outline-none bg-blue-50 p-0.5"
            />
          ) : (
            <div className={`font-bold text-gray-900 text-sm whitespace-normal break-words ${isReadOnly ? '' : 'cursor-text hover:bg-gray-100 rounded px-1 -ml-1 transition-colors print:!bg-transparent print:!m-0 print:!p-0'}`} title={isReadOnly ? "" : "Klicken zum Bearbeiten"} onClick={() => startEdit('title', item.title)}>
              {item.title}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 truncate pl-1 flex-wrap print:!pl-0 print:!gap-1">
            {isTemplateMode && item.durationEstimate ? <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-bold rounded print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800">{item.durationEstimate} Min.</span> : null}
            {item.type === 'BESCHLUSS' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 font-bold rounded print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800">Beschluss</span>}
            {item.baseItemId && item.type === 'AUFGABE' && (
              <span onClick={(e) => { e.stopPropagation(); onOpenHistory && onOpenHistory(item); }} className="flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded cursor-pointer hover:bg-blue-200 transition-colors print:!border print:!border-gray-300 print:!bg-transparent print:!text-gray-800" title="Historie anzeigen">
                <Clock className="w-3 h-3 mr-1 shrink-0 print:!hidden" /> Historie
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center shrink-0 pt-1 print:!pt-0">
            <div onClick={() => !isReadOnly && onEdit(item)} className={`w-[140px] flex items-start pr-4 text-xs text-gray-600 border-r border-transparent print:!border-r-0 print:!w-[120px] print:!pr-2 ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-50 rounded -ml-1 pl-1 transition-colors print:!bg-transparent print:!m-0 print:!p-0'}`} title={isReadOnly ? "" : "Klicken um Verantwortliche zu ändern"}>
              <User className="w-3 h-3 mr-1.5 shrink-0 text-gray-400 mt-0.5 print:!hidden" />
              <span className="truncate whitespace-pre-wrap print:!whitespace-normal">{getAssigneesText(item)}</span>
            </div>

            <div className="w-[70px] flex items-center pr-4 group relative print:!w-[50px] print:!pr-2">
              {item.type === 'AUFGABE' ? (
                <div className="flex items-center text-blue-600 font-medium text-xs print:!text-gray-800">
                  <CheckSquare className="w-3 h-3 shrink-0" />
                  {isReadOnly ? (
                    <span className="w-7 text-right inline-block ml-1 print:!w-auto">{item.progress || 0}%</span>
                  ) : (
                    <div className="cursor-pointer flex items-center" title="Klicken um Fortschritt zu ändern">
                      <span className="w-7 text-right inline-block ml-1 group-hover:hidden print:group-hover:!inline-block print:!w-auto">{item.progress || 0}%</span>
                      <input type="range" min="0" max="100" step="10" value={item.progress || 0} onChange={handleInlineProgress} className="hidden group-hover:block w-12 ml-1 h-2 accent-blue-600 print:!hidden" />
                    </div>
                  )}
                </div>
              ) : <div className="w-full"></div>}
            </div>

            <div className="w-[120px] flex justify-start pr-2 print:!w-[80px] print:!pr-0">
              {isEditingDate && item.type === 'AUFGABE' ? (
                <input 
                  type="date" min={todayStr} autoFocus
                  value={item.dueDate ? new Date(item.dueDate).toISOString().substring(0,10) : ''} 
                  onChange={handleInlineDate} 
                  onBlur={() => setIsEditingDate(false)}
                  onKeyDown={e => e.key === 'Enter' && setIsEditingDate(false)}
                  className="w-24 text-xs border border-gray-300 rounded p-0.5 bg-white" 
                />
              ) : (
                <div 
                   onClick={() => !isReadOnly && item.type === 'AUFGABE' && setIsEditingDate(true)}
                   className={`flex items-center text-xs ${isReadOnly ? '' : 'cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 transition-colors print:!bg-transparent print:!m-0 print:!p-0'} ${getDueDateColor(item)} print:!text-gray-800`}
                   title={isReadOnly || item.type !== 'AUFGABE' ? "" : "Klicken zum Bearbeiten"}
                >
                  {item.isDueNextMeeting ? (
                    <span className="flex items-center font-bold bg-purple-50 px-1.5 py-0.5 rounded text-xs print:!bg-transparent print:!border print:!border-gray-300 print:!text-gray-800 print:!p-0"><Calendar className="w-3 h-3 mr-1 shrink-0 print:!hidden" /> Nächste</span>
                  ) : item.type === 'AUFGABE' ? (
                    <>
                      <Calendar className="w-3 h-3 mr-1 shrink-0 print:!hidden" />
                      <span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Kein Datum'}</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="w-[80px] flex items-center justify-end border-l border-gray-200 pl-3 gap-1 print:!hidden print:!w-0 print:!h-0 print:!absolute print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
              {hasDescription ? (
                <button onClick={() => onToggleExpand(item.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-lg font-mono font-bold leading-none">{isExpanded ? '-' : '+'}</button>
              ) : <div className="w-7"></div>}
              
              {!isReadOnly && (
                <>
                  <button onClick={() => onEdit(item)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(item.id, item.title)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </div>

          {(item.isRoutine || item.mustBeDoneBeforeEvent) && item.type === 'AUFGABE' && (
            <div className="mt-1 flex flex-wrap items-center gap-4 w-full print:!mt-0.5">
              {item.isRoutine && (
                isEditingRoutine ? (
                  <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 shadow-sm relative z-10 flex-1 print:!hidden">
                    <span className="text-xs font-bold text-indigo-800">↻ Routine:</span>
                    <select 
                      value={editRoutinePattern} 
                      onChange={e => setEditRoutinePattern(e.target.value as any)}
                      className="w-32 text-xs p-1 border border-indigo-300 rounded font-bold text-indigo-800 outline-none"
                    >
                      <option value="every_meeting">Bei jeder Sitzung</option>
                      <option value="weekly">Wöchentlich</option>
                      <option value="monthly">Monatlich</option>
                      <option value="quarterly">Quartalsweise</option>
                      <option value="yearly">Jährlich</option>
                    </select>
                    <span className="text-xs text-indigo-800 ml-2">Endet:</span>
                    <input 
                      type="date" 
                      min={todayStr}
                      value={editRoutineEndDateStr} 
                      onChange={e => setEditRoutineEndDateStr(e.target.value)}
                      className="w-32 text-xs p-1 border border-indigo-300 rounded text-indigo-800 outline-none"
                      title="Enddatum (Leer = ohne Ende)"
                    />
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => setIsEditingRoutine(false)} className="px-3 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 py-1 font-medium">Abbrechen</button>
                      <button onClick={handleInlineSaveRoutine} className="px-3 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 py-1 font-bold">Speichern</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={startEditRoutine}
                    className={`text-[11px] font-bold text-indigo-600 rounded px-1.5 py-0.5 leading-tight inline-flex items-center -ml-1 print:!text-gray-500 print:!font-normal print:!m-0 print:!p-0 ${isReadOnly ? '' : 'cursor-pointer hover:bg-indigo-50 transition-colors'}`}
                    title={isReadOnly ? "" : "Routine bearbeiten"}
                  >
                    <span className="print:!hidden">↻ </span>{getRoutineText(item)}
                  </div>
                )
              )}

              {item.mustBeDoneBeforeEvent && !isEditingRoutine && (
                <div 
                  onClick={() => !isReadOnly && onEdit(item)}
                  className={`text-[11px] font-bold text-purple-600 px-1.5 py-0.5 rounded leading-tight print:!text-gray-500 print:!font-normal print:!m-0 print:!p-0 ${isReadOnly ? '' : 'cursor-pointer hover:bg-purple-50 transition-colors'}`}
                  title={isReadOnly ? "" : "Vorlauf bearbeiten"}
                >
                  Vorlauf: {item.leadTimeValue} {item.leadTimeUnit === 'days' ? 'Tage' : 'Std.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasDescription && (
        <div className={`px-3 pb-3 print:!pl-[60px] print:!pr-2 print:!pb-2 print:!pt-0 ${isExpanded ? 'block' : 'hidden print:!block'}`}>
          {editField === 'description' ? (
             <textarea 
               ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
               autoFocus 
               value={editVal} 
               onChange={e => {
                 setEditVal(e.target.value);
                 e.target.style.height = 'auto';
                 e.target.style.height = e.target.scrollHeight + 'px';
               }} 
               onBlur={handleInlineSaveText}
               className="w-full text-sm text-gray-900 bg-white p-3 rounded border-2 border-blue-500 outline-none shadow-sm min-h-[80px] overflow-hidden resize-none print:!hidden"
             />
          ) : (
            <div onClick={() => startEdit('description', item.description || '')} className={`text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 shadow-inner print:!bg-white print:!border-none print:!shadow-none print:!p-0 ${isReadOnly ? '' : 'cursor-text hover:bg-gray-100 transition-colors'}`} title={isReadOnly ? "" : "Klicken zum Bearbeiten"}>
              {item.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 318