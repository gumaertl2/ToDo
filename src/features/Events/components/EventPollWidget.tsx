// [2026-10-08] - UX-FEATURE: Kompletter Mobile-First Umbau auf "Inline-Akkordeon". Abstimmzeile und Ergebnisse verschmelzen. Links abstimmen, rechts Pfeil zum Aufklappen der Namen/Kommentare direkt unter der Option. Keine separate Ergebnisliste mehr nötig.
// [2026-10-08] - SEC-FIX: Strikte Auswertung des 'result.success' von savePollResponse hinzugefügt. Zeigt nun ein klares alert() bei Firebase-Fehlern (z.B. fehlende Rules).
// [2026-10-08] - BUGFIX: Safe-Navigation-Operatoren (?.) und Array-Fallbacks (|| []) hinzugefügt, um Abstürze bei fehlenden/unvollständigen Datenstrukturen zu verhindern.
// [2026-10-08] - FEATURE: Neues RSVP / Umfrage-Widget (EventPollWidget) für Kalender-Events (WhatsApp-Style) erstellt.
// src/features/Events/components/EventPollWidget.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import type { PollConfig } from '../../../core/types/models';
import { CheckCircle2, Circle, CheckSquare, Square, MessageSquare, Send, User, AlertCircle, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface EventPollWidgetProps {
  eventId: string;
  pollConfig: PollConfig;
}

export const EventPollWidget: React.FC<EventPollWidgetProps> = ({ eventId, pollConfig }) => {
  const {
    user,
    helpers,
    pollResponsesByEvent,
    subscribeToEventPoll,
    unsubscribeFromEventPoll,
    savePollResponse
  } = useClubStore();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // State für die Akkordeons (welche Optionen sind inline aufgeklappt?)
  const [expandedOptions, setExpandedOptions] = useState<string[]>([]);

  // 1. Identifiziere den aktuellen Nutzer als Mitglied (Helper)
  const myHelper = useMemo(() => {
    if (!user?.email) return null;
    return helpers.find(h => h.email?.toLowerCase() === user.email?.toLowerCase()) || null;
  }, [user, helpers]);

  // 2. Lade Live-Daten (Schatten-Akte) für genau diesen Termin
  useEffect(() => {
    subscribeToEventPoll(eventId);
    return () => unsubscribeFromEventPoll(eventId);
  }, [eventId, subscribeToEventPoll, unsubscribeFromEventPoll]);

  const responses = pollResponsesByEvent[eventId] || [];

  // 3. Prüfe, ob der Nutzer hier schon abgestimmt hat, und fülle die UI vor
  const myResponse = useMemo(() => {
    if (!myHelper) return null;
    return responses.find(r => r.helperId === myHelper.id) || null;
  }, [responses, myHelper]);

  useEffect(() => {
    if (myResponse) {
      setSelectedIds(myResponse.selectedOptionIds || []);
      setComment(myResponse.comment || '');
    }
  }, [myResponse]);

  // 4. Abstimmungs-Logik (Single Choice vs Multiple Choice)
  const toggleOption = (optId: string) => {
    if (pollConfig?.isMultipleChoice) {
      setSelectedIds(prev => prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]);
    } else {
      setSelectedIds([optId]);
    }
  };
  
  const toggleAccordion = (e: React.MouseEvent, optId: string) => {
    e.stopPropagation();
    setExpandedOptions(prev => prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]);
  };

  const handleSubmit = async () => {
    if (!myHelper) return;
    setIsSaving(true);
    
    try {
      const result = await savePollResponse({
        id: myResponse?.id || `poll-${eventId}-${myHelper.id}`,
        schemaVersion: '1.0',
        eventId,
        helperId: myHelper.id,
        selectedOptionIds: selectedIds,
        comment: comment.trim()
      });

      if (!result.success) {
        console.error("Firebase-Ablehnung beim Speichern der Abstimmung:", result.error);
        alert(`🚨 Fehler beim Speichern!\n\nDie Datenbank hat die Anfrage abgelehnt. Hast du die neuen Firebase Rules hochgeladen?\n\nDetails: ${result.error?.message || 'Unbekannt'}`);
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Speichern der Abstimmung:", error);
      alert("Unerwarteter Fehler beim Speichern. Bitte überprüfe deine Verbindung.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanged = !myResponse 
    ? selectedIds.length > 0 || comment.trim() !== ''
    : JSON.stringify([...(myResponse.selectedOptionIds || [])].sort()) !== JSON.stringify([...selectedIds].sort()) || (myResponse.comment || '') !== comment.trim();

  // 5. Auswertung gruppieren (Für die Inline-Darstellung)
  const results = useMemo(() => {
    return (pollConfig?.options || []).map(opt => {
      const voters = responses.filter(r => (r.selectedOptionIds || []).includes(opt.id)).map(r => {
        const h = helpers.find(x => x.id === r.helperId);
        return {
          name: h ? (h.alias || h.name.split(' ')[0]) : 'Unbekannt',
          comment: r.comment
        };
      });
      return { option: opt, voters };
    });
  }, [pollConfig, responses, helpers]);

  if (!pollConfig?.isActive) return null;

  return (
    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl overflow-hidden mt-6 shadow-sm">
      <div className="bg-indigo-100/60 p-3 border-b border-indigo-100 flex items-center justify-between">
        <h3 className="font-bold text-indigo-900 flex items-center text-sm">
          <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
          Rückmeldungen & Umfrage
        </h3>
        <span className="text-[11px] font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
          {responses.length} Antworten
        </span>
      </div>

      <div className="p-4 space-y-4">
        
        {!myHelper ? (
          <div className="flex items-center text-orange-600 text-sm font-medium p-3 bg-orange-50 border border-orange-100 rounded-lg">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            Dein App-Login ist nicht mit einem Mitgliedsprofil verknüpft. Du kannst daher nicht abstimmen.
          </div>
        ) : (
          <>
            {/* INLINE-AKKORDEON: Optionen und Ergebnisse in einer einzigen kompakten Liste */}
            <div className="flex flex-col gap-3">
              {results.map(({ option, voters }) => {
                const isSelected = selectedIds.includes(option.id);
                const isExpanded = expandedOptions.includes(option.id);
                const voteCount = voters.length;
                const commentsCount = voters.filter(v => v.comment && v.comment.trim() !== '').length;
                
                return (
                  <div
                    key={option.id}
                    className={`flex flex-col rounded-lg border transition-all overflow-hidden ${
                      isSelected 
                        ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                    }`}
                  >
                    {/* OBERE ZEILE: Klick-Zonen für Abstimmen (Links) und Aufklappen (Rechts) */}
                    <div className="flex items-stretch min-h-[44px]">
                      {/* Linke Klick-Zone: Abstimmen */}
                      <button 
                        onClick={() => toggleOption(option.id)}
                        className={`flex items-center flex-1 text-left p-3 transition-colors ${isSelected ? 'bg-indigo-50/80' : 'hover:bg-gray-50'}`}
                      >
                        {pollConfig?.isMultipleChoice ? (
                          isSelected ? <CheckSquare className="w-5 h-5 text-indigo-600 mr-3 shrink-0" /> : <Square className="w-5 h-5 text-gray-300 mr-3 shrink-0" />
                        ) : (
                          isSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-600 mr-3 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 mr-3 shrink-0" />
                        )}
                        <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {option.text}
                        </span>
                      </button>

                      {/* Rechte Klick-Zone: Akkordeon umschalten */}
                      <div 
                        onClick={(e) => toggleAccordion(e, option.id)}
                        title="Ergebnisse anzeigen"
                        className={`flex items-center justify-end gap-1.5 px-3 py-2 cursor-pointer transition-colors border-l ${isSelected ? 'border-indigo-200 hover:bg-indigo-100/50' : 'border-gray-100 hover:bg-gray-100'}`}
                      >
                        {commentsCount > 0 && (
                          <span className="flex items-center text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shadow-sm">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {commentsCount}
                          </span>
                        )}
                        {voteCount > 0 && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                            {voteCount}
                          </span>
                        )}
                        <div className="text-gray-400 ml-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* UNTERER BEREICH: Aufgeklappte Ergebnisse (Inline) */}
                    {isExpanded && (
                      <div className={`p-3 border-t text-sm space-y-2 ${isSelected ? 'bg-indigo-100/30 border-indigo-200' : 'bg-gray-50/50 border-gray-100'}`}>
                        {voters.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-1">Noch keine Stimmen für diese Option.</p>
                        ) : (
                          voters.map((v, i) => (
                            <div key={i} className="flex items-start py-1">
                              <User className="w-3.5 h-3.5 text-indigo-400 mr-2 mt-0.5 shrink-0" />
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800">{v.name}</span>
                                {v.comment && (
                                  <span className="text-gray-600 text-xs italic leading-snug mt-0.5 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm inline-block">
                                    "{v.comment}"
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* KOMMENTAR & SPEICHERN: Unten als Abschluss */}
            <div className="pt-2 space-y-3">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optionaler Kommentar (z.B. Bringe Salat mit...)"
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
              />

              {hasChanged && (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="w-full flex items-center justify-center py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSaving ? 'Speichert...' : 'Abstimmen'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---