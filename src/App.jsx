import React, { useEffect, useRef, useState } from 'react';
import { Crown, Volume2, VolumeX, Pause, Play, RotateCcw, HelpCircle, Swords, Shield, Zap, Clock3, Maximize2, Smile, ChevronRight, Trophy, MousePointer2, X, Map as MapIcon, Lock, Star, Flag, BarChart3 } from 'lucide-react';
import { RoyalGame } from './game/engine.js';
import { ArenaRenderer } from './game/renderer.js';
import { CARDS, RARITY_COLORS } from './game/data.js';
import { GameAudio } from './game/audio.js';
import { LEVELS, getLevel, loadCampaign, saveCampaign, recordCampaignResult } from './game/levels.js';
import { getTacticalAdvice, getResultInsight } from './game/ai.js';

const EMBLEMS = ['😄', '👍', '😮', '😭', '🔥', '👑'];
const fmt = (seconds) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

function CardArt({ id }) {
  const c = CARDS[id];
  const gid = `bg-${id}`;
  if (id !== 'fireball') return <div className="card-art pixel-card-art" style={{ background: `radial-gradient(circle at 50% 32%, #ffffff55, transparent 48%), linear-gradient(180deg, ${c.color}, #24314d)` }} aria-hidden="true"><img src={`/assets/tiny-swords/portraits/${id}.png`} alt="" /></div>;
  return (
    <svg viewBox="0 0 100 106" className="card-art" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop stopColor={c.color} /><stop offset="1" stopColor="#24314d" /></linearGradient>
        <radialGradient id={`glow-${id}`}><stop stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="100" height="106" rx="14" fill={`url(#${gid})`} />
      <circle cx="50" cy="38" r="42" fill={`url(#glow-${id})`} opacity=".34" />
      <path d="M0 82 Q25 68 50 82 T100 78 V106 H0Z" fill="#15243a" opacity=".35" />
      {id === 'knight' && <g>
        <path d="M27 96 L30 57 Q50 43 70 57 L75 96" fill="#9eadba" stroke="#536577" strokeWidth="3" />
        <path d="M31 68 H70 L73 82 H28Z" fill="#388fd1" />
        <circle cx="50" cy="45" r="22" fill="#f1bd8c" />
        <path d="M28 43 Q26 16 50 17 Q75 17 72 46 L63 35 L58 20 L48 34 L39 22 L36 40Z" fill="#f5d154" />
        <path d="M28 38 Q50 30 72 38 V49 Q50 43 28 49Z" fill="#b9c7d2" stroke="#627485" strokeWidth="2" />
        <path d="M37 43 H63" stroke="#344457" strokeWidth="4" strokeLinecap="round" />
        <path d="M75 83 L88 33 L93 35 L83 86Z" fill="#eef5f4" stroke="#758592" strokeWidth="2" />
        <path d="M75 77 L88 81" stroke="#f0c255" strokeWidth="5" />
        <ellipse cx="27" cy="76" rx="13" ry="19" fill="#3187c6" stroke="#d3e0e5" strokeWidth="3" />
        <path d="M27 62 V90 M17 76 H37" stroke="#d9e4e6" strokeWidth="3" />
      </g>}
      {id === 'archers' && <g>
        <path d="M22 100 Q24 63 49 58 Q73 66 78 100" fill="#3b9bc8" />
        <circle cx="49" cy="45" r="23" fill="#f3c09a" />
        <path d="M25 47 Q19 17 46 14 Q78 11 76 45 L68 63 L61 34 Q43 41 30 30 L32 60Z" fill="#f078af" />
        <circle cx="42" cy="45" r="2.4" fill="#323344" /><circle cx="57" cy="45" r="2.4" fill="#323344" />
        <path d="M45 55 Q50 58 56 54" fill="none" stroke="#b36d67" strokeWidth="2" strokeLinecap="round" />
        <path d="M78 34 Q101 56 78 87" fill="none" stroke="#784927" strokeWidth="5" />
        <path d="M78 34 V87" stroke="#f1ddb1" strokeWidth="1.5" />
        <path d="M47 63 H92" stroke="#e9d4a0" strokeWidth="3" /><path d="M92 63 L84 58 V68Z" fill="#e9edf0" />
      </g>}
      {id === 'giant' && <g>
        <path d="M12 106 Q12 61 50 57 Q89 62 91 106" fill="#d59a67" />
        <path d="M12 84 Q50 70 89 84 V103 H12Z" fill="#597e42" />
        <circle cx="50" cy="42" r="29" fill="#e5af7d" />
        <path d="M22 42 Q22 9 50 11 Q81 12 79 45 Q65 28 52 25 Q38 34 22 42" fill="#b36c3d" />
        <path d="M25 48 Q27 80 50 83 Q76 77 76 47 Q64 59 51 54 Q37 60 25 48" fill="#a85f35" />
        <circle cx="40" cy="41" r="3" fill="#3a2b29" /><circle cx="61" cy="41" r="3" fill="#3a2b29" />
        <path d="M44 49 Q50 52 57 48" fill="none" stroke="#7b4634" strokeWidth="2" />
        <circle cx="10" cy="82" r="16" fill="#e5af7d" /><circle cx="91" cy="82" r="16" fill="#e5af7d" />
      </g>}
      {id === 'fireball' && <g>
        <path d="M12 20 Q45 20 67 49 Q43 31 30 45 Q48 40 58 56" fill="#ffcc56" opacity=".65" />
        <circle cx="59" cy="61" r="35" fill="#ef542c" /><circle cx="59" cy="61" r="27" fill="#ff8c32" /><circle cx="59" cy="61" r="18" fill="#ffd253" /><circle cx="55" cy="55" r="9" fill="#fff2a6" />
        <path d="M25 87 Q9 72 18 53 Q20 72 34 69 Q24 51 40 37 Q32 60 49 64" fill="#ff7933" />
      </g>}
      {id === 'skeletons' && <g>
        {[28, 66].map((x, i) => <g key={x} transform={`translate(${x} ${i ? 9 : 0})`}>
          <path d="M-12 96 L-8 58 L0 48 L9 59 L13 96" fill="#d9d5c8" opacity=".8" />
          <circle cy="43" r="21" fill="#f1eddf" stroke="#bdb9b0" strokeWidth="2" />
          <circle cx="-7" cy="41" r="6" fill="#3d3a49" /><circle cx="7" cy="41" r="6" fill="#3d3a49" />
          <path d="M-3 51 L0 47 L3 51Z" fill="#8d8790" /><path d="M-7 58 H7" stroke="#8d8790" strokeWidth="3" />
        </g>)}
        <path d="M9 83 L2 39 M88 88 L96 48" stroke="#eef2ed" strokeWidth="5" /><path d="M2 39 L-1 50 L8 46Z M96 48 L88 53 L96 59Z" fill="#dce7e9" />
      </g>}
      {id === 'prince' && <g>
        <path d="M7 106 Q4 64 28 54 Q55 47 83 64 L98 103" fill="#ecece4" />
        <path d="M68 65 Q73 33 91 37 Q104 47 90 67" fill="#f4f1e7" /><circle cx="91" cy="48" r="3" fill="#30323c" />
        <path d="M28 93 L24 42 Q42 24 61 42 L67 88" fill="#8264b4" stroke="#bfc9d2" strokeWidth="4" />
        <circle cx="45" cy="35" r="19" fill="#c2ccd4" /><path d="M26 33 Q45 22 64 33 V41 H26Z" fill="#718091" />
        <path d="M32 20 L45 -2 L58 20" fill="#a67bd0" /><path d="M35 36 H55" stroke="#303d4b" strokeWidth="4" />
        <path d="M47 67 L92 13" stroke="#dab55c" strokeWidth="7" /><path d="M92 13 L82 17 L90 27Z" fill="#f1f3ed" />
      </g>}
      {id === 'witch' && <g>
        <path d="M16 106 Q20 60 49 52 Q81 60 85 106" fill="#51357e" />
        <path d="M20 86 Q50 72 81 87 L84 99 H17Z" fill="#9c55bc" />
        <circle cx="49" cy="43" r="22" fill="#c5a2c7" />
        <path d="M26 50 Q18 17 46 13 Q78 12 75 52 L66 72 L62 32 Q42 38 31 28 L34 67Z" fill="#30273f" />
        <circle cx="42" cy="43" r="3" fill="#f082ff" /><circle cx="57" cy="43" r="3" fill="#f082ff" />
        <path d="M44 54 Q50 57 55 53" fill="none" stroke="#805573" strokeWidth="2" />
        <path d="M81 99 L87 22" stroke="#60452f" strokeWidth="5" />
        <circle cx="88" cy="20" r="15" fill="#a24de0" opacity=".35" /><circle cx="88" cy="20" r="9" fill="#d570ff" /><circle cx="85" cy="17" r="4" fill="#f2c2ff" />
      </g>}
      {id === 'hog' && <g>
        <path d="M2 106 Q0 70 28 56 Q65 45 89 69 L102 103" fill="#a76a4b" />
        <circle cx="79" cy="67" r="24" fill="#bd7a56" /><ellipse cx="91" cy="74" rx="15" ry="11" fill="#dc9c76" />
        <circle cx="87" cy="73" r="2.5" fill="#55372e" /><circle cx="96" cy="73" r="2.5" fill="#55372e" /><circle cx="82" cy="58" r="3" fill="#342d2b" />
        <path d="M25 83 L28 36 Q45 24 62 41 L63 78" fill="#477eaa" />
        <circle cx="44" cy="32" r="20" fill="#c98e6a" /><path d="M25 32 Q25 8 46 10 Q65 12 64 31 Q44 20 25 32" fill="#3c2d2b" />
        <path d="M35 36 H54" stroke="#3e3030" strokeWidth="3" /><path d="M37 44 Q45 48 52 42" fill="none" stroke="#844f44" strokeWidth="2" />
        <path d="M51 58 L73 30" stroke="#684832" strokeWidth="6" /><rect x="64" y="20" width="23" height="16" rx="4" fill="#748087" stroke="#aeb8b9" strokeWidth="2" transform="rotate(-20 75 28)" />
      </g>}
    </svg>
  );
}

function Crowns({ count, side }) {
  return <div className={`crowns ${side}`} aria-label={`${count} 皇冠`}>{[0, 1, 2].map((i) => <Crown key={i} size={17} fill={i < count ? 'currentColor' : 'none'} className={i < count ? 'earned' : ''} />)}</div>;
}

function CardButton({ id, index, selected, disabled, onSelect, onPointerDown }) {
  const c = CARDS[id];
  return (
    <button className={`game-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} onClick={() => onSelect(index)} onPointerDown={(e) => onPointerDown(index, e)} aria-label={`${c.name}，消耗 ${c.cost} 圣水`}>
      <div className="card-level">9 级</div>
      <CardArt id={id} />
      <div className="card-name">{c.name}</div>
      <div className="card-cost"><span className="elixir-drop" />{c.cost}</div>
      <div className="rarity-line" style={{ background: RARITY_COLORS[c.rarity] }} />
    </button>
  );
}

function TowerPanel({ game }) {
  const sides = [{ id: 'enemy', name: '敌方皇家塔', className: 'red' }, { id: 'player', name: '己方皇家塔', className: 'blue' }];
  return <div className="tower-panel-list">{sides.map((side) => <div className="tower-side" key={side.id}>
    <div className="panel-label"><span className={`team-dot ${side.className}`} />{side.name}</div>
    {game.towers.filter((t) => t.side === side.id).sort((a, b) => a.kind === 'king' ? -1 : b.kind === 'king' ? 1 : a.x - b.x).map((t) => <div className="tower-hp" key={t.id}>
      <span>{t.kind === 'king' ? '国王塔' : `${t.x < 180 ? '左' : '右'}公主塔`}</span><b>{Math.ceil(t.hp)}</b>
      <div className="mini-bar"><i className={side.className} style={{ width: `${t.hp / t.maxHp * 100}%` }} /></div>
    </div>)}
  </div>)}</div>;
}

function LevelSelect({ selectedId, campaign, onSelect, onStart, onClose }) {
  const selected = getLevel(selectedId);
  const totalStars = Object.values(campaign.stars).reduce((sum, value) => sum + Number(value || 0), 0);
  return <div className="modal-backdrop" onClick={onClose}><div className="level-modal" onClick={(event) => event.stopPropagation()}>
    <button className="modal-close" onClick={onClose} aria-label="关闭关卡选择"><X size={20} /></button>
    <div className="modal-title"><MapIcon size={28} /><div><h2>皇家战役</h2><span>10 个关卡 · 逐步掌握竞技场战术</span></div></div>
    <div className="campaign-progress"><span>战役进度 <b>{campaign.unlocked} / 10</b></span><span><Crown size={14} fill="currentColor" /> {totalStars} / 30</span></div>
    <div className="level-grid">{LEVELS.map((level) => {
      const locked = level.id > campaign.unlocked;
      const stars = campaign.stars[level.id] || 0;
      return <button key={level.id} className={`level-card ${selectedId === level.id ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => onSelect(level.id)}>
        <span className="level-number">{locked ? <Lock size={16} /> : String(level.id).padStart(2, '0')}</span>
        <div className="level-copy"><span>{level.title}</span><h3>{level.name}</h3><p>{locked ? '完成前一关后解锁' : `${level.opponent} · ${level.lesson}`}</p></div>
        <div className="level-stars">{[0, 1, 2].map((index) => <Star key={index} size={12} fill={index < stars ? 'currentColor' : 'none'} className={index < stars ? 'earned' : ''} />)}</div>
      </button>;
    })}</div>
    <div className="level-brief"><Flag size={18} /><div><b>第 {selected.id} 关 · {selected.opponent}</b><p>{selected.briefing}</p></div></div>
    <button className="primary-button" onClick={() => onStart(selected.id)}><Swords size={18} />进入第 {selected.id} 关<ChevronRight size={18} /></button>
  </div></div>;
}

export default function App() {
  const audioRef = useRef(new GameAudio());
  const toastTimer = useRef(null);
  const gameRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const selectedRef = useRef(null);
  const pointerRef = useRef(null);
  const draggingRef = useRef(false);
  const emoteRef = useRef(null);
  const [, setVersion] = useState(0);
  const [selected, setSelected] = useState(null);
  const [sound, setSound] = useState(true);
  const [help, setHelp] = useState(false);
  const [emotesOpen, setEmotesOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [ui, setUi] = useState(null);
  const [campaign, setCampaign] = useState(loadCampaign);
  const [selectedLevel, setSelectedLevel] = useState(campaign.unlocked);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const recordedBattle = useRef(null);

  if (!gameRef.current) {
    gameRef.current = new RoyalGame((event) => {
      if (event.type === 'error') {
        setToast(event.message); audioRef.current.play('error');
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 1400);
      } else audioRef.current.play(event.type);
    });
  }
  const game = gameRef.current;
  selectedRef.current = selected;

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 360 * dpr; canvas.height = 640 * dpr;
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const renderer = new ArenaRenderer();
    let last = performance.now(), uiClock = 0;
    const loop = (now) => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      game.update(dt);
      if (emoteRef.current) { emoteRef.current.t -= dt; if (emoteRef.current.t <= 0) emoteRef.current = null; }
      renderer.draw(ctx, game, selectedRef.current == null ? null : game.hands.player[selectedRef.current], pointerRef.current, emoteRef.current);
      uiClock += dt;
      if (uiClock > .1) {
        uiClock = 0;
        setUi({ status: game.status, timeLeft: game.timeLeft, elixir: game.elixir.player, crowns: { ...game.crowns }, hand: [...game.hands.player], next: game.getNextCard('player'), overtime: game.overtime, double: game.doubleElixir, winner: game.winner, reason: game.endReason, advice: getTacticalAdvice(game), aiPlan: game.aiPlans.enemy });
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [game]);

  useEffect(() => {
    if (ui?.status !== 'ended' || recordedBattle.current === game.battleMark) return;
    recordedBattle.current = game.battleMark;
    setCampaign((previous) => {
      const next = recordCampaignResult(previous, game);
      saveCampaign(next);
      return next;
    });
  }, [ui?.status, game]);

  const coords = (clientX, clientY) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width * 360, y: (clientY - r.top) / r.height * 640, inside: clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom };
  };

  const deploy = (clientX, clientY, handIndex = selectedRef.current) => {
    if (handIndex == null) return false;
    const p = coords(clientX, clientY);
    if (!p.inside) return false;
    const ok = game.useCard('player', handIndex, p.x, p.y);
    if (ok) { setSelected(null); pointerRef.current = null; }
    setVersion((v) => v + 1);
    return ok;
  };

  useEffect(() => {
    const move = (e) => { if (!draggingRef.current) return; const p = coords(e.clientX, e.clientY); pointerRef.current = p.inside ? p : null; };
    const up = (e) => { if (!draggingRef.current) return; draggingRef.current = false; deploy(e.clientX, e.clientY); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, []);

  const selectCard = (index) => {
    if (game.status !== 'playing') return;
    audioRef.current.play('click');
    setSelected(index);
  };
  const cardPointerDown = (index, e) => {
    if (game.status !== 'playing') return;
    e.preventDefault(); selectedRef.current = index; setSelected(index); draggingRef.current = true;
  };
  const start = (levelId = selectedLevel) => { audioRef.current.init(); game.start(levelId); setSelectedLevel(levelId); setLevelsOpen(false); setSelected(null); setEmotesOpen(false); recordedBattle.current = null; setVersion((v) => v + 1); };
  const sendEmote = (emoji) => {
    emoteRef.current = { emoji, side: 'player', t: 2.6 }; setEmotesOpen(false); audioRef.current.play('click');
    setTimeout(() => { if (game.status === 'playing' && Math.random() > .35) emoteRef.current = { emoji: EMBLEMS[Math.floor(Math.random() * EMBLEMS.length)], side: 'enemy', t: 2.4 }; }, 1200);
  };
  const toggleSound = () => { audioRef.current.enabled = !sound; setSound(!sound); if (!sound) audioRef.current.play('click'); };
  const fullscreen = () => { document.querySelector('.battle-column')?.requestFullscreen?.(); };

  const hand = ui?.hand || game.hands.player;
  const selectedId = selected == null ? hand[0] : hand[selected];
  const selectedCard = CARDS[selectedId];
  const level = game.status === 'idle' ? getLevel(selectedLevel) : game.level;
  const mainLane = game.stats.player.laneDamage[1] > game.stats.player.laneDamage[0] ? '右路' : '左路';

  return <div className="app">
    <div className="sky-decor cloud-one" /><div className="sky-decor cloud-two" />
    <header className="topbar">
      <div className="brand"><div className="brand-shield"><Crown size={23} fill="currentColor" /></div><div><h1>皇室竞技场</h1><span>ROYAL ARENA</span></div></div>
      <div className="top-actions">
        <span className="fan-label">像素场地 · 高清城楼 · Tiny Swords 角色</span>
        <button className="icon-button" onClick={() => setHelp(true)} title="玩法说明"><HelpCircle size={19} /></button>
        <button className="icon-button" onClick={toggleSound} title="声音">{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button>
        <button className="icon-button desktop-only" onClick={fullscreen} title="全屏"><Maximize2 size={18} /></button>
      </div>
    </header>

    <main className="game-layout">
      <aside className="side-panel left-panel">
        <div className="panel-heading"><Shield size={16} /> 皇家塔状态</div>
        <TowerPanel game={game} />
        <div className="panel-divider" />
        <div className="panel-heading"><Zap size={16} /> 卡牌详情</div>
        {selectedCard && <div className="card-inspector">
          <div className="inspector-title"><b>{selectedCard.name}</b><span style={{ color: RARITY_COLORS[selectedCard.rarity] }}>{selectedCard.rarity}</span></div>
          <div className="inspector-role">{selectedCard.role} · {selectedCard.cost} 圣水</div>
          <p>{selectedCard.description}</p>
          {selectedCard.type === 'troop' ? <div className="stat-grid"><span>生命值<b>{selectedCard.hp}</b></span><span>伤害<b>{selectedCard.damage}</b></span><span>攻速<b>{selectedCard.hitSpeed} 秒</b></span><span>数量<b>{selectedCard.count}</b></span></div> : <div className="stat-grid"><span>范围伤害<b>{selectedCard.damage}</b></span><span>对塔伤害<b>{selectedCard.towerDamage}</b></span></div>}
        </div>}
      </aside>

      <section className="battle-column">
        <div className="versus-bar">
          <div className="player-badge enemy"><div className="avatar red"><Crown size={17} /></div><div><b>{level.opponent}</b><span>第 {level.id} 关 · {level.title}</span></div></div>
          <div className={`match-clock ${ui?.timeLeft < 30 ? 'urgent' : ''}`}><Clock3 size={14} /><b>{fmt(ui?.timeLeft ?? 180)}</b><span>{ui?.overtime ? '加时赛' : ui?.double ? '双倍圣水' : '常规赛'}</span></div>
          <div className="player-badge player"><div><b>挑战者</b><span>9 级 · 你</span></div><div className="avatar blue"><Swords size={17} /></div></div>
        </div>

        <div className="arena-frame">
          <canvas ref={canvasRef} className={`arena-canvas ${selected != null ? 'placing' : ''}`}
            onPointerMove={(e) => { const p = coords(e.clientX, e.clientY); pointerRef.current = p; }}
            onPointerLeave={() => { if (!draggingRef.current) pointerRef.current = null; }}
            onClick={(e) => { if (!draggingRef.current) deploy(e.clientX, e.clientY); }} />
          <div className="enemy-crowns"><Crowns count={ui?.crowns.enemy || 0} side="enemy" /></div>
          <div className="player-crowns"><Crowns count={ui?.crowns.player || 0} side="player" /></div>
          {toast && <div className="battle-toast">{toast}</div>}
          {game.status === 'idle' && <div className="arena-overlay start-overlay">
            <div className="start-emblem"><Crown size={42} fill="currentColor" /><Swords size={34} /></div>
            <div className="eyebrow">ROYAL CAMPAIGN · {level.id} / 10</div>
            <h2>{level.name}</h2><p>{level.briefing}</p>
            <div className="mode-pill"><span className="live-dot" />{level.opponent} · {level.lesson}</div>
            <button className="primary-button" onClick={() => start()}><Swords size={20} />开始第 {level.id} 关<ChevronRight size={19} /></button>
            <div className="overlay-link-row"><button className="text-button" onClick={() => setLevelsOpen(true)}><MapIcon size={13} />选择关卡</button><button className="text-button" onClick={() => setHelp(true)}>玩法说明</button></div>
          </div>}
          {game.status === 'ended' && <div className="arena-overlay result-overlay">
            <div className={`result-icon ${game.winner}`}><Trophy size={38} /></div>
            <div className="eyebrow">LEVEL {level.id} · BATTLE COMPLETE</div>
            <h2>{game.winner === 'player' ? '胜利！' : game.winner === 'enemy' ? '惜败' : '平局'}</h2>
            <div className="result-crowns"><Crown size={29} fill="currentColor" /><b>{ui?.crowns.player || 0}</b><span>:</span><b>{ui?.crowns.enemy || 0}</b><Crown size={29} fill="currentColor" /></div>
            <p className="result-reason">{ui?.reason || game.endReason}</p>
            <div className="result-stats"><div className="result-stat-head"><span><BarChart3 size={12} />本场数据</span><b>你</b><b>对手</b></div>
              <div><span>出牌 / 圣水</span><b>{game.stats.player.cards} / {game.stats.player.elixir}</b><b>{game.stats.enemy.cards} / {game.stats.enemy.elixir}</b></div>
              <div><span>总伤害</span><b>{Math.round(game.stats.player.damage)}</b><b>{Math.round(game.stats.enemy.damage)}</b></div>
              <div><span>皇家塔伤害</span><b>{Math.round(game.stats.player.towerDamage)}</b><b>{Math.round(game.stats.enemy.towerDamage)}</b></div>
            </div>
            <p className="result-insight"><b>主攻{mainLane}</b> · {getResultInsight(game)}</p>
            {game.winner === 'player' && level.id < 10 ? <button className="primary-button" onClick={() => start(level.id + 1)}>进入下一关<ChevronRight size={19} /></button> : <button className="primary-button" onClick={() => start()}><RotateCcw size={19} />再战一场</button>}
            <div className="overlay-link-row"><button className="text-button" onClick={() => setLevelsOpen(true)}><MapIcon size={13} />战役地图</button>{game.winner === 'player' && level.id < 10 && <button className="text-button" onClick={() => start()}><RotateCcw size={12} />重玩本关</button>}</div>
          </div>}
        </div>

        <div className="control-dock">
          <div className="dock-topline">
            <div className="next-card"><span>下一张</span><div title={CARDS[ui?.next || game.getNextCard('player')]?.name}><CardArt id={ui?.next || game.getNextCard('player') || 'knight'} /></div></div>
            <div className="hand">{hand.map((id, i) => <CardButton key={`${i}-${id}`} id={id} index={i} selected={selected === i} disabled={(ui?.elixir ?? 5) < CARDS[id].cost || game.status !== 'playing'} onSelect={selectCard} onPointerDown={cardPointerDown} />)}</div>
            <div className="dock-actions">
              <button className="small-action" onClick={() => setEmotesOpen(!emotesOpen)} title="表情"><Smile size={19} /></button>
              <button className="small-action" onClick={() => { game.togglePause(); setVersion((v) => v + 1); }} disabled={!['playing', 'paused'].includes(game.status)} title="暂停">{game.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}</button>
            </div>
            {emotesOpen && <div className="emote-menu">{EMBLEMS.map((e) => <button key={e} onClick={() => sendEmote(e)}>{e}</button>)}</div>}
          </div>
          <div className="elixir-row"><Zap size={16} fill="currentColor" /><div className="elixir-track"><div className="elixir-fill" style={{ width: `${(ui?.elixir ?? 5) * 10}%` }} /><div className="elixir-segments">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</div></div><b>{Math.floor(ui?.elixir ?? 5)}</b><span>/ 10</span>{ui?.double && <em>2×</em>}</div>
          <div className="play-hint"><MousePointer2 size={12} />{selected == null ? '选择卡牌，然后点击己方区域部署' : `已选择「${CARDS[hand[selected]]?.name}」，点击战场部署`}</div>
        </div>
      </section>

      <aside className="side-panel right-panel">
        <div className="panel-heading"><Swords size={16} /> 对战动态</div>
        <div className="battle-log">{game.log.map((entry, i) => <div className={`log-entry ${entry.side}`} key={`${entry.t}-${i}`}><span className="log-dot" /><div><b>{entry.text}</b><span>{entry.side === 'system' ? '系统播报' : `${Math.floor(entry.t / 60)}:${String(Math.floor(entry.t % 60)).padStart(2, '0')} · ${entry.side === 'player' ? '己方' : '敌方'}`}</span></div></div>)}</div>
        <div className="panel-divider" />
        <div className="panel-heading"><Flag size={16} /> 第 {level.id} 关 · {level.title}</div>
        <div className="objective"><Crown size={22} /><p>{level.name}<br /><span>{level.lesson}</span></p></div>
        <div className="tips"><b>实时战术提示</b><p>{ui?.advice || level.briefing}</p></div>
        <div className="ai-plan"><span className="team-dot red" /><div><b>对手战术</b><p>{ui?.aiPlan || '观察局势'}</p></div></div>
      </aside>
    </main>

    {levelsOpen && <LevelSelect selectedId={selectedLevel} campaign={campaign} onSelect={setSelectedLevel} onStart={start} onClose={() => setLevelsOpen(false)} />}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><div className="help-modal" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setHelp(false)}><X size={20} /></button>
      <div className="modal-title"><Crown size={28} /><div><h2>竞技场作战指南</h2><span>三分钟，见证真正的战术大师</span></div></div>
      <div className="help-grid">
        <div><span className="step">01</span><h3>积攒圣水</h3><p>圣水会自动恢复，上限为 10 点。最后 60 秒进入双倍圣水。</p></div>
        <div><span className="step">02</span><h3>部署卡牌</h3><p>点击或拖拽卡牌至己方半场。法术可以投放到战场任意位置。</p></div>
        <div><span className="step">03</span><h3>攻破皇家塔</h3><p>部队会自动寻路、过河和作战。摧毁更多塔，或直接击倒国王塔。</p></div>
        <div><span className="step">04</span><h3>把握克制</h3><p>坦克吸收伤害，远程后排输出，人海克制单体，火球清理集群。</p></div>
      </div>
      <div className="help-note"><b>平局怎么办？</b> 常规时间皇冠相同会进入 60 秒突然死亡加时；下一座被摧毁的塔决定胜负。</div>
      <button className="primary-button" onClick={() => setHelp(false)}>明白了，开始战斗</button>
    </div></div>}
  </div>;
}
