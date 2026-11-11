/**
 * Short credit for the pictograms (printed boards, welcome page): every library in the app, with
 * its author and licence. The full notices are on the page Settings → About → Pictogram credits
 * & licences (src/ui/PictoCredits.tsx), built from the same generated list.
 */
import type { UiLang } from '../model/types';
import { PICTO_LIBRARIES } from './pictoLibraries';

const PREFIX: Record<UiLang, string> = { fr: 'Pictogrammes : ', en: 'Pictograms: ', ar: 'الرموز: ' };

export const pictoCreditLine = (lang: UiLang): string =>
  PREFIX[lang] + PICTO_LIBRARIES.map((l) => `${l.name} (${l.author.split(/[;(]/)[0].trim()}, ${l.license.split(' (')[0]})`).join(' · ');
