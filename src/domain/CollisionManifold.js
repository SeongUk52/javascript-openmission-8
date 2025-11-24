import { Vector } from './Vector.js';

/**
 * 충돌 매니폴드 Value Object
 * 충돌 정보를 관리한다.
 */
export class CollisionManifold {
  constructor(collided, normal = null, penetration = 0) {
    this.collided = collided;
    this.normal = normal;
    this.penetration = penetration;
  }

  copy() {
    return new CollisionManifold(
      this.collided,
      this.normal ? this.normal.copy() : null,
      this.penetration
    );
  }
}

