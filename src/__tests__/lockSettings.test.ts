/**
 * "Lock the screen": the bar's Lock button no longer locks anything inside the app (a page or an
 * app cannot keep a child in); it opens the device's settings where Guided Access / app pinning is.
 */
const mockSendIntent = jest.fn();
const mockOpenSettings = jest.fn();
const mockPlatform = { OS: 'android' };
jest.mock('react-native', () => ({ Linking: { sendIntent: mockSendIntent, openSettings: mockOpenSettings }, Platform: mockPlatform }));

import { readFileSync } from 'fs';
import { join } from 'path';
// Required after the mocks above exist (an import would be read before them).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ANDROID_PINNING_PAGE, openLockSettings } = require('../lib/lockSettings') as typeof import('../lib/lockSettings');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const web = require('../lib/lockSettings.web') as typeof import('../lib/lockSettings.web');

beforeEach(() => {
  mockSendIntent.mockReset().mockResolvedValue(undefined);
  mockOpenSettings.mockReset().mockResolvedValue(undefined);
});

describe('opening the device settings', () => {
  it('Android: the Security page, where app pinning is', async () => {
    mockPlatform.OS = 'android';
    expect(await openLockSettings()).toBe(true);
    expect(mockSendIntent).toHaveBeenCalledWith(ANDROID_PINNING_PAGE);
    expect(ANDROID_PINNING_PAGE).toBe('android.settings.SECURITY_SETTINGS');
    expect(mockOpenSettings).not.toHaveBeenCalled();
  });

  it('Android without that page: the app’s own settings page', async () => {
    mockPlatform.OS = 'android';
    mockSendIntent.mockRejectedValue(new Error('no activity'));
    expect(await openLockSettings()).toBe(true);
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('iOS: Settings (the only page a store app may open)', async () => {
    mockPlatform.OS = 'ios';
    expect(await openLockSettings()).toBe(true);
    expect(mockSendIntent).not.toHaveBeenCalled();
    expect(mockOpenSettings).toHaveBeenCalled();
  });

  it('a refusal answers false, never throws', async () => {
    mockPlatform.OS = 'ios';
    mockOpenSettings.mockRejectedValue(new Error('refused'));
    expect(await openLockSettings()).toBe(false);
  });

  it('a browser cannot open them: no button, only the sentence', async () => {
    expect(web.opensDeviceSettings).toBe(false);
    expect(await web.openLockSettings()).toBe(false);
  });
});

describe('nothing of the old in-app lock is left', () => {
  const src = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');
  it('no full screen, no blocked back button, no "locked" board', () => {
    expect(src('ui/Stages.tsx')).not.toMatch(/childLock|guardLeaving|LockEffects/);
    expect(src('state/Session.tsx')).not.toMatch(/childLock/);
    expect(src('state/AppState.tsx')).not.toMatch(/lockedRef|\blocked\?: boolean/);
    expect(src('ui/panels/CaregiverPanels.tsx')).toMatch(/openLockSettings\(\)/);
  });

  it('the bar shows Lock on a child’s board: the family’s, and a professional’s draft of it', () => {
    const lock = src('ui/UniversalBar.tsx').split('\n').find((l) => l.includes("key: 'childLock'")) ?? '';
    expect(lock).toContain("behindCode('lock')");
    expect(lock).toContain('show: !!board || !!proBoard');
  });
});
