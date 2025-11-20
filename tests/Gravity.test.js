import { Gravity } from '../src/physics/Gravity.js';
import { Body } from '../src/physics/Body.js';
import { Vector } from '../src/physics/Vector.js';

describe('Gravity', () => {
  describe('생성자', () => {
    test('기본 생성자는 기본 중력값을 사용한다', () => {
      const gravity = new Gravity();
      expect(gravity.gravity).toBe(9.8);
      expect(gravity.direction.y).toBeCloseTo(1, 5);
    });

    test('옵션으로 중력값을 설정할 수 있다', () => {
      const gravity = new Gravity({ gravity: 20 });
      expect(gravity.gravity).toBe(20);
    });

    test('옵션으로 중력 방향을 설정할 수 있다', () => {
      const direction = new Vector(1, 0);
      const gravity = new Gravity({ direction });
      expect(gravity.direction.x).toBeCloseTo(1, 5);
      expect(gravity.direction.y).toBeCloseTo(0, 5);
    });
  });

  describe('getGravityVector', () => {
    test('중력 벡터를 반환한다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const vector = gravity.getGravityVector();
      expect(vector.x).toBeCloseTo(0, 5);
      expect(vector.y).toBeCloseTo(10, 5);
    });

    test('방향이 정규화되어 있다', () => {
      const direction = new Vector(10, 10);
      const gravity = new Gravity({ direction, gravity: 10 });
      const vector = gravity.getGravityVector();
      const magnitude = vector.magnitude();
      expect(magnitude).toBeCloseTo(10, 5);
    });
  });

  describe('apply', () => {
    test('Body에 중력을 적용한다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const body = new Body({ mass: 2 });
      gravity.apply(body);
      // 힘 = 질량 * 중력 = 2 * 10 = 20 (아래 방향)
      expect(body.force.y).toBeCloseTo(20, 5);
    });

    test('정적 객체에는 중력이 적용되지 않는다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const body = new Body({ mass: 2, isStatic: true });
      gravity.apply(body);
      expect(body.force.magnitude()).toBe(0);
    });

    test('여러 번 적용하면 힘이 누적된다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const body = new Body({ mass: 1 });
      gravity.apply(body);
      gravity.apply(body);
      expect(body.force.y).toBeCloseTo(20, 5);
    });
  });

  describe('applyToBodies', () => {
    test('여러 Body에 중력을 적용한다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const body1 = new Body({ mass: 1 });
      const body2 = new Body({ mass: 2 });
      gravity.applyToBodies([body1, body2]);
      expect(body1.force.y).toBeCloseTo(10, 5);
      expect(body2.force.y).toBeCloseTo(20, 5);
    });
  });

  describe('setGravity', () => {
    test('중력 가속도를 설정한다', () => {
      const gravity = new Gravity();
      gravity.setGravity(20);
      expect(gravity.gravity).toBe(20);
    });
  });

  describe('setDirection', () => {
    test('중력 방향을 설정한다', () => {
      const gravity = new Gravity();
      gravity.setDirection(new Vector(1, 0));
      expect(gravity.direction.x).toBeCloseTo(1, 5);
      expect(gravity.direction.y).toBeCloseTo(0, 5);
    });

    test('방향이 자동으로 정규화된다', () => {
      const gravity = new Gravity();
      gravity.setDirection(new Vector(10, 0));
      expect(gravity.direction.magnitude()).toBeCloseTo(1, 5);
    });
  });

  describe('disable/enable', () => {
    test('중력을 비활성화한다', () => {
      const gravity = new Gravity({ gravity: 10 });
      gravity.disable();
      expect(gravity.gravity).toBe(0);
    });

    test('중력을 활성화한다', () => {
      const gravity = new Gravity();
      gravity.disable();
      gravity.enable(20);
      expect(gravity.gravity).toBe(20);
    });

    test('활성화 시 기본값을 사용한다', () => {
      const gravity = new Gravity();
      gravity.disable();
      gravity.enable();
      expect(gravity.gravity).toBe(9.8);
    });
  });

  describe('통합 테스트', () => {
    test('중력이 적용된 Body가 떨어진다', () => {
      const gravity = new Gravity({ gravity: 10 });
      const body = new Body({ 
        mass: 1,
        position: new Vector(0, 0),
        friction: 0
      });
      
      // 중력 적용
      gravity.apply(body);
      
      // 물리 업데이트
      body.update(1); // 1초 경과
      
      // 속도 = 가속도 * 시간 = 10 * 1 = 10
      expect(body.velocity.y).toBeCloseTo(10, 5);
      
      // 오일러 적분: 위치 = 속도 * 시간 = 10 * 1 = 10
      expect(body.position.y).toBeCloseTo(10, 5);
    });

    test('다른 방향의 중력도 작동한다', () => {
      const gravity = new Gravity({ 
        gravity: 10,
        direction: new Vector(1, 0) // 오른쪽
      });
      const body = new Body({ 
        mass: 1,
        friction: 0
      });
      
      gravity.apply(body);
      body.update(1);
      
      expect(body.velocity.x).toBeGreaterThan(0);
      expect(body.velocity.y).toBeCloseTo(0, 5);
    });
  });
});

