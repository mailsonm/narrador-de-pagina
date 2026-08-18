/**
 * Narrador de Página - Background Service Worker (Manifest V3)
 */

// Inicialização de Menus de Contexto e Preferências Padrão
chrome.runtime.onInstalled.addListener(() => {
    // Menu de contexto para texto selecionado
    chrome.contextMenus.create({
        id: 'narrador-read-selection',
        title: '🔊 Ler texto selecionado',
        contexts: ['selection']
    });

    // Menu de contexto para a página inteira
    chrome.contextMenus.create({
        id: 'narrador-read-article',
        title: '📖 Ler artigo completo',
        contexts: ['page']
    });

    // Inicializa preferências no storage
    chrome.storage.sync.get(['narradorSettings'], (res) => {
        if (!res.narradorSettings) {
            chrome.storage.sync.set({
                narradorSettings: {
                    lang: 'pt-BR',
                    rate: 1.0,
                    pitch: 1.0,
                    voiceURI: '',
                    autoHighlight: true,
                    floatingPlayer: true,
                    selectionBubble: true,
                    openaiApiKey: '',
                    openaiVoice: 'nova'
                }
            });
        }
    });
});

// Manipulador de Cliques no Menu de Contexto
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;

    if (info.menuItemId === 'narrador-read-selection' && info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'READ_SELECTION',
            text: info.selectionText
        }).catch(err => console.warn('Narrador: Tab não pronta:', err));
    } else if (info.menuItemId === 'narrador-read-article') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'READ_ARTICLE'
        }).catch(err => console.warn('Narrador: Tab não pronta:', err));
    }
});

// Manipulador de Atalhos de Teclado
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) return;
        const tabId = tabs[0].id;

        if (command === 'toggle-reading') {
            chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_READING' })
                .catch(err => console.warn('Narrador command error:', err));
        } else if (command === 'stop-reading') {
            chrome.tabs.sendMessage(tabId, { action: 'STOP_READING' })
                .catch(err => console.warn('Narrador command error:', err));
        }
    });
});
