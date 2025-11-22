import { Tower } from '../src/domain/Tower.js';
import { Block } from '../src/domain/Block.js';
import { Vector } from '../src/domain/Vector.js';

describe('Tower', () => {
  const createTower = (options = {}) => {
    return new Tower({
      basePosition: new Vector(400, 500),
      baseWidth: 200,
      ...options,
    });
  };

  const createBlock = (options = {}) => {
    return new Block({
      position: new Vector(400, 400),
      width: 50,
      height: 20,
      ...options,
    });
  };

  describe('생성자', () => {
    test('기본값으로 타워를 생성한다', () => {
      const tower = new Tower();
      
      expect(tower.blocks).toEqual([]);
      expect(tower.basePosition).toBeInstanceOf(Vector);
      expect(tower.baseWidth).toBe(200);
      expect(tower.isStable).toBe(true);
      expect(tower.hasToppled).toBe(false);
    });

    test('옵션으로 타워를 생성한다', () => {
      const basePosition = new Vector(100, 200);
      const tower = new Tower({
        basePosition,
        baseWidth: 300,
      });

      expect(tower.basePosition.x).toBe(100);
      expect(tower.basePosition.y).toBe(200);
      expect(tower.baseWidth).toBe(300);
    });
  });

  describe('addBlock', () => {
    test('블록을 추가한다', () => {
      const tower = createTower();
      const block = createBlock();

      tower.addBlock(block);

      expect(tower.blocks).toHaveLength(1);
      expect(tower.blocks[0]).toBe(block);
      expect(block.isPlaced).toBe(true);
    });

    test('여러 블록을 추가한다', () => {
      const tower = createTower();
      const block1 = createBlock();
      const block2 = createBlock();

      tower.addBlock(block1);
      tower.addBlock(block2);

      expect(tower.blocks).toHaveLength(2);
    });
  });

  describe('removeBlock', () => {
    test('블록을 제거한다', () => {
      const tower = createTower();
      const block = createBlock();

      tower.addBlock(block);
      expect(tower.blocks).toHaveLength(1);

      tower.removeBlock(block);
      expect(tower.blocks).toHaveLength(0);
    });

    test('존재하지 않는 블록을 제거하려고 하면 아무 일도 일어나지 않는다', () => {
      const tower = createTower();
      const block = createBlock();

      tower.removeBlock(block);
      expect(tower.blocks).toHaveLength(0);
    });
  });

  describe('clear', () => {
    test('모든 블록을 제거한다', () => {
      const tower = createTower();
      tower.addBlock(createBlock());
      tower.addBlock(createBlock());
      tower.hasToppled = true;

      tower.clear();

      expect(tower.blocks).toHaveLength(0);
      expect(tower.hasToppled).toBe(false);
      expect(tower.isStable).toBe(true);
    });
  });

  describe('getHeight', () => {
    test('블록이 없으면 0을 반환한다', () => {
      const tower = createTower();
      expect(tower.getHeight()).toBe(0);
    });

    test('블록들의 높이를 계산한다', () => {
      const tower = createTower();
      const block1 = createBlock({ position: new Vector(400, 500) });
      const block2 = createBlock({ position: new Vector(400, 480) });
      const block3 = createBlock({ position: new Vector(400, 460) });

      tower.addBlock(block1);
      tower.addBlock(block2);
      tower.addBlock(block3);

      // 높이 = 최상단 - 최하단 = 460 - 500 = -40 (절댓값)
      const height = tower.getHeight();
      expect(height).toBeGreaterThan(0);
    });
  });

  describe('getTopY', () => {
    test('블록이 없으면 기반 Y를 반환한다', () => {
      const tower = createTower();
      expect(tower.getTopY()).toBe(500);
    });

    test('최상단 Y 좌표를 반환한다', () => {
      const tower = createTower();
      const block1 = createBlock({ position: new Vector(400, 500) });
      const block2 = createBlock({ position: new Vector(400, 480) });

      tower.addBlock(block1);
      tower.addBlock(block2);

      const topY = tower.getTopY();
      // AABB의 max.y를 반환 (position은 중심이므로 높이/2를 더함)
      // block2: position.y(480) + height/2(10) = 490
      // block1: position.y(500) + height/2(10) = 510
      // 최상단은 510
      expect(topY).toBe(510);
    });
  });

  describe('getBottomY', () => {
    test('블록이 없으면 기반 Y를 반환한다', () => {
      const tower = createTower();
      expect(tower.getBottomY()).toBe(500);
    });

    test('최하단 Y 좌표를 반환한다', () => {
      const tower = createTower();
      const block1 = createBlock({ position: new Vector(400, 500) });
      const block2 = createBlock({ position: new Vector(400, 480) });

      tower.addBlock(block1);
      tower.addBlock(block2);

      const bottomY = tower.getBottomY();
      // AABB의 min.y를 반환 (position은 중심이므로 높이/2를 뺌)
      // block2: position.y(480) - height/2(10) = 470
      // block1: position.y(500) - height/2(10) = 490
      // 최하단은 470
      expect(bottomY).toBe(470);
    });
  });

  describe('evaluateStability', () => {
    test('안정적인 블록들은 stable을 반환한다', () => {
      const tower = createTower();
      const block = createBlock({
        position: new Vector(400, 500),
        angle: 0,
      });

      tower.addBlock(block);
      const result = tower.evaluateStability();

      expect(result.stable).toBe(true);
      expect(result.toppledBlocks).toHaveLength(0);
    });

    test('무너진 블록이 있으면 unstable을 반환한다', () => {
      const tower = createTower();
      const block = createBlock({
        position: new Vector(400, 500),
      });
      
      // 각도를 직접 설정 (Math.PI / 2 = 90도, 45도 이상이므로 무너짐)
      block.angle = Math.PI / 2;

      tower.addBlock(block);
      const result = tower.evaluateStability();

      // isToppled()이 true이므로 unstable
      expect(block.isToppled()).toBe(true);
      expect(result.stable).toBe(false);
      expect(result.toppledBlocks.length).toBeGreaterThan(0);
      expect(tower.hasToppled).toBe(true);
    });
  });

  describe('getBlockCount', () => {
    test('블록 개수를 반환한다', () => {
      const tower = createTower();
      expect(tower.getBlockCount()).toBe(0);

      tower.addBlock(createBlock());
      expect(tower.getBlockCount()).toBe(1);

      tower.addBlock(createBlock());
      expect(tower.getBlockCount()).toBe(2);
    });
  });

  describe('getSupportBounds', () => {
    test('지지 영역을 반환한다', () => {
      const tower = createTower({
        basePosition: new Vector(400, 500),
        baseWidth: 200,
      });

      const bounds = tower.getSupportBounds();

      expect(bounds.min.x).toBe(300); // 400 - 100
      expect(bounds.max.x).toBe(500); // 400 + 100
      expect(bounds.min.y).toBe(500);
      expect(bounds.max.y).toBe(500);
    });
  });
});

