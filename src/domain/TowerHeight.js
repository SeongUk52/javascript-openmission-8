/**
 * 타워 높이 Value Object
 * 타워 높이 값을 포장하여 의미를 명확히 한다.
 */
export class TowerHeight {
  constructor(value = 0) {
    if (value < 0) {
      throw new Error('TowerHeight cannot be negative');
    }
    if (!Number.isFinite(value)) {
      throw new Error('TowerHeight must be a finite number');
    }
    this.value = value;
  }

  /**
   * 높이 값 반환
   * @returns {number}
   */
  getValue() {
    return this.value;
  }

  /**
   * 높이 비교
   * @param {TowerHeight} other
   * @returns {number} -1: this < other, 0: this === other, 1: this > other
   */
  compareTo(other) {
    if (this.value < other.value) {
      return -1;
    }
    if (this.value > other.value) {
      return 1;
    }
    return 0;
  }

  /**
   * 높이가 다른 높이보다 큰지 확인
   * @param {TowerHeight} other
   * @returns {boolean}
   */
  isGreaterThan(other) {
    return this.value > other.value;
  }

  /**
   * 높이 복사
   * @returns {TowerHeight}
   */
  copy() {
    return new TowerHeight(this.value);
  }

  /**
   * 문자열로 변환
   * @returns {string}
   */
  toString() {
    return this.value.toString();
  }
}

