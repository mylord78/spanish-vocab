const SHEET_ID = '1BxCgeiRRX2gfYTRqT7vCAZmTWXZuVPPFND27SA0tqSo';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const QUIZ_SIZE = 10;

let words = [];
let deck = [];
let current = 0;
let correctCount = 0;
let wrongCount = 0;
let mode = 'flashcard';

// Quiz session state
let quizSession = [];   // 10 words for current quiz
let quizIndex = 0;      // current question index (0-9)
let quizResults = [];   // { word, userInput, isCorrect }

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuote = false;
      else cell += ch; // embedded newlines inside quotes are kept but ignored for display
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(cell.trim()); cell = ''; }
      else if (ch === '\r' && text[i + 1] === '\n') {
        row.push(cell.trim()); rows.push(row); row = []; cell = ''; i++;
      } else if (ch === '\n') {
        row.push(cell.trim()); rows.push(row); row = []; cell = '';
      } else { cell += ch; }
    }
  }
  if (row.length > 0 || cell) { row.push(cell.trim()); rows.push(row); }
  return rows;
}

async function loadWords() {
  try {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = parseCSV(text);
    words = rows
      .slice(1)
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
  if (mode === 'quiz') startQuiz();
  else renderCurrent();
}

function startQuiz() {
  quizSession = shuffle(words).slice(0, QUIZ_SIZE);
  quizIndex = 0;
  quizResults = [];
  correctCount = 0;
  wrongCount = 0;
  updateScore();
  updateQuizProgress();
  document.getElementById('resultsScreen').classList.add('hidden');
  document.getElementById('quizMode').classList.remove('hidden');
  renderQuizQuestion();
}

function showMode(m) {
  mode = m;
  document.getElementById('flashcardMode').classList.toggle('hidden', m !== 'flashcard');
  document.getElementById('quizMode').classList.toggle('hidden', m !== 'quiz');
  document.getElementById('resultsScreen').classList.add('hidden');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === m));
  if (m === 'quiz') startQuiz();
}

function renderCurrent() {
  if (!deck.length) return;
  const item = deck[current];
  updateProgress();
  document.getElementById('koreanWord').textContent = item.korean;
  document.getElementById('spanishWord').textContent = item.spanish;
  document.getElementById('altDef').textContent = item.alt ? `(${item.alt})` : '';
  document.getElementById('card').classList.remove('flipped');
}

function renderQuizQuestion() {
  const item = quizSession[quizIndex];
  document.getElementById('quizNum').textContent = `${quizIndex + 1} / ${QUIZ_SIZE}`;
  document.getElementById('quizKorean').textContent = item.korean;
  document.getElementById('quizInput').value = '';
  document.getElementById('quizInput').disabled = false;
  document.getElementById('quizInput').focus();
  const fb = document.getElementById('quizFeedback');
  fb.className = 'feedback hidden';
  document.getElementById('quizNextBtn').classList.add('hidden');
}

function updateProgress() {
  const pct = deck.length ? ((current / deck.length) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${current} / ${deck.length}`;
}

function updateQuizProgress() {
  const pct = QUIZ_SIZE ? ((quizIndex / QUIZ_SIZE) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${quizIndex} / ${QUIZ_SIZE}`;
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
  const input = document.getElementById('quizInput').value.trim();
  const item = quizSession[quizIndex];
  const isCorrect = input.toLowerCase() === item.spanish.toLowerCase();

  quizResults.push({ word: item, userInput: input, isCorrect });

  if (isCorrect) correctCount++;
  else wrongCount++;
  updateScore();

  const fb = document.getElementById('quizFeedback');
  fb.className = 'feedback ' + (isCorrect ? 'correct-fb' : 'wrong-fb');
  fb.textContent = isCorrect
    ? `정답! ✓  "${item.spanish}"`
    : `오답 ✗  정답: "${item.spanish}"`;

  document.getElementById('quizInput').disabled = true;

  const isLast = quizIndex === QUIZ_SIZE - 1;
  const nextBtn = document.getElementById('quizNextBtn');
  nextBtn.textContent = isLast ? '결과 보기 →' : '다음 →';
  nextBtn.classList.remove('hidden');
  updateQuizProgress();
}

function advanceQuiz() {
  if (quizIndex === QUIZ_SIZE - 1) {
    showResults();
  } else {
    quizIndex++;
    updateQuizProgress();
    renderQuizQuestion();
  }
}

function showResults() {
  document.getElementById('quizMode').classList.add('hidden');
  document.getElementById('resultsScreen').classList.remove('hidden');

  const total = quizResults.length;
  const correct = quizResults.filter(r => r.isCorrect).length;
  const wrong = total - correct;
  const pct = Math.round((correct / total) * 100);

  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressText').textContent = `${total} / ${total}`;

  const emoji = pct === 100 ? '🎉' : pct >= 80 ? '👍' : pct >= 60 ? '😊' : pct >= 40 ? '😅' : '💪';
  document.getElementById('resultsEmoji').textContent = emoji;
  document.getElementById('resultsScore').textContent = `${correct} / ${total}`;
  document.getElementById('resultsPct').textContent = `${pct}점`;

  const correctItems = quizResults.filter(r => r.isCorrect);
  const wrongItems = quizResults.filter(r => !r.isCorrect);

  document.getElementById('correctList-count').textContent = `(${correctItems.length})`;
  document.getElementById('wrongList-count').textContent = `(${wrongItems.length})`;

  const correctList = document.getElementById('correctList');
  correctList.innerHTML = correctItems.map(r =>
    `<li><span class="res-korean">${r.word.korean}</span> → <span class="res-spanish">${r.word.spanish}</span></li>`
  ).join('');

  const wrongList = document.getElementById('wrongList');
  wrongList.innerHTML = wrongItems.map(r =>
    `<li>
      <span class="res-korean">${r.word.korean}</span>
      <span class="res-mine">${r.userInput ? `입력: "${r.userInput}"` : '(미입력)'}</span>
      <span class="res-answer">정답: "${r.word.spanish}"</span>
    </li>`
  ).join('');
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
document.getElementById('quizNextBtn').addEventListener('click', advanceQuiz);
document.getElementById('quizInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (document.getElementById('quizInput').disabled) advanceQuiz();
    else checkQuiz();
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => showMode(tab.dataset.mode));
});

document.getElementById('retryBtn').addEventListener('click', startQuiz);
document.getElementById('shuffleCheck').addEventListener('change', startSession);

loadWords();
