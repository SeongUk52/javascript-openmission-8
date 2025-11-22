/**
 * 점수 계산 서비스
 * 게임 점수 계산 및 관리 비즈니스 로직을 담당한다.
 */
export class ScoreService {
  /**
   * 블록 배치 점수 계산
   * @param {number} blockCount - 현재 타워의 블록 개수
   * @returns {number} 점수
   */
  static calculatePlacementScore(blockCount) {
    // 블록을 배치할 때마다 기본 점수
    const baseScore = 10;
    
    // 블록이 많을수록 보너스 점수
    const bonus = Math.floor(blockCount / 5) * 5;
    
    return baseScore + bonus;
  }

  /**
   * 높이 보너스 점수 계산
   * @param {number} height - 타워 높이
   * @returns {number} 점수
   */
  static calculateHeightBonus(height) {
    // 높이에 비례한 점수 (10픽셀당 1점)
    return Math.floor(height / 10);
  }

  /**
   * 안정성 보너스 점수 계산
   * @param {boolean} isStable - 타워가 안정적인지 여부
   * @param {number} blockCount - 블록 개수
   * @returns {number} 점수
   */
  static calculateStabilityBonus(isStable, blockCount) {
    if (!isStable) return 0;
    
    // 안정적인 타워에 블록 개수에 비례한 보너스
    return blockCount * 2;
  }

  /**
   * 연속 배치 보너스 점수 계산
   * @param {number} consecutivePlacements - 연속으로 성공한 배치 횟수
   * @returns {number} 점수
   */
  static calculateComboBonus(consecutivePlacements) {
    if (consecutivePlacements < 2) return 0;
    
    // 연속 배치 보너스 (2연속: 5점, 3연속: 15점, 4연속: 30점...)
    return consecutivePlacements * (consecutivePlacements - 1) * 5;
  }

  /**
   * 종합 점수 계산
   * @param {Object} params
   * @param {number} params.blockCount - 블록 개수
   * @param {number} params.height - 타워 높이
   * @param {boolean} params.isStable - 안정성 여부
   * @param {number} params.consecutivePlacements - 연속 배치 횟수
   * @returns {number} 총 점수
   */
  static calculateTotalScore(params) {
    const {
      blockCount = 0,
      height = 0,
      isStable = false,
      consecutivePlacements = 0,
    } = params;

    const placementScore = this.calculatePlacementScore(blockCount);
    const heightBonus = this.calculateHeightBonus(height);
    const stabilityBonus = this.calculateStabilityBonus(isStable, blockCount);
    const comboBonus = this.calculateComboBonus(consecutivePlacements);

    return placementScore + heightBonus + stabilityBonus + comboBonus;
  }
}

