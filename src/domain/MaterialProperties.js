/**
 * 재질 속성 Value Object
 * 마찰 계수와 반발 계수를 관리한다.
 */
export class MaterialProperties {
  constructor(friction = 0.1, restitution = 0.5) {
    this.friction = friction;
    this.restitution = restitution;
  }

  copy() {
    return new MaterialProperties(
      this.friction,
      this.restitution
    );
  }
}

