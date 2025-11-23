import { GameController } from '../src/controller/GameController.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { jest } from '@jest/globals';

// requestAnimationFrame 및 cancelAnimationFrame 모킹
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 1000 / 60));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

describe('GameController - Block Stacking', () => {
  let controller;
  const canvasWidth = 800;
  const canvasHeight = 600;
  const blockWidth = 100;
  const blockHeight = 40;

  beforeEach(() => {
    controller = new GameController({
      canvasWidth,
      canvasHeight,
      blockWidth,
      blockHeight,
    });
    // 게임 루프 시작 방지 (테스트 제어)
    controller._startGameLoop = jest.fn();
    controller._stopGameLoop = jest.fn();
    controller.start(); // 게임 시작 (베이스 및 첫 블록 생성)
    jest.clearAllMocks();
  });

  afterEach(() => {
    controller.stop();
  });

  test('첫 번째 블록이 타워에 추가되어야 함', () => {
    const firstBlock = controller.currentBlock;
    expect(firstBlock).not.toBeNull();
    expect(controller.tower.getBlockCount()).toBe(0);

    // 블록 배치 (떨어뜨림)
    controller.placeBlock();
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);
    expect(controller.currentBlock).toBeNull();

    // 블록을 베이스에 닿도록 위치 설정 (충돌 감지를 위해)
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2 - 1; // 약간 겹치도록
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    // 물리 업데이트로 충돌 감지 및 고정 (여러 번 호출하여 확실히 충돌 감지)
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (firstBlock.isPlaced) break;
    }

    // 첫 번째 블록이 타워에 추가되어야 함
    expect(controller.tower.getBlockCount()).toBe(1);
    expect(controller.tower.blocks).toContain(firstBlock);
    expect(firstBlock.isPlaced).toBe(true);
    expect(controller.fallingBlocks.has(firstBlock)).toBe(false);
  });

  test('두 번째 블록이 첫 번째 블록 위에 쌓여야 함', () => {
    // 첫 번째 블록 배치
    const firstBlock = controller.currentBlock;
    controller.placeBlock();
    
    // 블록을 베이스에 닿도록 위치 설정
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2 - 1;
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    // 물리 업데이트로 충돌 감지 및 고정
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (firstBlock.isPlaced) break;
    }

    expect(controller.tower.getBlockCount()).toBe(1);
    const firstBlockTopY = controller.tower.getTopY();

    // 두 번째 블록 배치
    expect(controller.currentBlock).not.toBeNull();
    const secondBlock = controller.currentBlock;
    expect(secondBlock).not.toBe(firstBlock);

    // 두 번째 블록을 첫 번째 블록 위에 배치
    secondBlock.position.y = firstBlockTopY - secondBlock.height / 2 - 1; // 약간 위에
    secondBlock.velocity.y = 0;
    secondBlock.velocity.x = 0;
    secondBlock.angularVelocity = 0;

    controller.placeBlock();
    
    // 물리 업데이트로 충돌 감지 및 고정
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (secondBlock.isPlaced) break;
    }

    // 두 번째 블록이 타워에 추가되어야 함
    expect(controller.tower.getBlockCount()).toBe(2);
    expect(controller.tower.blocks).toContain(firstBlock);
    expect(controller.tower.blocks).toContain(secondBlock);
    expect(secondBlock.isPlaced).toBe(true);
    
    // 두 번째 블록이 첫 번째 블록 위에 있어야 함
    const secondBlockAABB = secondBlock.getAABB();
    expect(secondBlockAABB.min.y).toBeGreaterThan(firstBlockTopY);
  });

  test('세 번째 블록이 두 번째 블록 위에 쌓여야 함', () => {
    // 첫 번째 블록 배치
    const firstBlock = controller.currentBlock;
    controller.placeBlock();
    
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2 - 1;
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (firstBlock.isPlaced) break;
    }

    // 두 번째 블록 배치
    const secondBlock = controller.currentBlock;
    expect(secondBlock).not.toBeNull();
    const firstBlockTopY = controller.tower.getTopY();
    secondBlock.position.y = firstBlockTopY - secondBlock.height / 2 - 1;
    secondBlock.velocity.y = 0;
    secondBlock.velocity.x = 0;
    secondBlock.angularVelocity = 0;

    controller.placeBlock();
    
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (secondBlock.isPlaced) break;
    }

    expect(controller.tower.getBlockCount()).toBe(2);
    const secondBlockTopY = controller.tower.getTopY();

    // 세 번째 블록 배치
    const thirdBlock = controller.currentBlock;
    expect(thirdBlock).not.toBeNull();
    thirdBlock.position.y = secondBlockTopY - thirdBlock.height / 2 - 1;
    thirdBlock.velocity.y = 0;
    thirdBlock.velocity.x = 0;
    thirdBlock.angularVelocity = 0;

    controller.placeBlock();
    
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (thirdBlock.isPlaced) break;
    }

    // 세 번째 블록이 타워에 추가되어야 함
    expect(controller.tower.getBlockCount()).toBe(3);
    expect(controller.tower.blocks).toContain(firstBlock);
    expect(controller.tower.blocks).toContain(secondBlock);
    expect(controller.tower.blocks).toContain(thirdBlock);
    expect(thirdBlock.isPlaced).toBe(true);
    
    // 세 번째 블록이 두 번째 블록 위에 있어야 함
    const thirdBlockAABB = thirdBlock.getAABB();
    expect(thirdBlockAABB.min.y).toBeGreaterThan(secondBlockTopY);
  });

  test('5개 블록이 순차적으로 쌓여야 함', () => {
    const blocks = [];
    
    // 5개 블록 순차적으로 배치
    for (let i = 0; i < 5; i++) {
      const block = controller.currentBlock;
      expect(block).not.toBeNull();
      
      if (i === 0) {
        // 첫 번째 블록: 베이스 위에
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        block.position.y = baseAABB.min.y - block.height / 2 - 1;
      } else {
        // 이후 블록: 이전 블록 위에
        const previousTopY = controller.tower.getTopY();
        block.position.y = previousTopY - block.height / 2 - 1;
      }
      
      block.velocity.y = 0;
      block.velocity.x = 0;
      block.angularVelocity = 0;
      blocks.push(block);
      
      controller.placeBlock();
      
      // 물리 업데이트로 충돌 감지 및 고정
      for (let j = 0; j < 10; j++) {
        controller.update(1 / 60);
        if (block.isPlaced) break;
      }
      
      // 각 블록이 타워에 추가되었는지 확인
      expect(controller.tower.getBlockCount()).toBe(i + 1);
      expect(controller.tower.blocks).toContain(block);
      expect(block.isPlaced).toBe(true);
    }
    
    // 모든 블록이 타워에 있어야 함
    expect(controller.tower.getBlockCount()).toBe(5);
    blocks.forEach(block => {
      expect(controller.tower.blocks).toContain(block);
      expect(block.isPlaced).toBe(true);
    });
    
    // 블록들이 올바른 순서로 쌓였는지 확인 (Y 좌표 기준)
    for (let i = 1; i < blocks.length; i++) {
      const prevAABB = blocks[i - 1].getAABB();
      const currAABB = blocks[i].getAABB();
      expect(currAABB.min.y).toBeGreaterThan(prevAABB.max.y);
    }
  });

  test('블록이 중복으로 추가되지 않아야 함', () => {
    const block = controller.currentBlock;
    controller.placeBlock();
    
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    block.position.y = baseAABB.min.y - block.height / 2 - 1;
    block.velocity.y = 0;
    block.velocity.x = 0;
    block.angularVelocity = 0;

    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (block.isPlaced) break;
    }

    expect(controller.tower.getBlockCount()).toBe(1);

    // 같은 블록을 다시 추가 시도
    controller.tower.addBlock(block);

    // 블록 개수가 증가하지 않아야 함
    expect(controller.tower.getBlockCount()).toBe(1);
    expect(controller.tower.blocks).toContain(block);
  });

  test('타워의 getTopY가 올바르게 계산되어야 함', () => {
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    const baseTopY = baseAABB.min.y;

    // 첫 번째 블록 배치
    const firstBlock = controller.currentBlock;
    controller.placeBlock();
    
    firstBlock.position.y = baseTopY - firstBlock.height / 2 - 1;
    firstBlock.velocity.y = 0;
    firstBlock.velocity.x = 0;
    firstBlock.angularVelocity = 0;

    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (firstBlock.isPlaced) break;
    }

    const firstBlockTopY = controller.tower.getTopY();
    const firstBlockAABB = firstBlock.getAABB();
    expect(firstBlockTopY).toBe(firstBlockAABB.max.y);

    // 두 번째 블록 배치
    const secondBlock = controller.currentBlock;
    expect(secondBlock).not.toBeNull();
    secondBlock.position.y = firstBlockTopY - secondBlock.height / 2 - 1;
    secondBlock.velocity.y = 0;
    secondBlock.velocity.x = 0;
    secondBlock.angularVelocity = 0;

    controller.placeBlock();
    
    for (let i = 0; i < 10; i++) {
      controller.update(1 / 60);
      if (secondBlock.isPlaced) break;
    }

    const secondBlockTopY = controller.tower.getTopY();
    const secondBlockAABB = secondBlock.getAABB();
    expect(secondBlockTopY).toBe(secondBlockAABB.max.y);
    expect(secondBlockTopY).toBeGreaterThan(firstBlockTopY);
  });
});

