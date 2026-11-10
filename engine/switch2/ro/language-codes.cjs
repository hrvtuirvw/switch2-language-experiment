'use strict';
// Source: https://switchbrew.org/wiki/Settings_services#Language and #LanguageCode
// Nintendo Switch 2 FW 21+ adds pl/th; enum 18/19 can map to ja/en-US on older systems.
// Each candidate MUST match this boot's MakeLanguageCode output before a setter is opened.
const CODES = Object.freeze([
  'ja', 'en-US', 'fr', 'de', 'it', 'es', 'zh-CN', 'ko', 'nl', 'pt',
  'ru', 'zh-TW', 'en-GB', 'fr-CA', 'es-419', 'zh-Hans', 'zh-Hant', 'pt-BR', 'pl', 'th'
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
