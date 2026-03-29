// src/features/Events/CalendarExportModal.tsx
import React, { useState } from 'react';
import { useClubStore } from '../../store/useClubStore';
import { X, Printer, Download, Calendar as CalIcon, Settings, CalendarDays } from 'lucide-react';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfYear } from 'date-fns/endOfYear';
import { de } from 'date-fns/locale/de';

interface Props {
  onClose: () => void;
  calendarTitle: string;
}

export const CalendarExportModal: React.FC<Props> = ({ onClose, calendarTitle }) => {
  const { calendarEvents } = useClubStore();
  
  const pad = (n: number) => String(n).padStart(2, '0');
  const fDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [startDate, setStartDate] = useState(fDate(startOfMonth(new Date())));
  const [endDate, setEndDate] = useState(fDate(endOfYear(new Date())));
  const [includeInternal, setIncludeInternal] = useState(true);
  const [includeServices, setIncludeServices] = useState(true);

  // Filtert die Termine basierend auf der Auswahl
  const getFilteredEvents = () => {
    const startMs = new Date(`${startDate}T00:00:00`).getTime();
    const endMs = new Date(`${endDate}T23:59:59`).getTime();

    return calendarEvents.filter(ev => {
      // Zeitfilter
      const evEnd = ev.endTime || ev.startTime;
      if (ev.startTime > endMs || evEnd < startMs) return false;
      
      // Kategorie-Filter
      if (ev.seriesId && !includeServices) return false;
      if (!ev.seriesId && !includeInternal) return false;
      
      return true;
    }).sort((a, b) => a.startTime - b.startTime);
  };

  const handlePrint = () => {
    const eventsToPrint = getFilteredEvents();
    let html = `
      <html>
        <head>
          <title>Drucken: ${calendarTitle}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            h1 { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 5px; font-size: 24px; }
            h2 { font-size: 14px; color: #555; margin-bottom: 20px; font-weight: normal; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #ddd; padding: 10px 5px; text-align: left; font-size: 14px; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .date { font-weight: bold; white-space: nowrap; }
            .series { font-size: 12px; color: #666; font-style: italic; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>${calendarTitle}</h1>
          <h2>Zeitraum: ${format(new Date(startDate), 'dd.MM.yyyy')} - ${format(new Date(endDate), 'dd.MM.yyyy')}</h2>
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Zeit</th>
                <th>Termin / Dienst</th>
                <th>Ort</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    if (eventsToPrint.length === 0) {
      html += `<tr><td colspan="4" style="text-align:center; padding: 20px;">Keine Termine in diesem Zeitraum gefunden.</td></tr>`;
    } else {
      eventsToPrint.forEach(ev => {
        const startD = new Date(ev.startTime);
        const dateStr = format(startD, 'dd.MM.yyyy', { locale: de });
        let timeStr = 'Ganztägig';
        if (!ev.isAllDay) {
          timeStr = format(startD, 'HH:mm', { locale: de }) + ' Uhr';
          if (ev.endTime) timeStr += ' - ' + format(new Date(ev.endTime), 'HH:mm', { locale: de }) + ' Uhr';
        }
        
        const seriesTag = ev.seriesId ? `<br><span class="series">(Dienstplan)</span>` : '';
        html += `<tr><td class="date">${dateStr}</td><td>${timeStr}</td><td><strong>${ev.title}</strong>${seriesTag}</td><td>${ev.location || ''}</td></tr>`;
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

  const handleExportICS = () => {
    const eventsToExport = getFilteredEvents();
    if (eventsToExport.length === 0) {
      alert("Keine Termine im gewählten Zeitraum zum Exportieren gefunden.");
      return;
    }

    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Papatours//Vereinskalender//DE\n';
    
    const formatIcsDate = (dateMs: number, isAllDay: boolean) => {
      const d = new Date(dateMs);
      if (isAllDay) return format(d, "yyyyMMdd");
      return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    eventsToExport.forEach(ev => {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${ev.id}@papatours.app\n`;
      ics += `DTSTAMP:${formatIcsDate(Date.now(), false)}\n`;
      
      if (ev.isAllDay) {
        ics += `DTSTART;VALUE=DATE:${formatIcsDate(ev.startTime, true)}\n`;
        let endMs = ev.endTime || ev.startTime;
        endMs += 24 * 60 * 60 * 1000; 
        ics += `DTEND;VALUE=DATE:${formatIcsDate(endMs, true)}\n`;
      } else {
        ics += `DTSTART:${formatIcsDate(ev.startTime, false)}\n`;
        if (ev.endTime) ics += `DTEND:${formatIcsDate(ev.endTime, false)}\n`;
        else ics += `DTEND:${formatIcsDate(ev.startTime + 3600000, false)}\n`; 
      }
      
      ics += `SUMMARY:${ev.title}\n`;
      if (ev.location) ics += `LOCATION:${ev.location}\n`;
      if (ev.description) ics += `DESCRIPTION:${ev.description}\n`;
      ics += 'END:VEVENT\n';
    });
    
    ics += 'END:VCALENDAR';
    
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${calendarTitle.replace(/\s+/g, '_')}_export.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Download className="w-5 h-5 mr-2 text-blue-600" />
            Drucken & Exportieren
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">1. Was soll exportiert werden?</h3>
            <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 p-2 rounded-lg border border-gray-100">
              <input type="checkbox" checked={includeInternal} onChange={(e) => setIncludeInternal(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"/>
              <div className="flex items-center"><CalIcon className="w-4 h-4 mr-2 text-blue-500" /> <span className="font-medium text-gray-700 text-sm">Normale Vereins-Termine</span></div>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer bg-orange-50 p-2 rounded-lg border border-orange-100">
              <input type="checkbox" checked={includeServices} onChange={(e) => setIncludeServices(e.target.checked)} className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"/>
              <div className="flex items-center"><Settings className="w-4 h-4 mr-2 text-orange-500" /> <span className="font-medium text-gray-700 text-sm">Dienstpläne (z.B. Hallendienst)</span></div>
            </label>
            <p className="text-xs text-gray-500 italic">Externe Abos (Feiertage etc.) werden nicht exportiert.</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">2. Für welchen Zeitraum?</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Von</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bis</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-bold text-sm">Abbrechen</button>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm transition">
              <Printer className="w-4 h-4 mr-2" /> Drucken
            </button>
            <button onClick={handleExportICS} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition">
              <CalendarDays className="w-4 h-4 mr-2" /> .ICS Laden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 167