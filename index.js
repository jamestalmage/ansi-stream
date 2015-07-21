'use strict';
var regex = require('ansi-regex');
var through2 = require('through2');
var StringDecoder = require('string_decoder').StringDecoder;
var EscapeCode = require('escape-code');

module.exports = function(maxBuffer) {
  maxBuffer = typeof maxBuffer === 'number' ? maxBuffer : 200;
  var decoder = null;
  var prev = '';
  return through2.obj(
    function(chunk, enc, cb) {
      if (!decoder) {
        decoder = new StringDecoder(enc);
      }
      prev = run(prev + decoder.write(chunk), this, true, maxBuffer);
      cb();
    },
    function(cb) {
      if (prev) {
        prev = run(prev, this);
        if (prev) {
          this.push(prev);
        }
      }
      cb();
    }
  );
};

function run(str, obj, moreAvailable, maxBuffer) {
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

  return finalizeRemainder(str.substr(lastIndex), obj, maxBuffer);
}

function finalizeRemainder(prev, obj, maxBuffer) {
  if (prev) {
    var start = Math.max(0, prev.length - maxBuffer);
    var p1 = prev.indexOf('\u001b', start);
    var p2 = prev.indexOf('\u009b', start);
    var p = Math.max(p1, p2);
    if (p < 0) {
      obj.push(prev);
      prev = '';
    } else if (p > 0) {
      obj.push(prev.substring(0, p));
      prev = prev.substring(p);
    }
  }
  return prev;
}
