// 2026-04-14 20:00 - FIX: In-App Handbuch mit neuen Features (WhatsApp, ICS, Schloss) synchronisiert
// src/features/Help/HelpView.tsx
import React, { useState } from 'react';
import { BookOpen, Target, Rocket, Calendar, ListTodo, ShieldCheck, ChevronDown, ChevronUp, Layers, Printer, Smartphone, MessageCircle } from 'lucide-react';

export const HelpView: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>('vision');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const AccordionItem = ({ id, title, icon: Icon, children }: any) => {
    const isOpen = openSection === id;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4 overflow-hidden transition-all">
        <button 
          onClick={() => toggleSection(id)} 
          className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-4 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          {isOpen ? <ChevronUp className="w-6 h-6 text-gray-400 shrink-0 ml-4" /> : <ChevronDown className="w-6 h-6 text-gray-400 shrink-0 ml-4" />}
        </button>
        {isOpen && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/50 prose prose-blue max-w-none text-gray-700">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full pb-safe">
      <div className="flex items-center mb-8 px-2 md:px-0">
        <div className="bg-blue-600 p-3 rounded-xl text-white mr-4 shadow-lg shrink-0">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Handbuch & Leitfaden</h1>
          <p className="text-base md:text-lg text-gray-500 mt-1">Der digitale Assistent für euren Vereinsvorstand</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-0 pb-10 custom-scrollbar">
        <AccordionItem id="vision" title="Teil 1: Worum geht es bei PapaToDo?" icon={Target}>
          <p className="font-medium text-lg mb-4">Jeder Verein lebt vom Engagement seiner Mitglieder. Aber seien wir ehrlich: Die Vorstandsarbeit kann manchmal ganz schön mühsam sein.</p>
          <p className="mb-3">Bei jedem Verein gibt es immer wiederkehrende Routinetätigkeiten und spezielle Einmalaufgaben. Normalerweise läuft das so ab: Diese Aufgaben werden in Besprechungen verteilt und am Ende in einem langen Protokoll dokumentiert. Jeder bekommt dieses Protokoll zugeschickt, muss mühsam seine eigenen Aufgaben heraussuchen und notieren.</p>
          <p className="mb-6">Im nächsten Meeting geht das Spiel von vorne los: Man muss klären, ob <em>alle</em> offenen Aufgaben (die neuen Einmalaufgaben und die alten Routinen) aus <em>allen</em> vorherigen Protokollen eigentlich erledigt wurden. Das kostet Nerven, kostet Zeit und oft werden Aufgaben schlichtweg vergessen, übersehen oder ewig vor sich hergeschoben.</p>
          
          <h3 className="text-blue-800 font-bold mt-6 mb-3 text-lg">Genau hier unterstützt PapaToDo!</h3>
          <p className="mb-4">Nach jeder Sitzung weiß sofort jeder, was er zu tun hat und bis wann. Das Programm hilft euch dabei, das Meeting effizient vorzubereiten, zügig durchzuführen und die verteilten Aufgaben verlässlich zum Erfolg zu führen.</p>
          
          <ul className="space-y-3 mt-4 list-none pl-0">
            <li className="flex items-start"><strong className="mr-2 text-blue-600 shrink-0">• Keine Zettelwirtschaft mehr:</strong> Das Kanban-Board gibt jedem Verantwortlichen sofort einen schnellen Überblick, was er aktuell machen muss.</li>
            <li className="flex items-start"><strong className="mr-2 text-blue-600 shrink-0">• Das Gedächtnis des Vereins:</strong> Jeder kann zu jederzeit schnell alte Protokolle ansehen, sämtliche vergangenen Beschlüsse finden und ist somit immer up to date.</li>
            <li className="flex items-start"><strong className="mr-2 text-blue-600 shrink-0">• Der rote Faden:</strong> Wenn eine Sitzung endet, nimmt PapaToDo alle Aufgaben, die noch nicht zu 100 % erledigt wurden, und schiebt sie automatisch auf die Agenda der nächsten Sitzung. Nichts fällt mehr unter den Tisch!</li>
          </ul>
        </AccordionItem>

        <AccordionItem id="quickstart" title="Teil 2: Schnellstart-Guide" icon={Rocket}>
          <p className="mb-6">Du übernimmst ein neues Amt oder bist neu im System? Keine Panik, in drei Schritten bist du voll einsatzbereit:</p>
          
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm shrink-0">1</span> Entdecke dein Cockpit (Das Dashboard)</h4>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">Sobald du dich einloggst, siehst du dein Dashboard. Hier zeigt dir die App sofort an, was <em>für dich</em> brennt. Fällige Aufgaben leuchten auf und du hast direkten Zugriff auf die nächsten anstehenden Sitzungen deines Vereins.<br/>
              <strong className="text-green-700">Neu:</strong> Ein grüner Warn-Banner ganz oben zeigt dir sofort an, ob du heute noch WhatsApp-Erinnerungen verschicken musst!</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm shrink-0">2</span> Kenne deine Pflichten (Stellenbeschreibung)</h4>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">Gehe im Menü auf <strong>"User & Gruppen"</strong> und wechsle in den Reiter <strong>"Rollen & Ämter"</strong>. Klicke bei deinem Amt auf das kleine <code>+/-</code> Symbol. Hier öffnet sich deine persönliche, automatisch erstellte Stellenbeschreibung. Du siehst genau, welche Daueraufgaben das ganze Jahr über bei dir liegen (z. B. "↻ Monatlicher Platz-Check") und kannst offene Aufgaben direkt anklicken und bearbeiten.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm shrink-0">3</span> Schiebe deine Aufgaben (Kanban-Board)</h4>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">Unter <strong>"Meine ToDos"</strong> findest du dein visuelles Aufgaben-Board. <br/>
              • Eine Aufgabe aus der letzten Sitzung ist neu? Sie steht links unter <em>OFFEN</em>.<br/>
              • Du fängst an daran zu arbeiten? Ziehe die Karte einfach mit der Maus in die Mitte auf <em>IN ARBEIT</em>.<br/>
              • Du bist fertig? Schiebe sie nach rechts auf <em>ERLEDIGT</em>. Der Fortschrittsbalken springt auf 100 % und beim nächsten Meeting wissen alle Vorstände sofort Bescheid!</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="whatsapp" title="Teil 3: WhatsApp Erinnerungen & Snooze" icon={MessageCircle}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wie verschicke ich Erinnerungen?</h4>
              <p className="mt-2 text-sm leading-relaxed">Klicke im Seitenmenü auf <strong>"Erinnerungen"</strong> (markiert mit einem roten Punkt, wenn etwas fällig ist). Hier siehst du alle Aufgaben, Sitzungen oder Kalender-Abos, für die du als "Erinnerer" eingetragen bist.</p>
              <p className="mt-2 text-sm leading-relaxed">Ein Klick auf "Senden & Erledigt" öffnet automatisch WhatsApp (Web oder App) mit einem fertigen Text inklusive aller Details. Der Termin gilt danach als erinnert. Möchtest du dir die Aufgabe oder Sitzung vorher nochmal ansehen? Klicke einfach auf den linken Teil der Erinnerungs-Karte, um direkt dorthin zu springen!</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Was ist die Snooze-Funktion ("Erneut erinnern")?</h4>
              <p className="mt-2 text-sm leading-relaxed">Manchmal möchtest du jemanden frühzeitig erinnern, aber kurz vorher noch einmal nachhaken. Dafür gibt es im Erinnerungs-Menü die Funktion <strong>"Senden & Erinnern in X Tagen"</strong>. Die App schlägt dir automatisch die halbe verbleibende Zeit vor (z.B. "in 3 Tagen"). Klickst du darauf, geht die WhatsApp-Nachricht raus, aber die Erinnerung verschwindet nur temporär und taucht in exakt X Tagen wieder bei dir im Dashboard auf.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="calendar" title="Teil 4: Vereinskalender, Spielplan & Dienste" icon={Calendar}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 flex items-center text-base"><Layers className="w-5 h-5 mr-2 text-blue-600 shrink-0" />Wie unterscheide ich Termine und Dienste?</h4>
              <p className="mt-2 text-sm leading-relaxed">Der Kalender unterscheidet zwischen einfachen <strong>Terminen</strong> (z. B. Vorstandssitzung, Sommerfest) und <strong>Diensten</strong>. Dienste sind wiederkehrende Schicht- oder Dienstpläne (z. B. der wöchentliche Hallendienst). Mit dem <strong>Dienstplan-Generator</strong> kannst du eine ganze Serie für Monate im Voraus mit einem Klick anlegen. Klickst du später auf einen Termin aus dieser Serie, kannst du die gesamte Serie auf einmal bearbeiten!</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 flex items-center text-base">🔒 Sichtbarkeit: Was bedeutet das Schloss-Symbol?</h4>
              <p className="mt-2 text-sm leading-relaxed">Wenn du eine Sitzung oder einen Termin anlegst, gibt es die Option <strong>"Sichtbarkeit: Auf Homepage zeigen"</strong> (mit einem kleinen 🌐 Globe-Icon). Setzt du diesen Haken nicht, erscheint im vereinsinternen Kalender ein kleines Schloss (🔒) vor dem Titel. Das bedeutet: Nur Vorstände in der App sehen diesen Termin. Auf eurer öffentlichen Vereins-Homepage (Public Kalender) bleibt dieser Termin komplett unsichtbar.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 flex items-center text-base"><ListTodo className="w-5 h-5 mr-2 text-blue-600 shrink-0" />Was ist der Spielplan?</h4>
              <p className="mt-2 text-sm leading-relaxed">Nutze oben rechts in der Kalenderansicht den Schalter "Spielplan", um den Kalender in eine extrem übersichtliche und kompakte Listenform zu verwandeln. Leere Tage ohne Termine kannst du über die Checkbox "Leere Tage ausblenden" einfach verstecken.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 flex items-center text-base"><Printer className="w-5 h-5 mr-2 text-blue-600 shrink-0" />Wie kann ich drucken oder exportieren?</h4>
              <p className="mt-2 text-sm leading-relaxed">Klicke in der Menüleiste auf <strong>"Export / Druck"</strong>. Es öffnet sich der Profi-Dialog: Wähle hier exakt aus, ob du nur Termine, nur Dienste oder beides exportieren möchtest. Stelle den gewünschten Zeitraum ein (z. B. das 2. Halbjahr) und lade die Daten entweder als ICS-Datei für dein Handy/Outlook herunter, oder drucke eine tintensparende, saubere A4-Liste für das schwarze Brett aus.</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <h4 className="font-bold text-gray-900 flex items-center text-base"><Calendar className="w-5 h-5 mr-2 text-blue-600 shrink-0" />Wie binde ich externe Kalender ein (ICS-Abos & Dateien)?</h4>
              <p className="mt-2 text-sm leading-relaxed">Ihr habt einen Verbandsspielplan oder einen externen Müllkalender? Klicke im Kalender auf <strong>"Abos"</strong>. Du hast hier zwei Möglichkeiten:</p>
              <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
                <li><strong>Web-URL:</strong> Gib einen Link ein. Die App synchronisiert den Kalender automatisch im Hintergrund.</li>
                <li><strong>Lokale Datei:</strong> Lade eine fertige <code>.ics</code> Datei von deinem PC hoch. Die Termine werden fest importiert.</li>
              </ol>
              <p className="mt-2 text-sm leading-relaxed font-medium text-green-700">Das Beste: Du kannst für diese Abos eine automatische <strong>WhatsApp-Erinnerung</strong> einstellen! So ploppt z.B. einen Tag vor dem Papiermüll automatisch eine Erinnerungs-Karte bei dir auf, inklusive deinem Zusatztext "Bitte Müll rausstellen!".</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 flex items-center text-base">Kontrast und Farben</h4>
              <p className="mt-2 text-sm leading-relaxed">Der Kalender ist smart: Wählst du für einen Termin oder ein Abo ein helles Gelb als Hintergrund, schaltet die App die weiße Schriftfarbe automatisch auf ein gut lesbares Dunkelgrau um.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="mobile" title="Teil 5: Mobile Bedienung & PWA" icon={Smartphone}>
          <div className="space-y-4">
            <p className="text-base font-medium">PapaToDo ist als echte PWA (Progressive Web App) für dein Smartphone optimiert:</p>
            <ul className="space-y-4 list-none pl-0 text-sm">
              <li className="flex items-start">
                <strong className="mr-2 text-blue-600 shrink-0">• Wischgesten (Swipe):</strong> 
                <span className="leading-relaxed">Du kannst im Kalender einfach mit dem Finger nach links oder rechts wischen, um entspannt zwischen den Monaten oder Wochen zu blättern.</span>
              </li>
              <li className="flex items-start">
                <strong className="mr-2 text-blue-600 shrink-0">• Datums-Sprung:</strong> 
                <span className="leading-relaxed">Klicke im Kalender in der oberen Leiste direkt auf das angezeigte Datum (z. B. "März 2026"). Daraufhin öffnet sich das native Datums-Scrollrad deines Handys und du kannst blitzschnell in ein ganz anderes Jahr springen.</span>
              </li>
              <li className="flex items-start">
                <strong className="mr-2 text-blue-600 shrink-0">• Quick-Home:</strong> 
                <span className="leading-relaxed">Das kleine Haus-Icon bringt dich jederzeit sofort zurück zum heutigen Tag.</span>
              </li>
            </ul>
          </div>
        </AccordionItem>

        <AccordionItem id="meetings" title="Teil 6: Sitzungen & Protokolle führen" icon={Layers}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wie bereite ich ein neues Meeting vor?</h4>
              <p className="mt-2 text-sm leading-relaxed">Klicke in der Event-Übersicht auf "Neue Sitzung anlegen". Die Sitzung ist zunächst ein "Entwurf" und nur für dich sichtbar (und trägt das 🔒-Symbol im Kalender). Du kannst nun entspannt die Themen sammeln, Vorlagen importieren oder Kollegen als Verantwortliche eintragen. Bist du fertig, setze den Haken bei "Auf Homepage zeigen" oder klicke auf "Agenda veröffentlichen", damit alle Teilnehmer sie auf ihrem Dashboard sehen und sich vorbereiten können.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wie schließe ich ein Protokoll ab?</h4>
              <ol className="mt-3 text-sm space-y-2 list-decimal pl-5">
                <li className="leading-relaxed">Klicke am Ende des Protokolls auf <strong>"Datum festlegen & Protokoll schließen"</strong>.</li>
                <li className="leading-relaxed">Wähle das Datum für das <em>nächste</em> Meeting eurer Serie aus.</li>
                <li className="leading-relaxed">Die App friert das aktuelle Protokoll nun ein. Niemand kann es mehr verändern – es ist ein revisionssicheres Dokument.</li>
                <li className="leading-relaxed">Du landest danach direkt in der taufrischen Agenda für das nächste Meeting. Alle Aufgaben, die ihr heute nicht geschafft habt, warten dort bereits auf euch!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wo finde ich alte Protokolle und Beschlüsse?</h4>
              <p className="mt-2 text-sm leading-relaxed">Öffne einfach deine aktuelle Sitzung (z. B. "Vorstandssitzung"). Neben der großen Überschrift siehst du ein kleines <strong>Uhr-Icon</strong>. Fahre mit der Maus oder dem Finger darüber, und du siehst die komplette Historie genau dieser Besprechungsreihe.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="tasks" title="Teil 7: Aufgaben & Helfer managen" icon={ListTodo}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wie weise ich Aufgaben an Personen zu?</h4>
              <p className="mt-2 text-sm leading-relaxed">Im Aufgaben-Formular (und bei Sitzungen) gibt es nun zwei getrennte Bereiche für maximale Übersicht:</p>
              <ol className="list-decimal pl-5 mt-2 text-sm space-y-2">
                <li className="leading-relaxed"><strong>Zuständige App-Nutzer & Rollen (Blau):</strong> Hier wählst du aus der Liste die Vorstände oder ganze Ämter (z.B. "Festausschuss") aus.</li>
                <li className="leading-relaxed"><strong>Helfer Extern (Petrol):</strong> Hier wählst du Personen aus eurem Helfer-Pool aus, die keinen eigenen App-Zugang haben.</li>
              </ol>
              <p className="mt-2 text-sm leading-relaxed">So ist sofort klar, ob eine Aufgabe intern in der App bearbeitet wird, oder ob jemand extern (z. B. per WhatsApp) angetriggert werden muss.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-lg">Wie baue ich wiederkehrende Routinen?</h4>
              <p className="mt-2 text-sm leading-relaxed">Gehe in die <strong>Vorlagen-Bibliothek</strong>. Lege eine neue Aufgabe an und markiere sie als "Routine" (z. B. <em>Jährlich</em>). Weise sie der Gruppe "Kassier" zu. Ab sofort taucht diese Routine automatisch in der Stellenbeschreibung des Kassierers auf und wird pünktlich zur Sitzung in die Agenda gezogen.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="security" title="Teil 8: Sicherheit & Datenschutz" icon={ShieldCheck}>
          <div>
            <h4 className="font-bold text-gray-900 text-lg">Wie halte ich die Vereinsdaten DSGVO-konform sauber?</h4>
            <p className="mt-2 text-sm leading-relaxed">Da externe Helfer oft nur für ein bestimmtes Fest aushelfen, speichert die App abgelaufene Helfer-Profile. Gehe als Admin im Bereich "Externe Helfer" auf den gelben Button <strong>"DSGVO-Bereinigung prüfen"</strong>. Die App zeigt dir alle "Karteileichen" an, die du mit einem Klick sicher und datenschutzkonform aus dem System löschen kannst.</p>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
};
// --- END OF FILE 208 Zeilen ---