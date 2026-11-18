/**
 * The sentences iOS shows when the app asks for the microphone, speech recognition, the camera and
 * the photo library: in French, English and Arabic (Expo's `locales`, one InfoPlist.strings per
 * language), English when the device is in another language (`ios.infoPlist`).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const KEYS = ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription'];

describe('permission sentences', () => {
  const expo = read('app.json').expo;
  const locales = { fr: read('locales/fr.json').ios, en: read('locales/en.json').ios, ar: read('locales/ar.json').ios };

  it('exist in the three languages, and English is the one used for any other language', () => {
    expect(expo.locales).toEqual({ fr: './locales/fr.json', en: './locales/en.json', ar: './locales/ar.json' });
    expect(expo.ios.infoPlist.CFBundleAllowMixedLocalizations).toBe(true);
    for (const [lang, texts] of Object.entries(locales)) {
      expect(Object.keys(texts).sort()).toEqual([...KEYS].sort());
      for (const k of KEYS) {
        expect(texts[k].length).toBeGreaterThan(40);
        if (lang === 'ar') expect(texts[k]).toMatch(/[؀-ۿ]/);
      }
    }
    for (const k of KEYS) expect(expo.ios.infoPlist[k]).toBe(locales.en[k]);
  });

  it('come from one place: the plugins do not carry their own', () => {
    for (const p of expo.plugins) {
      const options = Array.isArray(p) ? p[1] ?? {} : {};
      for (const k of ['microphonePermission', 'cameraPermission', 'photosPermission', 'speechRecognitionPermission']) expect(options[k]).toBeUndefined();
    }
  });

  it('say that photos and recordings go to the child’s private space of the family’s account, not that they stay on the device', () => {
    for (const texts of Object.values(locales)) {
      const all = KEYS.map((k) => texts[k]).join(' ');
      expect(all).not.toMatch(/restent sur l’appareil|stay on the device|تبقى على الجهاز/);
    }
    expect(locales.fr.NSPhotoLibraryUsageDescription).toContain('espace privé de l’enfant');
    expect(locales.en.NSMicrophoneUsageDescription).toContain('child’s private space in the family’s account');
    expect(locales.ar.NSCameraUsageDescription).toContain('المساحة الخاصة بالطفل في حساب العائلة');
  });

  it('leave the app’s identifiers to the owner', () => {
    expect(expo.ios.bundleIdentifier).toBeUndefined();
    expect(expo.android.package).toBeUndefined();
  });

  it('the short words of the board are not played in the background (no background audio mode, no media service)', () => {
    const audio = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-audio');
    expect(audio?.[1]?.enableBackgroundPlayback).toBe(false);
  });
});
