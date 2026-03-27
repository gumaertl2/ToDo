// src/features/Shared/ItemFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { AgendaItem, ItemType, ItemStatus } from '../../core/types/models';
import { X, Save, ChevronDown, ChevronRight, Copy } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgendaItem>) => Promise<void>;
  existingItem?: Partial<AgendaItem>;
  isFixedType?: boolean;
}

export const ItemFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, existingItem, isFixedType }) => {
  const { users, groups, events, saveAgendaItem } = useClubStore();
  
  const parentEvent = existingItem?.eventId ? events.find(e => e.id === existingItem.eventId) : null;
  const isProtocolMode = parentEvent?.status === 'AKTIV' || parentEvent?.status === 'ABGESCHLOSSEN';
  const isNewItem = !existingItem?.id;

  const [type, setType] = useState<ItemType>(existingItem?.type || (isProtocolMode ? 'INFO' : 'VORLAGE'));
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [requestedBy, setRequestedBy] = useState(existingItem?.requestedBy || '');
  const [durationEstimate, setDurationEstimate] = useState<number>(existingItem?.durationEstimate || 15);
  
  const [mustBeDoneBeforeEvent, setMustBeDoneBeforeEvent] = useState(existingItem?.mustBeDoneBeforeEvent || false);
  const [leadTimeValue, setLeadTimeValue] = useState<number>(existingItem?.leadTimeValue || 1);
  const [leadTimeUnit, setLeadTimeUnit] = useState<'hours' | 'days'>(existingItem?.leadTimeUnit || 'days');
  const [isDueNextMeeting, setIsDueNextMeeting] = useState(existingItem?.id !== undefined ? (existingItem.isDueNextMeeting || false) : isProtocolMode);
  
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(existingItem?.assigneeUserIds || []);
  const [assigneeGroupIds, setAssigneeGroupIds] = useState<string[]>(existingItem?.assigneeGroupIds || []);

  const [status, setStatus] = useState<ItemStatus>(existingItem?.status || 'OFFEN');
  const [progress, setProgress] = useState<number>(existingItem?.progress || 0);
  
  const [dueDateStr, setDueDateStr] = useState(
    existingItem?.dueDate 
      ? new Date(existingItem.dueDate).toISOString().substring(0,10) 
      : (parentEvent?.plannedStartTime && !isProtocolMode ? new Date(parentEvent.plannedStartTime).toISOString().substring(0,10) : '')
  );
  
  const [isRoutine, setIsRoutine] = useState(existingItem?.isRoutine || false);
  const [routinePattern, setRoutinePattern] = useState<'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(existingItem?.routinePattern || 'every_meeting');
  const [routineEndDateStr, setRoutineEndDateStr] = useState(existingItem?.routineEndDate ? new Date(existingItem.routineEndDate).toISOString().substring(0,10) : '');

  const [approvedBy, setApprovedBy] = useState<string[]>(existingItem?.approvedBy || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRoutine, setShowRoutine] = useState(existingItem?.isRoutine || false);

  const todayStr = new Date().toISOString().substring(0, 10);

  if (!isOpen) return null;

  const toggleArray = (arr: string[], setArr: (val: string[]) => void, id: string) => {
    if (arr.includes(id)) setArr(arr.filter(x => x !== id));
    else setArr([...arr, id]);
  };

  const handleSaveAsTemplate = async () => {
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    try {
      setIsSubmitting(true);
      const payload: Partial<AgendaItem> = {
        type: 'VORLAGE', title: title.trim(), description: description.trim(),
        requestedBy: requestedBy.trim(), durationEstimate,
        assigneeUserIds, assigneeGroupIds,
        mustBeDoneBeforeEvent, leadTimeValue, leadTimeUnit,
        isRoutine, routinePattern, routineEndDate: routineEndDateStr ? new Date(routineEndDateStr).getTime() : undefined,
        createdAt: Date.now()
      };
      const safePayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Partial<AgendaItem>;
      await saveAgendaItem(safePayload);
      alert('Erfolgreich als neue Vorlage gespeichert!');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern der Vorlage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    
    try {
      setIsSubmitting(true);
      const payload: Partial<AgendaItem> = {
        type, title: title.trim(), description: description.trim(),
        requestedBy: requestedBy.trim(), durationEstimate,
        assigneeUserIds, assigneeGroupIds,
      };

      if (existingItem?.id) payload.id = existingItem.id;

      if (type === 'AUFGABE' || type === 'VORLAGE') {
        payload.mustBeDoneBeforeEvent = mustBeDoneBeforeEvent;
        payload.leadTimeValue = leadTimeValue;
        payload.leadTimeUnit = leadTimeUnit;
        payload.isDueNextMeeting = isDueNextMeeting;
      }

      if (type === 'AUFGABE') {
        payload.status = status;
        payload.progress = progress;
        if (dueDateStr && !isDueNextMeeting) payload.dueDate = new Date(dueDateStr).getTime();
      }

      payload.isRoutine = isRoutine;
      if (isRoutine) {
        payload.routinePattern = routinePattern;
        if (routineEndDateStr) payload.routineEndDate = new Date(routineEndDateStr).getTime();
      } else {
        payload.routinePattern = undefined;
        payload.routineEndDate = undefined;
      }

      if (type === 'BESCHLUSS') payload.approvedBy = approvedBy;

      const safePayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Partial<AgendaItem>;
      await onSave(safePayload);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{existingItem?.id ? 'Bearbeiten' : 'Neuer Eintrag'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Titel *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 font-medium" autoFocus required />
            </div>
            <div className="flex flex-col">
              <label className="block text-xs font-bold text-gray-700 mb-1">Typ</label>
              <select value={type} onChange={e => setType(e.target.value as ItemType)} disabled={isFixedType} className="w-full p-2 text-sm border border-blue-300 bg-blue-50 rounded font-bold text-blue-800">
                {(!isProtocolMode || (!isNewItem && type === 'VORLAGE')) && <option value="VORLAGE">VORLAGE</option>}
                {(!isProtocolMode || (!isNewItem && type === 'AGENDA')) && <option value="AGENDA">AGENDA</option>}
                <option value="INFO">INFO</option>
                <option value="BESCHLUSS">BESCHLUSS</option>
                <option value="AUFGABE">AUFGABE</option>
              </select>
              {type !== 'VORLAGE' && (
                <button onClick={handleSaveAsTemplate} disabled={isSubmitting} className="mt-1 flex items-center justify-center text-[10px] text-blue-600 font-bold hover:bg-blue-50 p-1 rounded border border-transparent hover:border-blue-200 transition-colors">
                  <Copy className="w-3 h-3 mr-1" /> Als Vorlage speichern
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" rows={2}></textarea>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
            <label className="block text-xs font-bold text-blue-800 mb-2">Verantwortliche (Klicken zum Zuweisen)</label>
            <div className="flex flex-wrap gap-1.5">
              {groups.map(g => (
                <button key={g.id} onClick={() => toggleArray(assigneeGroupIds, setAssigneeGroupIds, g.id)} className={`px-2 py-1 text-xs font-bold rounded-full border ${assigneeGroupIds.includes(g.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  🏢 {g.name}
                </button>
              ))}
              {users.map(u => (
                <button key={u.id} onClick={() => toggleArray(assigneeUserIds, setAssigneeUserIds, u.id)} className={`px-2 py-1 text-xs font-medium rounded-full border ${assigneeUserIds.includes(u.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          {type === 'BESCHLUSS' && (
            <div className="bg-green-50/50 p-3 rounded-lg border border-green-100 mt-2">
              <label className="block text-xs font-bold text-green-800 mb-2">Zugestimmt (Beschluss-Protokollierung)</label>
              <div className="flex flex-wrap gap-1.5">
                {users.map(u => (
                  <button key={u.id} onClick={() => toggleArray(approvedBy, setApprovedBy, u.id)} className={`px-2 py-1 text-xs font-medium rounded-full border ${approvedBy.includes(u.id) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CHIRURGISCHER EINGRIFF: Aufgaben-Details und Automatisierung in EINER sichtbaren Box vereint */}
          {type === 'AUFGABE' && (
            <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-200 space-y-4">
              <div className="border-b border-orange-200 pb-2 mb-2">
                  <h3 className="text-sm font-bold text-orange-900">Aufgaben-Status & Planung</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status & Fortschritt ({progress}%)</label>
                  <div className="flex items-center gap-2">
                    <select value={status} onChange={e => {
                      setStatus(e.target.value as ItemStatus);
                      if (e.target.value === 'ERLEDIGT') setProgress(100);
                    }} className="p-1.5 text-sm border border-gray-300 rounded font-bold w-1/2 bg-white">
                      <option value="OFFEN">Offen</option>
                      <option value="IN_ARBEIT">In Arbeit</option>
                      <option value="ERLEDIGT">Erledigt</option>
                    </select>
                    <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-1/2" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fällig am</label>
                  <input type="date" min={todayStr} value={dueDateStr} onChange={e => { setDueDateStr(e.target.value); setIsDueNextMeeting(false); }} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dauer (Min)</label>
                  <input type="number" value={durationEstimate} onChange={e => setDurationEstimate(Number(e.target.value))} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Eingebracht von</label>
                  <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white" />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-orange-200">
                 <label className="flex items-center text-sm font-bold text-orange-900">
                   <input type="checkbox" checked={isDueNextMeeting} onChange={e => { setIsDueNextMeeting(e.target.checked); if(e.target.checked) setDueDateStr(''); }} className="w-4 h-4 mr-2" />
                   Automatisch fällig zur NÄCHSTEN Sitzung
                 </label>
                 
                 <label className="flex items-center text-sm font-medium text-gray-700">
                   <input type="checkbox" checked={mustBeDoneBeforeEvent} onChange={e => { setMustBeDoneBeforeEvent(e.target.checked); if (e.target.checked) setIsDueNextMeeting(false); }} className="w-4 h-4 mr-2" />
                   Muss VOR dem Event erledigt sein
                 </label>
                 
                 {mustBeDoneBeforeEvent && (
                   <div className="flex gap-3 pl-6">
                     <div className="flex-1">
                       <label className="block text-xs font-medium text-gray-700 mb-1">Vorlauf</label>
                       <input type="number" value={leadTimeValue} onChange={e => setLeadTimeValue(Number(e.target.value))} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white" />
                     </div>
                     <div className="flex-1">
                       <label className="block text-xs font-medium text-gray-700 mb-1">Einheit</label>
                       <select value={leadTimeUnit} onChange={e => setLeadTimeUnit(e.target.value as 'hours'|'days')} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white">
                         <option value="days">Tage</option>
                         <option value="hours">Stunden</option>
                       </select>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          )}

          {type === 'VORLAGE' && (
            <div className="border border-purple-100 rounded-lg overflow-hidden">
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-2 bg-purple-50 text-purple-800 text-xs font-bold flex justify-between items-center hover:bg-purple-100">
                <span>⚙️ Automatisierung & Planung (Optional)</span>
                {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showAdvanced && (
                <div className="p-3 bg-white space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Dauer (Min)</label>
                      <input type="number" value={durationEstimate} onChange={e => setDurationEstimate(Number(e.target.value))} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Eingebracht von</label>
                      <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                  </div>
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={mustBeDoneBeforeEvent} onChange={e => { setMustBeDoneBeforeEvent(e.target.checked); if (e.target.checked) setIsDueNextMeeting(false); }} className="w-4 h-4 mr-2" />
                    Muss VOR dem Event erledigt sein
                  </label>
                  {mustBeDoneBeforeEvent && (
                    <div className="flex gap-3 mt-2 pl-6">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Vorlauf</label>
                        <input type="number" value={leadTimeValue} onChange={e => setLeadTimeValue(Number(e.target.value))} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Einheit</label>
                        <select value={leadTimeUnit} onChange={e => setLeadTimeUnit(e.target.value as 'hours'|'days')} className="w-full p-1.5 text-sm border border-gray-300 rounded">
                          <option value="days">Tage</option>
                          <option value="hours">Stunden</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <label className="flex items-center text-sm font-bold text-purple-900 mt-2">
                    <input type="checkbox" checked={isDueNextMeeting} onChange={e => setIsDueNextMeeting(e.target.checked)} className="w-4 h-4 mr-2" />
                    Automatisch fällig zur NÄCHSTEN Sitzung
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="border border-indigo-100 rounded-lg overflow-hidden">
            <button onClick={() => setShowRoutine(!showRoutine)} className="w-full p-2 bg-indigo-50 text-indigo-800 text-xs font-bold flex justify-between items-center hover:bg-indigo-100">
              <span>🔄 Wiederholung / Routine {isRoutine ? '(Aktiv)' : ''}</span>
              {showRoutine ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {showRoutine && (
              <div className="p-3 bg-white space-y-3">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={isRoutine} onChange={e => setIsRoutine(e.target.checked)} className="w-4 h-4 mr-2" />
                  Ist eine wiederkehrende Routine
                </label>
                {isRoutine && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Intervall</label>
                      <select value={routinePattern} onChange={e => setRoutinePattern(e.target.value as any)} className="w-full p-1.5 text-sm border border-gray-300 rounded">
                        <option value="every_meeting">Bei jeder Sitzung</option>
                        <option value="weekly">Wöchentlich</option>
                        <option value="monthly">Monatlich</option>
                        <option value="quarterly">Quartalsweise</option>
                        <option value="yearly">Jährlich</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Endet am (Leer = Ohne Ende)</label>
                      <input type="date" min={todayStr} value={routineEndDateStr} onChange={e => setRoutineEndDateStr(e.target.value)} className="w-full p-1.5 text-sm border border-gray-300 rounded" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          {error && <span className="text-red-600 text-sm flex-1">{error}</span>}
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button onClick={handleSave} disabled={isSubmitting} className="flex items-center px-5 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm">
            <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 308