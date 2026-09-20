# Initial diagram import

Source: `docs/Knowledge Atlas Folder Structure.pages`, imported 2026-09-20. The Pages document is preserved unchanged.

The 16 category names and their order were read from the document text by decoding the Snappy-compressed IWA stream and its protobuf records, and checked against the embedded first-page preview. Full-resolution originals were extracted byte-for-byte from the archive; the small preview images were not used. Each category uses its example diagram as its deterministic cover. Diagram titles are human-readable versions of the embedded filenames, not OCR-derived text.

The document contains **15 distinct source images and 16 image placements**. **Evolution intentionally reuses the Colours Associated with Our Emotions image**, exactly as placed in the document. The final inline attachment (object 1745561) references image object 1745461, whose original asset reference is 38; this is the same asset used for Understanding Emotions. No Evolution artwork was invented.

Category IDs and diagram IDs are explicit stable slugs in each `folder.json`; changing a title does not require changing either ID.

| Order | Category | Imported original | Pages archive member | SHA-256 |
|---|---|---|---|---|
| 1 | Cosmology: How It All Began | `diagrams/cosmology-how-it-all-began/metaverse-antverse-and-universes.png` | `Data/metaverse_antverse_universes_final-24.png` | `e619611e3c1e737e1ecf25adcee46944aed019c4805b13a0c1f86e4485593ab3` |
| 2 | The Monad & How It Functions | `diagrams/the-monad-how-it-functions/the-monad-the-soul-and-its-personalities.png` | `Data/The Monad, the Soul, and its Personalities-26.png` | `819fea27929144d6750909894bfe2ad9a6f3852a263d15885ac90c1155c2f069` |
| 3 | Envelopes of Incarnation | `diagrams/envelopes-of-incarnation/emotional-envelope.png` | `Data/Emotional Envelope copy-28.png` | `5331a85d298e9cc915a394fa671cea96b429e30f162b90ef7ca72df93c0fea03` |
| 4 | Development of Consciousness | `diagrams/development-of-consciousness/levels-of-consciousness.png` | `Data/Levels of Consciousness_1-30.png` | `03c3ffc167138202d27165358e2c71a6ae6e276c516f50d5295d73ed3933e6dd` |
| 5 | How Chakras Function | `diagrams/how-chakras-function/the-centres-chakras.png` | `Data/The centres (chakras)-32.png` | `3feae76ecf618a8a89b9bf136edbd7609ecf311baa2576993bb5f6a24d095a03` |
| 6 | Types of Energies | `diagrams/types-of-energies/rays-7.png` | `Data/Rays (7)-34.png` | `73035ded24b4903befc1b6370e0f7df1aeb06fde97e8a51897fb1597812257d3` |
| 7 | Kingdoms of Nature | `diagrams/kingdoms-of-nature/group-souls-across-the-kingdoms-consolidation.png` | `Data/Group Souls Across the Kingdoms - Consolidation-36.png` | `ce5dee0b950edd6b84dc9e87a672da217dec7807e5279b9bd392b7113da93725` |
| 8 | Understanding Emotions | `diagrams/understanding-emotions/colours-associated-with-our-emotions.png` | `Data/Colours associated with our emotions (1)-38.png` | `c983bc9722496345e43a2c64c888ee93e39449eb3482357c4a6b7d957234b9ed` |
| 9 | Chains, Rounds & Globes | `diagrams/chains-rounds-globes/the-root-races-of-the-4th-globe.png` | `Data/The Root Races of the 4th Globe-40.png` | `fe6f280f3fe602c6cbc44b76db02307d26fc619afa39bc242c06d562d7ebd9ca` |
| 10 | Death & Reincarnation | `diagrams/death-reincarnation/number-of-incarnations.png` | `Data/Number of Incarnations-42.png` | `4391f745245d6174ac26c071cbf09b426dbe0a8d7f76361a1d029223072e10d8` |
| 11 | The Hierarchies | `diagrams/the-hierarchies/hierarchy.png` | `Data/Hierarchy-44.png` | `2783bd5f2fab09851128a98c4701ec2f45d6eb24ca46201d1154f1ccb4767825` |
| 12 | Path to Initiation | `diagrams/path-to-initiation/seven-paths-of-service.png` | `Data/Seven Paths of Service-46.png` | `73610a584195ecbf2bfb9aa21ad21058433d93b23b9945542b2d6f459c9769cf` |
| 13 | Comparative Symbolism | `diagrams/comparative-symbolism/the-christian-symbolism.png` | `Data/The Christian Symbolism-48.png` | `37a3324e13b01e584bf736d9721e2a2152e4f564086630cbb448d78b36faee88` |
| 14 | Planes of Matter | `diagrams/planes-of-matter/one-plane-two-distinct-envelopes.png` | `Data/One Plane, Two Distinct Envelopes - corrected 2026-07-30-50.png` | `ce9995154da3a3bdca5a161bf8941ebb2e996c7cae26c94ad5de3ae662a6aa1d` |
| 15 | The Atom | `diagrams/the-atom/atom-leadbeater.png` | `Data/Atom (Leadbeater)-52.png` | `4004462c42501e4ce79d38e2c9dae4e40f0ec7d1b91baf24dec41fc33f9780d4` |
| 16 | Evolution | `diagrams/evolution/colours-associated-with-our-emotions.png` | `Data/Colours associated with our emotions (1)-38.png` | `c983bc9722496345e43a2c64c888ee93e39449eb3482357c4a6b7d957234b9ed` |
