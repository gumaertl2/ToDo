// [2026-07-23] - UX-CLEANUP: Domain-Language angepasst ("App-Nutzer" -> "Vorstand", "Gast" -> "Mitglied").
// [2026-07-23] - BUGFIX: Ungenutzte Variablen (Trash2, handleSafeDeleteHelper) nach DSGVO-Cleanup entfernt (TS6133 Fix).
// [2026-05-25] - BUGFIX: 'parentItemContext' an ItemFormModal durchgereicht. Klicks auf Unterpunkte im Tab "Rollen & Ämter" zeigen nun im Modal wieder korrekt den Link zum übergeordneten Oberpunkt (Agenda-Container) an.
// [2026-05-15] - FEATURE: Deep-Link Support (Auto-Tab-Switch bei fokussiertem Mitglied)
// [2026-05-15] - BUGFIX: fetchTeams im Lade-Zyklus ergänzt, damit Teams beim Start geladen werden
// [2026-05-15] - FEATURE: Option B - Teams Tab hinzugefügt (Gruppen-Verwaltung inkl. RBAC)
// 2026-04-18 20:30 - FIX: TypeScript Build Error (TS2339) behoben (Fallback-Objekt um 'id' erweitert)
// 2026-04-24 17:30 - FEATURE: Amtsübergabe-Assistent (UserSuccessionModal) integriert
// 2026-05-11 18:40 - LOGIK-FIX: Erstellen von Rollen hängt nun am Recht 'App Nutzer verwalten' statt 'Rollen sehen'.
// 2026-05-13 21:25 - BUGFIX: Import-Pfad für EhrungenTab korrigiert.
// 2026-05-13 22:10 - UX-CLEANUP: Toolbar zentralisiert. Doppelte Buttons entfernt & Matrix-Button restauriert.
// src/features/Users/UsersView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
// CHIRURGISCHER EINGRIFF: Trash2 entfernt
import { UserPlus, Tag, Upload, Lock, Users } from 'lucide-react';

import { HelperFormModal } from './HelperFormModal';
import { UserFormModal } from './UserFormModal';
import { GroupFormModal } from './GroupFormModal';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { CsvImportModal } from './CsvImportModal';
import { RoleMatrixModal } from './RoleMatrixModal';
import { UserSuccessionModal } from './UserSuccessionModal'; 
import { TeamFormModal } from './TeamFormModal'; 

import { AppUserTab } from './tabs/AppUserTab';
import { MitgliederTab } from './tabs/MitgliederTab';
import { RollenTab } from './tabs/RollenTab';
import { EhrungenTab } from './tabs/EhrungenTab';
import { TeamsTab } from './tabs/TeamsTab'; 

import type { Helper, User, Group, AgendaItem, Team } from '../../core/types/models'; 

export const UsersView: React.FC = () => {
  const { 
    user, roleProfiles, groups, fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks, fetchTeams,
    saveAgendaItem, isUsersLoading,
    focusedHelperId, 
    allAgendaItems 
  } = useClubStore(); // CHIRURGISCHER EINGRIFF: deleteHelper entfernt
  
  const [activeTab, setActiveTab] = useState<'appusers' | 'mitglieder' | 'teams' | 'rollen' | 'ehrungen'>('appusers');
  
  const [isHelperModalOpen, setIsHelperModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingHelper, setEditingHelper] = useState<Helper | undefined>(undefined);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const [successionUser, setSuccessionUser] = useState<User | null>(null);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>(undefined);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | undefined>(undefined);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AgendaItem | null>(null);

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const currentProfile = useMemo(() => {
    return roleProfiles.find(p => p.id === user?.roleProfileId) || 
           // CHIRURGISCHER EINGRIFF: 'Gast' zu 'Mitglied' geändert
           roleProfiles.find(p => p.name === 'Mitglied') || 
           { id: '', permissions: {} as any };
  }, [user, roleProfiles]);
  
  const perms = currentProfile.permissions || {};
  const isSysAdmin = currentProfile.id === 'pro-admin';
  const canManageAppUsers = perms.viewAppUsers !== undefined ? perms.viewAppUsers : isSysAdmin;
  const canViewRoles = perms.viewRoles !== undefined ? perms.viewRoles : isSysAdmin;
  const canManageMitglieder = !!perms.manageMitglieder;

  useEffect(() => {
    if (focusedHelperId) {
      setActiveTab('mitglieder');
    }
  }, [focusedHelperId]);

  useEffect(() => {
    fetchUsersAndHelpers();
    fetchTemplatesAndRoutines();
    fetchEvents();
    fetchTasks();
    fetchTeams(); 
  }, [fetchUsersAndHelpers, fetchTemplatesAndRoutines, fetchEvents, fetchTasks, fetchTeams]);

  const openHelperEditor = (h?: Helper) => { setEditingHelper(h); setIsHelperModalOpen(true); };
  const openUserEditor = (u?: User) => { setEditingUser(u); setIsUserModalOpen(true); };
  const openGroupEditor = (g?: Group) => { setEditingGroup(g); setIsGroupModalOpen(true); };
  const openTaskEditor = (t: AgendaItem) => { setEditingTask(t); setIsTaskModalOpen(true); };
  const openTeamEditor = (t?: Team) => { setEditingTeam(t); setIsTeamModalOpen(true); };

  // CHIRURGISCHER EINGRIFF: handleSafeDeleteHelper restlos entfernt

  const toggleGroupExpanded = (id: string) => {
    const next = new Set(expandedGroups);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedGroups(next);
  };

  const toggleAllGroups = () => {
    if (expandedGroups.size === groups.length && groups.length > 0) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(groups.map(g => g.id)));
    }
  };

  const availableTabs = [
    { id: 'mitglieder', label: 'Mitglieder & Helfer', show: true }, 
    { id: 'teams', label: 'Teams & Gruppen', show: true }, 
    { id: 'ehrungen', label: 'Ehrungen & Jubiläen', show: !!perms.viewEhrungen },
    // CHIRURGISCHER EINGRIFF: 'App-Nutzer' zu 'Vorstand' geändert
    { id: 'appusers', label: 'Vorstand', show: canManageAppUsers }, 
    { id: 'rollen', label: 'Rollen & Ämter', show: canViewRoles },  
  ].filter(tab => tab.show);

  useEffect(() => {
    if (!availableTabs.find(t => t.id === activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id as any);
    }
  }, [availableTabs, activeTab]);

  const editingParentTask = editingTask?.parentItemId ? allAgendaItems.find(t => t.id === editingTask.parentItemId) : undefined;

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
        {/* CHIRURGISCHER EINGRIFF: Überschrift angepasst */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">Verein & Rechte</h1>
        
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
          {activeTab === 'mitglieder' && canManageMitglieder && (
            <>
              <button onClick={() => setIsCsvModalOpen(true)} className="flex items-center px-3 py-1.5 text-sm bg-white text-gray-700 font-bold border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition">
                <Upload className="w-4 h-4 mr-2 text-blue-600" /> CSV Import
              </button>
              <button onClick={() => openHelperEditor()} className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
                <UserPlus className="w-4 h-4 mr-2" /> Mitglied anlegen
              </button>
            </>
          )}

          {activeTab === 'teams' && canManageMitglieder && (
            <button onClick={() => openTeamEditor()} className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
              <Users className="w-4 h-4 mr-2" /> Team anlegen
            </button>
          )}

          {activeTab === 'appusers' && canManageAppUsers && (
            <>
              <button onClick={() => setIsMatrixModalOpen(true)} className="flex items-center px-3 py-1.5 text-sm bg-white text-gray-700 font-bold border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition">
                <Lock className="w-4 h-4 mr-2 text-blue-600" /> Rechte-Matrix öffnen
              </button>
              <button onClick={() => openUserEditor()} className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
                {/* CHIRURGISCHER EINGRIFF: Button Text angepasst */}
                <UserPlus className="w-4 h-4 mr-2" /> Vorstand anlegen
              </button>
            </>
          )}

          {activeTab === 'rollen' && canViewRoles && (
            <>
              <button onClick={toggleAllGroups} className="flex items-center justify-center w-8 h-8 bg-white text-gray-700 border border-gray-300 font-mono font-bold text-sm rounded-lg hover:bg-gray-50 shadow-sm transition-colors" title="Alle Daueraufgaben ein-/ausblenden">+/-</button>
              {canManageAppUsers && (
                <button onClick={() => openGroupEditor()} className="flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
                  <Tag className="w-4 h-4 mr-2" /> Rolle anlegen
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-3 overflow-x-auto text-sm">
        {availableTabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`py-2 px-4 font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col ${activeTab === 'ehrungen' ? 'bg-transparent border-none shadow-none' : ''}`}>
        {isUsersLoading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse font-bold">Lade Daten...</div>
        ) : (
          <div className="divide-y divide-gray-200 flex-1 overflow-y-auto">
            {activeTab === 'appusers' && (
              <AppUserTab 
                openUserEditor={openUserEditor} 
                openMatrixEditor={() => setIsMatrixModalOpen(true)} 
                openSuccessionEditor={(u: User) => setSuccessionUser(u)} 
                isAdmin={canManageAppUsers} 
              />
            )}
            {activeTab === 'mitglieder' && <MitgliederTab openHelperEditor={openHelperEditor} canManageMitglieder={canManageMitglieder} />}
            {activeTab === 'teams' && <TeamsTab openTeamEditor={openTeamEditor} canManageMitglieder={canManageMitglieder} />}
            {activeTab === 'rollen' && <RollenTab isAdmin={canManageAppUsers} expandedGroups={expandedGroups} toggleGroupExpanded={toggleGroupExpanded} openGroupEditor={openGroupEditor} openTaskEditor={openTaskEditor} />}
            {activeTab === 'ehrungen' && <EhrungenTab />}
          </div>
        )}
      </div>

      {isHelperModalOpen && <HelperFormModal onClose={() => setIsHelperModalOpen(false)} existingHelper={editingHelper} />}
      {isUserModalOpen && <UserFormModal onClose={() => setIsUserModalOpen(false)} existingUser={editingUser} />}
      {isGroupModalOpen && <GroupFormModal onClose={() => setIsGroupModalOpen(false)} existingGroup={editingGroup} />}
      {isTeamModalOpen && <TeamFormModal onClose={() => setIsTeamModalOpen(false)} existingTeam={editingTeam} />}
      
      {isTaskModalOpen && editingTask && (
        <ItemFormModal 
          isOpen={isTaskModalOpen} 
          existingItem={editingTask} 
          parentItemContext={editingParentTask}
          onNavigateToParent={() => {}} 
          onClose={() => setIsTaskModalOpen(false)} 
          onSave={async (data) => { await saveAgendaItem(data); fetchTasks(); setIsTaskModalOpen(false); }} 
        />
      )}
      
      {isCsvModalOpen && <CsvImportModal onClose={() => setIsCsvModalOpen(false)} />}
      {isMatrixModalOpen && <RoleMatrixModal onClose={() => setIsMatrixModalOpen(false)} />}
      {successionUser && <UserSuccessionModal sourceUser={successionUser} onClose={() => setSuccessionUser(null)} />}
    </div>
  );
};
// --- END OF FILE ---