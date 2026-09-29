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
