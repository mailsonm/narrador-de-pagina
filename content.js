/**
 * Narrador de Página - Content Script Principal
 * Injetado em todas as páginas para extração, leitura e player flutuante.
 */

(function () {
    if (window.__narradorExtensionLoaded) return;
    window.__narradorExtensionLoaded = true;

    // Estado da Extensão
    let settings = {
        lang: 'pt-BR',
        rate: 1.0,
        pitch: 1.0,
        voiceURI: '',
        autoHighlight: true,
        floatingPlayer: true,
        selectionBubble: true
    };

    let synth = window.speechSynthesis;
    let selectedVoice = null;
    let chunks = [];
    let currentChunkIndex = 0;
    let isPlaying = false;
    let isPaused = false;
    let currentUtterance = null;
    let currentHighlightMark = null;
    let activeAudio = null;
    let playerEl = null;
    let bubbleEl = null;

    // Estado do Karaokê e DOM Range
    let currentSentenceRange = null;
    let currentWordRanges = [];
    let currentWordsList = [];
    let activeWordIndex = -1;
    let syncTimer = null;
    let syncStartTime = 0;
    let wordTimings = [];

    // Carrega preferências do usuário
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['narradorSettings'], (res) => {
            if (res.narradorSettings) {
                settings = Object.assign(settings, res.narradorSettings);
            }
            loadVoices();
        });
    }

    function loadVoices() {
        if (!synth) return;
        const voices = synth.getVoices();
        if (!voices.length) return;

        const langPrefix = (settings.lang || 'pt-BR').split('-')[0].toLowerCase();
        const matchingVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

        // Prioriza voz personalizada ou vozes neurais / naturais
        if (settings.voiceURI) {
            selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
        }
        if (!selectedVoice) {
            selectedVoice = matchingVoices.find(v => 
                v.name.includes('Natural') || 
                v.name.includes('Online') || 
                v.name.includes('Neural') || 
                v.name.includes('Google')
            ) || matchingVoices[0] || voices[0];
        }
    }

    if (synth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }

    // Cria elementos da UI na página
    createFloatingPlayer();
    createSelectionBubble();

    // ==========================================
    // MENSAGENS DO BACKGROUND & POPUP
    // ==========================================
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'READ_ARTICLE') {
            readArticleContent();
            sendResponse({ success: true, state: isPlaying ? 'PLAYING' : 'IDLE' });
        } else if (msg.action === 'READ_SELECTION') {
            if (msg.text) {
                startReadingText(msg.text);
            }
            sendResponse({ success: true });
        } else if (msg.action === 'TOGGLE_READING') {
            toggleReading();
            sendResponse({ success: true, isPlaying, isPaused });
        } else if (msg.action === 'STOP_READING') {
            stopReading();
            sendResponse({ success: true });
        } else if (msg.action === 'SET_SPEED') {
            settings.rate = parseFloat(msg.rate || 1.0);
            if (isPlaying && !isPaused) {
                if (activeAudio) activeAudio.playbackRate = settings.rate;
                else {
                    synth.cancel();
                    playChunk(currentChunkIndex);
                }
            }
            sendResponse({ success: true });
        } else if (msg.action === 'GET_STATUS') {
            sendResponse({
                isPlaying,
                isPaused,
                currentChunk: chunks[currentChunkIndex] || '',
                totalChunks: chunks.length,
                currentIndex: currentChunkIndex,
                rate: settings.rate
            });
        }
    });

    // ==========================================
    // CONTROLE DE FLUXO E REPRODUÇÃO HÍBRIDA
    // ==========================================
    function readArticleContent() {
        let text = '';
        if (typeof extractMainContentText === 'function') {
            text = extractMainContentText(document);
        } else {
            text = document.body ? document.body.innerText : '';
        }

        if (!text || text.trim().length < 20) {
            text = document.title + '. ' + (document.body ? document.body.innerText : '');
        }

        startReadingText(text);
    }

    function startReadingText(text) {
        stopReading();
        if (!text || !text.trim()) return;

        if (typeof splitTextIntoSentences === 'function') {
            chunks = splitTextIntoSentences(text, 250);
        } else {
            chunks = text.split(/[.!?;\n]+/).map(s => s.trim()).filter(Boolean);
        }

        if (!chunks.length) return;

        currentChunkIndex = 0;
        isPlaying = true;
        isPaused = false;

        showFloatingPlayer();
        updatePlayerUI();
        playChunk(0);
    }

    async function playChunk(index) {
        if (!isPlaying || index >= chunks.length) {
            stopReading();
            return;
        }

        currentChunkIndex = index;
        updatePlayerUI();
        highlightCurrentText(chunks[index]);

        // Verifica se o motor configurado é a OpenAI TTS
        if (typeof shouldUseOpenAI === 'function' && shouldUseOpenAI(settings)) {
            try {
                await playChunkOpenAI(index);
                return;
            } catch (err) {
                console.warn('Falha no motor OpenAI TTS, alternando automaticamente para motor nativo:', err);
            }
        }

        // Motor padrão: Web Speech API (Navegador)
        playChunkBrowser(index);
    }

    async function playChunkOpenAI(index) {
        if (activeAudio) {
            activeAudio.pause();
            activeAudio = null;
        }
        stopKaraokeSync();

        const blob = await fetchOpenAIAudioBlob(chunks[index], settings);
        if (!isPlaying || currentChunkIndex !== index) return;

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        activeAudio = audio;
        audio.playbackRate = settings.rate || 1.0;

        // Inicia temporizador de Karaokê proporcional e sincronizado com o áudio
        audio.onplay = () => {
            startKaraokeSync(chunks[index], audio.duration ? (audio.duration * 1000) / (settings.rate || 1.0) : 0);
        };

        audio.ontimeupdate = () => {
            if (audio.duration && isPlaying && !isPaused) {
                const elapsedMs = (audio.currentTime / (settings.rate || 1.0)) * 1000;
                syncKaraokeToTime(chunks[index], elapsedMs);
            }
        };

        audio.onended = () => {
            stopKaraokeSync();
            URL.revokeObjectURL(audioUrl);
            activeAudio = null;
            if (isPlaying && !isPaused) {
                playChunk(index + 1);
            }
        };

        audio.onerror = () => {
            stopKaraokeSync();
            URL.revokeObjectURL(audioUrl);
            activeAudio = null;
            playChunkBrowser(index);
        };

        await audio.play();
    }

    function playChunkBrowser(index) {
        stopKaraokeSync();
        if (!selectedVoice) {
            loadVoices();
        }

        currentUtterance = new SpeechSynthesisUtterance(chunks[index]);
        currentUtterance.lang = settings.lang || 'pt-BR';
        currentUtterance.rate = settings.rate || 1.0;
        currentUtterance.pitch = settings.pitch || 1.0;
        if (selectedVoice) {
            try {
                currentUtterance.voice = selectedVoice;
            } catch (err) {
                console.warn('Narrador voice assign error:', err);
            }
        }

        // Proteção contra Garbage Collector do Chrome
        window._narradorUtterance = currentUtterance;

        // Inicia sincronização híbrida preditiva (garante que vozes sem onboundary funcionem com precisão)
        currentUtterance.onstart = () => {
            startKaraokeSync(chunks[index]);
        };

        // Destaque de Karaokê por Palavra em Tempo Real (quando disparado pelo navegador)
        currentUtterance.onboundary = (event) => {
            if (event.name === 'word' && isPlaying && !isPaused) {
                highlightWord(chunks[index], event.charIndex);
                // Calibra o temporizador preditivo em tempo real
                calibrateKaraokeSync(event.charIndex);
            }
        };

        currentUtterance.onend = () => {
            stopKaraokeSync();
            if (isPlaying && !isPaused) {
                playChunk(index + 1);
            }
        };

        currentUtterance.onerror = (e) => {
            stopKaraokeSync();
            if (e.error === 'interrupted' || e.error === 'canceled') {
                return;
            }
            console.warn('Narrador chunk speech error:', e.error || e);
            if (isPlaying && !isPaused) {
                playChunk(index + 1);
            }
        };

        if (synth && synth.paused) {
            synth.resume();
        }

        if (synth) {
            synth.speak(currentUtterance);
        }
    }

    function toggleReading() {
        if (!isPlaying) {
            readArticleContent();
        } else if (isPaused) {
            resumeReading();
        } else {
            pauseReading();
        }
    }

    function pauseReading() {
        if (!isPlaying) return;
        if (activeAudio) {
            activeAudio.pause();
        }
        if (synth) {
            synth.pause();
        }
        stopKaraokeSync();
        isPaused = true;
        updatePlayerUI();
    }

    function resumeReading() {
        if (!isPlaying) return;
        if (activeAudio) {
            activeAudio.play().catch(() => {});
        }
        if (synth && synth.paused) {
            synth.resume();
        }
        startKaraokeSync(chunks[currentChunkIndex]);
        isPaused = false;
        updatePlayerUI();
    }

    function stopReading() {
        stopKaraokeSync();
        if (activeAudio) {
            activeAudio.pause();
            activeAudio.src = '';
            activeAudio = null;
        }
        if (synth) synth.cancel();
        isPlaying = false;
        isPaused = false;
        currentChunkIndex = 0;
        removeHighlight();
        updatePlayerUI();
        hideFloatingPlayer();
    }

    function prevChunk() {
        if (currentChunkIndex > 0) {
            stopKaraokeSync();
            if (activeAudio) {
                activeAudio.pause();
                activeAudio = null;
            }
            if (synth) synth.cancel();
            playChunk(currentChunkIndex - 1);
        }
    }

    function nextChunk() {
        if (currentChunkIndex < chunks.length - 1) {
            stopKaraokeSync();
            if (activeAudio) {
                activeAudio.pause();
                activeAudio = null;
            }
            if (synth) synth.cancel();
            playChunk(currentChunkIndex + 1);
        } else {
            stopReading();
        }
    }

    // ==========================================
    // MOTOR DE SINCRONIZAÇÃO E TIMING DO KARAOKÊ
    // ==========================================
    function setupWordTimings(sentence, totalDurationMs = 0) {
        wordTimings = [];
        const words = currentWordsList || (typeof getSentenceWords === 'function' ? getSentenceWords(sentence) : []);
        if (!words.length) return;

        const effectiveRate = settings.rate || 1.0;
        let cumulativeMs = 0;

        // Modelo acústico aprimorado: pesos por caracteres, acrônimos, números e pausas de pontuação
        const weights = words.map(w => {
            const raw = w.word;
            const clean = w.cleanWord;
            let weight = Math.max(3, clean.length);

            // Acrônimos em maiúsculas (ex: LLM, GLM, GPT, API) -> mais sílabas soletradas
            if (/^[A-Z0-9]{2,}$/.test(clean)) {
                weight += clean.length * 2.2;
            }
            // Números e decimais (ex: 3.8, 5.3, 0731, 2026) -> pronúncia com várias palavras
            else if (/\d/.test(clean)) {
                weight += 8;
            }

            // Pausas naturais de pontuação
            if (/[,;:\-]/.test(raw)) weight += 5;
            if (/[.!?]/.test(raw)) weight += 8;

            return weight;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const totalMs = totalDurationMs > 0 ? totalDurationMs : (totalWeight * 52) / effectiveRate;

        for (let i = 0; i < words.length; i++) {
            const duration = (weights[i] / totalWeight) * totalMs;
            wordTimings.push({
                wordObj: words[i],
                startMs: cumulativeMs,
                endMs: cumulativeMs + duration
            });
            cumulativeMs += duration;
        }
    }

    function startKaraokeSync(sentence, totalDurationMs = 0) {
        stopKaraokeSync();
        if (!sentence) return;

        setupWordTimings(sentence, totalDurationMs);
        syncStartTime = performance.now();

        // Destaca a primeira palavra imediatamente
        if (currentWordsList && currentWordsList.length > 0) {
            highlightWord(sentence, currentWordsList[0].startChar);
        }

        syncTimer = setInterval(() => {
            if (!isPlaying || isPaused) return;
            const elapsed = performance.now() - syncStartTime;
            syncKaraokeToTime(sentence, elapsed);
        }, 35);
    }

    function syncKaraokeToTime(sentence, elapsedMs) {
        if (!wordTimings.length) return;

        for (let i = 0; i < wordTimings.length; i++) {
            const wt = wordTimings[i];
            if (elapsedMs >= wt.startMs && elapsedMs < wt.endMs) {
                if (activeWordIndex !== i) {
                    highlightWord(sentence, wt.wordObj.startChar);
                }
                return;
            }
        }
    }

    function calibrateKaraokeSync(charIndex) {
        if (!wordTimings.length) return;
        const idx = wordTimings.findIndex(wt => wt.wordObj.startChar === charIndex);
        if (idx !== -1) {
            const targetMs = wordTimings[idx].startMs;
            syncStartTime = performance.now() - targetMs;
        }
    }

    function stopKaraokeSync() {
        if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        }
    }

    // ==========================================
    // LOCALIZAÇÃO E DESTAQUE NO DOM DA PÁGINA
    // ==========================================
    function findTextRangeInDOM(root, targetText) {
        if (!targetText || !root) return null;
        const normalizedTarget = targetText.replace(/\s+/g, ' ').trim();
        if (!normalizedTarget) return null;

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement && (
                        node.parentElement.closest('#narrador-floating-player') ||
                        node.parentElement.closest('#narrador-selection-bubble') ||
                        ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].includes(node.parentElement.tagName)
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let fullString = '';
        const nodeMap = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const val = node.nodeValue;
            const start = fullString.length;
            fullString += val;
            const end = fullString.length;
            nodeMap.push({ node, start, end, val });
        }

        if (!nodeMap.length) return null;

        const lowerFull = fullString.toLowerCase();
        const lowerTarget = normalizedTarget.toLowerCase();

        let matchIdx = lowerFull.indexOf(lowerTarget);
        let matchLength = normalizedTarget.length;

        if (matchIdx === -1) {
            const prefix = lowerTarget.substring(0, Math.min(25, lowerTarget.length));
            matchIdx = lowerFull.indexOf(prefix);
            matchLength = prefix.length;
        }

        if (matchIdx === -1) return null;

        const matchEnd = matchIdx + matchLength;
        let startNode = null, startOffset = 0;
        let endNode = null, endOffset = 0;

        for (const item of nodeMap) {
            if (!startNode && matchIdx >= item.start && matchIdx < item.end) {
                startNode = item.node;
                startOffset = matchIdx - item.start;
            }
            if (matchEnd > item.start && matchEnd <= item.end) {
                endNode = item.node;
                endOffset = matchEnd - item.start;
                break;
            }
        }

        if (!startNode) return null;
        if (!endNode) {
            endNode = nodeMap[nodeMap.length - 1].node;
            endOffset = endNode.nodeValue.length;
        }

        try {
            const range = new Range();
            range.setStart(startNode, Math.min(startOffset, startNode.nodeValue.length));
            range.setEnd(endNode, Math.min(endOffset, endNode.nodeValue.length));
            return range;
        } catch (e) {
            return null;
        }
    }

    function getWordRanges(sentenceRange, sentenceText) {
        if (!sentenceRange) return [];

        const words = currentWordsList || (typeof getSentenceWords === 'function' ? getSentenceWords(sentenceText) : []);
        if (!words.length) return [];

        const root = sentenceRange.commonAncestorContainer;
        const walker = document.createTreeWalker(
            root.nodeType === Node.TEXT_NODE ? root.parentNode : root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!sentenceRange.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodeSpans = [];
        let accumulated = 0;

        while (walker.nextNode()) {
            const node = walker.currentNode;
            let startInNode = 0;
            let endInNode = node.nodeValue.length;

            if (node === sentenceRange.startContainer) {
                startInNode = sentenceRange.startOffset;
            }
            if (node === sentenceRange.endContainer) {
                endInNode = sentenceRange.endOffset;
            }

            const visibleLength = Math.max(0, endInNode - startInNode);
            nodeSpans.push({
                node,
                startInNode,
                endInNode,
                strStart: accumulated,
                strEnd: accumulated + visibleLength
            });
            accumulated += visibleLength;
        }

        const wordRanges = [];

        for (const w of words) {
            let startNode = null, startOff = 0;
            let endNode = null, endOff = 0;

            for (const span of nodeSpans) {
                if (!startNode && w.startChar >= span.strStart && w.startChar < span.strEnd) {
                    startNode = span.node;
                    startOff = span.startInNode + (w.startChar - span.strStart);
                }
                if (w.endChar > span.strStart && w.endChar <= span.strEnd) {
                    endNode = span.node;
                    endOff = span.startInNode + (w.endChar - span.strStart);
                    break;
                }
            }

            if (startNode && endNode) {
                try {
                    const r = new Range();
                    r.setStart(startNode, Math.min(startOff, startNode.nodeValue.length));
                    r.setEnd(endNode, Math.min(endOff, endNode.nodeValue.length));
                    wordRanges.push({
                        word: w.word,
                        cleanWord: w.cleanWord,
                        startChar: w.startChar,
                        endChar: w.endChar,
                        range: r
                    });
                } catch (e) {}
            }
        }

        return wordRanges;
    }

    function highlightCurrentText(sentence) {
        if (!settings.autoHighlight) return;
        removeHighlight();

        if (!sentence || sentence.length < 2) return;

        // Limpa seleções manuais antigas para não sobrepor o karaokê
        try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) sel.removeAllRanges();
        } catch (e) {}

        currentWordsList = typeof getSentenceWords === 'function' ? getSentenceWords(sentence) : [];
        currentSentenceRange = findTextRangeInDOM(document.body, sentence);

        if (currentSentenceRange) {
            currentWordRanges = getWordRanges(currentSentenceRange, sentence);

            // Destaque da sentença via CSS Custom Highlight API
            if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
                try {
                    CSS.highlights.set('narrador-sentence', new Highlight(currentSentenceRange));
                } catch (e) {}
            }

            const container = currentSentenceRange.startContainer.parentElement;
            if (container) {
                currentHighlightMark = container;
                if (typeof CSS === 'undefined' || !CSS.highlights) {
                    container.classList.add('narrador-highlight-container');
                }
                smoothScrollToElement(container);
            }
        }
    }

    function highlightWord(sentence, charIndex) {
        if (!settings.autoHighlight || !sentence || charIndex === undefined) return;

        if (!currentWordsList || !currentWordsList.length) {
            currentWordsList = typeof getSentenceWords === 'function' ? getSentenceWords(sentence) : [];
        }

        // Localiza a palavra ativa correspondente
        let matchedWord = null;
        let matchedIdx = -1;

        for (let i = 0; i < currentWordsList.length; i++) {
            const w = currentWordsList[i];
            if (charIndex >= w.startChar && charIndex <= w.endChar) {
                matchedWord = w;
                matchedIdx = i;
                break;
            } else if (charIndex < w.startChar) {
                matchedWord = w;
                matchedIdx = i;
                break;
            }
        }

        if (!matchedWord && currentWordsList.length > 0) {
            matchedIdx = currentWordsList.length - 1;
            matchedWord = currentWordsList[matchedIdx];
        }

        if (!matchedWord) return;
        activeWordIndex = matchedIdx;

        // 1. Destaque da palavra no DOM da página web
        if (currentWordRanges && currentWordRanges[matchedIdx]) {
            const wr = currentWordRanges[matchedIdx];
            if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined') {
                try {
                    CSS.highlights.set('narrador-word', new Highlight(wr.range));
                } catch (e) {}
            }
        }

        // 2. Atualiza a prévia visual do Karaokê em tempo real no Player Flutuante
        if (playerEl) {
            const chunkTextEl = playerEl.querySelector('#narrador-chunk-text');
            if (chunkTextEl) {
                const before = sentence.substring(0, matchedWord.startChar);
                const word = sentence.substring(matchedWord.startChar, matchedWord.endChar);
                const after = sentence.substring(matchedWord.endChar);
                chunkTextEl.innerHTML = `${escapeHtml(before)}<span class="narrador-karaoke-word-active">${escapeHtml(word)}</span>${escapeHtml(after)}`;
            }
        }
    }

    function smoothScrollToElement(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        // Rola suavemente apenas se o elemento estiver fora ou muito próximo das bordas da tela
        if (rect.top < 100 || rect.bottom > (viewportHeight - 100)) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function removeHighlight() {
        stopKaraokeSync();
        if (typeof CSS !== 'undefined' && CSS.highlights) {
            try {
                CSS.highlights.delete('narrador-sentence');
                CSS.highlights.delete('narrador-word');
            } catch (e) {}
        }
        if (currentHighlightMark) {
            currentHighlightMark.classList.remove('narrador-highlight-container');
            currentHighlightMark = null;
        }
        document.querySelectorAll('.narrador-highlight-container').forEach(el => {
            el.classList.remove('narrador-highlight-container');
        });
        currentSentenceRange = null;
        currentWordRanges = [];
        currentWordsList = [];
        activeWordIndex = -1;
    }

    // ==========================================
    // PLAYER FLUTUANTE (FLOATING PLAYER UI)
    // ==========================================
    function createFloatingPlayer() {
        if (document.getElementById('narrador-floating-player')) return;

        playerEl = document.createElement('div');
        playerEl.id = 'narrador-floating-player';
        playerEl.className = 'narrador-player-hidden';
        playerEl.innerHTML = `
            <div class="narrador-drag-handle" title="Arraste o player">
                <span class="narrador-logo-icon">🎙️</span>
                <span class="narrador-title-badge">Narrador</span>
                <button type="button" class="narrador-btn-close" id="narrador-close-btn" title="Fechar">✕</button>
            </div>
            <div class="narrador-controls-body">
                <div class="narrador-chunk-preview" id="narrador-chunk-text">Pronto para ler...</div>
                
                <div class="narrador-buttons-row">
                    <button type="button" class="narrador-icon-btn" id="narrador-prev-btn" title="Frase anterior">⏮️</button>
                    <button type="button" class="narrador-icon-btn narrador-main-btn" id="narrador-play-pause-btn" title="Play/Pause">▶️</button>
                    <button type="button" class="narrador-icon-btn" id="narrador-next-btn" title="Próxima frase">⏭️</button>
                    <button type="button" class="narrador-icon-btn" id="narrador-stop-btn" title="Parar">⏹️</button>
                    
                    <select class="narrador-speed-select" id="narrador-speed-ctl" title="Velocidade">
                        <option value="0.75">0.75x</option>
                        <option value="1.0" selected>1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2.0">2.0x</option>
                    </select>
                </div>

                <div class="narrador-progress-wrapper">
                    <div class="narrador-progress-track">
                        <div class="narrador-progress-bar" id="narrador-progress-bar" style="width: 0%;"></div>
                    </div>
                    <span class="narrador-progress-info" id="narrador-progress-label">0%</span>
                </div>
            </div>
        `;

        document.body.appendChild(playerEl);

        // Eventos dos botões
        playerEl.querySelector('#narrador-play-pause-btn').addEventListener('click', () => {
            if (isPlaying && !isPaused) pauseReading();
            else if (isPlaying && isPaused) resumeReading();
            else readArticleContent();
        });

        playerEl.querySelector('#narrador-stop-btn').addEventListener('click', stopReading);
        playerEl.querySelector('#narrador-prev-btn').addEventListener('click', prevChunk);
        playerEl.querySelector('#narrador-next-btn').addEventListener('click', nextChunk);
        playerEl.querySelector('#narrador-close-btn').addEventListener('click', stopReading);

        const speedSelect = playerEl.querySelector('#narrador-speed-ctl');
        speedSelect.value = String(settings.rate || 1.0);
        speedSelect.addEventListener('change', (e) => {
            settings.rate = parseFloat(e.target.value);
            if (isPlaying && !isPaused) {
                synth.cancel();
                playChunk(currentChunkIndex);
            }
        });
    }

    function showFloatingPlayer() {
        if (playerEl) {
            playerEl.classList.remove('narrador-player-hidden');
            playerEl.classList.add('narrador-player-visible');
        }
    }

    function hideFloatingPlayer() {
        if (playerEl) {
            playerEl.classList.remove('narrador-player-visible');
            playerEl.classList.add('narrador-player-hidden');
        }
    }

    function updatePlayerUI() {
        if (!playerEl) return;
        const playBtn = playerEl.querySelector('#narrador-play-pause-btn');
        const chunkText = playerEl.querySelector('#narrador-chunk-text');
        const progressBar = playerEl.querySelector('#narrador-progress-bar');
        const progressLabel = playerEl.querySelector('#narrador-progress-label');

        if (isPlaying && !isPaused) {
            playBtn.textContent = '⏸️';
        } else {
            playBtn.textContent = '▶️';
        }

        if (chunks.length && chunks[currentChunkIndex]) {
            chunkText.textContent = chunks[currentChunkIndex];
            const pct = Math.round(((currentChunkIndex + 1) / chunks.length) * 100);
            progressBar.style.width = `${pct}%`;
            progressLabel.textContent = `${pct}% (${currentChunkIndex + 1}/${chunks.length})`;
        } else {
            chunkText.textContent = 'Pronto para ler...';
            progressBar.style.width = '0%';
            progressLabel.textContent = '0%';
        }
    }

    // ==========================================
    // BALÃO FLUTUANTE DE SELEÇÃO DE TEXTO
    // ==========================================
    function createSelectionBubble() {
        bubbleEl = document.createElement('button');
        bubbleEl.id = 'narrador-selection-bubble';
        bubbleEl.className = 'narrador-bubble-hidden';
        bubbleEl.innerHTML = '🔊 Ouvir';
        document.body.appendChild(bubbleEl);

        let selectedText = '';

        document.addEventListener('mouseup', (e) => {
            if (!settings.selectionBubble) return;
            if (bubbleEl.contains(e.target) || (playerEl && playerEl.contains(e.target))) return;

            const selection = window.getSelection();
            selectedText = selection ? selection.toString().trim() : '';

            if (selectedText.length > 3) {
                const rect = selection.getRangeAt(0).getBoundingClientRect();
                bubbleEl.style.top = `${window.scrollY + rect.top - 40}px`;
                bubbleEl.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 35}px`;
                bubbleEl.classList.remove('narrador-bubble-hidden');
                bubbleEl.classList.add('narrador-bubble-visible');
            } else {
                bubbleEl.classList.remove('narrador-bubble-visible');
                bubbleEl.classList.add('narrador-bubble-hidden');
            }
        });

        bubbleEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedText) {
                startReadingText(selectedText);
                bubbleEl.classList.remove('narrador-bubble-visible');
                bubbleEl.classList.add('narrador-bubble-hidden');
            }
        });
    }
})();

