// ============================================================
// Particles background (signature ambient motion)
// ============================================================
(function particles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, dots;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  dots = Array.from({ length: 46 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.15,
    vy: (Math.random() - 0.5) * 0.15,
    a: Math.random() * 0.5 + 0.15
  }));

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0) d.x = w;
      if (d.x > w) d.x = 0;
      if (d.y < 0) d.y = h;
      if (d.y > h) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,170,255,${d.a})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

// ============================================================
// App state
// ============================================================
const state = {
  name: '',
  gender: null,
  companionGender: null,
  personality: null,
  userId: localStorage.getItem('companionUserId') || null
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active-screen'));
  document.getElementById(id).classList.add('active-screen');
}

// ============================================================
// Screen 1 — Welcome
// ============================================================
const nameInput = document.getElementById('nameInput');
document.getElementById('toGenderBtn').addEventListener('click', () => {
  const val = nameInput.value.trim();
  if (!val) {
    nameInput.focus();
    return;
  }
  state.name = val;
  showScreen('screen-gender');
});
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('toGenderBtn').click();
});

// ============================================================
// Generic option-card selector helper
// ============================================================
function wireOptions(containerId, stateKey, nextBtnId) {
  const container = document.getElementById(containerId);
  const nextBtn = document.getElementById(nextBtnId);
  container.querySelectorAll('.option-card').forEach((card) => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.option-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state[stateKey] = card.dataset.value;
      nextBtn.disabled = false;
    });
  });
}

wireOptions('genderOptions', 'gender', 'toCompanionBtn');
wireOptions('companionOptions', 'companionGender', 'toPersonalityBtn');
wireOptions('personalityOptions', 'personality', 'finishSetupBtn');

document.getElementById('toCompanionBtn').addEventListener('click', () => showScreen('screen-companion'));
document.getElementById('toPersonalityBtn').addEventListener('click', () => showScreen('screen-personality'));

// ============================================================
// Finish setup -> create user in DB -> go to chat
// ============================================================
document.getElementById('finishSetupBtn').addEventListener('click', async () => {
  const btn = document.getElementById('finishSetupBtn');
  btn.disabled = true;
  btn.querySelector('.btn-label').classList.add('d-none');
  btn.querySelector('.btn-spinner').classList.remove('d-none');

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.name,
        gender: state.gender,
        companionGender: state.companionGender,
        personality: state.personality
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'setup failed');

    state.userId = data.user._id;
    localStorage.setItem('companionUserId', state.userId);
    localStorage.setItem('companionName', state.companionGender === 'male' ? 'Nova' : 'Nova');

    enterChat();
  } catch (err) {
    alert('Could not start companion: ' + err.message);
    btn.disabled = false;
    btn.querySelector('.btn-label').classList.remove('d-none');
    btn.querySelector('.btn-spinner').classList.add('d-none');
  }
});

// ============================================================
// Chat screen
// ============================================================
const messagesArea = document.getElementById('messagesArea');
const chatInput = document.getElementById('chatInput');
const charCounter = document.getElementById('charCounter');
const sendBtn = document.getElementById('sendBtn');

chatInput.addEventListener('input', () => {
  charCounter.textContent = `${chatInput.value.length}/500`;
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});
sendBtn.addEventListener('click', sendMessage);

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Very small markdown: **bold**, *italic*, `code`, line breaks
function renderMarkdown(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function addMessageRow(role, text) {
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = renderMarkdown(text);

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span>${timeNow()}</span><button class="copy-btn" title="Copy"><i class="fa-regular fa-copy"></i></button>`;
  meta.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(text);
  });

  row.appendChild(bubble);
  row.appendChild(meta);
  messagesArea.appendChild(row);
  messagesArea.scrollTop = messagesArea.scrollHeight;
  return bubble;
}

function showTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'msg-row assistant typing-row';
  row.id = 'typingRow';
  row.innerHTML = `<div class="typing-bubble"><span></span><span></span><span></span></div>`;
  messagesArea.appendChild(row);
  messagesArea.scrollTop = messagesArea.scrollHeight;
}
function hideTypingIndicator() {
  const row = document.getElementById('typingRow');
  if (row) row.remove();
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || !state.userId) return;

  addMessageRow('user', text);
  chatInput.value = '';
  charCounter.textContent = '0/500';
  sendBtn.disabled = true;
  showTypingIndicator();

  try {
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: state.userId, message: text })
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'chat failed');
    }

    hideTypingIndicator();
    const bubble = addMessageRow('assistant', '');
    let full = '';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      bubble.innerHTML = renderMarkdown(full);
      messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    if (window.speakReply && !window.isMuted()) {
      window.speakReply(full);
    }
  } catch (err) {
    hideTypingIndicator();
    addMessageRow('assistant', "Sorry, I'm having trouble responding right now. Try again in a moment.");
  } finally {
    sendBtn.disabled = false;
  }
}

// ============================================================
// New chat / Delete conversation
// ============================================================
document.getElementById('newChatBtn').addEventListener('click', async () => {
  if (!state.userId) return;
  await fetch(`/api/chat/new/${state.userId}`, { method: 'POST' });
  messagesArea.innerHTML = '';
  greet();
});

document.getElementById('deleteChatBtn').addEventListener('click', async () => {
  if (!state.userId) return;
  if (!confirm('Delete this conversation? This clears everything, including memory.')) return;
  await fetch(`/api/chat/${state.userId}`, { method: 'DELETE' });
  messagesArea.innerHTML = '';
  greet();
});

function greet() {
  const label = document.getElementById('companionLabel').textContent;
  addMessageRow('assistant', `Hey ${state.name || ''}! Good to see you. What's on your mind?`);
}

async function loadHistory() {
  try {
    const res = await fetch(`/api/chat/history/${state.userId}`);
    const data = await res.json();
    messagesArea.innerHTML = '';
    if (!data.messages || !data.messages.length) {
      greet();
      return;
    }
    data.messages.forEach((m) => addMessageRow(m.role, m.content));
  } catch {
    greet();
  }
}

async function enterChat() {
  showScreen('screen-chat');
  document.getElementById('companionLabel').textContent = 'Nova';
  await loadHistory();
}

// Resume existing user on reload
if (state.userId) {
  enterChat();
}
