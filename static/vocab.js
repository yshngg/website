(function () {
  var dataEl = document.getElementById('vocab-data');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const perPage = 10;
  let filtered = data;
  let searchQuery = '';
  let page = 1;
  let mode = 'browse';

  let fcWords = [];
  let fcIndex = 0;
  let fcFlipped = false;

  let currentAudio = null;

  const $ = (id) => document.getElementById(id);
  const qs = (s, p) => (p || document).querySelector(s);
  const qsa = (s, p) => (p || document).querySelectorAll(s);

  function init() {
    filtered = data;
    renderBrowse();
    setupEventListeners();
  }

  function setupEventListeners() {
    $('vocab-search').addEventListener('input', function () {
      searchQuery = this.value.toLowerCase();
      page = 1;
      filterAndRender();
    });

    qsa('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        switchMode(this.dataset.mode);
      });
    });

    $('fc-prev').addEventListener('click', fcPrev);
    $('fc-next').addEventListener('click', fcNext);

    document.addEventListener('keydown', function (e) {
      if (mode === 'flashcard') {
        if (e.key === 'ArrowLeft') fcPrev();
        else if (e.key === 'ArrowRight') fcNext();
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fcFlip(); }
      }
    });

    $('flashcard-pos-filter').addEventListener('change', function () {
      initFlashcards(this.value);
    });

    $('flashcard-card').addEventListener('click', fcFlip);
    $('vocab-export').addEventListener('click', exportFiltered);
  }

  function switchMode(newMode) {
    mode = newMode;
    qsa('.vocab-mode').forEach(function (el) { el.classList.remove('active'); });

    if (mode === 'browse') {
      $('vocab-browse').classList.add('active');
      filterAndRender();
    } else if (mode === 'flashcard') {
      $('vocab-flashcard').classList.add('active');
      initFlashcards();
    }
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

    qsa('.word-audio-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        playAudio(this.dataset.url);
      });
    });
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

    var ipaHTML = '';
    if (pron.uk || pron.us) {
      ipaHTML = '<span class="word-ipa">';
      if (pron.uk) ipaHTML += 'UK ' + pron.uk;
      if (pron.uk && pron.us) ipaHTML += ' / ';
      if (pron.us) ipaHTML += 'US ' + pron.us;
      ipaHTML += '</span>';
    }

    var audioHTML = '';
    if (audio.uk) audioHTML += '<button class="word-audio-btn" data-url="' + esc(audio.uk) + '">🔊 UK</button> ';
    if (audio.us) audioHTML += '<button class="word-audio-btn" data-url="' + esc(audio.us) + '">🔊 US</button>';

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
      ipaHTML +
      posTag +
      audioHTML +
      '</div>' +
      '<div class="word-card-body">' + sensesHTML + '</div>' +
      '</div>';
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initFlashcards(pos) {
    var words = data;
    if (pos) {
      words = data.filter(function (entry) {
        if (!entry.data.senses) return false;
        for (var i = 0; i < entry.data.senses.length; i++) {
          if (entry.data.senses[i].pos.toLowerCase() === pos.toLowerCase()) return true;
        }
        return false;
      });
    }
    fcWords = words;
    fcIndex = 0;
    fcFlipped = false;
    if (fcWords.length > 0) {
      renderFlashcard();
    } else {
      $('fc-word').textContent = 'No words found';
    }
  }

  function renderFlashcard() {
    var entry = fcWords[fcIndex];
    if (!entry) {
      $('flashcard-counter').textContent = '0 / 0';
      return;
    }

    var d = entry.data;
    var pron = d.pronunciation || {};
    var audio = d.audio || {};
    var senses = d.senses || [];

    var firstPOS = senses.length > 0 ? senses[0].pos : '';
    var firstDef = senses.length > 0 && senses[0].definitions.length > 0 ? senses[0].definitions[0] : {};
    var allDefs = [];
    var allExamples = [];
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
    var ipaText = '';
    if (pron.uk) ipaText += 'UK ' + pron.uk;
    if (pron.uk && pron.us) ipaText += '  US ' + pron.us;
    else if (pron.us) ipaText += 'US ' + pron.us;
    $('fc-ipa').textContent = ipaText;
    $('fc-pos').textContent = firstPOS;

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

    var audioHTML = '';
    if (audio.uk) audioHTML += '<button onclick="window.playAudio(\'' + audio.uk + '\')">🔊 UK</button>';
    if (audio.us) audioHTML += '<button onclick="window.playAudio(\'' + audio.us + '\')">🔊 US</button>';
    $('fc-audio').innerHTML = audioHTML;
    $('fc-audio-front').innerHTML = audioHTML;
    $('fc-audio').onclick = function (e) { e.stopPropagation(); };
    $('fc-audio-front').onclick = function (e) { e.stopPropagation(); };
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

  function fcPrev() {
    if (fcIndex > 0) {
      fcIndex--;
      fcFlipped = false;
      renderFlashcard();
    }
  }

  function fcNext() {
    if (fcIndex < fcWords.length - 1) {
      fcIndex++;
      fcFlipped = false;
      renderFlashcard();
    }
  }

  function exportFiltered() {
    var blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.json';
    a.click();
    URL.revokeObjectURL(url);
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
