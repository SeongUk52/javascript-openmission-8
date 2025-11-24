import { Body } from '../domain/Body.js';
import { GravityService } from './GravityService.js';
import { CollisionUtil } from '../util/CollisionUtil.js';
import { TorqueUtil } from '../util/TorqueUtil.js';
import { BalanceUtil } from '../util/BalanceUtil.js';
import { Vector } from '../domain/Vector.js';

/**
 * 물리 시뮬레이션 서비스
 * 모든 물리 시스템을 통합하여 관리한다.
 */
export class PhysicsService {
  constructor(options = {}) {
    // 물리 객체들
    this.bodies = [];
    
    // 중력 시스템
    this.gravity = options.gravity || new GravityService();
    
    // 물리 설정
    this.timeStep = options.timeStep || 1 / 60; // 기본 60fps
    this.maxSubSteps = options.maxSubSteps || 10; // 최대 서브스텝
    this.iterations = options.iterations || 40; // 충돌 해결 반복 횟수 (Box2D/Matter.js: 접촉 제약 조건 해결, 더 많은 반복으로 안정성 향상)
    
    // 이벤트 콜백
    this.onCollision = options.onCollision || null;
    this.onTopple = options.onTopple || null;
  }

  /**
   * Body 추가
   * @param {Body} body
   */
  addBody(body) {
    if (!(body instanceof Body)) {
      throw new Error('Body 인스턴스만 추가할 수 있습니다.');
    }
    this.bodies.push(body);
  }

  /**
   * Body 제거
   * @param {Body} body
   */
  removeBody(body) {
    const index = this.bodies.indexOf(body);
    if (index > -1) {
      this.bodies.splice(index, 1);
    }
  }

  /**
   * 모든 Body 제거
   */
  clearBodies() {
    this.bodies = [];
  }

  /**
   * 물리 업데이트 (한 프레임)
   * @param {number} deltaTime 경과 시간 (초)
   */
  update(deltaTime) {
    // 서브스텝으로 나누어 안정성 향상
    const subSteps = Math.min(
      Math.ceil(deltaTime / this.timeStep),
      this.maxSubSteps
    );
    const subStepTime = deltaTime / subSteps;

    for (let i = 0; i < subSteps; i++) {
      this.step(subStepTime);
    }
  }

  /**
   * 한 스텝 업데이트
   * @param {number} deltaTime
   */
  step(deltaTime) {
    // 1. 중력 적용 (항상 적용 - 물리 법칙)
    this.gravity.applyToBodies(this.bodies);

    // 2. 물리 업데이트 (힘 → 가속도 → 속도 → 위치)
    // 모든 동적 블록에 중력이 적용되도록 함
    this.bodies.forEach(body => {
      if (!body.isStatic) {
        body.update(deltaTime);
      }
    });

    // 3. 충돌 감지 및 해결 (여러 번 반복하여 안정성 향상)
    // Box2D/Matter.js: 접촉 제약 조건(Contact Constraint)을 여러 번 반복하여 해결
    // 각 반복마다 normal impulse를 적용하여 중력 효과를 점진적으로 상쇄
    // 충돌 해결은 여러 번 반복해야 블록이 베이스를 통과하지 않음
    if (this.bodies.length > 1) {
      for (let i = 0; i < this.iterations; i++) {
        this.resolveCollisions();
      }
    }
    
    // 3.5. 접촉 중인 블록의 각속도 지속 감쇠
    this._applyContactAngularDamping();

    // 4. 균형 판정
    this.checkBalance();
  }

  /**
   * 충돌 감지 및 해결
   */
  resolveCollisions() {
    // 디버그: resolveCollisions 호출 확인
    // console.log('[PhysicsService] resolveCollisions called, bodies:', this.bodies.length);
    
    // 모든 Body 쌍에 대해 충돌 검사
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];

        // 정적 객체끼리는 충돌 검사 안 함
        if (bodyA.isStatic && bodyB.isStatic) {
          continue;
        }

        // 충돌 감지
        const isColliding = CollisionUtil.isAABBColliding(bodyA, bodyB);
        
        // 디버그 로그 제거 (성능에 영향)
        // 충돌 감지는 정상 작동하지만 로그는 제거
        
        if (isColliding) {
          // 디버그 로그 제거 (성능 향상 및 콘솔 스팸 방지)
          // const baseBody = bodyA.isStatic && bodyA.isPlaced ? bodyA : (bodyB.isStatic && bodyB.isPlaced ? bodyB : null);
          // const placedBody = !bodyA.isStatic && bodyA.isPlaced ? bodyA : (!bodyB.isStatic && bodyB.isPlaced ? bodyB : null);
          // const fallingBody = (bodyA.isFalling && !bodyA.isPlaced) ? bodyA : ((bodyB.isFalling && !bodyB.isPlaced) ? bodyB : null);
          
          // if ((baseBody || placedBody) && fallingBody) {
          //   const supportBody = baseBody || placedBody;
          //   console.log('[PhysicsService] Collision detected (base/placed vs falling):', {
          //     supportBody: { 
          //       id: supportBody.id, 
          //       isStatic: supportBody.isStatic,
          //       isPlaced: supportBody.isPlaced,
          //       position: supportBody.position, 
          //       aabb: supportBody.getAABB() 
          //     },
          //     fallingBody: { 
          //       id: fallingBody.id, 
          //       isStatic: fallingBody.isStatic,
          //       isPlaced: fallingBody.isPlaced,
          //       isFalling: fallingBody.isFalling,
          //       position: fallingBody.position, 
          //       velocity: fallingBody.velocity, 
          //       aabb: fallingBody.getAABB() 
          //     },
          //   });
          // }
          
          // 충돌 해결 (여러 번 반복하여 안정성 향상)
          // 접촉 중일 때는 더 많이 반복하여 안정성 향상
          const iterations = (bodyA.isStatic || bodyB.isStatic) ? this.iterations * 2 : this.iterations;
          for (let k = 0; k < iterations; k++) {
            CollisionUtil.resolveCollision(bodyA, bodyB);
          }

          // 충돌 이벤트 콜백 (충돌 해결 후 호출)
          if (this.onCollision) {
            try {
              this.onCollision(bodyA, bodyB);
            } catch (error) {
              console.error('[PhysicsService] Error in onCollision callback:', error);
            }
          }
        }
      }
    }
  }

  /**
   * 접촉 중인 블록의 속도 및 각속도 지속 감쇠
   * 접촉 중인 블록은 속도와 각속도가 빠르게 감쇠되어야 함
   * @private
   */
  _applyContactAngularDamping() {
    // 모든 동적 블록에 대해 접촉 상태 확인
    this.bodies.forEach(body => {
      if (body.isStatic) return;
      if (Math.abs(body.angularVelocity) < 0.01) return; // 이미 멈춘 블록은 스킵
      
      // 다른 블록과 접촉 중인지 확인
      let isInContact = false;
      let isContactWithStatic = false;
      for (let i = 0; i < this.bodies.length; i++) {
        const otherBody = this.bodies[i];
        if (otherBody === body) continue;
        
        // 접촉 중인지 확인 (AABB 충돌)
        if (CollisionUtil.isAABBColliding(body, otherBody)) {
          isInContact = true;
          if (otherBody.isStatic) {
            isContactWithStatic = true;
            break; // 정적 객체와 접촉 중이면 더 강하게 처리
          }
        }
      }
      
      // 접촉 중이면 각속도 강하게 감쇠
      if (isInContact) {
        // 정적 객체(베이스)와 접촉 중이면 매우 강하게 감쇠
        if (isContactWithStatic) {
          // Box2D/Matter.js: 사각형 블록이 바닥에 닿았을 때 각도가 0도 근처면 회전을 멈춤
          // 사각형 블록은 모서리가 바닥에 닿으면 회전이 멈춰야 함
          const angle = Math.abs(body.angle || 0);
          const angleMod = angle % (Math.PI / 2); // 90도 단위로 정규화
          const normalizedAngle = Math.min(angleMod, Math.PI / 2 - angleMod); // 0~45도 범위로
          
          // 각도가 거의 0도이거나 90도 근처면 회전을 강제로 멈춤 (사각형 블록 특성)
          if (normalizedAngle < 0.1) { // 약 5.7도 이내
            body.angularVelocity = 0;
            // 각도를 가장 가까운 0도 또는 90도로 정렬
            const nearestAngle = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
            body.angle = nearestAngle;
          } else {
            // 베이스와 접촉 중일 때는 각속도를 매우 강하게 감쇠
            body.angularVelocity *= 0.3; // 70% 감쇠 (더 강하게)
          }
          
          // 속도도 마찰에 의해 매우 강하게 감쇠
          // Box2D/Matter.js 스타일: 접촉 중일 때 마찰이 매우 강하게 작용
          const friction = body.friction || 0.8;
          const frictionDampingX = 1 - friction * 0.8; // 수평 마찰 매우 강화
          const frictionDampingY = 1 - friction * 0.7; // 수직 마찰 매우 강화
          body.velocity.x *= frictionDampingX;
          body.velocity.y *= frictionDampingY;
          
          // Box2D/Matter.js: 매우 작은 각속도는 즉시 0으로
          if (Math.abs(body.angularVelocity) < 0.1) {
            body.angularVelocity = 0;
          }
          
          // Box2D/Matter.js: 매우 작은 속도는 즉시 0으로
          if (Math.abs(body.velocity.x) < 0.5) {
            body.velocity.x = 0;
          }
          if (Math.abs(body.velocity.y) < 0.5 && body.velocity.y >= 0) {
            body.velocity.y = 0;
          }
        } else {
          // 일반 접촉에서의 감쇠
          const contactDamping = 0.85; // 15% 감쇠 (더 강하게)
          body.angularVelocity *= contactDamping;
          
          // 각속도가 작으면 추가 감쇠
          if (Math.abs(body.angularVelocity) < 0.3) {
            body.angularVelocity *= 0.7; // 추가 감쇠 (더 강하게)
          }
          
          // 매우 작은 각속도는 0으로 설정
          if (Math.abs(body.angularVelocity) < 0.05) {
            body.angularVelocity = 0;
          }
        }
      }
    });
  }

  /**
   * 균형 판정
   * @param {boolean} enabled - 균형 판정 활성화 여부 (게임이 시작되었을 때만 true)
   */
  checkBalance(enabled = true) {
    if (!enabled) return;
    
    // 모든 동적 블록에 대해 균형 판정 (isPlaced 사용하지 않음)
    // 블록이 베이스나 다른 블록 위에 있으면 균형 판정
    this.bodies.forEach(body => {
      if (body.isStatic) return;
      if (body.isFalling && body.velocity.y > 100) return; // 빠르게 떨어지는 중이면 균형 판정하지 않음 (성능 최적화)

      // 블록이 어떤 블록 위에 있는지 확인
      const supportBounds = this._getSupportBounds(body);
      
      // Box2D/Matter.js: tolerance를 블록 크기의 일정 비율로 설정
      // 블록이 조금만 벗어나도 안정적으로 유지되도록 관대한 tolerance 적용
      const result = BalanceUtil.evaluate(body, { supportBounds });
      
      if (!result.stable && this.onTopple) {
        this.onTopple(body, result);
      }
    });
  }

  /**
   * 블록의 지지 영역 계산
   * 블록이 어떤 블록 위에 있는지 확인하고 그 블록의 지지 영역을 반환
   * @param {Body} body
   * @returns {{min: Vector, max: Vector}}
   * @private
   */
  _getSupportBounds(body) {
    if (!body || !body.getAABB) {
      return BalanceUtil.getDefaultSupportBounds(body);
    }
    
    const bodyAABB = body.getAABB();
    if (!bodyAABB || !bodyAABB.min || !bodyAABB.max) {
      return BalanceUtil.getDefaultSupportBounds(body);
    }
    
    const bodyBottom = bodyAABB.max.y;
    const bodyCenterX = body.position.x;
    
    // 블록 바로 아래에 있는 블록 찾기
    let supportBody = null;
    let minDistance = Infinity;
    
    this.bodies.forEach(otherBody => {
      if (otherBody === body) return;
      if (otherBody.isStatic) {
        // 정적 블록(베이스)은 항상 지지할 수 있음
      } else if (otherBody.isFalling && otherBody.velocity.y > 50) {
        // 빠르게 떨어지는 중인 블록은 지지할 수 없음
        return;
      }
      
      const otherAABB = otherBody.getAABB();
      if (!otherAABB || !otherAABB.min || !otherAABB.max) return;
      
      const otherTop = otherAABB.min.y;
      
      // 블록이 다른 블록 위에 있는지 확인
      // 블록의 하단이 다른 블록의 상단 근처에 있어야 함
      const distanceY = bodyBottom - otherTop;
      
      // 더 넓은 범위로 허용 (블록이 비스듬히 쌓여있을 때도 감지)
      if (distanceY >= -20 && distanceY <= 20) { // 20픽셀 이내
        // X 위치도 확인: 블록이 다른 블록 위에 있어야 함
        const otherLeft = otherAABB.min.x;
        const otherRight = otherAABB.max.x;
        const bodyLeft = bodyAABB.min.x;
        const bodyRight = bodyAABB.max.x;
        
        // 블록이 다른 블록과 겹치거나, 블록의 중심이 다른 블록 위에 있으면
        // X 범위가 겹치는지 확인
        const xOverlap = !(bodyRight < otherLeft || bodyLeft > otherRight);
        
        if (xOverlap) {
          if (distanceY < minDistance) {
            minDistance = distanceY;
            supportBody = otherBody;
          }
        }
      }
    });
    
    // 지지 블록이 있으면 그 블록의 상단을 지지 영역으로 사용
    // Box2D/Matter.js: 회전된 블록의 경우 실제 접촉 영역을 고려해야 함
    if (supportBody) {
      const supportAABB = supportBody.getAABB();
      if (!supportAABB || !supportAABB.min || !supportAABB.max) {
        // AABB가 없으면 기본값 사용
        return BalanceUtil.getDefaultSupportBounds(body);
      }
      
      // Box2D/Matter.js: 회전된 블록의 경우 실제 접촉 영역 계산
      // 지지 블록이 회전되어 있으면 실제 접촉 영역이 줄어들 수 있음
      // 하지만 간단하게 AABB를 사용하되, tolerance로 보정
      const supportAngle = Math.abs(supportBody.angle || 0);
      const bodyAngle = Math.abs(body.angle || 0);
      
      // 회전이 있으면 지지 영역을 약간 줄임 (실제 접촉 영역 고려)
      const angleReduction = (supportAngle + bodyAngle) * 10; // 각도에 따른 감소
      const supportWidth = supportAABB.max.x - supportAABB.min.x;
      const effectiveWidth = Math.max(supportWidth - angleReduction, supportWidth * 0.5); // 최소 50% 유지
      const centerX = (supportAABB.min.x + supportAABB.max.x) / 2;
      
      return {
        min: new Vector(centerX - effectiveWidth / 2, supportAABB.min.y),
        max: new Vector(centerX + effectiveWidth / 2, supportAABB.min.y),
      };
    }
    
    // 베이스 블록 찾기
    const baseBody = this.bodies.find(b => b.isStatic && b.isPlaced);
    if (baseBody) {
      const baseAABB = baseBody.getAABB();
      if (!baseAABB || !baseAABB.min || !baseAABB.max) {
        // AABB가 없으면 기본값 사용
        return BalanceUtil.getDefaultSupportBounds(body);
      }
      const baseTop = baseAABB.min.y;
      
      // 블록이 베이스 위에 있는지 확인
      const distanceY = bodyBottom - baseTop;
      if (distanceY >= -5 && distanceY <= 5) {
        return {
          min: new Vector(baseAABB.min.x, baseAABB.min.y),
          max: new Vector(baseAABB.max.x, baseAABB.min.y),
        };
      }
    }
    
    // 지지 블록이 없으면 기본값 사용 (블록 자신의 AABB 하단)
    return BalanceUtil.getDefaultSupportBounds(body);
  }

  /**
   * 특정 위치의 Body 찾기
   * @param {Vector} position 위치
   * @param {number} radius 반경
   * @returns {Body[]} 찾은 Body 배열
   */
  getBodiesAt(position, radius = 0) {
    return this.bodies.filter(body => {
      const distance = body.position.distance(position);
      return distance <= radius;
    });
  }

  /**
   * 정적 Body만 반환
   * @returns {Body[]}
   */
  getStaticBodies() {
    return this.bodies.filter(body => body.isStatic);
  }

  /**
   * 동적 Body만 반환
   * @returns {Body[]}
   */
  getDynamicBodies() {
    return this.bodies.filter(body => !body.isStatic);
  }

  /**
   * 중력 설정
   * @param {number} gravity 중력 가속도
   */
  setGravity(gravity) {
    this.gravity.setGravity(gravity);
  }

  /**
   * 중력 방향 설정
   * @param {Vector} direction 중력 방향
   */
  setGravityDirection(direction) {
    this.gravity.setDirection(direction);
  }
}

