# Account CI execution status

Public Hub workflows run unprivileged integration unit contracts. The original six immutable Account paired suites remain in their workflows with an unconditional false job condition. They are **NOT_EXECUTED**, not passed or production-qualified.

Account became private, so the public Hub's default token cannot check it out. Adding private checkout credentials to this public repository would also let candidate build/test code read that source. The next step is an independently controlled qualification workflow that selects reviewed immutable Hub and Account revisions, fetches source with scoped credentials, removes credentials before execution, isolates private execution and retains private evidence.

Do not provision a checkout token here or enable the inert jobs as a shortcut. Public contract success cannot authorize private feature activation. Existing deployed features, release profiles, consent and device acceptance requirements remain unchanged.

The Quality workflow checks these boundaries. Source here preserves the original suite commands/pins for migration, without importing Prism or other draft-stack changes.
