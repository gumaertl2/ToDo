// api/calendar.ts
// [2026-11-07] - FEATURE: Unterstützung für "Meine Einsätze" (?onlyMy=1&uid=...&hid=...&gids=...&tids=...&myIcs=...) im iCal-Abo-Feed ergänzt, damit beim Abonnieren mit aktivem Stern-Filter exakt die persönlichen Termine, Dienste, Sitzungen und Punktspiele ausgeliefert werden.
// [2026-11-07] - FEATURE: Dynamische Filter-Unterstützung (?filters=manual,dienste,<subId>...) inkl. Auslieferung der angehakten Kalender-Abos (calendar_subscriptions.cachedEvents). Ohne Parameter bleibt das Verhalten für den Public Kalender unverändert.
// Serverseitiger Vercel-Endpunkt zur Generierung eines dynamischen iCal (.ics) Feeds.
// Nutzt die native Firebase REST-API für maximale Performance ohne SDK-Abhängigkeiten.

const generateStableEventId = (teamId: string, event: { startTime: number; title?: string; description?: string }) => {
  const date = new Date(event.startTime);
  const month = date.getMonth();
  const year = date.getFullYear();
  const season = month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

  const title = normalize(event.title || '');
  const desc = normalize(event.description || '');
  const rawId = `${teamId}_${season}_${title}_${desc}`;
  return rawId.replace(/_+/g, '_').replace(/^_|_$/g, '');
};

export default async function handler(req: any, res: any) {
  try {
    // Die Vercel-Umgebung greift auf deine Variablen zu. Fallback auf deinen Projekt-Namen.
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'papatododev';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    const toStringSet = (raw: unknown, lower = false): Set<string> => {
      if (typeof raw !== 'string' || !raw.trim()) return new Set();
      return new Set(
        raw
          .split(',')
          .map((s: string) => (lower ? s.trim().toLowerCase() : s.trim()))
          .filter(Boolean)
      );
    };

    // Prüfen, ob vom Benutzer ausgewählte Filter übergeben wurden (?filters=manual,dienste,subId1,...)
    const rawFilters = req?.query?.filters;
    const hasFilterParam = typeof rawFilters === 'string';
    const filterSet = hasFilterParam ? toStringSet(rawFilters) : null;

    // Prüfen, ob der globale "Meine Einsätze"-Stern aktiv ist (?onlyMy=1)
    const onlyMy = req?.query?.onlyMy === '1' || req?.query?.onlyMy === 'true';
    const myUid = typeof req?.query?.uid === 'string' ? req.query.uid.trim() : '';
    const myHid = typeof req?.query?.hid === 'string' ? req.query.hid.trim() : '';
    const myGroupIds = toStringSet(req?.query?.gids);
    const myTeamIds = toStringSet(req?.query?.tids);
    const myStammTeamIds = toStringSet(req?.query?.stids);
    const myIcsKeys = toStringSet(req?.query?.myIcs);
    const myAliases = toStringSet(req?.query?.alias, true);

    const fetchCollectionDocs = async (collectionId: string, fallbackPublicQuery = false): Promise<any[]> => {
      try {
        const resp = await fetch(`${baseUrl}/${collectionId}?pageSize=1000`);
        const json = await resp.json();
        if (Array.isArray(json?.documents)) return json.documents;

        if (fallbackPublicQuery) {
          const queryResp = await fetch(`${baseUrl}:runQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId }],
                where: {
                  fieldFilter: {
                    field: { fieldPath: 'isPublic' },
                    op: 'EQUAL',
                    value: { booleanValue: true }
                  }
                },
                limit: 1000
              }
            })
          });
          const rows = await queryResp.json();
          if (Array.isArray(rows)) {
            return rows.map((r: any) => r?.document).filter(Boolean);
          }
        }
      } catch {
        // Ignorieren, falls Collection nicht erreichbar
      }
      return [];
    };

    // Hole alle Kalender-Termine, Sitzungen und (bei aktivem Filter-Link / Meine Einsätze) auch die Kalender-Abos
    const [calDocs, eventDocs, subDocs, teamDocs, lineupDocs] = await Promise.all([
      fetchCollectionDocs('calendar_events', true),
      fetchCollectionDocs('events', true),
      (hasFilterParam || onlyMy) ? fetchCollectionDocs('calendar_subscriptions', false) : Promise.resolve([]),
      onlyMy ? fetchCollectionDocs('teams', false) : Promise.resolve([]),
      onlyMy ? fetchCollectionDocs('match_lineups', false) : Promise.resolve([])
    ]);

    const rbcEvents: any[] = [];

    // Hilfsfunktion zum Extrahieren der REST-API Felder
    const getField = (doc: any, fieldName: string) => {
      const f = doc?.fields?.[fieldName];
      if (!f) return null;
      return f.stringValue ?? f.integerValue ?? f.booleanValue ?? null;
    };

    const getStringArrayField = (doc: any, fieldName: string): string[] => {
      const values = doc?.fields?.[fieldName]?.arrayValue?.values;
      if (!Array.isArray(values)) return [];
      return values.map((v: any) => v?.stringValue).filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);
    };

    const intersectsSet = (arr: string[], set: Set<string>): boolean => {
      if (arr.length === 0 || set.size === 0) return false;
      return arr.some(item => set.has(item));
    };

    // Map für Teams & MatchLineups aufbauen (sofern über REST lesbar)
    const teamDefaultLineupMap = new Map<string, string[]>();
    for (const tDoc of teamDocs) {
      const tId = tDoc?.name?.split('/').pop();
      if (tId) {
        teamDefaultLineupMap.set(tId, getStringArrayField(tDoc, 'defaultLineupHelperIds'));
      }
    }

    const matchLineupMap = new Map<string, { players: string[]; fahrer: string[]; betreuer: string[] }>();
    for (const lDoc of lineupDocs) {
      const lId = lDoc?.name?.split('/').pop();
      if (lId) {
        matchLineupMap.set(lId, {
          players: getStringArrayField(lDoc, 'lineupHelperIds'),
          fahrer: getStringArrayField(lDoc, 'fahrerHelperIds'),
          betreuer: getStringArrayField(lDoc, 'betreuerHelperIds')
        });
      }
    }

    // 1. Manuelle Kalender-Termine & Dienste parsen
    for (const doc of calDocs) {
      const isPublic = getField(doc, 'isPublic');
      if (!isPublic) continue;

      const seriesId = getField(doc, 'seriesId');
      const eventType = getField(doc, 'eventType');
      const isDienst = Boolean(seriesId) || eventType === 'DIENST';

      // Wenn Filter übergeben wurden: exakt nach 'dienste' vs. 'manual' (Termine) filtern
      if (filterSet !== null) {
        if (isDienst && !filterSet.has('dienste')) continue;
        if (!isDienst && !filterSet.has('manual')) continue;
      }

      const id = doc.name.split('/').pop();
      const title = getField(doc, 'title') || 'Termin';
      const location = getField(doc, 'location') || '';
      const description = getField(doc, 'description') || '';
      const startTime = parseInt(getField(doc, 'startTime') || '0', 10);
      if (!startTime) continue;
      const endTime = parseInt(getField(doc, 'endTime') || '0', 10) || startTime + 3600000; // Fallback: +1 Stunde
      const isAllDay = Boolean(getField(doc, 'isAllDay'));

      if (onlyMy) {
        const recUserIds = [
          ...getStringArrayField(doc, 'reminderRecipientUserIds'),
          ...getStringArrayField(doc, 'participantUserIds')
        ];
        const recHelperIds = [
          ...getStringArrayField(doc, 'reminderRecipientHelperIds'),
          ...getStringArrayField(doc, 'participantHelperIds')
        ];
        const recGroupIds = [
          ...getStringArrayField(doc, 'reminderRecipientGroupIds'),
          ...getStringArrayField(doc, 'participantGroupIds')
        ];
        const recTeamIds = [
          ...getStringArrayField(doc, 'reminderRecipientTeamIds'),
          ...getStringArrayField(doc, 'participantTeamIds')
        ];

        const isDirectUser = Boolean(myUid && recUserIds.includes(myUid));
        const isDirectHelper = Boolean(myHid && recHelperIds.includes(myHid));
        const isGroupAssigned = intersectsSet(recGroupIds, myGroupIds);
        const isTeamAssigned = intersectsSet(recTeamIds, myTeamIds);

        let isAliasDuty = false;
        if (isDienst && String(title).includes(':') && myAliases.size > 0) {
          const parts = String(title).split(':');
          const dutyAlias = parts[parts.length - 1].trim().toLowerCase();
          if (dutyAlias && myAliases.has(dutyAlias)) {
            isAliasDuty = true;
          }
        }

        const isAssigned = isDienst
          ? (isDirectUser || isDirectHelper || isAliasDuty)
          : (isDirectUser || isDirectHelper || isGroupAssigned || isTeamAssigned);

        if (!isAssigned) continue;
      }

      // Heim/Auswärts Kennzeichnung
      const isHeim = location.toLowerCase().includes('maisach');
      const showInMatchPlan = getField(doc, 'showInMatchPlan');
      const matchPrefix = showInMatchPlan ? (isHeim ? '🏠 ' : (location ? '🚌 ' : '')) : '';

      rbcEvents.push({ id, title: matchPrefix + title, location, description, startTime, endTime, isAllDay });
    }

    // 2. Sitzungen parsen (gehören zum Filter 'manual' / Termine)
    if (filterSet === null || filterSet.has('manual')) {
      for (const doc of eventDocs) {
        const isPublished = getField(doc, 'isPublished');
        const status = getField(doc, 'status');
        if (!isPublished || status === 'ABGESCHLOSSEN') continue;

        if (onlyMy) {
          const partUserIds = getStringArrayField(doc, 'participantUserIds');
          const partHelperIds = getStringArrayField(doc, 'participantHelperIds');
          const partGroupIds = getStringArrayField(doc, 'participantGroupIds');
          const partTeamIds = getStringArrayField(doc, 'participantTeamIds');

          const isParticipant =
            Boolean(myUid && partUserIds.includes(myUid)) ||
            Boolean(myHid && partHelperIds.includes(myHid)) ||
            intersectsSet(partGroupIds, myGroupIds) ||
            intersectsSet(partTeamIds, myTeamIds);

          if (!isParticipant) continue;
        }

        const id = doc.name.split('/').pop();
        const title = 'Sitzung: ' + (getField(doc, 'title') || '');
        const location = getField(doc, 'location') || '';
        const description = getField(doc, 'description') || '';
        const startTime = parseInt(getField(doc, 'plannedStartTime') || '0', 10);
        if (!startTime) continue;
        const endTime = parseInt(getField(doc, 'plannedEndTime') || '0', 10) || startTime + 7200000; // Fallback: +2 Stunden

        rbcEvents.push({ id, title, location, description, startTime, endTime, isAllDay: false });
      }
    }

    // 3. Angehakte externe Kalender-Abos (calendar_subscriptions.cachedEvents) parsen
    if ((filterSet !== null || onlyMy) && subDocs.length > 0) {
      for (const subDoc of subDocs) {
        const subId = subDoc.name.split('/').pop();
        const isActive = getField(subDoc, 'isActive');
        if (!isActive || !subId) continue;
        if (filterSet !== null && !filterSet.has(subId)) continue;

        const subName = getField(subDoc, 'name') || '';
        const showInMatchPlan = Boolean(getField(subDoc, 'showInMatchPlan'));
        const subPrefix = subName ? `${String(subName).trim()} ` : '';
        const subTeamIds = getStringArrayField(subDoc, 'reminderRecipientTeamIds');
        const primaryTeamId = subTeamIds[0] || '';

        const cachedValues = subDoc.fields?.cachedEvents?.arrayValue?.values || [];
        cachedValues.forEach((item: any, idx: number) => {
          const evDoc = item?.mapValue;
          if (!evDoc?.fields) return;

          const uid = getField(evDoc, 'uid') || `${idx}`;
          const rawTitle = getField(evDoc, 'title') || 'Termin';
          const location = getField(evDoc, 'location') || '';
          const description = getField(evDoc, 'description') || '';
          const startTime = parseInt(getField(evDoc, 'startTime') || '0', 10);
          if (!startTime) return;
          const endTime = parseInt(getField(evDoc, 'endTime') || '0', 10) || startTime + 3600000;
          const isAllDay = Boolean(getField(evDoc, 'isAllDay'));

          if (onlyMy) {
            let isAssignedMatch = false;

            // A) Direkter Treffer über die vom Client übergebenen persönlichen Spiel-Schlüssel (myIcs)
            if (myIcsKeys.has(`${subId}:${uid}`) || myIcsKeys.has(`${subId}:${startTime}`)) {
              isAssignedMatch = true;
            }

            // B) Live-Abgleich über match_lineups / teams (sofern über REST verfügbar)
            if (!isAssignedMatch && myHid && primaryTeamId) {
              const safeEventId = generateStableEventId(primaryTeamId, {
                startTime,
                title: String(rawTitle),
                description: String(description)
              });
              const lineup = matchLineupMap.get(safeEventId);
              if (lineup) {
                if (
                  lineup.players.includes(myHid) ||
                  lineup.fahrer.includes(myHid) ||
                  lineup.betreuer.includes(myHid)
                ) {
                  isAssignedMatch = true;
                }
              } else if (teamDefaultLineupMap.has(primaryTeamId)) {
                const defaultPlayers = teamDefaultLineupMap.get(primaryTeamId) || [];
                if (defaultPlayers.includes(myHid)) {
                  isAssignedMatch = true;
                }
              } else if (myIcsKeys.size === 0 && myStammTeamIds.has(primaryTeamId)) {
                // Fallback nur falls weder match_lineups noch myIcs vorhanden sind
                isAssignedMatch = true;
              }
            }

            if (!isAssignedMatch) return;
          }

          const isHeim = location.toLowerCase().includes('maisach');
          const matchPrefix = showInMatchPlan ? (isHeim ? '🏠 ' : (location ? '🚌 ' : '')) : '';

          rbcEvents.push({
            id: `ics-${subId}-${uid}-${idx}`,
            title: `${matchPrefix}${subPrefix}${rawTitle}`,
            location,
            description,
            startTime,
            endTime,
            isAllDay
          });
        });
      }
    }

    // Datums-Formatierer für iCal (YYYYMMDDTHHmmssZ)
    const formatDate = (ms: number) => {
      if (!ms) return '';
      return new Date(ms).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    // Formatierer für Ganztages-Termine (YYYYMMDD)
    const formatDateAllDay = (ms: number) => {
      return new Date(ms).toISOString().split('T')[0].replace(/-/g, '');
    };

    // iCal String zusammenbauen
    let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PapaToDo//Vereinskalender//DE\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Vereinskalender\r\nX-WR-TIMEZONE:Europe/Berlin\r\n`;

    for (const ev of rbcEvents) {
      ics += `BEGIN:VEVENT\r\nUID:${ev.id}@papatodo\r\nDTSTAMP:${formatDate(Date.now())}\r\n`;

      if (ev.isAllDay) {
        // Bei Ganztagesterminen muss das Enddatum im iCal-Format exakt ein Tag in der Zukunft liegen (exklusiv)
        ics += `DTSTART;VALUE=DATE:${formatDateAllDay(ev.startTime)}\r\nDTEND;VALUE=DATE:${formatDateAllDay(ev.endTime + 86400000)}\r\n`;
      } else {
        ics += `DTSTART:${formatDate(ev.startTime)}\r\nDTEND:${formatDate(ev.endTime)}\r\n`;
      }

      ics += `SUMMARY:${String(ev.title).replace(/\r?\n/g, ' ')}\r\n`;
      if (ev.location) ics += `LOCATION:${String(ev.location).replace(/\r?\n/g, ' ')}\r\n`;
      if (ev.description) ics += `DESCRIPTION:${String(ev.description).replace(/\r?\n/g, '\\n')}\r\n`;

      ics += `END:VEVENT\r\n`;
    }
    
    ics += `END:VCALENDAR\r\n`;

    // Sende die Datei als Kalender-Feed zurück
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="vereinskalender.ics"');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Caching für Performance
    res.status(200).send(ics);

  } catch (error) {
    console.error("Error generating calendar feed:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
// --- END OF FILE ---
