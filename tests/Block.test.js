import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';

describe('Block', () => {
  describe('생성자', () => {
    test('기본값으로 블록을 생성한다', () => {
      const block = new Block();
      
      expect(block.position).toBeInstanceOf(Vector);
      expect(block.width).toBe(50);
      expect(block.height).toBe(20);
      expect(block.mass).toBe(1);
      expect(block.color).toBe('#3498db');
      expect(block.type).toBe('normal');
      expect(block.id).toBeDefined();
      // isPlaced는 사용하지 않으므로 체크하지 않음
      expect(block.isFalling).toBe(true);
    });

    test('옵션으로 블록을 생성한다', () => {
      const position = new Vector(10, 20);
      const block = new Block({
        position,
        width: 100,
        height: 30,
        mass: 2,
        color: '#ff0000',
        type: 'heavy',
        id: 'test-id',
      });

      expect(block.position.x).toBe(10);
      expect(block.position.y).toBe(20);
      expect(block.width).toBe(100);
      expect(block.height).toBe(30);
      expect(block.mass).toBe(2);
      expect(block.color).toBe('#ff0000');
      expect(block.type).toBe('heavy');
      expect(block.id).toBe('test-id');
    });

    test('Body를 상속받아 물리 속성을 가진다', () => {
      const block = new Block();
      
      expect(block.velocity).toBeInstanceOf(Vector);
      expect(block.acceleration).toBeInstanceOf(Vector);
      expect(block.angle).toBe(0);
      expect(block.angularVelocity).toBe(0);
    });
  });

  describe('place', () => {
    test('블록을 타워에 배치한다', () => {
      const block = new Block();
      
      // isPlaced는 사용하지 않으므로 체크하지 않음
      expect(block.isFalling).toBe(true);
      
      block.place();
      
      // isPlaced는 사용하지 않으므로 체크하지 않음 (place() 메서드 테스트)
      expect(block.isFalling).toBe(false);
    });
  });

  describe('isToppled', () => {
    test('각도가 45도 미만이면 무너지지 않았다고 판정한다', () => {
      const block = new Block();
      block.angle = Math.PI / 6; // 30도
      
      expect(block.isToppled()).toBe(false);
    });

    test('각도가 45도 이상이면 무너졌다고 판정한다', () => {
      const block = new Block();
      block.angle = Math.PI / 3; // 60도
      
      expect(block.isToppled()).toBe(true);
    });

    test('음수 각도도 처리한다', () => {
      const block = new Block();
      block.angle = -Math.PI / 3; // -60도
      
      expect(block.isToppled()).toBe(true);
    });
  });

  describe('isOutOfBounds', () => {
    test('화면 안에 있으면 false를 반환한다', () => {
      const block = new Block({
        position: new Vector(100, 100),
        width: 50,
        height: 20,
      });
      
      expect(block.isOutOfBounds(800, 600)).toBe(false);
    });

    test('화면 왼쪽 밖에 있으면 true를 반환한다', () => {
      const block = new Block({
        position: new Vector(-30, 100),
        width: 50,
        height: 20,
      });
      
      expect(block.isOutOfBounds(800, 600)).toBe(true);
    });

    test('화면 오른쪽 밖에 있으면 true를 반환한다', () => {
      const block = new Block({
        position: new Vector(850, 100),
        width: 50,
        height: 20,
      });
      
      expect(block.isOutOfBounds(800, 600)).toBe(true);
    });

    test('화면 위쪽 밖에 있으면 true를 반환한다', () => {
      const block = new Block({
        position: new Vector(100, -30),
        width: 50,
        height: 20,
      });
      
      expect(block.isOutOfBounds(800, 600)).toBe(true);
    });

    test('화면 아래쪽 밖에 있으면 true를 반환한다', () => {
      const block = new Block({
        position: new Vector(100, 650),
        width: 50,
        height: 20,
      });
      
      expect(block.isOutOfBounds(800, 600)).toBe(true);
    });
  });

  describe('clone', () => {
    test('블록을 복사한다', () => {
      const original = new Block({
        position: new Vector(10, 20),
        width: 100,
        height: 30,
        mass: 2,
        color: '#ff0000',
        type: 'heavy',
        id: 'test-id',
      });

      const cloned = original.clone();

      expect(cloned.position.x).toBe(original.position.x);
      expect(cloned.position.y).toBe(original.position.y);
      expect(cloned.width).toBe(original.width);
      expect(cloned.height).toBe(original.height);
      expect(cloned.mass).toBe(original.mass);
      expect(cloned.color).toBe(original.color);
      expect(cloned.type).toBe(original.type);
      expect(cloned.id).toBe(original.id);
      
      // 다른 인스턴스인지 확인
      expect(cloned).not.toBe(original);
      expect(cloned.position).not.toBe(original.position);
    });
  });
});

