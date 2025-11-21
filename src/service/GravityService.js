import { Vector } from '../domain/Vector.js';

/**
 * 중력 서비스
 * 모든 물리 객체에 중력을 적용한다.
 */
export class GravityService {
  constructor(options = {}) {
    // 중력 가속도 (기본값: 9.8 m/s², 게임에서는 보통 더 크게 설정)
    this.gravity = options.gravity !== undefined ? options.gravity : 9.8;
    
    // 중력 방향 (기본값: 아래쪽)
    this.direction = options.direction || new Vector(0, 1);
    this.direction.normalize();
  }

  /**
   * 중력 벡터 계산
   * @returns {Vector} 중력 벡터
   */
  getGravityVector() {
    return Vector.multiply(this.direction, this.gravity);
  }

  /**
   * Body에 중력 적용
   * @param {Body} body 물리 객체
   */
  apply(body) {
    if (body.isStatic) {
      return; // 정적 객체는 중력 영향 없음
    }

    // 중력 힘 = 질량 * 중력 가속도
    const gravityForce = Vector.multiply(this.getGravityVector(), body.mass);
    body.applyForce(gravityForce);
  }

  /**
   * 여러 Body에 중력 적용
   * @param {Body[]} bodies 물리 객체 배열
   */
  applyToBodies(bodies) {
    bodies.forEach(body => this.apply(body));
  }

  /**
   * 중력 가속도 설정
   * @param {number} gravity 중력 가속도
   */
  setGravity(gravity) {
    this.gravity = gravity;
  }

  /**
   * 중력 방향 설정
   * @param {Vector} direction 중력 방향
   */
  setDirection(direction) {
    this.direction = direction.copy().normalize();
  }

  /**
   * 중력 비활성화 (0으로 설정)
   */
  disable() {
    this.gravity = 0;
  }

  /**
   * 중력 활성화
   * @param {number} gravity 중력 가속도 (기본값: 9.8)
   */
  enable(gravity = 9.8) {
    this.gravity = gravity;
  }
}

