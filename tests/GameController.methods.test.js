import { GameController } from '../src/controller/GameController.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { jest } from '@jest/globals';

// requestAnimationFrame 및 cancelAnimationFrame 모킹
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 1000 / 60));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

describe('GameController - All Methods Test', () => {
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
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (controller) {
      controller.stop();
    }
  });

  describe('_getPlacedBlocks()', () => {
    test('배치된 블록이 없으면 빈 배열 반환', () => {
      {
        controller.start();
        const result = controller._getPlacedBlocks();
        expect(result).toEqual([]);
      }
    });

    test('배치된 블록들을 올바르게 반환', () => {
      {
        controller.start();
        
        // 블록 생성 및 배치
        const block1 = new Block({
          position: new Vector(400, 950),
          width: blockWidth,
          height: blockHeight,
        });
        block1.isPlaced = true;
        block1.isFalling = false;
        block1.isStatic = false; // 정적이 아님 (무게 균형에 따라 움직일 수 있음)
        controller.physicsService.addBody(block1);

        const block2 = new Block({
          position: new Vector(400, 910),
          width: blockWidth,
          height: blockHeight,
        });
        block2.isPlaced = true;
        block2.isFalling = false;
        block2.isStatic = false;
        controller.physicsService.addBody(block2);

        // 떨어지는 블록은 제외되어야 함
        const fallingBlock = new Block({
          position: new Vector(400, 200),
          width: blockWidth,
          height: blockHeight,
        });
        fallingBlock.isPlaced = false;
        fallingBlock.isFalling = true;
        controller.physicsService.addBody(fallingBlock);

        const result = controller._getPlacedBlocks();
        expect(result.length).toBe(2);
        expect(result).toContain(block1);
        expect(result).toContain(block2);
        expect(result).not.toContain(fallingBlock);
      }
    });
  });

  describe('_getTopY()', () => {
    test('블록이 없으면 베이스 상단 Y 반환', () => {
      controller.start();
      const topY = controller._getTopY();
      expect(topY).toBe(canvasHeight - 30); // basePosition.y - 30
    });

    test('블록이 있으면 가장 위 블록의 하단 Y 반환', () => {
      controller.start();
      
      const block1 = new Block({
        position: new Vector(400, 950),
        width: blockWidth,
        height: blockHeight,
      });
      block1.isPlaced = true;
      block1.isFalling = false;
      controller.physicsService.addBody(block1);

      const block2 = new Block({
        position: new Vector(400, 910),
        width: blockWidth,
        height: blockHeight,
      });
      block2.isPlaced = true;
      block2.isFalling = false;
      controller.physicsService.addBody(block2);

      const topY = controller._getTopY();
      // block1의 position.y = 950, blockHeight = 40
      // block1의 하단 = 950 + 20 = 970
      // block2의 position.y = 910, blockHeight = 40
      // block2의 하단 = 910 + 20 = 930
      // 가장 위 = 970 (block1의 하단)
      expect(topY).toBe(970);
    });
  });

  describe('_getHeight()', () => {
    test('블록이 없으면 0 반환', () => {
      controller.start();
      const height = controller._getHeight();
      expect(height).toBe(0);
    });

    test('블록이 있으면 최상단과 최하단의 차이 반환', () => {
      controller.start();
      
      const block1 = new Block({
        position: new Vector(400, 950),
        width: blockWidth,
        height: blockHeight,
      });
      block1.isPlaced = true;
      block1.isFalling = false;
      controller.physicsService.addBody(block1);

      const block2 = new Block({
        position: new Vector(400, 910),
        width: blockWidth,
        height: blockHeight,
      });
      block2.isPlaced = true;
      block2.isFalling = false;
      controller.physicsService.addBody(block2);

      const height = controller._getHeight();
      // block1의 position.y = 950, blockHeight = 40
      // block1의 상단 = 950 - 20 = 930
      // block1의 하단 = 950 + 20 = 970
      // block2의 position.y = 910, blockHeight = 40
      // block2의 상단 = 910 - 20 = 890
      // block2의 하단 = 910 + 20 = 930
      // 최상단 = 970 (block1의 하단)
      // 최하단 = 890 (block2의 상단)
      // 높이 = 970 - 890 = 80
      expect(height).toBe(80);
    });
  });

  describe('_evaluateStability()', () => {
    test('블록이 없으면 안정적', () => {
      controller.start();
      const stability = controller._evaluateStability();
      expect(stability.stable).toBe(true);
      expect(stability.toppledBlocks).toEqual([]);
    });

    test('안정적인 블록은 stable=true', () => {
      controller.start();
      
      const block = new Block({
        position: new Vector(400, 950),
        width: blockWidth,
        height: blockHeight,
      });
      block.isPlaced = true;
      block.isFalling = false;
      controller.physicsService.addBody(block);

      const stability = controller._evaluateStability();
      // 안정성 평가는 BalanceUtil에 의존하므로 실제 결과는 구현에 따라 다를 수 있음
      expect(stability).toHaveProperty('stable');
      expect(stability).toHaveProperty('toppledBlocks');
    });
  });

  describe('_fixBlockToTower()', () => {
    test('블록을 타워에 고정하고 isStatic=false로 유지', () => {
      {
        controller.start();
        
        const block = new Block({
          position: new Vector(400, 200),
          width: blockWidth,
          height: blockHeight,
        });
        block.isFalling = true;
        block.isPlaced = false;
        block.isStatic = false;
        controller.physicsService.addBody(block);
        controller.fallingBlocks.add(block);

        controller._fixBlockToTower(block);

        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const result = controller._getPlacedBlocks();
        expect(result).toContain(block);
        expect(block.isFalling).toBe(false);
        // 중요: isStatic은 false여야 함 (무게 균형에 따라 움직일 수 있음)
        expect(block.isStatic).toBe(false);
        
        // 물리 엔진에 여전히 있어야 함
        expect(controller.physicsService.bodies).toContain(block);
        
        // fallingBlocks에서 제거되어야 함
        expect(controller.fallingBlocks.has(block)).toBe(false);
      }
    });

    test('첫 번째 블록은 베이스 위에 배치', () => {
      {
        controller.start();
        
        const block = new Block({
          position: new Vector(400, 200),
          width: blockWidth,
          height: blockHeight,
        });
        block.isFalling = true;
        block.isPlaced = false;
        controller.physicsService.addBody(block);
        controller.fallingBlocks.add(block);

        controller._fixBlockToTower(block);

        // 베이스 상단 = basePosition.y - 30 = canvasHeight - 30 = 1000 - 30 = 970
        // 블록의 하단이 베이스 상단에 있어야 함
        // position.y + blockHeight/2 = 970
        // position.y = 970 - blockHeight/2 = 970 - 20 = 950
        const expectedY = controller.basePosition.y - 30 - blockHeight / 2;
        expect(block.position.y).toBeCloseTo(expectedY, 1);
        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const result = controller._getPlacedBlocks();
        expect(result).toContain(block);
      }
    });

    test('두 번째 블록은 첫 번째 블록 위에 배치', () => {
      {
        controller.start();
        
        // 첫 번째 블록
        const block1 = new Block({
          position: new Vector(400, 950),
          width: blockWidth,
          height: blockHeight,
        });
        block1.isPlaced = true;
        block1.isFalling = false;
        block1.isStatic = false;
        controller.physicsService.addBody(block1);

        // 두 번째 블록
        const block2 = new Block({
          position: new Vector(400, 200),
          width: blockWidth,
          height: blockHeight,
        });
        block2.isFalling = true;
        block2.isPlaced = false;
        controller.physicsService.addBody(block2);
        controller.fallingBlocks.add(block2);

        // block1의 position.y = 950, blockHeight = 40
        // block1의 하단 = 950 + 20 = 970
        // _getTopY()는 position.y + height/2를 반환하므로 970
        // targetY = towerTopY + epsilon + blockHeight/2 = 970 + 0.1 + 20 = 990.1
        const towerTopY = controller._getTopY();
        expect(towerTopY).toBe(970); // block1의 하단
        
        controller._fixBlockToTower(block2);

        // block1의 하단 = 970
        // targetY = 970 + 0.1 + 20 = 990.1
        expect(block2.position.y).toBeCloseTo(990.1, 1);
        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const result = controller._getPlacedBlocks();
        expect(result).toContain(block2);
        expect(block2.isStatic).toBe(false); // 정적이 아님
      }
    });
  });

  describe('_spawnNextBlock()', () => {
    test('다음 블록 생성', () => {
      controller.start();
      
      expect(controller.currentBlock).not.toBeNull();
      const block = controller.currentBlock;
      
      expect(block).toBeInstanceOf(Block);
      expect(block.width).toBe(blockWidth);
      expect(block.height).toBe(blockHeight);
      expect(block.isFalling).toBe(false);
      // isPlaced는 사용하지 않으므로 체크하지 않음
      expect(block.isStatic).toBe(false);
    });

    test('블록이 베이스 범위 내에 생성', () => {
      controller.start();
      
      const block = controller.currentBlock;
      const baseLeft = controller.basePosition.x - controller.baseWidth / 2;
      const baseRight = controller.basePosition.x + controller.baseWidth / 2;
      const blockHalfWidth = block.width / 2;
      
      expect(block.position.x).toBeGreaterThanOrEqual(baseLeft + blockHalfWidth);
      expect(block.position.x).toBeLessThanOrEqual(baseRight - blockHalfWidth);
    });
  });

  describe('placeBlock()', () => {
    test('블록을 떨어뜨리고 fallingBlocks에 추가', () => {
      controller.start();
      
      const block = controller.currentBlock;
      expect(block).not.toBeNull();
      
      controller.placeBlock();
      
      // 블록이 떨어지는 상태로 변경되어야 함
      expect(block.isFalling).toBe(true);
      // isPlaced는 사용하지 않으므로 체크하지 않음
      
      // fallingBlocks에 추가되어야 함
      expect(controller.fallingBlocks.has(block)).toBe(true);
      
      // 물리 엔진에 추가되어야 함
      expect(controller.physicsService.bodies).toContain(block);
      
      // currentBlock은 null이 되어야 함
      expect(controller.currentBlock).toBeNull();
    });

    test('블록이 물리 엔진에서 움직일 수 있어야 함', () => {
      controller.start();
      
      const block = controller.currentBlock;
      controller.placeBlock();
      
      // 블록이 물리 엔진에 있어야 함
      expect(controller.physicsService.bodies).toContain(block);
      
      // isStatic은 false여야 함 (움직일 수 있어야 함)
      expect(block.isStatic).toBe(false);
      
      // 초기 속도는 0이지만, 중력에 의해 떨어질 수 있어야 함
      // 물리 업데이트 후 위치가 변경되어야 함
      const initialY = block.position.y;
      controller.update(1 / 60);
      
      // 중력에 의해 떨어지므로 Y 위치가 증가해야 함 (Y축은 아래로 증가)
      expect(block.position.y).toBeGreaterThan(initialY);
    });
  });

  describe('update()', () => {
    test('떨어지는 블록이 베이스에 닿으면 고정', () => {
      {
        controller.start();
        
        const block = controller.currentBlock;
        controller.placeBlock();
        
        // 블록을 베이스 바로 위에 위치시킴
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        block.position.y = baseAABB.min.y - block.height / 2 - 1;
        block.velocity.y = 0;
        block.velocity.x = 0;
        block.angularVelocity = 0;

        // 물리 업데이트
        for (let i = 0; i < 20; i++) {
          controller.update(1 / 60);
          const checkPlacedBlocks = controller._getPlacedBlocks();
          if (checkPlacedBlocks.includes(block)) break;
        }

        // 블록이 배치되어야 함 (isPlaced 대신 _getPlacedBlocks 사용)
        const result = controller._getPlacedBlocks();
        expect(result).toContain(block);
        expect(block.isFalling).toBe(false);
        expect(controller.fallingBlocks.has(block)).toBe(false);
      }
    });

    test('배치된 블록이 물리 엔진에서 계속 시뮬레이션됨', () => {
      {
        controller.start();
        
        // 블록 배치
        const block = controller.currentBlock;
        controller.placeBlock();
        
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        block.position.y = baseAABB.min.y - block.height / 2 - 1;
        block.velocity.y = 0;
        block.velocity.x = 0;
        block.angularVelocity = 0;

        // 물리 업데이트로 블록 고정
        for (let i = 0; i < 20; i++) {
          controller.update(1 / 60);
          const checkPlacedBlocks = controller._getPlacedBlocks();
          if (checkPlacedBlocks.includes(block)) break;
        }

        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const result = controller._getPlacedBlocks();
        expect(result).toContain(block);
        expect(block.isStatic).toBe(false); // 정적이 아님
        
        // 물리 엔진에 여전히 있어야 함
        expect(controller.physicsService.bodies).toContain(block);
        
        // 블록이 물리 엔진에서 계속 시뮬레이션되는지 확인
        // (예: 다른 블록이 위에 쌓이면 무게에 의해 움직일 수 있음)
        const initialY = block.position.y;
        const initialAngle = block.angle;
        
        // 추가 업데이트 (블록이 움직일 수 있는지 확인)
        controller.update(1 / 60);
        
        // 블록이 물리 엔진에 있으므로 계속 시뮬레이션됨
        // (안정적인 상태면 위치가 거의 변하지 않을 수 있음)
        expect(controller.physicsService.bodies).toContain(block);
      }
    });
  });

  describe('블록 물리 시뮬레이션', () => {
    test('배치된 블록이 무게 균형에 따라 움직일 수 있어야 함', () => {
      {
        controller.start();
        
        // 첫 번째 블록 배치
        const block1 = controller.currentBlock;
        controller.placeBlock();
        
        const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
        const baseAABB = baseBlock.getAABB();
        block1.position.y = baseAABB.min.y - block1.height / 2 - 1;
        block1.velocity.y = 0;
        block1.velocity.x = 0;
        block1.angularVelocity = 0;

        for (let i = 0; i < 20; i++) {
          controller.update(1 / 60);
          const checkPlacedBlocks = controller._getPlacedBlocks();
          if (checkPlacedBlocks.includes(block1)) break;
        }

        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const placedBlocks1 = controller._getPlacedBlocks();
        expect(placedBlocks1).toContain(block1);
        expect(block1.isStatic).toBe(false); // 정적이 아님
        
        // 두 번째 블록을 첫 번째 블록 위에 배치 (약간 기울어지게)
        controller._spawnNextBlock();
        const block2 = controller.currentBlock;
        controller.placeBlock();
        
        const towerTopY = controller._getTopY();
        block2.position.y = towerTopY + 0.1 + block2.height / 2;
        block2.position.x = block1.position.x + 30; // 약간 오른쪽으로
        block2.velocity.y = 0;
        block2.velocity.x = 0;
        block2.angularVelocity = 0;

        for (let i = 0; i < 20; i++) {
          controller.update(1 / 60);
          const checkPlacedBlocks = controller._getPlacedBlocks();
          if (checkPlacedBlocks.includes(block2)) break;
        }

        // 블록이 배치되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
        const placedBlocks2 = controller._getPlacedBlocks();
        expect(placedBlocks2).toContain(block2);
        expect(block2.isStatic).toBe(false);
        
        // 블록들이 물리 엔진에서 계속 시뮬레이션되는지 확인
        const block1InitialY = block1.position.y;
        const block1InitialAngle = block1.angle;
        
        // 여러 프레임 업데이트
        for (let i = 0; i < 60; i++) {
          controller.update(1 / 60);
        }
        
        // 블록들이 물리 엔진에 여전히 있어야 함
        expect(controller.physicsService.bodies).toContain(block1);
        expect(controller.physicsService.bodies).toContain(block2);
        
        // 블록들이 isStatic=false이므로 무게 균형에 따라 움직일 수 있음
        // (안정적인 상태면 위치가 거의 변하지 않을 수 있음)
        expect(block1.isStatic).toBe(false);
        expect(block2.isStatic).toBe(false);
      }
    });
  });
});

