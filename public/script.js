/* global konektadoCopy, konektadoSite */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const languageStorageKey = 'konektado-language';
  let language = 'taglish';
  try {
    const saved = localStorage.getItem(languageStorageKey);
    if (saved === 'en' || saved === 'taglish') language = saved;
  } catch { /* The page still works when browser storage is unavailable. */ }
  const text = key => konektadoCopy[language][key] ?? konektadoCopy.en[key];
  // Public handoff only: a normal link, never an embedded app or backend call.
  let appTarget = null;
  if (konektadoSite.app && ['web', 'apk'].includes(konektadoSite.app.kind)) {
    try {
      const url = new URL(konektadoSite.app.href, location.href);
      if (url.protocol === 'https:' || (url.origin === location.origin && url.protocol === 'http:')) {
        appTarget = { ...konektadoSite.app, href: url.href };
      }
    } catch { /* An invalid or missing target stays hidden. */ }
  }
  function renderAppLinks() {
    document.querySelectorAll('[data-app-link]').forEach(link => {
      link.hidden = !appTarget;
      if (!appTarget) return;
      link.href = appTarget.href;
      link.innerHTML = text(appTarget.kind === 'apk' ? 'downloadApp' : 'openApp');
      if (appTarget.kind === 'apk') link.download = appTarget.filename || 'Konektado.apk';
    });
  }
  renderAppLinks();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const cover = $('.cover'), question = $('.question'), paperScene = $('.discovery-scene');
  const backdrop = $('.opening-backdrop'), lockup = $('.cover-lockup');
  const replay = $('#replay-opening'), motionToggle = $('#motion-toggle');
  // Pause the ambient light when the cover or browser tab is out of view.
  let coverVisible = false;
  function updateAmbientMotion() {
    document.documentElement.classList.toggle('cover-in-view', coverVisible && !document.hidden);
  }
  const coverObserver = new IntersectionObserver(entries => {
    coverVisible = entries[0].isIntersecting;
    updateAmbientMotion();
  });
  coverObserver.observe(cover);
  document.addEventListener('visibilitychange', updateAmbientMotion);
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const mix = (a, b, p) => a.map((value, i) => Math.round(value + (b[i] - value) * p));
  let userPaused = false, motionEnabled = !reducedMotion.matches;
  let introAnimations = [], typed = false, typingTimer = null;
  let scrollFrame = false, pointerFrame = false, pointerX = 0, pointerY = 0;


  const guideSvg = $('.guide-route');
  const guideTrack = $('.guide-route-track'), guideDrawn = $('.guide-route-drawn'), guideDot = $('#guide-dot');
  const guideAnchors = [...document.querySelectorAll('[data-guide-anchor]')];
  const journeyLinks = [...document.querySelectorAll('[data-journey-link]')];
  let guideGeometry = null;
  function measureGuide() {
    const main = $('#main').getBoundingClientRect();
    const mainTop = main.top + scrollY;
    const logo = $('.cover-wordmark').getBoundingClientRect();
    const hero = { x: logo.left + logo.width * 231.5 / 237 - main.left, y: logo.top + scrollY + logo.height * 30.3 / 36 - mainTop, phase: 'opening', element: null };
    const points = [hero, ...guideAnchors.map(element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - main.left, y: rect.top + scrollY + rect.height / 2 - mainTop, phase: element.dataset.guideStep, element };
    })];
    const first = points.findIndex(point => point.phase === 'possibilities');
    const segments = []; let path = '', length = 0;
    for (let i = first; i < points.length - 1; i++) {
      const a = points[i], d = points[i + 1], middle = (a.y + d.y) / 2;
      let command;
      if (Math.abs(d.x - a.x) > 100 && d.element.closest('.journey-step')) {
        // Cross columns in the clear band above the next spread, away from its text.
        const step = d.element.closest('.journey-step').getBoundingClientRect();
        const transit = Math.max(a.y + 42, step.top + scrollY - mainTop + 42);
        const direction = Math.sign(d.x - a.x), radius = 22;
        command = 'L' + a.x + ',' + (transit - radius) + ' Q' + a.x + ',' + transit + ' ' + (a.x + direction * radius) + ',' + transit + ' L' + (d.x - direction * radius) + ',' + transit + ' Q' + d.x + ',' + transit + ' ' + d.x + ',' + (transit + radius) + ' L' + d.x + ',' + d.y;
      } else {
        command = 'C' + a.x + ',' + middle + ' ' + d.x + ',' + middle + ' ' + d.x + ',' + d.y;
      }
      const segmentPath = 'M' + a.x + ',' + a.y + ' ' + command;
      guideDrawn.setAttribute('d', segmentPath);
      const segmentLength = guideDrawn.getTotalLength();
      segments.push({ start: length, length: segmentLength }); length += segmentLength;
      path += (i === first ? 'M' + a.x + ',' + a.y + ' ' : ' ') + command;
    }
    const height = points[points.length - 1].y + 32;
    guideSvg.style.height = height + 'px';
    guideSvg.setAttribute('viewBox', '0 0 ' + main.width + ' ' + height);
    guideTrack.setAttribute('d', path); guideDrawn.setAttribute('d', path);
    guideDrawn.style.strokeDasharray = String(length);
    guideGeometry = { points, first, segments, length, mainTop, mainLeft: main.left, size: parseFloat(getComputedStyle(guideDot).width) };
  }
  function paintGuide() {
    if (!guideGeometry) measureGuide();
    const g = guideGeometry, points = g.points;
    const focus = scrollY + innerHeight * .55 - g.mainTop;
    let index = 0;
    while (index < points.length - 2 && focus > points[index + 1].y) index++;
    const a = points[index], b = points[index + 1];
    const progress = clamp((focus - a.y) / Math.max(1, b.y - a.y));
    const eased = progress * progress * (3 - 2 * progress);
    let position, drawn = 0;
    if (index >= g.first) {
      const segment = g.segments[index - g.first];
      drawn = segment.start + segment.length * eased;
      position = guideTrack.getPointAtLength(drawn);
    } else {
      const y = a.y + (b.y - a.y) * eased;
      // Keep the opening handoff in the margins, clear of the question and promise.
      const safeX = index === 0 ? $('#main').getBoundingClientRect().width - 22 : b.x;
      const departure = clamp((y - a.y) / 80);
      let x = a.x + (safeX - a.x) * departure;
      if (index === 0 && y > b.y - 26) x = safeX + (b.x - safeX) * clamp((y - b.y + 26) / 26);
      position = { x, y };
    }
    const x = position.x + g.mainLeft, y = position.y + g.mainTop - scrollY;
    guideDot.style.transform = 'translate3d(' + (x - g.size / 2) + 'px,' + (y - g.size / 2) + 'px,0)';
    const visible = motionEnabled && scrollY > innerHeight * .2 && focus < points[points.length - 1].y + innerHeight * .35 && y > $('.reading-header').offsetHeight + 12 && y < innerHeight - 24;
    document.documentElement.classList.toggle('guide-active', visible);
    guideDrawn.style.strokeDashoffset = String(motionEnabled ? g.length - drawn : 0);
    backdrop.style.setProperty('--paper-x', x + 'px'); backdrop.style.setProperty('--paper-y', y + 'px');
    const current = eased < .65 ? a : b;
    for (const point of points) if (point.element) {
      const parent = point.element.parentElement;
      parent.classList.toggle('guide-current', point === current);
      parent.classList.toggle('guide-read', point.y <= focus);
    }
    for (const link of journeyLinks) {
      if (link.dataset.journeyLink === current.phase) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
  }

  function paintScroll() {
    const h = innerHeight, q = question.getBoundingClientRect(), c = paperScene.getBoundingClientRect();
    const dark = clamp((h - q.top) / (h * 1.4));
    backdrop.style.setProperty('--ambient-opacity', String(1 - dark));
    backdrop.style.setProperty('--opening-color', 'rgb(' + mix([75,139,219], [25,60,96], dark).join(',') + ')');
    const paper = clamp((h * .92 - c.top) / (h * .73));
    const eased = paper * paper * (3 - 2 * paper);
    backdrop.style.setProperty('--paper-radius', eased * Math.hypot(innerWidth, h) * 1.12 + 'px');
    backdrop.style.setProperty('--seed-scale', String(clamp(paper * 5) * (1 + paper * 4)));
    backdrop.style.setProperty('--seed-opacity', String(1 - clamp((paper - .48) * 3)));
    paintGuide();
    $('.scroll-cue').style.opacity = String(clamp((cover.getBoundingClientRect().bottom - 120) / (h * .35)) * .8);
    document.body.classList.toggle('past-cover', cover.getBoundingClientRect().bottom < 120);
    document.body.classList.toggle('dark-story', c.top > h * .35);
    $('.question-inner').style.opacity = motionEnabled ? String(1 - clamp((paper - .05) / .35)) : '1';
    document.documentElement.style.setProperty('--read-progress', clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - h)) * 100 + '%');
    scrollFrame = false;
  }
  addEventListener('scroll', () => {
    if (!scrollFrame) { scrollFrame = true; requestAnimationFrame(paintScroll); }
  }, { passive: true });
  addEventListener('resize', () => { measureGuide(); paintScroll(); });
  document.fonts.ready.then(() => { measureGuide(); paintScroll(); });
  addEventListener('load', () => { measureGuide(); paintScroll(); });

  function cancelOpening() {
    for (const animation of introAnimations) animation.cancel();
    introAnimations = [];
  }
  function playOpening() {
    cancelOpening();
    if (!motionEnabled) return;
    introAnimations.push($('.wordmark-dot').animate([
      { opacity: 0, transform: 'translate(-112px, -8px) scale(5)' },
      { opacity: 1, transform: 'translate(-112px, -8px) scale(4)', offset: .2 },
      { opacity: 1, transform: 'translate(0, 0) scale(1)' },
    ], { duration: 1250, easing: 'cubic-bezier(.22,1,.36,1)' }));
    introAnimations.push($('.wordmark-letters').animate([
      { opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 750, delay: 360, fill: 'backwards', easing: 'cubic-bezier(.22,1,.36,1)' }));
    introAnimations.push($('.cover-lockup>p').animate([
      { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 650, delay: 720, fill: 'backwards', easing: 'ease-out' }));
    const appLink = $('.cover-app-link');
    if (!appLink.hidden) introAnimations.push(appLink.animate([
      { opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 600, delay: 950, fill: 'backwards', easing: 'ease-out' }));
  }
  replay.addEventListener('click', playOpening);
  function resetPointer() {
    pointerX = pointerY = 0;
    lockup.style.setProperty('--pointer-x', '0px');
    lockup.style.setProperty('--pointer-y', '0px');
  }
  cover.addEventListener('pointermove', event => {
    if (!motionEnabled || !finePointer.matches || event.pointerType === 'touch') return;
    const rect = cover.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - .5) * 14;
    pointerY = ((event.clientY - rect.top) / rect.height - .5) * 10;
    if (!pointerFrame) {
      pointerFrame = true;
      requestAnimationFrame(() => {
        if (motionEnabled) {
          lockup.style.setProperty('--pointer-x', pointerX + 'px');
          lockup.style.setProperty('--pointer-y', pointerY + 'px');
        }
        pointerFrame = false;
      });
    }
  }, { passive: true });
  cover.addEventListener('pointerleave', resetPointer);

  function renderQuestion() {
    const emphasis = document.createElement('strong');
    emphasis.className = 'typed-emphasis'; emphasis.textContent = text('questionEmphasis');
    const punctuation = document.createElement('span');
    punctuation.className = 'punctuation'; punctuation.textContent = '?';
    $('#typed-question').replaceChildren(text('questionStart'), emphasis, text('questionEnd'), punctuation);
  }
  function fullQuestion() {
    clearTimeout(typingTimer);
    renderQuestion();
    typed = true; question.classList.add('typed');
  }
  function renderMotionLabel() {
    motionToggle.textContent = text(motionEnabled ? 'motionOn' : 'motionOff');
    motionToggle.setAttribute('aria-label', text('motionLabel'));
    motionToggle.setAttribute('aria-pressed', String(motionEnabled));
  }
  function applyMotion() {
    motionEnabled = !reducedMotion.matches && !userPaused;
    document.documentElement.classList.toggle('motion-paused', !motionEnabled);
    document.body.classList.toggle('reveal-ready', motionEnabled);
    replay.disabled = !motionEnabled;
    motionToggle.hidden = reducedMotion.matches;
    renderMotionLabel();
    if (!motionEnabled) { cancelOpening(); resetPointer(); fullQuestion(); }
    paintScroll();
  }
  motionToggle.addEventListener('click', () => { userPaused = !userPaused; applyMotion(); });
  reducedMotion.addEventListener('change', applyMotion);

  const typeObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting) || typed) return;
    if (!motionEnabled) { fullQuestion(); typeObserver.disconnect(); return; }
    typed = true;
    const target = $('#typed-question'); target.replaceChildren();
    const characters = [...(text('questionStart') + text('questionEmphasis') + text('questionEnd') + '?')];
    const emphasisStart = [...text('questionStart')].length;
    const emphasisEnd = emphasisStart + [...text('questionEmphasis')].length;
    let i = 0;
    function type() {
      if (!motionEnabled) { fullQuestion(); return; }
      if (i === characters.length) { question.classList.add('typed'); return; }
      const char = characters[i++];
      if (char === '?') {
        const punctuation = document.createElement('span'); punctuation.className = 'punctuation'; punctuation.textContent = char; target.append(punctuation);
      } else if (i > emphasisStart && i <= emphasisEnd) {
        let emphasis = target.querySelector('.typed-emphasis');
        if (!emphasis) { emphasis = document.createElement('strong'); emphasis.className = 'typed-emphasis'; target.append(emphasis); }
        emphasis.append(document.createTextNode(char));
      } else target.append(document.createTextNode(char));
      typingTimer = setTimeout(type, 65);
    }
    type(); typeObserver.disconnect();
  }, { threshold: .45 });
  typeObserver.observe(question);
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target);
    }
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  applyMotion();
  if (scrollY < innerHeight * .4) playOpening();

  // Browse complete portrait captures, one static screen at a time.
  const prototypeButtons = [...document.querySelectorAll('[data-prototype-step]')];
  const prototypePanels = [...document.querySelectorAll('[data-prototype-panel]')];
  function showPrototype(key) {
    if (!prototypeButtons.some(button => button.dataset.prototypeStep === key)) return;
    for (const button of prototypeButtons) button.setAttribute('aria-pressed', String(button.dataset.prototypeStep === key));
    for (const panel of prototypePanels) panel.hidden = panel.dataset.prototypePanel !== key;
  }
  prototypeButtons.forEach(button => button.addEventListener('click', () => showPrototype(button.dataset.prototypeStep)));
  addEventListener('hashchange', () => showPrototype(location.hash.slice(1)));
  showPrototype(location.hash.slice(1));

  const copyEmail = $('#copy-email'), copyStatus = $('#copy-email-status');
  let copyFeedbackTimer, copyState = 'idle';
  function renderCopyFeedback() {
    copyEmail.textContent = text(copyState === 'success' ? 'copySuccess' : 'copyEmail');
    copyStatus.classList.toggle('copy-error', copyState === 'error');
    copyStatus.textContent = copyState === 'idle' ? '' : text(copyState === 'success' ? 'copySuccessStatus' : 'copyError');
  }
  copyEmail.addEventListener('click', async () => {
    clearTimeout(copyFeedbackTimer);
    try {
      await navigator.clipboard.writeText('konektado.app@gmail.com');
      copyState = 'success';
      copyFeedbackTimer = setTimeout(() => { copyState = 'idle'; renderCopyFeedback(); }, 2200);
    } catch {
      copyState = 'error';
    }
    renderCopyFeedback();
  });

  // Images are presentation artifacts. Enlarging one never opens the app.
  const viewer = $('#screen-viewer'), viewerImage = $('#viewer-image');
  const imageWrap = $('.viewer-image-wrap'), imageToggle = $('#viewer-image-toggle');
  const zoomButton = $('#zoom-viewer'), viewerHint = $('#viewer-hint');
  let imageOpener = null, zoomed = false, backdropPointer = null, previousOverflow = '';
  function renderViewerLabels() {
    const noteKey = imageOpener?.classList.contains('press-zoom') ? 'pressViewerNote' : imageOpener?.classList.contains('gallery-zoom') ? 'galleryViewerNote' : 'viewerNote';
    $('.viewer-header [data-copy="viewerNote"]').textContent = text(noteKey);
    zoomButton.textContent = text(zoomed ? 'viewerFit' : 'viewerZoom');
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    imageToggle.setAttribute('aria-pressed', String(zoomed));
    imageToggle.setAttribute('aria-label', text(zoomed ? 'viewerImageFit' : 'viewerImageZoom'));
    viewerHint.textContent = text(zoomed ? 'viewerZoomHint' : 'viewerFitHint');
  }
  function fitViewerImage() {
    if (!viewer.open) return;
    const source = imageOpener?.querySelector('img');
    const naturalWidth = viewerImage.naturalWidth || Number(source?.getAttribute('width')) || 1080;
    const naturalHeight = viewerImage.naturalHeight || Number(source?.getAttribute('height')) || 1920;
    const captionHeight = $('.viewer-header').offsetHeight;
    const availableWidth = Math.max(1, innerWidth - (innerWidth <= 600 ? 48 : 128));
    const availableHeight = Math.max(1, innerHeight - captionHeight - 112);
    const scale = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);
    viewer.style.setProperty('--viewer-fit-width', Math.floor(naturalWidth * scale) + 'px');
    viewer.style.setProperty('--viewer-fit-height', Math.floor(naturalHeight * scale) + 'px');
  }
  viewerImage.addEventListener('load', () => {
    if (viewer.open) { fitViewerImage(); setViewerZoom(false); }
  });
  addEventListener('resize', () => {
    if (viewer.open) { fitViewerImage(); if (zoomed) setViewerZoom(false); }
  });
  new ResizeObserver(() => { if (viewer.open) fitViewerImage(); }).observe($('.viewer-header'));

  function setViewerZoom(next, point) {
    // Keep the complete capture visible initially. Detail mode uses normal
    // scrolling, including touch panning; browser pinch zoom stays available.
    const fitted = viewerImage.getBoundingClientRect();
    const origin = point || { x: .5, y: 0 };
    zoomed = next;
    if (next) {
      const width = Math.min(viewerImage.naturalWidth || Infinity, Math.max(imageWrap.clientWidth, fitted.width * 2.5));
      viewer.style.setProperty('--viewer-detail-width', width + 'px');
    }
    viewer.classList.toggle('is-zoomed', next);
    renderViewerLabels();
    const enlarged = viewerImage.getBoundingClientRect();
    imageWrap.scrollLeft = next ? Math.max(0, origin.x * enlarged.width - imageWrap.clientWidth / 2) : 0;
    imageWrap.scrollTop = next ? Math.max(0, origin.y * enlarged.height - imageWrap.clientHeight / 2) : 0;
  }
  zoomButton.addEventListener('click', () => setViewerZoom(!zoomed));
  imageToggle.addEventListener('click', event => {
    const rect = viewerImage.getBoundingClientRect();
    const point = event.detail ? { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) } : undefined;
    setViewerZoom(!zoomed, point);
  });
  document.querySelectorAll('.screen-zoom').forEach(button => {
    button.addEventListener('click', () => {
      imageOpener = button;
      viewerImage.src = button.dataset.screen;
      viewerImage.alt = button.querySelector('img').alt;
      $('#viewer-title').textContent = button.dataset.caption;
      previousOverflow = document.body.style.overflow;
      viewer.showModal(); fitViewerImage(); setViewerZoom(false);
      document.body.style.overflow = 'hidden';
      $('#close-viewer').focus();
    });
  });
  $('#close-viewer').addEventListener('click', () => viewer.close());
  function outsideViewer(event) {
    // Transparent space is part of the dismiss area, including gaps inside the dialog.
    return ![imageWrap, $('.viewer-header'), $('#close-viewer')].some(element => {
      const rect = element.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  }
  viewer.addEventListener('pointerdown', event => {
    backdropPointer = outsideViewer(event) ? event.pointerId : null;
  });
  viewer.addEventListener('pointerup', event => {
    if (backdropPointer === event.pointerId && outsideViewer(event)) viewer.close();
    backdropPointer = null;
  });
  viewer.addEventListener('pointercancel', () => { backdropPointer = null; });
  viewer.addEventListener('close', () => {
    backdropPointer = null;
    document.body.style.overflow = previousOverflow;
    imageOpener?.focus({ preventScroll: true });
  });
  function applyLanguage(next, remember = false) {
    if (next !== 'en' && next !== 'taglish') return;
    language = next;
    document.documentElement.lang = next === 'en' ? 'en' : 'fil';
    document.documentElement.dataset.language = next;
    document.querySelector('meta[name="description"]').content = text('metaDescription');
    // These HTML strings are authored locally, never taken from URL/storage input.
    document.querySelectorAll('[data-copy]').forEach(element => {
      element.innerHTML = text(element.dataset.copy);
    });
    for (const [suffix, attribute] of [['aria', 'aria-label'], ['alt', 'alt'], ['title', 'title'], ['caption', 'data-caption']]) {
      document.querySelectorAll('[data-copy-' + suffix + ']').forEach(element => {
        element.setAttribute(attribute, text(element.getAttribute('data-copy-' + suffix)));
      });
    }
    document.querySelectorAll('button[data-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.language === next));
    });
    if (remember || typed || !motionEnabled) fullQuestion();
    else renderQuestion();
    renderMotionLabel(); renderCopyFeedback(); renderViewerLabels(); renderAppLinks();
    if (viewer.open && imageOpener) {
      $('#viewer-title').textContent = imageOpener.dataset.caption;
      viewerImage.alt = imageOpener.querySelector('img').alt;
    }
    if (remember) {
      try { localStorage.setItem(languageStorageKey, next); } catch { /* Session-only choice. */ }
      $('#language-status').textContent = text('languageChanged');
    }
    requestAnimationFrame(() => { measureGuide(); paintScroll(); });
  }
  document.querySelectorAll('button[data-language]').forEach(button => {
    button.addEventListener('click', () => applyLanguage(button.dataset.language, true));
  });
  const headerObserver = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--reading-header-height', $('.reading-header').offsetHeight + 'px');
    measureGuide(); paintScroll();
  });
  headerObserver.observe($('.reading-header'));
  applyLanguage(language);
})();
