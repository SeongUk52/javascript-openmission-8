import { Body } from '../src/domain/Body.js';
import { Vector } from '../src/domain/Vector.js';

describe('Body', () => {
  describe('생성자', () => {
    test('기본 생성자는 기본값으로 객체를 만든다', () => {
      const body = new Body();
      expect(body.position.x).toBe(0);
      expect(body.position.y).toBe(0);
      expect(body.mass).toBe(1);
      expect(body.angle).toBe(0);
    });

    test('옵션으로 초기값을 설정할 수 있다', () => {
      const body = new Body({
        position: new Vector(10, 20),
        mass: 5,
        width: 100,
        height: 50
      });
      expect(body.position.x).toBe(10);
      expect(body.position.y).toBe(20);
      expect(body.mass).toBe(5);
      expect(body.width).toBe(100);
      expect(body.height).toBe(50);
    });

    test('정적 객체는 무한대 질량을 가진다', () => {
      const body = new Body({ isStatic: true });
      expect(body.mass).toBe(Infinity);
      expect(body.invMass).toBe(0);
    });
  });

  describe('관성 모멘트', () => {
    test('관성 모멘트를 계산한다', () => {
      const body = new Body({ mass: 12, width: 2, height: 2 });
      // I = (1/12) * m * (w² + h²) = (1/12) * 12 * (4 + 4) = 8
      expect(body.inertia).toBeCloseTo(8, 5);
    });

    test('정적 객체는 무한대 관성 모멘트를 가진다', () => {
      const body = new Body({ isStatic: true });
      expect(body.inertia).toBe(Infinity);
      expect(body.invInertia).toBe(0);
    });
  });

  describe('힘 적용', () => {
    test('힘을 적용한다', () => {
      const body = new Body({ mass: 1 });
      body.applyForce(new Vector(10, 0));
      expect(body.force.x).toBe(10);
      expect(body.force.y).toBe(0);
    });

    test('여러 힘을 누적 적용할 수 있다', () => {
      const body = new Body({ mass: 1 });
      body.applyForce(new Vector(10, 0));
      body.applyForce(new Vector(0, 5));
      expect(body.force.x).toBe(10);
      expect(body.force.y).toBe(5);
    });

    test('특정 위치에 힘을 적용하면 토크가 생성된다', () => {
      const body = new Body({ mass: 1, position: new Vector(0, 0) });
      const force = new Vector(10, 0);
      const point = new Vector(0, 5); // y축 위의 점
      body.applyForceAtPoint(force, point);
      expect(body.force.x).toBe(10);
      // r × F = (0, 5) × (10, 0) = 0*0 - 5*10 = -50 (2D 외적은 스칼라)
      expect(Math.abs(body.torque)).toBeCloseTo(50, 5);
    });
  });

  describe('충격량 적용', () => {
    test('충격량을 적용하면 속도가 즉시 변경된다', () => {
      const body = new Body({ mass: 1 });
      body.applyImpulse(new Vector(10, 0));
      expect(body.velocity.x).toBeCloseTo(10, 5);
    });

    test('정적 객체에는 충격량이 적용되지 않는다', () => {
      const body = new Body({ isStatic: true });
      const initialVelocity = body.velocity.copy();
      body.applyImpulse(new Vector(10, 0));
      expect(body.velocity.x).toBe(initialVelocity.x);
    });
  });

  describe('물리 업데이트', () => {
    test('가속도에 따라 속도가 변경된다', () => {
      const body = new Body({ mass: 1, friction: 0 }); // 마찰 없음
      body.applyForce(new Vector(10, 0));
      body.update(1); // 1초 경과
      expect(body.velocity.x).toBeCloseTo(10, 5);
      // 오일러 적분: x = x0 + v*t (v는 업데이트된 속도)
      // 첫 프레임: v = 10, x = 0 + 10*1 = 10
      expect(body.position.x).toBeCloseTo(10, 5);
    });

    test('속도에 따라 위치가 변경된다', () => {
      const body = new Body({ 
        position: new Vector(0, 0),
        velocity: new Vector(10, 0)
      });
      body.update(1);
      expect(body.position.x).toBeCloseTo(10, 5);
    });

    test('토크에 따라 각속도가 변경된다', () => {
      const body = new Body({ mass: 1, width: 2, height: 2, friction: 0 });
      body.applyTorque(10);
      body.update(1);
      expect(body.angularVelocity).toBeGreaterThan(0);
      expect(isNaN(body.angularVelocity)).toBe(false);
    });

    test('각속도에 따라 각도가 변경된다', () => {
      const body = new Body({ angularVelocity: 1, friction: 0 });
      body.update(1);
      expect(body.angle).toBeCloseTo(1, 5);
    });

    test('업데이트 후 힘과 토크가 초기화된다', () => {
      const body = new Body({ mass: 1 });
      body.applyForce(new Vector(10, 0));
      body.applyTorque(5);
      body.update(1);
      expect(body.force.magnitude()).toBeCloseTo(0, 5);
      expect(body.torque).toBeCloseTo(0, 5);
    });

    test('정적 객체는 업데이트되지 않는다', () => {
      const body = new Body({ 
        isStatic: true,
        position: new Vector(10, 20)
      });
      const initialPosition = body.position.copy();
      body.applyForce(new Vector(100, 100));
      body.update(1);
      expect(body.position.x).toBe(initialPosition.x);
      expect(body.position.y).toBe(initialPosition.y);
    });
  });

  describe('마찰', () => {
    test('마찰이 속도를 감소시킨다', () => {
      const body = new Body({ 
        mass: 1,
        velocity: new Vector(10, 0),
        friction: 0.5
      });
      body.update(1);
      expect(body.velocity.magnitude()).toBeLessThan(10);
    });

    test('매우 작은 속도는 0으로 설정된다', () => {
      const body = new Body({ 
        mass: 1,
        velocity: new Vector(0.005, 0),
        friction: 1
      });
      body.update(1);
      expect(body.velocity.magnitude()).toBeCloseTo(0, 2);
    });
  });

  describe('좌표 변환', () => {
    test('로컬 좌표를 월드 좌표로 변환한다', () => {
      const body = new Body({ 
        position: new Vector(10, 20),
        angle: Math.PI / 2
      });
      const localPoint = new Vector(1, 0);
      const worldPoint = body.localToWorld(localPoint);
      expect(worldPoint.x).toBeCloseTo(10, 5);
      expect(worldPoint.y).toBeCloseTo(21, 5);
    });

    test('월드 좌표를 로컬 좌표로 변환한다', () => {
      const body = new Body({ 
        position: new Vector(10, 20),
        angle: Math.PI / 2
      });
      const worldPoint = new Vector(10, 21);
      const localPoint = body.worldToLocal(worldPoint);
      expect(localPoint.x).toBeCloseTo(1, 5);
      expect(localPoint.y).toBeCloseTo(0, 5);
    });
  });

  describe('AABB', () => {
    test('AABB 경계를 계산한다', () => {
      const body = new Body({
        position: new Vector(10, 20),
        width: 4,
        height: 4
      });
      const aabb = body.getAABB();
      expect(aabb.min.x).toBeLessThanOrEqual(aabb.max.x);
      expect(aabb.min.y).toBeLessThanOrEqual(aabb.max.y);
    });
  });

  describe('속도 제한', () => {
    test('속도를 제한한다', () => {
      const body = new Body({ velocity: new Vector(100, 0) });
      body.limitVelocity(10);
      expect(body.velocity.magnitude()).toBeCloseTo(10, 5);
    });

    test('각속도를 제한한다', () => {
      const body = new Body({ angularVelocity: 100 });
      body.limitAngularVelocity(10);
      expect(Math.abs(body.angularVelocity)).toBeLessThanOrEqual(10);
    });
  });

  describe('copy', () => {
    test('객체를 복사한다', () => {
      const body = new Body({
        position: new Vector(10, 20),
        mass: 5
      });
      const copy = body.copy();
      expect(copy.position.x).toBe(10);
      expect(copy.mass).toBe(5);
      expect(copy).not.toBe(body);
    });
  });
});

