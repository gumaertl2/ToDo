// src/features/Events/EventFormModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import type { Event } from '../../core/types/models';
import { X, Save } from 'lucide-react';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  existingEvent?: Event;
}

const formatTime = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatDate = (ts?: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const EventFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, existingEvent }) => {
  const { users, groups } = useClubStore();
  
  const [title, setTitle] = useState(existingEvent?.title || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [location, setLocation] = useState(existingEvent?.location || '');
  const [status, setStatus] = useState<Event['status']>(existingEvent?.status || 'PLANUNG');
  
  const [startDateStr, setStartDateStr] = useState(formatDate(existingEvent?.plannedStartTime));
  const [startTimeStr, setStartTimeStr] = useState(formatTime(existingEvent?.plannedStartTime));
  const [endTimeStr, setEndTimeStr] = useState(formatTime(existingEvent?.plannedEndTime));

  const [participantGroupIds, setParticipantGroupIds] = useState<string[]>(existingEvent?.participantGroupIds || []);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(existingEvent?.participantUserIds || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleArray = (arr: string[], setArr: (val: string[]) => void, id: string) => {
    if (arr.includes(id)) setArr(arr.filter(x => x !== id));
    else setArr([...arr, id]);
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Bitte gib einen Titel ein.');
      return;
    }

    // CHIRURGISCHER EINGRIFF: Datums-Validierung
    if (!startDateStr) {
      setError('Bitte wähle ein Datum für die Sitzung aus.');
      return;
    }

    try {
      setIsSubmitting(true);
      const eventId = existingEvent?.id || doc(collection(db, 'events')).id;
      
      let plannedStartTime: number | undefined = undefined;
      let plannedEndTime: number | undefined = undefined;

      const startD = new Date(startDateStr);
      if (startTimeStr) {
        const [h, m] = startTimeStr.split(':').map(Number);
        startD.setHours(h, m, 0, 0);
      } else {
        startD.setHours(0, 0, 0, 0);
      }
      plannedStartTime = startD.getTime();

      if (endTimeStr) {
        const endD = new Date(startDateStr);
        const [h, m] = endTimeStr.split(':').map(Number);
        endD.setHours(h, m, 0, 0);
        plannedEndTime = endD.getTime();
      }

      // CHIRURGISCHER EINGRIFF: Wenn es ein Rollover (Folge-Meeting) ist, darf das Datum nicht in der Vergangenheit liegen
      if (existingEvent?.seriesId && status === 'PLANUNG') {
          const today = new Date();
          today.setHours(0,0,0,0);
          if (startD.getTime() < today.getTime()) {
              setError('Das Datum für die neue Sitzung darf nicht in der Vergangenheit liegen. Bitte Datum anpassen.');
              setIsSubmitting(false);
              return;
          }
      }

      const eventPayload: Event = {
        id: eventId,
        schemaVersion: '1.0',
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        status,
        isPublished: existingEvent?.isPublished || false,
        participantGroupIds,
        participantUserIds,
        plannedStartTime,
        plannedEndTime,
        startDate: plannedStartTime,
        // CHIRURGISCHER EINGRIFF: Die seriesId MUSS zwingend gerettet werden, sonst bricht die Kette ab!
        seriesId: existingEvent?.seriesId || eventId,
        isArchived: existingEvent?.isArchived || false,
      };

      const safePayload = Object.fromEntries(
        Object.entries(eventPayload).filter(([_, v]) => v !== undefined)
      ) as Event;

      await onSave(safePayload);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {existingEvent?.id ? 'Sitzung bearbeiten' : 'Neue Sitzung anlegen'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isSubmitting}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel der Sitzung *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" placeholder="z.B. Vorstandssitzung Q3" required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as Event['status'])} className="w-full p-2 border border-gray-300 rounded font-bold">
                <option value="PLANUNG">In Planung (Entwurf)</option>
                <option value="AKTIV">Aktiv (Sitzung läuft)</option>
                <option value="ABGESCHLOSSEN">Abgeschlossen (Protokolliert)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung / Ziel</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" rows={2}></textarea>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort / Link</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" placeholder="Vereinsheim oder Zoom-Link" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
              <input 
                type="date" 
                value={startDateStr} 
                onChange={e => setStartDateStr(e.target.value)} 
                min={existingEvent?.seriesId ? new Date().toISOString().substring(0,10) : undefined}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" 
                required 
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Start (Uhrzeit)</label>
                <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ende (Uhrzeit)</label>
                <input type="time" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-4">
            <h3 className="text-md font-bold text-blue-800">Teilnehmer (Wer muss eingeladen werden?)</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ämter / Gruppen</label>
              <div className="flex flex-wrap gap-2">
                {groups.map(g => (
                  <label key={g.id} className="flex items-center p-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-blue-50">
                    <input type="checkbox" checked={participantGroupIds.includes(g.id)} onChange={() => toggleArray(participantGroupIds, setParticipantGroupIds, g.id)} className="mr-2" />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Einzelne Personen</label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                  <label key={u.id} className="flex items-center p-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-blue-50">
                    <input type="checkbox" checked={participantUserIds.includes(u.id)} onChange={() => toggleArray(participantUserIds, setParticipantUserIds, u.id)} className="mr-2" />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
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
              {isSubmitting ? 'Speichert...' : 'Sitzung speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 227