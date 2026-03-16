# scon

**SCON — Schema-Compact Object Notation for JavaScript**

Human-readable serialization with structural dedup. 59-66% payload reduction, 64% fewer LLM tokens, optional WASM acceleration.

[![npm](https://img.shields.io/npm/v/scon-notation.svg)](https://www.npmjs.com/package/scon-notation)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Install

### npm
```bash
npm install scon-notation
```

WASM acceleration is included as optional dependency and loads automatically when available. To explicitly exclude it:

```bash
npm install scon-notation --no-optional
```

### CDN (no build step)
```js
import SCON from 'https://cdn.jsdelivr.net/npm/scon-notation@1/src/scon.js';
```

### Local (clone and import)
```js
import SCON from './src/scon.js';
```

### WASM behavior by install method

| Method | WASM | Performance |
|--------|------|-------------|
| `npm install scon-notation` | Auto-detected, loaded if available | Fastest (Rust tape decoder) |
| `npm install scon-notation --no-optional` | Disabled | Pure JS |
| CDN / local import | Not available | Pure JS |

When WASM is not available, all operations fall back to pure JS transparently — no code changes needed.

### WASM without npm

If you want WASM acceleration without npm, you can load the WASM module manually:

1. Build the WASM module (requires Rust + wasm-pack):
```bash
git clone https://github.com/QuijoteShin/scon-rs
cd scon-rs
wasm-pack build --target web --out-dir pkg
```

2. Serve the `pkg/` directory alongside your app, then:
```html
<script type="module">
import init, { scon_encode, scon_to_json, scon_minify, scon_expand } from './pkg/scon_wasm.js';

await init();

// Encode JS object to SCON
const scon = scon_encode({ name: 'test', version: 1 });

// Decode SCON to JS object
const obj = JSON.parse(scon_to_json(scon));

// Minify / Expand
const mini = scon_minify(scon);
const expanded = scon_expand(mini, 1);
</script>
```

This gives you the Rust tape decoder running natively in the browser — same performance as the npm WASM path, without a package manager.

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

Payload reduction on OpenAPI 3.1 spec (71 endpoints):

| Format | Bytes | Ratio | Gzip |
|--------|------:|------:|-----:|
| JSON | 90,886 | 1.00x | 4,632 |
| SCON | 26,347 | 0.29x | 3,969 |
| SCON (minified) | 20,211 | 0.22x | 3,818 |

LLM token efficiency (cl100k_base): **64% fewer tokens** — less context window waste for RAG pipelines, tool-use agents, and structured prompts.

With WASM enabled, decode runs the Rust single-pass tape decoder natively in the browser — no performance compromise vs server-side.

Full methodology: [DOI 10.5281/zenodo.14733092](https://doi.org/10.5281/zenodo.14733092)
Benchmarks, optimization log (21 phases), and industrial protocol fixtures: [github.com/QuijoteShin/scon](https://github.com/QuijoteShin/scon)

## Also available

- **Rust**: `cargo add scon` — [crates.io/crates/scon](https://crates.io/crates/scon)
- **PHP**: `composer require scon/scon` — [packagist.org/packages/scon/scon](https://packagist.org/packages/scon/scon)

## License

MIT
