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

    // Canvas 크기 설정 (전체화면)
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;
    this.uiCanvas.width = width;
    this.uiCanvas.height = height;
    
    // 창 크기 변경 시 Canvas 크기 조정
    window.addEventListener('resize', () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      this.gameCanvas.width = newWidth;
      this.gameCanvas.height = newHeight;
      this.uiCanvas.width = newWidth;
      this.uiCanvas.height = newHeight;
      // 컨트롤러 크기 업데이트
      this.controller.canvasWidth = newWidth;
      this.controller.canvasHeight = newHeight;
    });

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
      blockWidth: 100, // 블록 크기 증가
      blockHeight: 40, // 블록 높이 증가
    });

    // 이벤트 콜백 설정
    this._setupEventCallbacks();

    // 입력 이벤트 설정
    this._setupInputEvents();

    // 렌더링 루프 시작
    this._startRenderLoop();
    
    // 디버그: 게임 상태 확인
    console.log('Game initialized:', {
      isPlaying: this.controller.gameState.isPlaying,
      isGameOver: this.controller.gameState.isGameOver,
    });
  }

  /**
   * 이벤트 콜백 설정
   * @private
   */
  _setupEventCallbacks() {
    this.controller.onBlockPlaced = (placedBlocks) => {
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
    let frameCount = 0;
    const render = () => {
      // 게임 상태 가져오기
      const gameState = this.controller.getGameState();

      // 디버그: 처음 몇 프레임만 로그
      if (frameCount < 5 && gameState) {
        console.log('Render frame', frameCount, {
          hasBase: !!(gameState.basePosition && gameState.baseWidth),
          hasCurrentBlock: !!gameState.currentBlock,
          placedBlocks: gameState.placedBlocks?.length || 0,
          physicsBodies: gameState.physicsBodies?.length || 0,
          isPlaying: gameState.gameState?.isPlaying,
        });
      }
      frameCount++;

      // 게임 렌더링 (게임이 시작되었을 때만)
      if (gameState && gameState.gameState && gameState.gameState.isPlaying) {
        this.gameRenderer.render(gameState);
      } else {
        // 게임이 시작되지 않았을 때는 배경만 클리어
        this.gameRenderer.clear();
      }

      // UI 렌더링 (항상)
      if (gameState && gameState.gameState) {
        // UI에 전달할 게임 상태 (isPlaying, isGameOver, score, round, highScore 등)
        const uiState = {
          isPlaying: gameState.gameState.isPlaying,
          isGameOver: gameState.gameState.isGameOver,
          isPaused: gameState.gameState.isPaused,
          score: gameState.gameState.score,
          round: gameState.gameState.round,
          highScore: gameState.gameState.highScore || 0,
        };
        this.uiRenderer.render(uiState);
      }

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

