import { TorqueUtil } from '../src/util/TorqueUtil.js';
import { Body } from '../src/domain/Body.js';
import { Vector } from '../src/domain/Vector.js';

describe('TorqueUtil', () => {
  const createBody = (overrides = {}) =>
    new Body({
      mass: 2,
      width: 2,
      height: 2,
      position: new Vector(0, 0),
      friction: 0,
      ...overrides,
    });

  test('computeTorque는 r × F를 계산한다', () => {
    const r = new Vector(0, 5);
    const force = new Vector(10, 0);
      const torque = TorqueUtil.computeTorque(r, force);
    expect(torque).toBeCloseTo(-50, 5);
  });

  test('applyForceAtPoint는 힘과 토크를 누적한다', () => {
    const body = createBody();
    const force = new Vector(10, 0);
    const point = new Vector(0, 5);
      TorqueUtil.applyForceAtPoint(body, force, point);
    expect(body.force.x).toBe(10);
    expect(body.torque).toBeLessThan(0); // 시계 방향 토크
  });

  test('정적 객체에는 토크가 누적되지 않는다', () => {
    const body = createBody({ isStatic: true });
      TorqueUtil.applyTorque(body, 100);
    expect(body.torque).toBe(0);
  });

  test('updateAngularMotion은 각속도와 각도를 업데이트한다', () => {
    const body = createBody();
    TorqueUtil.applyTorque(body, 20);
    TorqueUtil.updateAngularMotion(body, 1);
    expect(body.angularAcceleration).toBeGreaterThan(0);
    expect(body.angularVelocity).toBeGreaterThan(0);
    expect(body.angle).toBeGreaterThan(0);
  });

  test('clampAngularVelocity는 각속도를 제한한다', () => {
    const body = createBody({ angularVelocity: 100 });
      TorqueUtil.clampAngularVelocity(body, 10);
    expect(body.angularVelocity).toBe(10);
  });
});
