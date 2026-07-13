import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';

export class MainMenu extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.cameras.main.setBackgroundColor('#05060f');

    // Starfield
    for (let i = 0; i < 140; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const s = Phaser.Math.Between(1, 2);
      this.add.rectangle(x, y, s, s, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    }

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'QOKAH', {
        fontFamily: 'monospace',
        fontSize: '96px',
        color: '#a855f7',
        fontStyle: 'bold',
        stroke: '#1e1b4b',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'Your Avatar Creates History', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#e9d5ff',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, '▶  PLAY', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#0f172a',
        backgroundColor: '#fbbf24',
        padding: { x: 24, y: 12 },
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerdown', () => this.scene.start('PlanetSelection'));

    this.input.keyboard?.once('keydown-SPACE', () => this.scene.start('PlanetSelection'));
    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('PlanetSelection'));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, 'Press SPACE or click PLAY', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
  }
}
