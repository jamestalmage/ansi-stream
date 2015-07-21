'use strict';
var regex = require('ansi-regex');
var through2 = require('through2');
var StringDecoder = require('string_decoder').StringDecoder;
var EscapeCode = require('escape-code');

module.exports = function(maxBuffer) {
  maxBuffer = typeof maxBuffer === 'number' ? maxBuffer : 25;
  var as = new AnsiStream();
  as._maxBuffer = maxBuffer;
  as._prev = '';
  return as;
};

var AnsiStream = through2.ctor(
  {objectMode:true},
  function handleChunk(chunk, enc, cb) {
    var decoder = this._stringDecoder ||
      (this._stringDecoder = new StringDecoder(enc));
    this._prev = this._consumeString(this._prev + decoder.write(chunk), true);
    cb();
  },
  function handleEndOfStream(cb) {
    var prev = this._prev;
    if (prev) {
      prev = this._consumeString(prev);
      if (prev) {
        this.push(prev);
      }
    }
    cb();
  }
);

var asp = AnsiStream.prototype;

asp._consumeString = function consumeString(str, moreAvailable) {
  var r = regex();
  var lastIndex = 0;
  var match;

  while ((match = r.exec(str))) {
    var nextIndex = match.index;
    if (nextIndex !== lastIndex) {
      this.push(str.substring(lastIndex, nextIndex));
    }
    var m0 = match[0];
    nextIndex += m0.length;

    if (moreAvailable && nextIndex === str.length) {
      return m0;
    }

    this.push(new EscapeCode(m0));

    lastIndex = nextIndex;
  }

  return this._finalizeRemainder(str.substr(lastIndex));
};

/**
 * A hack to deal with the situation where an escape code sequence spans two chunks (very unlikely).
 * If it sees a potential start of the escape code sequence near the end of the chunk, it will
 * wait to see more characters before pushing.
 *
 * @param string - the remaining end of the current chunk of the current chunk
 *
 * @returns {String} - The remaining text to leave in the buffer.
 */
asp._finalizeRemainder = function finalizeRemainder(string) {
  if (!this._maxBuffer) {
    this.push(string);
    return '';
  }
  if (string) {
    var start = Math.max(0, string.length - this._maxBuffer);
    var p1 = string.indexOf('\u001b', start);
    var p2 = string.indexOf('\u009b', start);
    var p = Math.max(p1, p2);
    if (p < 0) {
      this.push(string);
      string = '';
    } else if (p > 0) {
      this.push(string.substring(0, p));
      string = string.substring(p);
    }
  }
  return string;
};
