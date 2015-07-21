# ansi-stream 

Converts a text stream to a stream of strings and `EscapeCode` objects

[![Build Status](https://travis-ci.org/jamestalmage/ansi-stream.svg?branch=master)](https://travis-ci.org/jamestalmage/ansi-stream)
[![Coverage Status](https://coveralls.io/repos/jamestalmage/ansi-stream/badge.svg?branch=master&service=github)](https://coveralls.io/github/jamestalmage/ansi-stream?branch=master)
[![Code Climate](https://codeclimate.com/github/jamestalmage/ansi-stream/badges/gpa.svg)](https://codeclimate.com/github/jamestalmage/ansi-stream)
[![Dependency Status](https://david-dm.org/jamestalmage/ansi-stream.svg)](https://david-dm.org/jamestalmage/ansi-stream)
[![devDependency Status](https://david-dm.org/jamestalmage/ansi-stream/dev-status.svg)](https://david-dm.org/jamestalmage/ansi-stream#info=devDependencies)

[![NPM](https://nodei.co/npm/ansi-stream.png)](https://nodei.co/npm/ansi-stream/)

## Usage

```js
  var ansiStream = require('ansi-stream');
  var EscapeCode = ansiStream.EscapeCode;
  
  stream = ansiStream();
  stream.write('\x1b[31mabc\x1b[39m');
  stream.end();
  
  assert.deepEqual(
    stream.read(),
    new EscapeCode('\x1b[31m')
  );
  
  assert.strictEqual(
    stream.read(),
    'abc'
  );
  
  assert.deepEqual(
    stream.read(),
    new EscapeCode('\x1b[39m')
  );
```


## API

### ansiStream(maxBuffer)

Creates a new stream instance, with an optional buffer size.

#### maxBuffer

*Optional*  
Type: `number`

Handles the (rare) case where an escape code sequence might span two chunks.

If it does not detect a complete escape code in the chunk, but there is a
control character (`\u001b`, or `\u009b`), it will buffer up to `maxBuffer` characters
until the next chunk.

If you are sure that your input will NOT split escape code sequences across chunks,
you can set this to zero for improved performance.

### ansiStream.EscapeCode

Can be used by streams further down the chain to discover if a given chunk is
an EscapeCode or not. See [escape-code] for more details.

```js
  stream.on('data', function(chunk) {
    if (chunk instanceof ansiStream.EscapeCode) {
      // process the escape code
    } else {
      // process a chunk of plain old text.
    }
  });
```

## License

MIT © [James Talmage](http://github.com/jamestalmage)

[escape-code]: https://www.npmjs.com/package/escape-code
