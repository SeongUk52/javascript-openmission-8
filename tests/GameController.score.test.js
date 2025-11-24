import { jest } from '@jest/globals';
import { GameController } from '../src/controller/GameController.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';

// requestAnimationFrame 모킹
let rafCallbacks = [];
let rafId = 0;

global.requestAnimationFrame = jest.fn((cb) => {
  rafCallbacks.push(cb);
  return ++rafId;
});

global.cancelAnimationFrame = jest.fn((id) => {
  rafCallbacks = [];
});

describe('GameController - Score Calculation', () => {
  let controller;
  const canvasWidth = 800;
  const canvasHeight = 1000;
  const blockWidth = 50;
  const blockHeight = 50;

  beforeEach(() => {
    controller = new GameController({
      canvasWidth,
      canvasHeight,
      blockWidth,
      blockHeight,
    });
  });

  afterEach(() => {
    if (controller) {
      controller.stop();
    }
    rafCallbacks = [];
    rafId = 0;
    jest.clearAllMocks();
  });

  describe('점수 초기화', () => {
    test('게임 시작 시 점수는 0이어야 함', () => {
      controller.start();
      expect(controller.gameState.score).toBe(0);
      expect(controller.maxTowerHeight).toBe(0);
    });
  });

  describe('_calculateCurrentTowerHeight', () => {
    test('블록이 없을 때 높이는 0이어야 함', () => {
      controller.start();
      const height = controller._calculateCurrentTowerHeight();
      expect(height).toBe(0);
    });

    test('블록 1개 배치 시 높이 계산', () => {
      controller.start();
      
      // 블록을 베이스 위에 배치
      const block = new Block({
        position: new Vector(400, 970), // 베이스 상단(970)에 블록 하단이 닿도록
        width: blockWidth,
        height: blockHeight,
      });
      block.place();
      controller.physicsService.addBody(block);
      
      // 물리 업데이트
      controller.update(1/60);
      
      const height = controller._calculateCurrentTowerHeight();
      // 베이스 상단(970)부터 블록 하단(1000)까지 = 30픽셀
      // 하지만 블록 높이 50픽셀이므로 실제로는 더 높을 수 있음
      expect(height).toBeGreaterThan(0);
    });
  });

  describe('_updateMaxHeightAndScore', () => {
    test('블록이 없을 때 점수는 0이어야 함', () => {
      controller.start();
      controller._updateMaxHeightAndScore();
      expect(controller.gameState.score).toBe(0);
      expect(controller.maxTowerHeight).toBe(0);
    });

    test('블록 1개 배치 시 점수 계산', () => {
      controller.start();
      
      // 베이스 상단 Y 좌표 계산
      const baseTopY = controller.basePosition.y - 30; // 1000 - 30 = 970
      
      // 블록을 베이스 위에 배치 (블록 하단이 베이스 상단보다 아래에 있어야 타워 높이가 생김)
      // 블록 중심 Y = 베이스 상단 Y + 블록 높이/2 = 970 + 25 = 995
      // 블록 하단 Y = 995 + 25 = 1020
      // 타워 높이 = 1020 - 970 = 50
      const block = new Block({
        position: new Vector(400, baseTopY + blockHeight / 2),
        width: blockWidth,
        height: blockHeight,
      });
      block.place(); // isPlaced = true, isFalling = false
      block.velocity.y = 0; // 속도도 0으로 설정
      controller.physicsService.addBody(block);
      
      // 물리 업데이트
      controller.update(1/60);
      
      // 배치된 블록 확인
      const placedBlocks = controller._getPlacedBlocks();
      expect(placedBlocks.length).toBeGreaterThan(0);
      expect(placedBlocks).toContain(block);
      
      // 점수 업데이트
      controller._updateMaxHeightAndScore();
      
      // 블록 높이 50픽셀이므로 점수는 최소 1점 이상이어야 함
      expect(controller.maxTowerHeight).toBeGreaterThanOrEqual(blockHeight);
      expect(controller.gameState.score).toBeGreaterThanOrEqual(1);
    });

    test('최대 높이는 감소하지 않아야 함', () => {
      controller.start();
      
      const baseTopY = controller.basePosition.y - 30;
      
      // 첫 번째 블록 배치 (높은 위치)
      const block1 = new Block({
        position: new Vector(400, baseTopY - blockHeight / 2 - 50), // 베이스 위 50픽셀
        width: blockWidth,
        height: blockHeight,
      });
      block1.place();
      controller.physicsService.addBody(block1);
      
      controller.update(1/60);
      controller._updateMaxHeightAndScore();
      
      const maxHeight1 = controller.maxTowerHeight;
      const score1 = controller.gameState.score;
      
      expect(maxHeight1).toBeGreaterThan(0);
      expect(score1).toBeGreaterThan(0);
      
      // 블록을 낮은 위치로 이동 (높이가 줄어듦)
      block1.position.y = baseTopY - blockHeight / 2;
      
      controller.update(1/60);
      controller._updateMaxHeightAndScore();
      
      // 최대 높이와 점수는 유지되어야 함
      expect(controller.maxTowerHeight).toBe(maxHeight1);
      expect(controller.gameState.score).toBe(score1);
    });
  });

  describe('_getTopY', () => {
    test('블록이 없을 때 베이스 상단 Y 좌표 반환', () => {
      controller.start();
      const topY = controller._getTopY();
      const baseTopY = controller.basePosition.y - 30; // 베이스 높이 30
      expect(topY).toBe(baseTopY);
    });

    test('블록 1개 배치 시 블록 하단 Y 좌표 반환', () => {
      controller.start();
      
      const block = new Block({
        position: new Vector(400, 970),
        width: blockWidth,
        height: blockHeight,
      });
      block.place();
      controller.physicsService.addBody(block);
      
      controller.update(1/60);
      
      const topY = controller._getTopY();
      const blockBottomY = block.position.y + block.height / 2;
      expect(topY).toBe(blockBottomY);
    });
  });

  describe('점수 계산 통합 테스트', () => {
    test('블록 배치 후 점수가 올라가야 함', () => {
      controller.start();
      const initialScore = controller.gameState.score;
      
      // 블록을 직접 생성하고 배치
      const baseTopY = controller.basePosition.y - 30;
      const block = new Block({
        position: new Vector(400, baseTopY - blockHeight / 2),
        width: blockWidth,
        height: blockHeight,
      });
      block.place();
      block.velocity.y = 0;
      block.velocity.x = 0;
      controller.physicsService.addBody(block);
      
      // 물리 시뮬레이션 업데이트
      controller.update(1/60);
      
      // 점수 업데이트
      controller._updateMaxHeightAndScore();
      
      // 점수가 올라갔는지 확인
      expect(controller.gameState.score).toBeGreaterThan(initialScore);
      expect(controller.maxTowerHeight).toBeGreaterThan(0);
    });

    test('여러 블록 배치 시 최대 높이 추적', () => {
      controller.start();
      
      // 첫 번째 블록
      const block1 = new Block({
        position: new Vector(400, 950),
        width: blockWidth,
        height: blockHeight,
      });
      block1.place();
      controller.physicsService.addBody(block1);
      
      controller.update(1/60);
      controller._updateMaxHeightAndScore();
      
      const maxHeight1 = controller.maxTowerHeight;
      
      // 두 번째 블록 (더 높은 위치)
      const block2 = new Block({
        position: new Vector(400, 900),
        width: blockWidth,
        height: blockHeight,
      });
      block2.place();
      controller.physicsService.addBody(block2);
      
      controller.update(1/60);
      controller._updateMaxHeightAndScore();
      
      // 최대 높이가 증가했어야 함
      expect(controller.maxTowerHeight).toBeGreaterThan(maxHeight1);
    });
  });
});

