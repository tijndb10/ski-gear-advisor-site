// Engine tests. Runs under JXA (tests/run.sh) or anywhere with globals:
//   SkiEngine, catalog, log(msg)
var failures = 0, checks = 0;
function check(cond, msg) { checks++; if (!cond) { failures++; log('FAIL: ' + msg); } }
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }

var base = { level: 2, terrain: 'mixed', style: 'balanced', heightCm: 175, weightKg: 70,
  gender: 'm', bootMondo: 275, footWidth: 'medium', daysPerYear: 'mid', budgetMax: null };
function with_(o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o) r[k] = o[k]; return r; }

function sane(res, label, opts) {
  opts = opts || {};
  check(res.skis.length === 3, label + ': 3 skis, got ' + res.skis.length);
  check(res.boots.length === 3, label + ': 3 boots, got ' + res.boots.length);
  [res.skis, res.boots].forEach(function (list) {
    var ids = {}; list.forEach(function (i) { ids[i.id] = 1; });
    check(Object.keys(ids).length === list.length, label + ': picks are distinct');
    list.forEach(function (i) {
      check(i.reasons.length > 0, label + ': ' + i.id + ' has reasons');
      check(i.matchPercent >= 0 && i.matchPercent <= 100, label + ': percent in range');
      if (opts.budget && !opts.allowRelaxed) check(i.priceEur <= opts.budget, label + ': ' + i.id + ' within budget');
    });
  });
  // Labels must be true.
  [[res.skis, 'stiffness'], [res.boots, 'flex']].forEach(function (pair) {
    var list = pair[0], key = pair[1], best = list[0];
    check(best.role === 'best', label + ': first pick is best match');
    list.forEach(function (i) {
      if (i.role === 'value') check(i.priceEur < best.priceEur, label + ': value pick is cheaper');
      if (i.role === 'stepup') check(i.product[key] > best.product[key], label + ': step-up is stiffer');
    });
  });
  res.skis.forEach(function (s) { check(s.recommendedLengthCm >= s.product.lengthCm[0] && s.recommendedLengthCm <= s.product.lengthCm[1], label + ': ski length within product range'); });
}

// 1. Every combination of level x terrain x gender x foot width yields 3+3 and valid output.
var terrains = ['piste', 'mixed', 'offpiste', 'park'], genders = ['m', 'w', 'x'], widths = ['narrow', 'medium', 'wide'];
var n = 0;
[1, 2, 3, 4].forEach(function (lvl) { terrains.forEach(function (t) { genders.forEach(function (g) { widths.forEach(function (w) {
  var mondo = g === 'w' ? 245 : 280;
  var res = SkiEngine.recommend(with_({ level: lvl, terrain: t, gender: g, footWidth: w, bootMondo: mondo }), catalog);
  sane(res, 'L' + lvl + ' ' + t + ' ' + g + ' ' + w); n++;
  // Fit is a hard filter unless the engine says it widened the search.
  if (res.notes.length === 0) {
    var ideal = { narrow: 97, medium: 100, wide: 103 }[w];
    res.boots.forEach(function (b) { check(b.product.lastMm - ideal >= -2 && b.product.lastMm - ideal <= 5, 'L' + lvl + ' ' + g + ' ' + w + ': ' + b.name + ' last ' + b.product.lastMm + ' fits foot'); });
  }
}); }); }); });
log('matrix combos: ' + n);

// 2. Sensible outcomes.
var beg = SkiEngine.recommend(with_({ level: 1, terrain: 'piste', gender: 'm', weightKg: 65, heightCm: 172 }), catalog);
check(beg.skis[0].product.stiffness <= 2, 'beginner top ski is soft');
check(beg.boots[0].product.flex <= 80, 'beginner top boot is soft');
check(beg.skis[0].product.terrain.piste >= 2, 'beginner piste ski suits piste');

var pow = SkiEngine.recommend(with_({ level: 4, terrain: 'offpiste', style: 'aggressive', heightCm: 185, weightKg: 85 }), catalog);
check(pow.skis[0].product.waistMm >= 96, 'off-piste top ski is wide: ' + pow.skis[0].name);
check(pow.boots[0].product.walkMode === true, 'off-piste top boot has walk mode: ' + pow.boots[0].name);

var wom = SkiEngine.recommend(with_({ level: 2, gender: 'w', bootMondo: 245, heightCm: 165, weightKg: 58 }), catalog);
check(wom.boots.every(function (b) { return b.product.gender === 'w'; }), "women's boots only");

var wide = SkiEngine.recommend(with_({ footWidth: 'wide', level: 3 }), catalog);
check(wide.boots[0].product.lastMm >= 102, 'wide foot gets wide last first: ' + wide.boots[0].name);
var narrow = SkiEngine.recommend(with_({ footWidth: 'narrow', level: 3 }), catalog);
check(narrow.boots[0].product.lastMm <= 99, 'narrow foot gets narrow last first: ' + narrow.boots[0].name);

var tall = SkiEngine.recommend(with_({ heightCm: 190, level: 3 }), catalog);
var short = SkiEngine.recommend(with_({ heightCm: 160, level: 3 }), catalog);
check(tall.skis[0].recommendedLengthCm >= short.skis[0].recommendedLengthCm, 'taller skier gets longer ski');

// 3. Roles.
var roles = beg.skis.map(function (s) { return s.role; }).join(',');
check(roles === 'best,value,stepup', 'beginner ski roles in order, got ' + roles);

// 4. Budget: hard where possible.
var bud = SkiEngine.recommend(with_({ level: 2, budgetMax: 450 }), catalog);
sane(bud, 'budget450', { budget: 450, allowRelaxed: bud.notes.length > 0 });
var tiny = SkiEngine.recommend(with_({ level: 3, budgetMax: 100 }), catalog);
sane(tiny, 'budget100');
check(tiny.notes.length > 0, 'impossible budget produces a note');

// 5. Edge size: outside every boot range degrades gracefully, no crash.
var edge = SkiEngine.recommend(with_({ gender: 'w', bootMondo: 300 }), catalog);
check(edge.boots.length <= 3, 'oversize women: no crash');

// 6. Validation.
check(throws(function () { SkiEngine.recommend(with_({ level: 9 }), catalog); }), 'rejects bad level');
check(throws(function () { SkiEngine.recommend(with_({ terrain: 'moon' }), catalog); }), 'rejects bad terrain');
check(throws(function () { SkiEngine.recommend(with_({ heightCm: 50 }), catalog); }), 'rejects bad height');
check(throws(function () { SkiEngine.recommend(with_({ bootMondo: 'abc' }), catalog); }), 'rejects bad boot size');
check(throws(function () { SkiEngine.recommend(null, catalog); }), 'rejects null');

// 7. Deterministic.
check(JSON.stringify(SkiEngine.recommend(base, catalog)) === JSON.stringify(SkiEngine.recommend(base, catalog)), 'deterministic');

log(checks + ' checks, ' + failures + ' failures');
if (failures) { throw new Error('tests failed'); }
