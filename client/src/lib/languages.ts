export interface LanguageOption {
  code: string;
  label: string;
}

// Codes follow Azure Speech Translation's "target language" format (2-letter or locale).
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "zh-Hans", label: "中文" },
];

export const SOURCE_LANGUAGE = "pt-PT";

// Matches the group suffix the API uses for presence pings (api/src/functions/presence.ts).
export const PRESENCE_LANG = "presence";

// Excludes whatever the talk is actually spoken in (e.g. a Google DeepMind
// speaker presenting in en-US) from both the speaker's translation targets
// and the viewer's language picker — otherwise picking that language would
// silently never show anything, since nothing broadcasts a translation into
// the source language itself.
export function getSelectableLanguages(sourceLanguage: string): LanguageOption[] {
  const sourcePrefix = sourceLanguage.split("-")[0].toLowerCase();
  return SUPPORTED_LANGUAGES.filter((l) => l.code.toLowerCase() !== sourcePrefix);
}
