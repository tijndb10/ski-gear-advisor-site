/* Ski Gear Advisor - UI. Depends on window.SKI_CATALOG and window.SkiEngine. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- questions ----------
  var QUESTIONS = [
    { id: 'level', type: 'choice', title: 'How would you describe your skiing?',
      hint: 'Pick the one that sounds most like you. Be honest: the right gear is the gear for how you ski today.',
      options: [
        { v: 1, t: 'Beginner', d: 'New to skiing, or still learning to turn and stop with confidence.' },
        { v: 2, t: 'Intermediate', d: 'Comfortable on blue and some red runs, linking turns smoothly.' },
        { v: 3, t: 'Advanced', d: 'Confident on all pistes, happy at speed and in variable snow.' },
        { v: 4, t: 'Expert', d: 'Skis steep, challenging terrain with power and precision.' }
      ] },
    { id: 'daysPerYear', type: 'choice', title: 'How many days do you ski per year?',
      hint: 'A rough guess is fine.',
      options: [
        { v: 'low', t: '1 to 7 days', d: 'A holiday or two.' },
        { v: 'mid', t: '8 to 20 days', d: 'Several trips a season.' },
        { v: 'high', t: 'More than 20 days', d: 'A real ski habit.' }
      ] },
    { id: 'terrain', type: 'choice', title: 'Where do you like to ski most?',
      hint: 'Choose your favourite, even if you ski a bit of everything.',
      options: [
        { v: 'piste', t: 'Groomed pistes', d: 'Prepared runs, carving turns.' },
        { v: 'mixed', t: 'A bit of everything', d: 'Pistes plus some fresh or bumpy snow.' },
        { v: 'offpiste', t: 'Off-piste and powder', d: 'Deep snow and untouched slopes.' },
        { v: 'park', t: 'Freestyle and park', d: 'Jumps, rails and tricks.' }
      ] },
    { id: 'style', type: 'choice', title: 'How do you ski?',
      options: [
        { v: 'cautious', t: 'Careful and relaxed', d: 'I prefer to stay in control and take it easy.' },
        { v: 'balanced', t: 'A bit of both', d: 'Relaxed most of the time, faster when it feels good.' },
        { v: 'aggressive', t: 'Fast and aggressive', d: 'I like speed, steeper runs and pushing myself.' }
      ] },
    { id: 'body', type: 'body', title: 'How tall are you, and how much do you weigh?',
      hint: 'We use this to suggest the right ski length and boot stiffness. It is not stored anywhere.' },
    { id: 'gender', type: 'choice', title: 'Which product line suits you?',
      hint: 'Some skis and boots are designed for women (lighter flex, different shape). Choose what you prefer.',
      options: [
        { v: 'w', t: "Women's", d: "Women's skis and boots." },
        { v: 'm', t: "Men's / unisex", d: "Men's and unisex skis and boots." },
        { v: 'x', t: 'No preference', d: 'Show me whatever fits best.' }
      ] },
    { id: 'feet', type: 'feet', title: 'What is your shoe size and foot shape?',
      hint: 'Boot fit matters most. We convert your shoe size to a ski boot size.' },
    { id: 'budgetMax', type: 'choice', title: 'What is your budget per item?',
      hint: 'This applies to the skis and to the boots separately.',
      options: [
        { v: '300', t: 'Up to €300', d: 'Entry level.' },
        { v: '600', t: 'Up to €600', d: 'Good quality for most skiers.' },
        { v: '1000', t: 'Up to €1000', d: 'Premium gear.' },
        { v: 'none', t: 'No limit', d: 'Show me the best fit.' }
      ] }
  ];

  // ---------- state ----------
  var state = { step: 0, units: 'metric', a: {} };
  var views = ['landing', 'quiz', 'results'];

  function show(view) {
    views.forEach(function (v) { $('view-' + v).hidden = v !== view; });
    var target = view === 'quiz' ? $('quiz-step').querySelector('legend') : (view === 'results' ? $('results-title') : $('landing-title'));
    window.scrollTo(0, 0);
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }

  // ---------- rendering questions ----------
  function renderStep() {
    var q = QUESTIONS[state.step];
    var total = QUESTIONS.length;
    $('progress-label').textContent = 'Question ' + (state.step + 1) + ' of ' + total;
    var bar = document.querySelector('.progress-bar');
    bar.setAttribute('aria-valuenow', state.step + 1);
    bar.setAttribute('aria-valuemax', total);
    $('progress-fill').style.width = ((state.step + 1) / total * 100) + '%';
    $('btn-back').hidden = state.step === 0;
    $('btn-next').textContent = state.step === total - 1 ? 'See my gear' : 'Next';
    $('quiz-error').hidden = true;

    var html = '<fieldset><legend>' + esc(q.title) + '</legend>' + (q.hint ? '<p class="hint">' + esc(q.hint) + '</p>' : '');
    if (q.type === 'choice') {
      var cur = state.a[q.id];
      html += '<div class="options' + (q.options.length === 4 ? ' two' : '') + '">';
      q.options.forEach(function (o, i) {
        var id = 'q-' + q.id + '-' + i;
        html += '<div class="option"><input type="radio" name="' + q.id + '" id="' + id + '" value="' + esc(o.v) + '"' +
          (String(cur) === String(o.v) ? ' checked' : '') + '><label for="' + id + '"><span class="t">' + esc(o.t) +
          '</span><span class="d">' + esc(o.d) + '</span></label></div>';
      });
      html += '</div>';
    } else if (q.type === 'body') {
      html += bodyHtml();
    } else if (q.type === 'feet') {
      html += feetHtml();
    }
    html += '</fieldset>';
    $('quiz-step').innerHTML = html;
    show('quiz');
  }

  function bodyHtml() {
    var m = state.units === 'metric', a = state.a;
    var h = '<div class="unit-toggle" role="group" aria-label="Units">' +
      '<button type="button" data-unit="metric" aria-pressed="' + m + '">Metric (cm, kg)</button>' +
      '<button type="button" data-unit="imperial" aria-pressed="' + !m + '">Imperial (ft, lb)</button></div><div class="row">';
    if (m) {
      h += field('height-cm', 'Height (cm)', a.heightCm, 'e.g. 175', 120, 215) + field('weight-kg', 'Weight (kg)', a.weightKg, 'e.g. 70', 30, 150);
    } else {
      var ft = a.heightCm ? Math.floor(a.heightCm / 2.54 / 12) : '', inch = a.heightCm ? Math.round(a.heightCm / 2.54 - ft * 12) : '';
      h += field('height-ft', 'Height (feet)', ft, 'e.g. 5', 3, 7) + field('height-in', 'Inches', inch, 'e.g. 9', 0, 11) +
        field('weight-lb', 'Weight (lb)', a.weightKg ? Math.round(a.weightKg * 2.2046) : '', 'e.g. 155', 66, 330);
    }
    return h + '</div>';
  }

  function field(id, label, val, ph, min, max) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input type="number" inputmode="decimal" id="' + id +
      '" name="' + id + '" min="' + min + '" max="' + max + '" placeholder="' + ph + '" value="' + (val === undefined || val === null ? '' : esc(val)) + '"></div>';
  }

  function feetHtml() {
    var a = state.a, w = a.footWidth || '';
    var h = field('eu-size', 'Your normal shoe size (EU)', a.euSize, 'e.g. 42', 34, 48) +
      '<p class="hint" style="margin-top:-8px">Using US or UK sizes? A US men\'s 9 is about EU 42, and a US women\'s 8 is about EU 39.</p>' +
      '<div class="field"><span class="lab" id="width-lab">How wide are your feet?</span><div class="options" role="radiogroup" aria-labelledby="width-lab">';
    [['narrow', 'Narrow', 'Shoes often feel loose; you need to tighten them a lot.'],
     ['medium', 'Medium or not sure', 'Most shoes fit you fine.'],
     ['wide', 'Wide', 'Shoes often feel tight across the front of the foot.']].forEach(function (o, i) {
      h += '<div class="option"><input type="radio" name="footWidth" id="fw-' + i + '" value="' + o[0] + '"' + (w === o[0] ? ' checked' : '') +
        '><label for="fw-' + i + '"><span class="t">' + o[1] + '</span><span class="d">' + o[2] + '</span></label></div>';
    });
    return h + '</div></div>';
  }

  // ---------- reading + validating answers ----------
  function num(id) { var el = $(id); return el && el.value !== '' ? Number(el.value) : NaN; }

  function readStep() {
    var q = QUESTIONS[state.step];
    if (q.type === 'choice') {
      var c = document.querySelector('input[name="' + q.id + '"]:checked');
      if (!c) return 'Please choose an option to continue.';
      state.a[q.id] = c.value;
    } else if (q.type === 'body') {
      var cm, kg;
      if (state.units === 'metric') { cm = num('height-cm'); kg = num('weight-kg'); }
      else { cm = (num('height-ft') * 12 + (num('height-in') || 0)) * 2.54; kg = num('weight-lb') / 2.2046; }
      if (!(cm >= 120 && cm <= 215)) return 'Please enter a height between 120 and 215 cm (about 3\'11" to 7\'0").';
      if (!(kg >= 30 && kg <= 150)) return 'Please enter a weight between 30 and 150 kg (about 66 to 330 lb).';
      state.a.heightCm = Math.round(cm); state.a.weightKg = Math.round(kg);
    } else if (q.type === 'feet') {
      var eu = num('eu-size');
      if (!(eu >= 34 && eu <= 48)) return 'Please enter your EU shoe size, between 34 and 48.';
      var f = document.querySelector('input[name="footWidth"]:checked');
      if (!f) return 'Please choose how wide your feet are.';
      state.a.euSize = eu; state.a.footWidth = f.value;
    }
    return null;
  }

  // EU shoe size -> ski boot mondopoint (mm). Approx: EU 38 = 24.0 cm, +0.75 cm per size.
  function mondoFromEu(eu) { return Math.round((24 + (eu - 38) * 0.75) * 10); }

  function engineAnswers() {
    var a = state.a;
    return {
      level: Number(a.level), terrain: a.terrain, style: a.style,
      heightCm: a.heightCm, weightKg: a.weightKg, gender: a.gender,
      bootMondo: mondoFromEu(a.euSize), footWidth: a.footWidth,
      daysPerYear: a.daysPerYear, budgetMax: a.budgetMax === 'none' ? null : Number(a.budgetMax)
    };
  }

  // ---------- results ----------
  var LEVEL_NAME = { 1: 'beginner', 2: 'intermediate', 3: 'advanced', 4: 'expert' };
  var TERRAIN_NAME = { piste: 'groomed pistes', mixed: 'mixed terrain', offpiste: 'off-piste and powder', park: 'the park' };

  function stiffLabel(n) { return n <= 2 ? 'soft, forgiving' : n >= 4 ? 'stiff, stable' : 'medium'; }
  function flexLabel(f) { return f <= 75 ? 'soft' : f >= 105 ? 'stiff' : 'medium'; }
  function waistLabel(w) { return w < 80 ? 'quick on groomed runs' : w < 95 ? 'all-round' : 'floats in powder'; }
  function rockerLabel(r) {
    return { tip: 'Tip rocker (easy turning)', 'tip+tail': 'Tip and tail rocker (playful)', full: 'Full rocker (floaty)', twin: 'Twin tip (ski forwards or backwards)', camber: 'Camber (grippy, precise)' }[r] || r;
  }
  function lastLabel(l) { return l <= 99 ? 'narrow' : l <= 101 ? 'medium' : 'wide'; }

  function card(item, isBoot) {
    var p = item.product, specs;
    if (isBoot) {
      specs = ['Flex ' + p.flex + ' (' + flexLabel(p.flex) + ')', 'Last ' + p.lastMm + ' mm (' + lastLabel(p.lastMm) + ')', p.walkMode ? 'Walk mode' : 'No walk mode'];
    } else {
      specs = ['Waist ' + p.waistMm + ' mm (' + waistLabel(p.waistMm) + ')', 'Flex: ' + stiffLabel(p.stiffness),
        'Suggested length: ' + item.recommendedLengthCm + ' cm', rockerLabel(p.rocker)];
    }
    return '<article class="card"><div class="card-top"><div><span class="badge' + (item.role === 'best' ? ' best' : '') + '">' + esc(item.roleLabel) +
      '</span><h3>' + esc(item.name) + '</h3><div class="brandline">' + esc(item.brand) + ' · ' + esc(item.bestFor) + '</div></div>' +
      '<div class="price">€' + item.priceEur + '</div></div>' +
      '<div class="match"><span>Match</span><span class="meter" aria-hidden="true"><span style="width:' + item.matchPercent + '%"></span></span><strong>' + item.matchPercent + '%</strong></div>' +
      '<p style="margin:0;font-weight:600">Why it fits you</p><ul class="why">' + item.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      '<ul class="specs">' + specs.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></article>';
  }

  function showResults() {
    var a = engineAnswers(), res;
    try { res = window.SkiEngine.recommend(a, window.SKI_CATALOG); }
    catch (e) { state.step = 0; renderStep(); return; }
    $('results-summary').textContent = 'Based on your answers: ' + LEVEL_NAME[a.level] + ' skier, mostly on ' + TERRAIN_NAME[a.terrain] +
      ', ' + a.heightCm + ' cm, ' + a.weightKg + ' kg, shoe size EU ' + state.a.euSize + '.';
    $('results-notes').innerHTML = res.notes.map(function (n) { return '<p class="callout">' + esc(n) + '</p>'; }).join('');
    $('results-skis').innerHTML = res.skis.map(function (i) { return card(i, false); }).join('') || '<p>No skis found. Try adjusting your answers.</p>';
    $('results-boots').innerHTML = res.boots.map(function (i) { return card(i, true); }).join('') || '<p>No boots found. Try adjusting your answers.</p>';
    $('copy-status').textContent = '';
    try { history.replaceState(null, '', '#r=' + encodeURIComponent(btoa(JSON.stringify(state.a)))); } catch (e) { /* ignore */ }
    show('results');
  }

  function loadFromHash() {
    var m = /^#r=(.+)$/.exec(location.hash);
    if (!m) return false;
    try {
      var a = JSON.parse(atob(decodeURIComponent(m[1])));
      if (!a || typeof a !== 'object') return false;
      state.a = a;
      window.SkiEngine.recommend(engineAnswers(), window.SKI_CATALOG); // validates
      showResults();
      return true;
    } catch (e) { state.a = {}; return false; }
  }

  // ---------- events ----------
  function next() {
    var err = readStep();
    if (err) { var el = $('quiz-error'); el.textContent = err; el.hidden = false; return; }
    if (state.step < QUESTIONS.length - 1) { state.step++; renderStep(); } else { showResults(); }
  }

  $('quiz-form').addEventListener('submit', function (e) { e.preventDefault(); next(); });
  $('btn-back').addEventListener('click', function () {
    // Keep what the user typed on this screen when going back.
    readStep();
    if (state.step > 0) { state.step--; renderStep(); }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action],[data-unit]');
    if (!t) return;
    if (t.dataset.unit) {
      if (state.units !== t.dataset.unit) {
        // Preserve entered values across unit change.
        var cm, kg;
        if (state.units === 'metric') { cm = num('height-cm'); kg = num('weight-kg'); }
        else { cm = (num('height-ft') * 12 + (num('height-in') || 0)) * 2.54; kg = num('weight-lb') / 2.2046; }
        if (cm >= 120 && cm <= 215) state.a.heightCm = Math.round(cm);
        if (kg >= 30 && kg <= 150) state.a.weightKg = Math.round(kg);
        state.units = t.dataset.unit;
        var legendFocus = document.querySelector('[data-unit="' + state.units + '"]');
        $('quiz-step').innerHTML = '<fieldset><legend>' + esc(QUESTIONS[state.step].title) + '</legend><p class="hint">' + esc(QUESTIONS[state.step].hint) + '</p>' + bodyHtml() + '</fieldset>';
        legendFocus = document.querySelector('[data-unit="' + state.units + '"]'); if (legendFocus) legendFocus.focus();
      }
      return;
    }
    var act = t.dataset.action;
    if (act === 'start') { state.step = 0; renderStep(); }
    else if (act === 'edit') { state.step = 0; renderStep(); }
    else if (act === 'restart') { state.a = {}; state.step = 0; history.replaceState(null, '', location.pathname); show('landing'); }
    else if (act === 'home') { e.preventDefault(); history.replaceState(null, '', location.pathname); show('landing'); }
    else if (act === 'copy') {
      var url = location.href, ok = function () { $('copy-status').textContent = 'Link copied.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { $('copy-status').textContent = 'Copy this page address from your browser bar.'; });
      else $('copy-status').textContent = 'Copy this page address from your browser bar.';
    }
  });

  if (!loadFromHash()) { show('landing'); }
})();
