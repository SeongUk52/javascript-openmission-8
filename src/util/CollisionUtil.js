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

    // 위치 보정과 속도 보정을 모두 적용
    // 위치 보정을 먼저 적용하여 penetration 해결
    CollisionUtil._positionalCorrection(bodyA, bodyB, manifold.normal, manifold.penetration);
    
    // 접촉 중일 때는 항상 impulse 적용 (penetration이 있으면 접촉 중)
    CollisionUtil._applyImpulse(bodyA, bodyB, manifold.normal, manifold.penetration);
    
    // Box2D/Matter.js: 속도를 직접 설정하지 않고 impulse만으로 해결
  }

  /**
   * 위치 보정 (penetration 해결)
   * @private
   */
  static _positionalCorrection(bodyA, bodyB, normal, penetration) {
    const percent = 1.0; // 보정 비율 (100% 보정)
    const slop = 0.001; // 허용 오차 감소
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
  static _applyImpulse(bodyA, bodyB, normal, penetration = 0) {
    const relativeVelocity = Vector.subtract(bodyB.velocity, bodyA.velocity);
    const velAlongNormal = relativeVelocity.dot(normal);

    // 탄성 완전 제거 (항상 0)
    const restitution = 0;
    const invMassSum = bodyA.invMass + bodyB.invMass;
    if (invMassSum === 0) return;

    // 접촉 중일 때 (penetration > 0)는 항상 impulse 적용
    // Box2D/Matter.js 스타일: 접촉 중일 때는 중력 효과를 상쇄하기 위해 impulse 적용
    let impulseScalar;
    if (penetration > 0.01) {
      // 접촉 중일 때는 velAlongNormal이 작아도 impulse 적용
      // 중력 효과를 상쇄하기 위해 최소 impulse 적용
      // 중력이 계속 적용되므로 접촉 중일 때는 항상 위 방향 impulse 필요 (중력 상쇄)
      // Box2D/Matter.js: 접촉 제약 조건을 여러 번 반복하여 해결 (PhysicsService에서 이미 반복함)
      // 각 반복마다 충분한 impulse를 적용하여 중력 효과를 상쇄
      // 중력이 500이고 질량이 20이면 중력 힘은 10000이므로 충분한 impulse 필요
      // Box2D/Matter.js: 접촉 제약 조건을 여러 번 반복하여 해결 (PhysicsService에서 이미 반복함)
      // 각 반복마다 충분한 impulse를 적용하여 중력 효과를 상쇄
      // 중력이 500이고 질량이 20이면 중력 힘은 10000이므로 충분한 impulse 필요
      // deltaTime이 1/60이고 중력이 500이면, 한 프레임에 중력에 의한 속도 증가는 약 8.33
      // 이를 상쇄하려면 충분한 impulse 필요 (충돌 해결이 10번 반복되므로 각 반복마다 작은 impulse로도 가능)
      // Box2D/Matter.js: 접촉 제약 조건을 여러 번 반복하여 해결 (PhysicsService에서 이미 반복함)
      // 각 반복마다 충분한 impulse를 적용하여 중력 효과를 상쇄
      // 중력이 500이고 질량이 20이면 중력 힘은 10000이므로 충분한 impulse 필요
      // deltaTime이 1/60이고 중력이 500이면, 한 프레임에 중력에 의한 속도 증가는 약 8.33
      // 이를 상쇄하려면 충분한 impulse 필요 (충돌 해결이 20번 반복되므로 각 반복마다 작은 impulse로도 가능)
      // Box2D/Matter.js: 접촉 중일 때는 normal impulse가 중력을 상쇄하기 위해 충분히 커야 함
      const minImpulse = 100.0; // 최소 impulse 증가 (중력 효과 상쇄, 충돌 해결 반복으로 누적됨)
      if (velAlongNormal > 0.1) {
        // 서로 멀어지고 있지만 penetration이 있으면 중력 상쇄 impulse 적용
        impulseScalar = -minImpulse / invMassSum;
      } else {
        // 접촉 중이면 normal impulse 적용
        const normalImpulse = (-(1 + restitution) * velAlongNormal) / invMassSum;
        // velAlongNormal이 0에 가까워도 중력 상쇄를 위해 최소 impulse 적용
        if (Math.abs(normalImpulse) < minImpulse / invMassSum && velAlongNormal <= 0) {
          impulseScalar = -minImpulse / invMassSum;
        } else {
          // normal impulse가 충분하면 사용, 아니면 최소 impulse 사용
          impulseScalar = Math.abs(normalImpulse) >= minImpulse / invMassSum ? normalImpulse : -minImpulse / invMassSum;
        }
      }
    } else {
      // penetration이 없으면 일반 충돌 해결
      if (velAlongNormal > 0) {
        return; // 서로 멀어지고 있음
      }
      impulseScalar = (-(1 + restitution) * velAlongNormal) / invMassSum;
    }
    
    const impulse = Vector.multiply(normal, impulseScalar);

    // 접촉점 계산
    const centerA = bodyA.getCenterOfMass();
    const centerB = bodyB.getCenterOfMass();
    let contactPoint;
    
    // 정적 객체가 있는 경우 접촉면의 중심을 사용
    if (bodyA.isStatic || bodyB.isStatic) {
      // AABB 겹치는 영역의 중심을 접촉점으로 사용
      const aabbA = bodyA.getAABB();
      const aabbB = bodyB.getAABB();
      
      const overlapMinX = Math.max(aabbA.min.x, aabbB.min.x);
      const overlapMaxX = Math.min(aabbA.max.x, aabbB.max.x);
      const overlapMinY = Math.max(aabbA.min.y, aabbB.min.y);
      const overlapMaxY = Math.min(aabbA.max.y, aabbB.max.y);
      
      // 겹치는 영역의 중심
      contactPoint = new Vector(
        (overlapMinX + overlapMaxX) / 2,
        (overlapMinY + overlapMaxY) / 2
      );
    } else {
      // 두 객체 모두 동적이면 질량 중심을 사용
      contactPoint = Vector.add(
        Vector.multiply(centerA, bodyA.invMass),
        Vector.multiply(centerB, bodyB.invMass)
      );
      contactPoint.multiply(1 / (bodyA.invMass + bodyB.invMass));
    }

    if (!bodyA.isStatic) {
      bodyA.applyImpulse(Vector.multiply(impulse, -1));
      
      // 접촉점에서의 각 충격량 적용 (r × impulse)
      const rA = Vector.subtract(contactPoint, centerA);
      const angularImpulseA = rA.cross(Vector.multiply(impulse, -1));
      bodyA.applyAngularImpulse(angularImpulseA);
    }
    if (!bodyB.isStatic) {
      bodyB.applyImpulse(impulse);
      
      // 접촉점에서의 각 충격량 적용 (r × impulse)
      const rB = Vector.subtract(contactPoint, centerB);
      const angularImpulseB = rB.cross(impulse);
      bodyB.applyAngularImpulse(angularImpulseB);
    }
    
    // 마찰 적용 (Coulumb 마찰 법칙: 마찰 임펄스는 정상 임펄스에 비례)
    const friction = Math.min(bodyA.friction || 0.8, bodyB.friction || 0.8);
    if (friction > 0 && Math.abs(impulseScalar) > 0) {
      // 접선 방향 계산 (normal에 수직인 방향)
      const tangent = new Vector(-normal.y, normal.x);
      
      // 접촉점에서의 상대 속도 계산 (회전 포함)
      let relativeVelocityAtContact = relativeVelocity.copy();
      if (!bodyA.isStatic) {
        const rA = Vector.subtract(contactPoint, centerA);
        // 각속도에 의한 접선 속도: ω × r (2D에서는 (-r.y, r.x) * ω)
        const tangentVelA = new Vector(-rA.y, rA.x).multiply(bodyA.angularVelocity);
        relativeVelocityAtContact.subtract(tangentVelA);
      }
      if (!bodyB.isStatic) {
        const rB = Vector.subtract(contactPoint, centerB);
        // 각속도에 의한 접선 속도: ω × r
        const tangentVelB = new Vector(-rB.y, rB.x).multiply(bodyB.angularVelocity);
        relativeVelocityAtContact.add(tangentVelB);
      }
      
      const velAlongTangent = relativeVelocityAtContact.dot(tangent);
      
      // 마찰 임펄스 계산 (정상 임펄스에 비례, 최대값 제한)
      const maxFrictionImpulse = Math.abs(impulseScalar) * friction;
      const frictionImpulseScalar = Math.max(
        -maxFrictionImpulse,
        Math.min(maxFrictionImpulse, -velAlongTangent / invMassSum)
      );
      const frictionImpulse = Vector.multiply(tangent, frictionImpulseScalar);
      
      // 마찰 적용 (속도 감쇠 + 각속도 감쇠)
      if (!bodyA.isStatic) {
        bodyA.applyImpulse(Vector.multiply(frictionImpulse, -1));
        
        // 접촉점에서의 마찰 토크 적용 (r × frictionImpulse)
        const rA = Vector.subtract(contactPoint, centerA);
        const frictionTorqueA = rA.cross(Vector.multiply(frictionImpulse, -1));
        bodyA.applyAngularImpulse(frictionTorqueA);
        
        // 정적 객체(베이스)와 접촉 중이면 마찰 토크를 매우 강하게 적용
        if (bodyB.isStatic) {
          // 베이스와 접촉 중일 때는 각속도에 직접 마찰 토크를 매우 강하게 적용
          // Box2D/Matter.js 스타일: 접촉 중일 때 마찰 토크는 각속도에 비례
          const staticFrictionTorque = -bodyA.angularVelocity * friction * bodyA.inertia * 1.2;
          bodyA.applyAngularImpulse(staticFrictionTorque);
          
          // 베이스와 접촉 중일 때는 각속도를 강하게 감쇠
          bodyA.angularVelocity *= 0.6; // 40% 감쇠
          
          // 속도도 마찰에 의해 매우 강하게 감쇠
          // Box2D/Matter.js 스타일: 접촉 중일 때 마찰이 매우 강하게 작용
          const frictionDampingX = 1 - friction * 0.6; // 수평 마찰 매우 강화
          const frictionDampingY = 1 - friction * 0.5; // 수직 마찰 매우 강화
          bodyA.velocity.x *= frictionDampingX;
          bodyA.velocity.y *= frictionDampingY;
          
          // 각속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.angularVelocity) < 0.01) {
            bodyA.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.velocity.x) < 1.0) {
            bodyA.velocity.x = 0;
          }
          if (Math.abs(bodyA.velocity.y) < 1.0 && bodyA.velocity.y >= 0) {
            bodyA.velocity.y = 0;
          }
        } else {
          // 일반 접촉에서의 각속도 감쇠
          const contactAngularDamping = 0.7; // 30% 감쇠 (더 강화)
          bodyA.angularVelocity *= contactAngularDamping;
          
          // 속도도 마찰에 의해 강하게 감쇠
          const frictionDampingX = 1 - friction * 0.3; // 수평 마찰 강화
          const frictionDampingY = 1 - friction * 0.2; // 수직 마찰 강화
          bodyA.velocity.x *= frictionDampingX;
          bodyA.velocity.y *= frictionDampingY;
          
          // 접촉 중이고 각속도가 작으면 강제로 감쇠
          if (Math.abs(bodyA.angularVelocity) < 0.5) {
            bodyA.angularVelocity *= 0.5; // 추가 감쇠 (더 강화)
          }
          
          // 매우 작은 각속도는 0으로 설정
          if (Math.abs(bodyA.angularVelocity) < 0.05) {
            bodyA.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.velocity.x) < 1.0) {
            bodyA.velocity.x = 0;
          }
          if (Math.abs(bodyA.velocity.y) < 1.0 && bodyA.velocity.y >= 0) {
            bodyA.velocity.y = 0;
          }
        }
      }
      if (!bodyB.isStatic) {
        bodyB.applyImpulse(frictionImpulse);
        
        // 접촉점에서의 마찰 토크 적용 (r × frictionImpulse)
        const rB = Vector.subtract(contactPoint, centerB);
        const frictionTorqueB = rB.cross(frictionImpulse);
        bodyB.applyAngularImpulse(frictionTorqueB);
        
        // 정적 객체(베이스)와 접촉 중이면 마찰 토크를 매우 강하게 적용
        if (bodyA.isStatic) {
          // 베이스와 접촉 중일 때는 각속도에 직접 마찰 토크를 매우 강하게 적용
          // Box2D/Matter.js 스타일: 접촉 중일 때 마찰 토크는 각속도에 비례
          const staticFrictionTorque = -bodyB.angularVelocity * friction * bodyB.inertia * 1.2;
          bodyB.applyAngularImpulse(staticFrictionTorque);
          
          // 베이스와 접촉 중일 때는 각속도를 강하게 감쇠
          bodyB.angularVelocity *= 0.6; // 40% 감쇠
          
          // 속도도 마찰에 의해 매우 강하게 감쇠
          // Box2D/Matter.js 스타일: 접촉 중일 때 마찰이 매우 강하게 작용
          const frictionDampingX = 1 - friction * 0.6; // 수평 마찰 매우 강화
          const frictionDampingY = 1 - friction * 0.5; // 수직 마찰 매우 강화
          bodyB.velocity.x *= frictionDampingX;
          bodyB.velocity.y *= frictionDampingY;
          
          // 각속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyB.angularVelocity) < 0.01) {
            bodyB.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyB.velocity.x) < 1.0) {
            bodyB.velocity.x = 0;
          }
          if (Math.abs(bodyB.velocity.y) < 1.0 && bodyB.velocity.y >= 0) {
            bodyB.velocity.y = 0;
          }
        } else {
          // 일반 접촉에서의 각속도 감쇠
          const contactAngularDamping = 0.7; // 30% 감쇠 (더 강화)
          bodyB.angularVelocity *= contactAngularDamping;
          
          // 속도도 마찰에 의해 강하게 감쇠
          const frictionDampingX = 1 - friction * 0.3; // 수평 마찰 강화
          const frictionDampingY = 1 - friction * 0.2; // 수직 마찰 강화
          bodyB.velocity.x *= frictionDampingX;
          bodyB.velocity.y *= frictionDampingY;
          
          // 접촉 중이고 각속도가 작으면 강제로 감쇠
          if (Math.abs(bodyB.angularVelocity) < 0.5) {
            bodyB.angularVelocity *= 0.5; // 추가 감쇠 (더 강화)
          }
          
          // 매우 작은 각속도는 0으로 설정
          if (Math.abs(bodyB.angularVelocity) < 0.05) {
            bodyB.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyB.velocity.x) < 1.0) {
            bodyB.velocity.x = 0;
          }
          if (Math.abs(bodyB.velocity.y) < 1.0 && bodyB.velocity.y >= 0) {
            bodyB.velocity.y = 0;
          }
        }
      }
    }
  }
}

