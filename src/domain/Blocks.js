import { Block } from './Block.js';

/**
 * 블록 컬렉션 일급 컬렉션
 * 블록들의 컬렉션을 관리하고 관련 로직을 캡슐화한다.
 */
export class Blocks {
  constructor(blocks = []) {
    this.blocks = [...blocks];
  }

  /**
   * 블록 추가
   * @param {Block} block
   */
  add(block) {
    if (!block) {
      return;
    }

    if (this.contains(block)) {
      return;
    }

    this.blocks.push(block);
  }

  /**
   * 블록 제거
   * @param {Block} block
   */
  remove(block) {
    const index = this.blocks.indexOf(block);
    if (index > -1) {
      this.blocks.splice(index, 1);
    }
  }

  /**
   * 모든 블록 제거
   */
  clear() {
    this.blocks = [];
  }

  /**
   * 블록 포함 여부 확인
   * @param {Block} block
   * @returns {boolean}
   */
  contains(block) {
    return this.blocks.includes(block);
  }

  /**
   * 블록 개수
   * @returns {number}
   */
  count() {
    return this.blocks.length;
  }

  /**
   * 빈 컬렉션인지 확인
   * @returns {boolean}
   */
  isEmpty() {
    return this.blocks.length === 0;
  }

  /**
   * 모든 블록 반환
   * @returns {Block[]}
   */
  getAll() {
    return [...this.blocks];
  }

  /**
   * 블록 순회
   * @param {Function} callback
   */
  forEach(callback) {
    this.blocks.forEach(callback);
  }

  /**
   * 블록 필터링
   * @param {Function} predicate
   * @returns {Blocks}
   */
  filter(predicate) {
    return new Blocks(this.blocks.filter(predicate));
  }

  /**
   * 블록 매핑
   * @param {Function} mapper
   * @returns {Array}
   */
  map(mapper) {
    return this.blocks.map(mapper);
  }
}

