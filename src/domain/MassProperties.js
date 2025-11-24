/**
 * 질량 속성 Value Object
 * 질량, 역질량, 관성 모멘트, 역관성 모멘트를 관리한다.
 */
export class MassProperties {
  constructor(mass = 1, invMass = 0, inertia = 0, invInertia = 0) {
    this.mass = mass;
    this.invMass = invMass;
    this.inertia = inertia;
    this.invInertia = invInertia;
  }

  copy() {
    return new MassProperties(
      this.mass,
      this.invMass,
      this.inertia,
      this.invInertia
    );
  }
}

