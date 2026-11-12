'use strict';
// Switch 2 settings NSO SHA-256 76230b9a78f10f968e135498a4329a29c585464e4da28bd6effcffc8c3e453e1
// conversion table at module VA 0xa945a. This is NOT its separate legacy
// compatibility table at 0xa94ea (where 6=zh-CN, 7=ko, 11=zh-TW).
// Conversion slots 18/19 repeat ja/en-US; they are not additional targets.
// A separate read-only console census matched indices 0..19 on the owner unit.
// Every write still requires a same-boot MakeLanguageCode check before setter.
const CODES = Object.freeze([
  'ja', 'en-US', 'fr', 'de', 'it', 'es', 'ko', 'nl', 'pt', 'ru',
  'en-GB', 'fr-CA', 'es-419', 'zh-Hans', 'zh-Hant', 'pt-BR', 'pl', 'th'
]);
function byCode(code) {
  const index = CODES.indexOf(code);
  if (index < 0) throw Error('Unsupported language code: ' + String(code));
  const bytes = Buffer.alloc(8);
  bytes.write(code, 0, 'ascii');
  return {code, index, hex: bytes.toString('hex')};
}
function byHex(hex) {
  return CODES.map(byCode).find(entry => entry.hex === hex) || null;
}
module.exports = {CODES, byCode, byHex};
