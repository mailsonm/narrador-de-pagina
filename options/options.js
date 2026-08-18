/**
 * Narrador de Página - Options Script (v2.0 Híbrido)
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('options-form');
    const saveStatus = document.getElementById('save-status');

    // Motores
    const engineRadios = document.querySelectorAll('input[name="ttsEngine"]');
    const cardBrowser = document.getElementById('card-engine-browser');
    const cardOpenAI = document.getElementById('card-engine-openai');
    const sectionOpenAI = document.getElementById('section-openai-settings');

    // Campos OpenAI
    const openaiKeyInput = document.getElementById('openai-key');
    const openaiVoiceSelect = document.getElementById('openai-voice');
    const openaiModelSelect = document.getElementById('openai-model');
    const btnToggleKey = document.getElementById('btn-toggle-key-visibility');
    const btnTestOpenAI = document.getElementById('btn-test-openai');
    const testOpenAIStatus = document.getElementById('test-openai-status');

    // Campos Navegador
    const langSelect = document.getElementById('lang-select');
    const voiceSelect = document.getElementById('voice-select');
    const rateInput = document.getElementById('rate-input');
    const rateVal = document.getElementById('rate-val');
    const pitchInput = document.getElementById('pitch-input');
    const pitchVal = document.getElementById('pitch-val');

    // Toggles Visuais
    const autoHighlight = document.getElementById('auto-highlight');
    const floatingPlayer = document.getElementById('floating-player');
    const selectionBubble = document.getElementById('selection-bubble');

    let allVoices = [];

    // Alternar visibilidade dos cards de motor
    function updateEngineUI(selectedEngine) {
        if (selectedEngine === 'openai') {
            cardOpenAI.classList.add('active');
            cardBrowser.classList.remove('active');
            sectionOpenAI.style.display = 'block';
        } else {
            cardBrowser.classList.add('active');
            cardOpenAI.classList.remove('active');
            sectionOpenAI.style.display = 'none';
        }
    }

    engineRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateEngineUI(e.target.value);
        });
    });

    // Mostrar/ocultar senha da chave de API
    btnToggleKey.addEventListener('click', () => {
        if (openaiKeyInput.type === 'password') {
            openaiKeyInput.type = 'text';
            btnToggleKey.textContent = '🔒';
        } else {
            openaiKeyInput.type = 'password';
            btnToggleKey.textContent = '👁️';
        }
    });

    // Testar voz da OpenAI
    btnTestOpenAI.addEventListener('click', async () => {
        const key = openaiKeyInput.value.trim();
        if (!key) {
            testOpenAIStatus.textContent = '⚠️ Insira uma chave de API primeiro.';
            testOpenAIStatus.className = 'test-status error';
            return;
        }

        testOpenAIStatus.textContent = '⏳ Gerando áudio de teste com a OpenAI...';
        testOpenAIStatus.className = 'test-status loading';
        btnTestOpenAI.disabled = true;

        try {
            const blob = await fetchOpenAIAudioBlob('Olá! Esta é uma demonstração da voz neural de alta fidelidade da OpenAI no Narrador de Página.', {
                openaiApiKey: key,
                openaiVoice: openaiVoiceSelect.value,
                openaiModel: openaiModelSelect.value,
                rate: parseFloat(rateInput.value)
            });

            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.play();

            testOpenAIStatus.textContent = '✅ Áudio reproduzido com sucesso!';
            testOpenAIStatus.className = 'test-status success';
        } catch (err) {
            console.error(err);
            testOpenAIStatus.textContent = `❌ Falha: ${err.message}`;
            testOpenAIStatus.className = 'test-status error';
        } finally {
            btnTestOpenAI.disabled = false;
        }
    });

    // Carrega vozes do navegador
    function populateVoices() {
        if (!('speechSynthesis' in window)) return;
        allVoices = window.speechSynthesis.getVoices();
        if (!allVoices.length) return;

        voiceSelect.innerHTML = '<option value="">Automático (Melhor Voz Neural / Natural)</option>';

        allVoices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = `${v.name} (${v.lang})${v.default ? ' [Padrão]' : ''}`;
            voiceSelect.appendChild(opt);
        });

        // Restaura a voz selecionada salva
        chrome.storage.sync.get(['narradorSettings'], (res) => {
            if (res.narradorSettings && res.narradorSettings.voiceURI) {
                voiceSelect.value = res.narradorSettings.voiceURI;
            }
        });
    }

    populateVoices();
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    // Carrega opções salvas no storage
    chrome.storage.sync.get(['narradorSettings'], (res) => {
        const s = res.narradorSettings || {};
        
        // Motor TTS
        const engine = s.ttsEngine || 'browser';
        const targetRadio = document.querySelector(`input[name="ttsEngine"][value="${engine}"]`);
        if (targetRadio) targetRadio.checked = true;
        updateEngineUI(engine);

        // OpenAI
        if (s.openaiApiKey) openaiKeyInput.value = s.openaiApiKey;
        if (s.openaiVoice) openaiVoiceSelect.value = s.openaiVoice;
        if (s.openaiModel) openaiModelSelect.value = s.openaiModel;

        // Navegador
        if (s.lang) langSelect.value = s.lang;
        if (s.rate) {
            rateInput.value = s.rate;
            rateVal.textContent = `${s.rate}x`;
        }
        if (s.pitch) {
            pitchInput.value = s.pitch;
            pitchVal.textContent = s.pitch;
        }
        autoHighlight.checked = s.autoHighlight !== false;
        floatingPlayer.checked = s.floatingPlayer !== false;
        selectionBubble.checked = s.selectionBubble !== false;
    });

    // Atualiza badges numéricos em tempo real
    rateInput.addEventListener('input', (e) => {
        rateVal.textContent = `${e.target.value}x`;
    });

    pitchInput.addEventListener('input', (e) => {
        pitchVal.textContent = e.target.value;
    });

    // Salvar configurações
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const selectedEngineRadio = document.querySelector('input[name="ttsEngine"]:checked');
        const selectedEngine = selectedEngineRadio ? selectedEngineRadio.value : 'browser';

        const updatedSettings = {
            ttsEngine: selectedEngine,
            openaiApiKey: openaiKeyInput.value.trim(),
            openaiVoice: openaiVoiceSelect.value,
            openaiModel: openaiModelSelect.value,
            lang: langSelect.value,
            voiceURI: voiceSelect.value,
            rate: parseFloat(rateInput.value),
            pitch: parseFloat(pitchInput.value),
            autoHighlight: autoHighlight.checked,
            floatingPlayer: floatingPlayer.checked,
            selectionBubble: selectionBubble.checked
        };

        chrome.storage.sync.set({ narradorSettings: updatedSettings }, () => {
            saveStatus.textContent = '✅ Configurações salvas com sucesso!';
            saveStatus.style.opacity = '1';
            setTimeout(() => {
                saveStatus.style.opacity = '0';
            }, 3000);
        });
    });
});
