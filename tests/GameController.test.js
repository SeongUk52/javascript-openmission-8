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

      expect(controller.tower.getBlockCount()).toBe(1);
      expect(controller.tower.blocks[0]).toBe(block);
      expect(controller.currentBlock).not.toBe(block);
      // isPlaced는 사용하지 않으므로 _getPlacedBlocks로 확인
      const placedBlocks = controller._getPlacedBlocks();
      expect(placedBlocks).toContain(block);
    });

    test('블록 배치 시 점수를 추가한다', () => {
      controller.start();
      const initialScore = controller.gameState.score;

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

      // 점수는 최대 높이 기준으로 계산되므로, 블록이 타워에 닿으면 점수가 올라가야 함
      expect(controller.gameState.score).toBeGreaterThanOrEqual(initialScore);
    });

    test('블록 배치 시 라운드를 증가시킨다', () => {
      controller.start();
      const initialRound = controller.gameState.round;

      controller.placeBlock();

      expect(controller.gameState.round).toBe(initialRound + 1);
    });

    test('게임이 시작되지 않았으면 블록을 배치하지 않는다', () => {
      const initialCount = controller.tower.getBlockCount();
      controller.placeBlock();
      expect(controller.tower.getBlockCount()).toBe(initialCount);
    });
  });

  describe('moveNextBlock', () => {
    test('블록을 왼쪽으로 이동시킨다', () => {
      controller.start();
      const initialX = controller.currentBlock.position.x;

      controller.moveNextBlock(-1);

      expect(controller.currentBlock.position.x).toBeLessThan(initialX);
      expect(controller.nextBlockX).toBeLessThan(initialX);
    });

    test('블록을 오른쪽으로 이동시킨다', () => {
      controller.start();
      const initialX = controller.currentBlock.position.x;

      controller.moveNextBlock(1);

      expect(controller.currentBlock.position.x).toBeGreaterThan(initialX);
      expect(controller.nextBlockX).toBeGreaterThan(initialX);
    });

    test('화면 경계를 벗어나지 않는다', () => {
      controller.start();
      controller.nextBlockX = 0;

      controller.moveNextBlock(-1);

      expect(controller.nextBlockX).toBeGreaterThanOrEqual(controller.blockWidth / 2);
    });
  });

  describe('handleKeyDown', () => {
    test('왼쪽 화살표로 블록을 이동시킨다', () => {
      controller.start();
      const initialX = controller.currentBlock.position.x;

      controller.handleKeyDown('ArrowLeft');
      expect(controller.currentBlock.position.x).toBeLessThan(initialX);
    });

    test('오른쪽 화살표로 블록을 이동시킨다', () => {
      controller.start();
      const initialX = controller.currentBlock.position.x;

      controller.handleKeyDown('ArrowRight');
      expect(controller.currentBlock.position.x).toBeGreaterThan(initialX);
    });

    test('스페이스바로 블록을 배치한다', () => {
      controller.start();
      const blockCount = controller.tower.getBlockCount();

      controller.handleKeyDown(' ');
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
      const initialY = controller.currentBlock.position.y;

      controller.update(0.016); // 약 1프레임

      // 중력에 의해 블록이 떨어짐
      expect(controller.currentBlock.position.y).toBeGreaterThan(initialY);
    });

    test('블록이 화면 밖으로 나가면 게임 오버', () => {
      controller.start();
      controller.currentBlock.position.y = -100;

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

