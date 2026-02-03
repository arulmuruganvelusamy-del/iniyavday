/**
 * Heart Tree — Custom animated trees made of hearts
 * Trunks: intertwined heart shapes. Leaves: floating hearts that fall, sparkle, reform.
 * Sways with cursor/touch. No stock art.
 */

(function (global) {
  const TAU = Math.PI * 2;

  function heartPath(ctx, x, y, scale) {
    scale = scale || 1;
    ctx.beginPath();
    const top = y - 0.9 * scale;
    ctx.moveTo(x, top + 0.3 * scale);
    ctx.bezierCurveTo(x + 0.9 * scale, top - 0.4 * scale, x + 1.2 * scale, top + 0.6 * scale, x, top + 1.2 * scale);
    ctx.bezierCurveTo(x - 1.2 * scale, top + 0.6 * scale, x - 0.9 * scale, top - 0.4 * scale, x, top + 0.3 * scale);
    ctx.closePath();
  }

  function drawHeart(ctx, x, y, size, fill, glow, lite) {
    ctx.save();
    if (glow) {
      ctx.shadowColor = fill;
      ctx.shadowBlur = lite ? 4 + size : 12 + size * 2;
    }
    heartPath(ctx, x, y, size);
    ctx.fillStyle = fill;
    ctx.fill();
    if (glow) ctx.shadowBlur = 0;
    ctx.restore();
  }

  function createTree(options) {
    const x = options.x ?? 0.5;
    const baseY = options.baseY ?? 1;
    const scale = options.scale ?? 0.08;
    const lite = options.lite === true;
    const staticLeaves = options.staticLeaves === true;
    const trunkHearts = [];
    const branches = [];
    const leafHearts = [];
    const sparkles = [];
    const w = options.width || 800;
    const h = options.height || 1200;
    const cx = x * w;
    const by = baseY * h;

    // Trunk: stacked hearts (taller when growing tree)
    const trunkHeartCount = staticLeaves ? 7 : 5;
    const trunkStep = staticLeaves ? Math.min(20, h * 0.055) : 22;
    const trunkStart = staticLeaves ? Math.min(32, h * 0.08) : 35;
    for (let i = 0; i < trunkHeartCount; i++) {
      const offset = (i % 2) * 14 - 7;
      trunkHearts.push({
        x: cx + offset,
        y: by - trunkStart - i * trunkStep,
        size: (staticLeaves ? 20 : 22) - i * 2,
        phase: i * 0.4,
      });
    }

    // Branch endpoints + branch hearts (fuller, scaled when growing tree)
    const branchSpreadX = staticLeaves ? w * 0.38 : 140;
    const branchSpreadY = staticLeaves ? h * 0.5 : 220;
    const branchStartY = staticLeaves ? h * 0.12 : 100;
    const branchCount = staticLeaves ? 9 + Math.floor(Math.random() * 3) : (lite ? 4 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 4));
    for (let i = 0; i < branchCount; i++) {
      const bx = cx + (Math.random() - 0.5) * branchSpreadX * 2;
      const by2 = by - branchStartY - Math.random() * branchSpreadY;
      const branchHearts = [];
      const steps = staticLeaves ? 4 + Math.floor(Math.random() * 2) : (lite ? 3 : 4 + Math.floor(Math.random() * 3));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        branchHearts.push({
          x: cx + (bx - cx) * t + Math.sin(s) * 8,
          y: by - (staticLeaves ? h * 0.14 : 60) + (by2 - (by - (staticLeaves ? h * 0.14 : 60))) * t + Math.cos(s * 0.7) * 5,
          size: 6 - t * 3,
          phase: s * 0.5,
        });
      }
      branches.push({ x: bx, y: by2, phase: Math.random() * TAU, branchHearts });
    }

    // Leaf hearts on branches (full canopy when growing tree)
    const leavesPerBranch = staticLeaves ? 6 + Math.floor(Math.random() * 4) : (lite ? 2 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 4));
    const leafSpread = staticLeaves ? 55 : 40;
    const leafSizeMin = staticLeaves ? 5 : 4;
    const leafSizeRange = staticLeaves ? 5 : 5;
    branches.forEach((b, branchIdx) => {
      for (let j = 0; j < leavesPerBranch; j++) {
        leafHearts.push({
          branchX: b.x,
          branchY: b.y,
          branchIndex: branchIdx,
          phase: Math.random() * TAU,
          offsetX: (Math.random() - 0.5) * leafSpread,
          offsetY: (Math.random() - 0.5) * leafSpread,
          size: leafSizeMin + Math.random() * leafSizeRange,
          fallProgress: Math.random() * 0.3,
          fallDuration: 5 + Math.random() * 4,
          fallStart: 2 + Math.random() * 3,
          state: "attached",
          sparkleTime: 0,
          hue: 340 + Math.random() * 30,
        });
      }
    });

    return {
      cx,
      by,
      w,
      h,
      scale,
      lite,
      staticLeaves,
      trunkHearts,
      branches,
      leafHearts,
      sparkles,
      sway: 0,
      swayTarget: 0,
      mouseX: 0,
      mouseY: 0,
      growthProgress: 0,
      growthDuration: 2.8,
    };
  }

  function addLeavesToTree(tree, count) {
    if (!tree || !tree.branches || !tree.branches.length || !tree.leafHearts) return;
    const TAU = Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * tree.branches.length);
      const b = tree.branches[idx];
      tree.leafHearts.push({
        branchX: b.x,
        branchY: b.y,
        branchIndex: idx,
        phase: Math.random() * TAU,
        offsetX: (Math.random() - 0.5) * 50,
        offsetY: (Math.random() - 0.5) * 50,
        size: 4 + Math.random() * 5,
        fallProgress: 0,
        fallDuration: 5 + Math.random() * 4,
        fallStart: 0.5 + Math.random() * 1.5,
        state: "attached",
        sparkleTime: 0,
        hue: 340 + Math.random() * 30,
      });
    }
  }

  function updateTree(tree, dt, mouseX, mouseY) {
    const w = tree.w;
    const h = tree.h;
    tree.mouseX = mouseX;
    tree.mouseY = mouseY;
    const dx = (mouseX / w - 0.5) * 2;
    tree.swayTarget = dx * 0.12;
    tree.sway += (tree.swayTarget - tree.sway) * 0.05;

    if (tree.growthProgress < 1) {
      tree.growthProgress = Math.min(1, tree.growthProgress + dt / tree.growthDuration);
    }

    if (tree.staticLeaves) {
      tree.leafHearts.forEach((leaf) => { leaf.phase += dt * 0.3; });
      return;
    }

    tree.leafHearts.forEach((leaf) => {
      leaf.phase += dt * 0.4;
      if (leaf.state === "attached") {
        leaf.fallStart -= dt;
        if (leaf.fallStart <= 0) leaf.state = "falling";
      } else if (leaf.state === "falling") {
        leaf.fallProgress += dt / leaf.fallDuration;
        if (leaf.fallProgress >= 1) {
          leaf.state = "sparkle";
          leaf.sparkleTime = 0;
          for (let s = 0; s < 8; s++) {
            tree.sparkles.push({
              x: leaf.branchX + leaf.offsetX + (Math.random() - 0.5) * 20,
              y: leaf.branchY + leaf.offsetY,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -0.8 - Math.random() * 1.5,
              life: 0.6 + Math.random() * 0.5,
              size: 2 + Math.random() * 3,
              hue: leaf.hue,
            });
          }
        }
      } else if (leaf.state === "sparkle") {
        leaf.sparkleTime += dt;
        if (leaf.sparkleTime > 1.2) {
          leaf.state = "attached";
          leaf.fallProgress = 0;
          leaf.fallStart = 2 + Math.random() * 3;
        }
      }
    });

    tree.sparkles.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= dt;
      s.vy += dt * 0.5;
    });
    tree.sparkles = tree.sparkles.filter((s) => s.life > 0);
  }

  function drawTree(ctx, tree, time) {
    const sway = tree.sway;
    const cx = tree.cx;
    const by = tree.by;
    const g = tree.growthProgress || 1;

    const visibleTrunkCount = Math.ceil((tree.trunkHearts.length) * g);
    const visibleBranchCount = Math.ceil((tree.branches.length) * g);

    ctx.save();
    ctx.translate(cx, by);
    ctx.rotate(sway);

    // Trunk (stacked hearts — grow from bottom up)
    const trunkFill = "rgba(200, 110, 130, 0.9)";
    const trunkStroke = "rgba(160, 80, 100, 0.5)";
    const lite = tree.lite === true;
    tree.trunkHearts.forEach((th, i) => {
      if (i >= visibleTrunkCount) return;
      const trunkAlpha = i < visibleTrunkCount - 1 ? 1 : (g * tree.trunkHearts.length - i);
      ctx.save();
      ctx.globalAlpha = Math.min(1, trunkAlpha);
      ctx.translate(th.x - cx, th.y - by);
      ctx.rotate(Math.sin(time * 0.25 + th.phase) * 0.03);
      heartPath(ctx, 0, 0, th.size);
      ctx.shadowColor = "rgba(240, 160, 180, 0.7)";
      ctx.shadowBlur = lite ? 6 : 18;
      ctx.fillStyle = trunkFill;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = trunkStroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    });

    // Branches (chains of small hearts — grow in with trunk)
    tree.branches.forEach((b, bi) => {
      if (bi >= visibleBranchCount) return;
      const branchReveal = (g * tree.branches.length - bi);
      if (branchReveal <= 0) return;
      if (b.branchHearts) {
        const visibleSteps = Math.ceil(b.branchHearts.length * Math.min(1, branchReveal));
        b.branchHearts.forEach((bh, idx) => {
          if (idx >= visibleSteps) return;
          const sway = Math.sin(time * 0.2 + b.phase + idx * 0.3) * 3;
          ctx.save();
          ctx.globalAlpha = idx < visibleSteps - 1 ? 1 : Math.min(1, branchReveal);
          ctx.translate(bh.x - cx + sway, bh.y - by);
          const fill = `hsla(345, 55%, 72%, ${0.85 - idx * 0.08})`;
          drawHeart(ctx, 0, 0, Math.max(3, bh.size), fill, true, lite);
          ctx.restore();
        });
      }
    });

    ctx.restore();

    // Leaf hearts (in world space)
    const staticLeaves = tree.staticLeaves === true;
    tree.leafHearts.forEach((leaf) => {
      if ((leaf.branchIndex !== undefined && leaf.branchIndex >= visibleBranchCount)) return;
      const bx = leaf.branchX + Math.sin(time * 0.25 + leaf.phase) * 4;
      const by2 = leaf.branchY;
      let lx, ly;
      if (staticLeaves || leaf.state === "attached" || leaf.state === "sparkle") {
        lx = bx + leaf.offsetX + Math.sin(leaf.phase) * 3;
        ly = by2 + leaf.offsetY;
      } else {
        const t = leaf.fallProgress;
        const ease = 1 - Math.pow(1 - t, 1.5);
        const drift = Math.sin(leaf.phase + t * 4) * 8;
        lx = bx + leaf.offsetX + drift;
        ly = by2 + leaf.offsetY + ease * 180 + Math.sin(t * Math.PI) * 20;
      }
      if (staticLeaves || leaf.state !== "sparkle" || leaf.sparkleTime < 0.4) {
        const alpha = leaf.state === "sparkle" ? 1 - leaf.sparkleTime / 1.2 : 1;
        const fill = `hsla(${leaf.hue}, 70%, 75%, ${alpha * 0.95})`;
        drawHeart(ctx, lx, ly, leaf.size, fill, true, lite);
      }
    });

    if (staticLeaves) return;

    // Sparkles
    tree.sparkles.forEach((s) => {
      const a = s.life;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, TAU);
      ctx.fillStyle = `hsla(${s.hue}, 80%, 85%, ${a})`;
      ctx.shadowColor = `hsl(${s.hue}, 80%, 80%)`;
      ctx.shadowBlur = lite ? 2 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // ─── Minimal tree for heart-tree section only: no falling leaves, no sparkles ───
  function createMinimalTree(options) {
    const x = options.x ?? 0.5;
    const baseY = options.baseY ?? 1;
    const w = options.width || 800;
    const h = options.height || 600;
    const cx = x * w;
    const by = baseY * h;
    const trunkHearts = [];
    for (let i = 0; i < 4; i++) {
      const offset = (i % 2) * 10 - 5;
      trunkHearts.push({
        x: cx + offset,
        y: by - 28 - i * 18,
        size: 18 - i * 2,
        phase: i * 0.5,
      });
    }
    const branches = [];
    const branchCount = 3;
    for (let i = 0; i < branchCount; i++) {
      const bx = cx + (Math.random() - 0.5) * 100;
      const by2 = by - 80 - Math.random() * 120;
      const steps = 3;
      const branchHearts = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        branchHearts.push({
          x: cx + (bx - cx) * t + Math.sin(s) * 5,
          y: by - 50 + (by2 - (by - 50)) * t,
          size: 5 - t * 2,
          phase: s * 0.4,
        });
      }
      branches.push({ x: bx, y: by2, phase: Math.random() * TAU, branchHearts });
    }
    const leafHearts = [];
    branches.forEach((b, bi) => {
      for (let j = 0; j < 2; j++) {
        leafHearts.push({
          branchX: b.x,
          branchY: b.y,
          branchIndex: bi,
          phase: Math.random() * TAU,
          offsetX: (Math.random() - 0.5) * 25,
          offsetY: (Math.random() - 0.5) * 25,
          size: 4 + Math.random() * 4,
          hue: 340 + Math.random() * 20,
        });
      }
    });
    return {
      cx, by, w, h,
      trunkHearts,
      branches,
      leafHearts,
      sway: 0,
      swayTarget: 0,
      growthProgress: 0,
      growthDuration: 2,
    };
  }

  function updateMinimalTree(tree, dt, mouseX, mouseY) {
    const dx = tree.w ? (mouseX / tree.w - 0.5) * 2 : 0;
    tree.swayTarget = dx * 0.08;
    tree.sway += (tree.swayTarget - tree.sway) * 0.04;
    if (tree.growthProgress < 1) {
      tree.growthProgress = Math.min(1, tree.growthProgress + dt / tree.growthDuration);
    }
  }

  function drawMinimalTree(ctx, tree, time) {
    const sway = tree.sway;
    const cx = tree.cx;
    const by = tree.by;
    const g = tree.growthProgress || 1;
    const visibleTrunk = Math.ceil(tree.trunkHearts.length * g);
    const visibleBranches = Math.ceil(tree.branches.length * g);

    ctx.save();
    ctx.translate(cx, by);
    ctx.rotate(sway);

    const trunkFill = "rgba(200, 110, 130, 0.88)";
    tree.trunkHearts.forEach((th, i) => {
      if (i >= visibleTrunk) return;
      ctx.save();
      ctx.globalAlpha = i < visibleTrunk - 1 ? 1 : (g * tree.trunkHearts.length - i);
      ctx.translate(th.x - cx, th.y - by);
      ctx.rotate(Math.sin(time * 0.2 + th.phase) * 0.02);
      heartPath(ctx, 0, 0, th.size);
      ctx.fillStyle = trunkFill;
      ctx.fill();
      ctx.restore();
    });

    tree.branches.forEach((b, bi) => {
      if (bi >= visibleBranches) return;
      const branchReveal = g * tree.branches.length - bi;
      if (branchReveal <= 0) return;
      const steps = Math.ceil((b.branchHearts.length) * Math.min(1, branchReveal));
      b.branchHearts.forEach((bh, idx) => {
        if (idx >= steps) return;
        ctx.save();
        ctx.globalAlpha = idx < steps - 1 ? 1 : Math.min(1, branchReveal);
        ctx.translate(bh.x - cx + Math.sin(time * 0.15 + b.phase) * 2, bh.y - by);
        drawHeart(ctx, 0, 0, Math.max(2.5, bh.size), `hsla(345, 55%, 72%, ${0.9 - idx * 0.1})`, false);
        ctx.restore();
      });
    });

    ctx.restore();

    tree.leafHearts.forEach((leaf) => {
      if (leaf.branchIndex >= visibleBranches) return;
      const bx = leaf.branchX + Math.sin(time * 0.2 + leaf.phase) * 3;
      const ly = leaf.branchY + leaf.offsetY;
      const lx = bx + leaf.offsetX + Math.sin(leaf.phase * 0.7) * 2;
      const fill = `hsla(${leaf.hue}, 70%, 78%, 0.9)`;
      drawHeart(ctx, lx, ly, leaf.size, fill, false);
    });
  }

  global.HeartTree = {
    createTree,
    updateTree,
    drawTree,
    drawHeart,
    heartPath,
    addLeavesToTree,
    createMinimalTree,
    updateMinimalTree,
    drawMinimalTree,
  };
})(typeof window !== "undefined" ? window : this);
