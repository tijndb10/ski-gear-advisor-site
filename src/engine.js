/*
 * Ski Gear Advisor - recommendation engine
 * Pure, dependency-free. Works in the browser (window.SkiEngine) and CommonJS.
 *
 * Usage: SkiEngine.recommend(answers, catalog) -> { skis: [3], boots: [3], notes: [] }
 *
 * answers:
 *   level       1-4  (1 beginner, 2 intermediate, 3 advanced, 4 expert)   required
 *   terrain     'piste' | 'mixed' | 'offpiste' | 'park'                    required
 *   style       'cautious' | 'balanced' | 'aggressive'                      default 'balanced'
 *   heightCm    120-215                                                     required
 *   weightKg    30-150                                                      required
 *   gender      'm' | 'w' | 'x' (x = no preference, all product lines)      default 'x'
 *   bootMondo   boot size in mondopoint (cm*10), 200-340                    required
 *   footWidth   'narrow' | 'medium' | 'wide'                                default 'medium'
 *   daysPerYear 'low' (1-7) | 'mid' (8-20) | 'high' (20+)                   default 'low'
 *   budgetMax   max price in EUR per item, or null for no limit             default null
 *
 * Each item is hard-filtered, scored 0-100, then three are picked with variety:
 * "Best match", "Best value" (cheaper, still close), "Step up" (stiffer / higher level).
 */
(function (root) {
  'use strict';

  var TERRAINS = ['piste', 'mixed', 'offpiste', 'park'];
  var STYLES = ['cautious', 'balanced', 'aggressive'];
  var WIDTHS = ['narrow', 'medium', 'wide'];
  var GENDERS = ['m', 'w', 'x'];
  var DAYS = ['low', 'mid', 'high'];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function distOutside(v, lo, hi) { return v < lo ? lo - v : (v > hi ? v - hi : 0); }
  function has(list, v) { return list.indexOf(v) !== -1; }

  // ---------- input validation ----------
  function normalize(a) {
    if (!a || typeof a !== 'object') throw new Error('answers are required');
    var n = {};
    n.level = Math.round(Number(a.level));
    if (!(n.level >= 1 && n.level <= 4)) throw new Error('level must be 1-4');
    if (!has(TERRAINS, a.terrain)) throw new Error('terrain must be one of ' + TERRAINS.join(', '));
    n.terrain = a.terrain;
    n.style = a.style == null ? 'balanced' : a.style;
    if (!has(STYLES, n.style)) throw new Error('invalid style');
    n.heightCm = Number(a.heightCm);
    if (!(n.heightCm >= 120 && n.heightCm <= 215)) throw new Error('heightCm must be 120-215');
    n.weightKg = Number(a.weightKg);
    if (!(n.weightKg >= 30 && n.weightKg <= 150)) throw new Error('weightKg must be 30-150');
    n.gender = a.gender == null ? 'x' : a.gender;
    if (!has(GENDERS, n.gender)) throw new Error('invalid gender');
    n.bootMondo = Number(a.bootMondo);
    if (!(n.bootMondo >= 200 && n.bootMondo <= 340)) throw new Error('bootMondo must be 200-340');
    n.footWidth = a.footWidth == null ? 'medium' : a.footWidth;
    if (!has(WIDTHS, n.footWidth)) throw new Error('invalid footWidth');
    n.daysPerYear = a.daysPerYear == null ? 'low' : a.daysPerYear;
    if (!has(DAYS, n.daysPerYear)) throw new Error('invalid daysPerYear');
    n.budgetMax = a.budgetMax == null ? null : Number(a.budgetMax);
    if (n.budgetMax !== null && !(n.budgetMax > 0)) throw new Error('budgetMax must be > 0 or null');
    return n;
  }

  var FOOT_LAST = { narrow: 97, medium: 100, wide: 103 };

  // ---------- filtering with graceful relaxation ----------
  // Steps are tried in order until at least 3 candidates remain.
  var RELAX_STEPS = [
    { note: null, budget: 1, levelSlack: 0, anyGender: false },
    { note: 'A few picks are up to 20% over your budget because too few products fit it.', budget: 1.2, levelSlack: 0, anyGender: false },
    { note: 'Some picks are one level off your skill level because too few products matched exactly.', budget: 1.2, levelSlack: 1, anyGender: false },
    { note: 'We widened the search (budget up to 50% over, other product lines) to find enough options.', budget: 1.5, levelSlack: 1, anyGender: true },
    { note: 'We widened the search a lot to find enough options; please double-check the fit in store.', budget: Infinity, levelSlack: 2, anyGender: true }
  ];

  function genderOk(productGender, g, any, isBoot) {
    if (any || g === 'x') return true;
    if (g === 'w') return productGender === 'w' || (!isBoot && productGender === 'u');
    return productGender === 'u'; // men: unisex/men's line
  }

  function filterStep(list, a, step, isBoot) {
    return list.filter(function (p) {
      if (!genderOk(p.gender, a.gender, step.anyGender, isBoot)) return false;
      if (a.level < p.levelMin - step.levelSlack || a.level > p.levelMax + step.levelSlack) return false;
      if (a.budgetMax !== null && p.priceEur > a.budgetMax * step.budget) return false;
      if (isBoot && (a.bootMondo < p.mondoRange[0] || a.bootMondo > p.mondoRange[1])) return false;
      // Fit is a hard filter: a boot much narrower than the foot hurts, a much roomier one is loose.
      if (isBoot && !step.anyGender) {
        var d = p.lastMm - FOOT_LAST[a.footWidth];
        if (d < -2 || d > 5) return false;
      }
      return true;
    });
  }

  function candidates(list, a, isBoot, notes) {
    for (var i = 0; i < RELAX_STEPS.length; i++) {
      var found = filterStep(list, a, RELAX_STEPS[i], isBoot);
      if (found.length >= 3) {
        if (RELAX_STEPS[i].note) notes.push((isBoot ? 'Boots: ' : 'Skis: ') + RELAX_STEPS[i].note);
        return { items: found, step: RELAX_STEPS[i] };
      }
    }
    var last = RELAX_STEPS[RELAX_STEPS.length - 1];
    notes.push((isBoot ? 'Boots: ' : 'Skis: ') + 'We found fewer than 3 suitable products for your answers.');
    return { items: filterStep(list, a, last, isBoot), step: last };
  }

  // ---------- skis ----------
  var WAIST_IDEAL = { piste: [68, 80], mixed: [80, 92], offpiste: [96, 115], park: [85, 96] };
  var TERRAIN_LABEL = { piste: 'groomed pistes', mixed: 'mixed terrain', offpiste: 'off-piste and powder', park: 'the park' };

  function skiLength(a, range) {
    var offset = { 1: 15, 2: 10, 3: 5, 4: 0 }[a.level];
    var t = a.heightCm - offset;
    if (a.terrain === 'offpiste') t += 5;
    if (a.terrain === 'park') t -= 5;
    if (a.weightKg < 55) t -= 3;
    if (a.weightKg > 90) t += 3;
    return { target: Math.round(t), fitted: Math.round(clamp(t, range[0], range[1])) };
  }

  function skiStiffTarget(a) {
    var t = { 1: 1.2, 2: 2.5, 3: 3.5, 4: 4.5 }[a.level];
    t += { cautious: -0.5, balanced: 0, aggressive: 0.5 }[a.style];
    if (a.weightKg > 90) t += 0.3;
    if (a.weightKg < 55) t -= 0.3;
    return t;
  }

  function levelFit(a, p, max) {
    var centre = (p.levelMin + p.levelMax) / 2;
    var s = max - 4 * Math.abs(a.level - centre) * (max / 20);
    var slack = distOutside(a.level, p.levelMin, p.levelMax);
    s -= slack * 8 * (max / 20);
    return clamp(s, 0, max);
  }

  function scoreSki(p, a) {
    var reasons = [];
    var terrainFit = p.terrain[a.terrain] / 3 * 40;
    if (p.terrain[a.terrain] >= 3) reasons.push('Built for ' + TERRAIN_LABEL[a.terrain] + '.');
    else if (p.terrain[a.terrain] === 2) reasons.push('Handles ' + TERRAIN_LABEL[a.terrain] + ' well.');

    var lvl = levelFit(a, p, 20);
    if (distOutside(a.level, p.levelMin, p.levelMax) === 0) reasons.push('Matches your skill level.');

    var stiffTarget = skiStiffTarget(a);
    var stiffDiff = Math.abs(p.stiffness - stiffTarget);
    var stiffFit = Math.max(0, 20 - 6 * stiffDiff);
    if (stiffDiff <= 0.6) {
      reasons.push(p.stiffness <= 2 ? 'Soft, forgiving flex that is easy to turn.'
        : p.stiffness >= 4 ? 'Stiff and stable, suits your speed and weight.'
        : 'Medium flex: a good balance of ease and stability.');
    }

    var w = WAIST_IDEAL[a.terrain];
    var waistFit = Math.max(0, 10 - 0.6 * distOutside(p.waistMm, w[0], w[1]));
    if (waistFit >= 9) reasons.push('Waist width of ' + p.waistMm + ' mm is ideal for ' + TERRAIN_LABEL[a.terrain] + '.');

    var len = skiLength(a, p.lengthCm);
    var lenFit = Math.max(0, 10 - 2 * distOutside(len.target, p.lengthCm[0] - 3, p.lengthCm[1] + 3));
    var score = terrainFit + lvl + stiffFit + waistFit + lenFit;
    return { score: score, max: 100, reasons: reasons, recommendedLengthCm: len.fitted, sortKey: p.stiffness };
  }

  // ---------- boots ----------
  var FLEX_BASE = {
    m: { 1: 65, 2: 90, 3: 108, 4: 125 },
    w: { 1: 55, 2: 78, 3: 95, 4: 110 }
  };
  function bootFlexTarget(a) {
    var base = a.gender === 'x'
      ? (FLEX_BASE.m[a.level] + FLEX_BASE.w[a.level]) / 2
      : FLEX_BASE[a.gender][a.level];
    if (a.weightKg > 90) base += 8;
    if (a.weightKg < 60) base -= 8;
    base += { cautious: -5, balanced: 0, aggressive: 5 }[a.style];
    return clamp(base, 50, 130);
  }

  function scoreBoot(p, a) {
    var reasons = [];
    var target = bootFlexTarget(a);
    var flexDiff = Math.abs(p.flex - target);
    var flexFit = Math.max(0, 40 - 1.5 * flexDiff);
    if (flexDiff <= 8) reasons.push('Flex ' + p.flex + ' fits your level, weight and style.');

    var d = p.lastMm - FOOT_LAST[a.footWidth];
    var lastFit = Math.max(0, 30 - (d < 0 ? 10 : 5) * Math.abs(d));
    if (Math.abs(d) <= 1) reasons.push('The ' + p.lastMm + ' mm last suits your ' + a.footWidth + ' feet.');
    else if (d > 1) reasons.push('Roomier than your foot shape: comfortable, but have it fitted snugly in store.');

    var lvl = levelFit(a, p, 15);
    if (distOutside(a.level, p.levelMin, p.levelMax) === 0) reasons.push('Matches your skill level.');

    var terrainFit;
    if (a.terrain === 'offpiste') {
      terrainFit = p.walkMode ? 10 : 3;
      if (p.walkMode) reasons.push('Walk mode makes off-piste hikes and walking easier.');
    } else {
      terrainFit = 6;
      if (p.walkMode && a.level <= 2) reasons.push('Walk mode makes walking around the resort comfortable.');
    }
    return { score: flexFit + lastFit + lvl + terrainFit, max: 95, reasons: reasons, sortKey: p.flex };
  }

  // ---------- picking three with variety ----------
  function byScoreDesc(x, y) { return y.score - x.score || x.p.priceEur - y.p.priceEur || (x.p.id < y.p.id ? -1 : 1); }

  function pickThree(scored) {
    scored.sort(byScoreDesc);
    if (!scored.length) return [];
    var best = scored[0];
    var rest = scored.slice(1);
    var picks = [{ s: best, role: 'best', label: 'Best match' }];

    // Best value: cheaper than best, still close in score.
    // Labels must be true: if no product qualifies, the slot is filled by the
    // next-best product labelled neutrally ("Also a strong match").
    var valuePool = rest.filter(function (x) { return x.score >= best.score - 20 && x.p.priceEur <= best.p.priceEur * 0.95; });
    valuePool.sort(function (x, y) { return x.p.priceEur - y.p.priceEur || y.score - x.score; });
    var value = valuePool[0];
    if (value) {
      picks.push({ s: value, role: 'value', label: 'Best value' });
      rest = rest.filter(function (x) { return x !== value; });
    }

    // Step up: stiffer than best match, still close in score.
    var stepPool = rest.filter(function (x) { return x.score >= best.score - 25 && x.sortKey > best.sortKey; });
    var step = stepPool[0];
    if (step) {
      picks.push({ s: step, role: 'stepup', label: 'Step up' });
      rest = rest.filter(function (x) { return x !== step; });
    }

    // Fill any remaining slots with the next-best products.
    while (picks.length < 3 && rest.length) {
      picks.push({ s: rest.shift(), role: 'alt', label: 'Also a strong match' });
    }
    return picks;
  }

  function present(picks, isBoot) {
    return picks.map(function (pk) {
      var s = pk.s;
      var item = {
        id: s.p.id, brand: s.p.brand, name: s.p.name,
        role: pk.role, roleLabel: pk.label,
        matchPercent: Math.round(clamp(s.score / s.max, 0, 1) * 100),
        priceEur: s.p.priceEur, bestFor: s.p.bestFor,
        reasons: s.reasons.slice(),
        product: s.p
      };
      if (pk.role === 'value') item.reasons.push('Lower price (EUR ' + s.p.priceEur + ') while still a strong match.');
      if (pk.role === 'stepup') item.reasons.push('A more demanding option you can grow into.');
      if (!isBoot) item.recommendedLengthCm = s.recommendedLengthCm;
      return item;
    });
  }

  function recommendCategory(list, a, isBoot, notes) {
    var c = candidates(list, a, isBoot, notes);
    var scored = c.items.map(function (p) {
      var r = isBoot ? scoreBoot(p, a) : scoreSki(p, a);
      return { p: p, score: r.score, max: r.max, reasons: r.reasons, recommendedLengthCm: r.recommendedLengthCm, sortKey: r.sortKey };
    });
    return present(pickThree(scored), isBoot);
  }

  function recommend(answers, catalog) {
    var a = normalize(answers);
    var notes = [];
    return {
      skis: recommendCategory(catalog.skis, a, false, notes),
      boots: recommendCategory(catalog.boots, a, true, notes),
      notes: notes
    };
  }

  var api = { recommend: recommend, normalize: normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SkiEngine = api;
})(typeof window !== 'undefined' ? window : this);
