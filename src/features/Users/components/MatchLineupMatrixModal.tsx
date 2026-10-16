// [2026-10-16] - UX-REFACTOR: Sauberer Tab-Wechsel (Karten | Matrix | Dienste) im Header ohne redundante Unterbalken, ehrlicher "Fertig"-Button im Footer.
// [2026-10-15] - FEATURE: 'Dienste'-Ansicht (CalendarListView) in das Saison-Modal eingebettet (Container-Swap-Prinzip), inkl. Zurück-Button zur Kader-Planung.
// [2026-10-14] - UX-FEATURE: Joker-Props (availableJokers, handleAddJoker, jokerSearchTerm, setJokerSearchTerm) an MatchLineupCardsView durchgereicht.
// [2026-10-14] - UX-FEATURE: Ansicht-Umschalter (Karten vs. Matrix) mit localStorage-Persistenz ('papatodo_lineup_view_mode') im Header integriert.
// [2026-10-12] - REFACTOR: Hauptdatei massiv verschlankt. Komplette Logik in useMatchLineupMatrix ausgelagert, Tabellen-Struktur in MatchLineupMatrixTable und MatchLineupLogisticsRow gekapselt.
// [2026-10-12] - UX-FIX: Schließen-Button "X" oben rechts auf Handys sichtbar gemacht (hidden md:block entfernt).
// [2026-10-12] - UX-FEATURE: Wochentage (Mo, Di, Mi...) in der Datumsanzeige der Spiele ergänzt.
// [2026-10-12] - UX-FEATURE: Automatischer Spiele-Zähler (Anzahl Nominierungen) pro Spieler im Tabellenkopf ergänzt.
// [2026-10-12] - FEATURE: Google Maps Routing-Button (🗺️) neben der Abfahrtszeit für Auswärtsspiele eingebaut (nutzt homeArenaAddress als festen Startpunkt).
// [2026-10-11] - FEATURE: Abfahrtszeit (departureTime) in Logistik-Reihe (Fahrer) eingebaut. Basis für zukünftige Google Maps Integration.
// [2026-10-09] - FEATURE: Logistik-Modul (Fahrer & Betreuer) in Matrix integriert. Inklusive Self-Service Tauschbörse für Helfer und Dropdown-Zuweisung für Mannschaftsführer.
// [2026-10-08] - FEATURE: MF-Override (Schraffiertes Design). Captains können nun die Verfügbarkeit anderer Spieler ändern (isSetByMF Flag).
// [2026-09-30] - FEATURE: Base & Override V2 (Bottom-Up). Spieler können ihre eigene Zelle anklicken (Verfügbarkeit: Da/Weg).
// [2026-09-30] - FEATURE: Auto-Freeze und manuelles Siegel (🔒) in die Matrix integriert. Notfall-Alert bei verspäteten Absagen eingebaut.
// src/features/Users/components/MatchLineupMatrixModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, UserPlus, Search, LayoutList, Table as TableIcon, Car } from 'lucide-react';
import type { Team } from '../../../core/types/models';
import { useMatchLineupMatrix } from '../hooks/useMatchLineupMatrix';
import { MatchLineupMatrixTable } from './MatchLineupMatrixTable';
import { MatchLineupCardsView } from './MatchLineupCardsView';
import { CalendarListView } from '../../Events/components/CalendarListView';
import type { AdaptedEvent } from '../../Events/hooks/useCalendarEvents';

interface MatchLineupMatrixModalProps {
  team: Team;
  focusedEventId?: string;
  isReadOnly?: boolean;
  onClose: () => void;
}

export const MatchLineupMatrixModal: React.FC<MatchLineupMatrixModalProps> = ({ team, focusedEventId, isReadOnly, onClose }) => {
  // --- GEHIRN (DATEN & STATE) ---
  const matrixData = useMatchLineupMatrix(team, focusedEventId, isReadOnly);

  // --- ANSICHTS-MODUS (Langzeitgedächtnis via localStorage) ---
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'dienste'>(() => {
    try {
      const saved = localStorage.getItem('papatodo_lineup_view_mode');
      return (saved === 'cards' || saved === 'matrix' || saved === 'dienste') ? saved : 'cards';
    } catch {
      return 'cards';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('papatodo_lineup_view_mode', viewMode);
    } catch {
      // Ignorieren, falls localStorage blockiert ist
    }
  }, [viewMode]);

  // Transformiert die rohen ICS-Events in AdaptedEvents, die von der CalendarListView (Dienste) verstanden werden.
  const adaptedEventsForDienste = useMemo(() => {
    if (viewMode !== 'dienste') return [];
    return matrixData.events.map(e => ({
      id: e.uid,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime || e.startTime),
      allDay: e.isAllDay,
      location: e.location,
      color: matrixData.linkedSubscription?.color || '#3b82f6',
      isLogisticsDuty: true,
      teamName: team.name,
      sourceEvent: e // Das Original-ICS-Event (CachedIcsEvent), auf das SmartLogisticsBlock wartet
    } as AdaptedEvent));
  }, [matrixData.events, matrixData.linkedSubscription, team.name, viewMode]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-none md:rounded-xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-full md:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 border-b border-gray-200 flex flex-row items-start justify-between bg-gray-50 shrink-0 gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 flex items-center flex-wrap gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600 shrink-0" />
              {focusedEventId 
                ? (isReadOnly ? 'Kader-Übersicht' : 'Aufstellung ändern') 
                : (isReadOnly ? `Saison-Übersicht: ${team.name}` : `Saison-Planung: ${team.name}`)}
            </h2>
            {matrixData.linkedSubscription && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">Team: {team.name} | Abo: {matrixData.linkedSubscription.name}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* ANSICHT-UMSCHALTER (Karten vs. Matrix vs. Dienste) */}
            {matrixData.linkedSubscription && matrixData.events.length > 0 && (
              <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Karten-Ansicht (Spielplan-Look)"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Karten</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('matrix')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'matrix'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Klassische Tabellen-Matrix"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Matrix</span>
                </button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <button
                  type="button"
                  onClick={() => setViewMode('dienste')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'dienste'
                      ? 'bg-white text-emerald-600 shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Dienste & Logistik Übersicht"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dienste</span>
                </button>
              </div>
            )}

            {!isReadOnly && matrixData.linkedSubscription && viewMode !== 'dienste' && (
              <div className="relative hidden sm:block">
                <button 
                  onClick={() => matrixData.setIsJokerMenuOpen(!matrixData.isJokerMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  + Weiterer Spieler
                </button>
                
                {matrixData.isJokerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => matrixData.setIsJokerMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-5" />
                        <input 
                          autoFocus
                          type="text"
                          placeholder="Name suchen..."
                          value={matrixData.jokerSearchTerm}
                          onChange={(e) => matrixData.setJokerSearchTerm(e.target.value)}
                          autoComplete="new-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1">
                        {matrixData.availableJokers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">Keine Spieler gefunden.</div>
                        ) : (
                          matrixData.availableJokers.map(j => (
                            <button
                              key={j.id}
                              onClick={() => matrixData.handleAddJoker(j.id)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium">{j.name}</span>
                              {j.alias && <span className="text-xs text-gray-400">{j.alias}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-200 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MOBILE ACTION BAR (Joker) */}
        {!isReadOnly && matrixData.linkedSubscription && viewMode !== 'dienste' && (
          <div className="sm:hidden p-3 bg-white border-b border-gray-200 flex justify-end relative z-40">
             <button 
                onClick={() => matrixData.setIsJokerMenuOpen(!matrixData.isJokerMenuOpen)}
                className="flex w-full justify-center items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 shadow-sm transition-colors"
              >
                <UserPlus className="w-4 h-4 text-blue-600" />
                + Weiteren Spieler hinzufügen
              </button>
              
              {matrixData.isJokerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => matrixData.setIsJokerMenuOpen(false)}></div>
                  <div className="absolute left-3 right-3 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-5" />
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Name suchen..."
                        value={matrixData.jokerSearchTerm}
                        onChange={(e) => matrixData.setJokerSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {matrixData.availableJokers.map(j => (
                        <button key={j.id} onClick={() => matrixData.handleAddJoker(j.id)} className="w-full text-left px-3 py-3 text-sm text-gray-800 hover:bg-blue-50 border-b border-gray-100 last:border-0 font-medium">
                          {j.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
          </div>
        )}

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {!matrixData.linkedSubscription ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              <CalendarIcon className="w-12 h-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Kein Kalender-Abo gefunden</h3>
              <p className="text-sm max-w-md mx-auto">
                Um die Saison planen zu können, muss unter "Einstellungen & Kalender" bei einem Kalender-Abo 
                das Team "{team.name}" als Erinnerungs-Empfänger hinterlegt sein.
              </p>
            </div>
          ) : matrixData.events.length === 0 ? (
            <div className="p-10 text-center text-gray-500 flex flex-col items-center justify-center h-full">
              Keine Termine im verknüpften Kalender gefunden.
            </div>
          ) : viewMode === 'dienste' ? (
            <div className="flex flex-col h-full bg-white relative">
              <div className="flex-1 overflow-hidden relative">
                <CalendarListView 
                  currentView="dienste"
                  displayEvents={adaptedEventsForDienste}
                  currentDate={new Date()}
                  onSelectEvent={() => {}}
                  ignoreYearFilter={true}
                />
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            <MatchLineupCardsView 
              team={team}
              subscriptionColor={matrixData.linkedSubscription.color}
              focusedEventId={focusedEventId}
              isReadOnly={isReadOnly}
              events={matrixData.events}
              displayMembers={matrixData.displayMembers}
              playerGameCounts={matrixData.playerGameCounts}
              myHelperId={matrixData.myHelperId}
              matchLineups={matrixData.matchLineups}
              availableJokers={matrixData.availableJokers}
              jokerSearchTerm={matrixData.jokerSearchTerm}
              setJokerSearchTerm={matrixData.setJokerSearchTerm}
              onAddJoker={matrixData.handleAddJoker}
              localOverrides={matrixData.localOverrides}
              localAvailOverrides={matrixData.localAvailOverrides}
              localLockOverrides={matrixData.localLockOverrides}
              localSetByMFOverrides={matrixData.localSetByMFOverrides}
              localLogisticsOverrides={matrixData.localLogisticsOverrides}
              openLogisticsPicker={matrixData.openLogisticsPicker}
              setOpenLogisticsPicker={matrixData.setOpenLogisticsPicker}
              logisticsSearchTerm={matrixData.logisticsSearchTerm}
              setLogisticsSearchTerm={matrixData.setLogisticsSearchTerm}
              sortedAllHelpers={matrixData.sortedAllHelpers}
              filteredLogisticsHelpers={matrixData.filteredLogisticsHelpers}
              onTogglePlayer={matrixData.handleTogglePlayer}
              onToggleAvailability={matrixData.handleToggleAvailability}
              onToggleLock={matrixData.handleToggleLock}
              onLogisticsAction={matrixData.handleLogisticsAction}
              onDepartureTimeChange={matrixData.handleDepartureTimeChange}
            />
          ) : (
            <MatchLineupMatrixTable 
              team={team}
              focusedEventId={focusedEventId}
              isReadOnly={isReadOnly}
              events={matrixData.events}
              displayMembers={matrixData.displayMembers}
              playerGameCounts={matrixData.playerGameCounts}
              myHelperId={matrixData.myHelperId}
              matchLineups={matrixData.matchLineups}
              localOverrides={matrixData.localOverrides}
              localAvailOverrides={matrixData.localAvailOverrides}
              localLockOverrides={matrixData.localLockOverrides}
              localSetByMFOverrides={matrixData.localSetByMFOverrides}
              localLogisticsOverrides={matrixData.localLogisticsOverrides}
              openLogisticsPicker={matrixData.openLogisticsPicker}
              setOpenLogisticsPicker={matrixData.setOpenLogisticsPicker}
              logisticsSearchTerm={matrixData.logisticsSearchTerm}
              setLogisticsSearchTerm={matrixData.setLogisticsSearchTerm}
              sortedAllHelpers={matrixData.sortedAllHelpers}
              filteredLogisticsHelpers={matrixData.filteredLogisticsHelpers}
              onTogglePlayer={matrixData.handleTogglePlayer}
              onToggleAvailability={matrixData.handleToggleAvailability}
              onToggleLock={matrixData.handleToggleLock}
              onLogisticsAction={matrixData.handleLogisticsAction}
              onDepartureTimeChange={matrixData.handleDepartureTimeChange}
            />
          )}
        </div>
        
        {/* FOOTER */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-40">
          <div className="text-xs text-gray-400 hidden sm:block">
            ✓ Alle Änderungen werden automatisch im Hintergrund gespeichert
          </div>
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors text-sm cursor-pointer"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---