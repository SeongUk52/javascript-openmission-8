import { Vector } from '../domain/Vector.js';

/**
 * 충돌 감지 및 해결 유틸리티
 * 현재는 AABB(축 정렬 경계 박스) 기반 충돌만 지원한다.
 */
export class CollisionUtil {
  /**
   * 두 Body의 AABB가 충돌하는지 확인
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @returns {boolean}
   */
  static isAABBColliding(bodyA, bodyB) {
    const aabbA = bodyA.getAABB();
    const aabbB = bodyB.getAABB();

    const separated =
      aabbA.max.x < aabbB.min.x ||
      aabbA.min.x > aabbB.max.x ||
      aabbA.max.y < aabbB.min.y ||
      aabbA.min.y > aabbB.max.y;

    return !separated;
  }

  /**
   * 충돌 매니폴드 계산
   * @param {Body} bodyA
   * @param {Body} bodyB
   * @returns {{collided: boolean, normal?: Vector, penetration?: number}}
   */
  static getCollisionManifold(bodyA, bodyB) {
    if (!CollisionUtil.isAABBColliding(bodyA, bodyB)) {
      return { collided: false };
    }

    const aabbA = bodyA.getAABB();
    const aabbB = bodyB.getAABB();

    const overlapX = Math.min(aabbA.max.x, aabbB.max.x) - Math.max(aabbA.min.x, aabbB.min.x);
    const overlapY = Math.min(aabbA.max.y, aabbB.max.y) - Math.max(aabbA.min.y, aabbB.min.y);

    if (overlapX < overlapY) {
      const normal = new Vector(bodyA.getCenterOfMass().x < bodyB.getCenterOfMass().x ? 1 : -1, 0);
      return { collided: true, normal, penetration: overlapX };
    }

    const normal = new Vector(0, bodyA.getCenterOfMass().y < bodyB.getCenterOfMass().y ? 1 : -1);
    return { collided: true, normal, penetration: overlapY };
  }

  /**
   * 충돌 해결 (위치 보정 + 속도 보정)
   * @param {Body} bodyA
   * @param {Body} bodyB
   */
  static resolveCollision(bodyA, bodyB) {
    const manifold = CollisionUtil.getCollisionManifold(bodyA, bodyB);
    if (!manifold.collided) return;

    CollisionUtil._positionalCorrection(bodyA, bodyB, manifold.normal, manifold.penetration);
    CollisionUtil._applyImpulse(bodyA, bodyB, manifold.normal);
  }

  /**
   * 위치 보정 (penetration 해결)
   * @private
   */
  static _positionalCorrection(bodyA, bodyB, normal, penetration) {
    const percent = 0.2; // 보정 비율 (낮춰서 더 부드럽게)
    const slop = 0.01; // 허용 오차
    const correctedPenetration = Math.max(penetration - slop, 0);

    const invMassSum = bodyA.invMass + bodyB.invMass;
    if (invMassSum === 0) return;

    const correction = Vector.multiply(normal, (correctedPenetration * percent) / invMassSum);

    if (!bodyA.isStatic) {
      bodyA.position.subtract(Vector.multiply(correction, bodyA.invMass));
    }
    if (!bodyB.isStatic) {
      bodyB.position.add(Vector.multiply(correction, bodyB.invMass));
    }
  }

  /**
   * 임펄스 적용
   * @private
   */
  static _applyImpulse(bodyA, bodyB, normal) {
    const relativeVelocity = Vector.subtract(bodyB.velocity, bodyA.velocity);
    const velAlongNormal = relativeVelocity.dot(normal);

    if (velAlongNormal > 0) {
      return; // 서로 멀어지고 있음
    }

    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const invMassSum = bodyA.invMass + bodyB.invMass;
    if (invMassSum === 0) return;

    // 반발 계수가 0이면 완전 비탄성 충돌 (속도 감쇠)
    const impulseScalar = (-(1 + restitution) * velAlongNormal) / invMassSum;
    const impulse = Vector.multiply(normal, impulseScalar);

    if (!bodyA.isStatic) {
      bodyA.applyImpulse(Vector.multiply(impulse, -1));
      // 반발 계수가 0이면 속도를 더 감쇠시킴
      if (restitution === 0) {
        bodyA.velocity.multiply(0.95); // 추가 감쇠
      }
    }
    if (!bodyB.isStatic) {
      bodyB.applyImpulse(impulse);
      // 반발 계수가 0이면 속도를 더 감쇠시킴
      if (restitution === 0) {
        bodyB.velocity.multiply(0.95); // 추가 감쇠
      }
    }
  }
}

