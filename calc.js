/*
 * Row Power Compare: the calculation rules.
 * Every number traces to an input or to a cited table of the 2023 National Electrical Code (NEC).
 * Written from the published NEC tables for this public tool.
 *
 * SIMPLIFICATIONS (listed so nobody mistakes them for code requirements):
 *  1. Every load is treated as continuous (125%, NEC 215.2(A)(1)).
 *  2. Copper and aluminum resistance is DC resistance at 75 °C (Chapter 9, Table 8). AC skin effect is ignored.
 *  3. Voltage drop and wire heat count resistance only (no reactance).
 *  4. Bundling: each per-rack run or each parallel set is in its own raceway with at most 3 current-carrying
 *     conductors, so no bundling adjustment applies. The neutral is not counted as current-carrying.
 *  5. Both AC options use the same conversion chain; their efficiencies are inputs you can change.
 *  6. Conversion efficiencies are typical published figures, not measurements of any product. The 800 V to
 *     rack converter figure (98%) is not yet confirmed.
 *  7. Cooling for the waste heat is (PUE - 1) times the heat, so the energy charged is the waste heat times PUE.
 *  8. Busway for a shared row feeder is sized by rating only; its copper, resistance and losses depend on the
 *     manufacturer and are not estimated.
 */
(function (root) {
  "use strict";

  // NEC 2023 Table 310.16: ampacity of insulated conductors, 30 °C ambient, not more than 3 current-carrying.
  var SIZES = ["14", "12", "10", "8", "6", "4", "3", "2", "1", "1/0", "2/0", "3/0", "4/0", "250", "300", "350", "400", "500", "600", "700", "750", "800", "900", "1000"];
  var AMP = {
    cu75: [20, 25, 35, 50, 65, 85, 100, 115, 130, 150, 175, 200, 230, 255, 285, 310, 335, 380, 420, 460, 475, 490, 520, 545],
    cu90: [25, 30, 40, 55, 75, 95, 115, 130, 145, 170, 195, 225, 260, 290, 320, 350, 380, 430, 475, 520, 535, 555, 585, 615],
    al75: [null, 20, 30, 40, 50, 65, 75, 90, 100, 120, 135, 155, 180, 205, 230, 250, 270, 310, 340, 375, 385, 395, 425, 445],
    al90: [null, 25, 35, 45, 55, 75, 85, 100, 115, 135, 150, 175, 205, 230, 260, 280, 305, 350, 385, 425, 435, 445, 480, 500]
  };
  // NEC 2023 Chapter 9, Table 8: DC resistance at 75 °C, ohms per 1,000 ft (uncoated copper; aluminum).
  var R75 = {
    cu: [3.07, 1.93, 1.21, 0.764, 0.491, 0.308, 0.245, 0.194, 0.154, 0.122, 0.0967, 0.0766, 0.0608, 0.0515, 0.0429, 0.0367, 0.0321, 0.0258, 0.0214, 0.0184, 0.0171, 0.0161, 0.0143, 0.0129],
    al: [5.06, 3.18, 2.00, 1.26, 0.808, 0.508, 0.403, 0.319, 0.253, 0.201, 0.159, 0.126, 0.100, 0.0847, 0.0707, 0.0605, 0.0529, 0.0424, 0.0353, 0.0303, 0.0282, 0.0265, 0.0235, 0.0212]
  };
  // NEC 2023 Chapter 9, Table 8: conductor area, circular mils.
  var CMIL = [4110, 6530, 10380, 16510, 26240, 41740, 52620, 66360, 83690, 105600, 133100, 167800, 211600, 250000, 300000, 350000, 400000, 500000, 600000, 700000, 750000, 800000, 900000, 1000000];
  // NEC 2023 240.6(A): standard ampere ratings of fuses and inverse-time circuit breakers.
  var STD = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000, 2500, 3000, 4000, 5000, 6000];
  // NEC 2023 Table 250.122: minimum equipment grounding conductor by the rating of the overcurrent device.
  var EGC = [[15, "14", "12"], [20, "12", "10"], [60, "10", "8"], [100, "8", "6"], [200, "6", "4"], [300, "4", "2"], [400, "3", "1"], [500, "2", "1/0"], [600, "1", "2/0"], [800, "1/0", "3/0"], [1000, "2/0", "4/0"], [1200, "3/0", "250"], [1600, "4/0", "350"], [2000, "250", "400"], [2500, "350", "600"], [3000, "400", "600"], [4000, "500", "750"], [5000, "700", "1000"], [6000, "800", "1000"]];
  // NEC 2023 Table 310.15(B)(1)(1): ambient temperature correction for 90 °C conductors, based on 30 °C.
  var TEMP90 = [[10, 1.15], [15, 1.12], [20, 1.08], [25, 1.04], [30, 1.00], [35, 0.96], [40, 0.91], [45, 0.87], [50, 0.82], [55, 0.76], [60, 0.71], [65, 0.65], [70, 0.58], [75, 0.50], [80, 0.41], [85, 0.29]];
  // Common busway ratings (amperes) offered by major manufacturers; a busway is chosen at or above the breaker.
  var BUSWAY = [100, 225, 400, 600, 800, 1000, 1200, 1350, 1600, 2000, 2500, 3000, 4000, 5000];
  // Metal densities, g/cm³ (copper 8.89, aluminum 2.70; standard handbook values).
  var DENSITY = { cu: 8.89, al: 2.70 };
  var CMIL_TO_MM2 = 0.0005067; // 1 circular mil = 0.0005067 mm² (definition of the circular mil).
  var FT_TO_M = 0.3048;
  var HOURS_PER_YEAR = 8760;
  var KCMIL500 = SIZES.indexOf("500"); // Above 500 kcmil, parallel sets (310.10(G) allows 1/0 and larger in parallel).

  function tempFactor(c) {
    for (var i = 0; i < TEMP90.length; i++) if (c <= TEMP90[i][0]) return TEMP90[i][1];
    return 0;
  }
  function nextStd(a, list) {
    for (var i = 0; i < list.length; i++) if (list[i] >= a) return list[i];
    return null;
  }
  function egcFor(ocpd, metal) {
    for (var i = 0; i < EGC.length; i++) if (ocpd <= EGC[i][0]) return metal === "cu" ? EGC[i][1] : EGC[i][2];
    return null;
  }
  function label(size) { return /^\d{3,4}$/.test(size) ? size + " kcmil" : size === "1/0" || size === "2/0" || size === "3/0" || size === "4/0" ? size : size + " AWG"; }

  /**
   * One feeder: the smallest wire (and fewest parallel sets) for a current, by NEC 215.2(A)(1), 310.16 (75 °C
   * column), the 90 °C rating after ambient correction, 240.6(A), 250.122 and 310.10(G).
   * required = 125% of the continuous load plus the non-continuous load.
   */
  function sizeFeeder(continuousA, nonContinuousA, metal, ambientC) {
    var required = continuousA * 1.25 + (nonContinuousA || 0);
    var load = continuousA + (nonContinuousA || 0);
    var t = tempFactor(ambientC);
    for (var sets = 1; sets <= 20; sets++) {
      var maxIdx = sets === 1 ? SIZES.length - 1 : KCMIL500; // a single run may go to 1000 kcmil; parallel sets stop at 500
      var minIdx = sets === 1 ? 0 : SIZES.indexOf("1/0");
      for (var i = minIdx; i <= maxIdx; i++) {
        if (sets === 1 && i > KCMIL500) break; // above 500 kcmil the tool uses parallel sets instead (plan rule)
        var a75 = AMP[metal + "75"][i];
        var a90 = AMP[metal + "90"][i];
        if (a75 == null) continue;
        if (a75 * sets >= required && a90 * t * sets >= load) {
          var ocpd = nextStd(required, STD);
          if (ocpd == null) return null;
          return { size: SIZES[i], label: label(SIZES[i]), idx: i, sets: sets, required: required, ocpd: ocpd, egc: egcFor(ocpd, metal), ampacity75: a75 * sets };
        }
      }
    }
    return null;
  }

  function kgPerFt(sizeIdx, metal) {
    var mm2 = CMIL[sizeIdx] * CMIL_TO_MM2;
    return mm2 * DENSITY[metal] * FT_TO_M / 1000; // mm² × g/cm³ = g/m; × m/ft; g → kg
  }

  /** Default inputs, each from the plan. */
  var DEFAULTS = {
    hallMW: 50, rackKW: 100, racksPerRow: 10, runFt: 150, avgLoad: 0.6, pf: 0.95, metal: "cu", ambientC: 30,
    priceKWh: 0.085, pue: 1.25, years: 10, cuPerKg: 13.5, alPerKg: 0, neutral: true,
    effMV: 0.99, effUPS: 0.97, ecoUPS: false, effUPSeco: 0.99, effShelf: 0.965, effSST: 0.98, effRackDC: 0.98
  };

  var OPTIONS = [
    { id: "ac480", name: "480 V AC", volts: 480, ac: true },
    { id: "ac415", name: "415 V AC", volts: 415, ac: true },
    { id: "dc800", name: "800 V DC", volts: 800, ac: false }
  ];

  /**
   * One option, for one topology ("rack": a run per rack; "row": one shared feeder per row).
   * Returns everything shown on its card, per row and for the whole hall.
   */
  function evaluate(opt, topology, input) {
    var x = Object.assign({}, DEFAULTS, input);
    var rackW = x.rackKW * 1000;
    var perFeederW = topology === "row" ? rackW * x.racksPerRow : rackW;
    var current = opt.ac ? perFeederW / (Math.sqrt(3) * opt.volts * x.pf) : perFeederW / opt.volts;
    var f = sizeFeeder(current, 0, x.metal, x.ambientC);
    if (!f) return { opt: opt, topology: topology, error: "No standard feeder fits this current. Lower the load or split the feeder." };
    var feeders = topology === "row" ? 1 : x.racksPerRow;
    var kft = x.runFt / 1000;
    var r = R75[x.metal][f.idx]; // ohms per 1,000 ft
    var currentCarrying = opt.ac ? 3 : 2;
    var perSetI = current / f.sets;
    // Voltage drop at full load (resistive): three-phase √3·I·R·L, DC 2·I·R·L, per parallel set.
    var vdV = (opt.ac ? Math.sqrt(3) : 2) * perSetI * r * kft;
    var vdPct = (vdV / opt.volts) * 100;
    // Wire heat at average load: I²R on current-carrying conductors only, scaled by load² (60% load → 36%).
    var heatW = currentCarrying * f.sets * perSetI * perSetI * r * kft * x.avgLoad * x.avgLoad * feeders;
    // Metal: current-carrying + neutral (AC, if chosen) + one grounding conductor per set, per feeder.
    var conductorsPerSet = currentCarrying + (opt.ac && x.neutral ? 1 : 0);
    var egcIdx = SIZES.indexOf(f.egc);
    var kg = (conductorsPerSet * kgPerFt(f.idx, x.metal) + kgPerFt(egcIdx, x.metal)) * f.sets * x.runFt * feeders;
    var pricePerKg = x.metal === "cu" ? x.cuPerKg : x.alPerKg;
    var metalCost = pricePerKg > 0 ? kg * pricePerKg : null;
    // Conversion losses at average load, through each option's chain of stages.
    var chain = opt.ac ? [x.effMV, x.ecoUPS ? x.effUPSeco : x.effUPS, x.effShelf] : [x.effSST, x.effRackDC];
    var eff = chain.reduce(function (a, b) { return a * b; }, 1);
    var itW = rackW * x.racksPerRow * x.avgLoad;
    var convW = itW / eff - itW;
    var wasteW = convW + heatW;
    var lossKWhYear = (wasteW / 1000) * x.pue * HOURS_PER_YEAR;
    var lossCostYear = lossKWhYear * x.priceKWh;
    var lossCostPeriod = lossCostYear * x.years;
    var total = lossCostPeriod + (metalCost || 0);
    var rows = x.hallMW * 1000 / (x.rackKW * x.racksPerRow);
    var busway = topology === "row" ? nextStd(f.ocpd, BUSWAY) : null;
    return {
      opt: opt, topology: topology, current: current, feeder: f, feeders: feeders, vdPct: vdPct, heatW: heatW,
      kgRow: kg, kgHall: kg * rows, metalCost: metalCost, eff: eff, convW: convW, lossCostYear: lossCostYear,
      lossCostPeriod: lossCostPeriod, total: total, totalHall: total * rows, rows: rows, busway: busway,
      vdOverGuidance: vdPct > 3
    };
  }

  function compare(input, topology) {
    var results = OPTIONS.map(function (o) { return evaluate(o, topology || "rack", input); });
    var ok = results.filter(function (r) { return !r.error; });
    var best = ok.reduce(function (a, b) { return !a || b.total < a.total ? b : a; }, null);
    return { results: results, best: best ? best.opt.id : null };
  }

  /**
   * The hand-worked checks from the plan. The page shows no results if any of these fails.
   * Each line is worked by hand in the comment beside it.
   */
  function selfCheck() {
    var fails = [];
    function expect(name, got, want) { if (got !== want) fails.push(name + ": got " + got + ", expected " + want); }
    // 100 A continuous, copper: 125 A needed → 1 AWG (130 A at 75 °C); breaker 125 A; ground 6 AWG (≤ 200 A).
    var a = sizeFeeder(100, 0, "cu", 30);
    expect("100 A copper wire", a.size, "1"); expect("100 A breaker", a.ocpd, 125); expect("100 A ground", a.egc, "6");
    // Same on aluminum: 125 A needed → 2/0 (135 A); 1/0 is only 120 A.
    expect("100 A aluminum wire", sizeFeeder(100, 0, "al", 30).size, "2/0");
    // 100 A continuous + 100 A non-continuous: 125 + 100 = 225 A → 4/0 (230 A); breaker 225 A.
    var b = sizeFeeder(100, 100, "cu", 30);
    expect("225 A wire", b.size, "4/0"); expect("225 A breaker", b.ocpd, 225);
    // 100 kW at 480 V AC, pf 0.95: 100,000 / (1.732 × 480 × 0.95) = 126.6 A; × 1.25 = 158.3 A → 2/0 (175 A);
    // breaker 175 A; ground 6 AWG.
    var c = evaluate(OPTIONS[0], "rack", { racksPerRow: 1 });
    expect("100 kW at 480 V current", Math.round(c.current * 10) / 10, 126.6);
    expect("100 kW at 480 V wire", c.feeder.size, "2/0"); expect("100 kW breaker", c.feeder.ocpd, 175); expect("100 kW ground", c.feeder.egc, "6");
    // 1,250 A at 800 V DC: × 1.25 = 1,562.5 A; 4 sets need 390.6 A each (500 kcmil is only 380 A) → 5 sets of
    // 400 kcmil (335 A, 1,675 A total); breaker 1,600 A; ground 4/0 per set (≤ 1,600 A).
    var d = sizeFeeder(1250, 0, "cu", 30);
    expect("1,250 A sets", d.sets, 5); expect("1,250 A wire", d.size, "400"); expect("1,250 A breaker", d.ocpd, 1600); expect("1,250 A ground", d.egc, "4/0");
    // 50 MW hall, defaults, per-rack runs: copper within 1% of 57.5 t (480 V AC), 71.8 t (415 V AC), 30.1 t (800 V DC).
    var hall = compare({}, "rack").results;
    [[0, 57.5], [1, 71.8], [2, 30.1]].forEach(function (p) {
      var t = hall[p[0]].kgHall / 1000;
      if (Math.abs(t - p[1]) / p[1] > 0.01) fails.push(hall[p[0]].opt.name + " copper: " + t.toFixed(1) + " t, expected " + p[1] + " t (±1%)");
    });
    return fails;
  }

  var api = { DEFAULTS: DEFAULTS, OPTIONS: OPTIONS, sizeFeeder: sizeFeeder, evaluate: evaluate, compare: compare, selfCheck: selfCheck, tempFactor: tempFactor };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RowPower = api;
})(this);
