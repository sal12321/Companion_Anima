(function voiceModule() {
  const micBtn = document.getElementById('micBtn');
  const muteBtn = document.getElementById('muteBtn');
  const replayBtn = document.getElementById('replayBtn');
  const chatInput = document.getElementById('chatInput');

  let muted = false;
  let lastReply = '';
  let recognition = null;
  let listening = false;

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognitionAPI) {
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInput.value = transcript;
      chatInput.dispatchEvent(new Event('input'));
      // Auto-send the recognized speech
      const sendBtn = document.getElementById('sendBtn');
      sendBtn.click();
    };

    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      micBtn.title = 'Start listening';
    };

    recognition.onerror = () => {
      listening = false;
      micBtn.classList.remove('listening');
    };
  } else {
    micBtn.disabled = true;
    micBtn.title = 'Voice input not supported in this browser';
  }

  micBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      listening = false;
      micBtn.classList.remove('listening');
      micBtn.title = 'Start listening';
    } else {
      recognition.start();
      listening = true;
      micBtn.classList.add('listening');
      micBtn.title = 'Stop listening';
    }
  });

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.innerHTML = muted
      ? '<i class="fa-solid fa-volume-xmark"></i>'
      : '<i class="fa-solid fa-volume-high"></i>';
    if (muted) window.speechSynthesis.cancel();
  });

  replayBtn.addEventListener('click', () => {
    if (lastReply) speak(lastReply);
  });

  function stripMarkdown(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(stripMarkdown(text));
    utter.rate = 1.0;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  }

  // Exposed for app.js
  window.speakReply = (text) => {
    lastReply = text;
    speak(text);
  };
  window.isMuted = () => muted;
})();
