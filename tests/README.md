# Navigation regression checks

Start the local Atlas, reload it, and open the browser console. Paste the contents of `navigation.browser.js`, then run:

```js
await testAtlasNavigation()
```

The function exercises the actual page with wheel and pointer events. It finishes in categories and returns the passed checks; failures throw with the failed behavior. It assumes the default `ATLAS_TUNING` thresholds and a freshly loaded category field. Reload before another run. No packages or runtime test hooks are required.

Checks cover first/final generation browsing, base arrival and overshoot, accumulated trackpad input, idle/direction/target resets, line-mode wheel input, hovered-node entry, wheel over the head, detail/back, Ctrl-wheel, separate back swipes, pinch direction, and cancelled multi-touch/click suppression.

Validated in Chrome: 32 checks with normal animation, 32 with reduced-motion behavior, and 30 in phone emulation with a one-image category fixture (two multi-generation checks do not apply). The fixture was injected in the test browser; source content was not changed. These checks simulate trackpad/touch events; physical hardware sensitivity still needs user testing.
