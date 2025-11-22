/**
 * 게임 상태 도메인 모델
 * 게임의 전반적인 상태를 관리한다.
 */
export class GameState {
  /**
   * @param {Object} options
   * @param {number} options.initialScore - 초기 점수
   * @param {number} options.initialRound - 초기 라운드
   */
  constructor(options = {}) {
    // 점수
    this.score = options.initialScore || 0;
    
    // 라운드 (블록을 몇 개 배치했는지)
    this.round = options.initialRound || 0;
    
    // 게임 상태
    this.isGameOver = false;
    this.isPaused = false;
    this.isPlaying = false;
    
    // 게임 시작 시간
    this.startTime = null;
    
    // 게임 종료 시간
    this.endTime = null;
    
    // 최고 점수 (로컬 스토리지에서 불러올 수 있음)
    this.highScore = this._loadHighScore();
  }

  /**
   * 게임 시작
   */
  start() {
    this.isPlaying = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.startTime = Date.now();
    this.endTime = null;
    this.score = 0;
    this.round = 0;
  }

  /**
   * 게임 종료
   */
  end() {
    this.isPlaying = false;
    this.isGameOver = true;
    this.endTime = Date.now();
    
    // 최고 점수 업데이트
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this._saveHighScore(this.highScore);
    }
  }

  /**
   * 게임 일시정지
   */
  pause() {
    if (this.isPlaying && !this.isGameOver) {
      this.isPaused = true;
    }
  }

  /**
   * 게임 재개
   */
  resume() {
    if (this.isPaused) {
      this.isPaused = false;
    }
  }

  /**
   * 점수 추가
   * @param {number} points - 추가할 점수
   */
  addScore(points) {
    if (this.isPlaying && !this.isGameOver) {
      this.score += points;
    }
  }

  /**
   * 라운드 증가
   */
  incrementRound() {
    if (this.isPlaying && !this.isGameOver) {
      this.round++;
    }
  }

  /**
   * 게임 시간 계산 (초)
   * @returns {number}
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    
    const end = this.endTime || Date.now();
    return Math.floor((end - this.startTime) / 1000);
  }

  /**
   * 최고 점수 로드 (로컬 스토리지)
   * @returns {number}
   * @private
   */
  _loadHighScore() {
    try {
      const stored = localStorage.getItem('towerGame_highScore');
      return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * 최고 점수 저장 (로컬 스토리지)
   * @param {number} score
   * @private
   */
  _saveHighScore(score) {
    try {
      localStorage.setItem('towerGame_highScore', score.toString());
    } catch (e) {
      // 로컬 스토리지 사용 불가 시 무시
    }
  }

  /**
   * 게임 상태 리셋
   */
  reset() {
    this.score = 0;
    this.round = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.isPlaying = false;
    this.startTime = null;
    this.endTime = null;
  }
}

