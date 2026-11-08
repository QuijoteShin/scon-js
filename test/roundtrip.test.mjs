// test/roundtrip.test.mjs
// Round-trip tests for keys that the encoder must quote (":", "[", "]", "{", "}", quotes, backslash, ...)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Encoder, Decoder, Minifier } from '../src/scon.js';

const KEYS = ['9:16', 'a[b', 'c:d', 'x]y', 'k{v}', 'q"b\\s', '', 'has space', '#x', '1', 'plain', 'a;b', 'at@x', 'a,b'];

function normalize(v) {
    // [] and {} are equivalent: SCON has no distinct empty-object marker inside bodies
    if (Array.isArray(v)) return v.length === 0 ? '__empty__' : v.map(normalize);
    if (v !== null && typeof v === 'object') {
        const ks = Object.keys(v);
        if (ks.length === 0) return '__empty__';
        const o = {};
        for (const k of ks) o[k] = normalize(v[k]);
        return o;
    }
    return v;
}

function close(a, b, path) {
    if (typeof a === 'number' && typeof b === 'number') {
        const tol = 1e-12 * Math.max(Math.abs(a), Math.abs(b), 1e-300);
        assert.ok(Math.abs(a - b) <= tol, `${path}: ${a} != ${b}`);
        return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        assert.equal(a.length, b.length, `${path}: length`);
        a.forEach((x, i) => close(x, b[i], `${path}[${i}]`));
        return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
        assert.deepEqual(Object.keys(a), Object.keys(b), `${path}: keys`);
        for (const k of Object.keys(a)) close(a[k], b[k], `${path}.${k}`);
        return;
    }
    assert.deepEqual(a, b, path);
}

function roundtrip(x, label = '') {
    const text = new Encoder().encode(x);
    let back;
    try {
        back = new Decoder().decode(text);
    } catch (e) {
        assert.fail(`${label} decode failed: ${e.message}\n--- SCON ---\n${text}\n--- JSON ---\n${JSON.stringify(x)}`);
    }
    try {
        close(normalize(back), normalize(x), '$');
    } catch (e) {
        assert.fail(`${label} mismatch: ${e.message}\n--- SCON ---\n${text}\n--- JSON ---\n${JSON.stringify(x)}`);
    }
    // Minified form must expand back to the same structure
    const mini = Minifier.minify(text);
    const back2 = new Decoder().decode(mini);
    close(normalize(back2), normalize(x), '$min');
}

test('reported case: quoted key followed by array header', () => {
    const x = { '9:16': [{ t: 0, x: 50 }, { t: 2, x: 40 }], 'a[b': [1, 2], 'c:d': { k: [1, 2] } };
    const text = new Encoder().encode(x);
    assert.equal(text, '"9:16"[2]{t,x}:\n 0, 50\n 2, 40\n"a[b"[2]: 1, 2\n"c:d":\n k[2]: 1, 2');
    assert.deepEqual(new Decoder().decode(text), x);
});

for (const k of KEYS) {
    const label = JSON.stringify(k);
    test(`key ${label}: tabular array`, () => roundtrip({ [k]: [{ t: 0, x: 50 }, { t: 2, x: 40 }] }, label));
    test(`key ${label}: primitive array`, () => roundtrip({ [k]: [1, 2, 3] }, label));
    test(`key ${label}: mixed array`, () => roundtrip({ [k]: [1, { a: 1, b: [1, 2] }, 'x', [3, 4]] }, label));
    test(`key ${label}: nested object`, () => roundtrip({ [k]: { [k]: [1, 2], z: { [k]: 1 } } }, label));
    test(`key ${label}: empty array`, () => roundtrip({ [k]: [], other: 1 }, label));
    test(`key ${label}: scalar`, () => roundtrip({ [k]: 'v', n: 3 }, label));
    test(`key ${label}: tabular field name`, () => roundtrip({ rows: [{ [k]: 1, b: 2 }, { [k]: 3, b: 4 }] }, label));
    test(`key ${label}: key inside list items`, () => roundtrip({ items: [{ [k]: [1, 2], z: 1 }, { y: 2, [k]: { q: [1, 2] } }, { y: 2, [k]: [{ a: 1 }, { a: 2 }] }] }, label));
    test(`key ${label}: root array of objects`, () => roundtrip([{ [k]: [1, 2], z: 1 }, { [k]: 1, z: [3] }], label));
}

test('root arrays', () => {
    roundtrip([{ t: 0, x: 50 }, { t: 2, x: 40 }]);
    roundtrip([1, 2, 3]);
    roundtrip([1, 'a', { b: 1 }]);
});

test('floats keep full precision', () => {
    for (const f of [1793085411.0363443, 48.01292210980191, 0.1 + 0.2, 1e-7, 1.5e300]) {
        const back = new Decoder().decode(new Encoder().encode({ f }));
        assert.equal(back.f, f);
        const rows = new Decoder().decode(new Encoder().encode({ r: [{ f }, { f }] }));
        assert.equal(rows.r[0].f, f);
    }
});

// Deterministic PRNG so failures reproduce
function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Arrays nested directly inside arrays are generated only with primitives: the encoder has no syntax for deeper ones
function genValue(rnd, depth, inArray = false) {
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const scalar = () => pick([0, 1, -5, 42, 3.14159, 1793085411.0363443, 48.01292210980191, true, false, null, 'abc', 'a b', 'x:y', '9:16', 'q"b\\s', 'k{v}']);
    const r = rnd();
    if (depth <= 0 || r < 0.35) return scalar();
    if (r < 0.65) {
        const o = {};
        const n = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) o[pick(KEYS)] = genValue(rnd, depth - 1);
        return o;
    }
    const n = Math.floor(rnd() * 4);
    const arr = [];
    if (inArray) {
        for (let i = 0; i < n; i++) arr.push(scalar());
        return arr;
    }
    if (rnd() < 0.5 && n > 0) {
        // homogeneous objects exercise the tabular path
        const ks = [pick(KEYS), pick(KEYS), 'z'];
        for (let i = 0; i < n; i++) {
            const row = {};
            for (const k of ks) row[k] = scalar();
            arr.push(row);
        }
    } else {
        for (let i = 0; i < n; i++) arr.push(genValue(rnd, depth - 1, true));
    }
    return arr;
}

test('fuzz: decode(encode(x)) == x for 400 random structures', () => {
    const rnd = mulberry32(20260101);
    for (let i = 0; i < 400; i++) {
        const root = {};
        const n = 1 + Math.floor(rnd() * 3);
        for (let j = 0; j < n; j++) root[KEYS[Math.floor(rnd() * KEYS.length)]] = genValue(rnd, 4);
        roundtrip(root, `fuzz#${i}`);
    }
});
