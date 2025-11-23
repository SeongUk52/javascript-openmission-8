import { Vector } from '../domain/Vector.js';

/**
 * 토크 및 회전 모션을 계산하는 유틸리티
 */
export class TorqueUtil {
  /**
   * 힘이 특정 지점에 가해졌을 때 토크 계산
   * τ = r × F (2D에서는 스칼라)
   * @param {Vector} radiusVector Body의 기준점에서 힘이 가해진 지점까지의 벡터
   * @param {Vector} force 적용된 힘 벡터
   * @returns {number} 토크 값
   */
  static computeTorque(radiusVector, force) {
    return radiusVector.cross(force);
  }

  /**
   * Body에 특정 지점에서 힘을 적용하고 토크를 누적한다
   * @param {Body} body
   * @param {Vector} force
   * @param {Vector} point 월드 좌표계의 힘 적용 지점
   */
  static applyForceAtPoint(body, force, point) {
    body.applyForce(force);
    if (body.isStatic) return;

    const radiusVector = Vector.subtract(point, body.position);
    const torque = TorqueUtil.computeTorque(radiusVector, force);
    TorqueUtil.applyTorque(body, torque);
  }

  /**
   * Body에 토크를 직접 누적한다
   * @param {Body} body
   * @param {number} torque
   */
  static applyTorque(body, torque) {
    if (body.isStatic) return;
    body.torque += torque;
  }

  /**
   * 각운동 업데이트 (각가속도, 각속도, 각도)
   * @param {Body} body
   * @param {number} deltaTime
   */
  static updateAngularMotion(body, deltaTime) {
    if (body.isStatic || body.invInertia === 0 || !isFinite(body.invInertia)) {
      body.angularAcceleration = 0;
      body.torque = 0;
      return;
    }

    body.angularAcceleration = body.torque * body.invInertia;
    body.angularVelocity += body.angularAcceleration * deltaTime;
    
    // 각속도 감쇠 (공기 저항 효과)
    // 더 강한 감쇠를 적용하여 자연스럽게 멈추도록
    if (Math.abs(body.angularVelocity) < 0.05) {
      // 매우 작은 각속도는 즉시 멈춤
      body.angularVelocity = 0;
    } else if (Math.abs(body.angularVelocity) < 0.5) {
      // 작은 각속도는 빠르게 감쇠
      body.angularVelocity *= 0.80; // 더 강한 감쇠
    } else {
      // 큰 각속도도 강하게 감쇠
      body.angularVelocity *= 0.88; // 더 강한 감쇠
    }
    
    // 각속도 최대값 제한 (너무 빠른 회전 방지)
    const maxAngularVelocity = 3.0; // 라디안/초 (감소)
    if (Math.abs(body.angularVelocity) > maxAngularVelocity) {
      body.angularVelocity = Math.sign(body.angularVelocity) * maxAngularVelocity;
    }
    
    body.angle += body.angularVelocity * deltaTime;

    // 다음 프레임을 위해 토크 초기화
    body.torque = 0;
  }

  /**
   * 각속도 제한
   * @param {Body} body
   * @param {number} maxAngularVelocity
   */
  static clampAngularVelocity(body, maxAngularVelocity) {
    if (Math.abs(body.angularVelocity) > maxAngularVelocity) {
      body.angularVelocity = Math.sign(body.angularVelocity) * maxAngularVelocity;
    }
  }
}
