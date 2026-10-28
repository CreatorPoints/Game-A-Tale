const audio = document.getElementById('bg-audio');
if (audio) {
  audio.volume = 0.5;

  const playAudio = () => {
    audio.play().catch(() => {});
  };

  playAudio();
  window.addEventListener('click', playAudio, { once: true });
  window.addEventListener('keydown', playAudio, { once: true });
  window.addEventListener('touchstart', playAudio, { once: true });
}
