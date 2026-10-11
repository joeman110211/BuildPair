// Expo Router 57's query-string 7 requires a synchronous CommonJS function.
// Node 22.23+ and Metro can load the patched ESM decoder under an npm alias.
const patchedDecoderModule = require('patched-uri-decoder');
const decode = patchedDecoderModule.default ?? patchedDecoderModule;
if (typeof decode !== 'function') {
  throw new TypeError('The patched URI decoder did not expose a function');
}
module.exports = decode;
