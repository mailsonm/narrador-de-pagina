/**
 * Suíte de Testes Unitários TDD - Motor do Narrador de Página
 * Execução: node --test tests/test_narrador_engine.js
 */

const test = require('node:test');
const assert = require('node:assert');

// Importa os módulos do motor da extensão
const { cleanHtmlForSpeech, extractMainContentText } = require('../lib/text-extractor.js');
const { splitTextIntoSentences, calculateReadingStats, PlayerStateMachine } = require('../lib/sentence-splitter.js');

test('1. Limpeza de HTML para Fala (cleanHtmlForSpeech)', (t) => {
    const rawHtml = `
        <article class="post">
            <header><h1>Título do Artigo</h1></header>
            <nav class="breadcrumb"><a href="#">Home</a> > Notícias</nav>
            <div class="entry-content">
                <p>Este é o primeiro parágrafo com um <a href="https://example.com">link importante</a>.</p>
                <div class="ad-banner"><img src="ad.jpg" alt="Anúncio"></div>
                <script>console.log("deve sumir");</script>
                <style>.hide { display: none; }</style>
                <p>Segundo parágrafo com <strong>ênfase</strong> e informações.</p>
            </div>
            <div class="social-share"><button>Compartilhar no X</button></div>
            <footer>Rodapé do post com direitos autorais.</footer>
        </article>
    `;

    const cleaned = cleanHtmlForSpeech(rawHtml);

    assert.ok(cleaned.includes('Título do Artigo'), 'Deve incluir o título');
    assert.ok(cleaned.includes('Este é o primeiro parágrafo com um link importante.'), 'Deve manter texto com links');
    assert.ok(cleaned.includes('Segundo parágrafo com ênfase e informações.'), 'Deve manter o segundo parágrafo');
    assert.strictEqual(cleaned.includes('console.log'), false, 'Não deve conter scripts');
    assert.strictEqual(cleaned.includes('Compartilhar'), false, 'Não deve conter botões sociais');
    assert.strictEqual(cleaned.includes('Anúncio'), false, 'Não deve conter anúncios');
});

test('2. Segmentação de Sentenças Anti-Travamento (splitTextIntoSentences)', (t) => {
    const text = "O Dr. Silva chegou às 14h. Ele apresentou a pesquisa sobre I.A. no evento, ex.: novas técnicas! O resultado foi incrível? Sim, com certeza; todos aplaudiram.";

    const sentences = splitTextIntoSentences(text);

    assert.ok(sentences.length >= 3, 'Deve segmentar o texto em múltiplas sentenças');
    assert.ok(sentences[0].includes('Dr. Silva'), 'Não deve quebrar incorretamente em abreviações como Dr.');
    assert.ok(sentences.every(s => s.trim().length > 0), 'Nenhuma sentença deve estar vazia');
});

test('3. Cálculo de Estatísticas de Leitura (calculateReadingStats)', (t) => {
    // 280 palavras (~2 minutos em 1.0x)
    const words = Array(280).fill('palavra').join(' ');
    
    const stats1x = calculateReadingStats(words, 1.0);
    assert.strictEqual(stats1x.wordCount, 280, 'Contagem de palavras precisa');
    assert.strictEqual(stats1x.estimatedMinutes, 2, 'Tempo estimado correto em 1.0x');

    const stats2x = calculateReadingStats(words, 2.0);
    assert.strictEqual(stats2x.estimatedMinutes, 1, 'Tempo estimado reduzido pela metade em 2.0x');
});

test('4. Máquina de Estados do Player (PlayerStateMachine)', (t) => {
    const chunks = ['Frase 1.', 'Frase 2.', 'Frase 3.', 'Frase 4.'];
    const player = new PlayerStateMachine(chunks);

    assert.strictEqual(player.getState(), 'IDLE', 'Estado inicial deve ser IDLE');
    assert.strictEqual(player.getCurrentIndex(), 0, 'Índice inicial 0');

    player.play();
    assert.strictEqual(player.getState(), 'PLAYING', 'Estado deve mudar para PLAYING');

    player.pause();
    assert.strictEqual(player.getState(), 'PAUSED', 'Estado deve mudar para PAUSED');

    player.resume();
    assert.strictEqual(player.getState(), 'PLAYING', 'Estado deve retornar para PLAYING');

    player.nextChunk();
    assert.strictEqual(player.getCurrentIndex(), 1, 'Deve avançar para índice 1');
    assert.strictEqual(player.getCurrentChunk(), 'Frase 2.', 'Chunk atual deve ser Frase 2.');

    player.prevChunk();
    assert.strictEqual(player.getCurrentIndex(), 0, 'Deve retroceder para índice 0');

    player.seekChunk(3);
    assert.strictEqual(player.getCurrentIndex(), 3, 'Deve buscar diretamente o índice 3');
    assert.strictEqual(player.getProgressPercentage(), 100, 'Progresso deve ser 100% no último chunk');

    player.stop();
    assert.strictEqual(player.getState(), 'STOPPED', 'Estado deve ser STOPPED');
    assert.strictEqual(player.getCurrentIndex(), 0, 'Índice deve reiniciar após stop');
});

test('5. Validação de Payload e Decisão do Motor OpenAI TTS (lib/openai-tts.js)', (t) => {
    const { buildOpenAIPayload, shouldUseOpenAI } = require('../lib/openai-tts.js');

    // Teste de decisão de motor
    assert.strictEqual(shouldUseOpenAI({ ttsEngine: 'openai', openaiApiKey: 'sk-proj-123456789' }), true, 'Deve usar OpenAI quando engine for openai e chave válida');
    assert.strictEqual(shouldUseOpenAI({ ttsEngine: 'browser', openaiApiKey: 'sk-proj-123456789' }), false, 'Deve usar browser quando engine for browser');
    assert.strictEqual(shouldUseOpenAI({ ttsEngine: 'openai', openaiApiKey: '' }), false, 'Deve fazer fallback quando chave vazia');

    // Teste de payload
    const payload = buildOpenAIPayload('Olá, mundo!', {
        openaiModel: 'tts-1-hd',
        openaiVoice: 'nova',
        rate: 1.25
    });

    assert.strictEqual(payload.input, 'Olá, mundo!');
    assert.strictEqual(payload.model, 'tts-1-hd');
    assert.strictEqual(payload.voice, 'nova');
    assert.strictEqual(payload.speed, 1.25);
    assert.strictEqual(payload.response_format, 'mp3');
});

