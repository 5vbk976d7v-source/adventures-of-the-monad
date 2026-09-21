import { buildDiagramLink, clearDiagramLink, findDiagramFromLink, loadCatalog, readDiagramLink, safeText } from './atlas-catalog.js';
import { createDiagramSearch } from './atlas-search.js';
import { loadSizedImage } from './atlas-images.js';

(() => {
  'use strict';

  const root = document.getElementById('atlas');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = '1';

  const stage = document.getElementById('atlas-stage');
  const nodesEl = document.getElementById('atlas-nodes');
  const connections = document.getElementById('atlas-connections');
  const contextEl = document.getElementById('atlas-context');
  const depthEl = document.getElementById('atlas-depth');
  const instructionEl = document.getElementById('atlas-instruction');
  const backBtn = document.getElementById('atlas-back');
  const brandBtn = document.getElementById('atlas-brand');
  const head = document.getElementById('atlas-head');
  const headFront = document.getElementById('head-front');
  const headThreeQuarter = document.getElementById('head-three-quarter');
  const headProfile = document.getElementById('head-profile');
  const detailEl = document.getElementById('atlas-detail');
  const detailImage = document.getElementById('detail-image');
  const detailCode = document.getElementById('detail-code');
  const detailTitle = document.getElementById('detail-title');
  const detailCaption = document.getElementById('detail-caption');
  const detailFullscreenBtn = document.getElementById('detail-fullscreen-button');
  const detailCopyLinkBtn = document.getElementById('detail-copy-link-button');
  const fullscreenEl = document.getElementById('atlas-fullscreen');
  const fullscreenImage = document.getElementById('atlas-fullscreen-image');
  const fullscreenClose = document.getElementById('atlas-fullscreen-close');
  let fullscreenClosing = false;
  const emptyEl = document.getElementById('atlas-empty');
  const searchInput = document.getElementById('atlas-search-input');
  const searchResults = document.getElementById('atlas-search-results');
  const meters = [...document.querySelectorAll('.atlas__meter')];

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReducedMotion = motionPreference.matches;
  let headTurnId = 0;
  let headTurning = false;
  let headAnimations = [];
  let mirroredHead = false;
  const CHUNK = 6;

  // Interaction tuning. These values are deliberately kept together so mouse,
  // trackpad and touch behavior can be tuned without hunting through handlers.
  const ATLAS_TUNING = {
    wheelSensitivity: 0.0025,
    enterScrollThreshold: 180,
    backScrollThreshold: 2880, // Normalized wheel pixels, only at settled DEPTH 1.
    intentIdleMs: 1750,
    swipeDistance: 48,
    backSwipeDistance: 96,
    pinchSensitivity: 0.012
  };

  let catalog = null;
  let mode = 'categories'; // categories | diagrams | detail
  let depth = 0;
  let targetDepth = 0;
  let selectedIndex = null;
  let activeCategory = null;
  let activeDiagram = null;
  let activeDiagramIndex = -1;
  let enterIntent = 0;
  let animationFrame = 0;
  let touchStartY = null;
  let touchStartX = null;
  let touchStartedAtBase = false;
  let touchMoved = false;
  let suppressClickUntil = 0;
  const touchPoints = new Map();
  let pinchStartDistance = null;
  let pinchStartDepth = null;
  let backIntent = 0;
  let lastWheelTime = 0;
  let wheelContext = '';
  let lastHudStage = -1;
  const nodeMap = new Map();
  const METER_OVERSHOOT = .65;
  let meterDragging = false;
  const diagramSearch = createDiagramSearch({
    input: searchInput,
    results: searchResults,
    getCategory: () => activeCategory,
    onSelect: selection => openDiagramSelection(selection)
  });

  // Active nodes deliberately differ in size and proportion, following Concept 03.
  const LARGE_DESKTOP = [
    [24, 26, 28, 35],
    [49, 15, 19, 23],
    [76, 23, 23, 32],
    [80, 59, 29, 34],
    [68, 86, 20, 17],
    [22, 71, 25, 31]
  ];
  const LARGE_MOBILE = [
    [27, 16, 45, 23],
    [76, 14, 34, 19],
    [81, 43, 32, 23],
    [75, 76, 44, 24],
    [24, 81, 37, 20],
    [20, 48, 33, 22]
  ];

  // Previous chambers occupy the spaces between the dominant lenses.
  const SMALL_DESKTOP = [[32,49],[64,10],[94,38],[48,86],[7,48],[63,44]];
  const SMALL_MOBILE = [[50,5],[94,28],[93,60],[49,94],[7,65],[6,31]];

  // Older history remains as small traces distributed through negative space, not on rings.
  const TINY_DESKTOP = [
    [37,8],[61,8],[91,17],[94,35],[94,58],[89,82],[64,92],[37,93],[11,84],[6,63],[6,38],[11,17],
    [41,27],[59,27],[78,34],[79,64],[59,72],[41,72],[22,64],[21,35],[34,14],[66,14],[87,48],[13,49],
    [47,20],[53,80],[31,89],[70,88],[8,74],[92,73],[27,11],[74,10],[89,27],[90,65],[12,28],[10,67]
  ];
  const TINY_MOBILE = [
    [10,10],[29,8],[71,8],[90,10],[6,27],[94,28],[6,72],[94,73],[11,91],[31,93],[69,93],[89,91],
    [18,20],[82,20],[12,40],[88,40],[12,60],[88,60],[18,80],[82,80],[39,8],[61,8],[39,92],[61,92],
    [7,50],[93,50],[31,23],[69,23],[31,77],[69,77],[20,12],[80,12],[20,88],[80,88],[50,8],[50,92]
  ];

  // Distinct anatomical targets on the hologram. No connection converges on the centre.
  // Calibrated to the uploaded 1024 × 1536 masters and CSS registration.
  const FRONT_ANCHORS = [
    [.30,.23],[.50,.14],[.69,.24],[.73,.36],[.61,.56],[.27,.43],
    [.36,.31],[.64,.31],[.43,.23],[.57,.23],[.34,.38],[.66,.38],
    [.39,.53],[.61,.53],[.46,.46],[.53,.69],[.28,.35],[.72,.35]
  ];
  const PROFILE_ANCHORS = [
    [.23,.24],[.47,.15],[.71,.23],[.76,.34],[.64,.54],[.40,.40],
    [.32,.30],[.53,.25],[.65,.29],[.37,.22],[.43,.35],[.56,.39],
    [.55,.48],[.42,.58],[.47,.68],[.36,.50],[.78,.44],[.24,.31]
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  async function copyDiagramLink() {
    const href = buildDiagramLink(activeCategory, activeDiagram);
    if (!href || !detailCopyLinkBtn) return;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(href);
        copied = true;
      }
    } catch (_) {
      // Use the editable fallback below when clipboard permissions are unavailable.
    }
    if (!copied) {
      const field = document.createElement('textarea');
      field.value = href;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      field.remove();
    }
    const label = detailCopyLinkBtn.textContent;
    detailCopyLinkBtn.textContent = copied ? 'LINK COPIED' : 'COPY FAILED';
    window.setTimeout(() => { detailCopyLinkBtn.textContent = label; }, 1800);
  }

  function openDiagramFromLink() {
    const match = findDiagramFromLink(catalog, readDiagramLink());
    if (!match) return false;
    const { category, diagram, index } = match;
    activeCategory = category;
    activeDiagram = diagram;
    activeDiagramIndex = index;
    mode = 'diagrams';
    depth = targetDepth = 0;
    selectedIndex = null;
    lastHudStage = -1;
    setHeadPerspective('diagrams');
    diagramSearch.setItems(searchableDiagrams());
    buildNodes();
    mode = 'detail';
    showDetail(index);
    return true;
  }

  function openDiagramSelection(selection) {
    if (!selection) return;
    const category = selection.category || activeCategory;
    const diagram = selection.diagram || selection;
    const index = Number.isInteger(selection.index)
      ? selection.index
      : category?.images?.indexOf(diagram);
    if (!category || !diagram || index < 0) return;
    activeCategory = category;
    activeDiagram = diagram;
    activeDiagramIndex = index;
    mode = 'diagrams';
    depth = targetDepth = 0;
    selectedIndex = null;
    lastHudStage = -1;
    setHeadPerspective('diagrams');
    buildNodes();
    mode = 'detail';
    showDetail(index);
  }

  function searchableDiagrams() {
    return (catalog?.collections || []).flatMap(category =>
      (category.images || []).map((diagram, index) => ({ category, diagram, index }))
    );
  }

  function currentItems() {
    if (!catalog) return [];
    if (mode === 'categories') return catalog.collections;
    if (mode === 'diagrams' && activeCategory) return activeCategory.images || [];
    return [];
  }

  function chunkCount() {
    return Math.max(1, Math.ceil(currentItems().length / CHUNK));
  }

  function maxDepth() {
    return Math.max(0, chunkCount() - 1);
  }

  function chunkSize(stageIndex) {
    const items = currentItems();
    const start = stageIndex * CHUNK;
    return Math.max(0, Math.min(CHUNK, items.length - start));
  }

  function largeSlot(localIndex, totalInChunk) {
    const source = window.innerWidth <= 760 ? LARGE_MOBILE : LARGE_DESKTOP;
    if (totalInChunk >= 6) return source[localIndex];
    const picks = {
      1: [3],
      2: [0, 3],
      3: [0, 2, 4],
      4: [0, 1, 3, 4],
      5: [0, 1, 2, 3, 4]
    }[totalInChunk] || [0,1,2,3,4,5];
    return source[picks[localIndex]];
  }

  function smallSlot(localIndex) {
    const source = window.innerWidth <= 760 ? SMALL_MOBILE : SMALL_DESKTOP;
    return source[localIndex % source.length];
  }

  function tinySlot(index) {
    const source = window.innerWidth <= 760 ? TINY_MOBILE : TINY_DESKTOP;
    // A multiplicative stride avoids consecutive items clustering in adjacent slots.
    return source[(index * 11 + 7) % source.length];
  }

  function largeGeometry(index, stageIndex) {
    const local = index - stageIndex * CHUNK;
    const total = chunkSize(stageIndex);
    const [x, y, w, h] = largeSlot(local, total);
    return { x, y, w, h, opacity: 1, label: 1, role: 'large' };
  }

  function keyframe(index, stageIndex) {
    const itemChunk = Math.floor(index / CHUNK);
    const mobile = window.innerWidth <= 760;

    if (itemChunk === stageIndex) {
      return largeGeometry(index, stageIndex);
    }

    if (itemChunk === stageIndex - 1) {
      const [x, y] = smallSlot(index % CHUNK);
      return {
        x, y,
        w: mobile ? 13.5 : 7.5,
        h: mobile ? 8.0 : 5.5,
        opacity: .72,
        label: 0,
        role: 'small'
      };
    }

    if (itemChunk < stageIndex - 1) {
      const [x, y] = tinySlot(index);
      return {
        x, y,
        w: mobile ? 7.1 : 3.6,
        h: mobile ? 4.4 : 2.7,
        opacity: .34,
        label: 0,
        role: 'tiny'
      };
    }

    if (itemChunk === stageIndex + 1) {
      const target = largeGeometry(index, itemChunk);
      return {
        x: 50 + (target.x - 50) * .62,
        y: 50 + (target.y - 50) * .62,
        w: Math.max(.7, target.w * .12),
        h: Math.max(.7, target.h * .12),
        opacity: 0,
        label: 0,
        role: 'incoming'
      };
    }

    const [x, y] = tinySlot(index);
    return { x, y, w: .5, h: .5, opacity: 0, label: 0, role: 'hidden' };
  }

  function interpolateGeometry(a, b, t) {
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      h: lerp(a.h, b.h, t),
      opacity: lerp(a.opacity, b.opacity, t),
      label: lerp(a.label, b.label, t),
      role: t < .5 ? a.role : b.role
    };
  }

  function borderRadius(index) {
    // Every chamber is a true ellipse; geometry below controls its 5:4 ratio.
    return '50%';
  }

  function ellipseGeometry(geometry) {
    const axisRatio = 5 / 4;
    const stageRect = stage.getBoundingClientRect();
    // Geometry is stored as percentages, but width and height percentages
    // resolve against different pixel dimensions. Correct for that aspect ratio.
    const percentageRatio = stageRect.width && stageRect.height
      ? axisRatio * stageRect.height / stageRect.width
      : axisRatio;
    const area = Math.max(.12, geometry.w * geometry.h);
    const w = Math.sqrt(area * percentageRatio);
    const h = Math.sqrt(area / percentageRatio);
    return { ...geometry, w, h };
  }

  function nodeCode(item, index) {
    if (mode === 'categories') return `FIELD ${String(index + 1).padStart(2, '0')}`;
    const cat = categoryDisplayCode();
    return `PLATE ${cat}.${String(index + 1).padStart(2, '0')}`;
  }

  // Display positions are separate from permanent content IDs used in links.
  function categoryDisplayCode() {
    return String((catalog?.collections.indexOf(activeCategory) ?? -1) + 1).padStart(2, '0');
  }

  function nodeTitle(item, index) {
    return safeText(item?.title, mode === 'categories' ? `Field ${index + 1}` : `Diagram ${index + 1}`);
  }

  function sourceRecord(item) {
    if (!item) return null;
    return mode === 'categories' ? item.cover : item;
  }

  function ensureNodeImage(node, item, geometry) {
    const media = node.querySelector('.node__media');
    if (!media || geometry.opacity < .02) return;
    const record = sourceRecord(item);
    if (!record) return;

    let img = media.querySelector('img');
    if (!img) {
      const placeholder = media.querySelector('.node__placeholder');
      if (placeholder) placeholder.remove();
      img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      media.appendChild(img);
    }
    if (!img.dataset.atlasEvents) {
      img.dataset.atlasEvents = '1';
      img.addEventListener('load', () => media.classList.remove('is-loading', 'is-error'));
      img.addEventListener('error', () => { media.classList.remove('is-loading'); media.classList.add('is-error'); img.removeAttribute('src'); });
    }
    img.loading = geometry.w >= 12 ? 'eager' : 'lazy';
    loadSizedImage(img, record, stage.clientWidth * geometry.w / 100,
      stage.clientHeight * geometry.h / 100, window.devicePixelRatio);
    // Node resolution upgrades happen continuously during semantic scrolling;
    // keep the existing bitmap visible instead of flashing a loading spinner.
    media.classList.remove('is-loading');
    if (img.complete && img.naturalWidth > 0) media.classList.remove('is-error');
  }

  function buildNodes() {
    nodesEl.hidden = false;
    detailEl.hidden = true;
    root.classList.remove('is-detail');
    emptyEl.hidden = currentItems().length > 0;
    emptyEl.textContent = mode === 'diagrams' ? 'No diagrams in this category yet.' : 'No categories published yet.';
    nodeMap.clear();
    const fragment = document.createDocumentFragment();

    currentItems().forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'atlas-node';
      button.dataset.index = String(index);
      button.style.borderRadius = borderRadius(index);
      button.setAttribute('aria-label', `${nodeCode(item,index)} ${nodeTitle(item,index)}`);

      const media = document.createElement('span');
      media.className = 'node__media';
      const placeholder = document.createElement('span');
      placeholder.className = 'node__placeholder';
      media.appendChild(placeholder);

      const label = document.createElement('span');
      label.className = 'node__label';
      const code = document.createElement('span');
      code.className = 'node__code';
      code.textContent = nodeCode(item,index);
      const title = document.createElement('span');
      title.className = 'node__title';
      title.textContent = nodeTitle(item,index);
      label.append(code,title);
      button.append(media,label);

      if (!isTouch) {
        button.addEventListener('mouseenter', () => {
          selectedIndex = index;
          resetWheelIntent();
          button.classList.add('is-selected');
        });
        button.addEventListener('mouseleave', () => {
          if (selectedIndex === index) selectedIndex = null;
          resetWheelIntent();
          button.classList.remove('is-selected');
        });
      }
      button.addEventListener('click', () => activate(index, button));
      nodeMap.set(index, { node: button, item });
      fragment.appendChild(button);
    });

    nodesEl.replaceChildren(fragment);
    depth = targetDepth = clamp(targetDepth, 0, maxDepth());
    applyScene(true);
  }

  function applyScene(force = false) {
    if (!catalog || mode === 'detail') return;
    const max = maxDepth();
    depth = clamp(depth, 0, max);
    targetDepth = clamp(targetDepth, 0, max);
    const lower = Math.floor(depth);
    const upper = Math.min(max, lower + 1);
    const t = upper === lower ? 0 : depth - lower;

    nodeMap.forEach(({ node, item }, index) => {
      const a = keyframe(index, lower);
      const b = keyframe(index, upper);
      const g = ellipseGeometry(interpolateGeometry(a, b, t));
      node._atlasGeometry = g;
      node.style.left = `${g.x}%`;
      node.style.top = `${g.y}%`;
      node.style.width = `${g.w}%`;
      node.style.height = `${g.h}%`;
      node.style.opacity = String(g.opacity);
      node.style.setProperty('--label-opacity', String(clamp(g.label * 1.15, 0, 1)));
      node.classList.toggle('label-above', g.y + g.h / 2 > 78 || g.y < 35);
      node.classList.toggle('label-side', g.y < 35 && g.x >= 38 && g.x <= 62);
      node.classList.toggle('label-left', g.x < 16);
      node.classList.toggle('label-right', g.x > 84);
      node.style.pointerEvents = g.opacity > .08 && g.w > 1 ? 'auto' : 'none';
      node.dataset.role = g.role;
      node.tabIndex = g.opacity > .08 && g.w > 1 ? 0 : -1;
      if (selectedIndex === index) node.classList.add('is-selected');
      else if (isTouch) node.classList.remove('is-selected');
      ensureNodeImage(node, item, g);
    });

    updateHUD(force);
    drawConnections();
  }

  function meterPosition(value, max = maxDepth()) {
    const span = Math.max(1, max + METER_OVERSHOOT * 2);
    return clamp((value + METER_OVERSHOOT) / span, 0, 1);
  }

  function updateMeters() {
    const max = maxDepth();
    const progress = meterPosition(depth, max) * 100;
    const handle = meterPosition(targetDepth, max) * 100;
    meters.forEach(meter => {
      meter.style.setProperty('--meter-progress', `${progress}%`);
      meter.style.setProperty('--meter-handle', `${handle}%`);
      meter.setAttribute('aria-valuemax', String(max));
      meter.setAttribute('aria-valuenow', targetDepth.toFixed(2));
    });
  }

  function setDepthFromMeter(event, meter) {
    if (mode === 'detail') return;
    const track = meter.querySelector('.atlas__meter-track');
    const rect = track.getBoundingClientRect();
    const ratio = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    const max = maxDepth();
    const raw = ratio * Math.max(1, max + METER_OVERSHOOT * 2) - METER_OVERSHOOT;
    targetDepth = clamp(raw, 0, max);
    scheduleAnimation();
    updateMeters();
  }

  meters.forEach(meter => {
    meter.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      meterDragging = true;
      try { meter.setPointerCapture?.(event.pointerId); } catch (_) { /* Synthetic events may not have an active pointer. */ }
      setDepthFromMeter(event, meter);
      event.preventDefault();
      event.stopPropagation();
    });
    meter.addEventListener('pointermove', event => {
      if (!meterDragging) return;
      setDepthFromMeter(event, meter);
      event.preventDefault();
      event.stopPropagation();
    });
    const stopDragging = event => {
      meterDragging = false;
      try { meter.releasePointerCapture?.(event.pointerId); } catch (_) { /* Pointer capture may already be released. */ }
      event.stopPropagation();
    };
    meter.addEventListener('pointerup', stopDragging);
    meter.addEventListener('pointercancel', stopDragging);
    meter.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      if (event.key === 'Home') targetDepth = 0;
      else if (event.key === 'End') targetDepth = maxDepth();
      else targetDepth = clamp(targetDepth + (event.key === 'ArrowUp' ? .1 : -.1), 0, maxDepth());
      scheduleAnimation();
    });
  });

  function dominantStage() {
    return clamp(Math.round(depth), 0, maxDepth());
  }

  function updateHUD(force = false) {
    if (mode === 'detail') return;
    const stageIndex = dominantStage();
    const chunkStart = stageIndex * CHUNK + 1;
    const chunkEnd = Math.min(currentItems().length, chunkStart + CHUNK - 1);

    if (force || stageIndex !== lastHudStage) {
      lastHudStage = stageIndex;
      if (mode === 'categories') {
        contextEl.textContent = `Human Consciousness · Fields ${String(chunkStart).padStart(2,'0')}–${String(chunkEnd).padStart(2,'0')}`;
        instructionEl.textContent = isTouch
          ? 'SWIPE ↑ / PINCH TOGETHER FOR MORE · TAP TWICE TO ENTER'
          : 'SCROLL ↓ TO EXPAND · HOVER + SCROLL ↑ OR CLICK TO ENTER';
        backBtn.hidden = true;
      } else {
        contextEl.textContent = `${safeText(activeCategory?.title,'Category')} · Plates ${String(chunkStart).padStart(2,'0')}–${String(chunkEnd).padStart(2,'0')}`;
        instructionEl.textContent = isTouch
          ? 'SWIPE ↑ FOR MORE · SWIPE ↓ TO RETURN · AT DEPTH 1, SWIPE ↓ AGAIN TO EXIT'
          : 'SCROLL ↓ FOR MORE · ↑ TO RETURN · AT DEPTH 1, KEEP SCROLLING ↑ OFF A DIAGRAM TO EXIT';
        backBtn.hidden = false;
      }
    }
    depthEl.textContent = `DEPTH ${(depth + 1).toFixed(2)}`;
    updateMeters();
  }

  // Null entries intentionally show the artwork slots, without broken image requests.
  async function loadHeadArtwork() {
    try {
      const response = await fetch('assets/artwork/manifest.json');
      if (!response.ok) return;
      const artwork = await response.json();
      for (const [key, container] of [['front', headFront], ['threeQuarter', headThreeQuarter], ['profile', headProfile]]) {
        const filename = artwork[key];
        if (typeof filename !== 'string' || !/^[a-z0-9-]+\.(png|webp)$/i.test(filename)) continue;
        const img = container.querySelector('img');
        img.addEventListener('load', () => {
          img.hidden = false;
          container.classList.add('is-ready');
          drawConnections();
        }, { once: true });
        img.decoding = 'async';
        img.fetchPriority = key === 'front' ? 'high' : 'low';
        img.src = `assets/artwork/${filename}`;
      }
    } catch (_) {
      // Keep the explicit artwork placeholder if the manifest is unavailable.
    }
  }

  function finishHeadTurn() {
    headTurnId++;
    headAnimations.forEach(animation => animation.cancel());
    headAnimations = [];
    headTurning = false;
    root.classList.remove('is-turning');
    nodesEl.inert = false;
    const target = head.dataset.pose === 'profile' ? headProfile : headFront;
    [headFront, headThreeQuarter, headProfile].forEach(view => { view.hidden = view !== target; });
    drawConnections();
  }

  function setHeadPerspective(nextMode) {
    const from = head.dataset.pose === 'profile' ? headProfile : headFront;
    const to = nextMode === 'categories' ? headFront : headProfile;
    finishHeadTurn();
    head.dataset.pose = to === headFront ? 'front' : 'profile';
    head.classList.toggle('is-profile', to === headProfile);
    if (to === headProfile) {
      mirroredHead = Math.max(0, catalog.collections.indexOf(activeCategory)) % 2 === 1;
    }
    head.style.setProperty('--head-direction', mirroredHead ? '-1' : '1');
    head.style.translate = '0px 0px';
    const views = [headFront, headThreeQuarter, headProfile];
    if (from === to || prefersReducedMotion || !views.every(view => view.classList.contains('is-ready'))) {
      views.forEach(view => { view.hidden = view !== to; });
      return;
    }

    headTurning = true;
    nodesEl.inert = true;
    root.classList.add('is-turning');
    connections.replaceChildren();
    views.forEach(view => { view.hidden = false; });
    const turnId = headTurnId;
    const timing = { duration: 820, fill: 'both', easing: 'linear' };
    // Short overlaps minimize double faces; the middle pose holds briefly.
    headAnimations = [
      from.animate([{opacity:1,offset:0},{opacity:1,offset:.12},{opacity:0,offset:.35},{opacity:0,offset:1}], timing),
      headThreeQuarter.animate([{opacity:0,offset:0},{opacity:0,offset:.17},{opacity:1,offset:.38},{opacity:1,offset:.56},{opacity:0,offset:.79},{opacity:0,offset:1}], timing),
      to.animate([{opacity:0,offset:0},{opacity:0,offset:.61},{opacity:1,offset:.85},{opacity:1,offset:1}], timing),
      nodesEl.animate([{opacity:0,transform:'scale(1.04)',offset:0},{opacity:0,transform:'scale(1.04)',offset:.42},{opacity:1,transform:'scale(1)',offset:1}], timing)
    ];
    Promise.all(headAnimations.map(animation => animation.finished)).then(() => {
      if (turnId === headTurnId) finishHeadTurn();
    }).catch(() => { /* A back/detail action or motion preference change cancelled the turn. */ });
  }

  function activate(index, element) {
    if (performance.now() < suppressClickUntil || headTurning) return;
    if (isTouch && selectedIndex !== index) {
      selectedIndex = index;
      enterIntent = 0;
      nodeMap.forEach(({node}, i) => node.classList.toggle('is-selected', i === index));
      return;
    }
    enter(index);
  }

  function enter(index) {
    if (headTurning) return;
    const item = currentItems()[index];
    if (!item) return;
    resetWheelIntent();
    clearTouchGesture();

    if (mode === 'categories') {
      activeCategory = item;
      mode = 'diagrams';
      selectedIndex = null;
      depth = targetDepth = 0;
      lastHudStage = -1;
      setHeadPerspective('diagrams');
      diagramSearch.setItems(searchableDiagrams());
      buildNodes();
      return;
    }

    if (mode === 'diagrams') {
      activeDiagram = item;
      activeDiagramIndex = index;
      selectedIndex = null;
      mode = 'detail';
      showDetail(index);
    }
  }

  function showDetail(index) {
    finishHeadTurn();
    root.classList.add('is-detail');
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    nodesEl.hidden = true;
    detailEl.hidden = false;
    connections.replaceChildren();
    const catId = categoryDisplayCode();
    detailCode.textContent = `DIAGRAM ${catId}.${String(index + 1).padStart(2,'0')}`;
    detailTitle.textContent = nodeTitle(activeDiagram, index);
    detailCaption.textContent = safeText(activeDiagram?.caption, safeText(activeCategory?.description, ''));
    updateDetailImage();
    detailImage.alt = nodeTitle(activeDiagram,index);
    contextEl.textContent = `${safeText(activeCategory?.title,'Category')} · ${nodeTitle(activeDiagram,index)}`;
    depthEl.textContent = 'DETAIL';
    instructionEl.textContent = 'DOUBLE CLICK IMAGE OR FULL SCREEN FOR ORIGINAL · BACK TO RETURN';
    backBtn.hidden = false;
    const href = buildDiagramLink(activeCategory, activeDiagram);
    if (href) window.history.replaceState(null, '', href);
  }

  function updateDetailImage() {
    const visual = detailImage.parentElement;
    visual.classList.add('is-loading');
    visual.classList.remove('is-error');
    loadSizedImage(detailImage, activeDiagram, visual.clientWidth, visual.clientHeight, window.devicePixelRatio);
  }

  function openFullscreen() {
    if (!activeDiagram || fullscreenClosing) return;
    const src = activeDiagram.original || activeDiagram.large || activeDiagram.thumb || '';
    if (!src) return;
    fullscreenImage.src = src;
    fullscreenEl.classList.add('is-loading');
    fullscreenEl.classList.remove('is-error');
    fullscreenImage.alt = nodeTitle(activeDiagram, activeDiagramIndex);
    fullscreenEl.hidden = false;
    fullscreenEl.classList.remove('is-closing');
    document.body.classList.add('atlas-fullscreen-open');
    requestAnimationFrame(() => {
      fullscreenEl.classList.add('is-open');
      fullscreenClose.focus();
    });
  }

  function closeFullscreen() {
    if (fullscreenEl.hidden || fullscreenClosing) return;
    fullscreenClosing = true;
    fullscreenEl.classList.remove('is-open');
    fullscreenEl.classList.add('is-closing');
    document.body.classList.remove('atlas-fullscreen-open');
    window.setTimeout(() => {
      fullscreenEl.hidden = true;
      fullscreenEl.classList.remove('is-closing');
      fullscreenImage.removeAttribute('src');
      fullscreenEl.classList.remove('is-loading', 'is-error');
      fullscreenClosing = false;
      detailFullscreenBtn.focus();
    }, 680);
  }

  function back() {
    resetWheelIntent();
    clearTouchGesture();
    if (!fullscreenEl.hidden) {
      closeFullscreen();
      return;
    }
    if (mode === 'detail') {
      clearDiagramLink();
      diagramSearch.setItems(searchableDiagrams());
      mode = 'diagrams';
      activeDiagram = null;
      activeDiagramIndex = -1;
      lastHudStage = -1;
      buildNodes();
      return;
    }
    if (mode === 'diagrams') {
      clearDiagramLink();
      diagramSearch.setItems(searchableDiagrams());
      mode = 'categories';
      activeCategory = null;
      selectedIndex = null;
      depth = targetDepth = 0;
      lastHudStage = -1;
      setHeadPerspective('categories');
      buildNodes();
    }
  }

  function goHome() {
    resetWheelIntent();
    clearTouchGesture();
    if (!fullscreenEl.hidden) closeFullscreen();
    clearDiagramLink();
    mode = 'categories';
    activeCategory = null;
    activeDiagram = null;
    activeDiagramIndex = -1;
    selectedIndex = null;
    depth = targetDepth = 0;
    lastHudStage = -1;
    diagramSearch.setItems(searchableDiagrams());
    setHeadPerspective('categories');
    buildNodes();
    stage.focus({ preventScroll: true });
  }

  function scheduleAnimation() {
    if (animationFrame) return;
    const tick = () => {
      const diff = targetDepth - depth;
      if (Math.abs(diff) < .001 || prefersReducedMotion) {
        depth = targetDepth;
        applyScene();
        animationFrame = 0;
        return;
      }
      depth += diff * .16;
      applyScene();
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
  }

  function adjustDepth(delta) {
    if (mode === 'detail') return;
    const next = clamp(targetDepth + delta, 0, maxDepth());
    if (next === targetDepth) return;
    targetDepth = next;
    scheduleAnimation();
  }

  function resetWheelIntent() {
    enterIntent = 0;
    backIntent = 0;
    lastWheelTime = 0;
    wheelContext = '';
  }

  function atDiagramBase() {
    return mode === 'diagrams' && targetDepth === 0 && depth < .001;
  }

  function normalizeWheelDelta(event) {
    const multiplier = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? window.innerHeight : 1;
    return event.deltaY * multiplier;
  }

  function onWheel(event) {
    if (event.ctrlKey) { resetWheelIntent(); return; }
    event.preventDefault();
    if (headTurning || mode === 'detail') { resetWheelIntent(); return; }
    const wheelDelta = normalizeWheelDelta(event);
    if (!wheelDelta) return;

    // Wheel-down has exactly one job, including at the first/last generation.
    if (wheelDelta > 0) {
      resetWheelIntent();
      adjustDepth(wheelDelta * ATLAS_TUNING.wheelSensitivity);
      return;
    }

    // Use the actual event target: a stale hover must not enter a node behind the head.
    const hoveredNode = event.target.closest?.('.atlas-node');
    const hoveredIndex = hoveredNode && nodesEl.contains(hoveredNode)
      ? Number(hoveredNode.dataset.index) : null;
    const context = hoveredIndex !== null ? `enter:${hoveredIndex}` : atDiagramBase() ? 'back' : 'depth';
    const now = performance.now();
    if (context !== wheelContext || now - lastWheelTime > ATLAS_TUNING.intentIdleMs) resetWheelIntent();
    wheelContext = context;
    lastWheelTime = now;

    if (hoveredIndex !== null) {
      enterIntent += Math.abs(wheelDelta);
      if (enterIntent >= ATLAS_TUNING.enterScrollThreshold) {
        enter(hoveredIndex);
      }
      return;
    }

    if (atDiagramBase()) {
      backIntent += Math.abs(wheelDelta);
      if (backIntent >= ATLAS_TUNING.backScrollThreshold) back();
      return;
    }

    // Arrival at the base only changes depth. Overshoot and easing frames never
    // count toward exit; further wheel-up must build a fresh back intent.
    resetWheelIntent();
    adjustDepth(wheelDelta * ATLAS_TUNING.wheelSensitivity);
  }

  function ellipseEdgePoint(cx, cy, rx, ry, tx, ty) {
    const dx = tx - cx;
    const dy = ty - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    const denom = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    if (!Number.isFinite(denom) || denom === 0) return { x: cx, y: cy };
    return { x: cx + dx / denom, y: cy + dy / denom };
  }

  function drawConnections() {
    connections.replaceChildren();
    if (mode === 'detail' || nodesEl.hidden || headTurning) return;
    const activeHead = mode === 'categories' ? headFront : headProfile;
    if (!activeHead.classList.contains('is-ready')) return;

    const stageRect = stage.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height || !headRect.width || !headRect.height) return;

    connections.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`);
    connections.setAttribute('width', stageRect.width);
    connections.setAttribute('height', stageRect.height);

    const anchors = mode === 'categories' ? FRONT_ANCHORS : PROFILE_ANCHORS;
    nodeMap.forEach(({ node }, index) => {
      const g = node._atlasGeometry;
      if (!g || g.opacity < .12 || g.w < 1.2) return;

      const anchor = anchors[index % anchors.length];
      let ax = headRect.left - stageRect.left + headRect.width * anchor[0];
      const ay = headRect.top - stageRect.top + headRect.height * anchor[1];
      if (mode === 'diagrams' && mirroredHead) {
        ax = headRect.left - stageRect.left + headRect.width * (1 - anchor[0]);
      }

      const cx = stageRect.width * g.x / 100;
      const cy = stageRect.height * g.y / 100;
      const rx = Math.max(5, stageRect.width * g.w / 200);
      const ry = Math.max(4, stageRect.height * g.h / 200);
      const start = ellipseEdgePoint(cx, cy, rx, ry, ax, ay);
      const dx = ax - start.x;
      const dy = ay - start.y;
      const distance = Math.hypot(dx, dy) || 1;
      const bend = Math.min(34, distance * .10) * (index % 2 ? 1 : -1);
      const nx = -dy / distance;
      const ny = dx / distance;
      const mx = (start.x + ax) / 2 + nx * bend;
      const my = (start.y + ay) / 2 + ny * bend;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)}`);
      const weight = g.w >= 12 ? .82 : g.w >= 5 ? .38 : .14;
      path.setAttribute('opacity', String(clamp(g.opacity * weight, .05, .9)));
      connections.appendChild(path);

      if (g.w >= 5) {
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', ax.toFixed(1));
        point.setAttribute('cy', ay.toFixed(1));
        point.setAttribute('r', g.w >= 12 ? '1.8' : '1.2');
        point.setAttribute('opacity', String(clamp(g.opacity * .85, .18, .9)));
        connections.appendChild(point);
      }
    });
  }

  stage.addEventListener('wheel', onWheel, { passive: false });
  backBtn.addEventListener('click', back);
  brandBtn.addEventListener('click', goHome);
  detailFullscreenBtn.addEventListener('click', openFullscreen);
  detailFullscreenBtn.addEventListener('dblclick', openFullscreen);
  detailImage.addEventListener('dblclick', openFullscreen);
  detailImage.addEventListener('load', () => detailImage.parentElement.classList.remove('is-loading', 'is-error'));
  detailImage.addEventListener('error', () => { detailImage.parentElement.classList.remove('is-loading'); detailImage.parentElement.classList.add('is-error'); detailImage.removeAttribute('src'); });
  fullscreenImage.addEventListener('load', () => fullscreenEl.classList.remove('is-loading', 'is-error'));
  fullscreenImage.addEventListener('error', () => { fullscreenEl.classList.remove('is-loading'); fullscreenEl.classList.add('is-error'); fullscreenImage.removeAttribute('src'); });
  detailCopyLinkBtn.addEventListener('click', copyDiagramLink);
  fullscreenClose.addEventListener('click', closeFullscreen);
  fullscreenEl.addEventListener('click', event => {
    if (event.target === fullscreenEl) closeFullscreen();
  });

  window.addEventListener('resize', () => {
    if (mode === 'detail') updateDetailImage();
    applyScene(true);
  });

  stage.addEventListener('keydown', event => {
    resetWheelIntent();
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      back();
    } else if (event.key === 'ArrowDown' && !headTurning) {
      event.preventDefault();
      targetDepth = clamp(Math.ceil(targetDepth + .01), 0, maxDepth());
      scheduleAnimation();
    } else if (event.key === 'ArrowUp' && !headTurning) {
      event.preventDefault();
      if (selectedIndex !== null) enter(selectedIndex);
      else {
        targetDepth = clamp(Math.floor(targetDepth - .01), 0, maxDepth());
        scheduleAnimation();
      }
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !fullscreenEl.hidden) {
      event.preventDefault();
      closeFullscreen();
    }
  });

  function clearTouchGesture() {
    touchPoints.clear();
    touchStartY = touchStartX = null;
    touchStartedAtBase = false;
    pinchStartDistance = pinchStartDepth = null;
  }

  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' || headTurning || mode === 'detail') return;
    resetWheelIntent();
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size >= 2) {
      const points = [...touchPoints.values()];
      pinchStartDistance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      pinchStartDepth = targetDepth;
      touchStartY = null;
      touchMoved = true;
      suppressClickUntil = performance.now() + 400;
      event.preventDefault();
      return;
    }
    touchStartY = event.clientY;
    touchStartX = event.clientX;
    touchStartedAtBase = atDiagramBase();
    touchMoved = false;
  });

  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' || !touchPoints.has(event.pointerId)) return;
    if (headTurning || mode === 'detail') { clearTouchGesture(); return; }
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size >= 2 && pinchStartDistance !== null && pinchStartDepth !== null) {
      const points = [...touchPoints.values()];
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      const pinchDelta = (pinchStartDistance - distance) * ATLAS_TUNING.pinchSensitivity;
      targetDepth = clamp(pinchStartDepth + pinchDelta, 0, maxDepth());
      suppressClickUntil = performance.now() + 400;
      scheduleAnimation();
      event.preventDefault();
      return;
    }
    if (touchStartY !== null && Math.abs(event.clientY - touchStartY) > 12) {
      touchMoved = true;
      suppressClickUntil = performance.now() + 400;
    }
  });

  stage.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' || !touchPoints.has(event.pointerId)) return;
    touchPoints.delete(event.pointerId);
    if (touchMoved) suppressClickUntil = performance.now() + 400;
    if (touchPoints.size < 2) {
      pinchStartDistance = null;
      pinchStartDepth = null;
    }
    if (touchStartY === null) return;
    const dy = event.clientY - touchStartY;
    const dx = event.clientX - touchStartX;
    touchStartY = null;
    if (headTurning || mode === 'detail' || !touchMoved || Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < ATLAS_TUNING.swipeDistance) return;
    if (dy < 0) {
      targetDepth = clamp(Math.floor(targetDepth + 1.01), 0, maxDepth());
    } else {
      if (touchStartedAtBase && atDiagramBase() && dy >= ATLAS_TUNING.backSwipeDistance) {
        back();
        return;
      }
      targetDepth = clamp(Math.ceil(targetDepth - 1.01), 0, maxDepth());
    }
    scheduleAnimation();
  });

  stage.addEventListener('pointercancel', event => {
    if (event.pointerType !== 'touch') return;
    if (touchMoved) suppressClickUntil = performance.now() + 400;
    clearTouchGesture();
  });

  let parallaxFrame = 0;
  stage.addEventListener('pointermove', event => {
    if (isTouch || prefersReducedMotion || headTurning || mode === 'detail' || parallaxFrame) return;
    const x = event.clientX;
    const y = event.clientY;
    parallaxFrame = requestAnimationFrame(() => {
      parallaxFrame = 0;
      if (prefersReducedMotion || headTurning || mode === 'detail') return;
      const rect = stage.getBoundingClientRect();
      head.style.translate = `${((x - rect.left) / rect.width - .5) * 6}px ${((y - rect.top) / rect.height - .5) * 4}px`;
      drawConnections();
    });
  });
  stage.addEventListener('pointerleave', () => {
    resetWheelIntent();
    cancelAnimationFrame(parallaxFrame);
    parallaxFrame = 0;
    head.style.translate = '0px 0px';
    drawConnections();
  });
  motionPreference.addEventListener('change', event => {
    prefersReducedMotion = event.matches;
    if (prefersReducedMotion) {
      finishHeadTurn();
      head.style.translate = '0px 0px';
      drawConnections();
    }
  });

  loadHeadArtwork();
  loadCatalog(emptyEl).then(loadedCatalog => {
    catalog = loadedCatalog;
    diagramSearch.setItems(searchableDiagrams());
    setHeadPerspective('categories');
    buildNodes();
    openDiagramFromLink();
  }).catch(error => {
    emptyEl.textContent = 'The atlas could not be loaded. Please try refreshing the page.';
    emptyEl.hidden = false;
    console.error(error);
  });
})();
