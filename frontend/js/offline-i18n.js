(function () {
  'use strict';

  var STORAGE_KEY = 'offline-language';
  var DEFAULT_LANG = 'th';
  var SUPPORTED_LANGS = ['en', 'th'];
  var TEXT_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'value'];
  var SOURCE_ATTRIBUTE_PREFIX = 'data-offline-i18n-';
  var BLOCK_SOURCE_ATTRIBUTE = 'data-offline-i18n-block';
  var SKIP_TAGS = { SCRIPT: true, STYLE: true, NOSCRIPT: true, CODE: true, PRE: true, TEXTAREA: true, SVG: true };
  var BLOCK_TAGS = { P: true, LI: true, H1: true, H2: true, H3: true, H4: true, H5: true, H6: true };
  var INLINE_FORMATTING_TAGS = { STRONG: true, B: true, EM: true, I: true, U: true, SMALL: true, SPAN: true, BR: true, MARK: true, S: true };
  var textSourceMap = new WeakMap();
  var observerStarted = false;
  var textDecoder = typeof window !== 'undefined' && window.TextDecoder ? new window.TextDecoder('utf-8', { fatal: false }) : null;
  var WINDOWS_1252_OVERRIDES = {
    8364: 128,
    8218: 130,
    402: 131,
    8222: 132,
    8230: 133,
    8224: 134,
    8225: 135,
    710: 136,
    8240: 137,
    352: 138,
    8249: 139,
    338: 140,
    381: 142,
    8216: 145,
    8217: 146,
    8220: 147,
    8221: 148,
    8226: 149,
    8211: 150,
    8212: 151,
    732: 152,
    8482: 153,
    353: 154,
    8250: 155,
    339: 156,
    382: 158,
    376: 159
  };
  var MOJIBAKE_MARKERS = ['\u00c3', '\u00c2', '\u00c4', '\u00c5', '\u00c6', '\u00c7', '\u00d0', '\u00d1', '\u00e1', '\u00e2', '\u00ef\u00bf\u00bd', '\ufffd'];
  var DICTIONARY_OVERRIDES = {
    th: {
      'M\u1ed7i link m\u1ed9t d\u00f2ng \u0111\u01b0\u1ee3c t\u00ednh l\u00e0 m\u1ed9t \u0111\u01a1n h\u00e0ng': '1 ลิงก์ต่อ 1 บรรทัด จะถูกนับเป็น 1 คำสั่งซื้อ',
      'Nh\u1eadp n\u1ed9i dung b\u00ecnh lu\u1eadn, m\u1ed7i d\u00f2ng 1 n\u1ed9i dung \u0111\u01b0\u1ee3c t\u00ednh ti\u1ec1n l\u00e0 1 b\u00ecnh lu\u1eadn': 'กรอกข้อความคอมเมนต์ โดย 1 บรรทัดจะถูกนับเงินเป็น 1 คอมเมนต์',
      'Nh\u1eadp n\u1ed9i dung \u0111\u00e1nh gi\u00e1, m\u1ed7i d\u00f2ng 1 n\u1ed9i dung \u0111\u01b0\u1ee3c t\u00ednh ti\u1ec1n l\u00e0 1 \u0111\u00e1nh gi\u00e1': 'กรอกข้อความรีวิว โดย 1 บรรทัดจะถูกนับเงินเป็น 1 รีวิว',
      'Nh\u1eadp n\u1ed9i dung chia s\u1ebb, m\u1ed7i d\u00f2ng \u0111\u01b0\u1ee3c t\u00ednh l\u00e0 1 n\u1ed9i dung.': 'กรอกข้อความแชร์ โดย 1 บรรทัดจะถูกนับเป็น 1 เนื้อหา',
      '/ m\u1eaft': '/ ตา',
      '/ l\u01b0u video': '/ บันทึกวิดีโอ'
    }
  };

  function normalizeText(value) {
    return repairText(value || '').replace(/\s+/g, ' ').trim();
  }

  function looksLikeMojibake(value) {
    if (!value) {
      return false;
    }
    for (var index = 0; index < MOJIBAKE_MARKERS.length; index += 1) {
      if (value.indexOf(MOJIBAKE_MARKERS[index]) >= 0) {
        return true;
      }
    }
    return false;
  }

  function mojibakeScore(value) {
    if (!value) {
      return 0;
    }
    var score = 0;
    for (var index = 0; index < MOJIBAKE_MARKERS.length; index += 1) {
      var marker = MOJIBAKE_MARKERS[index];
      var offset = value.indexOf(marker);
      while (offset >= 0) {
        score += 1;
        offset = value.indexOf(marker, offset + marker.length);
      }
    }
    score += (value.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g) || []).length * 3;
    return score;
  }

  function toWindows1252Byte(char) {
    var code = char.charCodeAt(0);
    if (code <= 255) {
      return code;
    }
    if (Object.prototype.hasOwnProperty.call(WINDOWS_1252_OVERRIDES, code)) {
      return WINDOWS_1252_OVERRIDES[code];
    }
    return null;
  }

  function decodeLegacyUtf8(value) {
    if (!textDecoder || !value) {
      return value;
    }
    try {
      var bytes = new Uint8Array(Array.from(value).map(function (char) {
        var byte = toWindows1252Byte(char);
        if (byte === null) {
          throw new Error('unsupported-char');
        }
        return byte;
      }));
      return textDecoder.decode(bytes);
    } catch (error) {
      return value;
    }
  }

  function cleanupCorruptedFragments(value) {
    return (value || '')
      .replace(/\u00c2(?=\u00a0|\s|$)/g, '')
      .replace(/\bC[\ufffd?]ch\b/g, 'C\u00e1ch')
      .replace(/\/\s*m[\ufffd?]t\b/g, '/ m\u1eaft')
      .replace(/\/\s*l[\u01b0\ufffd?]u video\b/g, '/ l\u01b0u video')
      .replace(/\ufffd/g, '');
  }

  function repairText(value) {
    var current = cleanupCorruptedFragments(value || '');
    var attempt = 0;
    while (attempt < 6 && looksLikeMojibake(current)) {
      var repaired = decodeLegacyUtf8(current);
      if (!repaired || repaired === current) {
        break;
      }
      if (mojibakeScore(repaired) > mojibakeScore(current)) {
        break;
      }
      current = repaired;
      attempt += 1;
    }
    return cleanupCorruptedFragments(current);
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
    var baseDictionary = dictionaries[lang] || {};
    var overrideDictionary = DICTIONARY_OVERRIDES[lang] || {};
    return Object.assign({}, baseDictionary, overrideDictionary);
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
      return repairText(source);
    }
    var dictionary = getDictionary(lang);
    var normalized = normalizeText(source);
    var translated = dictionary[normalized];
    if (!translated && source !== repairText(source)) {
      translated = dictionary[normalizeText(repairText(source))];
    }
    if (!translated) {
      return repairText(source);
    }
    return preserveSpacing(source, repairText(translated));
  }

  function shouldSkipTextNode(node) {
    if (!node || !node.nodeValue || !normalizeText(node.nodeValue)) {
      return true;
    }
    var parent = node.parentElement;
    return !parent || !!SKIP_TAGS[parent.tagName];
  }

  function translateTextNode(node, lang) {
    if (node && node.nodeValue) {
      var cleanedNodeValue = repairText(node.nodeValue);
      if (cleanedNodeValue !== node.nodeValue && !normalizeText(cleanedNodeValue)) {
        node.nodeValue = cleanedNodeValue;
        return;
      }
    }
    if (shouldSkipTextNode(node)) {
      return;
    }
    if (!textSourceMap.has(node)) {
      textSourceMap.set(node, repairText(node.nodeValue));
    }
    var source = textSourceMap.get(node);
    var translated = lang === 'vi' ? source : translateExact(source, lang);
    if (translated !== node.nodeValue) {
      node.nodeValue = translated;
    }
  }

  function canTranslateBlockElement(node) {
    if (!node || !BLOCK_TAGS[node.tagName]) {
      return false;
    }
    for (var index = 0; index < node.children.length; index += 1) {
      var child = node.children[index];
      if (SKIP_TAGS[child.tagName]) {
        return false;
      }
      if (!INLINE_FORMATTING_TAGS[child.tagName]) {
        return false;
      }
    }
    return !!normalizeText(node.textContent || '');
  }

  function translateBlockElement(node, lang) {
    if (!canTranslateBlockElement(node)) {
      return;
    }
    if (!node.hasAttribute(BLOCK_SOURCE_ATTRIBUTE)) {
      node.setAttribute(BLOCK_SOURCE_ATTRIBUTE, repairText(node.textContent || ''));
    }
    var source = node.getAttribute(BLOCK_SOURCE_ATTRIBUTE) || '';
    var translated = lang === 'vi' ? source : translateExact(source, lang);
    if (normalizeText(translated) && translated !== node.textContent) {
      node.textContent = translated;
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

  function applyBlocks(lang, root) {
    var container = root || document;
    var nodes = [];
    if (container.nodeType === Node.ELEMENT_NODE && canTranslateBlockElement(container)) {
      nodes.push(container);
    }
    if (container.querySelectorAll) {
      var blockNodes = container.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6');
      for (var index = 0; index < blockNodes.length; index += 1) {
        nodes.push(blockNodes[index]);
      }
    }
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      translateBlockElement(nodes[nodeIndex], lang);
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
          node.setAttribute(sourceKey, repairText(node.getAttribute(attr) || ''));
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
        document.documentElement.setAttribute(SOURCE_ATTRIBUTE_PREFIX + 'title', repairText(document.title));
      }
      var sourceTitle = document.documentElement.getAttribute(SOURCE_ATTRIBUTE_PREFIX + 'title') || document.title;
      document.title = lang === 'vi' ? sourceTitle : translateExact(sourceTitle, lang);
    }

    var metaNodes = document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]');
    for (var index = 0; index < metaNodes.length; index += 1) {
      var meta = metaNodes[index];
      if (!meta.hasAttribute(SOURCE_ATTRIBUTE_PREFIX + 'content')) {
        meta.setAttribute(SOURCE_ATTRIBUTE_PREFIX + 'content', repairText(meta.getAttribute('content') || ''));
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
    return repairText(item[lang] || item.en || key);
  }

  function getLanguageMeta(lang) {
    var payload = window.OFFLINE_I18N_DATA || {};
    var meta = payload.languageMeta || {};
    var entry = meta[lang] || { nativeLabel: lang.toUpperCase(), shortLabel: lang.toUpperCase() };
    return {
      nativeLabel: repairText(entry.nativeLabel || lang.toUpperCase()),
      shortLabel: repairText(entry.shortLabel || lang.toUpperCase())
    };
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
    launcher.textContent = getUiText(lang, 'switcher') + ' - ' + getLanguageMeta(lang).shortLabel;

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
    applyBlocks(lang);
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
            applyBlocks(lang, node);
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
