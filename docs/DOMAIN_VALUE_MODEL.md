# Domain value model

Phase 1B implements bounded exact mathematical primitives. Phase 2 uses those unchanged primitives/contracts in bounded addition, inclusive quadrilateral classification and exact unit-length families. This document maintains the wire spelling, exactness and computation policies. [ADR-0004](adr/ADR-0004.md) governs mathematical authority; the frozen [Phase 1B report](PHASE_1B_COMPLETION_REPORT.md) records foundation evidence, and [Phase 2 design](PHASE_2_FAMILY_PROOF.md)/[report](PHASE_2_COMPLETION_REPORT.md) maintain executable-family bounds and observed results.

## Values and errors

Pure operations return `DomainResult<T>`: `{ ok: true, value }` or `{ ok: false, error: { code } }`. Codes distinguish malformed input/identifiers, unsupported domains/operations/versions, range limits, division by zero, invalid seeds/replay/graphs and exhausted draws. These are domain/capability outcomes; no learner failure or mastery update exists. Exceptions are not a business protocol.

Rational and decimal values are nominal immutable internal objects with private frozen parts, created only through checked factories. Mathematical operations trust those internal types. External data must enter unknown-input factories/DTO readers; a type assertion is never validation. Spreading a value cannot reconstruct its private nominal identity.

Signed and natural safe-integer constructors accept numbers only, validate finite integral safe values, and retain zero (negative zero becomes zero). Addition/subtraction/multiplication use exact BigInt intermediates and check the safe-number range before converting back. No rounded intermediate decides truth.

Rationals hold bounded BigInt numerator and positive denominator, reduced by gcd. Sign belongs to the numerator; zero is `0/1`. Exact equality compares canonical components; ordering uses cross-products. Addition, subtraction, multiplication and division reduce exact results before checking output bounds. Division by zero returns `division_by_zero`.

Decimals hold an integer coefficient and scale, with value `coefficient / 10^scale`. Constructors strip trailing zero factors and canonicalize zero to coefficient zero/scale zero. Equality and ordering are exact. Decimal-to-rational conversion is exact; a reduced rational has a finite decimal precisely when its denominator has only factors 2 and 5, subject to the documented bounds. Other denominators return `unsupported_operation`. Requested forms such as `2/4`, `1.0` and `1.00` belong to future representation contracts, never mathematical equality. There is no locale parser.

## DTO spelling and versions

Internal BigInts never enter JSON directly. Explicit DTOs use canonical base-ten integer strings: `0` or optional minus followed by a nonzero digit and digits. No leading zeros, plus, negative zero, whitespace, exponents or decimal point. Integer DTOs use `integer-v1`; rational DTOs use `rational-v1` with `numerator`/`denominator`; decimal DTOs use `decimal-v1` with `coefficient`/numeric `scale`. DTO readers reject extra fields and noncanonical mathematical encodings (including unreduced fractions and decimal trailing zeros), and return unsupported versions explicitly.

Round-trips pass through [canonical JSON](DETERMINISTIC_REPLAY.md), parse, and the appropriate DTO reader. These mathematical DTOs provide replay infrastructure, not learner persistence. Raw BigInt-bearing values are internal computation values; exported/serialized data uses their DTOs.

## Computational bounds

`EXACT_LIMITS` is an explicit immutable engine policy: 256 bits per integer/component, at most 78 decimal digits before parsing, decimal scale at most 64, exponent at most 256, and at most 128 binary-search interval halvings for roots. Limits are independent of age, curriculum or educational difficulty. Changing supported bounds needs test/document review.

Constructors reject oversized operands before expensive work. Rational operations/comparisons allocate at most 513-bit cross-product intermediates before output reduction. Decimal comparison/conversion intermediates are also bounded by component/scale limits. Power multiplication checks growth through exact division before allocating the product. Oversized already-constructed BigInts are rejected; no parser allocates an unbounded decimal string.

Integer powers use nonnegative integral exponents: nonzero base to exponent zero is one; `0^0` is explicitly unsupported under the current task policy. Negative or fractional exponents and complex values are outside this foundation. Perfect-square roots return the principal nonnegative integer root or `unsupported_operation`; binary search and integer squaring establish truth. `sqrt(16) = 4` differs from the real equation solution set `x^2 = 16`, which contains both -4 and 4. No floating root tolerance, general symbolic evaluator or CAS exists.

## Semantic boundaries

Exact quantity contracts declare magnitude, stable unit ID and dimension: length, area, angle, time, mass or volume. Perimeter tasks require length quantities; area tasks require area quantities. Unit identity is not a conversion table or a validated scientific-unit catalogue. Geometry stores exact logical coordinates and ordered semantic objects; it contains no viewport or pixel truth. Expression ASTs are bounded semantic data, with principal-square-root and equation concepts distinct. They execute no JavaScript.

Approximate measurement requires future explicit tolerance, rounding and error semantics. No approximation algorithm or universal epsilon is implemented. Structural scene validity alone does not prove geometric predicates such as simplicity, area or shape classification. Phase 2 adds independently checked exact predicates only for its bounded nondegenerate parallelograms and unit segments; it does not implement general polygon/area geometry. Assessment scopes and exploratory exposure remain separately discriminated and do not implement a learner model.

Phase 2 family validation receives the full instance, including answer-contract policies, and regenerates it from replay before trusting the answer contract. Its static catalog supplies bounded metadata, semantic hints and possible future concept/representation evidence scopes. Exact-value answers compare canonical rational DTOs, classification requires every applicable class, and quantities require the declared length unit/dimension. Structural collection/alternative parsing still permits repeated atoms; any later collection family must apply its own mathematical equality, uniqueness and set/multiset rules. These three validators/catalog entries create no learner evidence, persistence or mastery policy.
