import { GameController } from '../src/controller/GameController.js';
import { jest } from '@jest/globals';

// requestAnimationFrame 및 cancelAnimationFrame 모킹
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 1000 / 60));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

describe('GameController - Block Stacking Integration Test', () => {
  let controller;
  const canvasWidth = 800;
  const canvasHeight = 1000;
  const blockWidth = 100;
  const blockHeight = 40;

  beforeEach(() => {
    controller = new GameController({
      canvasWidth,
      canvasHeight,
      blockWidth,
      blockHeight,
    });
    controller._startGameLoop = jest.fn();
    controller._stopGameLoop = jest.fn();
    controller.start();
    jest.clearAllMocks();
  });

  afterEach(() => {
    controller.stop();
  });

  test('첫 번째 블록이 타워에 쌓여야 함', () => {
    expect(controller._getPlacedBlocks().length).toBe(0);
    expect(controller.currentBlock).not.toBeNull();

    const firstBlock = controller.currentBlock;
    
    // 블록 배치
    controller.placeBlock();
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);
    expect(controller.currentBlock).toBeNull();

    // 블록이 베이스에 닿도록 시뮬레이션
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    
    // 블록을 베이스 바로 위에 위치시킴
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2 - 1;
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    // 물리 업데이트 (충돌 감지 및 고정)
    for (let i = 0; i < 20; i++) {
      controller.update(1 / 60);
      const checkPlacedBlocks = controller._getPlacedBlocks();
      if (checkPlacedBlocks.includes(firstBlock)) break;
    }

    // 첫 번째 블록이 타워에 쌓였는지 확인
    const result = controller._getPlacedBlocks();
    expect(result.length).toBe(1, '첫 번째 블록이 타워에 추가되어야 함');
    expect(result).toContain(firstBlock);
    expect(firstBlock.isFalling).toBe(false);
    expect(controller.fallingBlocks.has(firstBlock)).toBe(false);
  });

  test('두 번째 블록이 첫 번째 블록 위에 쌓여야 함', () => {
    // 첫 번째 블록 배치
    const firstBlock = controller.currentBlock;
    controller.placeBlock();
    
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2 - 1;
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    for (let i = 0; i < 20; i++) {
      controller.update(1 / 60);
      const checkPlacedBlocks = controller._getPlacedBlocks();
      if (checkPlacedBlocks.includes(firstBlock)) break;
    }

    expect(controller._getPlacedBlocks().length).toBe(1, '첫 번째 블록이 타워에 있어야 함');
    const firstBlockTopY = controller._getTopY();

    // 두 번째 블록 배치
    expect(controller.currentBlock).not.toBeNull();
    const secondBlock = controller.currentBlock;
    expect(secondBlock).not.toBe(firstBlock);

    controller.placeBlock();
    expect(controller.fallingBlocks.has(secondBlock)).toBe(true);

    // placeBlock() 후에 블록 위치를 첫 번째 블록 위에 설정
    secondBlock.position.y = firstBlockTopY - secondBlock.height / 2 - 1;
    secondBlock.velocity.y = 0;
    secondBlock.velocity.x = 0;
    secondBlock.angularVelocity = 0;

    // 물리 업데이트
    for (let i = 0; i < 20; i++) {
      controller.update(1 / 60);
      const checkPlacedBlocks = controller._getPlacedBlocks();
      if (checkPlacedBlocks.includes(secondBlock)) break;
    }

    // 두 번째 블록이 타워에 쌓였는지 확인
    const result = controller._getPlacedBlocks();
    expect(result.length).toBe(2, '두 번째 블록이 타워에 추가되어야 함');
    expect(result).toContain(firstBlock);
    expect(result).toContain(secondBlock);
    expect(secondBlock.isFalling).toBe(false);
    
    // 두 번째 블록이 첫 번째 블록 위에 있는지 확인
    const secondBlockAABB = secondBlock.getAABB();
    expect(secondBlockAABB.min.y).toBeGreaterThan(firstBlockTopY, '두 번째 블록이 첫 번째 블록 위에 있어야 함');
  });

  test('3개 블록이 순차적으로 쌓여야 함', () => {
    const blocks = [];
    
    // 3개 블록 순차적으로 배치
    for (let i = 0; i < 3; i++) {
      if (!controller.currentBlock) {
        controller._spawnNextBlock();
      }
      const block = controller.currentBlock;
      expect(block).not.toBeNull();
      
      controller.placeBlock();
      expect(controller.fallingBlocks.has(block)).toBe(true);
      
      // placeBlock() 후에 블록 위치 설정
      if (i === 0) {
        // 첫 번째 블록: 베이스 위에
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        block.position.y = baseAABB.min.y - block.height / 2 - 1;
      } else {
        // 이후 블록: 이전 블록 위에
        const previousTopY = controller._getTopY();
        // 블록의 하단이 타워 최상단에 닿도록 설정
        block.position.y = previousTopY - block.height / 2 - 1;
      }
      
      block.velocity.y = 0;
      block.velocity.x = 0;
      block.angularVelocity = 0;
      blocks.push(block);
      
      // 물리 업데이트
      for (let j = 0; j < 20; j++) {
        controller.update(1 / 60);
        const checkPlacedBlocks = controller._getPlacedBlocks();
        if (checkPlacedBlocks.includes(block)) break;
      }
      
      // 각 블록이 타워에 쌓였는지 확인
      const result = controller._getPlacedBlocks();
      expect(result.length).toBe(i + 1, `${i + 1}번째 블록이 타워에 추가되어야 함`);
      expect(result).toContain(block);
    }
    
    // 모든 블록이 타워에 있어야 함
    const finalPlacedBlocks = controller._getPlacedBlocks();
    expect(finalPlacedBlocks.length).toBe(3);
    blocks.forEach(block => {
      expect(finalPlacedBlocks).toContain(block);
    });
  });

  test('블록이 충돌 감지 후 자동으로 고정되어야 함', () => {
    const block = controller.currentBlock;
    controller.placeBlock();
    
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    
    // 블록을 베이스에 충돌하도록 위치 설정
    block.position.y = baseAABB.min.y - block.height / 2 - 1;
    block.velocity.y = 0;
    block.velocity.x = 0;
    block.angularVelocity = 0;

    // placeBlock() 후에 블록 위치 설정
    block.position.y = baseAABB.min.y - block.height / 2 - 1;
    block.velocity.y = 0;
    block.velocity.x = 0;
    block.angularVelocity = 0;

    // 물리 업데이트 전 상태
    expect(controller._getPlacedBlocks().length).toBe(0);

    // 물리 업데이트 (충돌 감지 및 고정)
    for (let i = 0; i < 20; i++) {
      controller.update(1 / 60);
      const checkPlacedBlocks = controller._getPlacedBlocks();
      if (checkPlacedBlocks.includes(block)) break;
    }

    // 블록이 자동으로 고정되었는지 확인
    const result = controller._getPlacedBlocks();
    expect(result).toContain(block);
    expect(result.length).toBe(1, '블록이 타워에 추가되어야 함');
    expect(controller.fallingBlocks.has(block)).toBe(false, '블록이 fallingBlocks에서 제거되어야 함');
  });
});

