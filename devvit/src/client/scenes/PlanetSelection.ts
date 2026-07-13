import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';
import { PLANETS, type Planet } from '../../shared/api';

export class PlanetSelection extends Phaser.Scene {
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
      .text(GAME_WIDTH / 2, 50, 'CHOOSE YOUR PLANET', {
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
    const y = GAME_HEIGHT / 2 + 10;

    PLANETS.forEach((planet, i) => {
      const x = startX + i * (cardW + gap);
      this.buildCard(planet, x, y, cardW);
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, 'Click a planet to begin', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
  }

  private buildCard(planet: Planet, x: number, y: number, w: number) {
    const h = 240;
    const container = this.add.container(x, y);

    const bg = this.add
      .rectangle(0, 0, w, h, planet.bg, 1)
      .setStrokeStyle(2, planet.accent, 0.9);
    container.add(bg);

    const orb = this.add.circle(0, -30, 44, planet.accent, 0.9);
    const orbRing = this.add.circle(0, -30, 52).setStrokeStyle(2, 0xffffff, 0.4);
    container.add([orb, orbRing]);

    const name = this.add
      .text(0, 30, planet.name, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const tag = this.add
      .text(0, 58, planet.tagline, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5);
    const play = this.add
      .text(0, 92, 'PLAY ▶', {
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
      this.tweens.add({ targets: container, scale: 1.04, duration: 150 });
    });
    bg.on('pointerout', () => {
      this.tweens.add({ targets: container, scale: 1, duration: 150 });
    });
    bg.on('pointerdown', () => this.startPlanet(planet));
  }

  private startPlanet(planet: Planet) {
    // Short loading animation before Game
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Game', { planet });
    });
  }
}
