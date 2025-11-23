import { PhysicsService } from '../src/service/PhysicsService.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { CollisionUtil } from '../src/util/CollisionUtil.js';
import { jest } from '@jest/globals';

describe('PhysicsService - Collision Detection', () => {
  let physicsService;
  let onCollisionSpy;

  beforeEach(() => {
    physicsService = new PhysicsService({
      timeStep: 1 / 60,
    });
    physicsService.setGravity(500);
    
    // 충돌 이벤트 스파이
    onCollisionSpy = jest.fn();
    physicsService.onCollision = onCollisionSpy;
  });

  afterEach(() => {
    physicsService.clearBodies();
  });

  test('정적 베이스와 떨어지는 블록이 충돌해야 함', () => {
    // 베이스 생성 (정적 객체)
    const baseHeight = 10;
    const canvasHeight = 600;
    const baseCenterY = canvasHeight - baseHeight / 2; // 595
    const base = new Block({
      position: new Vector(400, baseCenterY),
      width: 200,
      height: baseHeight,
      isStatic: true,
      color: '#34495e',
    });
    base.isPlaced = true;
    base.isFalling = false;
    physicsService.addBody(base);

    // 떨어지는 블록 생성
    const block = new Block({
      position: new Vector(400, 100), // 베이스 위쪽
      width: 50,
      height: 20,
      mass: 1,
      color: '#3498db',
    });
    block.isFalling = true;
    physicsService.addBody(block);

    // 물리 시뮬레이션 업데이트 (여러 프레임)
    let collisionDetected = false;
    for (let i = 0; i < 120; i++) { // 2초 시뮬레이션
      physicsService.update(1 / 60);
      
      // 충돌 이벤트가 발생했는지 확인
      if (onCollisionSpy.mock.calls.length > 0) {
        collisionDetected = true;
        console.log(`Frame ${i}: Collision detected!`, {
          blockPosition: block.position,
          basePosition: base.position,
          blockAABB: block.getAABB(),
          baseAABB: base.getAABB(),
        });
        break;
      }
      
      // 블록이 베이스에 닿았는지 확인
      const blockAABB = block.getAABB();
      const baseAABB = base.getAABB();
      
      // 블록의 하단이 베이스의 상단에 닿았는지 확인
      if (blockAABB.max.y >= baseAABB.min.y - 5) {
        console.log(`Frame ${i}: Block reached base`, {
          blockBottom: blockAABB.max.y,
          blockTop: blockAABB.min.y,
          baseTop: baseAABB.min.y,
          baseBottom: baseAABB.max.y,
          blockVelocityY: block.velocity.y,
          collisionDetected: onCollisionSpy.mock.calls.length > 0,
          isColliding: CollisionUtil.isAABBColliding(block, base),
        });
      }
    }

    // 충돌 이벤트가 발생했는지 확인
    expect(onCollisionSpy).toHaveBeenCalled();
    
    // 블록이 베이스 위에 있어야 함
    const blockAABB = block.getAABB();
    const baseAABB = base.getAABB();
    expect(blockAABB.min.y).toBeLessThanOrEqual(baseAABB.max.y + 10);
  });

  test('베이스와 블록의 AABB가 겹치면 충돌 감지되어야 함', () => {
    const base = new Block({
      position: new Vector(400, 595), // 베이스 중심
      width: 200,
      height: 10,
      isStatic: true,
    });
    base.isPlaced = true;
    physicsService.addBody(base);

    // 블록이 베이스 바로 위에 위치
    const block = new Block({
      position: new Vector(400, 580), // 베이스 위 15픽셀
      width: 50,
      height: 20,
    });
    block.isFalling = true;
    physicsService.addBody(block);

    // 한 프레임 업데이트
    physicsService.update(1 / 60);

    // 충돌이 감지되어야 함
    expect(onCollisionSpy).toHaveBeenCalled();
  });

  test('베이스와 블록이 같은 X 위치에 있어야 충돌함', () => {
    const base = new Block({
      position: new Vector(400, 595),
      width: 200,
      height: 10,
      isStatic: true,
    });
    base.isPlaced = true;
    physicsService.addBody(base);

    // 블록이 베이스의 X 범위 밖에 위치
    const block = new Block({
      position: new Vector(600, 580), // 베이스 오른쪽 밖
      width: 50,
      height: 20,
    });
    block.isFalling = true;
    physicsService.addBody(block);

    // 여러 프레임 업데이트
    for (let i = 0; i < 60; i++) {
      physicsService.update(1 / 60);
    }

    // 충돌이 감지되지 않아야 함 (X 위치가 다름)
    expect(onCollisionSpy).not.toHaveBeenCalled();
  });
});

