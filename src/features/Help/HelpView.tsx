// [2026-10-18] - UX-CLEANUP: Header auf einzeiligen, ruhigen Segmented-Switch (Alle | Spielbetrieb | Vorstand | Admin) umgestellt und bunte Rahmen-Kästchen im Inhaltsverzeichnis zugunsten einer ruhigen, einheitlichen Übersicht entfernt (No UI-Clutter).
// [2026-10-18] - UX-REFACTOR: Handbuch in 3 Zielgruppen-Welten (Spielbetrieb, Abteilungsleitung, Administratoren) gegliedert. Alle organisatorischen Leitplanken zu 100% erhalten und neue Features ergänzt.
// [2026-10-15] - UX-FIX: Handbuch um "Teil 9: Backup & Restore (Datensicherung & Testumgebung)" erweitert. Erklärt JSON-Export, 12-Uhr-Reminder, Restore-Modi (Merge/Wipe) und die E-Mail-Authentifizierungsbrücke.
// [2026-10-14] - UX-FIX: Handbuch um "Admin-Cockpit" für schnelle Logistik-Zuweisungen (Teil 2) und die "Sticky Toolbar" für Team-Filter im Spielplan (Teil 8) ergänzt. Persistente Filter dokumentiert.
// [2026-10-14] - UX-FIX: Modulares Welcome-Dashboard (Reengineering) im Handbuch (Teil 1) redaktionell berücksichtigt.
// [2026-09-28] - UX-FIX: Handbuch um "Teil 8: Saison- & Aufstellungsplanung" (Base & Override, Matrix, Kader-Erinnerungen) für Mannschaftsführer erweitert.
// [2026-07-24] - UX-FIX: Handbuch um DSGVO Self-Service, dynamische Team-PINs, persistente Kalender-Filter und den Hard-Reset (Cache leeren) erweitert.
// [2026-05-31] - UX-FEATURE: Best-Practice Workflow (Self-Service für Dienste) in Kalender-Sektion (Teil 2) integriert.
// [2026-05-31] - UX-FIX: Generische Vereinsbeispiele im gesamten Handbuch konsequent auf Tischtennis-Beispiele (Hallendienst, Getränkeversorgung, Spielbälle, Vereinsmeisterschaft) umgestellt.
// [2026-05-30] - UX-FIX: Sprachliche Kalibrierung (Nüchterner, professioneller SOP-Ton statt Marketing-Sprech). Euphorie-Wörter ("Magie", "Königsdisziplin", "chirurgisch") entfernt. Komplexe Begriffe ("Endlos-Projekt", "Führender Oberpunkt", "Succession") mit kurzen Definitionen versehen. Einleitung auf primäre Zielgruppe (Vorstand/Admin) fokussiert.
// [2026-05-30] - UX-FIX: Handbuch auf architektonische Wahrheiten korrigiert. 1. Aufgabenübergabe-Workflow präzisiert. 2. Kanban-Board um Listenansicht ergänzt. 3. "Geisteraufgaben" durch "Qualitätskontrolle" (Protokoll-Blockade) ersetzt.
// [2026-05-30] - UX-FIX: Handbuch auf praxisnahe Kernbereiche (Use Cases) verdichtet. Neues Konzept des "Persönlichen Dashboards" integriert. 
// [2026-05-30] - UX-FIX: Akkordeon-Logik komplett entfernt. Permanenter Lesemodus (Single-Page). 
// 2026-04-18 20:15 - CHIRURGISCHER EINGRIFF: Integration von Teil 9 (Rollen & Berechtigungen)
// src/features/Help/HelpView.tsx
import React, { useState } from 'react';
import { BookOpen, Target, Calendar, ListTodo, Layers, Printer, Repeat, Lock, ArrowUp, Users, Database } from 'lucide-react';

type AudienceType = 'all' | 'board' | 'admin';

interface HelpSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  audience?: AudienceType;
  children: React.ReactNode;
}

export const HelpView: React.FC = () => {
  const [audienceFilter, setAudienceFilter] = useState<'everything' | AudienceType>('everything');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`help-section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const AudienceBadge = ({ type }: { type?: AudienceType }) => {
    if (type === 'all') return <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-green-300">Spielbetrieb</span>;
    if (type === 'board') return <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-purple-300">Vorstand & Orga</span>;
    if (type === 'admin') return <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ml-2 sm:ml-3 print:border print:border-red-300">Administratoren</span>;
    return null;
  };

  const HelpSection: React.FC<HelpSectionProps> = ({ id, title, icon: Icon, audience, children }) => {
    if (audienceFilter !== 'everything' && audience !== audienceFilter) {
      return null;
    }

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

  const showAll = audienceFilter === 'everything' || audienceFilter === 'all';
  const showBoard = audienceFilter === 'everything' || audienceFilter === 'board';
  const showAdmin = audienceFilter === 'everything' || audienceFilter === 'admin';

  return (
    <div className="h-full flex flex-col bg-white">
      {/* HEADER (Kompakt & Einzeilig auf Desktop) */}
      <div className="flex-none px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 bg-gray-50 print:hidden sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center min-w-0">
            <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl text-white mr-3.5 shadow-sm shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight truncate">PapaToDo Handbuch</h1>
              <p className="text-gray-500 text-xs sm:text-sm truncate">Leitfaden für Spielbetrieb, Vorstand & Administration</p>
            </div>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Ruhiger Segmented-Switch wie in ReportsView */}
            <div className="flex items-center bg-gray-200/80 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setAudienceFilter('everything')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audienceFilter === 'everything'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setAudienceFilter('all')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audienceFilter === 'all'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Spielbetrieb
              </button>
              <button
                onClick={() => setAudienceFilter('board')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audienceFilter === 'board'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vorstand
              </button>
              <button
                onClick={() => setAudienceFilter('admin')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  audienceFilter === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors shrink-0"
              title="Handbuch drucken oder als PDF speichern"
            >
              <Printer className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Drucken</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto print:overflow-visible print:p-0">
        <div className="max-w-4xl mx-auto p-6 sm:p-10 lg:p-12 print:p-0">
          
          <div className="hidden print:block mb-12 border-b-2 border-black pb-6">
            <h1 className="text-4xl font-black text-black mb-2">PapaToDo Handbuch</h1>
            <p className="text-lg text-gray-600">Betriebsanleitung für Spielbetrieb, Abteilungsleitung & Vereinsorganisation</p>
          </div>
          
          {/* INHALTSVERZEICHNIS (Ruhige Einzelbox ohne bunte Unter-Rahmen) */}
          <div id="help-section-toc" className="mb-14 bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-200 print:bg-transparent print:border-none print:p-0 print:mb-12 scroll-mt-6">
            <h3 className="font-bold text-xl mb-2 text-gray-900">Inhaltsverzeichnis</h3>
            <p className="text-sm text-gray-600 mb-6">
              Wählen Sie oben Ihren Bereich oder springen Sie direkt zum gewünschten Kapitel:
            </p>

            <div className="space-y-5">
              {showAll && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    1. Spielbetrieb & Vereinsalltag (Für Mitglieder, Spieler & Captains)
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-blue-700 font-medium list-none pl-0">
                    <li><button onClick={() => scrollToSection('philosophy')} className="hover:underline text-left">Teil 1: Startseite, Mein Profil & Grundprinzipien</button></li>
                    <li><button onClick={() => scrollToSection('calendar')} className="hover:underline text-left">Teil 2: Kalender, Spielbetrieb, Dienste & Team-PINs</button></li>
                    <li><button onClick={() => scrollToSection('lineups')} className="hover:underline text-left">Teil 3: Saison- & Aufstellungsplanung (Spieler & Captains)</button></li>
                  </ul>
                </div>
              )}

              {showBoard && (
                <div className={showAll ? 'pt-4 border-t border-gray-200/80' : ''}>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    2. Abteilungsleitung & Organisation (Sitzungen, Protokolle & ToDos)
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-blue-700 font-medium list-none pl-0">
                    <li><button onClick={() => scrollToSection('meetings')} className="hover:underline text-left">Teil 4: Der 4-Phasen-Sitzungszyklus & Protokoll-Methodik</button></li>
                    <li><button onClick={() => scrollToSection('tasks')} className="hover:underline text-left">Teil 5: Aufgaben & Helfer managen (Kanban-Board)</button></li>
                    <li><button onClick={() => scrollToSection('routines')} className="hover:underline text-left">Teil 6: Daueraufgaben & das "Endlos-Projekt"</button></li>
                    <li><button onClick={() => scrollToSection('templates')} className="hover:underline text-left">Teil 7: Vorlagen & Die geregelte Aufgabenübergabe</button></li>
                  </ul>
                </div>
              )}

              {showAdmin && (
                <div className={(showAll || showBoard) ? 'pt-4 border-t border-gray-200/80' : ''}>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    3. System-Administration (Rechte, Datenschutz & Backup)
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-blue-700 font-medium list-none pl-0">
                    <li><button onClick={() => scrollToSection('security')} className="hover:underline text-left">Teil 8: Sicherheit, Rechte & Berechtigungs-Matrix</button></li>
                    <li><button onClick={() => scrollToSection('backup')} className="hover:underline text-left">Teil 9: Backup & Restore sowie Data Explorer</button></li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* =====================================================================
              WELT 1: SPIELBETRIEB & VEREINSALLTAG (ALLE MITGLIEDER & CAPTAINS)
             ===================================================================== */}

          <HelpSection id="philosophy" title="Teil 1: Startseite, Mein Profil & Grundprinzipien" icon={Target} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Reduzierung von Zettelwirtschaft, Schaffung von Verbindlichkeit und fokussierte Informationsbereitstellung für jedes Mitglied.</p>
            
            <p className="mb-4">Jeder Verein lebt vom Engagement seiner Mitglieder. Im Alltag gehen wichtige Informationen zu Punktspielen, Fahrdiensten oder Vorstands-Aufgaben jedoch oft in langen Chat-Verläufen oder Text-Protokollen unter. PapaToDo bündelt den kompletten Spielbetrieb und die Vereinsorganisation an einem zentralen Ort.</p>
            
            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Das Welcome-Dashboard (Startseite)</h4>
            <p className="text-sm mb-4">Das Herzstück der App ist das persönliche, rollenbasierte Dashboard unter <strong>Start</strong>. Es beantwortet beim Öffnen der App auf einen Blick die zentrale Frage: <strong>"Was steht für mich in den kommenden Wochen an?"</strong></p>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 mb-6">
              <li><strong>Spieltermine:</strong> Wann spiele ich? Wer fährt, wer ist als Betreuer eingeteilt und wann ist Abfahrt?</li>
              <li><strong>Vereinstermine & Umfragen:</strong> Welche offiziellen Sitzungen, Turniere oder Feste stehen an (inkl. direkter Zu-/Absage bei Abstimmungen)?</li>
              <li><strong>Dienste:</strong> Bin ich für den Hallendienst, einen Fahrdienst oder die Getränkeversorgung eingeteilt?</li>
              <li><strong>ToDos (für Vorstände & Orga):</strong> Welche meiner Aufgaben aus Sitzungen sind aktuell fällig?</li>
            </ul>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">Grundprinzip: Persönliche Verantwortung & Silo-Datenschutz</h4>
              <p className="text-sm text-indigo-800 mb-3"><strong>Verantwortung ist bei uns immer persönlich, nicht anonym.</strong> Jede Aufgabe und jeder Dienst wird konkret zugeordnet. Verlässt jemand im Vorstand sein Amt, sorgt die geregelte Aufgabenübergabe (Succession-Workflow) dafür, dass alle offenen Punkte nahtlos an den Nachfolger übertragen werden.</p>
              <p className="text-sm text-indigo-800">Zudem bietet PapaToDo konsequenten Datenschutz (Participation-First). Mitglieder sehen auf ihrer Startseite ausschließlich Termine, Spiele und Dienste, die sie oder ihre Mannschaft betreffen. Interne Vorstandsthemen und Fremd-Sitzungen bleiben unsichtbar.</p>
            </div>

            <div className="bg-green-50 border border-green-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-green-900 mb-2">Anmeldung & Mein Profil (Kontaktdaten selbst pflegen)</h4>
              <p className="text-sm text-green-800 mb-2">Die Anmeldung erfolgt wahlweise mit E-Mail und Passwort oder ganz ohne Passwort per <strong>Magic-Link</strong> (Einmal-Anmeldelink per E-Mail), sofern Ihre E-Mail-Adresse beim Verein hinterlegt ist.</p>
              <p className="text-sm text-green-800">Über den Button <strong>Mein Profil</strong> (links unten in der Navigation) kann jedes Mitglied seine Telefonnummer, Adresse, Eltern-Kontaktdaten sowie die DSGVO-Freigabe zur Sichtbarkeit im Vereins-Adressbuch jederzeit selbst aktualisieren.</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-5 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">System-Updates & Fehlerbehebung (App reparieren)</h4>
              <p className="text-sm text-gray-800 mb-2">Da PapaToDo als schnelle, offline-fähige Web-App (PWA) konzipiert ist, speichert das Gerät Daten lokal zwischen. Bei Darstellungsproblemen oder nach systemseitigen Updates kann dieser Zwischenspeicher veralten.</p>
              <p className="text-sm text-gray-800">Nutzer finden in <strong>Mein Profil</strong> ganz unten die Funktion <strong>"App reparieren (Cache leeren)"</strong>. Diese erzwingt eine sofortige Bereinigung des Speichers und lädt alle Daten frisch vom Server (aktive Internetverbindung erforderlich).</p>
            </div>
          </HelpSection>

          <HelpSection id="calendar" title="Teil 2: Kalender, Spielbetrieb, Dienste & Team-PINs" icon={Calendar} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Der zentrale Termin-Hub für den Verein – inklusive automatischer Synchronisation externer Spielpläne, Live-Umfragen und Schichtdienste.</p>

            <p className="mb-4 text-sm">Veranstaltungen und Runden-Spielpläne müssen nicht doppelt erfasst werden. PapaToDo bietet einen integrierten <strong>ICS-Import</strong>, der sich regelmäßig mit externen Quellen (z.B. myTischtennis / nuScore, Ferien- oder Verbandskalendern) synchronisiert.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Die Anwender-Perspektive im Vereinskalender</h4>
            <p className="text-sm mb-4">Im Menü <strong>Vereinskalender</strong> finden Mitglieder alle Punktspiele, Turniere und Schichtdienste (z.B. Hallendienst, Fahrer). Bei Auswärtsspielen mit hinterlegter Hallenadresse und Abfahrtszeit öffnet ein Klick auf das Routen-Symbol direkt <strong>Google Maps</strong> mit der fertig berechneten Fahrtroute ab der eigenen Heimhalle.</p>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-2">Persönliches Langzeitgedächtnis (Persistente Filter)</h4>
              <p className="text-sm text-blue-800">Der Kalender merkt sich Ihre individuellen Filter-Einstellungen (welche Mannschaften Sie im Reiter <strong>Spielplan</strong> ausgewählt haben, bestimmte Dienst-Kategorien oder Ihre bevorzugte Listen-Ansicht) dauerhaft auf Ihrem Gerät. Ein Neuladen der App setzt diese Auswahl nicht zurück.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">Wettkampf-Tresor (Dynamische Team-PINs & Tabellen)</h4>
              <p className="text-sm text-indigo-800">Unter <strong>Team-PINs</strong> finden berechtigte Spieler und Mannschaftsführer die Spielberichts- und Ergebnis-PINs (z.B. für myTischtennis / nuScore) sowie Direktlinks zur aktuellen Liga-Tabelle. Die Freigabe erfolgt dynamisch über die Mannschaftszugehörigkeit: Tritt ein Mitglied einem Team bei, erhält es automatisch Zugriff auf die hinterlegten PINs dieser Mannschaft.</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-emerald-900 mb-2">Live-Umfragen & Abstimmungen bei Terminen</h4>
              <p className="text-sm text-emerald-800">Sowohl bei Kalendereinträgen (z.B. Sommerfest, Trainingslager) als auch in Sitzungen können Organisatoren eine <strong>Umfrage</strong> aktivieren. Mitglieder können direkt im Termin mit einem Klick abstimmen (z.B. Teilnahme-Zusage oder Essenswunsch) und sehen live das aktuelle Stimmungsbild.</p>
            </div>

            <div className="bg-orange-50 border border-orange-100 p-5 rounded-lg mt-6">
              <h4 className="font-bold text-orange-900 mb-2">Best Practice: Der Self-Service für Dienste</h4>
              <p className="text-sm text-orange-800 mb-3">Organisieren Sie Vereinsdienste (z.B. Getränkeversorgung, Hallendienst) nach dem Self-Service-Prinzip, um den Vorstandsaufwand zu minimieren:</p>
              <ol className="list-decimal pl-5 text-sm text-orange-800 space-y-2">
                <li><strong>Dienste anlegen:</strong> Der Technische Leiter erstellt alle Dienste für die Hinrunde und trägt sich zunächst selbst als Platzhalter ein.</li>
                <li><strong>Mitglieder greifen zu:</strong> Jedes Mitglied öffnet die App, sucht sich passende Termine und klickt auf <strong>"Dienst übernehmen"</strong>. Wer zuerst kommt, sichert sich seinen Wunschtermin.</li>
                <li><strong>Reste zuteilen:</strong> Kurz vor Saisonstart weist der Technische Leiter die übrig gebliebenen Dienste den Mitgliedern zu, die sich noch nicht selbst eingetragen haben.</li>
              </ol>
            </div>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-8">Zusatzfunktionen für Organisatoren (Admin-Cockpit & Teilen)</h4>
            <p className="text-sm mb-4">In der <strong>Dienste-Listenansicht</strong> steht Vorständen und Mannschaftsführern ein schnelles <em>Admin-Cockpit</em> zur Verfügung: Betreuer, Fahrer und Abfahrtszeiten können direkt in der Tabellenzeile zugewiesen werden, ohne jeden Termin einzeln öffnen zu müssen.</p>

            <div className="bg-purple-50 border border-purple-100 p-5 rounded-lg">
              <h4 className="font-bold text-purple-900 mb-2">Die öffentliche Kalenderfreigabe</h4>
              <p className="text-sm text-purple-800">Um wiederkehrende Rückfragen zu Terminen zu vermeiden, nutzen Sie das "Teilen"-Symbol oben rechts im Kalender. Dies generiert einen schreibgeschützten Link, der in WhatsApp-Gruppen oder auf der Vereins-Webseite eingebunden werden kann – ganz ohne App-Login.</p>
            </div>
          </HelpSection>

          <HelpSection id="lineups" title="Teil 3: Saison- & Aufstellungsplanung (Spieler & Captains)" icon={Users} audience="all">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Damit Spieler ihre Verfügbarkeit für Punktspiele rückmelden können und Mannschaftsführer (Captains) Kader, Ersatzspieler und Fahrdienste mühelos steuern.</p>

            <p className="mb-4 text-sm leading-relaxed">PapaToDo nutzt ein "Base & Override" System: Das System geht standardmäßig davon aus, dass bei jedem Spiel der reguläre Stammkader antritt ("Base"). Spieler und Captains müssen nur dort eingreifen, wo jemand verhindert ist oder ein Ersatzspieler ("Joker") aushilft ("Override").</p>

            <div className="space-y-4 mb-8 text-sm">
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                <strong className="text-blue-700 block mb-1">Schritt 1: Saison-Planung öffnen & Ansicht wählen (Karten | Matrix | Dienste)</strong>
                Gehen Sie unter <strong>User & Gruppen</strong> in den Reiter <strong>Teams & Gruppen</strong> und klicken Sie bei Ihrer Mannschaft auf <strong>Saison planen</strong> (oder direkt im Vereinskalender beim jeweiligen Spiel auf <strong>Aufstellung / Ändern</strong>). Oben rechts können Sie jederzeit zwischen drei Ansichten wechseln:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                  <li><strong>Karten:</strong> Übersichtliche Spieltags-Karten (ideal auf dem Smartphone).</li>
                  <li><strong>Matrix:</strong> Die komplette Saison-Tabelle auf einen Blick (inkl. automatischem Einsatz-Zähler pro Spieler im Tabellenkopf).</li>
                  <li><strong>Dienste:</strong> Kompakte Logistik-Liste aller Spiele dieses Teams für Fahrer- und Betreuer-Einteilungen.</li>
                </ul>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                <strong className="text-blue-700 block mb-1">Schritt 2: Verfügbarkeit eintragen, Joker holen & Aufstellung versiegeln</strong>
                Spieler können ihre eigene Verfügbarkeit (Da / Weg) direkt antippen. Der Mannschaftsführer stellt daraus den finalen Kader zusammen und kann über <strong>+ Weiterer Spieler</strong> Ersatzspieler (Joker) aus anderen Mannschaften hinzufügen. Über das <strong>Schloss-Symbol (🔒)</strong> kann der Captain eine fertige Aufstellung versiegeln (oder in den Team-Einstellungen eine automatische Sperrfrist vor dem Spieltag festlegen).
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm border-l-4 border-l-blue-500">
                <strong className="text-blue-700 block mb-1">Schritt 3: Fahrer, Betreuer & Abfahrtszeit (mit Google Maps)</strong>
                Ist für eine Mannschaft (z.B. Jugend) in den Team-Einstellungen hinterlegt, dass Fahrer oder Betreuer benötigt werden, blendet die Planung automatisch die Logistik-Zeilen ein. Hier werden Fahrer, Betreuer und die <strong>Abfahrtszeit</strong> eingetragen – inklusive direktem Google-Maps-Routenbutton von der Heimhalle zum Auswärts-Spielort.
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-2">Tipp: Der Spielplan-Filter (Sticky Toolbar)</h4>
              <p className="text-sm text-blue-800">Wenn Ihr Verein viele Mannschaften hat, nutzen Sie im Vereinskalender unter <strong>Spielplan</strong> die schwebende Filter-Leiste oben rechts. Wählen Sie gezielt nur Ihre relevanten Mannschaften (z.B. "J1" und "Herren II") aus, um endloses Scrollen zu vermeiden. Die App merkt sich diese Auswahl dauerhaft.</p>
            </div>

            <div className="bg-green-50 border border-green-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-green-900 mb-2">WhatsApp-Export & Automatische Kader-Erinnerungen</h4>
              <p className="text-sm text-green-800 mb-2">Damit das Team sofort Bescheid weiß, klicken Sie in der Termin-Detailansicht im Kalender auf das <strong>WhatsApp-Symbol</strong> neben dem Kader. Das System generiert einen fertigen Info-Text für Ihre WhatsApp-Mannschaftsgruppe (inklusive Spielort, Treffpunkt/Abfahrt, Fahrer und den aufgestellten Spielern).</p>
              <p className="text-sm text-green-800">Wenn für das Kalender-Abo Erinnerungen aktiviert sind, wird diese berechnete Aufstellung zudem automatisch an die offiziellen Spieltags-Erinnerungen angehängt.</p>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 p-5 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-2">Datenschutz-Hinweis</h4>
              <p className="text-sm text-gray-800">Aufstellungen, Verfügbarkeiten und Fahrtdienste sind ausschließlich für eingeloggte Vereinsmitglieder sichtbar. Gäste und Besucher, die über einen öffentlichen Link auf den Vereinskalender zugreifen, sehen lediglich den Termin und den Spielort, jedoch aus DSGVO-Gründen niemals die Spielernamen.</p>
            </div>
          </HelpSection>

          {/* =====================================================================
              WELT 2: ABTEILUNGSLEITUNG & ORGANISATIONS-PRINZIPIEN (VORSTAND)
             ===================================================================== */}

          <HelpSection id="meetings" title="Teil 4: Der 4-Phasen-Sitzungszyklus & Protokoll-Methodik" icon={Layers} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Für strukturierte Vorstands- und Abteilungssitzungen, die verbindliche Ergebnisse dokumentieren und Aufgaben konsequent nachhalten.</p>

            <p className="text-sm mb-6">Das System arbeitet nicht mit losen ToDo-Listen, sondern folgt dem Rhythmus offizieller Sitzungen unter <strong>Projekte & Sitzungen</strong>. Dieser 4-Phasen-Zyklus definiert den Ablauf der Vorstandsarbeit:</p>

            <div className="space-y-4 mb-8 text-sm">
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 1: Planen (Entwurf)</strong>
                Die Sitzungsleitung erstellt eine neue Sitzung (Status: Entwurf) und lädt bei Bedarf Standard-Vorlagen. Neu angelegte Aufgaben im Entwurf bleiben auf den ToDo-Boards noch unsichtbar, bis die Agenda freigegeben wird.
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 2: Veröffentlichen</strong>
                Die Agenda wird freigegeben. <em>Hinweis: Erst in diesem Moment werden die Teilnehmer informiert und eventuell hinterlegte WhatsApp-Erinnerungen für die Agenda-Punkte im Hintergrund aktiviert.</em>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                <strong className="text-blue-700 block mb-1">Phase 3: Starten (Live-Protokoll)</strong>
                Während der Sitzung wird live protokolliert. Nutzen Sie zur Effizienz am PC den <strong>Rechtsklick</strong> auf eine Zeile für das Schnell-Menü (oder Doppelklick zum direkten Bearbeiten). Die <strong>+/- Taste</strong> in der Werkzeugleiste klappt das gesamte Protokoll strukturiert auf oder zu.
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
              <h4 className="font-bold text-blue-900 mb-2">Organisations-Grundregel: Ein Thema = Ein Punkt</h4>
              <p className="text-sm text-blue-800 mb-2"><strong>Der Titel (Das "Was"):</strong> Kurz und prägnant formuliert, um die Scanbarkeit der Agenda zu gewährleisten.</p>
              <p className="text-sm text-blue-800"><strong>Die Beschreibung (Das "Wie"):</strong> Für Details, Notizen und Checklisten. Erstellen Sie nicht für jeden Handgriff eine formelle Aufgabe ("Task-Inflation"), sondern nutzen Sie den Textbereich zur Dokumentation.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">Strukturierung: Das Container-Prinzip (Unterpunkte)</h4>
              <p className="text-sm text-indigo-800">Nutzen Sie Unterpunkte gezielt, um die Übersichtlichkeit zu wahren. Ein Unterpunkt ist methodisch nur dann sinnvoll, wenn <strong>eine andere Person</strong> dafür verantwortlich ist oder <strong>eine abweichende Frist</strong> als für das Hauptthema gilt. Andernfalls gehört die Information in die Beschreibung des Hauptpunktes.</p>
            </div>

            <div className="bg-red-50 border border-red-100 p-5 rounded-lg">
              <h4 className="font-bold text-red-900 mb-2">Die Protokoll-Historie nutzen</h4>
              <p className="text-sm text-red-800">Die manuelle Suche in alten PDF-Dokumenten entfällt. Über den <strong>"📜 Protokolle"</strong> Button im Dashboard oder in der aktuellen Sitzung haben Sie direkten Zugriff auf die vollständige Historie der jeweiligen Projekt-Reihe – selbst dann, wenn der Projekttitel zwischendurch angepasst wurde.</p>
            </div>
          </HelpSection>

          <HelpSection id="tasks" title="Teil 5: Aufgaben & Helfer managen (Kanban-Board)" icon={ListTodo} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Die zentrale operative Übersicht für Vorstände und Organisatoren: Wer erledigt was bis wann?</p>

            <p className="mb-4 text-sm">Vorstandsmitglieder müssen keine Protokolle studieren, um ihre ausstehenden Aufgaben zu finden. Im Menü <strong>Meine ToDos</strong> werden alle Aufgaben gesammelt, die in einer Sitzung erstellt und der jeweiligen Person oder ihrem Amt zugewiesen wurden.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Ansichten & Bedienung</h4>
            <p className="text-sm mb-4">Nutzer haben die Wahl zwischen dem visuellen <strong>Kanban-Board</strong> (Offen / In Arbeit / Erledigt) zur Steuerung per Drag & Drop oder der klassischen <strong>Listenansicht</strong>. Integrierte Filter (nach Datum, Projekt, Verantwortlichem) ermöglichen schnelle Auswertungen.</p>
            <p className="text-sm mb-4"><strong>Live-Synchronisierung:</strong> Wird eine Aufgabe auf dem Dashboard oder im Kanban-Board als "Erledigt" markiert, aktualisiert das System den Fortschrittsbalken im zentralen Vorstandsprotokoll unverzüglich auf 100 %. Eine manuelle Rückmeldung entfällt.</p>

            <div className="bg-green-50 border border-green-100 p-5 rounded-lg mb-6 mt-6">
              <h4 className="font-bold text-green-900 mb-2">Systemseitige Qualitätskontrolle (Keine Geisteraufgaben)</h4>
              <p className="text-sm text-green-800">PapaToDo verhindert proaktiv den Verlust von Aufgaben. Das System blockiert den Abschluss eines Sitzungsprotokolls, solange formelle Aufgaben existieren, denen keine verantwortliche Person zugewiesen wurde. Wird eine Aufgabe einem externen Helfer (ohne eigenen App-Zugang) zugewiesen, aktiviert das System automatisch eine WhatsApp-Erinnerung für den Auftraggeber, damit die Aufgabe nicht ins Leere läuft.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Erinnerungs-Management & Snooze</h4>
              <p className="text-sm text-indigo-800 mb-2">Im Menü <strong>Erinnerungen</strong> sammelt die App alle fälligen Fristen für Aufgaben, Termine und Dienste. Ein Klick auf "Senden" öffnet WhatsApp mit einem vorformulierten Text. Der Versand erfolgt stets persönlich durch den Verantwortlichen, nicht als anonyme System-E-Mail.</p>
              <p className="text-sm text-indigo-800">Sollte eine sofortige Nachfrage nicht sinnvoll sein, kann die Frist über den <strong>Snooze-Button</strong> (Schlummern) temporär ausgeblendet und tageweise auf Wiedervorlage geschoben werden.</p>
            </div>
          </HelpSection>

          <HelpSection id="routines" title="Teil 6: Daueraufgaben & das Endlos-Projekt" icon={Repeat} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Zur Überwachung regelmäßiger Routinen (Management by Exception), ohne die regulären Vorstands-Sitzungen zu belasten.</p>

            <p className="mb-4 text-sm">Zahlreiche Tätigkeiten im Verein sind "stille" Routinen (z.B. Spielbälle kontrollieren und nachbestellen, Getränkeversorgung sicherstellen, Erste-Hilfe-Kasten prüfen). Diese müssen zuverlässig ausgeführt werden, bedürfen aber keiner Erwähnung in der Vorstands-Agenda, solange sie reibungslos funktionieren.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Methodik: Das "Endlos-Projekt"</h4>
            <p className="text-sm mb-4">Um diese Routinen abzubilden, legen Sie unter <strong>Projekte & Sitzungen</strong> ein dediziertes Projekt (z.B. <strong>"Daueraufgaben / Routinen"</strong>) an. <strong>Wichtig:</strong> Setzen Sie das Zieldatum dieses Projekts weit in die Zukunft (z.B. auf den 1.1.2099). Es dient lediglich als dauerhaftes Sammelbecken.</p>
            <p className="text-sm mb-4">Erfassen Sie in diesem Projekt alle wiederkehrenden Aufgaben (als Routine mit Intervall wöchentlich, monatlich, jährlich etc.) und weisen Sie diese den zuständigen Personen zu. Die Verantwortlichen sehen ihre Routinen rechtzeitig auf ihrem Dashboard. Die Abteilungsleitung erkennt im Kanban-Board oder unter <strong>Reports & Statistik</strong> sofort, falls eine Routine überfällig ist.</p>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Automatik: Führender Oberpunkt</h4>
              <p className="text-sm text-indigo-800">Die Systemautomatik zur Erzeugung der <em>nächsten</em> Routine (z.B. im Folgemonat) wird ausschließlich durch den <strong>Hauptpunkt</strong> getriggert. Setzt der Verantwortliche den Hauptpunkt auf "Erledigt" (100 %), friert das System den erledigten Durchlauf für die Historie ein und generiert sofort den frischen Folgetermin (inklusive aller zugehörigen Unterpunkte mit neu berechneten Vorlauf-Fristen).</p>
            </div>
          </HelpSection>

          <HelpSection id="templates" title="Teil 7: Vorlagen & Die geregelte Aufgabenübergabe" icon={BookOpen} audience="board">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Um das institutionelle Wissen des Vereins zu sichern, insbesondere bei Personalwechseln in der Abteilungsleitung.</p>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Vorlagen-Bibliothek</h4>
            <p className="text-sm mb-6">Für seltene, aber wiederkehrende Großprojekte (z.B. "Organisation Vereinsmeisterschaft" oder "Sommerfest") können bewährte Standard-Abläufe samt Unterpunkten und Checklisten unter <strong>Vorlagen & Routinen</strong> gespeichert werden. Diese Pakete lassen sich bei Bedarf mit einem Klick in neue Sitzungen oder Projekte importieren.</p>

            <div className="bg-purple-50 border border-purple-100 p-5 rounded-lg">
              <h4 className="font-bold text-purple-900 mb-2">Die geregelte Aufgabenübergabe (Succession-Workflow)</h4>
              <p className="text-sm text-purple-800 mb-2">Verantwortung ist systemseitig immer an reale Personen gebunden. Unter <strong>User & Gruppen</strong> ist im Reiter <strong>Rollen & Ämter</strong> transparent ersichtlich, welche Person aktuell welches Amt bekleidet und welche offenen Aufgaben mit diesem Profil verknüpft sind.</p>
              <p className="text-sm text-purple-800">Bei einem personellen Wechsel im Vorstand nutzen Administratoren im Reiter <strong>Vorstand</strong> den <strong>Aufgabenübergabe-Assistenten</strong>. Dieser Prozess erlaubt es, alle noch offenen Aufgaben, Ämter und Dauer-Routinen der ausscheidenden Person gesammelt und kontrolliert an den Nachfolger zu übertragen. So wird sichergestellt, dass keine Verantwortlichkeit im Verein verwaist.</p>
            </div>
          </HelpSection>

          {/* =====================================================================
              WELT 3: SYSTEM, RECHTE & DATENSICHERUNG (ADMINISTRATOREN 1-3 PERS.)
             ===================================================================== */}

          <HelpSection id="security" title="Teil 8: Sicherheit, Rechte & Berechtigungs-Matrix" icon={Lock} audience="admin">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Zur Steuerung der Zugriffsrechte, Pflege des Vereins-Adressbuchs und Einhaltung des Datenschutzes (DSGVO & Jugendschutz).</p>

            <p className="mb-4 text-sm leading-relaxed">Im Menü <strong>User & Gruppen</strong> (Bereich <em>Verein & Rechte</em>) verwalten Administratoren die Vereinsstruktur über fünf klar getrennte Reiter: <strong>Mitglieder & Helfer</strong> (Adressbuch & CSV-Import), <strong>Teams & Gruppen</strong> (Mannschaften, Stammkader & Heimhallen), <strong>Ehrungen & Jubiläen</strong>, <strong>Vorstand</strong> (aktive App-Verantwortliche) sowie <strong>Rollen & Ämter</strong>.</p>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-2">Die Berechtigungs-Matrix (Rollen-Profile)</h4>
              <p className="text-sm text-blue-800 mb-2">Über den Button <strong>Berechtigungs-Matrix</strong> steuern Administratoren zentral, welche Rolle (z.B. <em>ADMIN</em>, <em>Vorstand</em>, <em>Bereichsleiter</em>, <em>Mannschaftsführer / Trainer</em>, <em>Mitglied</em>) welche Module sehen und bearbeiten darf.</p>
              <ul className="list-disc pl-5 text-sm text-blue-800 space-y-1">
                <li><strong>App-Nutzer verwalten (Logins):</strong> Die höchste administrative Stufe. Erlaubt das Anlegen von Vorstands-Zugängen und das Anpassen der Berechtigungs-Matrix (sollte auf 1–3 Personen begrenzt sein).</li>
                <li><strong>Mitglieder verwalten (Adressbuch):</strong> Erlaubt das Pflegen der Mitgliederliste, den CSV-Import sowie das Einrichten von Mannschaften.</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-red-900 mb-2">Zweistufige DSGVO- & Jugendschutz-Firewall</h4>
              <p className="text-sm text-red-800 mb-2">Das System schützt sensible Mitgliederdaten vollautomatisch im Hintergrund:</p>
              <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                <li><strong>Jugendschutz:</strong> Kinder und Jugendliche (Status <em>JUGEND</em>) sind nur für Nutzer sichtbar, deren Rollen-Profil das Recht <strong>"Jugend-Daten sehen"</strong> (z.B. Jugendtrainer/Vorstand) oder <em>Mitglieder verwalten</em> besitzt.</li>
                <li><strong>Passiv-Mitglieder-Schutz:</strong> Passive Mitglieder werden für normale Nutzer komplett ausgeblendet und sind nur mit dem Recht <strong>"Ehrungen sehen"</strong> (für das Jubiläums-Radar) sichtbar.</li>
                <li><strong>Opt-In Adressbuch:</strong> Kontaktdaten aktiver Mitglieder (Telefon/E-Mail) werden anderen normalen Mitgliedern nur angezeigt, wenn beide Seiten im DSGVO-Clickwrap zugestimmt haben.</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-green-900 mb-2">DSGVO Self-Service & Automatische Änderungs-Meldung</h4>
              <p className="text-sm text-green-800">Ändert ein Mitglied seine Kontaktdaten (z.B. neue Handynummer oder Adresse) selbstständig über <strong>Mein Profil</strong>, erzeugt das System automatisch eine Info-Aufgabe für alle Administratoren mit dem Recht <em>Mitglieder verwalten</em>. So können die neuen Stammdaten zuverlässig in externe Hauptsysteme (Mitgliederverwaltung / Verband) übernommen werden.</p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg">
              <h4 className="font-bold text-indigo-900 mb-2">Datensicherung im Alltag: Der Papierkorb (Soft-Delete)</h4>
              <p className="text-sm text-indigo-800">Gelöschte Agenda-Punkte oder Aufgaben werden nicht sofort physisch vernichtet, sondern erhalten intern den Status "TRASH" und werden aus der normalen Ansicht ausgeblendet. Administratoren mit dem Recht <strong>"Alles löschen / Papierkorb"</strong> können versehentlich gelöschte Elemente jederzeit wiederherstellen oder endgültig bereinigen.</p>
            </div>
          </HelpSection>

          <HelpSection id="backup" title="Teil 9: Backup & Restore sowie Data Explorer" icon={Database} audience="admin">
            <p className="font-bold text-lg mb-4 text-blue-900">Wofür ist das da? Für die vollständige lokale Sicherung aller Vereinsdaten, tabellarische Daten-Auswertungen und das Klonen der Datenbank in eine Testumgebung (Staging).</p>

            <p className="mb-4 text-sm leading-relaxed">Unter <strong>Reports & Statistik</strong> stehen neben dem Vorstands-Dashboard zwei leistungsstarke Admin-Werkzeuge zur Verfügung: der <strong>Data Explorer</strong> und das Modul <strong>Backup & Restore</strong>.</p>

            <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-indigo-900 mb-2">Der Data Explorer (Tabellen-Analyse & Excel/CSV-Export)</h4>
              <p className="text-sm text-indigo-800">Im Reiter <strong>Data Explorer</strong> können Sie jede Datenbank-Tabelle (Aufgaben, Mitglieder, Sitzungen, Termine, Umfrage-Antworten etc.) wie in einer Tabellenkalkulation durchsuchen, nach beliebigen Spalten filtern und sortieren. Über das <strong>Ketten-Symbol (Smart-Mapping)</strong> im Spaltenkopf lassen sich interne IDs mit einem Klick in lesbare Klarnamen (z.B. echte Spielernamen oder Mannschaftsnamen) übersetzen und anschließend direkt in die Zwischenablage (für Excel) kopieren oder als CSV-Datei exportieren.</p>
            </div>

            <div className="space-y-4 mb-8 text-sm">
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm border-l-4 border-l-emerald-500">
                <strong className="text-emerald-700 block mb-1">JSON-Export (1-Klick Komplett-Backup)</strong>
                Im Reiter <strong>Backup & Restore</strong> liest das System alle 12 Datenbank-Tabellen (Mitglieder, Teams, Termine, Kalender-Abos, ToDos, Aufstellungen, Umfragen, PINs etc.) vollständig aus und speichert sie als <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.json</code> Datei lokal auf Ihrem Mac oder iCloud Drive.
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm border-l-4 border-l-emerald-500">
                <strong className="text-emerald-700 block mb-1">Automatischer 12:00-Uhr Backup-Reminder</strong>
                Bei Vorstandsmitgliedern kann im Nutzerprofil das Häkchen für die tägliche Backup-Erinnerung gesetzt werden. Wurde am aktuellen Tag noch keine Sicherung durchgeführt, blendet die App ab 12:00 Uhr mittags oben ein Hinweisbanner ein, über das die Sicherung mit einem einzigen Klick heruntergeladen werden kann.
              </div>
            </div>

            <h4 className="font-bold text-gray-900 text-lg mb-3 mt-6">Restore & Testumgebungen (Staging)</h4>
            <p className="text-sm mb-4">Backup-Dateien lassen sich jederzeit wieder in die aktuell verbundene Datenbank einspielen (die aktive Datenbank-ID wird zur Sicherheit im Footer und vor dem Import angezeigt). Sie haben zwei Modi zur Auswahl:</p>
            
            <ul className="space-y-4 list-none pl-0 text-sm mb-8">
              <li className="flex items-start">
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">Merge</span>
                <div><strong>Ergänzen & Aktualisieren.</strong> Vorhandene Datensätze mit gleicher ID werden aktualisiert, fehlende hinzugefügt. Datensätze, die nur in der Zieldatenbank existieren, bleiben erhalten.</div>
              </li>
              <li className="flex items-start">
                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold mr-3 shrink-0">Wipe & Replace</span>
                <div><strong>Test-Datenbank klonen (1:1 Spiegel).</strong> Das System leert vor dem Einspielen alle 12 Tabellen der Zieldatenbank komplett. Ideal, um eine separate Testumgebung exakt auf den Stand der Produktionsdatenbank zu bringen.</div>
              </li>
            </ul>

            <div className="bg-blue-50 border border-blue-100 p-5 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-2">Wichtig: Zuweisungen und die E-Mail-Brücke</h4>
              <p className="text-sm text-blue-800">
                Da Firebase die Login-Konten (Authentifizierung) technisch von der Datenbank trennt, besitzt eine separate Testumgebung andere interne Login-IDs als das Produktivsystem. 
                <br /><br />
                <strong>Das ist jedoch kein Problem:</strong> PapaToDo verknüpft jedes Konto beim Login automatisch über die <strong>E-Mail-Adresse</strong> mit dem gespeicherten Vereinsprofil. Nach dem Spiegeln eines Backups in die Test-Datenbank melden Sie sich dort einfach mit derselben E-Mail-Adresse an – alle Zuweisungen, Rechte und Aufgaben greifen sofort eins zu eins.
              </p>
            </div>
          </HelpSection>

        </div>
      </div>
    </div>
  );
};
// --- END OF FILE ---