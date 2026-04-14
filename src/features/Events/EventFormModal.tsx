// 2026-04-14 14:30 - FEATURE: WhatsApp Reminder für Sitzungen + isPublished Default (false)
// src/features/Events/EventFormModal.tsx
import React, { useState, useEffect } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Event } from '../../core/types/models';
import { X, Save, Search, ChevronDown, MessageCircle, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>) => Promise<void>;
  existingEvent?: Partial<Event>;
}

export const EventFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, existingEvent }) => {
  const { users, groups } = useClubStore();
  const [title, setTitle] = useState(existingItem?.title || '');
  const [description, setDescription] = useState(existingItem?.description || '');
  const [location, setLocation] = useState(existingItem?.location || '');
  const [plannedStartTime, setPlannedStartTime] = useState(
    existingItem?.plannedStartTime ? new Date(existingItem.plannedStartTime).toISOString().slice(0, 16) : ''
  );
  // CHIRURGISCHER EINGRIFF: Default isPublished auf false gesetzt (Sitzungen sind primär intern)
  const [isPublished, setIsPublished] = useState(existingItem?.id ? existingItem.isPublished : false);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(existingItem?.participantUserIds || []);
  const [participantGroupIds, setParticipantGroupIds] = useState<string[]>(existingItem?.participantGroupIds || []);
  
  // CHIRURGISCHER EINGRIFF: WhatsApp Reminder Felder
  const [reminderSenderUserId, setReminderSenderUserId] = useState(existingItem?.reminderSenderUserId || '');
  const [reminderLeadDays, setReminderLeadDays] = useState(existingItem?.reminderLeadDays?.toString() || '7');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(existingItem?.title || '');
      setDescription(existingItem?.description || '');
      setLocation(existingItem?.location || '');
      setPlannedStartTime(existingItem?.plannedStartTime ? new Date(existingItem.plannedStartTime).toISOString().slice(0, 16) : '');
      setIsPublished(existingItem?.id ? existingItem.isPublished : false);
      setParticipantUserIds(existingItem?.participantUserIds || []);
      setParticipantGroupIds(existingItem?.participantGroupIds || []);
      setReminderSenderUserId(existingItem?.reminderSenderUserId || '');
      setReminderLeadDays(existingItem?.reminderLeadDays?.toString() || '7');
      setError(null);
    }
  }, [isOpen, existingItem]);

  const filteredAssignees = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    const res: { id: string; type: 'group'|'user'; label: string; sub: string }[] = [];
    
    groups.forEach(g => {
      if (!participantGroupIds.includes(g.id) && g.name.toLowerCase().includes(term)) {
        res.push({ id: g.id, type: 'group', label: `🏢 ${g.name}`, sub: 'Rolle / Amt' });
      }
    });
    
    users.forEach(u => {
      if (!participantUserIds.includes(u.id) && u.name.toLowerCase().includes(term)) {
        res.push({ id: u.id, type: 'user', label: `👤 ${u.name}`, sub: `Nutzer (${u.rolle})` });
      }
    });
    
    return res;
  }, [searchTerm, groups, users, participantGroupIds, participantUserIds]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) { setError('Bitte gib einen Titel ein.'); return; }
    
    try {
      setIsSubmitting(true);
      const payload: Partial<Event> = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        plannedStartTime: plannedStartTime ? new Date(plannedStartTime).getTime() : undefined,
        isPublished,
        participantUserIds,
        participantGroupIds,
        status: existingItem?.status || 'PLANUNG',
        // CHIRURGISCHER EINGRIFF: Speichern der WhatsApp Reminder Felder
        reminderSenderUserId: reminderSenderUserId || undefined,
        reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : undefined,
        reminderSentAt: existingItem?.reminderSentAt
      };
      
      if (existingItem?.id) payload.id = existingItem.id;

      const safePayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined)) as Partial<Event>;
      await onSave(safePayload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">{existingItem?.id ? 'Sitzung bearbeiten' : 'Neue Sitzung / Projekt'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center text-sm font-bold border border-red-200">
              <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Titel *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-blue-500 font-medium" autoFocus required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Geplanter Start</label>
              <input type="datetime-local" value={plannedStartTime} onChange={e => setPlannedStartTime(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ort</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded bg-white" placeholder="z.B. Vereinsheim" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung / Ziel</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded" rows={3}></textarea>
          </div>

          <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
            <label className="block text-xs font-bold text-blue-800 mb-2">Teilnehmerkreis (Rollen & Nutzer)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {participantGroupIds.map(id => (
                <span key={`g-${id}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                  🏢 {groups.find(x => x.id === id)?.name}
                  <button onClick={() => setParticipantGroupIds(prev => prev.filter(x => x !== id))} className="ml-1.5 hover:text-blue-200"><X className="w-3 h-3"/></button>
                </span>
              ))}
              {participantUserIds.map(id => (
                <span key={`u-${id}`} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                  👤 {users.find(x => x.id === id)?.name}
                  <button onClick={() => setParticipantUserIds(prev => prev.filter(x => x !== id))} className="ml-1.5 hover:text-blue-200"><X className="w-3 h-3"/></button>
                </span>
              ))}
            </div>
            <div className="relative">
              <div className="flex items-center border border-blue-300 rounded bg-white px-2 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
                <Search className="w-4 h-4 text-blue-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} className="w-full p-2 text-sm outline-none bg-transparent" placeholder="Rolle oder Nutzer wählen..." />
                <ChevronDown className="w-4 h-4 text-blue-400 cursor-pointer" onClick={() => setIsSearchFocused(!isSearchFocused)} />
              </div>
              {isSearchFocused && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {filteredAssignees.map(a => (
                    <button key={`${a.type}-${a.id}`} onClick={() => { if (a.type === 'group') setParticipantGroupIds([...participantGroupIds, a.id]); else setParticipantUserIds([...participantUserIds, a.id]); setSearchTerm(''); }} className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">{a.label}</span>
                      <span className="text-xs text-gray-400">{a.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CHIRURGISCHER EINGRIFF: WhatsApp Erinnerung für Sitzungen (Analog zu ItemFormModal) */}
          <div className="bg-green-50/50 p-4 rounded-lg border border-green-200 mt-4 space-y-4">
            <div className="border-b border-green-200 pb-2 mb-2">
                <h3 className="text-sm font-bold text-green-900 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Erinnerung an Teilnehmer (Optional)
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-green-800 mb-1">Wer verschickt die Erinnerung?</label>
                <select 
                  value={reminderSenderUserId} 
                  onChange={(e) => setReminderSenderUserId(e.target.value)}
                  className="w-full p-2 border border-green-300 rounded focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                >
                  <option value="">-- Niemand (Keine Erinnerung) --</option>
                  {(users || []).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.rolle})</option>
                  ))}
                </select>
              </div>
              
              {reminderSenderUserId && (
                <div>
                  <label className="block text-xs font-bold text-green-800 mb-1">Tage vor der Sitzung?</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="365"
                    value={reminderLeadDays} 
                    onChange={(e) => setReminderLeadDays(e.target.value)}
                    className="w-full p-2 border border-green-300 rounded focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center text-sm font-bold text-gray-700 cursor-pointer pt-2">
            <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-4 h-4 mr-2" />
            Öffentlich sichtbar (erscheint im Vereinskalender)
          </label>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
          <button onClick={handleSave} disabled={isSubmitting} className="flex items-center px-5 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">
            <Save className="w-4 h-4 mr-2" /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 201 Zeilen ---