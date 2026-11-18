/**
 * Tour-specific vocabulary for the merch-flow report.
 *
 * The defaults are the values the MerchFlow Charts app shipped with for the
 * Five Finger Death Punch 2026 tour. Pass a partial config to any function that
 * takes one to adapt the cleaning and checks to another artist.
 */

/** Spend per head below this looks like an attendance entry error. */
export const PER_HEAD_SUSPECT_BELOW = 5;

/** How many of the best sellers the missing-photo check looks at. */
export const TOP_N = 10;

export type KeyFigureConfig = {
  /** Matched against each product's display name. */
  pattern: RegExp;
  /** Plural noun used in the sentence, e.g. "itinerary tees". */
  label: string;
  /** How many of the matching products to total. */
  topN: number;
};

export type MerchFlowConfig = {
  /** Upper-cased city as stored → suggested spelling. Suggested, never applied. */
  cityTypos: Record<string, string>;
  /** Product-name typos worth offering, keyed on the stored spelling. */
  nameTypos: Record<string, string>;
  /** Tokens that must survive title-casing intact. */
  acronyms: readonly string[];
  /** Leading colourway on a product name; capture group 1 is the colour. */
  colorPrefix: RegExp;
  /** Names matching this keep their colour prefix (it is part of the name). */
  keepColorPrefixIf: RegExp;
  /** Artist code stripped from the front of product names. */
  artistPrefix: RegExp;
  /** Trade shorthand expansions, applied in order. */
  shorthand: ReadonlyArray<readonly [RegExp, string]>;
  /** The "N of the units were X" key figure. */
  keyFigure: KeyFigureConfig;
};

export const DEFAULT_CONFIG: MerchFlowConfig = {
  cityTypos: {
    HUNTSVILE: 'Huntsville',
    'VIRGINA BEACH': 'Virginia Beach',
  },
  nameTypos: {
    CAPTIANS: 'Captains',
  },
  acronyms: ['USA', 'FFDP', 'XX', 'LS', 'DC', 'NY', 'LA', 'UK'],
  colorPrefix: /^(BLACK AND YELLOW|BLACK|RED|WHITE|GREY|GRAY)\s+/i,
  keepColorPrefixIf: /BANDANA$/i,
  artistPrefix: /^FFDP\s+/i,
  shorthand: [
    [/\bITIN\b/gi, 'Itinerary'],
    [/\bCAPTIANS\b/gi, 'Captains'],
    [/\bWOMENS\b/gi, "Women's"],
    [/\bLONGSLEEVE\b/gi, 'Long Sleeve'],
    [/\bWT\b/g, 'World Tour'],
  ],
  keyFigure: { pattern: /itinerary/i, label: 'itinerary tees', topN: 3 },
};

export type MerchFlowOptions = Partial<MerchFlowConfig>;

export function resolveConfig(options?: MerchFlowOptions): MerchFlowConfig {
  if (!options) return DEFAULT_CONFIG;
  const defined = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as MerchFlowOptions;
  return { ...DEFAULT_CONFIG, ...defined };
}
