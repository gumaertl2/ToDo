// src/features/Shared/ItemFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { AgendaItem, ItemType, ItemStatus } from '../../core/types/models';
import { X, Save } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgendaItem>) => Promise<void>;
  existingItem?: Partial<AgendaItem>;
}

export const ItemFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, existingItem }) => {
  const { users, groups } = useClubStore();
  
  const [type, setType] = useState<ItemType>(existingItem?.type || 'VORLAGE');
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [requestedBy, setRequestedBy] = useState(existingItem?.requestedBy || '');
  const [durationEstimate, setDurationEstimate] = useState<number>(existingItem?.durationEstimate || 15);
  const [durationActual, setDurationActual] = useState<number>(existingItem?.durationActual || 0);

  // Kaskaden
  const [mustBeDoneBeforeEvent, setMustBeDoneBeforeEvent] = useState(existingItem?.mustBeDoneBeforeEvent || false);
  const [leadTimeValue, setLeadTimeValue] = useState<number>(existingItem?.leadTimeValue || 1);
  const [leadTimeUnit, setLeadTimeUnit] = useState<'hours' | 'days'>(existingItem?.leadTimeUnit || 'days');
  
  // Zuweisungen
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(existingItem?.assigneeUserIds || []);
  const [assigneeGroupIds, setAssigneeGroupIds] = useState<string[]>(existingItem?.assigneeGroupIds || []);

  // Aufgabe
  const [status, setStatus] = useState<ItemStatus>(existingItem?.status || 'OFFEN');
  const [progress, setProgress] = useState<number>(existingItem?.progress || 0);
  const [dueDateStr, setDueDateStr] = useState(existingItem?.dueDate ? new Date(existingItem.dueDate).toISOString().substring(0,10) : '');
  const [postponedToDateStr, setPostponedToDateStr] = useState(existingItem?.postponedToDate ? new Date(existingItem.postponedToDate).toISOString().substring(0,10) : '');
  const [reportingEventId, setReportingEventId] = useState(existingItem?.reportingEventId || '');

  // Beschluss
  const [approvedBy, setApprovedBy] = useState<string[]>(existingItem?.approvedBy || []);
  const [rejectedBy, setRejectedBy] = useState<string[]>(existingItem?.rejectedBy || []);
  const [abstainedBy, setAbstainedBy] = useState<string[]>(existingItem?.abstainedBy || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleArray = (arr: string[], setArr: (val: string[]) => void, id: string) => {
    if (arr.includes(id)) {
      setArr(arr.filter(x => x !== id));
    } else {
      setArr([...arr, id]);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!title || title.trim() === '') {
      setError('Bitte gib einen Titel ein. Dies ist ein Pflichtfeld.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const payload: Partial<AgendaItem> = {
        id: existingItem?.id,
        type,
        title: title.trim(),
        description: description.trim(),
        requestedBy: requestedBy.trim(),
        durationEstimate,
        durationActual,
      };

      if (type === 'AUFGABE' || type === 'VORLAGE') {
        payload.mustBeDoneBeforeEvent = mustBeDoneBeforeEvent;
        payload.leadTimeValue = leadTimeValue;
        payload.leadTimeUnit = leadTimeUnit;
        payload.assigneeUserIds = assigneeUserIds;
        payload.assigneeGroupIds = assigneeGroupIds;
      }

      if (type === 'AUFGABE') {
        payload.status = status;
        payload.progress = progress;
        payload.dueDate = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
        payload.postponedToDate = postponedToDateStr ? new Date(postponedToDateStr).getTime() : undefined;
        payload.reportingEventId = reportingEventId;
      }

      if (type === 'BESCHLUSS') {
        payload.approvedBy = approvedBy;
        payload.rejectedBy = rejectedBy;
        payload.abstainedBy = abstainedBy;
      }

      await onSave(payload);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Agenda-Baustein (Chamäleon)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Validierung nach unten verlegt */}

          {/* Basis-Felder (Immer sichtbar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Typ (Das Chamäleon)</label>
              <select value={type} onChange={e => setType(e.target.value as ItemType)} className="w-full p-2 border border-blue-300 rounded bg-blue-50 focus:ring-blue-500 font-bold text-blue-800">
                <option value="VORLAGE">VORLAGE (Routine/Standard)</option>
                <option value="AGENDA">AGENDA (Geplanter Punkt)</option>
                <option value="INFO">INFO (Reiner Informationspunkt)</option>
                <option value="BESCHLUSS">BESCHLUSS (Abstimmung)</option>
                <option value="AUFGABE">AUFGABE (To-Do / Kanban)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" rows={3}></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geplante Dauer (Min)</label>
              <input type="number" value={durationEstimate} onChange={e => setDurationEstimate(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tatsächliche Dauer (Min)</label>
              <input type="number" value={durationActual} onChange={e => setDurationActual(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Eingebracht von (Requested By)</label>
              <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
            </div>
          </div>

          {/* Sektion: Kaskaden & Zuweisung */}
          {(type === 'AUFGABE' || type === 'VORLAGE') && (
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg space-y-4">
              <h3 className="text-md font-bold text-purple-800">Reverse-Scheduling & Zuweisung</h3>
              <div className="flex items-center">
                <input type="checkbox" checked={mustBeDoneBeforeEvent} onChange={e => setMustBeDoneBeforeEvent(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                <span className="ml-2 text-sm font-medium text-gray-700">Muss VOR einem Event erledigt sein (Kaskade)</span>
              </div>
              
              {mustBeDoneBeforeEvent && (
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vorlauf</label>
                    <input type="number" value={leadTimeValue} onChange={e => setLeadTimeValue(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded" />
                  </div>
                  <div className="flex-1">
                    <select value={leadTimeUnit} onChange={e => setLeadTimeUnit(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded">
                      <option value="days">Tage</option>
                      <option value="hours">Stunden</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zuständige Ämter / Gruppen</label>
                <div className="flex flex-wrap gap-2">
                  {groups.map(g => (
                    <label key={g.id} className="flex items-center p-2 bg-white border border-gray-300 rounded cursor-pointer">
                      <input type="checkbox" checked={assigneeGroupIds.includes(g.id)} onChange={() => toggleArray(assigneeGroupIds, setAssigneeGroupIds, g.id)} className="mr-2" />
                      <span className="text-sm">{g.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zuständige Personen</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center p-2 bg-white border border-gray-300 rounded cursor-pointer">
                      <input type="checkbox" checked={assigneeUserIds.includes(u.id)} onChange={() => toggleArray(assigneeUserIds, setAssigneeUserIds, u.id)} className="mr-2" />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sektion: Aufgabe (Kanban) */}
          {type === 'AUFGABE' && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg space-y-4">
              <h3 className="text-md font-bold text-orange-800">Aufgaben-Details (Kanban)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ItemStatus)} className="w-full p-2 border border-gray-300 rounded font-bold">
                    <option value="OFFEN">Offen</option>
                    <option value="IN_ARBEIT">In Bearbeitung</option>
                    <option value="ERLEDIGT">Erledigt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fortschritt ({progress}%)</label>
                  <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} className="w-full mt-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fällig am (Due Date)</label>
                  <input type="date" value={dueDateStr} onChange={e => setDueDateStr(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verschoben auf (Postponed)</label>
                  <input type="date" value={postponedToDateStr} onChange={e => setPostponedToDateStr(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berichts-Sitzung (Event ID)</label>
                  <input type="text" value={reportingEventId} onChange={e => setReportingEventId(e.target.value)} className="w-full p-2 border border-gray-300 rounded" />
                </div>
              </div>
            </div>
          )}

          {/* Sektion: Beschluss */}
          {type === 'BESCHLUSS' && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-4">
              <h3 className="text-md font-bold text-green-800">Beschluss-Protokollierung</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zugestimmt (Approved By)</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center p-2 bg-white border border-green-300 rounded cursor-pointer">
                      <input type="checkbox" checked={approvedBy.includes(u.id)} onChange={() => toggleArray(approvedBy, setApprovedBy, u.id)} className="mr-2 text-green-600" />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Abgelehnt (Rejected By)</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center p-2 bg-white border border-red-300 rounded cursor-pointer">
                      <input type="checkbox" checked={rejectedBy.includes(u.id)} onChange={() => toggleArray(rejectedBy, setRejectedBy, u.id)} className="mr-2 text-red-600" />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enthalten (Abstained By)</label>
                <div className="flex flex-wrap gap-2">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center p-2 bg-white border border-gray-300 rounded cursor-pointer">
                      <input type="checkbox" checked={abstainedBy.includes(u.id)} onChange={() => toggleArray(abstainedBy, setAbstainedBy, u.id)} className="mr-2 text-gray-600" />
                      <span className="text-sm">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col gap-3">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold transition shadow-sm">
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'Speichert...' : 'Chamäleon Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
