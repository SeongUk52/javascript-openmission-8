/**
 * 점수 Value Object
 * 점수 값을 포장하여 의미를 명확히 한다.
 */
export class Score {
  constructor(value = 0) {
    if (value < 0) {
      throw new Error('Score cannot be negative');
    }
    if (!Number.isInteger(value)) {
      throw new Error('Score must be an integer');
    }
    this.value = value;
  }

  /**
   * 점수 값 반환
   * @returns {number}
   */
  getValue() {
    return this.value;
  }

  /**
   * 점수 비교
   * @param {Score} other
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
   * 점수가 다른 점수보다 큰지 확인
   * @param {Score} other
   * @returns {boolean}
   */
  isGreaterThan(other) {
    return this.value > other.value;
  }

  /**
   * 점수 복사
   * @returns {Score}
   */
  copy() {
    return new Score(this.value);
  }

  /**
   * 문자열로 변환
   * @returns {string}
   */
  toString() {
    return this.value.toString();
  }
}

