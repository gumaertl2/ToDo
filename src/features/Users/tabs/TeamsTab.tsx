// [2026-10-08] - UX-FEATURE: Button "Umbenennen" in "Einstellungen" (Zahnrad) geändert und für Captains (MF) freigeschaltet.
// [2026-09-28] - UX-FEATURE: Read-Only Modus für die Saison-Planung. Einfache Team-Mitglieder können die Matrix nun einsehen, aber nicht bearbeiten.
// [2026-09-28] - BUGFIX: TypeScript Build-Fehler behoben (ungültige 'title'-Attribute an Lucide-Icons entfernt).
// [2026-09-28] - UX-FIX: Footer der Team-Kachel für mobile Geräte optimiert (Stacked Layout mit w-full Buttons).
// [2026-09-28] - UX-FEATURE: Button "Saison planen" (MatchLineupMatrixModal) in Team-Kachel integriert. Sichtbar für Admins und eingetragene Captains.
// [2026-09-28] - UX-FEATURE: Interaktive Zuweisung von Captains und Stammspielern direkt in den Team-Kacheln (Base & Override Prinzip).
// [2026-07-30] - UX-FEATURE: Alphabetische Sortierung (A-Z, nach Vorname) für die Mitgliederliste in den Team-Kacheln hinzugefügt.
// [2026-05-15] - FEATURE: Deep-Link Support (Kader-Namen sind klickbar und setzen focusedHelperId)
// [2026-05-15] - FEATURE: TeamsTab - Kader-Anzeige für alle Nutzer (Namen-Liste in den Kacheln)
// src/features/Users/tabs/TeamsTab.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { Trash2, Users, User, Star, Shield, Calendar, Settings } from 'lucide-react';
import type { Team } from '../../../core/types/models';
import { MatchLineupMatrixModal } from '../components/MatchLineupMatrixModal';

interface TeamsTabProps {
  openTeamEditor: (t?: Team) => void;
  canManageMitglieder: boolean;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ openTeamEditor, canManageMitglieder }) => {
  const { teams, helpers, deleteTeam, updateTeam, setFocusedHelperId, user } = useClubStore();
  const [planningTeam, setPlanningTeam] = useState<Team | null>(null);

  const currentUserHelperId = useMemo(() => {
    if (!user || !user.email) return null;
    return helpers.find(h => h.email?.toLowerCase() === user.email.toLowerCase())?.id;
  }, [user, helpers]);

  const handleDelete = async (team: Team) => {
    if (window.confirm(`Möchtest du das Team "${team.name}" wirklich löschen?`)) {
      if (team.id) {
        await deleteTeam(team.id);
      }
    }
  };

  const toggleCaptain = async (team: Team, helperId: string) => {
    const current = team.captainHelperIds || [];
    const updated = current.includes(helperId)
      ? current.filter(id => id !== helperId)
      : [...current, helperId];
    await updateTeam({ ...team, captainHelperIds: updated });
  };

  const toggleDefaultLineup = async (team: Team, helperId: string) => {
    const current = team.defaultLineupHelperIds || [];
    const updated = current.includes(helperId)
      ? current.filter(id => id !== helperId)
      : [...current, helperId];
    await updateTeam({ ...team, defaultLineupHelperIds: updated });
  };

  if (teams.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Teams vorhanden</h3>
        <p className="text-sm">
          Es wurden noch keine Teams oder Gruppen angelegt.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
          const teamMembers = helpers
            .filter(h => h.teamIds?.includes(team.id))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          
          const isCaptain = currentUserHelperId && team.captainHelperIds?.includes(currentUserHelperId);
          const isTeamMember = currentUserHelperId && teamMembers.some(m => m.id === currentUserHelperId);
          
          const hasFooterAccess = canManageMitglieder || isCaptain;
          const showMatrixButton = hasFooterAccess || isTeamMember; // Mitglieder dürfen Ansicht sehen
          
          return (
            <div key={team.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col h-full">
              
              {/* Header: Team Name & Anzahl */}
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  {teamMembers.length}
                </span>
              </div>

              {/* Body: Liste der Namen (Kader) */}
              <div className="p-4 flex-1">
                <div className="flex justify-between items-end mb-3">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Mitglieder / Kader</h4>
                  <div className="flex gap-3">
                    <span className="flex items-center text-[9px] text-gray-400 font-bold"><Star className="w-3 h-3 mr-0.5 text-yellow-500" /> Stamm</span>
                    <span className="flex items-center text-[9px] text-gray-400 font-bold"><Shield className="w-3 h-3 mr-0.5 text-blue-600" /> Captain</span>
                  </div>
                </div>

                {teamMembers.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {teamMembers.map(m => {
                      if (!m.id) return null;
                      const isTeamCaptain = team.captainHelperIds?.includes(m.id) || false;
                      const isLineup = team.defaultLineupHelperIds?.includes(m.id) || false;

                      return (
                        <div key={m.id} className="flex items-stretch justify-between bg-gray-50 border border-gray-200 rounded-md transition-colors overflow-hidden group">
                          {/* Name (Klickbar für Profil-Fokus) */}
                          <button 
                            onClick={() => setFocusedHelperId(m.id)}
                            title={`${m.name} in der Mitgliederliste anzeigen`}
                            className="flex items-center gap-2 px-2.5 py-1.5 flex-1 text-left hover:bg-blue-50 focus:outline-none transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{m.name}</span>
                          </button>

                          {/* Action Buttons für Admins */}
                          {canManageMitglieder ? (
                            <div className="flex items-center bg-white border-l border-gray-200 divide-x divide-gray-100">
                              <button
                                onClick={() => toggleDefaultLineup(team, m.id)}
                                title="Als Stammspieler (Fundament) festlegen/entfernen"
                                className={`px-2 py-1.5 transition-colors ${isLineup ? 'bg-yellow-50 text-yellow-500 hover:bg-yellow-100' : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-50'}`}
                              >
                                <Star className="w-4 h-4" fill={isLineup ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={() => toggleCaptain(team, m.id)}
                                title="Als Mannschaftsführer (Recht) festlegen/entfernen"
                                className={`px-2 py-1.5 transition-colors ${isTeamCaptain ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-gray-300 hover:text-blue-600 hover:bg-gray-50'}`}
                              >
                                <Shield className="w-4 h-4" fill={isTeamCaptain ? "currentColor" : "none"} />
                              </button>
                            </div>
                          ) : (
                            /* Anzeige der Icons für normale Mitglieder ohne Schreibrecht */
                            (isLineup || isTeamCaptain) && (
                              <div className="flex items-center gap-1.5 px-2 bg-white border-l border-gray-200">
                                {isLineup && <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />}
                                {isTeamCaptain && <Shield className="w-3.5 h-3.5 text-blue-600" fill="currentColor" />}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Noch keine Mitglieder zugewiesen.</p>
                )}
              </div>
              
              {/* Footer: Admin- & Captain-Aktionen (Mobile Optimized) */}
              {showMatrixButton && (
                <div className="p-3 border-t border-gray-100 flex flex-col gap-2 bg-gray-50 rounded-b-xl">
                  {/* Primärer Button für Captains, Admins & Team-Mitglieder - Volle Breite */}
                  <button 
                    onClick={() => setPlanningTeam(team)}
                    className={`flex items-center justify-center w-full gap-1.5 px-3 py-2 text-sm font-bold text-white rounded-lg transition shadow-sm ${hasFooterAccess ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                    title={hasFooterAccess ? "Saison-Planung (Aufstellung) öffnen" : "Saison-Übersicht ansehen"}
                  >
                    <Calendar className="w-4 h-4" />
                    {hasFooterAccess ? 'Saison planen' : 'Saison-Übersicht'}
                  </button>
                  
                  {/* Sekundäre Buttons für Admins und Captains */}
                  {(canManageMitglieder || isCaptain) && (
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => openTeamEditor(team)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition shadow-sm"
                        title="Team-Einstellungen (Fristen & Texte)"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Einstellungen
                      </button>
                      
                      {canManageMitglieder && (
                        <button 
                          onClick={() => handleDelete(team)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-white hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg transition shadow-sm"
                          title="Team löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Löschen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Planungs-Matrix Modal */}
      {planningTeam && (
        <MatchLineupMatrixModal 
          team={planningTeam} 
          isReadOnly={!(canManageMitglieder || (currentUserHelperId && planningTeam.captainHelperIds?.includes(currentUserHelperId)))}
          onClose={() => setPlanningTeam(null)} 
        />
      )}
    </div>
  );
};
// --- END OF FILE ---