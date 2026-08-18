/**
 * Narrador de Página - Options Script
 */

document.addEventListener('DOMContentLoaded', () => {
    const langSelect = document.getElementById('lang-select');
    const voiceSelect = document.getElementById('voice-select');
    const rateInput = document.getElementById('rate-input');
    const rateVal = document.getElementById('rate-val');
    const pitchInput = document.getElementById('pitch-input');
    const pitchVal = document.getElementById('pitch-val');
    const autoHighlight = document.getElementById('auto-highlight');
    const floatingPlayer = document.getElementById('floating-player');
    const selectionBubble = document.getElementById('selection-bubble');
    const form = document.getElementById('options-form');
    const saveStatus = document.getElementById('save-status');

    let allVoices = [];

    // Carrega vozes do navegador
    function populateVoices() {
        if (!('speechSynthesis' in window)) return;
        allVoices = window.speechSynthesis.getVoices();
        if (!allVoices.length) return;

        const currentLang = langSelect.value.split('-')[0].toLowerCase();
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

    // Carrega opções salvas
    chrome.storage.sync.get(['narradorSettings'], (res) => {
        const s = res.narradorSettings || {};
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

        const updatedSettings = {
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
