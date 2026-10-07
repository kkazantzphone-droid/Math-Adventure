# Phase 3 target observation protocol

Status: **HUMAN OBSERVATION REQUIRED — PENDING**. Prepared on 2026-10-07.
The ce4 build inventory below is historical after the subsequent geometry-card
CSS repair. Before observing the repaired candidate, rebuild it and replace the
source/tree and nine-file binding with the actual current production output;
do not claim byte equivalence with this earlier build.
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
$env:NODE_ENV = 'production'
$taskObservationSite = Join-Path (Get-Location) '.cache/phase3c-closure/current-device-site'
corepack pnpm exec vite build --config vite.slice.config.ts --outDir $taskObservationSite
corepack pnpm exec vite preview --config vite.slice.config.ts --outDir $taskObservationSite --host 127.0.0.1 --port 4178 --strictPort
```

This serves the production synthetic build at **http://127.0.0.1:4178/**. It
does not publish or deploy anything. Use production preview, not Vite's development
server: the verified PWA build is required. Keep the loopback binding and explicit
port and the dedicated `.cache/phase3c-closure/current-device-site` output. The
absolute output path keeps both commands on that repository-local directory,
independently of the Vite config's nested root. If the port is occupied, the strict
command fails; resolve the owned preparation conflict without terminating an
unrelated listener or silently selecting another origin.

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

Before the observation, the engineering operator records the actual source
commit/tree and computes all nine production file hashes. The historical build
below was generated from source commit
`ce4eccb87b731a15034950db66c01be9d94e07c8`, tree
`6ed58ac5e332340940017665fbbdd95433a7d88e`. Its files were read directly on
2026-10-07. It is a production-renderer build, separate from the test/development
renderer used by the automated native suite.

- Shell ID: `09c11e048bd90f2ca297d2f4277fb978acc2a16eafd3454278bc5e346e4ddd8b`.
- Release ID: `sha256-a426a3491b365b0011e0724561f1c6d3a3f1332d7baeb19ff0d26836eb334f13`.
- The release declares seven essential files; `release.json` and `sw.js` bring
  the complete output inventory to nine files.

| Production file             | Bytes  | SHA-256                                                            |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| `assets/index-CWktD12s.js`  | 421394 | `d7d5313cbcf5549bfdec96fd21c06f81ed7a985bd9a425d1282e594304125ad4` |
| `assets/index-Dfeng4Z-.css` | 14231  | `b3ca6766da795f1461e86d3c35895c5c13609f7ae8afb98fa42d7c4033fd12a6` |
| `icons/math-adventure.svg`  | 431    | `a3149c53ce3dd32ac89cce807b2c756b3e6bfe86ae13e941a437e8196f804da6` |
| `index.html`                | 709    | `845558d87a3e184c047d09e69927ea7147fd47c8f6539906907744a767aa61cb` |
| `learner-reader.json`       | 92     | `ddf50ce505975737ab6c208383f265e16fcaba65d3560035fa2db7d5767a0447` |
| `manifest.webmanifest`      | 440    | `4f45a4ff805e952157734f81f8501eba54f4f2e5d0c8c0ef041c19f0657d034c` |
| `release.json`              | 1452   | `e3cb1a38c20eb5e5911b80dc4ded7eeaa5ffa8af9cb46696321ee7fa79d0ad2a` |
| `sw.js`                     | 22636  | `a3418096fa056e4b26af829d6dcf9d4a45cf32ba65aa0886f7c102c630203f1f` |
| `THIRD_PARTY_NOTICES.txt`   | 1384   | `d79545965a59895fc431b6f519fe411bc32a26415c656b7d531dd7dfcd453aab` |

These identities certify the historical files, not the repaired current output
or a future containing commit. A
later documentation/test-only candidate must independently prove unchanged
application/build inputs and byte-identical production artifacts before carrying
this build binding forward, and still satisfy its own complete local/fresh and
publication gates. Record the compared revisions, actual input differences and
all artifact comparisons. A changed application, build configuration, dependency,
lockfile or production byte requires a new build binding and relevant observation;
the phrase “same candidate” is insufficient evidence.

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
