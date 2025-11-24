import { GameController } from '../src/controller/GameController.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { jest } from '@jest/globals';

describe('GameController - Block Management', () => {
  let gameController;
  const canvasWidth = 800;
  const canvasHeight = 600;

  beforeEach(() => {
    gameController = new GameController({
      canvasWidth,
      canvasHeight,
      blockWidth: 100,
      blockHeight: 40,
    });
  });

  afterEach(() => {
    if (gameController) {
      gameController.stop();
    }
  });

  test('게임 시작 시 첫 번째 블록이 생성되어야 함', () => {
    gameController.start();
    
    expect(gameController.currentBlock).not.toBeNull();
    expect(gameController.currentBlock).toBeInstanceOf(Block);
    expect(gameController.currentBlock.isFalling).toBe(false);
    // isPlaced는 사용하지 않으므로 체크하지 않음
    expect(gameController.tower.getBlockCount()).toBe(0);
  });

  test('블록 1개를 타워에 추가할 수 있어야 함', () => {
    gameController.start();
    
    const firstBlock = gameController.currentBlock;
    expect(firstBlock).not.toBeNull();
    
    // 블록 배치
    gameController.placeBlock();
    
    // 블록이 떨어지도록 물리 업데이트
    for (let i = 0; i < 60; i++) {
      gameController.update(1 / 60);
    }
    
    // 블록이 타워에 추가되었는지 확인
    expect(gameController.tower.getBlockCount()).toBe(1);
    expect(gameController.tower.blocks[0]).toBe(firstBlock);
    // isPlaced는 사용하지 않으므로 _getPlacedBlocks로 확인
    const placedBlocks = gameController._getPlacedBlocks();
    expect(placedBlocks).toContain(firstBlock);
    expect(gameController.tower.blocks.getAll()[0].isFalling).toBe(false);
  });

  test('블록 2개를 타워에 추가할 수 있어야 함', () => {
    gameController.start();
    
    // 첫 번째 블록 배치
    const firstBlock = gameController.currentBlock;
    gameController.placeBlock();
    
    // 첫 번째 블록이 떨어지도록 물리 업데이트
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 1) {
        break;
      }
    }
    
    expect(gameController.tower.getBlockCount()).toBe(1);
    expect(gameController.currentBlock).toBeNull(); // 첫 번째 블록이 배치되면 currentBlock이 null이어야 함
    
    // 두 번째 블록이 자동으로 생성되어야 함
    // _spawnNextBlock이 호출되었는지 확인
    const secondBlock = gameController.currentBlock;
    expect(secondBlock).not.toBeNull();
    expect(secondBlock).not.toBe(firstBlock); // 다른 블록이어야 함
    expect(secondBlock.id).not.toBe(firstBlock.id); // 다른 ID여야 함
    
    // 두 번째 블록 배치
    gameController.placeBlock();
    
    // 두 번째 블록이 떨어지도록 물리 업데이트
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 2) {
        break;
      }
    }
    
    expect(gameController.tower.getBlockCount()).toBe(2);
    expect(gameController.tower.blocks.getAll()[0]).toBe(firstBlock);
    expect(gameController.tower.blocks.getAll()[1]).toBe(secondBlock);
    // isPlaced는 사용하지 않으므로 _getPlacedBlocks로 확인
    const placedBlocks = gameController._getPlacedBlocks();
    expect(placedBlocks).toContain(gameController.tower.blocks.getAll()[0]);
    expect(placedBlocks).toContain(gameController.tower.blocks.getAll()[1]);
  });

  test('블록 3개를 타워에 추가할 수 있어야 함', () => {
    gameController.start();
    
    // 첫 번째 블록
    const firstBlock = gameController.currentBlock;
    gameController.placeBlock();
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 1) break;
    }
    
    // 두 번째 블록
    const secondBlock = gameController.currentBlock;
    expect(secondBlock).not.toBeNull();
    gameController.placeBlock();
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 2) break;
    }
    
    // 세 번째 블록
    const thirdBlock = gameController.currentBlock;
    expect(thirdBlock).not.toBeNull();
    expect(thirdBlock).not.toBe(firstBlock);
    expect(thirdBlock).not.toBe(secondBlock);
    gameController.placeBlock();
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 3) break;
    }
    
    expect(gameController.tower.getBlockCount()).toBe(3);
    expect(gameController.tower.blocks.getAll()[0]).toBe(firstBlock);
    expect(gameController.tower.blocks.getAll()[1]).toBe(secondBlock);
    expect(gameController.tower.blocks.getAll()[2]).toBe(thirdBlock);
  });

  test('블록이 베이스에 닿으면 자동으로 고정되어야 함', () => {
    gameController.start();
    
    const block = gameController.currentBlock;
    gameController.placeBlock();
    
    // 블록이 베이스에 닿을 때까지 물리 업데이트
    let collisionDetected = false;
    for (let i = 0; i < 300; i++) {
      gameController.update(1 / 60);
      
      // 블록이 타워에 추가되었는지 확인
      if (gameController.tower.getBlockCount() > 0) {
        collisionDetected = true;
        break;
      }
      
      // 블록이 화면 밖으로 나가면 실패
      if (block.position.y > canvasHeight + 100) {
        break;
      }
    }
    
    expect(collisionDetected).toBe(true);
    expect(gameController.tower.getBlockCount()).toBe(1);
    // isPlaced는 사용하지 않으므로 _getPlacedBlocks로 확인
    const placedBlocks = gameController._getPlacedBlocks();
    expect(placedBlocks).toContain(block);
    expect(block.isFalling).toBe(false);
  });

  test('각 블록이 독립적인 인스턴스여야 함', () => {
    gameController.start();
    
    const firstBlock = gameController.currentBlock;
    const firstBlockId = firstBlock.id;
    const firstBlockPosition = { x: firstBlock.position.x, y: firstBlock.position.y };
    
    // 첫 번째 블록 배치
    gameController.placeBlock();
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 1) break;
    }
    
    // 두 번째 블록 확인
    const secondBlock = gameController.currentBlock;
    expect(secondBlock).not.toBeNull();
    expect(secondBlock.id).not.toBe(firstBlockId);
    expect(secondBlock.position.x).not.toBe(firstBlockPosition.x);
    expect(secondBlock.position.y).not.toBe(firstBlockPosition.y);
    
    // 두 번째 블록 배치
    gameController.placeBlock();
    for (let i = 0; i < 120; i++) {
      gameController.update(1 / 60);
      if (gameController.tower.getBlockCount() === 2) break;
    }
    
    // 타워에 두 블록이 모두 있어야 함
    expect(gameController.tower.getBlockCount()).toBe(2);
    expect(gameController.tower.blocks.getAll()[0].id).toBe(firstBlockId);
    expect(gameController.tower.blocks.getAll()[1].id).toBe(secondBlock.id);
  });
});




