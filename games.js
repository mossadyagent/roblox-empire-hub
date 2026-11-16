/**
 * ============================================================================
 * ROBLOX EMPIRE HUB — 3-IN-1 PLAYABLE HTML5 CANVAS WEB ARCADE ENGINE
 * File: games.js
 * ============================================================================
 * Includes 3 full 60-FPS interactive HTML5 Canvas mini-games:
 *   1. Mega Brainrot Lava Obby (Web Edition) — 35 stages, lava, VIP Carpet, Nuke!
 *   2. AI Streamer Empire Clicker/Tycoon (Web Edition) — 6 Droppers, 3 Upgrader Gates, KOTH!
 *   3. Divine Aura RNG Simulator (Web Edition) — Roll animations, Pity, 10x Heavenly Potion, Cutscenes!
 */

(function () {
  "use strict";

  // -------------------------------------------------------------------------
  // Web Audio Synthesizer (Zero external audio file dependencies)
  // -------------------------------------------------------------------------
  let audioCtx = null;
  function playSfx(type) {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "jump") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "coin" || type === "cash") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === "nuke") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.46);
        osc.start(now);
        osc.stop(now + 0.46);
      } else if (type === "rare_aura") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        osc.frequency.setValueAtTime(880, now + 0.24);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      }
    } catch (_e) {
      // Ignore audio autoplay blocks
    }
  }

  // -------------------------------------------------------------------------
  // Shared Arcade State & Game Switcher
  // -------------------------------------------------------------------------
  const state = {
    activeGame: "obby", // 'obby' | 'tycoon' | 'rng'
    keys: {},
    particles: [],
    screenShake: 0,
    flashAlpha: 0,
    flashColor: "#ffffff",
    redeemedCodes: {},

    // Game 1: Mega Brainrot Lava Obby
    obby: {
      stage: 1,
      maxStages: 35,
      coins: 250,
      rebirths: 0,
      deaths: 0,
      vipCarpet: false,
      speedCoil: false,
      afkMode: false,
      player: { x: 70, y: 260, vx: 0, vy: 0, w: 26, h: 36, grounded: false, jumps: 0 },
      lavaWavePhase: 0,
      platforms: [],
      hazards: [],
      stageCoins: []
    },

    // Game 2: AI Streamer Empire Tycoon
    tycoon: {
      cash: 150,
      totalEarned: 150,
      rebirths: 0,
      kothActive: true,
      kothTimer: 0,
      droppersUnlocked: 1,
      upgradersUnlocked: 0,
      cubes: [],
      spawnTimer: 0,
      dropperDefs: [
        { name: "Basic PC Rig", cost: 0, value: 15, color: "#38bdf8" },
        { name: "RGB Streamer Setup", cost: 120, value: 45, color: "#a855f7" },
        { name: "AI GPU Rack x8", cost: 450, value: 140, color: "#22c55e" },
        { name: "Viral Shorts Bot", cost: 1600, value: 420, color: "#f59e0b" },
        { name: "Quantum Server", cost: 6000, value: 1500, color: "#ec4899" },
        { name: "Hologram AGI Studio", cost: 25000, value: 6500, color: "#00f5d4" }
      ],
      upgraderDefs: [
        { name: "Gate 2x AI Upscaler", cost: 250, mult: 2, x: 430, color: "#38bdf8" },
        { name: "Gate 3x Viral Algorithm", cost: 1800, mult: 3, x: 540, color: "#f59e0b" },
        { name: "Gate 5x Quantum Boost", cost: 9500, mult: 5, x: 650, color: "#ec4899" }
      ]
    },

    // Game 3: Divine Aura RNG Simulator
    rng: {
      gems: 500,
      totalRolls: 0,
      pityEpic: 0,
      pityLegendary: 0,
      autoRoll: false,
      quickRoll: false,
      shrine2x: true,
      heavenly10xRolls: 0,
      rolling: false,
      rollAnimTimer: 0,
      previewAura: null,
      equippedAura: {
        name: "Cyber Neon Pulse",
        odds: 25,
        tier: "Rare",
        color: "#00f5d4",
        secondary: "#38bdf8",
        rings: 2,
        orbs: 4
      },
      inventory: [],
      auraPool: [
        { name: "Breeze Whisper", odds: 2, tier: "Common", color: "#94a3b8", secondary: "#cbd5e1", rings: 1, orbs: 2 },
        { name: "Emerald Spark", odds: 8, tier: "Uncommon", color: "#4ade80", secondary: "#22c55e", rings: 1, orbs: 3 },
        { name: "Cyber Neon Pulse", odds: 25, tier: "Rare", color: "#00f5d4", secondary: "#38bdf8", rings: 2, orbs: 4 },
        { name: "Solar Flare Vortex", odds: 120, tier: "Epic", color: "#f59e0b", secondary: "#ef4444", rings: 2, orbs: 6 },
        { name: "Void Walker Matrix", odds: 850, tier: "Epic", color: "#a855f7", secondary: "#6366f1", rings: 3, orbs: 7 },
        { name: "Seraphim Golden Wings", odds: 5000, tier: "Legendary", color: "#fde047", secondary: "#f59e0b", rings: 3, orbs: 9 },
        { name: "Abyssal Demon Lord", odds: 45000, tier: "Mythic", color: "#f43f5e", secondary: "#881337", rings: 4, orbs: 11 },
        { name: "COSMIC OVERLORD", odds: 1000000, tier: "Celestial", color: "#38bdf8", secondary: "#f472b6", rings: 5, orbs: 14 },
        { name: "DIVINE BRAINROT: GENESIS", odds: 10000000, tier: "Celestial", color: "#00f5d4", secondary: "#fde047", rings: 6, orbs: 18 }
      ]
    }
  };

  // -------------------------------------------------------------------------
  // Build Obby Stage Geometry
  // -------------------------------------------------------------------------
  function buildObbyStage(stageNum) {
    const o = state.obby;
    o.platforms = [];
    o.hazards = [];
    o.stageCoins = [];

    // Start Checkpoint Pad
    o.platforms.push({ x: 30, y: 320, w: 105, h: 18, color: "#22c55e", type: "start" });

    // 5 procedural obstacle platforms depending on stage archetype
    const count = 5;
    const spanX = 610;
    const stepX = spanX / count;

    for (let i = 0; i < count; i++) {
      const px = 155 + i * stepX;
      const py = 295 - ((stageNum * 13 + i * 37) % 95);
      const pw = Math.max(54, 88 - (stageNum % 5) * 5);
      const archetype = (stageNum + i) % 4;
      let pColor = "#38bdf8";
      let pType = "normal";

      if (archetype === 1) {
        pColor = "#f59e0b";
        pType = "conveyor";
      } else if (archetype === 2) {
        pColor = "#a855f7";
        pType = "blink";
      } else if (archetype === 3) {
        pColor = "#ec4899";
        pType = "bounce";
      }

      o.platforms.push({ x: px, y: py, w: pw, h: 15, color: pColor, type: pType, phase: i * 1.1 });
      o.stageCoins.push({ x: px + pw / 2, y: py - 24, r: 9, collected: false });

      if (i % 2 === 1) {
        o.hazards.push({ x: px + pw / 2 - 8, y: py - 12, w: 16, h: 12 });
      }
    }

    // Finish Goal Pad (Right side)
    o.platforms.push({ x: 775, y: 255, w: 95, h: 20, color: "#fde047", type: "goal" });

    // Reset player position to start pad
    o.player.x = 62;
    o.player.y = 270;
    o.player.vx = 0;
    o.player.vy = 0;
    o.player.grounded = false;
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        alpha: 1,
        size: 3 + Math.random() * 4
      });
    }
  }

  // -------------------------------------------------------------------------
  // Update & Render Game 1: Mega Brainrot Lava Obby
  // -------------------------------------------------------------------------
  function updateAndRenderObby(ctx, w, h, dt) {
    const o = state.obby;
    const p = o.player;
    o.lavaWavePhase += dt * 3;

    // AFK Farmer mode automatically steers toward the finish pad!
    const speed = o.speedCoil ? 5.4 : 3.7;
    if (o.afkMode) {
      p.vx = speed * 0.85;
      if (p.grounded && Math.random() < 0.08) {
        p.vy = -9.6;
        p.grounded = false;
      }
      if (Math.random() < 0.05) o.coins += 2;
    } else {
      if (state.keys["ArrowLeft"] || state.keys["KeyA"]) p.vx = -speed;
      else if (state.keys["ArrowRight"] || state.keys["KeyD"]) p.vx = speed;
      else p.vx *= 0.78;
    }

    if (o.vipCarpet) {
      if (state.keys["ArrowUp"] || state.keys["KeyW"] || state.keys["Space"]) p.vy = -4.5;
      else if (state.keys["ArrowDown"] || state.keys["KeyS"]) p.vy = 4.5;
      else p.vy *= 0.8;
    } else {
      p.vy += 0.46; // Gravity
    }

    p.x += p.vx;
    p.y += p.vy;
    p.grounded = false;

    // Platform collisions
    for (const plat of o.platforms) {
      const blinkHidden = plat.type === "blink" && Math.sin(o.lavaWavePhase + plat.phase) > 0.65;
      if (blinkHidden) continue;

      if (
        p.x + p.w > plat.x &&
        p.x < plat.x + plat.w &&
        p.y + p.h >= plat.y &&
        p.y + p.h <= plat.y + plat.h + 14 &&
        p.vy >= 0
      ) {
        p.y = plat.y - p.h;
        p.vy = plat.type === "bounce" ? -11.2 : 0;
        p.grounded = true;
        p.jumps = 0;
        if (plat.type === "conveyor") p.x += 1.6;

        if (plat.type === "goal") {
          playSfx("rare_aura");
          spawnParticles(plat.x + 40, plat.y, "#fde047", 28);
          o.coins += 50 * (1 + o.rebirths);
          if (o.stage < o.maxStages) {
            o.stage++;
          } else {
            o.stage = 1;
            o.rebirths++;
          }
          buildObbyStage(o.stage);
          updateHudBar();
          return;
        }
      }
    }

    // Coin collection
    for (const c of o.stageCoins) {
      if (!c.collected) {
        const dx = p.x + p.w / 2 - c.x;
        const dy = p.y + p.h / 2 - c.y;
        if (Math.hypot(dx, dy) < 24) {
          c.collected = true;
          o.coins += 15 * (1 + o.rebirths);
          playSfx("coin");
          spawnParticles(c.x, c.y, "#fde047", 10);
          updateHudBar();
        }
      }
    }

    // Lava floor collision
    const lavaY = h - 38 + Math.sin(o.lavaWavePhase) * 5;
    if (p.y + p.h > lavaY) {
      o.deaths++;
      playSfx("nuke");
      spawnParticles(p.x, p.y, "#ef4444", 18);
      buildObbyStage(o.stage);
      updateHudBar();
    }

    // Background sky & neon grid
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(1, "#1e1b4b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw platforms
    for (const plat of o.platforms) {
      const blinkHidden = plat.type === "blink" && Math.sin(o.lavaWavePhase + plat.phase) > 0.65;
      ctx.globalAlpha = blinkHidden ? 0.22 : 1.0;
      ctx.fillStyle = plat.color;
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      if (plat.type === "goal") {
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("🏁 STAGE " + (o.stage + 1), plat.x + 8, plat.y - 8);
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw coins
    for (const c of o.stageCoins) {
      if (c.collected) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y + Math.sin(o.lavaWavePhase * 2) * 3, c.r, 0, Math.PI * 2);
      ctx.fillStyle = "#fde047";
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();
    }

    // Draw VIP Rainbow Carpet under player if owned
    if (o.vipCarpet) {
      ctx.fillStyle = "#00f5d4";
      ctx.fillRect(p.x - 10, p.y + p.h - 2, p.w + 20, 7);
    }

    // Draw Roblox Avatar Character (Blocky R6 style)
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(p.x + 3, p.y + 12, p.w - 6, 15); // Torso
    ctx.fillStyle = "#fde047";
    ctx.fillRect(p.x + 5, p.y, p.w - 10, 12); // Head
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(p.x + 4, p.y + 27, 7, 9); // Left Leg
    ctx.fillRect(p.x + p.w - 11, p.y + 27, 7, 9); // Right Leg

    // Draw Rising Lava Floor
    const lavaGrad = ctx.createLinearGradient(0, lavaY, 0, h);
    lavaGrad.addColorStop(0, "#ff4d00");
    lavaGrad.addColorStop(1, "#991b1b");
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, lavaY, w, h - lavaY);

    // Top Canvas HUD Overlay
    ctx.fillStyle = "rgba(9, 13, 22, 0.82)";
    ctx.fillRect(14, 12, 540, 38);
    ctx.fillStyle = "#00f5d4";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(
      `🌋 MEGA OBBY • FASE ${o.stage}/${o.maxStages}   |   🪙 ${o.coins} MOEDAS   |   🔄 REBIRTHS: ${o.rebirths}`,
      26,
      36
    );
  }

  // -------------------------------------------------------------------------
  // Update & Render Game 2: AI Streamer Empire Clicker/Tycoon
  // -------------------------------------------------------------------------
  function updateAndRenderTycoon(ctx, w, h, dt) {
    const t = state.tycoon;
    t.spawnTimer += dt;
    t.kothTimer += dt;

    // Spawn cubes from unlocked droppers every 0.85s
    if (t.spawnTimer >= 0.85) {
      t.spawnTimer = 0;
      for (let i = 0; i < t.droppersUnlocked; i++) {
        const def = t.dropperDefs[i];
        t.cubes.push({
          x: 95 + i * 52,
          y: 235,
          value: def.value * (1 + t.rebirths) * (t.kothActive ? 1.5 : 1.0),
          color: def.color,
          upgradedMask: 0
        });
      }
    }

    // Background Studio Floor
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0b1120");
    grad.addColorStop(1, "#172554");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw Central KOTH Cash Multiplier Arena Banner
    ctx.fillStyle = t.kothActive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
    ctx.fillRect(580, 14, 295, 58);
    ctx.strokeStyle = t.kothActive ? "#22c55e" : "#ef4444";
    ctx.strokeRect(580, 14, 295, 58);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("👑 ARENA KOTH: " + (t.kothActive ? "DOMINADA (+50% CASH)" : "DESATIVADA"), 594, 38);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.fillText("Clique nos botões abaixo para expandir!", 594, 58);

    // Draw Conveyor Belt
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(60, 250, 690, 34);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 250, 690, 34);

    // Animated conveyor chevrons
    ctx.fillStyle = "#475569";
    const offset = Math.floor((t.kothTimer * 90) % 40);
    for (let cx = 75 + offset; cx < 730; cx += 40) {
      ctx.fillRect(cx, 256, 10, 22);
    }

    // Draw 6 Droppers above conveyor
    for (let i = 0; i < t.dropperDefs.length; i++) {
      const def = t.dropperDefs[i];
      const unlocked = i < t.droppersUnlocked;
      const dx = 80 + i * 52;
      ctx.fillStyle = unlocked ? def.color : "#334155";
      ctx.fillRect(dx, 155, 38, 65);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(dx + 10, 220, 18, 16);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(unlocked ? `D${i + 1}` : "🔒", dx + 11, 188);
    }

    // Draw 3 Upgrader Laser Gates along the conveyor
    for (let i = 0; i < t.upgraderDefs.length; i++) {
      const u = t.upgraderDefs[i];
      const unlocked = i < t.upgradersUnlocked;
      ctx.fillStyle = unlocked ? u.color : "rgba(71, 85, 105, 0.45)";
      ctx.fillRect(u.x, 195, 14, 56);
      if (unlocked) {
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`${u.mult}x`, u.x - 2, 188);
      }
    }

    // Draw Cash Collector Vault at right end of conveyor
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(745, 190, 105, 94);
    ctx.fillStyle = "#052e16";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("COLETOR", 764, 232);
    ctx.fillText("DE CASH", 766, 250);

    // Move & upgrade cubes
    for (let i = t.cubes.length - 1; i >= 0; i--) {
      const c = t.cubes[i];
      c.x += 2.8;

      // Pass through Upgrader Gates
      for (let g = 0; g < t.upgradersUnlocked; g++) {
        const gate = t.upgraderDefs[g];
        const bit = 1 << g;
        if ((c.upgradedMask & bit) === 0 && c.x >= gate.x) {
          c.upgradedMask |= bit;
          c.value *= gate.mult;
          c.color = gate.color;
          spawnParticles(c.x, c.y, gate.color, 5);
        }
      }

      // Draw cube
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, 18, 18);
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(c.x, c.y, 18, 18);

      // Collect at end of belt
      if (c.x >= 742) {
        t.cash += Math.round(c.value);
        t.totalEarned += Math.round(c.value);
        playSfx("cash");
        spawnParticles(750, 240, "#22c55e", 8);
        t.cubes.splice(i, 1);
        updateHudBar();
      }
    }

    // Top HUD
    ctx.fillStyle = "rgba(9, 13, 22, 0.86)";
    ctx.fillRect(14, 12, 550, 42);
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(
      `💵 $${t.cash.toLocaleString()} CASH   |   🖥️ DROPPERS: ${t.droppersUnlocked}/6   |   ⚡ GATES: ${t.upgradersUnlocked}/3`,
      26,
      38
    );
  }

  // -------------------------------------------------------------------------
  // Update & Render Game 3: Divine Aura RNG Simulator
  // -------------------------------------------------------------------------
  function updateAndRenderRng(ctx, w, h, dt) {
    const r = state.rng;
    r.rollAnimTimer += dt;

    if (r.autoRoll && !r.rolling && Math.floor(r.rollAnimTimer * 10) % 14 === 0) {
      triggerAuraRoll();
    }

    // Cosmic Shrine Background
    const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 460);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(1, "#090d16");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const aura = r.rolling && r.previewAura ? r.previewAura : r.equippedAura;
    const cx = w / 2;
    const cy = h / 2 + 12;

    // 2x Luck AFK Shrine Floor Circle
    ctx.save();
    ctx.translate(cx, cy + 72);
    ctx.scale(1, 0.35);
    for (let i = 0; i < aura.rings; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 75 + i * 32 + Math.sin(r.rollAnimTimer * 3 + i) * 6, 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? aura.color : aura.secondary;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();

    // Procedural Energy Wings / Rays behind Avatar
    ctx.save();
    ctx.translate(cx, cy);
    const rayCount = aura.rings * 4;
    for (let i = 0; i < rayCount; i++) {
      const ang = (i / rayCount) * Math.PI * 2 + r.rollAnimTimer * 0.9;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 115, Math.sin(ang) * 115);
      ctx.strokeStyle = i % 2 === 0 ? aura.color : aura.secondary;
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1.0;

    // Center Player Avatar
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(cx - 18, cy - 12, 36, 42);
    ctx.strokeStyle = aura.color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(cx - 18, cy - 12, 36, 42);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(cx - 14, cy - 40, 28, 26);

    // Orbiting Crystal Orbs around Avatar
    for (let i = 0; i < aura.orbs; i++) {
      const ang = r.rollAnimTimer * 2.2 + (i * Math.PI * 2) / aura.orbs;
      const rx = cx + Math.cos(ang) * (68 + (i % 3) * 22);
      const ry = cy + Math.sin(ang * 1.5) * 36;
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? aura.color : aura.secondary;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Aura Title Banner at Top Center
    ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
    ctx.fillRect(cx - 245, 14, 490, 68);
    ctx.strokeStyle = aura.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 245, 14, 490, 68);

    ctx.fillStyle = aura.color;
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`✨ ${aura.name.toUpperCase()} ✨`, cx, 42);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(
      `RARIDADE: 1 EM ${aura.odds.toLocaleString()} (${aura.tier.toUpperCase()})  •  ROLLS: ${r.totalRolls}  •  💎 ${r.gems} GEMAS`,
      cx,
      66
    );
    ctx.textAlign = "left";

    // Pity Progress Bars (Bottom Left)
    ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
    ctx.fillRect(16, h - 64, 340, 48);
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`EPIC PITY: ${r.pityEpic}/50`, 28, h - 42);
    ctx.fillStyle = "#fde047";
    ctx.fillText(`LEGENDARY PITY: ${r.pityLegendary}/250`, 175, h - 42);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(
      `POÇÃO HEAVENLY 10X: ${r.heavenly10xRolls > 0 ? r.heavenly10xRolls + " ROLLS RESTANTES" : "PRONTO P/ ATIVAR"}`,
      28,
      h - 24
    );
  }

  // -------------------------------------------------------------------------
  // RNG Roll Trigger
  // -------------------------------------------------------------------------
  function triggerAuraRoll() {
    const r = state.rng;
    if (r.rolling && !r.quickRoll) return;

    r.totalRolls++;
    r.pityEpic++;
    r.pityLegendary++;
    r.gems += 25;

    let luckMult = r.shrine2x ? 2 : 1;
    if (r.heavenly10xRolls > 0) {
      luckMult *= 10;
      r.heavenly10xRolls--;
    }

    // Select aura based on weighted luck & pity
    let chosen = r.auraPool[0];
    if (r.pityLegendary >= 250) {
      r.pityLegendary = 0;
      chosen = r.auraPool[5 + Math.floor(Math.random() * 4)];
    } else if (r.pityEpic >= 50) {
      r.pityEpic = 0;
      chosen = r.auraPool[3 + Math.floor(Math.random() * 3)];
    } else {
      const rollScore = Math.random() * 100 * luckMult;
      if (rollScore > 165) chosen = r.auraPool[8]; // 1 in 10,000,000 Genesis
      else if (rollScore > 135) chosen = r.auraPool[7]; // 1 in 1,000,000 Cosmic
      else if (rollScore > 95) chosen = r.auraPool[6];
      else if (rollScore > 65) chosen = r.auraPool[5];
      else if (rollScore > 42) chosen = r.auraPool[4];
      else if (rollScore > 24) chosen = r.auraPool[3];
      else if (rollScore > 12) chosen = r.auraPool[2];
      else if (rollScore > 5) chosen = r.auraPool[1];
    }

    const finalizeRoll = () => {
      r.rolling = false;
      r.equippedAura = chosen;
      if (!r.inventory.some((a) => a.name === chosen.name)) {
        r.inventory.push(chosen);
      }
      if (chosen.odds >= 5000) {
        playSfx("rare_aura");
        state.screenShake = 14;
        state.flashAlpha = 0.75;
        state.flashColor = chosen.color;
        spawnParticles(450, 190, chosen.color, 45);
      } else {
        playSfx("coin");
        spawnParticles(450, 190, chosen.color, 16);
      }
      updateHudBar();
    };

    if (r.quickRoll) {
      finalizeRoll();
      return;
    }

    r.rolling = true;
    let ticks = 0;
    const interval = setInterval(() => {
      r.previewAura = r.auraPool[ticks % r.auraPool.length];
      ticks++;
      if (ticks >= 8) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 65);
  }

  // -------------------------------------------------------------------------
  // Action Buttons & Controls Dispatcher
  // -------------------------------------------------------------------------
  window.arcadeAction = function (action) {
    const o = state.obby;
    const t = state.tycoon;
    const r = state.rng;

    if (action === "obby_jump") {
      if (o.player.grounded || o.player.jumps < 2) {
        o.player.vy = -10.2;
        o.player.grounded = false;
        o.player.jumps++;
        playSfx("jump");
      }
    } else if (action === "obby_skip") {
      playSfx("rare_aura");
      o.stage = o.stage < o.maxStages ? o.stage + 1 : 1;
      buildObbyStage(o.stage);
    } else if (action === "obby_carpet") {
      o.vipCarpet = !o.vipCarpet;
      playSfx("coin");
    } else if (action === "obby_afk") {
      o.afkMode = !o.afkMode;
      playSfx("coin");
    } else if (action === "obby_nuke") {
      playSfx("nuke");
      state.screenShake = 18;
      state.flashAlpha = 0.85;
      state.flashColor = "#ff4d00";
      o.coins += 500;
      spawnParticles(450, 180, "#fde047", 55);
    } else if (action === "tycoon_click") {
      const gain = 25 * (1 + t.rebirths);
      t.cash += gain;
      t.totalEarned += gain;
      playSfx("cash");
      spawnParticles(780, 230, "#4ade80", 8);
    } else if (action === "tycoon_buy_dropper") {
      if (t.droppersUnlocked < t.dropperDefs.length) {
        const nextD = t.dropperDefs[t.droppersUnlocked];
        if (t.cash >= nextD.cost) {
          t.cash -= nextD.cost;
          t.droppersUnlocked++;
          playSfx("rare_aura");
          spawnParticles(120 + t.droppersUnlocked * 50, 180, nextD.color, 25);
        } else if (window.showToast) {
          window.showToast(`💰 Precisa de $${nextD.cost} Cash para desbloquear ${nextD.name}!`);
        }
      }
    } else if (action === "tycoon_buy_upgrader") {
      if (t.upgradersUnlocked < t.upgraderDefs.length) {
        const nextU = t.upgraderDefs[t.upgradersUnlocked];
        if (t.cash >= nextU.cost) {
          t.cash -= nextU.cost;
          t.upgradersUnlocked++;
          playSfx("rare_aura");
          spawnParticles(nextU.x, 210, nextU.color, 25);
        } else if (window.showToast) {
          window.showToast(`💰 Precisa de $${nextU.cost} Cash para desbloquear ${nextU.name}!`);
        }
      }
    } else if (action === "tycoon_rebirth") {
      if (t.droppersUnlocked >= 4) {
        t.rebirths++;
        t.cash = 100;
        t.droppersUnlocked = 1;
        t.upgradersUnlocked = 0;
        playSfx("rare_aura");
        state.flashAlpha = 0.7;
        state.flashColor = "#00f5d4";
      } else if (window.showToast) {
        window.showToast("🔒 Desbloqueie pelo menos 4 Droppers antes de dar Rebirth!");
      }
    } else if (action === "rng_roll") {
      triggerAuraRoll();
    } else if (action === "rng_autoroll") {
      r.autoRoll = !r.autoRoll;
      playSfx("coin");
    } else if (action === "rng_quickroll") {
      r.quickRoll = !r.quickRoll;
      playSfx("coin");
    } else if (action === "rng_heavenly") {
      r.heavenly10xRolls += 10;
      playSfx("rare_aura");
      state.flashAlpha = 0.55;
      state.flashColor = "#fde047";
      spawnParticles(450, 190, "#fde047", 35);
    }

    updateHudBar();
  };

  window.switchArcadeGame = function (gameKey) {
    state.activeGame = gameKey;
    document.querySelectorAll("[data-arcade-tab]").forEach((btn) => {
      btn.classList.toggle("active-tab", btn.getAttribute("data-arcade-tab") === gameKey);
    });
    document.querySelectorAll("[data-arcade-controls]").forEach((panel) => {
      panel.style.display =
        panel.getAttribute("data-arcade-controls") === gameKey ? "flex" : "none";
    });
    updateHudBar();
  };

  window.redeemArcadePromoCode = function () {
    const input = document.getElementById("arcade-promo-input");
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) return;

    const validCodes = ["FREECOINS2026", "VIPTYCOON", "LUCKYAURA", "TWITCH247", "STREAMER10K", "AURA999"];
    if (!validCodes.includes(code)) {
      if (window.showToast) window.showToast("❌ Código inválido! Tente: FREECOINS2026, VIPTYCOON ou LUCKYAURA");
      return;
    }
    if (state.redeemedCodes[code]) {
      if (window.showToast) window.showToast("ℹ️ Esse código já foi resgatado nesta sessão!");
      return;
    }

    state.redeemedCodes[code] = true;
    state.obby.coins += 5000;
    state.tycoon.cash += 15000;
    state.rng.gems += 2500;
    state.rng.heavenly10xRolls += 5;
    playSfx("rare_aura");
    state.flashAlpha = 0.65;
    state.flashColor = "#4ade80";
    updateHudBar();
    if (window.showToast) {
      window.showToast(`🎁 Código '${code}' resgatado! +5.000 Moedas Obby, +$15.000 Cash Tycoon & +5 Poções 10x Luck!`);
    }
  };

  function updateHudBar() {
    const t = state.tycoon;
    const nextD = t.dropperDefs[t.droppersUnlocked];
    const nextU = t.upgraderDefs[t.upgradersUnlocked];

    const btnDropper = document.getElementById("btn-tycoon-dropper");
    if (btnDropper) {
      btnDropper.textContent = nextD
        ? `🖥️ Comprar ${nextD.name} ($${nextD.cost})`
        : "✅ Todos os 6 Droppers Ativos!";
    }
    const btnUpgrader = document.getElementById("btn-tycoon-upgrader");
    if (btnUpgrader) {
      btnUpgrader.textContent = nextU
        ? `⚡ Comprar ${nextU.name} ($${nextU.cost})`
        : "✅ Todos os 3 Gates Ativos!";
    }
  }

  // -------------------------------------------------------------------------
  // Main 60-FPS Animation Loop
  // -------------------------------------------------------------------------
  function initArcadeEngine() {
    const canvas = document.getElementById("arcade-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    buildObbyStage(1);
    updateHudBar();

    window.addEventListener("keydown", (e) => {
      state.keys[e.code] = true;
      if (
        state.activeGame === "obby" &&
        (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
      ) {
        if (document.activeElement && document.activeElement.tagName === "INPUT") return;
        e.preventDefault();
        window.arcadeAction("obby_jump");
      }
    });

    window.addEventListener("keyup", (e) => {
      state.keys[e.code] = false;
    });

    let lastTime = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake;
        const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.translate(dx, dy);
        state.screenShake = Math.max(0, state.screenShake - 0.8);
      }

      if (state.activeGame === "obby") {
        updateAndRenderObby(ctx, w, h, dt);
      } else if (state.activeGame === "tycoon") {
        updateAndRenderTycoon(ctx, w, h, dt);
      } else {
        updateAndRenderRng(ctx, w, h, dt);
      }

      // Render particle system
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const pt = state.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.028;
        if (pt.alpha <= 0) {
          state.particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
      ctx.globalAlpha = 1.0;

      // Screen Flash Effect (Nuke / Celestial Roll)
      if (state.flashAlpha > 0.01) {
        ctx.fillStyle = state.flashColor;
        ctx.globalAlpha = state.flashAlpha;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;
        state.flashAlpha *= 0.88;
      }

      ctx.restore();
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener("DOMContentLoaded", initArcadeEngine);
})();
