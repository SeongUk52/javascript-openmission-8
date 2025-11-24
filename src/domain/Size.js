import { Vector } from './Vector.js';

/**
 * 크기 Value Object
 * 너비, 높이, 중심점을 관리한다.
 */
export class Size {
  constructor(width = 0, height = 0, center = null) {
    this.width = width;
    this.height = height;
    this.center = center || new Vector(width / 2, height / 2);
  }

  copy() {
    return new Size(
      this.width,
      this.height,
      this.center.copy()
    );
  }
}

