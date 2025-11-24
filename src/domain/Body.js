import { Vector } from './Vector.js';
import { TorqueUtil } from '../util/TorqueUtil.js';
import { MotionState } from './MotionState.js';
import { AngularState } from './AngularState.js';
import { MassProperties } from './MassProperties.js';
import { Size } from './Size.js';
import { MaterialProperties } from './MaterialProperties.js';
import { ForceState } from './ForceState.js';
import { PhysicsState } from './PhysicsState.js';
import { BodyProperties } from './BodyProperties.js';

/**
 * 물리 객체 클래스
 * 위치, 속도, 질량 등의 물리 속성을 관리한다.
 * 인스턴스 변수는 3개 이하로 제한: physicsState, bodyProperties
 */
export class Body {
  constructor(options = {}) {
    // 크기 (너비, 높이, 중심점)
    const size = new Size(
      options.width || 0,
      options.height || 0,
      options.center || null
    );
    
    // 질량 (기본값: 1)
    const mass = options.mass !== undefined ? options.mass : 1;
    
    // 정적 객체 여부 (무한대 질량)
    const isStatic = options.isStatic || false;
    
    // 관성 모멘트 계산
    let inertia;
    if (options.inertia !== undefined) {
      inertia = options.inertia;
    }
    if (options.inertia === undefined) {
      inertia = this._calculateInertiaStatic(mass, size.width, size.height, isStatic);
    }
    
    // 질량 속성 (질량, 역질량, 관성 모멘트, 역관성 모멘트)
    let massProperties;
    if (isStatic) {
      massProperties = new MassProperties(Infinity, 0, Infinity, 0);
    }
    if (!isStatic) {
      const invMass = mass > 0 ? 1 / mass : 0;
      const invInertia = inertia > 0 && !isNaN(inertia) && inertia !== Infinity ? 1 / inertia : 0;
      massProperties = new MassProperties(mass, invMass, inertia, invInertia);
    }
    
    // 운동 상태 (위치, 속도, 가속도)
    const motionState = new MotionState(
      options.position || new Vector(0, 0),
      options.velocity || new Vector(0, 0),
      options.acceleration || new Vector(0, 0)
    );
    
    // 각운동 상태 (각도, 각속도, 각가속도)
    const angularState = new AngularState(
      options.angle || 0,
      options.angularVelocity || 0,
      options.angularAcceleration || 0
    );
    
    // 물리 상태 (운동 상태 + 각운동 상태 + 질량 속성)
    this.physicsState = new PhysicsState(motionState, angularState, massProperties);
    
    // 힘 상태 (힘, 토크)
    const forceState = new ForceState(
      new Vector(0, 0),
      0
    );
    
    // 재질 속성 (마찰, 반발)
    const materialProperties = new MaterialProperties(
      options.friction !== undefined ? options.friction : 0.1,
      options.restitution !== undefined ? options.restitution : 0.5
    );
    
    // Body 속성 (재질 속성 + 크기 + 힘 상태 + 정적 객체 여부)
    this.bodyProperties = new BodyProperties(materialProperties, size, forceState, isStatic);
    
    // 성능 최적화: 자주 접근하는 속성을 직접 참조로 설정 (Object.defineProperty 오버헤드 제거)
    this.position = this.physicsState.motionState.position;
    this.velocity = this.physicsState.motionState.velocity;
    this.acceleration = this.physicsState.motionState.acceleration;
    this.angle = this.physicsState.angularState.angle;
    this.angularVelocity = this.physicsState.angularState.angularVelocity;
    this.angularAcceleration = this.physicsState.angularState.angularAcceleration;
    this.mass = this.physicsState.massProperties.mass;
    this.invMass = this.physicsState.massProperties.invMass;
    this.inertia = this.physicsState.massProperties.inertia;
    this.invInertia = this.physicsState.massProperties.invInertia;
    this.width = this.bodyProperties.size.width;
    this.height = this.bodyProperties.size.height;
    this.center = this.bodyProperties.size.center;
    this.force = this.bodyProperties.forceState.force;
    this.torque = this.bodyProperties.forceState.torque;
    this.friction = this.bodyProperties.materialProperties.friction;
    this.restitution = this.bodyProperties.materialProperties.restitution;
    
    // isStatic 속성 직접 설정 (Object.defineProperty가 제대로 작동하지 않을 수 있으므로)
    // 생성자에서 직접 속성으로 설정하고, 이후 변경 시 bodyProperties와 동기화
    Object.defineProperty(this, 'isStatic', {
      value: this.bodyProperties.isStatic,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  
  /**
   * 정적 메서드로 관성 모멘트 계산 (생성자에서 사용)
   * @private
   */
  _calculateInertiaStatic(mass, width, height, isStatic) {
    if (mass === 0 || isStatic || mass === Infinity) {
      return Infinity;
    }
    if (width === 0 || height === 0) {
      return mass * 0.1;
    }
    return (1 / 12) * mass * (width * width + height * height);
  }
  
  /**
   * 속성 동기화 (업데이트 후 호출하여 직접 참조와 Value Object 동기화)
   * @private
   */
  _syncProperties() {
    // Value Object에서 직접 참조로 동기화
    this.position = this.physicsState.motionState.position;
    this.velocity = this.physicsState.motionState.velocity;
    this.acceleration = this.physicsState.motionState.acceleration;
    this.angle = this.physicsState.angularState.angle;
    this.angularVelocity = this.physicsState.angularState.angularVelocity;
    this.angularAcceleration = this.physicsState.angularState.angularAcceleration;
    this.mass = this.physicsState.massProperties.mass;
    this.invMass = this.physicsState.massProperties.invMass;
    this.inertia = this.physicsState.massProperties.inertia;
    this.invInertia = this.physicsState.massProperties.invInertia;
    this.width = this.bodyProperties.size.width;
    this.height = this.bodyProperties.size.height;
    this.center = this.bodyProperties.size.center;
    this.force = this.bodyProperties.forceState.force;
    this.torque = this.bodyProperties.forceState.torque;
    this.friction = this.bodyProperties.materialProperties.friction;
    this.restitution = this.bodyProperties.materialProperties.restitution;
  }
  
  /**
   * 기존 코드 호환성을 위한 속성 접근자 설정 (사용 안 함 - 성능 최적화로 제거)
   * @private
   * @deprecated 성능 최적화를 위해 직접 참조 사용
   */
  _setupPropertyAccessors() {
    // MotionState 속성들
    Object.defineProperty(this, 'position', {
      get: () => this.physicsState.motionState.position,
      set: (value) => { this.physicsState.motionState.position = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'velocity', {
      get: () => this.physicsState.motionState.velocity,
      set: (value) => { this.physicsState.motionState.velocity = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'acceleration', {
      get: () => this.physicsState.motionState.acceleration,
      set: (value) => { this.physicsState.motionState.acceleration = value; },
      enumerable: true,
      configurable: true
    });
    
    // AngularState 속성들
    Object.defineProperty(this, 'angle', {
      get: () => this.physicsState.angularState.angle,
      set: (value) => { this.physicsState.angularState.angle = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'angularVelocity', {
      get: () => this.physicsState.angularState.angularVelocity,
      set: (value) => { this.physicsState.angularState.angularVelocity = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'angularAcceleration', {
      get: () => this.physicsState.angularState.angularAcceleration,
      set: (value) => { this.physicsState.angularState.angularAcceleration = value; },
      enumerable: true,
      configurable: true
    });
    
    // MassProperties 속성들
    Object.defineProperty(this, 'mass', {
      get: () => this.physicsState.massProperties.mass,
      set: (value) => { 
        this.physicsState.massProperties.mass = value;
        this.physicsState.massProperties.invMass = value > 0 ? 1 / value : 0;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'invMass', {
      get: () => this.physicsState.massProperties.invMass,
      set: (value) => { this.physicsState.massProperties.invMass = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'inertia', {
      get: () => this.physicsState.massProperties.inertia,
      set: (value) => { 
        this.physicsState.massProperties.inertia = value;
        this.physicsState.massProperties.invInertia = value > 0 && !isNaN(value) && value !== Infinity ? 1 / value : 0;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'invInertia', {
      get: () => this.physicsState.massProperties.invInertia,
      set: (value) => { this.physicsState.massProperties.invInertia = value; },
      enumerable: true,
      configurable: true
    });
    
    // Size 속성들
    Object.defineProperty(this, 'width', {
      get: () => this.bodyProperties.size.width,
      set: (value) => { this.bodyProperties.size.width = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'height', {
      get: () => this.bodyProperties.size.height,
      set: (value) => { this.bodyProperties.size.height = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'center', {
      get: () => this.bodyProperties.size.center,
      set: (value) => { this.bodyProperties.size.center = value; },
      enumerable: true,
      configurable: true
    });
    
    // ForceState 속성들
    Object.defineProperty(this, 'force', {
      get: () => this.bodyProperties.forceState.force,
      set: (value) => { this.bodyProperties.forceState.force = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'torque', {
      get: () => this.bodyProperties.forceState.torque,
      set: (value) => { this.bodyProperties.forceState.torque = value; },
      enumerable: true,
      configurable: true
    });
    
    // MaterialProperties 속성들
    Object.defineProperty(this, 'friction', {
      get: () => this.bodyProperties.materialProperties.friction,
      set: (value) => { this.bodyProperties.materialProperties.friction = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'restitution', {
      get: () => this.bodyProperties.materialProperties.restitution,
      set: (value) => { this.bodyProperties.materialProperties.restitution = value; },
      enumerable: true,
      configurable: true
    });
    
    // isStatic 속성은 생성자에서 직접 설정 (Object.defineProperty 대신)
    // 이미 위에서 this.isStatic = this.bodyProperties.isStatic으로 설정했으므로
    // 여기서는 setter만 추가하여 동기화 유지
    Object.defineProperty(this, 'isStatic', {
      get: () => this.bodyProperties.isStatic,
      set: (value) => { 
        this.bodyProperties.isStatic = value;
        // 직접 속성도 동기화
        Object.defineProperty(this, 'isStatic', {
          value: value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      },
      enumerable: true,
      configurable: true
    });
  }
  
  /**
   * 관성 모멘트 계산 (직사각형 기준)
   * I = (1/12) * m * (w² + h²)
   * @returns {number} 관성 모멘트
   */
  calculateInertia() {
    return this._calculateInertiaStatic(this.mass, this.width, this.height, this.isStatic);
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
      // 직접 참조 유지하면서 초기화
      this.force.x = 0;
      this.force.y = 0;
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
    
    // 힘 초기화 (다음 프레임을 위해) - 직접 참조 유지
    this.force.x = 0;
    this.force.y = 0;
    
    // 마찰 적용
    this.applyFriction(deltaTime);
  }

  /**
   * 마찰 적용
   * @param {number} deltaTime 경과 시간
   */
  applyFriction(deltaTime) {
    if (this.isStatic) return;
    if (this.friction === 0) return;
    
    // 선형 마찰 (공기 저항 효과 - 약함)
    const airResistance = 0.02; // 공기 저항 계수
    const frictionForce = this.velocity.copy().multiply(-airResistance * this.mass);
    this.velocity.add(Vector.multiply(frictionForce, deltaTime));
    
    // 각 마찰 (공기 저항 효과 - 약함)
    // 실제 마찰은 충돌 시에만 적용됨
    const airResistanceAngular = 0.05; // 각속도 공기 저항
    const frictionTorque = -this.angularVelocity * airResistanceAngular * this.inertia;
    this.angularVelocity += frictionTorque * this.invInertia * deltaTime;
    
    // 매우 작은 값이면 0으로 설정 (수치 안정성)
    if (Math.abs(this.velocity.magnitude()) < 0.5) {
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
    // Value Object에서 직접 가져와서 동기화 보장
    const center = this.bodyProperties.size.center;
    return this.localToWorld(center);
  }

  /**
   * AABB (Axis-Aligned Bounding Box) 경계 계산
   * @returns {Object} {min: Vector, max: Vector}
   */
  getAABB() {
    // Value Object에서 직접 가져와서 동기화 보장
    const width = this.bodyProperties.size.width;
    const height = this.bodyProperties.size.height;
    const position = this.physicsState.motionState.position;
    const angle = this.physicsState.angularState.angle;
    
    // NaN 체크
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      return {
        min: new Vector(position.x - 1, position.y - 1),
        max: new Vector(position.x + 1, position.y + 1)
      };
    }
    
    // 회전을 고려한 AABB 계산 (간단한 버전)
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // 회전된 모서리들
    const corners = [
      new Vector(-halfWidth, -halfHeight),
      new Vector(halfWidth, -halfHeight),
      new Vector(halfWidth, halfHeight),
      new Vector(-halfWidth, halfHeight)
    ];
    
    // 회전 적용
    const rotatedCorners = corners.map(corner => {
      return corner.copy().rotate(angle);
    });
    
    // 월드 좌표로 변환
    const worldCorners = rotatedCorners.map(corner => {
      return Vector.add(position, corner);
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

