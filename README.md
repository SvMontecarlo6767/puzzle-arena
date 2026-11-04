# 🧩 Puzzle Arena

Tägliche Puzzles im Wettbewerb mit Freunden. Eigene Ansicht = der Puzzle-Tracker 1:1, dazu Rangliste, Tagesranking, Duell, Reaktionen & Kommentare.

- **Hosting:** GitHub Pages (`index.html` im Root)
- **Backend:** Firebase (Auth E-Mail/Passwort + Firestore), Projekt `puzzle-arena-c0f1a`
- **Regeln:** `firestore.rules` (in der Firebase-Konsole unter Firestore → Regeln einfügen)
- **Bauen:** `python3 tools/build.py` erzeugt `index.html` aus `src/` (Tracker-Template + `arena.js` + `arena.css`)
- **Tests:** `test/run_ui.py` (mit simuliertem Firebase, kein Netzwerk nötig)

## Datenschutz-Modell
| Pfad | Inhalt | Wer liest |
|---|---|---|
| `users/{uid}/data/*` | alle Tracker-Daten inkl. Notiz, Lösungs-Album, Meilensteine | nur Besitzer |
| `pub/{uid}/months/*` | nur Score / ✓ / ✗ / Tipp je Spiel und Tag | Gruppenmitglieder |
| `members/*`, `groups/main` | Spitzname, Einladungscode | Gruppenmitglieder |
| `feed/*` | Reaktionen & Kommentare | Gruppenmitglieder |
