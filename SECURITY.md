# Security policy — proposed before public release

Math Adventure is architecture/pre-alpha. There is no deployed application or defined supported release line. A maintainer-approved private reporting address or private GitHub vulnerability-reporting channel must be established before accepting public contributions or publication; none is invented here.

**Do not publish sensitive exploit details, real child data, exports or secrets in an Issue.** Until a private channel is designated, keep sensitive findings local and notify the owner through an already trusted private contact. Do not send data to an unverified address.

A future private report should contain affected version/platform, a minimal synthetic reproduction, security impact and suggested mitigation. Include no learner profile or identifying device metadata. Response targets are proposed: acknowledge within 7 calendar days, triage within 14, agree disclosure timing based on severity and an available fix. These are not current service promises.

Planned release policy: support the current stable release and communicate security fixes to offline users through an update notice on reconnect. Define a concrete maintenance window before launch. Offline installations cannot be forcibly patched; explain stale-version risks without collecting telemetry.

See [threat model](docs/SECURITY_THREAT_MODEL.md), [privacy](docs/CHILD_SAFETY_AND_PRIVACY.md) and [testing gates](docs/TESTING_STRATEGY.md). Contributions must not add remote executable scripts, unsafe HTML, telemetry, excessive native permissions or unreviewed migrations.
