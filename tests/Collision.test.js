import { Collision } from '../src/physics/Collision.js';
import { Body } from '../src/physics/Body.js';
import { Vector } from '../src/physics/Vector.js';

describe('Collision', () => {
  const createBody = (options = {}) =>
    new Body({
      width: 50,
      height: 50,
      mass: 1,
      friction: 0,
      restitution: 1,
      ...options,
    });

  describe('isAABBColliding', () => {
    test('충돌하지 않을 때 false를 반환한다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(100, 100) });
      expect(Collision.isAABBColliding(bodyA, bodyB)).toBe(false);
    });

    test('충돌할 때 true를 반환한다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(20, 20) });
      expect(Collision.isAABBColliding(bodyA, bodyB)).toBe(true);
    });
  });

  describe('getCollisionManifold', () => {
    test('충돌하지 않으면 collided=false를 반환한다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(200, 0) });
      const result = Collision.getCollisionManifold(bodyA, bodyB);
      expect(result.collided).toBe(false);
    });

    test('X축 방향으로 충돌하면 X 방향 노말을 제공한다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(40, 0) });
      const result = Collision.getCollisionManifold(bodyA, bodyB);
      expect(result.collided).toBe(true);
      expect(Math.abs(result.normal.x)).toBe(1);
      expect(result.penetration).toBeGreaterThan(0);
    });

    test('Y축 방향으로 충돌하면 Y 방향 노말을 제공한다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(0, 40) });
      const result = Collision.getCollisionManifold(bodyA, bodyB);
      expect(result.collided).toBe(true);
      expect(Math.abs(result.normal.y)).toBe(1);
    });
  });

  describe('resolveCollision', () => {
    test('충돌 시 위치가 보정된다', () => {
      const bodyA = createBody({ position: new Vector(0, 0) });
      const bodyB = createBody({ position: new Vector(40, 0) });
      Collision.resolveCollision(bodyA, bodyB);
      expect(bodyA.position.x).toBeLessThan(0);
      expect(bodyB.position.x).toBeGreaterThan(40);
    });

    test('충돌 시 속도가 반대 방향으로 변경된다', () => {
      const bodyA = createBody({ position: new Vector(0, 0), velocity: new Vector(10, 0) });
      const bodyB = createBody({ position: new Vector(40, 0), velocity: new Vector(-10, 0) });
      Collision.resolveCollision(bodyA, bodyB);
      expect(bodyA.velocity.x).toBeLessThan(10);
      expect(bodyB.velocity.x).toBeGreaterThan(-10);
    });

    test('정적 객체와 충돌 시 이동 객체만 보정된다', () => {
      const bodyA = createBody({ position: new Vector(0, 0), isStatic: true });
      const bodyB = createBody({ position: new Vector(40, 0) });
      Collision.resolveCollision(bodyA, bodyB);
      expect(bodyA.position.x).toBe(0);
      expect(bodyB.position.x).toBeGreaterThan(40);
    });
  });
});
