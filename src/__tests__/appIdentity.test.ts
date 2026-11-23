/**
 * One name and one version (gap review Q51): "Empower Communication" under the icon, on the web page and in
 * the invitations; the version told to the server (app.json) is the one of package.json.
 */
import fs from 'fs';
import path from 'path';
import { APP_NAME } from '../i18n/account';

const ROOT = path.join(__dirname, '..', '..');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

describe('the app’s name and version', () => {
  const expo = read('app.json').expo;

  it('is "Empower Communication" everywhere, under the icon included', () => {
    expect(expo.name).toBe('Empower Communication');
    expect(expo.web.name).toBe('Empower Communication');
    expect(expo.web.shortName).toBe('Empower Communication');
    const manifest = read('public/manifest.json');
    expect(manifest.name).toBe('Empower Communication');
    expect(manifest.short_name).toBe('Empower Communication');
    expect(APP_NAME).toBe('Empower Communication');
  });

  it('has one version number', () => {
    expect(read('package.json').version).toBe(expo.version);
    expect(read('package-lock.json').version).toBe(expo.version);
  });

  it('lists every Expo module it imports', () => {
    const deps = read('package.json').dependencies;
    expect(deps['expo-constants']).toBeDefined();
  });
});
