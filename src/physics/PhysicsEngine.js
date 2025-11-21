import { Body } from './Body.js';
import { Gravity } from './Gravity.js';
import { Collision } from './Collision.js';
import { Torque } from './Torque.js';
import { Balance } from './Balance.js';

/**
 * 물리엔진 메인 클래스
 * 모든 물리 시스템을 통합하여 관리한다.
 */
export class PhysicsEngine {
  constructor(options = {}) {
    // 물리 객체들
    this.bodies = [];
    
    // 중력 시스템
    this.gravity = options.gravity || new Gravity();
    
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

    // 3. 충돌 감지 및 해결
    this.resolveCollisions();

    // 4. 균형 판정
    this.checkBalance();
  }

  /**
   * 충돌 감지 및 해결
   */
  resolveCollisions() {
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
        if (Collision.isAABBColliding(bodyA, bodyB)) {
          // 충돌 해결 (여러 번 반복하여 안정성 향상)
          for (let k = 0; k < this.iterations; k++) {
            Collision.resolveCollision(bodyA, bodyB);
          }

          // 충돌 이벤트 콜백
          if (this.onCollision) {
            this.onCollision(bodyA, bodyB);
          }
        }
      }
    }
  }

  /**
   * 균형 판정
   */
  checkBalance() {
    this.bodies.forEach(body => {
      if (body.isStatic) return;

      const result = Balance.evaluate(body);
      
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

