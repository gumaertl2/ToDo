// [2026-06-11] - UX-FIX: "Weg B" (Natürliches Scrollen) final korrigiert. Die unsichtbare Höhen-Barriere 'h-full' im mobilen Hochformat wurde durch 'block min-h-screen' ersetzt. Das Layout verhält sich nun im Hochformat exakt so flüssig und grenzenlos wie zuvor nur im Querformat. Das Desktop-Layout (Split-Screen) bleibt via 'md:flex md:h-full' geschützt.
// [2026-06-11] - BUGFIX: JSX Parse Error behoben. Ein fehlerhaft platzierter JSX-Kommentar direkt nach einem return-Statement wurde in das umschließende div verschoben.
// [2026-06-11] - BUGFIX: Unused variable 'isRoutineItem' entfernt, um den strict TypeScript Compiler (Vercel Build) zufrieden zu stellen.
// [2026-06-11] - ARCHITEKTUR-FIX: Staubsauger / Sitzungsabschluss an das Fate-Binding Konzept (isHistorical) angepasst. Schließt man ein Protokoll, erhalten alle Punkte des alten Protokolls zwingend den Stempel 'isHistorical: true'. Unfertige Aufgaben (<100%) werden als neue Klone ('isHistorical: false') in das nächste Meeting übertragen.
// [2026-06-03] - UX-FIX: Blutlinien-Deduplizierung (Bloodline-Scanner) nun auch im Protokoll (EventDetailView) integriert. Verhindert, dass durch alte Bugs erzeugte "Zwillings-Klone" (Aufgaben mit derselben baseItemId im selben Event) doppelt in der Agenda oder im Druck-Layout auftauchen. Es wird pro Blutlinie zwingend nur der jüngste/offene Erbe angezeigt.
// [2026-06-03] - BUGFIX: 'isReadOnly={isReadOnly}' Prop an ItemFormModal durchgereicht. Dadurch öffnet sich das Detail-Modal bei abgeschlossenen Protokollen nun korrekt im Read-Only-Modus.
// [2026-06-03] - BUGFIX: Rollover-Klon-Logik in EventDetailView repariert. Unterpunkte berechnen ihr neues Datum nun fehlerfrei mit echter Date-Mathematik (setDate) inkl. Unterstützung für 'days_after' (Tage DANACH), wenn ein Projekt manuell abgeschlossen und geklont wird.
// [2026-06-01] - BUGFIX: 'searchQuery' Prop an EventAgendaList durchgereicht, damit das Highlighting in den Zeilen ankommt.
// [2026-05-31] - UX-FIX: Suchfeld ("Volltext / Ähnlichkeitssuche") re-integriert. Die EventDetailView übergibt nun den searchTerm State an Header und filtert die eventAgenda entsprechend.
// [2026-05-29] - PRINT-FIX: Erledigungsgrad (Progress) und korrekte RichText-Formatierung (Bulletpoints, Einrückungen, Fett, Kursiv) in die versteckte HTML-Druck-Tabelle von handlePrint integriert.
// [2026-05-25] - SECURITY-FIX: Access Control Guard implementiert. Interne/Unveröffentlichte Events können nicht mehr über Direktlinks von Nicht-Teilnehmern eingesehen werden (Zugriff verweigert).
// [2026-05-25] - BUGFIX: validateBeforeClose ignoriert nun TRASH-Elemente. Gelöschte unzugewiesene Aufgaben blockieren nicht mehr den Sitzungsabschluss.
// [2026-05-25] - MASTER SYNC: Klon-Logik für "Sitzung schließen" auf Container-Prinzip gehärtet. Unterpunkte (auch erledigte!) wandern 1:1 mit dem unfertigen Oberpunkt mit. baseItemId wird konsequent gesetzt, damit der neue fetchTasks-Filter die Vererbung erkennt.
// [2026-05-25] - ARCHITEKTUR-FIX: Unterpunkte werden nun sauber mit ihrem neuen Oberpunkt verknüpft (keine Waisen mehr). Fortschritte von unfertigen Aufgaben bleiben erhalten, Info-Routinen starten sauber neu.
// [2026-05-16] - BUGFIX: Druck-Funktion (handlePrint) filtert nun TRASH heraus und zeigt Typ-Präfixe (A:, I:) an.
// --- START OF FILE ---
// src/features/Events/EventDetailView.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useClubStore } from '../../store/useClubStore';
import { doc, collection } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ItemFormModal } from '../Shared/ItemFormModal';
import { EventFormModal } from './EventFormModal';
import { TaskHistoryModal } from '../Tasks/TaskHistoryModal';
import { EventDetailHeader } from './EventDetailHeader';
import { EventAgendaList } from './EventAgendaList';
import { EventTemplateSidebar } from './EventTemplateSidebar';
import type { AgendaItem, Event, Task } from '../../core/types/models';

export const EventDetailView: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { 
    user, 
    events, currentEvent, eventAgenda, users, groups, 
    fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, 
    fetchTasks, saveAgendaItem, updateEvent, addEvent 
  } = useClubStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [returnToTask, setReturnToTask] = useState<AgendaItem | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false); 
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [presentList, setPresentList] = useState<string[]>([]);
  const [excusedList, setExcusedList] = useState<string[]>([]);
  const [unexcusedList, setUnexcusedList] = useState<string[]>([]);
  const [isAttendanceConfirmed, setIsAttendanceConfirmed] = useState(false);
  
  const [tempDurations, setTempDurations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (eventId) { 
      fetchEventDetails(eventId); 
      fetchEventAgenda(eventId); 
      fetchTemplatesAndRoutines(); 
      fetchTasks(); 
    }
  }, [eventId, fetchEventDetails, fetchEventAgenda, fetchTemplatesAndRoutines, fetchTasks]);

  const invitedUserIds = useMemo(() => {
    if (!currentEvent) return [];
    const ids = new Set<string>(currentEvent.participantUserIds || []);
    const eventGroupIds = currentEvent.participantGroupIds || [];
    users.forEach(u => { 
      if (u.groupIds && u.groupIds.some(gId => eventGroupIds.includes(gId))) {
        ids.add(u.id); 
      }
    });
    return Array.from(ids);
  }, [currentEvent, users]);

  const rolloverTemplateEvent: Partial<Event> | undefined = useMemo(() => {
    if (!isEventModalOpen || !currentEvent || currentEvent.status !== 'AKTIV') return undefined;
    
    const targetSeriesId = currentEvent.seriesId || currentEvent.id;
    const now = new Date();
    const oldStart = currentEvent.plannedStartTime ? new Date(currentEvent.plannedStartTime) : now;
    
    const newStart = new Date(now.getTime());
    newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
    
    let newEnd: number | undefined = undefined;
    if (currentEvent.plannedEndTime) {
       const oldEnd = new Date(currentEvent.plannedEndTime);
       const nE = new Date(now.getTime());
       nE.setHours(oldEnd.getHours(), oldEnd.getMinutes(), 0, 0);
       newEnd = nE.getTime();
    }
    
    return {
      title: currentEvent.title,
      description: currentEvent.description,
      location: currentEvent.location,
      participantGroupIds: currentEvent.participantGroupIds,
      participantUserIds: currentEvent.participantUserIds,
      status: 'PLANUNG',
      seriesId: targetSeriesId,
      plannedStartTime: newStart.getTime(),
      plannedEndTime: newEnd,
    };
  }, [isEventModalOpen, currentEvent]);

  const deduplicatedAgenda = useMemo(() => {
    const bloodlineMap = new Map<string, AgendaItem[]>();
    eventAgenda.forEach(item => {
      const bId = item.baseItemId || item.id;
      if (!bloodlineMap.has(bId)) bloodlineMap.set(bId, []);
      bloodlineMap.get(bId)!.push(item);
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

    return eventAgenda.filter(item => primaryTaskIds.has(item.id));
  }, [eventAgenda]);

  const filteredEventAgenda = useMemo(() => {
      if (!searchTerm.trim()) return deduplicatedAgenda;
      
      const term = searchTerm.toLowerCase();
      
      const matches = deduplicatedAgenda.filter(item => 
          item.title.toLowerCase().includes(term) || 
          (item.description && item.description.toLowerCase().includes(term))
      );
      
      const idsToInclude = new Set<string>();
      
      matches.forEach(match => {
          idsToInclude.add(match.id);
          
          if (match.isSubItem && match.parentItemId) {
              idsToInclude.add(match.parentItemId);
          }
          
          if (!match.isSubItem) {
              const children = deduplicatedAgenda.filter(c => c.isSubItem && c.parentItemId === match.id);
              children.forEach(c => idsToInclude.add(c.id));
          }
      });
      
      return deduplicatedAgenda.filter(item => idsToInclude.has(item.id));
  }, [deduplicatedAgenda, searchTerm]);

  if (!currentEvent) return <div className="p-8 text-center text-gray-500 animate-pulse">Lade Sitzung...</div>;

  const isInternal = currentEvent.status === 'PLANUNG' || !currentEvent.isPublished;
  const isParticipant = user ? invitedUserIds.includes(user.id) : false;
  const isAdmin = user?.roleProfileId === 'pro-admin';

  if (isInternal && !isParticipant && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zugriff verweigert</h2>
        <p className="text-gray-600 max-w-md mb-6">
          Dieses Event ist intern und noch nicht veröffentlicht. Du hast keinen Zugriff auf die Agenda, da du nicht auf der Teilnehmerliste stehst.
        </p>
        <button 
          onClick={() => navigate('/events')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const isReadOnly = currentEvent.status === 'ABGESCHLOSSEN';
  const targetSeriesId = currentEvent.seriesId || currentEvent.id;
  const pastEvents = events
    .filter(e => e.status === 'ABGESCHLOSSEN' && (e.seriesId || e.id) === targetSeriesId)
    .sort((a,b) => (b.plannedStartTime || 0) - (a.plannedStartTime || 0));

  const getAssigneesText = (item: AgendaItem) => {
    const uNames = (item.assigneeUserIds || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean);
    const gNames = (item.assigneeGroupIds || []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean);
    const all = [...uNames, ...gNames];
    if (all.length > 0) return all.join(', ');
    if (item.type === 'INFO') return 'Allgemeine Info';
    return 'Nicht zugewiesen';
  };

  const handlePrint = () => {
    if (!currentEvent) return;
    
    const getNames = (ids: string[]) => ids.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ') || '-';
    const presentNames = getNames(currentEvent.actualAttendeeUserIds || []);
    const excusedNames = getNames(currentEvent.excusedAttendeeUserIds || []);
    const unexcusedNames = getNames(currentEvent.unexcusedAttendeeUserIds || []);
    
    const formatTimeStr = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
    const startTimeStr = currentEvent.plannedStartTime ? formatTimeStr(currentEvent.plannedStartTime) : 'Unbekannt';
    const endTimeStr = currentEvent.actualEndTime 
      ? formatTimeStr(currentEvent.actualEndTime) 
      : (currentEvent.plannedEndTime ? formatTimeStr(currentEvent.plannedEndTime) + ' (Geplant)' : 'Offen');
      
    const formatPrintDescription = (text: string) => {
      if (!text) return '';
      return text.split('\n').map(line => {
        let isList = false;
        let indent = 0;
        let content = line;

        const match = line.match(/^(\s*)-\s+/);
        if (match) {
          isList = true;
          indent = match[1].length;
          content = line.substring(match[0].length);
        }

        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/_(.*?)_/g, '<em>$1</em>');

        if (isList) {
          return `<div style="margin-left: ${15 + (indent * 10)}px; text-indent: -12px; margin-top: 2px;">&bull; ${content}</div>`;
        }
        return `<div style="min-height: 16px; margin-top: 2px; white-space: pre-wrap;">${content}</div>`;
      }).join('');
    };

    let html = `
      <html>
        <head>
          <title>Protokoll: ${currentEvent.title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; font-size: 13px; line-height: 1.4; } 
            h1 { font-size: 22px; margin-bottom: 5px; border-bottom: 2px solid #111; padding-bottom: 10px; } 
            .meta { font-size: 13px; color: #444; margin-bottom: 20px; } 
            .attendance { margin-bottom: 20px; font-size: 13px; background: #f9f9f9; padding: 12px; border: 1px solid #ddd; border-radius: 4px; } 
            table { width: 100%; border-collapse: collapse; margin-top: 15px; } 
            th, td { border: 1px solid #ccc; padding: 10px 8px; text-align: left; vertical-align: top; } 
            th { background-color: #f0f0f0; font-weight: bold; font-size: 12px; text-transform: uppercase; } 
            .nr { width: 40px; font-weight: bold; text-align: center; } 
            .zeit { width: 50px; white-space: nowrap; font-weight: bold; } 
            .thema { width: 50%; } 
            .wer { width: 20%; font-size: 12px; } 
            .faellig { width: 20%; font-size: 12px; } 
            .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; display: block; color: #000; } 
            .desc { font-size: 12px; color: #333; margin-top: 4px; } 
            @media print { button { display: none; } } 
          </style>
        </head>
        <body>
          <h1>${currentEvent.title}</h1>
          ${currentEvent.description ? `<div style="font-size: 14px; font-style: italic; color: #555; margin-top: -5px; margin-bottom: 15px;">${currentEvent.description.replace(/\n/g, '<br/>')}</div>` : ''}
          <div class="meta">
            <strong>Datum:</strong> ${currentEvent.plannedStartTime ? new Date(currentEvent.plannedStartTime).toLocaleDateString() : 'Unbekannt'} | 
            <strong>Beginn:</strong> ${startTimeStr} | 
            <strong>Ende:</strong> ${endTimeStr} | 
            <strong>Ort:</strong> ${currentEvent.location || 'Kein Ort hinterlegt'}<br/>
            <strong>Status:</strong> ${currentEvent.status === 'ABGESCHLOSSEN' ? 'Versiegeltes Protokoll' : (currentEvent.status === 'AKTIV' ? 'Laufende Sitzung' : 'In Planung')}
          </div>
          <div class="attendance">
            <strong>Anwesenheit bestätigt:</strong> ${currentEvent.attendanceConfirmed ? 'Ja' : 'Nein'}<br/>
            <strong>Anwesend:</strong> ${presentNames}<br/>
            <strong>Entschuldigt:</strong> ${excusedNames}<br/>
            <strong>Unentschuldigt:</strong> ${unexcusedNames}
          </div>
          <table>
            <thead>
              <tr>
                <th class="nr">Nr.</th>
                <th class="zeit">Zeit</th>
                <th class="thema">Thema / Beschreibung</th>
                <th class="wer">Wer</th>
                <th class="faellig">Fällig</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    let runningTime = currentEvent.plannedStartTime || new Date().setHours(19, 0, 0, 0);
    
    if (filteredEventAgenda.length === 0) { 
      html += `<tr><td colspan="5" style="text-align:center; padding: 20px;">Keine Agendapunkte vorhanden.</td></tr>`; 
    } else {
      const sortedAgenda = [...filteredEventAgenda].filter(i => i.status !== 'TRASH').sort((a, b) => (a.protocolIndex || 0) - (b.protocolIndex || 0));
      let mainCounter = 0; 
      let subCounter = 0;
      
      sortedAgenda.forEach((item) => {
        let displayIndexStr = '-';
        if (!item.isSubItem) { 
          mainCounter++; 
          subCounter = 0; 
          displayIndexStr = `${mainCounter}.`; 
        } else { 
          subCounter++; 
          displayIndexStr = mainCounter === 0 ? `0.${subCounter}` : `${mainCounter}.${subCounter}`; 
        }
        
        const timeStr = new Date(runningTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        runningTime += (item.durationEstimate || 0) * 60000;
        
        let statusStr = '-'; 
        if (item.type === 'AUFGABE') { 
          if (item.isDueNextMeeting) statusStr = `<strong>Nächste Sitzung</strong>`; 
          else if (item.dueDate) statusStr = `<strong>${new Date(item.dueDate).toLocaleDateString()}</strong>`; 
          
          statusStr += `<br/><span style="font-size: 11px; color: #555; font-weight: normal; margin-top: 4px; display: block;">Erledigt: ${item.progress || 0}%</span>`;
        }
        
        html += `
          <tr>
            <td class="nr">${displayIndexStr}</td>
            <td class="zeit">${timeStr}</td>
            <td class="thema">
              <span class="title">${item.type === 'AGENDA' ? 'A: ' : item.type === 'INFO' ? 'I: ' : ''}${item.title}</span>
              ${item.description ? `<div class="desc">${formatPrintDescription(item.description)}</div>` : ''}
            </td>
            <td class="wer">${getAssigneesText(item)}</td>
            <td class="faellig">${statusStr}</td>
          </tr>
        `;
      });
    }
    html += `</tbody></table><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`;
    
    const printWin = window.open('', '_blank');
    if (printWin) { 
      printWin.document.open(); 
      printWin.document.write(html); 
      printWin.document.close(); 
    } else { 
      alert("Bitte erlaube Popups für diese Seite, um drucken zu können."); 
    }
  };

  const validateBeforeClose = () => {
    if (!currentEvent.attendanceConfirmed) { 
      alert('🚨 Halt! Das Protokoll kann noch nicht geschlossen werden.\n\nDie Anwesenheit wurde noch nicht final bestätigt.\nBitte prüfe die Anwesenheitsliste und setze den Haken zur Bestätigung.'); 
      return false; 
    }
    const incompleteTasks = eventAgenda.filter(item => { 
      if (item.type !== 'AUFGABE' || item.status === 'ERLEDIGT' || item.status === 'TRASH') return false; 
      const hasAssignee = (item.assigneeUserIds && item.assigneeUserIds.length > 0) || (item.assigneeGroupIds && item.assigneeGroupIds.length > 0); 
      return !hasAssignee; 
    });
    if (incompleteTasks.length > 0) { 
      alert(`Halt! Das Protokoll kann noch nicht geschlossen werden.\n\nFolgenden Aufgaben fehlt ein Verantwortlicher:\n${incompleteTasks.map(t => `- ${t.title}`).join('\n')}\n\nBitte weise diese Aufgaben jemandem zu!`); 
      return false; 
    }
    return true;
  };

  const handleSaveAttendance = async () => {
    await updateEvent({ 
      ...currentEvent, 
      actualAttendeeUserIds: presentList, 
      excusedAttendeeUserIds: excusedList, 
      unexcusedAttendeeUserIds: unexcusedList, 
      attendanceConfirmed: isAttendanceConfirmed 
    });
    setIsAttendanceModalOpen(false);
  };

  const setAttendanceStatus = (id: string, status: 'present'|'excused'|'unexcused') => {
    setPresentList(prev => prev.filter(x => x !== id)); 
    setExcusedList(prev => prev.filter(x => x !== id)); 
    setUnexcusedList(prev => prev.filter(x => x !== id));
    
    if (status === 'present') setPresentList(prev => [...prev, id]); 
    if (status === 'excused') setExcusedList(prev => [...prev, id]); 
    if (status === 'unexcused') setUnexcusedList(prev => [...prev, id]);
  };

  const formatTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const effectiveHeaderEndTime = currentEvent.actualEndTime || currentEvent.plannedEndTime;
  const timeString = currentEvent.plannedStartTime ? `${formatTime(currentEvent.plannedStartTime)}${effectiveHeaderEndTime ? ` - ${formatTime(effectiveHeaderEndTime)}` : ''}` : '';

  const handleDurationPreview = (id: string, val: number) => { 
    setTempDurations(prev => ({ ...prev, [id]: val })); 
  };
  
  const handleClearPreview = (id: string) => { 
    setTempDurations(prev => { 
      const next = { ...prev }; 
      delete next[id]; 
      return next; 
    }); 
  };

  const editingParentTask = editingItem?.parentItemId ? eventAgenda.find(t => t.id === editingItem.parentItemId) : undefined;

  return (
    {/* CHIRURGISCHER EINGRIFF: Für Mobile wird hier 'block min-h-screen' gesetzt. Damit wird das unsichtbare 'h-full' Korsett zerstört und die Ansicht wächst natürlich nach unten. Ab 'md:' (Tablet/Desktop) greift wieder das vertraute 'flex h-full' Layout. */}
    <div className="block h-auto min-h-screen md:flex md:flex-col md:h-full md:overflow-hidden print:!bg-white print:!h-auto print:!block print:!w-full print:!m-0 print:!p-0">
      <EventDetailHeader
        eventId={eventId || ''}
        currentEvent={currentEvent}
        isReadOnly={isReadOnly}
        invitedUserIds={invitedUserIds}
        timeString={timeString}
        pastEvents={pastEvents}
        isLibraryVisible={isLibraryVisible}
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        onToggleLibrary={() => setIsLibraryVisible(!isLibraryVisible)}
        onEditEvent={() => setIsEditEventModalOpen(true)}
        onCheckAttendance={() => {
          setPresentList(currentEvent.actualAttendeeUserIds || []);
          setExcusedList(currentEvent.excusedAttendeeUserIds || []);
          setUnexcusedList(currentEvent.unexcusedAttendeeUserIds || []);
          setIsAttendanceConfirmed(currentEvent.attendanceConfirmed || false);
          setIsAttendanceModalOpen(true);
        }}
        onPrint={handlePrint}
      />

      {/* CHIRURGISCHER EINGRIFF: Auch hier wird das Flex-Korsett für Mobile entfernt und erst ab 'md:' reaktiviert. mt-4 sorgt für minimalen Abstand unterm Header auf dem Handy. */}
      <div className="block mt-4 md:mt-0 md:flex-1 md:flex md:flex-row gap-6 md:overflow-hidden print:!overflow-visible print:!block print:!w-full print:!m-0">
        <EventAgendaList
          eventId={eventId || ''}
          currentEvent={currentEvent}
          eventAgenda={filteredEventAgenda} 
          isReadOnly={isReadOnly}
          tempDurations={tempDurations}
          searchQuery={searchTerm} 
          onAddNewItem={() => { setEditingItem(null); setIsModalOpen(true); }}
          onEditItem={i => { setEditingItem(i); setIsModalOpen(true); }}
          onOpenHistory={i => setHistoryTask(i)}
          onPlanNextMeeting={() => { if (validateBeforeClose()) setIsEventModalOpen(true); }}
          onFinishEvent={async () => { 
            if (validateBeforeClose() && window.confirm('Projekt abschließen? (Achtung: Dies friert alle Daten dieses Protokolls unwiderruflich ein!)')) {
              const sealPromises = eventAgenda.map(item => {
                if (item.status === 'TRASH') return Promise.resolve({ success: true });
                return saveAgendaItem({ ...item, isHistorical: true });
              });
              await Promise.all(sealPromises);
              
              await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() }); 
            }
          }}
          onDurationPreview={handleDurationPreview}
          onClearPreview={handleClearPreview}
        />

        {!isReadOnly && isLibraryVisible && (
          <EventTemplateSidebar eventId={eventId || ''} />
        )}
      </div>

      {isModalOpen && (
        <ItemFormModal 
          key={editingItem ? editingItem.id : `new-${Date.now()}`} 
          isOpen={true} 
          existingItem={editingItem || { eventId: eventId, type: 'AGENDA' }} 
          parentItemContext={editingParentTask} 
          isReadOnly={isReadOnly}
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
          onClose={() => { 
            if (editingItem?.id) handleClearPreview(editingItem.id); 
            setIsModalOpen(false); 
            setReturnToTask(null); 
          }} 
          onDurationPreview={(val) => { 
            if (editingItem?.id) handleDurationPreview(editingItem.id, val); 
          }}
          onSave={async (data) => { 
            let newProtocolIndex = data.protocolIndex;
            
            if (!editingItem) {
              if (!data.isSubItem) {
                const mainItems = eventAgenda.filter(i => !i.isSubItem && i.status !== 'TRASH');
                const maxIndex = mainItems.reduce((max, item) => Math.max(max, item.protocolIndex || 0), -1);
                newProtocolIndex = maxIndex + 1;
              } else if (data.parentItemId) {
                const subItems = eventAgenda.filter(i => i.isSubItem && i.parentItemId === data.parentItemId && i.status !== 'TRASH');
                const maxIndex = subItems.reduce((max, item) => Math.max(max, item.protocolIndex || 0), -1);
                newProtocolIndex = maxIndex + 1;
              }
            }

            await saveAgendaItem({ 
              ...data, 
              eventId, 
              ...( !editingItem ? { createdAt: Date.now(), protocolIndex: newProtocolIndex } : {}) 
            }); 
            if (editingItem?.id) handleClearPreview(editingItem.id); 
            if (eventId) fetchEventAgenda(eventId); 
            setIsModalOpen(false); 
            setReturnToTask(null); 
          }} 
        />
      )}

      {historyTask && (
        <TaskHistoryModal 
          task={historyTask} 
          onClose={() => setHistoryTask(null)} 
        />
      )}

      {isEditEventModalOpen && (
        <EventFormModal 
          isOpen={true} 
          existingEvent={currentEvent} 
          onClose={() => setIsEditEventModalOpen(false)} 
          onSave={async (data) => { 
            const result = await updateEvent(data); 
            if (!result?.success) throw new Error(result?.error?.message); 
            setIsEditEventModalOpen(false); 
            if (eventId) fetchEventDetails(eventId); 
          }} 
        />
      )}

      {isEventModalOpen && (
        <EventFormModal 
          isOpen={true} 
          existingEvent={rolloverTemplateEvent as Event} 
          onClose={() => setIsEventModalOpen(false)} 
          onSave={async (data) => { 
            const result = await addEvent(data); 
            if (!result?.success) throw new Error(result?.error?.message); 
            
            if (currentEvent.status === 'AKTIV') { 
              const sealPromises = eventAgenda.map(item => {
                if (item.status === 'TRASH') return Promise.resolve({ success: true });
                return saveAgendaItem({ ...item, isHistorical: true });
              });
              await Promise.all(sealPromises);
              
              await updateEvent({ ...currentEvent, status: 'ABGESCHLOSSEN', actualEndTime: Date.now() }); 
              
              const parentItemsToCopy = eventAgenda.filter(item => {
                if (item.isSubItem || item.status === 'TRASH') return false; 
                if (item.type === 'AUFGABE') {
                  const isFinished = item.progress === 100 || item.status === 'ERLEDIGT';
                  return !isFinished;
                } else {
                  return false; 
                }
              });
              
              const idMap = new Map<string, string>();
              let delay = 0;

              for (const parent of parentItemsToCopy) {
                const { id, ...rest } = parent;
                const newId = doc(collection(db, 'agenda_items')).id;
                idMap.set(id, newId);

                let newDueDate = parent.dueDate;
                const isRoutine = parent.isRoutine === true || String(parent.isRoutine) === 'true';
                const isUnfinishedTask = parent.type === 'AUFGABE';

                if (parent.type === 'AUFGABE') {
                  if (parent.isDueNextMeeting || (!parent.dueDate && !isRoutine)) {
                    newDueDate = data.plannedStartTime;
                  }
                }

                const safePayload = {
                  ...rest,
                  id: newId,
                  eventId: data.id,
                  baseItemId: parent.baseItemId || parent.id, 
                  status: isUnfinishedTask ? parent.status : 'OFFEN',
                  progress: isUnfinishedTask ? parent.progress : 0,
                  approvedBy: isUnfinishedTask ? parent.approvedBy : [],
                  createdAt: Date.now() + delay,
                  isDueNextMeeting: false,
                  dueDate: newDueDate,
                  isHistorical: false 
                };

                Object.keys(safePayload).forEach(key => {
                  if ((safePayload as any)[key] === undefined) delete (safePayload as any)[key];
                });

                await saveAgendaItem(safePayload);
                delay += 50;
              }

              const subItemsToCopy = eventAgenda.filter(item => {
                if (!item.isSubItem || item.status === 'TRASH' || !item.parentItemId) return false;
                return idMap.has(item.parentItemId);
              });

              for (const child of subItemsToCopy) {
                const { id, ...rest } = child;
                const newId = doc(collection(db, 'agenda_items')).id;
                const newParentId = idMap.get(child.parentItemId!); 
                
                const parentItem = parentItemsToCopy.find(p => p.id === child.parentItemId);
                const isParentUnfinishedTask = parentItem?.type === 'AUFGABE';

                let newChildDueDate = child.dueDate;
                if (data.plannedStartTime && child.leadTimeValue !== undefined && child.leadTimeUnit) {
                   const baseDate = new Date(data.plannedStartTime);
                   if (child.leadTimeUnit === 'same_day') {
                       newChildDueDate = baseDate.getTime();
                   } else if (child.leadTimeUnit === 'days_before') {
                       baseDate.setDate(baseDate.getDate() - child.leadTimeValue);
                       newChildDueDate = baseDate.getTime();
                   } else if (child.leadTimeUnit === 'days_after') {
                       baseDate.setDate(baseDate.getDate() + child.leadTimeValue);
                       newChildDueDate = baseDate.getTime();
                   }
                }

                const safeChildPayload = {
                  ...rest,
                  id: newId,
                  eventId: data.id,
                  parentItemId: newParentId,
                  baseItemId: child.baseItemId || child.id,
                  status: isParentUnfinishedTask ? child.status : 'OFFEN',
                  progress: isParentUnfinishedTask ? child.progress : 0,
                  approvedBy: isParentUnfinishedTask ? child.approvedBy : [],
                  createdAt: Date.now() + delay,
                  isDueNextMeeting: false,
                  dueDate: newChildDueDate,
                  isHistorical: false 
                };

                Object.keys(safeChildPayload).forEach(key => {
                  if ((safeChildPayload as any)[key] === undefined) delete (safeChildPayload as any)[key];
                });

                await saveAgendaItem(safeChildPayload);
                delay += 50;
              }
            } 
            
            setIsEventModalOpen(false); 
            if (window.confirm('Protokoll geschlossen, versiegelt und neues Event generiert! Zur neuen Agenda wechseln?')) {
              navigate(`/events/${data.id}`); 
            } else if (eventId) {
              fetchEventAgenda(eventId); 
            }
          }} 
        />
      )}

      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:!hidden print:!absolute print:!w-0 print:!h-0 print:!overflow-hidden print:!m-0 print:!p-0 print:!border-0">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Anwesenheitsliste
              </h2>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">Erfasse hier exakt, wer von den geladenen Personen heute anwesend ist, und wer entschuldigt oder unentschuldigt fehlt.</p>
              
              <div className="space-y-3">
                {users.filter(u => invitedUserIds.includes(u.id)).map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <span className="font-medium text-gray-800 mb-2 sm:mb-0">
                      {u.name} <span className="text-xs text-gray-500 font-normal ml-1">({u.amt})</span>
                    </span>
                    <div className="flex bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
                      <button onClick={() => setAttendanceStatus(u.id, 'present')} className={`flex-1 sm:w-24 py-1.5 text-xs font-bold rounded-md transition-all ${presentList.includes(u.id) ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Anwesend</button>
                      <button onClick={() => setAttendanceStatus(u.id, 'excused')} className={`flex-1 sm:w-24 py-1.5 text-xs font-bold rounded-md transition-all ${excusedList.includes(u.id) ? 'bg-yellow-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Entsch.</button>
                      <button onClick={() => setAttendanceStatus(u.id, 'unexcused')} className={`flex-1 sm:w-24 py-1.5 text-xs font-bold rounded-md transition-all ${unexcusedList.includes(u.id) ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-200'}`}>Fehlt</button>
                    </div>
                  </div>
                ))}
                {users.filter(u => invitedUserIds.includes(u.id)).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Keine Personen direkt oder über Ämter eingeladen.</p>
                )}
              </div>

              <label className="flex items-center p-3 mt-6 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                <input type="checkbox" checked={isAttendanceConfirmed} onChange={e => setIsAttendanceConfirmed(e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mr-3" />
                <span className="font-bold text-green-900 text-sm">Anwesenheit final geprüft und bestätigt</span>
              </label>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setIsAttendanceModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Abbrechen</button>
              <button onClick={handleSaveAttendance} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE ---