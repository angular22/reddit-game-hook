import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';
import { PLANETS, type Planet } from '../../shared/api';

// Module-level cache so a generated avatar persists across scene restarts.
let cachedAiAvatarDataUrl: string | null = null;

export class PlanetSelection extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private aiButtonBg!: Phaser.GameObjects.Rectangle;
  private aiButtonText!: Phaser.GameObjects.Text;
  private isGenerating = false;
  private selectedPlanet: Planet = PLANETS[0]!;

  constructor() {
    super('PlanetSelection');
  }

  create() {
    this.cameras.main.setBackgroundColor('#05060f');

    for (let i = 0; i < 100; i++) {
      this.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        1,
        1,
        0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.9),
      );
    }

    this.add
      .text(GAME_WIDTH / 2, 40, 'CHOOSE YOUR PLANET', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const cardW = 190;
    const gap = 20;
    const totalW = PLANETS.length * cardW + (PLANETS.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2 + cardW / 2;
    const y = GAME_HEIGHT / 2 - 10;

    PLANETS.forEach((planet, i) => {
      const x = startX + i * (cardW + gap);
      this.buildCard(planet, x, y, cardW);
    });

    // AI Avatar generator button
    const btnY = GAME_HEIGHT - 70;
    this.aiButtonBg = this.add
      .rectangle(GAME_WIDTH / 2, btnY, 340, 44, 0x7c3aed, 1)
      .setStrokeStyle(2, 0xfbbf24, 1)
      .setInteractive({ useHandCursor: true });
    this.aiButtonText = this.add
      .text(GAME_WIDTH / 2, btnY, cachedAiAvatarDataUrl ? '✨ REGENERATE COSMIC AVATAR' : '✨ GENERATE COSMIC AVATAR', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#fef3c7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.aiButtonBg.on('pointerdown', () => this.generateAvatar());
    this.aiButtonBg.on('pointerover', () => this.aiButtonBg.setFillStyle(0x8b5cf6, 1));
    this.aiButtonBg.on('pointerout', () => this.aiButtonBg.setFillStyle(0x7c3aed, 1));

    this.statusText = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 30,
        cachedAiAvatarDataUrl
          ? 'AI avatar ready — click a planet to play!'
          : 'Optional: generate a planet-themed AI avatar, or just click a planet.',
        { fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' },
      )
      .setOrigin(0.5);
  }

  private buildCard(planet: Planet, x: number, y: number, w: number) {
    const h = 220;
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, w, h, planet.bg, 1)
      .setStrokeStyle(2, planet.accent, 0.9);
    container.add(bg);

    const orb = this.add.circle(0, -30, 40, planet.accent, 0.9);
    const orbRing = this.add.circle(0, -30, 48).setStrokeStyle(2, 0xffffff, 0.4);
    container.add([orb, orbRing]);

    const name = this.add
      .text(0, 22, planet.name, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const tag = this.add
      .text(0, 48, planet.tagline, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    const play = this.add
      .text(0, 82, 'PLAY ▶', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#0f172a',
        backgroundColor: '#fbbf24',
        padding: { x: 12, y: 6 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add([name, tag, play]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      this.selectedPlanet = planet;
      this.tweens.add({ targets: container, scale: 1.04, duration: 150 });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 150 });
    });
    bg.on('pointerdown', () => this.startPlanet(planet));
  }

  private async generateAvatar() {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.aiButtonText.setText('✨ GENERATING... (10–20s)');
    this.statusText.setText('Contacting cosmic art AI... please wait.');

    try {
      const resp = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planet: this.selectedPlanet.id }),
      });
      const json = (await resp.json()) as { dataUrl?: string; error?: string };
      if (!resp.ok || !json.dataUrl) {
        throw new Error(json.error ?? `HTTP ${resp.status}`);
      }
      cachedAiAvatarDataUrl = json.dataUrl;

      // Preload as a Phaser texture under key 'aiAvatar' so Game can use it.
      if (this.textures.exists('aiAvatar')) this.textures.remove('aiAvatar');
      this.load.image('aiAvatar', json.dataUrl);
      this.load.once('complete', () => {
        this.aiButtonText.setText('✨ REGENERATE COSMIC AVATAR');
        this.statusText.setText('✅ AI avatar ready — click a planet to play!');
        this.isGenerating = false;
      });
      this.load.start();
    } catch (err) {
      console.error('[qokah] avatar gen failed', err);
      this.aiButtonText.setText('✨ GENERATE COSMIC AVATAR');
      this.statusText.setText(`❌ ${String(err).slice(0, 80)}`);
      this.isGenerating = false;
    }
  }

  private startPlanet(planet: Planet) {
    if (this.isGenerating) return;
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { planet });
    });
  }
}
