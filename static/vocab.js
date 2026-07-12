(function () {
  var data = null;
  var UK_PRON = 'Listen to the British English pronunciation';
  var US_PRON = 'Listen to the American English pronunciation';
  var RANDOM_SIZE = 20;
  var mode = 'browse';

  var fcWords = [];
  var fcIndex = 0;
  var fcFlipped = false;

  var currentAudio = null;

  var STORAGE_KEY = 'vocab-state';
  var searchIdx = null;

  function $(id) { return document.getElementById(id); }
  function qs(s, p) { return (p || document).querySelector(s); }
  function qsa(s, p) { return (p || document).querySelectorAll(s); }

  function attachAudioHandlers() {
    qsa('.word-ipa.clickable').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        playAudio(this.dataset.url);
      });
    });
    qsa('.flashcard-ipa[data-url]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        playAudio(this.dataset.url);
      });
    });
  }

  function init() {
    mode = window.location.pathname.indexOf('/vocab/flashcard/') === 0 ? 'flashcard' : 'browse';

    if (mode === 'flashcard') {
      data = window.vocabData || null;
      if (!data) return;
      loadState();
      fcWords = pickRandom();
      fcIndex = 0;
      fcFlipped = false;
      renderFlashcard();
      setupFlashcardUI();
    } else {
      attachAudioHandlers();
      setupSearch();
    }
    setupKeyboardShortcuts();
  }

  function saveState() {
    if (mode !== 'flashcard') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fcIndex: fcIndex,
      }));
    } catch (_) {}
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      fcIndex = saved.fcIndex || 0;
    } catch (_) {}
  }

  function setupSearch() {
    var input = $('vocab-search');
    if (!input) return;

    input.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      if (!q) {
        $('search-results').style.display = 'none';
        $('vocab-list').style.display = '';
        if ($('vocab-pagination-top')) $('vocab-pagination-top').style.display = '';
        if ($('vocab-pagination-bottom')) $('vocab-pagination-bottom').style.display = '';
        return;
      }

      try {
        if (!searchIdx) {
          searchIdx = elasticlunr.Index.load(window.searchIndex);
        }
        var results = searchIdx.search(q, { expand: true });
        var html = '';
        for (var i = 0; i < Math.min(results.length, 50); i++) {
          var r = results[i];
          var doc = searchIdx.documentStore.getDoc(r.ref);
          html += '<a href="' + r.ref + '" class="search-result">' +
            '<strong>' + (doc.title || r.ref) + '</strong>' +
            '<span class="text-light">' + (doc.body || '').substring(0, 120) + '</span>' +
            '</a>';
        }
        if (!html) html = '<p class="text-light">No words found.</p>';

        $('vocab-list').style.display = 'none';
        if ($('vocab-pagination-top')) $('vocab-pagination-top').style.display = 'none';
        if ($('vocab-pagination-bottom')) $('vocab-pagination-bottom').style.display = 'none';
        $('search-results').innerHTML = html;
        $('search-results').style.display = '';
      } catch (e) {
        $('search-results').innerHTML = '<p class="text-light">Search unavailable.</p>';
        $('search-results').style.display = '';
      }
    });
  }

  function setupFlashcardUI() {
    if ($('fc-prev')) $('fc-prev').addEventListener('click', fcPrev);
    if ($('fc-next')) $('fc-next').addEventListener('click', fcNext);
    if ($('fc-shuffle')) $('fc-shuffle').addEventListener('click', fcShuffle);
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'k' || e.key === 'K') {
        playVariant('uk');
        return;
      }
      if (mode === 'flashcard') {
        if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') fcPrev();
        else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') fcNext();
        else if (e.key === 's' || e.key === 'S') playVariant('us');
        else if (e.key === 'r' || e.key === 'R') fcShuffle();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fcFlip(); }
      } else {
        if (e.key === 'ArrowLeft') {
          var prevBtn = qs('#vocab-pagination-top a[href]:first-child, #vocab-pagination-bottom a[href]:first-child');
          if (prevBtn) prevBtn.click();
        } else if (e.key === 'ArrowRight') {
          var nextBtn = qs('#vocab-pagination-top a[href]:last-child, #vocab-pagination-bottom a[href]:last-child');
          if (nextBtn) nextBtn.click();
        }
      }
    });
  }

  function pickRandom() {
    var pool = data;
    var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, Math.min(RANDOM_SIZE, shuffled.length));
  }

  function initFlashcards(restore) {
    fcWords = pickRandom();
    fcIndex = restore ? Math.min(fcIndex, Math.max(fcWords.length - 1, 0)) : 0;
    fcFlipped = false;
    renderFlashcard();
    saveState();
  }

  function renderFlashcard() {
    var entry = fcWords[fcIndex];
    if (!entry) {
      $('flashcard-counter').textContent = '0 / 0';
      $('fc-word').textContent = '';
      $('fc-front-meta').innerHTML = '';
      $('fc-definition').innerHTML = '';
      $('fc-translation').innerHTML = '';
      $('fc-examples').innerHTML = '';
      return;
    }

    var d = entry.data;
    var pron = d.pronunciation || {};
    var audio = d.audio || {};
    var senses = d.senses || [];

    var firstPOS = senses.length > 0 ? senses[0].pos : '';
    var allDefs = [];
    for (var i = 0; i < senses.length; i++) {
      for (var j = 0; j < senses[i].definitions.length; j++) {
        allDefs.push(senses[i].definitions[j]);
      }
    }

    $('flashcard-counter').textContent = (fcIndex + 1) + ' / ' + fcWords.length;

    var card = $('flashcard-card');
    if (fcFlipped) {
      card.classList.add('flipped');
    } else {
      card.classList.remove('flipped');
    }

    $('fc-word').textContent = entry.word;
    var frontMeta = '';
    if (firstPOS) frontMeta += '<div class="flashcard-pos">' + esc(firstPOS) + '</div>';
    if (pron.uk) {
      frontMeta += '<span class="flashcard-ipa"' + (audio.uk ? ' title="' + UK_PRON + '" data-url="' + esc(audio.uk) + '"' : '') + '>UK /' + pron.uk + '/</span> ';
    }
    if (pron.us) {
      frontMeta += '<span class="flashcard-ipa"' + (audio.us ? ' title="' + US_PRON + '" data-url="' + esc(audio.us) + '"' : '') + '>US /' + pron.us + '/</span> ';
    }
    $('fc-front-meta').innerHTML = frontMeta;

    attachAudioHandlers();

    var defHTML = '';
    var zhHTML = '';
    for (var i = 0; i < allDefs.length; i++) {
      if (allDefs[i].en) defHTML += '<p>' + esc(allDefs[i].en) + '</p>';
      if (allDefs[i].zh) zhHTML += '<p>' + esc(allDefs[i].zh) + '</p>';
    }
    $('fc-definition').innerHTML = defHTML;
    $('fc-translation').innerHTML = zhHTML;

    var exHTML = '';
    for (var i = 0; i < Math.min(allDefs.length, 3); i++) {
      var exs = allDefs[i].examples || [];
      for (var j = 0; j < Math.min(exs.length, 2); j++) {
        exHTML += '<p>' + esc(exs[j].en) + '</p>';
        if (exs[j].zh) exHTML += '<p class="text-light">' + esc(exs[j].zh) + '</p>';
      }
    }
    $('fc-examples').innerHTML = exHTML;
  }

  function fcFlip() {
    fcFlipped = !fcFlipped;
    var card = $('flashcard-card');
    if (fcFlipped) {
      card.classList.add('flipped');
    } else {
      card.classList.remove('flipped');
    }
  }

  function renderCurrentCard() {
    fcFlipped = false;
    renderFlashcard();
    saveState();
  }

  function fcPrev() {
    if (fcWords.length === 0) return;
    fcIndex = fcIndex <= 0 ? fcWords.length - 1 : fcIndex - 1;
    renderCurrentCard();
  }

  function fcNext() {
    if (fcWords.length === 0) return;
    fcIndex = fcIndex >= fcWords.length - 1 ? 0 : fcIndex + 1;
    renderCurrentCard();
  }

  function fcShuffle() {
    fcWords = pickRandom();
    fcIndex = 0;
    renderCurrentCard();
  }

  function playVariant(variant) {
    if (mode === 'flashcard') {
      if (fcWords.length === 0) return;
      var entry = fcWords[fcIndex];
      var audio = (entry.data && entry.data.audio) || {};
      var url = audio[variant];
      if (url) playAudio(url);
    } else {
      var label = variant === 'uk' ? 'UK' : 'US';
      qsa('.word-ipa.clickable').forEach(function (el) {
        if (el.textContent.trim().startsWith(label)) {
          el.click();
        }
      });
    }
  }

  function playAudio(url) {
    if (!url) return;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    currentAudio = new Audio(url);
    currentAudio.play().catch(function () { });
  }

  window.playAudio = playAudio;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
