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
    // Box2D/Matter.js: tolerance를 블록 크기의 일정 비율로 설정
    // 블록이 조금만 벗어나도 안정적으로 유지되도록 관대한 tolerance 적용
    // 회전된 블록의 경우 AABB가 커지므로 더 큰 tolerance 필요
    const angleFactor = Math.abs(body.angle || 0);
    const baseTolerance = body.width ? body.width * 0.5 : 25; // 블록 너비의 50% 또는 25픽셀
    const rotationTolerance = angleFactor * body.width * 0.3; // 회전에 따른 추가 tolerance
    const defaultTolerance = baseTolerance + rotationTolerance;
    const tolerance = options.tolerance ?? defaultTolerance;
    const com = body.getCenterOfMass();

    const rawLeft = Math.min(supportBounds.min.x, supportBounds.max.x);
    const rawRight = Math.max(supportBounds.min.x, supportBounds.max.x);
    const left = rawLeft - tolerance;
    const right = rawRight + tolerance;

    // Box2D/Matter.js: 무게 중심이 지지 영역 밖으로 많이 벗어나야 무너짐
    // 블록의 각도도 고려하여 균형 판정
    // 블록이 기울어져 있으면 더 쉽게 무너짐
    // angleFactor는 이미 위에서 선언됨
    const angleThreshold = Math.PI / 6; // 약 30도 (더 관대하게)
    
    // Box2D/Matter.js: 무게 중심이 지지 영역 내에 있고, 각도가 임계값 이하면 안정적
    // tolerance를 적용하여 조금만 벗어나도 안정적으로 유지
    const stable = com.x >= left && com.x <= right && angleFactor < angleThreshold;
    let offset = 0;

    if (!stable) {
      // Box2D/Matter.js: offset은 무게 중심이 지지 영역 밖으로 벗어난 거리
      // tolerance를 고려한 실제 벗어난 거리 계산
      if (com.x < rawLeft) {
        offset = com.x - rawLeft; // tolerance를 제외한 실제 벗어난 거리
      } else if (com.x > rawRight) {
        offset = com.x - rawRight; // tolerance를 제외한 실제 벗어난 거리
      }
      
      // 블록이 기울어져 있으면 offset 증가 (더 쉽게 무너짐)
      if (angleFactor > angleThreshold) {
        offset += angleFactor * 5; // 각도에 따라 offset 증가 (계수 감소)
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
