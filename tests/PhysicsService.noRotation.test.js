import { PhysicsService } from '../src/service/PhysicsService.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';

describe('PhysicsService - Block Should Not Rotate Unnecessarily', () => {
  let physicsService;
  const deltaTime = 1 / 60; // 60fps

  beforeEach(() => {
    physicsService = new PhysicsService({
      timeStep: deltaTime,
      iterations: 50,
    });
    physicsService.setGravity(500);
  });

  afterEach(() => {
    physicsService.clearBodies();
  });

  describe('블록이 회전하지 않아야 하는 상황', () => {
    test('블록이 베이스에 완벽하게 수평으로 닿았을 때 회전하지 않아야 함', () => {
      // 베이스 생성
      const basePositionY = 600;
      const baseHeight = 30;
      const baseCenterY = basePositionY - baseHeight / 2;
      
      const base = new Block({
        position: new Vector(400, baseCenterY),
        width: 400,
        height: baseHeight,
        isStatic: true,
        friction: 0.8,
        restitution: 0,
      });
      base.isPlaced = true;
      physicsService.addBody(base);

      // 블록 생성 (베이스 바로 위에 완벽하게 수평으로 배치)
      // 각속도 0, 각도 0으로 시작
      const block = new Block({
        position: new Vector(400, 545),
        width: 50,
        height: 50,
        mass: 20,
        friction: 0.8,
        restitution: 0,
        angle: 0, // 완벽하게 수평
        angularVelocity: 0, // 회전 없음
      });
      block.velocity.y = 100; // 아래로 떨어지는 속도만 있음
      block.velocity.x = 0; // 수평 속도 없음
      physicsService.addBody(block);

      // 여러 프레임 시뮬레이션
      const angularVelocities = [];
      const angles = [];
      
      for (let i = 0; i < 600; i++) {
        physicsService.update(deltaTime);
        angularVelocities.push(Math.abs(block.angularVelocity));
        angles.push(Math.abs(block.angle));
        
        // 블록이 베이스에 닿은 후에는 각속도가 0에 가까워야 함
        if (i > 60) {
          // 충돌 후에는 각속도가 매우 작아야 함
          expect(Math.abs(block.angularVelocity)).toBeLessThan(0.1);
        }
      }

      // 최종적으로 각속도가 거의 0이어야 함
      expect(Math.abs(block.angularVelocity)).toBeLessThan(0.01);
      
      // 각도도 거의 0이어야 함 (회전하지 않음)
      expect(Math.abs(block.angle)).toBeLessThan(0.01);
      
      // 각속도가 계속 증가하지 않아야 함 (최대값 확인)
      const maxAngularVelocity = Math.max(...angularVelocities);
      expect(maxAngularVelocity).toBeLessThan(0.5); // 최대 각속도가 0.5 라디안/초 이하여야 함
    });

    test('블록이 베이스에 닿은 후 추가로 회전하지 않아야 함', () => {
      // 베이스 생성
      const basePositionY = 600;
      const baseHeight = 30;
      const baseCenterY = basePositionY - baseHeight / 2;
      
      const base = new Block({
        position: new Vector(400, baseCenterY),
        width: 400,
        height: baseHeight,
        isStatic: true,
        friction: 0.8,
        restitution: 0,
      });
      base.isPlaced = true;
      physicsService.addBody(base);

      // 블록 생성
      const block = new Block({
        position: new Vector(400, 545),
        width: 50,
        height: 50,
        mass: 20,
        friction: 0.8,
        restitution: 0,
        angle: 0,
        angularVelocity: 0,
      });
      block.velocity.y = 100;
      block.velocity.x = 0;
      physicsService.addBody(block);

      // 블록이 안정화될 때까지 시뮬레이션
      for (let i = 0; i < 600; i++) {
        physicsService.update(deltaTime);
      }

      // 안정화 후 각속도와 각도 기록
      const initialAngularVelocity = block.angularVelocity;
      const initialAngle = block.angle;

      // 추가 시뮬레이션 (안정화 후에도 회전하지 않는지 확인)
      for (let i = 0; i < 300; i++) {
        physicsService.update(deltaTime);
        
        // 각속도가 증가하지 않아야 함
        expect(Math.abs(block.angularVelocity)).toBeLessThanOrEqual(Math.abs(initialAngularVelocity) + 0.01);
        
        // 각도가 크게 변하지 않아야 함
        expect(Math.abs(block.angle - initialAngle)).toBeLessThan(0.1);
      }

      // 최종적으로 각속도가 거의 0이어야 함
      expect(Math.abs(block.angularVelocity)).toBeLessThan(0.01);
    });

    test('블록이 다른 블록 위에 완벽하게 수평으로 쌓였을 때 회전하지 않아야 함', () => {
      // 베이스 생성
      const basePositionY = 600;
      const baseHeight = 30;
      const baseCenterY = basePositionY - baseHeight / 2;
      
      const base = new Block({
        position: new Vector(400, baseCenterY),
        width: 400,
        height: baseHeight,
        isStatic: true,
        friction: 0.8,
        restitution: 0,
      });
      base.isPlaced = true;
      physicsService.addBody(base);

      // 첫 번째 블록
      const block1 = new Block({
        position: new Vector(400, 545),
        width: 50,
        height: 50,
        mass: 20,
        friction: 0.8,
        restitution: 0,
        angle: 0,
        angularVelocity: 0,
      });
      block1.velocity.y = 100;
      block1.velocity.x = 0;
      physicsService.addBody(block1);

      // 첫 번째 블록 안정화
      for (let i = 0; i < 600; i++) {
        physicsService.update(deltaTime);
      }

      // 두 번째 블록 (첫 번째 블록 위에 완벽하게 수평으로 배치)
      const block2 = new Block({
        position: new Vector(400, 495),
        width: 50,
        height: 50,
        mass: 20,
        friction: 0.8,
        restitution: 0,
        angle: 0,
        angularVelocity: 0,
      });
      block2.velocity.y = 100;
      block2.velocity.x = 0;
      physicsService.addBody(block2);

      // 두 번째 블록 안정화
      for (let i = 0; i < 600; i++) {
        physicsService.update(deltaTime);
      }

      // 두 블록 모두 회전하지 않아야 함
      expect(Math.abs(block1.angularVelocity)).toBeLessThan(0.01);
      expect(Math.abs(block1.angle)).toBeLessThan(0.01);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(0.01);
      expect(Math.abs(block2.angle)).toBeLessThan(0.01);

      // 추가 시뮬레이션으로 회전하지 않는지 확인
      const initialAngularVelocity1 = block1.angularVelocity;
      const initialAngularVelocity2 = block2.angularVelocity;
      const initialAngle1 = block1.angle;
      const initialAngle2 = block2.angle;

      for (let i = 0; i < 300; i++) {
        physicsService.update(deltaTime);
        
        // 각속도가 증가하지 않아야 함
        expect(Math.abs(block1.angularVelocity)).toBeLessThanOrEqual(Math.abs(initialAngularVelocity1) + 0.01);
        expect(Math.abs(block2.angularVelocity)).toBeLessThanOrEqual(Math.abs(initialAngularVelocity2) + 0.01);
      }
    });
  });
});

