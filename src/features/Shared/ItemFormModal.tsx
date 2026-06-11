// [2026-06-01] - BUGFIX: 'undefined' Bug bei abgewählten Checkboxen behoben. Wenn WhatsApp-Erinnerungen, Routinen oder Fälligkeitsdaten deaktiviert wurden, hat der Payload-Filter (undefined-Strip) verhindert, dass die Werte in Firestore gelöscht wurden. Sie werden nun explizit als 'null' übergeben, um die Felder in der Datenbank zu leeren.
// [2026-06-01] - BUGFIX: WhatsApp-Narrensicherung (Poka-Yoke) strikt auf E-Mail-Abgleich korrigiert. Der fehleranfällige Namens-Check wurde auf PO-Wunsch entfernt. Die Automatik greift nur noch, wenn die E-Mail des Gast-Users keinem App-User zugeordnet werden kann.
// [2026-06-01] - UX-FIX: Container-Wächter integriert. Zeigt eine Warnung (window.confirm) an, wenn man einen Hauptpunkt mit 100% speichern will, dessen Unterpunkte noch offen sind.
// [2026-06-01] - UX-FIX: "Tage DANACH" für Unteraufgaben wieder ins Dropdown aufgenommen. Das paradoxe Endlos-Klonen ist durch die neue Container-Architektur der Routine-Engine behoben.
// [2026-06-01] - UX-FIX: Anzeige des echten Erledigungsdatums (completedAt) im Modal integriert. Wird unter der 100% Fortschrittsanzeige in Grün eingeblendet.
// [2026-06-01] - BUGFIX: WhatsApp-Automatik entschärft. Greift exakt einmal (via useRef), Nutzer kann sie danach frei ausschalten.
// [2026-05-25] - UX-FIX: Wenn der Oberpunkt auf "Nächste Sitzung" steht (kein fixes Datum hat), zeigt das Unterpunkt-Formular nun glasklar "Vorschau: Nächste Sitzung" und speichert kein hartes Fallback-Datum mehr.
// [2026-05-23] - UX-FIX: UI-Verriegelung für Routinen bei Unterpunkten. Unterpunkte erben den Rhythmus vom Oberpunkt und können keine eigenen Routinen mehr definieren.
// [2026-05-16] - UX-FIX: Standardbreite beim ersten Öffnen auf 950px angehoben und max-w-2xl auf max-w-5xl erweitert für ein großzügiges Zwei-Spalten-Layout.
// 2026-05-12 16:15 - FEATURE: WhatsApp Reminder für alle Typen außer VORLAGE freigeschaltet.
// 2026-05-12 16:25 - UX-FEATURE: Mouse-over Tips & dynamische Erklärungs-Texte für AGENDA vs. INFO eingebaut.
// 2026-05-12 17:50 - REFACTOR: Entfernung des redundanten Typs 'VORLAGE'. Vorlagen behalten nun ihren echten semantischen Typ.
// 2026-05-12 19:20 - FEATURE: Participation-First Integration. Übergabe der eventId an AssigneePicker.
// src/features/Shared/ItemFormModal.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useClubStore } from '../../store/useClubStore';
import type { AgendaItem, ItemType, ItemStatus } from '../../core/types/models';
import { X, Save, ChevronLeft, Copy, Calendar, FolderTree, CheckCircle2 } from 'lucide-react';
import { RichTextEditor } from './RichText';

// Import der neuen Sub-Komponenten
import { AssigneePicker } from './components/ItemForm/AssigneePicker';
import { RoutineSettings } from './components/ItemForm/RoutineSettings';
import { ReminderSettings } from './components/ItemForm/ReminderSettings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AgendaItem>) => Promise<void>;
  existingItem?: Partial<AgendaItem>;
  parentItemContext?: Partial<AgendaItem>; 
  onNavigateToParent?: () => void;
  returnItemContext?: Partial<AgendaItem>;
  onNavigateBack?: () => void;         
  isFixedType?: boolean;
  isReadOnly?: boolean;
  onDurationPreview?: (val: number) => void; 
}

export const ItemFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, existingItem, parentItemContext, onNavigateToParent, returnItemContext, onNavigateBack, isFixedType, isReadOnly = false, onDurationPreview }) => {
  const { events, user, eventAgenda, saveItemAsTemplateWithChildren, helpers, users } = useClubStore();
  const navigate = useNavigate(); 
  
  const parentEvent = existingItem?.eventId ? events.find(e => e.id === existingItem.eventId) : null;
  const projectColor = parentEvent ? (parentEvent as any).color : undefined;
  const isProtocolMode = parentEvent?.status === 'AKTIV' || parentEvent?.status === 'ABGESCHLOSSEN';
  const isSubtask = !!parentItemContext || !!existingItem?.isSubItem;

  const [type, setType] = useState<ItemType>(existingItem?.type === 'VORLAGE' ? 'AGENDA' : (existingItem?.type || (isProtocolMode ? 'INFO' : 'AGENDA')));
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [requestedBy, setRequestedBy] = useState(existingItem?.requestedBy || ((!existingItem?.id || existingItem?.title === '') && user?.name ? user.name : ''));
  const [durationEstimate, setDurationEstimate] = useState<number>(existingItem?.durationEstimate || 15);
  const [isDueNextMeeting, setIsDueNextMeeting] = useState(existingItem?.id !== undefined ? (existingItem.isDueNextMeeting || false) : isProtocolMode);
  
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(existingItem?.assigneeUserIds || []);
  const [assigneeGroupIds] = useState<string[]>(existingItem?.assigneeGroupIds || []);
  const [assigneeHelperIds, setAssigneeHelperIds] = useState<string[]>(existingItem?.assigneeHelperIds || []);

  const [status, setStatus] = useState<ItemStatus>(existingItem?.status || 'OFFEN');
  const [progress, setProgress] = useState<number>(existingItem?.progress || 0);
  
  const [reminderSenderUserId, setReminderSenderUserId] = useState(existingItem?.reminderSenderUserId || '');
  const [reminderLeadDays, setReminderLeadDays] = useState(existingItem?.reminderLeadDays?.toString() || '7');

  const [dueDateStr, setDueDateStr] = useState(
    existingItem?.dueDate 
      ? new Date(existingItem.dueDate).toISOString().substring(0,10) 
      : (parentEvent?.plannedStartTime && !isProtocolMode ? new Date(parentEvent.plannedStartTime).toISOString().substring(0,10) : '')
  );

  const [leadTimeUnit, setLeadTimeUnit] = useState<'days_before' | 'days_after' | 'same_day'>(
    existingItem?.leadTimeUnit || 'same_day'
  );
  const [leadTimeValue, setLeadTimeValue] = useState<number>(existingItem?.leadTimeValue || 1);
  
  const [routinePattern, setRoutinePattern] = useState<'none' | 'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'>(
    existingItem?.isRoutine ? (existingItem.routinePattern || 'every_meeting') : 'none'
  );
  const [routineEndDateStr, setRoutineEndDateStr] = useState(existingItem?.routineEndDate ? new Date(existingItem.routineEndDate).toISOString().substring(0,10) : '');

  const isRoutine = routinePattern !== 'none';
  const [approvedBy, setApprovedBy] = useState<string[]>(existingItem?.approvedBy || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const todayStr = new Date().toISOString().substring(0, 10);
  const modalRef = useRef<HTMLDivElement>(null);

  const hasAutoSetReminder = useRef(false);

  useEffect(() => {
    if (!modalRef.current || window.innerWidth < 768) return; 
    const savedWidth = localStorage.getItem('papatodo_modal_width');
    const savedHeight = localStorage.getItem('papatodo_modal_height');
    
    if (savedWidth) modalRef.current.style.width = savedWidth;
    else modalRef.current.style.width = '950px'; 
    if (savedHeight) modalRef.current.style.height = savedHeight;

    let timeout: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (modalRef.current) {
          if (modalRef.current.style.width) localStorage.setItem('papatodo_modal_width', modalRef.current.style.width);
          if (modalRef.current.style.height) localStorage.setItem('papatodo_modal_height', modalRef.current.style.height);
        }
      }, 500); 
    });
    if (modalRef.current) observer.observe(modalRef.current);
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, []);

  const hasTrulyExternalHelper = useMemo(() => {
    if (!helpers || !users || assigneeHelperIds.length === 0) return false;
    
    return assigneeHelperIds.some(helperId => {
      const helperObj = helpers.find(h => h.id === helperId);
      if (!helperObj) return false;
      
      if (helperObj.hasAppAccess) return false; 
      
      if (helperObj.email && helperObj.email.trim() !== '') {
        const matchedUser = users.find(u => u.email && u.email.toLowerCase() === helperObj.email.toLowerCase());
        if (matchedUser) return false; 
      }
      
      return true; 
    });
  }, [assigneeHelperIds, helpers, users]);

  useEffect(() => {
    if (hasTrulyExternalHelper && !reminderSenderUserId && user?.id && !hasAutoSetReminder.current) {
      setReminderSenderUserId(user.id);
      setReminderLeadDays('7');
      hasAutoSetReminder.current = true; 
    }
  }, [hasTrulyExternalHelper, reminderSenderUserId, user]);

  if (!isOpen) return null;

  const calculatePreviewDate = (baseDateMs: number | undefined, unit: string, val: number) => {
    if (!baseDateMs) {
      if (unit === 'same_day') return "Nächste Sitzung";
      if (unit === 'days_before') return `${val} Tage VOR nächster Sitzung`;
      if (unit === 'days_after') return `${val} Tage NACH nächster Sitzung`; 
      return "";
    }
    const d = new Date(baseDateMs);
    if (unit === 'days_before') d.setDate(d.getDate() - val);
    if (unit === 'days_after') d.setDate(d.getDate() + val); 
    return d.toLocaleDateString();
  };

  const toggleArray = (arr: string[], setArr: (val: string[]) => void, id: string) => {
    if (arr.includes(id)) setArr(arr.filter(x => x !== id));
    else setArr([...arr, id]);
  };

  const handleSaveAsTemplate = async () => {
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    try {
      setIsSubmitting(true);
      const payload: Partial<AgendaItem> = {
        type: type, 
        title: title.trim(), description: description.trim(),
        requestedBy: requestedBy.trim(), durationEstimate,
        assigneeUserIds, assigneeGroupIds, assigneeHelperIds,
        createdAt: Date.now(),
        reminderSenderUserId: reminderSenderUserId || null as any,
        reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : null as any,
        mustBeDoneBeforeEvent: false, 
      };

      if (!isSubtask) {
        payload.isRoutine = isRoutine;
        if (isRoutine) {
          payload.routinePattern = routinePattern as any;
          if (routineEndDateStr) payload.routineEndDate = new Date(routineEndDateStr).getTime();
        }
      } else {
        payload.isRoutine = false;
      }
      
      if (type === 'AUFGABE' && isSubtask) {
        payload.leadTimeUnit = leadTimeUnit;
        payload.leadTimeValue = leadTimeUnit === 'same_day' ? 0 : leadTimeValue;
      }
      
      const safePayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Partial<AgendaItem>;
      const children = existingItem?.id ? eventAgenda.filter(i => i.isSubItem && i.parentItemId === existingItem.id) : [];
      await saveItemAsTemplateWithChildren(safePayload as AgendaItem, children);
      alert('Erfolgreich als neue Vorlage gespeichert!');
    } catch (err: any) { setError(err.message || 'Fehler beim Speichern der Vorlage.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    if (type === 'AUFGABE' && assigneeHelperIds.length > 0 && assigneeUserIds.length === 0) {
      setError('Bitte weise zusätzlich einen App-Nutzer zu. Dieser ist dafür verantwortlich, den externen Helfer zu informieren.');
      return;
    }

    if (!isSubtask && type === 'AUFGABE' && progress === 100 && existingItem?.id) {
      const children = eventAgenda.filter(i => i.isSubItem && i.parentItemId === existingItem.id);
      const openChildren = children.filter(c => c.progress !== 100 && c.status !== 'ERLEDIGT' && c.status !== 'TRASH');
      
      if (openChildren.length > 0) {
        const childNames = openChildren.slice(0, 3).map(c => c.title).join(', ');
        const extra = openChildren.length > 3 ? ' ...' : '';
        const confirmed = window.confirm(
          `Achtung: Es sind noch ${openChildren.length} Unterpunkte offen (${childNames}${extra}).\n\nMöchtest du den Hauptpunkt wirklich abschließen?`
        );
        if (!confirmed) {
          return; 
        }
      }
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<AgendaItem> = {
        type, title: title.trim(), description: description.trim(),
        requestedBy: requestedBy.trim(), durationEstimate,
        assigneeUserIds, assigneeGroupIds, assigneeHelperIds,
        // CHIRURGISCHER EINGRIFF: Explizit `null` übergeben, damit Firestore das Feld wirklich löscht
        reminderSenderUserId: reminderSenderUserId || null as any,
        reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : null as any,
      };
      if (existingItem?.id) payload.id = existingItem.id;
      
      if (type === 'AUFGABE') {
        if (isSubtask) {
          payload.leadTimeUnit = leadTimeUnit;
          payload.leadTimeValue = leadTimeUnit === 'same_day' ? 0 : leadTimeValue;
          payload.mustBeDoneBeforeEvent = false;
          payload.isDueNextMeeting = false;
          
          if (parentItemContext?.dueDate) {
            const baseDate = new Date(parentItemContext.dueDate);
            if (leadTimeUnit === 'same_day') payload.dueDate = baseDate.getTime();
            else if (leadTimeUnit === 'days_before') { baseDate.setDate(baseDate.getDate() - payload.leadTimeValue); payload.dueDate = baseDate.getTime(); }
            else if (leadTimeUnit === 'days_after') { baseDate.setDate(baseDate.getDate() + payload.leadTimeValue); payload.dueDate = baseDate.getTime(); } 
          } else {
            payload.dueDate = null as any;
          }
        } else {
          payload.isDueNextMeeting = isDueNextMeeting;
          payload.mustBeDoneBeforeEvent = false;
        }
        
        payload.status = status;
        payload.progress = progress;
        if (!isSubtask) {
          if (dueDateStr && !isDueNextMeeting) payload.dueDate = new Date(dueDateStr).getTime();
          // CHIRURGISCHER EINGRIFF: Fälligkeitsdatum sauber auf null setzen
          if (isDueNextMeeting || !dueDateStr) payload.dueDate = null as any;
        }
        payload.reminderSentAt = existingItem?.reminderSentAt;
      }
      
      if (isSubtask) {
        // CHIRURGISCHER EINGRIFF: Routinen bei Unterpunkten sauber löschen
        payload.isRoutine = false;
        payload.routinePattern = null as any;
        payload.routineEndDate = null as any;
      } else {
        payload.isRoutine = isRoutine;
        if (isRoutine) {
          payload.routinePattern = routinePattern as any;
          if (routineEndDateStr) payload.routineEndDate = new Date(routineEndDateStr).getTime();
          else payload.routineEndDate = null as any;
        } else {
          // CHIRURGISCHER EINGRIFF: Routinen-Werte komplett aufräumen, wenn abgewählt
          payload.routinePattern = null as any;
          payload.routineEndDate = null as any;
        }
      }
      
      if (type === 'BESCHLUSS') payload.approvedBy = approvedBy;
      
      // Filter ignoriert undefined, lässt null aber durch!
      const safePayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Partial<AgendaItem>;
      await onSave(safePayload);
      
      if (type === 'AUFGABE' && !isSubtask && isRoutine && progress === 100 && existingItem?.progress !== 100) {
        alert('Danke, ich habe die neue Routineaufgabe für das nächste Intervall angelegt.');
      }
    } catch (err: any) { setError(err.message || 'Fehler beim Speichern.'); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-xl w-full max-w-5xl md:max-w-[95vw] md:min-w-[500px] md:resize overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 shrink-0">{isReadOnly ? 'Details' : (existingItem?.id ? 'Bearbeiten' : 'Neuer Eintrag')}</h2>
            {parentEvent && (
              <div onClick={() => { onClose(); navigate(`/events/${parentEvent.id}`, { state: { targetItemId: existingItem?.id } }); }} className="text-[11px] font-bold px-2 py-1 rounded-md flex items-center border cursor-pointer hover:shadow-sm transition-all group shrink min-w-0" style={{ backgroundColor: projectColor ? `${projectColor}15` : '#eef2ff', color: projectColor || '#4338ca', borderColor: projectColor ? `${projectColor}30` : '#e0e7ff' }}>
                <Calendar className="w-3 h-3 mr-1.5 shrink-0 group-hover:scale-110 transition-transform" /> 
                <span className="truncate hidden sm:inline">Ursprung: <span className="underline underline-offset-2">{parentEvent.title}</span></span>
                <span className="truncate sm:hidden">{parentEvent.title}</span>
              </div>
            )}
            {returnItemContext ? (
              <div onClick={() => onNavigateBack && onNavigateBack()} className="text-[11px] font-bold px-2 py-1 rounded-md flex items-center border bg-emerald-50 border-emerald-200 text-emerald-800 shadow-sm cursor-pointer hover:bg-emerald-100 transition-all group shrink min-w-0">
                <ChevronLeft className="w-3 h-3 mr-1 shrink-0 text-emerald-600 group-hover:-translate-x-1 transition-transform" />
                <span className="truncate hidden sm:inline">Zurück zu: <span className="underline underline-offset-2">{returnItemContext.title}</span></span>
                <span className="truncate sm:hidden">{returnItemContext.title}</span>
              </div>
            ) : parentItemContext ? (
              <div onClick={() => onNavigateToParent && onNavigateToParent()} className="text-[11px] font-bold px-2 py-1 rounded-md flex items-center border bg-blue-50 border-blue-200 text-blue-800 shadow-sm cursor-pointer hover:bg-blue-100 transition-all group shrink min-w-0">
                <FolderTree className="w-3 h-3 mr-1 shrink-0 text-blue-600" />
                <span className="truncate hidden sm:inline">Gehört zu: <span className="underline underline-offset-2">{parentItemContext.title}</span></span>
                <span className="truncate sm:hidden">{parentItemContext.title}</span>
              </div>
            ) : null}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Titel {parentItemContext ? '(Unterpunkt)' : '*'} </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isReadOnly} className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 font-bold disabled:bg-gray-50" autoFocus={!isReadOnly} required />
            </div>
            <div className="md:w-48 flex flex-col shrink-0">
              <label className="block text-xs font-bold text-gray-700 mb-1">Typ</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as ItemType)} 
                disabled={isReadOnly || isFixedType} 
                className="w-full p-2 text-sm border border-blue-300 bg-blue-50 rounded font-bold text-blue-800 disabled:opacity-80 shadow-sm"
              >
                <option value="AGENDA" title="Arbeitspunkt: Diskussion & Entscheidung, benötigt Zeit.">AGENDA (A:)</option>
                <option value="INFO" title="Kenntnisnahme: Reiner Wissenstransfer, keine Diskussion.">INFO (I:)</option>
                <option value="BESCHLUSS" title="Entscheidung festhalten.">BESCHLUSS</option>
                <option value="AUFGABE" title="Konkretes To-Do mit Verantwortlichen und Termin.">AUFGABE</option>
              </select>

              {!isReadOnly && (type === 'AGENDA' || type === 'INFO') && (
                <div className={`mt-2 p-2 rounded text-[10px] leading-tight border animate-in fade-in slide-in-from-top-1 ${type === 'AGENDA' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                  {type === 'AGENDA' ? (
                    <><strong>Arbeitspunkt:</strong> Aktive Diskussion & Problemlösung. Erwartet Mitdenken der Teilnehmer.</>
                  ) : (
                    <><strong>Kenntnisnahme:</strong> Reiner Wissenstransfer. Keine Diskussion erwünscht, nur Zuhören.</>
                  )}
                </div>
              )}

              {!isReadOnly && !existingItem?.isTemplate && (
                <button onClick={handleSaveAsTemplate} disabled={isSubmitting} className="mt-2 flex items-center justify-center text-[10px] text-blue-600 font-bold hover:bg-blue-50 p-0.5 rounded border border-transparent hover:border-blue-200 transition-colors">
                  <Copy className="w-3 h-3 mr-1" /> Als Vorlage speichern
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung / Notizen</label>
            <RichTextEditor value={description} onChange={setDescription} disabled={isReadOnly} placeholder="Füge eine Beschreibung oder Notizen hinzu..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50/50 p-2.5 rounded-lg border border-gray-200/60">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Dauer (Min)</label>
              <input type="number" value={durationEstimate} onChange={e => { const val = Number(e.target.value); setDurationEstimate(val); if (onDurationPreview) onDurationPreview(val); }} disabled={isReadOnly} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white font-medium disabled:bg-gray-50" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-700 mb-1">Eingebracht von</label>
              <input type="text" value={requestedBy} onChange={e => setRequestedBy(e.target.value)} disabled={isReadOnly} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white font-medium disabled:bg-gray-50" />
            </div>
            <div className="col-span-1 md:col-span-2 flex flex-col">
              {!isSubtask ? (
                <RoutineSettings 
                  routinePattern={routinePattern} setRoutinePattern={setRoutinePattern}
                  routineEndDateStr={routineEndDateStr} setRoutineEndDateStr={setRoutineEndDateStr}
                  isReadOnly={isReadOnly} todayStr={todayStr}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-indigo-50/50 border border-indigo-100 rounded text-indigo-700 text-[11px] p-2 text-center">
                  <span className="font-bold">Automatischer Rhythmus</span>
                  <span className="opacity-80">Wird vom Oberpunkt gesteuert</span>
                </div>
              )}
            </div>
          </div>

          <AssigneePicker 
            assigneeUserIds={assigneeUserIds} setAssigneeUserIds={setAssigneeUserIds}
            assigneeHelperIds={assigneeHelperIds} setAssigneeHelperIds={setAssigneeHelperIds}
            isReadOnly={isReadOnly}
            eventId={existingItem?.eventId || parentItemContext?.eventId}
          />

          {type === 'AUFGABE' && (
            <div className="rounded-xl border bg-orange-50/50 border-orange-200">
              <div className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Fortschritt ({progress}%) - <span className={progress === 100 ? 'text-green-600' : 'text-orange-600'}>{progress === 0 ? 'Offen' : (progress === 100 ? 'Erledigt' : 'In Arbeit')}</span></label>
                    <input type="range" min="0" max="100" step="10" value={progress} onChange={e => { const val = Number(e.target.value); setProgress(val); setStatus(val === 0 ? 'OFFEN' : (val === 100 ? 'ERLEDIGT' : 'IN_ARBEIT')); }} disabled={isReadOnly} className="w-full accent-orange-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                    {progress === 100 && existingItem?.completedAt && (
                        <div className="text-[11px] font-bold text-green-600 flex items-center mt-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Erledigt am: {new Date(existingItem.completedAt).toLocaleDateString()}
                        </div>
                    )}
                  </div>
                  
                  {!isSubtask ? (
                    <>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Fällig am</label>
                        <input type="date" min={todayStr} value={dueDateStr} onChange={e => { setDueDateStr(e.target.value); setIsDueNextMeeting(false); }} disabled={isReadOnly} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white disabled:bg-gray-50 font-bold text-gray-800" />
                      </div>
                      <div className="col-span-1 pb-1">
                        <label className="flex items-center text-xs font-bold cursor-pointer transition-colors text-orange-900 hover:text-orange-700">
                          <input type="checkbox" checked={isDueNextMeeting} onChange={e => { setIsDueNextMeeting(e.target.checked); if(e.target.checked) setDueDateStr(''); }} disabled={isReadOnly} className="w-4 h-4 mr-2 accent-orange-500" /> Auto. nächste Sitzung fällig
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-800 mb-1 truncate">Abweichung (Haupttermin)</label>
                        <div className="flex gap-2 items-center">
                          <select value={leadTimeUnit} onChange={(e) => setLeadTimeUnit(e.target.value as any)} disabled={isReadOnly} className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white disabled:bg-gray-50 font-bold text-gray-800">
                            <option value="same_day">Am gleichen Tag</option>
                            <option value="days_before">Tage DAVOR</option>
                            <option value="days_after">Tage DANACH</option>
                          </select>
                          {leadTimeUnit !== 'same_day' && <input type="number" min="1" max="365" value={leadTimeValue} onChange={(e) => setLeadTimeValue(Number(e.target.value))} disabled={isReadOnly} className="w-16 p-1.5 text-sm border border-gray-300 rounded bg-white disabled:bg-gray-50 text-center font-bold" />}
                        </div>
                      </div>
                      <div className="col-span-1 pb-1">
                        <div className="text-[11px] font-medium text-gray-600 bg-white/50 p-1.5 rounded border border-gray-200/50 flex items-center h-[34px] overflow-hidden">
                          <span className="truncate w-full">
                            Vorschau: <strong className="text-gray-900">{calculatePreviewDate(parentItemContext?.dueDate, leadTimeUnit, leadTimeValue)}</strong>
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <ReminderSettings 
            reminderSenderUserId={reminderSenderUserId} setReminderSenderUserId={setReminderSenderUserId}
            reminderLeadDays={reminderLeadDays} setReminderLeadDays={setReminderLeadDays}
            assigneeUserIds={assigneeUserIds} isReadOnly={isReadOnly} type={type}
          />

          {type === 'BESCHLUSS' && (
            <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100">
              <label className="block text-xs font-bold text-purple-900 mb-2">Abgestimmt mit (Optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {useClubStore.getState().users.map(u => (
                  <label key={u.id} className="flex items-center p-1.5 bg-white border border-purple-200 rounded text-[11px] cursor-pointer hover:bg-purple-50 shadow-sm">
                    <input type="checkbox" disabled={isReadOnly} checked={approvedBy.includes(u.id)} onChange={() => toggleArray(approvedBy, setApprovedBy, u.id)} className="mr-1.5 accent-purple-600 w-3 h-3" />
                    <span className="font-medium">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 shrink-0">
          {error && <span className="text-red-600 text-xs font-bold flex-1 flex items-center">{error}</span>}
          <button onClick={onClose} disabled={isSubmitting} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded font-bold transition-colors">Abbrechen</button>
          {!isReadOnly && (
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center px-4 py-1.5 text-sm bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors">
              <Save className="w-4 h-4 mr-1.5" /> Speichern
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---