import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CameraPresetId } from '../types/birthday';
import { birthdayAudio } from '../utils/audio';

interface BirthdayStage3DProps {
  candlesLit: boolean;
  onToggleCandles: (lit: boolean) => void;
  onCelebrate: () => void;
  onGiftInspect: (message: string) => void;
  countdownLabel: string;
  isBirthdayToday: boolean;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  onScrollToMemories: () => void;
}

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'overview',
    label: 'Overview',
    pos: new THREE.Vector3(0.2, 2.95, 7.25),
    target: new THREE.Vector3(0, 1.28, 0),
  },
  {
    id: 'cake',
    label: 'Cake Close-Up',
    pos: new THREE.Vector3(0.1, 2.2, 3.45),
    target: new THREE.Vector3(0, 1.32, 0),
  },
  {
    id: 'gifts',
    label: 'Gift Boxes',
    pos: new THREE.Vector3(-2.6, 1.75, 4.4),
    target: new THREE.Vector3(-1.35, 0.55, 0.8),
  },
  {
    id: 'balloons',
    label: 'Party Balloons',
    pos: new THREE.Vector3(2.8, 3.9, 6.2),
    target: new THREE.Vector3(0.2, 2.9, -0.4),
  },
];

const GIFT_BLESSINGS = [
  'Gift Box 1: Wishing Simran endless curiosity, bold dreams, and sunlit mornings!',
  'Gift Box 2: May Khushi Mama always stay surrounded by laughter, music, and family warmth!',
  'Gift Box 3: A lifetime of joyful travels, sweet surprises, and unforgettable 19th Novembers!',
];

// Pre-allocated scratch math objects for zero-GC animation loop
const _scratchColor = new THREE.Color();
const _dummy = new THREE.Object3D();

function detectSoftwareWebGL(): boolean {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createMarbleFloorTexture(maxAniso: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  ctx.fillStyle = '#FFF9F6';
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 244, 240, 0.95)');
  grad.addColorStop(0.6, 'rgba(250, 236, 232, 0.9)');
  grad.addColorStop(1, 'rgba(244, 226, 224, 0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle gold & blush travertine veins
  for (let i = 0; i < 22; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (Math.random() - 0.5) * 140;
      y += (Math.random() - 0.5) * 140;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(212, 175, 55, 0.14)' : 'rgba(224, 159, 157, 0.18)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.stroke();
  }

  // Concentric celebration inlay rings
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.24, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAniso;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#B8B8B8';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const shade = 150 + Math.floor(Math.random() * 65);
    rCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    rCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAniso;

  return { map, roughnessMap };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(65, 40, 52, 0.45)');
  grad.addColorStop(0.55, 'rgba(65, 40, 52, 0.16)');
  grad.addColorStop(1, 'rgba(65, 40, 52, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createNumber11Topper(
  goldMaterial: THREE.Material,
  enamelMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();

  // Sculptural serif numeral "1" profile extruded in true beveled 3D
  const makeDigitOneShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.105, 0);
    s.lineTo(0.105, 0);
    s.lineTo(0.105, 0.068);
    s.lineTo(0.042, 0.082);
    s.lineTo(0.042, 0.56);
    s.lineTo(-0.025, 0.56);
    s.lineTo(-0.12, 0.445);
    s.lineTo(-0.082, 0.392);
    s.lineTo(-0.038, 0.44);
    s.lineTo(-0.038, 0.082);
    s.lineTo(-0.105, 0.068);
    s.closePath();
    return s;
  };

  const oneGeo = new THREE.ExtrudeGeometry(makeDigitOneShape(), {
    depth: 0.085,
    bevelEnabled: true,
    bevelThickness: 0.022,
    bevelSize: 0.018,
    bevelSegments: 4,
  });
  oneGeo.translate(0, 0, -0.0425);

  // Glossy hot-pink Barbie enamel inlay slightly proud on each "1"
  const inlayGeo = new THREE.ExtrudeGeometry(makeDigitOneShape(), {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  inlayGeo.scale(0.84, 0.9, 1);
  inlayGeo.translate(0, 0.026, 0.046);

  const pinGeo = new THREE.CylinderGeometry(0.014, 0.009, 0.25, 12);

  [-0.145, 0.145].forEach((offsetX) => {
    const digitHolder = new THREE.Group();
    digitHolder.position.set(offsetX, 0.14, 0);

    const goldBody = new THREE.Mesh(oneGeo, goldMaterial);
    goldBody.castShadow = true;
    digitHolder.add(goldBody);

    const pinkInlay = new THREE.Mesh(inlayGeo, enamelMaterial);
    digitHolder.add(pinkInlay);

    const pin = new THREE.Mesh(pinGeo, goldMaterial);
    pin.position.set(0, -0.09, 0);
    digitHolder.add(pin);

    group.add(digitHolder);
  });

  // Sparkling gold crown star perched above the "11"
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? 0.078 : 0.034;
    const sx = Math.cos(ang) * rad;
    const sy = Math.sin(ang) * rad;
    if (i === 0) starShape.moveTo(sx, sy);
    else starShape.lineTo(sx, sy);
  }
  starShape.closePath();
  const starGeo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  starGeo.translate(0, 0, -0.012);
  const crownStar = new THREE.Mesh(starGeo, goldMaterial);
  crownStar.position.set(0, 0.81, 0);
  crownStar.castShadow = true;
  group.add(crownStar);

  return group;
}

function createBarbieFaceTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Soft porcelain peach-warm complexion
  ctx.fillStyle = '#FFE0CC';
  ctx.fillRect(0, 0, size, size);

  // Face center at u = 0.5 (x = 128), v = 0.52 (y = 124)
  const cx = 128;
  const cy = 126;

  // Rosy blush cheeks
  [-24, 24].forEach((dx) => {
    const blush = ctx.createRadialGradient(cx + dx, cy + 12, 2, cx + dx, cy + 12, 16);
    blush.addColorStop(0, 'rgba(255, 92, 160, 0.48)');
    blush.addColorStop(1, 'rgba(255, 92, 160, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(cx + dx, cy + 12, 16, 0, Math.PI * 2);
    ctx.fill();
  });

  // Delicate arched eyebrows
  ctx.strokeStyle = '#9C6B3B';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  [-15, 15].forEach((dx) => {
    const dir = dx < 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + dx - 8 * dir, cy - 11);
    ctx.quadraticCurveTo(cx + dx, cy - 17, cx + dx + 8 * dir, cy - 12);
    ctx.stroke();
  });

  // Sparkling blue-violet Barbie eyes + lashes + catchlights
  [-15, 15].forEach((dx) => {
    // Eye white
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy - 2, 7.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aqua-blue iris
    ctx.fillStyle = '#2E95E8';
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 2, 4.3, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1E1A2B';
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight sparkle
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx + dx - 1.5, cy - 3.6, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Eyelash curve
    ctx.strokeStyle = '#2A1D28';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 1, 7.6, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
  });

  // Subtle nose dot
  ctx.fillStyle = 'rgba(220, 145, 118, 0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy + 7, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Cheerful Barbie pink lipstick smile
  ctx.fillStyle = '#F0388C';
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy + 18);
  ctx.quadraticCurveTo(cx, cy + 29, cx + 11, cy + 18);
  ctx.quadraticCurveTo(cx, cy + 21, cx - 11, cy + 18);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createBarbieGirlFigurine(
  goldMat: THREE.Material,
  maxAniso: number
): { group: THREE.Group; faceTex: THREE.CanvasTexture } {
  const group = new THREE.Group();

  const dressHotPinkMat = new THREE.MeshPhysicalMaterial({
    color: 0xff3b9a,
    roughness: 0.34,
    metalness: 0.08,
    clearcoat: 0.72,
    sheen: 0.9,
    sheenColor: new THREE.Color(0xffb8e0),
  });
  const bodiceMagentaMat = new THREE.MeshPhysicalMaterial({
    color: 0xe6187c,
    roughness: 0.28,
    metalness: 0.22,
    clearcoat: 0.85,
  });
  const lilacRuffleMat = new THREE.MeshPhysicalMaterial({
    color: 0xd494ff,
    roughness: 0.42,
    metalness: 0.06,
    clearcoat: 0.55,
  });
  const aquaSashMat = new THREE.MeshPhysicalMaterial({
    color: 0x5be3f5,
    roughness: 0.3,
    metalness: 0.12,
    clearcoat: 0.75,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffe0cc,
    roughness: 0.54,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4c55b,
    roughness: 0.42,
    metalness: 0.12,
    clearcoat: 0.35,
  });
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0xff288f,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1.0,
  });

  // 1. Sculpted Bell-Shaped Princess Ballgown Skirt (bottom pivot at y = 0)
  const skirtProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.22, 0.0),
    new THREE.Vector2(0.215, 0.045),
    new THREE.Vector2(0.18, 0.15),
    new THREE.Vector2(0.132, 0.27),
    new THREE.Vector2(0.072, 0.38),
    new THREE.Vector2(0.058, 0.43),
    new THREE.Vector2(0.0, 0.43),
  ];
  const skirtMesh = new THREE.Mesh(new THREE.LatheGeometry(skirtProfile, 36), dressHotPinkMat);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;
  group.add(skirtMesh);

  // Scalloped lilac tulle peplum ruffles around upper skirt
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const ruffle = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), lilacRuffleMat);
    ruffle.position.set(Math.cos(a) * 0.115, 0.31, Math.sin(a) * 0.115);
    ruffle.scale.set(1.15, 0.65, 1.05);
    group.add(ruffle);
  }

  // Sparkling aqua-blue & gold waist sash
  const waistSash = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.015, 10, 24), aquaSashMat);
  waistSash.rotation.x = Math.PI / 2;
  waistSash.position.y = 0.425;
  group.add(waistSash);

  const waistBow = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), goldMat);
  waistBow.position.set(0, 0.425, 0.07);
  group.add(waistBow);

  // Bottom hem pearl & gold trim beads
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 8),
      i % 2 === 0 ? goldMat : aquaSashMat
    );
    bead.position.set(Math.cos(a) * 0.215, 0.02, Math.sin(a) * 0.215);
    group.add(bead);
  }

  // 2. Fitted Sweetheart Bodice + Neck & Shoulders
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.42),
    new THREE.Vector2(0.056, 0.42),
    new THREE.Vector2(0.052, 0.48),
    new THREE.Vector2(0.072, 0.55),
    new THREE.Vector2(0.066, 0.61),
    new THREE.Vector2(0.0, 0.62),
  ];
  const bodiceMesh = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 24), bodiceMagentaMat);
  bodiceMesh.castShadow = true;
  group.add(bodiceMesh);

  // Golden sweetheart collar trim + shoulders & neck
  const collarTrim = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.008, 8, 20), goldMat);
  collarTrim.rotation.x = Math.PI / 2.2;
  collarTrim.position.y = 0.61;
  group.add(collarTrim);

  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 12), skinMat);
  shoulders.scale.set(1.22, 0.55, 0.72);
  shoulders.position.y = 0.625;
  group.add(shoulders);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.028, 0.085, 14), skinMat);
  neck.position.y = 0.665;
  group.add(neck);

  // 3. Graceful Posed Arms + Golden Star Fairy Wand
  const leftArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.072, 0.62, 0.0),
    new THREE.Vector3(-0.125, 0.52, 0.015),
    new THREE.Vector3(-0.072, 0.435, 0.045),
  ]);
  const leftArm = new THREE.Mesh(new THREE.TubeGeometry(leftArmCurve, 16, 0.018, 10, false), skinMat);
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.072, 0.62, 0.0),
    new THREE.Vector3(0.145, 0.59, 0.04),
    new THREE.Vector3(0.195, 0.68, 0.08),
  ]);
  const rightArm = new THREE.Mesh(
    new THREE.TubeGeometry(rightArmCurve, 16, 0.018, 10, false),
    skinMat
  );
  rightArm.castShadow = true;
  group.add(rightArm);

  // Sparkling Star Wand in right hand
  const wandGroup = new THREE.Group();
  wandGroup.position.set(0.2, 0.69, 0.085);
  wandGroup.rotation.z = -0.35;
  const wandStick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 8), goldMat);
  wandStick.position.y = 0.09;
  wandGroup.add(wandStick);

  const wandStarShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? 0.044 : 0.019;
    const sx = Math.cos(ang) * rad;
    const sy = Math.sin(ang) * rad;
    if (i === 0) wandStarShape.moveTo(sx, sy);
    else wandStarShape.lineTo(sx, sy);
  }
  wandStarShape.closePath();
  const wandStarGeo = new THREE.ExtrudeGeometry(wandStarShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  wandStarGeo.translate(0, 0, -0.006);
  const wandStar = new THREE.Mesh(wandStarGeo, goldMat);
  wandStar.position.y = 0.22;
  wandGroup.add(wandStar);

  const wandGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), gemMat);
  wandGem.position.set(0, 0.22, 0.01);
  wandGroup.add(wandGem);
  group.add(wandGroup);

  // 4. Sculpted Head with Expressive Barbie Face Texture
  const faceTex = createBarbieFaceTexture(maxAniso);
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.5,
    metalness: 0.02,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.084, 24, 20), faceMat);
  head.scale.set(0.95, 1.07, 0.95);
  head.position.y = 0.765;
  head.rotation.y = -Math.PI / 2;
  head.castShadow = true;
  group.add(head);

  // 5. Flowing Golden-Blonde Hair, Framing Curls & High Ponytail
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.089, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.set(0, 0.778, -0.012);
  hairCap.rotation.x = -0.35;
  group.add(hairCap);

  // Sweeping side locks framing face
  [-1, 1].forEach((side) => {
    const bangCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01 * side, 0.85, 0.04),
      new THREE.Vector3(0.072 * side, 0.8, 0.048),
      new THREE.Vector3(0.085 * side, 0.71, 0.018),
    ]);
    const bang = new THREE.Mesh(new THREE.TubeGeometry(bangCurve, 12, 0.022, 8, false), hairMat);
    group.add(bang);
  });

  // Voluminous cascading high ponytail in back
  const ponyHolder = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.01, 8, 16), dressHotPinkMat);
  ponyHolder.position.set(0, 0.825, -0.085);
  ponyHolder.rotation.x = Math.PI / 3;
  group.add(ponyHolder);

  const ponyCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.82, -0.085),
    new THREE.Vector3(0.02, 0.75, -0.14),
    new THREE.Vector3(-0.015, 0.63, -0.145),
    new THREE.Vector3(0.015, 0.51, -0.13),
  ]);
  const ponytail = new THREE.Mesh(new THREE.TubeGeometry(ponyCurve, 20, 0.036, 12, false), hairMat);
  ponytail.castShadow = true;
  group.add(ponytail);

  // 6. Royal Gold & Hot-Pink Gem Princess Tiara
  const tiaraBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.068, 0.008, 8, 22, Math.PI * 1.15),
    goldMat
  );
  tiaraBand.position.set(0, 0.85, 0.015);
  tiaraBand.rotation.x = Math.PI / 2 - 0.25;
  tiaraBand.rotation.z = -Math.PI * 0.075;
  group.add(tiaraBand);

  const tiaraGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.02, 0), gemMat);
  tiaraGem.position.set(0, 0.885, 0.072);
  group.add(tiaraGem);

  [-0.034, 0.034].forEach((tx) => {
    const pearlPeak = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), goldMat);
    pearlPeak.position.set(tx, 0.875, 0.058);
    group.add(pearlPeak);
  });

  return { group, faceTex };
}

function createSimranCakePlaque(
  goldMaterial: THREE.Material,
  maxAniso: number
): { group: THREE.Group; plaqueTex: THREE.CanvasTexture; redraw: () => void } {
  const group = new THREE.Group();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  const drawPlaque = () => {
    ctx.clearRect(0, 0, 1024, 320);

    // Iridescent Barbie pearl-pink & lavender gradient banner
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 320);
    bgGrad.addColorStop(0, '#FFEBF5');
    bgGrad.addColorStop(0.5, '#FFF8FC');
    bgGrad.addColorStop(1, '#F5E4FF');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(14, 14, 996, 292);

    // Double gold & hot-pink filigree frame
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 10;
    ctx.strokeRect(22, 22, 980, 276);
    ctx.strokeStyle = 'rgba(242, 41, 138, 0.55)';
    ctx.lineWidth = 4;
    ctx.strokeRect(38, 38, 948, 244);

    // Colorful gem flourish dots at corners
    const cornerGems: Array<[number, number, string]> = [
      [74, 74, '#FF2E93'],
      [950, 74, '#47D1EC'],
      [74, 246, '#B86EFF'],
      [950, 246, '#FF2E93'],
    ];
    cornerGems.forEach(([cx, cy, color]) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Decorative subtitle above name
    ctx.fillStyle = '#B8337A';
    ctx.font = '700 26px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦  HAPPY BIRTHDAY  ✦', 512, 76);

    // Large colorful Barbie calligraphy "Simran"
    const textGrad = ctx.createLinearGradient(250, 120, 770, 245);
    textGrad.addColorStop(0, '#E81E84');
    textGrad.addColorStop(0.5, '#B238D6');
    textGrad.addColorStop(1, '#E81E84');
    ctx.fillStyle = textGrad;
    ctx.font = 'italic 700 138px "Great Vibes", "Alex Brush", "Playfair Display", Georgia, serif';
    ctx.fillText('Simran', 512, 188);
  };

  drawPlaque();

  const plaqueTex = new THREE.CanvasTexture(canvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  plaqueTex.anisotropy = maxAniso;

  const arcStart = -0.62;
  const arcLen = 1.24;
  const plaqueGeo = new THREE.CylinderGeometry(1.148, 1.164, 0.31, 44, 1, true, arcStart, arcLen);
  const plaqueMat = new THREE.MeshPhysicalMaterial({
    map: plaqueTex,
    roughness: 0.2,
    metalness: 0.08,
    clearcoat: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.position.y = 0.79;
  group.add(plaqueMesh);

  // Delicate curved gold trim bands along top & bottom of the nameplate
  const makeTrimArc = (radius: number, yPos: number) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const th = arcStart + (i / 24) * arcLen;
      pts.push(new THREE.Vector3(Math.sin(th) * radius, yPos, Math.cos(th) * radius));
    }
    return new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.013, 8, false),
      goldMaterial
    );
  };
  group.add(makeTrimArc(1.151, 0.945));
  group.add(makeTrimArc(1.167, 0.635));

  return { group, plaqueTex, redraw: drawPlaque };
}

function createSugarRose(
  petalMat: THREE.Material,
  leafMat: THREE.Material,
  scale = 1
): THREE.Group {
  const rose = new THREE.Group();
  const petalGeo = new THREE.SphereGeometry(0.036, 10, 8);

  // Inner bud
  const bud = new THREE.Mesh(petalGeo, petalMat);
  bud.scale.set(0.75, 1.1, 0.75);
  bud.position.y = 0.015;
  rose.add(bud);

  // 2 concentric rings of cupped petals
  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 5 : 7;
    const rad = ring === 0 ? 0.032 : 0.056;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.4;
      const p = new THREE.Mesh(petalGeo, petalMat);
      p.position.set(Math.cos(a) * rad, ring === 0 ? 0.012 : 0.002, Math.sin(a) * rad);
      p.scale.set(1.05, 0.9, 0.42);
      p.lookAt(Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.5);
      rose.add(p);
    }
  }

  // Two tiny mint leaves
  const leafGeo = new THREE.SphereGeometry(0.032, 8, 6);
  [-0.7, 2.3].forEach((la) => {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.cos(la) * 0.075, -0.01, Math.sin(la) * 0.075);
    leaf.scale.set(1.4, 0.25, 0.75);
    leaf.rotation.y = -la;
    rose.add(leaf);
  });

  rose.scale.setScalar(scale);
  return rose;
}

function createStripedCandleTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(0, 0, 128, 256);

  const stripeColors = ['#FF3B9A', '#56DCF0', '#B87BFF', '#FFD84D'];
  let idx = 0;
  for (let y = -128; y < 384; y += 30) {
    ctx.fillStyle = stripeColors[idx % stripeColors.length];
    idx++;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y + 64);
    ctx.lineTo(128, y + 80);
    ctx.lineTo(0, y + 16);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function BirthdayStage3D({
  candlesLit,
  onToggleCandles,
  onCelebrate,
  onGiftInspect,
  countdownLabel,
  isBirthdayToday,
  isMusicPlaying,
  onToggleMusic,
  onScrollToMemories,
}: BirthdayStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('overview');
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const candlesLitRef = useRef(candlesLit);
  candlesLitRef.current = candlesLit;

  const callbacksRef = useRef({
    onToggleCandles,
    onCelebrate,
    onGiftInspect,
  });
  callbacksRef.current = {
    onToggleCandles,
    onCelebrate,
    onGiftInspect,
  };

  const presetTriggerRef = useRef<((id: CameraPresetId) => void) | null>(null);
  const burstTriggerRef = useRef<(() => void) | null>(null);

  const handleSelectPreset = useCallback((id: CameraPresetId) => {
    setActivePreset(id);
    presetTriggerRef.current?.(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const bgHex = 0xfff5f7;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.025);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.copy(CAMERA_PRESETS[0].pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(CAMERA_PRESETS[0].target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false;
    controls.minDistance = 2.4;
    controls.maxDistance = 12.5;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minPolarAngle = 0.25;
    controls.enablePan = false;
    controls.update();
    renderer.domElement.style.touchAction = 'pan-y';

    // Studio 3-point lighting + warm candle glow
    const hemiLight = new THREE.HemisphereLight(0xf3f6ff, 0xf2d9d4, 0.92);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dd, 2.0);
    keyLight.position.set(4.8, 8.2, 5.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 24;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffcad8, 0.85);
    rimLight.position.set(-5.5, 4.5, -5.0);
    scene.add(rimLight);

    const candlePointLight = new THREE.PointLight(0xffb347, 2.4, 7.5, 2);
    candlePointLight.position.set(0, 2.55, 0);
    scene.add(candlePointLight);

    // Procedural floor & contact shadow
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const floorTex = createMarbleFloorTexture(maxAniso);
    const contactTex = createContactShadowTexture();

    const floorGeo = new THREE.CircleGeometry(28, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex.map,
      roughnessMap: floorTex.roughnessMap,
      roughness: 0.48,
      metalness: 0.04,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const addContactShadow = (x: number, z: number, radius: number) => {
      const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
      const mat = new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      });
      const plane = new THREE.Mesh(geo, mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(x, 0.008, z);
      scene.add(plane);
    };

    // Shared Barbie Rainbow & Porcelain PBR materials
    const porcelainMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff8fc,
      roughness: 0.16,
      metalness: 0.05,
      clearcoat: 0.92,
      clearcoatRoughness: 0.12,
    });
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2c95c,
      roughness: 0.18,
      metalness: 0.94,
      anisotropy: 0.65,
    });
    const barbiePinkFondantMat = new THREE.MeshStandardMaterial({
      color: 0xff62af,
      roughness: 0.54,
      metalness: 0.04,
    });
    const lavenderFondantMat = new THREE.MeshStandardMaterial({
      color: 0xc992ff,
      roughness: 0.54,
      metalness: 0.04,
    });
    const aquaFondantMat = new THREE.MeshStandardMaterial({
      color: 0x7ae4f5,
      roughness: 0.5,
      metalness: 0.04,
    });
    const magentaGlazeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf02488,
      roughness: 0.16,
      metalness: 0.06,
      clearcoat: 0.94,
    });
    const buttercreamMat = new THREE.MeshStandardMaterial({
      color: 0xfffaf6,
      roughness: 0.66,
      metalness: 0.0,
    });
    const sunnyButtercreamMat = new THREE.MeshStandardMaterial({
      color: 0xffe26a,
      roughness: 0.56,
      metalness: 0.02,
    });
    const aquaButtercreamMat = new THREE.MeshStandardMaterial({
      color: 0x6ce3f7,
      roughness: 0.54,
      metalness: 0.02,
    });
    const lilacButtercreamMat = new THREE.MeshStandardMaterial({
      color: 0xd9a7ff,
      roughness: 0.54,
      metalness: 0.02,
    });
    const hotPinkEnamelMat = new THREE.MeshPhysicalMaterial({
      color: 0xff3696,
      roughness: 0.18,
      metalness: 0.2,
      clearcoat: 0.92,
    });

    // ===============================================================
    // COMPOSITE HERO 1: COLOURFUL BARBIE-GIRL 3-TIER BIRTHDAY CAKE
    // ===============================================================
    const cakeGroup = new THREE.Group();
    cakeGroup.position.set(0, 0, 0);
    cakeGroup.scale.setScalar(0.84);
    addContactShadow(0, 0, 1.58);

    // 1. LatheGeometry fluted porcelain pedestal
    const standProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.72, 0.0),
      new THREE.Vector2(0.68, 0.06),
      new THREE.Vector2(0.32, 0.12),
      new THREE.Vector2(0.22, 0.26),
      new THREE.Vector2(0.28, 0.36),
      new THREE.Vector2(1.36, 0.42),
      new THREE.Vector2(1.42, 0.48),
      new THREE.Vector2(1.34, 0.51),
      new THREE.Vector2(0.0, 0.51),
    ];
    const standGeo = new THREE.LatheGeometry(standProfile, 48);
    const standMesh = new THREE.Mesh(standGeo, porcelainMat);
    standMesh.castShadow = true;
    standMesh.receiveShadow = true;
    cakeGroup.add(standMesh);

    // 2. Gold + sparkling magenta rim around cake stand plate
    const plateRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.38, 0.024, 12, 56),
      goldMat
    );
    plateRim.rotation.x = Math.PI / 2;
    plateRim.position.y = 0.49;
    cakeGroup.add(plateRim);

    // 3. Bottom Vibrant Barbie Hot-Pink Tier (y = 0.51 to 1.07)
    const tier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.15, 0.56, 48),
      barbiePinkFondantMat
    );
    tier1.position.y = 0.79;
    tier1.castShadow = true;
    tier1.receiveShadow = true;
    cakeGroup.add(tier1);

    // 4. Middle Dreamy Lavender-Lilac Tier (y = 1.07 to 1.55)
    const tier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.86, 0.48, 44),
      lavenderFondantMat
    );
    tier2.position.y = 1.31;
    tier2.castShadow = true;
    tier2.receiveShadow = true;
    cakeGroup.add(tier2);

    // 5. Scalloped Gold Garland + Colorful Rainbow Gem Drops around Tier 2
    const garlandPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const r = 0.865;
      const waveY = 1.32 + Math.sin(a * 8) * 0.09;
      garlandPts.push(new THREE.Vector3(Math.cos(a) * r, waveY, Math.sin(a) * r));
    }
    const garlandCurve = new THREE.CatmullRomCurve3(garlandPts, true);
    const garlandMesh = new THREE.Mesh(
      new THREE.TubeGeometry(garlandCurve, 96, 0.017, 8, true),
      goldMat
    );
    cakeGroup.add(garlandMesh);

    const swagGemGeo = new THREE.OctahedronGeometry(0.028, 0);
    const swagGemMats = [hotPinkEnamelMat, aquaButtercreamMat, sunnyButtercreamMat, lilacButtercreamMat];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 16;
      const gem = new THREE.Mesh(swagGemGeo, swagGemMats[i % swagGemMats.length]);
      gem.position.set(Math.cos(a) * 0.875, 1.24, Math.sin(a) * 0.875);
      cakeGroup.add(gem);
    }

    // 6. Top Aqua-Turquoise Dream Tier (y = 1.55 to 1.97)
    const tier3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.6, 0.42, 40),
      aquaFondantMat
    );
    tier3.position.y = 1.76;
    tier3.castShadow = true;
    tier3.receiveShadow = true;
    cakeGroup.add(tier3);

    // 7. Glossy Barbie Magenta Drip Glaze Crown on Top Tier
    const glazeCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.59, 0.59, 0.06, 40),
      magentaGlazeMat
    );
    glazeCollar.position.y = 1.96;
    cakeGroup.add(glazeCollar);

    const dripDropGeo = new THREE.SphereGeometry(0.032, 10, 8);
    const dripStemGeo = new THREE.CylinderGeometry(0.026, 0.022, 0.14, 10);
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const lenFactor = 0.65 + ((i * 37) % 10) * 0.06;
      const rx = Math.cos(ang) * 0.585;
      const rz = Math.sin(ang) * 0.585;

      const stem = new THREE.Mesh(dripStemGeo, magentaGlazeMat);
      stem.position.set(rx, 1.92 - lenFactor * 0.05, rz);
      stem.scale.y = lenFactor;
      cakeGroup.add(stem);

      const drop = new THREE.Mesh(dripDropGeo, magentaGlazeMat);
      drop.position.set(rx, 1.92 - lenFactor * 0.11, rz);
      cakeGroup.add(drop);
    }

    // Colorful Rainbow Buttercream Rosettes & Pastel Sugar Flowers around Bottom Tier
    const blossomPalette = [
      new THREE.MeshStandardMaterial({ color: 0xffe26a, roughness: 0.45, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0x70e5f8, roughness: 0.45, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0xe3b8ff, roughness: 0.45, metalness: 0.04 }),
      new THREE.MeshStandardMaterial({ color: 0xffb3da, roughness: 0.45, metalness: 0.04 }),
    ];
    const rosettePalette = [buttercreamMat, aquaButtercreamMat, sunnyButtercreamMat, lilacButtercreamMat];
    const petalGeo = new THREE.SphereGeometry(0.034, 10, 8);
    const rosetteGeo = new THREE.TorusGeometry(0.048, 0.019, 10, 18);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rosette = new THREE.Mesh(rosetteGeo, rosettePalette[i % rosettePalette.length]);
      rosette.position.set(Math.cos(a) * 1.13, 1.07, Math.sin(a) * 1.13);
      rosette.rotation.x = Math.PI / 2.6;
      rosette.rotation.z = a;
      cakeGroup.add(rosette);

      // Skip directly over the front Simran plaque center
      const wrapped = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
      if (i % 2 === 0 && Math.abs(wrapped) > 0.72) {
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(Math.cos(a) * 1.155, 0.84, Math.sin(a) * 1.155);
        flowerGroup.lookAt(Math.cos(a) * 2.5, 0.84, Math.sin(a) * 2.5);
        const fMat = blossomPalette[(i / 2) % blossomPalette.length];
        for (let p = 0; p < 5; p++) {
          const pa = (p / 5) * Math.PI * 2;
          const petal = new THREE.Mesh(petalGeo, fMat);
          petal.position.set(Math.cos(pa) * 0.042, Math.sin(pa) * 0.042, 0);
          petal.scale.set(1, 1, 0.5);
          flowerGroup.add(petal);
        }
        const centerBead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), goldMat);
        centerBead.position.z = 0.012;
        flowerGroup.add(centerBead);
        cakeGroup.add(flowerGroup);
      }
    }

    // 8. Instanced Rainbow Buttercream Pearls around all 3 tier bases
    const pearlGeo = new THREE.SphereGeometry(0.038, 12, 10);
    const pearlBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.08,
    });
    const pearlCount = 28 + 20 + 14;
    const pearlsInstanced = new THREE.InstancedMesh(pearlGeo, pearlBaseMat, pearlCount);
    const rainbowPearlHexes = [0xff4fa6, 0x69e2f5, 0xffe169, 0xd49eff, 0xfffdf9];
    let pIdx = 0;
    const addPearlRing = (count: number, radius: number, y: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        _dummy.position.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
        _dummy.scale.setScalar(1);
        _dummy.rotation.set(0, 0, 0);
        _dummy.updateMatrix();
        pearlsInstanced.setMatrixAt(pIdx, _dummy.matrix);
        _scratchColor.setHex(rainbowPearlHexes[i % rainbowPearlHexes.length]);
        pearlsInstanced.setColorAt(pIdx, _scratchColor);
        pIdx++;
      }
    };
    addPearlRing(28, 1.15, 0.53);
    addPearlRing(20, 0.87, 1.09);
    addPearlRing(14, 0.6, 1.57);
    pearlsInstanced.instanceMatrix.needsUpdate = true;
    if (pearlsInstanced.instanceColor) pearlsInstanced.instanceColor.needsUpdate = true;
    pearlsInstanced.computeBoundingSphere();
    cakeGroup.add(pearlsInstanced);

    // 9. Rainbow Sprinkles on Top Tier Glaze & Tier Shoulders (InstancedMesh)
    const sprinkleGeo = new THREE.CapsuleGeometry(0.011, 0.036, 4, 6);
    const sprinkleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.25,
      clearcoat: 0.8,
    });
    const sprinkleCount = 54;
    const sprinklesInstanced = new THREE.InstancedMesh(sprinkleGeo, sprinkleMat, sprinkleCount);
    const sprinkleHexes = [0xff2e93, 0x4de0f5, 0xffe047, 0xc37cff, 0xffffff, 0xff8a65];
    for (let i = 0; i < sprinkleCount; i++) {
      const a = (i * 2.39996) % (Math.PI * 2);
      const isTop = i < 30;
      if (isTop) {
        const r = 0.28 + ((i * 19) % 10) * 0.025;
        _dummy.position.set(Math.cos(a) * r, 1.995, Math.sin(a) * r);
        _dummy.rotation.set(Math.PI / 2, a * 1.7, 0);
      } else {
        const r = 0.595;
        const y = 1.62 + ((i * 29) % 10) * 0.022;
        _dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        _dummy.rotation.set(0.4, a, (i % 5) * 0.5);
      }
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      sprinklesInstanced.setMatrixAt(i, _dummy.matrix);
      _scratchColor.setHex(sprinkleHexes[i % sprinkleHexes.length]);
      sprinklesInstanced.setColorAt(i, _scratchColor);
    }
    sprinklesInstanced.instanceMatrix.needsUpdate = true;
    if (sprinklesInstanced.instanceColor) sprinklesInstanced.instanceColor.needsUpdate = true;
    sprinklesInstanced.computeBoundingSphere();
    cakeGroup.add(sprinklesInstanced);

    // Colorful Sugar Roses, Macarons & Butterflies around Cake Tiers
    const rosePalette = [
      new THREE.MeshStandardMaterial({ color: 0xff3d9a, roughness: 0.42, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0x62def2, roughness: 0.42, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0xc97eff, roughness: 0.42, metalness: 0.03 }),
      new THREE.MeshStandardMaterial({ color: 0xffda5c, roughness: 0.42, metalness: 0.03 }),
    ];
    const mintLeafMat = new THREE.MeshStandardMaterial({
      color: 0x69d193,
      roughness: 0.5,
      metalness: 0.02,
    });
    const macaronColors = [0xff6bb5, 0x70e5f8, 0xd29bff, 0xffe066];

    // Gold & jewel bead dragees framing the Simran plaque on bottom tier
    const drageeGeo = new THREE.SphereGeometry(0.021, 8, 6);
    const drageeCoords: Array<[number, number]> = [];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const wrapped = Math.atan2(Math.sin(ang), Math.cos(ang));
      if (Math.abs(wrapped) < 0.72) continue;
      drageeCoords.push([ang, 0.72]);
      drageeCoords.push([ang + Math.PI / 18, 0.86]);
    }
    const drageesInstanced = new THREE.InstancedMesh(drageeGeo, goldMat, drageeCoords.length);
    drageeCoords.forEach(([ang, y], idx) => {
      const r = THREE.MathUtils.lerp(1.152, 1.124, (y - 0.51) / 0.56);
      _dummy.position.set(Math.cos(ang + Math.PI / 2) * r, y, Math.sin(ang + Math.PI / 2) * r);
      _dummy.scale.setScalar(1);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      drageesInstanced.setMatrixAt(idx, _dummy.matrix);
    });
    drageesInstanced.instanceMatrix.needsUpdate = true;
    drageesInstanced.computeBoundingSphere();
    cakeGroup.add(drageesInstanced);

    // Sculpted "Simran" curved nameplate on the front of the bottom tier
    const { group: simranPlaque, plaqueTex, redraw: redrawSimranPlaque } = createSimranCakePlaque(
      goldMat,
      maxAniso
    );
    cakeGroup.add(simranPlaque);

    // Colorful Sugar Roses + Tiny Wafer Butterflies on Tier 1 shoulder
    [-0.9, -0.45, 0.45, 0.9, 2.2, 3.9].forEach((a, idx) => {
      const rose = createSugarRose(
        rosePalette[idx % rosePalette.length],
        mintLeafMat,
        idx % 2 === 0 ? 1.15 : 0.95
      );
      rose.position.set(Math.sin(a) * 0.97, 1.1, Math.cos(a) * 0.97);
      rose.rotation.x = 0.25;
      cakeGroup.add(rose);
    });

    // Delicate pastel sugar butterflies hovering on tier ledges
    const wingGeo = new THREE.CircleGeometry(0.042, 12);
    [-0.68, 0.68, 2.4].forEach((a, idx) => {
      const bfly = new THREE.Group();
      const wingMat = blossomPalette[idx % blossomPalette.length];
      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.x = side * 0.024;
        wing.rotation.y = side * 0.55;
        wing.scale.set(1, 1.35, 1);
        bfly.add(wing);
      });
      bfly.position.set(Math.sin(a) * 0.72, 1.62, Math.cos(a) * 0.72);
      bfly.lookAt(Math.sin(a) * 2, 1.85, Math.cos(a) * 2);
      cakeGroup.add(bfly);
    });

    // Colorful Rainbow Macarons & Glazed Berries around Top Tier Rim
    const berryGeo = new THREE.SphereGeometry(0.048, 14, 12);
    const macaronHalfGeo = new THREE.CylinderGeometry(0.05, 0.054, 0.022, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      if (i % 2 === 0) {
        const berry = new THREE.Mesh(berryGeo, magentaGlazeMat);
        berry.position.set(Math.cos(a) * 0.48, 2.02, Math.sin(a) * 0.48);
        berry.scale.set(1, 1.15, 1);
        berry.castShadow = true;
        cakeGroup.add(berry);
      } else {
        const macMat = new THREE.MeshStandardMaterial({
          color: macaronColors[Math.floor(i / 2) % macaronColors.length],
          roughness: 0.42,
          metalness: 0.04,
        });
        const macGroup = new THREE.Group();
        macGroup.position.set(Math.cos(a) * 0.48, 2.02, Math.sin(a) * 0.48);
        macGroup.rotation.set(0.35, -a, 0.2);
        const topShell = new THREE.Mesh(macaronHalfGeo, macMat);
        topShell.position.y = 0.016;
        const filling = new THREE.Mesh(
          new THREE.CylinderGeometry(0.046, 0.046, 0.014, 16),
          buttercreamMat
        );
        const botShell = new THREE.Mesh(macaronHalfGeo, macMat);
        botShell.position.y = -0.016;
        macGroup.add(topShell, filling, botShell);
        cakeGroup.add(macGroup);
      }
    }

    // 10. Sculpted 3D Barbie Princess Girl Figurine standing gracefully on top of the cake
    const { group: barbieGirl, faceTex: barbieFaceTex } = createBarbieGirlFigurine(goldMat, maxAniso);
    barbieGirl.position.set(-0.17, 1.99, -0.02);
    barbieGirl.rotation.y = 0.14;
    cakeGroup.add(barbieGirl);

    // 11. Sculpted 3D Extruded "11" Topper beside Barbie in Gold & Hot Pink Enamel
    const topper = createNumber11Topper(goldMat, hotPinkEnamelMat);
    topper.position.set(0.24, 1.98, -0.08);
    topper.rotation.y = -0.1;
    topper.scale.setScalar(0.84);
    cakeGroup.add(topper);

    // 12. 5 Rainbow-Striped Party Candles + Flames + Smoke Puffs around Front Rim
    const candleStripeTex = createStripedCandleTexture(maxAniso);
    const candleWaxMat = new THREE.MeshStandardMaterial({
      map: candleStripeTex,
      roughness: 0.42,
      metalness: 0.04,
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffe484,
      emissive: new THREE.Color(0xff9d1c),
      emissiveIntensity: 2.6,
      roughness: 0.2,
    });
    const flameProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.026, 0.028),
      new THREE.Vector2(0.02, 0.07),
      new THREE.Vector2(0.008, 0.105),
      new THREE.Vector2(0, 0.12),
    ];
    const flameGeo = new THREE.LatheGeometry(flameProfile, 14);
    const candleGeo = new THREE.CylinderGeometry(0.022, 0.024, 0.22, 14);
    const wickGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8);
    const wickMat = new THREE.MeshStandardMaterial({ color: 0x2d242c, roughness: 0.9 });

    const flameMeshes: THREE.Mesh[] = [];
    const smokeMeshes: Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number }> = [];
    const smokeGeo = new THREE.SphereGeometry(0.032, 10, 8);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xdfd8dc,
      transparent: true,
      opacity: 0,
      roughness: 1,
      depthWrite: false,
    });

    const candleAngles = [-0.95, -0.48, 0, 0.48, 0.95];
    candleAngles.forEach((ang, idx) => {
      const r = 0.37;
      const cx = Math.sin(ang) * r;
      const cz = Math.cos(ang) * r + 0.08;

      const candle = new THREE.Mesh(candleGeo, candleWaxMat);
      candle.position.set(cx, 2.09, cz);
      candle.castShadow = true;
      cakeGroup.add(candle);

      const wick = new THREE.Mesh(wickGeo, wickMat);
      wick.position.set(cx, 2.21, cz);
      cakeGroup.add(wick);

      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 2.225, cz);
      flame.userData.phase = idx * 1.3;
      cakeGroup.add(flame);
      flameMeshes.push(flame);

      const smoke = new THREE.Mesh(smokeGeo, smokeMat.clone());
      smoke.position.set(cx, 2.28, cz);
      cakeGroup.add(smoke);
      smokeMeshes.push({
        mesh: smoke,
        basePos: new THREE.Vector3(cx, 2.28, cz),
        phase: idx * 0.7,
      });
    });

    // Invisible simplified raycast proxy box over cake candles for snappy clicks
    const cakeHitProxy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.15, 2.75, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    cakeHitProxy.position.y = 1.38;
    cakeHitProxy.layers.set(1);
    cakeHitProxy.userData.action = 'toggleCandles';
    cakeGroup.add(cakeHitProxy);

    scene.add(cakeGroup);

    // ===============================================================
    // COMPOSITE PROPS 2: WRAPPED GIFT BOXES (3 × 5-part Groups)
    // ===============================================================
    const createGiftBox = (
      x: number,
      z: number,
      rotY: number,
      w: number,
      h: number,
      dSize: number,
      boxColor: number,
      ribbonMat: THREE.Material,
      blessingIndex: number
    ) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rotY;
      addContactShadow(x, z, Math.max(w, dSize) * 0.85);

      const boxMat = new THREE.MeshStandardMaterial({
        color: boxColor,
        roughness: 0.78,
        metalness: 0.04,
      });

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, dSize), boxMat);
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      const lidH = h * 0.22;
      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.05, lidH, dSize + 0.05),
        boxMat
      );
      lid.position.y = h - lidH * 0.35;
      lid.castShadow = true;
      group.add(lid);

      const ribbonA = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.065, h + 0.03, 0.075),
        ribbonMat
      );
      ribbonA.position.y = h / 2 + 0.01;
      group.add(ribbonA);

      const ribbonB = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, h + 0.03, dSize + 0.065),
        ribbonMat
      );
      ribbonB.position.y = h / 2 + 0.01;
      group.add(ribbonB);

      // 4-loop bow on top
      const bowGroup = new THREE.Group();
      bowGroup.position.y = h + lidH * 0.2;
      for (let i = 0; i < 4; i++) {
        const loop = new THREE.Mesh(
          new THREE.TorusGeometry(0.085, 0.022, 10, 22),
          ribbonMat
        );
        loop.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
        loop.rotation.x = Math.PI / 3;
        loop.position.set(
          Math.cos((i * Math.PI) / 2) * 0.06,
          0.03,
          Math.sin((i * Math.PI) / 2) * 0.06
        );
        bowGroup.add(loop);
      }
      group.add(bowGroup);

      // Raycast proxy on layer 1
      const hitProxy = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.15, h + 0.25, dSize + 0.15),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.position.y = h / 2;
      hitProxy.layers.set(1);
      hitProxy.userData.action = 'inspectGift';
      hitProxy.userData.blessingIndex = blessingIndex;
      hitProxy.userData.targetGroup = group;
      group.add(hitProxy);

      scene.add(group);
      return group;
    };

    const giftBoxes = [
      createGiftBox(-1.95, 1.05, 0.35, 0.72, 0.56, 0.72, 0xff80be, goldMat, 0),
      createGiftBox(-1.25, 1.55, -0.28, 0.56, 0.44, 0.56, 0xd4a4ff, magentaGlazeMat, 1),
      createGiftBox(1.88, 1.15, -0.42, 0.68, 0.62, 0.64, 0x82e5f5, magentaGlazeMat, 2),
    ];

    // ===============================================================
    // COMPOSITE PROPS 3: FLOATING METALLIC & PASTEL BALLOONS (7 × 4-part Groups)
    // ===============================================================
    const balloonProfile = [
      new THREE.Vector2(0.0, -0.42),
      new THREE.Vector2(0.05, -0.38),
      new THREE.Vector2(0.18, -0.22),
      new THREE.Vector2(0.32, 0.05),
      new THREE.Vector2(0.31, 0.26),
      new THREE.Vector2(0.2, 0.42),
      new THREE.Vector2(0.0, 0.48),
    ];
    const balloonShellGeo = new THREE.LatheGeometry(balloonProfile, 28);
    const knotGeo = new THREE.TorusGeometry(0.032, 0.014, 8, 16);
    const stringCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.43, 0),
      new THREE.Vector3(0.04, -0.85, 0.02),
      new THREE.Vector3(-0.04, -1.3, -0.02),
      new THREE.Vector3(0.02, -1.75, 0.01),
    ]);
    const stringGeo = new THREE.TubeGeometry(stringCurve, 24, 0.007, 6, false);
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.75,
    });

    const balloonConfigs = [
      { x: -2.55, y: 2.85, z: -1.25, color: 0xff5da8, metallic: 0.18, rough: 0.2 },
      { x: -2.05, y: 3.45, z: -1.55, color: 0xf2c95c, metallic: 0.85, rough: 0.18 },
      { x: -1.45, y: 3.1, z: -1.85, color: 0xc992ff, metallic: 0.22, rough: 0.22 },
      { x: 1.75, y: 3.25, z: -1.65, color: 0x6ee3f5, metallic: 0.35, rough: 0.2 },
      { x: 2.35, y: 2.9, z: -1.2, color: 0xff94c8, metallic: 0.15, rough: 0.24 },
      { x: 2.65, y: 3.6, z: -1.75, color: 0xffe27a, metallic: 0.55, rough: 0.2 },
      { x: 0.05, y: 3.85, z: -2.2, color: 0xf02488, metallic: 0.35, rough: 0.2 },
    ];

    const balloons: Array<{ group: THREE.Group; baseY: number; phase: number }> = [];
    balloonConfigs.forEach((cfg, idx) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(cfg.x, cfg.y, cfg.z);

      const shellMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        metalness: cfg.metallic,
        roughness: cfg.rough,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
      });

      const shell = new THREE.Mesh(balloonShellGeo, shellMat);
      shell.castShadow = true;
      bGroup.add(shell);

      const knot = new THREE.Mesh(knotGeo, shellMat);
      knot.rotation.x = Math.PI / 2;
      knot.position.y = -0.43;
      bGroup.add(knot);

      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.025, 12),
        goldMat
      );
      collar.position.y = -0.45;
      bGroup.add(collar);

      const ribbon = new THREE.Mesh(stringGeo, stringMat);
      bGroup.add(ribbon);

      scene.add(bGroup);
      balloons.push({ group: bGroup, baseY: cfg.y, phase: idx * 0.9 });
    });

    // ===============================================================
    // INSTANCED METALLIC PARTY CONFETTI (96 Instances)
    // ===============================================================
    const confettiCount = 96;
    const confettiGeo = new THREE.BoxGeometry(0.08, 0.01, 0.05);
    const confettiMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.65,
    });
    const confettiInstanced = new THREE.InstancedMesh(confettiGeo, confettiMat, confettiCount);
    confettiInstanced.frustumCulled = false;

    const confettiColors = [0xff2e93, 0xf2c95c, 0x69e2f5, 0xc78bff, 0xffe066];
    const confettiState = Array.from({ length: confettiCount }, (_, i) => {
      _scratchColor.setHex(confettiColors[i % confettiColors.length]);
      confettiInstanced.setColorAt(i, _scratchColor);
      return {
        x: (Math.random() - 0.5) * 8.5,
        y: 0.4 + Math.random() * 4.5,
        z: (Math.random() - 0.5) * 6.5,
        vy: -0.22 - Math.random() * 0.35,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        vrx: (Math.random() - 0.5) * 2.5,
        vry: (Math.random() - 0.5) * 2.5,
      };
    });
    if (confettiInstanced.instanceColor) {
      confettiInstanced.instanceColor.needsUpdate = true;
    }
    confettiInstanced.computeBoundingSphere();
    scene.add(confettiInstanced);

    burstTriggerRef.current = () => {
      confettiState.forEach((c) => {
        c.x = (Math.random() - 0.5) * 3.5;
        c.y = 2.1 + Math.random() * 1.4;
        c.z = (Math.random() - 0.5) * 3.5;
        c.vy = 1.2 + Math.random() * 1.8;
      });
    };

    // Camera transition state
    let transitionActive = false;
    const targetCamPos = new THREE.Vector3().copy(CAMERA_PRESETS[0].pos);
    const targetLookAt = new THREE.Vector3().copy(CAMERA_PRESETS[0].target);

    presetTriggerRef.current = (id: CameraPresetId) => {
      const preset = CAMERA_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      targetCamPos.copy(preset.pos);
      targetLookAt.copy(preset.target);
      transitionActive = true;
    };

    controls.addEventListener('start', () => {
      transitionActive = false;
    });

    // Raycasting on layer 1 for clicks on cake candles & gift boxes
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return; // Dragged orbit, not a click

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length === 0) return;

      const hitObj = hits[0].object;
      if (hitObj.userData.action === 'toggleCandles') {
        const nextLit = !candlesLitRef.current;
        callbacksRef.current.onToggleCandles(nextLit);
        if (!nextLit) {
          burstTriggerRef.current?.();
        }
      } else if (hitObj.userData.action === 'inspectGift') {
        const idx = Number(hitObj.userData.blessingIndex || 0);
        const giftGroup = hitObj.userData.targetGroup as THREE.Group | undefined;
        if (giftGroup) {
          giftGroup.position.y = 0.22;
        }
        birthdayAudio.playSparkleBurst();
        burstTriggerRef.current?.();
        callbacksRef.current.onGiftInspect(GIFT_BLESSINGS[idx % GIFT_BLESSINGS.length]);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 70) return;
      lastHoverCheck = now;
      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Main animation loop with software-WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    let blowSmokeTimer = 0;
    let prevLit = candlesLitRef.current;
    const clock = new THREE.Clock();

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!disposed) {
          redrawSimranPlaque();
          plaqueTex.needsUpdate = true;
        }
      });
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      // Detect candle blowout edge for smoke animation
      const litNow = candlesLitRef.current;
      if (prevLit && !litNow) {
        blowSmokeTimer = 2.4;
      }
      prevLit = litNow;

      // 1. Damped camera preset glide
      if (transitionActive) {
        const alpha = 1 - Math.exp(-5.5 * dt);
        camera.position.lerp(targetCamPos, alpha);
        controls.target.lerp(targetLookAt, alpha);
        if (
          camera.position.distanceTo(targetCamPos) < 0.03 &&
          controls.target.distanceTo(targetLookAt) < 0.03
        ) {
          transitionActive = false;
        }
      }
      controls.update();

      // 2. Candle flames & light damping
      const targetLightIntensity = litNow ? 2.3 + Math.sin(elapsed * 9) * 0.22 : 0;
      candlePointLight.intensity = THREE.MathUtils.damp(
        candlePointLight.intensity,
        targetLightIntensity,
        10,
        dt
      );

      flameMeshes.forEach((flame) => {
        const phase = Number(flame.userData.phase || 0);
        const targetScale = litNow ? 1 : 0.001;
        const nextScale = THREE.MathUtils.damp(flame.scale.y, targetScale, 12, dt);
        const wobble = litNow ? 1 + Math.sin(elapsed * 11 + phase) * 0.12 : 1;
        flame.scale.set(nextScale, nextScale * wobble, nextScale);
        flame.rotation.z = litNow ? Math.sin(elapsed * 8 + phase) * 0.14 : 0;
        flame.visible = nextScale > 0.03;
      });

      // Smoke puffs rising after blowout
      if (blowSmokeTimer > 0) {
        blowSmokeTimer = Math.max(0, blowSmokeTimer - dt);
        const progress = 1 - blowSmokeTimer / 2.4;
        smokeMeshes.forEach((s) => {
          s.mesh.position.set(
            s.basePos.x + Math.sin(elapsed * 3 + s.phase) * 0.06,
            s.basePos.y + progress * 0.65,
            s.basePos.z
          );
          const scale = 0.6 + progress * 1.6;
          s.mesh.scale.setScalar(scale);
          (s.mesh.material as THREE.MeshStandardMaterial).opacity =
            Math.sin(progress * Math.PI) * 0.45;
        });
      } else {
        smokeMeshes.forEach((s) => {
          (s.mesh.material as THREE.MeshStandardMaterial).opacity = 0;
        });
      }

      // 3. Gift box bounce settle
      giftBoxes.forEach((g) => {
        g.position.y = THREE.MathUtils.damp(g.position.y, 0, 8, dt);
      });

      // 4. Floating helium balloons gentle bob & sway
      balloons.forEach((b) => {
        b.group.position.y = b.baseY + Math.sin(elapsed * 1.15 + b.phase) * 0.16;
        b.group.rotation.z = Math.sin(elapsed * 0.8 + b.phase) * 0.06;
        b.group.rotation.x = Math.cos(elapsed * 0.65 + b.phase) * 0.04;
      });

      // 5. Instanced confetti drift & burst fall
      for (let i = 0; i < confettiCount; i++) {
        const c = confettiState[i];
        c.vy = THREE.MathUtils.damp(c.vy, -0.32, 1.5, dt);
        c.y += c.vy * dt;
        c.x += Math.sin(elapsed * 1.4 + i) * 0.15 * dt;
        c.rx += c.vrx * dt;
        c.ry += c.vry * dt;
        if (c.y < 0.05) {
          c.y = 4.6 + Math.random() * 0.8;
          c.x = (Math.random() - 0.5) * 8.5;
          c.z = (Math.random() - 0.5) * 6.5;
        }
        _dummy.position.set(c.x, c.y, c.z);
        _dummy.rotation.set(c.rx, c.ry, 0);
        _dummy.scale.setScalar(1);
        _dummy.updateMatrix();
        confettiInstanced.setMatrixAt(i, _dummy.matrix);
      }
      confettiInstanced.instanceMatrix.needsUpdate = true;

      // Subtle cake rotation
      cakeGroup.rotation.y = Math.sin(elapsed * 0.25) * 0.08;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      envTarget.dispose();
      floorTex.map.dispose();
      floorTex.roughnessMap.dispose();
      contactTex.dispose();
      plaqueTex.dispose();
      barbieFaceTex.dispose();
      candleStripeTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <section
      id="party-stage"
      className="relative w-full h-[74vh] min-h-[470px] max-h-[660px] overflow-hidden bg-[#FFF5F7]"
    >
      {/* Dedicated WebGL Mount Container (isolated from React HUD state) */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Interactive 3D Birthday Celebration Stage for Simran"
      />

      {webglUnavailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FFF5F7] p-6 text-center">
          <div className="max-w-md bg-white border border-[#E7D8DF] rounded-2xl p-8 shadow-sm">
            <h2 className="font-serif-display text-2xl font-bold text-[#2D242C] mb-2">
              Happy Birthday, Simran!
            </h2>
            <p className="text-sm text-[#5A4A58]">
              Interactive 3D preview is paused on this browser, yet all party memories, wishes, and celebrations below are ready.
            </p>
          </div>
        </div>
      )}

      {/* Transparent Top-Left Hero Typography Overlay so the 3D cake stays 100% visible */}
      <div className="pointer-events-none absolute top-4 left-4 sm:top-7 sm:left-8 z-10 max-w-sm">
        <div className="pointer-events-auto bg-transparent border-transparent shadow-none px-1 py-1">
          <p className="text-xs font-semibold tracking-wider text-[#C25975] mb-1 drop-shadow-[0_1px_4px_rgba(255,253,249,0.95)]">
            19th November Celebration &middot; Khushi Mama
          </p>
          <h1 className="font-fancy text-2xl sm:text-4xl font-bold text-[#2D242C] leading-tight text-balance drop-shadow-[0_1px_6px_rgba(255,253,249,0.95)]">
            Happy Birthday, <span className="font-script text-4xl sm:text-5xl gold-foil inline-block align-baseline">Simran</span>
          </h1>
          <p className="font-editorial italic text-base sm:text-lg text-[#4A3B48] mt-1 drop-shadow-[0_1px_4px_rgba(255,253,249,0.95)]">
            Our dearest Khushi &mdash; tap the 3D candles or gift boxes!
          </p>
          <div className="mt-2.5 pt-2.5 border-t border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#4A3B48] tabular-nums font-medium drop-shadow-[0_1px_4px_rgba(255,253,249,0.95)]">
              {isBirthdayToday ? (
                <span className="font-semibold text-[#C25975]">It is 19th November — Party Time!</span>
              ) : (
                <span>Countdown: <strong className="text-[#2D242C]">{countdownLabel}</strong></span>
              )}
            </div>
            <button
              type="button"
              onClick={onScrollToMemories}
              className="text-xs font-semibold text-[#C25975] hover:text-[#2D242C] transition-colors cursor-pointer whitespace-nowrap drop-shadow-[0_1px_4px_rgba(255,253,249,0.95)]"
            >
              Memories &amp; Wishes &darr;
            </button>
          </div>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (anchored to 3D stage so page scrolling stays unobstructed) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-fit max-w-[94vw] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          className="pointer-events-auto mb-1.5 px-3.5 py-1 rounded-t-xl rounded-b-md bg-[#FFFDF9]/95 border border-[#E9D7DD] text-[11px] font-semibold text-[#5A4A58] hover:text-[#2D242C] shadow-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          {dockCollapsed ? '▴ Show 3D Controls' : '▾ Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto rounded-2xl bg-[#FFFDF9]/95 border border-[#E9D7DD] px-3 py-2 sm:px-4 sm:py-2.5 shadow-lg flex flex-wrap items-center justify-center gap-2">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 bg-[#F6ECEF] p-1 rounded-xl">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activePreset === preset.id
                      ? 'bg-white text-[#2D242C] shadow-xs'
                      : 'text-[#5A4A58] hover:text-[#2D242C]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block w-px h-6 bg-[#E9D7DD]" aria-hidden="true" />

            {/* Interactive Candle & Celebration Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !candlesLit;
                  onToggleCandles(next);
                  if (!next) {
                    burstTriggerRef.current?.();
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#2D242C] text-[#FFFDF9] text-xs font-semibold hover:bg-[#493B47] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {candlesLit ? '🕯️ Blow Out Candles' : '✨ Relight Candles'}
              </button>

              <button
                type="button"
                onClick={() => {
                  burstTriggerRef.current?.();
                  onCelebrate();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#C25975] text-white text-xs font-semibold hover:bg-[#A9445F] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                🎆 Fireworks
              </button>

              <button
                type="button"
                onClick={onToggleMusic}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isMusicPlaying
                    ? 'bg-[#FFF0F4] border-[#C25975] text-[#C25975]'
                    : 'bg-white border-[#E9D7DD] text-[#5A4A58] hover:text-[#2D242C]'
                }`}
              >
                {isMusicPlaying ? '🎵 Pause Song' : '🎵 Play Birthday Song'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
