const judge = require('./judge');

module.exports = {
  execute: judge.execute,
  matches: judge.matches,
  LANGUAGES: judge.LANGUAGES,
  normalize: judge.normalize || function(val) {
    const text = String(val ?? '').trim();
    try {
      return JSON.stringify(JSON.parse(text));
    } catch {
      return text.replace(/\r\n/g, '\n').trim();
    }
  }
};
