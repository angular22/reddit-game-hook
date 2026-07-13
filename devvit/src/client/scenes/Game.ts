import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';
import type { Planet, InitResponse } from '../../shared/api';

interface GameData {
  planet: Planet;
}

const HIDDEN_POWERS = [
  { id: 'solar-flare', name: 'Solar Flare' },
  { id: 'gravity-slam', name: 'Gravity Slam' },
  { id: 'phase-shift', name: 'Phase Shift' },
];

export class Game extends Phaser.Scene {
  private planet!: Planet;
  private player!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private crystals!: Phaser.Physics.Arcade.Group;
  private aliens!: Phaser.Physics.Arcade.Group;
  private hazards!: Phaser.Physics.Arcade.Group;
  private score = 0;
  private crystalsCollected = 0;
  private hp = 3;
  private energy = 0;
  private timeMs = 0;
  private startTime = 0;
  private finished = false;
  private powerUnlocked: string | null = null;
  private scoreText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Rectangle;
  private energyLabel!: Phaser.GameObjects.Text;
  private avatarKey = 'defaultAvatar';
  private iFramesUntil = 0;

  constructor() {
    super('Game');
  }

  init(data: GameData) {
    this.planet = data.planet;
    this.score = 0;
    this.crystalsCollected = 0;
    this.hp = 3;
    this.energy = 0;
    this.finished = false;
    this.powerUnlocked = null;
  }

  preload() {
    // Prefer the AI-generated avatar if the player generated one in PlanetSelection.
    if (this.textures.exists('aiAvatar')) {
      this.avatarKey = 'aiAvatar';
      return;
    }
    const profile = this.cache.json.get('profile') as InitResponse | undefined;
    if (profile?.avatarUrl) {
      this.load.image('remoteAvatar', profile.avatarUrl);
      this.load.once('complete', () => {
        if (this.textures.exists('remoteAvatar')) this.avatarKey = 'remoteAvatar';
      });
    }
  }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor(this.planet.bg);

    // Stars
    for (let i = 0; i < 120; i++) {
      this.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT - 60),
        Phaser.Math.Between(1, 2),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.3, 1),
      );
    }

    // Ground strip (visual only — arcade physics is top-down here)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 60, this.planet.ground);

    // Player
    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.avatarKey);
    const targetSize = 56;
    const scale = targetSize / Math.max(this.player.width, this.player.height);
    this.player.setScale(scale);
    this.player.setCircle(this.player.width / 2);
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.85, 0.85);
    this.player.setMaxVelocity(260, 260);

    // Aura
    const aura = this.add.circle(this.player.x, this.player.y, targetSize / 2 + 8, this.planet.accent, 0.25);
    this.tweens.add({ targets: aura, alpha: 0.5, scale: 1.15, duration: 900, yoyo: true, repeat: -1 });
    this.events.on('update', () => {
      aura.setPosition(this.player.x, this.player.y);
    });

    // Groups
    this.crystals = this.physics.add.group();
    this.aliens = this.physics.add.group();
    this.hazards = this.physics.add.group();

    for (let i = 0; i < 6; i++) this.spawnCrystal();
    for (let i = 0; i < 3; i++) this.spawnAlien();
    for (let i = 0; i < 3; i++) this.spawnHazard();

    this.physics.add.overlap(this.player, this.crystals, (_p, c) => this.collectCrystal(c as Phaser.GameObjects.GameObject));
    this.physics.add.overlap(this.player, this.aliens, () => this.hitPlayer());
    this.physics.add.overlap(this.player, this.hazards, () => this.hitPlayer());

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;

    // HUD
    this.add.rectangle(0, 0, GAME_WIDTH, 40, 0x000000, 0.6).setOrigin(0, 0);
    this.scoreText = this.add.text(14, 10, '', { fontFamily: 'monospace', fontSize: '16px', color: '#f8fafc', fontStyle: 'bold' });
    this.hpText = this.add.text(GAME_WIDTH - 14, 10, '', { fontFamily: 'monospace', fontSize: '16px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(1, 0);
    this.timerText = this.add.text(GAME_WIDTH / 2, 10, '', { fontFamily: 'monospace', fontSize: '16px', color: '#e9d5ff', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Energy bar
    const barX = 14;
    const barY = GAME_HEIGHT - 22;
    this.add.rectangle(barX, barY, 240, 12, 0x1e293b).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.4);
    this.energyBar = this.add.rectangle(barX + 1, barY + 1, 0, 10, this.planet.accent).setOrigin(0, 0);
    this.energyLabel = this.add
      .text(barX + 250, barY - 2, 'ENERGY 0%', { fontFamily: 'monospace', fontSize: '12px', color: '#e9d5ff', fontStyle: 'bold' });

    this.startTime = this.time.now;
    this.updateHud();

    // Periodic spawns
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        if (this.finished) return;
        if (this.crystals.countActive() < 8) this.spawnCrystal();
        if (this.aliens.countActive() < 6) this.spawnAlien();
        if (this.hazards.countActive() < 5) this.spawnHazard();
      },
    });
  }

  private spawnCrystal() {
    const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
    const y = Phaser.Math.Between(60, GAME_HEIGHT - 60);
    const c = this.physics.add.image(x, y, 'crystal');
    c.setCircle(c.width / 2);
    this.tweens.add({ targets: c, scale: 1.15, yoyo: true, duration: 600, repeat: -1 });
    this.crystals.add(c);
  }

  private spawnAlien() {
    const x = Phaser.Math.Between(40, GAME_WIDTH - 40);
    const y = Phaser.Math.Between(60, GAME_HEIGHT - 60);
    const a = this.physics.add.image(x, y, 'alien');
    a.setCircle(a.width / 2);
    a.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-80, 80));
    a.setBounce(1, 1);
    a.setCollideWorldBounds(true);
    this.aliens.add(a);
  }

  private spawnHazard() {
    const x = Phaser.Math.Between(60, GAME_WIDTH - 60);
    const y = Phaser.Math.Between(80, GAME_HEIGHT - 80);
    const h = this.physics.add.image(x, y, 'hazard');
    h.setTint(this.planet.hazardColor);
    h.setCircle(h.width / 2);
    this.tweens.add({ targets: h, alpha: 0.5, yoyo: true, duration: 500, repeat: -1 });
    this.hazards.add(h);
  }

  private collectCrystal(c: Phaser.GameObjects.GameObject) {
    (c as Phaser.Physics.Arcade.Image).destroy();
    this.crystalsCollected += 1;
    this.score += 50;
    this.energy = Math.min(100, this.energy + 12);
    if (this.energy >= 100 && !this.powerUnlocked) {
      const p = HIDDEN_POWERS[Phaser.Math.Between(0, HIDDEN_POWERS.length - 1)]!;
      this.powerUnlocked = p.name;
      this.showBanner(`⚡ HIDDEN POWER UNLOCKED: ${p.name.toUpperCase()}`);
      this.score += 300;
      // Nuke aliens as reward
      this.aliens.getChildren().forEach((a) => (a as Phaser.Physics.Arcade.Image).destroy());
    }
    this.updateHud();
  }

  private hitPlayer() {
    if (this.finished) return;
    if (this.time.now < this.iFramesUntil) return;
    this.hp -= 1;
    this.iFramesUntil = this.time.now + 900;
    this.tweens.add({ targets: this.player, alpha: 0.2, yoyo: true, duration: 90, repeat: 4 });
    this.cameras.main.shake(120, 0.006);
    this.updateHud();
    if (this.hp <= 0) this.endGame();
  }

  private showBanner(msg: string) {
    const bg = this.add.rectangle(GAME_WIDTH / 2, 80, 620, 50, 0x7c3aed, 0.9)
      .setStrokeStyle(2, 0xfbbf24).setDepth(1000);
    const t = this.add.text(GAME_WIDTH / 2, 80, msg, {
      fontFamily: 'monospace', fontSize: '18px', color: '#fef3c7', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1001);
    this.tweens.add({ targets: [bg, t], scale: { from: 0.6, to: 1 }, duration: 400, ease: 'Back.out' });
    this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: [bg, t], alpha: 0, duration: 400, onComplete: () => { bg.destroy(); t.destroy(); } });
    });
  }

  private updateHud() {
    this.scoreText.setText(`${this.planet.name.toUpperCase()}  ·  💎 ${this.crystalsCollected}  ·  Score ${this.score}`);
    this.hpText.setText(`HP ${'❤'.repeat(Math.max(0, this.hp))}${'·'.repeat(Math.max(0, 3 - this.hp))}`);
    this.energyBar.width = (this.energy / 100) * 238;
    this.energyLabel.setText(this.powerUnlocked ? `⚡ ${this.powerUnlocked.toUpperCase()}` : `ENERGY ${Math.floor(this.energy)}%`);
  }

  private endGame() {
    if (this.finished) return;
    this.finished = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOver', {
        planet: this.planet,
        score: this.score,
        crystals: this.crystalsCollected,
        timeMs: this.timeMs,
        powerUnlocked: this.powerUnlocked,
      });
    });
  }

  update(_time: number, _delta: number) {
    if (this.finished) return;

    this.timeMs = this.time.now - this.startTime;
    this.timerText.setText(`⏱ ${(this.timeMs / 1000).toFixed(1)}s`);

    const accel = 700;
    const left = this.cursors.left?.isDown || this.wasd.A.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S.isDown;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAcceleration((right ? 1 : 0) * accel - (left ? 1 : 0) * accel, (down ? 1 : 0) * accel - (up ? 1 : 0) * accel);
  }
}
