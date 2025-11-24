/**
 * UI 렌더러
 * 게임 UI 요소를 그린다.
 */
export class UI {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas 요소
   * @param {Object} options - UI 옵션
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // UI 스타일
    this.fontFamily = options.fontFamily || 'Arial, sans-serif';
    this.textColor = options.textColor || '#ffffff';
    this.accentColor = options.accentColor || '#3498db';
  }

  /**
   * 점수 표시
   * @param {number} score - 현재 점수
   * @param {number} highScore - 최고 점수
   * @param {Object} position - 위치 {x, y}
   */
  drawScore(score, highScore = 0, position = { x: 20, y: 30 }) {
    this.ctx.save();
    this.ctx.fillStyle = this.textColor;
    this.ctx.font = `bold 24px ${this.fontFamily}`;
    this.ctx.textAlign = 'left';

    // 현재 점수
    this.ctx.fillText(`점수: ${score.toLocaleString()}`, position.x, position.y);

    // 최고 점수
    if (highScore > 0) {
      this.ctx.font = `16px ${this.fontFamily}`;
      this.ctx.fillStyle = '#95a5a6';
      this.ctx.fillText(`최고: ${highScore.toLocaleString()}`, position.x, position.y + 30);
    }

    this.ctx.restore();
  }


  /**
   * 게임 오버 화면
   * @param {Object} gameState - 게임 상태
   */
  drawGameOver(gameState) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 반투명 배경
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 게임 오버 텍스트
    this.ctx.save();
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.font = `bold 48px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('게임 오버', centerX, centerY - 80);
    this.ctx.restore();

    // 최종 점수
    this.ctx.save();
    this.ctx.fillStyle = this.textColor;
    this.ctx.font = `24px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`최종 점수: ${gameState.score.toLocaleString()}`, centerX, centerY - 20);
    this.ctx.restore();

    // 재시작 안내
    this.ctx.save();
    this.ctx.fillStyle = this.accentColor;
    this.ctx.font = `16px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('클릭하거나 스페이스바를 눌러 재시작', centerX, centerY + 40);
    this.ctx.restore();
  }

  /**
   * 일시정지 화면
   */
  drawPause() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 반투명 배경
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 일시정지 텍스트
    this.ctx.save();
    this.ctx.fillStyle = this.accentColor;
    this.ctx.font = `bold 36px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('일시정지', centerX, centerY);
    this.ctx.restore();

    // 재개 안내
    this.ctx.save();
    this.ctx.fillStyle = this.textColor;
    this.ctx.font = `16px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ESC를 눌러 재개', centerX, centerY + 40);
    this.ctx.restore();
  }

  /**
   * 시작 화면
   */
  drawStartScreen() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 배경
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // 게임 타이틀
    this.ctx.save();
    this.ctx.fillStyle = this.accentColor;
    this.ctx.font = `bold 48px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('스택 타워', centerX, centerY - 100);
    this.ctx.restore();

    // 게임 설명
    this.ctx.save();
    this.ctx.fillStyle = this.textColor;
    this.ctx.font = `18px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    
    const instructions = [
      '블록을 배치하여 타워를 쌓으세요',
      '스페이스바 또는 클릭으로 블록 배치',
      '가장 높은 타워를 쌓아보세요!',
    ];
    
    instructions.forEach((text, i) => {
      this.ctx.fillText(text, centerX, centerY - 20 + i * 30);
    });
    
    this.ctx.restore();

    // 시작 안내
    this.ctx.save();
    this.ctx.fillStyle = this.accentColor;
    this.ctx.font = `20px ${this.fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('클릭하거나 스페이스바를 눌러 시작', centerX, centerY + 100);
    this.ctx.restore();
  }

  /**
   * 조작 안내
   * @param {Object} position - 위치 {x, y}
   */
  drawControls(position = { x: 20, y: this.canvas.height - 100 }) {
    this.ctx.save();
    this.ctx.fillStyle = '#95a5a6';
    this.ctx.font = `12px ${this.fontFamily}`;
    this.ctx.textAlign = 'left';
    
    const controls = [
      '스페이스바 / 클릭 : 배치',
      'ESC : 일시정지',
    ];
    
    controls.forEach((text, i) => {
      this.ctx.fillText(text, position.x, position.y + i * 16);
    });
    
    this.ctx.restore();
  }

  /**
   * UI 캔버스 클리어
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 전체 UI 렌더링
   * @param {Object} gameState - 게임 상태
   */
  render(gameState) {
    if (!gameState) {
      console.warn('[UI] render: no gameState');
      return;
    }
    
    // UI 캔버스 클리어
    this.clear();
    
    // 시작 화면 (가장 먼저 체크)
    if (!gameState.isPlaying && !gameState.isGameOver) {
      this.drawStartScreen();
      return; // 시작 화면일 때는 다른 UI를 그리지 않음
    }

    // 점수 표시 (게임 중이거나 게임 오버일 때)
    if (gameState.isPlaying || gameState.isGameOver) {
      this.drawScore(gameState.score || 0, gameState.highScore || 0);
    }

    // 조작 안내 (게임 중일 때만)
    if (gameState.isPlaying && !gameState.isPaused && !gameState.isGameOver) {
      this.drawControls();
    }

    // 게임 오버 화면
    if (gameState.isGameOver) {
      this.drawGameOver(gameState);
    }

    // 일시정지 화면
    if (gameState.isPaused) {
      this.drawPause();
    }
  }
}

