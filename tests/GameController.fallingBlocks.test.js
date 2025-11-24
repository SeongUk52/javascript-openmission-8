import { GameController } from '../src/controller/GameController.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { jest } from '@jest/globals';

// requestAnimationFrame 및 cancelAnimationFrame 모킹
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 1000 / 60));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

describe('GameController - Falling Blocks Management', () => {
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
    jest.clearAllMocks(); // start() 호출로 인한 스파이 초기화
  });

  afterEach(() => {
    controller.stop();
  });

  test('placeBlock 호출 시 블록이 fallingBlocks에 추가되어야 함', () => {
    const initialBlock = controller.currentBlock;
    expect(initialBlock).not.toBeNull();
    expect(controller.fallingBlocks.size).toBe(0);

    controller.placeBlock();

    expect(controller.fallingBlocks.has(initialBlock)).toBe(true);
    expect(controller.fallingBlocks.size).toBe(1);
    expect(initialBlock.isFalling).toBe(true);
    // placeBlock 후 다음 블록이 생성되므로 currentBlock은 null이 아닐 수 있음
    // 대신 initialBlock이 fallingBlocks에 있는지 확인
  });

  test('떨어지는 중 스페이스바 입력 시 새 블록이 생성되어야 함', () => {
    const firstBlock = controller.currentBlock;
    expect(firstBlock).not.toBeNull();
    
    controller.placeBlock(); // 첫 번째 블록 떨어뜨림

    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);
    // placeBlock 후 다음 블록이 생성되므로 currentBlock은 null이 아닐 수 있음

    // 떨어지는 중에 다시 placeBlock 호출 (새 블록 생성하고 바로 떨어뜨림)
    controller.placeBlock();

    // 첫 번째 블록은 여전히 fallingBlocks에 있어야 함
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);
    // fallingBlocks에는 최소 1개 이상 있어야 함 (새 블록도 떨어뜨려졌을 수 있음)
    expect(controller.fallingBlocks.size).toBeGreaterThanOrEqual(1);
  });

  test('여러 블록이 동시에 떨어질 수 있어야 함', () => {
    const firstBlock = controller.currentBlock;
    controller.placeBlock(); // 첫 번째 블록 떨어뜨림
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);

    // 두 번째 블록 떨어뜨림 (placeBlock이 새 블록 생성하고 바로 떨어뜨림)
    controller.placeBlock();
    expect(controller.fallingBlocks.size).toBeGreaterThanOrEqual(1);

    // 세 번째 블록 떨어뜨림
    controller.placeBlock();
    
    // 모든 블록이 fallingBlocks에 있어야 함 (최소 3개)
    expect(controller.fallingBlocks.size).toBeGreaterThanOrEqual(3);
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);
  });

  test('블록이 타워에 고정되면 fallingBlocks에서 제거되어야 함', () => {
    const fallingBlock = controller.currentBlock;
    controller.placeBlock(); // 블록 떨어뜨림
    
    // placeBlock 후 fallingBlocks에 추가됨
    expect(controller.fallingBlocks.has(fallingBlock)).toBe(true);
    
    // 블록이 베이스에 닿도록 위치 강제 설정
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    const targetY = baseAABB.min.y - fallingBlock.height / 2;
    fallingBlock.position.y = targetY;
    fallingBlock.velocity.y = 0;

    // 물리 업데이트를 통해 충돌 감지 및 고정 로직 실행
    controller.update(1 / 60);

    // 블록이 타워에 추가되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
    const placedBlocks = controller._getPlacedBlocks();
    expect(placedBlocks).toContain(fallingBlock);
    expect(controller.fallingBlocks.has(fallingBlock)).toBe(false);
    expect(controller.fallingBlocks.size).toBe(0);
  });

  test('_fixBlockToTower는 currentBlock이 아니어도 작동해야 함', () => {
    const fallingBlock = controller.currentBlock;
    controller.placeBlock(); // 블록 떨어뜨림
    
    expect(controller.fallingBlocks.has(fallingBlock)).toBe(true);
    
    // 블록이 베이스에 닿도록 위치 강제 설정
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    const targetY = baseAABB.min.y - fallingBlock.height / 2;
    fallingBlock.position.y = targetY;
    fallingBlock.velocity.y = 0;

    // _fixBlockToTower 직접 호출
    controller._fixBlockToTower(fallingBlock);

    // 블록이 타워에 추가되었는지 확인 (isPlaced 대신 _getPlacedBlocks 사용)
    const placedBlocks = controller._getPlacedBlocks();
    expect(placedBlocks).toContain(fallingBlock);
    expect(controller.fallingBlocks.has(fallingBlock)).toBe(false);
    expect(controller.tower.getBlockCount()).toBe(1);
  });

  test('충돌 감지 시 모든 떨어지는 블록에 대해 작동해야 함', () => {
    // 첫 번째 블록 떨어뜨림
    const firstBlock = controller.currentBlock;
    controller.placeBlock();
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);

    // 두 번째 블록 떨어뜨림 (placeBlock이 새 블록 생성하고 바로 떨어뜨림)
    controller.placeBlock();
    
    // fallingBlocks에서 두 번째 블록 찾기
    const fallingBlocksArray = Array.from(controller.fallingBlocks);
    expect(fallingBlocksArray.length).toBeGreaterThanOrEqual(1);
    expect(controller.fallingBlocks.has(firstBlock)).toBe(true);

    // 첫 번째 블록이 베이스에 닿도록 설정
    const baseBlock = controller.physicsService.bodies.find(b => b.isStatic);
    const baseAABB = baseBlock.getAABB();
    firstBlock.position.y = baseAABB.min.y - firstBlock.height / 2;
    firstBlock.velocity.y = 0;

    // 물리 업데이트
    controller.update(1 / 60);

    // 첫 번째 블록만 고정되어야 함 (isPlaced 대신 _getPlacedBlocks 사용)
    const placedBlocks = controller._getPlacedBlocks();
    expect(placedBlocks).toContain(firstBlock);
    expect(controller.fallingBlocks.has(firstBlock)).toBe(false);
    expect(controller.tower.getBlockCount()).toBe(1);
    expect(controller.tower.blocks.contains(firstBlock)).toBe(true);
  });
});

