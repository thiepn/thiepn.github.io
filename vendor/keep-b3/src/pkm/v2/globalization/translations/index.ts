/**
 * Translation Dictionary Registry
 */
import { TranslationDictionary, UILanguageCode } from '../globalizationTypes';
import { enTranslations } from './en';
import { deTranslations, frTranslations, koTranslations, trTranslations, arTranslations } from './otherLocales';

export const TRANSLATION_CATALOG: Record<UILanguageCode, TranslationDictionary> = {
  en: enTranslations,
  de: deTranslations,
  fr: frTranslations,
  ko: koTranslations,
  tr: trTranslations,
  'ar-rtl': arTranslations,
  pseudo: {} as TranslationDictionary, // dynamically generated or layered
};
