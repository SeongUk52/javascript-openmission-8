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
    const baseY = canvasHeight; // 베이스는 바닥에 붙어있음 (베이스의 하단 Y 좌표)
    this.tower = new Tower({
      basePosition: new Vector(baseX, baseY),
      baseWidth: 400, // 베이스 너비 증가 (200 -> 400)
    });

    // 현재 배치 대기 중인 블록 (조작 가능)
    this.currentBlock = null;

    // 떨어지는 중인 블록들 (여러 개 가능)
    this.fallingBlocks = new Set();

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
    // 충돌 이벤트: 블록이 베이스나 타워에 닿았는지 확인
    this.physicsService.onCollision = (bodyA, bodyB) => {
      if (!this.gameState.isPlaying) return;
      
      // 블록이 베이스나 다른 정적 객체(또는 배치된 블록)와 충돌했는지 확인
      // 배치된 블록도 충돌 대상으로 처리 (isPlaced: true)
      const staticBody = bodyA.isStatic || bodyA.isPlaced ? bodyA : (bodyB.isStatic || bodyB.isPlaced ? bodyB : null);
      const dynamicBody = (bodyA.isStatic || bodyA.isPlaced) ? bodyB : ((bodyB.isStatic || bodyB.isPlaced) ? bodyA : null);
      
      // staticBody가 있고, dynamicBody가 떨어지는 블록이어야 함
      if (!staticBody || !dynamicBody || staticBody.isFalling) return;
      
      // dynamicBody가 떨어지는 블록인지 확인
      if (!this.fallingBlocks.has(dynamicBody) && dynamicBody !== this.currentBlock) return;
      
      // 블록이 정적 객체(베이스 또는 배치된 블록)와 충돌
      console.log('[GameController] Block collided with static/placed body:', {
        blockId: dynamicBody.id,
        staticBodyId: staticBody.id,
        staticBodyIsStatic: staticBody.isStatic,
        staticBodyIsPlaced: staticBody.isPlaced,
        blockVelocityY: dynamicBody.velocity.y,
      });
      
      // 블록이 충분히 느리게 움직일 때만 고정 (충돌로 인해 멈춤)
      if (Math.abs(dynamicBody.velocity.y) < 500) {
        console.log('[GameController] Fixing block immediately after collision');
        // 속도를 0으로 설정하여 완전히 멈춤
        dynamicBody.velocity.x = 0;
        dynamicBody.velocity.y = 0;
        dynamicBody.angularVelocity = 0;
        this._fixBlockToTower(dynamicBody);
      }
    };
    
    this.physicsService.onTopple = (body) => {
      // 게임이 시작되지 않았으면 무시
      if (!this.gameState.isPlaying) {
        return;
      }
      
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
    console.log('[GameController] start() called');
    this.gameState.start();
    console.log('[GameController] gameState.isPlaying:', this.gameState.isPlaying);
    this.tower.clear();
    this.consecutivePlacements = 0;
    this.nextBlockX = this.canvasWidth / 2;
    
    // PhysicsService 초기화 (이전 게임의 body 제거)
    this.physicsService.clearBodies();
    
    // 타워 베이스 추가 (고정된 바닥)
    // 베이스의 중심 위치 계산: basePosition.y는 베이스의 하단이므로
    // 베이스의 중심 Y = basePosition.y - height/2
    const baseHeight = 30; // 베이스 높이 증가
    const baseCenterY = this.tower.basePosition.y - baseHeight / 2;
    const baseBlock = new Block({
      position: new Vector(this.tower.basePosition.x, baseCenterY),
      width: this.tower.baseWidth,
      height: baseHeight,
      isStatic: true,
      color: '#34495e',
      restitution: 0, // 반발 없음 (완전 비탄성)
      friction: 0.8, // 높은 마찰 계수
    });
    baseBlock.isPlaced = true; // 베이스는 항상 배치된 상태
    baseBlock.isFalling = false;
    this.physicsService.addBody(baseBlock);
    
    console.log('[GameController] Base added to physics:', {
      basePosition: { x: this.tower.basePosition.x, y: this.tower.basePosition.y },
      baseCenter: { x: baseBlock.position.x, y: baseBlock.position.y },
      baseSize: { width: this.tower.baseWidth, height: baseHeight },
      baseAABB: baseBlock.getAABB(),
      baseId: baseBlock.id,
      isStatic: baseBlock.isStatic,
      mass: baseBlock.mass,
      invMass: baseBlock.invMass,
    });
    
    this._spawnNextBlock();
    console.log('[GameController] currentBlock spawned:', !!this.currentBlock);
    this._startGameLoop();
    console.log('[GameController] game loop started');
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
    // currentBlock이 있고 떨어지지 않는 중이면 새로 생성하지 않음
    if (this.currentBlock && !this.currentBlock.isFalling && !this.physicsService.bodies.includes(this.currentBlock)) {
      console.log('[GameController] _spawnNextBlock: currentBlock already exists and not falling');
      return;
    }

    const spawnY = 50; // 화면 상단
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.tower.basePosition.x - this.tower.baseWidth / 2;
    const baseRight = this.tower.basePosition.x + this.tower.baseWidth / 2;
    const blockHalfWidth = this.blockWidth / 2;
    const clampedX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));
    
    // 새로운 블록 생성 (독립적인 인스턴스)
    const block = new Block({
      position: new Vector(clampedX, spawnY),
      width: this.blockWidth,
      height: this.blockHeight,
      mass: 1,
      color: this._getRandomColor(),
      type: 'normal',
      restitution: 0, // 반발 없음 (완전 비탄성)
      friction: 0.6, // 마찰 계수
    });

    // 초기 속도 0으로 설정 (정지 상태에서 시작)
    block.velocity.x = 0;
    block.velocity.y = 0;
    block.angularVelocity = 0;
    block.isFalling = false; // 소환 시에는 떨어지지 않음
    block.isPlaced = false; // 명시적으로 설정

    // 배치 전에는 물리 엔진에 추가하지 않음 (떨어지지 않도록)
    // 배치할 때 물리 엔진에 추가하여 떨어지도록 함
    this.currentBlock = block;
    this.nextBlockX = clampedX; // nextBlockX도 업데이트
    
    console.log('[GameController] Block spawned:', {
      blockId: block.id,
      position: { x: block.position.x, y: block.position.y },
      size: { width: block.width, height: block.height },
      aabb: block.getAABB(),
      nextBlockX: this.nextBlockX,
      isFalling: block.isFalling,
      isPlaced: block.isPlaced,
      towerBlocks: this.tower.getBlockCount(),
      currentBlockSet: this.currentBlock === block,
    });
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
    console.log('[GameController] placeBlock() called', {
      hasCurrentBlock: !!this.currentBlock,
      isPlaying: this.gameState.isPlaying,
      isPaused: this.gameState.isPaused,
      currentBlockIsFalling: this.currentBlock?.isFalling,
      currentBlockInPhysics: this.currentBlock ? this.physicsService.bodies.includes(this.currentBlock) : false,
      fallingBlocksCount: this.fallingBlocks.size,
    });
    
    if (!this.gameState.isPlaying || this.gameState.isPaused) {
      console.log('[GameController] placeBlock() early return - game not playing or paused');
      return;
    }

    // 현재 블록이 없으면 새로 생성
    if (!this.currentBlock) {
      this._spawnNextBlock();
      if (!this.currentBlock) {
        console.log('[GameController] placeBlock() - failed to spawn block');
        return;
      }
    }

    // 현재 블록이 이미 떨어지는 중이면, 그 블록은 fallingBlocks에 추가하고 새 블록 생성
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      // 기존 블록은 fallingBlocks에 추가 (이미 추가되어 있을 수도 있음)
      this.fallingBlocks.add(this.currentBlock);
      console.log('[GameController] Current block is falling, spawning new block');
      // 새 블록 생성
      this._spawnNextBlock();
      if (!this.currentBlock) {
        console.log('[GameController] placeBlock() - failed to spawn new block');
        return;
      }
    }

    const blockToPlace = this.currentBlock;
    
    // 블록 상태 설정 (떨어지는 상태로 변경)
    blockToPlace.isFalling = true;
    blockToPlace.isPlaced = false;
    
    // 블록이 타워 위에 떨어지도록 위치 설정
    // 블록을 타워 위에 배치하는 것이 아니라, 블록이 떨어져서 타워에 닿도록 함
    // 따라서 블록의 초기 위치는 타워 위쪽에 설정
    const blockHeight = blockToPlace.height;
    const blockCount = this.tower.getBlockCount();
    let spawnY;
    
    console.log('[GameController] Calculating spawnY:', {
      blockCount,
      towerTopY: blockCount === 0 ? null : this.tower.getTopY(),
      basePositionY: this.tower.basePosition.y,
    });
    
    if (blockCount === 0) {
      // 첫 번째 블록: 베이스 위쪽에 배치 (화면 상단 근처)
      spawnY = 200; // 화면 상단에서 200픽셀 아래
      console.log('[GameController] First block spawnY:', spawnY);
    } else {
      // 이후 블록: 타워 최상단 위쪽에 배치
      const towerTopY = this.tower.getTopY();
      spawnY = Math.max(100, towerTopY - 300); // 타워 위 300픽셀 (최소 100픽셀)
      console.log('[GameController] Subsequent block spawnY:', { towerTopY, spawnY });
    }
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.tower.basePosition.x - this.tower.baseWidth / 2;
    const baseRight = this.tower.basePosition.x + this.tower.baseWidth / 2;
    const blockHalfWidth = blockToPlace.width / 2;
    const clampedX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));
    
    // 위치와 속도 설정 (물리 엔진에 추가하기 전에 설정)
    blockToPlace.position.y = spawnY;
    blockToPlace.position.x = clampedX;
    blockToPlace.velocity.x = 0;
    blockToPlace.velocity.y = 0;
    blockToPlace.angularVelocity = 0;
    blockToPlace.angle = 0;
    
    // 블록을 물리 엔진에 추가하여 떨어지도록 함
    // (이미 추가되어 있으면 중복 추가 방지)
    if (!this.physicsService.bodies.includes(blockToPlace)) {
      this.physicsService.addBody(blockToPlace);
    }
    
    // 블록 상태: 떨어지는 중
    blockToPlace.isFalling = true;
    blockToPlace.isPlaced = false;
    
    // 떨어지는 블록 목록에 추가
    this.fallingBlocks.add(blockToPlace);
    
    // currentBlock을 null로 설정 (다음 placeBlock 호출 시 새 블록 생성하도록)
    // 블록이 고정되면 _fixBlockToTower에서 다음 블록을 생성함
    this.currentBlock = null;
    
    console.log('[GameController] Block positioned for falling:', {
      blockId: blockToPlace.id,
      spawnY,
      nextBlockX: this.nextBlockX,
      towerTopY: this.tower.getBlockCount() === 0 ? this.tower.basePosition.y - 30 : this.tower.getTopY(),
      blockPosition: { x: blockToPlace.position.x, y: blockToPlace.position.y },
      blockAABB: blockToPlace.getAABB(),
      physicsBodiesCount: this.physicsService.bodies.length,
      fallingBlocksCount: this.fallingBlocks.size,
      isFalling: blockToPlace.isFalling,
      isPlaced: blockToPlace.isPlaced,
    });
  }

  /**
   * 블록을 타워에 고정
   * @param {Block} block
   * @private
   */
  _fixBlockToTower(block) {
    if (!block) {
      console.warn('[GameController] _fixBlockToTower: block is null');
      return;
    }
    
    // 블록이 이미 배치되었으면 무시
    if (block.isPlaced) {
      console.warn('[GameController] _fixBlockToTower: block is already placed', {
        blockId: block.id,
        isFalling: block.isFalling,
        isPlaced: block.isPlaced,
      });
      return;
    }
    
    // currentBlock이 이 블록이면 초기화 (다음 블록을 위해)
    // currentBlock이 아니어도 정상 동작 (떨어지는 블록일 수 있음)

    const blockHeight = block.height;
    
    // 블록의 위치를 타워의 최상단에 맞춤
    // position은 중심 좌표이므로, 블록의 하단 = position.y + height/2
    let targetY;
    if (this.tower.getBlockCount() === 0) {
      // 첫 번째 블록: 베이스 위에 배치
      // 베이스 상단 = basePosition.y - 30 (베이스 높이 30)
      // 블록의 하단 = 베이스 상단
      // position.y + blockHeight/2 = basePosition.y - 30
      // position.y = basePosition.y - 30 - blockHeight/2
      targetY = this.tower.basePosition.y - 30 - blockHeight / 2;
    } else {
      // 이후 블록: 타워 최상단 위에 배치
      // 타워 최상단 = getTopY() (블록의 최대 Y, 즉 블록의 하단)
      // 다음 블록의 하단이 타워 최상단 위에 있어야 함 (겹치지 않도록)
      // position.y + blockHeight/2 = towerTopY + blockHeight
      // position.y = towerTopY + blockHeight/2
      const towerTopY = this.tower.getTopY();
      // 타워 최상단 위에 배치 (겹치지 않도록)
      // 블록의 하단이 타워 최상단 위에 오도록
      targetY = towerTopY + blockHeight / 2;
      
      // 디버그: 타워 최상단 확인
      console.log('[GameController] Placing block on tower:', {
        towerTopY,
        blockHeight,
        targetY,
        blockBottom: targetY + blockHeight / 2,
        towerBlocks: this.tower.getBlockCount(),
      });
    }
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.tower.basePosition.x - this.tower.baseWidth / 2;
    const baseRight = this.tower.basePosition.x + this.tower.baseWidth / 2;
    const blockHalfWidth = block.width / 2;
    const clampedX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));
    
    block.position.y = targetY;
    block.position.x = clampedX;
    block.velocity.x = 0;
    block.velocity.y = 0;
    block.angularVelocity = 0;
    block.angle = 0;
    
    // 블록 상태 변경 (배치됨) - 물리 엔진에 남겨두되 정적으로 만들기
    block.place(); // isPlaced = true, isFalling = false
    
    // 블록을 정적으로 만들기 (물리 엔진에 남겨두되 움직이지 않도록)
    block.isStatic = true;
    block.velocity.x = 0;
    block.velocity.y = 0;
    block.angularVelocity = 0;
    block.angle = 0;
    
    // 물리 엔진에 이미 있으면 그대로 두고, 없으면 추가
    const wasInPhysics = this.physicsService.bodies.includes(block);
    if (!wasInPhysics) {
      this.physicsService.addBody(block);
    }
    
    // 블록을 타워에 추가
    this.tower.addBlock(block);
    
    console.log('[GameController] Block fixed to tower:', {
      blockId: block.id,
      position: { x: block.position.x, y: block.position.y },
      towerBlocks: this.tower.getBlockCount(),
      towerTopY: this.tower.getTopY(),
      blockAABB: block.getAABB(),
      blockIsPlaced: block.isPlaced,
      blockIsFalling: block.isFalling,
      wasInPhysics,
      isStatic: block.isStatic,
      towerBlocksArray: this.tower.blocks.map(b => ({ id: b.id, position: b.position, isPlaced: b.isPlaced, isStatic: b.isStatic })),
    });
    
    // 떨어지는 블록 목록에서 제거
    this.fallingBlocks.delete(block);
    
    // currentBlock이 이 블록이면 초기화
    if (this.currentBlock === block) {
      this.currentBlock = null;
      console.log('[GameController] Current block cleared');
    }
    
    // 블록이 고정되면 다음 블록 생성 (자동 배치하지 않음 - 사용자가 스페이스바를 눌러야 함)
    // currentBlock이 null이면 새 블록 생성
    if (!this.currentBlock) {
      this._spawnNextBlock();
    }

    // 점수 계산 및 추가
    this._calculateAndAddScore();

    // 라운드 증가
    this.gameState.incrementRound();
    this.consecutivePlacements++;

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
    console.log('[GameController] _handleGameOver() called', {
      isPlaying: this.gameState.isPlaying,
      isGameOver: this.gameState.isGameOver,
      stack: new Error().stack,
    });
    
    // 게임이 시작되지 않았으면 무시
    if (!this.gameState.isPlaying) {
      console.log('[GameController] _handleGameOver() ignored - game not playing');
      return;
    }
    
    if (this.gameState.isGameOver) {
      console.log('[GameController] _handleGameOver() ignored - already game over');
      return;
    }

    console.log('[GameController] Game Over!');
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

    // 블록이 떨어지는 중이면 이동 불가 (물리 엔진에 있을 때는 이동 불가)
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      return;
    }

    const moveSpeed = 15; // 이동 속도 증가 (5 -> 15)
    this.nextBlockX += direction * moveSpeed;

    // 베이스 범위 내로 제한
    const baseLeft = this.tower.basePosition.x - this.tower.baseWidth / 2;
    const baseRight = this.tower.basePosition.x + this.tower.baseWidth / 2;
    const blockHalfWidth = this.blockWidth / 2;
    this.nextBlockX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));

    // 현재 블록 위치 업데이트 (물리 엔진에 없을 때만)
    if (!this.physicsService.bodies.includes(this.currentBlock)) {
      this.currentBlock.position.x = this.nextBlockX;
    }
  }

  /**
   * 게임 루프 시작
   * @private
   */
  _startGameLoop() {
    if (this.animationFrameId) return;
    
    // 게임이 시작되지 않았으면 루프를 시작하지 않음
    if (!this.gameState.isPlaying) {
      return;
    }

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
    // 게임이 시작되지 않았거나 일시정지 상태면 업데이트하지 않음
    if (!this.gameState.isPlaying || this.gameState.isPaused) {
      return;
    }

    // 물리 시뮬레이션 업데이트 (게임이 시작되었을 때만)
    // PhysicsService.update() 내부에서 checkBalance()가 호출되지만,
    // 이미 update() 시작 부분에서 isPlaying 체크를 하므로 안전함
    this.physicsService.update(deltaTime);

    // 떨어지는 블록들이 타워에 닿았는지 확인 (자동 고정)
    // 충돌 이벤트로도 처리하지만, 여기서도 직접 확인
    const blocksToCheck = this.currentBlock && this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)
      ? [this.currentBlock, ...this.fallingBlocks]
      : Array.from(this.fallingBlocks);
    
    for (const block of blocksToCheck) {
      if (!block || !block.isFalling || !this.physicsService.bodies.includes(block)) continue;
      const blockAABB = block.getAABB();
      
      // 베이스 또는 타워 블록과 충돌했는지 확인
      let isTouchingTower = false;
      let towerTopY = 0;
      
      if (this.tower.getBlockCount() === 0) {
        // 첫 번째 블록: 베이스와 충돌 확인
        // 베이스는 물리 엔진에 있으므로 충돌 감지로 확인
        const baseBlock = this.physicsService.bodies.find(b => b.isStatic && b.isPlaced);
        if (baseBlock) {
          const baseAABB = baseBlock.getAABB();
          // 블록의 하단(max.y)이 베이스의 상단(min.y)에 닿았는지 확인
          const blockBottom = blockAABB.max.y; // 블록의 하단
          const baseTop = baseAABB.min.y; // 베이스의 상단
          
          // X 위치도 확인 (블록이 베이스 범위 내에 있어야 함)
          const blockCenterX = block.position.x;
          const baseLeft = baseAABB.min.x;
          const baseRight = baseAABB.max.x;
          const isInBaseRangeX = blockCenterX >= baseLeft && blockCenterX <= baseRight;
          
          // 더 넓은 범위로 확인 (충돌 해결로 인해 약간 겹칠 수 있음)
          // 블록이 베이스 위에 있거나 약간 겹치면 닿은 것으로 간주
          const distanceY = blockBottom - baseTop;
          isTouchingTower = distanceY <= 30 && 
                           distanceY >= -30 &&
                           Math.abs(block.velocity.y) < 500 &&
                           isInBaseRangeX;
          towerTopY = baseTop;
        }
      } else {
        // 이후 블록: 타워 최상단과 충돌 확인
        // 배치된 블록들 중 가장 위에 있는 블록 찾기
        let maxTopY = -Infinity;
        this.tower.blocks.forEach(placedBlock => {
          const placedAABB = placedBlock.getAABB();
          maxTopY = Math.max(maxTopY, placedAABB.max.y);
        });
        towerTopY = maxTopY > -Infinity ? maxTopY : this.tower.basePosition.y - 30;
        
        const blockBottom = blockAABB.max.y; // 블록의 하단
        // 블록의 하단이 타워 최상단에 닿았는지 확인
        const distanceY = blockBottom - towerTopY;
        isTouchingTower = distanceY <= 30 && 
                         distanceY >= -30 &&
                         Math.abs(block.velocity.y) < 500;
      }
      
      if (isTouchingTower) {
        console.log('[GameController] Block touching tower, fixing...', {
          blockId: block.id,
          blockBottom: blockAABB.max.y,
          towerTopY,
          velocityY: block.velocity.y,
          towerBlocks: this.tower.getBlockCount(),
        });
        // 블록을 타워에 고정
        this._fixBlockToTower(block);
        break; // 하나씩 처리
      }
    }

    // 떨어지는 블록들이 화면 밖으로 나갔는지 확인
    // 단, 블록이 떨어지는 중일 때만 체크 (타워에 닿기 전까지는 기다림)
    // 블록이 타워 근처에 있으면 게임 오버하지 않음
    const fallingBlocksToCheck = this.currentBlock && this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)
      ? [this.currentBlock, ...this.fallingBlocks]
      : Array.from(this.fallingBlocks);
    
    for (const block of fallingBlocksToCheck) {
      if (!block || !block.isFalling || !this.physicsService.bodies.includes(block)) continue;
      const aabb = block.getAABB();
      
      // 베이스 위치 확인
      const baseBlock = this.physicsService.bodies.find(b => b.isStatic && b.isPlaced);
      let towerTopY = 0;
      let isNearTower = false;
      let isInBaseRangeX = false;
      
      if (this.tower.getBlockCount() === 0 && baseBlock) {
        // 첫 번째 블록: 베이스와의 거리 확인
        const baseAABB = baseBlock.getAABB();
        towerTopY = baseAABB.min.y; // 베이스 상단
        const blockBottom = aabb.max.y; // 블록 하단
        const distanceY = blockBottom - towerTopY;
        
        // X 위치도 확인 (블록이 베이스 범위 내에 있어야 함)
        const blockCenterX = block.position.x;
        const baseLeft = baseAABB.min.x;
        const baseRight = baseAABB.max.x;
        isInBaseRangeX = blockCenterX >= baseLeft && blockCenterX <= baseRight;
        
        isNearTower = distanceY <= 100 && distanceY >= -20 && isInBaseRangeX; // 베이스 위 100픽셀 이내 또는 겹침, 그리고 X 범위 내
      } else if (this.tower.getBlockCount() > 0) {
        // 이후 블록: 타워 최상단과의 거리 확인
        towerTopY = this.tower.getTopY();
        const blockBottom = aabb.max.y;
        const distanceY = blockBottom - towerTopY;
        
        // X 위치도 확인 (베이스 범위 내에 있어야 함)
        const blockCenterX = block.position.x;
        const baseLeft = this.tower.basePosition.x - this.tower.baseWidth / 2;
        const baseRight = this.tower.basePosition.x + this.tower.baseWidth / 2;
        isInBaseRangeX = blockCenterX >= baseLeft && blockCenterX <= baseRight;
        
        isNearTower = distanceY <= 100 && distanceY >= -20 && isInBaseRangeX;
      }
      
      // 화면 아래쪽으로 나갔고, 타워 근처에 없을 때만 게임 오버
      // 또는 베이스 범위 밖으로 떨어졌을 때도 게임 오버
      // 베이스 범위 밖으로 떨어지면 즉시 게임 오버 (베이스 위에 떨어지지 않으면 게임 오버)
      const isOutOfBounds = (aabb.min.y > this.canvasHeight + 50 && !isNearTower) || 
                            (!isInBaseRangeX && aabb.min.y > this.canvasHeight - 200); // 베이스 범위 밖으로 떨어지면 게임 오버 (더 빠르게 감지)
      
      if (isOutOfBounds) {
        console.log('[GameController] Block out of bounds (bottom):', {
          blockId: block.id,
          position: { x: block.position.x, y: block.position.y },
          aabb: { 
            min: { x: aabb.min.x, y: aabb.min.y }, 
            max: { x: aabb.max.x, y: aabb.max.y } 
          },
          canvasSize: { width: this.canvasWidth, height: this.canvasHeight },
          blockSize: { width: block.width, height: block.height },
          angle: block.angle,
          velocity: { x: block.velocity.x, y: block.velocity.y },
          towerTopY,
          isNearTower,
          baseBlock: baseBlock ? { position: baseBlock.position, aabb: baseBlock.getAABB() } : null,
        });
        this._handleGameOver();
        return;
      }
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
    // 주의: 자동 배치는 블록이 충분히 안정적으로 타워 위에 있을 때만 실행
    // 현재는 자동 배치 기능을 비활성화 (수동 배치만 허용)
    // if (this.currentBlock && this._shouldAutoPlace()) {
    //   this.placeBlock();
    // }
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
    console.log('[GameController] handleKeyDown:', key, 'isPlaying:', this.gameState.isPlaying);
    
    // 게임이 시작되지 않았으면 스페이스바로 시작
    if (!this.gameState.isPlaying && !this.gameState.isGameOver) {
      if (key === ' ' || key === 'Space') {
        console.log('[GameController] Starting game from keydown');
        this.start();
        return;
      }
    }

    if (!this.gameState.isPlaying) {
      return;
    }

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
    console.log('[GameController] handleClick:', x, y, 'isPlaying:', this.gameState.isPlaying);
    
    // 게임이 시작되지 않았으면 시작
    if (!this.gameState.isPlaying && !this.gameState.isGameOver) {
      console.log('[GameController] Starting game from click');
      this.start();
      return;
    }

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

