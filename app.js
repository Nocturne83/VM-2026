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
  'Sor-Afrika':'South Africa','Sør-Afrika':'South Africa',
  'Sor-Korea':'South Korea','Sør-Korea':'South Korea',
  'Bosnia-Hercegovina':'Bosnia and Herzegovina','Tsjekkia':'Czech Republic',
  'Elfenbenskysten':"Ivory Coast",'Kapp Verde':'Cape Verde',
  'Marokko':'Morocco','Skottland':'Scotland','Sverige':'Sweden',
  'Tyrkia':'Turkey','Frankrike':'France','Spania':'Spain',
  'Brasil':'Brazil','Belgia':'Belgium','Nederland':'Netherlands',
  'Tyskland':'Germany','Kroatia':'Croatia','Senegal':'Senegal',
  'Norge':'Norway','Algerie':'Algeria','Østerrike':'Austria',
  'Oyvind':'Øyvind',
  'Sveits':'Switzerland','Saudi-Arabia':'Saudi Arabia',
  'Irak':'Iraq','Jordan':'Jordan','Egypt':'Egypt',
  'Qatar':'Qatar','DR Kongo':'DR Congo','Usbekistan':'Uzbekistan',
  'New Zealand':'New Zealand','USA':'United States',
  'Mexico':'Mexico','Canada':'Canada','Uruguay':'Uruguay',
  'Colombia':'Colombia','Ecuador':'Ecuador','Paraguay':'Paraguay',
  'Japan':'Japan','Ghana':'Ghana','Tunisia':'Tunisia',
  'Australia':'Australia','Panama':'Panama','Curacao':'Curaçao','Curaçao':'Curaçao',
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

// ─── FETCH ACTUAL RESULTS ────────────────────────────────────────────────────
async function fetchResults() {
  const url = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Kunne ikke hente kampresultater fra API');
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
    const pH = flipped ? pred.ag : pred.hg;
    const pA = flipped ? pred.hg : pred.ag;
    if (pH === actual.homeGoals && pA === actual.awayGoals) { total += P.exactScore; exact++; }
    if (getResult(pH,pA) === getResult(actual.homeGoals,actual.awayGoals)) { total += P.correctResult; result++; }
  }
  return { total, exact, result };
}

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = { participants:[], results:{} };

// ─── BOOT ────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    setEl('status-bar', '<span><span class="dot"></span>Henter kampresultater...</span><span></span>');
    const results = await fetchResults();
    state.results = results;

    // PREDICTIONS is loaded from data.js — no network call needed
    const participants = PREDICTIONS.map(p => {
      const score = calcScore(p, results);
      return { ...p, ...score };
    });

    participants.sort((a,b) => b.total - a.total);
    state.participants = participants;
    renderAll();

  } catch(e) {
    setEl('status-bar', `<span>⚠️ Feil: ${e.message}</span><span></span>`);
    setEl('leaderboard-content', `<div class="error-msg">⚠️ ${e.message}</div>`);
  }
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
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
      <td><span class="rank ${i<3?'rank-'+(i+1):''}">${medals[i]||i+1}</span> ${p.name}</td>
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
    .filter(p => p.knockout?.champion)
    .map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:.5rem 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted);font-size:.9rem">${p.name}</span>
        <span style="font-weight:600">${flag(p.knockout.champion)} ${p.knockout.champion}</span>
      </div>`).join('');
  setEl('champion-picks', picks || '<p style="color:var(--muted);font-size:.9rem">Ingen data.</p>');
}

function groupOf(num) {
  return 'Gruppe ' + 'ABCDEFGHIJKL'[Math.floor((num-1)/6)];
}

function renderMatches() {
  const ref = state.participants[0];
  if (!ref?.groupMatches?.length) {
    setEl('matches-content','<p style="color:var(--muted)">Ingen kampdata.</p>'); return;
  }
  const byGroup = {};
  for (const match of ref.groupMatches) {
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
    const pred = p.groupMatches?.find(m => m.num === matchNum);
    if (!pred) return `<div class="pred-item"><span class="pred-name">${p.name}</span><span class="pred-score">–</span></div>`;
    let cls = '';
    if (played && actual) {
      const flipped = actual.home !== normTeam(pred.home);
      const pH = flipped ? pred.ag : pred.hg;
      const pA = flipped ? pred.hg : pred.ag;
      const exact = pH===actual.homeGoals && pA===actual.awayGoals;
      const cor   = getResult(pH,pA)===getResult(actual.homeGoals,actual.awayGoals);
      cls = exact?'exact':cor?'result':'wrong';
    }
    return `<div class="pred-item ${cls}">
      <span class="pred-name">${p.name}</span>
      <span class="pred-score">${pred.hg}–${pred.ag}</span>
    </div>`;
  }).join('');
  return `<div style="margin-bottom:.5rem;font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">Tips per deltaker</div>
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
      for (const t of (p.knockout?.[key]||[]))
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
    if (p.knockout?.champion)
      html += `<div class="bracket-match"><div class="bracket-team winner">
        ${flag(p.knockout.champion)} ${p.knockout.champion}
        <span style="color:var(--muted);font-size:.7rem">(${p.name})</span>
      </div></div>`;
  html += '</div></div></div>';
  setEl('knockout-content', html);
}

function renderParticipants() {
  const html = state.participants.map(p => {
    const champ = p.knockout?.champion || '–';
    return `<div class="participant-card">
      <div class="participant-name">
        <span>${p.name}</span>
        <span class="pts-big">${p.total} poeng</span>
      </div>
      <div class="participant-stats">
        <div class="stat-box"><span class="stat-val">${p.exact}</span><span class="stat-lbl">Eksakt score</span></div>
        <div class="stat-box"><span class="stat-val">${p.result}</span><span class="stat-lbl">Riktig H/U/B</span></div>
        <div class="stat-box"><span class="stat-val">${p.groupMatches?.length||0}</span><span class="stat-lbl">Kamper tippet</span></div>
        <div class="stat-box"><span class="stat-val" style="font-size:1rem">${flag(champ)} ${champ}</span><span class="stat-lbl">Mester-tips</span></div>
      </div>
    </div>`;
  }).join('');
  setEl('participants-content', html);
}

boot();
