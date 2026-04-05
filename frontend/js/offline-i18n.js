(function () {
  'use strict';

  var STORAGE_KEY = 'offline-language';
  var DEFAULT_LANG = 'en';
  var SUPPORTED_LANGS = ['en', 'th'];
  var TEXT_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'value'];
  var SOURCE_ATTRIBUTE_PREFIX = 'data-offline-i18n-';
  var SKIP_TAGS = { SCRIPT: true, STYLE: true, NOSCRIPT: true, CODE: true, PRE: true, TEXTAREA: true, SVG: true };
  var textSourceMap = new WeakMap();
  var observerStarted = false;

  function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function preserveSpacing(source, translated) {
    var match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!match) {
      return translated;
    }
    return match[1] + translated + match[3];
  }

  function getDictionary(lang) {
    var payload = window.OFFLINE_I18N_DATA || {};
    var dictionaries = payload.dictionaries || {};
    return dictionaries[lang] || {};
  }

  function getStoredLanguage() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGS.indexOf(stored) >= 0) {
        return stored;
      }
    } catch (error) {
      return DEFAULT_LANG;
    }
    return DEFAULT_LANG;
  }

  function setStoredLanguage(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      return;
    }
  }

  function translateExact(source, lang) {
    if (!source || lang === 'vi') {
      return source;
    }
    var dictionary = getDictionary(lang);
    var normalized = normalizeText(source);
    var translated = dictionary[normalized];
    if (!translated) {
      return source;
    }
    return preserveSpacing(source, translated);
  }

  function shouldSkipTextNode(node) {
    if (!node || !node.nodeValue || !normalizeText(node.nodeValue)) {
      return true;
    }
    var parent = node.parentElement;
    return !parent || !!SKIP_TAGS[parent.tagName];
  }

  function translateTextNode(node, lang) {
    if (shouldSkipTextNode(node)) {
      return;
    }
    if (!textSourceMap.has(node)) {
      textSourceMap.set(node, node.nodeValue);
    }
    var source = textSourceMap.get(node);
    var translated = lang === 'vi' ? source : translateExact(source, lang);
    if (translated !== node.nodeValue) {
      node.nodeValue = translated;
    }
  }

  function applyTextNodes(lang, root) {
    var container = root || (document.body || document.documentElement);
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var node;
    while ((node = walker.nextNode())) {
      translateTextNode(node, lang);
    }
  }

  function applyAttributes(lang, root) {
    var container = root || document;
    var selector = TEXT_ATTRIBUTES.map(function (attr) { return '[' + attr + ']'; }).join(',');
    var nodes = container.querySelectorAll ? container.querySelectorAll(selector) : [];
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      for (var attrIndex = 0; attrIndex < TEXT_ATTRIBUTES.length; attrIndex += 1) {
        var attr = TEXT_ATTRIBUTES[attrIndex];
        if (!node.hasAttribute(attr)) {
          continue;
        }
        var sourceKey = SOURCE_ATTRIBUTE_PREFIX + attr;
        if (!node.hasAttribute(sourceKey)) {
          node.setAttribute(sourceKey, node.getAttribute(attr) || '');
        }
        var source = node.getAttribute(sourceKey) || '';
        var translated = lang === 'vi' ? source : translateExact(source, lang);
        if ((node.getAttribute(attr) || '') !== translated) {
          node.setAttribute(attr, translated);
        }
      }
    }
  }

  function applyMeta(lang) {
    if (document.title) {
      if (!document.documentElement.hasAttribute(SOURCE_ATTRIBUTE_PREFIX + 'title')) {
        document.documentElement.setAttribute(SOURCE_ATTRIBUTE_PREFIX + 'title', document.title);
      }
      var sourceTitle = document.documentElement.getAttribute(SOURCE_ATTRIBUTE_PREFIX + 'title') || document.title;
      document.title = lang === 'vi' ? sourceTitle : translateExact(sourceTitle, lang);
    }

    var metaNodes = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]');
    for (var index = 0; index < metaNodes.length; index += 1) {
      var meta = metaNodes[index];
      if (!meta.hasAttribute(SOURCE_ATTRIBUTE_PREFIX + 'content')) {
        meta.setAttribute(SOURCE_ATTRIBUTE_PREFIX + 'content', meta.getAttribute('content') || '');
      }
      var source = meta.getAttribute(SOURCE_ATTRIBUTE_PREFIX + 'content') || '';
      meta.setAttribute('content', lang === 'vi' ? source : translateExact(source, lang));
    }
    document.documentElement.lang = lang;
  }

  function getUiText(lang, key) {
    var payload = window.OFFLINE_I18N_DATA || {};
    var ui = payload.ui || {};
    var item = ui[key] || {};
    return item[lang] || item.en || key;
  }

  function getLanguageMeta(lang) {
    var payload = window.OFFLINE_I18N_DATA || {};
    var meta = payload.languageMeta || {};
    return meta[lang] || { nativeLabel: lang.toUpperCase(), shortLabel: lang.toUpperCase() };
  }

  function renderOptions(container, lang) {
    if (!container) {
      return;
    }
    container.innerHTML = '';

    var hint = document.createElement('div');
    hint.className = 'offline-i18n-hint';
    hint.textContent = getUiText(lang, 'choose');
    container.appendChild(hint);

    var grid = document.createElement('div');
    grid.className = 'offline-i18n-grid';
    for (var index = 0; index < SUPPORTED_LANGS.length; index += 1) {
      var code = SUPPORTED_LANGS[index];
      var meta = getLanguageMeta(code);
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline-primary offline-i18n-option';
      button.setAttribute('data-offline-lang', code);
      button.textContent = meta.nativeLabel;
      if (code === lang) {
        button.classList.add('active');
      }
      grid.appendChild(button);
    }
    container.appendChild(grid);

    var current = document.createElement('div');
    current.className = 'offline-i18n-current';
    current.textContent = getUiText(lang, 'current') + ': ' + getLanguageMeta(lang).nativeLabel;
    container.appendChild(current);
  }

  function ensureModalOptions(lang) {
    var container = document.getElementById('google_translate_element');
    if (container) {
      renderOptions(container, lang);
    }
  }

  function ensureFloatingSwitcher(lang) {
    if (document.getElementById('modalLanguage') || document.getElementById('btn-language')) {
      return;
    }

    var launcher = document.querySelector('[data-offline-i18n-open]');
    var panel = document.querySelector('[data-offline-i18n-panel]');
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.type = 'button';
      launcher.className = 'offline-i18n-fab';
      launcher.setAttribute('data-offline-i18n-open', '1');
      document.body.appendChild(launcher);
    }
    launcher.textContent = getUiText(lang, 'switcher') + ' · ' + getLanguageMeta(lang).shortLabel;

    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'offline-i18n-panel';
      panel.setAttribute('data-offline-i18n-panel', '1');
      panel.hidden = true;
      document.body.appendChild(panel);
    }
    renderOptions(panel, lang);
  }

  function ensureStyle() {
    if (document.getElementById('offline-i18n-style')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'offline-i18n-style';
    style.textContent = [
      '.offline-i18n-grid{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:.5rem;}',
      '.offline-i18n-option{min-width:120px;}',
      '.offline-i18n-option.active{background:#005ae0;border-color:#005ae0;color:#fff;}',
      '.offline-i18n-hint{font-size:.95rem;color:#6c757d;margin-bottom:.5rem;}',
      '.offline-i18n-current{font-size:.92rem;margin-top:.75rem;color:#495057;}',
      '.offline-i18n-fab{position:fixed;right:16px;bottom:16px;z-index:1060;border:0;border-radius:999px;background:#005ae0;color:#fff;padding:10px 16px;box-shadow:0 10px 24px rgba(0,0,0,.18);font-weight:600;}',
      '.offline-i18n-panel{position:fixed;right:16px;bottom:72px;z-index:1060;background:#fff;border-radius:16px;padding:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);max-width:320px;width:calc(100vw - 32px);}'
    ].join('');
    document.head.appendChild(style);
  }

  function revealDocument() {
    document.documentElement.setAttribute('data-offline-i18n-ready', '1');
    document.documentElement.removeAttribute('data-offline-i18n-pending');
    var preloadStyle = document.getElementById('offline-i18n-preload-style');
    if (preloadStyle) {
      preloadStyle.remove();
    }
  }

  function applyLanguage(lang) {
    ensureStyle();
    applyTextNodes(lang);
    applyAttributes(lang);
    applyMeta(lang);
    ensureModalOptions(lang);
    ensureFloatingSwitcher(lang);
    revealDocument();
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGS.indexOf(lang) < 0) {
      lang = DEFAULT_LANG;
    }
    setStoredLanguage(lang);
    applyLanguage(lang);
  }

  function startObserver() {
    if (observerStarted || !window.MutationObserver) {
      return;
    }
    observerStarted = true;
    var observer = new MutationObserver(function (mutations) {
      var lang = getStoredLanguage();
      mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData') {
          translateTextNode(mutation.target, lang);
          return;
        }
        for (var index = 0; index < mutation.addedNodes.length; index += 1) {
          var node = mutation.addedNodes[index];
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node, lang);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            applyTextNodes(lang, node);
            applyAttributes(lang, node);
          }
        }
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function bindEvents() {
    document.addEventListener('click', function (event) {
      var option = event.target.closest('[data-offline-lang]');
      if (option) {
        setLanguage(option.getAttribute('data-offline-lang') || DEFAULT_LANG);
        return;
      }

      var opener = event.target.closest('[data-offline-i18n-open]');
      if (opener) {
        var panel = document.querySelector('[data-offline-i18n-panel]');
        if (panel) {
          panel.hidden = !panel.hidden;
        }
        return;
      }

      var panelNode = document.querySelector('[data-offline-i18n-panel]');
      if (panelNode && !panelNode.hidden && !event.target.closest('[data-offline-i18n-panel]')) {
        panelNode.hidden = true;
      }
    });
  }

  function init() {
    bindEvents();
    applyLanguage(getStoredLanguage());
    startObserver();
  }

  window.offlineI18n = {
    setLanguage: setLanguage,
    getLanguage: getStoredLanguage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();