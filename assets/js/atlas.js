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
  const head = document.getElementById('atlas-head');
  const headFront = document.getElementById('head-front');
  const headProfile = document.getElementById('head-profile');
  const detailEl = document.getElementById('atlas-detail');
  const detailImage = document.getElementById('detail-image');
  const detailCode = document.getElementById('detail-code');
  const detailTitle = document.getElementById('detail-title');
  const detailCaption = document.getElementById('detail-caption');
  const detailFullscreenBtn = document.getElementById('detail-fullscreen-button');
  const fullscreenEl = document.getElementById('atlas-fullscreen');
  const fullscreenImage = document.getElementById('atlas-fullscreen-image');
  const fullscreenClose = document.getElementById('atlas-fullscreen-close');
  const emptyEl = document.getElementById('atlas-empty');

  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CHUNK = 6;
  const WHEEL_SENSITIVITY = 0.0025;
  const ENTER_SCROLL_THRESHOLD = 88;

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
  let touchMoved = false;
  let lastHudStage = -1;
  const nodeMap = new Map();

  // Active nodes deliberately differ in size and proportion, following Concept 03.
  const LARGE_DESKTOP = [
    [29, 19, 26, 18],
    [68, 18, 18, 20],
    [82, 46, 20, 25],
    [68, 78, 29, 16],
    [29, 79, 22, 20],
    [17, 49, 19, 22]
  ];
  const LARGE_MOBILE = [
    [50, 14, 48, 15],
    [22, 31, 37, 18],
    [78, 31, 35, 20],
    [22, 69, 36, 20],
    [78, 69, 39, 17],
    [50, 87, 50, 15]
  ];

  // The immediately previous six sit in the gaps between the new dominant chambers.
  const SMALL_DESKTOP = [[49,11],[82,28],[84,68],[50,90],[16,69],[15,29]];
  const SMALL_MOBILE = [[22,15],[78,15],[8,50],[92,50],[23,86],[77,86]];

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
  const FRONT_ANCHORS = [
    [.36,.23],[.61,.22],[.29,.34],[.70,.35],[.37,.46],[.62,.47],
    [.31,.57],[.68,.57],[.43,.31],[.55,.32],[.46,.41],[.59,.41],
    [.39,.63],[.61,.64],[.48,.53],[.53,.71],[.28,.44],[.72,.45]
  ];
  const PROFILE_ANCHORS = [
    [.34,.24],[.49,.20],[.65,.25],[.29,.35],[.45,.33],[.61,.34],
    [.72,.39],[.34,.47],[.50,.45],[.64,.47],[.43,.57],[.61,.57],
    [.70,.63],[.48,.68],[.58,.74],[.36,.61],[.77,.50],[.27,.43]
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function safeText(value, fallback = '') {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  function demoCatalog() {
    return {
      demo: true,
      collections: Array.from({ length: 16 }, (_, i) => ({
        id: String(i + 1).padStart(2, '0'),
        title: `Consciousness Field ${String(i + 1).padStart(2, '0')}`,
        description: '',
        cover: null,
        images: Array.from({ length: 18 }, (__, j) => ({
          id: `${String(i + 1).padStart(2, '0')}.${String(j + 1).padStart(2, '0')}`,
          title: `Diagram ${String(j + 1).padStart(2, '0')}`,
          caption: '',
          original: null,
          micro: null,
          thumb: null,
          large: null,
          width: 1600,
          height: 1000
        }))
      }))
    };
  }

  async function fetchCatalog(url) {
    const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.collections) || data.collections.length === 0) {
      throw new Error(`${url}: empty catalog`);
    }
    return data;
  }

  async function loadCatalog() {
    const sources = ['catalog.php', 'catalog.json'];
    for (const source of sources) {
      try {
        catalog = await fetchCatalog(source);
        emptyEl.hidden = true;
        return;
      } catch (_) {
        // Try the next independent catalog provider.
      }
    }
    catalog = demoCatalog();
    emptyEl.hidden = false;
  }

  function currentItems() {
    if (!catalog) return [];
    if (mode === 'categories') return catalog.collections.slice(0, 16);
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
    const variants = ['50% / 45%','46% / 52%','52% / 43%','48% / 50%','44% / 48%','53% / 46%'];
    return variants[index % variants.length];
  }

  function nodeCode(item, index) {
    if (mode === 'categories') return `FIELD ${safeText(item.id, String(index + 1).padStart(2, '0'))}`;
    const cat = safeText(activeCategory?.id, '00');
    return `PLATE ${cat}.${String(index + 1).padStart(2, '0')}`;
  }

  function nodeTitle(item, index) {
    return safeText(item?.title, mode === 'categories' ? `Field ${index + 1}` : `Diagram ${index + 1}`);
  }

  function sourceRecord(item) {
    if (!item) return null;
    return mode === 'categories' ? item.cover : item;
  }

  function sourceFor(item, resolution) {
    const record = sourceRecord(item);
    if (!record) return null;
    if (resolution === 'large') return record.large || record.thumb || record.original;
    if (resolution === 'thumb') return record.thumb || record.micro || record.large || record.original;
    return record.micro || record.thumb || record.large || record.original;
  }

  function desiredResolution(geometry) {
    if (geometry.w >= (window.innerWidth <= 760 ? 22 : 12)) return 'large';
    if (geometry.w >= (window.innerWidth <= 760 ? 9 : 5)) return 'thumb';
    return 'micro';
  }

  function ensureNodeImage(node, item, geometry) {
    const media = node.querySelector('.node__media');
    if (!media || geometry.opacity < .02) return;
    const resolution = desiredResolution(geometry);
    const src = sourceFor(item, resolution);
    if (!src) return;

    let img = media.querySelector('img');
    if (!img) {
      const placeholder = media.querySelector('.node__placeholder');
      if (placeholder) placeholder.remove();
      img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      media.appendChild(img);
    }
    if (img.dataset.source !== src) {
      img.dataset.source = src;
      img.loading = geometry.w >= 12 ? 'eager' : 'lazy';
      img.src = src;
    }
  }

  function buildNodes() {
    nodesEl.hidden = false;
    detailEl.hidden = true;
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
          enterIntent = 0;
          button.classList.add('is-selected');
        });
        button.addEventListener('mouseleave', () => {
          if (selectedIndex === index) selectedIndex = null;
          enterIntent = 0;
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
      const g = interpolateGeometry(a, b, t);
      node._atlasGeometry = g;
      node.style.left = `${g.x}%`;
      node.style.top = `${g.y}%`;
      node.style.width = `${g.w}%`;
      node.style.height = `${g.h}%`;
      node.style.opacity = String(g.opacity);
      node.style.setProperty('--label-opacity', String(clamp(g.label * 1.15, 0, 1)));
      node.style.pointerEvents = g.opacity > .08 && g.w > 1 ? 'auto' : 'none';
      node.dataset.role = g.role;
      if (selectedIndex === index) node.classList.add('is-selected');
      else if (isTouch) node.classList.remove('is-selected');
      ensureNodeImage(node, item, g);
    });

    updateHUD(force);
    drawConnections();
  }

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
          ? 'SWIPE ↑ TO EXPAND · TAP TO SELECT · TAP AGAIN TO ENTER'
          : 'SCROLL ↓ TO EXPAND · HOVER + SCROLL ↑ OR CLICK TO ENTER';
        backBtn.hidden = true;
      } else {
        contextEl.textContent = `${safeText(activeCategory?.title,'Category')} · Plates ${String(chunkStart).padStart(2,'0')}–${String(chunkEnd).padStart(2,'0')}`;
        instructionEl.textContent = isTouch
          ? 'SWIPE ↑ TO EXPAND · TAP TO SELECT · TAP AGAIN FOR DETAIL'
          : 'SCROLL ↓ TO EXPAND · HOVER + SCROLL ↑ OR CLICK FOR DETAIL';
        backBtn.hidden = false;
      }
    }
    depthEl.textContent = `DEPTH ${(depth + 1).toFixed(2)}`;
  }

  function setHeadPerspective(nextMode) {
    if (nextMode === 'categories') {
      head.classList.remove('is-profile');
      headFront.hidden = false;
      headProfile.hidden = true;
      headProfile.style.transform = '';
    } else {
      head.classList.add('is-profile');
      headFront.hidden = true;
      headProfile.hidden = false;
      const categoryIndex = Math.max(0, catalog.collections.indexOf(activeCategory));
      headProfile.style.transform = categoryIndex % 2 ? 'scaleX(-1)' : '';
    }
  }

  function activate(index, element) {
    if (isTouch && selectedIndex !== index) {
      selectedIndex = index;
      enterIntent = 0;
      nodeMap.forEach(({node}, i) => node.classList.toggle('is-selected', i === index));
      return;
    }
    enter(index);
  }

  function enter(index) {
    const item = currentItems()[index];
    if (!item) return;

    if (mode === 'categories') {
      activeCategory = item;
      mode = 'diagrams';
      selectedIndex = null;
      depth = targetDepth = 0;
      lastHudStage = -1;
      setHeadPerspective('diagrams');
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
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    nodesEl.hidden = true;
    detailEl.hidden = false;
    connections.replaceChildren();
    const catId = safeText(activeCategory?.id, '00');
    detailCode.textContent = `DIAGRAM ${catId}.${String(index + 1).padStart(2,'0')}`;
    detailTitle.textContent = nodeTitle(activeDiagram, index);
    detailCaption.textContent = safeText(activeDiagram?.caption, safeText(activeCategory?.description, ''));
    const src = activeDiagram?.original || activeDiagram?.large || activeDiagram?.thumb || '';
    detailImage.src = src;
    detailImage.alt = nodeTitle(activeDiagram,index);
    contextEl.textContent = `${safeText(activeCategory?.title,'Category')} · ${nodeTitle(activeDiagram,index)}`;
    depthEl.textContent = 'DETAIL';
    instructionEl.textContent = 'FULL SCREEN FOR THE ORIGINAL · BACK TO RETURN';
    backBtn.hidden = false;
  }

  function openFullscreen() {
    if (!activeDiagram) return;
    const src = activeDiagram.original || activeDiagram.large || activeDiagram.thumb || '';
    if (!src) return;
    fullscreenImage.src = src;
    fullscreenImage.alt = nodeTitle(activeDiagram, activeDiagramIndex);
    fullscreenEl.hidden = false;
    document.body.classList.add('atlas-fullscreen-open');
    fullscreenClose.focus();
  }

  function closeFullscreen() {
    if (fullscreenEl.hidden) return;
    fullscreenEl.hidden = true;
    fullscreenImage.removeAttribute('src');
    document.body.classList.remove('atlas-fullscreen-open');
    detailFullscreenBtn.focus();
  }

  function back() {
    if (!fullscreenEl.hidden) {
      closeFullscreen();
      return;
    }
    if (mode === 'detail') {
      mode = 'diagrams';
      activeDiagram = null;
      activeDiagramIndex = -1;
      lastHudStage = -1;
      buildNodes();
      return;
    }
    if (mode === 'diagrams') {
      mode = 'categories';
      activeCategory = null;
      selectedIndex = null;
      depth = targetDepth = 0;
      lastHudStage = -1;
      setHeadPerspective('categories');
      buildNodes();
    }
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

  function onWheel(event) {
    event.preventDefault();

    if (mode === 'detail') {
      if (event.deltaY > 65) back();
      return;
    }

    // Scrolling inward while pointing at a node enters that semantic object.
    if (!isTouch && event.deltaY < 0 && selectedIndex !== null) {
      enterIntent += Math.abs(event.deltaY);
      if (enterIntent >= ENTER_SCROLL_THRESHOLD) {
        const target = selectedIndex;
        enterIntent = 0;
        enter(target);
      }
      return;
    }

    enterIntent = 0;
    adjustDepth(event.deltaY * WHEEL_SENSITIVITY);
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
    if (mode === 'detail' || nodesEl.hidden) return;

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
      if (mode === 'diagrams' && headProfile.style.transform.includes('scaleX')) {
        ax = headRect.left - stageRect.left + headRect.width * (1 - anchor[0]);
      }

      const cx = stageRect.width * g.x / 100;
      const cy = stageRect.height * g.y / 100;
      const rx = Math.max(5, stageRect.width * g.w / 200 * .92);
      const ry = Math.max(4, stageRect.height * g.h / 200 * .92);
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
  detailFullscreenBtn.addEventListener('click', openFullscreen);
  fullscreenClose.addEventListener('click', closeFullscreen);
  fullscreenEl.addEventListener('click', event => {
    if (event.target === fullscreenEl) closeFullscreen();
  });

  window.addEventListener('resize', () => {
    applyScene(true);
  });

  stage.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      event.preventDefault();
      back();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      targetDepth = clamp(Math.ceil(targetDepth + .01), 0, maxDepth());
      scheduleAnimation();
    } else if (event.key === 'ArrowUp') {
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

  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    touchStartY = event.clientY;
    touchMoved = false;
  });

  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' && touchStartY !== null && Math.abs(event.clientY - touchStartY) > 12) {
      touchMoved = true;
    }
  });

  stage.addEventListener('pointerup', event => {
    if (event.pointerType !== 'touch' || touchStartY === null) return;
    const dy = event.clientY - touchStartY;
    touchStartY = null;
    if (!touchMoved || Math.abs(dy) < 48) return;
    if (dy < 0) {
      targetDepth = clamp(Math.floor(targetDepth + 1.01), 0, maxDepth());
    } else {
      targetDepth = clamp(Math.ceil(targetDepth - 1.01), 0, maxDepth());
    }
    scheduleAnimation();
  });

  loadCatalog().then(() => {
    setHeadPerspective('categories');
    buildNodes();
  });
})();
