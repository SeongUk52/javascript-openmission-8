import { GameController } from '../src/controller/GameController.js';
import { CanvasRenderer } from '../src/view/CanvasRenderer.js';
import { UI } from '../src/view/UI.js';

/**
 * 게임 초기화 및 실행
 */
class GameApp {
  constructor() {
    // Canvas 요소 가져오기
    this.gameCanvas = document.getElementById('game-canvas');
    this.uiCanvas = document.getElementById('ui-canvas');

    // Canvas 크기 설정
    const width = 800;
    const height = 600;
    
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;
    this.uiCanvas.width = width;
    this.uiCanvas.height = height;

    // 렌더러 생성
    this.gameRenderer = new CanvasRenderer(this.gameCanvas, {
      showDebugInfo: false,
      showAABB: false,
      showCenterOfMass: false,
      showGrid: false,
      backgroundColor: '#1a1a2e',
    });

    this.uiRenderer = new UI(this.uiCanvas, {
      fontFamily: 'Arial, sans-serif',
      textColor: '#ffffff',
      accentColor: '#3498db',
    });

    // 게임 컨트롤러 생성
    this.controller = new GameController({
      canvasWidth: width,
      canvasHeight: height,
      blockWidth: 50,
      blockHeight: 20,
    });

    // 이벤트 콜백 설정
    this._setupEventCallbacks();

    // 입력 이벤트 설정
    this._setupInputEvents();

    // 렌더링 루프 시작
    this._startRenderLoop();
  }

  /**
   * 이벤트 콜백 설정
   * @private
   */
  _setupEventCallbacks() {
    this.controller.onBlockPlaced = (tower) => {
      // 블록 배치 시 추가 처리 (필요시)
    };

    this.controller.onGameOver = (gameState) => {
      console.log('Game Over!', {
        score: gameState.score,
        round: gameState.round,
        highScore: gameState.highScore,
      });
    };

    this.controller.onScoreChanged = (score) => {
      // 점수 변경 시 추가 처리 (필요시)
    };
  }

  /**
   * 입력 이벤트 설정
   * @private
   */
  _setupInputEvents() {
    // 키보드 입력
    document.addEventListener('keydown', (e) => {
      this.controller.handleKeyDown(e.key);
    });

    // 마우스 입력
    this.gameCanvas.addEventListener('click', (e) => {
      const rect = this.gameCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.controller.handleClick(x, y);
    });

    // 터치 입력
    this.gameCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.gameCanvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.controller.handleClick(x, y);
    });

    // 좌우 이동을 위한 터치 드래그
    let touchStartX = 0;
    this.gameCanvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.gameCanvas.getBoundingClientRect();
      const currentX = touch.clientX - rect.left;
      
      if (touchStartX === 0) {
        touchStartX = currentX;
      } else {
        const deltaX = currentX - touchStartX;
        if (Math.abs(deltaX) > 10) {
          this.controller.moveNextBlock(deltaX > 0 ? 1 : -1);
          touchStartX = currentX;
        }
      }
    });

    this.gameCanvas.addEventListener('touchend', () => {
      touchStartX = 0;
    });
  }

  /**
   * 렌더링 루프 시작
   * @private
   */
  _startRenderLoop() {
    const render = () => {
      // 게임 상태 가져오기
      const gameState = this.controller.getGameState();

      // 게임 렌더링
      this.gameRenderer.render(gameState);

      // UI 렌더링
      this.uiRenderer.render(gameState.gameState);

      // 다음 프레임 요청
      requestAnimationFrame(render);
    };

    render();
  }
}

// 게임 시작
window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  console.log('Stack Tower Game initialized!');
});

