# Phase 3 target observation protocol

Status: **HUMAN OBSERVATION REQUIRED — PENDING**. Prepared on 2026-10-07.
The [current production binding](evidence/phase3c-closure/production-binding.json)
records the repaired code-bearing preparation and nine verified production files.
Actual current native zoom, AT delivery and physical restart remain unobserved.
Rebuilding for the owner session must reproduce the bound files before observation.
This protocol prepares the two mandatory observations in the
[Phase 3C exit criteria](PHASE_3_IMPLEMENTATION_PLAN.md): actual delivery on one
device/browser/assistive-technology combination and an actual disconnected-device
restart. It supplies no observation or pass by itself. The accepted child surface
and its conservative evidence scopes remain unchanged.

Use only an adult-operated synthetic session with the existing Star and Triangle
badges. Do not involve a child or enter names, imports or real learner material.
The [unfilled observation template](evidence/phase3c-closure/target-observation-template.json)
accepts bounded factual results, including failures and unavailable observations.
Keep the checked-in template unfilled. Copy it into a new sanitized observation
record, set its template flag to false, and fill only facts actually observed.
The engineering operator reviews that record before any repository publication.
No screenshot, audio, video, browser profile, raw database, export, trace or raw
log belongs in the evidence or PR. Record generic device/OS/browser/AT versions,
counts and short nonpersonal observations; omit serials, account names, machine
names and network identifiers. [ADR-0008](adr/ADR-0008.md) remains applicable.

## Production preparation and exact origin

The engineering operator prepares this before the owner observation. Use the
pinned Node and pnpm versions and repository-local Corepack setup from
[development](DEVELOPMENT.md). Run these commands in the repository root:

```powershell
$env:COREPACK_HOME = Join-Path (Get-Location) '.cache/corepack'
$env:COREPACK_DEFAULT_TO_LATEST = '0'
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = '0'
corepack pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw 'Frozen install failed' }
$env:NODE_ENV = 'production'
$taskObservationSite = Join-Path (Get-Location) '.cache/phase3c-closure/current-device-site'
corepack pnpm exec vite build --config vite.slice.config.ts --outDir $taskObservationSite
if ($LASTEXITCODE -ne 0) { throw 'Production build failed' }
```

Before preview, compare all rebuilt files with the recorded inventory. Stop on
any missing, extra or changed file; do not claim that a mismatched rebuild has the
prepared source/build binding.

```powershell
$taskProductionBinding = Get-Content -Raw 'docs/evidence/phase3c-closure/production-binding.json' | ConvertFrom-Json
$taskProductionFiles = @(Get-ChildItem -LiteralPath $taskObservationSite -Recurse -File)
if ($taskProductionFiles.Count -ne $taskProductionBinding.artifacts.Count) { throw 'Production inventory count differs' }
foreach ($taskArtifact in $taskProductionBinding.artifacts) {
  $taskArtifactPath = Join-Path $taskObservationSite $taskArtifact.path
  $taskArtifactFile = Get-Item -LiteralPath $taskArtifactPath -ErrorAction Stop
  $taskArtifactHash = (Get-FileHash -LiteralPath $taskArtifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($taskArtifactFile.Length -ne $taskArtifact.bytes -or $taskArtifactHash -ne $taskArtifact.sha256) { throw 'Production artifact differs' }
}
corepack pnpm exec vite preview --config vite.slice.config.ts --outDir $taskObservationSite --host 127.0.0.1 --port 4178 --strictPort
```

The foreground preview serves the production synthetic build at
**http://127.0.0.1:4178/**. It does not publish or deploy anything. Start this owned
preview for preparation, then stop it with Ctrl+C at the required physical-test
step. Use production preview, not Vite's development
server: the verified PWA build is required. Keep the loopback binding and explicit
port and the dedicated `.cache/phase3c-closure/current-device-site` output. The
absolute output path keeps both commands on that repository-local directory,
independently of the Vite config's nested root. If the port is occupied, the strict
command fails; resolve the owned preparation conflict without terminating an
unrelated listener or silently selecting another origin.

The strict 4178 launcher was checked against all nine prepared HTTP responses;
each response matched its bound file bytes and hash. That owned listener was then
stopped and HTTP unavailability confirmed. No browser cache or synthetic state
was prepared by that server check. Start the foreground preview above and perform
the cache/save preparation in the observation steps; server verification alone
does not supply an offline session.

Use a dedicated synthetic browser profile, without account sign-in or sync, and
retain that same profile and origin through the test. Changing a port, switching
between `localhost` and `127.0.0.1`, or clearing browser storage changes or removes
the origin-bound cache and records. Do not substitute another origin on restart.

The earlier `.cache/phase3c-closure/device-site` build and random preview origin
**http://127.0.0.1:65065/** are historical. They contain the unrepaired ce4
presentation and cannot supply observations for the current geometry-card repair.
Do not reuse that origin or cache as the current prepared run. Build the repaired
source into the dedicated current directory above, then prepare its cache and
synthetic state at the fixed 4178 origin. The random-port proof server is not the
current observation launcher.

The current build below was generated from code-bearing preparation commit
`14fe8e10e90472b7cbaa2b6c7e827220fd530620`, tree
`8f3a10bcc8c7a9adeca7192684b64fbac5faf118`. Its root and isolated fresh production
outputs contain nine byte-identical files. The
[engineering record](evidence/phase3c-closure/engineering-verification.json)
separately binds full/fresh verification, audit and independent preparation review
to that code-bearing commit. This is a production-renderer build, separate from
the test/development renderer used by the automated native suite.

- Shell ID: `16c1a51db6e8b19ee208ff149ededf86ecaf4ac7cd2316f5202de5b40ada1009`.
- Release ID: `sha256-5c30f781bd75ed2981a8fc97b5d285bd26ea6043d70154a3ee06142a316ddec7`.
- The release declares seven essential files; `release.json` and `sw.js` bring
  the complete output inventory to nine files.

| Production file             | Bytes  | SHA-256                                                            |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| `assets/index-B3cGK_KG.js`  | 421394 | `d7d5313cbcf5549bfdec96fd21c06f81ed7a985bd9a425d1282e594304125ad4` |
| `assets/index-CR5vbDeH.css` | 14365  | `9af6dfbaa7d5139cb7cfb082f993986a7d25e08cd32b90e802e5775ad59849b8` |
| `icons/math-adventure.svg`  | 431    | `a3149c53ce3dd32ac89cce807b2c756b3e6bfe86ae13e941a437e8196f804da6` |
| `index.html`                | 709    | `6df77855d213a4ae16b4eac9c95e082b11f72c7bc34cade594cf80e9ddc74690` |
| `learner-reader.json`       | 92     | `ddf50ce505975737ab6c208383f265e16fcaba65d3560035fa2db7d5767a0447` |
| `manifest.webmanifest`      | 440    | `4f45a4ff805e952157734f81f8501eba54f4f2e5d0c8c0ef041c19f0657d034c` |
| `release.json`              | 1452   | `c8a6f9eb0e6382f51c6837bf50422057d6d8bbca4411b52863c812fb087141c1` |
| `sw.js`                     | 22636  | `42d08017a5eb3c2504962f6932f43be6b1141fa9cd3c4cecf17958141bcb3b4d` |
| `THIRD_PARTY_NOTICES.txt`   | 1384   | `d79545965a59895fc431b6f519fe411bc32a26415c656b7d531dd7dfcd453aab` |

These identities bind the repaired code-bearing preparation, not a future
containing commit. A later documentation-only candidate must independently prove unchanged
application/build inputs and byte-identical production artifacts before carrying
this build binding forward, and still satisfy its own complete canonical/fresh,
independent and exact-head hosted publication gates. Actual final-head CI results
belong in the live PR; this protocol cannot certify its own future head. Record
the compared revisions, actual input differences and
all artifact comparisons. A changed application, build configuration, dependency,
lockfile or production byte requires a new build binding and relevant observation;
the phrase “same candidate” is insufficient evidence.

## Current actual browser zoom

The earlier merged-ce4 [native zoom receipt](evidence/phase3c-closure/native-observation.json)
is historical. The repaired current production build requires its own observation.

1. On the bound current surface, use the browser's native zoom control to set
   **200%**. Record the actual setting; CSS text scaling is separate evidence.
2. In child mode, inspect every family through **Play**, **Something else** and
   **Shapes**, including the three **Show me** stages. Check readable cards,
   unclipped mathematical content, usable reflow and keyboard answer/feedback focus.
3. Record a short sanitized pass/fail observation for the current build and
   browser in the template's `actualNativeBrowserZoom` fields, then restore native
   zoom to 100%. No screenshot or raw task history
   is required. This observation does not establish AT delivery or physical restart.

## Actual screen-reader delivery

The owner observes one named combination, such as the current Windows device,
installed Chrome and an available screen reader. Use an existing permitted AT;
this protocol does not authorize installation, voice downloads, new permissions
or security/privacy setting changes. The observer must actually hear or read the
AT's delivered output. An accessibility tree, DOM labels, automation success,
screen-reader process presence or application speech is not delivered AT evidence.

1. Open the prepared exact origin and select **Star**. In **Grown-ups**, retain
   local synthetic saving and manual/no-evidence mode. Choose a usable draft UI
   and instruction locale if needed, then choose **Back to play**. Record the
   actual locale roles. Native-language certification is separate.
2. In child mode, use the real screen reader and keyboard to choose badges and
   navigate **Play**, **Shapes** and **Explore**. Confirm delivered names and
   selected states, a usable focus order and absence of developer diagnostics.
3. Inspect all eight rows below. **Shapes** reaches quadrilateral matching;
   **Play** and **Something else** cycle the seven number/measurement activities.
   Use the child's direct answer cards, rather than the developer catalog or
   its controls. For every activity, observe the delivered prompt, illustration
   alternative, answer names/roles, keyboard activation, focus after feedback and
   all three **Show me** stages. Record missing, misleading or unusable output as
   a failure. Do not retain operands, answers or task histories.

| Family                 | Observe in the delivered AT output                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Addition               | Group relationship, direct number cards and meaningful help without a marked solution        |
| Quadrilateral          | Child shape task and shape-card names; no A/B/C/D or squared-length diagnostic presentation  |
| Unit length            | Equal logical units and usable traversal alternatives; no physical-centimetre claim          |
| Numeral/group matching | Displayed numeral and distinguishable group alternatives without a preselected answer        |
| Counting               | Usable item/count alternatives; counted descriptions do not prove unaided visual recognition |
| Comparison             | Left, Right and Same names/roles and pairing help with the relationship kept truthful        |
| Subtraction            | Removed versus remaining items and truthful help without an answer-marked choice             |
| Missing number         | The declared gap remains unknown; known parts and whole are distinguishable through help     |

4. Set actual browser zoom to **200%** using the browser's zoom control. Confirm
   all eight initial tasks and Show me remain readable and their cards reachable
   without horizontal clipping; this is distinct from CSS text scaling. Record
   the percentage and observed result, then restore the prior zoom. The earlier
   ce4 observation cannot certify the subsequently repaired CSS.
5. Across the activities, deliberately observe one incorrect/retry path, one
   correct/continue path, saving status, **Something else**, **Stop** and restart
   of the synthetic session. Confirm each delivered response and useful focus;
   a visual status alone does not establish its announcement. Report unexpected
   silence, duplicates or focus loss precisely. Do not install or test product
   voices to substitute for these AT observations.
6. Confirm that geometry recognition remains excluded from full attribute
   evidence and manual/Explore activity adds no assessment observations. The
   engineering operator verifies those bounded counts/scopes through the separate
   diagnostic view; the owner does not need to interpret raw records. Counted
   accessibility descriptions may support an accessible task but cannot receive
   unaided visual-recognition credit.

## Actual physically disconnected-device restart

The owner performs the physical actions. Browser offline emulation, an owned
proxy or a stopped local listener alone cannot satisfy this observation.

1. Before disconnection, choose **Play**, retain manual/no-evidence mode, leave the
   selected synthetic profile saved and obtain
   both visible messages in Grown-ups: **“The complete offline shell is ready in
   this tab.”** and **“Saved on this device.”** Record the actual locale equivalents
   if using another draft locale. Shell readiness and saving must each be
   confirmed. Record only the fixed badge, activity, locale roles, manual mode and
   bounded synthetic completed count. Return to child mode.
2. Stop the **owned** preview/listener. For the foreground preview command, use
   Ctrl+C in its terminal. The engineering operator confirms the listener is
   stopped before the owner restarts the device. Keep the exact URL available
   outside the running server, and retain the same browser profile/cache.
3. Physically disconnect every external network interface, for example unplug
   Ethernet and switch off Wi-Fi/mobile connectivity. Record only the method and
   whether any alternative interface remained connected; omit network identifiers.
   Restart the actual device while disconnected. Leave the preview stopped.
4. Before reconnecting or starting the preview, open the exact prepared URL in
   the same browser profile. Record whether the child surface renders and remains
   usable. Explicitly select the same badge; no automatic profile selection is
   expected. The engineering operator checks that the bounded saved state matches
   the baseline. Missing state or a shell-only load is not a successful learner
   restart.
5. Complete one further synthetic task, observe **Saved on this device**, close
   and reopen the browser while still disconnected and with the listener stopped,
   and select the same badge again. Confirm the new bounded completed count and
   preferences persist. Record each failed or unavailable step without inference.
6. Reconnect after observations are complete and return the filled sanitized
   template to the engineering operator for review and final candidate gates.
   Do not restart the server or reconnect before recording the offline results.

An actual observation can support only the recorded device/browser/AT and build.
It is not WCAG certification, a supported-device floor, native-language review,
offline-voice certification, educational effectiveness, representative child
research or real-child trial evidence. It grants no release, deployment, policy
change or Phase 4 authority. Phase 3 remains open until its required observations,
remaining engineering checks and publication/merge gates are genuinely satisfied.
