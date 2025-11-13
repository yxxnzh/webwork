const quotes = [
  'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.',
  'There is nothing more deceptive than an obvious fact.',
  'I ought to know by this time that when a fact appears to be opposed to a long train of deductions it invariably proves to be capable of bearing some other interpretation.',
  'I never make exceptions. An exception disproves the rule.',
  'What one man can invent another can discover.',
  'Nothing clears up a case so much as stating it to another person.',
  'Education never ends, Watson. It is a series of lessons, with the greatest for the last.',
];

const quoteElement = document.getElementById('quote');
const messageElement = document.getElementById('message');
const typedValueElement = document.getElementById('typed-value');
const startButton = document.getElementById('start');

const modal = document.getElementById('result-modal');
const modalCurrent = document.getElementById('modal-current');
const modalBest = document.getElementById('modal-best');
const closeModalBtn = document.getElementById('close-modal');

let words = [];
let wordIndex = 0;
let startTime = 0;
let typingTimer;

// local storage 추가
const BEST_KEY = 'typingGameBestTime';

function getBestTime() {
  const saved = localStorage.getItem(BEST_KEY);
  return saved ? parseFloat(saved) : null;
}

function setBestTime(sec) {
  localStorage.setItem(BEST_KEY, String(sec));
}

// 시작
function startGame() {
  startButton.disabled = true;
  startButton.classList.add('disabled');

  const quoteIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[quoteIndex];
  words = quote.split(' ');
  wordIndex = 0;

  const spanWords = words.map((word) => `<span>${word} </span>`);
  quoteElement.innerHTML = spanWords.join('');
  quoteElement.childNodes[0].className = 'highlight';

  messageElement.innerText = '';
  typedValueElement.value = '';
  typedValueElement.className = '';
  typedValueElement.disabled = false;
  typedValueElement.focus();

  startTime = new Date().getTime();

  typedValueElement.removeEventListener('input', onInput);
  typedValueElement.addEventListener('input', onInput);
}

function onInput() {
  if (!words.length) return;

  const currentWord = words[wordIndex];
  const typedValue = typedValueElement.value;

  typedValueElement.classList.add('typing');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    typedValueElement.classList.remove('typing');
  }, 150);


  if (typedValue === currentWord && wordIndex === words.length - 1) {
    const elapsedTime = new Date().getTime() - startTime;
    const seconds = parseFloat((elapsedTime / 1000).toFixed(2));

    messageElement.innerHTML = `🏆 CONGRATULATIONS! You finished in ${seconds.toFixed(
      2
    )} seconds.`;

    const bestTime = getBestTime();
    let bestText = '';

    if (bestTime === null || seconds < bestTime) {
      setBestTime(seconds);
      bestText = `🥇 New best time: ${seconds.toFixed(2)} s`;
    } else {
      bestText = `Best time: ${bestTime.toFixed(2)} s`;
    }
    modalCurrent.textContent = `Your time: ${seconds.toFixed(2)} s`;
    modalBest.textContent = bestText;
    modal.classList.remove('hidden');

    typedValueElement.disabled = true;
    typedValueElement.classList.remove('error');

    startButton.disabled = false;
    startButton.classList.remove('disabled');

    return;
  }
  if (typedValue.endsWith(' ') && typedValue.trim() === currentWord) {
    typedValueElement.value = '';
    wordIndex++;

    quoteElement.childNodes.forEach((w) => (w.className = ''));
    quoteElement.childNodes[wordIndex].className = 'highlight';
    typedValueElement.classList.remove('error');
  }
  else if (currentWord.startsWith(typedValue)) {
    typedValueElement.classList.remove('error');
  }
  else {
    typedValueElement.classList.add('error');
  }
}

closeModalBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});
startButton.addEventListener('click', startGame);