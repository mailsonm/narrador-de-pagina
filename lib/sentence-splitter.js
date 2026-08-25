/**
 * Narrador de Página - Segmentador de Sentenças, Tokenizador e Máquina de Estados do Player
 */

(function (global) {
    if (global.splitTextIntoSentences && global.getSentenceWords) return;

    var COMMON_ABBREVIATIONS = [
        'dr', 'dra', 'sr', 'sra', 'prof', 'profa', 'ex', 'etc', 'vs',
        'i.a', 'e.g', 'i.e', 'mr', 'mrs', 'ms', 'p.ex', 'art', 'cap', 'av',
        'obs', 'pag', 'pág', 'dept', 'cia', 'ltda', 'min', 'seg', 'km', 'kg'
    ];

    /**
     * Extrai as palavras de uma sentença com suas posições de caracteres, limpeza de pontuação
     * e estimativa de sílabas/pesos fonéticos para sincronização do Karaokê.
     * @param {string} sentence Frase de entrada
     * @returns {Array<{ word: string, cleanWord: string, startChar: number, endChar: number, syllables: number, index: number }>}
     */
    function getSentenceWords(sentence) {
        if (!sentence || typeof sentence !== 'string') return [];

        const words = [];
        // Captura sequências de caracteres sem espaços em branco
        const regex = /[^\s]+/g;
        let match;
        let idx = 0;

        while ((match = regex.exec(sentence)) !== null) {
            const rawWord = match[0];
            const startChar = match.index;
            const endChar = startChar + rawWord.length;

            // Remove pontuação de borda, aspas normais e tipográficas, parênteses, colchetes
            const cleanWord = rawWord.replace(/^[\p{P}\p{S}“"'(<«]+|[\p{P}\p{S}”"')>»]+$/gu, '') || rawWord;

            // Estimativa prosódica de sílabas / duração da pronúncia
            let syllables = 1;
            if (/^[A-Z0-9]{2,}$/.test(cleanWord)) {
                // Acrônimos (ex: LLM, GLM, GPT, TTS) são soletrados letra a letra
                syllables = Math.max(2, cleanWord.length * 2.0);
            } else if (/\d/.test(cleanWord)) {
                // Números e decimais (ex: 3.8, 5.3, 2026) são pronunciados como palavras completas
                syllables = Math.max(2, cleanWord.length * 1.8);
            } else {
                // Contagem de núcleos vocálicos na palavra
                const vowelMatches = cleanWord.toLowerCase().match(/[aeiouyáéíóúâêîôûãõàü]+/gi);
                syllables = vowelMatches ? vowelMatches.length : Math.max(1, Math.round(cleanWord.length / 3));
            }

            words.push({
                word: rawWord,
                cleanWord: cleanWord,
                startChar: startChar,
                endChar: endChar,
                syllables: Math.max(1, syllables),
                index: idx++
            });
        }

        return words;
    }

    /**
     * Segmenta um texto em sentenças naturais com proteção de números decimais, versões,
     * domínios, reticências, abreviações e limite de tamanho.
     * @param {string} text Texto puro de entrada
     * @param {number} maxChunkLength Tamanho máximo sugerido por chunk (~200 chars, 0 para ilimitado)
     * @returns {string[]} Lista de sentenças/chunks para síntese de voz
     */
    function splitTextIntoSentences(text, maxChunkLength = 0) {
        if (!text || typeof text !== 'string') return [];

        let processed = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
        if (!processed) return [];

        // 1. Protege reticências (...) ou caractere único (…)
        processed = processed.replace(/\.{3,}/g, '___ELLIPSIS___');
        processed = processed.replace(/…/g, '___ELLIPSIS___');

        // 2. Protege números decimais (ex: 3.8, 5.3, 10.50, 0.001)
        processed = processed.replace(/(\d+)\.(\d+)/g, '$1___DECIMALDOT___$2');

        // 3. Protege números de versão complexos (ex: v2.0.1, 19.0.0)
        processed = processed.replace(/(\b[vV]?\d+)\.(\d+)/g, '$1___DECIMALDOT___$2');

        // 4. Protege domínios e extensões comuns (ex: akitaonrails.com, hostnet.com.br, node.js)
        processed = processed.replace(/\b([a-zA-Z0-9_-]+)\.(com|org|net|br|gov|io|edu|ai|app|dev|co|me|online|tech|js|ts|html|css|php|py|json)\b/gi, '$1___DOMAINDOT___$2');

        // 5. Protege abreviações comuns
        COMMON_ABBREVIATIONS.forEach(abbr => {
            const regex = new RegExp(`\\b(${abbr})\\.(\\s+|$)`, 'gi');
            processed = processed.replace(regex, '$1___ABBRDOT___$2');
        });

        // 6. Protege siglas com pontos (ex: I.A., U.S.A., E.U.A.)
        processed = processed.replace(/([A-ZÀ-Ú])\.([A-ZÀ-Ú])\.?/g, (m, p1, p2) => `${p1}___ACRDOT___${p2}___ACRDOT___`);

        // 7. Divide por pontuação final (. ! ? ; \n ou quebras de parágrafo) incluindo aspas de fechamento e parênteses
        const rawSentences = processed.match(/[^.!?;\n]+[.!?;\n]+["'”’\)\]\s]*/g) || [processed];
        const sentences = [];

        for (let s of rawSentences) {
            // Restaura todos os marcadores protegidos
            s = s
                .replace(/___DECIMALDOT___/g, '.')
                .replace(/___DOMAINDOT___/g, '.')
                .replace(/___ABBRDOT___/g, '.')
                .replace(/___ACRDOT___/g, '.')
                .replace(/___ELLIPSIS___/g, '...')
                .trim();

            if (!s) continue;

            // Se maxChunkLength > 0 e a frase for longa, divide em orações por vírgulas ou travessões
            if (maxChunkLength > 0 && s.length > maxChunkLength) {
                const clauses = s.split(/([,;:—\-]\s+)/);
                let chunk = '';
                for (let part of clauses) {
                    if ((chunk + part).length > maxChunkLength && chunk.length > 0) {
                        sentences.push(chunk.trim());
                        chunk = part;
                    } else {
                        chunk += part;
                    }
                }
                if (chunk.trim()) {
                    sentences.push(chunk.trim());
                }
            } else {
                sentences.push(s);
            }
        }

        return sentences.filter(s => s.length > 0);
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

    global.getSentenceWords = getSentenceWords;
    global.splitTextIntoSentences = splitTextIntoSentences;
    global.calculateReadingStats = calculateReadingStats;
    global.PlayerStateMachine = PlayerStateMachine;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            getSentenceWords,
            splitTextIntoSentences,
            calculateReadingStats,
            PlayerStateMachine
        };
    }
})(typeof window !== 'undefined' ? window : global);
