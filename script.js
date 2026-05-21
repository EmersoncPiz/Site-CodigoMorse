document.addEventListener("DOMContentLoaded", () => {

// ============================================================
// MAPA MORSE
// ============================================================
const MORSE_MAP = {
    'A':'·–','B':'–···','C':'–·–·','D':'–··','E':'·',
    'F':'··–·','G':'––·','H':'····','I':'··','J':'·–––',
    'K':'–·–','L':'·–··','M':'––','N':'–·','O':'–––',
    'P':'·––·','Q':'––·–','R':'·–·','S':'···','T':'–',
    'U':'··–','V':'···–','W':'·––','X':'–··–','Y':'–·––',
    'Z':'––··',
    '0':'–––––','1':'·––––','2':'··–––','3':'···––','4':'····–',
    '5':'·····','6':'–····','7':'––···','8':'–––··','9':'––––·',
    '.':'·–·–·–',',':'––··––','?':'··––··',"'":'·––––·',
    '!':'–·–·––','/':'–··–·','(':'–·––·',')':'–·––·–',
    '&':'·–···',':':'–––···',';':'–·–·–·','=':'–···–',
    '+':'·–·–·','-':'–····–','_':'··––·–','"':'·–··–·',
    '$':'···–··–','@':'·––·–·'
};

const REVERSE_MAP = {};
for (const [char, morse] of Object.entries(MORSE_MAP)) {
    REVERSE_MAP[morse] = char;
}

// ============================================================
// AUDIO — velocidad más lenta para apreciar punto vs traço
// unit = 0.18s (antes era 0.08s)
// ============================================================
function playMorseString(morseString, unit, onEnd) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const u = unit || 0.18;
    const ctx = new AudioContext();
    const freq = 600;
    let time = ctx.currentTime + 0.05;
    let total = 0;

    for (const token of morseString) {
        if (token === '·') {
            beep(ctx, freq, time, u);
            time += u + u * 0.4;
            total += u * 1.4;
        } else if (token === '–') {
            beep(ctx, freq, time, u * 3);
            time += u * 3 + u * 0.4;
            total += u * 3.4;
        } else if (token === ' ') {
            time += u * 2;
            total += u * 2;
        } else if (token === '/') {
            time += u * 4;
            total += u * 4;
        }
    }

    if (onEnd) setTimeout(onEnd, (total + 0.3) * 1000);
    setTimeout(() => ctx.close(), (total + 0.6) * 1000);
}

function beep(ctx, freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.01);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ============================================================
// 1. EFECTO 3D IMÁGENES
// ============================================================
document.querySelectorAll('.tilt-box').forEach(box => {
    const defaultRotate = parseFloat(box.getAttribute('data-default-rotate')) || 0;
    box.addEventListener('mousemove', (e) => {
        const rect = box.getBoundingClientRect();
        const rotateX = (((e.clientY - rect.top) / rect.height) - 0.5) * -30;
        const rotateY = (((e.clientX - rect.left) / rect.width) - 0.5) * 30;
        box.style.transition = 'none';
        box.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${defaultRotate}deg) scale3d(1.05,1.05,1.05)`;
    });
    box.addEventListener('mouseleave', () => {
        box.style.transition = 'transform 0.5s ease';
        box.style.transform = `rotateZ(${defaultRotate}deg)`;
    });
});

// ============================================================
// 2. SCROLL SUAVE
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        const id = this.getAttribute('href');
        if (id === '#') return;
        e.preventDefault();
        const target = document.querySelector(id);
        if (!target) return;
        const start = window.scrollY;
        const end = target.getBoundingClientRect().top + start;
        const dist = end - start;
        const dur = 1200;
        let t0 = null;
        function step(now) {
            if (!t0) t0 = now;
            const p = Math.min((now - t0) / dur, 1);
            const ease = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
            window.scrollTo(0, start + dist * ease);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
});

// ============================================================
// 3. TABELAS — celdas con audio LENTO (unit = 0.2s)
// ============================================================
function buildCell(char, morse) {
    const cell = document.createElement('div');
    cell.className = 'morse-cell';
    cell.innerHTML = `<span class="morse-char">${char}</span><span class="morse-code">${morse}</span>`;
    cell.addEventListener('click', () => {
        if (cell.classList.contains('playing')) return;
        cell.classList.add('playing');
        // unit = 0.20s para tabelas → diferencia clara punto/traço
        playMorseString(morse, 0.20, () => cell.classList.remove('playing'));
    });
    return cell;
}

const alphabetTable = document.getElementById('alphabetTable');
if (alphabetTable) {
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l =>
        alphabetTable.appendChild(buildCell(l, MORSE_MAP[l]))
    );
}
const numbersTable = document.getElementById('numbersTable');
if (numbersTable) {
    '0123456789'.split('').forEach(n =>
        numbersTable.appendChild(buildCell(n, MORSE_MAP[n]))
    );
}
const punctTable = document.getElementById('punctTable');
if (punctTable) {
    ['.', ',', '?', "'", '!', '/', '(', ')', '&', ':', ';', '=', '+', '-', '_', '"', '$', '@'].forEach(p => {
        if (MORSE_MAP[p]) punctTable.appendChild(buildCell(p, MORSE_MAP[p]));
    });
}

// ============================================================
// 4. TRADUTOR
// ============================================================
const input       = document.getElementById('translatorInput');
const outputDiv   = document.getElementById('translatorOutput');
const inputLabel  = document.getElementById('inputLabel');
const outputLabel = document.getElementById('outputLabel');
const btnTM       = document.getElementById('btnTextToMorse');
const btnMT       = document.getElementById('btnMorseToText');
const clearBtn    = document.getElementById('clearBtn');
const copyInBtn   = document.getElementById('copyInputBtn');
const copyOutBtn  = document.getElementById('copyOutputBtn');
const playBtn     = document.getElementById('playBtn');

let mode = 'textToMorse';
let currentOutput = '';

function textToMorse(text) {
    return text.toUpperCase().split(' ').map(word =>
        word.split('').map(c => MORSE_MAP[c] || '').filter(Boolean).join(' ')
    ).join(' / ');
}
function morseToText(morse) {
    return morse.split(' / ').map(word =>
        word.split(' ').map(code => REVERSE_MAP[code] || '?').join('')
    ).join(' ');
}

function updateTranslation() {
    const val = input.value.trim();
    if (!val) {
        outputDiv.innerHTML = '<span class="output-placeholder">A tradução aparece aqui...</span>';
        currentOutput = '';
        return;
    }
    currentOutput = mode === 'textToMorse' ? textToMorse(val) : morseToText(val);
    outputDiv.textContent = currentOutput;
}

if (input) input.addEventListener('input', updateTranslation);

function setMode(m) {
    mode = m;
    if (m === 'textToMorse') {
        btnTM.classList.add('active'); btnMT.classList.remove('active');
        inputLabel.textContent = 'Digite seu texto';
        outputLabel.textContent = 'Código Morse';
        input.placeholder = 'Olá mundo...';
        if (playBtn) playBtn.style.display = '';
    } else {
        btnMT.classList.add('active'); btnTM.classList.remove('active');
        inputLabel.textContent = 'Digite o Código Morse';
        outputLabel.textContent = 'Texto decodificado';
        input.placeholder = '··· ––– ··· / ··· ·– ···';
        if (playBtn) playBtn.style.display = 'none';
    }
    input.value = '';
    outputDiv.innerHTML = '<span class="output-placeholder">A tradução aparece aqui...</span>';
    currentOutput = '';
}

if (btnTM) btnTM.addEventListener('click', () => setMode('textToMorse'));
if (btnMT) btnMT.addEventListener('click', () => setMode('morseToText'));

if (clearBtn) clearBtn.addEventListener('click', () => {
    input.value = '';
    outputDiv.innerHTML = '<span class="output-placeholder">A tradução aparece aqui...</span>';
    currentOutput = '';
});

if (copyInBtn) copyInBtn.addEventListener('click', () => {
    if (!input.value) return;
    navigator.clipboard.writeText(input.value);
    copyInBtn.textContent = 'COPIADO!';
    setTimeout(() => copyInBtn.textContent = 'COPIAR', 1500);
});
if (copyOutBtn) copyOutBtn.addEventListener('click', () => {
    if (!currentOutput) return;
    navigator.clipboard.writeText(currentOutput);
    copyOutBtn.textContent = 'COPIADO!';
    setTimeout(() => copyOutBtn.textContent = 'COPIAR', 1500);
});

if (playBtn) {
    playBtn.addEventListener('click', () => {
        if (mode !== 'textToMorse' || !currentOutput) return;
        playBtn.textContent = '⏸ TOCANDO...';
        playBtn.disabled = true;
        // Tradutor usa velocidad normal (0.13s)
        playMorseString(currentOutput, 0.13, () => {
            playBtn.textContent = '▶ OUVIR';
            playBtn.disabled = false;
        });
    });
}

});

// ============================================================
// BOTÃO VOLTAR AO TOPO — aparece após 300px de scroll
// ============================================================
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}, { passive: true });

backToTop.addEventListener('click', () => {
    const start = window.scrollY;
    const duration = 1200;
    let t0 = null;
    function step(now) {
        if (!t0) t0 = now;
        const p = Math.min((now - t0) / duration, 1);
        const ease = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2) / 2;
        window.scrollTo(0, start * (1 - ease));
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
});