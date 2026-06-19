export type StoreDefinition = {
  id: string;
  name: string;
  brandColor: string;
  logoUrl: string;
  initials: string;
  isCustom?: boolean;
};

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function svgLogoDataUri(label: string, bg: string, fg = '#FFFFFF'): string {
  const safeLabel = escapeSvgText(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="${bg}"/>
    <text x="60" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="${fg}">${safeLabel}</text>
  </svg>`;
  return svgDataUri(svg);
}

function aldiLogoDataUri(): string {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#0B2D72"/>
    <rect x="16" y="16" width="88" height="88" rx="18" fill="#143C8A" stroke="#F5A623" stroke-width="6"/>
    <path d="M36 89 57 31h12l21 58H76l-4-13H53l-4 13H36Zm21-25h11l-5-17-6 17Z" fill="#FFFFFF"/>
    <path d="M32 97h56" stroke="#F57900" stroke-width="7" stroke-linecap="round"/>
  </svg>`);
}

function walmartLogoDataUri(): string {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#0071CE"/>
    <text x="46" y="68" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#FFFFFF">Walmart</text>
    <g fill="#FFC220" transform="translate(82 59)">
      <rect x="-3" y="-24" width="6" height="17" rx="3"/>
      <rect x="-3" y="7" width="6" height="17" rx="3"/>
      <rect x="7" y="-18" width="6" height="17" rx="3" transform="rotate(60 10 -10)"/>
      <rect x="7" y="1" width="6" height="17" rx="3" transform="rotate(120 10 9)"/>
      <rect x="-13" y="-18" width="6" height="17" rx="3" transform="rotate(-60 -10 -10)"/>
      <rect x="-13" y="1" width="6" height="17" rx="3" transform="rotate(-120 -10 9)"/>
    </g>
  </svg>`);
}

function costcoLogoDataUri(): string {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#FFFFFF"/>
    <rect x="14" y="18" width="92" height="84" rx="18" fill="#FFFFFF" stroke="#D9E2F1" stroke-width="4"/>
    <text x="60" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="800" font-style="italic" fill="#E31837">COSTCO</text>
    <path d="M25 69h70" stroke="#005DAA" stroke-width="6" stroke-linecap="round"/>
    <path d="M35 80h50" stroke="#005DAA" stroke-width="4" stroke-linecap="round"/>
  </svg>`);
}

function krogerLogoDataUri(): string {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#004B87"/>
    <rect x="17" y="34" width="86" height="52" rx="26" fill="#0F6FB6"/>
    <text x="60" y="68" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#FFFFFF">Kroger</text>
  </svg>`);
}

function targetLogoDataUri(): string {
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="#FFFFFF"/>
    <circle cx="60" cy="48" r="28" fill="#CC0000"/>
    <circle cx="60" cy="48" r="16" fill="#FFFFFF"/>
    <circle cx="60" cy="48" r="8" fill="#CC0000"/>
    <text x="60" y="92" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#CC0000">Target</text>
  </svg>`);
}

/** Popular US grocery stores with brand colors and SVG logo fallbacks. */
export const CATALOG_STORES: StoreDefinition[] = [
  { id: 'walmart', name: 'Walmart', brandColor: '#0071CE', initials: 'W', logoUrl: walmartLogoDataUri() },
  { id: 'target', name: 'Target', brandColor: '#CC0000', initials: 'T', logoUrl: targetLogoDataUri() },
  { id: 'aldi', name: 'Aldi', brandColor: '#F57900', initials: 'A', logoUrl: aldiLogoDataUri() },
  { id: 'costco', name: 'Costco', brandColor: '#003087', initials: 'C', logoUrl: costcoLogoDataUri() },
  { id: 'kroger', name: 'Kroger', brandColor: '#004B87', initials: 'K', logoUrl: krogerLogoDataUri() },
  { id: 'safeway', name: 'Safeway', brandColor: '#E31837', initials: 'S', logoUrl: svgLogoDataUri('S', '#E31837') },
  { id: 'publix', name: 'Publix', brandColor: '#006633', initials: 'P', logoUrl: svgLogoDataUri('P', '#006633') },
  { id: 'whole-foods', name: 'Whole Foods', brandColor: '#00674F', initials: 'WF', logoUrl: svgLogoDataUri('WF', '#00674F') },
  { id: 'trader-joes', name: "Trader Joe's", brandColor: '#D32323', initials: 'TJ', logoUrl: svgLogoDataUri('TJ', '#D32323') },
  { id: 'sams-club', name: "Sam's Club", brandColor: '#0067A0', initials: 'SC', logoUrl: svgLogoDataUri('SC', '#0067A0') },
  { id: 'heb', name: 'H-E-B', brandColor: '#EE3124', initials: 'H', logoUrl: svgLogoDataUri('H', '#EE3124') },
  { id: 'wegmans', name: 'Wegmans', brandColor: '#C8102E', initials: 'W', logoUrl: svgLogoDataUri('W', '#C8102E') },
  { id: 'sprouts', name: 'Sprouts', brandColor: '#00843D', initials: 'SP', logoUrl: svgLogoDataUri('SP', '#00843D') },
  { id: 'food-lion', name: 'Food Lion', brandColor: '#00529B', initials: 'FL', logoUrl: svgLogoDataUri('FL', '#00529B') },
  { id: 'meijer', name: 'Meijer', brandColor: '#D31145', initials: 'M', logoUrl: svgLogoDataUri('M', '#D31145') },
  { id: 'winco', name: 'WinCo', brandColor: '#E31837', initials: 'WC', logoUrl: svgLogoDataUri('WC', '#E31837') },
  { id: 'giant-eagle', name: 'Giant Eagle', brandColor: '#C8102E', initials: 'GE', logoUrl: svgLogoDataUri('GE', '#C8102E') },
  { id: 'stop-shop', name: 'Stop & Shop', brandColor: '#00843D', initials: 'SS', logoUrl: svgLogoDataUri('SS', '#00843D') },
  { id: 'albertsons', name: 'Albertsons', brandColor: '#004B87', initials: 'AB', logoUrl: svgLogoDataUri('AB', '#004B87') },
  { id: 'shoprite', name: 'ShopRite', brandColor: '#E31837', initials: 'SR', logoUrl: svgLogoDataUri('SR', '#E31837') },
];

export const CATALOG_STORE_NAMES = CATALOG_STORES.map((s) => s.name);

export function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

export function pickBrandColor(name: string): string {
  const hash = name.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  const palette = ['#0071CE', '#CC0000', '#004B87', '#006633', '#D32323', '#00843D', '#0067A0'];
  return palette[hash % palette.length];
}

export function buildCustomStore(name: string): StoreDefinition {
  const brandColor = pickBrandColor(name);
  const initials = getStoreInitials(name);
  return {
    id: `custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: name.trim(),
    brandColor,
    initials,
    logoUrl: svgLogoDataUri(initials.slice(0, 2), brandColor),
    isCustom: true,
  };
}
