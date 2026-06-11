// 2026-04-24 17:30 - FEATURE: 2-Stufiger Amtsübergabe-Assistent (Wizard) zur Matrix-Zuweisung implementiert
// 2026-04-24 18:30 - BUGFIX: Fehlende Imports korrigiert
// 2026-04-24 19:00 - BUGFIX: Abfrage-Logik auf den globalen 'tasks' Store umgestellt
// 2026-04-24 22:30 - BUGFIX: 'isTemplate' Flag berücksichtigt (trennt Bibliothek-Einträge sauber von aktiven ToDos)
// 2026-04-24 23:00 - FEATURE: Oberpunkt-Kontext (Parent) für Unterpunkte in der Matrix sichtbar gemacht
// 2026-04-24 23:30 - FEATURE: Gruppierung nach Projekten (Events) inkl. Bibliothek-Header wie in ToDo-Liste
// src/features/Users/UserSuccessionModal.tsx
import React, { useState, useMemo } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, Save, CheckCircle2, ChevronRight, ChevronLeft, FastForward, RefreshCw, Calendar, BookOpen } from 'lucide-react';
import type { User, Task } from '../../core/types/models';

interface Props {
  sourceUser: User;
  onClose: () => void;
}

export const UserSuccessionModal: React.FC<Props> = ({ sourceUser, onClose }) => {
  const { users, tasks, templates, events, saveAgendaItem } = useClubStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [candidateIds, setCandidateIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CHIRURGISCHER EINGRIFF: Saubere Trennung und Gruppierung der Items
  const groupedItems = useMemo(() => {
    // 1. Alle fälligen Items sammeln
    const activeTasks = tasks.filter(t => 
      t.type === 'AUFGABE' && 
      t.status !== 'ERLEDIGT' && 
      t.assigneeUserIds?.includes(sourceUser.id) &&
      !t.isTemplate
    );
    const activeTemplates = templates.filter(t => t.assigneeUserIds?.includes(sourceUser.id));
    
    // 2. Gruppieren
    const groups = new Map<string, { title: string, icon: React.ReactNode, items: Task[] }>();
    
    // Gruppe für Vorlagen
    if (activeTemplates.length > 0) {
      groups.set('library', { 
        title: 'Bibliothek (Vorlagen)', 
        icon: <BookOpen className="w-4 h-4 mr-2 text-purple-600" />, 
        items: activeTemplates 
      });
    }

    // Gruppen für Projekte/Events
    activeTasks.forEach(task => {
      const eventId = task.eventId || 'none';
      const event = events.find(e => e.id === eventId);
      const groupKey = eventId;
      const groupTitle = event ? event.title : 'Freie Aufgaben (Ohne Sitzung)';
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { 
          title: groupTitle, 
          icon: <Calendar className="w-4 h-4 mr-2 text-blue-600" />, 
          items: [] 
        });
      }
      groups.get(groupKey)!.items.push(task);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.title.includes('Bibliothek')) return -1;
      if (b.title.includes('Bibliothek')) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [tasks, templates, sourceUser.id, events]);

  // Hilfs-Zähler für die UI
  const totalItemsCount = useMemo(() => {
    return groupedItems.reduce((acc, group) => acc + group.items.length, 0);
  }, [groupedItems]);

  const possibleCandidates = useMemo(() => {
    return [...users].filter(u => u.id !== sourceUser.id).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, sourceUser.id]);

  const toggleCandidate = (id: string) => {
    if (candidateIds.includes(id)) {
      setCandidateIds(prev => prev.filter(x => x !== id));
      const newAssignments = { ...assignments };
      Object.keys(newAssignments).forEach(key => {
        if (newAssignments[key] === id) delete newAssignments[key];
      });
      setAssignments(newAssignments);
    } else {
      setCandidateIds(prev => [...prev, id]);
    }
  };

  const handleBulkAssign = (candidateId: string) => {
    const newAssignments: Record<string, string> = { ...assignments };
    groupedItems.forEach(group => {
      group.items.forEach(item => {
        newAssignments[item.id] = candidateId;
      });
    });
    setAssignments(newAssignments);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const allItems = groupedItems.flatMap(g => g.items);
      const promises = allItems.map(item => {
        const targetId = assignments[item.id];
        if (!targetId) return Promise.resolve(); 
        
        const newAssignees = item.assigneeUserIds?.filter(id => id !== sourceUser.id) || [];
        if (!newAssignees.includes(targetId)) newAssignees.push(targetId);
        
        return saveAgendaItem({ ...item, assigneeUserIds: newAssignees });
      });
      
      await Promise.all(promises);
      alert('Amtsübergabe erfolgreich abgeschlossen!');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Fehler bei der Amtsübergabe!');
    }
    setIsSubmitting(false);
  };

  if (totalItemsCount === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Alles sauber!</h2>
          <p className="text-gray-600 mb-6">"{sourceUser.name}" hat keine aktiven Aufgaben oder Vorlagen mehr. Einem Löschen steht nichts im Wege.</p>
          <button onClick={onClose} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors">Schließen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white p-2 rounded-lg mr-3 shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-blue-900">Amtsübergabe-Assistent</h2>
              <p className="text-xs text-blue-700">Zuständigkeiten von <strong>{sourceUser.name}</strong> übertragen</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white rounded p-1"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1 bg-gray-50">
          
          {step === 1 && (
            <div className="p-6 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold text-lg mb-3">1</span>
                <h3 className="text-xl font-bold text-gray-900">Wer kommt als Nachfolger in Frage?</h3>
                <p className="text-sm text-gray-500 mt-2">Wähle hier alle Personen aus, an die du Aufgaben von <strong>{sourceUser.name}</strong> übergeben möchtest.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                  {possibleCandidates.map(u => (
                    <label key={u.id} className={`flex items-center p-4 border-b border-r border-gray-100 cursor-pointer transition-colors ${candidateIds.includes(u.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        checked={candidateIds.includes(u.id)}
                        onChange={() => toggleCandidate(u.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 mr-3"
                      />
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{u.name}</div>
                        {u.amt && <div className="text-xs text-gray-500">{u.amt}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={candidateIds.length === 0}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  Weiter zur Übergabe-Matrix <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col h-full">
              <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <button onClick={() => setStep(1)} className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Zurück zur Auswahl
                  </button>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <span className="text-sm font-bold text-gray-800"><span className="text-blue-600">{totalItemsCount}</span> Einträge gefunden</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] font-black sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-3 w-1/2">Aufgabe / Element</th>
                        {candidateIds.map(cid => {
                          const user = users.find(u => u.id === cid);
                          return (
                            <th key={cid} className="p-3 text-center border-l border-gray-200 min-w-[120px]">
                              <div className="truncate mb-2 text-blue-900">{user?.name}</div>
                              <button 
                                onClick={() => handleBulkAssign(cid)}
                                className="w-full py-1 px-2 bg-blue-600 text-white hover:bg-blue-700 rounded text-[9px] flex items-center justify-center transition-colors shadow-sm"
                                title="Alle Aufgaben pauschal dieser Person zuweisen"
                              >
                                <FastForward className="w-3 h-3 mr-1" /> Alle an {user?.name.split(' ')[0]}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {groupedItems.map(group => (
                        <React.Fragment key={group.title}>
                          {/* CHIRURGISCHER EINGRIFF: Projekt-Header Zeile */}
                          <tr className="bg-gray-50/80">
                            <td colSpan={1 + candidateIds.length} className="p-2 pl-4 text-xs font-black text-gray-500 uppercase tracking-widest flex items-center">
                              {group.icon} {group.title}
                            </td>
                          </tr>
                          
                          {group.items.map(item => {
                            // Oberpunkt ermitteln
                            const parentTitle = item.isSubItem && item.parentItemId 
                              ? (tasks.find(t => t.id === item.parentItemId)?.title || templates.find(t => t.id === item.parentItemId)?.title || 'Unbekannter Oberpunkt')
                              : null;

                            return (
                              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="p-3 pl-6">
                                  {parentTitle && (
                                    <div className="text-[9px] font-bold text-gray-400 mb-0.5 flex items-center uppercase tracking-wider">
                                      🏷️ {parentTitle} <ChevronRight className="w-3 h-3 mx-1" />
                                    </div>
                                  )}
                                  <div className="font-bold text-gray-800 mb-0.5">{item.title || 'Leerer Titel'}</div>
                                  <div className="flex items-center gap-2 text-[10px]">
                                    <span className={`px-1.5 py-0.5 rounded-full font-bold ${item.isTemplate ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {item.isTemplate ? 'Vorlage' : (item.status === 'IN_ARBEIT' ? 'In Arbeit' : 'Offen')}
                                    </span>
                                    {item.dueDate && (
                                      <span className="text-gray-500">📅 {new Date(item.dueDate).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </td>
                                {candidateIds.map(cid => (
                                  <td key={cid} className="p-3 text-center border-l border-gray-100 align-middle">
                                    <label className="inline-flex items-center justify-center cursor-pointer w-full h-full p-2 rounded hover:bg-gray-50 transition-colors">
                                      <input 
                                        type="radio" 
                                        name={`assign-${item.id}`}
                                        value={cid}
                                        checked={assignments[item.id] === cid}
                                        onChange={() => setAssignments(prev => ({ ...prev, [item.id]: cid }))}
                                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      />
                                    </label>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-bold transition-colors">Abbrechen</button>
            <button onClick={handleSave} disabled={isSubmitting} className="flex items-center px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-sm transition-all">
              {isSubmitting ? 'Übertragung läuft...' : <><Save className="w-4 h-4 mr-2" /> Übergabe abschließen</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE ---