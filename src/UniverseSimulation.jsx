import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// EVREN SİMÜLASYONU — Mobil Uyumlu Capacitor Versiyonu
// ============================================================

const EPOCHS = [
  { logT: -43, name: "Planck Dönemi", color: "#ffffff", desc: "Bilinen fiziğin sınırı." },
  { logT: -36, name: "İnflasyon Başlangıcı", color: "#ff6b35", desc: "İnflaton alanı evreni ~10⁶⁰ kat genişletiyor." },
  { logT: -32, name: "İnflasyon Sonu", color: "#ffa500", desc: "İnflaton enerjisi parçacıklara dönüşüyor." },
  { logT: -12, name: "Elektrozayıf Geçişi", color: "#ffdd57", desc: "Higgs alanı kırılıyor." },
  { logT: -6, name: "QCD Geçişi", color: "#ffe066", desc: "Kuarklar hadronlara hapsolma." },
  { logT: 2, name: "Nükleosantez", color: "#88cc44", desc: "Hafif elementler: %75 H, %25 He." },
  { logT: 10, name: "Madde-Radyasyon Eşitliği", color: "#44aacc", desc: "~47.000 yıl." },
  { logT: 12.8, name: "Rekombinasyon", color: "#ff8844", desc: "~380.000 yıl. CMB yayılıyor." },
  { logT: 13.5, name: "Karanlık Çağlar", color: "#334455", desc: "Evren karanlık ve nötr." },
  { logT: 15.5, name: "İlk Yıldızlar", color: "#aaddff", desc: "Pop III yıldızları." },
  { logT: 16.2, name: "Galaksi Oluşumu", color: "#7788ff", desc: "Kozmik ağ boyunca galaksiler." },
  { logT: 17.1, name: "Karanlık Enerji", color: "#aa55ff", desc: "Λ hakim, genişleme hızlanıyor." },
  { logT: 17.64, name: "Bugün", color: "#ffffff", desc: "13.8 milyar yıl." },
];

function logTToHumanTime(logT) {
  const s = Math.pow(10, logT);
  if (logT < 0) return `${s.toExponential(1)} s`;
  if (logT < 2) return `${s.toFixed(1)} s`;
  if (logT < 7) return `${(s / 3600).toFixed(1)} saat`;
  const y = s / (86400 * 365.25);
  if (y < 1e3) return `${y.toFixed(1)} yıl`;
  if (y < 1e6) return `${(y / 1e3).toFixed(0)} bin yıl`;
  if (y < 1e9) return `${(y / 1e6).toFixed(1)} My`;
  return `${(y / 1e9).toFixed(2)} Gy`;
}

function getTemperature(logT) {
  if (logT >= 17.64) return 2.725;
  if (logT < 12) return Math.min(1e32, 1.5e10 / Math.sqrt(Math.max(Math.pow(10, logT), 1e-43)));
  const z = Math.pow(10, (17.64 - logT) * 0.6);
  return 2.725 * (1 + z);
}

function formatTemp(T) {
  if (T > 1e6) return `~${T.toExponential(0)} K`;
  if (T > 1000) return `~${Math.round(T).toLocaleString()} K`;
  return `${T.toFixed(1)} K`;
}

function getScaleFactor(logT) {
  if (logT >= 17.64) return 1.0;
  if (logT < -36) return 1e-60;
  if (logT < -32) return 1e-60 * Math.pow(1e26, (logT + 36) / 4);
  const ratio = Math.pow(10, logT) / Math.pow(10, 17.64);
  return logT < 12 ? Math.pow(ratio, 0.5) * 1e-26 : Math.pow(ratio, 0.667);
}

// ============================================================
export default function UniverseSimulation() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef(null);
  const timeRef = useRef(-43);
  const touchRef = useRef({ startX: 0, startTime: 0 });

  const [playing, setPlaying] = useState(false);
  const [logTime, setLogTime] = useState(-43);
  const [speed, setSpeed] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [params, setParams] = useState({
    omegaMatter: 0.31, omegaDarkMatter: 0.26, omegaDarkEnergy: 0.69,
    omegaRadiation: 0.00009, hubbleH0: 67.4, blackHoleSeed: 0.5,
    inflatonStrength: 1.0, neutrinoMass: 0.06,
  });

  const updateParam = useCallback((k, v) => setParams(p => ({ ...p, [k]: v })), []);

  const currentEpoch = useMemo(() => {
    let ep = EPOCHS[0];
    for (const e of EPOCHS) { if (logTime >= e.logT) ep = e; }
    return ep;
  }, [logTime]);

  // Mobil algılama
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Parçacık sistemi
  const initParticles = useCallback((w, h) => {
    const cx = w / 2, cy = h / 2, particles = [];
    const scale = Math.min(w, h) / 800; // Mobil ölçekleme
    const N_DM = Math.floor(400 * scale + 200);
    const N_BM = Math.floor(200 * scale + 100);
    const N_RAD = Math.floor(100 * scale + 50);

    const numNodes = 8 + Math.floor(Math.random() * 4);
    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
      nodes.push({ x: cx + (Math.random() - 0.5) * w * 0.7, y: cy + (Math.random() - 0.5) * h * 0.7, mass: 2 + Math.random() * 5 });
    }

    for (let i = 0; i < N_DM; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * Math.min(w, h) * 0.42;
      const sorted = [...nodes].sort((a2, b) => Math.hypot(a2.x - (cx + Math.cos(a) * r), a2.y - (cy + Math.sin(a) * r)) - Math.hypot(b.x - (cx + Math.cos(a) * r), b.y - (cy + Math.sin(a) * r)));
      const t = Math.random();
      particles.push({
        type: "dm", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        targetX: sorted[0].x * (1 - t) + sorted[1].x * t + (Math.random() - 0.5) * 30,
        targetY: sorted[0].y * (1 - t) + sorted[1].y * t + (Math.random() - 0.5) * 30,
        mass: 0.5 + Math.random() * 1.5, size: 1.5 + Math.random(),
      });
    }

    for (let i = 0; i < N_BM; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * Math.min(w, h) * 0.40;
      particles.push({
        type: "bm", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        targetX: 0, targetY: 0, mass: 0.3 + Math.random(), size: 1.2 + Math.random() * 0.8,
        isStar: false, isGalaxy: false,
      });
    }

    for (let i = 0; i < N_RAD; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * Math.min(w, h) * 0.45;
      particles.push({
        type: "rad", x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
        mass: 0, size: 0.8, wavelength: 380 + Math.random() * 400,
      });
    }

    const numBH = Math.floor(3 + params.blackHoleSeed * 8);
    for (let i = 0; i < numBH; i++) {
      const ni = nodes[i % nodes.length];
      particles.push({
        type: "bh", x: ni.x + (Math.random() - 0.5) * 20, y: ni.y + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0, mass: 5 + Math.random() * 10, size: 3, accretionRate: 0,
      });
    }

    return { particles, nodes };
  }, [params.blackHoleSeed]);

  // Fizik motoru
  const updatePhysics = useCallback((dt, logT, pData, w, h) => {
    if (!pData) return;
    const { particles, nodes } = pData;
    const cx = w / 2, cy = h / 2;
    const isInflation = logT >= -36 && logT < -32;
    const isPostRecomb = logT >= 12.8;
    const isStructure = logT >= 10 && logT < 16.5;
    const isGalaxy = logT >= 15.5;
    const isDE = logT >= 17.1;
    const H = params.hubbleH0 / 67.4;
    const expRate = isInflation ? 0.08 * params.inflatonStrength : isDE ? 0.003 * params.omegaDarkEnergy / 0.69 * H : isPostRecomb ? 0.001 * H : 0.0005 * H;
    const grav = isStructure ? 0.15 * (params.omegaDarkMatter / 0.26) : isGalaxy ? 0.25 * (params.omegaDarkMatter / 0.26) : 0.02;
    const filProg = isPostRecomb ? Math.min(1, (logT - 12.8) / (16.5 - 12.8)) : 0;
    const deRep = isDE ? 0.002 * params.omegaDarkEnergy / 0.69 : 0;

    for (const p of particles) {
      if (p.type === "dm") {
        if (logT < -36) { p.x += (Math.random() - 0.5) * 2; p.y += (Math.random() - 0.5) * 2; }
        else if (isInflation) {
          p.x += (p.x - cx) * expRate * dt; p.y += (p.y - cy) * expRate * dt;
          if (p.x < 0) p.x += w; if (p.x > w) p.x -= w; if (p.y < 0) p.y += h; if (p.y > h) p.y -= h;
        } else if (isStructure || isGalaxy) {
          const dx = p.targetX - p.x, dy = p.targetY - p.y, d = Math.hypot(dx, dy) + 1;
          p.vx += (dx / d) * grav * filProg * p.mass * dt * 0.1;
          p.vy += (dy / d) * grav * filProg * p.mass * dt * 0.1;
          if (isDE) { const dc = Math.hypot(p.x - cx, p.y - cy) + 1; p.vx += ((p.x - cx) / dc) * deRep * dt; p.vy += ((p.y - cy) / dc) * deRep * dt; }
          p.vx *= 0.995; p.vy *= 0.995; p.x += p.vx * dt; p.y += p.vy * dt;
        } else { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; }
      }

      if (p.type === "bm") {
        if (logT < 12.8) {
          p.vx += (Math.random() - 0.5) * 0.5; p.vy += (Math.random() - 0.5) * 0.5;
          p.vx *= 0.98; p.vy *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt;
          p.isStar = false; p.isGalaxy = false;
        } else if (isStructure || isGalaxy) {
          let near = null, minD = Infinity;
          for (const q of particles) { if (q.type !== "dm") continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < minD && d < 120) { minD = d; near = q; } }
          if (near) { const dx = near.x - p.x, dy = near.y - p.y, d2 = Math.max(minD, 3); p.vx += (dx / d2) * grav * 1.5 * near.mass / (d2 * 0.5) * dt * 0.15; p.vy += (dy / d2) * grav * 1.5 * near.mass / (d2 * 0.5) * dt * 0.15; }
          for (const bh of particles) { if (bh.type !== "bh") continue; const dx = bh.x - p.x, dy = bh.y - p.y, d3 = Math.hypot(dx, dy); if (d3 < 80 && d3 > 2) { const f = bh.mass * 0.02 / (d3 * 0.3); p.vx += (dx / d3) * f * dt; p.vy += (dy / d3) * f * dt; } }
          if (isDE) { const dc = Math.hypot(p.x - cx, p.y - cy) + 1; p.vx += ((p.x - cx) / dc) * deRep * 0.5 * dt; p.vy += ((p.y - cy) / dc) * deRep * 0.5 * dt; }
          p.vx *= 0.992; p.vy *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt;
          if (isGalaxy && minD < 25) { p.isStar = true; if (minD < 12) p.isGalaxy = true; }
        }
      }

      if (p.type === "rad") {
        if (logT < 12.8) { if (Math.random() < 0.1) { const a = Math.random() * Math.PI * 2; p.vx = Math.cos(a) * (2 + Math.random() * 2); p.vy = Math.sin(a) * (2 + Math.random() * 2); } p.x += p.vx * dt; p.y += p.vy * dt; }
        else { p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5; p.wavelength = Math.min(780, p.wavelength + 0.005 * dt); }
      }

      if (p.type === "bh" && isGalaxy) {
        let nn = nodes[0], md = Infinity; for (const n of nodes) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < md) { md = d; nn = n; } }
        p.vx += ((nn.x - p.x) / Math.max(md, 2)) * 0.02 * dt; p.vy += ((nn.y - p.y) / Math.max(md, 2)) * 0.02 * dt;
        p.vx *= 0.98; p.vy *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt;
        p.mass = Math.min(30, p.mass + 0.001 * dt); p.size = 3 + (p.mass - 5) * 0.2;
        let nc = 0; for (const q of particles) { if (q.type === "bm" && Math.hypot(q.x - p.x, q.y - p.y) < 20) nc++; } p.accretionRate = nc;
      }

      if (p.x < -20) p.x += w + 40; if (p.x > w + 20) p.x -= w + 40;
      if (p.y < -20) p.y += h + 40; if (p.y > h + 20) p.y -= h + 40;
    }
  }, [params]);

  // Render
  const drawFrame = useCallback((ctx, logT, pData, w, h) => {
    if (!pData) return;
    const { particles } = pData;
    const isPreRecomb = logT < 12.8, isInflation = logT >= -36 && logT < -32;
    const isDark = logT >= 12.8 && logT < 15.5, isGalaxy = logT >= 15.5;

    // Arka plan
    if (logT < -36) {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
      g.addColorStop(0, `rgba(255,255,255,${0.2 + Math.random() * 0.1})`); g.addColorStop(0.5, "rgba(180,120,255,0.06)"); g.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (isInflation) {
      const p = (logT + 36) / 4, I = 0.3 + p * 0.4;
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * (0.2 + p * 0.4));
      g.addColorStop(0, `rgba(255,200,100,${I})`); g.addColorStop(0.6, `rgba(255,120,50,${I * 0.4})`); g.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (isPreRecomb) {
      const T = getTemperature(logT), gl = Math.min(0.25, T / 1e10 * 0.15);
      ctx.fillStyle = `rgba(${Math.min(40, 10 + gl * 200)},${Math.min(20, 5 + gl * 100)},${Math.min(15, 2 + gl * 60)},1)`;
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
      g.addColorStop(0, `rgba(255,180,80,${gl})`); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (isDark) {
      ctx.fillStyle = "#020208"; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#030310"; ctx.fillRect(0, 0, w, h);
      if (isGalaxy) { for (let i = 0; i < 60; i++) { const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * w, sy = (Math.cos(i * 311.7) * 0.5 + 0.5) * h; ctx.fillStyle = `rgba(100,90,130,0.35)`; ctx.beginPath(); ctx.arc(sx, sy, 0.5, 0, Math.PI * 2); ctx.fill(); } }
    }

    // Kozmik ağ filamentleri
    if (logT >= 13) {
      const fa = Math.min(0.3, (logT - 13) / 8 * 0.3) * (params.omegaDarkMatter / 0.26);
      const dm = particles.filter(p => p.type === "dm");
      ctx.lineWidth = 0.7;
      for (let i = 0; i < dm.length; i += 2) { // Mobilde her ikincisini çiz (performans)
        for (let j = i + 1; j < dm.length; j += 2) {
          const d = Math.hypot(dm[i].x - dm[j].x, dm[i].y - dm[j].y);
          if (d < 40) { ctx.strokeStyle = `rgba(80,60,200,${(1 - d / 40) * fa})`; ctx.beginPath(); ctx.moveTo(dm[i].x, dm[i].y); ctx.lineTo(dm[j].x, dm[j].y); ctx.stroke(); }
        }
      }
    }

    // Parçacıklar
    for (const p of particles) {
      if (p.type === "dm") {
        if (logT >= -32) {
          const a = Math.min(0.35, 0.05 + (logT + 32) / 60 * 0.3) * (params.omegaDarkMatter / 0.26);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
          g.addColorStop(0, `rgba(90,60,200,${a * 0.7})`); g.addColorStop(1, "rgba(40,20,120,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(120,90,255,${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (p.type === "bm") {
        if (isPreRecomb) {
          const T = getTemperature(logT), r = Math.min(255, 150 + T / 1e8 * 100), g = Math.min(200, 80 + T / 1e9 * 80);
          ctx.fillStyle = `rgba(${r},${g},60,0.5)`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        } else if (p.isGalaxy && isGalaxy) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
          g.addColorStop(0, "rgba(255,240,200,0.85)"); g.addColorStop(0.3, "rgba(200,180,255,0.4)"); g.addColorStop(1, "rgba(50,30,100,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "rgba(180,160,255,0.15)"; ctx.lineWidth = 0.5;
          for (let arm = 0; arm < 2; arm++) { ctx.beginPath(); for (let a = 0; a < 3.5; a += 0.15) { ctx.lineTo(p.x + Math.cos(a * 1.5 + arm * Math.PI + logT * 0.02) * (2 + a * 1.8), p.y + Math.sin(a * 1.5 + arm * Math.PI + logT * 0.02) * (2 + a * 1.8)); } ctx.stroke(); }
        } else if (p.isStar && isGalaxy) {
          ctx.fillStyle = `rgba(255,250,230,${0.5 + Math.sin(p.x * 7 + logT * 3) * 0.2})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(200,180,150,${isDark ? 0.12 : 0.35})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (p.type === "rad" && isPreRecomb) {
        ctx.fillStyle = `rgba(${p.wavelength < 500 ? 100 : 255},${p.wavelength < 500 ? 150 : 180},${p.wavelength < 500 ? 255 : 50},0.4)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2); ctx.fill();
      }
      if (p.type === "bh" && logT >= 15) {
        const sz = p.size * (isGalaxy ? 1.4 : 0.7);
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI * 2); ctx.fill();
        if (p.accretionRate > 0 && isGalaxy) {
          const da = Math.min(0.5, p.accretionRate * 0.05);
          const g = ctx.createRadialGradient(p.x, p.y, sz, p.x, p.y, sz * 3.5);
          g.addColorStop(0, `rgba(255,140,40,${da})`); g.addColorStop(0.5, `rgba(255,80,200,${da * 0.4})`); g.addColorStop(1, "rgba(100,20,200,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 3.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = "rgba(255,200,100,0.25)"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 1.5, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // CMB flash
    if (Math.abs(logT - 12.8) < 0.5) {
      const a = Math.max(0, 0.35 - Math.abs(logT - 12.8) * 0.7);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
      g.addColorStop(0, `rgba(255,200,150,${a})`); g.addColorStop(1, "rgba(255,100,50,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }

    // HUD
    const T = getTemperature(logT), sc = getScaleFactor(logT);
    const hudW = isMobile ? 180 : 240, hudH = isMobile ? 90 : 105;
    const fs1 = isMobile ? 11 : 13, fs2 = isMobile ? 9 : 11;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(8, 8, hudW, hudH, 6); ctx.fill();
    ctx.font = `bold ${fs1}px monospace`; ctx.fillStyle = currentEpoch.color; ctx.fillText(currentEpoch.name, 16, 26);
    ctx.font = `${fs2}px monospace`; ctx.fillStyle = "#aab";
    ctx.fillText(`t: ${logTToHumanTime(logT)}  (log₁₀=${logT.toFixed(1)})`, 16, 42);
    ctx.fillText(`T: ${formatTemp(T)}`, 16, 56);
    ctx.fillText(`a: ${sc < 0.001 ? sc.toExponential(1) : sc.toFixed(4)}`, 16, 70);
    if (!isMobile) ctx.fillText(`z ≈ ${sc > 0.0001 ? (1 / sc - 1).toFixed(0) : ">10⁴"}`, 16, 84);

    // Alt açıklama
    const descW = Math.min(w - 16, 380);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.roundRect(w / 2 - descW / 2, h - 40, descW, 28, 5); ctx.fill();
    ctx.font = `${isMobile ? 9 : 11}px monospace`; ctx.fillStyle = "#bbc"; ctx.textAlign = "center";
    ctx.fillText(currentEpoch.desc, w / 2, h - 22); ctx.textAlign = "left";
  }, [isMobile, params, currentEpoch]);

  // Animasyon döngüsü
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const c = canvas.parentElement, dpr = window.devicePixelRatio || 1;
      canvas.width = c.clientWidth * dpr; canvas.height = c.clientHeight * dpr;
      canvas.style.width = c.clientWidth + "px"; canvas.style.height = c.clientHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!particlesRef.current) particlesRef.current = initParticles(c.clientWidth, c.clientHeight);
    };
    resize(); window.addEventListener("resize", resize);
    let last = performance.now();
    const loop = (now) => {
      const dtMs = Math.min(now - last, 50); last = now;
      const c = canvas.parentElement; if (!c) { animRef.current = requestAnimationFrame(loop); return; }
      if (playing) { timeRef.current = Math.min(17.64, timeRef.current + speed * 0.03 * (dtMs / 16)); setLogTime(timeRef.current); }
      updatePhysics(dtMs / 16, timeRef.current, particlesRef.current, c.clientWidth, c.clientHeight);
      drawFrame(ctx, timeRef.current, particlesRef.current, c.clientWidth, c.clientHeight);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [playing, speed, initParticles, updatePhysics, drawFrame]);

  const handleTimeChange = (v) => { const t = parseFloat(v); timeRef.current = t; setLogTime(t); };
  const handleReset = () => { timeRef.current = -43; setLogTime(-43); setPlaying(false); const c = canvasRef.current?.parentElement; if (c) particlesRef.current = initParticles(c.clientWidth, c.clientHeight); };

  // Swipe to open drawer (mobil)
  const onTouchStart = (e) => { touchRef.current = { startX: e.touches[0].clientX, startTime: Date.now() }; };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dt = Date.now() - touchRef.current.startTime;
    if (dt < 300 && dx > 60 && !drawerOpen) setDrawerOpen(true);
    if (dt < 300 && dx < -60 && drawerOpen) setDrawerOpen(false);
  };

  const Slider = ({ label, paramKey, min, max, step, unit }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#99a", marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color: "#dde", fontFamily: "monospace" }}>{params[paramKey].toFixed(step < 0.01 ? 4 : 2)}{unit || ""}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={params[paramKey]} onChange={e => updateParam(paramKey, parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#7b5ea7" }} />
    </div>
  );

  // ============= PANEL İÇERİĞİ =============
  const panelContent = (
    <div style={{ padding: "12px 14px", overflowY: "auto", height: "100%" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 15, letterSpacing: 2, background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 800, textAlign: "center" }}>
        EVREN SİMÜLASYONU
      </h2>
      <div style={{ fontSize: 9, textAlign: "center", color: "#556", marginBottom: 10 }}>Logaritmik Zaman · Kozmik Evrim</div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <button onClick={() => { setPlaying(!playing); if (isMobile) setDrawerOpen(false); }} style={btnS}>{playing ? "⏸ Duraklat" : "▶ Başlat"}</button>
        <button onClick={handleReset} style={btnS}>↺ Sıfırla</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#99a" }}><span>Hız</span><span style={{ color: "#dde" }}>×{speed.toFixed(1)}</span></div>
        <input type="range" min={0.1} max={5} step={0.1} value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#7b5ea7" }} />
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", borderBottom: "1px solid rgba(100,80,180,0.2)", paddingBottom: 3, marginBottom: 8, letterSpacing: 1 }}>PARAMETRELER</div>
      <Slider label="Ωm (Madde)" paramKey="omegaMatter" min={0.01} max={1} step={0.01} />
      <Slider label="Ωdm (Karanlık Madde)" paramKey="omegaDarkMatter" min={0} max={0.8} step={0.01} />
      <Slider label="ΩΛ (Karanlık Enerji)" paramKey="omegaDarkEnergy" min={0} max={1.5} step={0.01} />
      <Slider label="Ωr (Radyasyon)" paramKey="omegaRadiation" min={0} max={0.01} step={0.0001} />
      <Slider label="H₀" paramKey="hubbleH0" min={20} max={120} step={0.5} unit=" km/s/Mpc" />
      <Slider label="Kara Delik Tohumu" paramKey="blackHoleSeed" min={0} max={1} step={0.05} />
      <Slider label="İnflaton Gücü" paramKey="inflatonStrength" min={0.1} max={3} step={0.1} />
      <Slider label="ν Kütlesi" paramKey="neutrinoMass" min={0} max={2} step={0.01} unit=" eV" />

      <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", borderBottom: "1px solid rgba(100,80,180,0.2)", paddingBottom: 3, marginTop: 10, marginBottom: 8, letterSpacing: 1 }}>RENK KILAVUZU</div>
      {[
        ["rgba(120,90,255,0.8)", "Karanlık Madde"],
        ["rgba(255,240,200,0.9)", "Galaksi / Baryonik"],
        ["rgba(80,60,200,0.5)", "Kozmik Ağ"],
        ["#000", "Kara Delik"],
        ["rgba(255,200,100,0.6)", "Radyasyon"],
      ].map(([c, l]) => (
        <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, marginBottom: 3 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: c, border: c === "#000" ? "1px solid rgba(255,140,40,0.5)" : "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />
          <span style={{ color: "#99a" }}>{l}</span>
        </div>
      ))}
    </div>
  );

  // Hızlı dönem butonları
  const quickEpochs = EPOCHS.filter((_, i) => i % 2 === 0 || i === EPOCHS.length - 1);

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#0a0a14", fontFamily: "monospace", color: "#dde", overflow: "hidden", position: "relative" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* === MASAÜSTÜ: Sol Panel === */}
      {!isMobile && (
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 270, background: "rgba(8,8,20,0.95)", borderRight: "1px solid rgba(100,80,180,0.2)", zIndex: 10, overflowY: "auto" }}>
          {panelContent}
        </div>
      )}

      {/* === MOBİL: Drawer === */}
      {isMobile && (
        <>
          {/* Overlay */}
          {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 20 }} />}
          {/* Drawer panel */}
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 260,
            background: "rgba(8,8,20,0.97)", borderRight: "1px solid rgba(100,80,180,0.3)",
            zIndex: 30, transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease", overflowY: "auto",
          }}>
            {panelContent}
          </div>
        </>
      )}

      {/* === MOBİL: Hamburger Butonu === */}
      {isMobile && !drawerOpen && (
        <button onClick={() => setDrawerOpen(true)} style={{
          position: "absolute", top: 8, right: 8, zIndex: 15,
          width: 36, height: 36, borderRadius: 8,
          background: "rgba(100,80,180,0.25)", border: "1px solid rgba(100,80,180,0.4)",
          color: "#c8b5ff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>☰</button>
      )}

      {/* === CANVAS === */}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 270 }}>
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
      </div>

      {/* === ALT ZAMAN ÇİZELGESİ === */}
      <div style={{
        background: "rgba(8,8,20,0.95)", borderTop: "1px solid rgba(100,80,180,0.2)",
        padding: isMobile ? "6px 10px 10px" : "8px 16px 12px", marginLeft: isMobile ? 0 : 270,
      }}>
        <input type="range" min={-43} max={17.64} step={0.01} value={logTime} onChange={e => handleTimeChange(e.target.value)}
          style={{ width: "100%", accentColor: "#a78bfa" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: isMobile ? 8 : 10, color: "#556", marginTop: 2 }}>
          <span>10⁻⁴³ s</span>
          <span style={{ color: currentEpoch.color, fontWeight: 700, fontSize: isMobile ? 9 : 11 }}>{currentEpoch.name} — {logTToHumanTime(logTime)}</span>
          <span>13.8 Gy</span>
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
          {quickEpochs.map(e => (
            <button key={e.logT} onClick={() => handleTimeChange(e.logT)} style={{
              padding: "2px 6px", fontSize: isMobile ? 7 : 9, borderRadius: 3,
              border: `1px solid ${logTime >= e.logT && logTime < e.logT + 2 ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: logTime >= e.logT && logTime < e.logT + 2 ? "rgba(100,80,180,0.3)" : "rgba(255,255,255,0.04)",
              color: "#aab", cursor: "pointer", fontFamily: "monospace",
            }}>{e.name.length > 10 && isMobile ? e.name.split(" ")[0] : e.name}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnS = {
  flex: 1, padding: "6px 8px", fontSize: 11,
  background: "rgba(100,80,180,0.15)", color: "#c8b5ff",
  border: "1px solid rgba(100,80,180,0.3)", borderRadius: 6,
  cursor: "pointer", fontFamily: "monospace", fontWeight: 600,
};
