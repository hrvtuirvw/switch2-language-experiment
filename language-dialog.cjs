'use strict';
// Host-only picker. No boot receipt, pairing token, listener, or console input here.
const {promisify} = require('node:util');
const {execFile} = require('node:child_process');
const {CODES, byCode} = require('./engine/switch2/ro/language-codes.cjs');
const run = promisify(execFile);
const names = Object.freeze({
  'en-US':'英語（米国）', fr:'フランス語', de:'ドイツ語', it:'イタリア語', es:'スペイン語',
  ko:'韓国語', nl:'オランダ語', pt:'ポルトガル語',
  ru:'ロシア語', 'en-GB':'英語（英国）',
  'fr-CA':'フランス語（カナダ）', 'es-419':'スペイン語（中南米）',
  'zh-Hans':'中国語（簡体字 / Hans）', 'zh-Hant':'中国語（繁体字 / Hant）',
  'pt-BR':'ポルトガル語（ブラジル）', pl:'ポーランド語', th:'タイ語'
});
function dialogArgs() {
  const choices = CODES.filter(code => code !== 'ja');
  if (Object.keys(names).length !== choices.length || choices.some(code => !names[code]))
    throw Error('Language selection table does not cover every supported target');
  const args = ['--list','--radiolist','--title=変更する言語を選択',
    '--text=新しい言語を選択してください（日本語への復元は別手順）',
    '--width=480','--height=620','--ok-label=選択','--cancel-label=中止',
    '--column=選択','--column=言語','--column=コード','--print-column=3'];
  for (const code of choices) args.push(code === 'en-US' ? 'TRUE' : 'FALSE',names[code],code);
  return args;
}
async function chooseLanguage(command = run) {
  let reply;
  try {
    reply = await command('zenity',dialogArgs(),{
      encoding:'utf8',timeout:600000,maxBuffer:8192,windowsHide:true
    });
  } catch {
    throw Error('Language selection cancelled, unavailable or timed out. This command did not consume a boot; use --language CODE in a terminal if needed.');
  }
  const code = typeof reply?.stdout === 'string' ? reply.stdout.trim() : '';
  if (code === 'ja' || !CODES.includes(code))
    throw Error('Language dialog returned an invalid choice. This command did not consume a boot.');
  return byCode(code);
}
module.exports = {dialogArgs,chooseLanguage};
