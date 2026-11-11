/* A chapter handoff from finding help to offering skills. */
(() => {
  'use strict';
  const story = document.querySelector('#find-work');
  const photo = story?.querySelector('.provider-photo');
  if (!photo || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => !reduced.matches && !root.classList.contains('motion-paused');
  let cleanupTimer;
  function settle() {
    story.classList.add('has-arrived');
    story.classList.remove('is-arriving');
    clearTimeout(cleanupTimer);
    observer.disconnect();
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (!allowed()) { settle(); return; }
    photo.style.setProperty('--signal-distance', Math.max(0, photo.clientWidth - 44) + 'px');
    story.classList.add('has-arrived', 'is-arriving');
    cleanupTimer = setTimeout(() => story.classList.remove('is-arriving'), 1500);
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  root.classList.add('find-work-effects-ready');
  if (allowed()) observer.observe(photo); else settle();
  reduced.addEventListener('change', () => { if (!allowed()) settle(); });
  let paused = root.classList.contains('motion-paused');
  new MutationObserver(() => {
    const next = root.classList.contains('motion-paused');
    if (next !== paused) { paused = next; if (next) settle(); }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
})();
