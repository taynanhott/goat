(() => {
  'use strict';

  // Mesma lógica de geração de emblemas em pixel-art SVG do football-hype
  // (badge-art.ts + club-crests.ts + club-identity.ts + generated-badge.tsx)
  const badgeShapes = {
    round:
      'M24 3H40V6H48V10H54V16H58V24H61V40H58V48H54V54H48V58H40V61H24V58H16V54H10V48H6V40H3V24H6V16H10V10H16V6H24Z',
    oval: 'M24 2H40V5H48V11H54V20H58V44H54V53H48V59H40V62H24V59H16V53H10V44H6V20H10V11H16V5H24Z',
    shield: 'M6 5H58V37H54V45H48V51H42V56H36V61H28V56H22V51H16V45H10V37H6Z',
    pointed: 'M4 6H60V34H56V42H50V48H44V53H38V58H34V62H30V58H26V53H20V48H14V42H8V34H4Z',
    diamond:
      'M29 2H35V7H40V12H45V17H50V22H55V27H60V37H55V42H50V47H45V52H40V57H35V62H29V57H24V52H19V47H14V42H9V37H4V27H9V22H14V17H19V12H24V7H29Z',
    pennant: 'M3 5H61V23H57V30H51V37H45V44H39V51H35V58H29V51H25V44H19V37H13V30H7V23H3Z'
  };

  const badgeSymbols = {
    star: 'M29 15H35V25H45V31H39V37H41V45H35V41H29V45H23V37H25V31H19V25H29Z',
    stars: 'M29 15H35V21H29ZM17 27H23V33H17ZM41 27H47V33H41ZM30 33H36V39H30ZM27 45H33V51H27Z',
    cross: 'M27 14H37V25H49V37H37V49H27V37H15V25H27Z',
    anchor:
      'M28 12H36V16H40V24H35V43H43V35H49V45H45V49H37V53H27V49H19V45H15V35H21V43H29V30H23V25H29V24H24V16H28ZM29 17V21H35V17Z',
    cannon:
      'M12 25H43V22H51V33H43V31H26V35H20V40H10V35H15V31H12ZM32 33H42V37H46V47H42V51H32V47H28V37H32ZM34 38V46H40V38Z',
    ball: 'M23 16H41V20H47V26H51V40H47V46H41V50H23V46H17V40H13V26H17V20H23ZM28 26V38H38V26ZM19 23V28H25V23ZM40 23V28H45V23ZM19 38V43H25V38ZM40 38V43H45V38Z',
    crown: 'M14 21H20V27H26V17H32V27H38V17H44V27H50V21H54V39H50V46H14V39H10V21ZM18 49H46V53H18Z',
    tower: 'M19 16H25V22H29V16H35V22H39V16H45V29H41V45H47V51H17V45H23V29H19ZM29 35V47H35V35Z',
    bird: 'M7 20H15V24H23V28H29V21H35V16H43V21H39V28H35V33H43V28H51V24H59V31H53V36H45V40H37V45H41V50H23V45H27V40H19V36H11V31H7Z',
    lion: 'M23 14H39V19H44V30H39V35H44V40H49V33H54V43H49V48H38V42H32V48H22V52H15V46H22V38H27V31H19V23H23ZM26 20V25H31V20Z',
    tree: 'M27 12H37V17H44V23H49V35H39V40H35V47H43V52H21V47H29V40H25V35H15V23H20V17H27Z'
  };

  const normalize = name => String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const profiles = [
    ['Flamengo', 'pointed', 'hoops', 'monogram', 'CRF'],
    ['Corinthians', 'round', 'solid', 'anchor', 'SCCP'],
    ['Palmeiras', 'round', 'solid', 'monogram', 'P'],
    ['Santos', 'shield', 'stripes', 'ball', 'SFC'],
    ['São Paulo', 'pennant', 'split', 'monogram', 'SPFC'],
    ['Fluminense', 'pointed', 'split', 'monogram', 'FFC'],
    ['Vasco|Vasco da Gama', 'shield', 'sash', 'cross', 'CRVG'],
    ['Botafogo', 'shield', 'solid', 'star', 'BFR'],
    ['Cruzeiro', 'round', 'solid', 'stars', 'CEC'],
    ['Grêmio', 'round', 'stripes', 'ball', 'GFB'],
    ['Internacional', 'round', 'solid', 'monogram', 'SCI'],
    ['Bahia', 'round', 'stripes', 'ball', 'ECB'],
    ['Fortaleza', 'pennant', 'split', 'monogram', 'FEC'],
    ['Atlético-MG|Atlético Mineiro', 'pointed', 'stripes', 'monogram', 'CAM'],
    ['Athletico-PR|Athletico Paranaense', 'pointed', 'sash', 'monogram', 'CAP'],
    ['Coritiba', 'round', 'solid', 'monogram', 'CFC'],
    ['Goiás', 'round', 'solid', 'monogram', 'G'],
    ['América-MG|América Mineiro', 'shield', 'stripes', 'monogram', 'AFC'],
    ['Sport|Sport Recife|Sport Club do Recife', 'shield', 'hoops', 'lion', 'SCR'],
    ['Vitória', 'shield', 'stripes', 'monogram', 'ECV'],
    ['Ceará', 'pointed', 'stripes', 'monogram', 'CSC'],
    ['Náutico', 'oval', 'stripes', 'anchor', 'CNC'],
    ['Santa Cruz', 'shield', 'hoops', 'cross', 'SC'],
    ['Remo', 'shield', 'solid', 'monogram', 'CR'],
    ['Paysandu', 'shield', 'stripes', 'star', 'PSC'],
    ['Chapecoense', 'round', 'solid', 'monogram', 'ACF'],
    ['Criciúma', 'pointed', 'stripes', 'ball', 'CEC'],
    ['Guarani', 'round', 'solid', 'monogram', 'GFC'],
    ['Juventude', 'round', 'stripes', 'monogram', 'ECJ'],
    ['Red Bull Bragantino|Bragantino', 'shield', 'solid', 'ball', 'RBB'],
    ['Boca Juniors', 'shield', 'hoops', 'stars', 'CABJ'],
    ['River Plate', 'shield', 'sash', 'monogram', 'CARP'],
    ['Racing|Racing Club', 'shield', 'stripes', 'monogram', 'RC'],
    ['Independiente', 'shield', 'solid', 'monogram', 'CAI'],
    ['Peñarol', 'shield', 'stripes', 'stars', 'CAP'],
    ['Nacional', 'shield', 'sash', 'monogram', 'CNF'],
    ['Colo-Colo', 'shield', 'solid', 'monogram', 'CC'],
    ['Universidad de Chile', 'shield', 'solid', 'monogram', 'U']
  ];

  const byName = new Map(
    profiles.flatMap(([aliases, ...profile]) => aliases.split('|').map(n => [normalize(n), profile]))
  );

  const crestPalettes = [
    ['Flamengo|Sport|Sport Recife|Sport Club do Recife|Vitória|Athletico-PR|Athletico Paranaense', '#c82032', '#15191d'],
    ['Corinthians|Santos|São Paulo|Vasco|Vasco da Gama|Atlético-MG|Atlético Mineiro', '#f5f3e9', '#15191d'],
    ['Palmeiras|Coritiba|Goiás|América-MG|América Mineiro|Chapecoense|Guarani|Juventude', '#116b43', '#f5f3e9'],
    ['Fluminense', '#7f2639', '#16704c', '#f5f3e9'],
    ['Botafogo|Ceará', '#15191d', '#f5f3e9'],
    ['Cruzeiro|Remo', '#174a9b', '#f5f3e9'],
    ['Grêmio', '#48a8d8', '#15191d', '#f5f3e9'],
    ['Bahia|Fortaleza', '#2355ad', '#c82032', '#f5f3e9'],
    ['Internacional|Náutico|Independiente', '#c82032', '#f5f3e9'],
    ['Santa Cruz', '#15191d', '#c82032', '#f5f3e9'],
    ['Paysandu|Racing|Racing Club', '#48a8d8', '#f5f3e9'],
    ['Criciúma|Peñarol', '#e8b934', '#15191d'],
    ['Red Bull Bragantino|Bragantino', '#f5f3e9', '#c82032'],
    ['Boca Juniors', '#153a71', '#e8b934'],
    ['River Plate|Nacional', '#f5f3e9', '#c82032', '#153a71'],
    ['Colo-Colo', '#f5f3e9', '#15191d'],
    ['Universidad de Chile', '#153a71', '#c82032', '#f5f3e9']
  ];

  const palettesByName = new Map(
    crestPalettes.flatMap(([aliases, ...colors]) => aliases.split('|').map(n => [normalize(n), colors]))
  );

  const shapes = ['round', 'oval', 'shield', 'pointed', 'diamond', 'pennant'];

  function ink(background) {
    if (!background || background.length < 7) return '#fff8e8';
    const rgb = [1, 3, 5].map(i => parseInt(background.slice(i, i + 2), 16));
    return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 150 ? '#15191d' : '#fff8e8';
  }

  function isNational(club) {
    return Boolean(club && (club.national || club.league === 'NATIONAL' || String(club.id || '').startsWith('national-')));
  }

  function flagCode(club) {
    const raw = club?.country || club?.abbr || String(club?.id || '').replace(/^national-/, '');
    return String(raw || '').toUpperCase();
  }

  function flagMarkup(code) {
    const h3 = (a, b, c, extra = '') =>
      `<rect x="0" y="0" width="60" height="14" fill="${a}"/>` +
      `<rect x="0" y="14" width="60" height="14" fill="${b}"/>` +
      `<rect x="0" y="28" width="60" height="14" fill="${c}"/>${extra}`;
    const v3 = (a, b, c, extra = '') =>
      `<rect x="0" y="0" width="20" height="42" fill="${a}"/>` +
      `<rect x="20" y="0" width="20" height="42" fill="${b}"/>` +
      `<rect x="40" y="0" width="20" height="42" fill="${c}"/>${extra}`;
    const h2 = (a, b, extra = '') =>
      `<rect x="0" y="0" width="60" height="21" fill="${a}"/>` +
      `<rect x="0" y="21" width="60" height="21" fill="${b}"/>${extra}`;
    const star = (cx, cy, r, fill) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rad = i % 2 === 0 ? r : r * 0.42;
        pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
    };
    const nordic = (bg, fg, inner) =>
      `<rect width="60" height="42" fill="${bg}"/>` +
      `<rect x="16" y="0" width="10" height="42" fill="${fg}"/><rect x="0" y="16" width="60" height="10" fill="${fg}"/>` +
      (inner ? `<rect x="18.5" y="0" width="5" height="42" fill="${inner}"/><rect x="0" y="18.5" width="60" height="5" fill="${inner}"/>` : '');

    switch (code) {
      case 'BR':
        return `<rect width="60" height="42" fill="#009c3b"/>` +
          `<polygon points="30,4 54,21 30,38 6,21" fill="#ffdf00"/>` +
          `<circle cx="30" cy="21" r="9.5" fill="#002776"/>` +
          `<path d="M21 19 Q30 15 39 22" fill="none" stroke="#ffffff" stroke-width="2.2"/>`;
      case 'AR':
        return h3('#74acdf', '#ffffff', '#74acdf', `<circle cx="30" cy="21" r="4.2" fill="#f6b40e"/>`);
      case 'AT': return h3('#ed2939', '#ffffff', '#ed2939');
      case 'BG': return h3('#ffffff', '#00966e', '#d62612');
      case 'BO': return h3('#d52b1e', '#f9e300', '#007934');
      case 'CO':
        return `<rect width="60" height="21" fill="#fcd116"/><rect y="21" width="60" height="10.5" fill="#003893"/><rect y="31.5" width="60" height="10.5" fill="#ce1126"/>`;
      case 'EC':
        return `<rect width="60" height="21" fill="#ffdd00"/><rect y="21" width="60" height="10.5" fill="#034ea2"/><rect y="31.5" width="60" height="10.5" fill="#ed1c24"/><circle cx="30" cy="21" r="4" fill="#8b5a2b"/>`;
      case 'DE': return h3('#151515', '#dd0000', '#ffce00');
      case 'EG': return h3('#ce1126', '#ffffff', '#151515', `<circle cx="30" cy="21" r="3.4" fill="#c09300"/>`);
      case 'ES':
        return `<rect width="60" height="10.5" fill="#aa151b"/><rect y="10.5" width="60" height="21" fill="#f1bf00"/><rect y="31.5" width="60" height="10.5" fill="#aa151b"/><rect x="14" y="15" width="7" height="11" rx="2" fill="#aa151b" stroke="#7a1014" stroke-width="1"/>`;
      case 'GH': return h3('#ce1126', '#fcd116', '#006b3f', star(30, 21, 5.2, '#151515'));
      case 'HR':
        return h3('#ff0000', '#ffffff', '#171796', `<rect x="25" y="14" width="10" height="13" fill="#ff0000" stroke="#ffffff" stroke-width="1.2"/><rect x="27" y="16" width="3" height="3" fill="#ffffff"/><rect x="30" y="19" width="3" height="3" fill="#ffffff"/><rect x="27" y="22" width="3" height="3" fill="#ffffff"/>`);
      case 'HU': return h3('#cd2a3e', '#ffffff', '#436f4d');
      case 'NL': return h3('#ae1c28', '#ffffff', '#21468b');
      case 'PY': return h3('#d52b1e', '#ffffff', '#0038a8', `<circle cx="30" cy="21" r="3.5" fill="#f1bf00"/>`);
      case 'RS': return h3('#c6363c', '#0c4076', '#ffffff', `<rect x="15" y="13" width="8" height="14" rx="2" fill="#c6363c" stroke="#f1bf00" stroke-width="1.2"/>`);
      case 'RU': return h3('#ffffff', '#0039a6', '#d52b1e');
      case 'SI': return h3('#ffffff', '#005da4', '#ed1c24', `<rect x="11" y="9" width="8" height="10" rx="2" fill="#005da4" stroke="#ed1c24" stroke-width="1.2"/>`);
      case 'SK': return h3('#ffffff', '#0b4ea2', '#ee1c25', `<rect x="12" y="12" width="9" height="13" rx="2" fill="#ee1c25" stroke="#ffffff" stroke-width="1.2"/>`);
      case 'VE':
        return h3('#cf142b', '#00247d', '#cf142b', `<rect width="60" height="14" fill="#ffcc00"/><path d="M21 24 Q30 16 39 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="2.4 2.4"/>`);
      case 'AO': return h2('#cc092f', '#151515', `<circle cx="30" cy="21" r="5" fill="none" stroke="#ffcb00" stroke-width="2"/>`);
      case 'BF': return h2('#ef2b2d', '#009e49', star(30, 21, 5.5, '#fcd116'));
      case 'PL': return h2('#ffffff', '#dc143c');
      case 'UA': return h2('#005bbb', '#ffd500');
      case 'BE': return v3('#151515', '#fae042', '#ed2939');
      case 'CI': return v3('#f77f00', '#ffffff', '#009e60');
      case 'CM': return v3('#007a5e', '#ce1126', '#fcd116', star(30, 21, 5.2, '#fcd116'));
      case 'FR': return v3('#002395', '#ffffff', '#ed2939');
      case 'GN': return v3('#ce1126', '#fcd116', '#009460');
      case 'IE': return v3('#169b62', '#ffffff', '#ff883e');
      case 'IT': return v3('#009246', '#ffffff', '#ce2b37');
      case 'ML': return v3('#14b53a', '#fcd116', '#ce1126');
      case 'MX': return v3('#006847', '#ffffff', '#ce1126', `<circle cx="30" cy="21" r="4.5" fill="#7a4b2a"/>`);
      case 'NG': return v3('#008751', '#ffffff', '#008751');
      case 'PE': return v3('#d91023', '#ffffff', '#d91023');
      case 'RO': return v3('#002b7f', '#fcd116', '#ce1126');
      case 'SN': return v3('#00853f', '#fdef42', '#e31b23', star(30, 21, 5.2, '#00853f'));
      case 'CA':
        return `<rect width="15" height="42" fill="#ff0000"/><rect x="15" width="30" height="42" fill="#ffffff"/><rect x="45" width="15" height="42" fill="#ff0000"/>` +
          `<polygon points="30,10 33,17 39,16 35,22 38,26 32,25 32,32 28,32 28,25 22,26 25,22 21,16 27,17" fill="#ff0000"/>`;
      case 'PT':
        return `<rect width="24" height="42" fill="#006600"/><rect x="24" width="36" height="42" fill="#ff0000"/><circle cx="24" cy="21" r="7" fill="#ffdf00"/><rect x="20.5" y="17" width="7" height="8" rx="2" fill="#ff0000" stroke="#ffffff" stroke-width="1"/>`;
      case 'DZ':
        return `<rect width="30" height="42" fill="#006233"/><rect x="30" width="30" height="42" fill="#ffffff"/><circle cx="30" cy="21" r="8" fill="#d21034"/><circle cx="33" cy="21" r="6.5" fill="#ffffff"/>${star(34.5, 21, 3.6, '#d21034')}`;
      case 'DK': return nordic('#c60c30', '#ffffff');
      case 'FI': return nordic('#ffffff', '#003580');
      case 'SE': return nordic('#006aa7', '#fecc00');
      case 'NO': return nordic('#ba0c2f', '#ffffff', '#00205b');
      case 'IS': return nordic('#02529c', '#ffffff', '#dc1e35');
      case 'ENG':
        return `<rect width="60" height="42" fill="#ffffff"/><rect x="25" width="10" height="42" fill="#ce1124"/><rect y="16" width="60" height="10" fill="#ce1124"/>`;
      case 'SCO':
        return `<rect width="60" height="42" fill="#005eb8"/><path d="M0,0 L60,42 M60,0 L0,42" stroke="#ffffff" stroke-width="8"/>`;
      case 'WAL':
        return h2('#ffffff', '#00ab39', `<path d="M18 29 Q24 14 38 14 Q45 14 43 22 Q48 26 42 30 L24 30 Z" fill="#d30731"/>`);
      case 'JP':
        return `<rect width="60" height="42" fill="#ffffff"/><circle cx="30" cy="21" r="11" fill="#bc002d"/>`;
      case 'KR':
        return `<rect width="60" height="42" fill="#ffffff"/>` +
          `<circle cx="30" cy="21" r="9.5" fill="#cd2e3a"/><path d="M20.5 21 A9.5 9.5 0 0 0 39.5 21 A4.75 4.75 0 0 1 30 21 A4.75 4.75 0 0 0 20.5 21 Z" fill="#0047a0"/>` +
          `<path d="M10 12 L16 6 M44 6 L50 12 M10 30 L16 36 M44 36 L50 30" stroke="#151515" stroke-width="2.5"/>`;
      case 'CH':
        return `<rect width="60" height="42" fill="#d52b1e"/><rect x="25" y="9" width="10" height="24" fill="#ffffff"/><rect x="18" y="16" width="24" height="10" fill="#ffffff"/>`;
      case 'CL':
        return h2('#ffffff', '#d52b1e', `<rect width="22" height="21" fill="#0039a6"/>${star(11, 10.5, 5.2, '#ffffff')}`);
      case 'US': {
        let stripes = '';
        for (let i = 0; i < 13; i++) stripes += `<rect y="${(i * 42 / 13).toFixed(2)}" width="60" height="${(42 / 13 + 0.2).toFixed(2)}" fill="${i % 2 === 0 ? '#b22234' : '#ffffff'}"/>`;
        return stripes + `<rect width="26" height="22.6" fill="#3c3b6e"/>` +
          `<circle cx="6" cy="5.5" r="1.4" fill="#fff"/><circle cx="13" cy="5.5" r="1.4" fill="#fff"/><circle cx="20" cy="5.5" r="1.4" fill="#fff"/>` +
          `<circle cx="9.5" cy="11.3" r="1.4" fill="#fff"/><circle cx="16.5" cy="11.3" r="1.4" fill="#fff"/>` +
          `<circle cx="6" cy="17.1" r="1.4" fill="#fff"/><circle cx="13" cy="17.1" r="1.4" fill="#fff"/><circle cx="20" cy="17.1" r="1.4" fill="#fff"/>`;
      }
      case 'UY': {
        let stripes = '';
        for (let i = 0; i < 9; i++) stripes += `<rect y="${(i * 42 / 9).toFixed(2)}" width="60" height="${(42 / 9 + 0.2).toFixed(2)}" fill="${i % 2 === 0 ? '#ffffff' : '#0038a8'}"/>`;
        return stripes + `<rect width="22" height="23.3" fill="#ffffff"/><circle cx="11" cy="11.6" r="5.5" fill="#fcd116"/>`;
      }
      case 'GR': {
        let stripes = '';
        for (let i = 0; i < 9; i++) stripes += `<rect y="${(i * 42 / 9).toFixed(2)}" width="60" height="${(42 / 9 + 0.2).toFixed(2)}" fill="${i % 2 === 0 ? '#0d5eaf' : '#ffffff'}"/>`;
        return stripes + `<rect width="23" height="23.3" fill="#0d5eaf"/><rect x="9.5" width="4" height="23.3" fill="#ffffff"/><rect y="9.6" width="23" height="4" fill="#ffffff"/>`;
      }
      case 'CZ':
        return h2('#ffffff', '#d7141a', `<polygon points="0,0 28,21 0,42" fill="#11457e"/>`);
      case 'TR':
        return `<rect width="60" height="42" fill="#e30a17"/><circle cx="25" cy="21" r="9.5" fill="#ffffff"/><circle cx="28" cy="21" r="7.5" fill="#e30a17"/>${star(38, 21, 4.4, '#ffffff')}`;
      case 'TN':
        return `<rect width="60" height="42" fill="#e70013"/><circle cx="30" cy="21" r="10.5" fill="#ffffff"/><circle cx="29" cy="21" r="6.8" fill="#e70013"/><circle cx="31.5" cy="21" r="5.4" fill="#ffffff"/>${star(33, 21, 3.2, '#e70013')}`;
      case 'MA':
        return `<rect width="60" height="42" fill="#c1272d"/>${star(30, 21, 8.5, '#006233')}`;
      case 'SA':
        return `<rect width="60" height="42" fill="#006c35"/><rect x="14" y="15" width="32" height="5" rx="2" fill="#ffffff"/><rect x="16" y="25" width="28" height="2.4" fill="#ffffff"/>`;
      case 'AU':
      case 'NZ':
        return `<rect width="60" height="42" fill="#00008b"/>` +
          `<rect width="28" height="20" fill="#012169"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#ffffff" stroke-width="3.2"/><path d="M0,0 L28,20 M28,0 L0,20" stroke="#c8102e" stroke-width="1.4"/>` +
          `<rect x="11.5" width="5" height="20" fill="#ffffff"/><rect y="7.5" width="28" height="5" fill="#ffffff"/><rect x="12.6" width="2.8" height="20" fill="#c8102e"/><rect y="8.6" width="28" height="2.8" fill="#c8102e"/>` +
          `${star(45, 11, 3, code === 'NZ' ? '#cc142b' : '#ffffff')}${star(50, 22, 2.8, code === 'NZ' ? '#cc142b' : '#ffffff')}${star(44, 32, 3.2, code === 'NZ' ? '#cc142b' : '#ffffff')}` +
          (code === 'AU' ? star(14, 31, 4.5, '#ffffff') : star(39, 20, 2.6, '#cc142b'));
      case 'ZA':
        return `<rect width="60" height="21" fill="#e03c31"/><rect y="21" width="60" height="21" fill="#001489"/>` +
          `<path d="M0,0 L26,21 L0,42" fill="#ffb81c"/><path d="M0,5 L19,21 L0,37" fill="#151515"/>` +
          `<path d="M0,0 L24,18 H60 V24 H24 L0,42" fill="none" stroke="#ffffff" stroke-width="8"/><path d="M0,0 L24,18 H60 V24 H24 L0,42" fill="none" stroke="#007749" stroke-width="5"/>`;
      case 'JM':
        return `<rect width="60" height="42" fill="#009b3a"/><polygon points="0,0 26,21 0,42" fill="#151515"/><polygon points="60,0 34,21 60,42" fill="#151515"/>` +
          `<path d="M0,0 L60,42 M60,0 L0,42" stroke="#fed100" stroke-width="6.5"/>`;
      case 'IL':
        return `<rect width="60" height="42" fill="#ffffff"/><rect y="4.5" width="60" height="5" fill="#0038b8"/><rect y="32.5" width="60" height="5" fill="#0038b8"/>` +
          `<polygon points="30,13 36.5,24.5 23.5,24.5" fill="none" stroke="#0038b8" stroke-width="1.8"/><polygon points="30,29 36.5,17.5 23.5,17.5" fill="none" stroke="#0038b8" stroke-width="1.8"/>`;
      case 'AL':
        return `<rect width="60" height="42" fill="#e41e20"/><path d="M22 14 L30 19 L38 14 L35 28 L30 25 L25 28 Z" fill="#151515"/>`;
      case 'BA':
        return `<rect width="60" height="42" fill="#002395"/><polygon points="18,0 48,0 48,42" fill="#fecb00"/>${star(17, 7, 2.4, '#fff')}${star(24, 14, 2.4, '#fff')}${star(31, 21, 2.4, '#fff')}${star(38, 28, 2.4, '#fff')}${star(45, 35, 2.4, '#fff')}`;
      case 'CD':
        return `<rect width="60" height="42" fill="#007fff"/><path d="M0,42 L60,0" stroke="#f7d618" stroke-width="11"/><path d="M0,42 L60,0" stroke="#ce1021" stroke-width="7"/>${star(12, 11, 5.5, '#f7d618')}`;
      case 'CV':
        return `<rect width="60" height="42" fill="#003893"/><rect y="24" width="60" height="8" fill="#ffffff"/><rect y="26.5" width="60" height="3" fill="#cf2027"/>` +
          `<circle cx="22" cy="28" r="7.5" fill="none" stroke="#f7d116" stroke-width="2" stroke-dasharray="2.2 2.5"/>`;
      case 'GE':
        return `<rect width="60" height="42" fill="#ffffff"/><rect x="25" width="10" height="42" fill="#ff0000"/><rect y="16" width="60" height="10" fill="#ff0000"/>` +
          `<rect x="11" y="6" width="3" height="7" fill="#ff0000"/><rect x="9" y="8" width="7" height="3" fill="#ff0000"/>` +
          `<rect x="46" y="6" width="3" height="7" fill="#ff0000"/><rect x="44" y="8" width="7" height="3" fill="#ff0000"/>` +
          `<rect x="11" y="29" width="3" height="7" fill="#ff0000"/><rect x="9" y="31" width="7" height="3" fill="#ff0000"/>` +
          `<rect x="46" y="29" width="3" height="7" fill="#ff0000"/><rect x="44" y="31" width="7" height="3" fill="#ff0000"/>`;
      case 'ME':
        return `<rect width="60" height="42" fill="#c40308" stroke="#d4af37" stroke-width="4"/><circle cx="30" cy="21" r="7" fill="#d4af37"/>`;
      case 'PA':
        return `<rect width="30" height="21" fill="#ffffff"/><rect x="30" width="30" height="21" fill="#da121a"/><rect y="21" width="30" height="21" fill="#072357"/><rect x="30" y="21" width="30" height="21" fill="#ffffff"/>` +
          `${star(15, 10.5, 4.8, '#072357')}${star(45, 31.5, 4.8, '#da121a')}`;
      case 'XK':
        return `<rect width="60" height="42" fill="#244aa5"/><polygon points="24,18 31,14 36,22 30,30 23,24" fill="#d0a650"/>` +
          `<path d="M18 11 Q30 6 42 11" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="2.4 2.4"/>`;
      default:
        return h3('#1d444e', '#f5f3e9', '#b93926',
          `<text x="30" y="25" text-anchor="middle" font-family="Impact, sans-serif" font-size="13" fill="#14181c">${code.slice(0, 3)}</text>`);
    }
  }

  function renderFlag(club, size = 34) {
    const code = flagCode(club);
    const clip = `flag-clip-${++clipCounter}`;
    return `<svg class="team-emblem national-flag-badge" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Bandeira de ${club.name}">` +
      `<defs><clipPath id="${clip}"><rect x="0" y="0" width="60" height="42" rx="2"/></clipPath></defs>` +
      `<g clip-path="url(#${clip})" transform="translate(2,11)">${flagMarkup(code)}</g>` +
      `<rect x="2" y="11" width="60" height="42" rx="2" fill="none" stroke="#14181c" stroke-width="2.4"/>` +
      `</svg>`;
  }

  function clubCrest(club) {
    if (isNational(club)) {
      const code = flagCode(club);
      return {
        shape: 'flag',
        pattern: 'flag',
        symbol: 'flag',
        primary: club?.primary ?? '#1d6b3b',
        secondary: club?.secondary ?? '#f5f3e9',
        accent: '#14181c',
        initials: code.slice(0, 3)
      };
    }
    const rawName = club?.name || 'Clube';
    const name = normalize(rawName);
    const hash = [...name].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
    const profile = byName.get(name);
    const palette = palettesByName.get(name);
    const primary = palette?.[0] ?? club?.primary ?? '#3a4a6b';
    const secondary = palette?.[1] ?? club?.secondary ?? '#f5f3e9';
    const accent = palette?.[2] ?? palette?.[1] ?? club?.tertiary ?? secondary;
    return {
      shape: profile?.[0] ?? shapes[hash % shapes.length],
      pattern: profile?.[1] ?? club?.pattern ?? 'solid',
      symbol: profile?.[2] ?? 'monogram',
      primary,
      secondary,
      accent,
      initials: profile?.[3] ?? (club?.abbr || rawName.replace(/[^a-z0-9]/gi, '').slice(0, 3)).slice(0, 4).toUpperCase()
    };
  }

  let clipCounter = 0;

  function render(club, size = 34) {
    if (!club) return '';
    if (isNational(club)) return renderFlag(club, size);
    const clip = `crest-clip-${++clipCounter}`;
    const { shape, pattern, symbol, primary, secondary, accent, initials } = clubCrest(club);
    const silhouette = badgeShapes[shape] || badgeShapes.shield;
    const foreground = ink(primary);
    let patternSvg = '';
    if (pattern === 'stripes') {
      patternSvg = [12, 26, 40, 54].map(x => `<rect x="${x}" y="3" width="7" height="59" fill="${secondary}"/>`).join('');
    } else if (pattern === 'hoops') {
      patternSvg = [13, 27, 41, 55].map(y => `<rect x="3" y="${y}" width="58" height="7" fill="${secondary}"/>`).join('');
    } else if (pattern === 'sash') {
      patternSvg = `<path d="M4 52H10V46H16V40H22V34H28V28H34V22H40V16H46V10H52V4H64V16H58V22H52V28H46V34H40V40H34V46H28V52H22V58H16V64H4Z" fill="${secondary}"/>`;
    } else if (pattern === 'split') {
      patternSvg = `<path d="M32 2H62V62H32Z" fill="${secondary}"/>`;
    } else if (pattern === 'quarters') {
      patternSvg = `<path d="M32 2H62V32H32ZM2 32H32V62H2Z" fill="${secondary}"/>`;
    } else if (pattern === 'cross') {
      patternSvg = `<path d="M26 2H38V26H62V38H38V62H26V38H2V26H26Z" fill="${secondary}"/>`;
    }

    let centerSvg = '';
    if (symbol === 'monogram' || !badgeSymbols[symbol]) {
      const fontSize = initials.length > 2 ? 10 : initials.length > 1 ? 15 : 23;
      centerSvg = `<path d="M12 23H52V43H12Z" fill="${primary}"/>` +
        `<text x="32" y="38" text-anchor="middle" font-family="'Press Start 2P', monospace" font-weight="900" font-size="${fontSize}" fill="${foreground}">${initials}</text>`;
    } else {
      const symbolFill = symbol === 'cannon' ? '#e5b847' : symbol === 'cross' && /vasco/i.test(club.name || '') ? '#df3042' : foreground;
      centerSvg = `<path d="M23 11H41V15H49V23H54V43H49V51H41V55H23V51H15V43H10V23H15V15H23Z" fill="${primary}"/>` +
        `<path d="${badgeSymbols[symbol]}" fill="${symbolFill}" fill-rule="evenodd"/>`;
    }

    return `<svg class="team-emblem generated-pixel-badge" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Escudo do ${club.name}" shape-rendering="crispEdges">` +
      `<defs><clipPath id="${clip}"><path d="${silhouette}"/></clipPath></defs>` +
      `<g clip-path="url(#${clip})"><path d="${silhouette}" fill="${primary}"/>${patternSvg}${centerSvg}</g>` +
      `<path d="${silhouette}" fill="none" stroke="${accent}" stroke-width="3"/>` +
      `<path d="${silhouette}" fill="none" stroke="#14181c" stroke-width="1"/>` +
      `</svg>`;
  }

  window.goatClubBadge = { clubCrest, render };
})();
