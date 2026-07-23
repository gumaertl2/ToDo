// [2026-07-22] - FEATURE: DSGVO Clickwrap Konfiguration. Zentrale Versionierung und Texte für die App-Sichtbarkeit implementiert.
// src/config/dsgvoConfig.ts

export const DSGVO_CONFIG = {
  version: 1,
  
  policyText: `Datenschutzinformation
SC Maisach - Abteilung Tischtennis

Zur Organisation und Aufrechterhaltung des vereinsinternen Spiel- und Trainingsbetriebs erheben und verarbeiten wir personenbezogene Daten unserer Mitglieder. Die Einhaltung der Datenschutzgrundverordnung (DSGVO) hat für uns höchste Priorität. Im Folgenden informieren wir darüber, wie wir mit diesen Daten umgehen.

1. Verantwortliche Stelle
SC Maisach - Abteilung Tischtennis / Abteilungsleitung

2. Zwecke und Rechtsgrundlagen der Verarbeitung
Wir verarbeiten Daten für folgende vereinsinterne Zwecke:
- Stammdaten (Name, Geburtsdatum, Eintrittsdatum): Zwingend erforderlich für Identifikation, Spielberechtigungen, Mannschaftsaufstellungen sowie Meldung beim Bayerischen Tischtennis-Verband (BTTV) und in nuScore (Vertragserfüllung gem. Art. 6 Abs. 1 lit. b DSGVO).
- Kontaktdaten (Telefonnummer & E-Mail-Adresse): Nutzung für die vereinsinterne Kommunikation, Trainingsorganisation und das verbundene Adressbuch innerhalb der Vereins-App „PapaToDo“ (Einwilligung gem. Art. 6 Abs. 1 lit. a DSGVO).
- Geburtsdatum: Zwingend erforderlich für die Einteilung in Altersklassen (z. B. Jugend/Erwachsene), zur Meldung beim Bayerischen Tischtennis-Verband (BTTV) zur Erlangung der Spielberechtigung sowie vereinsintern für Jubiläen (Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO).
- Eintrittsdatum: Verwaltung der Vereinszugehörigkeit und Organisation von Ehrungen (Rechtsgrundlage: Art. 6 Abs. 1 lit. b / f DSGVO).

3. Weitergabe von Daten & Speicherdauer
Eine Weitergabe an Dritte erfolgt nur im Rahmen des offiziellen Liga-Betriebs (BTTV / nuScore). Zu Werbezwecken werden keine Daten weitergegeben. Die Daten werden für die Dauer der Mitgliedschaft gespeichert und anschließend gelöscht, sofern keine gesetzlichen Aufbewahrungsfristen entgegenstehen.

4. Ihre Rechte
Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung. Eine erteilte Einwilligung kann jederzeit formlos widerrufen werden.

Für die Stammdaten und deren Weitergabe an den BTTV/nuScore bedarf es als Grundlage der Mitgliedschaft keiner gesonderten Einwilligung.`,

  consentCheckboxText: "Ich bin damit einverstanden (bei Minderjährigen: als Erziehungsberechtigter stimme ich zu), dass meine Kontaktdaten bzw. die meines Kindes (E-Mail, Telefon) für Absprachen genutzt werden und in der geschlossenen Vereins-App 'PapaToDo' für andere registrierte Mitglieder sichtbar sind."
};
// --- END OF FILE ---