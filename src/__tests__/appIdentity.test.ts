/**
 * One name and one version (gap review Q51): "Daleth AAC" under the icon, on the web page and in
 * the invitations; the version told to the server (app.json) is the one of package.json.
 */
import fs from 'fs';
import path from 'path';
import { APP_NAME } from '../i18n/account';

const ROOT = path.join(__dirname, '..', '..');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));

describe('the app’s name and version', () => {
  const expo = read('app.json').expo;

  it('is "Daleth AAC" everywhere, under the icon included', () => {
    expect(expo.name).toBe('Daleth AAC');
    expect(expo.web.name).toBe('Daleth AAC');
    expect(expo.web.shortName).toBe('Daleth AAC');
    const manifest = read('public/manifest.json');
    expect(manifest.name).toBe('Daleth AAC');
    expect(manifest.short_name).toBe('Daleth AAC');
    expect(APP_NAME).toBe('Daleth AAC');
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
