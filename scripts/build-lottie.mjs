/* Generates two self-contained Lottie animations into assets/lottie/.
   mascot.json  — a bobbing, gently-spinning gold coin (loops)
   celebrate.json — a confetti burst from center (one-shot)
*/
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('assets/lottie', { recursive: true });

/* ---------------- mascot: bobbing coin ---------------- */
const easeIO = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } };
const mascot = {
  v: '5.7.4', fr: 30, ip: 0, op: 60, w: 200, h: 200, nm: 'mascot', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'coin', sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 1, k: [
        { t: 0, s: [-7], ...easeIO }, { t: 30, s: [7], ...easeIO }, { t: 60, s: [-7] }
      ] },
      p: { a: 1, k: [
        { t: 0, s: [100, 110], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
        { t: 15, s: [100, 90], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
        { t: 30, s: [100, 110], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
        { t: 45, s: [100, 90], i: { x: 0.4, y: 1 }, o: { x: 0.6, y: 0 } },
        { t: 60, s: [100, 110] }
      ] },
      a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    shapes: [
      // First in array = drawn ON TOP. Order: shine, ring, body(behind).
      grp('shine', [
        { ty: 'el', p: { a: 0, k: [-24, -26] }, s: { a: 0, k: [28, 36] }, nm: 'e3' },
        fill([1, 1, 1, 0.9])
      ]),
      grp('dollar', [
        { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [12, 64] }, r: { a: 0, k: 4 }, nm: 'bar' },
        fill([0.78, 0.55, 0.07, 1])
      ]),
      grp('ring', [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [88, 88] }, nm: 'e2' },
        { ty: 'st', c: { a: 0, k: [1, 0.95, 0.66, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 8 }, lc: 2, lj: 2, nm: 's' }
      ]),
      grp('body', [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [120, 120] }, nm: 'e' },
        fill([0.98, 0.80, 0.22, 1])
      ])
    ],
    ip: 0, op: 60, st: 0, bm: 0
  }]
};

/* ---------------- celebrate: confetti burst ---------------- */
const COLORS = [
  [0.97, 0.71, 0.83, 1], [0.79, 0.71, 0.96, 1], [0.66, 0.90, 0.81, 1],
  [1, 0.84, 0.65, 1], [0.66, 0.85, 0.94, 1], [0.99, 0.95, 0.71, 1]
];
const N = 18, CX = 200, CY = 210, OP = 75;
let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

const layers = [];
for (let i = 0; i < N; i++) {
  const ang = (Math.PI * 2 * i) / N + (rnd() - 0.5) * 0.5;
  const dist = 120 + rnd() * 110;
  const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist;
  const ex = CX + dx, ey = CY + dy + 120;          // gravity at the end
  const mx = CX + dx * 0.7, my = CY + dy * 0.7 - 30;
  const spin = (rnd() < 0.5 ? -1 : 1) * (360 + Math.round(rnd() * 540));
  const col = COLORS[i % COLORS.length];
  const w = 14 + Math.round(rnd() * 10), h = 8 + Math.round(rnd() * 6);
  const ease3 = { i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] } };
  layers.push({
    ddd: 0, ind: i + 1, ty: 4, nm: 'c' + i, sr: 1,
    ks: {
      o: { a: 1, k: [
        { t: 0, s: [0], ...easeIO }, { t: 6, s: [100], ...easeIO }, { t: 55, s: [100], ...easeIO }, { t: OP, s: [0] }
      ] },
      r: { a: 1, k: [ { t: 0, s: [0], ...easeIO }, { t: OP, s: [spin] } ] },
      p: { a: 1, k: [
        { t: 0, s: [CX, CY], i: { x: 0.15, y: 1 }, o: { x: 0.4, y: 0 } },
        { t: 32, s: [mx, my], i: { x: 0.5, y: 0.4 }, o: { x: 0.5, y: 0 } },
        { t: OP, s: [ex, ey] }
      ] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [
        { t: 0, s: [10, 10, 100], ...ease3 }, { t: 8, s: [120, 120, 100], ...ease3 }, { t: 14, s: [100, 100, 100] }
      ] }
    },
    ao: 0,
    shapes: [ grp('p' + i, [
      { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [w, h] }, r: { a: 0, k: 3 }, nm: 'r' },
      fill(col)
    ]) ],
    ip: 0, op: OP, st: 0, bm: 0
  });
}
const celebrate = { v: '5.7.4', fr: 30, ip: 0, op: OP, w: 400, h: 400, nm: 'celebrate', ddd: 0, assets: [], layers };

/* ---------------- helpers ---------------- */
function grp(nm, items) {
  return { ty: 'gr', nm, it: [...items, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] };
}
function fill(c) { return { ty: 'fl', c: { a: 0, k: c }, o: { a: 0, k: 100 }, nm: 'f' }; }

writeFileSync('assets/lottie/mascot.json', JSON.stringify(mascot));
writeFileSync('assets/lottie/celebrate.json', JSON.stringify(celebrate));
console.log('Wrote mascot.json (' + JSON.stringify(mascot).length + 'b) and celebrate.json (' + JSON.stringify(celebrate).length + 'b)');
