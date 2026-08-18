# 🎙️ Narrador de Página - Extensão Google Chrome (Manifest V3)

[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4.svg?style=flat-square&logo=googlechrome)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-v2.0.0--Hybrid-blue.svg?style=flat-square)](manifest.json)
[![TDD Tested](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg?style=flat-square)](tests/test_narrador_engine.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933.svg?style=flat-square&logo=nodedotjs)](https://nodejs.org)

> **Narrador de Página** é uma extensão inteligente e híbrida para o Google Chrome (Manifest V3) que transforma qualquer artigo, notícia, tutorial ou texto da web em áudio natural com qualidade de estúdio, **destaque em tempo real (efeito karaokê por palavra)** e **mini player flutuante**.

---

## 🌐 Idiomas / Languages / Idiomas

- [🇧🇷 Português (PT-BR)](#-português-pt-br)
- [🇺🇸 English (EN)](#-english-en)
- [🇪🇸 Español (ES)](#-español-es)

---

## 🇧🇷 Português (PT-BR)

### 🌟 Arquitetura Híbrida (Vozes Gratuitas ou IA de Estúdio)

1. **🥇 Modo Gratuito (Zero Custo):**
   * Utiliza as vozes neurais instaladas no seu navegador (Google Natural, Microsoft Natural, Apple). Não requer chave de API nem cadastro.
2. **🎙️ Modo IA de Estúdio (OpenAI TTS - BYOK):**
   * O usuário pode inserir sua própria chave de API privada (`sk-...`) na página de Opções para ouvir qualquer página com as vozes de alta fidelidade da OpenAI (*Nova, Alloy, Echo, Onyx, Shimmer, Fable*).
   * **Fallback Automático:** Se a chave de API expirar ou faltarem créditos, a extensão alterna instantaneamente para as vozes gratuitas do navegador sem interromper a sua leitura!

### ✨ Recursos Principais

1. **📖 Leitura Limpa de Conteúdo (Sem Lixo de Navegação):**
   * Extrai apenas os títulos e parágrafos do artigo, ignorando menus, sidebars, anúncios, popups e barras de perfil de usuário.
2. **✨ Destaque em Tempo Real (Karaokê por Palavra & Frase):**
   * Destaca visualmente a palavra e a frase narradas em tempo real com rolagem suave automática.
3. **🎛️ Mini Player Flutuante:**
   * Widget moderno com **Play, Pause, Avançar, Retroceder, Parar**, barra de progresso e multiplicador de velocidade (**0.75x a 2.0x**).
4. **🔊 Leitura Rápida de Seleção:**
   * Selecione um texto com o mouse para ver o balão flutuante *"🔊 Ouvir"* ou use o menu de contexto.
5. **⌨️ Atalhos de Teclado:**
   * Iniciar / Pausar Leitura: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
   * Parar Leitura: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>

---

## 🇺🇸 English (EN)

### 🌟 Hybrid Architecture (Free Browser Voices or Studio AI)

1. **🥇 Free Mode (Zero Cost):**
   * Uses built-in browser neural voices (Google Natural, Microsoft Natural, Apple) with zero setup and zero cost.
2. **🎙️ Studio AI Mode (OpenAI TTS - BYOK):**
   * Bring Your Own Key (`sk-...`) in the Options page to listen to any web page using studio-grade OpenAI voices (*Nova, Alloy, Echo, Onyx, Shimmer, Fable*).
   * **Automatic Fallback:** Gracefully falls back to free browser voices if the API key fails or expires.

### ✨ Key Features

1. **📖 Clean Article Extraction:**
   * Scrapes semantic headings and paragraphs while stripping ads, navigation menus, and profile widgets.
2. **✨ Real-Time Karaoke Sync (Word-by-Word):**
   * Synchronized real-time sentence & word highlighting with smooth auto-scroll.
3. **🎛️ Floating Mini Player:**
   * On-page audio player widget with full transport controls and speed multiplier (**0.75x to 2.0x**).
4. **⌨️ Global Shortcuts:**
   * Toggle: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> | Stop: <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>

---

## 🇪🇸 Español (ES)

### 🌟 Arquitectura Híbrida (Voces Gratuitas o IA de Estudio)

1. **🥇 Modo Gratuito:**
   * Utiliza las voces neuronales nativas del navegador sin costo ni configuración previa.
2. **🎙️ Modo IA de Estudio (OpenAI TTS - BYOK):**
   * Ingrese su propia clave de API en Opciones para disfrutar de voces humanas de estudio (*Nova, Alloy, Echo, Onyx, Shimmer*).
   * **Respaldo Automático:** Si la clave falla, la extensión continúa la lectura usando las voces gratuitas del navegador.

---

## 🧪 Testes Automatizados (TDD-First)

Execução da suíte de testes unitários:
```bash
node --test tests/test_narrador_engine.js
```

---

## 👤 Autor & Licença

- **Autor:** Mailson Maia Alves ([GitHub](https://github.com/mailsonm))
- **Licença:** [MIT](LICENSE)
