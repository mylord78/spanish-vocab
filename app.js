const SHEET_ID = '1BxCgeiRRX2gfYTRqT7vCAZmTWXZuVPPFND27SA0tqSo';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

let words = [];
let deck = [];
let current = 0;
let correctCount = 0;
let wrongCount = 0;
let mode = 'flashcard';

function parseCSV(text) {
  const rows = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        cols.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    cols.push(cell.trim());
    rows.push(cols);
  }
  return rows;
}

async function loadWords() {
  try {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = parseCSV(text);
    words = rows
      .slice(1) // 헤더 행 건너뜀
      .filter(r => r[0] && r[1])
      .map(r => ({ spanish: r[0], korean: r[1], alt: r[2] || '' }));
    startSession();
  } catch (e) {
    document.getElementById('loadingMsg').textContent = '단어를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession() {
  const shouldShuffle = document.getElementById('shuffleCheck').checked;
  deck = shouldShuffle ? shuffle(words) : [...words];
  current = 0;
  correctCount = 0;
  wrongCount = 0;
  updateScore();
  document.getElementById('loadingMsg').classList.add('hidden');
  showMode(mode);
  renderCurrent();
}

function showMode(m) {
  mode = m;
  document.getElementById('flashcardMode').classList.toggle('hidden', m !== 'flashcard');
  document.getElementById('quizMode').classList.toggle('hidden', m !== 'quiz');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
}

function renderCurrent() {
  if (!deck.length) return;
  const item = deck[current];
  updateProgress();

  if (mode === 'flashcard') {
    document.getElementById('koreanWord').textContent = item.korean;
    document.getElementById('spanishWord').textContent = item.spanish;
    document.getElementById('altDef').textContent = item.alt ? `(${item.alt})` : '';
    const card = document.getElementById('card');
    card.classList.remove('flipped');
  } else {
    document.getElementById('quizKorean').textContent = item.korean;
    document.getElementById('quizInput').value = '';
    document.getElementById('quizInput').disabled = false;
    document.getElementById('quizInput').focus();
    const fb = document.getElementById('quizFeedback');
    fb.classList.add('hidden');
    fb.className = 'feedback hidden';
    document.getElementById('quizNextBtn').classList.add('hidden');
  }
}

function updateProgress() {
  const pct = deck.length ? ((current / deck.length) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${current} / ${deck.length}`;
}

function updateScore() {
  document.getElementById('correctCount').textContent = correctCount;
  document.getElementById('wrongCount').textContent = wrongCount;
}

function goNext() {
  current = (current + 1) % deck.length;
  renderCurrent();
}

function goPrev() {
  current = (current - 1 + deck.length) % deck.length;
  renderCurrent();
}

function markKnew() {
  correctCount++;
  updateScore();
  goNext();
}

function markDidntKnow() {
  wrongCount++;
  updateScore();
  goNext();
}

function checkQuiz() {
  const input = document.getElementById('quizInput').value.trim().toLowerCase();
  const answer = deck[current].spanish.trim().toLowerCase();
  const isCorrect = input === answer;

  if (isCorrect) correctCount++;
  else wrongCount++;
  updateScore();

  const fb = document.getElementById('quizFeedback');
  fb.classList.remove('hidden', 'correct-fb', 'wrong-fb');
  if (isCorrect) {
    fb.classList.add('correct-fb');
    fb.textContent = `정답! ✓  "${deck[current].spanish}"`;
  } else {
    fb.classList.add('wrong-fb');
    fb.textContent = `오답 ✗  정답: "${deck[current].spanish}"`;
  }
  document.getElementById('quizInput').disabled = true;
  document.getElementById('quizNextBtn').classList.remove('hidden');
}

// Event listeners
document.getElementById('card').addEventListener('click', () => {
  document.getElementById('card').classList.toggle('flipped');
});

document.getElementById('prevBtn').addEventListener('click', goPrev);
document.getElementById('nextBtn').addEventListener('click', goNext);
document.getElementById('knewItBtn').addEventListener('click', markKnew);
document.getElementById('didntKnowBtn').addEventListener('click', markDidntKnow);

document.getElementById('checkBtn').addEventListener('click', checkQuiz);
document.getElementById('quizNextBtn').addEventListener('click', goNext);
document.getElementById('quizInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('quizInput').disabled) goNext();
    else checkQuiz();
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    showMode(tab.dataset.mode);
    renderCurrent();
  });
});

document.getElementById('shuffleCheck').addEventListener('change', startSession);

loadWords();
