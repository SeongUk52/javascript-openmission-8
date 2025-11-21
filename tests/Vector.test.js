import { Vector } from '../src/domain/Vector.js';

describe('Vector', () => {
  describe('생성자', () => {
    test('기본 생성자는 (0, 0) 벡터를 만든다', () => {
      const v = new Vector();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    test('x, y 값을 받아 벡터를 생성한다', () => {
      const v = new Vector(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });
  });

  describe('copy', () => {
    test('벡터를 복사한다', () => {
      const v1 = new Vector(3, 4);
      const v2 = v1.copy();
      expect(v2.x).toBe(3);
      expect(v2.y).toBe(4);
      expect(v2).not.toBe(v1);
    });
  });

  describe('add', () => {
    test('벡터 덧셈을 수행한다', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      v1.add(v2);
      expect(v1.x).toBe(4);
      expect(v1.y).toBe(6);
    });

    test('체이닝이 가능하다', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      const v3 = new Vector(5, 6);
      v1.add(v2).add(v3);
      expect(v1.x).toBe(9);
      expect(v1.y).toBe(12);
    });
  });

  describe('subtract', () => {
    test('벡터 뺄셈을 수행한다', () => {
      const v1 = new Vector(5, 6);
      const v2 = new Vector(2, 3);
      v1.subtract(v2);
      expect(v1.x).toBe(3);
      expect(v1.y).toBe(3);
    });
  });

  describe('multiply', () => {
    test('스칼라 곱셈을 수행한다', () => {
      const v = new Vector(2, 3);
      v.multiply(2);
      expect(v.x).toBe(4);
      expect(v.y).toBe(6);
    });
  });

  describe('magnitude', () => {
    test('벡터의 크기를 계산한다', () => {
      const v = new Vector(3, 4);
      expect(v.magnitude()).toBe(5);
    });

    test('영벡터의 크기는 0이다', () => {
      const v = new Vector(0, 0);
      expect(v.magnitude()).toBe(0);
    });
  });

  describe('magnitudeSquared', () => {
    test('벡터의 크기 제곱을 계산한다', () => {
      const v = new Vector(3, 4);
      expect(v.magnitudeSquared()).toBe(25);
    });
  });

  describe('normalize', () => {
    test('벡터를 정규화한다', () => {
      const v = new Vector(3, 4);
      v.normalize();
      expect(v.magnitude()).toBeCloseTo(1, 5);
    });

    test('영벡터는 정규화해도 변화가 없다', () => {
      const v = new Vector(0, 0);
      v.normalize();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });
  });

  describe('dot', () => {
    test('벡터 내적을 계산한다', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      expect(v1.dot(v2)).toBe(11); // 1*3 + 2*4 = 11
    });
  });

  describe('cross', () => {
    test('벡터 외적을 계산한다', () => {
      const v1 = new Vector(1, 0);
      const v2 = new Vector(0, 1);
      expect(v1.cross(v2)).toBe(1);
    });
  });

  describe('distance', () => {
    test('두 벡터 사이의 거리를 계산한다', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      expect(v1.distance(v2)).toBe(5);
    });
  });

  describe('distanceSquared', () => {
    test('두 벡터 사이의 거리 제곱을 계산한다', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      expect(v1.distanceSquared(v2)).toBe(25);
    });
  });

  describe('rotate', () => {
    test('벡터를 회전시킨다', () => {
      const v = new Vector(1, 0);
      v.rotate(Math.PI / 2); // 90도 회전
      expect(v.x).toBeCloseTo(0, 5);
      expect(v.y).toBeCloseTo(1, 5);
    });
  });

  describe('정적 메서드', () => {
    test('Vector.add는 새로운 벡터를 반환한다', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      const result = Vector.add(v1, v2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      expect(v1.x).toBe(1); // 원본은 변경되지 않음
    });

    test('Vector.subtract는 새로운 벡터를 반환한다', () => {
      const v1 = new Vector(5, 6);
      const v2 = new Vector(2, 3);
      const result = Vector.subtract(v1, v2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
    });

    test('Vector.multiply는 새로운 벡터를 반환한다', () => {
      const v = new Vector(2, 3);
      const result = Vector.multiply(v, 2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      expect(v.x).toBe(2); // 원본은 변경되지 않음
    });
  });
});

