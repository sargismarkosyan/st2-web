const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");
const mineralsEl = document.getElementById("minerals");
const supplyEl = document.getElementById("supply");
const selectedEl = document.getElementById("selected");
const statusEl = document.getElementById("status");

const WORLD = { width: canvas.width, height: canvas.height };
const TEAM = {
  player: "player",
  enemy: "enemy",
};

const state = {
  minerals: 50,
  supply: 5,
  supplyCap: 10,
  units: [],
  enemyUnits: [],
  resources: [],
  selected: new Set(),
  drag: null,
  status: "Hold",
  victory: null,
};

const CONFIG = {
  unitRadius: 10,
  workerRadius: 9,
  attackRange: 60,
  attackCooldown: 0.8,
  workerMineCooldown: 1.8,
  maxMinerals: 400,
};

function spawnUnit({ x, y, team, role = "marine" }) {
  const unit = {
    id: crypto.randomUUID(),
    x,
    y,
    team,
    role,
    hp: role === "worker" ? 45 : 80,
    maxHp: role === "worker" ? 45 : 80,
    speed: role === "worker" ? 40 : 55,
    damage: role === "worker" ? 4 : 12,
    target: null,
    command: null,
    cooldown: 0,
    miningCooldown: 0,
  };
  if (team === TEAM.player) {
    state.units.push(unit);
  } else {
    state.enemyUnits.push(unit);
  }
  return unit;
}

function spawnResource({ x, y }) {
  state.resources.push({
    id: crypto.randomUUID(),
    x,
    y,
    amount: CONFIG.maxMinerals,
  });
}

function initialize() {
  state.units.length = 0;
  state.enemyUnits.length = 0;
  state.resources.length = 0;
  state.selected.clear();
  state.minerals = 50;
  state.supply = 5;
  state.supplyCap = 10;
  state.victory = null;
  spawnUnit({ x: 160, y: 160, team: TEAM.player, role: "worker" });
  spawnUnit({ x: 200, y: 220, team: TEAM.player, role: "worker" });
  spawnUnit({ x: 140, y: 240, team: TEAM.player, role: "marine" });
  spawnUnit({ x: 220, y: 170, team: TEAM.player, role: "marine" });
  spawnUnit({ x: 260, y: 210, team: TEAM.player, role: "marine" });
  spawnUnit({ x: 760, y: 140, team: TEAM.enemy, role: "raider" });
  spawnUnit({ x: 820, y: 180, team: TEAM.enemy, role: "raider" });
  spawnUnit({ x: 740, y: 210, team: TEAM.enemy, role: "raider" });
  spawnUnit({ x: 800, y: 260, team: TEAM.enemy, role: "raider" });
  spawnResource({ x: 120, y: 360 });
  spawnResource({ x: 240, y: 380 });
  spawnResource({ x: 160, y: 430 });
  updateUI();
}

function updateUI() {
  mineralsEl.textContent = Math.floor(state.minerals);
  supplyEl.textContent = `${state.supply}/${state.supplyCap}`;
  selectedEl.textContent = state.selected.size;
  statusEl.textContent = state.victory ? state.victory : state.status;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findClosestEnemy(unit) {
  const enemies = unit.team === TEAM.player ? state.enemyUnits : state.units;
  let closest = null;
  let closestDist = Infinity;
  for (const enemy of enemies) {
    const dist = distance(unit, enemy);
    if (dist < closestDist) {
      closest = enemy;
      closestDist = dist;
    }
  }
  return closest;
}

function updateUnit(unit, dt) {
  if (unit.hp <= 0) {
    return;
  }
  if (unit.cooldown > 0) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
  }
  if (unit.role === "worker" && unit.miningCooldown > 0) {
    unit.miningCooldown = Math.max(0, unit.miningCooldown - dt);
  }

  if (unit.command && unit.command.type === "move") {
    const target = unit.command.target;
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const step = (unit.speed * dt) / dist;
      unit.x += dx * step;
      unit.y += dy * step;
    } else {
      unit.command = null;
    }
  }

  const enemy = findClosestEnemy(unit);
  if (enemy && distance(unit, enemy) < CONFIG.attackRange) {
    if (unit.cooldown === 0) {
      enemy.hp -= unit.damage;
      unit.cooldown = CONFIG.attackCooldown;
      unit.command = null;
    }
  }

  if (unit.team === TEAM.enemy) {
    if (!unit.command) {
      const point = { x: 620 + Math.random() * 80, y: 160 + Math.random() * 200 };
      unit.command = { type: "move", target: point };
    }
  }

  if (unit.role === "worker") {
    const resource = state.resources.find((node) => node.amount > 0);
    if (resource && unit.miningCooldown === 0) {
      if (distance(unit, resource) < 28) {
        resource.amount -= 8;
        state.minerals += 8;
        unit.miningCooldown = CONFIG.workerMineCooldown;
        state.status = "Mining";
      } else if (!unit.command) {
        unit.command = { type: "move", target: { x: resource.x, y: resource.y } };
      }
    }
  }
}

function cleanDead() {
  state.units = state.units.filter((unit) => unit.hp > 0);
  state.enemyUnits = state.enemyUnits.filter((unit) => unit.hp > 0);
  if (state.enemyUnits.length === 0) {
    state.victory = "Victory!";
  }
  if (state.units.length === 0) {
    state.victory = "Defeat";
  }
}

function update(dt) {
  if (state.victory) {
    updateUI();
    return;
  }
  state.status = "Hold";
  for (const unit of state.units) {
    updateUnit(unit, dt);
  }
  for (const unit of state.enemyUnits) {
    updateUnit(unit, dt);
  }
  cleanDead();
  updateUI();
}

function drawBackground() {
  ctx.fillStyle = "#0b0f1a";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.strokeStyle = "rgba(50, 70, 110, 0.4)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }
}

function drawResource(node) {
  const radius = 14 + node.amount / 80;
  ctx.beginPath();
  ctx.fillStyle = "#36b9ff";
  ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.stroke();
}

function drawUnit(unit) {
  const isPlayer = unit.team === TEAM.player;
  const radius = unit.role === "worker" ? CONFIG.workerRadius : CONFIG.unitRadius;
  ctx.beginPath();
  ctx.fillStyle = isPlayer ? "#4cc3ff" : "#ff7c7c";
  ctx.arc(unit.x, unit.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer && state.selected.has(unit.id)) {
    ctx.strokeStyle = "#f6d06a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  const healthWidth = 30;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(unit.x - healthWidth / 2, unit.y - radius - 12, healthWidth, 6);
  ctx.fillStyle = "#4bf07f";
  ctx.fillRect(
    unit.x - healthWidth / 2,
    unit.y - radius - 12,
    (unit.hp / unit.maxHp) * healthWidth,
    6
  );
}

function render() {
  drawBackground();
  for (const node of state.resources) {
    drawResource(node);
  }
  for (const unit of state.units) {
    drawUnit(unit);
  }
  for (const unit of state.enemyUnits) {
    drawUnit(unit);
  }

  if (state.drag) {
    const { start, current } = state.drag;
    ctx.strokeStyle = "rgba(246, 208, 106, 0.9)";
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      start.x,
      start.y,
      current.x - start.x,
      current.y - start.y
    );
    ctx.setLineDash([]);
  }

  if (state.victory) {
    ctx.fillStyle = "rgba(5, 8, 15, 0.75)";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = "#f6d06a";
    ctx.font = "32px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.victory, WORLD.width / 2, WORLD.height / 2);
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillText("Refresh to play again", WORLD.width / 2, WORLD.height / 2 + 30);
  }
}

function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function selectUnitsInRect(rect) {
  state.selected.clear();
  for (const unit of state.units) {
    if (
      unit.x >= rect.x &&
      unit.x <= rect.x + rect.width &&
      unit.y >= rect.y &&
      unit.y <= rect.y + rect.height
    ) {
      state.selected.add(unit.id);
    }
  }
}

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }
  const pos = getMousePosition(event);
  state.drag = { start: pos, current: pos };
});

canvas.addEventListener("mousemove", (event) => {
  if (!state.drag) {
    return;
  }
  state.drag.current = getMousePosition(event);
});

canvas.addEventListener("mouseup", (event) => {
  if (event.button !== 0) {
    return;
  }
  if (!state.drag) {
    return;
  }
  const start = state.drag.start;
  const end = getMousePosition(event);
  const rect = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(start.x - end.x),
    height: Math.abs(start.y - end.y),
  };
  if (rect.width < 5 && rect.height < 5) {
    state.selected.clear();
    const clicked = state.units.find(
      (unit) => distance(unit, rect) < CONFIG.unitRadius + 4
    );
    if (clicked) {
      state.selected.add(clicked.id);
    }
  } else {
    selectUnitsInRect(rect);
  }
  state.drag = null;
  updateUI();
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  const target = getMousePosition(event);
  for (const unit of state.units) {
    if (state.selected.has(unit.id)) {
      unit.command = { type: "move", target };
    }
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "b") {
    if (state.minerals < 30 || state.supply >= state.supplyCap) {
      state.status = "Need minerals/supply";
      updateUI();
      return;
    }
    state.minerals -= 30;
    state.supply += 1;
    spawnUnit({ x: 180 + Math.random() * 60, y: 200 + Math.random() * 60, team: TEAM.player, role: "marine" });
    updateUI();
  }
});

let lastTime = performance.now();
function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

initialize();
requestAnimationFrame(loop);
