# Puzzle and mathematical architecture

Status: Phase 0 target architecture with Phase 1B bounded exact-value, replay/graph and semantic-contract implementations. Phase 2 implements the first bounded real generators/validators under D40: addition, inclusive quadrilateral classification and exact unit length, with LOCAL ENGINEERING PASS. It is not a playable learner loop. [Family design](PHASE_2_FAMILY_PROOF.md) and [completion report](PHASE_2_COMPLETION_REPORT.md) preserve the original exact scope and observed evidence. The original PR #5 candidate passed both required hosted checks; the [red-team report](PHASE_2_RED_TEAM_REPORT.md) records later independent review/repairs and remaining repaired-candidate closure gates. Governed by [ADR-0004](adr/ADR-0004.md).

## Mathematical values and truth

V1 natural-number operations use JavaScript numbers only when inputs, intermediate results and outputs are finite safe integers, checked against Number.MAX_SAFE_INTEGER and narrower content bounds. Validate before multiplication/addition overflow, not after a rounded result has become truth. Reject NaN, Infinity, exponent/string coercion and fractional values in integer tasks. A zero quantity is intentional; subtraction constraints explicitly state whether negative results are allowed; division by zero is a domain error.

Exact rational values for measurement/fractions and later arithmetic are reduced numerator/positive-denominator pairs backed by BigInt when needed. Exact decimals can use an integer coefficient and scale; comparisons/conversions use exact arithmetic, not binary float tolerance. JSON stores large integers as validated decimal strings with an explicit type/version; do not JSON-serialize BigInt directly. Fractions, ratios and percentages keep mathematical value separate from pedagogical form: 2/4 and 1/2 may be equivalent values but different requested representations. Simplification requirements belong to task semantics.

Approximate geometry/measurement requires an explicit quantity/unit/tolerance contract and independent error analysis. Do not use a universal epsilon for exact arithmetic. No general computer algebra system is required now. [Technology evaluation](TECHNOLOGY_EVALUATION.md) records this staged choice.

## Concept graph

Stable language-neutral IDs identify knowledge, not ages or global levels. Directed necessary/gating prerequisite edges form a validated DAG; recommended teaching paths and related/inverse/representation edges need not be acyclic. Each prerequisite declares whether it is necessary mathematical understanding or a recommended teaching path, with a rationale and alternate diagnostic probe. Readiness gates recommendations, not voluntary exploration. Curriculum/country/year mappings are optional metadata outside core policy.

Planned first-class domains are number sense, arithmetic, patterns/sequences, multiplication/division, geometry/spatial reasoning, measurement, exponentiation/roots, fractions, decimals/percentages, algebra, logic and probability/combinatorics. Concepts have one canonical ID and one or more domain memberships, not duplicated mastery per tag. Edges have kinds prerequisite, related, representationOf and inverseOf. Only justified prerequisite edges gate recommendation; other connections do not transfer mastery or create DAG cycles by treating an inverse relation as a prerequisite both ways.

Illustrative connected IDs include geometry.shape.rectangle/classification, geometry.shape.square, geometry.composition, geometry.spatial.orientation, measurement.length.units, measurement.perimeter, measurement.area.unit_squares, multiplication.rectangular_arrays, powers.repeated_multiplication, powers.square_numbers, powers.cube_numbers, roots.perfect_square and geometry.coordinates.grid. Arrays connect multiplication to rectangular area; square numbers connect square arrays to powers; roots connect to inverse powers; fractions to area; coordinates to geometry; measurement to arithmetic. Whole arithmetic mastery is not a prerequisite for shape recognition. Evidence attribution is declared per task scope, never automatically all linked concepts.

An illustrative subgraph is quantity.small-recognition, counting.cardinality, numeral.quantity-match, comparison.quantities, addition.part-whole, addition.within_10, addition.bonds_to_10, addition.crossing_10, subtraction.inverse, addition.missing_addend and multiplication.equal_groups. Related links connect part-whole/subtraction and grouping/repeated addition. These examples are not a finalized curriculum or a universal sequence.

Each concept declares evidence-bearing representation families, coverage requirements and valid diagnostic/transfer tasks. Small visual recognition is distinct from counting or hearing a number. Symbolic success cannot alone establish visual subitizing. A necessary edge may be demonstrated through a low-pressure probe rather than forcing a long remedial path. A probe establishes readiness only for the checked requirement; it never silently marks an entire prerequisite chain Secure.

Difficulty is a typed vector: operand bounds, number structure (crossing ten, doubles), operation/operand count, unknown position, representation, distractor similarity, available scaffolds and permitted strategies. Each family owns meaningful dimensions. Larger values alone do not define higher conceptual difficulty. Change one meaningful dimension at a time during adaptive recommendation.

Geometry dimensions include attribute/shape variety, orientation, composition complexity, grid granularity, transformation type and visibility of unit structure. Measurement distinguishes comparisons, unit iteration, unit selection/conversion and one- versus two-dimensional quantities. Powers/roots distinguish conceptual representation, base/exponent/radicand structure, unknown position and inverse reasoning. Their difficulty cannot be reduced to operand magnitude or an arithmetic level.

## Geometry, measurement and vector presentation

Early geometry families classify shapes by critical attributes, count/identify sides/vertices, compose/decompose shapes and reason about spatial relationships. Later related families cover symmetry, grids, angles, coordinates, transformations, triangles/quadrilaterals/circles, similarity/scale and Pythagorean relationships. Define inclusive classifications: a square is a rectangle; answer contracts may require all applicable classes or a specified most-specific class. Rotation/size should not change the mathematical class.

Semantic geometry records exact logical coordinates, vertices/edges, shape/relationship predicates, transformations and constraint data. Measurement records quantity, unit and dimension; perimeter has length units and area square units. Unit-square representations can be exact; continuous measuring tasks declare approximation/rounding/tolerance explicitly. Circle measurements may eventually retain symbolic π or declared approximations, never secretly rounded truth.

Prefer declarative SVG plus semantic HTML controls for bounded interactive scenes. [SVG coordinates](https://www.w3.org/TR/SVG2/coords.html) supply viewBox/viewport mapping; [SVG accessibility](https://www.w3.org/TR/SVG2/access.html) and [interaction](https://www.w3.org/TR/SVG2/interact.html) inform authored semantics/keyboard support, not automatic accessibility. Preserve aspect ratio when shape/angle truth requires it. Map pointer input back to logical coordinates and validate/snap by task rules; motor imprecision is not a mathematical failure.

Generate deterministic scene data/order/stable IDs from the semantic task and separate layout seed. Test semantic relations/DOM and view transforms; pixel screenshots are tolerant regressions because browser fonts/antialiasing may differ. title/desc/ARIA/lang labels come from localisation and cannot reveal the answer being assessed. Provide select/place/rotate/coordinate controls equivalent to dragging, stable focus, CSS-pixel touch targets and non-colour cues.

[Canvas](https://html.spec.whatwg.org/multipage/canvas.html) is resolution-dependent and requires functional accessible fallback/interactive mappings. It may later suit measured dense rendering, but Canvas-only scenes are rejected as the default. SVG geometry, pixels, getBBox(), screen distances and CSS stroke widths never decide answers. Nonvisual equivalents document their actual evidence scope; visual-specific skills stay unobserved if the alternate modality changes the concept.

## Exponentiation, roots and safe exploration

Represent powers/roots as typed expression nodes and concept relationships, not isolated calculator operators. Progression connects repeated multiplication, squares/cubes, square-area models, general powers, inverse relationships and perfect-square roots initially. The linked meanings 4×4=16, 4²=16 and √16=4 share exact values with different task/evidence/utterance scopes.

An exact principal square-root task has nonnegative perfect-square radicands; √16=4 differs from solving x²=16, whose real solutions are -4 and 4. Validate perfect roots by exact integer relations, not floating Math.sqrt rounding/tolerance. √2 is later symbolic exact notation or an explicitly approximate task, never an integer result silently rounded. Initial policy excludes 0^0 as undefined for its task contract; nonzero-base exponent0 equals1. Negative/noninteger exponents, complex roots and broader root domains need explicit later types/rules; unsupported input returns typed unsupported/domain error, not fabricated truth.

Before exact power/large-number computation, enforce family-specific operand/exponent/output digit-or-bit-size and deterministic work bounds. Preflight growth before allocating huge BigInts or building thousands of visual nodes; bound root-search iterations and scene complexity. Exceeding supported range is a capability explanation, never a wrong answer or mastery penalty. This is computational safety, not a learner-age ceiling.

Number Lab permits large numbers, multiplication, squares/powers/roots and patterns within those limits. It emits bounded session-only exploratoryExposure events, not eligible mastery observations; clear them on session/profile change and exclude exports. Independent confirmation tasks may establish evidence later. Neither a calculator result nor a displayed geometric square proves conceptual understanding.

## Mathematical notation boundary

Use typed expression/quantity/geometry semantics to derive simple HTML/text, native MathML where suitable, or a later reviewed KaTeX/MathJax adapter. MathML mfrac/msup/msqrt/mroot express notation; they do not compute truth or guarantee pronunciation in seven locales. Self-host any typesetter assets, prohibit arbitrary child/community TeX/HTML and bound parsing/layout work. Full evaluation is in [technology](TECHNOLOGY_EVALUATION.md); speech remains a separate reviewed semantic plan.

## Semantic puzzle contracts

```ts
interface ReplayDescriptor {
  familyId: string;
  generatorVersion: string;
  contentVersion: string;
  rngAlgorithm: string;
  seedHex: string;
  spec: Readonly<PuzzleSpec>;
}
interface PuzzleInstance {
  instanceId: string; // local identity, not a learner identifier
  replay: ReplayDescriptor;
  semanticVersion: number;
  task: SemanticTask; // discriminated union, including non-arithmetic tasks
  answerContract: AnswerContract;
  hintPlan: readonly SemanticHint[];
  evidenceScope: EvidenceScope;
}
```

The sketches name separate responsibilities; Phase 1B implements bounded discriminated unions in `src/domain/puzzles/contracts.ts`, with future family-specific extensions still requiring their own scope. A task might express an equation, ordered collection, pattern rule, target construction, spatial relation or measure. An answer contract declares membership/equivalence, allowed structure, order/multiplicity, unit/form restrictions and whether multiple solutions exist. Pattern tasks must constrain the rule enough to avoid pretending one continuation is uniquely determined.

Pure operations conceptually are generatePuzzle(spec, seed, versions), validateAnswer(task, structuredAnswer), deriveHint(task, level), classifyResult(validation, assistance), updateLearnerEvidence(snapshot, observation, policy) and selectNext(snapshot, catalog, intent, day, seed). Hints return semantic cue/representation/step data; localised prose is outside the domain. A valid generated puzzle must pass independent invariants before presentation.

Render the same semantic 6 + 3 task as symbols, quantity groups or an utterance plan without changing truth. Presentation randomisation has a separate stream; changing locale, speech rate, cosmetic rewards or UI layout cannot consume generation randomness. UI answer parsing does not evaluate arbitrary JavaScript or use eval.

## Deterministic replay and versioning

A replay key comprises canonical spec, seed, algorithm ID, generator version and content/semantic versions. Phase 1B finalizes xoshiro128** 1.1 as `xoshiro128ss-v1` with four unsigned 32-bit words encoded as exactly 32 hex characters, s0–s3 textual word order, all-zero rejection and bounded unbiased rejection sampling. [ADR-0009](adr/ADR-0009.md) and [deterministic replay](DETERMINISTIC_REPLAY.md) maintain the algorithm, seed mapping and independently established vector evidence. This is a noncryptographic content tool; local tests passed, while hosted Phase 1B execution remains future evidence. If another algorithm is selected, record its own ID and never reuse an old ID for changed behavior.

No current time, Math.random(), locale, platform or iteration over unordered data affects generation. Catalog order is canonical and constraints bounded; failure to find a task within a documented attempt limit returns a typed unavailable result, not an infinite loop. Generation and selection have separate explicit seeds.

Generator versions are immutable behavioral IDs, independent of app SemVer. Retain golden fixtures and semantic schemas for earlier supported generators. During bounded diagnostic history retain the minimal task snapshot/replay descriptor needed to interpret evidence; when an old generator is retired, its stored semantic task may still be validated by a compatible version. Unsupported old diagnostic formats are labelled unsupported, never regenerated under a new version and assumed identical. Public bug reproductions use standalone synthetic seeds/specs, not exports.

## Internal family extension

Use statically registered typed family modules, not dynamic downloaded plugins. A family provides metadata, graph coverage, dimension schema, generator, independent solution description, validator, semantic hints, presentation capabilities, accessibility/evidence contract, localisation keys and property tests. Family-specific contracts may extend unions; do not force geometry/logic into integer-answer arithmetic.

A new family needs mathematical review, graph/cycle review, educational review, native-language review where messages change and accessibility checks. Reward code subscribes to domain outcomes but cannot control family availability.

## Independent correctness

Generators and validators may share production math helpers, but their tests must also use an independent oracle: exhaustive small-range enumeration, hand-proved fixtures, a separate count/combinatorial model, exact cross-multiplication for rationals or independent solver for target constructions. Never make the sole test “generator answer passes its own validator.” Mutation tests or seeded deliberate defects should prove tests detect incorrect truth. See [testing strategy](TESTING_STRATEGY.md).

## Implemented contract limits

Phase 2 `src/domain/families/` statically registers `number.addition`, `geometry.quadrilateral` and `measurement.unit-length` with immutable generator IDs and `phase2-content-v1`. Bounds permit exhaustive parameter enumeration; generation reuses accepted seeded RNG and runtime codecs, while validation regenerates the complete instance before accepting its answer contract. Hints are semantic and each instance declares one concept/representation pair for possible future evidence. Inclusive classification preserves square ⊆ rectangle ⊆ parallelogram; quantities preserve exact length units/dimensions. The graph links eight canonical concepts without prerequisites/global levels or cross-credit. Existing typed powers/roots remain supported, with no optional fourth family. No learner evidence, adaptation, persistence or playable session is implemented. Independent oracle/mutation/replay/browser results belong in the Phase 2 report, not inferred from family structure alone.

Phase 1B supplies exact rational/decimal/integer DTOs, principal perfect-root and integer-power operations, ordered exact scenes, quantities, bounded expression ASTs, graph validation and replay descriptors. Answers include exact values, inclusive classification, quantities, coordinates, expressions, alternatives and ordered/unordered collections. Hints are semantic data; evidence scopes declare explicit concepts/representations. `exploratoryExposure` is not assignable to an assessment scope and has no promotion route. No finite-pattern task exists; later pattern schemas must constrain the intended rule. Scene/unit structural validation does not establish shape predicates or a unit catalogue. See [value model](DOMAIN_VALUE_MODEL.md) and [report](PHASE_1B_COMPLETION_REPORT.md).
