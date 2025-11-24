/**
 * 게임 콜백 Value Object
 * 이벤트 콜백 함수들을 관리한다.
 */
export class GameCallbacks {
  constructor(onBlockPlaced, onGameOver, onScoreChanged) {
    this.onBlockPlaced = onBlockPlaced;
    this.onGameOver = onGameOver;
    this.onScoreChanged = onScoreChanged;
  }

  copy() {
    return new GameCallbacks(
      this.onBlockPlaced,
      this.onGameOver,
      this.onScoreChanged
    );
  }
}

