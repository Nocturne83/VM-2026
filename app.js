// VM 2026 Tippekonkurransen

// ─── NAV ─────────────────────────────────────────────────────────────────────
function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// ─── TEAM NAMES ──────────────────────────────────────────────────────────────
const TEAM_MAP = {
  'Sør-Afrika':'South Africa','Sør-Korea':'South Korea',
  'Bosnia-Hercegovina':'Bosnia and Herzegovina','Tsjekkia':'Czech Republic',
  'Elfenbenskysten':"Ivory Coast",'Kapp Verde':'Cape Verde',
  'Marokko':'Morocco','Skottland':'Scotland','Sverige':'Sweden',
  'Tyrkia':'Turkey','Frankrike':'France','Spania':'Spain',
  'Brasil':'Brazil','Belgia':'Belgium','Nederland':'Netherlands',
  'Tyskland':'Germany','Kroatia':'Croatia','Senegal':'Senegal',
  'Norge':'Norway','Algerie':'Algeria','Østerrike':'Austria',
  'Sveits':'Switzerland','Saudi-Arabia':'Saudi Arabia',
  'Irak':'Iraq','Jordan':'Jordan','Egypt':'Egypt',
  'Qatar':'Qatar','DR Kongo':'DR Congo','Usbekistan':'Uzbekistan',
  'New Zealand':'New Zealand','USA':'United States',
  'Mexico':'Mexico','Canada':'Canada','Uruguay':'Uruguay',
  'Colombia':'Colombia','Ecuador':'Ecuador','Paraguay':'Paraguay',
  'Japan':'Japan','Ghana':'Ghana','Tunisia':'Tunisia',
  'Australia':'Australia','Panama':'Panama','Curaçao':'Curaçao',
  'Haiti':'Haiti','Iran':'Iran','Argentina':'Argentina',
  'Portugal':'Portugal','England':'England',
};
function normTeam(n){ return n ? (TEAM_MAP[n] || n) : ''; }

const FLAGS = {
  'Mexico':'🇲🇽','South Africa':'🇿🇦','South Korea':'🇰🇷','Czech Republic':'🇨🇿',
  'Canada':'🇨🇦','Bosnia and Herzegovina':'🇧🇦','Qatar':'🇶🇦','Switzerland':'🇨🇭',
  'Brazil':'🇧🇷','Morocco':'🇲🇦','Haiti':'🇭🇹','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'United States':'🇺🇸','Paraguay':'🇵🇾','Australia':'🇦🇺','Turkey':'🇹🇷',
  'Germany':'🇩🇪','Curaçao':'🇨🇼','Ivory Coast':'🇨🇮','Ecuador':'🇪🇨',
  'Netherlands':'🇳🇱','Japan':'🇯🇵','Sweden':'🇸🇪','Tunisia':'🇹🇳',
  'Belgium':'🇧🇪','Egypt':'🇪🇬','Iran':'🇮🇷','New Zealand':'🇳🇿',
  'Spain':'🇪🇸','Cape Verde':'🇨🇻','Saudi Arabia':'🇸🇦','Uruguay':'🇺🇾',
  'France':'🇫🇷','Senegal':'🇸🇳','Iraq':'🇮🇶','Norway':'🇳🇴',
  'Argentina':'🇦🇷','Algeria':'🇩🇿','Austria':'🇦🇹','Jordan':'🇯🇴',
  'Portugal':'🇵🇹','DR Congo':'🇨🇩','Uzbekistan':'🇺🇿','Colombia':'🇨🇴',
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croatia':'🇭🇷','Ghana':'🇬🇭','Panama':'🇵🇦',
};
function flag(t){ return FLAGS[normTeam(t)] || FLAGS[t] || '🏳️'; }
function getResult(h,a){ return h>a?'H':h<a?'B':'U'; }
function setEl(id, html){ const el=document.getElementById(id); if(el) el.innerHTML=html; }

// ─── FETCH SHEET VIA CORS PROXY ───────────────────────────────────────────────
// Google Sheets blocks direct fetch() from GitHub Pages (CORS).
// We use allorigins.win as a transparent CORS proxy — no key needed.
async function fetchSheet(sheetId) {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=2026%20World%20Cup`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(sheetUrl)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.contents) throw new Error('Tom respons fra proxy');
  return parseCSV(data.contents);
}

function parseCSV(text) {
  return text.split('\n').map(line => {
    const cells = []; let cur = '', inQ = false;
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

// ─── PARSE PREDICTIONS ───────────────────────────────────────────────────────
function parsePredictions(rows) {
  const groupMatches = [];
  const knockout = { r32:[], r16:[], qf:[], sf:[], champion:null };

  for (const row of rows) {
    const matchNum = parseInt(row[0]);
    if (isNaN(matchNum) || matchNum < 1 || matchNum > 72) continue;

    const home = row[4]?.replace(/"/g,'').trim();
    const away = row[7]?.replace(/"/g,'').trim();
    const hg   = parseInt(row[5]);
    const ag   = parseInt(row[6]);

    if (home && !isNaN(hg) && !isNaN(ag)) {
      groupMatches.push({ num:matchNum, home, away, homeGoals:hg, awayGoals:ag });
    }

    const pick = col => {
      const v = row[col]?.replace(/"/g,'').trim();
      return v && v !== '' && v !== '0' ? v : null;
    };

    if (pick(51)) knockout.r32.push(pick(51));
    if (pick(58)) knockout.r16.push(pick(58));
    if (pick(65)) knockout.qf.push(pick(65));
    if (pick(72)) knockout.sf.push(pick(72));
    if (pick(79) && row[80]?.replace(/"/g,'').trim() === '1' && !knockout.champion) {
      knockout.champion = pick(79);
    }
  }

  ['r32','r16','qf','sf'].forEach(r => {
    knockout[r] = [...new Set(knockout[r].map(t=>t.trim()).filter(Boolean))];
  });
  return { groupMatches, knockout };
}

// ─── FETCH ACTUAL RESULTS ────────────────────────────────────────────────────
async function fetchResults() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Kunne ikke hente kampresultater');
  const data = await resp.json();
  const results = {};
  for (const m of data.matches) {
    const played = m.score !== undefined;
    results[`${m.team1}||${m.team2}`] = {
      home: m.team1, away: m.team2,
      homeGoals: played ? m.score.ft[0] : null,
      awayGoals: played ? m.score.ft[1] : null,
      played, group: m.group, date: m.date,
    };
  }
  return results;
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcScore(preds, results) {
  const P = CONFIG.points;
  let total = 0, exact = 0, result = 0;
  for (const pred of preds.groupMatches) {
    const hEn = normTeam(pred.home), aEn = normTeam(pred.away);
    const actual = results[`${hEn}||${aEn}`] || results[`${aEn}||${hEn}`];
    if (!actual?.played) continue;
    const flipped = actual.home !== hEn;
    const pH = flipped ? pred.awayGoals : pred.homeGoals;
    const pA = flipped ? pred.homeGoals : pred.awayGoals;
    if (pH === actual.homeGoals && pA === actual.awayGoals) { total += P.exactScore; exact++; }
    if (getResult(pH,pA) === getResult(actual.homeGoals,actual.awayGoals)) { total += P.correctResult; result++; }
  }
  return { total, exact, result };
}

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = { participants:[], results:{}, loaded:false };

// ─── BOOT ────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    // Fetch results first (no CORS issue)
    const results = await fetchResults();
    state.results = results;

    // Fetch each participant sheet via CORS proxy
    // Load sequentially to avoid hammering the proxy
    const participants = [];
    for (const p of CONFIG.participants) {
      setEl('status-bar',
        `<span><span class="dot"></span>Henter tips for ${p.name}...</span><span></span>`);
      try {
        const rows  = await fetchSheet(p.sheetId);
        const preds = parsePredictions(rows);
        const score = calcScore(preds, results);
        participants.push({ name:p.name, preds, ...score });
      } catch(e) {
        console.warn(`Feil for ${p.name}:`, e);
        participants.push({
          name:p.name,
          preds:{groupMatches:[],knockout:{}},
          total:0, exact:0, result:0,
          error: e.message
        });
      }
    }

    participants.sort((a,b) => b.total - a.total);
    state.participants = participants;
    state.loaded = true;
    renderAll();

  } catch(e) {
    setEl('status-bar', `<span>⚠️ Feil: ${e.message}</span><span></span>`);
    setEl('leaderboard-content', `<div class="error-msg">⚠️ ${e.message}</div>`);
  }
}

// ─── RENDER ALL ──────────────────────────────────────────────────────────────
function renderAll() {
  renderStatus();
  renderLeaderboard();
  renderChampions();
  renderMatches();
  renderKnockout();
  renderParticipants();
}

function renderStatus() {
  const played = Object.values(state.results).filter(r=>r.played).length;
  const total  = Object.values(state.results).length;
  const now    = new Date().toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'});
  setEl('status-bar',
    `<span><span class="dot"></span>${played} av ${total} kamper spilt</span>
     <span>Oppdatert: ${now}</span>`);
}

function renderLeaderboard() {
  const medals = ['🥇','🥈','🥉'];
  const rows = state.participants.map((p,i) => `
    <tr>
      <td><span class="rank ${i<3?'rank-'+(i+1):''}">${medals[i]||i+1}</span> ${p.name}
        ${p.error ? `<span style="color:var(--red);font-size:.75rem"> ⚠ ${p.error}</span>` : ''}
      </td>
      <td><span class="pts-big">${p.total}</span></td>
      <td><span class="badge exact">${p.exact} eksakt</span></td>
      <td><span class="badge result">${p.result} H/U/B</span></td>
    </tr>`).join('');
  setEl('leaderboard-content', `
    <table class="leaderboard">
      <thead><tr><th>Deltaker</th><th>Poeng</th><th>Eksakt</th><th>Resultat</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`);
}

function renderChampions() {
  const picks = state.participants
    .filter(p => p.preds?.knockout?.champion)
    .map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:.5rem 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted);font-size:.9rem">${p.name}</span>
        <span style="font-weight:600">${flag(p.preds.knockout.champion)} ${p.preds.knockout.champion}</span>
      </div>`).join('');
  setEl('champion-picks', picks || '<p style="color:var(--muted);font-size:.9rem">Ingen data ennå.</p>');
}

function groupOf(num) {
  return 'Gruppe ' + 'ABCDEFGHIJKL'[Math.floor((num-1)/6)];
}

function renderMatches() {
  const ref = state.participants.find(p => p.preds?.groupMatches?.length > 0);
  if (!ref) {
    setEl('matches-content','<div class="error-msg">⚠️ Kunne ikke hente kampdata fra Google Sheets. Sjekk at alle ark er delt som "Anyone with the link".</div>');
    return;
  }
  const byGroup = {};
  for (const match of ref.preds.groupMatches) {
    const g = groupOf(match.num);
    if (!byGroup[g]) byGroup[g] = [];
    const hEn = normTeam(match.home), aEn = normTeam(match.away);
    const actual = state.results[`${hEn}||${aEn}`] || state.results[`${aEn}||${hEn}`];
    byGroup[g].push({ match, actual, hEn, aEn });
  }
  let html = '';
  for (const [grp, list] of Object.entries(byGroup)) {
    html += `<div class="match-group"><div class="group-header">⚽ ${grp}</div>`;
    for (const { match, actual, hEn, aEn } of list) {
      const played = actual?.played;
      const aH = played ? actual.homeGoals : '–';
      const aA = played ? actual.awayGoals : '–';
      const pid = `pred-${match.num}`;
      html += `
        <div class="match-row ${played?'played':''}" onclick="togglePanel('${pid}')">
          <div class="team-name home">${flag(hEn)} ${match.home}</div>
          <div class="score-box"><span class="score-actual">${aH} – ${aA}</span></div>
          <div class="team-name away">${match.away} ${flag(aEn)}</div>
        </div>
        <div id="${pid}" class="predictions-panel">${predPanel(match.num, played, actual)}</div>`;
    }
    html += '</div>';
  }
  setEl('matches-content', html);
}

function predPanel(matchNum, played, actual) {
  const items = state.participants.map(p => {
    const pred = p.preds?.groupMatches?.find(m => m.num === matchNum);
    if (!pred) return `<div class="pred-item"><span class="pred-name">${p.name}</span><span class="pred-score">–</span></div>`;
    let cls = '';
    if (played && actual) {
      const flipped = actual.home !== normTeam(pred.home);
      const pH = flipped ? pred.awayGoals : pred.homeGoals;
      const pA = flipped ? pred.homeGoals : pred.awayGoals;
      const exact = pH===actual.homeGoals && pA===actual.awayGoals;
      const cor   = getResult(pH,pA)===getResult(actual.homeGoals,actual.awayGoals);
      cls = exact?'exact':cor?'result':'wrong';
    }
    return `<div class="pred-item ${cls}">
      <span class="pred-name">${p.name}</span>
      <span class="pred-score">${pred.homeGoals}–${pred.awayGoals}</span>
    </div>`;
  }).join('');
  return `<div style="margin-bottom:.5rem;font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Tips</div>
    <div class="pred-grid">${items}</div>
    <div style="margin-top:.75rem;font-size:.72rem;color:var(--muted)">
      <span style="color:var(--gold)">■</span> Eksakt &nbsp;
      <span style="color:var(--cyan)">■</span> Riktig H/U/B &nbsp;
      <span style="opacity:.4">■</span> Feil
    </div>`;
}

function togglePanel(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function renderKnockout() {
  const rounds = [
    {key:'r32',label:'16-delsfin.'},{key:'r16',label:'8-delsfin.'},
    {key:'qf',label:'Kvartfinale'},{key:'sf',label:'Semifinale'},
  ];
  let html = '<div class="bracket"><div class="bracket-rounds">';
  for (const {key,label} of rounds) {
    const counts = {};
    for (const p of state.participants)
      for (const t of (p.preds?.knockout?.[key]||[]))
        counts[t] = (counts[t]||0)+1;
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    html += `<div class="bracket-round"><div class="bracket-round-title">${label}</div>`;
    for (const [team,count] of sorted)
      html += `<div class="bracket-match"><div class="bracket-team">
        <span>${flag(team)} ${team}</span>
        <span style="color:var(--muted);font-size:.75rem">${count}/${state.participants.length}</span>
      </div></div>`;
    html += '</div>';
  }
  html += `<div class="bracket-round"><div class="bracket-round-title">🏆 Mester</div>`;
  for (const p of state.participants)
    if (p.preds?.knockout?.champion)
      html += `<div class="bracket-match"><div class="bracket-team winner">
        ${flag(p.preds.knockout.champion)} ${p.preds.knockout.champion}
        <span style="color:var(--muted);font-size:.7rem">(${p.name})</span>
      </div></div>`;
  html += '</div></div></div>';
  setEl('knockout-content', html);
}

function renderParticipants() {
  const html = state.participants.map(p => {
    const champ = p.preds?.knockout?.champion || '–';
    return `<div class="participant-card">
      <div class="participant-name">
        <span>${p.name}</span>
        <span class="pts-big">${p.total} poeng</span>
      </div>
      <div class="participant-stats">
        <div class="stat-box"><span class="stat-val">${p.exact}</span><span class="stat-lbl">Eksakt score</span></div>
        <div class="stat-box"><span class="stat-val">${p.result}</span><span class="stat-lbl">Riktig H/U/B</span></div>
        <div class="stat-box"><span class="stat-val">${p.preds?.groupMatches?.length||0}</span><span class="stat-lbl">Kamper tippet</span></div>
        <div class="stat-box"><span class="stat-val" style="font-size:1rem">${flag(champ)} ${champ}</span><span class="stat-lbl">Mester-tips</span></div>
      </div>
    </div>`;
  }).join('');
  setEl('participants-content', html);
}

boot();
