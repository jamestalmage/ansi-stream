'use strict';
var regex = require('ansi-regex');
var through2 = require('through2');
var StringDecoder = require('string_decoder').StringDecoder;
var EscapeCode = require('escape-code');

module.exports = createStream;
module.exports.EscapeCode = EscapeCode;

function createStream(maxBuffer) {
  maxBuffer = typeof maxBuffer === 'number' ? maxBuffer : 25;
  var ansiStream = new AnsiStream();
  ansiStream._maxBuffer = maxBuffer;
  ansiStream._prev = '';
  return ansiStream;
}

var AnsiStream = through2.ctor(
  {objectMode:true},

  function handleChunk(chunk, enc, cb) {
    var str;
    if (typeof chunk === 'string' || chunk instanceof String) {
      str = chunk;
    } else if (chunk instanceof Buffer) {
      var decoder = this._stringDecoder ||
        (this._stringDecoder = new StringDecoder());
      str = decoder.write(chunk);
    } else {
      this._emptyBuffer();
      this.push(chunk);
      cb();
      return;
    }
    this._prev = this._consumeString(this._prev + str, true);
    cb();
  },

  function handleEndOfStream(cb) {
    this._emptyBuffer();
    cb();
  }
);

var asp = AnsiStream.prototype;

asp._emptyBuffer = function emptyBuffer() {
  var prev = this._prev;
  if (prev) {
    prev = this._consumeString(prev, false);
    if (prev) {
      this.push(prev);
    }
  }
  this._prev = '';
};

/**
 * Consume as much of the current chunk as possible
 *
 * @param str the current chunk (concatenated with the remainder of the previous chunk if it exists)
 *
 * @param moreAvailable `true` if there are (potentially) more chunks coming,
 *          will be called once with `false at the end of the stream.
 *
 * @returns {string} the remaining unconsumed chunk.
 *            It will always be an empty string if `maxBuffer` is `0`.
 */
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
