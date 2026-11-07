// api/calendar.ts
// [2026-11-07] - FEATURE: Dynamische Filter-Unterstützung (?filters=manual,dienste,<subId>...) inkl. Auslieferung der angehakten Kalender-Abos (calendar_subscriptions.cachedEvents). Ohne Parameter bleibt das Verhalten für den Public Kalender unverändert.
// Serverseitiger Vercel-Endpunkt zur Generierung eines dynamischen iCal (.ics) Feeds.
// Nutzt die native Firebase REST-API für maximale Performance ohne SDK-Abhängigkeiten.

export default async function handler(req: any, res: any) {
  try {
    // Die Vercel-Umgebung greift auf deine Variablen zu. Fallback auf deinen Projekt-Namen.
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'papatododev';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // Prüfen, ob vom Benutzer ausgewählte Filter übergeben wurden (?filters=manual,dienste,subId1,...)
    const rawFilters = req?.query?.filters;
    const hasFilterParam = typeof rawFilters === 'string';
    const filterSet = hasFilterParam
      ? new Set(
          rawFilters
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        )
      : null;

    // Hole alle Kalender-Termine, Sitzungen und (bei aktivem Filter-Link) auch die Kalender-Abos
    const [calRes, eventsRes, subsRes] = await Promise.all([
      fetch(`${baseUrl}/calendar_events?pageSize=1000`),
      fetch(`${baseUrl}/events?pageSize=1000`),
      hasFilterParam ? fetch(`${baseUrl}/calendar_subscriptions?pageSize=1000`) : Promise.resolve(null)
    ]);

    const calData = await calRes.json();
    const eventsData = await eventsRes.json();
    const subsData = subsRes ? await subsRes.json() : null;

    const rbcEvents: any[] = [];

    // Hilfsfunktion zum Extrahieren der REST-API Felder
    const getField = (doc: any, fieldName: string) => {
      const f = doc?.fields?.[fieldName];
      if (!f) return null;
      return f.stringValue ?? f.integerValue ?? f.booleanValue ?? null;
    };

    // 1. Manuelle Kalender-Termine & Dienste parsen
    if (calData.documents) {
      for (const doc of calData.documents) {
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

        // Heim/Auswärts Kennzeichnung
        const isHeim = location.toLowerCase().includes('maisach');
        const showInMatchPlan = getField(doc, 'showInMatchPlan');
        const matchPrefix = showInMatchPlan ? (isHeim ? '🏠 ' : (location ? '🚌 ' : '')) : '';

        rbcEvents.push({ id, title: matchPrefix + title, location, description, startTime, endTime, isAllDay });
      }
    }

    // 2. Sitzungen parsen (gehören zum Filter 'manual' / Termine)
    if (eventsData.documents && (filterSet === null || filterSet.has('manual'))) {
      for (const doc of eventsData.documents) {
        const isPublished = getField(doc, 'isPublished');
        const status = getField(doc, 'status');
        if (!isPublished || status === 'ABGESCHLOSSEN') continue;

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
    if (filterSet !== null && subsData?.documents) {
      for (const subDoc of subsData.documents) {
        const subId = subDoc.name.split('/').pop();
        const isActive = getField(subDoc, 'isActive');
        if (!isActive || !subId || !filterSet.has(subId)) continue;

        const subName = getField(subDoc, 'name') || '';
        const showInMatchPlan = Boolean(getField(subDoc, 'showInMatchPlan'));
        const subPrefix = subName ? `${String(subName).trim()} ` : '';

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
