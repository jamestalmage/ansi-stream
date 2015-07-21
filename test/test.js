'use strict';
var assert = require('assert');
var ansiStream = require('../');
var EscapeCode = require('escape-code');
var through2 = require('through2');

describe('ansi-stream', function() {

  var stream;
  var log;

  function setup(bufferSize) {
    stream = ansiStream(bufferSize);
    log = logChunks();
    stream.pipe(log);
  }

  beforeEach(function() {
    setup();
  });

  function logChunks() {
    var logStream = through2.obj(function(chunk, enc, flush) {
      logStream.chunks.push(chunk);
      flush(null, chunk);
    });
    logStream.chunks = [];
    return logStream;
  }

  it('passes a simple string stuff', function() {
    stream.write('abc');
    stream.end();
    assert.deepEqual(
      log.chunks,
      ['abc']
    );
  });

  it('escape code as 1st character', function() {
    stream.write('\x1b[31mabc');
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        new EscapeCode('\x1b[31m'),
        'abc'
      ]
    );
  });

  it('escape code as last character', function() {
    stream.write('abc\x1b[31m');
    assert.deepEqual(
      log.chunks,
      [
        'abc'
      ]
    );
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        'abc',
        new EscapeCode('\x1b[31m')
      ]
    );
  });

  it('in the middle', function() {
    stream.write('abc\x1b[31mdef');
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        'abc',
        new EscapeCode('\x1b[31m'),
        'def'
      ]
    );
  });

  it('bookends', function() {
    stream.write('\x1b[31mabc\x1b[39m');
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        new EscapeCode('\x1b[31m'),
        'abc',
        new EscapeCode('\x1b[39m')
      ]
    );
  });

  it('back to back', function() {
    stream.write('\x1b[31m\x1b[41mabc\x1b[39m\x1b[49m');
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        new EscapeCode('\x1b[31m'),
        new EscapeCode('\x1b[41m'),
        'abc',
        new EscapeCode('\x1b[39m'),
        new EscapeCode('\x1b[49m')
      ]
    );
  });

  it('partial match at end', function() {
    stream.write('abc\x1b');
    assert.deepEqual(
      log.chunks,
      ['abc']
    );
    stream.end();
    assert.deepEqual(
      log.chunks,
      ['abc', '\x1b']
    );
  });

  it('match across written chunks', function() {
    stream.write('abc\x1b');
    assert.deepEqual(
      log.chunks,
      ['abc']
    );
    stream.write('[31mhello\x1b[39');
    assert.deepEqual(
      log.chunks,
      [
        'abc',
        new EscapeCode('\x1b[31m'),
        'hello'
      ]
    );
    stream.write('mbye\x1b[');
    assert.deepEqual(
      log.chunks,
      [
        'abc',
        new EscapeCode('\x1b[31m'),
        'hello',
        new EscapeCode('\x1b[39m'),
        'bye'
      ]
    );
    stream.end();
    assert.deepEqual(
      log.chunks,
      [
        'abc',
        new EscapeCode('\x1b[31m'),
        'hello',
        new EscapeCode('\x1b[39m'),
        'bye',
        '\x1b['
      ]
    );
  });

  it('handles empty content', function() {
    stream.end();
    assert.deepEqual(log.chunks, []);
  });

  it('you can disable buffer', function() {
    setup(0);
    stream.write('abc\x1b');
    assert.deepEqual(
      log.chunks,
      ['abc\x1b']
    );
  });

  it('you can set a short buffer', function() {
    stream.write('abc\x1baaaaa');
    assert.deepEqual(
      log.chunks,
      ['abc']
    );
    setup(6);
    stream.write('abc\x1baaaaa');
    assert.deepEqual(
      log.chunks,
      ['abc']
    );
    setup(5);
    // just give up.
    stream.write('abc\x1baaaaa');
    assert.deepEqual(
      log.chunks,
      ['abc\x1baaaaa']
    );
  });
});
