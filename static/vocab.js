(function () {
  var data = null;
  var UK_PRON = 'Listen to the British English pronunciation';
  var US_PRON = 'Listen to the American English pronunciation';
  var perPage = 10;
  var RANDOM_SIZE = 20;
  var filtered = [];
  var searchQuery = '';
  var page = 1;
  var mode = 'browse';

  var fcWords = [];
  var fcIndex = 0;
  var fcFlipped = false;

  var currentAudio = null;

  var STORAGE_KEY = 'vocab-state';

  function $(id) { return document.getElementById(id); }
  function qs(s, p) { return (p || document).querySelector(s); }
  function qsa(s, p) { return (p || document).querySelectorAll(s); }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        page: page,
        fcIndex: fcIndex,
        searchQuery: searchQuery,
      }));
    } catch (_) {}
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      page = saved.page || 1;
      fcIndex = saved.fcIndex || 0;
      searchQuery = saved.searchQuery || '';
    } catch (_) {}
  }

  function init() {
    if (!data) return;
    mode = window.location.pathname.indexOf('/vocab/flashcard/') === 0 ? 'flashcard' : 'browse';
    filtered = data;
    loadState();
    if (mode === 'flashcard') {
      fcWords = pickRandom();
      fcIndex = 0;
      fcFlipped = false;
      renderFlashcard();
    } else {
      if (searchQuery && $('vocab-search')) $('vocab-search').value = searchQuery;
      applyFilter();
      renderBrowse();
    }
    setupEventListeners();
  }

  function setupEventListeners() {
    if ($('vocab-search')) {
      $('vocab-search').addEventListener('input', function () {
        searchQuery = this.value.toLowerCase();
        page = 1;
        filterAndRender();
      });
    }

    if ($('fc-prev')) $('fc-prev').addEventListener('click', fcPrev);
    if ($('fc-next')) $('fc-next').addEventListener('click', fcNext);
    if ($('fc-shuffle')) $('fc-shuffle').addEventListener('click', fcShuffle);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'p' || e.key === 'P') {
        playCurrentAudio();
        return;
      }
      if (mode === 'flashcard') {
        if (e.key === 'ArrowLeft') fcPrev();
        else if (e.key === 'ArrowRight') fcNext();
        else if (e.key === 's' || e.key === 'S') fcShuffle();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fcFlip(); }
      } else {
        if (e.key === 'ArrowLeft') {
          var prevBtn = qs('.vocab-pagination button[data-page]:not(:disabled):first-child');
          if (prevBtn) prevBtn.click();
        } else if (e.key === 'ArrowRight') {
          var nextBtn = qs('.vocab-pagination button[data-page]:last-child:not(:disabled)');
          if (nextBtn) nextBtn.click();
        }
      }
    });

  }

  function pickRandom() {
    var pool = searchQuery ? filtered : data;
    var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, Math.min(RANDOM_SIZE, shuffled.length));
  }

  function filterAndRender() {
    applyFilter();
    renderBrowse();
  }

  function applyFilter() {
    filtered = data.filter(function (entry) {
      var w = entry.word.toLowerCase();
      if (searchQuery && w.indexOf(searchQuery) === -1) {
        var found = false;
        if (entry.data.senses) {
          for (var i = 0; i < entry.data.senses.length && !found; i++) {
            var sg = entry.data.senses[i];
            for (var j = 0; j < sg.definitions.length && !found; j++) {
              var d = sg.definitions[j];
              if ((d.en && d.en.toLowerCase().indexOf(searchQuery) !== -1) ||
                (d.zh && d.zh.indexOf(searchQuery) !== -1)) {
                found = true;
              }
              if (!found && d.examples) {
                for (var k = 0; k < d.examples.length && !found; k++) {
                  if (d.examples[k].en && d.examples[k].en.toLowerCase().indexOf(searchQuery) !== -1) {
                    found = true;
                  }
                }
              }
            }
          }
        }
        if (!found) return false;
      }

      return true;
    });
  }

  function renderBrowse() {
    var totalPages = Math.ceil(filtered.length / perPage) || 1;
    if (page > totalPages) page = totalPages;

    var start = (page - 1) * perPage;
    var pageWords = filtered.slice(start, start + perPage);

    renderPagination('browse-pagination-top', page, totalPages);
    renderPagination('browse-pagination-bottom', page, totalPages);

    var html = '';
    for (var i = 0; i < pageWords.length; i++) {
      html += renderEntry(pageWords[i]);
    }
    $('vocab-list').innerHTML = html || '<p class="text-light">No words found.</p>';

    qsa('.word-card-header').forEach(function (h) {
      h.addEventListener('click', function () {
        this.closest('.word-card').classList.toggle('expanded');
      });
    });

    qsa('.word-ipa.clickable').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        playAudio(this.dataset.url);
      });
    });
    saveState();
  }

  function renderPagination(containerId, currentPage, totalPages) {
    var html = '';
    if (totalPages <= 1) {
      html = '<span>' + filtered.length + ' words</span>';
    } else {
      html += '<button data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? ' disabled' : '') + '>‹ Prev</button>';
      html += '<span>Page ' + currentPage + ' of ' + totalPages + ' (' + filtered.length + ' words)</span>';
      html += '<button data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next ›</button>';
    }
    var container = $(containerId);
    if (container) {
      container.innerHTML = html;
      qsa('button[data-page]', container).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!this.disabled) {
            page = parseInt(this.dataset.page);
            renderBrowse();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    }
  }

  function renderEntry(entry) {
    var w = entry.word;
    var d = entry.data;
    var pron = d.pronunciation || {};
    var audio = d.audio || {};
    var senses = d.senses || [];

    var pronAudioHTML = '';
    if (pron.uk) {
      pronAudioHTML += '<span class="word-ipa';
      if (audio.uk) pronAudioHTML += ' clickable';
      pronAudioHTML += '"';
      if (audio.uk) pronAudioHTML += ' title="' + UK_PRON + '" data-url="' + esc(audio.uk) + '"';
      pronAudioHTML += '>UK /' + pron.uk + '/</span> ';
    }
    if (pron.us) {
      pronAudioHTML += '<span class="word-ipa';
      if (audio.us) pronAudioHTML += ' clickable';
      pronAudioHTML += '"';
      if (audio.us) pronAudioHTML += ' title="' + US_PRON + '" data-url="' + esc(audio.us) + '"';
      pronAudioHTML += '>US /' + pron.us + '/</span> ';
    }
    if (!pron.uk && !pron.us) {
      if (audio.uk) pronAudioHTML += '<span class="word-ipa clickable" title="' + UK_PRON + '" data-url="' + esc(audio.uk) + '">🔊 UK</span> ';
      if (audio.us) pronAudioHTML += '<span class="word-ipa clickable" title="' + US_PRON + '" data-url="' + esc(audio.us) + '">🔊 US</span> ';
    }

    var firstPOS = '';
    if (senses.length > 0) {
      firstPOS = senses[0].pos;
    }

    var sensesHTML = '';
    for (var i = 0; i < senses.length; i++) {
      var sg = senses[i];
      sensesHTML += '<div class="sense-label">' + esc(sg.pos || '—') + '</div>';
      for (var j = 0; j < sg.definitions.length; j++) {
        var def = sg.definitions[j];
        sensesHTML += '<div class="def-block">';
        if (def.en) sensesHTML += '<div class="def-en">' + esc(def.en) + '</div>';
        if (def.zh) sensesHTML += '<div class="def-zh">' + esc(def.zh) + '</div>';
        if (def.examples && def.examples.length > 0) {
          sensesHTML += '<ul class="def-examples">';
          for (var k = 0; k < def.examples.length; k++) {
            var ex = def.examples[k];
            sensesHTML += '<li>' + esc(ex.en);
            if (ex.zh) sensesHTML += '<span class="ex-zh">' + esc(ex.zh) + '</span>';
            sensesHTML += '</li>';
          }
          sensesHTML += '</ul>';
        }
        sensesHTML += '</div>';
      }
    }

    var posTag = firstPOS ? '<span class="word-pos">' + esc(firstPOS) + '</span>' : '';

    return '<div class="word-card">' +
      '<div class="word-card-header">' +
      '<h3>' + esc(w) + '</h3>' +
      posTag +
      pronAudioHTML +
      '</div>' +
      '<div class="word-card-body">' + sensesHTML + '</div>' +
      '</div>';
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    qsa('.flashcard-ipa[data-url]', $('fc-front-meta')).forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        playAudio(this.dataset.url);
      });
    });

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

  function playCurrentAudio() {
    var entry;
    if (mode === 'flashcard') {
      if (fcWords.length === 0) return;
      entry = fcWords[fcIndex];
    } else {
      var firstBtn = qs('.word-ipa.clickable');
      if (firstBtn) { firstBtn.click(); return; }
      return;
    }
    if (!entry) return;
    var audio = (entry.data && entry.data.audio) || {};
    var url = audio.uk || audio.us;
    if (url) playAudio(url);
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

  function loadData() {
    fetch('/vocabulary.jsonl')
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var seen = {};
        data = text.trim().split('\n').filter(Boolean).map(function (line) { return JSON.parse(line); })
          .filter(function (entry) {
            var w = entry.word.toLowerCase();
            if (seen[w]) return false;
            seen[w] = true;
            return true;
          })
          .sort(function (a, b) {
            return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
          });
        init();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
