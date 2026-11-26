import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { GLTFLoader } from './GLTFLoader.js';

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
function stoneTex(base, vein) {
  return cv(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = vein + rnd(.04, .14) + ')'; g.lineWidth = rnd(1, 5); g.beginPath(); let x = rnd(0, w), y = rnd(0, h); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-60, 60); y += rnd(-60, 60); g.lineTo(x, y); } g.stroke(); }
  });
}
function rep(t, x, y) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(x, y); return c; }
const T = { wood: woodTex(), carpet: carpetTex(), marble: stoneTex('#7f9a82', 'rgba(235,240,225,'), travertine: stoneTex('#d9cdb8', 'rgba(150,130,100,') };

/* ---------- materials ---------- */
const M = {
  plaster: new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: .92 }),
  ceil: new THREE.MeshStandardMaterial({ color: 0xf4f0ea, roughness: .95, side: THREE.DoubleSide }),
  oak: new THREE.MeshStandardMaterial({ color: 0xc89b6a, roughness: .6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: .45, metalness: .6 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfd6dc, roughness: .04, metalness: .1, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }),
  mirror: new THREE.MeshStandardMaterial({ color: 0x8c9296, roughness: .03, metalness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4d7a45, roughness: .85 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x7ea36a, roughness: 1 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xb9b3a8, roughness: 1 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: .55 }),
  travertine: new THREE.MeshStandardMaterial({ map: rep(T.travertine, 2, 2), roughness: .6 }),
};

/* ---------- helpers ---------- */
const root = new THREE.Group(); scene.add(root);
const ceilingGroup = new THREE.Group(); root.add(ceilingGroup);
const segs = [], circles = [], planSegs = [];
function mesh(geo, mat, x, y, z, parent = root, shadow = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m; }
function box(w, h, d, mat, x, y, z, parent = root, ry = 0) { const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, parent); m.rotation.y = ry; return m; }
function cyl(r, h, mat, x, y, z, parent = root, seg = 24) { return mesh(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y + h / 2, z, parent); }
function sph(r, mat, x, y, z, parent = root) { return mesh(new THREE.SphereGeometry(r, 24, 16), mat, x, y + r, z, parent); }

/* walls exist in the FBX model; here we only register collision + minimap strokes */
function planWall(x1, z1, x2, z2, o = {}) {
  const t = o.t ?? .2;
  const L = Math.hypot(x2 - x1, z2 - z1);
  const dx = (x2 - x1) / L, dz = (z2 - z1) / L;
  const ops = (o.open ?? []).slice().sort((a, b) => a[0] - b[0]);
  let s = 0; const solid = [];
  for (const [a, b] of ops) { solid.push([s, a]); s = b; }
  solid.push([s, L]);
  if (o.collide !== false) for (const [a, b] of solid) if (b - a > .02) segs.push([x1 + dx * a, z1 + dz * a, x1 + dx * b, z1 + dz * b, t / 2]);
  if (o.plan !== false) for (const [a, b] of solid) if (b - a > .02) planSegs.push([x1 + dx * a, z1 + dz * a, x1 + dx * b, z1 + dz * b, o.glass ? 1 : 0]);
}
function polyWall(pts, o) { for (let i = 0; i < pts.length - 1; i++) planWall(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o); }
function arc(cx, cz, r, a0, a1, n = 14) { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); } return p; }

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
  box(.25, 2.2, 28, new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: .9 }), 21.5, 0, 12);
  box(.25, 2.2, 20, new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: .9 }), 20.5, 0, 12);
}

/* ---------- floors (design look; FBX base slab sits below) ---------- */
{
  const f = mesh(new THREE.PlaneGeometry(W, GD), new THREE.MeshStandardMaterial({ map: rep(T.wood, W / 2.2, GD / 2.2), roughness: .5 }), W / 2, .002, GD / 2, root, false); f.rotation.x = -Math.PI / 2;
  const c = mesh(new THREE.PlaneGeometry(5.6, 16.8), new THREE.MeshStandardMaterial({ map: rep(T.carpet, 5.6 / 1.6, 16.8 / 1.6), roughness: 1 }), 3.4, .006, 9.8, root, false); c.rotation.x = -Math.PI / 2;
  const wf = mesh(new THREE.PlaneGeometry(W, BZ - GD), M.travertine, W / 2, .002, (GD + BZ) / 2, root, false); wf.rotation.x = -Math.PI / 2;
  const cl = mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshStandardMaterial({ map: rep(T.wood, 1.3, 2), roughness: .6, color: 0xe8d9c0 }), 1.5, .005, 21.75, root, false); cl.rotation.x = -Math.PI / 2;
}

/* ---------- collision + plan walls (from the DWG layout; visuals come from the FBX) ---------- */
const rN = 3.9;
planWall(0, 0, W - rN, 0);                                   // north wall
polyWall(arc(W - rN, rN, rN, -Math.PI / 2, 0, 16), { glass: true, t: .12 });   // curved NE glass
planWall(W, rN, W, GD, { glass: true, t: .12, open: [[10.7 - rN, 12.9 - rN]] }); // east glass
planWall(0, GD, W, GD, { open: [[8.4, 9.4]] });              // gym <-> wellness divider, door at FBX position
planWall(0, 0, 0, GD);                                       // west wall
planWall(0, BZ, 9.916, BZ, { open: [[.4, 1.4]] });           // south wall
polyWall(arc(9.916, 20.915, 3.085, Math.PI / 2, 0, 18).reverse().map(p => p)); // curved SE wall
planWall(W, GD, W, 20.915);                                  // east wall remainder
planWall(3.0, GD, 3.0, BZ, {});                              // classroom partition
planWall(3.0, 21.1, 5.7, 21.1, { t: .12 }); planWall(3.0, 22.4, 5.7, 22.4, { t: .12 });
planWall(5.7, GD, 5.7, 20.0, { t: .12 }); planWall(5.7, 21.1, 5.7, 22.4, { t: .12 }); planWall(5.7, 23.5, 5.7, BZ, { t: .12 });
planWall(9.0, GD, 9.0, 21.2, { t: .12 }); planWall(9.0, 22.1, 9.0, BZ - .45, { t: .12 });
planWall(9.0, 21.2, 11.5, 21.2, { t: .12 });
planWall(11.5, GD, 11.5, 21.2, { t: .06 });
circles.push([10.85, 2.75, 1.7]); // corner lounge sofa, NE corner
circles.push([11.3, 22.4, 1.0]);  // jacuzzi

/* ---------- roof backing (seen from above when ceiling is on) ---------- */
{
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xcfc9bf, roughness: .9, side: THREE.DoubleSide });
  const r1 = mesh(new THREE.PlaneGeometry(W + .6, GD + .6), roofMat, W / 2, 3.46, GD / 2 - .1, ceilingGroup, false); r1.rotation.x = -Math.PI / 2;
  const r2 = mesh(new THREE.PlaneGeometry(W + .6, BZ - GD + .6), roofMat, W / 2, 3.46, (GD + BZ) / 2, ceilingGroup, false); r2.rotation.x = -Math.PI / 2;
}

/* ---------- the real model: building + furniture from the design FBX ---------- */
const CEIL_RE = /ceiling|^ceil|recessed_|spotlight|spot_diffuser|canopy|skylight|wash_diffuser|magnetic_ceiling_track|linear_diffuser/i;
const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf2ede3, roughness: .95 });
const ceilGlowMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: .6, emissive: 0xffe9c4, emissiveIntensity: .9 });
const CEIL_NO = /bench|niche|desk|shelf|vanity|linen|seat|bed/i;
let modelReady = false;
new GLTFLoader().load('2-gym.glb', gltf => {
  const obj = gltf.scene;
  const toCeil = [];
  obj.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material; if (!m) return;
    const mn = (m.name || '').toLowerCase(); const nn = o.name || '';
    if (/soaking_tub|bath_step|bath_filler/i.test(nn)) { o.visible = false; return; }
    if (mn.includes('glass')) { m.transparent = true; m.opacity = .1; m.depthWrite = false; m.side = THREE.DoubleSide; m.envMapIntensity = .2; m.roughness = .12; }
    if (mn.includes('black_rubber')) { m.color.set(0x17181a); m.roughness = .55; }
    if (mn.includes('leaf')) { m.color.set(0x66754e); m.roughness = .9; }
    if (mn.includes('bark')) { m.color.set(0x6b5844); m.roughness = .95; }
    if (mn.includes('water')) { m.transparent = true; m.opacity = .8; }
    if (mn.includes('mirror')) { m.color.set(0x9aa0a4); m.roughness = .05; m.metalness = 1; m.envMapIntensity = 1.6; }
    if (mn.includes('screen')) { m.emissive.set(0x14301c); m.emissiveIntensity = .6; }
    const isCeil = (CEIL_RE.test(nn) && !CEIL_NO.test(nn)) || /^Sauna_ceiling|^Sauna_timber_ceiling/.test(nn);
    if (isCeil) o.material = /diffuser|strip|linear|spotlight|recessed/i.test(nn) ? ceilGlowMat : ceilMat;
    const big = o.geometry.attributes.position.count > 40000;
    o.castShadow = !m.transparent && !isCeil && !big;
    o.receiveShadow = true;
    if (isCeil) toCeil.push(o);
  });
  for (const o of toCeil) ceilingGroup.add(o);
  root.add(obj);
  modelReady = true;
  setTimeout(() => { const l = document.getElementById('loading'); if (l) { l.style.opacity = 0; setTimeout(() => l.remove(), 700); } }, 250);
}, ev => {
  const l = document.getElementById('loading');
  if (l && ev.total) l.textContent = 'Loading model ' + Math.round(ev.loaded / ev.total * 100) + '%';
}, err => {
  console.error(err);
  const l = document.getElementById('loading'); if (l) l.textContent = 'Model failed to load';
});

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

/* ---------- corner lounge sofa (from design renders r01/r08; the FBX hides it) ---------- */
{
  const green = new THREE.MeshStandardMaterial({ color: 0x46543e, roughness: .92 });
  const green2 = new THREE.MeshStandardMaterial({ color: 0x4e5c45, roughness: .92 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xe9e3d4, roughness: .85 });
  const sofa = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.4, .3, 40), green); base.scale.set(1, 1, .8); base.position.y = .15;
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.28, .22, 40), green2); seat.scale.set(1, 1, .78); seat.position.y = .39;
  const back = new THREE.Mesh(new THREE.CylinderGeometry(1.34, 1.34, .58, 40, 1, true, Math.PI * .05, Math.PI * .9), green);
  back.material.side = THREE.DoubleSide; back.scale.set(1, 1, .8); back.position.y = .58;
  const backTop = new THREE.Mesh(new THREE.TorusGeometry(1.34, .09, 10, 40, Math.PI * .9), green);
  backTop.rotation.x = Math.PI / 2; backTop.rotation.z = Math.PI * .05; backTop.scale.set(1, .8, 1); backTop.position.y = .87;
  sofa.add(base, seat, back, backTop);
  const cushGeo = new THREE.SphereGeometry(.3, 16, 12);
  for (const [dx, dz, ry] of [[-.55, -.5, .5], [.45, -.6, -.4]]) {
    const c = new THREE.Mesh(cushGeo, cream); c.scale.set(1, .75, .45); c.position.set(dx, .62, dz); c.rotation.y = ry; sofa.add(c);
  }
  sofa.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  sofa.position.set(10.85, 0, 2.75); sofa.rotation.y = Math.PI * .25;
  root.add(sofa);
}

/* ---------- tour scenes ---------- */
const S = [
  { k: 'Overview', t: 'The whole project', d: 'The real design model: gym floor (13.0 x 19.5 m) with the rounded glass corner, and the wellness block along the south side: study room, WC/showers, dressing, sauna and jacuzzi.', cam: [-9, 21, 36], tg: [6.5, 0, 14], ceil: false, img: 'r01', ref: 'Top-down render' },
  { k: 'Plan', t: 'Top-down layout', d: 'Wood floor with a grey carpet studio zone. Treadmills line the garden glass, pilates mats and equipment on the carpet, the green lounge sofa in the rounded corner.', cam: [6.5, 36, 12.6], tg: [6.5, 0, 12], ceil: false, img: 'r01', ref: 'Top-down render' },
  { k: 'Arrival', t: 'Glass wall to the garden', d: 'Full-height black-framed glazing with a double glass door, looking out to the planted garden. Warm oak floor, soft daylight.', cam: [4.5, 1.65, 11.8], tg: [13, 1.35, 11.8], ceil: true, img: 'r09', ref: 'Design render' },
  { k: 'Cardio', t: 'Treadmill line', d: 'Six treadmills face the garden, with curved manual runners by the studio wall. The wood floor keeps the cardio zone clear and easy to maintain.', cam: [6.4, 1.7, 3.8], tg: [12.5, 1.1, 10], ceil: true, img: 'r12', ref: 'Design render' },
  { k: 'Studio', t: 'Pilates and training wall', d: 'Pilates mats, TRX straps and the swiss ball on the soft grey carpet, with ball storage, stall bars and the wall TV along the panelled wall. Slatted oak ceiling above.', cam: [6.6, 1.65, 17.5], tg: [3, 0.9, 6.5], ceil: true, img: 'r03', ref: 'Design render' },
  { k: 'Lounge', t: 'The corner lounge', d: 'A deep-green oval sofa with cream cushions under the olive trees: the quiet corner from the design renders, looking out to the garden.', cam: [6.6, 1.55, 9.5], tg: [10.8, 0.7, 2.2], ceil: true, img: 'r08', ref: 'Design render' },
  { k: 'Training wall', t: 'Storage, stall bars and aerial hammock', d: 'Panelled feature wall with ball storage racks, stall bars, the hanging aerial hammock and the wall TV.', cam: [6, 1.65, 11], tg: [4, 1.4, 0], ceil: true, img: 'r13', ref: 'Design render' },
  { k: 'Wellness', t: 'Changing rooms, sauna and jacuzzi', d: 'Roof removed to show the plan: study room, WC/shower cells, dressing with lockers and a bench, sauna and jacuzzi inside the curved wall.', cam: [6.5, 19, 31], tg: [6.5, 0, 21.8], ceil: false, img: 'wet', ref: 'Design render' },
  { k: 'Study', t: 'Study room', d: 'A quiet room at the west end of the block: desk, task chairs, shelving and books, with its own door to the outside.', cam: [2.6, 1.7, 23.5], tg: [.6, 1, 20.2], ceil: false, img: 'plan', ref: 'Drawing, page 12' },
  { k: 'Garden', t: 'The building from the garden', d: 'The curved glass facade from the gravel garden, with planting along the wall.', cam: [19, 2.6, 12], tg: [6, 1.6, 12], ceil: false, img: 'r09', ref: 'Design render' },
];

const $ = id => document.getElementById(id);
let mode = 'tour', idx = 0, ceilOn = true, tween = null;
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = .08; orbit.maxPolarAngle = Math.PI * .495; orbit.minDistance = .5; orbit.maxDistance = 90;
let ceilAuto = true;
function goScene(i, instant) {
  idx = (i + S.length) % S.length; const s = S[idx];
  $('k').textContent = `${String(idx + 1).padStart(2, '0')} / ${S.length} · ${s.k}`; $('t').textContent = s.t; $('d').textContent = s.d; $('m').textContent = '';
const IMGNAME = n => ({plan:3,r01:4,r03:5,r08:6,r09:7,r12:8,r13:9,r14:10,wet:11}[n]) + '-img-' + n + '.jpg';
  $('thumb').style.backgroundImage = `url(${IMGNAME(s.img)})`; $('thumb').firstElementChild.textContent = s.ref;
  document.querySelectorAll('#dots i').forEach((e, j) => e.classList.toggle('on', j === idx));
  ceilAuto = true; ceilingGroup.visible = ceilOn && s.ceil;
  const to = { p: new THREE.Vector3(...s.cam), t: new THREE.Vector3(...s.tg) };
  if (instant) { camera.position.copy(to.p); orbit.target.copy(to.t); orbit.update(); return; }
  tween = { p0: camera.position.clone(), t0: orbit.target.clone(), p1: to.p, t1: to.t, a: 0 };
}
S.forEach((_, i) => { const e = document.createElement('i'); e.onclick = () => { setMode('tour'); goScene(i); }; $('dots').appendChild(e); });
$('prev').onclick = () => goScene(idx - 1); $('next').onclick = () => goScene(idx + 1);
$('goWalk').onclick = () => setMode('walk', true);
$('thumb').onclick = () => { $('lbimg').src = `${IMGNAME(S[idx].img)}`; $('lightbox').style.display = 'flex'; };
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
    if (mode === 'walk') { P.pos.x += (fx * f + rx * s) * sp; P.pos.z += (fz * f + rz * s) * sp; collide(P.pos, .3); }
    else {
      const cp = Math.cos(P.pitch), sp2 = Math.sin(P.pitch);
      P.pos.x += (fx * cp * f + rx * s) * sp; P.pos.z += (fz * cp * f + rz * s) * sp; P.pos.y += (sp2 * f) * sp;
      P.pos.y += ((keys.KeyE || keys.Space ? 1 : 0) - (keys.KeyQ || keys.ControlLeft ? 1 : 0) + vertIn) * sp;
      P.pos.y = Math.max(.3, Math.min(60, P.pos.y));
      if (P.pos.y < H + .05 && !(P.pos.x < -.5 || P.pos.x > W + .5 || P.pos.z < -.5 || P.pos.z > BZ + .5)) { collide(P.pos, .25); }
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
window.__gym = { setMode, goScene, P, S };
