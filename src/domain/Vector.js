/**
 * 2D 벡터 클래스
 * 물리엔진의 기본이 되는 벡터 연산을 제공한다.
 */
export class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * 벡터 복사
   * @returns {Vector} 새로운 벡터 인스턴스
   */
  copy() {
    return new Vector(this.x, this.y);
  }

  /**
   * 벡터 덧셈
   * @param {Vector} other 다른 벡터
   * @returns {Vector} 현재 벡터 (체이닝 가능)
   */
  add(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  /**
   * 벡터 뺄셈
   * @param {Vector} other 다른 벡터
   * @returns {Vector} 현재 벡터 (체이닝 가능)
   */
  subtract(other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  /**
   * 스칼라 곱셈
   * @param {number} scalar 스칼라 값
   * @returns {Vector} 현재 벡터 (체이닝 가능)
   */
  multiply(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  /**
   * 벡터의 크기 (magnitude)
   * @returns {number} 벡터의 길이
   */
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * 벡터의 크기 제곱 (성능 최적화용)
   * @returns {number} 벡터의 길이 제곱
   */
  magnitudeSquared() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * 벡터 정규화 (단위 벡터로 변환)
   * @returns {Vector} 현재 벡터 (체이닝 가능)
   */
  normalize() {
    const mag = this.magnitude();
    if (mag > 0) {
      this.x /= mag;
      this.y /= mag;
    }
    return this;
  }

  /**
   * 벡터 내적 (dot product)
   * @param {Vector} other 다른 벡터
   * @returns {number} 내적 결과
   */
  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * 벡터 외적 (cross product) - 2D에서는 스칼라 반환
   * @param {Vector} other 다른 벡터
   * @returns {number} 외적 결과 (z 성분)
   */
  cross(other) {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * 두 벡터 사이의 거리
   * @param {Vector} other 다른 벡터
   * @returns {number} 거리
   */
  distance(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 두 벡터 사이의 거리 제곱 (성능 최적화용)
   * @param {Vector} other 다른 벡터
   * @returns {number} 거리 제곱
   */
  distanceSquared(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * 벡터를 특정 각도로 회전
   * @param {number} angle 회전 각도 (라디안)
   * @returns {Vector} 현재 벡터 (체이닝 가능)
   */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const newX = this.x * cos - this.y * sin;
    const newY = this.x * sin + this.y * cos;
    this.x = newX;
    this.y = newY;
    return this;
  }

  /**
   * 벡터를 문자열로 변환
   * @returns {string} 벡터 표현
   */
  toString() {
    return `Vector(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  /**
   * 정적 메서드: 두 벡터의 합
   * @param {Vector} a 첫 번째 벡터
   * @param {Vector} b 두 번째 벡터
   * @returns {Vector} 새로운 벡터
   */
  static add(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
  }

  /**
   * 정적 메서드: 두 벡터의 차
   * @param {Vector} a 첫 번째 벡터
   * @param {Vector} b 두 번째 벡터
   * @returns {Vector} 새로운 벡터
   */
  static subtract(a, b) {
    return new Vector(a.x - b.x, a.y - b.y);
  }

  /**
   * 정적 메서드: 벡터와 스칼라의 곱
   * @param {Vector} v 벡터
   * @param {number} scalar 스칼라
   * @returns {Vector} 새로운 벡터
   */
  static multiply(v, scalar) {
    return new Vector(v.x * scalar, v.y * scalar);
  }
}

