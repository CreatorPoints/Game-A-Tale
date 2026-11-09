const sections = document.querySelectorAll('section');
let currentIndex = 0;
let isAnimating = false;
let lastScrollTime = 0;
const cooldown = 250;
const duration = 750;

const easeInOutSine = (t) => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

const audioShore = new Audio('assets/audio/seashore.mp3');
const audioGulls = new Audio('assets/audio/gulls.mp3');
const audioForest = new Audio('assets/audio/forest.mp3');
const audioFifth = new Audio('assets/audio/5thmovement.mp3');

audioShore.preload = 'auto';
audioGulls.preload = 'auto';
audioForest.preload = 'auto';
audioFifth.preload = 'auto';

audioShore.loop = true;
audioGulls.loop = true;
audioForest.loop = true;
audioFifth.loop = true;

audioShore.volume = 0;
audioGulls.volume = 0;
audioForest.volume = 0;
audioFifth.volume = 0;

const fadeAudio = (audio, targetVol, fadeDuration = 1200) => {
  const fadeToken = Symbol();
  audio._fadeToken = fadeToken;

  if (targetVol > 0 && audio.paused) {
    audio.play().catch(() => {});
  }

  const startVol = audio.volume;
  const startTime = performance.now();

  const step = (now) => {
    if (audio._fadeToken !== fadeToken) {
      return;
    }
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / fadeDuration, 1);
    audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * progress));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      audio.volume = targetVol;
      if (targetVol === 0) {
        audio.pause();
      }
    }
  };

  requestAnimationFrame(step);
};

let currentAudioGroup = null;

const updateAudioForScene = (sceneIndex) => {
  let targetGroup = 'forest';
  if (sceneIndex === 0) {
    targetGroup = 'shore';
  } else if (sceneIndex === 4) {
    targetGroup = 'fifth';
  }

  if (targetGroup === currentAudioGroup) {
    return;
  }
  currentAudioGroup = targetGroup;

  if (targetGroup === 'shore') {
    fadeAudio(audioForest, 0);
    fadeAudio(audioFifth, 0);
    fadeAudio(audioShore, 0.65);
    fadeAudio(audioGulls, 0.35);
  } else if (targetGroup === 'fifth') {
    fadeAudio(audioShore, 0);
    fadeAudio(audioGulls, 0);
    fadeAudio(audioForest, 0);
    fadeAudio(audioFifth, 0.65);
  } else {
    fadeAudio(audioShore, 0);
    fadeAudio(audioGulls, 0);
    fadeAudio(audioFifth, 0);
    fadeAudio(audioForest, 0.6);
  }
};

let hasUserInteracted = false;

const initAudioOnInteraction = () => {
  if (hasUserInteracted) {
    return;
  }
  hasUserInteracted = true;
  currentAudioGroup = null;
  updateAudioForScene(currentIndex);
};

['click', 'keydown', 'wheel', 'touchstart', 'pointerdown'].forEach((event) => {
  window.addEventListener(event, initAudioOnInteraction, { passive: true });
});

updateAudioForScene(currentIndex);

const entryOverlay = document.getElementById('entryOverlay');
const entryPrompt = document.querySelector('.entry-prompt');

const revealEntryPrompt = () => {
  if (entryPrompt) {
    entryPrompt.classList.add('is-ready');
  }
};

if (document.fonts && document.fonts.ready) {
  Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]).then(revealEntryPrompt);
} else {
  revealEntryPrompt();
}

const dismissOverlay = () => {
  if (!entryOverlay || entryOverlay.classList.contains('is-hidden')) {
    return;
  }
  entryOverlay.classList.add('is-hidden');
  hasUserInteracted = true;
  currentAudioGroup = null;
  updateAudioForScene(currentIndex);
};

if (entryOverlay) {
  entryOverlay.addEventListener('click', dismissOverlay);
  window.addEventListener('keydown', (event) => {
    if (!entryOverlay.classList.contains('is-hidden') && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      dismissOverlay();
    }
  });
}

const goToScene = (index) => {
  const targetIndex = Math.max(0, Math.min(index, sections.length - 1));
  if (targetIndex === currentIndex && window.scrollX === targetIndex * window.innerWidth) {
    return;
  }

  updateAudioForScene(targetIndex);

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
    const nextIndex = Math.round(window.scrollX / window.innerWidth);
    if (nextIndex !== currentIndex) {
      currentIndex = nextIndex;
      updateAudioForScene(currentIndex);
    }
  }
}, { passive: true });

window.addEventListener('resize', () => {
  if (!isAnimating) {
    window.scrollTo(currentIndex * window.innerWidth, 0);
  }
});

const faqBox = document.getElementById('faqBox');

if (faqBox) {
  faqBox.addEventListener('click', (event) => {
    if (!faqBox.classList.contains('is-expanded')) {
      faqBox.classList.add('is-expanded');
    } else if (event.target.closest('h2')) {
      faqBox.classList.remove('is-expanded');
    }
  });

  document.addEventListener('click', (event) => {
    if (faqBox.classList.contains('is-expanded') && !event.target.closest('#faqBox')) {
      faqBox.classList.remove('is-expanded');
    }
  });
}

window.addEventListener('wheel', (event) => {
  if (faqBox?.classList.contains('is-expanded') && event.target.closest('#faqBox')) {
    return;
  }

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
  if (event.key === 'Escape' && faqBox?.classList.contains('is-expanded')) {
    event.preventDefault();
    faqBox.classList.remove('is-expanded');
    return;
  }

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
  if (faqBox?.classList.contains('is-expanded') && event.target.closest('#faqBox')) {
    return;
  }

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