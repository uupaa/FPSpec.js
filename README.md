# FPSpec.js [![Build Status](https://travis-ci.org/uupaa/FPSpec.js.png)](http://travis-ci.org/uupaa/FPSpec.js)

[![npm](https://nodei.co/npm/uupaa.fpspec.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.fpspec.js/)

Feature Phone Spec

## Document

- [FPSpec.js wiki](https://github.com/uupaa/FPSpec.js/wiki/FPSpec)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)

## How to use

### Browser

```js
<script src="lib/FPSpec.js"></script>
<script>
var userAgent = "...";
var spec = new FPSpec({ USER_AGENT: userAgent });

console.log( spec.getFlashLiteVersion() ) );
</script>
```

### WebWorkers

```js
importScripts("lib/FPSpec.js");

...
```

### Node.js

```js
var FPSpec = require("lib/FPSpec.js");

...
```
