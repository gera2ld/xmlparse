# @gera2ld/xmlparse

![NPM](https://img.shields.io/npm/v/xmlparse.svg)
![License](https://img.shields.io/npm/l/xmlparse.svg)
![Downloads](https://img.shields.io/npm/dt/xmlparse.svg)

Simple XML parser that works for browser, Node.js and Deno.

## Usage

### Deno

```ts
import { parseXml, traverse } from 'https://raw.githubusercontent.com/gera2ld/xmlparse/master/mod.ts';

const { node, warnings } = parseXml(xmlText);

if (warnings.length) console.warn('You got warnings!');

traverse(node, node => {
  console.log('This is a node:', node);
});
```

### JavaScript

```sh
$ yarn add @gera2ld/xmlparse
```

```js
import { parseXml, traverse } from '@gera2ld/xmlparse';

const { node, warnings } = parseXml(xmlText);

if (warnings.length) console.warn('You got warnings!');

traverse(node, node => {
  console.log('This is a node:', node);
});
```
