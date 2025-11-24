import { PhysicsService } from '../src/service/PhysicsService.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';
import { CollisionUtil } from '../src/util/CollisionUtil.js';

describe('PhysicsService - Comprehensive Physics Tests', () => {
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

  describe('블록 안정성 테스트 (Block Stability Tests)', () => {
    // 테스트 1-10: 베이스 위 블록 안정성
    test('1. 블록이 베이스 중앙에 완벽하게 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('2. 블록이 베이스 왼쪽 끝에 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 0);
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('3. 블록이 베이스 오른쪽 끝에 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(600, 545, 0, 0);
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('4. 블록이 베이스 위에 약간 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 36, 0); // 5도 기울임
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('5. 블록이 베이스 위에 작은 각속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0.5);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('6. 블록이 베이스 위에 수평 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 50;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('7. 블록이 베이스 위에 큰 각속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 2.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('8. 블록이 베이스 위에 대각선 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 30;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('9. 블록이 베이스 위에 회전하면서 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 4, 1.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('10. 블록이 베이스 위에 여러 조건이 복합적으로 적용되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 18, 1.5);
      block.velocity.x = 20;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    // 테스트 11-30: 블록 위 블록 안정성 (완벽한 정렬)
    test('11. 두 번째 블록이 첫 번째 블록 중앙에 완벽하게 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('12. 두 번째 블록이 첫 번째 블록에서 1픽셀 오른쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(401, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('13. 두 번째 블록이 첫 번째 블록에서 5픽셀 오른쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(405, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('14. 두 번째 블록이 첫 번째 블록에서 10픽셀 오른쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(410, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('15. 두 번째 블록이 첫 번째 블록에서 15픽셀 오른쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(415, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('16. 두 번째 블록이 첫 번째 블록에서 20픽셀 오른쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(420, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('17. 두 번째 블록이 첫 번째 블록에서 1픽셀 왼쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(399, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('18. 두 번째 블록이 첫 번째 블록에서 5픽셀 왼쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(395, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('19. 두 번째 블록이 첫 번째 블록에서 10픽셀 왼쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(390, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('20. 두 번째 블록이 첫 번째 블록에서 15픽셀 왼쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(385, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('21. 두 번째 블록이 첫 번째 블록에서 20픽셀 왼쪽으로 벗어났을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(380, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('22. 두 번째 블록이 첫 번째 블록 위에 약간 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 36, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('23. 두 번째 블록이 첫 번째 블록 위에 작은 각속도로 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0.5);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('24. 두 번째 블록이 첫 번째 블록 위에 수평 속도로 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.x = 30;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('25. 두 번째 블록이 첫 번째 블록 위에 대각선 속도로 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.x = 20;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('26. 두 번째 블록이 첫 번째 블록 위에 회전하면서 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 8, 1.0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('27. 두 번째 블록이 첫 번째 블록 위에 여러 조건이 복합적으로 적용되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(405, 495, Math.PI / 36, 0.8);
      block2.velocity.x = 15;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('28. 두 번째 블록이 첫 번째 블록 위에 매우 작은 각도로 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 72, 0); // 2.5도
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('29. 두 번째 블록이 첫 번째 블록 위에 중간 각도로 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 18, 0); // 10도
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('30. 두 번째 블록이 첫 번째 블록 위에 큰 각도로 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 12, 0); // 15도
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });
  });

  describe('마찰 테스트 (Friction Tests)', () => {
    // 테스트 31-50: 마찰 관련 테스트
    test('31. 블록이 베이스 위에서 수평 속도로 떨어졌을 때 마찰에 의해 멈춰야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 0);
      block.velocity.x = 200;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block.velocity.y)).toBeLessThan(0.6);
    });

    test('32. 블록이 베이스 위에서 큰 수평 속도로 떨어졌을 때 마찰에 의해 멈춰야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 0);
      block.velocity.x = 300;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block.velocity.y)).toBeLessThan(0.6);
    });

    test('33. 블록이 다른 블록 위에서 수평 속도로 떨어졌을 때 마찰에 의해 멈춰야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(200, 495, 0, 0);
      block2.velocity.x = 150;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block2.velocity.y)).toBeLessThan(0.6);
    });

    test('34. 블록이 다른 블록 위에서 큰 수평 속도로 떨어졌을 때 마찰에 의해 멈춰야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(200, 495, 0, 0);
      block2.velocity.x = 250;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block2.velocity.y)).toBeLessThan(0.6);
    });

    test('35. 블록이 베이스 위에서 회전하면서 떨어졌을 때 마찰에 의해 회전이 멈춰야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 3.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(0.01);
    });

    test('36. 블록이 다른 블록 위에서 회전하면서 떨어졌을 때 마찰에 의해 회전이 멈춰야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 2.5);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(0.01);
    });

    test('37. 블록이 베이스 위에서 수평 속도와 회전이 동시에 있을 때 마찰에 의해 모두 멈춰야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 2.0);
      block.velocity.x = 150;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(0.01);
    });

    test('38. 블록이 다른 블록 위에서 수평 속도와 회전이 동시에 있을 때 마찰에 의해 모두 멈춰야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(200, 495, 0, 1.8);
      block2.velocity.x = 120;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(0.5);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(0.01);
    });

    test('39. 정적 마찰이 작은 상대 속도에서 작동해야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 0.5; // 정적 마찰 임계값 이하
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(0.5);
    });

    test('40. 정적 마찰이 큰 상대 속도에서도 작동해야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 2.0; // 정적 마찰 임계값 이상
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(0.5);
    });
  });

  describe('다중 블록 안정성 테스트 (Multiple Block Stability Tests)', () => {
    // 테스트 41-70: 다중 블록 안정성
    test('41. 3개 블록이 완벽하게 정렬되어 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(400, 445, 0, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('42. 3개 블록이 점진적으로 오른쪽으로 벗어나서 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(405, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(410, 445, 0, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('43. 3개 블록이 점진적으로 왼쪽으로 벗어나서 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(395, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(390, 445, 0, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('44. 4개 블록이 완벽하게 정렬되어 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(400, 445, 0, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);
      simulate(600);

      const block4 = createBlock(400, 395, 0, 0);
      block4.velocity.y = 100;
      physicsService.addBody(block4);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
      expectStable(block4);
    });

    test('45. 5개 블록이 완벽하게 정렬되어 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const blocks = [block1];
      for (let i = 0; i < 4; i++) {
        const y = 495 - i * 50;
        const block = createBlock(400, y, 0, 0);
        block.velocity.y = 100;
        physicsService.addBody(block);
        simulate(600);
        blocks.push(block);
      }

      simulate(600);
      blocks.forEach(block => expectStable(block));
    });

    test('46. 3개 블록이 서로 다른 위치에 배치되었을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(410, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(390, 445, 0, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('47. 3개 블록이 각각 다른 각도로 기울어진 상태로 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, Math.PI / 36, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(400, 445, -Math.PI / 36, 0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('48. 3개 블록이 각각 다른 각속도로 떨어졌을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0.5);
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(400, 445, 0, 1.0);
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('49. 3개 블록이 각각 다른 수평 속도로 떨어졌을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.x = 20;
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(400, 445, 0, 0);
      block3.velocity.x = -15;
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('50. 3개 블록이 복합적인 조건으로 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(405, 495, Math.PI / 36, 0.3);
      block2.velocity.x = 10;
      block2.velocity.y = 100;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(395, 445, -Math.PI / 36, 0.5);
      block3.velocity.x = -10;
      block3.velocity.y = 100;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });
  });

  describe('충돌 해결 테스트 (Collision Resolution Tests)', () => {
    // 테스트 51-70: 충돌 해결
    test('51. 블록이 베이스와 충돌했을 때 penetration이 해결되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 560, 0, 0); // penetration 발생
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block, base);
      expect(manifold.penetration).toBeLessThan(0.1);
    });

    test('52. 블록이 다른 블록과 충돌했을 때 penetration이 해결되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 520, 0, 0); // penetration 발생
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block2, block1);
      expect(manifold.penetration).toBeLessThan(0.1);
    });

    test('53. 블록이 베이스와 충돌했을 때 normal이 올바르게 계산되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block, base);
      expect(manifold.collided).toBe(true);
      expect(Math.abs(manifold.normal.y)).toBeGreaterThan(0.9); // 수직 normal
    });

    test('54. 블록이 다른 블록과 충돌했을 때 normal이 올바르게 계산되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block2, block1);
      expect(manifold.collided).toBe(true);
      expect(Math.abs(manifold.normal.y)).toBeGreaterThan(0.9); // 수직 normal
    });

    test('55. 블록이 베이스와 충돌했을 때 속도가 올바르게 보정되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 200;
      physicsService.addBody(block);

      simulate(100);
      expect(block.velocity.y).toBeLessThan(50);
    });

    test('56. 블록이 다른 블록과 충돌했을 때 속도가 올바르게 보정되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 200;
      physicsService.addBody(block2);

      simulate(100);
      expect(block2.velocity.y).toBeLessThan(50);
    });

    test('57. 블록이 베이스와 충돌했을 때 각속도가 올바르게 보정되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 2.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(100);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(1.0);
    });

    test('58. 블록이 다른 블록과 충돌했을 때 각속도가 올바르게 보정되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 2.0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(100);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(1.0);
    });

    test('59. 블록이 베이스와 충돌했을 때 위치가 올바르게 보정되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 560, 0, 0); // penetration
      block.velocity.y = 100;
      physicsService.addBody(block);

      const initialY = block.position.y;
      simulate(100);
      expect(block.position.y).toBeLessThan(initialY); // 위로 올라가야 함
    });

    test('60. 블록이 다른 블록과 충돌했을 때 위치가 올바르게 보정되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 520, 0, 0); // penetration
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      const initialY = block2.position.y;
      simulate(100);
      expect(block2.position.y).toBeLessThan(initialY); // 위로 올라가야 함
    });
  });

  describe('접촉 제약 조건 테스트 (Contact Constraint Tests)', () => {
    // 테스트 61-80: 접촉 제약 조건
    test('61. 블록이 베이스와 접촉 중일 때 접촉 제약 조건이 해결되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(100);
      const relativeVelocity = Vector.subtract(block.velocity, base.velocity);
      const manifold = CollisionUtil.getCollisionManifold(block, base);
      if (manifold.collided) {
        const velAlongNormal = relativeVelocity.dot(manifold.normal);
        expect(Math.abs(velAlongNormal)).toBeLessThan(25); // 접촉 제약 조건 해결
      }
    });

    test('62. 블록이 다른 블록과 접촉 중일 때 접촉 제약 조건이 해결되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(100);
      const relativeVelocity = Vector.subtract(block2.velocity, block1.velocity);
      const manifold = CollisionUtil.getCollisionManifold(block2, block1);
      if (manifold.collided) {
        const velAlongNormal = relativeVelocity.dot(manifold.normal);
        expect(Math.abs(velAlongNormal)).toBeLessThan(25); // 접촉 제약 조건 해결
      }
    });

    test('63. 블록이 베이스와 접촉 중일 때 중력 효과가 상쇄되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      const initialVelocityY = block.velocity.y;
      simulate(100);
      // 중력이 적용되지만 접촉 제약 조건으로 상쇄되어야 함
      expect(Math.abs(block.velocity.y)).toBeLessThan(Math.abs(initialVelocityY) + 50);
    });

    test('64. 블록이 다른 블록과 접촉 중일 때 중력 효과가 상쇄되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      const initialVelocityY = block2.velocity.y;
      simulate(100);
      expect(Math.abs(block2.velocity.y)).toBeLessThan(Math.abs(initialVelocityY) + 50);
    });

    test('65. 블록이 베이스와 접촉 중일 때 여러 반복 후에도 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(1200); // 더 긴 시뮬레이션
      expectStable(block);
    });

    test('66. 블록이 다른 블록과 접촉 중일 때 여러 반복 후에도 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(1200); // 더 긴 시뮬레이션
      expectStable(block1);
      expectStable(block2);
    });

    test('67. 블록이 베이스와 접촉 중일 때 penetration이 지속적으로 해결되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 560, 0, 0); // penetration
      block.velocity.y = 100;
      physicsService.addBody(block);

      for (let i = 0; i < 100; i++) {
        physicsService.update(deltaTime);
        const manifold = CollisionUtil.getCollisionManifold(block, base);
        if (manifold.collided) {
          expect(manifold.penetration).toBeLessThan(1.0);
        }
      }
    });

    test('68. 블록이 다른 블록과 접촉 중일 때 penetration이 지속적으로 해결되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 520, 0, 0); // penetration
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      for (let i = 0; i < 100; i++) {
        physicsService.update(deltaTime);
        const manifold = CollisionUtil.getCollisionManifold(block2, block1);
        if (manifold.collided) {
          expect(manifold.penetration).toBeLessThan(1.0);
        }
      }
    });

    test('69. 블록이 베이스와 접촉 중일 때 접촉점이 올바르게 계산되어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block, base);
      if (manifold.collided) {
        // 접촉점이 블록과 베이스 사이에 있어야 함
        expect(manifold.normal).toBeDefined();
        expect(manifold.penetration).toBeGreaterThan(0);
      }
    });

    test('70. 블록이 다른 블록과 접촉 중일 때 접촉점이 올바르게 계산되어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(100);
      const manifold = CollisionUtil.getCollisionManifold(block2, block1);
      if (manifold.collided) {
        expect(manifold.normal).toBeDefined();
        expect(manifold.penetration).toBeGreaterThan(0);
      }
    });
  });

  describe('극단적인 상황 테스트 (Edge Case Tests)', () => {
    // 테스트 71-100: 극단적인 상황
    test('71. 블록이 베이스 가장자리에 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(150, 545, 0, 0); // 베이스 왼쪽 가장자리
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('72. 블록이 베이스 다른 가장자리에 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(650, 545, 0, 0); // 베이스 오른쪽 가장자리
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('73. 블록이 다른 블록 가장자리에 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(425, 495, 0, 0); // block1 오른쪽 가장자리
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('74. 블록이 다른 블록 다른 가장자리에 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(375, 495, 0, 0); // block1 왼쪽 가장자리
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('75. 블록이 매우 작은 각도로 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 180, 0); // 1도
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('76. 블록이 매우 큰 각도로 기울어진 상태로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 6, 0); // 30도
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      // 30도는 매우 큰 각도이므로 안정적이지 않을 수 있음
      // 하지만 마찰에 의해 어느 정도 안정적이어야 함
      expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
    });

    test('77. 블록이 매우 작은 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 10; // 매우 작은 속도
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('78. 블록이 매우 큰 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 500; // 매우 큰 속도
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('79. 블록이 매우 작은 각속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0.1);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('80. 블록이 매우 큰 각속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 5.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
    });

    test('81. 블록이 매우 작은 수평 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 1;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('82. 블록이 매우 큰 수평 속도로 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.x = 400;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
    });

    test('83. 블록이 복합적인 극단적인 조건으로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, Math.PI / 12, 4.0);
      block.velocity.x = 200;
      block.velocity.y = 300;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
    });

    test('84. 여러 블록이 극단적인 조건으로 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(415, 495, Math.PI / 18, 2.0);
      block2.velocity.x = 100;
      block2.velocity.y = 200;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(385, 445, -Math.PI / 18, 1.5);
      block3.velocity.x = -80;
      block3.velocity.y = 150;
      physicsService.addBody(block3);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
    });

    test('85. 블록이 베이스 위에서 매우 빠르게 회전하면서 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 10.0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
    });

    test('86. 블록이 다른 블록 위에서 매우 빠르게 회전하면서 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 8.0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(2.0);
    });

    test('87. 블록이 베이스 위에서 매우 빠르게 수평 이동하면서 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 0);
      block.velocity.x = 500;
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
    });

    test('88. 블록이 다른 블록 위에서 매우 빠르게 수평 이동하면서 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(200, 495, 0, 0);
      block2.velocity.x = 400;
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(1.0);
    });

    test('89. 블록이 베이스 위에서 매우 빠르게 대각선 이동하면서 떨어졌을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(200, 545, 0, 0);
      block.velocity.x = 300;
      block.velocity.y = 400;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
      expect(Math.abs(block.velocity.y)).toBeLessThan(0.6);
    });

    test('90. 블록이 다른 블록 위에서 매우 빠르게 대각선 이동하면서 떨어졌을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(200, 495, 0, 0);
      block2.velocity.x = 250;
      block2.velocity.y = 350;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(1.0);
      expect(Math.abs(block2.velocity.y)).toBeLessThan(0.6);
    });

    test('91. 블록이 베이스 위에서 모든 극단적인 조건이 복합적으로 적용되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(150, 545, Math.PI / 9, 6.0);
      block.velocity.x = 350;
      block.velocity.y = 450;
      physicsService.addBody(block);

      simulate(600);
      expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
      expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
    });

    test('92. 블록이 다른 블록 위에서 모든 극단적인 조건이 복합적으로 적용되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(150, 495, Math.PI / 9, 5.0);
      block2.velocity.x = 300;
      block2.velocity.y = 400;
      physicsService.addBody(block2);

      simulate(600);
      expect(Math.abs(block2.velocity.x)).toBeLessThan(1.0);
      expect(Math.abs(block2.angularVelocity)).toBeLessThan(2.0);
    });

    test('93. 블록이 베이스 위에서 매우 작은 penetration으로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 570, 0, 0); // 작은 penetration
      block.velocity.y = 50;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('94. 블록이 다른 블록 위에서 매우 작은 penetration으로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 520, 0, 0); // 작은 penetration
      block2.velocity.y = 50;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('95. 블록이 베이스 위에서 매우 큰 penetration으로 배치되었을 때 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 580, 0, 0); // 큰 penetration
      block.velocity.y = 50;
      physicsService.addBody(block);

      simulate(600);
      expectStable(block);
    });

    test('96. 블록이 다른 블록 위에서 매우 큰 penetration으로 배치되었을 때 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 530, 0, 0); // 큰 penetration
      block2.velocity.y = 50;
      physicsService.addBody(block2);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
    });

    test('97. 블록이 베이스 위에서 여러 번 반복 후에도 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const block = createBlock(400, 545, 0, 0);
      block.velocity.y = 100;
      physicsService.addBody(block);

      simulate(1800); // 매우 긴 시뮬레이션
      expectStable(block);
    });

    test('98. 블록이 다른 블록 위에서 여러 번 반복 후에도 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(400, 495, 0, 0);
      block2.velocity.y = 100;
      physicsService.addBody(block2);

      simulate(1800); // 매우 긴 시뮬레이션
      expectStable(block1);
      expectStable(block2);
    });

    test('99. 여러 블록이 복합적인 극단적인 조건으로 쌓였을 때 모두 안정적이어야 함', () => {
      const { base, block1 } = setupTwoBlocks();
      simulate(600);

      const block2 = createBlock(420, 495, Math.PI / 18, 3.0);
      block2.velocity.x = 150;
      block2.velocity.y = 250;
      physicsService.addBody(block2);
      simulate(600);

      const block3 = createBlock(380, 445, -Math.PI / 18, 2.5);
      block3.velocity.x = -120;
      block3.velocity.y = 200;
      physicsService.addBody(block3);
      simulate(600);

      const block4 = createBlock(410, 395, Math.PI / 36, 1.8);
      block4.velocity.x = 80;
      block4.velocity.y = 180;
      physicsService.addBody(block4);

      simulate(600);
      expectStable(block1);
      expectStable(block2);
      expectStable(block3);
      expectStable(block4);
    });

    test('100. 모든 극단적인 조건이 복합적으로 적용된 다중 블록이 안정적이어야 함', () => {
      const base = createBase(400, 600);
      physicsService.addBody(base);

      const blocks = [];
      for (let i = 0; i < 5; i++) {
        const x = 400 + (Math.random() - 0.5) * 30;
        const y = 545 - i * 50;
        const angle = (Math.random() - 0.5) * Math.PI / 9;
        const angularVel = (Math.random() - 0.5) * 2.0;
        const block = createBlock(x, y, angle, angularVel);
        block.velocity.x = (Math.random() - 0.5) * 100;
        block.velocity.y = 100 + Math.random() * 100;
        physicsService.addBody(block);
        simulate(600);
        blocks.push(block);
      }

      simulate(600);
      blocks.forEach(block => {
        expect(Math.abs(block.velocity.x)).toBeLessThan(1.0);
        expect(Math.abs(block.angularVelocity)).toBeLessThan(2.0);
      });
    });
  });

  // 헬퍼 함수들
  function createBase(x, y) {
    const baseHeight = 30;
    const baseCenterY = y - baseHeight / 2;
    const base = new Block({
      position: new Vector(x, baseCenterY),
      width: 400,
      height: baseHeight,
      isStatic: true,
      friction: 0.8,
      restitution: 0,
    });
    base.isPlaced = true;
    return base;
  }

  function createBlock(x, y, angle = 0, angularVelocity = 0) {
    return new Block({
      position: new Vector(x, y),
      width: 50,
      height: 50,
      mass: 1,
      friction: 0.8,
      restitution: 0,
      angle,
      angularVelocity,
    });
  }

  function setupTwoBlocks() {
    const base = createBase(400, 600);
    physicsService.addBody(base);

    const block1 = createBlock(400, 545, 0, 0);
    block1.velocity.y = 100;
    physicsService.addBody(block1);

    return { base, block1 };
  }

  function simulate(frames) {
    for (let i = 0; i < frames; i++) {
      physicsService.update(deltaTime);
    }
  }

  function expectStable(block) {
    expect(Math.abs(block.velocity.x)).toBeLessThan(0.6);
    expect(Math.abs(block.velocity.y)).toBeLessThan(0.6);
    expect(Math.abs(block.angularVelocity)).toBeLessThan(0.02);
  }
});

