/**
 * App font presets — system default is free; others are Pro-gated.
 *
 * - System: platform default
 * - Inter: clean sans-serif (Inter-like)
 * - Nunito: rounded, friendly
 * - Lora: elegant serif
 * - Space Mono: modern monospace (bundled asset)
 * - Poppins Bold: display headline weight
 */

export type AppFontId =
  | 'system'
  | 'inter'
  | 'nunito'
  | 'lora'
  | 'space_mono'
  | 'poppins';

export type AppFontPreset = {
  id: AppFontId;
  /** i18n key under fonts.* */
  nameKey: string;
  descriptionKey: string;
  /** React Native fontFamily; undefined = system default */
  fontFamily: string | undefined;
  /** Sample phrase i18n key */
  sampleKey: string;
  /** Pro-only (system is free) */
  isPro: boolean;
};

export const DEFAULT_FONT_ID: AppFontId = 'system';

export const APP_FONTS: Record<AppFontId, AppFontPreset> = {
  system: {
    id: 'system',
    nameKey: 'fonts.system.name',
    descriptionKey: 'fonts.system.description',
    fontFamily: undefined,
    sampleKey: 'fonts.sample',
    isPro: false,
  },
  inter: {
    id: 'inter',
    nameKey: 'fonts.inter.name',
    descriptionKey: 'fonts.inter.description',
    fontFamily: 'Inter_400Regular',
    sampleKey: 'fonts.sample',
    isPro: true,
  },
  nunito: {
    id: 'nunito',
    nameKey: 'fonts.nunito.name',
    descriptionKey: 'fonts.nunito.description',
    fontFamily: 'Nunito_600SemiBold',
    sampleKey: 'fonts.sample',
    isPro: true,
  },
  lora: {
    id: 'lora',
    nameKey: 'fonts.lora.name',
    descriptionKey: 'fonts.lora.description',
    fontFamily: 'Lora_400Regular',
    sampleKey: 'fonts.sample',
    isPro: true,
  },
  space_mono: {
    id: 'space_mono',
    nameKey: 'fonts.spaceMono.name',
    descriptionKey: 'fonts.spaceMono.description',
    fontFamily: 'SpaceMono',
    sampleKey: 'fonts.sample',
    isPro: true,
  },
  poppins: {
    id: 'poppins',
    nameKey: 'fonts.poppins.name',
    descriptionKey: 'fonts.poppins.description',
    fontFamily: 'Poppins_700Bold',
    sampleKey: 'fonts.sample',
    isPro: true,
  },
};

export const APP_FONT_LIST: AppFontPreset[] = Object.values(APP_FONTS);

export function getAppFont(id: AppFontId): AppFontPreset {
  return APP_FONTS[id] ?? APP_FONTS[DEFAULT_FONT_ID];
}

export function isValidFontId(value: string): value is AppFontId {
  return value in APP_FONTS;
}
