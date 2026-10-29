const audio = document.getElementById('bg-audio');
const message = document.querySelector('.message');
const soundToggle = document.getElementById('sound-toggle');
const soundLabel = soundToggle ? soundToggle.querySelector('.label') : null;
const soundIcon = soundToggle ? soundToggle.querySelector('.icon') : null;

const revealMessage = () => {
  if (message) {
    message.classList.add('visible');
  }
};

// Ensure message is gracefully visible
setTimeout(revealMessage, 300);

if (audio) {
  const targetVolume = 0.5;
  const fadeDuration = 2000; // 2-second fade-in on start
  let hasFadedIn = false;
  let fadeInterval = null;

  const updateUI = (playing) => {
    if (!soundToggle) return;
    if (playing) {
      soundToggle.classList.add('playing');
      if (soundIcon) soundIcon.textContent = '🔊';
      if (soundLabel) soundLabel.textContent = 'Sound on';
    } else {
      soundToggle.classList.remove('playing');
      if (soundIcon) soundIcon.textContent = '🔇';
      if (soundLabel) soundLabel.textContent = 'Click for sound';
    }
  };

  const fadeIn = () => {
    if (hasFadedIn) {
      audio.volume = targetVolume;
      return;
    }
    hasFadedIn = true;
    audio.volume = 0;
    const startTime = performance.now();

    clearInterval(fadeInterval);
    fadeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      audio.volume = progress * targetVolume;

      if (progress >= 1) {
        clearInterval(fadeInterval);
        audio.volume = targetVolume;
      }
    }, 30);
  };

  const playSound = () => {
    if (!hasFadedIn) {
      audio.volume = 0;
    }
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          fadeIn();
          updateUI(true);
          revealMessage();
        })
        .catch(() => {
          // Browser autoplay restriction in effect; prompt remains visible until click
          updateUI(false);
        });
    }
  };

  // Attempt autoplay immediately
  playSound();

  // Listen for user interaction to unlock audio if autoplay was restricted
  const unlockAudio = () => {
    if (audio.paused) {
      playSound();
    }
  };

  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { once: true });
  });

  // Toggle button allows muting/unmuting anytime
  if (soundToggle) {
    soundToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (audio.paused) {
        playSound();
      } else {
        audio.pause();
        updateUI(false);
      }
    });
  }
} else {
  revealMessage();
}
