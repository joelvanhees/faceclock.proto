# faceclock.proto

Eine einfache p5.js-Prototyp-Umgebung für ein digitales Uhr-Interface. Öffne `index.html` in einem Browser, um die Visualisierung zu starten. Das Sketch arbeitet rein clientseitig – es wird kein Build- oder Node-Setup benötigt.

## Entwicklung

1. Starte einen lokalen Webserver (z. B. `python -m http.server`) im Projektverzeichnis.
2. Öffne `http://localhost:8000` in einem Browser.
3. Aktualisiere bei Codeänderungen einfach die Seite.

Die Visualisierung zeigt:

- Eine stündliche Blase mit Punktmatrix-Ziffern (oder Text-Fallback, wenn die Schrift nicht vorhanden ist).
- Flüssige Blasen, die jede Sekunde entstehen und beim nächsten Blasensprung platzen.
- Eine Spiral-Animation künftiger Minutenwerte.
- Debug-Anzeige der aktuellen Uhrzeit inklusive Prozentanteilen von Stunde, Minute und Sekunde.

> Hinweis: Die Schrift `fonts/Zain-Regular.ttf` ist optional. Ist sie nicht vorhanden, wird automatisch auf eine Standardschrift mit Vektor-Punktanzeige verzichtet.
