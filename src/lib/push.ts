/**
 * Notifications outside the app (the 12:00 reminder for parents, a new idea to vote on).
 *
 * Today they are browser notifications: the web version asks the browser (`push.web.ts`). The
 * tablet and phone apps of the stores have none yet: this file answers "not here" for them, and
 * the screens then show nothing about notifications.
 */
import type { Backend } from '../backend/Backend';
import type { UiLang } from '../model/types';

/** 'ok': can be turned on here · 'homeScreen': iPhone / iPad, once the app is on the Home Screen · 'no'. */
export type PushSupport = 'ok' | 'homeScreen' | 'no';

export const pushSupport = (): PushSupport => 'no';
/** The browser's own answer: the person refused there ("denied") and only they can change it, in the browser. */
export const pushRefused = (): boolean => false;
export const pushIsOn = async (): Promise<boolean> => false;
export const turnPushOn = async (_api: Backend, _lang: UiLang): Promise<'on' | 'refused' | 'failed'> => 'failed';
export const turnPushOff = async (_api: Backend): Promise<void> => {};
/** When the app opens: this device says it is still there (language, time zone). */
export const refreshPush = async (_api: Backend, _lang: UiLang): Promise<void> => {};
/** Should "Turn on notifications?" be asked now (once per account on a device)? */
export const shouldAskPush = async (_api: Backend, _accountId: string): Promise<boolean> => false;
export const pushAsked = async (_accountId: string): Promise<void> => {};
