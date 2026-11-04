export function initHeroVideo(root, env = window) {
  const videos = [...root.querySelectorAll('video[data-src]')];
  const toggle = root.querySelector('[data-video-toggle]');
  if (!videos.length || !toggle) return;
  const reduced = env.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = env.matchMedia('(max-width: 767px)');
  let current = 0, visible = true, pausedByUser = false, ready = root.ownerDocument.readyState === 'complete';
  const doc = root.ownerDocument;
  const allowed = () => !reduced.matches && !mobile.matches && !env.navigator.connection?.saveData && !/^(slow-2g|2g|3g)$/.test(env.navigator.connection?.effectiveType || '');
  const canPlay = () => ready && visible && doc.visibilityState !== 'hidden' && allowed() && !pausedByUser;
  function stop(release = false) {
    videos.forEach(video => {
      video.pause();
      if (release) { video.classList.remove('active'); video.removeAttribute('src'); video.load(); }
    });
    if (release) { current = 0; toggle.hidden = true; }
  }
  async function play() {
    if (!canPlay()) return;
    const video = videos[current];
    if (!video.getAttribute('src')) { video.src = video.dataset.src; video.load(); }
    if (video.ended) video.currentTime = 0;
    video.muted = true;
    try {
      await video.play();
      if (!canPlay() || video !== videos[current]) { video.pause(); return; }
      videos.forEach(item => item.classList.toggle('active', item === video));
      toggle.hidden = false;
      toggle.textContent = 'Pause video'; toggle.setAttribute('aria-label', 'Pause background video');
    } catch { video.classList.remove('active'); toggle.hidden = true; }
  }
  function update() { if (!allowed()) stop(true); else if (canPlay()) play(); else stop(); }
  videos.forEach((video, index) => video.addEventListener('ended', () => {
    if (index !== current || !canPlay()) return;
    video.pause(); current = (current + 1) % videos.length; play();
  }));
  toggle.addEventListener('click', () => {
    pausedByUser = !pausedByUser;
    if (pausedByUser) { stop(); toggle.textContent = 'Play video'; toggle.setAttribute('aria-label', 'Play background video'); }
    else play();
  });
  doc.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update); mobile.addEventListener('change', update);
  env.navigator.connection?.addEventListener?.('change', update);
  if (env.IntersectionObserver) {
    visible = false;
    const observer = new env.IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); }, { threshold: 0.01 });
    observer.observe(root);
  }
  if (!ready) env.addEventListener('load', () => { ready = true; update(); }, { once: true });
  else update();
}
