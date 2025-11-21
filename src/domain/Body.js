import { Vector } from './Vector.js';
import { TorqueUtil } from '../util/TorqueUtil.js';

/**
 * 물리 객체 클래스
 * 위치, 속도, 질량 등의 물리 속성을 관리한다.
 */
export class Body {
  constructor(options = {}) {
    // 위치
    this.position = options.position || new Vector(0, 0);
    
    // 속도
    this.velocity = options.velocity || new Vector(0, 0);
    
    // 가속도
    this.acceleration = options.acceleration || new Vector(0, 0);
    
    // 질량 (기본값: 1)
    this.mass = options.mass !== undefined ? options.mass : 1;
    
    // 역질량 (성능 최적화용, 무한대 질량 객체는 0)
    this.invMass = this.mass > 0 ? 1 / this.mass : 0;
    
    // 회전 각도 (라디안)
    this.angle = options.angle || 0;
    
    // 각속도 (라디안/초)
    this.angularVelocity = options.angularVelocity || 0;
    
    // 각가속도 (라디안/초²)
    this.angularAcceleration = options.angularAcceleration || 0;
    
    // 크기 (충돌 감지용) - 관성 모멘트 계산 전에 설정 필요
    this.width = options.width || 0;
    this.height = options.height || 0;
    
    // 중심점 (로컬 좌표계 기준, 기본값은 중심)
    this.center = options.center || new Vector(this.width / 2, this.height / 2);
    
    // 정적 객체 여부 (무한대 질량)
    this.isStatic = options.isStatic || false;
    
    // 관성 모멘트 (회전 관성) - width, height 설정 후 계산
    if (options.inertia !== undefined) {
      this.inertia = options.inertia;
    } else {
      this.inertia = this.calculateInertia();
    }
    
    // 정적 객체 처리
    if (this.isStatic) {
      this.mass = Infinity;
      this.invMass = 0;
      this.inertia = Infinity;
      this.invInertia = 0;
    } else {
      // 역관성 모멘트
      this.invInertia = this.inertia > 0 && !isNaN(this.inertia) && this.inertia !== Infinity ? 1 / this.inertia : 0;
    }
    
    // 힘 (누적)
    this.force = new Vector(0, 0);
    
    // 토크 (회전력, 누적)
    this.torque = 0;
    
    // 마찰 계수
    this.friction = options.friction !== undefined ? options.friction : 0.1;
    
    // 반발 계수 (탄성)
    this.restitution = options.restitution !== undefined ? options.restitution : 0.5;
  }

  /**
   * 관성 모멘트 계산 (직사각형 기준)
   * I = (1/12) * m * (w² + h²)
   * @returns {number} 관성 모멘트
   */
  calculateInertia() {
    if (this.mass === 0 || this.isStatic || this.mass === Infinity) {
      return Infinity;
    }
    if (this.width === 0 || this.height === 0) {
      // 기본값 (작은 값)
      return this.mass * 0.1;
    }
    return (1 / 12) * this.mass * (this.width * this.width + this.height * this.height);
  }

  /**
   * 힘 적용
   * @param {Vector} force 적용할 힘
   */
  applyForce(force) {
    this.force.add(force);
  }

  /**
   * 특정 위치에 힘 적용 (토크 생성)
   * @param {Vector} force 적용할 힘
   * @param {Vector} point 힘을 적용할 위치 (월드 좌표)
   */
  applyForceAtPoint(force, point) {
    TorqueUtil.applyForceAtPoint(this, force, point);
  }

  /**
   * 토크 적용
   * @param {number} torque 적용할 토크
   */
  applyTorque(torque) {
    TorqueUtil.applyTorque(this, torque);
  }

  /**
   * 충격량 적용 (즉시 속도 변경)
   * @param {Vector} impulse 충격량
   */
  applyImpulse(impulse) {
    if (this.isStatic) return;
    this.velocity.add(Vector.multiply(impulse, this.invMass));
  }

  /**
   * 각 충격량 적용 (즉시 각속도 변경)
   * @param {number} angularImpulse 각 충격량
   */
  applyAngularImpulse(angularImpulse) {
    if (this.isStatic) return;
    this.angularVelocity += angularImpulse * this.invInertia;
  }

  /**
   * 물리 업데이트 (한 프레임)
   * @param {number} deltaTime 경과 시간 (초)
   */
  update(deltaTime) {
    if (this.isStatic) {
      this.force = new Vector(0, 0);
      this.torque = 0;
      return;
    }

    // 가속도 = 힘 / 질량
    this.acceleration = Vector.multiply(this.force, this.invMass);
    
    // 속도 업데이트: v = v₀ + a * t
    this.velocity.add(Vector.multiply(this.acceleration, deltaTime));
    
    // 위치 업데이트: x = x₀ + v * t
    this.position.add(Vector.multiply(this.velocity, deltaTime));
    
    TorqueUtil.updateAngularMotion(this, deltaTime);
    
    // 힘 초기화 (다음 프레임을 위해)
    this.force = new Vector(0, 0);
    
    // 마찰 적용
    this.applyFriction(deltaTime);
  }

  /**
   * 마찰 적용
   * @param {number} deltaTime 경과 시간
   */
  applyFriction(deltaTime) {
    if (this.isStatic) return;
    
    // 선형 마찰
    const frictionForce = this.velocity.copy().multiply(-this.friction * this.mass);
    this.velocity.add(Vector.multiply(frictionForce, deltaTime));
    
    // 각 마찰
    const frictionTorque = -this.angularVelocity * this.friction * this.inertia;
    this.angularVelocity += frictionTorque * this.invInertia * deltaTime;
    
    // 매우 작은 값이면 0으로 설정 (수치 안정성)
    if (Math.abs(this.velocity.magnitude()) < 0.01) {
      this.velocity = new Vector(0, 0);
    }
    if (Math.abs(this.angularVelocity) < 0.01) {
      this.angularVelocity = 0;
    }
  }

  /**
   * 속도 제한
   * @param {number} maxSpeed 최대 속도
   */
  limitVelocity(maxSpeed) {
    const speed = this.velocity.magnitude();
    if (speed > maxSpeed) {
      this.velocity.normalize().multiply(maxSpeed);
    }
  }

  /**
   * 각속도 제한
   * @param {number} maxAngularVelocity 최대 각속도
   */
  limitAngularVelocity(maxAngularVelocity) {
    if (Math.abs(this.angularVelocity) > maxAngularVelocity) {
      this.angularVelocity = Math.sign(this.angularVelocity) * maxAngularVelocity;
    }
  }

  /**
   * 로컬 좌표를 월드 좌표로 변환
   * @param {Vector} localPoint 로컬 좌표
   * @returns {Vector} 월드 좌표
   */
  localToWorld(localPoint) {
    const rotated = localPoint.copy().rotate(this.angle);
    return Vector.add(this.position, rotated);
  }

  /**
   * 월드 좌표를 로컬 좌표로 변환
   * @param {Vector} worldPoint 월드 좌표
   * @returns {Vector} 로컬 좌표
   */
  worldToLocal(worldPoint) {
    const translated = Vector.subtract(worldPoint, this.position);
    return translated.rotate(-this.angle);
  }

  /**
   * 무게 중심 위치 (월드 좌표)
   * @returns {Vector} 무게 중심
   */
  getCenterOfMass() {
    return this.localToWorld(this.center);
  }

  /**
   * AABB (Axis-Aligned Bounding Box) 경계 계산
   * @returns {Object} {min: Vector, max: Vector}
   */
  getAABB() {
    // 회전을 고려한 AABB 계산 (간단한 버전)
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    
    // 회전된 모서리들
    const corners = [
      new Vector(-halfWidth, -halfHeight),
      new Vector(halfWidth, -halfHeight),
      new Vector(halfWidth, halfHeight),
      new Vector(-halfWidth, halfHeight)
    ];
    
    // 회전 적용
    const rotatedCorners = corners.map(corner => {
      return corner.copy().rotate(this.angle);
    });
    
    // 월드 좌표로 변환
    const worldCorners = rotatedCorners.map(corner => {
      return Vector.add(this.position, corner);
    });
    
    // 최소/최대값 찾기
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    worldCorners.forEach(corner => {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    });
    
    return {
      min: new Vector(minX, minY),
      max: new Vector(maxX, maxY)
    };
  }

  /**
   * 객체 복사
   * @returns {Body} 새로운 Body 인스턴스
   */
  copy() {
    return new Body({
      position: this.position.copy(),
      velocity: this.velocity.copy(),
      acceleration: this.acceleration.copy(),
      mass: this.mass,
      angle: this.angle,
      angularVelocity: this.angularVelocity,
      angularAcceleration: this.angularAcceleration,
      width: this.width,
      height: this.height,
      center: this.center.copy(),
      friction: this.friction,
      restitution: this.restitution,
      isStatic: this.isStatic
    });
  }

  /**
   * 객체 정보를 문자열로 반환
   * @returns {string} 객체 정보
   */
  toString() {
    return `Body(pos: ${this.position.toString()}, vel: ${this.velocity.toString()}, mass: ${this.mass})`;
  }
}

