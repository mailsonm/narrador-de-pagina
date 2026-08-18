# 🎙️ Narrador de Página - Extensão Google Chrome (Manifest V3)

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4.svg?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TDD Tested](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg?style=flat-square)](tests/test_narrador_engine.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933.svg?style=flat-square&logo=nodedotjs)](https://nodejs.org)

> **Narrador de Página** é uma extensão inteligente para o Google Chrome (Manifest V3) que transforma qualquer artigo, notícia, tutorial ou texto da web em áudio natural, com **destaque em tempo real (efeito karaokê)** e **mini player flutuante**.

---

## 🌐 Idiomas / Languages / Idiomas

- [🇧🇷 Português (PT-BR)](#-português-pt-br)
- [🇺🇸 English (EN)](#-english-en)
- [🇪🇸 Español (ES)](#-español-es)

---

## 🇧🇷 Português (PT-BR)

### ✨ Principais Recursos

1. **📖 Leitura Limpa de Artigos (Zero Poluição):**
   * Extrai apenas o conteúdo principal do artigo, ignorando anúncios, banners, menus de navegação, cabeçalhos de site e seções de comentários.
2. **✨ Destaque em Tempo Real (Efeito Karaokê):**
   * Destaca visualmente a frase que está sendo narrada e rola a tela suavemente para acompanhar a leitura (ótimo para acessibilidade, estudantes e TDAH/dislexia).
3. **🎛️ Mini Player Flutuante:**
   * Widget elegante na página com controles de **Play, Pausar, Avançar Frase, Retroceder Frase, Parar** e seletor de velocidade (**0.75x, 1.0x, 1.25x, 1.5x, 2.0x**).
4. **🔊 Leitura Rápida de Seleção:**
   * Basta selecionar um trecho de texto com o mouse para ver o balão flutuante *"🔊 Ouvir"* ou clicar com o botão direito *"🔊 Ler texto selecionado"*.
5. **⌨️ Atalhos de Teclado Globais:**
   * Iniciar / Pausar Leitura: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
   * Parar Leitura: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>

### 📦 Como Instalar no Google Chrome (Modo Desenvolvedor)

1. Clone ou baixe este repositório:
   ```bash
   git clone https://github.com/mailsonm/narrador-de-pagina.git
   ```
2. Abra o Google Chrome e acesse `chrome://extensions/`.
3. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
4. Clique no botão **"Carregar sem compactação"** (Load unpacked) e selecione a pasta `narrador-de-pagina`.
5. Pronto! O ícone do Narrador aparecerá na sua barra de extensões.

---

## 🇺🇸 English (EN)

### ✨ Key Features

1. **📖 Distraction-Free Article Reader:**
   * Extracts only the core article content while ignoring ads, popups, headers, navbars, and comment sections.
2. **✨ Real-Time Highlight (Karaoke Mode):**
   * Visually highlights the active spoken sentence with smooth auto-scrolling (ideal for accessibility, studying, and focus).
3. **🎛️ Floating Mini Player:**
   * Modern on-page widget with **Play, Pause, Next Sentence, Previous Sentence, Stop**, and speed multiplier (**0.75x to 2.0x**).
4. **🔊 Quick Selection Reading:**
   * Select any text snippet to trigger the floating *"🔊 Listen"* tooltip or right-click *"🔊 Read selected text"*.
5. **⌨️ Keyboard Shortcuts:**
   * Toggle Speech: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
   * Stop Speech: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>

### 📦 Installation Guide (Chrome Developer Mode)

1. Clone or download this repo:
   ```bash
   git clone https://github.com/mailsonm/narrador-de-pagina.git
   ```
2. Navigate to `chrome://extensions/` in Google Chrome.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the `narrador-de-pagina` directory.

---

## 🇪🇸 Español (ES)

### ✨ Características Principales

1. **📖 Lectura Limpia de Artículos:**
   * Extrae el contenido principal eliminando anuncios, barras de navegación y comentarios.
2. **✨ Resaltado en Tiempo Real (Efecto Karaoke):**
   * Resalta visualmente la frase que se está leyendo con desplazamiento suave.
3. **🎛️ Mini Reproductor Flotante:**
   * Controles de reproducción, velocidad (0.75x a 2.0x) y barra de progreso en pantalla.
4. **🔊 Lectura Rápida de Selección:**
   * Seleccione cualquier texto para escuchar mediante menú contextual o botón flotante.
5. **⌨️ Atajos de Teclado:**
   * Iniciar/Pausar: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>

---

## 🧪 Testes Automatizados (TDD-First)

Este projeto foi construído seguindo a metodologia **TDD-First**.

Para rodar a suíte de testes unitários:
```bash
node --test tests/test_narrador_engine.js
```

---

## 👤 Autor

**Mailson Maia Alves**  
* GitHub: [@mailsonm](https://github.com/mailsonm)

## 📄 Licença

Distribuído sob a licença [MIT](LICENSE).
