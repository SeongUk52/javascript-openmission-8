import { TowerHeight } from './TowerHeight.js';

/**
 * 게임 루프 상태 Value Object
 * 애니메이션 프레임, 시간, 통계, 쿨타임을 관리한다.
 */
export class GameLoopState {
  constructor(animationFrameId, lastTime, consecutivePlacements, maxTowerHeight, placeCooldown, lastPlaceTime) {
    this.animationFrameId = animationFrameId;
    this.lastTime = lastTime;
    this.consecutivePlacements = consecutivePlacements;
    this.maxTowerHeight = maxTowerHeight instanceof TowerHeight 
      ? maxTowerHeight 
      : new TowerHeight(maxTowerHeight || 0);
    this.placeCooldown = placeCooldown;
    this.lastPlaceTime = lastPlaceTime;
  }

  copy() {
    return new GameLoopState(
      this.animationFrameId,
      this.lastTime,
      this.consecutivePlacements,
      this.maxTowerHeight.copy(),
      this.placeCooldown,
      this.lastPlaceTime
    );
  }
}

