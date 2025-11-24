/**
 * 각운동 상태 Value Object
 * 각도, 각속도, 각가속도를 관리한다.
 */
export class AngularState {
  constructor(angle = 0, angularVelocity = 0, angularAcceleration = 0) {
    this.angle = angle;
    this.angularVelocity = angularVelocity;
    this.angularAcceleration = angularAcceleration;
  }

  copy() {
    return new AngularState(
      this.angle,
      this.angularVelocity,
      this.angularAcceleration
    );
  }
}

