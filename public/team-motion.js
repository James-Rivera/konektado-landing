/* A one-time signal reveal; photographs remain usable without JavaScript. */
(() => {
  'use strict';
  const ensemble = document.querySelector('.team-ensemble');
  if (!ensemble || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const runner = ensemble.querySelector('.team-signal-runner');
  const members = [...ensemble.querySelectorAll('.team-roster > li')];
  const allowed = () => !reduced.matches && !root.classList.contains('motion-paused');
  let queue = Promise.resolve(), generation = 0, lastPoint = null, hideTimer;
  let runnerAnimation = null;
  const pulseTimers = new Map();
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function pulse(button) {
    if (!allowed() || button.classList.contains('is-pulsing')) return;
    button.classList.add('is-pulsing');
    pulseTimers.set(button, setTimeout(() => {
      button.classList.remove('is-pulsing');
      pulseTimers.delete(button);
    }, 430));
  }
  members.forEach((member, index) => {
    member.classList.add('team-member');
    member.dataset.memberIndex = String(index);
    const button = member.querySelector('.portrait-signal');
    const image = button.querySelector('img');
    for (const channel of ['blue', 'yellow']) {
      const layer = image.cloneNode();
      layer.removeAttribute('id');
      layer.alt = '';
      layer.setAttribute('aria-hidden', 'true');
      layer.className = 'team-channel team-channel-' + channel;
      button.append(layer);
    }
    button.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') pulse(button);
    });
    button.addEventListener('focus', () => pulse(button));
    button.addEventListener('click', () => pulse(button));
    button.addEventListener('keydown', event => {
      // Native button Enter/Space behavior supplies keyboard activation.
      if (event.key === 'Escape') button.blur();
    });
  });
  root.classList.add('team-effects-ready');

  async function connect(member, token) {
    if (token !== generation) return;
    const photo = member.querySelector('.team-portrait');
    const rect = photo.getBoundingClientRect();
    if (!allowed() || rect.bottom < 0 || rect.top > innerHeight) {
      member.classList.add('is-connected');
      return;
    }
    const origin = ensemble.getBoundingClientRect();
    const point = { x: rect.left - origin.left + rect.width / 2, y: rect.top - origin.top - 15 };
    const transform = p => 'translate3d(' + (p.x - 5) + 'px,' + (p.y - 5) + 'px,0)';
    const sameRow = lastPoint && Math.abs(point.y - lastPoint.y) < rect.height * .5;
    clearTimeout(hideTimer);
    runner.classList.add('is-travelling');
    runnerAnimation = runner.animate([
      { transform: transform(sameRow ? lastPoint : point), opacity: sameRow ? 1 : 0, scale: sameRow ? '1' : '.4' },
      { transform: transform(point), opacity: 1, scale: '1' },
    ], { duration: sameRow ? 190 : 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    try { await runnerAnimation.finished; } catch { return; }
    if (token !== generation) return;
    runner.style.transform = transform(point);
    runnerAnimation.cancel(); runnerAnimation = null;
    lastPoint = point;
    member.classList.add('is-connected', 'is-receiving');
    setTimeout(() => member.classList.remove('is-receiving'), 650);
    hideTimer = setTimeout(() => runner.classList.remove('is-travelling'), 450);
    await delay(100);
  }
  const observer = new IntersectionObserver(entries => {
    const incoming = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => Number(a.target.dataset.memberIndex) - Number(b.target.dataset.memberIndex));
    for (const entry of incoming) {
      observer.unobserve(entry.target);
      const token = generation;
      queue = queue.then(() => connect(entry.target, token));
    }
  }, { threshold: .18, rootMargin: '0px 0px -5% 0px' });
  members.forEach(member => observer.observe(member));

  function settle() {
    if (allowed()) return;
    generation++;
    runnerAnimation?.cancel(); runnerAnimation = null;
    clearTimeout(hideTimer);
    runner.classList.remove('is-travelling');
    members.forEach(member => {
      member.classList.add('is-connected');
      member.classList.remove('is-receiving');
    });
    for (const [button, timer] of pulseTimers) {
      clearTimeout(timer); button.classList.remove('is-pulsing');
    }
    pulseTimers.clear();
  }
  reduced.addEventListener('change', settle);
  let paused = root.classList.contains('motion-paused');
  new MutationObserver(() => {
    const next = root.classList.contains('motion-paused');
    if (next !== paused) { paused = next; settle(); }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
  settle();
})();
