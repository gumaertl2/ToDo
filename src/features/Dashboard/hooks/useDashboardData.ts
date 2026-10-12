// [2026-10-12] - BUGFIX: Vergangenheits-Filter (todayStart <= eventDateStart) in pendingWhatsAppReminders nachgerüstet, um Diskrepanzen zur RemindersView/Navigation zu verhindern.
// [2026-10-12] - REFACTOR: Dashboard Daten-Logik (Events, ToDos, Dienste, Sitzungen) aus WelcomeDashboard in Custom Hook ausgelagert.
// src/features/Dashboard/hooks/useDashboardData.ts
import { useMemo, useCallback } from 'react';
import { useClubStore } from '../../../store/useClubStore';

export const useDashboardData = (
  eventsLookahead: number,
  servicesLookahead: number,
  tasksLookahead: number
) => {
  const { 
    user, 
    tasks, 
    events, 
    calendarEvents,
    calendarSubscriptions,
    helpers,
    roleProfiles,
    matchLineups
  } = useClubStore();

  // RECHTE-CHECK & DOMAIN LANGUAGE (App-Nutzer vs. reiner Helfer)
  const userRoleProfile = roleProfiles?.find(p => p.id === user?.roleProfileId);
  const canManageEvents = !!(userRoleProfile?.permissions as any)?.manageEvents || !!(user?.permissions as any)?.manageEvents;
  const canManageTasks = !!(userRoleProfile?.permissions as any)?.manageTasks || !!(user?.permissions as any)?.manageTasks;

  const isAppUser = !!user?.roleProfileId || canManageEvents || canManageTasks;

  // --- RESOLUTION ENGINE ---
  const { 
    myHelper, 
    userGroupIds, 
    todayStart, 
    eventsLookaheadDate,
    servicesLookaheadDate,
    tasksLookaheadDate
  } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const helper = helpers?.find(h => h.email?.toLowerCase() === user?.email?.toLowerCase());
    return {
      myHelper: helper,
      userGroupIds: user?.groupIds || [],
      todayStart: today,
      eventsLookaheadDate: today + (eventsLookahead * 24 * 60 * 60 * 1000),
      servicesLookaheadDate: today + (servicesLookahead * 24 * 60 * 60 * 1000),
      tasksLookaheadDate: today + (tasksLookahead * 24 * 60 * 60 * 1000)
    };
  }, [user, helpers, eventsLookahead, servicesLookahead, tasksLookahead]);

  const checkEventRelevance = useCallback((item: any) => {
    if (!user) return false;
    
    if (item.participantUserIds?.includes(user.id) || 
        item.assigneeUserIds?.includes(user.id) ||
        item.reminderRecipientUserIds?.includes(user.id)) return true;
        
    if (myHelper && (
        item.participantHelperIds?.includes(myHelper.id) || 
        item.assigneeHelperIds?.includes(myHelper.id) ||
        item.reminderRecipientHelperIds?.includes(myHelper.id)
    )) return true;
    
    if (item.participantGroupIds?.some((gId: string) => userGroupIds.includes(gId)) || 
        item.assigneeGroupIds?.some((gId: string) => userGroupIds.includes(gId)) ||
        item.reminderRecipientGroupIds?.some((gId: string) => userGroupIds.includes(gId))) return true;
        
    const itemTeamIds = [
        ...(item.participantTeamIds || []), 
        ...(item.assigneeTeamIds || []),
        ...(item.reminderRecipientTeamIds || [])
    ];
    
    if (itemTeamIds.length > 0 && myHelper) {
      const myTeamIds = myHelper.teamIds || [];
      if (itemTeamIds.some(tId => myTeamIds.includes(tId))) return true;
      
      const myStatus = myHelper.memberStatus?.toLowerCase(); 
      if (itemTeamIds.includes('vgroup-all')) return true;
      if (myStatus === 'aktiv' && itemTeamIds.includes('vgroup-aktiv')) return true;
      if (myStatus === 'passiv' && itemTeamIds.includes('vgroup-passiv')) return true;
      if (myStatus === 'jugend' && itemTeamIds.includes('vgroup-jugend')) return true;
    }
    
    return false;
  }, [user, myHelper, userGroupIds]);

  const allMyOpenTasks = useMemo(() => {
    if (!isAppUser || !user || !tasks) return [];
    
    return tasks.filter(t => {
      if (t.isTemplate) return false;
      if (t.progress === 100 || t.status === 'ERLEDIGT' || t.status === 'TRASH') return false;
      if (t.isHistorical === true) return false;

      if (t.eventId && events) {
        const parentEvent = events.find(e => e.id === t.eventId);
        if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return false;
        if (parentEvent?.status === 'PLANUNG' && !parentEvent.isPublished && !t.baseItemId) return false;
      }

      if (t.isSubItem && t.parentItemId) {
          const parentTask = tasks.find(p => p.id === t.parentItemId);
          if (parentTask && (parentTask.status === 'ERLEDIGT' || parentTask.progress === 100)) return false;
      }
      
      const isAssignee = t.assigneeUserIds?.includes(user.id) || 
                         t.assigneeGroupIds?.some(g => userGroupIds.includes(g));
      
      return isAssignee;
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  }, [tasks, user, userGroupIds, events, isAppUser]);

  const totalOpenTasksCount = allMyOpenTasks.length;

  const myTasks = useMemo(() => {
    return allMyOpenTasks.filter(t => !t.dueDate || t.dueDate <= tasksLookaheadDate);
  }, [allMyOpenTasks, tasksLookaheadDate]);

  const upcomingSessions = useMemo(() => {
    if (!isAppUser) return [];

    return events
      .filter((e) => {
        if (canManageEvents) return true;
        const isDirectParticipant = e.participantUserIds?.includes(user?.id || '');
        const isGroupParticipant = e.participantGroupIds?.some(gId => userGroupIds.includes(gId));
        return isDirectParticipant || isGroupParticipant;
      })
      .filter((e) => e.status !== 'ABGESCHLOSSEN' && !e.isArchived)
      .filter((e) => {
        const time = e.plannedStartTime || e.startDate;
        return time ? new Date(time).getTime() >= todayStart : true;
      })
      .sort((a, b) => (a.plannedStartTime || a.startDate || 0) - (b.plannedStartTime || b.startDate || 0))
      .slice(0, 3);
  }, [events, user, canManageEvents, todayStart, isAppUser, userGroupIds]);

  const upcomingEvents = useMemo(() => {
    const combinedEvents: any[] = [];
    const processedEventKeys = new Set<string>();

    if (events) {
      events.forEach(ev => {
        if (ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return;
        if (!ev.plannedStartTime) return;
        
        const evTime = new Date(ev.plannedStartTime).getTime();
        const evEnd = ev.plannedEndTime ? new Date(ev.plannedEndTime).getTime() : evTime;
        
        if (evEnd >= todayStart && evTime <= eventsLookaheadDate) {
          if (checkEventRelevance(ev)) {
            const dateStr = new Date(evTime).toISOString().split('T')[0];
            const normalizedTitle = ev.title.toLowerCase().trim();
            processedEventKeys.add(`${dateStr}|${normalizedTitle}`);

            combinedEvents.push({
              id: ev.id,
              title: ev.title,
              time: evTime,
              type: 'INTERN',
              source: 'Für mich relevant'
            });
          }
        }
      });
    }

    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        const ceTime = new Date(ce.startTime).getTime();
        const ceEnd = ce.endTime ? new Date(ce.endTime).getTime() : ceTime;
        
        if (ceEnd >= todayStart && ceTime <= eventsLookaheadDate && ce.eventType !== 'DIENST') {
            const dateStr = new Date(ceTime).toISOString().split('T')[0];
            const normalizedTitle = ce.title.toLowerCase().trim();
            
            let isDuplicate = false;
            for (const key of processedEventKeys) {
              const [keyDate, keyTitle] = key.split('|');
              if (keyDate === dateStr && (keyTitle.includes(normalizedTitle) || normalizedTitle.includes(keyTitle))) {
                isDuplicate = true;
                break;
              }
            }

            if (!isDuplicate && checkEventRelevance(ce)) {
              combinedEvents.push({
                id: ce.id,
                title: ce.title,
                time: ceTime,
                type: 'EXTERN',
                source: 'Für mich relevant'
              });
            }
        }
      });
    }

    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (!sub.isActive || !sub.cachedEvents) return;
        
        if (checkEventRelevance(sub)) {
          sub.cachedEvents.forEach(cachedEv => {
            const evTime = new Date(cachedEv.startTime).getTime();
            const evEnd = cachedEv.endTime ? new Date(cachedEv.endTime).getTime() : evTime;
            
            if (evEnd >= todayStart && evTime <= eventsLookaheadDate) {
              const dateStr = new Date(evTime).toISOString().split('T')[0];
              const normalizedTitle = cachedEv.title.toLowerCase().trim();
              
              let isDuplicate = false;
              for (const key of processedEventKeys) {
                const [keyDate, keyTitle] = key.split('|');
                if (keyDate === dateStr && (keyTitle.includes(normalizedTitle) || normalizedTitle.includes(keyTitle))) {
                  isDuplicate = true;
                  break;
                }
              }

              if (!isDuplicate) {
                processedEventKeys.add(`${dateStr}|${normalizedTitle}`);
                
                // Logistik Info aus der Matrix laden
                const safeEventId = cachedEv.uid.replace(/[\/\\.#$\[\]]/g, '_');
                const lineup = matchLineups?.find(m => m.id === safeEventId);
                let driverNames = '';
                if (lineup?.fahrerHelperIds?.length && helpers) {
                    driverNames = lineup.fahrerHelperIds.map(id => {
                        const h = helpers.find(x => x.id === id);
                        return h ? (h.alias || h.name.split(' ')[0]) : '';
                    }).filter(Boolean).join(', ');
                }

                combinedEvents.push({
                  id: `sub-${sub.id}-${cachedEv.uid}`,
                  subId: sub.id,
                  uid: cachedEv.uid,
                  title: `${sub.name}: ${cachedEv.title}`,
                  time: evTime,
                  type: 'ABO_CALENDAR',
                  source: 'Über externes Abo',
                  driverNames,
                  departureTime: lineup?.departureTime || ''
                });
              }
            }
          });
        }
      });
    }

    return combinedEvents.sort((a, b) => a.time - b.time);
  }, [events, calendarEvents, calendarSubscriptions, todayStart, eventsLookaheadDate, checkEventRelevance, matchLineups, helpers]);

  const upcomingServices = useMemo(() => {
    if (!calendarEvents) return [];
    
    return calendarEvents.filter(ce => {
      if (ce.eventType !== 'DIENST') return false;
      const ceTime = new Date(ce.startTime).getTime();
      const ceEnd = ce.endTime ? new Date(ce.endTime).getTime() : ceTime;
      
      if (ceEnd < todayStart || ceTime > servicesLookaheadDate) return false;

      return checkEventRelevance(ce);
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [calendarEvents, todayStart, servicesLookaheadDate, checkEventRelevance]);

  const myLogisticsDuties = useMemo(() => {
    if (!myHelper || !calendarSubscriptions || !matchLineups) return [];
    const duties: any[] = [];
    
    calendarSubscriptions.forEach(sub => {
      if (!sub.isActive || !sub.cachedEvents) return;
      sub.cachedEvents.forEach(ce => {
         const ceTime = new Date(ce.startTime).getTime();
         const ceEnd = ce.endTime ? new Date(ce.endTime).getTime() : ceTime;
         
         if (ceEnd >= todayStart && ceTime <= servicesLookaheadDate) {
            const safeEventId = ce.uid.replace(/[\/\\.#$\[\]]/g, '_');
            const lineup = matchLineups.find(m => m.id === safeEventId);
            
            if (lineup) {
              const isFahrer = lineup.fahrerHelperIds?.includes(myHelper.id);
              const isBetreuer = lineup.betreuerHelperIds?.includes(myHelper.id);
              
              if (isFahrer || isBetreuer) {
                 let driverNames = '';
                 if (lineup.fahrerHelperIds?.length && helpers) {
                     driverNames = lineup.fahrerHelperIds.map(id => {
                         const h = helpers.find(x => x.id === id);
                         return h ? (h.alias || h.name.split(' ')[0]) : '';
                     }).filter(Boolean).join(', ');
                 }

                 duties.push({
                   id: `logistics-${ce.uid}`,
                   subId: sub.id,
                   uid: ce.uid,
                   title: `Saison-Dienst: ${ce.title}`,
                   role: isFahrer && isBetreuer ? 'Fahrer & Betreuer' : (isFahrer ? 'Fahrer' : 'Betreuer'),
                   time: ceTime,
                   driverNames,
                   departureTime: lineup.departureTime || ''
                 });
              }
            }
         }
      });
    });
    return duties.sort((a, b) => a.time - b.time);
  }, [myHelper, calendarSubscriptions, matchLineups, todayStart, servicesLookaheadDate, helpers]);

  const totalServicesCount = upcomingServices.length + myLogisticsDuties.length;

  const pendingWhatsAppReminders = useMemo(() => {
    if (!isAppUser || !user) return 0;
    
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    let count = 0;

    if (calendarEvents) {
      calendarEvents.forEach(ce => {
        if (ce.reminderSenderUserId === user.id && !ce.reminderSentAt && ce.reminderLeadDays !== undefined) {
          const eventStart = new Date(ce.startTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ce.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag && todayStart <= eventDateStart) count++;
        }
      });
    }

    if (tasks) {
      tasks.forEach(t => {
        if (t.isTemplate || t.isHistorical) return;
        if (t.status === 'ERLEDIGT' || t.status === 'TRASH' || t.progress === 100) return;

        if (t.eventId) {
          const parentEvent = events?.find(e => e.id === t.eventId);
          if (parentEvent && parentEvent.status === 'PLANUNG' && !parentEvent.isPublished) return;
          if (parentEvent && (parentEvent.status === 'ABGESCHLOSSEN' || parentEvent.isArchived)) return;
        }

        if (t.isSubItem && t.parentItemId) {
          const parentTask = tasks.find(p => p.id === t.parentItemId);
          if (parentTask && parentTask.status === 'ERLEDIGT') return;
        }
        
        if (t.reminderSenderUserId === user.id && !t.reminderSentAt && t.reminderLeadDays !== undefined && t.dueDate) {
          const taskDue = new Date(t.dueDate);
          const taskDateStart = new Date(taskDue.getFullYear(), taskDue.getMonth(), taskDue.getDate()).getTime();
          const stichtag = taskDateStart - (t.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag && todayStart <= taskDateStart) count++;
        }
      });
    }

    if (events) {
      events.forEach(ev => {
        const isReadyForReminder = ev.status !== 'PLANUNG' || ev.isPublished;
        if (!isReadyForReminder || ev.status === 'ABGESCHLOSSEN' || ev.isArchived) return;

        if (ev.reminderSenderUserId === user.id && !ev.reminderSentAt && ev.reminderLeadDays !== undefined && ev.plannedStartTime) {
          const eventStart = new Date(ev.plannedStartTime);
          const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
          const stichtag = eventDateStart - (ev.reminderLeadDays * MS_PER_DAY);
          if (todayStart >= stichtag && todayStart <= eventDateStart) count++;
        }
      });
    }

    if (calendarSubscriptions) {
      calendarSubscriptions.forEach(sub => {
        if (sub.isActive && sub.reminderSenderUserId === user.id && sub.reminderLeadDays !== undefined && sub.cachedEvents) {
          sub.cachedEvents.forEach(cachedEv => {
            if (!cachedEv.reminderSentAt) {
              const eventStart = new Date(cachedEv.startTime);
              const eventDateStart = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate()).getTime();
              const stichtag = eventDateStart - (sub.reminderLeadDays! * MS_PER_DAY);
              if (todayStart >= stichtag && todayStart <= eventDateStart) count++;
            }
          });
        }
      });
    }

    return count;
  }, [user, calendarEvents, tasks, events, calendarSubscriptions, todayStart, isAppUser]);

  return {
    isAppUser,
    myTasks,
    totalOpenTasksCount,
    upcomingEvents,
    upcomingServices,
    myLogisticsDuties,
    totalServicesCount,
    upcomingSessions,
    pendingWhatsAppReminders,
    todayStart
  };
};
// --- END OF FILE ---