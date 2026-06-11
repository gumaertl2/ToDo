// [2026-05-15] - FEATURE: Deep-Link Support (Kader-Namen sind klickbar und setzen focusedHelperId)
// [2026-05-15] - FEATURE: TeamsTab - Kader-Anzeige für alle Nutzer (Namen-Liste in den Kacheln)
// src/features/Users/tabs/TeamsTab.tsx
import React from 'react';
import { useClubStore } from '../../../store/useClubStore';
import { Edit2, Trash2, Users, User } from 'lucide-react';
import type { Team } from '../../../core/types/models';

interface TeamsTabProps {
  openTeamEditor: (t?: Team) => void;
  canManageMitglieder: boolean;
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ openTeamEditor, canManageMitglieder }) => {
  // CHIRURGISCHER EINGRIFF: setFocusedHelperId aus dem Store holen
  const { teams, helpers, deleteTeam, setFocusedHelperId } = useClubStore();

  const handleDelete = async (team: Team) => {
    if (window.confirm(`Möchtest du das Team "${team.name}" wirklich löschen?`)) {
      if (team.id) {
        await deleteTeam(team.id);
      }
    }
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
          // Extrahiere alle Mitglieder, die diesem Team zugeordnet sind
          const teamMembers = helpers.filter(h => h.teamIds?.includes(team.id));
          
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
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Mitglieder / Kader</h4>
                {teamMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map(m => (
                      <button 
                        key={m.id} 
                        onClick={() => {
                          if (m.id) setFocusedHelperId(m.id);
                        }}
                        title={`${m.name} in der Mitgliederliste anzeigen`}
                        className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-sm border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                      >
                        <User className="w-3 h-3 text-gray-400" />
                        {m.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Noch keine Mitglieder zugewiesen.</p>
                )}
              </div>
              
              {/* Footer: Admin-Aktionen (Nur für Berechtigte sichtbar) */}
              {canManageMitglieder && (
                <div className="p-3 border-t border-gray-100 flex justify-end gap-1 bg-white rounded-b-xl">
                  <button 
                    onClick={() => openTeamEditor(team)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Team bearbeiten"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Bearbeiten
                  </button>
                  <button 
                    onClick={() => handleDelete(team)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Team löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Löschen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
// --- END OF FILE ---