import { Body } from './Body.js';
import { Vector } from './Vector.js';

/**
 * 게임 블록 도메인 모델
 * Body를 확장하여 게임 특화 속성을 추가한다.
 */
export class Block extends Body {
  /**
   * @param {Object} options
   * @param {Vector} options.position - 블록 위치
   * @param {number} options.width - 블록 너비
   * @param {number} options.height - 블록 높이
   * @param {number} options.mass - 블록 질량
   * @param {string} options.color - 블록 색상 (CSS 색상 문자열)
   * @param {string} options.type - 블록 타입 (예: 'normal', 'heavy', 'light')
   * @param {number} options.id - 블록 고유 ID
   */
  constructor(options = {}) {
    const {
      position = new Vector(0, 0),
      width = 50,
      height = 20,
      mass = 1,
      color = '#3498db',
      type = 'normal',
      id = null,
    } = options;

    super({
      position,
      width,
      height,
      mass,
    });

    // 게임 특화 속성
    this.color = color;
    this.type = type;
    this.id = id || this._generateId();
    
    // 블록이 타워에 고정되었는지 여부
    this.isPlaced = false;
    
    // 블록이 떨어지는 중인지 여부
    this.isFalling = true;
    
    // 블록이 생성된 시간
    this.createdAt = Date.now();
  }

  /**
   * 블록 고유 ID 생성
   * @returns {string}
   * @private
   */
  _generateId() {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 블록을 타워에 배치
   */
  place() {
    this.isPlaced = true;
    this.isFalling = false;
    // 배치된 블록은 정적 객체로 만들 수 있지만, 물리 시뮬레이션을 위해 동적 유지
  }

  /**
   * 블록이 무너졌는지 확인
   * @returns {boolean}
   */
  isToppled() {
    // 각도가 너무 크면 무너진 것으로 간주 (예: 45도 이상)
    const maxAngle = Math.PI / 4; // 45도
    return Math.abs(this.angle) > maxAngle;
  }

  /**
   * 블록이 화면 밖으로 나갔는지 확인
   * @param {number} screenWidth - 화면 너비
   * @param {number} screenHeight - 화면 높이
   * @returns {boolean}
   */
  isOutOfBounds(screenWidth, screenHeight) {
    const aabb = this.getAABB();
    return (
      aabb.max.x < 0 ||
      aabb.min.x > screenWidth ||
      aabb.max.y < 0 ||
      aabb.min.y > screenHeight
    );
  }

  /**
   * 블록 복사
   * @returns {Block}
   */
  clone() {
    return new Block({
      position: new Vector(this.position.x, this.position.y),
      width: this.width,
      height: this.height,
      mass: this.mass,
      color: this.color,
      type: this.type,
      id: this.id,
    });
  }
}

