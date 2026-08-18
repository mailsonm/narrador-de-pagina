/**
 * Narrador de Página - Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
    const playBtn = document.getElementById('btn-toggle-play');
    const stopBtn = document.getElementById('btn-stop-all');
    const speedSelect = document.getElementById('speed-select');
    const statusText = document.getElementById('status-text');
    const optionsBtn = document.getElementById('btn-open-options');
    const playText = playBtn.querySelector('.action-text');
    const playIcon = playBtn.querySelector('.action-icon');

    // Abre opções
    optionsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });

    // Consulta status atual da aba ativa
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) return;
        const tabId = tabs[0].id;

        chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' }, (res) => {
            if (chrome.runtime.lastError || !res) {
                statusText.textContent = 'Pronto para ler';
                return;
            }

            if (res.rate) {
                speedSelect.value = String(res.rate);
            }

            if (res.isPlaying && !res.isPaused) {
                setPlayingState(true, res.currentIndex, res.totalChunks);
            } else if (res.isPlaying && res.isPaused) {
                setPausedState();
            } else {
                setIdleState();
            }
        });
    });

    // Alternar Leitura (Play / Pause)
    playBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0] || !tabs[0].id) return;
            const tabId = tabs[0].id;

            function sendToggle() {
                chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_READING' }, (res) => {
                    if (chrome.runtime.lastError || !res) {
                        statusText.textContent = 'Iniciando leitura...';
                        return;
                    }
                    if (res.isPlaying && !res.isPaused) {
                        setPlayingState(true);
                    } else if (res.isPaused) {
                        setPausedState();
                    } else {
                        setIdleState();
                    }
                });
            }

            // Testa se a aba já responde; se não, injeta os scripts e tenta novamente
            chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' }, (res) => {
                if (chrome.runtime.lastError) {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        files: ['lib/text-extractor.js', 'lib/sentence-splitter.js', 'content.js']
                    }).then(() => {
                        chrome.scripting.insertCSS({
                            target: { tabId },
                            files: ['content.css']
                        }).then(() => {
                            setTimeout(sendToggle, 150);
                        });
                    }).catch(err => {
                        console.warn('Falha ao injetar script:', err);
                        sendToggle();
                    });
                } else {
                    sendToggle();
                }
            });
        });
    });

    // Parar Leitura
    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0] || !tabs[0].id) return;
            const tabId = tabs[0].id;

            chrome.tabs.sendMessage(tabId, { action: 'STOP_READING' }, () => {
                setIdleState();
            });
        });
    });

    // Ajustar Velocidade
    speedSelect.addEventListener('change', (e) => {
        const rate = parseFloat(e.target.value);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs[0] || !tabs[0].id) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: 'SET_SPEED', rate });
        });
    });

    function setPlayingState(playing, index = 0, total = 0) {
        playIcon.textContent = '⏸️';
        playText.textContent = 'Pausar Leitura';
        playBtn.classList.add('btn-active');
        if (total > 0) {
            statusText.textContent = `Lendo frase ${index + 1} de ${total}...`;
        } else {
            statusText.textContent = 'Narrando artigo...';
        }
    }

    function setPausedState() {
        playIcon.textContent = '▶️';
        playText.textContent = 'Continuar Leitura';
        playBtn.classList.remove('btn-active');
        statusText.textContent = 'Leitura pausada';
    }

    function setIdleState() {
        playIcon.textContent = '🔊';
        playText.textContent = 'Ouvir esta Página';
        playBtn.classList.remove('btn-active');
        statusText.textContent = 'Pronto para narrar';
    }
});
