import { Vector } from '../domain/Vector.js';

/**
 * 균형 판정 유틸리티
 */
export class BalanceUtil {
  /**
   * Body의 지지 영역(AABB 기반)을 얻는다.
   * @param {Body} body
   * @returns {{min: Vector, max: Vector}}
   */
  static getDefaultSupportBounds(body) {
    const aabb = body.getAABB();
    return {
      min: new Vector(aabb.min.x, aabb.min.y),
      max: new Vector(aabb.max.x, aabb.min.y),
    };
  }

  /**
   * 균형 평가
   * @param {Body} body
   * @param {{supportBounds?: {min: Vector, max: Vector}, tolerance?: number}} options
   * @returns {{stable: boolean, offset: number, centerOfMass: Vector, supportBounds: {min: Vector, max: Vector}}}
   */
  static evaluate(body, options = {}) {
    const supportBounds = options.supportBounds || BalanceUtil.getDefaultSupportBounds(body);
    const tolerance = options.tolerance ?? 0;
    const com = body.getCenterOfMass();

    const rawLeft = Math.min(supportBounds.min.x, supportBounds.max.x);
    const rawRight = Math.max(supportBounds.min.x, supportBounds.max.x);
    const left = rawLeft - tolerance;
    const right = rawRight + tolerance;

    // 블록의 각도도 고려하여 균형 판정
    // 블록이 기울어져 있으면 더 쉽게 무너짐
    const angleFactor = Math.abs(body.angle || 0);
    const angleThreshold = 0.1; // 약 5.7도
    
    // 블록이 기울어져 있으면 안정성 감소
    const stable = com.x >= left && com.x <= right && angleFactor < angleThreshold;
    let offset = 0;

    if (!stable) {
      if (com.x < left) {
        offset = com.x - left;
      } else if (com.x > right) {
        offset = com.x - right;
      }
      
      // 블록이 기울어져 있으면 offset 증가
      if (angleFactor > angleThreshold) {
        offset += angleFactor * 10; // 각도에 따라 offset 증가
      }
    }

    return {
      stable,
      offset,
      centerOfMass: com,
      supportBounds,
    };
  }

  /**
   * 균형이 무너질지 여부
   * @param {Body} body
   * @param {object} options
   * @returns {boolean}
   */
  static willTopple(body, options = {}) {
    return !BalanceUtil.evaluate(body, options).stable;
  }
}
