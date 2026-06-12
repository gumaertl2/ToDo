// [2026-06-11] - UX-FIX: Routing State Interpreter integriert. Die Ansicht (Board/Liste) kann nun per Navigation-State ({ state: { view: 'list' } }) vom Dashboard aus ferngesteuert werden.
// [2026-06-04] - ARCHITEKTUR-FIX: Die TasksView bedient sich nun an der Hauptschlagader 'allAgendaItems' anstatt am vorgefilterten 'tasks'-Array. Dadurch wird der "Ghost-Filter" aus der Store-Schicht umgangen und erledigte Daueraufgaben erreichen den Archiv-Scanner wieder physisch, anstatt vorher unsichtbar verworfen zu werden.
// [2026-06-03] - UX-FIX: Blutlinien-Deduplizierung (Bloodline-Scanner) für das Kanban-Board und die Listenansicht integriert. Verhindert, dass durch alte Bugs oder manuelle Klon-Vorgänge erzeugte "Geschwister" (erledigte Klone mit derselben baseItemId) die aktive Liste überfluten. Das System sucht nun bei übereinstimmender Blutlinie nur noch den jüngsten (offenen) Erben heraus; alle erledigten Vorgänger wandern zwingend ins historische Archiv.
// [2026-05-10] - FEATURE: Fuse.js (Fuzzy Search) implementiert, um Tippfehler wie 'kole' -> 'Kohle' abzufangen
// [2026-05-10] - FEATURE: Suchfunktion durchsucht nun auch die echten Namen der Verantwortlichen (virtueller Fuse-Key)
// [2026-05-11] - BUGFIX: Erledigte Routinen werden nun auch im ToDo-Board sofort ausgeblendet und in die Historie verlagert
// [2026-05-12] - FEATURE: Participation-First Integration. Aufgaben aus fremden Events werden auf dem Board blockiert.
// [2026-05-13] - CHIRURGISCHER EINGRIFF: Tri-State 'viewCategory' integriert. Trash-Filterung und Berechtigungen durchgereicht.
// [2026-05-13] - BUGFIX: Legacy-Recht (canDeleteAnyTask) entfernt. Papierkorb reagiert nun streng auf die Rollen-Matrix.
// [2026-05-14] - BUGFIX: TS6133 Namenskonflikt zwischen 'User' (Model) und 'User' (Icon) behoben.
// [2026-05-14] - FEATURE: Integration des OrphanCleanupModal (Geister-Scanner) 100% Zero-Loss.
// [2026-05-14] - BUGFIX: Papierkorb zeigt nun auch gelöschte Punkte aus geheimen Sitzungen (Planung) an.
// src/features/Tasks/TasksView.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClubStore } from '../../store/useClubStore';
import { KanbanBoard } from './KanbanBoard';
import { TasksListView } from './TasksListView';
import { TasksToolbar } from './TasksToolbar';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { TaskHistoryModal } from './TaskHistoryModal';
import type { Task } from '../../core/types/models';
import { ChevronDown, ChevronUp, Check, User as UserIcon, Users } from 'lucide-react';
import { OrphanCleanupModal } from '../Admin/OrphanCleanupModal';
import Fuse from 'fuse.js';

export type SortKey = 'title' | 'status' | 'assignee' | 'dueDate' | 'protocolIndex';
export type SortDirection = 'asc' | 'desc';

export const TasksView: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: allAgendaItems importiert, um den UI-Filter des Stores zu umgehen
  const { tasks, allAgendaItems, fetchTasks, isTasksLoading, user, saveAgendaItem, moveToTrash, restoreFromTrash, deleteTask, events, fetchEvents, users, groups, roleProfiles } = useClubStore();
  
  const location = useLocation();
  
  const [viewCategory, setViewCategory] = useState<'active' | 'archived' | 'trash'>('active');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'custom'>('my');
  
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProjectTitles, setSelectedProjectTitles] = useState<string[]>([]);
  const [kanbanSortMode, setKanbanSortMode] = useState<'date' | 'project'>('date');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColAssigneeFilterOpen, setIsColAssigneeFilterOpen] = useState(false);
  const [isColStatusFilterOpen, setIsColStatusFilterOpen] = useState(false);
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'overdue' | 'next7days' | 'onTrack'>('all');
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'protocolIndex', direction: 'asc' });
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isOrphanCleanupOpen, setIsOrphanCleanupOpen] = useState(false);
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  const [returnToTask, setReturnToTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);
  const timeFilterRef = useRef<HTMLDivElement>(null);
  const colAssigneeRef = useRef<HTMLDivElement>(null);
  const colStatusRef = useRef<HTMLDivElement>(null);

  // CHIRURGISCHER EINGRIFF: Router-State auslesen und anwenden
  useEffect(() => {
    if (location.state?.view === 'list') {
      setViewMode('list');
      window.history.replaceState({}, document.title); // State leeren
    } else if (location.state?.view === 'kanban') {
      setViewMode('kanban');
      window.history.replaceState({}, document.title); // State leeren
    }
  }, [location.state]);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, [fetchTasks, fetchEvents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setIsFilterDropdownOpen(false);
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(target)) setIsEventDropdownOpen(false);
      if (timeFilterRef.current && !timeFilterRef.current.contains(target)) setIsTimeFilterOpen(false);
      if (colAssigneeRef.current && !colAssigneeRef.current.contains(target)) setIsColAssigneeFilterOpen(false);
      if (colStatusRef.current && !colStatusRef.current.contains(target)) setIsColStatusFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAssigneesText = (task: Task) => {
    const uNames = (task.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (task.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    return 'Nicht zugewiesen';
  };

  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!userRoleProfile?.permissions?.manageEvents || !!(user?.permissions as any)?.manageEvents;
  const canDeleteAnyItem = !!userRoleProfile?.permissions?.deleteAnyItem;

  const displayedTasks = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); 
    const nowTime = now.getTime();
    const in7Days = nowTime + 7 * 24 * 60 * 60 * 1000;

    // CHIRURGISCHER EINGRIFF: Wir filtern die rohen allAgendaItems, um das Archiv mit Material zu versorgen!
    const sourceData = allAgendaItems.filter(t => t.type === 'AUFGABE' || t.status === 'TRASH');

    const baseTasks = sourceData.filter((task) => {
      if (task.isTemplate) return false;

      if (task.eventId && !canManageEvents && user) {
        const parentEvent = events.find(e => e.id === task.eventId);
        if (parentEvent) { 
           const isDirectParticipant = parentEvent.participantUserIds?.includes(user.id);
           const isGroupParticipant = parentEvent.participantGroupIds?.some(gId => user.groupIds?.includes(gId));
           const isTaskAssignee = task.assigneeUserIds?.includes(user.id) || task.assigneeGroupIds?.some(gId => user.groupIds?.includes(gId));
           if (!isDirectParticipant && !isGroupParticipant && !isTaskAssignee) {
             return false;
           }
        }
      }

      if (filterMode === 'my' && user) {
        const isUserDirectlyAssigned = task.assigneeUserIds && task.assigneeUserIds.includes(user.id);
        const isUserGroupAssigned = task.assigneeGroupIds && user.groupIds && task.assigneeGroupIds.some(groupId => user.groupIds.includes(groupId));
        if (!isUserDirectlyAssigned && !isUserGroupAssigned) return false;
      } else if (filterMode === 'custom' && selectedAssignees.length > 0) {
        const hasUser = task.assigneeUserIds && task.assigneeUserIds.some(id => selectedAssignees.includes(id));
        const hasGroup = task.assigneeGroupIds && task.assigneeGroupIds.some(id => selectedAssignees.includes(id));
        if (!hasUser && !hasGroup) return false;
      }

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
        return false;
      }

      if (selectedProjectTitles.length > 0) {
        if (!task.eventId) return false;
        const ev = events.find(e => e.id === task.eventId);
        if (!ev || !selectedProjectTitles.includes(ev.title)) return false;
      }

      if (timeFilter !== 'all') {
        if (timeFilter === 'overdue') {
          if (task.isDueNextMeeting || !task.dueDate || task.dueDate >= nowTime) return false;
        } else if (timeFilter === 'next7days') {
          const isDueSoon = task.isDueNextMeeting || (task.dueDate && task.dueDate >= nowTime && task.dueDate <= in7Days);
          if (!isDueSoon) return false;
        } else if (timeFilter === 'onTrack') {
          if (task.isDueNextMeeting) return false;
          if (task.dueDate && task.dueDate <= in7Days) return false; 
        }
      }

      return true;
    });

    if (searchQuery) {
      const fuse = new Fuse(baseTasks, {
        keys: ['title', 'description', 'assigneeNames'],
        getFn: (task, path) => {
          const t = task as Task;
          const key = Array.isArray(path) ? path[0] : path;
          
          if (key === 'title') return t.title || '';
          if (key === 'description') return t.description || '';
          if (key === 'assigneeNames') return getAssigneesText(t);
          
          return '';
        },
        threshold: 0.3, 
        ignoreLocation: true,
      });
      const results = fuse.search(searchQuery);
      return results.map(r => r.item);
    }

    return baseTasks;
  }, [allAgendaItems, events, filterMode, user, selectedAssignees, selectedStatuses, selectedProjectTitles, timeFilter, searchQuery, users, groups, canManageEvents]);

  const sortedTasksRaw = useMemo(() => {
    let sortableTasks = [...displayedTasks];
    if (sortConfig !== null) {
      sortableTasks.sort((a, b) => {
        if (sortConfig.key === 'protocolIndex') {
           const idxA = a.protocolIndex !== undefined ? a.protocolIndex : Number.MAX_SAFE_INTEGER;
           const idxB = b.protocolIndex !== undefined ? b.protocolIndex : Number.MAX_SAFE_INTEGER;
           if (idxA !== idxB) {
             return sortConfig.direction === 'asc' ? idxA - idxB : idxB - idxA;
           }
           const dateA = a.dueDate || Number.MAX_SAFE_INTEGER;
           const dateB = b.dueDate || Number.MAX_SAFE_INTEGER;
           return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortConfig.key === 'title') {
          const titleA = a.title || '';
          const titleB = b.title || '';
          return sortConfig.direction === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
        }
        if (sortConfig.key === 'assignee') {
          const textA = getAssigneesText(a);
          const textB = getAssigneesText(b);
          return sortConfig.direction === 'asc' ? textA.localeCompare(textB) : textB.localeCompare(textA);
        }
        if (sortConfig.key === 'status') {
          const weight = { 'OFFEN': 1, 'IN_ARBEIT': 2, 'ERLEDIGT': 3, 'TRASH': 4 };
          const valA = weight[a.status as keyof typeof weight] || 0;
          const valB = weight[b.status as keyof typeof weight] || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        if (sortConfig.key === 'dueDate') {
          const valA = a.dueDate || 0;
          const valB = b.dueDate || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return sortableTasks;
  }, [displayedTasks, sortConfig, users, groups]);

  const { visibleTasks, historicalTaskIds, activeCount, historicalCount, trashCount } = useMemo(() => {
    const now = Date.now();
    const active: Task[] = [];
    const historicalMap = new Map<string, Task>();
    const trash: Task[] = [];
    const histIds = new Set<string>();

    const bloodlineMap = new Map<string, Task[]>();
    sortedTasksRaw.forEach(task => {
      const bId = task.baseItemId || task.id;
      if (!bloodlineMap.has(bId)) bloodlineMap.set(bId, []);
      bloodlineMap.get(bId)!.push(task);
    });

    const primaryTaskIds = new Set<string>();
    bloodlineMap.forEach(group => {
      group.sort((a, b) => {
         const timeA = a.createdAt || a.updatedAt || 0;
         const timeB = b.createdAt || b.updatedAt || 0;
         return timeB - timeA;
      });
      let primary = group.find(t => t.status !== 'ERLEDIGT' && t.progress !== 100);
      if (!primary) primary = group[0];
      primaryTaskIds.add(primary.id);
    });

    sortedTasksRaw.forEach(task => {
      let isClosedEvent = false;
      let isPlanungHidden = false;
      
      if (task.eventId) {
        const ev = events.find(e => e.id === task.eventId);
        if (ev && (ev.status === 'ABGESCHLOSSEN' || ev.isArchived)) {
          isClosedEvent = true;
        } else if (ev && ev.status === 'PLANUNG' && !ev.isPublished && !task.baseItemId) {
          isPlanungHidden = true;
        }
      }

      const isDone = task.status === 'ERLEDIGT' || task.progress === 100;
      const isTrash = task.status === 'TRASH';
      const isPastDue = !task.eventId && (!task.dueDate || task.dueDate < now);
      const isRoutine = task.isRoutine === true || String(task.isRoutine) === 'true';

      const isSuperseded = !primaryTaskIds.has(task.id);
      const bId = task.baseItemId || task.id;

      // CHIRURGISCHER EINGRIFF: Auch die erledigten Unterpunkte einer Routine abfangen
      let isParentDone = false;
      if (task.isSubItem && task.parentItemId) {
        const parentTask = allAgendaItems.find(t => t.id === task.parentItemId);
        if (parentTask && (parentTask.status === 'ERLEDIGT' || parentTask.progress === 100)) {
          isParentDone = true;
        }
      }

      if (isTrash) {
        histIds.add(task.id);
        trash.push(task);
        return; 
      }
      
      if (isPlanungHidden) return;

      // MATRIX LOGIC: Fällt die Karte in den Archiv-Eimer?
      const isArchiveCandidate = task.isHistorical === true || isClosedEvent || (isDone && isPastDue) || (isDone && isRoutine) || isSuperseded || isParentDone || (isDone && !task.eventId);

      if (isArchiveCandidate) {
        histIds.add(task.id); 
        
        if (isDone || isSuperseded || isClosedEvent) {
          const existing = historicalMap.get(bId);
          const taskDate = task.completedAt || task.updatedAt || task.createdAt || 0;
          const existingDate = existing ? (existing.completedAt || existing.updatedAt || existing.createdAt || 0) : 0;

          if (!existing || taskDate > existingDate) {
             historicalMap.set(bId, task);
          }
        }
      } else {
        // Aktives Board
        // CHIRURGISCHER EINGRIFF: Ein bereits erledigter Unterpunkt, dessen Oberpunkt noch offen ist,
        // verschwindet komplett aus dem ToDo Board (weder aktiv noch archiv).
        if (!(isDone && task.isSubItem)) {
          active.push(task);
        }
      }
    });

    const historical = Array.from(historicalMap.values());
    historical.sort((a, b) => (b.updatedAt || b.createdAt || b.dueDate || 0) - (a.updatedAt || a.createdAt || a.dueDate || 0));

    let finalTasks = active;
    if (viewCategory === 'archived') finalTasks = historical;
    if (viewCategory === 'trash') finalTasks = trash;
    
    return { 
      visibleTasks: finalTasks, 
      historicalTaskIds: histIds,
      activeCount: active.length,
      historicalCount: historical.length,
      trashCount: trash.length
    };
  }, [sortedTasksRaw, viewCategory, events, allAgendaItems]);

  const kanbanTasks = useMemo(() => {
    let sorted = [...visibleTasks];
    if (kanbanSortMode === 'project') {
      sorted.sort((a, b) => {
        const evA = a.eventId ? events.find(e => e.id === a.eventId)?.title || 'ZZZZZ' : 'ZZZZZ';
        const evB = b.eventId ? events.find(e => e.id === b.eventId)?.title || 'ZZZZZ' : 'ZZZZZ';
        if (evA < evB) return -1;
        if (evA > evB) return 1;
        return (a.dueDate || 0) - (b.dueDate || 0); 
      });
    } else {
      sorted.sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));
    }
    return sorted;
  }, [visibleTasks, kanbanSortMode, events]);

  const groupedListTasks = useMemo(() => {
    const grouped = new Map<string, { title: string, color: string, tasks: Task[] }>();
    grouped.set('none', { title: 'Freie Aufgaben (Ohne spezifische Sitzung)', color: '#6b7280', tasks: [] });
    
    visibleTasks.forEach(t => {
      if (!t.eventId) {
        grouped.get('none')!.tasks.push(t);
      } else {
        const ev = events.find(e => e.id === t.eventId);
        const pTitle = ev ? ev.title : 'Unbekanntes Projekt';
        const pColor = (ev as any)?.color || '#4338ca';
        
        if (!grouped.has(pTitle)) {
          grouped.set(pTitle, { title: pTitle, color: pColor, tasks: [] });
        }
        grouped.get(pTitle)!.tasks.push(t);
      }
    });
    
    if (grouped.get('none')!.tasks.length === 0) grouped.delete('none');
    
    return Array.from(grouped.entries()).sort((a, b) => {
      if (a[0] === 'none') return 1; 
      if (b[0] === 'none') return -1;
      return a[1].title.localeCompare(b[1].title); 
    });
  }, [visibleTasks, events]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ChevronDown className="w-4 h-4 ml-1 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1 text-blue-600" /> : <ChevronDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  const toggleListGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const toggleStatus = (st: string) => {
    setSelectedStatuses(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OFFEN': return 'Offen';
      case 'IN_ARBEIT': return 'In Bearbeitung';
      case 'ERLEDIGT': return 'Erledigt';
      case 'TRASH': return 'Papierkorb (Gelöscht)';
      default: return status;
    }
  };

  const handlePrint = () => {
    const title = viewCategory === 'trash' ? 'Papierkorb' : (viewCategory === 'archived' ? 'Archivierte ToDos' : 'Offene ToDos');
    
    let html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; font-size: 13px; line-height: 1.4; }
            h1 { font-size: 22px; margin-bottom: 5px; border-bottom: 2px solid #111; padding-bottom: 10px; }
            .meta { font-size: 13px; color: #444; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ccc; padding: 10px 8px; text-align: left; vertical-align: top; }
            th { background-color: #f0f0f0; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: block; color: #000; }
            .desc { font-size: 12px; color: #333; margin-top: 4px; white-space: pre-wrap; }
            .status { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Generiert am: ${new Date().toLocaleDateString()} um ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr | Anzahl: ${visibleTasks.length}</div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">Nr.</th>
                <th>Aufgabe</th>
                <th style="width: 20%;">Wer</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;">Fällig</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (visibleTasks.length === 0) {
      html += `<tr><td colspan="5" style="text-align:center; padding: 20px;">Keine Aufgaben in der aktuellen Auswahl.</td></tr>`;
    } else {
      visibleTasks.forEach(task => {
        html += `
          <tr>
            <td>${task.protocolIndex !== undefined ? task.protocolIndex + 1 : '-'}</td>
            <td>
              <span class="title">${task.title}</span>
              ${task.description ? `<div class="desc">${task.description.replace(/\n/g, '<br/>')}</div>` : ''}
            </td>
            <td>${getAssigneesText(task)}</td>
            <td class="status">${getStatusLabel(task.status)} (${task.progress || 0}%)</td>
            <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert("Bitte erlaube Popups für diese Seite, um drucken zu können.");
    }
  };

  const renderAssigneeDropdown = () => (
    <div className="max-h-60 overflow-y-auto p-2">
      <div className="text-xs font-bold text-gray-400 mb-2 mt-1 px-2 uppercase">Personen</div>
      {users.map(u => (
        <label key={u.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
          <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedAssignees.includes(u.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
            {selectedAssignees.includes(u.id) && <Check className="w-3 h-3 text-white" />}
          </div>
          <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm text-gray-700">{u.name}</span>
          <input type="checkbox" className="hidden" checked={selectedAssignees.includes(u.id)} onChange={() => {
            setSelectedAssignees(prev => {
              const next = prev.includes(u.id) ? prev.filter(a => a !== u.id) : [...prev, u.id];
              if (next.length > 0) setFilterMode('custom'); else if (filterMode === 'custom') setFilterMode('all'); 
              return next;
            });
          }} />
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
          <input type="checkbox" className="hidden" checked={selectedAssignees.includes(g.id)} onChange={() => { 
            setSelectedAssignees(prev => {
              const next = prev.includes(g.id) ? prev.filter(a => a !== g.id) : [...prev, g.id];
              if (next.length > 0) setFilterMode('custom'); else if (filterMode === 'custom') setFilterMode('all'); 
              return next;
            });
          }} />
        </label>
      ))}
    </div>
  );

  const editingParentTask = editingItem?.parentItemId ? tasks.find(t => t.id === editingItem.parentItemId) : undefined;

  return (
    <div className="h-full flex flex-col">
      <TasksToolbar 
        viewCategory={viewCategory}
        setViewCategory={setViewCategory}
        viewMode={viewMode}
        setViewMode={setViewMode}
        kanbanSortMode={kanbanSortMode}
        setKanbanSortMode={setKanbanSortMode}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        selectedAssignees={selectedAssignees}
        setSelectedAssignees={setSelectedAssignees}
        selectedProjectTitles={selectedProjectTitles}
        setSelectedProjectTitles={setSelectedProjectTitles}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        isTimeFilterOpen={isTimeFilterOpen}
        setIsTimeFilterOpen={setIsTimeFilterOpen}
        timeFilterRef={timeFilterRef}
        isFilterDropdownOpen={isFilterDropdownOpen}
        setIsFilterDropdownOpen={setIsFilterDropdownOpen}
        isEventDropdownOpen={isEventDropdownOpen}
        setIsEventDropdownOpen={setIsEventDropdownOpen}
        dropdownRef={dropdownRef}
        eventDropdownRef={eventDropdownRef}
        users={users}
        groups={groups}
        tasks={tasks}
        events={events}
        handlePrint={handlePrint}
        onOpenOrphanCleanup={() => setIsOrphanCleanupOpen(true)}
      />

      {isTasksLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 font-medium animate-pulse">Lade Aufgaben...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <KanbanBoard 
              tasks={kanbanTasks} 
              onEditTask={(t) => {
                 if (historicalTaskIds.has(t.id)) {
                  setHistoryTask(t);
                } else {
                  setEditingItem(t); 
                  setIsItemModalOpen(true); 
                }
              }}
              historicalTaskIds={historicalTaskIds}
            />
          ) : (
            <TasksListView 
              allTasks={tasks} 
              visibleTasks={visibleTasks}
              showArchivedTasks={viewCategory !== 'active'}
              setShowArchivedTasks={(show) => setViewCategory(show ? 'archived' : 'active')} 
              activeCount={activeCount}                 
              historicalCount={viewCategory === 'trash' ? trashCount : historicalCount}             
              groupedListTasks={groupedListTasks}
              historicalTaskIds={historicalTaskIds}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              collapsedGroups={collapsedGroups}
              toggleListGroup={toggleListGroup}
              handleSort={handleSort}
              renderSortIcon={renderSortIcon}
              colAssigneeRef={colAssigneeRef}
              isColAssigneeFilterOpen={isColAssigneeFilterOpen}
              setIsColAssigneeFilterOpen={setIsColAssigneeFilterOpen}
              selectedAssignees={selectedAssignees}
              renderAssigneeDropdown={renderAssigneeDropdown}
              colStatusRef={colStatusRef}
              isColStatusFilterOpen={isColStatusFilterOpen}
              setIsColStatusFilterOpen={setIsColStatusFilterOpen}
              selectedStatuses={selectedStatuses}
              toggleStatus={toggleStatus}
              getStatusLabel={getStatusLabel}
              setIsFilterDropdownOpen={setIsFilterDropdownOpen}
              setHistoryTask={setHistoryTask}
              setEditingItem={setEditingItem}
              setIsItemModalOpen={setIsItemModalOpen}
              saveAgendaItem={saveAgendaItem}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              moveToTrash={moveToTrash}
              restoreFromTrash={restoreFromTrash}
              deleteTask={deleteTask}
              canDeleteAnyItem={canDeleteAnyItem}
            />
          )}
        </div>
      )}

      {editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          parentItemContext={editingParentTask} 
          onNavigateToParent={() => {
            if (editingParentTask) { 
              setReturnToTask(editingItem); 
              setEditingItem(editingParentTask);
            }
          }}
          returnItemContext={returnToTask || undefined}
          onNavigateBack={() => {
            if (returnToTask) { 
              setEditingItem(returnToTask); 
              setReturnToTask(null);
            }
          }}
          isFixedType={true}
          isReadOnly={historicalTaskIds.has(editingItem.id) || (editingItem.id === editingParentTask?.id)}
          onClose={() => { 
            setIsItemModalOpen(false); 
            setEditingItem(null); 
            setReturnToTask(null);
          }}
          onSave={historicalTaskIds.has(editingItem.id) ? async () => {} : async (data) => {
            const result = await saveAgendaItem(data);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            await fetchTasks();
            setIsItemModalOpen(false);
            setEditingItem(null);
            setReturnToTask(null);
          }}
        />
      )}
      
      {historyTask && (
        <TaskHistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
      )}

      {isOrphanCleanupOpen && (
        <OrphanCleanupModal onClose={() => setIsOrphanCleanupOpen(false)} />
      )}
    </div>
  );
};
// --- END OF FILE ---