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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full contract (API, store shape,
slot registration, class ownership).
