(function (global) {
    if (global.cleanHtmlForSpeech) return;

    /**
     * Limpa uma string HTML, removendo scripts, styles, anúncios, navs, botões e comentários.
     * @param {string} html 
     * @returns {string} Texto puro higienizado
     */
    function cleanHtmlForSpeech(html) {
        if (!html || typeof html !== 'string') return '';

        // Remove scripts, styles, iframes, noscript
        let clean = html.replace(/<(script|style|iframe|noscript)[^>]*?>[\s\S]*?<\/\1>/gi, '');

        // Remove navegação, rodapés de página, formulários, barras de perfil/login e botões
        clean = clean.replace(/<(nav|footer|form|button)[^>]*?>[\s\S]*?<\/\1>/gi, '');

        // Remove containers de anúncios, botões sociais, menus e barras de perfil
        clean = clean.replace(/<(div|section|aside|ul)[^>]*class=["'][^"']*(?:ad-banner|social-share|sharedaddy|comments-area|disqus|navbar|site-header|user-profile-header|breadcrumb|top-nav)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, '');

        // Converte quebras de bloco e títulos em sentenças pontuadas
        clean = clean.replace(/<\/(h[1-6]|p|li|article|section|tr|blockquote)>/gi, '. ');
        clean = clean.replace(/<(br|hr)\s*\/?>/gi, '. ');
        clean = clean.replace(/<(div|p|li|h[1-6]|tr|td|th|article|section)[^>]*>/gi, ' ');
        clean = clean.replace(/<\/(div|td|th)>/gi, ' ');

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

        // Remove pontuações repetidas e ajusta espaçamento
        clean = clean.replace(/\s+/g, ' ');
        clean = clean.replace(/\s*\.+\s*\./g, '.');
        clean = clean.replace(/([!?;:])\s*\./g, '$1');
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

        // Se estiver no DOM do navegador, extrai parágrafos e títulos filtrando navegações
        if (doc.querySelectorAll) {
            const contentNodes = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, dt, dd');
            const validTexts = [];

            for (const node of contentNodes) {
                // Ignora se estiver dentro de menus, rodapés, headers, barras de perfil ou widgets da extensão
                if (node.closest && node.closest('header, nav, footer, aside, .menu, .navbar, .site-header, .user-profile-header, .top-nav, #narrador-floating-player, #narrador-selection-bubble, script, style')) {
                    continue;
                }
                const text = (node.innerText || node.textContent || '').trim();
                if (text.length > 2) {
                    validTexts.push(text);
                }
            }

            if (validTexts.length > 0) {
                return cleanHtmlForSpeech(validTexts.join('. '));
            }
        }

        // Fallback para seletores prioritários de artigo
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
            const el = doc.querySelector ? doc.querySelector(sel) : null;
            const textLen = (el && (el.innerText || el.textContent || '')) ? (el.innerText || el.textContent).trim().length : 0;
            if (el && textLen > 50) {
                targetElement = el;
                break;
            }
        }

        if (!targetElement && doc.body) {
            targetElement = doc.body;
        }

        if (!targetElement) return '';

        return cleanHtmlForSpeech(targetElement.innerHTML || targetElement.textContent || '');
    }

    global.cleanHtmlForSpeech = cleanHtmlForSpeech;
    global.extractMainContentText = extractMainContentText;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            cleanHtmlForSpeech,
            extractMainContentText
        };
    }
})(typeof window !== 'undefined' ? window : global);
