import { Vector } from './Vector.js';
import { BalanceUtil } from '../util/BalanceUtil.js';

/**
 * 타워 도메인 모델
 * 블록들의 컬렉션을 관리하고 타워의 상태를 계산한다.
 */
export class Tower {
  /**
   * @param {Object} options
   * @param {Vector} options.basePosition - 타워 기반 위치
   * @param {number} options.baseWidth - 타워 기반 너비
   */
  constructor(options = {}) {
    const {
      basePosition = new Vector(0, 0),
      baseWidth = 200,
    } = options;

    // 블록 컬렉션
    this.blocks = [];
    
    // 타워 기반 정보
    this.basePosition = basePosition;
    this.baseWidth = baseWidth;
    
    // 타워 상태
    this.isStable = true;
    this.hasToppled = false;
  }

  /**
   * 블록 추가
   * @param {Block} block
   */
  addBlock(block) {
    this.blocks.push(block);
    block.place();
  }

  /**
   * 블록 제거
   * @param {Block} block
   */
  removeBlock(block) {
    const index = this.blocks.indexOf(block);
    if (index > -1) {
      this.blocks.splice(index, 1);
    }
  }

  /**
   * 모든 블록 제거
   */
  clear() {
    this.blocks = [];
    this.hasToppled = false;
    this.isStable = true;
  }

  /**
   * 타워 높이 계산
   * @returns {number}
   */
  getHeight() {
    if (this.blocks.length === 0) return 0;

    let minY = Infinity;
    let maxY = -Infinity;

    this.blocks.forEach(block => {
      const aabb = block.getAABB();
      minY = Math.min(minY, aabb.min.y);
      maxY = Math.max(maxY, aabb.max.y);
    });

    return maxY - minY;
  }

  /**
   * 타워의 최상단 Y 좌표
   * @returns {number}
   */
  getTopY() {
    if (this.blocks.length === 0) return this.basePosition.y;

    let maxY = -Infinity;
    this.blocks.forEach(block => {
      const aabb = block.getAABB();
      maxY = Math.max(maxY, aabb.max.y);
    });

    return maxY;
  }

  /**
   * 타워의 최하단 Y 좌표
   * @returns {number}
   */
  getBottomY() {
    if (this.blocks.length === 0) return this.basePosition.y;

    let minY = Infinity;
    this.blocks.forEach(block => {
      const aabb = block.getAABB();
      minY = Math.min(minY, aabb.min.y);
    });

    return minY;
  }

  /**
   * 타워 안정성 평가
   * 모든 블록이 안정적인지 확인
   * @returns {{stable: boolean, toppledBlocks: Block[]}}
   */
  evaluateStability() {
    const toppledBlocks = [];
    let allStable = true;

    this.blocks.forEach(block => {
      // 각 블록의 안정성 확인
      const supportBounds = BalanceUtil.getDefaultSupportBounds(block);
      const result = BalanceUtil.evaluate(block, { supportBounds });

      if (!result.stable || block.isToppled()) {
        toppledBlocks.push(block);
        allStable = false;
      }
    });

    this.isStable = allStable;
    
    // 하나라도 무너지면 타워 전체가 무너진 것으로 간주
    if (toppledBlocks.length > 0) {
      this.hasToppled = true;
    }

    return {
      stable: allStable,
      toppledBlocks,
    };
  }

  /**
   * 타워가 무너졌는지 확인
   * @returns {boolean}
   */
  isToppled() {
    return this.hasToppled;
  }

  /**
   * 타워 블록 개수
   * @returns {number}
   */
  getBlockCount() {
    return this.blocks.length;
  }

  /**
   * 타워의 중심점 계산
   * @returns {Vector}
   */
  getCenter() {
    if (this.blocks.length === 0) {
      return new Vector(this.basePosition.x, this.basePosition.y);
    }

    let totalMass = 0;
    let weightedX = 0;
    let weightedY = 0;

    this.blocks.forEach(block => {
      const com = block.getCenterOfMass();
      totalMass += block.mass;
      weightedX += com.x * block.mass;
      weightedY += com.y * block.mass;
    });

    if (totalMass === 0) {
      return new Vector(this.basePosition.x, this.basePosition.y);
    }

    return new Vector(weightedX / totalMass, weightedY / totalMass);
  }

  /**
   * 타워의 지지 영역 계산 (기반 너비 기준)
   * @returns {{min: Vector, max: Vector}}
   */
  getSupportBounds() {
    const halfWidth = this.baseWidth / 2;
    return {
      min: new Vector(this.basePosition.x - halfWidth, this.basePosition.y),
      max: new Vector(this.basePosition.x + halfWidth, this.basePosition.y),
    };
  }
}

