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

test('6. Proteção de Decimais, Versões, Domínios e Reticências (splitTextIntoSentences)', (t) => {
    const akitaText = "Semana passada eu publiquei a rodada com Qwen 3.8, GLM 5.3, Gemini 3.7 e Grok 4.6 no meu benchmark v2: a prova em três fases que endurece um app Rails 8 de chat com LLM. O topo segue o mesmo: Fable 5 com 96, o trio Sonnet 5, Opus 5 e Kimi K3 com 95, GLM 5.3 sozinho com 94, e o pelotão dos 93 logo atrás. Acesse akitaonrails.com para mais detalhes... não perca!";

    const sentences = splitTextIntoSentences(akitaText);

    // Deve conter as frases completas sem quebrar nos pontos de 3.8, 5.3, 3.7, 4.6, akitaonrails.com ou ...
    assert.strictEqual(sentences.length, 3, 'Deve segmentar em exatamente 3 sentenças completas');
    assert.ok(sentences[0].includes('Qwen 3.8, GLM 5.3, Gemini 3.7 e Grok 4.6'), 'Não deve quebrar números decimais');
    assert.ok(sentences[1].includes('GLM 5.3 sozinho com 94'), 'Não deve quebrar decimais na segunda frase');
    assert.ok(sentences[2].includes('akitaonrails.com para mais detalhes... não perca!'), 'Deve preservar domínios e reticências');
});

test('7. Tokenização de Palavras com Offsets para Karaokê (getSentenceWords)', (t) => {
    const { getSentenceWords } = require('../lib/sentence-splitter.js');
    const sentence = "Olá, mundo! Teste de Karaokê 2.0.";

    const words = getSentenceWords(sentence);

    assert.strictEqual(words.length, 6, 'Deve extrair 6 tokens de palavras');
    assert.strictEqual(words[0].word, 'Olá,');
    assert.strictEqual(words[0].cleanWord, 'Olá');
    assert.strictEqual(words[0].startChar, 0);
    assert.strictEqual(words[0].endChar, 4);

    assert.strictEqual(words[1].word, 'mundo!');
    assert.strictEqual(words[1].cleanWord, 'mundo');
    assert.strictEqual(words[1].startChar, 5);
    assert.strictEqual(words[1].endChar, 11);

    assert.strictEqual(words[5].word, '2.0.');
    assert.strictEqual(words[5].cleanWord, '2.0');
    assert.strictEqual(sentence.substring(words[5].startChar, words[5].endChar), '2.0.');
});


