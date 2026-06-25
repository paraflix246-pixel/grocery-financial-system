export type StoreDefinition = {
  id: string;
  name: string;
  brandColor: string;
  logoUrl: string;
  initials: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  region?: string;
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

/**
 * SVG initials-badge fallback — used only for custom/unknown stores where no
 * real logo URL is available. expo-image cannot render data: URIs on native,
 * so StoreBrandAvatar detects these and renders the initials Text instead.
 */
function svgLogoDataUri(label: string, bg: string, fg = '#FFFFFF'): string {
  const safeLabel = escapeSvgText(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="24" fill="${bg}"/>
    <text x="60" y="72" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="${fg}">${safeLabel}</text>
  </svg>`;
  return svgDataUri(svg);
}

/**
 * Returns a Google Favicon CDN URL for a given domain.
 * Served from Google's CDN — no CORS issues, works on Android & iOS with expo-image.
 * Falls back to initials via onError in StoreBrandAvatar if the favicon is unavailable.
 */
function googleFaviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Popular US grocery stores with brand colors and real CDN logo URLs. */
export const CATALOG_STORES: StoreDefinition[] = [
  { id: 'walmart',     name: 'Walmart',      brandColor: '#0071CE', initials: 'W',  logoUrl: googleFaviconUrl('walmart.com') },
  { id: 'target',      name: 'Target',        brandColor: '#CC0000', initials: 'T',  logoUrl: googleFaviconUrl('target.com') },
  { id: 'aldi',        name: 'Aldi',          brandColor: '#F57900', initials: 'A',  logoUrl: googleFaviconUrl('aldi.us') },
  { id: 'costco',      name: 'Costco',        brandColor: '#003087', initials: 'C',  logoUrl: googleFaviconUrl('costco.com') },
  { id: 'kroger',      name: 'Kroger',        brandColor: '#004B87', initials: 'K',  logoUrl: googleFaviconUrl('kroger.com') },
  { id: 'safeway',     name: 'Safeway',       brandColor: '#E31837', initials: 'S',  logoUrl: googleFaviconUrl('safeway.com') },
  { id: 'publix',      name: 'Publix',        brandColor: '#006633', initials: 'P',  logoUrl: googleFaviconUrl('publix.com') },
  { id: 'whole-foods', name: 'Whole Foods',   brandColor: '#00674F', initials: 'WF', logoUrl: googleFaviconUrl('wholefoodsmarket.com') },
  { id: 'trader-joes', name: "Trader Joe's",  brandColor: '#D32323', initials: 'TJ', logoUrl: googleFaviconUrl('traderjoes.com') },
  { id: 'sams-club',   name: "Sam's Club",    brandColor: '#0067A0', initials: 'SC', logoUrl: googleFaviconUrl('samsclub.com') },
  { id: 'heb',         name: 'H-E-B',         brandColor: '#EE3124', initials: 'H',  logoUrl: googleFaviconUrl('heb.com') },
  { id: 'wegmans',     name: 'Wegmans',       brandColor: '#C8102E', initials: 'W',  logoUrl: googleFaviconUrl('wegmans.com') },
  { id: 'sprouts',     name: 'Sprouts',       brandColor: '#00843D', initials: 'SP', logoUrl: googleFaviconUrl('sprouts.com') },
  { id: 'food-lion',   name: 'Food Lion',     brandColor: '#00529B', initials: 'FL', logoUrl: googleFaviconUrl('foodlion.com') },
  { id: 'meijer',      name: 'Meijer',        brandColor: '#D31145', initials: 'M',  logoUrl: googleFaviconUrl('meijer.com') },
  { id: 'winco',       name: 'WinCo',         brandColor: '#E31837', initials: 'WC', logoUrl: googleFaviconUrl('wincofoods.com') },
  { id: 'giant-eagle', name: 'Giant Eagle',   brandColor: '#C8102E', initials: 'GE', logoUrl: googleFaviconUrl('gianteagle.com') },
  { id: 'stop-shop',   name: 'Stop & Shop',   brandColor: '#00843D', initials: 'SS', logoUrl: googleFaviconUrl('stopandshop.com') },
  { id: 'albertsons',  name: 'Albertsons',    brandColor: '#004B87', initials: 'AB', logoUrl: googleFaviconUrl('albertsons.com') },
  { id: 'shoprite',    name: 'ShopRite',      brandColor: '#E31837', initials: 'SR', logoUrl: googleFaviconUrl('shoprite.com') },
  { id: 'amazon-fresh',name: 'Amazon Fresh',  brandColor: '#00A8E1', initials: 'AF', logoUrl: googleFaviconUrl('amazon.com') },
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
