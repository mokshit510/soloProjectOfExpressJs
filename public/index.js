import { checkAuth, renderGreeting, showHideMenuItems } from './authUI.js';
import { logout } from './logout.js';

document.getElementById('logout-btn').addEventListener('click', logout) 

const primaryActionBtn = document.querySelector('#roll-panel-btn');
const resetBtn = document.querySelector('#reset-btn');
const heroesGrid = document.querySelector('#heroes-grid');
const statusMessage = document.querySelector('#status-message');
const nextStepMessage = document.querySelector('#next-step-message');
const goalLabel = document.querySelector('#goal-label');
const goalText = document.querySelector('#goal-text');
const heroTemplate = document.querySelector('#hero-template');
const playerSlot = document.querySelector('#player-slot');
const computerSlot = document.querySelector('#computer-slot');
const statusPanel = document.querySelector('#status-panel');
const headerChooseMessage = document.querySelector('#header-choose-message');

let heroes = [];
let selectedHeroId = null;
let playerHero = null;
let computerHero = null;
let playerHp = 0;
let computerHp = 0;
/** @type {{ playerAttack: number, playerDefense: number, computerAttack: number, computerDefense: number } | null} */
let lastRoundRolls = null;
const ROLL_SWEEP_MS = 460;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showStatusError(error) {
  statusMessage.textContent = error.message;
}

async function readJson(response, fallbackMessage) {
  const bodyText = await response.text();
  let data;

  try {
    data = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error(`${fallbackMessage} (HTTP ${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.message || `${fallbackMessage} (HTTP ${response.status})`);
  }

  return data;
}

function getSelectedHero() {
  return heroes.find((h) => h.id === selectedHeroId) || null;
}

function battleHpBlockHtml(hpToShow, maxHp, hpRatio) {
  const alive = Number(hpToShow) > 0;
  let extraClass = '';
  if (alive && hpRatio < 0.15) extraClass = ' battle-hp--critical';
  else if (alive && hpRatio < 0.35) extraClass = ' battle-hp--low';

  return `
    <div class="battle-hp${extraClass}" style="--hp-ratio: ${hpRatio}" role="group" aria-label="Hit points">
      <div class="battle-hp-bar" aria-hidden="true"><span class="battle-hp-bar-fill"></span></div>
      <div class="battle-hp-values">
        <span class="battle-hp-label">HP</span>
        <span class="battle-hp-current">${hpToShow ?? '-'}</span><span class="battle-hp-max-den"> / ${maxHp ?? '-'}</span>
      </div>
    </div>
  `;
}

function updateNextStepMessage() {
  const battleInProgress = Boolean(playerHero && computerHero);
  const battleEnded =
    battleInProgress && (Number(playerHp) <= 0 || Number(computerHp) <= 0);
  goalLabel.textContent = 'Goal';
  goalText.textContent = 'Reduce opponent HP to 0 before yours reaches 0.';

  if (!selectedHeroId) {
    nextStepMessage.textContent = '';
    return;
  }

  if (!computerHero) {
    nextStepMessage.textContent = 'Click Start Battle to summon an opponent.';
    return;
  }

  if (battleEnded) {
    nextStepMessage.textContent = 'Battle over.';
    goalLabel.textContent = 'Click New opponent or select a new hero';
    goalText.textContent = '';
    return;
  }

  nextStepMessage.textContent = '';
}

function getPrimaryActionState() {
  const battleInProgress = Boolean(playerHero && computerHero);
  const battleEnded =
    battleInProgress && (Number(playerHp) <= 0 || Number(computerHp) <= 0);

  if (!selectedHeroId) {
    return { label: 'Start Battle', disabled: true, action: 'start' };
  }

  if (!computerHero || battleEnded) {
    return { label: battleEnded ? 'New opponent' : 'Start Battle', disabled: false, action: 'start' };
  }

  return { label: 'Roll Next Round', disabled: false, action: 'roll' };
}

function syncStatusPanelVisibility() {
  if (!statusPanel) return;
  const showStatusPanel = Boolean(selectedHeroId);
  statusPanel.classList.toggle('status-panel--collapsed', !showStatusPanel);
  if (headerChooseMessage) {
    headerChooseMessage.classList.toggle('is-hidden', showStatusPanel);
  }
}

function renderBattleCard(containerEl, hero, emptyText, currentHp, rollMode) {
  if (!containerEl) return;

  const cardEl = containerEl.querySelector('.battle-card');
  if (!cardEl) return;

  if (!hero) {
    cardEl.dataset.empty = 'true';
    cardEl.classList.remove('battle-card--defeated', 'battle-card--pre-fight');
    cardEl.style.setProperty('--blood-fill', '0%');
    cardEl.innerHTML = `<p class="battle-empty">${emptyText}</p>`;
    return;
  }

  const hpToShow = currentHp ?? hero.maxHp;
  const hpRatio = hero.maxHp > 0 ? Math.max(0, Math.min(1, Number(hpToShow) / hero.maxHp)) : 0;
  const bloodFill = `${Math.round((1 - hpRatio) * 100)}%`;
  const isDefeated = Number(hpToShow) <= 0;
  cardEl.classList.toggle('battle-card--defeated', isDefeated);
  cardEl.style.setProperty('--blood-fill', bloodFill);

  cardEl.dataset.empty = 'false';

  const atkMax = hero.attackPower ?? '-';
  const defMax = hero.defensePower ?? '-';

  const hpBlock = battleHpBlockHtml(hpToShow, hero.maxHp, hpRatio);
  let statsBlock;
  if (rollMode) {
    const attackShown = rollMode.attackRoll != null ? String(rollMode.attackRoll) : '—';
    const defenseShown = rollMode.defenseRoll != null ? String(rollMode.defenseRoll) : '—';
    statsBlock = `
      <div class="battle-card-stats battle-card-stats--rolls battle-card-statline battle-card-statline--rolls">
        <p class="battle-stat-row">
          <strong>Attack roll:</strong>
          <span class="stat-roll-tile" title="1–${atkMax}">${attackShown}</span>
          <span class="stat-roll-range">d${atkMax}</span>
        </p>
        <p class="battle-stat-row">
          <strong>Defense roll:</strong>
          <span class="stat-roll-tile" title="1–${defMax}">${defenseShown}</span>
          <span class="stat-roll-range">d${defMax}</span>
        </p>
      </div>
    `;
  } else {
    statsBlock = `
      <div class="battle-card-stats battle-card-stats--powers">
        <p><strong>Attack Power:</strong> ${atkMax}</p>
        <p><strong>Defense Power:</strong> ${defMax}</p>
      </div>
    `;
  }

  cardEl.classList.toggle('battle-card--pre-fight', !rollMode);

  cardEl.innerHTML = `
    <p class="battle-card-name">${hero.name}</p>
    <div class="battle-card-avatar">
      <img src="${hero.imageUrl}" alt="${hero.name} hero art" />
    </div>
    ${statsBlock}
    ${hpBlock}
  `;
}

async function getHeroes() {
  const response = await fetch('/api/heroes');
  const data = await readJson(response, 'Failed to load heroes.');
  heroes = data.heroes || [];
  return data;
}

async function startBattle() {
  const response = await fetch('/api/battle/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ heroId: selectedHeroId }),
  });
  const data = await readJson(response, 'Failed to start battle.');
  playerHero = data.playerHero ?? getSelectedHero();
  computerHero = data.computerHero ?? null;
  playerHp = data.playerHp;
  computerHp = data.computerHp;

  return data;
}

async function playRound() {
  const response = await fetch('/api/battle/round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await readJson(response, 'Failed to play round.');
  playerHero = data.playerHero || playerHero;
  computerHero = data.computerHero || computerHero;
  playerHp = data.playerHp;
  computerHp = data.computerHp;
  return data;
}

async function resetBattle() {
  const response = await fetch('/api/battle/reset', { method: 'POST' });
  const data = await readJson(response, 'Failed to reset battle.');
  playerHero = null;
  computerHero = null;
  playerHp = 0;
  computerHp = 0;
  return data;
}

function renderHeroes() {
  heroesGrid.innerHTML = '';
  syncStatusPanelVisibility();

  const battleStarted = Boolean(playerHero && computerHero);
  renderBattleCard(playerSlot, playerHero, 'Select a hero below', playerHp, battleStarted
    ? {
        attackRoll: lastRoundRolls?.playerAttack ?? null,
        defenseRoll: lastRoundRolls?.playerDefense ?? null,
      }
    : null);

  const opponentPlaceholder =
    selectedHeroId && !computerHero ? 'Click Start Battle' : '';
  renderBattleCard(computerSlot, computerHero, opponentPlaceholder, computerHp, battleStarted
    ? {
        attackRoll: lastRoundRolls?.computerAttack ?? null,
        defenseRoll: lastRoundRolls?.computerDefense ?? null,
      }
    : null);

  const actionState = getPrimaryActionState();
  primaryActionBtn.textContent = actionState.label;
  primaryActionBtn.disabled = actionState.disabled;
  primaryActionBtn.dataset.action = actionState.action;

  updateNextStepMessage();

  heroes.forEach((hero) => {
    const cardElement = heroTemplate.content.cloneNode(true);
    const article = cardElement.querySelector('.monster-card');
    article.dataset.heroId = String(hero.id);
    const image = cardElement.querySelector('.monster-image');
    image.src = hero.imageUrl;
    image.alt = `${hero.name} hero art`;
    cardElement.querySelector('.monster-name').textContent = hero.name;
    cardElement.querySelector('.stat-attack-power').textContent = hero.attackPower;
    cardElement.querySelector('.stat-defense-power').textContent = hero.defensePower;
    cardElement.querySelector('.stat-max-hp').textContent = hero.maxHp;

    const isSelected = selectedHeroId === hero.id;
    article.classList.toggle('selected', isSelected);

    heroesGrid.appendChild(cardElement);
  });
}

heroesGrid.addEventListener('click', (e) => {
  const article = e.target.closest('.monster-card');
  if (!article || !heroesGrid.contains(article)) return;
  const id = Number(article?.dataset.heroId);
  if (!Number.isFinite(id)) return;
  const hero = heroes.find((h) => h.id === id);
  if (!hero) return;

  selectedHeroId = hero.id;
  playerHero = hero;
  computerHero = null;
  playerHp = hero.maxHp;
  computerHp = 0;
  lastRoundRolls = null;
  statusMessage.textContent = '';
  renderHeroes();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

async function handleRollRound() {
  primaryActionBtn.classList.remove('is-rolling');
  // Force reflow so rapid clicks can retrigger the same animation class.
  void primaryActionBtn.offsetWidth;
  primaryActionBtn.classList.add('is-rolling');

  try {
    const dataPromise = playRound();
    const [data] = await Promise.all([dataPromise, delay(ROLL_SWEEP_MS)]);
    statusMessage.textContent = data.message || 'Round played.';
    if (
      Number.isFinite(data.playerAttackRoll)
      && Number.isFinite(data.playerDefenseRoll)
      && Number.isFinite(data.computerAttackRoll)
      && Number.isFinite(data.computerDefenseRoll)
    ) {
      lastRoundRolls = {
        playerAttack: data.playerAttackRoll,
        playerDefense: data.playerDefenseRoll,
        computerAttack: data.computerAttackRoll,
        computerDefense: data.computerDefenseRoll,
      };
    }
    renderHeroes();
  } catch (error) {
    showStatusError(error);
  } finally {
    setTimeout(() => {
      primaryActionBtn.classList.remove('is-rolling');
    }, 500);
  }
}

async function handleStartBattle() {
  if (!selectedHeroId) {
    statusMessage.textContent = 'Select a hero before starting battle.';
    return;
  }

  try {
    const data = await startBattle();
    statusMessage.textContent = 'Your opponent is ready. Roll to attack!';
    lastRoundRolls = null;
    renderHeroes();
  } catch (error) {
    showStatusError(error);
  }
}

primaryActionBtn.addEventListener('click', async () => {
  if (primaryActionBtn.dataset.action === 'start') {
    await handleStartBattle();
    return;
  }

  await handleRollRound();
});

resetBtn.addEventListener('click', async () => {
  try {
    const data = await resetBattle();
    selectedHeroId = null;
    lastRoundRolls = null;
    statusMessage.textContent = data.message;
    renderHeroes();
  } catch (error) {
    showStatusError(error);
  }
});

async function init() {
  try {
    const name = await checkAuth();
    renderGreeting(name);
    showHideMenuItems(name);
    await getHeroes();
    renderHeroes();
  } catch (error) {
    statusMessage.textContent =
      `${error.message} (Your /api routes still need implementation.)`;
  }
}

init();
