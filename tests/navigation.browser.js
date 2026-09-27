// Run this function in a freshly loaded Atlas page (or via evaluate_script).
// No test framework or production test hooks required. Uses the loaded catalog.
async function testAtlasNavigation() {
  const stage = document.getElementById('atlas-stage');
  const root = document.getElementById('atlas');
  const head = document.getElementById('atlas-head');
  const back = document.getElementById('atlas-back');
  const detail = document.getElementById('atlas-detail');
  const results = [];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async predicate => {
    const deadline = performance.now() + 6000;
    while (!predicate()) {
      if (performance.now() > deadline) throw new Error('Navigation did not settle');
      await wait(25);
    }
  };
  const depth = () => Number(document.getElementById('atlas-depth').textContent.replace('DEPTH ', ''));
  const categories = () => back.hidden;
  const check = (label, condition) => {
    if (!condition) throw new Error(label);
    results.push(label);
  };
  const wheel = (deltaY, target = head, extra = {}) => {
    const event = new WheelEvent('wheel', {deltaY, bubbles:true, cancelable:true, ...extra});
    target.dispatchEvent(event);
    return event;
  };
  const nodes = () => [...document.querySelectorAll('.atlas-node')];
  const settleTurn = () => until(() => !root.classList.contains('is-turning'));
  const openCategory = async () => {
    nodes()[0].click();
    if (categories()) nodes()[0].click(); // Touch first tap selects.
    await settleTurn();
    check('Category opens', !categories() && !root.classList.contains('is-detail'));
  };
  const settleDepth = async value => {
    await until(() => depth() === value);
    // The HUD rounds to two decimals; let easing finish beyond that point.
    await wait(matchMedia('(prefers-reduced-motion: reduce)').matches ? 40 : 650);
  };
  await until(() => nodes().length > 0);
  check('Starts in categories', categories());
  await openCategory();
  const lastDepth = Math.ceil(nodes().length / 6);

  wheel(100);
  await settleDepth(Math.min(1.25, lastDepth));
  check('Wheel down browses from depth 1 without exiting', !categories());
  wheel(100000);
  await settleDepth(lastDepth);
  wheel(100000);
  check('Extra wheel down at final generation never exits', !categories());
  if (lastDepth > 1) {
    wheel(-100000);
    await settleDepth(1);
    check('Reaching depth 1 does not count overshoot as back intent', !categories());
  }
  wheel(-100);
  check('Partial back threshold stays in diagrams', !categories());
  await wait(500);
  wheel(-150);
  check('Idle clears previous back intent', !categories());
  wheel(1); // Direction reversal clears the back intent.
  await wait(40);
  wheel(-1);
  await settleDepth(1);
  wheel(-100);
  check('Direction reversal clears previous back intent', !categories());
  wheel(-140);
  await settleTurn();
  check('Fresh wheel-up threshold at base exits to categories', categories());

  await openCategory();
  wheel(-80, nodes()[0]);
  wheel(-100, nodes()[1] || head);
  check('Changing hovered target resets enter intent', detail.hidden);
  wheel(-80, nodes()[0]);
  wheel(-100, head);
  check('Head does not use stale hovered node to enter detail', detail.hidden);
  wheel(-100, nodes()[0]);
  check('Entering a target starts a fresh threshold', detail.hidden);
  wheel(-80, nodes()[0]);
  check('Hovered node enters after its own threshold', !detail.hidden);
  wheel(100000);
  check('Detail does not exit from wheel momentum', !detail.hidden);
  back.click();
  check('Back from detail restores diagrams', detail.hidden && !categories());
  back.click();
  await settleTurn();

  await openCategory();
  wheel(-2, head, {deltaMode:1}); // 80 normalized pixels.
  check('Line wheel input honors partial threshold', !categories());
  wheel(-4, head, {deltaMode:1});
  await settleTurn();
  check('Line wheel input reaches normalized threshold', categories());
  await openCategory();
  const browserZoom = wheel(-1000, head, {ctrlKey:true});
  check('Ctrl-wheel stays available for browser zoom', !browserZoom.defaultPrevented && !categories());
  for (let i = 0; i < 23; i++) wheel(-10);
  check('Small trackpad deltas below threshold do not exit', !categories());
  wheel(-10);
  await settleTurn();
  check('Small trackpad deltas accumulate to exit', categories());

  await openCategory();
  const pointer = (type, id, x, y) => stage.dispatchEvent(new PointerEvent(type, {
    pointerType:'touch', pointerId:id, clientX:x, clientY:y, bubbles:true, cancelable:true
  }));
  const swipe = dy => {
    pointer('pointerdown', 1, 100, 350);
    pointer('pointermove', 1, 100, 350 + dy);
    pointer('pointerup', 1, 100, 350 + dy);
  };
  swipe(-120);
  await settleDepth(Math.min(2, lastDepth));
  check('Swipe up reveals more without exiting', !categories());
  if (lastDepth > 1) {
    swipe(140);
    await settleDepth(1);
    check('Swipe arriving at base does not exit', !categories());
  }
  swipe(60);
  check('Short downward swipe at base does not exit', !categories());
  swipe(120);
  await settleTurn();
  check('Separate deliberate downward swipe at base exits', categories());
  await wait(410);
  await openCategory();

  pointer('pointerdown', 1, 50, 350);
  pointer('pointerdown', 2, 250, 350);
  pointer('pointermove', 2, 150, 350);
  await settleDepth(Math.min(2.2, lastDepth));
  check('Pinch together reveals a wider field', !categories());
  pointer('pointermove', 2, 450, 350);
  await settleDepth(1);
  pointer('pointerup', 2, 450, 350);
  pointer('pointermove', 1, 50, 600);
  pointer('pointerup', 1, 50, 600);
  nodes()[0].click();
  check('Spread clamps at base without exiting or clicking through', !categories() && detail.hidden && !nodes()[0].classList.contains('is-selected'));
  pointer('pointerdown', 1, 50, 350);
  pointer('pointerdown', 2, 250, 350);
  pointer('pointercancel', 2, 250, 350);
  pointer('pointerup', 1, 50, 600);
  check('Cancelled multi-touch does not create a back swipe', !categories());
  back.click();
  await settleTurn();
  return {passed:results.length, results};
}
