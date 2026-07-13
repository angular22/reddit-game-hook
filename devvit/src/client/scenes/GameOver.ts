import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';
import type { Planet } from '../../shared/api';

interface GameOverData {
  planet: Planet;
  score: number;
  crystals: number;
  timeMs: number;
  powerUnlocked: string | null;
}

export class GameOver extends Phaser.Scene {
  private data_!: GameOverData;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData) {
    this.data_ = data;
  }

  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.cameras.main.setBackgroundColor(this.data_.planet.bg);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    this.add
      .text(GAME_WIDTH / 2, 90, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#fbbf24',
        fontStyle: 'bold',
        stroke: '#7c2d12',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 160, `Planet: ${this.data_.planet.name}`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#e9d5ff',
      })
      .setOrigin(0.5);

    const lines = [
      `Score:     ${this.data_.score}`,
      `Crystals:  ${this.data_.crystals}`,
      `Time:      ${(this.data_.timeMs / 1000).toFixed(1)}s`,
      `Power:     ${this.data_.powerUnlocked ?? 'None'}`,
    ];
    this.add
      .text(GAME_WIDTH / 2, 260, lines.join('\n'), {
        fontFamily: 'monospace', fontSize: '20px', color: '#f8fafc', align: 'left', lineSpacing: 8,
      })
      .setOrigin(0.5);

    const btn = (label: string, y: number, cb: () => void) => {
      const t = this.add
        .text(GAME_WIDTH / 2, y, label, {
          fontFamily: 'monospace', fontSize: '22px', color: '#0f172a',
          backgroundColor: '#fbbf24', padding: { x: 20, y: 10 }, fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setScale(1.05));
      t.on('pointerout', () => t.setScale(1));
      t.on('pointerdown', cb);
      return t;
    };

    btn('▶  PLAY AGAIN', GAME_HEIGHT - 90, () => this.scene.start('Game', { planet: this.data_.planet }));
    btn('🪐  CHANGE PLANET', GAME_HEIGHT - 40, () => this.scene.start('PlanetSelection'));
  }
}
