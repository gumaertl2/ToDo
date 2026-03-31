#!/bin/bash
# Wechselt automatisch in das Verzeichnis, in dem diese Datei liegt. 
cd "$(dirname "$0")" 

# Startet den node server im Hintergrund
echo "Starte den lokalen Server..." 
npm run dev & 

# Wartet 2 Sekunden, damit Vite Zeit zum Starten hat
sleep 2

# Öffnet die lokale Webseite im Standardbrowser
echo "Öffne http://localhost:5173 im Browser..."
open "http://localhost:5173"

# Bringt den Hintergrundprozess wieder in den Vordergrund, 
# damit du den Server mit Strg+C beenden kannst.
wait