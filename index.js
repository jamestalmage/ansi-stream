'use strict';
var regex = require('ansi-regex');
var through2 = require('through2');
var StringDecoder = require('string_decoder').StringDecoder;
var EscapeCode = require('escape-code');

module.exports = function(maxBuffer) {
  maxBuffer = typeof maxBuffer === 'number' ? maxBuffer : 25;
  var decoder = null;
  var prev = '';
  return through2.obj(
    function(chunk, enc, cb) {
      if (!decoder) {
        decoder = new StringDecoder(enc);
      }
      prev = run(prev + decoder.write(chunk), this, maxBuffer, true);
      cb();
    },
    function(cb) {
      if (prev) {
        prev = run(prev, this, maxBuffer);
        if (prev) {
          this.push(prev);
        }
      }
      cb();
    }
  );
};

function run(str, obj, maxBuffer, moreAvailable) {
  var r = regex();
  var lastIndex = 0;
  var match;

  while ((match = r.exec(str))) {
    var nextIndex = match.index;
    if (nextIndex !== lastIndex) {
      obj.push(str.substring(lastIndex, nextIndex));
    }
    var m0 = match[0];
    nextIndex += m0.length;

    if (moreAvailable && nextIndex === str.length) {
      return m0;
    }

    obj.push(new EscapeCode(m0));

    lastIndex = nextIndex;
  }

  return finalizeRemainder(str.substr(lastIndex), obj,  maxBuffer);
}

/**
 * A hack to deal with the situation where an escape code sequence spans two chunks (very unlikely).
 * If it sees a potential start of the escape code sequence near the end of the chunk, it will
 * wait to see more characters before pushing.
 *
 * @param string - the end of the current chunk
 *
 * @param obj - the stream where we can push more text if we have exceeded the buffer size.
 *
 * @param maxBuffer - the maximum number of characters before we stop waiting for a match near the end
 *                    of the string and just push the text.
 *
 * @returns {String} - The remaining text to leave in the buffer.
 */
function finalizeRemainder(string, obj, maxBuffer) {
  if (!maxBuffer) {
    obj.push(string);
    return '';
  }
  if (string) {
    var start = Math.max(0, string.length - maxBuffer);
    var p1 = string.indexOf('\u001b', start);
    var p2 = string.indexOf('\u009b', start);
    var p = Math.max(p1, p2);
    if (p < 0) {
      obj.push(string);
      string = '';
    } else if (p > 0) {
      obj.push(string.substring(0, p));
      string = string.substring(p);
    }
  }
  return string;
}
