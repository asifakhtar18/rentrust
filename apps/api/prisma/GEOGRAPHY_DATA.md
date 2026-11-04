# India geography reference data

`../../../in.json` supplies the prominent Indian city/town names and coordinates imported by `seed-geography.ts`. Its field structure and contents correspond to the Basic World Cities Database from [SimpleMaps](https://simplemaps.com/data/world-cities), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The public city picker links to the source and license.

This file contains 354 place rows, not a complete directory of all Indian settlements or neighbourhoods. The importer ensures the full 28-state and 8-union-territory master list, normalizes diacritics for display, and adds only places absent from the `(state, city)` catalogue. Residents can suggest missing neighbourhoods through the locality submission flow.

Run from the repository root to idempotently apply the country, state/UT and city data to the configured database:

```sh
npm run db:seed:geography --workspace @rentrust/api
```
