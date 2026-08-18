/**
 * Narrador de Página - Segmentador de Sentenças e Máquina de Estados do Player
 */

const COMMON_ABBREVIATIONS = [
    'dr', 'dra', 'sr', 'sra', 'prof', 'profa', 'ex', 'etc', 'vs',
    'i.a', 'e.g', 'i.e', 'mr', 'mrs', 'ms', 'p.ex', 'art', 'cap', 'av'
];

/**
 * Segmenta um texto em sentenças naturais com proteção de abreviações e limite de tamanho.
 * @param {string} text Texto puro de entrada
 * @param {number} maxChunkLength Tamanho máximo sugerido por chunk (~200 chars)
 * @returns {string[]} Lista de sentenças/chunks para síntese de voz
 */
function splitTextIntoSentences(text, maxChunkLength = 0) {
    if (!text || typeof text !== 'string') return [];

    let processed = text.replace(/\s+/g, ' ').trim();
    if (!processed) return [];

    // Protege pontos de abreviações comuns trocando por um marcador temporário
    COMMON_ABBREVIATIONS.forEach(abbr => {
        const regex = new RegExp(`\\b(${abbr})\\.(\\s+)`, 'gi');
        processed = processed.replace(regex, '$1___DOT___$2');
    });

    // Divide por pontuação final (. ! ? ; ou quebras de linha)
    const rawSentences = processed.match(/[^.!?;\n]+[.!?;\n]+/g) || [processed];
    const sentences = rawSentences
        .map(s => s.replace(/___DOT___/g, '.').trim())
        .filter(s => s.length > 0);

    if (maxChunkLength <= 0) {
        return sentences.length ? sentences : [text.trim()];
    }

    // Se maxChunkLength for fornecido, agrupa frases respeitando o limite
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > maxChunkLength && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk = currentChunk ? (currentChunk + ' ' + sentence) : sentence;
        }
    }

    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [processed.replace(/___DOT___/g, '.')];
}

/**
 * Calcula estatísticas de leitura para exibição no player.
 * @param {string} text Texto completo
 * @param {number} speed Multiplicador de velocidade (ex: 1.0, 1.5, 2.0)
 * @returns {{ wordCount: number, estimatedMinutes: number, estimatedSeconds: number }}
 */
function calculateReadingStats(text, speed = 1.0) {
    if (!text) return { wordCount: 0, estimatedMinutes: 0, estimatedSeconds: 0 };

    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const baseWpm = 140; // Média de palavras por minuto em fala natural
    const effectiveWpm = baseWpm * (speed || 1.0);

    const totalMinutes = wordCount / effectiveWpm;
    const estimatedMinutes = Math.max(1, Math.round(totalMinutes));
    const estimatedSeconds = Math.round(totalMinutes * 60);

    return {
        wordCount,
        estimatedMinutes,
        estimatedSeconds
    };
}

/**
 * Máquina de Estados para controlar a reprodução do Player.
 */
class PlayerStateMachine {
    constructor(chunks = []) {
        this.chunks = Array.isArray(chunks) ? chunks : [];
        this.currentIndex = 0;
        this.state = 'IDLE'; // IDLE | PLAYING | PAUSED | STOPPED | FINISHED
    }

    setChunks(chunks) {
        this.chunks = Array.isArray(chunks) ? chunks : [];
        this.currentIndex = 0;
        this.state = 'IDLE';
    }

    getState() {
        return this.state;
    }

    getCurrentIndex() {
        return this.currentIndex;
    }

    getCurrentChunk() {
        return this.chunks[this.currentIndex] || '';
    }

    getTotalChunks() {
        return this.chunks.length;
    }

    getProgressPercentage() {
        if (!this.chunks.length) return 0;
        return Math.min(100, Math.round(((this.currentIndex + 1) / this.chunks.length) * 100));
    }

    play() {
        if (!this.chunks.length) return false;
        this.state = 'PLAYING';
        return true;
    }

    pause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            return true;
        }
        return false;
    }

    resume() {
        if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            return true;
        }
        return false;
    }

    stop() {
        this.state = 'STOPPED';
        this.currentIndex = 0;
        return true;
    }

    nextChunk() {
        if (this.currentIndex < this.chunks.length - 1) {
            this.currentIndex++;
            return true;
        } else {
            this.state = 'FINISHED';
            return false;
        }
    }

    prevChunk() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return true;
        }
        return false;
    }

    seekChunk(index) {
        if (index >= 0 && index < this.chunks.length) {
            this.currentIndex = index;
            return true;
        }
        return false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        splitTextIntoSentences,
        calculateReadingStats,
        PlayerStateMachine
    };
}
