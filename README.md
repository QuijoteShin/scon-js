# scon

**SCON — Schema-Compact Object Notation for JavaScript**

Human-readable serialization with structural dedup. Smaller than JSON, optional WASM acceleration, zero config.

[![npm](https://img.shields.io/npm/v/scon-notation.svg)](https://www.npmjs.com/package/scon-notation)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Install

```bash
npm install scon-notation
```

WASM acceleration is included as optional dependency and loads automatically when available. To explicitly exclude it:

```bash
npm install scon-notation --no-optional
```

## Quick Start

```js
import SCON from 'scon-notation';

// Encode
const data = { name: 'scon', version: 1, features: { dedup: true } };
const sconStr = SCON.encode(data);
// name: scon
// version: 1
// features:
//  dedup: true

// Decode
const parsed = SCON.decode(sconStr);

// JSON-style aliases
const str = SCON.stringify(data);
const obj = SCON.parse(sconStr);
```

## Features

- **WASM-accelerated**: automatically loads Rust tape decoder via WebAssembly, falls back to pure JS
- **Structural dedup**: xxHash128 fingerprinting detects repeated subtrees — 59-66% payload reduction on OpenAPI specs
- **Schema subsystem**: registry with cycle detection, deep merge, dot-notation overrides
- **Validation**: configurable validation modes
- **Minifier**: bidirectional minify/expand
- **JSON-compatible API**: `SCON.parse()` / `SCON.stringify()` aliases

## API

```js
import SCON, { Encoder, Decoder, Minifier, Validator, SchemaRegistry, TreeHash } from 'scon-notation';

// Encode / Decode
SCON.encode(data)
SCON.encode(data, { indent: 2 })
SCON.encode(data, { autoExtract: true })  // structural dedup
SCON.decode(sconString)

// Minify / Expand
SCON.minify(sconString)
SCON.expand(minifiedString, { indent: 2 })

// Validate
SCON.validate(data, { mode: 'strict' })

// WASM readiness (optional — all operations work without it)
const hasWasm = await SCON.ready();
```

## Performance

| Format | Bytes | Ratio | Gzip |
|--------|-------|-------|------|
| JSON | 90,886 | 1.00x | 4,632 |
| SCON | 26,347 | 0.29x | 3,969 |
| SCON (minified) | 20,211 | 0.22x | 3,818 |

OpenAPI 3.1 spec, 71 endpoints. Full methodology: [DOI 10.5281/zenodo.14733092](https://doi.org/10.5281/zenodo.14733092)

## Also available

- **Rust**: `cargo add scon` — [crates.io/crates/scon](https://crates.io/crates/scon)
- **PHP**: `composer require scon/scon` — [packagist.org/packages/scon/scon](https://packagist.org/packages/scon/scon)

## License

MIT
