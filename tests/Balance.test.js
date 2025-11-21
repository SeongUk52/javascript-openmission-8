import { BalanceUtil } from '../src/util/BalanceUtil.js';
import { Body } from '../src/domain/Body.js';
import { Vector } from '../src/domain/Vector.js';

describe('BalanceUtil', () => {
  const createBody = (overrides = {}) =>
    new Body({
      mass: 2,
      width: 4,
      height: 2,
      position: new Vector(0, 0),
      angle: 0,
      friction: 0,
      ...overrides,
    });

  test('지지 영역 내에서 안정적이다', () => {
    const body = createBody();
      const result = BalanceUtil.evaluate(body);
    expect(result.stable).toBe(true);
    expect(result.offset).toBe(0);
  });

  test('무게중심이 지지 영역을 벗어나면 불안정하다', () => {
    const body = createBody({ position: new Vector(2, 0) });
    const supportBounds = {
      min: new Vector(-1, 0),
      max: new Vector(1, 0),
    };
    const result = BalanceUtil.evaluate(body, { supportBounds });
    expect(result.stable).toBe(false);
    expect(result.offset).toBeGreaterThan(0);
  });

  test('사용자 정의 지지 영역에 따라 판정된다', () => {
    const body = createBody({ position: new Vector(10, 0) });
    const supportBounds = {
      min: new Vector(12, 0),
      max: new Vector(14, 0),
    };
    const result = BalanceUtil.evaluate(body, { supportBounds });
    expect(result.stable).toBe(true);
  });

  test('tolerance를 고려하여 판정한다', () => {
    const body = createBody();
    const support = {
      min: new Vector(-1, 0),
      max: new Vector(1, 0),
    };
    const result = BalanceUtil.evaluate(body, { supportBounds: support, tolerance: 1.5 });
    expect(result.stable).toBe(true);
  });

  test('willTopple은 불안정 여부를 반환한다', () => {
    const body = createBody();
    const supportBounds = {
      min: new Vector(-0.5, 0),
      max: new Vector(0.5, 0),
    };
      const topple = BalanceUtil.willTopple(body, { supportBounds });
    expect(topple).toBe(true);
  });
});
