const sections = document.querySelectorAll('section');
let currentIndex = 0;
let isAnimating = false;
let lastScrollTime = 0;
const cooldown = 250;
const duration = 750;

const easeInOutSine = (t) => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

const goToScene = (index) => {
  const targetIndex = Math.max(0, Math.min(index, sections.length - 1));
  if (targetIndex === currentIndex && window.scrollX === targetIndex * window.innerWidth) {
    return;
  }

  const startScroll = window.scrollX;
  const targetScroll = targetIndex * window.innerWidth;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(targetScroll, 0);
    currentIndex = targetIndex;
    return;
  }

  isAnimating = true;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutSine(progress);
    const nextScroll = startScroll + (targetScroll - startScroll) * easedProgress;

    window.scrollTo(nextScroll, 0);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      window.scrollTo(targetScroll, 0);
      currentIndex = targetIndex;
      lastScrollTime = performance.now();
      isAnimating = false;
    }
  };

  requestAnimationFrame(step);
};

window.addEventListener('scroll', () => {
  if (!isAnimating) {
    currentIndex = Math.round(window.scrollX / window.innerWidth);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (!isAnimating) {
    window.scrollTo(currentIndex * window.innerWidth, 0);
  }
});

window.addEventListener('wheel', (event) => {
  event.preventDefault();
  const now = performance.now();
  if (isAnimating || now - lastScrollTime < cooldown) {
    return;
  }

  const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  if (Math.abs(delta) < 15) {
    return;
  }

  if (delta > 0) {
    goToScene(currentIndex + 1);
  } else {
    goToScene(currentIndex - 1);
  }
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (['input', 'textarea', 'select'].includes(event.target.tagName?.toLowerCase())) {
    return;
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
    event.preventDefault();
    goToScene(currentIndex + 1);
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
    event.preventDefault();
    goToScene(currentIndex - 1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    goToScene(0);
  } else if (event.key === 'End') {
    event.preventDefault();
    goToScene(sections.length - 1);
  }
});

let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (event) => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (event) => {
  const deltaX = touchStartX - event.changedTouches[0].clientX;
  const deltaY = touchStartY - event.changedTouches[0].clientY;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
    if (deltaX > 0) {
      goToScene(currentIndex + 1);
    } else {
      goToScene(currentIndex - 1);
    }
  }
}, { passive: true });

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
}, {
  threshold: 0.35
});

sections.forEach((section) => {
  observer.observe(section);
});