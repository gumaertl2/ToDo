// 2026-04-15 20:45 - FEATURE: Schalter für Spielplan/Wettkampfkalender-Abo
// src/features/Events/CalendarSubscriptionModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarSubscription, CachedIcsEvent } from '../../core/types/models';
import { X, Save, AlertCircle, Trash2, Link as LinkIcon, Edit2, RefreshCw, ChevronUp, ChevronDown, MessageCircle, List as ListIcon } from 'lucide-react';
import ICAL from 'ical.js';

interface Props {
  onClose: () => void;
}

export const CalendarSubscriptionModal: React.FC<Props> = ({ onClose }) => {
  const { users, calendarSubscriptions, addCalendarSubscription, updateCalendarSubscription, deleteCalendarSubscription, syncSubscription } = useClubStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  
  const [importType, setImportType] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [parsedEvents, setParsedEvents] = useState<CachedIcsEvent[] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [color, setColor] = useState('#10b981');
  
  // CHIRURGISCHER EINGRIFF: State für das Spielplan-Flag
  const [showInMatchPlan, setShowInMatchPlan] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [reminderSenderUserId, setReminderSenderUserId] = useState('');
  const [reminderLeadDays, setReminderLeadDays] = useState('1');
  const [reminderCustomText, setReminderCustomText] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    try {
      const textData = await file.text();
      const jcalData = ICAL.parse(textData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      const cachedEvents: CachedIcsEvent[] = [];

      vevents.forEach((vevent: any) => {
        const event = new ICAL.Event(vevent);
        if (!event.startDate) return; 
        const s = event.startDate;
        const startDate = new Date(s.year, s.month - 1, s.day, s.hour, s.minute).getTime();
        let endDate = startDate;
        if (event.endDate) { 
          const evEnd = event.endDate; 
          endDate = new Date(evEnd.year, evEnd.month - 1, evEnd.day, evEnd.hour, evEnd.minute).getTime(); 
        }
        cachedEvents.push({ 
          uid: event.uid, 
          title: event.summary || 'Ohne Titel', 
          description: event.description || '', 
          location: event.location || '', 
          startTime: startDate, 
          endTime: endDate, 
          isAllDay: s.isDate 
        });
      });

      setParsedEvents(cachedEvents);
      setFileName(file.name);
      if (!name) setName(file.name.replace('.ics', ''));
    } catch (err: any) {
      setError('Fehler beim Parsen. Ist es eine gültige ICS-Datei?');
      setParsedEvents(null);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name darf nicht leer sein.');
      return;
    }

    if (importType === 'url') {
      if (!url.trim() || (!url.startsWith('http') && !url.startsWith('webcal'))) {
        setError('Die URL muss mit http://, https:// oder webcal:// beginnen.');
        return;
      }
    } else {
      if (!parsedEvents || parsedEvents.length === 0) {
        setError('Bitte wähle eine gültige ICS-Datei mit Terminen aus.');
        return;
      }
    }
    
    setIsSaving(true);
    setError(null);

    let targetSubId: string;

    const subPayload = {
      name: name.trim(),
      url: importType === 'file' ? 'FILE_IMPORT' : url.trim(),
      color,
      showInMatchPlan,
      reminderSenderUserId: reminderSenderUserId || undefined,
      reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : undefined,
      reminderCustomText: reminderSenderUserId ? reminderCustomText.trim() : undefined,
    };

    if (editingId) {
      const existingSub = calendarSubscriptions.find(s => s.id === editingId);
      if (!existingSub) return;
      
      const updatedSub: CalendarSubscription = {
        ...existingSub,
        ...subPayload,
        ...(importType === 'file' && parsedEvents ? { cachedEvents: parsedEvents, lastSyncedAt: Date.now() } : {})
      };

      const result = await updateCalendarSubscription(updatedSub);
      if (result.success) {
        targetSubId = updatedSub.id;
        cancelEdit();
      } else {
        setError(result.error?.message || 'Fehler beim Aktualisieren.');
        setIsSaving(false);
        return;
      }
    } else {
      const newSub: CalendarSubscription = {
        id: `sub-${Date.now()}`,
        schemaVersion: '1.0',
        ...subPayload,
        isActive: true,
        ...(importType === 'file' && parsedEvents ? { cachedEvents: parsedEvents, lastSyncedAt: Date.now() } : {})
      };

      const result = await addCalendarSubscription(newSub as CalendarSubscription);
      if (result.success) {
        targetSubId = newSub.id;
        cancelEdit();
      } else {
        setError(result.error?.message || 'Fehler beim Speichern.');
        setIsSaving(false);
        return;
      }
    }
    
    if (importType === 'url') {
      handleSync(targetSubId);
    }
    
    setIsSaving(false);
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    const result = await syncSubscription(id);
    if (!result.success) setError(`Sync-Fehler: ${result.error?.message}`);
    setSyncingId(null);
  };

  const moveSubscription = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= calendarSubscriptions.length) return;

    const items = [...calendarSubscriptions];
    const [movedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, movedItem);

    for (let i = 0; i < items.length; i++) {
      if (items[i].sortOrder !== i) {
        await updateCalendarSubscription({ ...items[i], sortOrder: i });
      }
    }
  };

  const handleEdit = (sub: CalendarSubscription) => {
    setEditingId(sub.id);
    setName(sub.name);
    if (sub.url === 'FILE_IMPORT') {
      setImportType('file');
      setUrl('');
      setParsedEvents(sub.cachedEvents || []);
      setFileName('Bereits importiert (Neue Datei wählen zum Überschreiben)');
    } else {
      setImportType('url');
      setUrl(sub.url);
      setParsedEvents(null);
      setFileName('');
    }
    setColor(sub.color || '#10b981');
    setShowInMatchPlan(sub.showInMatchPlan || false);
    setReminderSenderUserId(sub.reminderSenderUserId || '');
    setReminderLeadDays(sub.reminderLeadDays?.toString() || '1');
    setReminderCustomText(sub.reminderCustomText || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setUrl('');
    setImportType('url');
    setParsedEvents(null);
    setFileName('');
    setColor('#10b981');
    setShowInMatchPlan(false);
    setReminderSenderUserId('');
    setReminderLeadDays('1');
    setReminderCustomText('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Abo wirklich löschen?')) {
      await deleteCalendarSubscription(id);
    }
  };

  const formatSyncDate = (timestamp?: number) => {
    if (!timestamp) return 'Noch nie synchronisiert';
    const d = new Date(timestamp);
    return `Zuletzt: ${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <LinkIcon className="w-5 h-5 mr-2 text-green-600" />
            ICS Kalender-Abos
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 bg-gray-50/50 border-b border-gray-200 shrink-0 overflow-y-auto max-h-[50vh]">
          {error && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center mb-4 border border-red-100 text-sm font-bold">
               <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
             </div>
          )}

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-700">{editingId ? 'Abo bearbeiten' : 'Neues Abo hinzufügen'}</h3>
              {editingId && (
                <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors">
                  Abbrechen
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-green-500" placeholder="z.B. Feiertage" />
              </div>
              
              <div className="md:col-span-8">
                <div className="flex gap-4 mb-1 border-b border-gray-100 pb-1">
                  <label className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-green-700">
                    <input type="radio" checked={importType === 'url'} onChange={() => setImportType('url')} className="mr-1.5 accent-green-600" /> Web-URL
                  </label>
                  <label className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-green-700">
                    <input type="radio" checked={importType === 'file'} onChange={() => setImportType('file')} className="mr-1.5 accent-green-600" /> Lokale Datei
                  </label>
                </div>
                
                {importType === 'url' ? (
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-1.5 border border-gray-300 rounded focus:ring-green-500 text-sm" placeholder="https://..." />
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="file" 
                      accept=".ics" 
                      onChange={handleFileUpload} 
                      className="w-full p-1 border border-gray-300 rounded text-xs bg-white file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer" 
                    />
                    {parsedEvents && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded shrink-0">{parsedEvents.length} Events</span>}
                  </div>
                )}
                {fileName && importType === 'file' && <p className="text-[10px] text-gray-500 mt-1 truncate">Datei: {fileName}</p>}
              </div>

              <div className="md:col-span-12 bg-green-50/50 p-3 rounded-lg border border-green-100 mt-2">
                <h4 className="text-xs font-bold text-green-900 flex items-center mb-3">
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp Erinnerung für dieses Abo (Optional)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-green-800 mb-1">Wer verschickt die Erinnerung?</label>
                    <select 
                      value={reminderSenderUserId} 
                      onChange={(e) => setReminderSenderUserId(e.target.value)}
                      className="w-full p-1.5 border border-green-300 rounded text-xs bg-white"
                    >
                      <option value="">-- Niemand --</option>
                      {(users || []).map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {reminderSenderUserId && (
                    <div>
                      <label className="block text-[10px] font-bold text-green-800 mb-1">Tage vor Termin?</label>
                      <input 
                        type="number" min="0" max="365"
                        value={reminderLeadDays} 
                        onChange={(e) => setReminderLeadDays(e.target.value)}
                        className="w-full p-1.5 border border-green-300 rounded text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
                {reminderSenderUserId && (
                  <div className="mt-2">
                    <label className="block text-[10px] font-bold text-green-800 mb-1">Zusätzlicher Text (Optional)</label>
                    <textarea 
                      value={reminderCustomText} 
                      onChange={(e) => setReminderCustomText(e.target.value)}
                      className="w-full p-1.5 border border-green-300 rounded text-xs bg-white"
                      rows={1}
                      placeholder="z.B. Bitte Mülltonnen rausstellen!"
                    />
                  </div>
                )}
              </div>

              {/* CHIRURGISCHER EINGRIFF: Checkbox für Spielplan */}
              <div className="md:col-span-12 mt-2 flex items-center mb-2">
                <input type="checkbox" id="showInMatchPlan" checked={showInMatchPlan} onChange={(e) => setShowInMatchPlan(e.target.checked)} className="mr-2 rounded text-green-600 focus:ring-green-500" disabled={isSaving} />
                <label htmlFor="showInMatchPlan" className="text-sm text-gray-700 font-bold flex items-center cursor-pointer">
                  <ListIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Als Spielplan / Wettkampfkalender behandeln
                </label>
              </div>

              <div className="md:col-span-1 mt-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Farbe</label>
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 p-0 border border-gray-300 rounded cursor-pointer" />
              </div>
              
              <div className="md:col-span-11 mt-2 flex justify-end items-end h-full">
                <button onClick={handleSave} disabled={isSaving} className="w-40 flex justify-center items-center px-3 py-1.5 h-8 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors">
                  <Save className="w-4 h-4 mr-1" /> {editingId ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Aktive Abos & Dateien ({calendarSubscriptions.length})</h3>
          <div className="space-y-2">
            {calendarSubscriptions.map((sub, index) => (
              <div key={sub.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:border-green-200 transition-colors">
                <div className="flex items-center flex-1 overflow-hidden">
                  <div className="flex flex-col mr-3 bg-gray-50 rounded border border-gray-100">
                    <button onClick={() => moveSubscription(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                    <button onClick={() => moveSubscription(index, 'down')} disabled={index === calendarSubscriptions.length - 1} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                  </div>
                  <div className="w-4 h-4 rounded-full mr-3 shrink-0 shadow-inner border border-black/10" style={{ backgroundColor: sub.color }}></div>
                  <div className="truncate">
                    <div className="font-bold text-gray-900 text-sm flex items-center">
                      {sub.name} 
                      {sub.url === 'FILE_IMPORT' && <span className="ml-2 text-[9px] uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">Datei</span>}
                      {sub.showInMatchPlan && (
                        <span title="Im Spielplan sichtbar" className="ml-2 flex items-center bg-blue-50 text-blue-700 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-100">
                          Spielplan
                        </span>
                      )}
                      {sub.reminderSenderUserId && (
                        <span title="Erinnerung aktiv" className="ml-2 flex items-center">
                          <MessageCircle className="w-3.5 h-3.5 text-green-500" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 italic truncate">{formatSyncDate(sub.lastSyncedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center shrink-0 ml-2">
                  <button 
                    onClick={() => handleSync(sub.id)} 
                    disabled={!!syncingId || sub.url === 'FILE_IMPORT'} 
                    className={`p-2 transition-colors ${syncingId === sub.id ? 'text-green-500' : 'text-gray-400 hover:text-green-600'} disabled:opacity-20 disabled:cursor-not-allowed`} 
                    title={sub.url === 'FILE_IMPORT' ? 'Dateien synchronisieren sich nicht automatisch' : 'Jetzt synchronisieren'}
                  >
                    <RefreshCw className={`w-4 h-4 ${syncingId === sub.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => handleEdit(sub)} className="text-blue-400 hover:text-blue-600 p-2 mx-1" title="Bearbeiten"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(sub.id)} className="text-red-400 hover:text-red-600 p-2" title="Löschen"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            
            {calendarSubscriptions.length === 0 && (
              <div className="text-center p-6 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm font-bold">
                Noch keine Abos oder Dateien verknüpft.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
// --- END OF FILE ---