let targetScroll = window.scrollX;
let currentScroll = window.scrollX;
let isAnimating = false;
const ease = 0.08;

const getMaxScroll = () => {
  return document.documentElement.scrollWidth - window.innerWidth;
};

const animate = () => {
  const diff = targetScroll - currentScroll;
  if (Math.abs(diff) > 0.5) {
    currentScroll += diff * ease;
    window.scrollTo({
      left: currentScroll,
      behavior: 'auto'
    });
    requestAnimationFrame(animate);
  } else {
    currentScroll = targetScroll;
    window.scrollTo({
      left: currentScroll,
      behavior: 'auto'
    });
    isAnimating = false;
  }
};

const startAnimation = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    currentScroll = targetScroll;
    window.scrollTo({
      left: currentScroll,
      behavior: 'auto'
    });
    return;
  }
  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animate);
  }
};

window.addEventListener('scroll', () => {
  if (!isAnimating) {
    targetScroll = window.scrollX;
    currentScroll = window.scrollX;
  }
}, { passive: true });

window.addEventListener('resize', () => {
  targetScroll = Math.max(0, Math.min(targetScroll, getMaxScroll()));
  currentScroll = targetScroll;
  window.scrollTo({
    left: currentScroll,
    behavior: 'auto'
  });
});

window.addEventListener('wheel', (event) => {
  if (event.deltaX !== 0) {
    return;
  }
  let delta = event.deltaY;
  if (event.deltaMode === 1) {
    delta *= 24;
  } else if (event.deltaMode === 2) {
    delta *= window.innerWidth;
  }
  event.preventDefault();
  targetScroll = Math.max(0, Math.min(targetScroll + delta, getMaxScroll()));
  startAnimation();
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (['input', 'textarea', 'select'].includes(event.target.tagName?.toLowerCase())) {
    return;
  }
  let delta = 0;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    delta = 120;
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    delta = -120;
  } else if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
    delta = window.innerWidth;
  } else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
    delta = -window.innerWidth;
  }
  if (delta !== 0) {
    event.preventDefault();
    targetScroll = Math.max(0, Math.min(targetScroll + delta, getMaxScroll()));
    startAnimation();
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
}, {
  threshold: 0.35
});

document.querySelectorAll('section').forEach((section) => {
  observer.observe(section);
});
