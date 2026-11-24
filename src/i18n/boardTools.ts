/** Texts of the whiteboard, the visual scenes of the activity boards and the spelling suggestions. */
import type { UiLang } from '../model/types';

const fr = {
  // Whiteboard (button of the bar, under the timer)
  whiteboard: 'Tableau blanc',
  pen: 'Crayon',
  eraser: 'Gomme',
  color: 'Couleur',
  colors: { black: 'Noir', red: 'Rouge', orange: 'Orange', yellow: 'Jaune', green: 'Vert', blue: 'Bleu', purple: 'Violet', brown: 'Marron', pink: 'Rose' },
  thickness: 'Épaisseur',
  sizes: ['Fin', 'Moyen', 'Épais', 'Très épais'],
  background: 'Fond',
  backgrounds: { plain: 'Blanc', grid: 'Quadrillé', lines: 'Lignes' },
  undo: 'Annuler le dernier trait',
  redo: 'Rétablir',
  clear: 'Effacer le dessin',
  clearAsk: 'Effacer tout le dessin ?',
  clearYes: 'Oui, effacer',
  drawHere: 'Dessinez ici avec le doigt',
  canvas: 'Zone de dessin',
  // Visual scene of an activity board
  newScene: 'Nouvelle scène',
  sceneTitle: 'Scène visuelle',
  sceneNote: 'Une grande image à gauche, les pictogrammes du TLA à droite. Choisissez l’image :',
  sceneChange: 'Changer l’image',
  sceneRemove: 'Retirer la scène',
  sceneChoose: 'Touchez pour choisir l’image',
  scenePicture: 'Image de la scène',
  showBoard: 'TLA',
  showScene: 'Scène visuelle',
  // Spelling
  didYouMean: 'Vouliez-vous dire',
  // A sentence as the topic of a new activity board
  sourceSentence: 'Proposition à partir des mots de la phrase',
};

type Dict = typeof fr;

const en: Dict = {
  whiteboard: 'Whiteboard',
  pen: 'Pen',
  eraser: 'Eraser',
  color: 'Colour',
  colors: { black: 'Black', red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', purple: 'Purple', brown: 'Brown', pink: 'Pink' },
  thickness: 'Thickness',
  sizes: ['Thin', 'Medium', 'Thick', 'Very thick'],
  background: 'Background',
  backgrounds: { plain: 'Plain', grid: 'Grid', lines: 'Lines' },
  undo: 'Undo the last line',
  redo: 'Redo',
  clear: 'Clear the drawing',
  clearAsk: 'Clear the whole drawing?',
  clearYes: 'Yes, clear it',
  drawHere: 'Draw here with your finger',
  canvas: 'Drawing area',
  newScene: 'New scene',
  sceneTitle: 'Visual scene',
  sceneNote: 'A big picture on the left, the board’s pictograms on the right. Choose the picture:',
  sceneChange: 'Change the picture',
  sceneRemove: 'Remove the scene',
  sceneChoose: 'Touch to choose the picture',
  scenePicture: 'Scene picture',
  showBoard: 'Board',
  showScene: 'Visual scene',
  didYouMean: 'Did you mean',
  sourceSentence: 'Suggested from the words of the sentence',
};

const ar: Dict = {
  whiteboard: 'اللوح الأبيض',
  pen: 'قلم',
  eraser: 'ممحاة',
  color: 'اللون',
  colors: { black: 'أسود', red: 'أحمر', orange: 'برتقالي', yellow: 'أصفر', green: 'أخضر', blue: 'أزرق', purple: 'بنفسجي', brown: 'بنّي', pink: 'زهري' },
  thickness: 'السماكة',
  sizes: ['رفيع', 'متوسط', 'سميك', 'سميك جدًا'],
  background: 'الخلفية',
  backgrounds: { plain: 'أبيض', grid: 'مربّعات', lines: 'أسطر' },
  undo: 'التراجع عن آخر خط',
  redo: 'إعادة',
  clear: 'مسح الرسم',
  clearAsk: 'مسح الرسم كله؟',
  clearYes: 'نعم، امسحوه',
  drawHere: 'ارسموا هنا بالإصبع',
  canvas: 'مساحة الرسم',
  newScene: 'مشهد جديد',
  sceneTitle: 'مشهد بصري',
  sceneNote: 'صورة كبيرة على اليسار، ورموز اللوحة على اليمين. اختاروا الصورة:',
  sceneChange: 'تغيير الصورة',
  sceneRemove: 'إزالة المشهد',
  sceneChoose: 'المسوا لاختيار الصورة',
  scenePicture: 'صورة المشهد',
  showBoard: 'لوحة',
  showScene: 'مشهد بصري',
  didYouMean: 'هل تقصدون',
  sourceSentence: 'اقتراح من كلمات الجملة',
};

const DICTS: Record<UiLang, Dict> = { fr, en, ar };
export type BoardToolsStrings = Dict;
export const boardToolsStrings = (l: UiLang): Dict => DICTS[l];
