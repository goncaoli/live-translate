import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface TranslationHandlers {
  onInterim?: (original: string, translations: Record<string, string>) => void;
  onFinal?: (original: string, translations: Record<string, string>) => void;
  onError?: (details: string) => void;
}

function extractTranslations(result: sdk.TranslationRecognitionResult, targetLangs: string[]): Record<string, string> {
  const translations: Record<string, string> = {};
  for (const lang of targetLangs) {
    translations[lang] = result.translations.get(lang) ?? "";
  }
  return translations;
}

export async function startTranslation(
  token: string,
  region: string,
  sourceLang: string,
  targetLangs: string[],
  handlers: TranslationHandlers,
): Promise<sdk.TranslationRecognizer> {
  const config = sdk.SpeechTranslationConfig.fromAuthorizationToken(token, region);
  config.speechRecognitionLanguage = sourceLang;
  targetLangs.forEach((lang) => config.addTargetLanguage(lang));

  const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
  const recognizer = new sdk.TranslationRecognizer(config, audioConfig);

  // Azure streams partial translations as the speaker talks, not just once
  // they pause — using them is what makes captions feel live instead of
  // waiting for each sentence to fully close.
  recognizer.recognizing = (_sender, event) => {
    if (!event.result.text) return;
    handlers.onInterim?.(event.result.text, extractTranslations(event.result, targetLangs));
  };

  recognizer.recognized = (_sender, event) => {
    if (event.result.reason === sdk.ResultReason.TranslatedSpeech) {
      handlers.onFinal?.(event.result.text, extractTranslations(event.result, targetLangs));
    }
  };

  recognizer.canceled = (_sender, event) => {
    handlers.onError?.(event.errorDetails);
  };

  await new Promise<void>((resolve, reject) => {
    recognizer.startContinuousRecognitionAsync(() => resolve(), reject);
  });

  return recognizer;
}

export async function stopTranslation(recognizer: sdk.TranslationRecognizer): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    recognizer.stopContinuousRecognitionAsync(() => resolve(), reject);
  });
  recognizer.close();
}
