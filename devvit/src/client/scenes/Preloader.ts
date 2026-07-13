import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../game';

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#05060f');

    const barW = 360;
    const barH = 14;
    const x = GAME_WIDTH / 2 - barW / 2;
    const y = GAME_HEIGHT / 2 + 20;

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'QOKAH', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#a855f7',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add.rectangle(x, y, barW, barH).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.6);
    const bar = this.add.rectangle(x + 2, y + 2, 0, barH - 4, 0xa855f7).setOrigin(0, 0);

    this.load.on('progress', (p: number) => {
      bar.width = (barW - 4) * p;
    });

    // Try to grab profile early (best-effort; ignored on failure)
    this.load.json('profile', '/api/profile');
  }

  create() {
    // Draw simple crystal + player + alien + hazard textures procedurally so we
    // don't require any binary assets to ship.
    this.makeCircleTexture('crystal', 14, 0xfbbf24, 0xf59e0b);
    this.makeCircleTexture('alien', 18, 0x22d3ee, 0x0e7490);
    this.makeCircleTexture('hazard', 16, 0xdc2626, 0x7f1d1d);
    this.makeCircleTexture('defaultAvatar', 40, 0x8b5cf6, 0xffffff);

    this.time.delayedCall(300, () => this.scene.start('MainMenu'));
  }

  private makeCircleTexture(key: string, radius: number, fill: number, stroke: number) {
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(fill, 1);
    g.lineStyle(2, stroke, 1);
    g.fillCircle(radius, radius, radius);
    g.strokeCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }
}
