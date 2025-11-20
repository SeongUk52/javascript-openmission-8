import { Vector } from './Vector.js';

/**
 * 균형 판정 유틸리티
 */
export class Balance {
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
    const supportBounds = options.supportBounds || Balance.getDefaultSupportBounds(body);
    const tolerance = options.tolerance ?? 0;
    const com = body.getCenterOfMass();

    const rawLeft = Math.min(supportBounds.min.x, supportBounds.max.x);
    const rawRight = Math.max(supportBounds.min.x, supportBounds.max.x);
    const left = rawLeft - tolerance;
    const right = rawRight + tolerance;

    const stable = com.x >= left && com.x <= right;
    let offset = 0;

    if (!stable) {
      if (com.x < left) {
        offset = com.x - left;
      } else if (com.x > right) {
        offset = com.x - right;
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
    return !Balance.evaluate(body, options).stable;
  }
}
