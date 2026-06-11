// [2026-05-28] - UX-FIX: Blutlinie für Projekte/Sitzungen aktiviert. Titel können nun auch bei Folgesitzungen geändert werden, da die Historie stabil über die 'seriesId' verknüpft ist.
// [2026-05-21] - BUGFIX: isPublic von isPublished getrennt, damit "Auf Homepage zeigen" nicht fälschlicherweise die Agenda ent-veröffentlicht.
// [2026-05-16] - UX-FIX: Teilnehmer-Auswahl strikt auf App-User und Ämter gedrosselt (USER, GROUP).
// [2026-05-16] - UX-FIX: Absender-Dropdown durch SmartEntityPicker (inklusive Badge-Anzeige) ersetzt.
// [2026-05-16] - UX-FIX: Manuellen Checkbox-Block durch universellen SmartEntityPicker ersetzt.
// src/features/Events/EventFormModal.tsx 
import React, { useState } from 'react'; 
import { useClubStore } from '../../store/useClubStore'; 
import type { Event } from '../../core/types/models'; 
import { X, Save, MessageCircle, Globe, User } from 'lucide-react'; 
import { doc, collection } from 'firebase/firestore'; 
import { db } from '../../services/firebase'; 
import { SmartEntityPicker } from '../Shared/components/SmartEntityPicker';

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
  const { users } = useClubStore(); 
   
  const [title, setTitle] = useState(existingEvent?.title || ''); 
  const [description, setDescription] = useState(existingEvent?.description || ''); 
  const [location, setLocation] = useState(existingEvent?.location || ''); 
  const [status, setStatus] = useState<Event['status']>(existingEvent?.status || 'PLANUNG'); 
  
  const [color, setColor] = useState((existingEvent as any)?.color || '#4338ca');
  const isFollowUp = !!existingEvent?.seriesId && existingEvent.seriesId !== existingEvent.id;
   
  const [startDateStr, setStartDateStr] = useState(formatDate(existingEvent?.plannedStartTime)); 
  const [startTimeStr, setStartTimeStr] = useState(formatTime(existingEvent?.plannedStartTime)); 
  const [endTimeStr, setEndTimeStr] = useState(formatTime(existingEvent?.plannedEndTime)); 

  // CHIRURGISCHER EINGRIFF: States für die Nutzung des SmartEntityPickers
  const [participantGroupIds, setParticipantGroupIds] = useState<string[]>(existingEvent?.participantGroupIds || []); 
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(existingEvent?.participantUserIds || []); 
  const [participantTeamIds, setParticipantTeamIds] = useState<string[]>(existingEvent?.participantTeamIds || []); 
  const [participantHelperIds, setParticipantHelperIds] = useState<string[]>(existingEvent?.participantHelperIds || []); 

  // CHIRURGISCHER EINGRIFF: isPublished (intern) und isPublic (Homepage) strikt getrennt
  const [isPublished] = useState(existingEvent?.id ? existingEvent.isPublished : false);
  const [isPublic, setIsPublic] = useState(existingEvent?.id ? !!existingEvent.isPublic : false);
  
  const [reminderSenderUserId, setReminderSenderUserId] = useState(existingEvent?.reminderSenderUserId || '');
  const [reminderLeadDays, setReminderLeadDays] = useState(existingEvent?.reminderLeadDays?.toString() || '7');
  const [reminderCustomText, setReminderCustomText] = useState(existingEvent?.reminderCustomText || '');

  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [error, setError] = useState<string | null>(null); 

  if (!isOpen) return null; 

  const handleSave = async () => { 
    setError(null); 
    if (!title.trim()) { 
      setError('Bitte gib einen Titel ein.'); 
      return; 
    } 

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
        isPublished,
        isPublic,
        participantGroupIds, 
        participantUserIds, 
        participantTeamIds,
        participantHelperIds,
        plannedStartTime, 
        plannedEndTime, 
        startDate: plannedStartTime, 
        seriesId: existingEvent?.seriesId || eventId, 
        isArchived: existingEvent?.isArchived || false, 
        reminderSenderUserId: reminderSenderUserId || undefined,
        reminderLeadDays: reminderSenderUserId ? parseInt(reminderLeadDays, 10) : undefined,
        reminderCustomText: reminderSenderUserId ? reminderCustomText.trim() : undefined,
        reminderSentAt: existingEvent?.reminderSentAt
      }; 

      (eventPayload as any).color = color;

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
         
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar"> 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-lg"> 
            
            <div className="md:col-span-2 flex gap-3"> 
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Projekt / Titel der Sitzung *</label> 
                {/* CHIRURGISCHER EINGRIFF: disabled={isFollowUp} entfernt */}
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500" placeholder="z.B. Vorstandssitzung Q3" required /> 
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label> 
                <input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={isFollowUp} className="w-full h-[42px] p-1 border border-gray-900 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" /> 
              </div>
            </div> 
            {isFollowUp && (
              <p className="text-xs text-gray-500 md:col-span-2 -mt-3 italic">
                {/* CHIRURGISCHER EINGRIFF: Hinweis-Text angepasst */}
                Die Farbe ist für alle Sitzungen dieses Projekts fest vergeben.
              </p>
            )}

            <div className="md:col-span-2"> 
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label> 
              <select value={status} onChange={e => setStatus(e.target.value as Event['status'])} className="w-full p-2 border border-gray-900 rounded font-bold"> 
                <option value="PLANUNG">{isPublished ? 'Planung (Agenda veröffentlicht)' : 'In Planung (Entwurf)'}</option> 
                <option value="AKTIV">Aktiv (Sitzung läuft)</option> 
                <option value="ABGESCHLOSSEN">Abgeschlossen (Protokolliert)</option> 
              </select> 
            </div> 

            <div className="md:col-span-2"> 
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung / Fokus der Sitzung</label> 
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500" rows={2}></textarea> 
            </div> 

            <div className="md:col-span-2"> 
              <label className="block text-sm font-medium text-gray-700 mb-1">Ort / Link</label> 
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500" placeholder="Vereinsheim oder Zoom-Link" /> 
            </div> 

            <div> 
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label> 
              <input  
                type="date"  
                value={startDateStr}  
                onChange={e => setStartDateStr(e.target.value)}  
                min={existingEvent?.seriesId ? new Date().toISOString().substring(0,10) : undefined} 
                className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500"  
                required  
              /> 
            </div> 

            <div className="flex gap-2"> 
              <div className="flex-1"> 
                <label className="block text-sm font-medium text-gray-700 mb-1">Start (Uhrzeit)</label> 
                <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500" /> 
              </div> 
              <div className="flex-1"> 
                <label className="block text-sm font-medium text-gray-700 mb-1">Ende (Uhrzeit)</label> 
                <input type="time" value={endTimeStr} onChange={e => setEndTimeStr(e.target.value)} className="w-full p-2 border border-gray-900 rounded focus:ring-blue-500" /> 
              </div> 
            </div> 
          </div> 

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3"> 
            <h3 className="text-md font-bold text-blue-800">Teilnehmer (Wer muss eingeladen werden?)</h3> 
            <p className="text-xs text-blue-600/80 mb-2">Suche nach App-Nutzern oder ganzen Ämtern, um sie dem Termin zuzuweisen.</p>
            <div className="border border-blue-200 rounded-xl bg-white overflow-hidden shadow-sm">
              <SmartEntityPicker
                selections={{
                  userIds: participantUserIds,
                  groupIds: participantGroupIds,
                  teamIds: participantTeamIds,
                  helperIds: participantHelperIds
                }}
                onChange={(sel) => {
                  setParticipantUserIds(sel.userIds);
                  setParticipantGroupIds(sel.groupIds);
                  setParticipantTeamIds(sel.teamIds);
                  setParticipantHelperIds(sel.helperIds);
                }}
                allowedTypes={['USER', 'GROUP']} // CHIRURGISCHER EINGRIFF: Drosselung auf interne Teilnehmer
                showBadges={true}
                placeholder="App-Nutzer oder Ämter suchen..."
              />
            </div>
          </div> 

          <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-green-900 flex items-center border-b border-green-200 pb-2">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Erinnerung an Teilnehmer (Optional)
            </h3>
            
            <div className="space-y-4">
              {/* Absender */}
              <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                <label className="block text-xs font-bold text-green-700 mb-2 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1" /> Wer verschickt die WhatsApp? (Absender)
                </label>
                
                {/* Badge-Anzeige für ausgewählten Absender */}
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

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <SmartEntityPicker
                    selections={{ userIds: reminderSenderUserId ? [reminderSenderUserId] : [], groupIds: [], teamIds: [], helperIds: [] }}
                    onChange={(sel) => setReminderSenderUserId(sel.userIds.length > 0 ? sel.userIds[sel.userIds.length - 1] : '')}
                    allowedTypes={['USER']}
                    placeholder="App-Nutzer suchen..."
                  />
                </div>
              </div>
              
              {reminderSenderUserId && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-green-100 shadow-sm">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-green-800 mb-1">Tage vorher?</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="365"
                      value={reminderLeadDays} 
                      onChange={(e) => setReminderLeadDays(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs font-bold text-green-800 mb-1">Zusätzlicher Text (Optional)</label>
                    <textarea 
                      value={reminderCustomText} 
                      onChange={(e) => setReminderCustomText(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                      rows={2}
                      placeholder="Hallo zusammen, bitte denkt an die kommende Sitzung..."
                    />
                    <p className="text-xs text-green-700 mt-1 leading-tight">
                      Titel, Ort, Datum und Zeit der Sitzung werden automatisch eingefügt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Sichtbarkeit</label>
            <div className="flex items-center">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 mr-2 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
              <label htmlFor="isPublic" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center hover:text-blue-700 transition-colors">
                <Globe className="w-4 h-4 mr-1.5 text-blue-500" /> Auf Homepage zeigen
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Macht diese Sitzung öffentlich auf eurer Webseite sichtbar.
            </p>
          </div>

        </div> 

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col gap-3 shrink-0"> 
          {error && ( 
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200 flex items-center font-bold"> 
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
// --- END OF FILE ---