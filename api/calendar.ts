// api/calendar.ts
// Serverseitiger Vercel-Endpunkt zur Generierung eines dynamischen iCal (.ics) Feeds.
// Nutzt die native Firebase REST-API für maximale Performance ohne SDK-Abhängigkeiten.

export default async function handler(req: any, res: any) {
  try {
    // Die Vercel-Umgebung greift auf deine Variablen zu. Fallback auf deinen Projekt-Namen.
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'papatododev';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // Hole alle Kalender-Termine und Sitzungen (pageSize=1000 verhindert Paginierungs-Probleme)
    const [calRes, eventsRes] = await Promise.all([
      fetch(`${baseUrl}/calendar_events?pageSize=1000`),
      fetch(`${baseUrl}/events?pageSize=1000`)
    ]);

    const calData = await calRes.json();
    const eventsData = await eventsRes.json();

    const rbcEvents: any[] = [];

    // Hilfsfunktion zum Extrahieren der REST-API Felder
    const getField = (doc: any, fieldName: string) => {
      const f = doc.fields?.[fieldName];
      if (!f) return null;
      return f.stringValue ?? f.integerValue ?? f.booleanValue ?? null;
    };

    // 1. Manuelle Kalender-Termine parsen
    if (calData.documents) {
      for (const doc of calData.documents) {
        const isPublic = getField(doc, 'isPublic');
        if (!isPublic) continue;

        const id = doc.name.split('/').pop();
        const title = getField(doc, 'title') || 'Termin';
        const location = getField(doc, 'location') || '';
        const description = getField(doc, 'description') || '';
        const startTime = parseInt(getField(doc, 'startTime') || '0', 10);
        const endTime = parseInt(getField(doc, 'endTime') || '0', 10) || startTime + 3600000; // Fallback: +1 Stunde
        const isAllDay = getField(doc, 'isAllDay') || false;

        // Heim/Auswärts Kennzeichnung
        const isHeim = location.toLowerCase().includes('maisach');
        const showInMatchPlan = getField(doc, 'showInMatchPlan');
        const matchPrefix = showInMatchPlan ? (isHeim ? '🏠 ' : (location ? '🚌 ' : '')) : '';

        rbcEvents.push({ id, title: matchPrefix + title, location, description, startTime, endTime, isAllDay });
      }
    }

    // 2. Sitzungen parsen
    if (eventsData.documents) {
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

      ics += `SUMMARY:${ev.title}\r\n`;
      if (ev.location) ics += `LOCATION:${ev.location}\r\n`;
      if (ev.description) ics += `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}\r\n`;

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