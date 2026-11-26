import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';
import { RoomEnvironment } from './RoomEnvironment.js';

/* ---------- dimensions (metres). X east, Z south, Y up. Gym 13.0 x 19.5, wellness block z 19.5..24 ---------- */
const W = 13.0, GD = 19.5, BZ = 24.0, H = 3.0, HW = 3.0;
const q = new URLSearchParams(location.search);

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: q.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe6ea);
scene.fog = new THREE.Fog(0xdfe6ea, 60, 140);
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 300);
camera.rotation.order = 'YXZ';

/* ---------- textures ---------- */
function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const rnd = (a, b) => a + Math.random() * (b - a);
function woodTex() {
  return cv(1024, 1024, (g, w, h) => {
    const rows = 8, ph = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd(0, 400);
      while (x < w) {
        const len = rnd(380, 620), l = rnd(52, 62);
        g.fillStyle = `hsl(${rnd(27, 31)},${rnd(34, 42)}%,${l}%)`; g.fillRect(x, r * ph, len, ph);
        for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(90,55,25,${rnd(.04, .12)})`; g.lineWidth = rnd(.5, 1.6); const y = r * ph + rnd(2, ph - 2); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * .3, y + rnd(-3, 3), x + len * .6, y + rnd(-3, 3), x + len, y); g.stroke(); }
        g.fillStyle = 'rgba(60,35,15,.35)'; g.fillRect(x, r * ph, 2, ph);
        x += len;
      }
      g.fillStyle = 'rgba(60,35,15,.4)'; g.fillRect(0, r * ph, w, 2);
    }
  });
}
function carpetTex() {
  return cv(512, 512, (g, w, h) => {
    g.fillStyle = '#8f8d89'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = rnd(105, 175) | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},.55)`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 4), rnd(1, 2)); }
    for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(70,68,64,.12)'; g.lineWidth = rnd(2, 6); g.beginPath(); const y = rnd(0, h); g.moveTo(0, y); g.lineTo(w, y + rnd(-20, 20)); g.stroke(); }
  });
}
function slatTex() {
  return cv(256, 256, (g, w, h) => {
    g.fillStyle = '#2e2218'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(${rnd(25, 30)},${rnd(35, 45)}%,${rnd(40, 48)}%)`; g.fillRect(i * 32 + 3, 0, 24, h); }
  });
}
function stoneTex(base, vein) {
  return cv(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = vein + rnd(.04, .14) + ')'; g.lineWidth = rnd(1, 5); g.beginPath(); let x = rnd(0, w), y = rnd(0, h); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-60, 60); y += rnd(-60, 60); g.lineTo(x, y); } g.stroke(); }
  });
}
function tileTex() {
  return cv(256, 256, (g, w, h) => { g.fillStyle = '#e8e4dd'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,110,100,.35)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
}
function rep(t, x, y) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; }
const T = { wood: woodTex(), carpet: carpetTex(), slat: slatTex(), marble: stoneTex('#7f9a82', 'rgba(235,240,225,'), travertine: stoneTex('#d9cdb8', 'rgba(150,130,100,'), tile: tileTex() };

/* ---------- materials ---------- */
const M = {
  plaster: new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: .92 }),
  plasterDark: new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: .9 }),
  ceil: new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: .95, side: THREE.DoubleSide }),
  oak: new THREE.MeshStandardMaterial({ color: 0xc89b6a, roughness: .6 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: .55 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: .45, metalness: .6 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: .3, metalness: .9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfd6dc, roughness: .04, metalness: .1, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }),
  mirror: new THREE.MeshStandardMaterial({ color: 0x8c9296, roughness: .03, metalness: 1 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f4a38, roughness: .85 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xe9dcc4, roughness: .8 }),
  ball: new THREE.MeshStandardMaterial({ color: 0xcaa987, roughness: .7 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4d7a45, roughness: .85 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x7ea36a, roughness: 1 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: 1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: .35 }),
  warm: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x0c1a10, roughness: .2, emissive: 0x1d6b2d, emissiveIntensity: .55 }),
  marble: new THREE.MeshStandardMaterial({ map: T.marble, roughness: .25 }),
  travertine: new THREE.MeshStandardMaterial({ map: rep(T.travertine, 2, 2), roughness: .6 }),
  tile: new THREE.MeshStandardMaterial({ map: rep(T.tile, 4, 3), roughness: .5 }),
  sauna: new THREE.MeshStandardMaterial({ color: 0xc58a4f, roughness: .7 }),
  water: new THREE.MeshStandardMaterial({ color: 0x8cc7d6, roughness: .05, metalness: .2, transparent: true, opacity: .85 }),
};
function wallMat(c) { return new THREE.MeshStandardMaterial({ color: c, roughness: .92 }); }

/* ---------- helpers ---------- */
const root = new THREE.Group(); scene.add(root);
const ceilingGroup = new THREE.Group(); root.add(ceilingGroup);
const segs = [], circles = [], planSegs = [];
function mesh(geo, mat, x, y, z, parent = root, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
function box(w, h, d, mat, x, y, z, parent = root, ry = 0) { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, parent); m.rotation.y = ry; return m; }
function cyl(r, h, mat, x, y, z, parent = root, seg = 24) { return mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y + h / 2, z, parent); }
function sph(r, mat, x, y, z, parent = root) { return mesh(new THREE.SphereGeometry(r, 24, 16), mat, x, y + r, z, parent); }

function wall(x1, z1, x2, z2, o = {}) {
  const t = o.t ?? .2, h = o.h ?? H, mat = o.mat ?? M.plaster, y0 = o.y0 ?? 0;
  const L = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1);
  const dx = (x2 - x1) / L, dz = (z2 - z1) / L;
  const ops = (o.open ?? []).slice().sort((a, b) => a[0] - b[0]);
  const piece = (s0, s1, yb, yt) => { if (s1 - s0 < .01 || yt - yb < .01) return; const c = (s0 + s1) / 2; const m = box(s1 - s0, yt - yb, t, mat, x1 + dx * c, y0 + yb, z1 + dz * c, root, ang); return m; };
  let s = 0; const solid = [];
  for (const [a, b, oh] of ops) { piece(s, a, 0, h); solid.push([s, a]); piece(a, b, oh, h); s = b; }
  piece(s, L, 0, h); solid.push([s, L]);
  if (o.collide !== false) for (const [a, b] of solid) if (b - a > .02) segs.push([x1 + dx * a, z1 + dz * a, x1 + dx * b, z1 + dz * b, t / 2]);
  if (o.plan !== false) for (const [a, b] of solid) if (b - a > .02) planSegs.push([x1 + dx * a, z1 + dz * a, x1 + dx * b, z1 + dz * b, o.glass ? 1 : 0]);
}
function polyWall(pts, o) { for (let i = 0; i < pts.length - 1; i++) wall(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); }
function arc(cx, cz, r, a0, a1, n = 14) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } return p; }
function glassRun(pts, h = H) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1], L = Math.hypot(x2 - x1, z2 - z1), a = -Math.atan2(z2 - z1, x2 - x1);
    const m = box(L, h - .1, .03, M.glass, (x1 + x2) / 2, .05, (z1 + z2) / 2, root, a); m.castShadow = false; m.renderOrder = 2;
    box(L, .06, .09, M.black, (x1 + x2) / 2, 0, (z1 + z2) / 2, root, a);
    box(L, .09, .09, M.black, (x1 + x2) / 2, h - .09, (z1 + z2) / 2, root, a);
    box(L, .05, .09, M.black, (x1 + x2) / 2, 2.1, (z1 + z2) / 2, root, a);
    segs.push([x1, z1, x2, z2, .12]); planSegs.push([x1, z1, x2, z2, 1]);
  }
  // mullions about every 1.4 m
  let acc = 0; const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); const n = Math.max(1, Math.round(L / 1.4)); for (let k = 1; k <= n; k++) out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n]); }
  for (const [x, z] of out) box(.07, h, .1, M.black, x, 0, z);
}

/* ---------- ground & garden ---------- */
{
  const g = mesh(new THREE.PlaneGeometry(220, 220), M.grass, 6.5, -0.02, 12, root, false); g.rotation.x = -Math.PI / 2;
  const pad = mesh(new THREE.PlaneGeometry(40, 44), new THREE.MeshStandardMaterial({ color: 0xc9c2b6, roughness: 1 }), 6.5, -.01, 12, root, false); pad.rotation.x = -Math.PI / 2;
  const gr = mesh(new THREE.PlaneGeometry(9, 24), M.gravel, 17.5, 0, 12, root, false); gr.rotation.x = -Math.PI / 2;
  const tree = (x, z, s = 1) => { cyl(.12 * s, 2.6 * s, M.walnut, x, 0, z, root, 8); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; const l = mesh(new THREE.ConeGeometry(.28 * s, 2.2 * s, 6), M.leaf, x + Math.cos(a) * .9 * s, 2.7 * s, z + Math.sin(a) * .9 * s); l.rotation.z = Math.cos(a) * 1.0; l.rotation.x = -Math.sin(a) * 1.0; l.position.y = 2.9 * s; } };
  const bush = (x, z, s = 1) => { const b = sph(.55 * s, M.leaf, x, 0, z); b.scale.y = .8; };
  for (let z = 1; z < 19.5; z += 1.6) { bush(15.4 + Math.sin(z) * .3, z, .9 + (z % 3) * .12); }
  for (let z = 2; z < 19; z += 4.5) { tree(14.8, z + 1, 1); }
  for (const z of [1, 4.5, 8, 12, 16, 20, 23]) tree(-4.5, z, 1.1);
  box(.25, 2.2, 28, M.plasterDark, 21.5, 0, 12);
  box(.25, 2.2, 20, M.plasterDark, 20.5, 0, 12);
  // grass lawn west of the building (artificial grass in the plan)
  const lawn = mesh(new THREE.PlaneGeometry(20, 30), new THREE.MeshStandardMaterial({ color: 0x86ad6e, roughness: 1 }), -10, 0, 12, root, false); lawn.rotation.x = -Math.PI / 2;
}

/* ---------- floors ---------- */
{
  const f = mesh(new THREE.PlaneGeometry(W, GD), new THREE.MeshStandardMaterial({ map: rep(T.wood, W / 2.2, GD / 2.2), roughness: .5 }), W / 2, .002, GD / 2, root, false); f.rotation.x = -Math.PI / 2;
  const c = mesh(new THREE.PlaneGeometry(5.6, 16.8), new THREE.MeshStandardMaterial({ map: rep(T.carpet, 5.6 / 1.6, 16.8 / 1.6), roughness: 1 }), 3.4, .006, 9.8, root, false); c.rotation.x = -Math.PI / 2;
  const wf = mesh(new THREE.PlaneGeometry(W, BZ - GD), M.travertine, W / 2, .002, (GD + BZ) / 2, root, false); wf.rotation.x = -Math.PI / 2;
  // curved SE: fill outside of arc is just ground; floor plane over rectangle is hidden by pad; clip with a mask not needed (ground colour similar)
  const cl = mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshStandardMaterial({ map: rep(T.wood, 1.3, 2), roughness: .6, color: 0xe8d9c0 }), 1.5, .005, 21.75, root, false); cl.rotation.x = -Math.PI / 2;
}

/* ---------- gym shell ---------- */
const rN = 3.9;
const eastGlass = [[W, GD], ...[[W, rN]]];
wall(0, 0, W - rN, 0, { h: H, mat: M.plaster });             // north wall
glassRun(arc(W - rN, rN, rN, -Math.PI / 2, 0, 16));            // curved NE glass
glassRun([[W, rN], [W, 10.7]]); glassRun([[W, 12.9], [W, GD]]);
// glass door pair on east wall (frame only, closed)
glassRun([[W, 10.7], [W, 12.9]]); box(.05, 2.3, .04, M.steel, W, 0, 11.8);
// south wall with gym access door (opening x 7.7..8.8)
wall(0, GD, W, GD, { h: H, open: [[7.7, 8.8, 2.2]], mat: M.plaster });
wall(0, 0, 0, GD, { h: H, mat: M.plaster });                  // west wall (mirror panels added below)
// door leaf to wellness block
box(1.1, 2.15, .05, M.walnut, 8.25, 0, GD + .02);

/* mirror wall (west) */
{
  for (let z = .4; z < GD - .3; z += 2.6) { const w = Math.min(2.5, GD - .3 - z); const m = box(.03, 2.55, w, M.mirror, .11, .15, z + w / 2); m.castShadow = false; }
  box(.04, .15, GD, M.black, .12, 0, GD / 2); box(.04, .1, GD, M.black, .12, 2.7, GD / 2);
}

/* ---------- wellness block (z 19.5..24) ---------- */
{
  const h = HW, t = .2;
  wall(0, BZ, 9.916, BZ, { h, open: [[.4, 1.4, 2.1]] });                              // south wall w/ classroom door
  box(1.0, 2.05, .05, M.walnut, .9, 0, BZ - .1);
  polyWall(arc(9.916, 20.915, 3.085, Math.PI / 2, 0, 18).reverse().map(p => p), { h });   // curved SE wall (from east to south)
  wall(W, GD, W, 20.915, { h });                                                         // east wall remainder
  wall(3.0, GD, 3.0, BZ, { h });                                                         // classroom partition
  // WC / shower cells x 3..5.7
  wall(3.0, 21.1, 5.7, 21.1, { h, t: .12 }); wall(3.0, 22.4, 5.7, 22.4, { h, t: .12 });
  wall(5.7, GD, 5.7, 20.0, { h, t: .12 }); wall(5.7, 21.1, 5.7, 22.4, { h, t: .12 }); wall(5.7, 23.5, 5.7, BZ, { h, t: .12 });
  // east cluster x 9..13
  wall(9.0, GD, 9.0, 21.2, { h, t: .12 }); wall(9.0, 22.1, 9.0, BZ - .45, { h, t: .12 });
  wall(9.0, 21.2, 11.5, 21.2, { h, t: .12 });
  wall(11.5, GD, 11.5, 21.2, { h, t: .06, mat: M.sauna });
  // wet block tiles on partition faces (visual only)
  for (const [x, z, w, d] of [[3.1, 20.25, .02, 1.6], [3.1, 23.2, .02, 1.6]]) box(w, h, d, M.tile, x, 0, z);
  // fixtures
  const wc = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); box(.4, .4, .6, M.white, 0, 0, 0, g); box(.4, .35, .2, M.white, 0, .4, -.28, g); };
  wc(4.3, 19.75, 0); wc(4.3, 23.75, Math.PI); wc(10.2, 19.75, 0);
  // shower glass
  for (const [x, z, w, d] of [[4.75, 20.5, .02, 1.2], [4.75, 23.0, .02, 1.2], [10.9, 20.4, .02, 1.6]]) { const g = box(w, 2.0, d, M.glass, x, 0, z); g.castShadow = false; }
  for (const [x, z] of [[3.35, 20.1], [3.35, 23.6], [11.2, 20.2]]) { cyl(.015, 2.0, M.steel, x, 0, z, root, 6); cyl(.12, .02, M.steel, x, 2.0, z + .0, root, 12); }
  // dressing / lockers (U shape) + bench + basins
  box(.45, 2.0, 3.3, M.oak, 5.95 + .0, 0, 22.8 - .0).scale.set(1, 0, 1); // placeholder removed below
  root.children.pop().geometry.dispose();
  for (let x = 5.9; x < 9.0; x += .55) box(.5, 1.0, .55, M.oak, x + .27, 0, BZ - .45 / 2 - .05);          // lockers along south wall
  box(.5, .05, 3.3, M.walnut, 6.0, 1.0, 22.6 - .0, root, 0).scale.set(1, 1, 1); root.children.pop().geometry.dispose();
  box(.55, 1.0, 1.7, M.oak, 8.7, 0, 22.9); box(.55, 1.0, 1.1, M.oak, 5.95, 0, 23.1);
  box(1.8, .42, .45, M.walnut, 7.2, 0, 21.9);                                                             // bench
  for (const x of [6.75, 7.4]) { const b = cyl(.25, .12, M.white, x, .88, 19.8); cyl(.04, .88, M.steel, x, 0, 19.8, root, 8); }
  box(1.6, .06, .5, M.walnut, 7.1, .82, 19.75); root.children.pop().geometry.dispose();
  box(1.8, 1.2, .03, M.mirror, 7.05, 1.0, GD + .12);
  // sauna
  box(1.5, .06, 1.5, M.sauna, 12.2, 0, 20.25); box(1.5, 2.0, .06, M.sauna, 12.2, 0, 19.65 + .1);
  for (let k = 0; k < 3; k++) box(1.2, .06, .4, M.sauna, 12.2, .45 + k * .3, 19.9 + k * .35);
  // jacuzzi
  const jac = cyl(.95, .6, M.white, 11.3, 0, 22.4, root, 40); cyl(.82, .02, M.water, 11.3, .58, 22.4, root, 40);
  // classroom
  box(.7, .05, 2.6, M.oak, .55, .72, 22.5); box(.6, .72, .06, M.walnut, .55, 0, 21.3); box(.6, .72, .06, M.walnut, .55, 0, 23.7);
  box(2.4, .72, .6, M.oak, 1.7, 0, GD + .45); // counter along north partition
  for (const z of [20.4, 21.9, 23.1]) { cyl(.2, .06, M.black, 1.5, .45, z, root, 16); cyl(.03, .42, M.steel, 1.5, 0, z, root, 8); }
  // wellness ceiling
  const wc2 = mesh(new THREE.PlaneGeometry(W, BZ - GD), M.ceil, W / 2, HW, (GD + BZ) / 2, ceilingGroup, false); wc2.rotation.x = Math.PI / 2;
  box(3.3, .02, 1.2, M.warm, 7.35, HW - .02, 22.0, ceilingGroup);
}

/* ---------- gym interior ---------- */
// north wall: oak panelling, shelves, ladder, hammock, TV
{
  box(.02, 2.7, 9.0, M.oak, 0, 0, 0); root.children.pop().geometry.dispose();
  const pan = box(7.4, 2.7, .05, M.oak, 3.6, 0, .13);
  // shelving with balls
  for (const x of [.9, 2.35]) { box(1.3, .04, .35, M.walnut, x + .6, .55, .35); box(1.3, .04, .35, M.walnut, x + .6, 1.15, .35); box(1.3, .04, .35, M.walnut, x + .6, 1.75, .35); box(.04, 2.0, .35, M.black, x, 0, .35); }
  for (const x of [1.2, 1.9, 2.8, 3.4]) { for (const y of [.55, 1.15, 1.75]) sph(.17, M.ball, x, y + .02, .35); }
  // wall ladder
  box(.9, 2.4, .06, M.black, 5.2, 0, .22); for (let y = .2; y < 2.4; y += .18) box(.84, .03, .06, M.walnut, 5.2, y, .26);
  // aerial hammock
  cyl(.01, 1.3, M.steel, 6.8, 1.65, .6, root, 6); const hm = mesh(new THREE.CylinderGeometry(.28, .06, 1.4, 16, 1, true), M.white, 6.8, 1.1, .6); hm.material = new THREE.MeshStandardMaterial({ color: 0xf3f1ec, roughness: .9, side: THREE.DoubleSide });
  // plants
  const plant = (x, z) => { cyl(.17, .35, M.cream, x, 0, z, root, 16); for (let k = 0; k < 8; k++) { const a = k * .8; const l = mesh(new THREE.ConeGeometry(.04, .9 + (k % 3) * .2, 5), M.leaf, x + Math.cos(a) * .12, .75, z + Math.sin(a) * .12); l.rotation.z = Math.cos(a) * .35; l.rotation.x = -Math.sin(a) * .35; } };
  plant(7.7, .5); plant(4.0, 18.9); plant(10.6, 7);
  // TV
  box(1.9, 1.1, .05, M.black, 9.0, 1.1, .08); box(1.8, 1.0, .02, M.screen, 9.0, 1.15, .12);
  // reflective floor coving
  box(7.4, .12, .06, M.walnut, 3.6, 0, .08);
}
// ball shelves in west corner and equipment on carpet
{
  // pilates reformers x5
  const reformer = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    box(.62, .22, 2.3, M.walnut, 0, .1, 0, g); box(.5, .04, 1.4, M.black, 0, .34, .2, g); box(.55, .06, .55, M.black, 0, .34, -.8, g);
    box(.62, .5, .06, M.walnut, 0, .3, -1.12, g); cyl(.02, .75, M.steel, -.2, .34, 1.0, g, 6); cyl(.02, .75, M.steel, .2, .34, 1.0, g, 6); box(.5, .03, .06, M.steel, 0, 1.08, 1.0, g);
    for (const sx of [-.28, .28]) for (const sz of [-1.0, 1.0]) cyl(.025, .12, M.black, sx, 0, sz, g, 8); };
  for (const z of [7.4, 9.1, 10.8, 12.5]) reformer(4.5, z);
  reformer(4.5, 14.2);
  // cadillac / lounger chairs (curved black seat on walnut)
  const lounger = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); box(.6, .3, 1.5, M.walnut, 0, 0, 0, g); const s = box(.5, .05, 1.3, M.black, 0, .3, .0, g); s.rotation.x = -.12; box(.6, .5, .08, M.walnut, 0, .3, -.7, g); };
  lounger(2.4, 4.0, .4); lounger(1.9, 5.7, .15); lounger(2.8, 2.9, 1.1);
  // big balls on carpet
  sph(.38, M.ball, 3.5, 0, 5.8); sph(.36, M.ball, 4.6, 0, 3.8); sph(.3, M.ball, 1.0, 0, 8.0);
  // mats
  for (const z of [16.0, 16.9]) box(.6, .02, 1.8, M.walnut, 2.3, .01, z, root, Math.PI / 2 * .0);
  // treadmills x6 along glass, run along X
  const treadmill = (z) => { const g = new THREE.Group(); g.position.set(11.4, 0, z); root.add(g);
    box(2.0, .16, .85, M.black, 0, .0, 0, g); box(1.85, .04, .6, new THREE.MeshStandardMaterial({ color: 0x242424, roughness: .8 }), 0, .16, 0, g);
    box(.12, 1.0, .05, M.black, .85, .1, -.38, g); box(.12, 1.0, .05, M.black, .85, .1, .38, g); box(.14, .1, .84, M.black, .85, 1.0, 0, g); box(.2, .18, .6, M.screen, .83, 1.1, 0, g); };
  for (const z of [5.4, 7.0, 8.6, 13.7, 15.3, 16.9]) treadmill(z);
  // green round sofa in the NE corner
  const sofa = new THREE.Group(); sofa.position.set(10.3, 0, 2.3); root.add(sofa);
  const sofaBase = mesh(new THREE.CylinderGeometry(1.15, 1.15, .42, 40, 1, false, .6, Math.PI * 1.55), M.green, 0, .21, 0, sofa); sofaBase.material = M.green.clone(); sofaBase.material.side = THREE.DoubleSide;
  const sofaBack = mesh(new THREE.CylinderGeometry(1.2, 1.2, .8, 40, 1, true, .6, Math.PI * 1.55), M.green, 0, .62, 0, sofa); sofaBack.material = M.green.clone(); sofaBack.material.side = THREE.DoubleSide;
  const sofaSeat = mesh(new THREE.CylinderGeometry(.95, .95, .12, 40), new THREE.MeshStandardMaterial({ color: 0x3b5a46, roughness: .9 }), 0, .45, 0, sofa);
  circles.push([10.3, 2.3, 1.2]);
  sph(.15, M.cream, 10.7, .5, 1.6);
  box(.9, .02, .5, M.cream, 10.3, .56, 2.9);
  // tall cabinet unit on south wall (x 0.5..5.2): marble backsplash, shelves, water fridge
  const cx = 0.5, cw = 4.7;
  box(cw, 2.9, .62, M.cream, cx + cw / 2, 0, GD - .31 - .12);
  box(2.1, .9, .02, M.marble, cx + 2.0, 1.0, GD - .62 - .13);                       // marble backsplash niche
  box(2.1, .03, .03, M.warm, cx + 2.0, 1.92, GD - .66 - .13);                       // niche light
  box(1.6, .06, .5, M.walnut, cx + 2.0, .92, GD - .87 - .1);                          // counter
  box(.4, .5, .4, M.black, cx + 1.5, .98, GD - .85 - .1);                             // coffee machine
  box(.9, 1.8, .02, M.oak, cx + .5, .2, GD - .5 - .13);                                // shelf backing
  for (const y of [.6, 1.1, 1.6, 2.1]) box(.9, .03, .3, M.oak, cx + .5, y, GD - .5 - .13);
  const fr = box(.85, 2.35, .7, M.black, cx + 4.2, 0, GD - .35 - .12);                // fridge
  const glassF = box(.75, 2.15, .02, new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: .1, metalness: .5 }), cx + 4.2, .1, GD - .72 - .12);
  for (const y of [.35, .8, 1.25, 1.7, 2.15]) box(.7, .03, .02, M.warm, cx + 4.2, y, GD - .74 - .12);
  for (let i = 0; i < 14; i++) box(.06, .26, .06, new THREE.MeshStandardMaterial({ color: 0xe9e2d0 }), cx + 3.95 + (i % 5) * .12, .45 + Math.floor(i / 5) * .45, GD - .7 - .12);
  box(.04, 2.9, 1.2, M.oak, cx + 5.6, 0, GD - .02 - .6).scale.set(1, 1, 1);        // fluted panel next to cabinet
  for (let i = 0; i < 10; i++) box(.06, 2.8, .03, M.cream, cx + 5.55 + i * .1 - .55, 0, GD - .1);
  segs.push([cx, GD - .75, cx + cw, GD - .75, .05]);
  // lighting strips on ceiling (LED lines)
}

/* ---------- gym ceiling: slatted oak over carpet zone, white plaster with LED lines elsewhere ---------- */
{
  const slat = mesh(new THREE.PlaneGeometry(6.8, GD), new THREE.MeshStandardMaterial({ map: rep(T.slat, 6.8 / 1.2, GD / 1.2), roughness: .7 }), 3.4, H - .01, GD / 2, ceilingGroup, false); slat.rotation.x = Math.PI / 2;
  const pl = mesh(new THREE.PlaneGeometry(W - 6.8, GD), M.ceil, 6.8 + (W - 6.8) / 2, H - .01, GD / 2, ceilingGroup, false); pl.rotation.x = Math.PI / 2;
  for (const x of [7.8, 9.3, 10.8]) { box(.04, .015, GD - 1, M.warm, x, H - .03, GD / 2, ceilingGroup); }
  for (const z of [3, 7, 11, 15]) box(W - 7.2, .015, .04, M.warm, 10.2, H - .03, z, ceilingGroup);
  // curved glass: ceiling plane clipped by shape would be needed at NE; extra shape patch hides the gap
  const sh = new THREE.Shape(); sh.moveTo(W - rN, 0); sh.lineTo(W, 0); sh.lineTo(W, rN); for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; sh.lineTo(W - rN + rN * Math.cos(a), rN - rN * Math.cos(Math.PI / 2 - a) * 0); }
  // slat edge: black perimeter beam
  box(W, .12, .12, M.black, W / 2, H - .12, .1, ceilingGroup);
}
// ceiling plane that spills outside the curved NE corner is masked with ground-coloured corner block
{
  const sh = new THREE.Shape(); sh.moveTo(W, 0); sh.lineTo(W - rN, 0); for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI / 2; sh.lineTo(W - rN + rN * Math.cos(a), rN + rN * Math.sin(a)); } sh.lineTo(W, 0);
  const g = new THREE.ShapeGeometry(sh);
  for (const [y, parent, mat] of [[0.004, root, new THREE.MeshStandardMaterial({ color: 0xc9c2b6, roughness: 1 })]]) { const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI / 2; m.position.y = y + .01; parent.add(m); }
  const m2 = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xdfe6ea, side: THREE.DoubleSide })); m2.rotation.x = Math.PI / 2; m2.position.y = H + .02; ceilingGroup.add(m2);
}
// roof slab (visible from above in overview only when ceiling on)
{
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xcfc9bf, roughness: .9 });
  const r1 = mesh(new THREE.PlaneGeometry(W, GD), roofMat, W / 2, H + .12, GD / 2, ceilingGroup, false); r1.rotation.x = -Math.PI / 2;
  const r2 = mesh(new THREE.PlaneGeometry(W, BZ - GD), roofMat, W / 2, HW + .12, (GD + BZ) / 2, ceilingGroup, false); r2.rotation.x = -Math.PI / 2;
}

/* ---------- lights ---------- */
scene.add(new THREE.HemisphereLight(0xeaf2ff, 0xb8a98f, .55));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(26, 22, 8); sun.target.position.set(6.5, 0, 11);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 80; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
scene.add(sun, sun.target);
const fill = [[6.5, 2.6, 4], [6.5, 2.6, 10], [6.5, 2.6, 16], [3, 2.6, 18.5]];
const warmLights = fill.map(p => { const l = new THREE.PointLight(0xffe0b8, 9, 11, 1.7); l.position.set(...p); scene.add(l); return l; });
const wl = new THREE.PointLight(0xfff0dd, 7, 7, 1.7); wl.position.set(7, 2.3, 22); scene.add(wl);
const wl2 = new THREE.PointLight(0xfff0dd, 4, 6, 1.7); wl2.position.set(1.5, 2.3, 21.7); scene.add(wl2);
const wl3 = new THREE.PointLight(0xfff0dd, 4, 6, 1.7); wl3.position.set(11, 2.3, 21.5); scene.add(wl3);

/* ---------- tour scenes ---------- */
const S = [
  { k: 'Overview', t: 'The whole project', d: 'Gym floor (13.0 x 19.5 m) with the rounded glass corner, and the wellness block along the south side: classroom, WC/showers, dressing, sauna and jacuzzi.', cam: [-9, 21, 36], tg: [6.5, 0, 14], ceil: false, img: 'r01', ref: 'Top-down render' },
  { k: 'Plan', t: 'Top-down layout', d: 'Wood floor around a grey carpet zone. Treadmills sit along the garden glass, pilates equipment on the carpet, lounge in the corner, hydration cabinet on the south wall.', cam: [6.5, 36, 12.6], tg: [6.5, 0, 12], ceil: false, img: 'r01', ref: 'Top-down render' },
  { k: 'Arrival', t: 'Glass wall to the garden', d: 'Full-height black-framed glazing with a double glass door, looking out to a planted garden. Warm oak floor, soft daylight.', cam: [4.5, 1.65, 11.8], tg: [13, 1.35, 11.8], ceil: true, img: 'r09', ref: 'Design render' },
  { k: 'Cardio', t: 'Treadmill line', d: 'Six treadmills face the garden. The wood floor keeps the cardio zone clear and easy to maintain.', cam: [6.4, 1.7, 3.8], tg: [12.5, 1.1, 10], ceil: true, img: 'r12', ref: 'Design render' },
  { k: 'Studio', t: 'Pilates and mirror wall', d: 'Reformers on a soft grey carpet zone, with the full-length mirror wall opposite the glass. Slatted oak ceiling above.', cam: [6.6, 1.65, 17.5], tg: [3, 0.9, 6.5], ceil: true, img: 'r03', ref: 'Design render' },
  { k: 'Lounge', t: 'Green round sofa', d: 'A curved green sofa tucks into the rounded glass corner for waiting, stretching and recovery.', cam: [6.6, 1.55, 9.5], tg: [10.5, 0.8, 2.4], ceil: true, img: 'r08', ref: 'Design render' },
  { k: 'Wall', t: 'Shelving, ladder and aerial hammock', d: 'Oak-panelled feature wall with ball storage, wall ladder, hanging hammock and the wall TV.', cam: [6, 1.65, 11], tg: [5, 1.4, 0], ceil: true, img: 'r13', ref: 'Design render' },
  { k: 'Hydration', t: 'Cabinet, marble niche and water fridge', d: 'Tall cream cabinet with a green marble backsplash, a coffee point and a lit glass-door fridge for drinks.', cam: [4.2, 1.6, 12.5], tg: [2.9, 1.3, 19.4], ceil: true, img: 'r14', ref: 'Design render' },
  { k: 'Wellness', t: 'Changing rooms, sauna and jacuzzi', d: 'Roof removed to show the plan: classroom 3.0 m, two WC/shower cells, dressing with U-shaped lockers and a bench, sauna and jacuzzi inside the curved wall.', cam: [6.5, 19, 31], tg: [6.5, 0, 21.8], ceil: false, img: 'wet', ref: 'Design render' },
  { k: 'Classroom', t: 'Classroom', d: 'Study room at the west end of the block, with its own door to the outside.', cam: [2.6, 1.7, 23.5], tg: [.6, 1, 20], ceil: false, img: 'plan', ref: 'Drawing, page 12' },
];

const $ = id => document.getElementById(id);
let mode = 'tour', idx = 0, ceilOn = true, tween = null;
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.maxPolarAngle = Math.PI * .495; orbit.minDistance = .5; orbit.maxDistance = 90;
function applyCeil() { ceilingGroup.visible = ceilOn && !(mode === 'tour' && !S[idx].ceil && ceilAuto); }
let ceilAuto = true;
function goScene(i, instant) {
  idx = (i + S.length) % S.length; const s = S[idx];
  $('k').textContent = `${String(idx + 1).padStart(2, '0')} / ${S.length} · ${s.k}`; $('t').textContent = s.t; $('d').textContent = s.d; $('m').textContent = '';
  $('thumb').style.backgroundImage = `url(img-${s.img}.jpg)`; $('thumb').firstElementChild.textContent = s.ref;
  document.querySelectorAll('#dots i').forEach((e, j) => e.classList.toggle('on', j === idx));
  ceilAuto = true; ceilingGroup.visible = ceilOn && s.ceil;
  const to = { p: new THREE.Vector3(...s.cam), t: new THREE.Vector3(...s.tg) };
  if (instant) { camera.position.copy(to.p); orbit.target.copy(to.t); orbit.update(); return; }
  tween = { p0: camera.position.clone(), t0: orbit.target.clone(), p1: to.p, t1: to.t, a: 0 };
}
S.forEach((_, i) => { const e = document.createElement('i'); e.onclick = () => { setMode('tour'); goScene(i); }; $('dots').appendChild(e); });
$('prev').onclick = () => goScene(idx - 1); $('next').onclick = () => goScene(idx + 1);
$('goWalk').onclick = () => setMode('walk', true);
$('thumb').onclick = () => { $('lbimg').src = `img-${S[idx].img}.jpg`; $('lightbox').style.display = 'flex'; };
$('lightbox').onclick = () => $('lightbox').style.display = 'none';
$('bAbout').onclick = () => $('about').style.display = 'flex';
$('bCeil').onclick = () => { ceilOn = !ceilOn; $('bCeil').classList.toggle('on', ceilOn); ceilingGroup.visible = ceilOn && (mode !== 'tour' || S[idx].ceil); };

/* ---------- walk / fly ---------- */
const P = { pos: new THREE.Vector3(8.25, 1.65, 17.6), yaw: 0, pitch: 0, vy: 0 };
const keys = {}; let joy = { x: 0, y: 0 }, flySpeed = 4, vertIn = 0;
addEventListener('keydown', e => { keys[e.code] = true; if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code) && mode !== 'tour') e.preventDefault(); if (e.code === 'KeyM') $('bMap').click(); });
addEventListener('keyup', e => keys[e.code] = false);
let look = null, stick = null;
canvas.addEventListener('pointerdown', e => {
  if (mode === 'tour') return;
  const left = e.pointerType === 'touch' && e.clientX < innerWidth * .5;
  if (left) { stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY }; const s = $('stick'); s.style.display = 'block'; s.style.left = e.clientX - 45 + 'px'; s.style.top = e.clientY - 45 + 'px'; }
  else if (!look) look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (mode === 'tour') return;
  if (look && e.pointerId === look.id) { P.yaw -= (e.clientX - look.x) * .0045; P.pitch = Math.max(-1.4, Math.min(1.4, P.pitch - (e.clientY - look.y) * .0045)); look.x = e.clientX; look.y = e.clientY; }
  if (stick && e.pointerId === stick.id) { let dx = e.clientX - stick.x0, dy = e.clientY - stick.y0; const l = Math.hypot(dx, dy), m = 45; if (l > m) { dx *= m / l; dy *= m / l; } joy.x = dx / m; joy.y = dy / m; $('stick').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; }
});
const endp = e => { if (look && e.pointerId === look.id) look = null; if (stick && e.pointerId === stick.id) { stick = null; joy.x = joy.y = 0; $('stick').style.display = 'none'; $('stick').firstElementChild.style.transform = ''; } };
canvas.addEventListener('pointerup', endp); canvas.addEventListener('pointercancel', endp);
canvas.addEventListener('wheel', e => { if (mode === 'fly') { flySpeed = Math.max(1, Math.min(20, flySpeed * (e.deltaY < 0 ? 1.15 : .87))); } }, { passive: true });
for (const [id, v] of [['up', 1], ['dn', -1]]) { const b = $(id); b.addEventListener('pointerdown', e => { e.stopPropagation(); vertIn = v; b.setPointerCapture(e.pointerId); }); b.addEventListener('pointerup', () => vertIn = 0); b.addEventListener('pointercancel', () => vertIn = 0); }

function collide(p, r) {
  for (let it = 0; it < 3; it++) {
    for (const [x1, z1, x2, z2, th] of segs) {
      const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz; let t = l2 ? ((p.x - x1) * dx + (p.z - z1) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
      const cx = x1 + dx * t, cz = z1 + dz * t; let ex = p.x - cx, ez = p.z - cz; const d = Math.hypot(ex, ez), m = r + th;
      if (d < m) { if (d < 1e-5) { ex = -dz; ez = dx; const l = Math.hypot(ex, ez) || 1; ex /= l; ez /= l; } else { ex /= d; ez /= d; } p.x = cx + ex * m; p.z = cz + ez * m; }
    }
    for (const [cx, cz, cr] of circles) { const ex = p.x - cx, ez = p.z - cz, d = Math.hypot(ex, ez), m = r + cr; if (d < m && d > 1e-5) { p.x = cx + ex / d * m; p.z = cz + ez / d * m; } }
  }
}
function setMode(m, here) {
  const prev = mode; mode = m; tween = null;
  document.querySelectorAll('#modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('card').style.display = m === 'tour' ? 'flex' : 'none'; $('hud').style.display = m === 'tour' ? 'none' : 'block';
  const touch = matchMedia('(pointer:coarse)').matches;
  $('vert').style.display = m === 'fly' && touch ? 'flex' : 'none';
  orbit.enabled = m === 'tour';
  if (m === 'tour') { ceilingGroup.visible = ceilOn && S[idx].ceil; if (prev !== 'tour') goScene(idx, true); return; }
  if (prev === 'tour') {
    const c = camera.position; const inside = c.x > .4 && c.x < W - .4 && c.z > .4 && c.z < GD - .4;
    if (here && inside) { P.pos.set(c.x, m === 'walk' ? 1.65 : Math.max(1.2, c.y), c.z); const d = new THREE.Vector3(); camera.getWorldDirection(d); P.yaw = Math.atan2(-d.x, -d.z); P.pitch = 0; }
    else if (m === 'walk') { P.pos.set(8.25, 1.65, 17.6); P.yaw = 0; P.pitch = 0; }
    else { P.pos.set(6.5, 6, 17); P.yaw = 0; P.pitch = -.45; }
  } else if (m === 'walk') { P.pos.y = 1.65; }
  ceilingGroup.visible = ceilOn && m === 'walk' ? true : ceilOn && m === 'fly' ? P.pos.y < H : false;
  $('hud').textContent = m === 'walk' ? 'Walk: WASD or arrows to move, drag to look, Shift to hurry. Touch: left thumb moves, right thumb looks.' : 'Fly: WASD to move, Q/E up and down, drag to look, wheel changes speed. Touch: left thumb moves, right thumb looks, arrows for height.';
}
document.querySelectorAll('#modes button').forEach(b => b.onclick = () => setMode(b.dataset.m, b.dataset.m !== 'tour'));

/* ---------- minimap ---------- */
const mc = $('map'), mg = mc.getContext('2d'); let mapOn = false;
$('bMap').onclick = () => { mapOn = !mapOn; $('bMap').classList.toggle('on', mapOn); mc.style.display = mapOn ? 'block' : 'none'; };
function drawMap() {
  const sx = 280 / 17, ox = 10, oz = 10; mg.clearRect(0, 0, 300, 400); mg.fillStyle = 'rgba(250,247,242,.95)'; mg.fillRect(0, 0, 300, 400);
  const X = x => ox + (x + 1.5) * sx * (13 / 13) * .98, Z = z => oz + z * 15.2;
  mg.lineCap = 'round';
  for (const [x1, z1, x2, z2, gl] of planSegs) { mg.strokeStyle = gl ? '#6aa0b0' : '#3b332b'; mg.lineWidth = gl ? 3 : 4; mg.beginPath(); mg.moveTo(X(x1), Z(z1)); mg.lineTo(X(x2), Z(z2)); mg.stroke(); }
  const px = X(P.pos.x), pz = Z(P.pos.z); mg.fillStyle = '#c1432c'; mg.beginPath(); mg.arc(px, pz, 7, 0, 7); mg.fill();
  mg.strokeStyle = '#c1432c'; mg.lineWidth = 3; mg.beginPath(); mg.moveTo(px, pz); mg.lineTo(px - Math.sin(P.yaw) * 22, pz - Math.cos(P.yaw) * 22); mg.stroke();
}

/* ---------- loop ---------- */
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < .8 ? 74 : 60; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(); const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  if (mode === 'tour') {
    if (tween) { tween.a = Math.min(1, tween.a + dt / 1.8); const k = ease(tween.a); camera.position.lerpVectors(tween.p0, tween.p1, k); orbit.target.lerpVectors(tween.t0, tween.t1, k); camera.lookAt(orbit.target); if (tween.a >= 1) { tween = null; orbit.update(); } }
    else orbit.update();
  } else {
    const fast = keys.ShiftLeft || keys.ShiftRight ? 1.9 : 1;
    let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joy.y, s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
    if (keys.ArrowLeft && keys.ArrowRight) s = 0;
    if (mode === 'walk' && (keys.ArrowLeft || keys.ArrowRight) && !(keys.KeyA || keys.KeyD)) { P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt * 1.8; s = joy.x; }
    const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
    const sp = (mode === 'walk' ? 1.9 : flySpeed) * fast * dt;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    if (mode === 'walk') { P.pos.x += (fx * f + rx * s) * sp; P.pos.z += (fz * f + rz * s) * sp; collide(P.pos, .3); P.pos.y = 1.65 + Math.sin(performance.now() * .008) * 0.0 * 1; }
    else {
      const cp = Math.cos(P.pitch), sp2 = Math.sin(P.pitch);
      P.pos.x += (fx * cp * f + rx * s) * sp; P.pos.z += (fz * cp * f + rz * s) * sp; P.pos.y += (sp2 * f) * sp;
      P.pos.y += ((keys.KeyE || keys.Space ? 1 : 0) - (keys.KeyQ || keys.ControlLeft ? 1 : 0) + vertIn) * sp;
      P.pos.y = Math.max(.3, Math.min(60, P.pos.y));
      if (P.pos.y < H + .05 && !(P.pos.x < -.5 || P.pos.x > W + .5 || P.pos.z < -.5 || P.pos.z > BZ + .5)) { /* inside footprint: keep fly camera inside walls */ collide(P.pos, .25); }
      ceilingGroup.visible = ceilOn && P.pos.y < H - .1;
    }
    camera.position.copy(P.pos); camera.rotation.set(P.pitch, P.yaw, 0);
  }
  if (mapOn) drawMap();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
goScene(0, true);
if (q.has('mode')) setMode(q.get('mode'));
if (q.has('s')) goScene(+q.get('s'), true);
if (q.has('pos')) { const a = q.get('pos').split(',').map(Number); P.pos.set(a[0], a[1], a[2]); P.yaw = a[3] ?? 0; P.pitch = a[4] ?? 0; }
frame();
setTimeout(() => { $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 700); }, 400);
window.__gym = { setMode, goScene, P, S };
