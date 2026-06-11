// [2026-05-16] - UX-FIX: Umstellung auf Master-Detail-Ansicht (Einklappen der Liste bei Neu/Bearbeiten) für maximale Übersicht.
// [2026-05-16] - FEATURE: SmartEntityPicker für Omni-Channel In-App Erinnerungen & WhatsApp Absender auch für Abos integriert.
// 2026-04-15 20:55 - FIX: Firebase "undefined" Error beim Speichern von Abos behoben
// src/features/Events/CalendarSubscriptionModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { CalendarSubscription, CachedIcsEvent } from '../../core/types/models';
import { X, Save, AlertCircle, Trash2, Link as LinkIcon, Edit2, RefreshCw, ChevronUp, ChevronDown, MessageCircle, List as ListIcon, User, Users, Plus, ArrowLeft } from 'lucide-react';
import { SmartEntityPicker } from '../Shared/components/SmartEntityPicker';
import ICAL from 'ical.js';

interface Props {
  onClose: () => void;
}

export const CalendarSubscriptionModal: React.FC<Props> = ({ onClose }) => {
  const { users, calendarSubscriptions, addCalendarSubscription, updateCalendarSubscription, deleteCalendarSubscription, syncSubscription } = useClubStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  // NEU: Steuert, ob das Formular (Neu / Bearbeiten) im Vollbild des Modals geöffnet ist
  const [isFormOpen, setIsFormOpen] = useState(calendarSubscriptions.length === 0);
  
  const [name, setName] = useState('');
  const [importType, setImportType] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [parsedEvents, setParsedEvents] = useState<CachedIcsEvent[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [color, setColor] = useState('#10b981');
  const [showInMatchPlan, setShowInMatchPlan] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Zuweisungen für Absender und Empfänger
  const [reminderSenderUserId, setReminderSenderUserId] = useState('');
  const [reminderRecipientUserIds, setReminderRecipientUserIds] = useState<string[]>([]);
  const [reminderRecipientGroupIds, setReminderRecipientGroupIds] = useState<string[]>([]);
  const [reminderRecipientTeamIds, setReminderRecipientTeamIds] = useState<string[]>([]);
  const [reminderRecipientHelperIds, setReminderRecipientHelperIds] = useState<string[]>([]);

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

    const subPayload: any = {
      name: name.trim(),
      url: importType === 'file' ? 'FILE_IMPORT' : url.trim(),
      color,
      showInMatchPlan,
      reminderSenderUserId: reminderSenderUserId || null,
      reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : null,
      reminderCustomText: reminderSenderUserId && reminderCustomText.trim() ? reminderCustomText.trim() : null,
      reminderRecipientUserIds,
      reminderRecipientGroupIds,
      reminderRecipientTeamIds,
      reminderRecipientHelperIds
    };

    if (editingId) {
      const existingSub = calendarSubscriptions.find(s => s.id === editingId);
      if (!existingSub) return;
      
      const mergedObj = {
        ...existingSub,
        ...subPayload,
        ...(importType === 'file' && parsedEvents ? { cachedEvents: parsedEvents, lastSyncedAt: Date.now() } : {})
      };

      const safeSub = Object.fromEntries(Object.entries(mergedObj).filter(([_, v]) => v !== undefined)) as unknown as CalendarSubscription;

      const result = await updateCalendarSubscription(safeSub);
      if (result.success) {
        targetSubId = safeSub.id;
        cancelEdit();
      } else {
        setError(result.error?.message || 'Fehler beim Aktualisieren.');
        setIsSaving(false);
        return;
      }
    } else {
      const mergedObj = {
        id: `sub-${Date.now()}`,
        schemaVersion: '1.0',
        ...subPayload,
        isActive: true,
        ...(importType === 'file' && parsedEvents ? { cachedEvents: parsedEvents, lastSyncedAt: Date.now() } : {})
      };

      const safeSub = Object.fromEntries(Object.entries(mergedObj).filter(([_, v]) => v !== undefined)) as unknown as CalendarSubscription;

      const result = await addCalendarSubscription(safeSub);
      if (result.success) {
        targetSubId = safeSub.id;
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
    setReminderRecipientUserIds(sub.reminderRecipientUserIds || []);
    setReminderRecipientGroupIds(sub.reminderRecipientGroupIds || []);
    setReminderRecipientTeamIds(sub.reminderRecipientTeamIds || []);
    setReminderRecipientHelperIds(sub.reminderRecipientHelperIds || []);
    
    setReminderLeadDays(sub.reminderLeadDays?.toString() || '1');
    setReminderCustomText(sub.reminderCustomText || '');
    
    setIsFormOpen(true); // Klappt das Formular im Vollbild auf
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
    setReminderRecipientUserIds([]);
    setReminderRecipientGroupIds([]);
    setReminderRecipientTeamIds([]);
    setReminderRecipientHelperIds([]);
    
    setReminderLeadDays('1');
    setReminderCustomText('');
    setError(null);
    
    setIsFormOpen(calendarSubscriptions.length === 0);
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
        
        {/* Header-Bar mit dynamischen Schaltflächen */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            {isFormOpen && calendarSubscriptions.length > 0 && (
              <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded mr-1 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <LinkIcon className="w-5 h-5 mr-2 text-green-600" />
              {isFormOpen ? (editingId ? 'Abo bearbeiten' : 'Neues Abo einrichten') : 'ICS Kalender-Abos'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {!isFormOpen && (
              <button 
                onClick={() => { cancelEdit(); setIsFormOpen(true); }} 
                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Neues Abo
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* DETAIL-ANSICHT: Das Formular füllt das Modal vollständig aus */}
        {isFormOpen ? (
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
            {error && (
               <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center border border-red-100 text-sm font-bold">
                 <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
               </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Abo-Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 font-medium text-sm" placeholder="z.B. Feiertage" />
                </div>
                
                <div className="md:col-span-8">
                  <div className="flex gap-4 mb-2 border-b border-gray-100 pb-1">
                    <label className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-green-700">
                      <input type="radio" checked={importType === 'url'} onChange={() => setImportType('url')} className="mr-1.5 accent-green-600" /> Web-URL (Auto-Sync)
                    </label>
                    <label className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:text-green-700">
                      <input type="radio" checked={importType === 'file'} onChange={() => setImportType('file')} className="mr-1.5 accent-green-600" /> Lokale ICS-Datei
                    </label>
                  </div>
                  
                  {importType === 'url' ? (
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 text-sm font-medium" placeholder="https://oder webcal://..." />
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

                {/* Omni-Channel Benachrichtigung */}
                <div className="md:col-span-12 bg-green-50/50 p-3 rounded-lg border border-green-100 mt-2">
                  <h4 className="text-xs font-bold text-green-900 flex items-center mb-3">
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Omni-Channel Erinnerung für dieses Abo
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Absender */}
                    <div className="bg-white p-2.5 rounded-lg border border-green-100 shadow-sm">
                      <label className="block text-[10px] font-bold text-green-700 mb-1.5 flex items-center">
                        <User className="w-3 h-3 mr-1" /> Wer verschickt die Erinnerung? (Absender)
                      </label>
                      
                      {reminderSenderUserId && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(() => {
                            const u = users.find(x => x.id === reminderSenderUserId);
                            return u ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-600 text-white shadow-sm">
                                <User className="w-3 h-3 mr-1 opacity-80" />
                                {u.name}
                                <button type="button" onClick={() => setReminderSenderUserId('')} className="ml-1 hover:text-purple-200">
                                  <X className="w-3 h-3"/>
                                </button>
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}

                      <div className="border border-gray-200 rounded overflow-hidden">
                        <SmartEntityPicker
                          selections={{ userIds: reminderSenderUserId ? [reminderSenderUserId] : [], groupIds: [], teamIds: [], helperIds: [] }}
                          onChange={(sel) => setReminderSenderUserId(sel.userIds.length > 0 ? sel.userIds[sel.userIds.length - 1] : '')}
                          allowedTypes={['USER']}
                          placeholder="App-Nutzer suchen..."
                        />
                      </div>
                    </div>

                    {reminderSenderUserId && (
                      <>
                        {/* Empfänger */}
                        <div className="bg-white p-2.5 rounded-lg border border-green-100 shadow-sm">
                          <label className="block text-[10px] font-bold text-green-700 mb-1.5 flex items-center">
                            <Users className="w-3 h-3 mr-1" /> Wer soll erinnert werden? (Empfänger)
                          </label>
                          <p className="text-[9px] text-gray-500 mb-1.5 leading-tight">In-App Erinnerung in PapaToDo und WhatsApp via Absender.</p>
                          <div className="border border-gray-200 rounded overflow-hidden">
                            <SmartEntityPicker
                              selections={{
                                userIds: reminderRecipientUserIds,
                                groupIds: reminderRecipientGroupIds,
                                teamIds: reminderRecipientTeamIds,
                                helperIds: reminderRecipientHelperIds
                              }}
                              onChange={(sel) => {
                                setReminderRecipientUserIds(sel.userIds);
                                setReminderRecipientGroupIds(sel.groupIds);
                                setReminderRecipientTeamIds(sel.teamIds);
                                setReminderRecipientHelperIds(sel.helperIds);
                              }}
                              allowedTypes={['USER', 'GROUP', 'TEAM', 'HELPER']}
                              showBadges={true}
                              placeholder="Teams oder Personen suchen..."
                            />
                          </div>
                        </div>

                        {/* Timing & Text */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-green-700 mb-1">Tage vorher?</label>
                            <input 
                              type="number" min="0" max="365"
                              value={reminderLeadDays} 
                              onChange={(e) => setReminderLeadDays(e.target.value)}
                              disabled={isSaving}
                              className="w-full p-1.5 text-xs border border-green-300 rounded focus:ring-green-500 bg-white"
                            />
                          </div>
                          <div className="col-span-1 md:col-span-3">
                            <label className="block text-[10px] font-bold text-green-700 mb-1">Zusätzlicher Text</label>
                            <textarea 
                              value={reminderCustomText} 
                              onChange={(e) => setReminderCustomText(e.target.value)}
                              disabled={isSaving}
                              rows={1}
                              placeholder="z.B. Bitte dran denken..."
                              className="w-full p-1.5 text-xs border border-green-300 rounded focus:ring-green-500 bg-white"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="md:col-span-12 mt-2 flex items-center mb-1">
                  <input type="checkbox" id="showInMatchPlan" checked={showInMatchPlan} onChange={(e) => setShowInMatchPlan(e.target.checked)} className="mr-2 rounded text-green-600 focus:ring-green-500 cursor-pointer" disabled={isSaving} />
                  <label htmlFor="showInMatchPlan" className="text-sm text-gray-700 font-bold flex items-center cursor-pointer hover:text-green-700 transition-colors">
                    <ListIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Als Spielplan / Wettkampfkalender behandeln
                  </label>
                </div>

                <div className="md:col-span-2 mt-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">Kalenderfarbe</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 p-0 border border-gray-300 rounded cursor-pointer" />
                    <span className="text-xs font-mono uppercase text-gray-500">{color}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {calendarSubscriptions.length > 0 && (
                <button type="button" onClick={cancelEdit} disabled={isSaving} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-100 text-sm transition-colors">
                  Abbrechen
                </button>
              )}
              <button onClick={handleSave} disabled={isSaving} className="px-5 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center text-sm shadow-sm transition-colors">
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Speichert...' : (editingId ? 'Änderungen speichern' : 'Abo hinzufügen')}
              </button>
            </div>
          </div>
        ) : (
          /* MASTER-ANSICHT: Zeigt ausschließlich die Liste der aktiven Abos an */
          <div className="p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-700">Verknüpfte Feeds & Dateien ({calendarSubscriptions.length})</h3>
            </div>
            
            <div className="space-y-2">
              {calendarSubscriptions.map((sub, index) => (
                <div key={sub.id} className="flex items-center justify-between bg-gray-50/50 p-3 rounded-xl border border-gray-200 shadow-sm hover:border-green-300 hover:bg-white transition-all">
                  <div className="flex items-center flex-1 overflow-hidden">
                    <div className="flex flex-col mr-3 bg-white rounded border border-gray-200 shadow-2xs">
                      <button onClick={() => moveSubscription(index, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                      <button onClick={() => moveSubscription(index, 'down')} disabled={index === calendarSubscriptions.length - 1} className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                    </div>
                    <div className="w-4 h-4 rounded-full mr-3 shrink-0 shadow-inner border border-black/10" style={{ backgroundColor: sub.color }}></div>
                    <div className="truncate">
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span className="truncate">{sub.name}</span>
                        {sub.url === 'FILE_IMPORT' && <span className="text-[9px] uppercase tracking-wider bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded border border-gray-300 font-bold">Datei</span>}
                        {sub.showInMatchPlan && (
                          <span className="flex items-center bg-blue-50 text-blue-700 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                            Spielplan
                          </span>
                        )}
                        {sub.reminderSenderUserId && (
                          <span title="Automatischer Reminder aktiv">
                            <MessageCircle className="w-4 h-4 text-green-500 fill-green-50 stroke-[2.5]" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 italic mt-0.5 truncate">{formatSyncDate(sub.lastSyncedAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center shrink-0 ml-2">
                    <button 
                      onClick={() => handleSync(sub.id)} 
                      disabled={!!syncingId || sub.url === 'FILE_IMPORT'} 
                      className={`p-2 rounded-lg transition-colors ${syncingId === sub.id ? 'text-green-500' : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'} disabled:opacity-20 disabled:cursor-not-allowed`} 
                      title={sub.url === 'FILE_IMPORT' ? 'Lokale Dateien synchronisieren sich nicht' : 'Jetzt synchronisieren'}
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingId === sub.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => handleEdit(sub)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg mx-0.5 transition-colors" title="Abo bearbeiten"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Abo löschen"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              
              {calendarSubscriptions.length === 0 && (
                <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm font-bold">
                  Noch keine Abos oder ICS-Dateien verknüpft.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
// --- END OF FILE ---