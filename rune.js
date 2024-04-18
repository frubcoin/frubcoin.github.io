// Create a <p> element and append it to the #box element
const p = document.createElement('p');
document.getElementById('box').appendChild(p);

// Set styles for the <p> element to center it within the #box element
p.style.textAlign = 'center'; // Center the text
p.style.margin = 'auto'; // Center the element

// Remaining code remains unchanged
const prefix = '';
const skills = [
  'RUNE CHAOS',
  'ᚱᚢᚾᛖ ᚲᚺᚨᛟᛊ'
].map(s => `${s}`);
const delay = 2;
const step = 1;
const tail = 5;
const timeout = 75;

const colors = [
  '#808080',
  '#dcdcdc',
  '#a9a9a9',
    'black',
  '#696969',
];

function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomRunicChar() {
  const runicChars = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛂ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛋ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛝ', 'ᛟ', 'ᛞ', 'ᚪ', 'ᚫ', 'ᚣ', 'ᛡ', 'ᛠ'];
  return runicChars[Math.floor(Math.random() * runicChars.length)];
}

function getRandomColoredRunicString(n) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const char = document.createElement('span');
    char.textContent = getRandomRunicChar();
    char.style.color = getRandomColor();
    fragment.appendChild(char);
  }
  return fragment;
}

const $ = {
  text: '',
  prefixP: -tail,
  skillI: 0,
  skillP: 0,
  direction: 'forward',
  delay,
  step,
};

function render() {
  const skill = skills[$.skillI];

  if ($.step) {
    $.step--;
  } else {
    $.step = step;
    if ($.prefixP < prefix.length) {
      if ($.prefixP >= 0) {
        $.text += prefix[$.prefixP];
      }
      $.prefixP++;
    } else {
      if ($.direction === 'forward') {
        if ($.skillP < skill.length) {
          $.text += skill[$.skillP];
          $.skillP++;
        } else {
          if ($.delay) {
            $.delay--;
          } else {
            $.direction = 'backward';
            $.delay = delay;
          }
        }
      } else {
        if ($.skillP > 0) {
          $.text = $.text.slice(0, -1);
          $.skillP--;
        } else {
          $.skillI = ($.skillI + 1) % skills.length;
          $.direction = 'forward';
        }
      }
    }
  }

  p.textContent = $.text;
  p.appendChild(getRandomColoredRunicString(
    $.prefixP < prefix.length ?
    Math.min(tail, tail + $.prefixP):
    Math.min(tail, skill.length - $.skillP)
  ));
  setTimeout(render, timeout);
}

setTimeout(render, 500);