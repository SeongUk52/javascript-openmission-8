import { Vector } from './Vector.js';

/**
 * 게임 설정 Value Object
 * Canvas 크기, 블록 크기, 베이스 정보를 관리한다.
 */
export class GameConfig {
  constructor(canvasWidth, canvasHeight, blockWidth, blockHeight, basePosition, baseWidth) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.blockWidth = blockWidth;
    this.blockHeight = blockHeight;
    this.basePosition = basePosition;
    this.baseWidth = baseWidth;
  }

  copy() {
    return new GameConfig(
      this.canvasWidth,
      this.canvasHeight,
      this.blockWidth,
      this.blockHeight,
      this.basePosition.copy(),
      this.baseWidth
    );
  }
}

