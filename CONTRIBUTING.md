# Contributing

Thanks for taking a look! This is a single-bundle DeepSeek Harness plugin; the
whole development loop runs on plain Node.js (>= 22) with no dependencies.

## Development loop

```sh
node scripts/build-client.mjs        # rebuild lib/client.js from src/client/parts
node scripts/verify.mjs              # manifest / exports / locales / bundle guards
node --test                          # storage, archival and session dispatch tests
node scripts/smoke-host-routes.mjs   # every host route through a fake registry
node scripts/smoke-client.mjs        # render every browser surface without a browser
```

`npm run check` runs all of them in order.

`npm run pack` additionally creates `dist/dsh-workboard-<version>.tgz`, installs
that exact archive offline into a temporary consumer, and repeats manifest,
Host-route and client checks against the installed files. A SHA-256 file is
written beside the archive. CI runs this command on Node.js 22 and 24.

`prepack` runs the full check before `npm pack` / `npm publish`. Do not add a
consumer-side build hook: the package ships its runtime entries prebuilt.
See [Packaging and release](docs/RELEASING.md) for release steps and official DSH references.

## Ground rules

- Use React and the host-provided `@deepseek-ai/dsh-client-ui-primitives` from the client module table. Use host controls and icons for session surfaces.
- Browser parts are plain scripts concatenated inside one `factory(require)`
  scope: no `import`/`export`, no redeclaration of an earlier part's names.
- Every CSS class is `kbn-` prefixed and every colour is a `--dsw-*` token.
- Visible copy goes through `t()`; zh and en dictionaries must carry the same
  keys.
- `lib/client.js` is generated **and committed** because it is the plugin's
  browser runtime. Rebuild it before committing a change under
  `src/client/parts/`. CI fails when the committed bundle differs from sources.
- Host source lives in `host/`; `lib/` holds only the generated client bundle.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full contract (API, store shape,
slot registration, class ownership).

## Directory and package boundaries

- Keep the root manifest, bundle patch, icon, localized READMEs, license,
  changelog and this contribution guide easy to find.
- Keep detailed documentation under `docs/`, browser sources under
  `src/client/parts/`, Node runtime code under `host/`, and checks under
  `scripts/` and `test/`.
- `package.json.files` is the package allowlist. Source parts, scripts, tests,
  CI configuration, `dist/` and user data must stay out of the archive.
- The package has no third-party Node dependencies, so no dependency install
  or lockfile is needed today. Commit a lockfile if dependencies are added.
- Do not rename the linked checkout directory without updating local DSH
  profile links. Its existing `kanban` folder name does not affect the public
  package name `dsh-workboard`.
