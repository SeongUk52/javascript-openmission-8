import { ScoreService } from '../src/service/ScoreService.js';

describe('ScoreService', () => {
  describe('calculatePlacementScore', () => {
    test('기본 배치 점수를 계산한다', () => {
      const score = ScoreService.calculatePlacementScore(1);
      expect(score).toBe(10); // baseScore = 10
    });

    test('블록 개수에 따라 보너스 점수를 추가한다', () => {
      const score1 = ScoreService.calculatePlacementScore(5);
      expect(score1).toBe(15); // 10 + 5

      const score2 = ScoreService.calculatePlacementScore(10);
      expect(score2).toBe(20); // 10 + 10

      const score3 = ScoreService.calculatePlacementScore(15);
      expect(score3).toBe(25); // 10 + 15
    });
  });

  describe('calculateHeightBonus', () => {
    test('높이에 비례한 보너스 점수를 계산한다', () => {
      expect(ScoreService.calculateHeightBonus(0)).toBe(0);
      expect(ScoreService.calculateHeightBonus(10)).toBe(1);
      expect(ScoreService.calculateHeightBonus(50)).toBe(5);
      expect(ScoreService.calculateHeightBonus(100)).toBe(10);
    });

    test('소수점은 버림 처리한다', () => {
      expect(ScoreService.calculateHeightBonus(15)).toBe(1); // 15/10 = 1.5 -> 1
      expect(ScoreService.calculateHeightBonus(99)).toBe(9); // 99/10 = 9.9 -> 9
    });
  });

  describe('calculateStabilityBonus', () => {
    test('안정적인 타워에 보너스를 준다', () => {
      const bonus = ScoreService.calculateStabilityBonus(true, 5);
      expect(bonus).toBe(10); // 5 * 2
    });

    test('불안정한 타워에는 보너스를 주지 않는다', () => {
      const bonus = ScoreService.calculateStabilityBonus(false, 5);
      expect(bonus).toBe(0);
    });

    test('블록 개수에 비례한 보너스를 준다', () => {
      expect(ScoreService.calculateStabilityBonus(true, 1)).toBe(2);
      expect(ScoreService.calculateStabilityBonus(true, 10)).toBe(20);
    });
  });

  describe('calculateComboBonus', () => {
    test('연속 배치가 2 미만이면 보너스가 없다', () => {
      expect(ScoreService.calculateComboBonus(0)).toBe(0);
      expect(ScoreService.calculateComboBonus(1)).toBe(0);
    });

    test('연속 배치 보너스를 계산한다', () => {
      // 2연속: 2 * 1 * 5 = 10
      expect(ScoreService.calculateComboBonus(2)).toBe(10);
      
      // 3연속: 3 * 2 * 5 = 30
      expect(ScoreService.calculateComboBonus(3)).toBe(30);
      
      // 4연속: 4 * 3 * 5 = 60
      expect(ScoreService.calculateComboBonus(4)).toBe(60);
    });
  });

  describe('calculateTotalScore', () => {
    test('모든 점수를 합산한다', () => {
      const total = ScoreService.calculateTotalScore({
        blockCount: 5,
        height: 50,
        isStable: true,
        consecutivePlacements: 2,
      });

      // placementScore: 10 + 5 = 15
      // heightBonus: 50 / 10 = 5
      // stabilityBonus: 5 * 2 = 10
      // comboBonus: 2 * 1 * 5 = 10
      // 총: 15 + 5 + 10 + 10 = 40
      expect(total).toBe(40);
    });

    test('기본값으로 계산한다', () => {
      const total = ScoreService.calculateTotalScore({});
      
      // placementScore: 10
      // 나머지는 0
      expect(total).toBe(10);
    });

    test('불안정한 타워는 안정성 보너스가 없다', () => {
      const total = ScoreService.calculateTotalScore({
        blockCount: 5,
        height: 50,
        isStable: false,
        consecutivePlacements: 2,
      });

      // placementScore: 15
      // heightBonus: 5
      // stabilityBonus: 0
      // comboBonus: 10
      // 총: 15 + 5 + 0 + 10 = 30
      expect(total).toBe(30);
    });
  });
});

