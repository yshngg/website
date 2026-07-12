(function () {
  var data = null;
  var mode = 'browse';
  var fcWords = [];
  var fcIndex = 0;
  var fcFlipped = false;
  var currentAudio = null;
  var searchIdx = null;

  function $(id) { return document.getElementById(id); }

  function attachAudioHandlers() {
    qsa('.word-ipa.clickable, .flashcard-ipa[data-url]').forEach(function (el) {
      el.addEventListener('click', function () {
        playAudio(this.dataset.url);
      });
    });
  }

  function preventDetailsToggleOnIpa() {
    qsa('details.word-card').forEach(function (d) {
      var s = d.querySelector('summary');
      if (!s) return;
      s.addEventListener('click', function (e) {
        if (e.target.closest('.word-ipa')) e.preventDefault();
      });
    });
  }

  function init() {
    mode = window.location.pathname.indexOf('/vocab/flashcard/') === 0 ? 'flashcard' : 'browse';
    if (mode === 'flashcard') {
      data = window.vocabData;
      if (!data) return;
      fcWords = data.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 20);
      fcIndex = 0;
      fcFlipped = false;
      renderFlashcard();
      if ($('fc-prev')) $('fc-prev').addEventListener('click', fcPrev);
      if ($('fc-next')) $('fc-next').addEventListener('click', fcNext);
      if ($('fc-shuffle')) $('fc-shuffle').addEventListener('click', fcShuffle);
    } else {
      attachAudioHandlers();
      preventDetailsToggleOnIpa();
      setupSearch();
    }
    setupKeyboardShortcuts();
  }

  function loadSearchDeps(cb) {
    if (typeof elasticlunr !== 'undefined' && window.searchIndex) { cb(); return; }
    $('search-results').innerHTML = '<p class="text-light">Loading search index...</p>';
    $('search-results').style.display = '';
    var s = document.createElement('script');
    s.src = '/elasticlunr.min.js';
    s.onload = function () {
      var s2 = document.createElement('script');
      s2.src = '/search_index.en.js';
      s2.onload = function () { searchIdx = elasticlunr.Index.load(window.searchIndex); cb(); };
      document.body.appendChild(s2);
    };
    document.body.appendChild(s);
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
      loadSearchDeps(function () {
        try {
          var results = searchIdx.search(q, { expand: true });
          var html = '';
          for (var i = 0; i < Math.min(results.length, 50); i++) {
            var r = results[i];
            var doc = searchIdx.documentStore.getDoc(r.ref);
            html += '<a href="' + r.ref + '" class="search-result"><strong>' + (doc.title || r.ref) + '</strong><span class="text-light">' + (doc.body || '').substring(0, 120) + '</span></a>';
          }
          $('vocab-list').style.display = 'none';
          if ($('vocab-pagination-top')) $('vocab-pagination-top').style.display = 'none';
          if ($('vocab-pagination-bottom')) $('vocab-pagination-bottom').style.display = 'none';
          $('search-results').innerHTML = html || '<p class="text-light">No words found.</p>';
          $('search-results').style.display = '';
        } catch (e) {
          $('search-results').innerHTML = '<p class="text-light">Search unavailable.</p>';
          $('search-results').style.display = '';
        }
      });
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'k' || e.key === 'K') { playVariant('uk'); return; }
      if (mode === 'flashcard') {
        if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') fcPrev();
        else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') fcNext();
        else if (e.key === 's' || e.key === 'S') playVariant('us');
        else if (e.key === 'r' || e.key === 'R') fcShuffle();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fcFlip(); }
      } else {
        if (e.key === 'ArrowLeft') {
          var p = document.querySelector('#vocab-pagination-top a[href], #vocab-pagination-bottom a[href]');
          if (p) p.click();
        } else if (e.key === 'ArrowRight') {
          var n = document.querySelector('#vocab-pagination-top a[href]:last-child, #vocab-pagination-bottom a[href]:last-child');
          if (n) n.click();
        }
      }
    });
  }

  function esc(s) {
    return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
  }

  function renderFlashcard() {
    var entry = fcWords[fcIndex];
    if (!entry) {
      $('flashcard-counter').textContent = '0 / 0';
      $('fc-word').textContent = '';
      ['fc-front-meta', 'fc-definition', 'fc-translation', 'fc-examples'].forEach(function (id) { $(id).innerHTML = ''; });
      return;
    }
    var d = entry.data;
    var pron = d.pronunciation || {};
    var audio = d.audio || {};
    var senses = d.senses || [];
    var firstPOS = senses.length > 0 ? senses[0].pos : '';
    var allDefs = [];
    for (var i = 0; i < senses.length; i++)
      for (var j = 0; j < senses[i].definitions.length; j++)
        allDefs.push(senses[i].definitions[j]);

    $('flashcard-counter').textContent = (fcIndex + 1) + ' / ' + fcWords.length;
    $('flashcard-card').classList.toggle('flipped', fcFlipped);
    $('fc-word').textContent = entry.word;

    var meta = '';
    if (firstPOS) meta += '<div class="flashcard-pos">' + esc(firstPOS) + '</div>';
    if (pron.uk) meta += '<span class="flashcard-ipa"' + (audio.uk ? ' title="Listen to the British English pronunciation" data-url="' + esc(audio.uk) + '"' : '') + '>UK /' + pron.uk + '/</span> ';
    if (pron.us) meta += '<span class="flashcard-ipa"' + (audio.us ? ' title="Listen to the American English pronunciation" data-url="' + esc(audio.us) + '"' : '') + '>US /' + pron.us + '/</span> ';
    $('fc-front-meta').innerHTML = meta;
    attachAudioHandlers();

    var defHTML = '', zhHTML = '';
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

  function fcFlip() { fcFlipped = !fcFlipped; $('flashcard-card').classList.toggle('flipped', fcFlipped); }

  function renderCurrentCard() { fcFlipped = false; renderFlashcard(); }

  function fcPrev() { if (!fcWords.length) return; fcIndex = fcIndex <= 0 ? fcWords.length - 1 : fcIndex - 1; renderCurrentCard(); }

  function fcNext() { if (!fcWords.length) return; fcIndex = fcIndex >= fcWords.length - 1 ? 0 : fcIndex + 1; renderCurrentCard(); }

  function fcShuffle() {
    fcWords = data.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 20);
    fcIndex = 0;
    renderCurrentCard();
  }

  function playVariant(variant) {
    if (mode === 'flashcard') {
      var url = fcWords[fcIndex] && fcWords[fcIndex].data && fcWords[fcIndex].data.audio && fcWords[fcIndex].data.audio[variant];
      if (url) playAudio(url);
    } else {
      var label = variant === 'uk' ? 'UK' : 'US';
      qsa('.word-ipa.clickable').forEach(function (el) {
        if (el.textContent.trim().startsWith(label)) el.click();
      });
    }
  }

  function playAudio(url) {
    if (!url) return;
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    currentAudio = new Audio(url);
    currentAudio.play().catch(function () {});
  }

  window.playAudio = playAudio;

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
