// [2026-05-31] - UX-FEATURE: Best-Practice Workflow (Self-Service für Dienste) in Kalender-Sektion (Teil 2) integriert.
// [2026-05-31] - UX-FIX: Generische Vereinsbeispiele im gesamten Handbuch konsequent auf Tischtennis-Beispiele (Hallendienst, Getränkeversorgung, Spielbälle, Vereinsmeisterschaft) umgestellt.
// [2026-05-30] - UX-FIX: Sprachliche Kalibrierung (Nüchterner, professioneller SOP-Ton statt Marketing-Sprech). Euphorie-Wörter ("Magie", "Königsdisziplin", "chirurgisch") entfernt. Komplexe Begriffe ("Endlos-Projekt", "Führender Oberpunkt", "Succession") mit kurzen Definitionen versehen. Einleitung auf primäre Zielgruppe (Vorstand/Admin) fokussiert.
// [2026-05-30] - UX-FIX: Handbuch auf architektonische Wahrheiten korrigiert. 1. Aufgabenübergabe-Workflow präzisiert. 2. Kanban-Board um Listenansicht ergänzt. 3. "Geisteraufgaben" durch "Qualitätskontrolle" (Protokoll-Blockade) ersetzt.
// [2026-05-30] - UX-FIX: Handbuch auf 7 praxisnahe Kernbereiche (Use Cases) verdichtet. Neues Konzept des "Persönlichen Dashboards" integriert. 
// [2026-05-30] - UX-FIX: Akkordeon-Logik komplett entfernt. Permanenter Lesemodus (Single-Page). 
// 2026-04-18 20:15 - CHIRURGISCHER EINGRIFF: Integration von Teil 9 (Rollen & Berechtigungen)
// src/features/Help/HelpView.tsx
import React from 'react';
import { BookOpen, Target, Calendar, ListTodo, Layers, Printer, Repeat, Lock, ArrowUp } from 'lucide-react';

interface HelpSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  audience?: 'all' | 'board' | 'admin';
  children: React.ReactNode;
}

export const HelpView: React.FC = () => {

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`help-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const AudienceBadge = ({ type }: { type?: 'all' | 'board' | 'admin' }) => {
    if (type === 'all') return <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-green-300">Grundwissen</span>;
    if (type === 'board') return <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-purple-300">Vorstand & Orga</span>;
    if (type === 'admin') return <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-red-300">Administratoren</span>;
    return null;
  };

  const HelpSection: React.FC<HelpSectionProps> = ({ id, title, icon: Icon, audience, children }) => {
    return (
      <div id={`help-section-${id}`} className="mb-12 print:mb-10 break-inside-avoid-page scroll-mt-6 border-b border-gray-200 pb-8 last:border-0">
        <div className="flex items-center mb-6 flex-wrap">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-4 shrink-0 print:border print:border-gray-300 print:bg-white">
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          <AudienceBadge type={audience} />
        </div>
        <div className="prose prose-blue max-w-none text-gray-700 print:text-black leading-relaxed">
          {children}
        </div>
        <div className="mt-8 pt-4 print:hidden">
          <button 
            onClick={() => scrollToSection('toc')} 
            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center transition-colors"
          >
            <ArrowUp className="w-4 h-4 mr-1.5" /> Zurück zum Inhaltsverzeichnis
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* HEADER */}
      <div className="flex-none p-4 sm:p-6 lg:p-8 pb-4 border-b border-gray-200 bg-gray-50 print:hidden sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 sm:p-3 rounded-xl text-white mr-4 shadow-lg shrink-0">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">PapaToDo Handbuch</h1>
              <p className="text-gray-500 text-sm sm:text-base mt-1">Die offizielle Betriebsanleitung für Vorstände und Administratoren.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors"
              title="Handbuch drucken oder als PDF speichern"
            >
              <Printer className="w-4 h-4 mr-2" /> Drucken / PDF
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto print:overflow-visible print:p-0">
        <div className="max-w-4xl mx-auto p-6 sm:p-10 lg:p-12 print:p-0">
          
          <div className="hidden print:block mb-12 border-b-2 border-black pb-6">
            <h1 className="text-4xl font-black text-black mb-2">PapaToDo Handbuch</h1>
            <p className="text-lg text-gray-600">Betriebsanleitung für Vereinsorganisation</p>
          </div>
          
          {/* INHALTSVERZEICHNIS */}
          <div id="help-section-toc" className="mb-16 bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-200 print:bg-transparent print:border-none print:p-0 print:mb-12 scroll-mt-6">
            <h3 className="font-bold text-xl mb-4 text-gray-900">Inhaltsverzeichnis</h3>
            <p className="text-sm text-gray-600 mb-6">Dieses Handbuch richtet sich primär an die organisatorische Leitung des Vereins. Es erklärt die Konfiguration, Methodik und Steuerung des Systems.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-blue-700 font-medium list-none pl-0">
              <li><button onClick={() => scrollToSection('philosophy')} className="hover:underline text-left">Teil 1: Die PapaToDo-Philosophie & Das Dashboard</button></li>
              <li><button onClick={() => scrollToSection('calendar')} className="hover:underline text-left">Teil 2: Kalender, Spielbetrieb & Team-Infos</button></li>
              <li><button onClick={() => scrollToSection('meetings')} className="hover:underline text-left">Teil 3: Der 4-Phasen-Sitzungszyklus & Protokolle</button></li>
              <li><button onClick={() => scrollToSection('tasks')} className="hover:underline text-left">Teil 4: Aufgaben & Helfer managen (Kanban-Board)</button></li>
              <li><button onClick={() => scrollToSection('routines')} className="hover:underline text-left">Teil 5: Daueraufgaben & das "Endlos-Projekt"</button></li>
              <li><button onClick={() => scrollToSection('templates')} className="hover:underline text-left">Teil 6: Vorlagen & Die geregelte Aufgabenübergabe</button></li>
              <li><button onClick={() => scrollToSection('security')} className="hover:underline text-left">Teil 7: Sicherheit, Rechte & Rollen-Profile</button></li>
            </ul>
          </div>

          <HelpSection id="philosophy" title="Teil 1: Die PapaToDo-Philosophie & Das Dashboard" icon={Target} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Reduzierung von Zettelwirtschaft, Schaffung von Verbindlichkeit und fokussierte Informationsbereitstellung.</p>
            
            <p className="mb-4">Jeder Verein lebt vom Engagement seiner Mitglieder. Die Vorstandsarbeit scheitert jedoch oft an Informationsverlusten: Aufgaben werden in Text-Protokollen vergraben und bis zur nächsten Sitzung vergessen. PapaToDo strukturiert diese Prozesse und macht Verantwortlichkeiten transparent.</p>
            
            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Das Welcome-Dashboard der Nutzer</h4>
            <p className="text-sm mb-4">Das Herzstück der App für einfache Nutzer ist das persönliche Dashboard. Es beantwortet beim Öffnen der App auf einen Blick die zentrale Frage: <strong>"Was steht für mich in den kommenden Wochen an?"</strong></p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 mb-6">
              <li><strong>Spieltermine:</strong> Wann spiele ich? Für welche Termine sind Erinnerungen aktiv?</li>
              <li><strong>Vereinstermine:</strong> Welche offiziellen Sitzungen oder Feste stehen an?</li>
              <li><strong>Dienste:</strong> Bin ich für den Hallendienst oder die Getränkeversorgung eingeteilt?</li>
              <li><strong>ToDos:</strong> Welche meiner Aufgaben sind aktuell fällig?</li>
            </ul>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Grundprinzip: Persönliche Verantwortung & Silo-Datenschutz</h4>
              <p className="text-sm text-indigo-800 mb-3"><strong>Verantwortung ist bei uns immer persönlich, nicht anonym.</strong> Jede Aufgabe wird zwingend einer konkreten Person zugeordnet (die wiederum ein Amt bekleiden kann). Verlässt jemand sein Amt, sorgt die geregelte Aufgabenübergabe (Succession-Workflow) dafür, dass alle offenen Punkte nahtlos an den Nachfolger übertragen werden.</p>
              <p className="text-sm text-indigo-800">Zudem bietet PapaToDo konsequenten Datenschutz (Participation-First). Einfache Nutzer sehen auf ihrem Dashboard ausschließlich Aufgaben und Termine, die sie direkt betreffen. Interne Vorstandsthemen und Fremd-Sitzungen bleiben unsichtbar. Administratoren behalten durch erweiterte Rechte den Gesamtüberblick.</p>
            </div>
          </HelpSection>

          <HelpSection id="calendar" title="Teil 2: Kalender, Spielbetrieb & Team-Infos" icon={Calendar} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Der zentrale Termin-Hub für den Verein – inklusive automatischer Synchronisation externer Spielpläne.</p>

            <p className="mb-4 text-sm">Veranstaltungen und Runden-Spielpläne müssen nicht doppelt erfasst werden. PapaToDo bietet einen integrierten <strong>ICS-Import</strong>, der sich regelmäßig mit externen Quellen (z.B. nuScore, Verbandsseiten) synchronisiert.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Die Anwender-Perspektive</h4>
            <p className="text-sm mb-4">Nutzer finden im Kalender-Modul alle relevanten Vereinsereignisse. Sie können Team-PINs und Telefonnummern der Mannschaftsführer abrufen, um bei Ausfällen direkt reagieren zu können. Zudem sind alle Schichtdienste (z.B. Hallendienst) transparent einsehbar.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Aufgaben der Administratoren</h4>
            <p className="text-sm mb-4">Admins können externe iCal/ics Links abonnieren und Dienste organisieren. Klicken Sie dazu auf ein importiertes Heimspiel und fügen Sie Interne Dienste (Aufbau, Verkauf) an das Event an. Teilen Sie Personen aus der Vereinsliste zu und aktivieren Sie bei Bedarf automatische Erinnerungen.</p>

            <div className="bg-orange-50 border border-orange-100 p-5 rounded-lg mt-6">
              <h4 className="font-bold text-orange-900 mb-2">Best Practice: Der Self-Service für Dienste</h4>
              <p className="text-sm text-orange-800 mb-3">Organisieren Sie Dienste (z.B. Getränkeversorgung, Hallendienst) nach dem Self-Service-Prinzip, um den Vorstandsaufwand zu minimieren:</p>
              <ol className="list-decimal pl-5 text-sm text-orange-800 space-y-2">
                <li><strong>Dienste anlegen:</strong> Der Technische Leiter erstellt alle Dienste für die Hinrunde und trägt sich zunächst selbst als Platzhalter ein.</li>
                <li><strong>Mitglieder greifen zu:</strong> Jedes Mitglied öffnet die App, sucht sich passende Termine und klickt auf <strong>"Dienst übernehmen"</strong>. Wer zuerst kommt, sichert sich seinen Wunschtermin.</li>
                <li><strong>Reste zuteilen:</strong> Kurz vor Saisonstart weist der Technische Leiter die übrig gebliebenen Dienste den Mitgliedern zu, die sich noch nicht selbst eingetragen haben.</li>
              </ol>
            </div>

            <div className="bg-purple-50 border border-purple-100 p-5 rounded-lg mt-6">
              <h4 className="font-bold text-purple-900 mb-2">Die öffentliche Kalenderfreigabe</h4>
              <p className="text-sm text-purple-800">Um wiederkehrende Rückfragen zu eingeteilten Schichtdiensten zu vermeiden, nutzen Sie das "Teilen"-Symbol oben rechts im Kalender. Dies generiert einen schreibgeschützten Link, der in WhatsApp-Gruppen oder auf der Webseite geteilt werden kann. Externe Betrachter sehen sofort den Kalender und alle Dienste, ohne einen App-Zugang zu benötigen.</p>
            </div>
          </HelpSection>

          <HelpSection id="meetings" title="Teil 3: Der 4-Phasen-Sitzungszyklus & Protokolle" icon={Layers} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Für strukturierte Protokolle, die verbindliche Ergebnisse dokumentieren und Aufgaben konsequent nachhalten.</p>

            <p className="text-sm mb-6">Das System arbeitet nicht mit unstrukturierten ToDo-Listen, sondern folgt dem Rhythmus offizieller Sitzungen. Dieser 4-Phasen-Zyklus definiert den Ablauf der Vorstandsarbeit:</p>

            <div className="space-y-4 mb-8 text-sm">
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 1: Planen (Entwurf)</strong>
                Die Sitzungsleitung erstellt eine neue Sitzung (Status: Entwurf) und lädt bei Bedarf Standard-Vorlagen.
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 2: Veröffentlichen</strong>
                Die Agenda wird freigegeben. <em>Hinweis: Erst in diesem Moment werden die Teilnehmer informiert und eventuell hinterlegte WhatsApp-Erinnerungen für die Agenda-Punkte im Hintergrund aktiviert.</em>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 3: Starten (Live-Protokoll)</strong>
                Während der Sitzung wird live protokolliert. Nutzen Sie zur Effizienz am PC den <strong>Rechtsklick</strong> auf eine Zeile für das Schnell-Menü. Die <strong>+/- Taste</strong> in der Werkzeugleiste klappt das gesamte Protokoll strukturiert auf oder zu.
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 4: Versiegeln & Klonen</strong>
                Am Ende der Sitzung wird das Datum für das nächste Meeting der Serie festgelegt. Die App friert das aktuelle Protokoll revisionssicher ein und <strong>generiert sofort die Folge-Agenda</strong>. Alle offenen Alt-Aufgaben werden dabei automatisch in die neue Sitzung übertragen.
              </div>
            </div>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Methodik: Die 4 Werkzeuge der Agenda</h4>
            <p className="text-sm mb-4">Um das Protokoll auswertbar zu halten, wird strikt zwischen Information und Aktion unterschieden:</p>
            <ul className="space-y-4 list-none pl-0 text-sm mb-8">
              <li className="flex items-start">
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">A: Agenda</span>
                <div><strong>Gemeinsam arbeiten.</strong> Themen, die diskutiert und in der Gruppe erarbeitet werden müssen.</div>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">I: Info</span>
                <div><strong>Berichtspflicht.</strong> Reiner Wissenstransfer (z.B. Kassenbericht). Eingetragene Verantwortliche informieren das Gremium aktiv.</div>
              </li>
              <li className="flex items-start">
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">B: Beschluss</span>
                <div><strong>Ergebnisse fixieren.</strong> Das offiziell abgestimmte Resultat einer Debatte.</div>
              </li>
              <li className="flex items-start">
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">✓ Aufgabe</span>
                <div><strong>Handlung erfordern.</strong> Tätigkeiten, die <em>zwischen</em> den Sitzungen aktiv erledigt und nachgehalten werden müssen.</div>
              </li>
            </ul>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-2">Grundregel: Ein Thema = Ein Punkt</h4>
              <p className="text-sm text-blue-800 mb-2"><strong>Der Titel (Das "Was"):</strong> Kurz und prägnant formuliert, um die Scanbarkeit der Agenda zu gewährleisten.</p>
              <p className="text-sm text-blue-800"><strong>Die Beschreibung (Das "Wie"):</strong> Für Details, Notizen und Checklisten. Erstellen Sie nicht für jeden Handgriff eine formelle Aufgabe ("Task-Inflation"), sondern nutzen Sie den Textbereich zur Dokumentation.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">Strukturierung: Das Container-Prinzip (Unterpunkte)</h4>
              <p className="text-sm text-indigo-800">Nutzen Sie Unterpunkte gezielt, um die Übersichtlichkeit zu wahren. Ein Unterpunkt ist methodisch nur dann sinnvoll, wenn <strong>eine andere Person</strong> dafür verantwortlich ist oder <strong>eine abweichende Frist</strong> als für das Hauptthema gilt. Andernfalls gehört die Information in die Beschreibung des Hauptpunktes.</p>
            </div>

            <div className="bg-red-50 border border-red-100 p-5 rounded-lg">
              <h4 className="font-bold text-red-900 mb-2">Die Protokoll-Historie nutzen</h4>
              <p className="text-sm text-red-800">Die manuelle Suche in alten PDF-Dokumenten entfällt. Über den <strong>"📜 Protokolle"</strong> Button im Dashboard oder in der aktuellen Sitzung haben Sie direkten Zugriff auf die vollständige Historie der jeweiligen Projekt-Reihe.</p>
            </div>
          </HelpSection>

          <HelpSection id="tasks" title="Teil 4: Aufgaben & Helfer managen (Kanban-Board)" icon={ListTodo} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Die zentrale operative Übersicht: Wer erledigt was bis wann?</p>

            <p className="mb-4 text-sm">Nutzer müssen keine Protokolle studieren, um ihre ausstehenden Aufgaben zu finden. Im Menü <strong>Meine Aufgaben</strong> werden alle Tasks gesammelt, die in einer Sitzung erstellt und der jeweiligen Person zugewiesen wurden.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Ansichten & Bedienung</h4>
            <p className="text-sm mb-4">Nutzer haben die Wahl zwischen dem visuellen <strong>Kanban-Board</strong> (Offen / In Arbeit / Erledigt) zur Steuerung per Drag & Drop oder der klassischen <strong>Listenansicht</strong>. Integrierte Filter (nach Datum, Projekt, Verantwortlichem) ermöglichen schnelle Auswertungen.</p>
            <p className="text-sm mb-4"><strong>Live-Synchronisierung:</strong> Wird eine Aufgabe auf dem Dashboard als "Erledigt" markiert, aktualisiert das System den Fortschrittsbalken im zentralen Vorstandsprotokoll unverzüglich auf 100 %. Eine manuelle Rückmeldung entfällt.</p>

            <div className="bg-green-50 border border-green-100 p-5 rounded-lg mb-6 mt-6">
              <h4 className="font-bold text-green-900 mb-2">Systemseitige Qualitätskontrolle (Keine Geisteraufgaben)</h4>
              <p className="text-sm text-green-800">PapaToDo verhindert proaktiv den Verlust von Aufgaben. Das System blockiert den Abschluss eines Sitzungsprotokolls, solange formelle Aufgaben existieren, denen keine verantwortliche Person zugewiesen wurde. So wird zwingende Verantwortlichkeit garantiert.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Erinnerungs-Management & Snooze</h4>
              <p className="text-sm text-indigo-800 mb-2">Im "Erinnerungen"-Cockpit sammelt die App alle fälligen Fristen für den Administrator. Ein Klick auf "Senden" öffnet WhatsApp mit einem vorformulierten Text. Der Versand erfolgt stets persönlich, nicht als anonyme System-E-Mail.</p>
              <p className="text-sm text-indigo-800">Sollte eine sofortige Nachfrage nicht sinnvoll sein, kann die Frist über den <strong>Snooze-Button</strong> (Schlummern) temporär ausgeblendet und um einige Tage aufgeschoben werden.</p>
            </div>
          </HelpSection>

          <HelpSection id="routines" title="Teil 5: Daueraufgaben & das Endlos-Projekt" icon={Repeat} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Zur Überwachung regelmäßiger Routinen (Management by Exception), ohne die regulären Vorstands-Sitzungen zu belasten.</p>

            <p className="mb-4 text-sm">Zahlreiche Tätigkeiten im Verein sind "stille" Routinen (z.B. Spielbälle kontrollieren und nachbestellen, Getränkeversorgung sicherstellen). Diese müssen ausgeführt werden, bedürfen aber keiner Erwähnung in der Vorstands-Agenda, solange sie reibungslos funktionieren.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Methodik: Das "Endlos-Projekt"</h4>
            <p className="text-sm mb-4">Um diese Routinen abzubilden, legen Sie unter "Sitzungen & Projekte" ein dediziertes Projekt (z.B. <strong>"Daueraufgaben / Routinen"</strong>) an. <strong>Wichtig:</strong> Setzen Sie das Zieldatum dieses Projekts weit in die Zukunft (z.B. auf den 1.1.2099). Es dient lediglich als Sammelbecken.</p>
            <p className="text-sm mb-4">Erfassen Sie in diesem Projekt alle wiederkehrenden Aufgaben und weisen Sie diese den zuständigen Personen zu. Die Verantwortlichen sehen ihre Routinen auf ihrem Dashboard. Die Leitungsebene erkennt im Kanban-Board sofort, falls eine Routine überfällig ist.</p>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Automatik: Führender Oberpunkt</h4>
              <p className="text-sm text-indigo-800">Die Systemautomatik zur Erzeugung der <em>nächsten</em> Routine (z.B. in der Folgewoche) wird ausschließlich durch den <strong>Hauptpunkt</strong> getriggert. Setzt der Verantwortliche den Hauptpunkt auf "Erledigt" (100 %), generiert das System den Folgetermin. Eventuell noch offene Unterpunkte werden vom System toleriert und automatisch in den nächsten Zyklus übernommen.</p>
            </div>
          </HelpSection>

          <HelpSection id="templates" title="Teil 6: Vorlagen & Die geregelte Aufgabenübergabe" icon={BookOpen} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Um das institutionelle Wissen des Vereins zu sichern, insbesondere bei Personalwechseln im Vorstand.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Vorlagen-Bibliothek</h4>
            <p className="text-sm mb-6">Für seltene, aber wiederkehrende Projekte (z.B. "Organisation Vereinsmeisterschaft") können Standard-Abläufe und Checklisten in der Vorlagen-Bibliothek gespeichert werden. Diese lassen sich bei Bedarf mit einem Klick in neue Projekte importieren.</p>

            <div className="bg-purple-50 border border-purple-100 p-5 rounded-lg">
               <h4 className="font-bold text-purple-900 mb-2">Die geregelte Aufgabenübergabe (Succession-Workflow)</h4>
               <p className="text-sm text-purple-800 mb-2">Verantwortung ist systemseitig immer an reale Personen gebunden. Im Tab "Rollen & Ämter" ist ersichtlich, welche Person aktuell welches Amt bekleidet und welche Aufgaben mit diesem Profil verknüpft sind.</p>
               <p className="text-sm text-purple-800">Bei einem personellen Wechsel nutzen Administratoren den <strong>Aufgabenübergabe-Workflow</strong>. Dieser Prozess erlaubt es, alle noch offenen Aufgaben und Dauer-Routinen der ausscheidenden Person gesammelt und kontrolliert an den Nachfolger zu übertragen. So wird sichergestellt, dass keine Verantwortlichkeit verwaist.</p>
            </div>
          </HelpSection>

          <HelpSection id="security" title="Teil 7: Sicherheit, Rechte & Rollen-Profile" icon={Lock} audience="admin">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Zur funktionalen Rechteverwaltung und Gewährleistung der Datensicherheit im System.</p>

            <p className="mb-4 text-sm leading-relaxed">PapaToDo steuert Berechtigungen über vordefinierte <strong>Rollen-Profile</strong>, anstatt über individuelle Zuweisungen. Administratoren definieren im Tab "Rollen-Profile" die benötigten Rechte (z.B. "Aufgaben verwalten") und weisen dieses Profil den jeweiligen Nutzergruppen zu.</p>

            <div className="bg-red-50 border border-red-100 p-5 rounded-lg mb-6 mt-6">
              <h4 className="font-bold text-red-900 mb-2">Super-Admin Rechte verwalten</h4>
              <p className="text-sm text-red-800">Die Berechtigung <strong>manageUsers</strong> ist die höchste administrative Stufe im System. Sie autorisiert das Anlegen neuer Mitglieder, das Zurücksetzen von Passwörtern und die Zuweisung von Admin-Rechten. Diese Berechtigung sollte strikt auf maximal zwei Personen im Verein limitiert werden.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Datensicherung: Der Soft-Delete</h4>
              <p className="text-sm text-indigo-800">Gelöschte Datensätze (z.B. Agenda-Punkte) werden nicht physisch vernichtet. Sie erhalten intern den Status "TRASH" und werden lediglich aus der Benutzeroberfläche ausgeblendet. Administratoren haben Zugriff auf diesen Papierkorb und können versehentlich gelöschte Elemente jederzeit wiederherstellen.</p>
            </div>
          </HelpSection>

        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---