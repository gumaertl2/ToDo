// src/features/Help/HelpView.tsx
import React, { useState } from 'react';
import { BookOpen, Target, Rocket, Calendar, ListTodo, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

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
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mr-4">
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          {isOpen ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
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
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <div className="bg-blue-600 p-3 rounded-xl text-white mr-4 shadow-lg">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Handbuch & Leitfaden</h1>
          <p className="text-lg text-gray-500 mt-1">Der digitale Assistent für euren Vereinsvorstand</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        <AccordionItem id="vision" title="Teil 1: Worum geht es bei PapaToDo?" icon={Target}>
          <p className="font-medium text-lg mb-4">Jeder Verein lebt vom Engagement seiner Mitglieder. Aber seien wir ehrlich: Die Vorstandsarbeit kann manchmal ganz schön mühsam sein.</p>
          <p>Bei jedem Verein gibt es immer wiederkehrende Routinetätigkeiten und spezielle Einmalaufgaben. Normalerweise läuft das so ab: Diese Aufgaben werden in Besprechungen verteilt und am Ende in einem langen Protokoll dokumentiert. Jeder bekommt dieses Protokoll zugeschickt, muss mühsam seine eigenen Aufgaben heraussuchen und notieren.</p>
          <p>Im nächsten Meeting geht das Spiel von vorne los: Man muss klären, ob <em>alle</em> offenen Aufgaben (die neuen Einmalaufgaben und die alten Routinen) aus <em>allen</em> vorherigen Protokollen eigentlich erledigt wurden. Das kostet Nerven, kostet Zeit und oft werden Aufgaben schlichtweg vergessen, übersehen oder ewig vor sich hergeschoben.</p>
          
          <h3 className="text-blue-800 font-bold mt-6 mb-3">Genau hier unterstützt PapaToDo!</h3>
          <p>Nach jeder Sitzung weiß sofort jeder, was er zu tun hat und bis wann. Das Programm hilft euch dabei, das Meeting effizient vorzubereiten, zügig durchzuführen und die verteilten Aufgaben verlässlich zum Erfolg zu führen.</p>
          
          <ul className="space-y-2 mt-4 list-none pl-0">
            <li className="flex items-start"><strong className="mr-2 text-blue-600">• Keine Zettelwirtschaft mehr:</strong> Das Kanban-Board gibt jedem Verantwortlichen sofort einen schnellen Überblick, was er aktuell machen muss.</li>
            <li className="flex items-start"><strong className="mr-2 text-blue-600">• Das Gedächtnis des Vereins:</strong> Jeder kann zu jederzeit schnell alte Protokolle ansehen, sämtliche vergangenen Beschlüsse finden und ist somit immer up to date.</li>
            <li className="flex items-start"><strong className="mr-2 text-blue-600">• Der rote Faden:</strong> Wenn eine Sitzung endet, nimmt PapaToDo alle Aufgaben, die noch nicht zu 100 % erledigt wurden, und schiebt sie automatisch auf die Agenda der nächsten Sitzung. Nichts fällt mehr unter den Tisch!</li>
          </ul>
        </AccordionItem>

        <AccordionItem id="quickstart" title="Teil 2: Schnellstart-Guide" icon={Rocket}>
          <p className="mb-6">Du übernimmst ein neues Amt oder bist neu im System? Keine Panik, in drei Schritten bist du voll einsatzbereit:</p>
          
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">1</span> Entdecke dein Cockpit (Das Dashboard)</h4>
              <p className="mt-2 text-sm text-gray-600">Sobald du dich einloggst, siehst du dein Dashboard. Hier zeigt dir die App sofort an, was <em>für dich</em> brennt. Fällige Aufgaben leuchten auf und du hast direkten Zugriff auf die nächsten anstehenden Sitzungen deines Vereins.</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">2</span> Kenne deine Pflichten (Stellenbeschreibung)</h4>
              <p className="mt-2 text-sm text-gray-600">Gehe im Menü auf <strong>"User & Gruppen"</strong> und wechsle in den Reiter <strong>"Rollen & Ämter"</strong>. Klicke bei deinem Amt auf das kleine <code>+/-</code> Symbol. Hier öffnet sich deine persönliche, automatisch erstellte Stellenbeschreibung. Du siehst genau, welche Daueraufgaben das ganze Jahr über bei dir liegen.</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
              <h4 className="font-bold text-blue-800 text-lg flex items-center"><span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">3</span> Schiebe deine Aufgaben (Kanban-Board)</h4>
              <p className="mt-2 text-sm text-gray-600">Unter <strong>"Meine ToDos"</strong> findest du dein visuelles Aufgaben-Board. Eine Aufgabe ist neu? Sie steht links unter <em>OFFEN</em>. Du fängst an daran zu arbeiten? Ziehe die Karte mit der Maus in die Mitte auf <em>IN ARBEIT</em>. Du bist fertig? Schiebe sie nach rechts auf <em>ERLEDIGT</em>. Der Fortschrittsbalken springt auf 100 %!</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="meetings" title="Teil 3: Sitzungen & Protokolle führen" icon={Calendar}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900">Wie bereite ich ein neues Meeting vor?</h4>
              <p className="mt-1 text-sm">Klicke in der Event-Übersicht auf "Neue Sitzung anlegen". Die Sitzung ist zunächst ein "Entwurf" und nur für dich sichtbar. Sammle Themen, importiere Vorlagen oder trage Kollegen als Verantwortliche ein. Bist du fertig, klicke auf "Agenda veröffentlichen", damit alle Teilnehmer sie sehen.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Wie schließe ich ein Protokoll ab?</h4>
              <ol className="mt-2 text-sm space-y-1 list-decimal pl-4">
                <li>Klicke am Ende des Protokolls auf <strong>"Datum festlegen & Protokoll schließen"</strong>.</li>
                <li>Wähle das Datum für das <em>nächste</em> Meeting eurer Serie aus.</li>
                <li>Die App friert das aktuelle Protokoll nun ein (revisionssicheres Dokument).</li>
                <li>Du landest direkt in der taufrischen Agenda für das nächste Meeting, inklusive aller nicht beendeten Aufgaben.</li>
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Wo finde ich alte Protokolle und Beschlüsse?</h4>
              <p className="mt-1 text-sm">Öffne deine aktuelle Sitzung (z. B. "Vorstandssitzung"). Neben der großen Überschrift siehst du ein kleines <strong>Uhr-Icon</strong>. Fahre mit der Maus oder dem Finger darüber, und du siehst die komplette Historie genau dieser Besprechungsreihe.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="tasks" title="Teil 4: Aufgaben & Helfer managen" icon={ListTodo}>
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-gray-900">Wie weise ich Aufgaben an externe Helfer zu?</h4>
              <p className="mt-1 text-sm">Ihr habt fleißige Helfer, die keinen Zugang zur App haben? Lege sie unter "User & Gruppen" als <em>Externe Helfer</em> an. Danach kannst du ihnen in jeder Sitzung oder Aufgabe einfach die Verantwortung zuweisen. Du behältst in der App den Überblick für sie.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900">Wie baue ich wiederkehrende Routinen?</h4>
              <p className="mt-1 text-sm">Gehe in die <strong>Vorlagen-Bibliothek</strong>. Lege eine neue Aufgabe an und markiere sie als "Routine" (z. B. <em>Jährlich</em>). Weise sie der Gruppe "Kassier" zu. Ab sofort taucht diese Routine automatisch in der Stellenbeschreibung des Kassierers auf und wird pünktlich zur Sitzung in die Agenda gezogen.</p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem id="security" title="Teil 5: Sicherheit & Datenschutz" icon={ShieldCheck}>
          <div>
            <h4 className="font-bold text-gray-900">Wie halte ich die Vereinsdaten DSGVO-konform sauber?</h4>
            <p className="mt-2 text-sm">Da externe Helfer oft nur für ein bestimmtes Fest aushelfen, speichert die App abgelaufene Helfer-Profile. Gehe als Admin im Bereich "Externe Helfer" auf den gelben Button <strong>"DSGVO-Bereinigung prüfen"</strong>. Die App zeigt dir alle "Karteileichen" an, die du mit einem Klick sicher und datenschutzkonform aus dem System löschen kannst.</p>
          </div>
        </AccordionItem>
      </div>
    </div>
  );
};
// Exakte Zeilenzahl: 133