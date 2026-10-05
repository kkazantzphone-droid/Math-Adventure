# Deterministic replay

Phase 1B finalizes the bounded data and PRNG contracts under [ADR-0009](adr/ADR-0009.md). No puzzle generator or seed source exists. This document maintains replay compatibility; [the report](PHASE_1B_COMPLETION_REPORT.md) records verification.

## Seed and transition

Algorithm ID `xoshiro128ss-v1` means Blackman/Vigna's xoshiro128** **1.1**, with four unsigned 32-bit words. It is a noncryptographic mathematical-content variation tool, never an identifier/security source. Reference accessed 2026-10-05: [original authors' implementation](https://prng.di.unimi.it/xoshiro128starstar.c).

The seed is exactly 32 ASCII hexadecimal characters. Each consecutive eight-character slice encodes `s0`, `s1`, `s2`, then `s3`, most significant hexadecimal digit first within each word. Both input cases are accepted; output is lowercase. This defines textual words without native byte-endianness. All-zero state is invalid. There is no hashing, seed expansion, time, platform randomness or learner input.

Output is `rotl32(s1 * 5, 7) * 9`, modulo 2^32. Save `t = s1 << 9`, then update in order: `s2 ^= s0`, `s3 ^= s1`, `s1 ^= s2`, `s0 ^= s3`, `s2 ^= t`, `s3 = rotl32(s3, 11)`. Multiplication uses `Math.imul`; state/rotation results normalize unsigned. The pure transition returns output and new state. No singleton state exists. Future visual variation must use a separate stream.

## Bounded choice

`boundedChoice(state, bound, attempts)` selects in `[0, bound)`, for integer bounds 1 through 2^32 and attempt caps 1 through 128 (default 128). Define `limit = floor(2^32 / bound) * bound`; reject words at or above limit, and map accepted words by remainder. Every residue has exactly `floor(2^32 / bound)` accepted preimages. This eliminates modulo mapping bias; it makes no claim of statistical independence or cryptographic unpredictability.

Rejected words consume state. Exhaustion returns `draw_unavailable`, consumed state and draw count; invalid input consumes no draws. Golden tests cover bound one, powers of two, nonpowers, the highest bounds and reproducible rejection/exhaustion. [Fixture provenance](../tests/fixtures/golden/README.md) records 48 independently calculated output/state transitions, nine bounded cases and a manual first-step cross-check. The test oracle imports no production code and uses BigInt arithmetic rotations/modulo instead of JS 32-bit multiplication/rotation.

## Canonical data

`canonical-json-v1` accepts null, booleans, strings, safe integers, dense ordinary arrays and plain own enumerable data records (including null-prototype records). Objects sort keys by UTF-16 code units; arrays preserve order. Strings use ECMAScript JSON escaping; negative zero emits zero. Nonintegers use explicit exact-value DTOs. Undefined, functions, symbols, BigInt, nonfinite/unsafe numbers, sparse/custom arrays, accessors, hidden properties, custom prototypes and cycles are rejected. Accessors, `toJSON` and prototype methods are not executed. Proxies are executable objects outside the decoded-data boundary, not supported input.

Fixed caps: nesting depth 32, 10,000 visited value nodes, 4,096 UTF-16 code units per key/string, and 262,144 output code units. DTO record helpers cap fields at 256; narrower structures declare smaller bounds. Canonical parsing checks input length, parses, then requires exact canonical text equality before accepting data. This rejects duplicate keys, alternate spelling/order/whitespace, and fractional/exponent tokens that native JSON parsing might round into integers. Object-key order invariance applies to serialization of decoded objects.

## Descriptor and support

`replay-v1` declares canonicalization `canonical-json-v1`, semantic version `semantic-v1`, family ID, generator version, content version, RNG algorithm, canonical seed and object spec. Readers validate bounded plain data, exact fields/IDs/versions, then rebuild detached data. Descriptors contain mathematical reproduction data only. The schema rejects extra learner/device/time fields; future families must restrict spec fields and preserve the repository's synthetic-only policy.

A syntactically valid descriptor does not prove a family is implemented. `requireReplaySupport` requires the exact family/generator/content combination from a later static registry; an empty registry reports unsupported. There is no registry or regeneration today. Retired behavior must never be replaced silently by current behavior. App SemVer, generator/content IDs, semantic schema, canonicalization and RNG behavior are independent compatibility dimensions.

Once accepted, changing word mapping, transition, bounded draw behavior, canonicalization or schema interpretation requires a new applicable replay version/algorithm ID. Old IDs are immutable. Cross-platform tests are ordinary Vitest tests intended for the unchanged Linux/Windows workflow; this run verifies local Windows only and performs no remote CI mutation.
