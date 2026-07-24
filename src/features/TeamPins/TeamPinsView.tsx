// [2026-07-24] - ARCHITECTURE-FIX: Team-PINs nutzen nun dynamische `assignedTeamIds` anstelle von statisch aufgelösten Helfern (SSOT), sodass Team-Änderungen sofort live greifen.
// [2026-05-16] - UX-FIX: Festen Höhen-Container entfernt und showBadges={true} aktiviert für einklappbare Such-UX.
// [2026-05-15] - REFACTOR: App-Nutzer-Spalte im Formular entfernt (Sichtbarkeit nur noch über Teams/Helfer geregelt)
// [2026-05-15] - REFACTOR: Eigene Helfer-Suche durch universellen SmartEntityPicker ersetzt
// 2026-04-30 17:15 - FEATURE: Ansicht für den Wettkampf-Tresor (Team-PINs)
// 2026-04-30 17:35 - FIX: Zeilenumbruch (wrap) deaktiviert und Boxen in der Höhe resizable gemacht
// 2026-04-30 17:40 - UX-FIX: Teams untereinander als aufklappbares Akkordeon (+/-) dargestellt
// 2026-04-30 17:50 - SEC-FIX: Verwirrendes Gruppen-Feld im Admin-Formular entfernt, strikte ACL via User-ID
// 2026-05-14 15:10 - UX-FIX: Problembehaftetes <select multiple> durch duale Checkbox-Listen ersetzt und Helfer-Freigabe integriert
// src/features/TeamPins/TeamPinsView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Key, Plus, Minus, Edit2, Trash2, Copy, Check, Globe, X, Save, Users, ShieldAlert } from 'lucide-react';
import type { TeamPin } from '../../core/types/models';
import { SmartEntityPicker } from '../Shared/components/SmartEntityPicker';

export const TeamPinsView: React.FC = () => {
  const { 
    teamPins, fetchTeamPins, saveTeamPin, deleteTeamPin, 
    user, roleProfiles, helpers, teams
  } = useClubStore();

  const [showAll, setShowAll] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<TeamPin | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchTeamPins();
  }, [fetchTeamPins]);

  // Rechte prüfen
  const currentProfile = useMemo(() => {
    return roleProfiles.find(p => p.id === user?.roleProfileId) || { permissions: {} as any };
  }, [user, roleProfiles]);

  const canManage = !!currentProfile.permissions?.manageTeamPins || !!user?.permissions?.manageTeamPins;

  // Filter-Logik: Eigene vs. Alle (User & Helfer & Dynamische Teams)
  const visiblePins = useMemo(() => {
    if (showAll && canManage) return teamPins;
    
    // Wir prüfen zur Sicherheit, ob der aktuelle Benutzer auch einen Helfer-Eintrag (Gast) hat
    const currentUserHelperId = helpers.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase())?.id;
    
    // Wir ermitteln live alle Teams, in denen der aktuelle Helfer Mitglied ist
    const currentUserTeamIds = teams.filter(t => t.memberIds?.includes(currentUserHelperId || '')).map(t => t.id);

    return teamPins.filter(pin => 
      (pin.assignedUserIds && pin.assignedUserIds.includes(user?.id || '')) || 
      (currentUserHelperId && pin.assignedHelperIds?.includes(currentUserHelperId)) ||
      (pin.assignedTeamIds && pin.assignedTeamIds.some(teamId => currentUserTeamIds.includes(teamId)))
    );
  }, [teamPins, showAll, canManage, user, helpers, teams]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Möchtest du die Codes für "${name}" wirklich löschen?`)) {
      await deleteTeamPin(id);
    }
  };

  const openForm = (pin?: TeamPin) => {
    setEditingPin(pin ? { ...pin } : {
      id: `pin-${Date.now()}`,
      schemaVersion: '1.0',
      teamName: '',
      signaturePinsText: '',
      gameEntryPinsText: '',
      assignedUserIds: [],
      assignedGroupIds: [],
      assignedHelperIds: [],
      assignedTeamIds: []
    } as TeamPin);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPin) {
      await saveTeamPin(editingPin);
      setIsFormOpen(false);
      setEditingPin(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(pinId => pinId !== id) : [...prev, id]
    );
  };

  const renderCodeBox = (title: string, text: string, url: string | undefined, boxId: string) => {
    if (!text && !url) return null;
    
    return (
      <div className="mb-6 last:mb-0 bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-bold text-gray-800 flex items-center">
            {title.includes('Unterschrift') ? '✍️' : '🏓'} <span className="ml-2">{title}</span>
          </h3>
          {text && (
            <button 
              onClick={() => handleCopy(text, boxId)}
              className="text-xs flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium text-gray-600"
            >
              {copiedId === boxId ? <Check className="w-4 h-4 text-green-600 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiedId === boxId ? 'Kopiert!' : 'Kopieren'}
            </button>
          )}
        </div>
        
        {text && (
          <div className="bg-[#1e1e1e] rounded-lg p-4 overflow-auto shadow-inner relative group resize-y min-h-[120px] max-h-[70vh]">
            <pre className="font-mono text-sm text-green-400 whitespace-pre leading-relaxed">
              {text}
            </pre>
          </div>
        )}

        {url && (
          <a 
            href={url.startsWith('http') ? url : `https://${url}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center w-full py-3 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-colors border border-blue-200 shrink-0"
          >
            <Globe className="w-5 h-5 mr-2" />
            Portal öffnen
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl">
            <Key className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Team-PINs & Codes</h1>
            <p className="text-sm text-gray-500 font-medium">Sichere offline Ablage für nuScore-Zugänge</p>
          </div>
        </div>
        
        {canManage && (
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 self-start sm:self-auto">
            <button
              onClick={() => setShowAll(false)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!showAll ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Meine Teams
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${showAll ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Gesamter Verein
            </button>
          </div>
        )}
      </div>

      {/* LISTE (Akkordeon) */}
      {visiblePins.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <ShieldAlert className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Keine Codes gefunden</h3>
          <p className="text-gray-500 max-w-md">Es wurden noch keine Mannschaftscodes hinterlegt oder du bist keinem Team zugewiesen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePins.map(pin => {
            const isExpanded = expandedIds.includes(pin.id);
            return (
              <div key={pin.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                
                {/* Card Header */}
                <div 
                  onClick={() => toggleExpand(pin.id)}
                  className="bg-gray-800 p-4 sm:p-5 flex justify-between items-center text-white shrink-0 cursor-pointer select-none hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-700 p-1.5 rounded-lg flex items-center justify-center">
                      {isExpanded ? <Minus className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-blue-400" />}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                      {pin.teamName}
                    </h2>
                  </div>
                  {canManage && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openForm(pin)} className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors" title="Bearbeiten">
                        <Edit2 className="w-4 h-4 text-gray-200" />
                      </button>
                      <button onClick={() => handleDelete(pin.id, pin.teamName)} className="p-2 bg-red-900/50 hover:bg-red-800/80 rounded-lg transition-colors" title="Löschen">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                {isExpanded && (
                  <div className="p-5 flex-1 flex flex-col border-t border-gray-700">
                    {renderCodeBox("Spiel-Codes (nuScore)", pin.gameEntryPinsText, pin.gameEntryUrl, `${pin.id}-game`)}
                    {renderCodeBox("Unterschriften-PINs", pin.signaturePinsText, pin.signatureUrl, `${pin.id}-sig`)}
                    
                    {!pin.gameEntryPinsText && !pin.signaturePinsText && !pin.gameEntryUrl && !pin.signatureUrl && (
                      <p className="text-center text-gray-500 py-4 italic">Noch keine Codes hinterlegt.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB für Admins */}
      {canManage && (
        <button
          onClick={() => openForm()}
          className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-transform transform hover:scale-105 z-40 group flex items-center"
          title="Neues Team anlegen"
        >
          <Plus className="w-7 h-7" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-3 transition-all duration-300 font-bold">
            Team hinzufügen
          </span>
        </button>
      )}

      {/* ADMIN FORMULAR MODAL */}
      {isFormOpen && editingPin && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Key className="w-6 h-6 mr-3 text-blue-600" />
                {editingPin.teamName ? 'Team bearbeiten' : 'Neues Team anlegen'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1"><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Allgemeine Info */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-800 border-b pb-2">1. Mannschaft & Sichtbarkeit</h3>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Mannschaftsname</label>
                  <input
                    required
                    type="text"
                    value={editingPin.teamName}
                    onChange={e => setEditingPin({ ...editingPin, teamName: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:border-blue-500 outline-none"
                    placeholder="z.B. Herren 1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Freigabe für folgende Personen (Teammitglieder)</label>
                  
                  <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <SmartEntityPicker
                      selections={{
                        userIds: [],
                        groupIds: [],
                        teamIds: editingPin.assignedTeamIds || [],
                        helperIds: editingPin.assignedHelperIds || []
                      }}
                      onChange={(sel) => {
                        setEditingPin({ 
                          ...editingPin, 
                          assignedTeamIds: sel.teamIds,
                          assignedHelperIds: sel.helperIds 
                        });
                      }}
                      allowedTypes={['TEAM', 'HELPER']}
                      showBadges={true}
                      placeholder="Team oder Mitglied suchen..."
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Klicke einfach auf die Personen oder Teams, denen der PIN angezeigt werden soll.</p>
                </div>
              </div>

              {/* Spieleingabe */}
              <div className="space-y-4 flex flex-col mt-6">
                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center shrink-0">
                  <span className="mr-2">🏓</span> 2. Spiel-Codes (nuScore)
                </h3>
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Text / Codes aus PDF einfügen</label>
                  <p className="text-xs text-gray-500 mb-2">Die Formatierung (Abstände) bleibt genau so erhalten, wie du sie hier einfügst.</p>
                  <textarea
                    rows={6}
                    wrap="off"
                    value={editingPin.gameEntryPinsText}
                    onChange={e => setEditingPin({ ...editingPin, gameEntryPinsText: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 font-mono text-sm focus:border-blue-500 outline-none bg-gray-50 whitespace-pre overflow-auto resize-y min-h-[120px]"
                    placeholder="Datum    Heim    Gast    Code..."
                  />
                </div>
                <div className="shrink-0 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Portal Link (URL, Optional)</label>
                  <input
                    type="text"
                    value={editingPin.gameEntryUrl || ''}
                    onChange={e => setEditingPin({ ...editingPin, gameEntryUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:border-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Unterschriften */}
              <div className="space-y-4 flex flex-col mt-6">
                <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center shrink-0">
                  <span className="mr-2">✍️</span> 3. Unterschriften-PINs
                </h3>
                <div className="flex-1 flex flex-col">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Text / PINs aus PDF einfügen</label>
                  <textarea
                    rows={6}
                    wrap="off"
                    value={editingPin.signaturePinsText}
                    onChange={e => setEditingPin({ ...editingPin, signaturePinsText: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 font-mono text-sm focus:border-blue-500 outline-none bg-gray-50 whitespace-pre overflow-auto resize-y min-h-[120px]"
                    placeholder="Datum    Heim    Gast    PIN..."
                  />
                </div>
                <div className="shrink-0 mt-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Portal Link (URL, Optional)</label>
                  <input
                    type="text"
                    value={editingPin.signatureUrl || ''}
                    onChange={e => setEditingPin({ ...editingPin, signatureUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-3 focus:border-blue-500 outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

            </form>

            <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors">
                Abbrechen
              </button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center shadow-md">
                <Save className="w-5 h-5 mr-2" />
                Team speichern
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
// --- END OF FILE ---