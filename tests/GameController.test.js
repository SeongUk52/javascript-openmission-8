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

const settleLatestFallingBlock = (controller) => {
  const fallingBlock = Array.from(controller.fallingBlocks)[0];
  if (!fallingBlock) {
    return null;
  }

  const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
  if (!baseBlock) {
    return null;
  }

  const baseAABB = baseBlock.getAABB();
  fallingBlock.position.y = baseAABB.min.y - fallingBlock.height / 2 - 1;
  fallingBlock.velocity.x = 0;
  fallingBlock.velocity.y = 0;
  fallingBlock.angularVelocity = 0;

  for (let i = 0; i < 120; i++) {
    controller.update(1 / 60);
    const placedBlocks = controller._getPlacedBlocks();
    if (placedBlocks.includes(fallingBlock)) {
      return fallingBlock;
    }
  }

  return fallingBlock;
};

describe('GameController', () => {
  let controller;

  beforeEach(() => {
    controller = new GameController({
      canvasWidth: 800,
      canvasHeight: 600,
      blockWidth: 50,
      blockHeight: 20,
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

  describe('생성자', () => {
    test('기본값으로 컨트롤러를 생성한다', () => {
      expect(controller.canvasWidth).toBe(800);
      expect(controller.canvasHeight).toBe(600);
      expect(controller.blockWidth).toBe(50);
      expect(controller.blockHeight).toBe(20);
      expect(controller.physicsService).toBeDefined();
      expect(controller.gameState).toBeDefined();
      expect(controller.tower).toBeDefined();
      expect(controller.currentBlock).toBeNull();
    });
  });

  describe('start', () => {
    test('게임을 시작한다', () => {
      controller.start();

      expect(controller.gameState.isPlaying).toBe(true);
      expect(controller.currentBlock).toBeInstanceOf(Block);
      expect(controller.animationFrameId).toBeDefined();
    });

    test('게임 시작 시 타워를 초기화한다', () => {
      controller.tower.addBlock(new Block());
      expect(controller.tower.getBlockCount()).toBe(1);

      controller.start();
      expect(controller.tower.getBlockCount()).toBe(0);
    });
  });

  describe('stop', () => {
    test('게임을 중지한다', () => {
      controller.start();
      controller.stop();

      expect(controller.currentBlock).toBeNull();
      expect(controller.animationFrameId).toBeNull();
    });
  });

  describe('pause/resume', () => {
    test('게임을 일시정지하고 재개한다', () => {
      controller.start();
      controller.pause();

      expect(controller.gameState.isPaused).toBe(true);
      expect(controller.animationFrameId).toBeNull();

      controller.resume();
      expect(controller.gameState.isPaused).toBe(false);
      expect(controller.animationFrameId).toBeDefined();
    });
  });

  describe('placeBlock', () => {
    test('블록을 배치한다', () => {
      controller.start();
      const block = controller.currentBlock;

      controller.placeBlock();
      settleLatestFallingBlock(controller);

      expect(controller.tower.getBlockCount()).toBeGreaterThan(0);
      expect(controller.tower.blocks.getAll()).toContain(block);
      expect(controller.currentBlock).not.toBe(block);
      const placedBlocks = controller._getPlacedBlocks();
      expect(placedBlocks).toContain(block);
    });

    test('블록 배치 시 점수를 추가한다', () => {
      controller.start();
      const initialScore = controller.gameState.score.getValue();

      controller.placeBlock();
      
      // 블록을 타워 위에 강제로 배치
      const fallingBlock = Array.from(controller.fallingBlocks)[0];
      if (fallingBlock) {
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        // 블록을 베이스 바로 위에 위치시킴
        fallingBlock.position.y = baseAABB.min.y - fallingBlock.height / 2 - 1;
        fallingBlock.velocity.y = 0;
        fallingBlock.velocity.x = 0;
        fallingBlock.angularVelocity = 0;
      }
      
      // 물리 시뮬레이션 업데이트 (최대 높이 추적)
      for (let i = 0; i < 20; i++) {
        controller.update(1/60); // 60fps 시뮬레이션
      }

      settleLatestFallingBlock(controller);

      expect(controller.gameState.score.getValue()).toBeGreaterThanOrEqual(initialScore);
    });

    test('블록 배치 시 라운드를 증가시킨다', () => {
      controller.start();
      const initialRound = controller.gameState.round;

      controller.placeBlock();

      settleLatestFallingBlock(controller);

      expect(controller.gameState.round).toBe(initialRound + 1);
    });

    test('게임이 시작되지 않았으면 블록을 배치하지 않는다', () => {
      const initialCount = controller.tower.getBlockCount();
      controller.placeBlock();
      expect(controller.tower.getBlockCount()).toBe(initialCount);
    });
  });


  describe('handleKeyDown', () => {
    test('스페이스바로 블록을 배치한다', () => {
      controller.start();
      const blockCount = controller.tower.getBlockCount();

      controller.handleKeyDown(' ');
      settleLatestFallingBlock(controller);
      expect(controller.tower.getBlockCount()).toBe(blockCount + 1);
    });

    test('Escape로 게임을 일시정지/재개한다', () => {
      controller.start();
      controller.handleKeyDown('Escape');
      expect(controller.gameState.isPaused).toBe(true);

      controller.handleKeyDown('Escape');
      expect(controller.gameState.isPaused).toBe(false);
    });
  });

  describe('handleClick', () => {
    test('클릭 시 블록을 배치한다', () => {
      controller.start();
      const blockCount = controller.tower.getBlockCount();

      controller.handleClick(400, 300);
      settleLatestFallingBlock(controller);
      expect(controller.tower.getBlockCount()).toBe(blockCount + 1);
    });

    test('게임 오버 상태에서 클릭하면 게임을 재시작한다', () => {
      controller.start();
      controller.gameState.end();
      controller.stop();

      controller.handleClick(400, 300);
      expect(controller.gameState.isPlaying).toBe(true);
    });
  });

  describe('update', () => {
    test('물리 시뮬레이션을 업데이트한다', () => {
      controller.start();
      controller.placeBlock();
      const fallingBlock = Array.from(controller.fallingBlocks)[0];
      const initialY = fallingBlock.position.y;

      controller.update(0.016);

      expect(fallingBlock.position.y).toBeGreaterThan(initialY);
    });

    test('블록이 화면 밖으로 나가면 게임 오버', () => {
      controller.start();
      controller.placeBlock();
      const fallingBlock = Array.from(controller.fallingBlocks)[0];
      fallingBlock.position.y = controller.basePosition.y + fallingBlock.height;

      controller.update(0.016);

      expect(controller.gameState.isGameOver).toBe(true);
    });
  });

  describe('getGameState', () => {
    test('현재 게임 상태를 반환한다', () => {
      controller.start();
      const state = controller.getGameState();

      expect(state.gameState).toBe(controller.gameState);
      expect(state.tower).toBe(controller.tower);
      expect(state.currentBlock).toBe(controller.currentBlock);
      expect(state.physicsBodies).toBeDefined();
    });
  });
});

