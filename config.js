// VM 2026 Tippekonkurransen — Konfigurasjon
// Legg til/endre deltakere her

const CONFIG = {
  participants: [
    { name: 'Buster',  sheetId: '1T1wCfu2AHTReqj6ED_beVlzwds5mOxuH' },
    { name: 'Roar',    sheetId: '1sPul4_ibJWmZf6oKMXk6OgGUv3asACjV' },
    { name: 'Olav',    sheetId: '1x2Ll64Po8_jssSpLBVIrAWc93vKDhKkl' },
    { name: 'Øyvind',  sheetId: '1FBTpPpNKdL243J2csuaEaOCkvDZQKXhO' },
    { name: 'Kjelli',  sheetId: '1LkNTfjsb-Cthebq1sonXZ-UENpCm2TOQ' },
    { name: 'Sui',     sheetId: '1LfvD3LyQEDFrA-AztKGHtpfUvyl3l6NR' },
  ],

  // Poengsystem
  points: {
    exactScore: 2,        // Riktig målscore (gruppespill)
    correctResult: 3,     // Riktig H/U/B (gruppespill)
    groupPosition: 2,     // Riktig plassering i gruppe
    groupBonus: 10,       // 100% riktig gruppe
    r32: 4,               // 16-delsfinale
    r16: 6,               // Åttedelsfinale
    qf: 8,                // Kvartfinale
    sf: 10,               // Semifinale
    final: 10,            // Finale (finalist)
    bronze: 10,           // Bronsevinner
    champion: 15,         // Verdensmester
  },

  // Openfootball API
  apiUrl: 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json',
};
