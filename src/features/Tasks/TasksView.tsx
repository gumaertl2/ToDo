// src/features/Tasks/TasksView.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { KanbanBoard } from './KanbanBoard';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import { TaskHistoryModal } from './TaskHistoryModal';
import type { Task } from '../../core/types/models';
import { Kanban, List as ListIcon, Filter, Check, User, Users, ChevronUp, ChevronDown, Printer } from 'lucide-react';

type SortKey = 'title' | 'status' | 'assignee' | 'dueDate';
type SortDirection = 'asc' | 'desc';

export const TasksView: React.FC = () => {
  // CHIRURGISCHER EINGRIFF: deleteTask aus dem Store-Abruf entfernt, da es hier verboten ist
  const { tasks, fetchTasks, isTasksLoading, user, saveAgendaItem, events, fetchEvents, users, groups } = useClubStore();
  
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'custom'>('my');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isColAssigneeFilterOpen, setIsColAssigneeFilterOpen] = useState(false);
  const [isColStatusFilterOpen, setIsColStatusFilterOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Task | null>(null);
  
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const colAssigneeRef = useRef<HTMLDivElement>(null);
  const colStatusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, [fetchTasks, fetchEvents]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setIsFilterDropdownOpen(false);
      if (colAssigneeRef.current && !colAssigneeRef.current.contains(target)) setIsColAssigneeFilterOpen(false);
      if (colStatusRef.current && !colStatusRef.current.contains(target)) setIsColStatusFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.eventId) {
        const ev = events.find(e => e.id === task.eventId);
        if (!ev) return false; 
        
        if (ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return false;
        
        if (ev.status === 'PLANUNG') {
          if (!ev.isPublished && !task.baseItemId) return false;
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

      return true;
    });
  }, [tasks, events, filterMode, user, selectedAssignees, selectedStatuses]);

  const getAssigneesText = (task: Task) => {
    const uNames = (task.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (task.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    return 'Nicht zugewiesen';
  };

  const sortedTasks = useMemo(() => {
    let sortableTasks = [...displayedTasks];
    if (sortConfig !== null) {
      sortableTasks.sort((a, b) => {
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
          const weight = { 'OFFEN': 1, 'IN_ARBEIT': 2, 'ERLEDIGT': 3 };
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

  const toggleAssignee = (id: string) => {
    setSelectedAssignees(prev => {
      const next = prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id];
      if (next.length > 0) setFilterMode('custom');
      else if (filterMode === 'custom') setFilterMode('all'); 
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
      default: return status;
    }
  };

  const tasksWithDesc = useMemo(() => sortedTasks.filter(t => !!t.description), [sortedTasks]);
  const allExpanded = tasksWithDesc.length > 0 && tasksWithDesc.every(t => expandedIds.has(t.id));

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(tasksWithDesc.map(t => t.id)));
    }
  };

  const handlePrint = () => {
    let html = `
      <html>
        <head>
          <title>Offene ToDos</title>
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
          <h1>Offene ToDos</h1>
          <div class="meta">Generiert am: ${new Date().toLocaleDateString()} um ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Uhr | Anzahl: ${sortedTasks.length}</div>
          
          <table>
            <thead>
              <tr>
                <th>Aufgabe</th>
                <th style="width: 20%;">Wer</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;">Fällig</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (sortedTasks.length === 0) {
      html += `<tr><td colspan="4" style="text-align:center; padding: 20px;">Keine Aufgaben in der aktuellen Auswahl.</td></tr>`;
    } else {
      sortedTasks.forEach(task => {
        html += `
          <tr>
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Offene ToDos</h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'kanban' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-4 h-4 mr-2" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListIcon className="w-4 h-4 mr-2" />
              Liste
            </button>
          </div>

          <div className="flex bg-gray-200 p-1 rounded-lg">
            <button
              onClick={() => { setFilterMode('my'); setSelectedAssignees([]); setSelectedStatuses([]); setIsFilterDropdownOpen(false); }}
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
                  onClick={() => { setFilterMode('all'); setSelectedAssignees([]); setIsFilterDropdownOpen(false); }}
                  className="px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors"
                >
                  {selectedAssignees.length > 0 ? `Einige (${selectedAssignees.length})` : 'Alle'}
                </button>
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
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

      {isTasksLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 font-medium animate-pulse">Lade Aufgaben...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <KanbanBoard tasks={sortedTasks} onEditTask={(t) => { setEditingItem(t); setIsItemModalOpen(true); }} />
          ) : (
            <div className="h-full overflow-y-auto pr-2 pb-10">
              {sortedTasks.length === 0 ? (
                <div className="text-center p-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Keine Aufgaben für diese Filterkriterien gefunden.
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible mb-10 pb-4">
                  <div className="p-3 grid grid-cols-[60px_1fr_auto] gap-3 items-center bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 rounded-t-xl hidden md:grid">
                    <div className="pl-2">Nr.</div>
                    
                    <div className="flex items-center cursor-pointer hover:text-blue-600 transition-colors w-max" onClick={() => handleSort('title')}>
                      Aufgabe {renderSortIcon('title')}
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-[140px] flex items-center pr-4 relative" ref={colAssigneeRef}>
                        <span className="cursor-pointer hover:text-blue-600 transition-colors flex items-center" onClick={() => handleSort('assignee')}>
                          Wer {renderSortIcon('assignee')}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setIsColAssigneeFilterOpen(!isColAssigneeFilterOpen); setIsColStatusFilterOpen(false); setIsFilterDropdownOpen(false); }} className={`ml-1.5 p-1 rounded transition-colors ${selectedAssignees.length > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}>
                          <Filter className="w-3 h-3" />
                        </button>
                        {isColAssigneeFilterOpen && (
                          <div className="absolute top-full left-[-20px] mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] font-normal cursor-default" onClick={e => e.stopPropagation()}>
                             <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                               <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nach Personen filtern</p>
                             </div>
                             {renderAssigneeDropdown()}
                          </div>
                        )}
                      </div>

                      <div className="w-[70px] flex items-center pr-4 relative" ref={colStatusRef}>
                        <span className="cursor-pointer hover:text-blue-600 transition-colors flex items-center" onClick={() => handleSort('status')}>
                          % {renderSortIcon('status')}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); setIsColStatusFilterOpen(!isColStatusFilterOpen); setIsColAssigneeFilterOpen(false); setIsFilterDropdownOpen(false); }} className={`ml-1.5 p-1 rounded transition-colors ${selectedStatuses.length > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}>
                          <Filter className="w-3 h-3" />
                        </button>
                        {isColStatusFilterOpen && (
                          <div className="absolute top-full left-[-20px] mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] font-normal cursor-default" onClick={e => e.stopPropagation()}>
                             <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                               <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nach Status filtern</p>
                             </div>
                             <div className="p-2">
                               {['OFFEN', 'IN_ARBEIT', 'ERLEDIGT'].map(st => (
                                 <label key={st} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                   <div className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${selectedStatuses.includes(st) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                                     {selectedStatuses.includes(st) && <Check className="w-3 h-3 text-white" />}
                                   </div>
                                   <span className="text-sm text-gray-700">{getStatusLabel(st)}</span>
                                   <input type="checkbox" className="hidden" checked={selectedStatuses.includes(st)} onChange={() => toggleStatus(st)} />
                                 </label>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>

                      <div className="w-[120px] flex items-center pr-2">
                        <span className="cursor-pointer hover:text-blue-600 transition-colors flex items-center" onClick={() => handleSort('dueDate')}>
                          Fällig {renderSortIcon('dueDate')}
                        </span>
                      </div>

                      <div className="w-[80px] flex items-center justify-end pr-1">
                        {tasksWithDesc.length > 0 && (
                          <button 
                            onClick={toggleAllExpanded} 
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-lg font-mono font-bold leading-none transition-colors"
                            title="Alle Beschreibungen ein-/ausklappen"
                          >
                            {allExpanded ? '-' : '+'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    {sortedTasks.map((task, index) => (
                      <AgendaItemRow
                        key={task.id}
                        item={task}
                        index={index}
                        totalItems={sortedTasks.length}
                        isExpanded={expandedIds.has(task.id)}
                        onToggleExpand={(id) => {
                          setExpandedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                        onEdit={(item) => { setEditingItem(item as Task); setIsItemModalOpen(true); }}
                        onOpenHistory={(item) => setHistoryTask(item as Task)}
                        // CHIRURGISCHER EINGRIFF: Löschen-Button wirft Alert anstatt zu löschen
                        onDelete={(id, title) => {
                          window.alert(`Die Aufgabe "${title}" kann hier nicht gelöscht werden.\n\nBitte setze den Fortschritt auf 100% (Erledigt), wenn du sie beendet hast.\n\nDas physische Löschen von Aufgaben ist nur direkt im Sitzungsprotokoll erlaubt.`);
                        }}
                        onSaveInline={async (updatedTask) => { await saveAgendaItem(updatedTask); }}
                        isTemplateMode={true} 
                        isReadOnly={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingItem && (
        <ItemFormModal
          key={editingItem.id}
          isOpen={isItemModalOpen}
          existingItem={editingItem}
          isFixedType={true}
          onClose={() => setIsItemModalOpen(false)}
          onSave={async (data) => {
            const result = await saveAgendaItem(data);
            if (!result || (result && !result.success)) {
              throw new Error(result?.error?.message || "Fehler beim Speichern in Firebase.");
            }
            await fetchTasks();
            setIsItemModalOpen(false);
          }}
        />
      )}
      
      {historyTask && (
        <TaskHistoryModal task={historyTask} onClose={() => setHistoryTask(null)} />
      )}
    </div>
  );
};
// Exakte Zeilenzahl: 469