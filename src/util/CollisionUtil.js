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
    
    // NaN 체크
    if (!aabbA || !aabbB || 
        isNaN(aabbA.min.x) || isNaN(aabbA.min.y) || isNaN(aabbA.max.x) || isNaN(aabbA.max.y) ||
        isNaN(aabbB.min.x) || isNaN(aabbB.min.y) || isNaN(aabbB.max.x) || isNaN(aabbB.max.y)) {
      return { collided: false };
    }

    // Box2D/Matter.js: AABB 충돌에서 penetration과 normal 계산
    // penetration은 겹치는 영역의 최소 크기
    // normal은 penetration이 가장 작은 축 방향으로 결정
    const overlapX = Math.min(aabbA.max.x, aabbB.max.x) - Math.max(aabbA.min.x, aabbB.min.x);
    const overlapY = Math.min(aabbA.max.y, aabbB.max.y) - Math.max(aabbA.min.y, aabbB.min.y);
    
    // NaN 체크
    if (isNaN(overlapX) || isNaN(overlapY) || !isFinite(overlapX) || !isFinite(overlapY)) {
      return { collided: false };
    }

    // Box2D/Matter.js: 가장 작은 penetration을 선택 (MTV - Minimum Translation Vector)
    // 정적 객체와의 충돌에서는 Y축 방향을 우선시 (베이스 위에 쌓이도록)
    const isStaticCollision = bodyA.isStatic || bodyB.isStatic;
    
    if (isStaticCollision && overlapY > 0) {
      // 정적 객체와 충돌 시 Y축 방향을 우선시 (베이스 위에 쌓이도록)
      const centerA = bodyA.getCenterOfMass();
      const centerB = bodyB.getCenterOfMass();
      const normalY = centerA.y < centerB.y ? 1 : -1;
      const normal = new Vector(0, normalY);
      return { collided: true, normal, penetration: overlapY };
    }
    
    if (overlapX < overlapY) {
      // X축 방향 penetration이 더 작음 → X축 방향 normal
      // normal 방향: bodyA의 중심에서 bodyB의 중심으로 향하는 방향
      const centerA = bodyA.getCenterOfMass();
      const centerB = bodyB.getCenterOfMass();
      const normalX = centerA.x < centerB.x ? 1 : -1;
      const normal = new Vector(normalX, 0);
      return { collided: true, normal, penetration: overlapX };
    }

    // Y축 방향 penetration이 더 작음 → Y축 방향 normal
    // normal 방향: bodyA의 중심에서 bodyB의 중심으로 향하는 방향
    const centerA = bodyA.getCenterOfMass();
    const centerB = bodyB.getCenterOfMass();
    const normalY = centerA.y < centerB.y ? 1 : -1;
    const normal = new Vector(0, normalY);
    return { collided: true, normal, penetration: overlapY };
  }

  /**
   * 충돌 해결 (위치 보정 + 속도 보정)
   * @param {Body} bodyA
   * @param {Body} bodyB
   */
  static resolveCollision(bodyA, bodyB) {
    // NaN 체크 - 조기 반환으로 무한 루프 방지
    if (!bodyA || !bodyB) {
      return;
    }
    if (!bodyA.position || !bodyB.position || !bodyA.velocity || !bodyB.velocity) {
      return;
    }
    if (isNaN(bodyA.position.x) || isNaN(bodyA.position.y) || 
        isNaN(bodyB.position.x) || isNaN(bodyB.position.y) ||
        isNaN(bodyA.velocity.x) || isNaN(bodyA.velocity.y) ||
        isNaN(bodyB.velocity.x) || isNaN(bodyB.velocity.y)) {
      return;
    }
    
    const manifold = CollisionUtil.getCollisionManifold(bodyA, bodyB);
    if (!manifold.collided) return;
    
    // normal과 penetration NaN 체크
    if (!manifold.normal || isNaN(manifold.penetration) || !isFinite(manifold.penetration)) {
      return;
    }

    // 위치 보정과 속도 보정을 모두 적용
    // 위치 보정을 먼저 적용하여 penetration 해결
    CollisionUtil._positionalCorrection(bodyA, bodyB, manifold.normal, manifold.penetration);
    
    // 접촉 중일 때는 항상 impulse 적용 (penetration이 있으면 접촉 중)
    // Box2D/Matter.js: 접촉 제약 조건 해결을 위해 중력 정보 필요
    // 중력 정보는 PhysicsService에서 전달받아야 하지만, 현재는 기본값 사용
    CollisionUtil._applyImpulse(bodyA, bodyB, manifold.normal, manifold.penetration);
    
    // Box2D/Matter.js: 속도를 직접 설정하지 않고 impulse만으로 해결
  }

  /**
   * 위치 보정 (penetration 해결)
   * Box2D/Matter.js: 위치 보정 (Positional Correction)
   * penetration을 해결하기 위해 두 객체를 분리
   * @private
   */
  static _positionalCorrection(bodyA, bodyB, normal, penetration) {
    const percent = 1.0; // 보정 비율 (100% 보정)
    const slop = 0.001; // 허용 오차 (작은 penetration은 무시)
    const correctedPenetration = Math.max(penetration - slop, 0);

    if (correctedPenetration <= 0) return;

    // 정적 객체와의 충돌에서는 동적 객체만 이동 (더 강력한 보정)
    // 베이스를 뚫지 않도록 추가 여유를 두어 더 많이 이동
    if (bodyA.isStatic && !bodyB.isStatic) {
      // bodyA가 정적이면 bodyB만 normal 방향으로 이동
      // 추가 여유를 두어 베이스를 뚫지 않도록 함
      const extraMargin = 1.2; // 20% 추가 여유
      const correction = Vector.multiply(normal, correctedPenetration * percent * extraMargin);
      bodyB.position.add(correction);
      // 속도도 normal 방향으로 조정하여 베이스를 뚫지 않도록 함
      const velAlongNormal = bodyB.velocity.dot(normal);
      if (velAlongNormal < 0) {
        // normal 방향으로 떨어지고 있으면 속도를 0으로 설정
        bodyB.velocity.subtract(Vector.multiply(normal, velAlongNormal));
      }
      return;
    }
    if (bodyB.isStatic && !bodyA.isStatic) {
      // bodyB가 정적이면 bodyA만 normal 반대 방향으로 이동
      // 추가 여유를 두어 베이스를 뚫지 않도록 함
      const extraMargin = 1.2; // 20% 추가 여유
      const correction = Vector.multiply(normal, correctedPenetration * percent * extraMargin);
      bodyA.position.subtract(correction);
      // 속도도 normal 반대 방향으로 조정하여 베이스를 뚫지 않도록 함
      const velAlongNormal = bodyA.velocity.dot(normal);
      if (velAlongNormal < 0) {
        // normal 방향으로 떨어지고 있으면 속도를 0으로 설정
        bodyA.velocity.subtract(Vector.multiply(normal, velAlongNormal));
      }
      return;
    }

    // 둘 다 동적 객체인 경우에만 질량에 비례하여 분리
    const invMassSum = bodyA.invMass + bodyB.invMass;
    if (invMassSum === 0) return;

    // Box2D/Matter.js: 질량에 비례하여 분리
    // correction = normal * (penetration * percent) / invMassSum
    // bodyA는 normal 반대 방향으로, bodyB는 normal 방향으로 이동
    const correction = Vector.multiply(normal, (correctedPenetration * percent) / invMassSum);

    if (!bodyA.isStatic) {
      // bodyA는 normal 반대 방향으로 이동 (normal이 bodyA → bodyB 방향이므로)
      bodyA.position.subtract(Vector.multiply(correction, bodyA.invMass));
    }
    if (!bodyB.isStatic) {
      // bodyB는 normal 방향으로 이동
      bodyB.position.add(Vector.multiply(correction, bodyB.invMass));
    }
  }

  /**
   * 임펄스 적용
   * @private
   */
  static _applyImpulse(bodyA, bodyB, normal, penetration = 0) {
    // NaN 체크 - 조기 반환으로 무한 루프 방지
    if (!normal || isNaN(normal.x) || isNaN(normal.y) || !isFinite(normal.x) || !isFinite(normal.y)) {
      return;
    }
    if (!bodyA.velocity || !bodyB.velocity) {
      return;
    }
    if (isNaN(bodyA.velocity.x) || isNaN(bodyA.velocity.y) || isNaN(bodyB.velocity.x) || isNaN(bodyB.velocity.y)) {
      return;
    }
    if (isNaN(penetration) || !isFinite(penetration)) {
      return;
    }
    
    const relativeVelocity = Vector.subtract(bodyB.velocity, bodyA.velocity);
    const velAlongNormal = relativeVelocity.dot(normal);
    
    // velAlongNormal이 NaN이면 조기 반환
    if (isNaN(velAlongNormal) || !isFinite(velAlongNormal)) {
      return;
    }

    // 탄성 완전 제거 (항상 0)
    const restitution = 0;
    const invMassSum = bodyA.invMass + bodyB.invMass;
    if (invMassSum === 0 || isNaN(invMassSum) || !isFinite(invMassSum)) {
      return;
    }

    // Box2D/Matter.js: 접촉 제약 조건(Contact Constraint) 해결
    // 접촉 제약 조건: v_rel · n >= 0 (상대 속도가 normal 방향으로 분리되거나 0)
    // 접촉 중일 때는 normal impulse가 중력 효과를 상쇄해야 함
    let impulseScalar;
    // normalImpulse를 함수 상단에서 계산 (모든 경로에서 사용 가능하도록)
    const normalImpulse = (-(1 + restitution) * velAlongNormal) / invMassSum;
    
    // minImpulse를 함수 상단에서 계산 (모든 경로에서 사용 가능하도록)
    const gravityAccel = 500; // 중력 가속도
    const deltaTime = 1 / 60; // 기본 deltaTime
    const gravityVelocityPerFrame = gravityAccel * deltaTime; // 한 프레임에 중력에 의한 속도 증가
    const massA = (bodyA.mass !== undefined && bodyA.mass > 0 && isFinite(bodyA.mass)) ? bodyA.mass : 1;
    const massB = (bodyB.mass !== undefined && bodyB.mass > 0 && isFinite(bodyB.mass)) ? bodyB.mass : 1;
    const mass = Math.max(massA, massB); // 더 큰 질량 사용
    const iterations = 50; // 충돌 해결 반복 횟수 (PhysicsService.iterations와 동일하게)
    const gravityVelocityPerIteration = gravityVelocityPerFrame / iterations; // 각 반복마다 상쇄해야 할 속도
    const minImpulse = gravityVelocityPerIteration * mass * 100.0; // 여유를 두어 100배 적용 (더 안정적)
    // Box2D/Matter.js: 접촉 제약 조건은 penetration이 있거나 접촉 중일 때 항상 해결
    // 블록이 다른 블록 위에 조금만 벗어나서 배치되어도 안정적으로 유지되도록 접촉 제약 조건 강화
    if (penetration > 0.001 || Math.abs(velAlongNormal) < 20) {
      // 접촉 중일 때 (penetration > 0)
      // Box2D/Matter.js: 접촉 제약 조건을 해결하기 위해 impulse 적용
      // 접촉 제약 조건: v_rel · n = 0 (접촉면에서 상대 속도가 0)
      // 이를 위해 필요한 impulse: j = -v_rel · n / (1/mA + 1/mB)
      
      // Box2D/Matter.js: 접촉 중일 때는 상대 속도가 normal 방향으로 0이 되도록 impulse 적용
      // 중력 효과를 상쇄하기 위해 충분한 impulse 필요
      // 접촉 제약 조건 해결: v_rel · n = 0
      // 중력이 계속 적용되므로, 각 반복마다 충분한 impulse를 적용하여 점진적으로 상쇄
      
      // Box2D/Matter.js: 접촉 제약 조건 해결
      // 접촉 제약 조건: v_rel · n = 0 (접촉면에서 상대 속도가 0)
      // 이를 위해 필요한 impulse: j = -v_rel · n / (1/mA + 1/mB)
      // 중력이 계속 적용되므로, 각 반복마다 충분한 impulse를 적용하여 점진적으로 상쇄
      
      if (velAlongNormal > 0) {
        // 서로 멀어지고 있지만 penetration이 있으면 접촉 제약 조건 위반
        // Box2D/Matter.js: penetration이 있으면 항상 접촉 제약 조건 해결
        impulseScalar = -minImpulse / invMassSum;
      }
      if (velAlongNormal <= 0) {
        // 접촉 중이면 normal impulse 적용
        // velAlongNormal이 0에 가까워도 중력 상쇄를 위해 충분한 impulse 필요
        // Box2D/Matter.js: 접촉 제약 조건을 해결하기 위해 항상 충분한 impulse 필요
        // 접촉 제약 조건: v_rel · n = 0을 만족하기 위해 항상 최소 impulse 보장
        const minImpulseScalar = -minImpulse / invMassSum;
        if (Math.abs(normalImpulse) < Math.abs(minImpulseScalar)) {
          // normal impulse가 충분하지 않으면 최소 impulse 사용
          impulseScalar = minImpulseScalar;
        }
        if (Math.abs(normalImpulse) >= Math.abs(minImpulseScalar)) {
          // normal impulse가 충분하면 사용 (normalImpulse는 이미 음수이므로 충분함)
          impulseScalar = normalImpulse;
        }
      }
    }
    if (penetration <= 0.001 && Math.abs(velAlongNormal) >= 20) {
      // penetration이 없어도 접촉 중이면 접촉 제약 조건 해결
      // Box2D/Matter.js: 접촉 제약 조건은 penetration이 있거나 접촉 중일 때 항상 해결
      // 블록이 다른 블록 위에 조금만 벗어나서 배치되어도 안정적으로 유지되도록 접촉 제약 조건 강화
      if (Math.abs(velAlongNormal) < 20) {
        // 접촉 중이면 접촉 제약 조건 해결
        const minImpulseScalar = -minImpulse / invMassSum;
        if (Math.abs(normalImpulse) < Math.abs(minImpulseScalar)) {
          impulseScalar = minImpulseScalar;
        }
        if (Math.abs(normalImpulse) >= Math.abs(minImpulseScalar)) {
          impulseScalar = normalImpulse;
        }
      }
      if (velAlongNormal > 0) {
        // 일반 충돌 해결
        return; // 서로 멀어지고 있음
      }
      impulseScalar = (-(1 + restitution) * velAlongNormal) / invMassSum;
    }
    
    // NaN 체크
    if (isNaN(impulseScalar) || !isFinite(impulseScalar)) {
      console.error('[CollisionUtil] impulseScalar is NaN or Infinity:', {
        velAlongNormal,
        normalImpulse,
        minImpulse,
        invMassSum,
        penetration,
        bodyA: { mass: bodyA.mass, invMass: bodyA.invMass },
        bodyB: { mass: bodyB.mass, invMass: bodyB.invMass }
      });
      return; // NaN이면 impulse 적용하지 않음
    }
    
    const impulse = Vector.multiply(normal, impulseScalar);

    // 접촉점 계산
    const centerA = bodyA.getCenterOfMass();
    const centerB = bodyB.getCenterOfMass();
    let contactPoint;
    
    // Box2D/Matter.js: 접촉점은 normal 방향으로 투영된 중심점을 사용
    // 완벽하게 수평/수직으로 닿았을 때는 각 충격량이 0이 되도록 함
    // 정적 객체가 있는 경우 접촉면의 중심을 사용하되, normal 방향으로 보정
    if (bodyA.isStatic || bodyB.isStatic) {
      // AABB 겹치는 영역의 중심을 접촉점으로 사용
      const aabbA = bodyA.getAABB();
      const aabbB = bodyB.getAABB();
      
      const overlapMinX = Math.max(aabbA.min.x, aabbB.min.x);
      const overlapMaxX = Math.min(aabbA.max.x, aabbB.max.x);
      const overlapMinY = Math.max(aabbA.min.y, aabbB.min.y);
      const overlapMaxY = Math.min(aabbA.max.y, aabbB.max.y);
      
      // 겹치는 영역의 중심
      const overlapCenter = new Vector(
        (overlapMinX + overlapMaxX) / 2,
        (overlapMinY + overlapMaxY) / 2
      );
      
      // Box2D/Matter.js: normal 방향으로 투영하여 접촉점 보정
      // 완벽하게 수평/수직으로 닿았을 때는 중심을 통과하도록 함
      const staticBody = bodyA.isStatic ? bodyA : bodyB;
      const dynamicBody = bodyA.isStatic ? bodyB : bodyA;
      const staticCenter = staticBody.getCenterOfMass();
      const dynamicCenter = dynamicBody.getCenterOfMass();
      
      // normal 방향으로 투영된 접촉점 계산
      // normal이 (0, 1)이면 수평 접촉, (1, 0)이면 수직 접촉
      // 수평 접촉일 때는 x 좌표를 중심으로, 수직 접촉일 때는 y 좌표를 중심으로
      if (Math.abs(normal.x) < 0.1) {
        // 수평 접촉 (normal ≈ (0, 1) 또는 (0, -1))
        contactPoint = new Vector(dynamicCenter.x, overlapCenter.y);
      }
      if (Math.abs(normal.x) >= 0.1 && Math.abs(normal.y) < 0.1) {
        // 수직 접촉 (normal ≈ (1, 0) 또는 (-1, 0))
        contactPoint = new Vector(overlapCenter.x, dynamicCenter.y);
      }
      if (Math.abs(normal.x) >= 0.1 && Math.abs(normal.y) >= 0.1) {
        // 대각선 접촉 (드물지만 발생 가능)
        contactPoint = overlapCenter;
      }
    }
    if (!bodyA.isStatic && !bodyB.isStatic) {
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
      // Box2D/Matter.js: normal impulse가 중심을 통과하면 각 충격량이 0이어야 함
      // 완벽하게 수평/수직으로 닿았을 때는 각 충격량이 매우 작아야 함
      const rA = Vector.subtract(contactPoint, centerA);
      const angularImpulseA = rA.cross(Vector.multiply(impulse, -1));
      
      // normal impulse가 중심을 통과하는지 확인
      // normal과 rA가 평행하면 각 충격량이 0이어야 함
      // 하지만 수치 오차로 인해 작은 각 충격량이 생길 수 있으므로, 매우 작은 각 충격량은 무시
      if (Math.abs(angularImpulseA) > 0.001) {
        bodyA.applyAngularImpulse(angularImpulseA);
      }
    }
    if (!bodyB.isStatic) {
      bodyB.applyImpulse(impulse);
      
      // 접촉점에서의 각 충격량 적용 (r × impulse)
      const rB = Vector.subtract(contactPoint, centerB);
      const angularImpulseB = rB.cross(impulse);
      
      // normal impulse가 중심을 통과하는지 확인
      if (Math.abs(angularImpulseB) > 0.001) {
        bodyB.applyAngularImpulse(angularImpulseB);
      }
    }
    
    // 마찰 적용 (Coulumb 마찰 법칙: 마찰 임펄스는 정상 임펄스에 비례)
    // Box2D/Matter.js: 정적 마찰(static friction)과 동적 마찰(dynamic friction) 구분
    // 정적 마찰: 접촉 중이고 상대 속도가 작을 때 더 강한 마찰 적용
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
      
      // Box2D/Matter.js: 정적 마찰과 동적 마찰 구분
      // 상대 속도가 작으면 정적 마찰(더 강함), 크면 동적 마찰
      const staticFrictionThreshold = 1.0; // 정적 마찰 임계값
      const isStaticFriction = Math.abs(velAlongTangent) < staticFrictionThreshold;
      const staticFrictionMultiplier = isStaticFriction ? 1.5 : 1.0; // 정적 마찰은 1.5배 강함
      
      // 마찰 임펄스 계산 (정상 임펄스에 비례, 최대값 제한)
      // Box2D/Matter.js: 정적 마찰은 더 강하게 적용하여 블록이 미끄러지지 않도록 함
      const maxFrictionImpulse = Math.abs(impulseScalar) * friction * 3.0 * staticFrictionMultiplier; // 정적 마찰 강화
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
          // Box2D/Matter.js: 사각형 블록이 바닥에 닿았을 때 각도가 0도 근처면 회전을 멈춤
          // 사각형 블록은 모서리가 바닥에 닿으면 회전이 멈춰야 함
          const angle = Math.abs(bodyA.angle || 0);
          const angleMod = angle % (Math.PI / 2); // 90도 단위로 정규화
          const normalizedAngle = Math.min(angleMod, Math.PI / 2 - angleMod); // 0~45도 범위로
          
          // 각도가 거의 0도이거나 90도 근처면 회전을 강제로 멈춤 (사각형 블록 특성)
          if (normalizedAngle < 0.1) { // 약 5.7도 이내
            bodyA.angularVelocity = 0;
            // 각도를 가장 가까운 0도 또는 90도로 정렬
            const nearestAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
            bodyA.angle = nearestAngle;
          }
          if (normalizedAngle >= 0.1) {
            // 베이스와 접촉 중일 때는 각속도에 직접 마찰 토크를 매우 강하게 적용
            // Box2D/Matter.js 스타일: 접촉 중일 때 마찰 토크는 각속도에 비례
            const staticFrictionTorque = -bodyA.angularVelocity * friction * bodyA.inertia * 10.0; // 마찰 토크 더 강화
            bodyA.applyAngularImpulse(staticFrictionTorque);
          }
          
          // Box2D/Matter.js: 마찰 토크만 적용, 속도는 직접 설정하지 않음
          // 마찰 토크는 각속도에 비례하여 적용
          // 각속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.angularVelocity) < 0.05) {
            bodyA.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.velocity.x) < 0.5) {
            bodyA.velocity.x = 0;
          }
          if (Math.abs(bodyA.velocity.y) < 0.5 && bodyA.velocity.y >= 0) {
            bodyA.velocity.y = 0;
          }
        }
        if (!bodyB.isStatic) {
          // Box2D/Matter.js: 블록 간 접촉에서도 정적 마찰 적용
          // 블록이 다른 블록 위에 조금만 벗어나서 배치되어도 안정적으로 유지되도록
          const relativeSpeed = Math.abs(velAlongTangent);
          if (relativeSpeed < 1.0) {
            // 정적 마찰: 상대 속도가 작으면 마찰 토크를 더 강하게 적용
            const staticFrictionTorque = -bodyA.angularVelocity * friction * bodyA.inertia * 3.0;
            bodyA.applyAngularImpulse(staticFrictionTorque);
          }
          // Box2D/Matter.js: 일반 접촉에서의 마찰 토크만 적용
          // 각속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.angularVelocity) < 0.05) {
            bodyA.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyA.velocity.x) < 0.1) {
            bodyA.velocity.x = 0;
          }
          if (Math.abs(bodyA.velocity.y) < 0.1 && bodyA.velocity.y >= 0) {
            bodyA.velocity.y = 0;
          }
        }
      }
      if (!bodyB.isStatic) {
        bodyB.applyImpulse(frictionImpulse);
        
        // 접촉점에서의 마찰 토크 적용 (r × frictionImpulse)
        // Box2D/Matter.js: 마찰 토크도 매우 작으면 무시
        const rB = Vector.subtract(contactPoint, centerB);
        const frictionTorqueB = rB.cross(frictionImpulse);
        if (Math.abs(frictionTorqueB) > 0.001) {
          bodyB.applyAngularImpulse(frictionTorqueB);
        }
        
        // 정적 객체(베이스)와 접촉 중이면 마찰 토크를 매우 강하게 적용
        if (bodyA.isStatic) {
          // Box2D/Matter.js: 사각형 블록이 바닥에 닿았을 때 각도가 0도 근처면 회전을 멈춤
          // 사각형 블록은 모서리가 바닥에 닿으면 회전이 멈춰야 함
          const angle = Math.abs(bodyB.angle || 0);
          const angleMod = angle % (Math.PI / 2); // 90도 단위로 정규화
          const normalizedAngle = Math.min(angleMod, Math.PI / 2 - angleMod); // 0~45도 범위로
          
          // 각도가 거의 0도이거나 90도 근처면 회전을 강제로 멈춤 (사각형 블록 특성)
          if (normalizedAngle < 0.1) { // 약 5.7도 이내
            bodyB.angularVelocity = 0;
            // 각도를 가장 가까운 0도 또는 90도로 정렬
            const nearestAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
            bodyB.angle = nearestAngle;
          }
          if (normalizedAngle >= 0.1) {
            // 베이스와 접촉 중일 때는 각속도에 직접 마찰 토크를 매우 강하게 적용
            // Box2D/Matter.js 스타일: 접촉 중일 때 마찰 토크는 각속도에 비례
            const staticFrictionTorque = -bodyB.angularVelocity * friction * bodyB.inertia * 10.0; // 마찰 토크 더 강화
            bodyB.applyAngularImpulse(staticFrictionTorque);
          }
          
          // Box2D/Matter.js: 마찰 토크만 적용, 속도는 직접 설정하지 않음
          
          // 각속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyB.angularVelocity) < 0.05) {
            bodyB.angularVelocity = 0;
          }
          
          // 속도가 매우 작으면 0으로 (수치 안정성)
          if (Math.abs(bodyB.velocity.x) < 0.5) {
            bodyB.velocity.x = 0;
          }
          if (Math.abs(bodyB.velocity.y) < 0.5 && bodyB.velocity.y >= 0) {
            bodyB.velocity.y = 0;
          }
        }
        if (!bodyA.isStatic) {
          // Box2D/Matter.js: 블록 간 접촉에서도 정적 마찰 적용
          // 블록이 다른 블록 위에 조금만 벗어나서 배치되어도 안정적으로 유지되도록
          const relativeSpeed = Math.abs(velAlongTangent);
          if (relativeSpeed < 1.0) {
            // 정적 마찰: 상대 속도가 작으면 마찰 토크를 더 강하게 적용
            const staticFrictionTorque = -bodyB.angularVelocity * friction * bodyB.inertia * 3.0;
            bodyB.applyAngularImpulse(staticFrictionTorque);
          }
          // Box2D/Matter.js: 일반 접촉에서의 마찰 토크만 적용
          
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

