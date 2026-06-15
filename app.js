// VM 2026 Tippekonkurransen — Hovedlogikk

// ─── NAV ───────────────────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.target.classList.add('active');
}

// ─── HJELPEFUNKSJONER ───────────────────────────────────────────────────────

// Normaliser lagnavn mellom Excel (norsk) og API (engelsk)
const TEAM_MAP = {
  'Sør-Afrika': 'South Africa',
  'Sør-Korea': 'South Korea',
  'Bosnia-Hercegovina': 'Bosnia and Herzegovina',
  'Tsjekkia': 'Czech Republic',
  'Elfenbenskysten': "Ivory Coast",
  'Kapp Verde': 'Cape Verde',
  'Marokko': 'Morocco',
  'Skottland': 'Scotland',
  'Sverige': 'Sweden',
  'Tyrkia': 'Turkey',
  'Frankrike': 'France',
  'Spania': 'Spain',
  'Brasil': 'Brazil',
  'Belgia': 'Belgium',
  'Nederland': 'Netherlands',
  'Tyskland': 'Germany',
  'England': 'England',
  'Portugal': 'Portugal',
  'Argentina': 'Argentina',
  'Mexico': 'Mexico',
  'Canada': 'Canada',
  'USA': 'United States',
  'Uruguay': 'Uruguay',
  'Colombia': 'Colombia',
  'Ecuador': 'Ecuador',
  'Paraguay': 'Paraguay',
  'Japan': 'Japan',
  'Kroatia': 'Croatia',
  'Senegal': 'Senegal',
  'Norge': 'Norway',
  'Ghana': 'Ghana',
  'Tunisia': 'Tunisia',
  'Algerie': 'Algeria',
  'Østerrike': 'Austria',
  'Sveits': 'Switzerland',
  'Saudi-Arabia': 'Saudi Arabia',
  'Irak': 'Iraq',
  'Iran': 'Iran',
  'Jordan': 'Jordan',
  'Egypt': 'Egypt',
  'Haiti': 'Haiti',
  'Qatar': 'Qatar',
  'DR Kongo': 'DR Congo',
  'Usbekistan': 'Uzbekistan',
  'New Zealand': 'New Zealand',
  'Australia': 'Australia',
  'Panama': 'Panama',
  'Curaçao': 'Curaçao',
  'Bosnia-Hercegovina': 'Bosnia and Herzegovina',
};

function normTeam(name) {
  if (!name) return '';
  return TEAM_MAP[name] || name;
}

function getResult(home, away) {
  if (home > away) return 'H';
  if (home < away) return 'B';
  return 'U';
}

function flagEmoji(teamName) {
  const flags = {
    'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
    'Canada': '🇨🇦', 'Bosnia and Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
    'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'United States': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
    'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
    'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
    'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
    'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
    'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
    'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
    'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
  };
  return flags[teamName] || '🏳️';
}

// ─── GOOGLE SHEETS CSV FETCH ─────────────────────────────────────────────────
// Sheet name: "2026 World Cup", uses gviz CSV export
async function fetchSheetCSV(sheetId, sheetName = '2026 World Cup') {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Kunne ikke hente ark for ${sheetId}`);
  const text = await resp.text();
  return parseCSV(text);
}

function parseCSV(text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cells.push(cur.trim());
    return cells;
  });
}

// ─── PARSE PREDICTIONS FROM CSV ──────────────────────────────────────────────
// Column indices (0-based) from openpyxl analysis:
// col 0=match#, col 4=home, col 5=home_goals, col 6=away_goals, col 7=away
// Knockout: col 51=R32 pick, col 58=R16, col 65=QF, col 72=SF, col 79=Final/Bronze

function parsePredictions(rows) {
  const groupMatches = [];
  const knockout = { r32: [], r16: [], qf: [], sf: [], final: null, bronze: null, champion: null };

  for (const row of rows) {
    const matchNum = parseInt(row[0]);
    if (isNaN(matchNum) || matchNum < 1 || matchNum > 72) continue;

    const home = row[4]?.replace(/^"|"$/g, '');
    const away = row[7]?.replace(/^"|"$/g, '');
    const hg = parseInt(row[5]);
    const ag = parseInt(row[6]);

    if (home && !isNaN(hg) && !isNaN(ag)) {
      groupMatches.push({
        num: matchNum,
        home,
        away,
        homeGoals: hg,
        awayGoals: ag,
      });
    }

    // Knockout picks
    const pick = (col) => {
      const v = row[col]?.replace(/^"|"$/g, '').trim();
      return v && v !== '' && v !== '0' ? v : null;
    };

    if (pick(51)) knockout.r32.push(pick(51));
    if (pick(58)) knockout.r16.push(pick(58));
    if (pick(65)) knockout.qf.push(pick(65));
    if (pick(72)) knockout.sf.push(pick(72));

    // Final picks at col 79 — win=col80 (1=winner)
    if (pick(79)) {
      const win = row[80]?.replace(/^"|"$/g, '').trim();
      if (win === '1') {
        // This is the match winner
        if (!knockout.champion) knockout.champion = pick(79);
      } else {
        knockout.final = knockout.final || pick(79);
      }
    }
  }

  // Deduplicate
  ['r32','r16','qf','sf'].forEach(r => {
    knockout[r] = [...new Set(knockout[r].map(t => t.trim()).filter(Boolean))];
  });

  return { groupMatches, knockout };
}

// ─── FETCH ACTUAL RESULTS ────────────────────────────────────────────────────
async function fetchActualResults() {
  const resp = await fetch(CONFIG.apiUrl);
  if (!resp.ok) throw new Error('Kunne ikke hente kampresultater');
  const data = await resp.json();

  const results = {}; // key: "Home vs Away" → {home, away, homeGoals, awayGoals, played}
  const standings = {}; // key: group → [{team, w, d, l, gf, ga}]

  for (const match of data.matches) {
    const key = `${match.team1} vs ${match.team2}`;
    const played = match.score !== undefined;
    results[key] = {
      home: match.team1,
      away: match.team2,
      homeGoals: played ? match.score.ft[0] : null,
      awayGoals: played ? match.score.ft[1] : null,
      played,
      group: match.group,
      date: match.date,
      round: match.round,
    };
  }

  return results;
}

// ─── CALCULATE SCORE ─────────────────────────────────────────────────────────
function calculateScore(predictions, actualResults) {
  const P = CONFIG.points;
  let total = 0;
  let breakdown = { exact: 0, result: 0, group: 0, knockout: 0 };

  for (const pred of predictions.groupMatches) {
    const homEn = normTeam(pred.home);
    const awayEn = normTeam(pred.away);

    // Try both orderings
    let actual = actualResults[`${homEn} vs ${awayEn}`]
               || actualResults[`${awayEn} vs ${homEn}`];

    if (!actual || !actual.played) continue;

    const predHome = actual.home === homEn ? pred.homeGoals : pred.awayGoals;
    const predAway = actual.home === homEn ? pred.awayGoals : pred.homeGoals;
    const actHome = actual.homeGoals;
    const actAway = actual.awayGoals;

    // Exact score
    if (predHome === actHome && predAway === actAway) {
      total += P.exactScore;
      breakdown.exact++;
    }
    // Correct result (H/U/B)
    if (getResult(predHome, predAway) === getResult(actHome, actAway)) {
      total += P.correctResult;
      breakdown.result++;
    }
  }

  // Knockout — simplified: we award points per team correctly predicted per round
  // Full group position scoring needs standings data — added in next iteration
  // For now return total
  return { total, breakdown };
}

// ─── STATE ───────────────────────────────────────────────────────────────────
let appState = {
  participants: [],   // [{name, predictions, score, breakdown}]
  actualResults: {},
  loaded: false,
  error: null,
};

// ─── MAIN LOAD ────────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    // 1. Fetch actual results
    const actualResults = await fetchActualResults();
    appState.actualResults = actualResults;

    // 2. Fetch all participants
    const participants = [];
    for (const p of CONFIG.participants) {
      try {
        const rows = await fetchSheetCSV(p.sheetId);
        const predictions = parsePredictions(rows);
        const { total, breakdown } = calculateScore(predictions, actualResults);
        participants.push({
          name: p.name,
          predictions,
          score: total,
          breakdown,
        });
      } catch (e) {
        console.warn(`Feil for ${p.name}:`, e);
        participants.push({
          name: p.name,
          predictions: { groupMatches: [], knockout: {} },
          score: 0,
          breakdown: {},
          error: e.message,
        });
      }
    }

    // Sort by score desc
    participants.sort((a, b) => b.score - a.score);
    appState.participants = participants;
    appState.loaded = true;

    renderAll();
  } catch (e) {
    appState.error = e.message;
    renderError(e.message);
  }
}

function renderError(msg) {
  document.getElementById('leaderboard-content').innerHTML =
    `<div class="error-msg">⚠️ Feil: ${msg}</div>`;
  document.getElementById('status-bar').innerHTML =
    `<span>⚠️ Kunne ikke laste inn data</span>`;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderAll() {
  renderStatusBar();
  renderLeaderboard();
  renderChampionPicks();
  renderMatches();
  renderKnockout();
  renderParticipants();
}

function renderStatusBar() {
  const now = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
  const played = Object.values(appState.actualResults).filter(r => r.played).length;
  const total = Object.values(appState.actualResults).length;
  document.getElementById('status-bar').innerHTML = `
    <span><span class="dot"></span>Live · ${played} av ${total} kamper spilt</span>
    <span>Sist oppdatert: ${now}</span>
  `;
  document.getElementById('last-updated').textContent = '';
}

function renderLeaderboard() {
  const ps = appState.participants;
  if (!ps.length) return;

  const rows = ps.map((p, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const medals = ['🥇','🥈','🥉'];
    const medal = rank <= 3 ? medals[rank-1] : '';
    return `
      <tr>
        <td><span class="rank ${rankClass}">${medal || rank}</span> ${p.name}</td>
        <td><span class="pts-big">${p.score}</span></td>
        <td><span class="badge exact">${p.breakdown.exact || 0} eksakt</span></td>
        <td><span class="badge result">${p.breakdown.result || 0} H/U/B</span></td>
      </tr>
    `;
  }).join('');

  document.getElementById('leaderboard-content').innerHTML = `
    <table class="leaderboard">
      <thead>
        <tr>
          <th>Deltaker</th>
          <th>Poeng</th>
          <th>Eksakt</th>
          <th>Resultat</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderChampionPicks() {
  const picks = appState.participants
    .filter(p => p.predictions.knockout.champion)
    .map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted);font-size:0.9rem">${p.name}</span>
        <span style="font-weight:600">${flagEmoji(normTeam(p.predictions.knockout.champion))} ${p.predictions.knockout.champion}</span>
      </div>
    `).join('');

  document.getElementById('champion-picks').innerHTML = picks ||
    '<p style="color:var(--muted);font-size:0.9rem">Ingen mesterdata tilgjengelig ennå.</p>';
}

function renderMatches() {
  const groups = {
    'Gruppe A': [], 'Gruppe B': [], 'Gruppe C': [], 'Gruppe D': [],
    'Gruppe E': [], 'Gruppe F': [], 'Gruppe G': [], 'Gruppe H': [],
    'Gruppe I': [], 'Gruppe J': [], 'Gruppe K': [], 'Gruppe L': [],
  };

  // Group boundaries from match numbers
  const groupOf = (num) => {
    const g = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    return 'Gruppe ' + g[Math.floor((num - 1) / 6)];
  };

  // Use Sui's predictions as reference for match list
  const ref = appState.participants[0];
  if (!ref) return;

  for (const match of ref.predictions.groupMatches) {
    const group = groupOf(match.num);
    if (!groups[group]) groups[group] = [];

    const homEn = normTeam(match.home);
    const awayEn = normTeam(match.away);
    const actual = appState.actualResults[`${homEn} vs ${awayEn}`]
                || appState.actualResults[`${awayEn} vs ${homEn}`];

    groups[group].push({ match, actual, homEn, awayEn });
  }

  let html = '';
  for (const [groupName, matchList] of Object.entries(groups)) {
    if (!matchList.length) continue;
    html += `<div class="match-group"><div class="group-header">⚽ ${groupName}</div>`;

    for (const { match, actual, homEn, awayEn } of matchList) {
      const played = actual?.played;
      const actH = played ? actual.homeGoals : '–';
      const actA = played ? actual.awayGoals : '–';
      const id = `pred-${match.num}`;

      html += `
        <div class="match-row ${played ? 'played' : ''}" onclick="togglePredictions('${id}')">
          <div class="team-name home">${flagEmoji(homEn)} ${match.home}</div>
          <div class="score-box">
            <span class="score-actual">${actH} – ${actA}</span>
          </div>
          <div class="team-name away">${match.away} ${flagEmoji(awayEn)}</div>
        </div>
        <div id="${id}" class="predictions-panel">
          ${renderPredPanel(match.num, played, actual)}
        </div>
      `;
    }
    html += '</div>';
  }

  document.getElementById('matches-content').innerHTML = html;
}

function renderPredPanel(matchNum, played, actual) {
  const items = appState.participants.map(p => {
    const pred = p.predictions.groupMatches.find(m => m.num === matchNum);
    if (!pred) return `<div class="pred-item"><span class="pred-name">${p.name}</span><span class="pred-score">–</span></div>`;

    let cls = '';
    if (played) {
      // Figure out if prediction was in correct orientation
      const homEn = normTeam(pred.home);
      const awayEn = normTeam(pred.away);
      const flipped = actual && actual.home !== homEn;
      const predH = flipped ? pred.awayGoals : pred.homeGoals;
      const predA = flipped ? pred.homeGoals : pred.awayGoals;

      const exact = predH === actual.homeGoals && predA === actual.awayGoals;
      const correctRes = getResult(predH, predA) === getResult(actual.homeGoals, actual.awayGoals);
      cls = exact ? 'exact' : correctRes ? 'result' : 'wrong';
    }

    return `<div class="pred-item ${cls}">
      <span class="pred-name">${p.name}</span>
      <span class="pred-score">${pred.homeGoals}–${pred.awayGoals}</span>
    </div>`;
  }).join('');

  return `<div style="margin-bottom:0.5rem;font-size:0.75rem;color:var(--muted);letter-spacing:0.05em;text-transform:uppercase;">Tips</div>
    <div class="pred-grid">${items}</div>
    <div style="margin-top:0.75rem;font-size:0.72rem;color:var(--muted)">
      <span style="color:var(--gold)">■</span> Eksakt &nbsp;
      <span style="color:#5dc87a">■</span> Riktig H/U/B &nbsp;
      <span style="opacity:0.4">■</span> Feil
    </div>`;
}

function togglePredictions(id) {
  const el = document.getElementById(id);
  el.classList.toggle('open');
}

function renderKnockout() {
  const rounds = [
    { key: 'r32', label: '16-delsfin.' },
    { key: 'r16', label: '8-delsfin.' },
    { key: 'qf', label: 'Kvartfinale' },
    { key: 'sf', label: 'Semifinale' },
  ];

  // Collect all teams per round across participants
  const roundTeams = {};
  for (const { key } of rounds) {
    const counts = {};
    for (const p of appState.participants) {
      for (const team of (p.predictions.knockout[key] || [])) {
        const t = team.trim();
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    roundTeams[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  let html = '<div class="bracket"><div class="bracket-rounds">';
  for (const { key, label } of rounds) {
    html += `<div class="bracket-round">
      <div class="bracket-round-title">${label}</div>`;
    for (const [team, count] of (roundTeams[key] || [])) {
      html += `<div class="bracket-match">
        <div class="bracket-team">
          <span>${flagEmoji(normTeam(team))} ${team}</span>
          <span style="color:var(--muted);font-size:0.75rem">${count}/${appState.participants.length}</span>
        </div>
      </div>`;
    }
    html += '</div>';
  }

  // Champion picks
  html += `<div class="bracket-round">
    <div class="bracket-round-title">🏆 Mester-tips</div>`;
  for (const p of appState.participants) {
    const champ = p.predictions.knockout.champion;
    if (champ) {
      html += `<div class="bracket-match">
        <div class="bracket-team winner">${flagEmoji(normTeam(champ))} ${champ} <span style="color:var(--muted);font-size:0.7rem">(${p.name})</span></div>
      </div>`;
    }
  }
  html += '</div></div></div>';

  document.getElementById('knockout-content').innerHTML = html;
}

function renderParticipants() {
  const html = appState.participants.map(p => {
    const { exact = 0, result = 0 } = p.breakdown;
    const totalPred = p.predictions.groupMatches.length;
    const champ = p.predictions.knockout.champion || '–';

    return `<div class="participant-card">
      <div class="participant-name">
        <span>${p.name}</span>
        <span class="pts-big">${p.score} poeng</span>
      </div>
      <div class="participant-stats">
        <div class="stat-box"><span class="stat-val">${exact}</span><span class="stat-lbl">Eksakt score</span></div>
        <div class="stat-box"><span class="stat-val">${result}</span><span class="stat-lbl">Riktig H/U/B</span></div>
        <div class="stat-box"><span class="stat-val">${totalPred}</span><span class="stat-lbl">Kamper tippet</span></div>
        <div class="stat-box"><span class="stat-val" style="font-size:1rem">${flagEmoji(normTeam(champ))} ${champ}</span><span class="stat-lbl">Mester-tips</span></div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('participants-content').innerHTML = html;
}

// ─── START ───────────────────────────────────────────────────────────────────
loadAll();
