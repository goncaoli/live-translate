import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface TranslationHandlers {
  onInterim?: (original: string) => void;
  onFinal?: (original: string, translations: Record<string, string>) => void;
  onError?: (details: string) => void;
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

  recognizer.recognizing = (_sender, event) => {
    handlers.onInterim?.(event.result.text);
  };

  recognizer.recognized = (_sender, event) => {
    if (event.result.reason === sdk.ResultReason.TranslatedSpeech) {
      const translations: Record<string, string> = {};
      for (const lang of targetLangs) {
        translations[lang] = event.result.translations.get(lang) ?? "";
      }
      handlers.onFinal?.(event.result.text, translations);
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
