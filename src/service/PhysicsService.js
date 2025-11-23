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
    this.iterations = options.iterations || 10; // 충돌 해결 반복 횟수
    
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
    // 1. 중력 적용
    this.gravity.applyToBodies(this.bodies);

    // 2. 물리 업데이트 (힘 → 가속도 → 속도 → 위치)
    this.bodies.forEach(body => {
      if (!body.isStatic) {
        body.update(deltaTime);
      }
    });

    // 3. 충돌 감지 및 해결 (여러 번 반복하여 안정성 향상)
    // 충돌 해결은 여러 번 반복해야 블록이 베이스를 통과하지 않음
    if (this.bodies.length > 1) {
      for (let i = 0; i < 3; i++) {
        this.resolveCollisions();
      }
    }

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
          for (let k = 0; k < this.iterations; k++) {
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
   * 균형 판정
   * @param {boolean} enabled - 균형 판정 활성화 여부 (게임이 시작되었을 때만 true)
   */
  checkBalance(enabled = true) {
    if (!enabled) return;
    
    // 배치된 블록들만 균형 판정 (떨어지는 중인 블록도 포함)
    // 위에 있는 블록이 무너지면 아래 블록도 영향을 받아야 함
    // 모든 블록을 순회하면서 균형 판정
    this.bodies.forEach(body => {
      if (body.isStatic) return;
      if (!body.isPlaced) return; // 배치되지 않은 블록은 균형 판정하지 않음
      if (body.isFalling) return; // 이미 떨어지는 중이면 균형 판정하지 않음 (성능 최적화)

      // 블록이 어떤 블록 위에 있는지 확인
      const supportBounds = this._getSupportBounds(body);
      
      // tolerance를 0으로 설정하여 더 엄격한 균형 판정
      const result = BalanceUtil.evaluate(body, { supportBounds, tolerance: 0 });
      
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
      if (!otherBody.isPlaced) return; // 배치되지 않은 블록은 지지할 수 없음
      if (otherBody.isFalling && !otherBody.isPlaced) return; // 떨어지는 중이고 배치되지 않은 블록은 지지할 수 없음
      
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
    if (supportBody) {
      const supportAABB = supportBody.getAABB();
      if (!supportAABB || !supportAABB.min || !supportAABB.max) {
        // AABB가 없으면 기본값 사용
        return BalanceUtil.getDefaultSupportBounds(body);
      }
      return {
        min: new Vector(supportAABB.min.x, supportAABB.min.y),
        max: new Vector(supportAABB.max.x, supportAABB.min.y),
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

