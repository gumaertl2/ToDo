// 2026-04-13 22:20 - FIX: Vercel Build Errors (Unused Imports)
// src/features/Events/CalendarBulkEventModal.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarEvent, Helper } from '../../core/types/models';
// CHIRURGISCHER EINGRIFF: CalendarDays, Clock und Layers entfernt
import { X, Save, AlertCircle, Globe, Calendar as CalIcon, Trash2, MessageCircle, Search, ChevronDown } from 'lucide-react';
import { startOfWeek, endOfWeek, addWeeks, format, addDays, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { de } from 'date-fns/locale/de';

interface Props {
  onClose: () => void;
  existingSeriesId?: string; 
}

const HelperSearchSelect: React.FC<{
  value: string;
  onSelect: (alias: string) => void;
  helpers: Helper[];
  disabled?: boolean;
}> = ({ value, onSelect, helpers, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return helpers.filter(h => 
      (h.alias || '').toLowerCase().includes(term) || 
      h.name.toLowerCase().includes(term)
    ).sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name));
  }, [helpers, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`flex items-center justify-between p-2 border rounded bg-white cursor-pointer ${disabled ? 'opacity-50' : 'hover:border-orange-400 border-gray-300'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900 font-bold text-sm' : 'text-gray-400 italic text-sm'}>
          {value || 'Helfer (Alias) wählen...'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b bg-gray-50 flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
            <input type="text" autoFocus className="w-full bg-transparent text-sm outline-none" placeholder="Suche Alias..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(h => (
              <div key={h.id} className="px-4 py-2 text-sm hover:bg-orange-50 cursor-pointer flex justify-between items-center" onClick={() => { onSelect(h.alias || h.name); setIsOpen(false); setSearchTerm(''); }}>
                <span className="font-bold text-orange-700">{h.alias || h.name}</span>
                {h.alias && <span className="text-[10px] text-gray-400 ml-2 italic">{h.name}</span>}
              </div>
            )) : <div className="px-4 py-3 text-xs text-gray-500 italic">Keine Helfer gefunden</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const CalendarBulkEventModal: React.FC<Props> = ({ onClose, existingSeriesId }) => {
  const { users, helpers, calendarEvents, addCalendarEventsBulk, deleteCalendarSeries } = useClubStore();
  
  const [baseTitle, setBaseTitle] = useState('Hallendienst');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addWeeks(new Date(), 4), 'yyyy-MM-dd'));
  const [color, setColor] = useState('#f97316'); 
  const [isPublic, setIsPublic] = useState(true);
  const [rhythm, setRhythm] = useState<'Wochen' | 'Tage' | 'Monate'>('Wochen');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [reminderSenderUserId, setReminderSenderUserId] = useState('');
  const [reminderLeadDays, setReminderLeadDays] = useState('7');
  const [reminderCustomText, setReminderCustomText] = useState('');

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
        setStartDate(format(new Date(first.startTime), 'yyyy-MM-dd'));
        setEndDate(format(new Date(last.endTime || last.startTime), 'yyyy-MM-dd'));
        setColor(first.color || '#f97316');
        setIsPublic(first.isPublic);
        setReminderSenderUserId(first.reminderSenderUserId || '');
        setReminderLeadDays(first.reminderLeadDays?.toString() || '7');
        setReminderCustomText(first.reminderCustomText || '');
        setBaseTitle(first.title.includes(': ') ? first.title.split(': ')[0] : first.title);

        const loaded: Record<string, string> = {};
        seriesEvents.forEach(ev => {
          const key = startOfWeek(new Date(ev.startTime), { weekStartsOn: 1 }).toISOString();
          loaded[key] = ev.title.includes(': ') ? ev.title.split(': ')[1] : '';
        });
        setAssignments(loaded);
      }
    }
  }, [existingSeriesId, calendarEvents]);

  const items = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    const res = [];
    
    if (rhythm === 'Wochen') {
      let current = startOfWeek(start, { weekStartsOn: 1 });
      const final = startOfWeek(end, { weekStartsOn: 1 });
      while (current <= final) {
        const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
        res.push({ id: current.toISOString(), start: new Date(current), end: weekEnd, label: `${format(current, 'dd.MM.', { locale: de })} - ${format(weekEnd, 'dd.MM.yyyy', { locale: de })}`, kw: format(current, 'I', { locale: de }) });
        current = addWeeks(current, 1);
      }
    } else if (rhythm === 'Tage') {
      let current = new Date(start);
      while (current <= end) {
        if (selectedWeekDays.includes(current.getDay())) {
          res.push({ id: current.toISOString(), start: new Date(current), end: new Date(current), label: format(current, 'EEEE, dd.MM.yyyy', { locale: de }), kw: format(current, 'I', { locale: de }) });
        }
        current = addDays(current, 1);
      }
    } else if (rhythm === 'Monate') {
      let current = startOfMonth(start);
      const final = startOfMonth(end);
      while (current <= final) {
        const monthEnd = endOfMonth(current);
        res.push({ id: current.toISOString(), start: new Date(current), end: monthEnd, label: format(current, 'MMMM yyyy', { locale: de }), kw: '' });
        current = addMonths(current, 1);
      }
    }
    return res;
  }, [startDate, endDate, rhythm, selectedWeekDays]);

  const handleSave = async () => {
    if (!baseTitle.trim()) { setError('Basis-Titel fehlt.'); return; }
    if (rhythm === 'Tage' && selectedWeekDays.length === 0) { setError('Wochentage wählen.'); return; }

    const targetSeriesId = existingSeriesId || `series-${Date.now()}`;
    const eventsToCreate: CalendarEvent[] = [];

    items.forEach((item, index) => {
      const assigneeAlias = assignments[item.id]?.trim();
      if (!assigneeAlias) return;

      const common = {
        schemaVersion: '1.0',
        title: `${baseTitle.trim()}: ${assigneeAlias}`,
        color, isPublic, seriesId: targetSeriesId, eventType: 'DIENST' as const,
        reminderSenderUserId: reminderSenderUserId || undefined,
        reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : undefined,
        reminderCustomText: reminderSenderUserId ? reminderCustomText.trim() : undefined,
      };

      if (rhythm === 'Wochen') {
        eventsToCreate.push({ ...common, id: `calev-${Date.now()}-${index}`, startTime: item.start.getTime(), endTime: item.end.getTime(), isAllDay: true });
      } else if (rhythm === 'Tage') {
        eventsToCreate.push({ ...common, id: `calev-${Date.now()}-${index}`, startTime: item.start.getTime(), endTime: item.start.getTime(), isAllDay: true });
      } else {
        eventsToCreate.push({ ...common, id: `calev-${Date.now()}-${index}`, startTime: item.start.getTime(), endTime: item.end.getTime(), isAllDay: true });
      }
    });

    if (eventsToCreate.length === 0) { setError('Keine Zuweisungen vorgenommen.'); return; }
    setIsSaving(true);
    if (existingSeriesId) await deleteCalendarSeries(existingSeriesId);
    const safeEvents = eventsToCreate.map(e => Object.fromEntries(Object.entries(e).filter(([_, v]) => v !== undefined)) as CalendarEvent);
    const result = await addCalendarEventsBulk(safeEvents);
    if (result.success) onClose();
    else { setError(result.error?.message || 'Speicherfehler.'); setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 text-gray-900 font-bold">
          <h2 className="text-xl flex items-center"><CalIcon className="w-5 h-5 mr-2 text-orange-500" /> {existingSeriesId ? 'Dienstplan bearbeiten' : 'Dienstplan Generator'}</h2>
          <button onClick={onClose} disabled={isSaving}><X className="w-6 h-6 text-gray-400" /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center font-bold text-sm"><AlertCircle className="w-5 h-5 mr-2" />{error}</div>}

          <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Titel</label><input type="text" value={baseTitle} onChange={e => setBaseTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded" /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">Ende</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded" /></div>
            </div>
            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div><label className="block text-xs font-bold text-gray-700 mb-2">Rhythmus</label>
                <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
                  {['Wochen', 'Tage', 'Monate'].map(r => <button key={r} onClick={() => setRhythm(r as any)} className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${rhythm === r ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{r}</button>)}
                </div>
              </div>
              {rhythm === 'Tage' && (
                <div><label className="block text-xs font-bold text-gray-700 mb-2">Tage wählen</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 0].map(d => <button key={d} onClick={() => setSelectedWeekDays(p => p.includes(d)?p.filter(x=>x!==d):[...p,d])} className={`w-8 h-8 rounded-full text-[10px] font-bold border transition ${selectedWeekDays.includes(d) ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white text-gray-400'}`}>{['So','Mo','Di','Mi','Do','Fr','Sa'][d]}</button>)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6 mt-2 pt-2 border-t border-orange-200/50">
              <div className="flex items-center"><label className="block text-xs font-bold text-gray-700 mr-2">Farbe</label><input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-6 p-0 border-0 bg-transparent cursor-pointer" /></div>
              <label className="flex items-center cursor-pointer group"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 mr-2 border-gray-300" /><span className="text-xs font-bold text-gray-700 flex items-center group-hover:text-orange-700 transition-colors"><Globe className="w-3.5 h-3.5 mr-1 text-blue-500" /> Auf Homepage zeigen</span></label>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp-Versand</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={reminderSenderUserId} onChange={e => setReminderSenderUserId(e.target.value)} className="p-2 border border-green-300 rounded text-sm bg-white">
                <option value="">-- Kein Versender --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {reminderSenderUserId && <div className="flex items-center gap-2 text-xs font-bold text-green-800">Vorlauf: <input type="number" value={reminderLeadDays} onChange={e => setReminderLeadDays(e.target.value)} className="w-16 p-2 border border-green-300 rounded" /> Tage</div>}
            </div>
            {reminderSenderUserId && <textarea value={reminderCustomText} onChange={e => setReminderCustomText(e.target.value)} placeholder="Eigener Text..." className="w-full mt-3 p-2 border border-green-300 rounded text-sm" rows={2} />}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Zuweisungen (Alias wählen)</h3>
            {items.length > 0 ? items.map(item => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 items-center">
                <div className="text-sm font-medium text-gray-600">{item.kw && <span className="bg-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">KW {item.kw}</span>}{item.label}</div>
                <HelperSearchSelect value={assignments[item.id] || ''} onSelect={alias => setAssignments(prev => ({ ...prev, [item.id]: alias }))} helpers={helpers} />
              </div>
            )) : (
              <p className="text-sm text-gray-400 italic text-center py-4">Bitte Zeitraum und Tage wählen.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between gap-3">
          {existingSeriesId ? <button onClick={async () => {if(window.confirm('Serie löschen?')){await deleteCalendarSeries(existingSeriesId);onClose();}}} className="px-4 py-2 text-red-600 font-bold text-sm hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4 mr-2 inline" /> Serie löschen</button> : <div/>}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 font-bold text-sm">Abbrechen</button>
            <button onClick={handleSave} disabled={isSaving || items.length === 0} className="flex items-center px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-bold text-sm shadow-md transition">
              <Save className="w-4 h-4 mr-2 inline" /> {isSaving ? 'Speichert...' : 'Dienstplan generieren'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 226 Zeilen ---