/**
 * The verification code inside what was typed or pasted. Mail apps sometimes turn the code into a
 * phone link, so what gets pasted can be "tel:20883655" or a long wrapped link: the code is then
 * the first group of 6 to 8 digits in it. Spaces and invisible joiners inside a code are ignored.
 */
export function codeFrom(text: string): string {
  const plain = (text ?? '').replace(/[\s​-‍﻿]/g, '');
  if (/^\d*$/.test(plain)) return plain.slice(0, 8);
  const groups = plain.match(/\d+/g) ?? [];
  const code = groups.find((g) => g.length >= 6 && g.length <= 8);
  return (code ?? plain.replace(/\D/g, '')).slice(0, 8);
}
