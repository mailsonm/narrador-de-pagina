/**
 * Narrador de Página - Módulo de IA OpenAI TTS
 */

(function (global) {
    if (global.buildOpenAIPayload) return;

    const VALID_VOICES = ['nova', 'shimmer', 'alloy', 'echo', 'onyx', 'fable'];
    const VALID_MODELS = ['tts-1', 'tts-1-hd'];

    /**
     * Verifica se as configurações indicam o uso do motor OpenAI TTS
     * @param {Object} settings Objeto de configurações
     * @returns {boolean}
     */
    function shouldUseOpenAI(settings) {
        if (!settings || typeof settings !== 'object') return false;
        const isEngineOpenAI = settings.ttsEngine === 'openai';
        const hasKey = typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.trim().length > 10;
        return isEngineOpenAI && hasKey;
    }

    /**
     * Monta o payload JSON sanitizado para a API da OpenAI
     * @param {string} text Texto a ser sintetizado
     * @param {Object} settings Configurações da extensão
     * @returns {Object} Payload para o endpoint /v1/audio/speech
     */
    function buildOpenAIPayload(text, settings = {}) {
        const model = VALID_MODELS.includes(settings.openaiModel) ? settings.openaiModel : 'tts-1';
        const voice = VALID_VOICES.includes(settings.openaiVoice) ? settings.openaiVoice : 'nova';
        const rawSpeed = parseFloat(settings.rate || 1.0);
        const speed = Math.max(0.25, Math.min(4.0, isNaN(rawSpeed) ? 1.0 : rawSpeed));

        return {
            model,
            input: String(text || '').trim(),
            voice,
            speed,
            response_format: 'mp3'
        };
    }

    /**
     * Realiza a requisição fetch para a API da OpenAI e retorna um Blob de áudio MP3
     * @param {string} text Texto do chunk
     * @param {Object} settings Configurações com a chave
     * @returns {Promise<Blob>}
     */
    async function fetchOpenAIAudioBlob(text, settings = {}) {
        if (!settings.openaiApiKey) {
            throw new Error('Chave de API da OpenAI não informada.');
        }

        const payload = buildOpenAIPayload(text, settings);

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.openaiApiKey.trim()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            const msg = errorJson.error?.message || `Erro HTTP ${response.status} na OpenAI`;
            throw new Error(msg);
        }

        return await response.blob();
    }

    global.shouldUseOpenAI = shouldUseOpenAI;
    global.buildOpenAIPayload = buildOpenAIPayload;
    global.fetchOpenAIAudioBlob = fetchOpenAIAudioBlob;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            shouldUseOpenAI,
            buildOpenAIPayload,
            fetchOpenAIAudioBlob
        };
    }
})(typeof window !== 'undefined' ? window : global);
