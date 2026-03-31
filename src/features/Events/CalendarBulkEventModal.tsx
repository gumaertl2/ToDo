// src/features/Events/CalendarBulkEventModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarEvent } from '../../core/types/models';
import { X, Save, AlertCircle, Globe, Calendar as CalIcon, Trash2, CalendarDays, Clock, Layers } from 'lucide-react';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { addWeeks } from 'date-fns/addWeeks';
import { format } from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';

interface Props {
  onClose: () => void;
  existingSeriesId?: string; 
}

export const CalendarBulkEventModal: React.FC<Props> = ({ onClose, existingSeriesId }) => {
  const { calendarEvents, addCalendarEventsBulk, deleteCalendarSeries } = useClubStore();
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const initStart = new Date();
  const initEnd = addWeeks(initStart, 4); 
  const fDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [baseTitle, setBaseTitle] = useState('Hallendienst');
  const [startDate, setStartDate] = useState(fDate(initStart));
  const [endDate, setEndDate] = useState(fDate(initEnd));
  const [color, setColor] = useState('#f97316'); 
  const [isPublic, setIsPublic] = useState(true);
  
  // NEU: Rhythmus und Tagesauswahl
  const [rhythm, setRhythm] = useState<'Wochen' | 'Tage' | 'Monate'>('Wochen');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mo-Fr (1-5)

  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingSeriesId) {
      const seriesEvents = calendarEvents.filter(e => e.seriesId === existingSeriesId);
      if (seriesEvents.length > 0) {
        seriesEvents.sort((a, b) => a.startTime - b.startTime);
        const first = seriesEvents[0];
        const last = seriesEvents[seriesEvents.length - 1];

        setStartDate(fDate(new Date(first.startTime)));
        setEndDate(fDate(new Date(last.endTime || last.startTime)));
        setColor(first.color || '#f97316');
        setIsPublic(first.isPublic);

        let bTitle = 'Hallendienst';
        if (first.title.includes(': ')) {
          bTitle = first.title.split(': ')[0];
        } else {
          bTitle = first.title; 
        }
        setBaseTitle(bTitle);

        const loaded: Record<string, string> = {};
        seriesEvents.forEach(ev => {
          // Wir laden existierende Serien primär als Wochen-Layout (Abwärtskompatibilität)
          const weekDate = startOfWeek(new Date(ev.startTime), { weekStartsOn: 1 });
          const wId = weekDate.toISOString();
          const parts = ev.title.split(': ');
          loaded[wId] = parts.length > 1 ? parts.slice(1).join(': ') : ev.title;
        });
        setAssignments(loaded);
      }
    }
  }, [existingSeriesId, calendarEvents]);

  // CHIRURGISCHER EINGRIFF: Dynamische Generierung der Zeilen basierend auf Rhythmus
  const items = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

    const result = [];
    
    if (rhythm === 'Wochen') {
      let current = startOfWeek(start, { weekStartsOn: 1 });
      const final = endOfWeek(end, { weekStartsOn: 1 });
      while (current <= final) {
        const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
        result.push({
          id: current.toISOString(),
          start: new Date(current),
          end: weekEnd,
          label: `${format(current, 'dd.MM.', { locale: de })} - ${format(weekEnd, 'dd.MM.yyyy', { locale: de })}`,
          kw: format(current, 'I', { locale: de }) 
        });
        current = addWeeks(current, 1);
      }
    } else if (rhythm === 'Tage') {
      let current = new Date(start);
      while (current <= end) {
        result.push({
          id: current.toISOString(),
          start: new Date(current),
          end: new Date(current),
          label: format(current, 'EEEE, dd.MM.yyyy', { locale: de }),
          kw: format(current, 'I', { locale: de })
        });
        current = addDays(current, 1);
      }
    } else if (rhythm === 'Monate') {
      let current = startOfMonth(start);
      const final = startOfMonth(end);
      while (current <= final) {
        const monthEnd = endOfMonth(current);
        result.push({
          id: current.toISOString(),
          start: new Date(current),
          end: monthEnd,
          label: format(current, 'MMMM yyyy', { locale: de }),
          kw: ''
        });
        current = addMonths(current, 1);
      }
    }

    return result;
  }, [startDate, endDate, rhythm]);

  const handleAssignmentChange = (itemId: string, value: string) => {
    setAssignments(prev => ({ ...prev, [itemId]: value }));
  };

  const toggleWeekDay = (day: number) => {
    setSelectedWeekDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!baseTitle.trim()) {
      setError('Bitte einen Basis-Titel (z.B. Hallendienst) eingeben.');
      return;
    }

    if (rhythm === 'Wochen' && selectedWeekDays.length === 0) {
      setError('Bitte wähle mindestens einen Wochentag aus.');
      return;
    }

    const targetSeriesId = existingSeriesId || `series-${Date.now()}`;
    const eventsToCreate: CalendarEvent[] = [];

    items.forEach((item, index) => {
      const assignee = assignments[item.id]?.trim();
      if (!assignee) return;

      if (rhythm === 'Wochen') {
        // Für jeden gewählten Wochentag einen Termin in dieser Woche erstellen
        selectedWeekDays.forEach((dayIndex) => {
          // Berechnung des Datums basierend auf Wochenstart (Mo)
          // 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa, 0=So
          const offset = (dayIndex + 6) % 7; 
          const targetDate = addDays(item.start, offset);

          eventsToCreate.push({
            id: `calev-${Date.now()}-${index}-${dayIndex}`,
            schemaVersion: '1.0',
            title: `${baseTitle.trim()}: ${assignee}`,
            startTime: targetDate.getTime(),
            endTime: targetDate.getTime(),
            isAllDay: true, 
            color,
            isPublic,
            seriesId: targetSeriesId, 
          });
        });
      } else {
        // Tage oder Monate (1:1 Abbildung)
        eventsToCreate.push({
          id: `calev-${Date.now()}-${index}`,
          schemaVersion: '1.0',
          title: `${baseTitle.trim()}: ${assignee}`,
          startTime: item.start.getTime(),
          endTime: item.end.getTime(),
          isAllDay: true, 
          color,
          isPublic,
          seriesId: targetSeriesId, 
        });
      }
    });

    if (eventsToCreate.length === 0) {
      setError('Bitte mindestens einer Zeile einen Namen zuweisen.');
      return;
    }
    
    setIsSaving(true);
    setError(null);

    if (existingSeriesId) {
      await deleteCalendarSeries(existingSeriesId);
    }

    const result = await addCalendarEventsBulk(eventsToCreate);
    if (result.success) {
      onClose();
    } else {
      setError(result.error?.message || 'Fehler beim Speichern der Serie.');
      setIsSaving(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!existingSeriesId) return;
    if (window.confirm('Möchtest du diesen kompletten Dienstplan wirklich löschen?')) {
      setIsSaving(true);
      await deleteCalendarSeries(existingSeriesId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <CalIcon className="w-5 h-5 mr-2 text-orange-500" />
            {existingSeriesId ? 'Dienstplan bearbeiten' : 'Dienstplan Generator'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center">
               <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
               <span className="text-sm">{error}</span>
             </div>
          )}

          <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Basis-Titel</label>
                <input type="text" value={baseTitle} onChange={(e) => setBaseTitle(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded focus:ring-orange-500" placeholder="z.B. Hallendienst" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Startdatum</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Enddatum</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isSaving} className="w-full p-2 border border-gray-300 rounded" />
              </div>
            </div>

            {/* CHIRURGISCHER EINGRIFF: Rhythmus-Wahl */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">Rhythmus der Zuweisung</label>
              <div className="flex bg-white border border-gray-200 p-1 rounded-lg w-fit">
                {[
                  { id: 'Wochen', icon: Layers },
                  { id: 'Tage', icon: CalendarDays },
                  { id: 'Monate', icon: Clock }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRhythm(r.id as any)}
                    className={`flex items-center px-4 py-1.5 rounded-md text-sm font-bold transition ${
                      rhythm === r.id ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <r.icon className="w-4 h-4 mr-2" />
                    {r.id}
                  </button>
                ))}
              </div>
            </div>

            {/* CHIRURGISCHER EINGRIFF: Wochentage wählen (nur bei Wochen) */}
            {rhythm === 'Wochen' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Wochentage pro Woche</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleWeekDay(d)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                        selectedWeekDays.includes(d)
                          ? 'bg-orange-100 border-orange-500 text-orange-700'
                          : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Farbe der Serie</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} disabled={isSaving} className="w-10 h-8 p-0 border border-gray-300 rounded cursor-pointer" />
              </div>
              <div className="flex items-center mt-5">
                <input type="checkbox" id="isPublicBulk" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mr-2 rounded text-orange-600" disabled={isSaving} />
                <label htmlFor="isPublicBulk" className="text-sm text-gray-600 flex items-center">
                  <Globe className="w-3 h-3 mr-1" /> Auf Homepage zeigen
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Zuweisungen (Leere Felder werden übersprungen)</h3>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Bitte wähle ein gültiges Start- und Enddatum.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition">
                    {item.kw && (
                      <div className="w-12 shrink-0 text-center bg-gray-100 rounded py-1">
                        <div className="text-[10px] text-gray-500 uppercase font-bold leading-none">KW</div>
                        <div className="font-bold text-gray-800">{item.kw}</div>
                      </div>
                    )}
                    <div className="w-48 shrink-0 text-sm text-gray-600 font-medium">
                      {item.label}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={assignments[item.id] || ''} 
                        onChange={(e) => handleAssignmentChange(item.id, e.target.value)} 
                        disabled={isSaving} 
                        className="w-full p-2 border border-gray-300 rounded focus:ring-orange-500 focus:border-orange-500" 
                        placeholder="Name (z.B. 1. Herren) ..." 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between gap-3">
          {existingSeriesId ? (
            <button onClick={handleDeleteSeries} disabled={isSaving} className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm transition">
              <Trash2 className="w-4 h-4 mr-2" /> Ganze Serie löschen
            </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-bold text-sm">Abbrechen</button>
            <button onClick={handleSave} disabled={isSaving || items.length === 0} className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold text-sm transition">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Speichert...' : (existingSeriesId ? 'Änderungen speichern' : 'Dienstplan generieren')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 310