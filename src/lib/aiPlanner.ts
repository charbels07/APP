/**
 * AI proposals for TLAs (spec §20, "service de génération").
 *
 * On devices this needs the family's generation service (a small server that
 * calls Claude with the same prompt): not built yet, so it is unavailable and
 * the app uses the situation library and ARASAAC categories instead.
 * The browser demo uses aiPlanner.web.ts.
 */
import type { AiPlan } from './tlaPlanner';

export async function aiAvailable(): Promise<boolean> {
  return false;
}

export async function askAiForTla(_topic: string, _signal?: AbortSignal): Promise<AiPlan | null> {
  return null;
}
