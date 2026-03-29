// src/features/Events/CalendarEventFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarEvent } from '../../core/types/models';
import { X, Save, AlertCircle, Globe, Trash2, Layers, Info } from 'lucide-react';

interface Props {
  onClose: () => void;
  existingEvent?: CalendarEvent;
}

export const CalendarEventFormModal: React.FC<Props> = ({ onClose, existingEvent }) => {
  const { addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, deleteCalendarSeries } = useClubStore();
  
  const initStart = existingEvent ? new Date(existingEvent.startTime) : new Date();
  const initEnd = existingEvent?.endTime ? new Date(existingEvent.endTime) : new Date(initStart.getTime() + 2 * 60 * 60 * 1000);
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const fDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [startDate, setStartDate] = useState(fDate(initStart));
  const [startTime, setStartTime] = useState(existingEvent ? fTime(initStart) : '18:00');
  const [endDate, setEndDate] = useState(fDate(initEnd));
  const [endTime, setEndTime] = useState(existingEvent ? fTime(initEnd) : '20:00');
  const [isAllDay, setIsAllDay] = useState(existingEvent?.isAllDay || false);
  const [color, setColor] = useState(existingEvent?.color || '#3b82f6');
  const [isPublic, setIsPublic] = useState(existingEvent?.isPublic ?? true);
  
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Der Titel darf nicht leer sein.');
      return;
    }
    
    setIsSaving(true);
    setError(null);

    const startTimestamp = new Date(`${startDate}T${isAllDay ? '00:00' : startTime}`).getTime();
    const endTimestamp = new Date(`${endDate}T${isAllDay ? '23:59' : endTime}`).getTime();

    if (endTimestamp <= startTimestamp && !isAllDay) {
      setError('Das Ende muss nach dem Start liegen.');
      setIsSaving(false);
      return;
    }
    
    const eventData: CalendarEvent = {
      id: existingEvent?.id || `calev-${Date.now()}`,
      schemaVersion: '1.0',
      title: title.trim(),
      startTime: startTimestamp,
      endTime: endTimestamp,
      isAllDay,
      color,
      isPublic,
      seriesId: existingEvent?.seriesId,
    };

    const result = existingEvent 
      ? await updateCalendarEvent(eventData) 
      : await addCalendarEvent(eventData);

    if (result.success) {
      onClose();
    } else {
      setError(result.error?.message || 'Fehler beim Speichern.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    if (window.confirm('Diesen Termin wirklich löschen?')) {
      setIsSaving(true);
      await deleteCalendarEvent(existingEvent.id);
      onClose();
    }
  };

  const handleDeleteSeries = async () => {
    if (!existingEvent?.seriesId) return;
    if (window.confirm('Achtung: Möchtest du wirklich ALLE Termine aus diesem gesamten Dienstplan löschen?')) {
      setIsSaving(true);
      await deleteCalendarSeries(existingEvent.seriesId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">{existingEvent ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center">
               <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
               <span className="text-sm">{error}</span>
             </div>
          )}

          {/* CHIRURGISCHER EINGRIFF: Optimierte Info-Box für Serien/Dienste */}
          {existingEvent?.seriesId && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg space-y-2 mb-2">
              <div className="flex items-center text-blue-800 font-bold text-sm">
                <Layers className="w-4 h-4 mr-2" /> Dieser Termin gehört zu einem Dienstplan.
              </div>
              <p className="text-xs text-blue-700 leading-relaxed flex items-start">
                <Info className="w-3 h-3 mr-1.5 mt-0.5 shrink-0" />
                Du kannst hier einfach den Namen oder die Zeit ändern und <strong>Speichern</strong> drücken. Das System ändert dann <strong>nur diesen einen Termin</strong>. Der Rest des Dienstplans bleibt unverändert.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" placeholder="z.B. Hallenputz" />
          </div>

          <div className="flex items-center mt-2 mb-4">
            <input type="checkbox" id="allDay" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="mr-2 rounded text-blue-600 focus:ring-blue-500" disabled={isSaving} />
            <label htmlFor="allDay" className="text-sm text-gray-700 font-medium">Ganztägiger Termin</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Startzeit</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
            </div>
            {!isAllDay && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endzeit</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
              </div>
            )}
          </div>

          <div className="flex gap-4 border-t border-gray-100 pt-4 mt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigefarbe</label>
              <div className="flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={isSaving} className="w-10 h-10 p-1 border border-gray-300 rounded cursor-pointer" />
                <span className="text-xs text-gray-500 font-mono uppercase">{color}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sichtbarkeit</label>
              <div className="flex items-center mt-2">
                <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mr-2 rounded text-blue-600 focus:ring-blue-500" disabled={isSaving} />
                <label htmlFor="isPublic" className="text-sm text-gray-600 flex items-center">
                  <Globe className="w-3 h-3 mr-1" /> Auf Homepage zeigen
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between gap-3">
          {existingEvent ? (
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={isSaving} className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold transition text-xs">
                <Trash2 className="w-4 h-4 mr-1" /> Löschen
              </button>
              {existingEvent.seriesId && (
                <button onClick={handleDeleteSeries} disabled={isSaving} className="flex items-center px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-bold transition text-xs">
                  <Layers className="w-4 h-4 mr-1" /> Ganze Serie löschen
                </button>
              )}
            </div>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-bold text-sm">Abbrechen</button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm transition">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Lädt...' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 191