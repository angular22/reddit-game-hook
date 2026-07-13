import Phaser from "phaser";

export type GameResult = {
  won: boolean;
  score: number;
  crystals: number;
  timeMs: number;
  powerUnlocked: string | null;
};

const HIDDEN_POWERS = [
  { id: "solar-flare", name: "Solar Flare", desc: "Sword shoots piercing light beams." },
  { id: "gravity-slam", name: "Gravity Slam", desc: "Slam knocks back all enemies." },
  { id: "phase-shift", name: "Phase Shift", desc: "Dash through enemies, brief invulnerability." },
];

const WORLD_W = 960;
const WORLD_H = 540;

class GameScene extends Phaser.Scene {
  player!: Phaser.GameObjects.Container;
  playerSprite!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  playerBody!: Phaser.Physics.Arcade.Body;
  sword!: Phaser.GameObjects.Rectangle;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
  };
  aliens!: Phaser.Physics.Arcade.Group;
  crystals!: Phaser.Physics.Arcade.Group;
  boss: Phaser.GameObjects.Container | null = null;
  bossHp = 20;
  bossHpBar: Phaser.GameObjects.Rectangle | null = null;
  hp = 3;
  power = 0;
  crystalsCollected = 0;
  score = 0;
  swinging = false;
  facing = 1;
  startTime = 0;
  finished = false;
  powerUnlocked: string | null = null;
  usePowerReady = false;
  hasSavedPower: string | null = null;
  hudText!: Phaser.GameObjects.Text;
  powerText!: Phaser.GameObjects.Text;
  hintText!: Phaser.GameObjects.Text;
  avatarKey: string | null = null;
  aliensDefeated = 0;
  spawnEvent!: Phaser.Time.TimerEvent;

  constructor() {
    super("game");
  }

  init(data: { avatarBase64?: string; savedPower?: string | null }) {
    this.avatarKey = null;
    this.hasSavedPower = data.savedPower ?? null;
    this.usePowerReady = !!data.savedPower;
    if (data.avatarBase64) {
      this.avatarKey = "player-avatar";
      if (this.textures.exists(this.avatarKey)) this.textures.remove(this.avatarKey);
      this.textures.addBase64(this.avatarKey, `data:image/png;base64,${data.avatarBase64}`);
    }
  }

  preload() {
    // wait for avatar texture if any
  }

  create() {
    this.hp = 3;
    this.power = 0;
    this.crystalsCollected = 0;
    this.score = 0;
    this.bossHp = 20;
    this.boss = null;
    this.bossHpBar = null;
    this.finished = false;
    this.powerUnlocked = null;
    this.aliensDefeated = 0;
    this.startTime = this.time.now;

    // Background: Pluto surface
    this.cameras.main.setBackgroundColor("#0a0a1f");
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, WORLD_W);
      const y = Phaser.Math.Between(0, WORLD_H - 80);
      const s = Phaser.Math.Between(1, 2);
      this.add.rectangle(x, y, s, s, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    }
    // ground
    this.add.rectangle(WORLD_W / 2, WORLD_H - 40, WORLD_W, 80, 0x1a1030);
    this.add.rectangle(WORLD_W / 2, WORLD_H - 79, WORLD_W, 2, 0x6b4bcc);

    // Distant sun
    this.add.circle(WORLD_W - 80, 80, 22, 0xffe66b, 0.5);
    this.add.circle(WORLD_W - 80, 80, 36, 0xffe66b, 0.15);

    // Player container
    const startX = 120;
    const startY = WORLD_H - 130;
    this.player = this.add.container(startX, startY);

    // Glowing aura behind avatar
    const aura = this.add.circle(0, 0, 70, 0xa855f7, 0.25);
    this.tweens.add({ targets: aura, scale: 1.15, alpha: 0.4, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.player.add(aura);

    const attachAvatar = () => {
      if (!this.avatarKey) return;
      const img = this.add.image(0, 0, this.avatarKey);
      const scale = 120 / Math.max(img.width, img.height);
      img.setScale(scale);
      // Replace placeholder if present
      if (this.playerSprite) {
        this.player.remove(this.playerSprite, true);
      }
      this.playerSprite = img;
      // insert above aura (index 1) so ring stays on top
      this.player.addAt(img, 1);
    };

    // Placeholder while (or if) avatar isn't ready
    this.playerSprite = this.add.rectangle(0, 0, 90, 110, 0x8b5cf6);
    this.player.add(this.playerSprite);

    if (this.avatarKey) {
      if (this.textures.exists(this.avatarKey) && this.textures.get(this.avatarKey).getSourceImage()) {
        attachAvatar();
      } else {
        this.textures.once("addtexture-" + this.avatarKey, attachAvatar);
        this.textures.once("onload", attachAvatar);
      }
    }


    // Ring border around avatar
    const ring = this.add.circle(0, 0, 60).setStrokeStyle(3, 0xa855f7, 1);
    this.player.add(ring);
    this.data.set("ring", ring);

    this.sword = this.add.rectangle(60, 10, 60, 8, 0xfff2a8).setOrigin(0, 0.5);
    this.sword.setVisible(false);
    this.player.add(this.sword);

    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setSize(90, 110);
    this.playerBody.setOffset(-45, -55);
    this.playerBody.setCollideWorldBounds(true);
    this.playerBody.setGravityY(900);

    // ground collider (invisible)
    const ground = this.add.rectangle(WORLD_W / 2, WORLD_H - 80, WORLD_W, 4, 0, 0);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.player, ground);

    // Groups
    this.aliens = this.physics.add.group();
    this.crystals = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.aliens, ground);

    this.physics.add.overlap(
      this.player,
      this.aliens,
      (_p, a) => this.hitPlayer(a as Phaser.GameObjects.GameObject),
      undefined,
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.crystals,
      (_p, c) => this.collectCrystal(c as Phaser.GameObjects.GameObject),
      undefined,
      this,
    );

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,E") as typeof this.keys;

    // HUD panel background
    this.add.rectangle(0, 0, WORLD_W, 56, 0x000000, 0.55).setOrigin(0, 0);
    this.hudText = this.add
      .text(14, 8, "", { fontFamily: "monospace", fontSize: "16px", color: "#f8fafc", fontStyle: "bold" });

    // Power meter bar (large, center-top)
    const barX = WORLD_W / 2 - 140;
    const barY = 32;
    this.add.rectangle(barX, barY, 280, 16, 0x1e293b).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.4);
    const powerBar = this.add.rectangle(barX + 2, barY + 2, 0, 12, 0xa855f7).setOrigin(0, 0);
    this.data.set("powerBar", powerBar);
    this.powerText = this.add
      .text(WORLD_W / 2, 12, "HIDDEN POWER 0% — fill to unlock boss & mystery power", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#e9d5ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.hintText = this.add
      .text(WORLD_W / 2, WORLD_H - 16, "WASD/Arrows move · SPACE attack · Collect 💎 crystals to charge power", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#cbd5e1",
        backgroundColor: "#000000aa",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1);

    if (this.usePowerReady && this.hasSavedPower) {
      this.hintText.setText(`Press E to unleash yesterday's power: ${this.hasSavedPower.toUpperCase()}`);
    }

    // Spawn loop
    this.spawnEvent = this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => this.spawnAlienOrCrystal(),
    });

    // Attack input
    this.input.keyboard!.on("keydown-SPACE", () => this.attack());
    this.input.keyboard!.on("keydown-E", () => this.useSavedPower());

    this.updateHud();
  }

  spawnAlienOrCrystal() {
    if (this.finished) return;
    if (this.boss) return;
    const roll = Math.random();
    if (roll < 0.65) this.spawnAlien();
    else this.spawnCrystal();
  }

  spawnAlien() {
    const side = Math.random() < 0.5 ? 0 : 1;
    const x = side === 0 ? -20 : WORLD_W + 20;
    const y = WORLD_H - 120;
    const alien = this.add.container(x, y);
    const body = this.add.polygon(0, 0, "0 -18 16 12 -16 12", 0x22d3ee).setStrokeStyle(2, 0x0e7490);
    const eye = this.add.circle(0, -4, 4, 0x0f172a);
    alien.add([body, eye]);
    this.physics.add.existing(alien);
    const ab = alien.body as Phaser.Physics.Arcade.Body;
    ab.setSize(32, 30);
    ab.setOffset(-16, -18);
    ab.setGravityY(900);
    ab.setCollideWorldBounds(false);
    ab.setVelocityX(side === 0 ? 90 : -90);
    (alien as unknown as { hp: number }).hp = 1;
    this.aliens.add(alien);
  }

  spawnCrystal() {
    const x = Phaser.Math.Between(60, WORLD_W - 60);
    const y = WORLD_H - 130;
    const c = this.add.polygon(x, y, "0 -12 10 0 0 12 -10 0", 0xfbbf24).setStrokeStyle(2, 0xf59e0b);
    this.physics.add.existing(c);
    (c.body as Phaser.Physics.Arcade.Body).setSize(20, 24).setOffset(-10, -12);
    this.tweens.add({ targets: c, y: y - 8, yoyo: true, duration: 700, repeat: -1, ease: "Sine.easeInOut" });
    this.crystals.add(c);
    this.time.delayedCall(9000, () => c.destroy());
  }

  attack() {
    if (this.finished || this.swinging) return;
    this.swinging = true;
    this.sword.setVisible(true);
    this.sword.x = this.facing === 1 ? 30 : -90;
    this.tweens.add({
      targets: this.sword,
      scaleX: 1.3,
      duration: 90,
      yoyo: true,
      onComplete: () => {
        this.sword.setVisible(false);
        this.sword.scaleX = 1;
        this.swinging = false;
      },
    });

    // Hit check — wider to match bigger avatar
    const swordWorld = new Phaser.Geom.Rectangle(
      this.player.x + (this.facing === 1 ? 20 : -100),
      this.player.y - 30,
      80,
      60,
    );
    this.aliens.getChildren().forEach((a) => {
      const ac = a as Phaser.GameObjects.Container & { hp: number };
      if (Phaser.Geom.Rectangle.Contains(swordWorld, ac.x, ac.y)) {
        ac.hp -= 1;
        (ac.body as Phaser.Physics.Arcade.Body).setVelocityX(this.facing * 200);
        this.cameras.main.shake(80, 0.005);
        if (ac.hp <= 0) {
          ac.destroy();
          this.aliensDefeated += 1;
          this.score += 100;
          this.power = Math.min(100, this.power + 5);
          this.updateHud();
          this.maybeStartBoss();
        }
      }
    });

    // Boss hit
    if (this.boss) {
      const bc = this.boss;
      if (Phaser.Geom.Rectangle.Contains(swordWorld, bc.x, bc.y)) {
        this.bossHp -= 1;
        this.cameras.main.shake(120, 0.008);
        this.tweens.add({ targets: bc, alpha: 0.4, duration: 80, yoyo: true });
        this.updateBossBar();
        if (this.bossHp <= 0) this.win();
      }
    }
  }

  collectCrystal(c: Phaser.GameObjects.GameObject) {
    (c as Phaser.GameObjects.Polygon).destroy();
    this.crystalsCollected += 1;
    this.score += 50;
    this.power = Math.min(100, this.power + 10);
    this.updateHud();
    this.maybeStartBoss();
  }

  maybeStartBoss() {
    if (this.boss || this.finished) return;
    if (this.power >= 100 && !this.powerUnlocked) {
      // Unlock a random hidden power (persist for tomorrow)
      const p = HIDDEN_POWERS[Phaser.Math.Between(0, HIDDEN_POWERS.length - 1)];
      this.powerUnlocked = p.name;
      // Badge the avatar: turn ring gold + add rotating crown
      const ring = this.data.get("ring") as Phaser.GameObjects.Arc | undefined;
      if (ring) ring.setStrokeStyle(6, 0xfbbf24, 1);
      const headY = -(this.playerSprite.displayHeight / 2 + 18);
      const crown = this.add.text(0, headY, "👑", { fontSize: "52px" }).setOrigin(0.5);
      this.player.add(crown);
      this.tweens.add({ targets: crown, y: headY - 14, yoyo: true, duration: 700, repeat: -1, ease: "Sine.easeInOut" });
      // Grow the avatar (scale player container up)
      this.tweens.add({ targets: this.player, scale: 2.8, duration: 600, ease: "Back.out" });
      // Screen flash
      const flash = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0xfbbf24, 0.6);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });

      // Persistent banner — stays on screen until game ends
      const bannerBg = this.add.rectangle(WORLD_W / 2, 90, 640, 70, 0x7c3aed, 0.95)
        .setStrokeStyle(3, 0xfbbf24, 1)
        .setDepth(1000);
      const bannerText = this.add
        .text(WORLD_W / 2, 90, `🏆 YOU WON A POWER: ${p.name.toUpperCase()} 🏆\nDefeat the boss to keep it!`, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#fef3c7",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(1001);
      this.tweens.add({ targets: [bannerBg, bannerText], scale: { from: 0.6, to: 1 }, duration: 500, ease: "Back.out" });
      this.tweens.add({ targets: bannerBg, alpha: { from: 0.95, to: 0.75 }, duration: 900, yoyo: true, repeat: -1 });

      this.spawnBoss();
    }
  }


  spawnBoss() {
    if (this.spawnEvent) this.spawnEvent.remove();
    // Clear aliens
    this.aliens.clear(true, true);
    const x = WORLD_W - 140;
    const y = WORLD_H - 140;
    const boss = this.add.container(x, y);
    const b = this.add.polygon(0, 0, "0 -40 34 -10 26 30 -26 30 -34 -10", 0xef4444).setStrokeStyle(3, 0x7f1d1d);
    const eye1 = this.add.circle(-10, -8, 5, 0xfef2f2);
    const eye2 = this.add.circle(10, -8, 5, 0xfef2f2);
    boss.add([b, eye1, eye2]);
    this.physics.add.existing(boss);
    const bb = boss.body as Phaser.Physics.Arcade.Body;
    bb.setSize(68, 70);
    bb.setOffset(-34, -40);
    bb.setGravityY(900);
    bb.setBounce(0.2);
    this.boss = boss;

    this.physics.add.overlap(this.player, boss, () => this.hitPlayer(boss), undefined, this);

    this.bossHpBar = this.add.rectangle(WORLD_W - 20, 40, 200, 10, 0x22c55e).setOrigin(1, 0.5);
    this.add.rectangle(WORLD_W - 20, 40, 200, 10).setOrigin(1, 0.5).setStrokeStyle(2, 0xffffff);
    this.add.text(WORLD_W - 20, 22, "BOSS", { fontFamily: "monospace", fontSize: "12px", color: "#fecaca" }).setOrigin(1, 0);

    // Boss patrol
    this.time.addEvent({
      delay: 1500,
      loop: true,
      callback: () => {
        if (!this.boss || this.finished) return;
        const dir = this.player.x < this.boss.x ? -1 : 1;
        (this.boss.body as Phaser.Physics.Arcade.Body).setVelocityX(dir * 80);
      },
    });
  }

  updateBossBar() {
    if (!this.bossHpBar) return;
    this.bossHpBar.width = Math.max(0, (this.bossHp / 20) * 200);
  }

  hitPlayer(_source: Phaser.GameObjects.GameObject) {
    if (this.finished) return;
    if ((this.player as unknown as { _iframes?: number })._iframes && this.time.now < (this.player as unknown as { _iframes: number })._iframes) return;
    this.hp -= 1;
    (this.player as unknown as { _iframes: number })._iframes = this.time.now + 900;
    this.tweens.add({ targets: this.playerSprite, alpha: 0.2, duration: 90, yoyo: true, repeat: 4 });
    (this.playerBody).setVelocityY(-260);
    this.updateHud();
    if (this.hp <= 0) this.lose();
  }

  useSavedPower() {
    if (!this.usePowerReady || this.finished) return;
    this.usePowerReady = false;
    this.showToast(`💥 Used yesterday's power: ${this.hasSavedPower}`);
    // Nuke all aliens on screen
    this.aliens.getChildren().forEach((a) => {
      (a as Phaser.GameObjects.Container).destroy();
      this.aliensDefeated += 1;
      this.score += 100;
    });
    if (this.boss) {
      this.bossHp -= 8;
      this.updateBossBar();
      if (this.bossHp <= 0) this.win();
    }
    this.updateHud();
    this.hintText.setText("WASD/Arrows to move · SPACE to attack");
  }

  win() {
    if (this.finished) return;
    this.finished = true;
    const timeMs = this.time.now - this.startTime;
    this.score += 500 + Math.max(0, 30000 - timeMs) / 10;

    // Celebration overlay
    const overlay = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0.7);
    const title = this.add.text(WORLD_W / 2, WORLD_H / 2 - 40, "🏆 YOU WIN! 🏆", {
      fontFamily: "monospace", fontSize: "56px", color: "#fbbf24", fontStyle: "bold",
      stroke: "#7c2d12", strokeThickness: 6,
    }).setOrigin(0.5).setScale(0);
    const sub = this.add.text(WORLD_W / 2, WORLD_H / 2 + 30, `Badge earned: ${this.powerUnlocked ?? "Champion"}`, {
      fontFamily: "monospace", fontSize: "18px", color: "#fef3c7",
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: "Back.out" });
    this.tweens.add({ targets: sub, alpha: 1, delay: 400, duration: 400 });

    // Confetti
    for (let i = 0; i < 40; i++) {
      const c = this.add.rectangle(
        Phaser.Math.Between(0, WORLD_W),
        -10,
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(8, 14),
        Phaser.Utils.Array.GetRandom([0xfbbf24, 0xa855f7, 0x22d3ee, 0xec4899, 0x22c55e]),
      );
      this.tweens.add({
        targets: c,
        y: WORLD_H + 20,
        angle: Phaser.Math.Between(-360, 360),
        duration: Phaser.Math.Between(1500, 3000),
        delay: Phaser.Math.Between(0, 800),
      });
    }
    // Suppress reference-unused warnings
    void overlay;

    this.time.delayedCall(2200, () => {
      this.registry.set("result", {
        won: true,
        score: Math.round(this.score),
        crystals: this.crystalsCollected,
        timeMs,
        powerUnlocked: this.powerUnlocked,
      } satisfies GameResult);
      this.events.emit("finished");
    });
  }

  lose() {
    if (this.finished) return;
    this.finished = true;
    this.registry.set("result", {
      won: false,
      score: Math.round(this.score),
      crystals: this.crystalsCollected,
      timeMs: this.time.now - this.startTime,
      powerUnlocked: this.powerUnlocked,
    } satisfies GameResult);
    this.events.emit("finished");
  }

  showToast(msg: string) {
    const t = this.add
      .text(WORLD_W / 2, WORLD_H / 2, msg, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#fef3c7",
        backgroundColor: "#7c3aed",
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 1600, onComplete: () => t.destroy() });
  }

  updateHud() {
    this.hudText.setText(
      `HP ${"❤".repeat(Math.max(0, this.hp))}${"·".repeat(Math.max(0, 3 - this.hp))}   💎 ${this.crystalsCollected}   ⚔ ${this.aliensDefeated}   Score ${Math.round(this.score)}`,
    );
    const bar = this.data.get("powerBar") as Phaser.GameObjects.Rectangle | undefined;
    if (bar) {
      bar.width = Math.max(0, (this.power / 100) * 276);
      bar.fillColor = this.powerUnlocked ? 0xfbbf24 : this.power >= 75 ? 0xec4899 : 0xa855f7;
    }
    this.powerText.setText(
      this.powerUnlocked
        ? `⚡ ${this.powerUnlocked.toUpperCase()} UNLOCKED — DEFEAT THE BOSS!`
        : `HIDDEN POWER ${Math.floor(this.power)}% — fill to 100% to unlock boss & mystery power`,
    );
  }

  update() {
    if (this.finished) return;
    const speed = 220;
    const left = this.cursors.left?.isDown || this.keys.A.isDown;
    const right = this.cursors.right?.isDown || this.keys.D.isDown;
    const jump = this.cursors.up?.isDown || this.keys.W.isDown;

    if (left) {
      this.playerBody.setVelocityX(-speed);
      this.facing = -1;
      (this.playerSprite as Phaser.GameObjects.Image).setFlipX?.(true);
    } else if (right) {
      this.playerBody.setVelocityX(speed);
      this.facing = 1;
      (this.playerSprite as Phaser.GameObjects.Image).setFlipX?.(false);
    } else {
      this.playerBody.setVelocityX(0);
    }

    if (jump && this.playerBody.blocked.down) {
      this.playerBody.setVelocityY(-460);
    }

    // Despawn aliens off-screen
    this.aliens.getChildren().forEach((a) => {
      const ac = a as Phaser.GameObjects.Container;
      if (ac.x < -60 || ac.x > WORLD_W + 60) ac.destroy();
    });
  }
}

export function createGame(parent: HTMLElement, avatarBase64: string | null, savedPower: string | null) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_W,
    height: WORLD_H,
    backgroundColor: "#0a0a1f",
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 900 }, debug: false } },
    scene: [GameScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
  game.scene.start("game", { avatarBase64, savedPower });
  return game;
}

export { HIDDEN_POWERS };
