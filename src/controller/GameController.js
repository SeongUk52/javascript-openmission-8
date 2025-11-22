import { PhysicsService } from '../service/PhysicsService.js';
import { ScoreService } from '../service/ScoreService.js';
import { Block } from '../domain/Block.js';
import { Tower } from '../domain/Tower.js';
import { GameState } from '../domain/GameState.js';
import { Vector } from '../domain/Vector.js';
import { BalanceUtil } from '../util/BalanceUtil.js';

/**
 * 게임 컨트롤러
 * 게임 로직을 조율하고 입력을 처리한다.
 */
export class GameController {
  /**
   * @param {Object} options
   * @param {number} options.canvasWidth - Canvas 너비
   * @param {number} options.canvasHeight - Canvas 높이
   * @param {number} options.blockWidth - 블록 너비
   * @param {number} options.blockHeight - 블록 높이
   */
  constructor(options = {}) {
    const {
      canvasWidth = 800,
      canvasHeight = 600,
      blockWidth = 50,
      blockHeight = 20,
    } = options;

    // Canvas 크기
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // 블록 크기
    this.blockWidth = blockWidth;
    this.blockHeight = blockHeight;

    // 물리 서비스
    this.physicsService = new PhysicsService({
      timeStep: 1 / 60, // 60fps
    });
    // 게임에 맞게 중력 증가
    this.physicsService.setGravity(500);

    // 게임 상태
    this.gameState = new GameState();

    // 타워
    const baseX = canvasWidth / 2;
    const baseY = canvasHeight - 50;
    this.tower = new Tower({
      basePosition: new Vector(baseX, baseY),
      baseWidth: 200,
    });

    // 현재 떨어지는 블록
    this.currentBlock = null;

    // 다음 블록 위치 (좌우 이동 가능)
    this.nextBlockX = baseX;

    // 게임 루프 관련
    this.animationFrameId = null;
    this.lastTime = 0;

    // 연속 배치 횟수
    this.consecutivePlacements = 0;

    // 이벤트 콜백
    this.onBlockPlaced = null;
    this.onGameOver = null;
    this.onScoreChanged = null;

    // 물리 서비스 이벤트 설정
    this._setupPhysicsEvents();
  }

  /**
   * 물리 서비스 이벤트 설정
   * @private
   */
  _setupPhysicsEvents() {
    this.physicsService.onTopple = (body) => {
      if (body instanceof Block && body.isPlaced) {
        // 배치된 블록이 무너지면 게임 오버
        this._handleGameOver();
      }
    };
  }

  /**
   * 게임 시작
   */
  start() {
    this.gameState.start();
    this.tower.clear();
    this.consecutivePlacements = 0;
    this.nextBlockX = this.canvasWidth / 2;
    this._spawnNextBlock();
    this._startGameLoop();
  }

  /**
   * 게임 종료
   */
  stop() {
    this._stopGameLoop();
    if (this.currentBlock) {
      this.physicsService.removeBody(this.currentBlock);
      this.currentBlock = null;
    }
  }

  /**
   * 게임 일시정지
   */
  pause() {
    this.gameState.pause();
    this._stopGameLoop();
  }

  /**
   * 게임 재개
   */
  resume() {
    this.gameState.resume();
    this._startGameLoop();
  }

  /**
   * 다음 블록 생성
   * @private
   */
  _spawnNextBlock() {
    if (this.currentBlock) return;

    const spawnY = 50; // 화면 상단
    const block = new Block({
      position: new Vector(this.nextBlockX, spawnY),
      width: this.blockWidth,
      height: this.blockHeight,
      mass: 1,
      color: this._getRandomColor(),
      type: 'normal',
    });

    this.currentBlock = block;
    this.physicsService.addBody(block);
  }

  /**
   * 랜덤 색상 생성
   * @returns {string}
   * @private
   */
  _getRandomColor() {
    const colors = [
      '#3498db', // 파랑
      '#e74c3c', // 빨강
      '#2ecc71', // 초록
      '#f39c12', // 주황
      '#9b59b6', // 보라
      '#1abc9c', // 청록
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 블록 배치 (스페이스바 또는 클릭)
   */
  placeBlock() {
    if (!this.currentBlock || !this.gameState.isPlaying || this.gameState.isPaused) {
      return;
    }

    // 블록을 타워에 추가
    this.tower.addBlock(this.currentBlock);
    this.currentBlock = null;

    // 점수 계산 및 추가
    this._calculateAndAddScore();

    // 라운드 증가
    this.gameState.incrementRound();
    this.consecutivePlacements++;

    // 다음 블록 생성
    this._spawnNextBlock();

    // 이벤트 콜백
    if (this.onBlockPlaced) {
      this.onBlockPlaced(this.tower);
    }
  }

  /**
   * 점수 계산 및 추가
   * @private
   */
  _calculateAndAddScore() {
    const blockCount = this.tower.getBlockCount();
    const height = this.tower.getHeight();
    const stability = this.tower.evaluateStability();

    const score = ScoreService.calculateTotalScore({
      blockCount,
      height,
      isStable: stability.stable,
      consecutivePlacements: this.consecutivePlacements,
    });

    this.gameState.addScore(score);

    if (this.onScoreChanged) {
      this.onScoreChanged(this.gameState.score);
    }

    // 타워가 무너지면 연속 배치 리셋
    if (!stability.stable) {
      this.consecutivePlacements = 0;
    }
  }

  /**
   * 게임 오버 처리
   * @private
   */
  _handleGameOver() {
    if (this.gameState.isGameOver) return;

    this.gameState.end();
    this.stop();

    if (this.onGameOver) {
      this.onGameOver(this.gameState);
    }
  }

  /**
   * 다음 블록 위치 이동 (좌우)
   * @param {number} direction - -1: 왼쪽, 1: 오른쪽
   */
  moveNextBlock(direction) {
    if (!this.currentBlock || !this.gameState.isPlaying || this.gameState.isPaused) {
      return;
    }

    const moveSpeed = 5;
    this.nextBlockX += direction * moveSpeed;

    // 화면 경계 체크
    const halfWidth = this.blockWidth / 2;
    this.nextBlockX = Math.max(halfWidth, Math.min(this.canvasWidth - halfWidth, this.nextBlockX));

    // 현재 블록 위치 업데이트
    this.currentBlock.position.x = this.nextBlockX;
  }

  /**
   * 게임 루프 시작
   * @private
   */
  _startGameLoop() {
    if (this.animationFrameId) return;

    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const gameLoop = (currentTime) => {
      if (!this.gameState.isPlaying || this.gameState.isPaused) {
        this.animationFrameId = null;
        return;
      }

      const deltaTime = (currentTime - this.lastTime) / 1000; // 초 단위
      this.lastTime = currentTime;

      this.update(deltaTime);
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  /**
   * 게임 루프 중지
   * @private
   */
  _stopGameLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * 게임 업데이트
   * @param {number} deltaTime - 경과 시간 (초)
   */
  update(deltaTime) {
    // 물리 시뮬레이션 업데이트
    this.physicsService.update(deltaTime);

    // 현재 블록이 화면 밖으로 나갔는지 확인
    if (this.currentBlock && this.currentBlock.isOutOfBounds(this.canvasWidth, this.canvasHeight)) {
      this._handleGameOver();
      return;
    }

    // 타워 안정성 평가
    if (this.tower.getBlockCount() > 0) {
      const stability = this.tower.evaluateStability();
      if (!stability.stable && !this.gameState.isGameOver) {
        // 타워가 무너지면 게임 오버
        this._handleGameOver();
      }
    }

    // 현재 블록이 타워에 닿았는지 확인 (자동 배치)
    if (this.currentBlock && this._shouldAutoPlace()) {
      this.placeBlock();
    }
  }

  /**
   * 자동 배치 여부 확인
   * @returns {boolean}
   * @private
   */
  _shouldAutoPlace() {
    if (!this.currentBlock || this.tower.getBlockCount() === 0) {
      return false;
    }

    // 현재 블록이 타워의 최상단에 닿았는지 확인
    const blockAABB = this.currentBlock.getAABB();
    const towerTopY = this.tower.getTopY();

    // 블록이 타워 위에 있고, 속도가 거의 0이면 배치
    if (blockAABB.min.y <= towerTopY + 5 && this.currentBlock.velocity.y < 10) {
      return true;
    }

    return false;
  }

  /**
   * 키보드 입력 처리
   * @param {string} key - 키 코드
   */
  handleKeyDown(key) {
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.moveNextBlock(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.moveNextBlock(1);
        break;
      case ' ':
      case 'Space':
        this.placeBlock();
        break;
      case 'Escape':
        if (this.gameState.isPaused) {
          this.resume();
        } else if (this.gameState.isPlaying) {
          this.pause();
        }
        break;
    }
  }

  /**
   * 마우스/터치 입력 처리
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   */
  handleClick(x, y) {
    if (!this.gameState.isPlaying) {
      if (this.gameState.isGameOver) {
        this.start(); // 게임 오버 상태면 재시작
      }
      return;
    }

    if (this.gameState.isPaused) {
      this.resume();
      return;
    }

    // 클릭 시 블록 배치
    this.placeBlock();
  }

  /**
   * 현재 게임 상태 반환
   * @returns {Object}
   */
  getGameState() {
    return {
      gameState: this.gameState,
      tower: this.tower,
      currentBlock: this.currentBlock,
      physicsBodies: this.physicsService.bodies,
    };
  }
}

