export interface LanguageOption {
  code: string;
  label: string;
}

// Codes follow Azure Speech Translation's "target language" format (2-letter or locale).
// Deliberately just English: every extra target language is another SignalR
// message per broadcast (api/src/functions/broadcast.ts fans out one message
// per language), and only English captions are actually needed for the
// site/TV — every language here multiplies that message volume against the
// SignalR Free tier's daily quota.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [{ code: "en", label: "English" }];

export const SOURCE_LANGUAGE = "pt-PT";

// The room operator picks one of these before starting — Azure Speech can't
// switch source language mid-session, so this is a manual choice made once
// per "Começar a falar", not per talk.
export const SOURCE_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "pt-PT", label: "Português" },
  { code: "en-US", label: "English" },
];

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
