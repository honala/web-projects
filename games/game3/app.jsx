const { useState, useEffect, useRef } = React;
const ENEMIES = [
  { name: "骷髅战士", emoji: "💀", hp: 40, maxHp: 40, atk: 8, def: 2, reward: 30, lvl: 1, abilities: ["普通攻击", "骨裂击"] },
  { name: "火焰精灵", emoji: "🔥", hp: 60, maxHp: 60, atk: 12, def: 4, reward: 55, lvl: 2, abilities: ["普通攻击", "火焰喷射"] },
  { name: "暗影刺客", emoji: "🗡️", hp: 80, maxHp: 80, atk: 18, def: 6, reward: 80, lvl: 3, abilities: ["普通攻击", "毒刃", "暗影闪现"] },
  { name: "冰霜巨人", emoji: "🧊", hp: 120, maxHp: 120, atk: 22, def: 10, reward: 120, lvl: 4, abilities: ["普通攻击", "冰风暴", "冻结"] },
  { name: "深渊龙王", emoji: "🐲", hp: 200, maxHp: 200, atk: 30, def: 15, reward: 300, lvl: 5, abilities: ["普通攻击", "龙息", "黑暗结界", "虚空撕裂"] },
];

const SPELLS = [
  { id: "fireball", name: "火球术", emoji: "🔥", manaCost: 15, dmgMin: 20, dmgMax: 35, color: "#ff6b35", desc: "灼烧敌人" },
  { id: "ice", name: "冰锥术", emoji: "❄️", manaCost: 12, dmgMin: 15, dmgMax: 25, color: "#74d7f7", desc: "有概率冻结" },
  { id: "lightning", name: "闪电链", emoji: "⚡", manaCost: 20, dmgMin: 30, dmgMax: 45, color: "#f7e274", desc: "强力雷击" },
  { id: "drain", name: "生命汲取", emoji: "💜", manaCost: 18, dmgMin: 18, dmgMax: 28, color: "#b57aff", desc: "造成伤害并回复生命" },
  { id: "heal", name: "神圣治愈", emoji: "✨", manaCost: 25, healMin: 30, healMax: 50, color: "#7fff9a", desc: "恢复大量生命值", isHeal: true },
  { id: "shield", name: "魔法护盾", emoji: "🛡️", manaCost: 20, color: "#a0c4ff", desc: "本回合减免50%伤害", isShield: true },
  { id: "meditate", name: "冥想", emoji: "🔮", manaCost: 0, color: "#cc99ff", desc: "跳过攻击，回复40法力", isMeditate: true },
];

const initPlayer = () => ({ hp: 100, maxHp: 100, mana: 80, maxMana: 80, def: 5, xp: 0, xpToNext: 100, level: 1, gold: 0, shielded: false, frozen: 0, poisoned: 0 });

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function ArcaneRPG() {
  const [player, setPlayer] = useState(initPlayer());
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [enemy, setEnemy] = useState({ ...ENEMIES[0] });
  const [log, setLog] = useState(["⚗️ 你踏入了古老的魔法迷宫……", "💀 骷髅战士挡住了你的去路！"]);
  const [phase, setPhase] = useState("player"); // player | enemy | win | lose | between
  const [animating, setAnimating] = useState(null);
  const [shake, setShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [particles, setParticles] = useState([]);
  const logRef = useRef(null);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const addLog = (msg) => setLog(prev => [...prev.slice(-30), msg]);

  const spawnParticles = (color, count = 8) => {
    const ps = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, color,
      x: rand(20, 80), y: rand(20, 70),
      dx: rand(-60, 60), dy: rand(-80, -20),
    }));
    setParticles(ps);
    setTimeout(() => setParticles([]), 900);
  };

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };
  const triggerPlayerShake = () => { setPlayerShake(true); setTimeout(() => setPlayerShake(false), 400); };

  const handleSpell = (spell) => {
    if (phase !== "player" || animating) return;
    if (player.mana < spell.manaCost) { addLog(`💧 法力不足！需要 ${spell.manaCost} 点法力`); return; }
    if (player.frozen > 0) { addLog("🧊 你被冻结了，无法行动！"); enemyTurn(player); return; }

    setAnimating(spell.id);
    let newPlayer = { ...player, mana: player.mana - spell.manaCost, shielded: false };
    let newEnemy = { ...enemy };

    if (spell.isMeditate) {
      const manaRestore = 40;
      newPlayer.mana = Math.min(newPlayer.maxMana, newPlayer.mana + manaRestore);
      addLog(`🔮 冥想聚气，恢复了 ${manaRestore} 点法力！`);
      spawnParticles(spell.color);
      setPlayer(newPlayer);
      setTimeout(() => { setAnimating(null); enemyTurn(newPlayer); }, 600);
      return;
    }

    if (spell.isHeal) {
      const heal = rand(spell.healMin, spell.healMax);
      newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
      addLog(`${spell.emoji} 神圣之光降临，恢复了 ${heal} 点生命！`);
      spawnParticles(spell.color);
    } else if (spell.isShield) {
      newPlayer.shielded = true;
      addLog(`${spell.emoji} 魔法护盾成型，本回合减免伤害！`);
      spawnParticles(spell.color);
    } else {
      const rawDmg = rand(spell.dmgMin, spell.dmgMax);
      const dmg = Math.max(1, rawDmg - newEnemy.def);
      newEnemy.hp = Math.max(0, newEnemy.hp - dmg);
      addLog(`${spell.emoji} ${spell.name}！对 ${enemy.name} 造成 ${dmg} 点伤害！`);
      triggerShake();
      spawnParticles(spell.color);

      if (spell.id === "ice" && Math.random() < 0.3) { addLog("❄️ 敌人被冻结！连续两回合无法攻击！"); newEnemy.frozen = 2; }
      if (spell.id === "drain") {
        const steal = Math.floor(dmg * 0.5);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + steal);
        addLog(`💜 汲取了 ${steal} 点生命！`);
      }
    }

    if (newEnemy.hp <= 0) {
      setTimeout(() => {
        setAnimating(null);
        const xpGain = enemy.reward;
        const goldGain = rand(10, 30);
        let p = { ...newPlayer, xp: newPlayer.xp + xpGain, gold: newPlayer.gold + goldGain };
        let leveled = false;
        while (p.xp >= p.xpToNext) {
          p.xp -= p.xpToNext;
          p.level += 1;
          p.xpToNext = Math.floor(p.xpToNext * 1.5);
          p.maxHp += 15; p.hp = p.maxHp;
          p.maxMana += 10; p.mana = p.maxMana;
          p.def += 1;
          leveled = true;
        }
        if (leveled) addLog(`🌟 升级了！达到 ${p.level} 级！生命和法力全满！`);
        addLog(`🏆 击败了 ${enemy.name}！获得 ${xpGain} 经验 和 ${goldGain} 金币！`);
        setPlayer(p);
        if (enemyIdx + 1 >= ENEMIES.length) { setPhase("win"); }
        else { setPhase("between"); setEnemy({ ...ENEMIES[enemyIdx + 1] }); setEnemyIdx(i => i + 1); }
      }, 600);
      return;
    }

    setPlayer(newPlayer);
    setEnemy(newEnemy);
    setTimeout(() => { setAnimating(null); enemyTurn(newPlayer, newEnemy); }, 700);
  };

  const enemyTurn = (currentPlayer, currentEnemy) => {
    const e = currentEnemy || enemy;
    setPhase("enemy");
    setTimeout(() => {
      let newPlayer = { ...currentPlayer };
      let frozen = e.frozen > 0;
      let newEnemy = { ...e, frozen: Math.max(0, e.frozen - 1) };

      if (frozen) {
        addLog(`❄️ ${e.name} 被冻结，无法行动！`);
      } else {
        const abilityIdx = rand(0, e.abilities.length - 1);
        const ability = e.abilities[abilityIdx];
        let dmg = Math.max(1, e.atk + rand(-3, 3) - newPlayer.def);
        if (newPlayer.shielded) { dmg = Math.floor(dmg * 0.5); addLog("🛡️ 护盾减半了伤害！"); }

        if (ability === "毒刃") { newPlayer.poisoned = 3; addLog(`🗡️ ${e.name} 使用了毒刃！你中毒了！`); dmg = Math.floor(dmg * 0.7); }
        else if (ability === "冻结") { addLog(`🧊 ${e.name} 冻结咒！你下回合无法行动！`); newPlayer.frozen = 1; dmg = 5; }
        else if (ability === "龙息") { dmg = Math.floor(e.atk * 1.8); addLog(`🐲 ${e.name} 喷出了毁灭龙息！`); }
        else if (ability === "黑暗结界") { newPlayer.def = Math.max(0, newPlayer.def - 2); dmg = 10; addLog(`🌑 黑暗结界削弱了你的防御！`); }
        else { addLog(`⚔️ ${e.name} 使用了${ability}，造成 ${dmg} 点伤害！`); }

        newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
        triggerPlayerShake();
        spawnParticles("#ff4444", 6);
      }

      if (newPlayer.poisoned > 0) {
        const poisonDmg = 8;
        newPlayer.hp = Math.max(0, newPlayer.hp - poisonDmg);
        newPlayer.poisoned -= 1;
        addLog(`☠️ 毒素侵蚀，损失 ${poisonDmg} 点生命！（剩余 ${newPlayer.poisoned} 回合）`);
      }
      if (newPlayer.frozen > 0) addLog(`🧊 你被冻结！（剩余 ${newPlayer.frozen} 回合）`);
      newPlayer.frozen = Math.max(0, newPlayer.frozen - 1);
      newPlayer.mana = Math.min(newPlayer.maxMana, newPlayer.mana + 12);

      setEnemy(newEnemy);
      if (newPlayer.hp <= 0) { setPlayer({ ...newPlayer, hp: 0 }); setPhase("lose"); return; }
      setPlayer(newPlayer);
      setPhase("player");
    }, 800);
  };

  const restart = () => {
    setPlayer(initPlayer());
    setEnemyIdx(0);
    setEnemy({ ...ENEMIES[0] });
    setLog(["⚗️ 新的冒险开始了……", "💀 骷髅战士挡住了你的去路！"]);
    setPhase("player");
  };

  const pct = (v, m) => Math.max(0, Math.min(100, (v / m) * 100));

  const Bar = ({ value, max, color, bg = "#1a1a2e" }) => (
    <div style={{ background: bg, borderRadius: 4, height: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ width: `${pct(value, max)}%`, height: "100%", background: color, transition: "width 0.4s ease", borderRadius: 4 }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 20% 20%, #0d0020 0%, #050010 50%, #000510 100%)", fontFamily: "'Crimson Text', Georgia, serif", color: "#e8d5b7", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 16px", position: "relative", overflow: "hidden" }}>
      
      {/* Stars background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} style={{ position: "absolute", width: rand(1,3), height: rand(1,3), borderRadius: "50%", background: "white", opacity: Math.random() * 0.6 + 0.2, top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animation: `twinkle ${rand(2,5)}s ease-in-out infinite`, animationDelay: `${Math.random()*4}s` }} />
        ))}
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} style={{ position: "fixed", left: `${p.x}%`, top: `${p.y}%`, width: 8, height: 8, borderRadius: "50%", background: p.color, pointerEvents: "none", zIndex: 100, boxShadow: `0 0 10px ${p.color}`, animation: "particle 0.8s ease-out forwards", "--dx": `${p.dx}px`, "--dy": `${p.dy}px` }} />
      ))}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.9} }
        @keyframes particle { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 10px #7b2fff44} 50%{box-shadow:0 0 25px #7b2fff88} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes levelup { 0%{transform:scale(1)} 50%{transform:scale(1.1)} 100%{transform:scale(1)} }
        .spell-btn:hover { transform: translateY(-3px) scale(1.03); filter: brightness(1.2); }
        .spell-btn:active { transform: scale(0.97); }
        .spell-btn { transition: all 0.18s ease; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #7b2fff66; border-radius: 2px; }
      `}</style>

      {/* Title */}
      <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: "clamp(16px,4vw,26px)", color: "#d4a853", textShadow: "0 0 20px #d4a85388, 0 2px 4px #000", marginBottom: 20, letterSpacing: 3, zIndex: 1 }}>
        ✦ 奥术迷宫 ✦
      </div>

      {/* Main layout */}
      <div style={{ width: "100%", maxWidth: 680, zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* Combatants */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          
          {/* Player */}
          <div style={{ background: "linear-gradient(135deg, #0d1b3e88, #1a0d3e88)", border: "1px solid #3a2d6e", borderRadius: 12, padding: "14px 16px", backdropFilter: "blur(10px)", animation: playerShake ? "shake 0.4s ease" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 28, animation: "float 3s ease-in-out infinite" }}>🧙</div>
              <div>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 12, color: "#a07cff" }}>法师</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>Lv.{player.level} · {player.gold}🪙</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#cc8888", marginBottom: 3 }}>
              <span>❤️ 生命</span><span>{player.hp}/{player.maxHp}</span>
            </div>
            <Bar value={player.hp} max={player.maxHp} color="linear-gradient(90deg,#c2185b,#e91e63)" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7ab3ff", margin: "8px 0 3px" }}>
              <span>💧 法力</span><span>{player.mana}/{player.maxMana}</span>
            </div>
            <Bar value={player.mana} max={player.maxMana} color="linear-gradient(90deg,#1565c0,#42a5f5)" />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#a0c8a0", margin: "8px 0 3px" }}>
              <span>⭐ 经验</span><span>{player.xp}/{player.xpToNext}</span>
            </div>
            <Bar value={player.xp} max={player.xpToNext} color="linear-gradient(90deg,#2e7d32,#66bb6a)" />
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {player.shielded && <span style={{ fontSize: 10, background: "#1a3a6a", padding: "2px 6px", borderRadius: 4, color: "#74b3ff" }}>🛡️ 护盾</span>}
              {player.frozen > 0 && <span style={{ fontSize: 10, background: "#0d2a3a", padding: "2px 6px", borderRadius: 4, color: "#74d7f7" }}>❄️ 冻结{player.frozen}</span>}
              {player.poisoned > 0 && <span style={{ fontSize: 10, background: "#1a2a0d", padding: "2px 6px", borderRadius: 4, color: "#a5d67a" }}>☠️ 中毒{player.poisoned}</span>}
            </div>
          </div>

          {/* Enemy */}
          <div style={{ background: "linear-gradient(135deg, #2a0d0d88, #1a0a0a88)", border: "1px solid #6e2d2d", borderRadius: 12, padding: "14px 16px", backdropFilter: "blur(10px)", animation: shake ? "shake 0.4s ease" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 28, animation: "float 2.5s ease-in-out infinite" }}>{enemy.emoji}</div>
              <div>
                <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 11, color: "#ff7070" }}>{enemy.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>难度 Lv.{enemy.lvl}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#cc6666", marginBottom: 3 }}>
              <span>❤️ 生命</span><span>{enemy.hp}/{enemy.maxHp}</span>
            </div>
            <Bar value={enemy.hp} max={enemy.maxHp} color="linear-gradient(90deg,#7f0000,#f44336)" />
            <div style={{ marginTop: 10, fontSize: 11, color: "#aa8888" }}>
              ⚔️ 攻击 {enemy.atk} · 🛡 防御 {enemy.def}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: "#886666" }}>
              技能: {enemy.abilities.join(" · ")}
            </div>
            {enemy.frozen > 0 && <span style={{ marginTop: 6, display: "inline-block", fontSize: 10, background: "#0d2a3a", padding: "2px 6px", borderRadius: 4, color: "#74d7f7" }}>❄️ 冻结中</span>}
          </div>
        </div>

        {/* Enemy progress */}
        <div style={{ background: "#0a0a1a88", border: "1px solid #2a2a4a", borderRadius: 8, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {ENEMIES.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <span style={{ opacity: i < enemyIdx ? 0.3 : i === enemyIdx ? 1 : 0.4, fontSize: 16, filter: i === enemyIdx ? "drop-shadow(0 0 6px #d4a853)" : "none" }}>{e.emoji}</span>
              {i < ENEMIES.length - 1 && <span style={{ color: "#333", fontSize: 10 }}>—</span>}
            </div>
          ))}
          <span style={{ fontSize: 10, color: "#666", marginLeft: 4 }}>第 {enemyIdx + 1}/{ENEMIES.length} 关</span>
        </div>

        {/* Battle log */}
        <div ref={logRef} style={{ background: "#05050f88", border: "1px solid #1a1a3a", borderRadius: 10, padding: "10px 14px", maxHeight: 130, overflowY: "auto", backdropFilter: "blur(8px)" }}>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.7, color: i === log.length - 1 ? "#f0e0c0" : "#9a8a7a", animation: i === log.length - 1 ? "fadeIn 0.3s ease" : "none" }}>{l}</div>
          ))}
        </div>

        {/* Spell buttons */}
        {phase !== "win" && phase !== "lose" && (
          <div>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 10, color: "#7b5f3a", marginBottom: 8, letterSpacing: 2, textAlign: "center" }}>— 施法 —</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {SPELLS.map(spell => {
                const canCast = player.mana >= spell.manaCost && phase === "player" && !animating;
                return (
                  <button key={spell.id} className="spell-btn" onClick={() => handleSpell(spell)}
                    style={{ background: canCast ? `linear-gradient(135deg, ${spell.color}22, ${spell.color}11)` : "#0d0d1a", border: `1px solid ${canCast ? spell.color + "66" : "#2a2a3a"}`, borderRadius: 10, padding: "10px 8px", color: canCast ? spell.color : "#444", cursor: canCast ? "pointer" : "not-allowed", textAlign: "center", animation: canCast ? "pulse-glow 2.5s ease infinite" : "none" }}>
                    <div style={{ fontSize: 20 }}>{spell.emoji}</div>
                    <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 10, marginTop: 3 }}>{spell.name}</div>
                    <div style={{ fontSize: 10, color: canCast ? "#8888aa" : "#333", marginTop: 2 }}>💧{spell.manaCost}</div>
                    <div style={{ fontSize: 9, color: canCast ? "#666688" : "#222", marginTop: 1 }}>{spell.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase indicator */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#666", fontStyle: "italic" }}>
          {phase === "player" && "⟡ 你的回合 — 选择魔法施展"}
          {phase === "enemy" && "⟡ 敌人行动中……"}
          {phase === "between" && <span>⟡ 继续前进？<button onClick={() => setPhase("player")} style={{ marginLeft: 10, background: "#d4a85322", border: "1px solid #d4a853", borderRadius: 6, color: "#d4a853", padding: "3px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>前进 →</button></span>}
        </div>

        {/* Win/Lose */}
        {(phase === "win" || phase === "lose") && (
          <div style={{ background: phase === "win" ? "#0d200d88" : "#200d0d88", border: `1px solid ${phase === "win" ? "#4a8a4a" : "#8a4a4a"}`, borderRadius: 14, padding: "24px", textAlign: "center", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>{phase === "win" ? "🏆" : "💀"}</div>
            <div style={{ fontFamily: "'Cinzel Decorative', serif", fontSize: 18, color: phase === "win" ? "#7fff9a" : "#ff7070", marginBottom: 8 }}>
              {phase === "win" ? "胜利！迷宫被征服！" : "你倒下了……"}
            </div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
              {phase === "win" ? `🌟 最终等级: ${player.level} · 💰 金币: ${player.gold}` : "鼓起勇气，再次挑战！"}
            </div>
            <button onClick={restart} style={{ background: "linear-gradient(135deg, #d4a85333, #d4a85311)", border: "1px solid #d4a853", borderRadius: 8, color: "#d4a853", padding: "10px 28px", cursor: "pointer", fontFamily: "'Cinzel Decorative', serif", fontSize: 14 }}>
              ✦ 再次冒险
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ArcaneRPG />);
