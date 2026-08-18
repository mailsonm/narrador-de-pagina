/**
 * Narrador de Página - Motor de Extração e Limpeza de Texto
 */

/**
 * Limpa uma string HTML, removendo scripts, styles, anúncios, navs, botões e comentários.
 * @param {string} html 
 * @returns {string} Texto puro higienizado
 */
function cleanHtmlForSpeech(html) {
    if (!html || typeof html !== 'string') return '';

    // Remove scripts, styles, iframes, noscript
    let clean = html.replace(/<(script|style|iframe|noscript)[^>]*?>[\s\S]*?<\/\1>/gi, '');

    // Remove navegação, rodapés de página, formulários e botões
    clean = clean.replace(/<(nav|footer|form|button)[^>]*?>[\s\S]*?<\/\1>/gi, '');

    // Remove containers de anúncios e botões sociais
    clean = clean.replace(/<div\s+class=["'][^"']*(?:ad-banner|social-share|sharedaddy|comments-area|disqus)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');

    // Insere espaços em tags de bloco para evitar aglutinação de palavras
    clean = clean.replace(/<(p|div|br|li|h[1-6]|tr|td|th|article|section)[^>]*>/gi, ' $0');
    clean = clean.replace(/<\/(p|div|li|h[1-6]|tr|td|th|article|section)>/gi, '$0 ');

    // Remove todas as tags HTML restantes
    clean = clean.replace(/<[^>]+>/g, ' ');

    // Decodifica entidades HTML comuns
    clean = clean
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // Normaliza múltiplos espaços em branco e ajusta pontuação
    clean = clean.replace(/\s+/g, ' ');
    clean = clean.replace(/\s+([.,!?;:])/g, '$1');
    return clean.trim();
}

/**
 * Extrai o texto do artigo principal a partir do DOM (navegador).
 * @param {Document} doc Objeto Document do DOM
 * @returns {string} Texto limpo extraído do melhor nó de conteúdo
 */
function extractMainContentText(doc = typeof document !== 'undefined' ? document : null) {
    if (!doc) return '';

    // Lista de seletores prioritários de artigo e conteúdo
    const selectors = [
        'article',
        '[role="main"]',
        'main',
        '.entry-content',
        '.post-content',
        '.article-content',
        '.wp-block-post-content',
        '.elementor-widget-theme-post-content',
        '#content',
        '#main-content',
        '.content'
    ];

    let targetElement = null;
    for (const sel of selectors) {
        const el = doc.querySelector(sel);
        const textLen = (el && (el.innerText || el.textContent || '')) ? (el.innerText || el.textContent).trim().length : 0;
        if (el && textLen > 100) {
            targetElement = el;
            break;
        }
    }

    if (!targetElement) {
        targetElement = doc.body;
    }

    if (!targetElement) return '';

    // Extrai o conteúdo usando cleanHtmlForSpeech para garantir remoção de scripts/anúncios
    let extracted = cleanHtmlForSpeech(targetElement.innerHTML || '');

    // Se o texto extraído for muito curto, tenta o innerText/textContent direto do body
    if (!extracted || extracted.length < 30) {
        if (doc.body && doc.body.innerText) {
            extracted = doc.body.innerText.replace(/\s+/g, ' ').trim();
        } else if (doc.body && doc.body.textContent) {
            extracted = cleanHtmlForSpeech(doc.body.innerHTML || doc.body.textContent);
        }
    }

    return extracted;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        cleanHtmlForSpeech,
        extractMainContentText
    };
}
