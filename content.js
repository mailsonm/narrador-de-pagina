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
    let playerEl = null;
    let bubbleEl = null;

    // Carrega preferências
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

    if (synth) {
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = loadVoices;
        }
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
                synth.cancel();
                playChunk(currentChunkIndex);
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
    // MOTOR DE LEITURA
    // ==========================================
    function readArticleContent() {
        let text = '';
        if (typeof extractMainContentText === 'function') {
            text = extractMainContentText(document);
        } else {
            text = document.body.innerText;
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
            chunks = splitTextIntoSentences(text, 180);
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

    function playChunk(index) {
        if (!isPlaying || index >= chunks.length) {
            stopReading();
            return;
        }

        currentChunkIndex = index;
        updatePlayerUI();
        highlightCurrentText(chunks[index]);

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

        currentUtterance.onend = () => {
            if (isPlaying && !isPaused) {
                playChunk(index + 1);
            }
        };

        currentUtterance.onerror = (e) => {
            // 'interrupted' e 'canceled' são eventos normais disparados quando o áudio é pausado/parado ou avançado
            if (e.error === 'interrupted' || e.error === 'canceled') {
                return;
            }
            console.warn('Narrador chunk speech error:', e.error || e);
            if (isPlaying && !isPaused) {
                playChunk(index + 1);
            }
        };

        if (synth.paused) {
            synth.resume();
        }

        synth.speak(currentUtterance);
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
        synth.pause();
        isPaused = true;
        updatePlayerUI();
    }

    function resumeReading() {
        if (!isPlaying) return;
        synth.resume();
        isPaused = false;
        updatePlayerUI();
    }

    function stopReading() {
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
            synth.cancel();
            playChunk(currentChunkIndex - 1);
        }
    }

    function nextChunk() {
        if (currentChunkIndex < chunks.length - 1) {
            synth.cancel();
            playChunk(currentChunkIndex + 1);
        } else {
            stopReading();
        }
    }

    // ==========================================
    // DESTAQUE VISUAL (KARAOKÊ)
    // ==========================================
    function highlightCurrentText(sentence) {
        if (!settings.autoHighlight) return;
        removeHighlight();

        if (!sentence || sentence.length < 5) return;

        // Procura nó de texto compatível
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement && (
                        node.parentElement.closest('#narrador-floating-player') ||
                        node.parentElement.closest('#narrador-selection-bubble') ||
                        ['SCRIPT', 'STYLE', 'NAV'].includes(node.parentElement.tagName)
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const searchSnippet = sentence.substring(0, Math.min(30, sentence.length)).trim();
        let targetNode = null;

        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.includes(searchSnippet)) {
                targetNode = walker.currentNode;
                break;
            }
        }

        if (targetNode && targetNode.parentElement) {
            const parent = targetNode.parentElement;
            parent.classList.add('narrador-highlight-container');
            currentHighlightMark = parent;
            parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function removeHighlight() {
        if (currentHighlightMark) {
            currentHighlightMark.classList.remove('narrador-highlight-container');
            currentHighlightMark = null;
        }
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
