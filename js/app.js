const audio = document.getElementById('bg-audio');
const message = document.querySelector('.message');

const revealMessage = () => {
  if (message) {
    message.classList.add('visible');
  }
};

if (audio) {
  const targetVolume = 0.5;
  const fadeDuration = 2000; // 2 seconds fade-in on initial start
  let hasFadedIn = false;

  const fadeIn = () => {
    if (hasFadedIn) return;
    hasFadedIn = true;
    revealMessage();
    audio.volume = 0;

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      audio.volume = progress * targetVolume;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        audio.volume = targetVolume;
      }
    };
    requestAnimationFrame(step);
  };

  const playAudio = () => {
    if (!hasFadedIn) {
      audio.volume = 0;
    }
    audio.play()
      .then(() => {
        fadeIn();
      })
      .catch(() => {
        // Autoplay restricted by browser until user gesture; reveal message gracefully
        revealMessage();
      });
  };

  playAudio();

  // Safety fallback: reveal message within 800ms if buffering is delayed
  setTimeout(revealMessage, 800);

  // User-interaction fallback if autoplay is restricted by browser policy
  const onInteraction = () => {
    playAudio();
  };

  window.addEventListener('click', onInteraction, { once: true });
  window.addEventListener('keydown', onInteraction, { once: true });
  window.addEventListener('touchstart', onInteraction, { once: true });
} else {
  revealMessage();
}
