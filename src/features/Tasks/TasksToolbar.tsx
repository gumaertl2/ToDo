// 2026-04-22 20:55 - REFACTOR: Filter-Leiste (Toolbar) in eigenständige Komponente ausgelagert
// 2026-04-22 21:10 - FIX: TS2322 RefObject Type auf 'HTMLDivElement | null' korrigiert
// 2026-04-24 20:00 - FEATURE: Zeit-Filter (Clock-Dropdown) in die Toolbar integriert
// 2026-05-10 13:45 - UX-REFACTOR: Archiv-Button entfernt, Überschrift (H1) zum interaktiven Toggle-Switch umgebaut
// 2026-05-13 10:40 - SECURITY: Participation-First Filterung für die Dropdown-Projektliste hinzugefügt.
// 2026-05-13 17:55 - CHIRURGISCHER EINGRIFF: Tri-State Toggle (Offen / Archiv / Papierkorb) in der Hauptüberschrift implementiert.
// 2026-05-13 19:40 - UX-FIX: Automatischer Wechsel auf Listenansicht & Sperre des Kanban-Boards im Papierkorb.
// 2026-05-13 23:30 - FEATURE: Geister-Scanner Button für Admins im Papierkorb-Modus hinzugefügt.
// src/features/Tasks/TasksToolbar.tsx
import React, { useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { Kanban, List as ListIcon, Filter, Clock, ChevronDown, Check, Printer, Archive, Trash2, Ghost } from 'lucide-react';
import { User, Users } from 'lucide-react';
import { Calendar } from 'lucide-react';
import type { Task, Event, User as UserModel, Group } from '../../core/types/models';

interface TasksToolbarProps {
  viewCategory: 'active' | 'archived' | 'trash';
  setViewCategory: (cat: 'active' | 'archived' | 'trash') => void;
  
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;
  kanbanSortMode: 'date' | 'project';
  setKanbanSortMode: (mode: 'date' | 'project') => void;
  filterMode: 'all' | 'my' | 'custom';
  setFilterMode: (mode: 'all' | 'my' | 'custom') => void;
  selectedAssignees: string[];
  setSelectedAssignees: React.Dispatch<React.SetStateAction<string[]>>;
  selectedProjectTitles: string[];
  setSelectedProjectTitles: React.Dispatch<React.SetStateAction<string[]>>;
  
  timeFilter: 'all' | 'overdue' | 'next7days' | 'onTrack';
  setTimeFilter: (mode: 'all' | 'overdue' | 'next7days' | 'onTrack') => void;
  isTimeFilterOpen: boolean;
  setIsTimeFilterOpen: (isOpen: boolean) => void;
  timeFilterRef: React.RefObject<HTMLDivElement | null>;

  isFilterDropdownOpen: boolean;
  setIsFilterDropdownOpen: (isOpen: boolean) => void;
  isEventDropdownOpen: boolean;
  setIsEventDropdownOpen: (isOpen: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  eventDropdownRef: React.RefObject<HTMLDivElement | null>;
  users: UserModel[];
  groups: Group[];
  tasks: Task[];
  events: Event[];
  handlePrint: () => void;
  onOpenOrphanCleanup: () => void; // CHIRURGISCHER EINGRIFF: Neue Prop für das Modal
}

export const TasksToolbar: React.FC<TasksToolbarProps> = ({
  viewCategory, setViewCategory,
  viewMode, setViewMode,
  kanbanSortMode, setKanbanSortMode,
  filterMode, setFilterMode,
  selectedAssignees, setSelectedAssignees,
  selectedProjectTitles, setSelectedProjectTitles,
  timeFilter, setTimeFilter, isTimeFilterOpen, setIsTimeFilterOpen, timeFilterRef,
  isFilterDropdownOpen, setIsFilterDropdownOpen,
  isEventDropdownOpen, setIsEventDropdownOpen,
  dropdownRef, eventDropdownRef,
  users, groups, tasks, events, handlePrint, onOpenOrphanCleanup
}) => {

  const { user, roleProfiles } = useClubStore();
  
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;
  
  // CHIRURGISCHER EINGRIFF: Sicherheits-Check für den Geisterjäger-Button
  const canDeleteAnyItem = !!userRoleProfile?.permissions?.deleteAnyItem || userRoleProfile?.name === 'ADMIN';

  const toggleAssignee = (id: string) => {
    setSelectedAssignees(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      if (next.length > 0) setFilterMode('custom');
      else if (filterMode === 'custom') setFilterMode('all'); 
      return next;
    });
  };

  const toggleEventFilter = (projectTitle: string) => {
    setSelectedProjectTitles(prev => prev.includes(projectTitle) ? prev.filter(id => id !== projectTitle) : [...prev, projectTitle]);
  };

  const renderAssigneeDropdown = () => (
    <div className="max-h-60 overflow-y-auto p-2">
      <div className="text-xs font-bold text-gray-400 mb-2 mt-1 px-2 uppercase">Personen</div>
      {users.map(u => (
        <label key={u.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
          <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedAssignees.includes(u.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
            {selectedAssignees.includes(u.id) && <Check className="w-3 h-3 text-white" />}
          </div>
          <User className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm text-gray-700">{u.name}</span>
          <input type="checkbox" className="hidden" checked={selectedAssignees.includes(u.id)} onChange={() => toggleAssignee(u.id)} />
        </label>
      ))}
      <div className="text-xs font-bold text-gray-400 mb-2 mt-4 px-2 uppercase">Rollen / Gruppen</div>
      {groups.map(g => (
        <label key={g.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
          <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedAssignees.includes(g.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
            {selectedAssignees.includes(g.id) && <Check className="w-3 h-3 text-white" />}
          </div>
          <Users className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm text-gray-700">{g.name}</span>
          <input type="checkbox" className="hidden" checked={selectedAssignees.includes(g.id)} onChange={() => toggleAssignee(g.id)} />
        </label>
      ))}
    </div>
  );

  const availableProjectsForFilter = useMemo(() => {
    const titles = new Set<string>();
    const projects: {title: string, color: string}[] = [];
    
    tasks.forEach(t => {
      if (t.eventId) {
        const ev = events.find(e => e.id === t.eventId);
        if (!ev) return;

        if (!canManageEvents && user) {
           const isDirectParticipant = ev.participantUserIds?.includes(user.id);
           const isGroupParticipant = ev.participantGroupIds?.some(gId => user.groupIds?.includes(gId));
           const isTaskAssignee = t.assigneeUserIds?.includes(user.id) || t.assigneeGroupIds?.some(gId => user.groupIds?.includes(gId));
           if (!isDirectParticipant && !isGroupParticipant && !isTaskAssignee) {
             return; 
           }
        }

        if (viewCategory === 'trash') {
          if (t.status !== 'TRASH') return;
        } else {
          const isClosed = ev.status === 'ABGESCHLOSSEN' || ev.isArchived;
          const wantArchived = viewCategory === 'archived';
          if (wantArchived ? !isClosed : isClosed) return;
        }

        if (!titles.has(ev.title)) {
          titles.add(ev.title);
          projects.push({ title: ev.title, color: (ev as any).color || '#4338ca' });
        }
      }
    });
    return projects.sort((a,b) => a.title.localeCompare(b.title));
  }, [tasks, events, viewCategory, user, canManageEvents]);

  const handleToggleCategory = () => {
    if (viewCategory === 'active') {
      setViewCategory('archived');
    } else if (viewCategory === 'archived') {
      setViewCategory('trash');
      setViewMode('list'); 
    } else {
      setViewCategory('active');
    }
    setSelectedProjectTitles([]);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
      
      <div className="flex items-center gap-4">
        <button
          onClick={handleToggleCategory}
          className="flex items-center gap-3 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors group cursor-pointer outline-none"
          title="Klicken zum Wechseln: Offen -> Archiv -> Papierkorb"
        >
          {viewCategory === 'active' && 'Offene ToDos'}
          {viewCategory === 'archived' && 'Archivierte ToDos'}
          {viewCategory === 'trash' && 'Papierkorb'}
          
          <span className={`flex items-center justify-center rounded-lg p-1.5 transition-colors shadow-sm ${
            viewCategory === 'trash' ? 'bg-red-100 text-red-600 group-hover:bg-red-200' : 'bg-gray-200 group-hover:bg-blue-100 text-gray-500 group-hover:text-blue-600'
          }`}>
             {viewCategory === 'trash' ? <Trash2 className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
          </span>
        </button>

        {/* CHIRURGISCHER EINGRIFF: Der Geisterjäger-Button (Nur Admin & Papierkorb) */}
        {viewCategory === 'trash' && canDeleteAnyItem && (
           <button 
             onClick={onOpenOrphanCleanup}
             className="flex items-center px-3 py-1.5 ml-2 text-sm font-bold bg-gray-900 text-white rounded-lg shadow-sm hover:bg-black transition-colors"
             title="Verwaiste Unterpunkte (Geister) aufspüren und bereinigen"
           >
             <Ghost className="w-4 h-4 mr-2 text-red-400" /> Scanner
           </button>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        
        <div className="flex bg-gray-200 p-1 rounded-lg items-center">
          <button
            onClick={() => { if (viewCategory !== 'trash') setViewMode('kanban'); }}
            disabled={viewCategory === 'trash'}
            title={viewCategory === 'trash' ? 'Kanban-Board ist im Papierkorb deaktiviert' : ''}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewCategory === 'trash' ? 'opacity-50 cursor-not-allowed text-gray-400' :
              viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Kanban className="w-4 h-4 mr-2" /> Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListIcon className="w-4 h-4 mr-2" /> Liste
          </button>

          {viewMode === 'kanban' && viewCategory !== 'trash' && (
            <div className="flex border-l border-gray-300 ml-2 pl-2">
              <button 
                onClick={() => setKanbanSortMode('date')} 
                title="Nach Datum sortieren"
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${kanbanSortMode === 'date' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                📅 Datum
              </button>
              <button 
                onClick={() => setKanbanSortMode('project')} 
                title="Nach Projekt (Event) gruppieren"
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ml-1 ${kanbanSortMode === 'project' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                📂 Projekt
              </button>
            </div>
          )}
        </div>

        <div className="flex bg-gray-200 p-1 rounded-lg">
          <button
            onClick={() => { setFilterMode('my'); setSelectedAssignees([]); setIsFilterDropdownOpen(false); setIsEventDropdownOpen(false); setIsTimeFilterOpen(false); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filterMode === 'my' && selectedAssignees.length === 0 ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Meine
          </button>
          
          <div className="relative flex items-center ml-1" ref={dropdownRef}>
            <div className={`flex items-center rounded-md transition-colors ${
              (filterMode === 'all' || filterMode === 'custom') && selectedAssignees.length === 0 ? 'bg-white shadow text-blue-600' : 
              selectedAssignees.length > 0 ? 'bg-blue-100 shadow text-blue-800' : 'text-gray-600 hover:text-gray-900'
            }`}>
              <button
                onClick={() => { setFilterMode('all'); setSelectedAssignees([]); setIsFilterDropdownOpen(false); setIsEventDropdownOpen(false); setIsTimeFilterOpen(false); }}
                className="px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors"
              >
                {selectedAssignees.length > 0 ? `Einige (${selectedAssignees.length})` : 'Alle'}
              </button>
              <button
                onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsEventDropdownOpen(false); setIsTimeFilterOpen(false); }}
                className={`px-2 py-1.5 border-l rounded-r-md transition-colors ${
                   selectedAssignees.length > 0 ? 'border-blue-200 hover:bg-blue-200' : 'border-gray-100 hover:bg-gray-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>

            {isFilterDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[50]">
                <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Wer?</p>
                  {selectedAssignees.length > 0 && (
                    <button onClick={() => { setSelectedAssignees([]); setFilterMode('all'); }} className="text-xs text-blue-600 hover:underline">Auswahl aufheben</button>
                  )}
                </div>
                {renderAssigneeDropdown()}
              </div>
            )}
          </div>

          <div className="relative flex items-center ml-1 border-l border-gray-300 pl-1" ref={eventDropdownRef}>
            <div className={`flex items-center rounded-md transition-colors ${selectedProjectTitles.length > 0 ? 'bg-indigo-100 shadow text-indigo-800' : 'text-gray-600 hover:text-gray-900'}`}>
              <button
                onClick={() => { setIsEventDropdownOpen(!isEventDropdownOpen); setIsFilterDropdownOpen(false); setIsTimeFilterOpen(false); }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center"
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {selectedProjectTitles.length > 0 ? `Projekte (${selectedProjectTitles.length})` : 'Projekte'}
                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
              </button>
            </div>

            {isEventDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-[50]">
                <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nach Projekt filtern</p>
                  {selectedProjectTitles.length > 0 && (
                    <button onClick={() => setSelectedProjectTitles([])} className="text-xs text-indigo-600 hover:underline">Alle anzeigen</button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                  {availableProjectsForFilter.length === 0 ? (
                     <p className="text-xs text-gray-500 italic p-2">Keine Projekte in dieser Ansicht.</p>
                  ) : (
                    availableProjectsForFilter.map(p => (
                      <label key={p.title} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                        <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center shrink-0 ${selectedProjectTitles.includes(p.title) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                          {selectedProjectTitles.includes(p.title) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-3 h-3 rounded-full mr-2 shrink-0 border border-gray-200" style={{ backgroundColor: p.color }}></div>
                        <span className="text-sm text-gray-700 truncate" title={p.title}>{p.title}</span>
                        <input type="checkbox" className="hidden" checked={selectedProjectTitles.includes(p.title)} onChange={() => toggleEventFilter(p.title)} />
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative flex items-center ml-1 border-l border-gray-300 pl-1" ref={timeFilterRef}>
            <div className={`flex items-center rounded-md transition-colors ${timeFilter !== 'all' ? 'bg-orange-100 shadow text-orange-800' : 'text-gray-600 hover:text-gray-900'}`}>
              <button
                onClick={() => { setIsTimeFilterOpen(!isTimeFilterOpen); setIsFilterDropdownOpen(false); setIsEventDropdownOpen(false); }}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center"
              >
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                {timeFilter === 'overdue' ? 'Überfällig' : timeFilter === 'next7days' ? '< 7 Tage' : timeFilter === 'onTrack' ? 'Auf Kurs' : 'Zeitplan'}
                <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
              </button>
            </div>

            {isTimeFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[50]">
                <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nach Termin</p>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setTimeFilter('all'); setIsTimeFilterOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${timeFilter === 'all' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                    Alle Zeiten
                  </button>
                  <button onClick={() => { setTimeFilter('overdue'); setIsTimeFilterOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${timeFilter === 'overdue' ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                    🚨 Überfällig
                  </button>
                  <button onClick={() => { setTimeFilter('next7days'); setIsTimeFilterOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${timeFilter === 'next7days' ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                    ⏳ In &lt; 7 Tagen
                  </button>
                  <button onClick={() => { setTimeFilter('onTrack'); setIsTimeFilterOpen(false); }} className={`w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${timeFilter === 'onTrack' ? 'bg-green-50 text-green-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}>
                    🟢 Auf Kurs (o. Datum)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        <button 
          onClick={handlePrint}
          className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 bg-gray-200 transition-colors"
          title="Drucken / PDF exportieren"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
// --- END OF FILE ---