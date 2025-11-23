import { Body } from '../domain/Body.js';
import { GravityService } from './GravityService.js';
import { CollisionUtil } from '../util/CollisionUtil.js';
import { TorqueUtil } from '../util/TorqueUtil.js';
import { BalanceUtil } from '../util/BalanceUtil.js';

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
      body.update(deltaTime);
    });

    // 3. 충돌 감지 및 해결 (여러 번 반복하여 안정성 향상)
    // 충돌 해결은 여러 번 반복해야 블록이 베이스를 통과하지 않음
    for (let i = 0; i < 3; i++) {
      this.resolveCollisions();
    }

    // 4. 균형 판정
    this.checkBalance();
  }

  /**
   * 충돌 감지 및 해결
   */
  resolveCollisions() {
    // 디버그: bodies 개수 확인
    if (this.bodies.length > 1) {
      // console.log('[PhysicsService] resolveCollisions called, bodies count:', this.bodies.length);
    }
    
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
        
        // 디버그: 정적/동적 쌍이 가까이 있을 때 로그 출력
        if (bodyA.isStatic || bodyB.isStatic) {
          const staticBody = bodyA.isStatic ? bodyA : bodyB;
          const dynamicBody = bodyA.isStatic ? bodyB : bodyA;
          const aabbA = bodyA.getAABB();
          const aabbB = bodyB.getAABB();
          
          // 충돌 가능성이 있는 경우 로그 출력
          const distanceY = Math.abs(dynamicBody.position.y - staticBody.position.y);
          if (distanceY < 200) {
            // console.log('[PhysicsService] Checking collision:', {
            //   staticBody: { id: staticBody.id, position: staticBody.position, aabb: aabbA },
            //   dynamicBody: { id: dynamicBody.id, position: dynamicBody.position, aabb: aabbB, velocity: dynamicBody.velocity },
            //   distanceY,
            //   isColliding,
            // });
          }
        }
        
        if (isColliding) {
          // 디버그: 충돌 감지 로그
          if (bodyA.isStatic || bodyB.isStatic) {
            const staticBody = bodyA.isStatic ? bodyA : bodyB;
            const dynamicBody = bodyA.isStatic ? bodyB : bodyA;
            console.log('[PhysicsService] Collision detected (static vs dynamic):', {
              staticBody: { 
                id: staticBody.id, 
                isStatic: staticBody.isStatic,
                position: staticBody.position, 
                isPlaced: staticBody.isPlaced, 
                aabb: staticBody.getAABB() 
              },
              dynamicBody: { 
                id: dynamicBody.id, 
                isStatic: dynamicBody.isStatic,
                position: dynamicBody.position, 
                velocity: dynamicBody.velocity, 
                aabb: dynamicBody.getAABB() 
              },
            });
          }
          
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
    
    this.bodies.forEach(body => {
      if (body.isStatic) return;

      const result = BalanceUtil.evaluate(body);
      
      if (!result.stable && this.onTopple) {
        this.onTopple(body, result);
      }
    });
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

