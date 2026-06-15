# VM 2026 Tippekonkurransen

## Oppsett på GitHub Pages

1. Opprett GitHub-konto på github.com
2. Opprett nytt repository: klikk "+" → "New repository"
   - Navn: `vm2026`
   - Synlighet: **Public**
   - Klikk "Create repository"
3. Last opp alle filene i denne mappen:
   - `index.html`
   - `app.js`
   - `config.js`
4. Gå til Settings → Pages → Source: "Deploy from branch" → branch: `main` → Save
5. Siden er live på: `https://BRUKERNAVN.github.io/vm2026`

## Legg til de siste deltakerne
Åpne `config.js` og legg til de siste 2 deltakerne i `participants`-arrayen.

## Poengsystem som er implementert
- ✅ Eksakt målscore (2p)
- ✅ Riktig H/U/B (3p)
- 🔄 Gruppeposisjoner (krever standings-data, kommer i neste versjon)
- 🔄 Sluttspillpoeng (krever live bracket-data)
