// [2026-06-12] - UX-FEATURE: Heatmap und Time-Badges aktiviert! Die TasksListView gibt nun den Befehl 'showTimeCategory={true}' an die AgendaItemRow, wodurch die farbigen Dringlichkeits-Ränder exklusiv in der ToDo-Liste leuchten.
// [2026-06-12] - UX-FEATURE: Intelligentes Rendering für die Listenansicht eingebaut. 
// 1. Aktive ToDos: Werden streng chronologisch (flach) gerendert, um die Dringlichkeits-Sortierung nicht zu zerstören.
// 2. Archivierte ToDos: Werden hierarchisch (Boss -> Kinder) gebündelt. Kinder sind standardmäßig eingeklappt und können über den Chevron-Toggle geöffnet werden, was die Übersichtlichkeit im Archiv massiv erhöht.
// [2026-06-12] - BUGFIX: Container-Toggle (Chevron) von Notizen-Toggle isoliert und korrekte Props (subItemCount, isSubItemsCollapsed) an AgendaItemRow übergeben.
// src/features/Tasks/TasksListView.tsx
import React from 'react';
import { Filter, Check, ChevronUp, ChevronDown, Folder, Search, X } from 'lucide-react';
import { AgendaItemRow } from '../Shared/AgendaItemRow';
import type { Task, AgendaItem } from '../../core/types/models';
import type { SortKey } from './TasksView';

interface TasksListViewProps {
  allTasks: Task[]; 
  visibleTasks: Task[];
  showArchivedTasks: boolean;
  setShowArchivedTasks: (show: boolean) => void; 
  activeCount: number;                           
  historicalCount: number;                       
  groupedListTasks: [string, { title: string; color: string; tasks: Task[] }][];
  historicalTaskIds: Set<string>;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  collapsedGroups: Set<string>;
  toggleListGroup: (groupId: string) => void;
  handleSort: (key: SortKey) => void;
  renderSortIcon: (key: SortKey) => React.ReactNode;
  colAssigneeRef: React.RefObject<HTMLDivElement | null>;
  isColAssigneeFilterOpen: boolean;
  setIsColAssigneeFilterOpen: (isOpen: boolean) => void;
  selectedAssignees: string[];
  renderAssigneeDropdown: () => React.ReactNode;
  colStatusRef: React.RefObject<HTMLDivElement | null>;
  isColStatusFilterOpen: boolean;
  setIsColStatusFilterOpen: (isOpen: boolean) => void;
  selectedStatuses: string[];
  toggleStatus: (st: string) => void;
  getStatusLabel: (st: string) => string;
  setIsFilterDropdownOpen: (isOpen: boolean) => void;
  setHistoryTask: (task: Task | null) => void;
  setEditingItem: (task: Task | null) => void;
  setIsItemModalOpen: (isOpen: boolean) => void;
  saveAgendaItem: (item: Partial<AgendaItem>) => Promise<any>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  
  moveToTrash: (taskId: string) => Promise<any>;
  restoreFromTrash: (taskId: string) => Promise<any>;
  deleteTask: (taskId: string) => Promise<any>;
  canDeleteAnyItem: boolean;
}

export const TasksListView: React.FC<TasksListViewProps> = ({
  allTasks, visibleTasks, showArchivedTasks, setShowArchivedTasks, activeCount, historicalCount, 
  groupedListTasks, historicalTaskIds, expandedIds, setExpandedIds, collapsedGroups, toggleListGroup,
  handleSort, renderSortIcon, colAssigneeRef, isColAssigneeFilterOpen, setIsColAssigneeFilterOpen, selectedAssignees, renderAssigneeDropdown,
  colStatusRef, isColStatusFilterOpen, setIsColStatusFilterOpen, selectedStatuses, toggleStatus, getStatusLabel,
  setIsFilterDropdownOpen,
  setHistoryTask, setEditingItem, setIsItemModalOpen, saveAgendaItem,
  searchQuery, setSearchQuery,
  moveToTrash, restoreFromTrash, deleteTask, canDeleteAnyItem
}) => {

  const [expandedContainers, setExpandedContainers] = React.useState<Set<string>>(new Set());

  const handleScrollPreservedFolderToggle = (e: React.MouseEvent, groupTitle: string) => {
    e.stopPropagation();
    const row = e.currentTarget.closest('.folder-row-wrapper');
    const container = row?.closest('.overflow-y-auto');
    
    if (!row || !container) {
      toggleListGroup(groupTitle);
      return;
    }

    const prevTop = row.getBoundingClientRect().top;
    toggleListGroup(groupTitle);

    setTimeout(() => {
      requestAnimationFrame(() => {
        const newTop = row.getBoundingClientRect().top;
        const diff = newTop - prevTop;
        if (Math.abs(diff) > 0.5) {
          container.scrollTop += diff;
        }
      });
    }, 10);
  };

  return (
    <div className="h-full overflow-y-auto pr-2 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible mb-10 pb-4 flex flex-col">
        
        <div className="p-3 grid grid-cols-[60px_1fr_auto] gap-3 items-center bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 rounded-t-xl hidden md:grid">
          <div className="pl-2"></div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center cursor-pointer hover:text-blue-600 transition-colors w-max whitespace-nowrap" onClick={() => handleSort('title')}>
              Aufgabe {renderSortIcon('title')}
            </div>
            <div className="relative flex-1 max-w-xs flex items-center" onClick={e => e.stopPropagation()}>
              <input 
                type="text" 
                placeholder="Suchen..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-7 py-1 text-xs font-normal text-gray-700 bg-white border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {searchQuery && (showArchivedTasks ? activeCount : historicalCount) > 0 && visibleTasks.length > 0 && (
              <button 
                onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                className="ml-1 text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1.5 rounded transition-colors whitespace-nowrap border border-blue-200 shadow-sm"
                title={`Es gibt noch ${showArchivedTasks ? activeCount : historicalCount} weitere Treffer in den ${showArchivedTasks ? 'offenen' : 'archivierten'} Aufgaben`}
              >
                → {showArchivedTasks ? activeCount : historicalCount} in {showArchivedTasks ? 'Offene' : 'Archivierte'}
              </button>
            )}
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

            <div className="w-[40px] flex items-center justify-end pr-1">
            </div>
          </div>
        </div>

        {visibleTasks.length === 0 ? (
          <div className="text-center p-12 text-gray-500 bg-transparent flex flex-col items-center justify-center">
            <p className="mb-4 text-base">
              {searchQuery 
                ? 'Keine Treffer in dieser Ansicht gefunden.' 
                : (showArchivedTasks ? 'Keine archivierten Aufgaben vorhanden.' : 'Keine Aufgaben für diese Filterkriterien gefunden.')}
            </p>
            
            {searchQuery && (showArchivedTasks ? activeCount : historicalCount) > 0 && (
              <button 
                onClick={() => setShowArchivedTasks(!showArchivedTasks)}
                className="mt-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg font-bold transition-colors shadow-sm flex items-center"
              >
                <Search className="w-4 h-4 mr-2" />
                Zeige stattdessen {showArchivedTasks ? activeCount : historicalCount} Treffer in "{showArchivedTasks ? 'Offene ToDos' : 'Archivierte ToDos'}"
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {groupedListTasks.map(([groupTitle, groupData]) => {
              const isCollapsed = collapsedGroups.has(groupTitle);
              
              return (
                <React.Fragment key={groupTitle}>
                  <div 
                    className="folder-row-wrapper border-y px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors"
                    onClick={(e) => handleScrollPreservedFolderToggle(e, groupTitle)}
                    style={{ 
                      backgroundColor: groupData.color ? `${groupData.color}15` : '#f3f4f6', 
                      borderColor: groupData.color ? `${groupData.color}30` : '#e5e7eb' 
                    }}
                  >
                    <div className="flex items-center">
                      <Folder className="w-4 h-4 mr-2" style={{ color: groupData.color || '#6b7280' }} />
                      <span className="font-bold text-sm" style={{ color: groupData.color || '#374151' }}>{groupData.title}</span>
                      <span className="ml-3 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: groupData.color ? `${groupData.color}30` : '#e5e7eb', color: groupData.color || '#374151' }}>
                        {groupData.tasks.length}
                      </span>
                    </div>
                    {isCollapsed ? <ChevronDown className="w-4 h-4" style={{ color: groupData.color || '#6b7280' }} /> : <ChevronUp className="w-4 h-4" style={{ color: groupData.color || '#6b7280' }} />}
                  </div>
                  
                  {!isCollapsed && (() => {
                    const renderTaskRow = (task: Task, isChild: boolean, isForceFlat: boolean, childrenCount: number = 0) => {
                      const isHistorical = historicalTaskIds.has(task.id);
                      const parentTask = task.parentItemId ? allTasks.find(t => t.id === task.parentItemId) : undefined;
                      
                      const pTitle = (task.isSubItem && (!isChild || isForceFlat)) ? parentTask?.title : undefined;
                      
                      const showToggle = !isForceFlat && childrenCount > 0;
                      const isContainerExpanded = expandedContainers.has(task.id);

                      return (
                        <AgendaItemRow
                          key={task.id}
                          item={task}
                          index={task.protocolIndex || 0}
                          displayIndexStr="" 
                          totalItems={groupData.tasks.length}
                          parentContextTitle={pTitle}
                          
                          // Container / SubItems Toggle (Chevron)
                          subItemCount={showToggle ? childrenCount : undefined}
                          isSubItemsCollapsed={showToggle ? !isContainerExpanded : undefined}
                          onToggleSubItems={showToggle ? () => {
                            setExpandedContainers(prev => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
                              return next;
                            });
                          } : undefined}
                          
                          // Notes / Description Toggle (+/- Button)
                          isExpanded={expandedIds.has(task.id)}
                          onToggleExpand={(id) => {
                            setExpandedIds(prev => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id); else next.add(id);
                              return next;
                            });
                          }}

                          onEdit={(item) => { 
                            if (isHistorical) {
                              setHistoryTask(item as Task);
                            } else {
                              setEditingItem(item as Task); 
                              setIsItemModalOpen(true); 
                            }
                          }}
                          onOpenHistory={(item) => setHistoryTask(item as Task)}
                          onDelete={(id, title) => {
                            if (window.confirm(`Möchtest du "${title || 'Diesen Punkt'}" in den Papierkorb verschieben?`)) {
                              moveToTrash(id);
                            }
                          }}
                          onRestoreFromTrash={() => restoreFromTrash(task.id)}
                          onPermanentDelete={() => {
                            if (window.confirm(`Aufgabe "${task.title || 'Diesen Punkt'}" unwiderruflich löschen?`)) {
                              deleteTask(task.id);
                            }
                          }}
                          canDeleteAnyItem={canDeleteAnyItem}
                          onSaveInline={isHistorical ? async () => {} : async (updatedTask) => { await saveAgendaItem(updatedTask); }}
                          isTemplateMode={true} 
                          isReadOnly={isHistorical}
                          searchQuery={searchQuery}
                          showMinimalDesktopActions={true}
                          showTimeCategory={true} // CHIRURGISCHER EINGRIFF: Heatmap in der Listenansicht aktivieren!
                        />
                      );
                    };

                    if (!showArchivedTasks) {
                      return groupData.tasks.map(task => renderTaskRow(task, false, true, 0));
                    } else {
                      const rootTasks: Task[] = [];
                      const childrenMap = new Map<string, Task[]>();

                      groupData.tasks.forEach(task => {
                        if (task.isSubItem && task.parentItemId) {
                          const hasParentInGroup = groupData.tasks.some(t => t.id === task.parentItemId);
                          if (hasParentInGroup) {
                            if (!childrenMap.has(task.parentItemId)) {
                              childrenMap.set(task.parentItemId, []);
                            }
                            childrenMap.get(task.parentItemId)!.push(task);
                            return;
                          }
                        }
                        rootTasks.push(task);
                      });

                      return rootTasks.map(rootTask => {
                        const children = childrenMap.get(rootTask.id) || [];
                        const isContainerExpanded = expandedContainers.has(rootTask.id);
                        
                        return (
                          <React.Fragment key={`block-${rootTask.id}`}>
                            {renderTaskRow(rootTask, false, false, children.length)}
                            {isContainerExpanded && children.map(child => renderTaskRow(child, true, false, 0))}
                          </React.Fragment>
                        );
                      });
                    }
                  })()}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---