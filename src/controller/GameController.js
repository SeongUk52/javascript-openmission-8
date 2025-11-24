import { PhysicsService } from '../service/PhysicsService.js';
import { ScoreService } from '../service/ScoreService.js';
import { Block } from '../domain/Block.js';
import { GameState } from '../domain/GameState.js';
import { Vector } from '../domain/Vector.js';
import { BalanceUtil } from '../util/BalanceUtil.js';
import { GameConfig } from '../domain/GameConfig.js';
import { BlockState } from '../domain/BlockState.js';
import { GameLoopState } from '../domain/GameLoopState.js';
import { GameCallbacks } from '../domain/GameCallbacks.js';
import { Tower } from '../domain/Tower.js';
import { TowerHeight } from '../domain/TowerHeight.js';

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
      blockHeight = 50, // 정사각형으로 변경
    } = options;

    // 게임 설정 (Canvas 크기, 블록 크기, 베이스 정보)
    const baseX = canvasWidth / 2;
    const baseY = canvasHeight; // 베이스는 바닥에 붙어있음 (베이스의 하단 Y 좌표)
    const basePosition = new Vector(baseX, baseY);
    const baseWidth = 400; // 베이스 너비
    this.gameConfig = new GameConfig(canvasWidth, canvasHeight, blockWidth, blockHeight, basePosition, baseWidth);

    // 물리 서비스
    this.physicsService = new PhysicsService({
      timeStep: 1 / 60, // 60fps
    });
    // 게임에 맞게 중력 증가
    this.physicsService.setGravity(500);

    // 게임 상태
    this.gameState = new GameState();

    // 타워 (테스트 호환성을 위해 유지)
    this.tower = new Tower({
      basePosition: basePosition,
      baseWidth: baseWidth,
    });

    // 블록 상태 (현재 블록, 떨어지는 블록들, 블록 이동 상태)
    this.blockState = new BlockState(null, new Set(), baseX, 1, 500, 0);

    // 게임 루프 상태 (애니메이션 프레임, 시간, 통계, 쿨타임)
    this.gameLoopState = new GameLoopState(null, 0, 0, new TowerHeight(0), 1000, 0);

    // 이벤트 콜백
    this.callbacks = new GameCallbacks(null, null, null);
    
    // 기존 코드 호환성을 위한 직접 참조 설정
    this._setupDirectReferences();

    // 물리 서비스 이벤트 설정
    this._setupPhysicsEvents();
  }
  
  /**
   * 기존 코드 호환성을 위한 직접 참조 설정 (Value Object와 동일한 객체 참조)
   * @private
   */
  _setupDirectReferences() {
    // Canvas 크기 (읽기 전용 - Value Object에서 직접 참조)
    Object.defineProperty(this, 'canvasWidth', {
      get: () => this.gameConfig.canvasWidth,
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'canvasHeight', {
      get: () => this.gameConfig.canvasHeight,
      enumerable: true,
      configurable: true
    });
    
    // 블록 크기 (읽기 전용)
    Object.defineProperty(this, 'blockWidth', {
      get: () => this.gameConfig.blockWidth,
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'blockHeight', {
      get: () => this.gameConfig.blockHeight,
      enumerable: true,
      configurable: true
    });
    
    // 베이스 정보 (읽기 전용)
    Object.defineProperty(this, 'basePosition', {
      get: () => this.gameConfig.basePosition,
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'baseWidth', {
      get: () => this.gameConfig.baseWidth,
      enumerable: true,
      configurable: true
    });
    
    // 블록 상태 (읽기/쓰기 - Value Object와 동기화)
    // 원시값은 getter/setter로 동기화, 객체는 직접 참조
    Object.defineProperty(this, 'currentBlock', {
      get: () => this.blockState.currentBlock,
      set: (value) => { this.blockState.currentBlock = value; },
      enumerable: true,
      configurable: true
    });
    this.fallingBlocks = this.blockState.fallingBlocks; // Set은 객체 참조
    Object.defineProperty(this, 'nextBlockX', {
      get: () => this.blockState.nextBlockX,
      set: (value) => { this.blockState.nextBlockX = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'blockMoveDirection', {
      get: () => this.blockState.blockMoveDirection,
      set: (value) => { this.blockState.blockMoveDirection = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'blockMoveSpeed', {
      get: () => this.blockState.blockMoveSpeed,
      set: (value) => { this.blockState.blockMoveSpeed = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'blockMoveTime', {
      get: () => this.blockState.blockMoveTime,
      set: (value) => { this.blockState.blockMoveTime = value; },
      enumerable: true,
      configurable: true
    });
    
    // 게임 루프 상태 (읽기/쓰기 - Value Object와 동기화)
    Object.defineProperty(this, 'animationFrameId', {
      get: () => this.gameLoopState.animationFrameId,
      set: (value) => { this.gameLoopState.animationFrameId = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'lastTime', {
      get: () => this.gameLoopState.lastTime,
      set: (value) => { this.gameLoopState.lastTime = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'consecutivePlacements', {
      get: () => this.gameLoopState.consecutivePlacements,
      set: (value) => { this.gameLoopState.consecutivePlacements = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'maxTowerHeight', {
      get: () => this.gameLoopState.maxTowerHeight.getValue(),
      set: (value) => { 
        this.gameLoopState.maxTowerHeight = value instanceof TowerHeight 
          ? value 
          : new TowerHeight(value); 
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'placeCooldown', {
      get: () => this.gameLoopState.placeCooldown,
      set: (value) => { this.gameLoopState.placeCooldown = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(this, 'lastPlaceTime', {
      get: () => this.gameLoopState.lastPlaceTime,
      set: (value) => { this.gameLoopState.lastPlaceTime = value; },
      enumerable: true,
      configurable: true
    });
    
    // 콜백 (읽기/쓰기 - Value Object와 동일한 객체 참조)
    this.onBlockPlaced = this.callbacks.onBlockPlaced;
    this.onGameOver = this.callbacks.onGameOver;
    this.onScoreChanged = this.callbacks.onScoreChanged;
  }

  /**
   * 물리 서비스 이벤트 설정
   * @private
   */
  _setupPhysicsEvents() {
    // 충돌 이벤트: 블록이 베이스나 타워에 닿았는지 확인
    this.physicsService.onCollision = (bodyA, bodyB) => {
      if (!this.gameState.isPlaying) return;
      
      // 블록이 베이스나 배치된 블록과 충돌했는지 확인
      // 베이스는 정적(isStatic=true)
      // 배치된 블록은 isStatic=false이고 isFalling=false 또는 velocity.y < 50
      // 떨어지는 블록은 isFalling=true
      
      const baseBody = bodyA.isStatic ? bodyA : (bodyB.isStatic ? bodyB : null);
      const placedBlocks = this._getPlacedBlocks();
      const placedBody = placedBlocks.includes(bodyA) ? bodyA : (placedBlocks.includes(bodyB) ? bodyB : null);
      const fallingBody = bodyA.isFalling ? bodyA : (bodyB.isFalling ? bodyB : null);
      
      // 베이스나 배치된 블록과 떨어지는 블록의 충돌만 처리
      if (!fallingBody) return;
      if (!baseBody && !placedBody) return;
      
      // 떨어지는 블록이 맞는지 확인
      if (!this.fallingBlocks.has(fallingBody) && fallingBody !== this.currentBlock) return;
      
      const supportBody = baseBody || placedBody;
      const dynamicBody = fallingBody;
      
      // 블록이 베이스 또는 배치된 블록과 충돌했는지 확인
      let shouldFix = false;
      
      if (baseBody) {
        // 베이스와 충돌: 모든 블록이 베이스와 충돌 가능
        // X 위치 확인: 블록이 타워 범위 내에 있어야 함
        const baseLeft = this.basePosition.x - this.baseWidth / 2;
        const baseRight = this.basePosition.x + this.baseWidth / 2;
        const isInBaseRangeX = dynamicBody.position.x >= baseLeft && dynamicBody.position.x <= baseRight;
        
        if (isInBaseRangeX) {
          shouldFix = true;
        }
        return;
      }
      if (placedBody) {
        // 배치된 블록과 충돌: 모든 블록과 충돌 가능
        // X 위치 확인: 블록이 타워 범위 내에 있어야 함
        const baseLeft = this.basePosition.x - this.baseWidth / 2;
        const baseRight = this.basePosition.x + this.baseWidth / 2;
        const isInBaseRangeX = dynamicBody.position.x >= baseLeft && dynamicBody.position.x <= baseRight;
        
        if (isInBaseRangeX) {
          shouldFix = true;
        }
      }
      
      // 블록이 충돌하고 속도가 충분히 느려졌을 때 타워에 고정
      // (실제 고정은 update 메서드에서 처리하므로 여기서는 플래그만 설정)
    };
    
    this.physicsService.onTopple = (body, result) => {
      // 게임이 시작되지 않았으면 무시
      if (!this.gameState.isPlaying) {
        return;
      }
      
      if (body instanceof Block) {
        // Box2D/Matter.js: 무너질 때 점진적으로 토크를 적용
        // offset이 클수록 더 강한 토크를 적용하되, 한 번에 큰 토크를 주지 않음
        // offset이 블록 너비의 일정 비율 이상 벗어나야 무너짐
        const blockWidth = body.width || 50;
        const offsetRatio = Math.abs(result.offset) / blockWidth;
        
        // Box2D/Matter.js: 무게 중심이 지지 영역 밖으로 많이 벗어나야 무너짐
        // offset이 블록 너비의 20% 이상 벗어나야 무너지도록 함
        const toppleThreshold = 0.2; // 블록 너비의 20%
        
        if (offsetRatio < toppleThreshold) {
          // 아직 무너지지 않음 - 점진적으로 토크만 적용
          const gradualTorque = result.offset * 5; // 매우 작은 토크로 점진적 기울임
          body.angularVelocity += gradualTorque;
          
          // 각속도 최대값 제한
          const maxAngularVelocity = 0.5; // 매우 작은 각속도
          if (Math.abs(body.angularVelocity) > maxAngularVelocity) {
            body.angularVelocity = Math.sign(body.angularVelocity) * maxAngularVelocity;
          }
          return; // 아직 완전히 무너지지 않음
        }
        
        // Box2D/Matter.js: 무너질 때 자연스럽게 토크 적용
        // offset이 양수면 오른쪽으로, 음수면 왼쪽으로 기울어짐
        const torque = result.offset * 20; // 토크 감소 (더 자연스러운 무너짐)
        body.angularVelocity += torque;
        
        // 각속도 최대값 제한 (너무 빠른 회전 방지)
        const maxAngularVelocity = 1.5; // 라디안/초
        if (Math.abs(body.angularVelocity) > maxAngularVelocity) {
          body.angularVelocity = Math.sign(body.angularVelocity) * maxAngularVelocity;
        }
        
        // 블록이 무너지면 아래로 떨어지도록 함
        body.isFalling = true;
        // Box2D/Matter.js: 자연스럽게 떨어지도록 작은 속도만 추가
        if (body.velocity.y < 50) {
          body.velocity.y += 50; // 아래로 떨어지도록 속도 추가 (감소)
        }
        
        // 위에 있는 블록들도 영향을 받도록 함 (연쇄 반응)
        const placedBlocks = this._getPlacedBlocks();
        const bodyAABB = body.getAABB();
        const bodyTop = bodyAABB.min.y;
        
        placedBlocks.forEach(otherBlock => {
          if (otherBlock === body) return;
          if (otherBlock.isStatic) return; // 베이스는 제외
          
          const otherAABB = otherBlock.getAABB();
          const otherBottom = otherAABB.max.y;
          
          // 다른 블록이 이 블록 위에 있는지 확인
          const distanceY = otherBottom - bodyTop;
          if (distanceY >= -10 && distanceY <= 10) {
            // X 위치도 확인
            const xOverlap = !(otherAABB.max.x < bodyAABB.min.x || otherAABB.min.x > bodyAABB.max.x);
            if (xOverlap) {
              // 위에 있는 블록도 무너지도록 함
              otherBlock.isFalling = true;
              // 위 블록에도 토크 전달 (연쇄 반응) - 더 작은 토크
              const relativeTorque = result.offset * 15; // 토크 감소
              otherBlock.angularVelocity += relativeTorque;
              // 아래로 떨어지도록 velocity.y 증가 - 더 작은 속도
              if (otherBlock.velocity.y < 50) {
                otherBlock.velocity.y += 50; // 아래로 떨어지도록 속도 추가 (감소)
              }
            }
          }
        });
        
        // 블록이 무너지는 것만으로는 게임 오버가 되지 않음
        // 블록이 베이스 바닥 아래로 떨어지면 게임 오버 (update에서 처리)
      }
    };
  }

  /**
   * 게임 시작
   */
  start() {
    this.gameState.start();
    // 물리 엔진의 배치된 블록들은 게임 재시작 시 자동으로 제거됨
    this.consecutivePlacements = 0;
    this.maxTowerHeight = new TowerHeight(0); // 최대 높이 초기화
    this.nextBlockX = this.canvasWidth / 2;
    this.blockMoveDirection = 1; // 오른쪽으로 시작
    this.blockMoveTime = 0;
    
    // 타워 초기화 (테스트 호환성)
    this.tower = new Tower({
      basePosition: this.basePosition,
      baseWidth: this.baseWidth,
    });
    
    // PhysicsService 초기화 (이전 게임의 body 제거)
    this.physicsService.clearBodies();
    
    // 타워 베이스 추가 (고정된 바닥)
    // 베이스의 중심 위치 계산: basePosition.y는 베이스의 하단이므로
    // 베이스의 중심 Y = basePosition.y - height/2
    const baseHeight = 30; // 베이스 높이 증가
    const baseCenterY = this.basePosition.y - baseHeight / 2;
    const baseBlock = new Block({
      position: new Vector(this.basePosition.x, baseCenterY),
      width: this.baseWidth,
      height: baseHeight,
      isStatic: true,
      color: '#34495e',
      restitution: 0, // 반발 없음 (완전 비탄성)
      friction: 0.8, // 높은 마찰 계수
    });
    // 베이스는 정적 객체이므로 isPlaced 설정 불필요
    baseBlock.isFalling = false;
    
    // 베이스 위치 강제 고정 (정적 객체는 절대 이동하지 않음)
    const baseX = this.basePosition.x;
    const baseY = baseCenterY;
    
    // 베이스 위치를 직접 설정하고 변경 방지
    baseBlock.position.x = baseX;
    baseBlock.position.y = baseY;
    
    // 베이스 속도 0으로 고정
    baseBlock.velocity.x = 0;
    baseBlock.velocity.y = 0;
    baseBlock.angularVelocity = 0;
    
    // 베이스 위치를 저장하여 매 프레임마다 고정
    baseBlock._originalPosition = new Vector(baseX, baseY);
    
    this.physicsService.addBody(baseBlock);
    
    // 베이스 위치 재확인 (물리 엔진에 추가된 후에도 위치 유지)
    baseBlock.position.x = baseX;
    baseBlock.position.y = baseY;
    
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
    // currentBlock이 있고 떨어지지 않는 중이면 새로 생성하지 않음
    if (this.currentBlock && !this.currentBlock.isFalling && !this.physicsService.bodies.includes(this.currentBlock)) {
      return;
    }

    // 블록 생성 위치: 화면 상단 (일관된 위치)
    // placeBlock()에서 떨어질 위치를 설정하므로, 여기서는 표시용 위치만 설정
    const spawnY = 200; // 화면 상단에서 200픽셀 아래 (placeBlock과 동일한 위치)
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
    const blockHalfWidth = this.blockWidth / 2;
    
    // nextBlockX가 범위를 벗어났으면 중앙으로 초기화
    if (this.nextBlockX < baseLeft + blockHalfWidth || this.nextBlockX > baseRight - blockHalfWidth) {
      this.nextBlockX = this.basePosition.x;
    }
    
    const clampedX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));
    
    // 새로운 블록 생성 (독립적인 인스턴스)
    const block = new Block({
      position: new Vector(clampedX, spawnY),
      width: this.blockWidth,
      height: this.blockHeight,
      mass: 1, // 질량 기본값
      color: this._getRandomColor(),
      type: 'normal',
      restitution: 0, // 반발 없음 (완전 비탄성)
      friction: 0.8, // 마찰 계수 증가 (바닥에 닿았을 때 회전 감소)
    });

    // 초기 속도 0으로 설정 (정지 상태에서 시작)
    block.velocity.x = 0;
    block.velocity.y = 0;
    block.angularVelocity = 0;
    block.isFalling = false; // 소환 시에는 떨어지지 않음
    // isPlaced는 place() 메서드에서 설정되므로 여기서는 설정하지 않음

    // 배치 전에는 물리 엔진에 추가하지 않음 (떨어지지 않도록)
    // 배치할 때 물리 엔진에 추가하여 떨어지도록 함
    this.currentBlock = block;
    // nextBlockX를 clampedX로 업데이트 (블록 위치와 동기화)
    this.nextBlockX = clampedX;
    
    // 디버그 로그 제거 (성능 향상)
    // console.log('[GameController] Block spawned:', {
    //   blockId: block.id,
    //   position: { x: block.position.x, y: block.position.y },
    //   size: { width: block.width, height: block.height },
    //   aabb: block.getAABB(),
    //   nextBlockX: this.nextBlockX,
    //   isFalling: block.isFalling,
    //   isPlaced: block.isPlaced,
    //   towerBlocks: this._getPlacedBlocks().length,
    //   currentBlockSet: this.currentBlock === block,
    // });
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
   * 블록 배치 시도 (쿨타임 체크)
   * @private
   */
  _tryPlaceBlock() {
    const currentTime = Date.now();
    const timeSinceLastPlace = currentTime - this.lastPlaceTime;
    
    // 쿨타임 중이면 블록 배치하지 않음
    if (timeSinceLastPlace < this.placeCooldown) {
      return;
    }
    
    // 쿨타임 통과 시 블록 배치
    this.lastPlaceTime = currentTime;
    this.placeBlock();
  }

  /**
   * 블록 배치 (스페이스바 또는 클릭)
   */
  placeBlock() {
    if (!this.gameState.isPlaying || this.gameState.isPaused) {
      return;
    }

    // 현재 블록이 없으면 새로 생성
    if (!this.currentBlock) {
      this._spawnNextBlock();
      if (!this.currentBlock) {
        return;
      }
    }

    // 현재 블록이 이미 떨어지는 중이면, 그 블록은 떨어지게 두고 새 블록 생성하지 않음
    // (떨어지는 중에도 조작 가능하도록)
    // 단, 블록이 아직 물리 엔진에 추가되지 않았으면 떨어뜨림
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      // 이미 떨어지는 중이면 아무것도 하지 않음 (조작은 계속 가능)
      return;
    }

    const blockToPlace = this.currentBlock;
    
    // 블록 상태 설정 (떨어지는 상태로 변경)
    blockToPlace.isFalling = true;
    // isPlaced는 place() 메서드에서 설정되므로 여기서는 설정하지 않음
    
    // 블록이 타워 위에 떨어지도록 위치 설정
    // 블록을 타워 위에 배치하는 것이 아니라, 블록이 떨어져서 타워에 닿도록 함
    // 따라서 블록의 초기 위치는 타워 위쪽에 설정
    const blockHeight = blockToPlace.height;
    const blockCount = this._getPlacedBlocks().length;
    let spawnY;
    
    // 모든 블록은 화면 상단 근처에서 떨어지도록 설정 (일관된 위치)
    // 첫 번째 블록과 이후 블록 모두 같은 높이에서 시작
    spawnY = 200; // 화면 상단에서 200픽셀 아래 (일관된 위치)
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
    const blockHalfWidth = blockToPlace.width / 2;
    const clampedX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));
    
    // 위치 설정 (물리 엔진에 추가하기 전에 설정)
    blockToPlace.position.y = spawnY;
    blockToPlace.position.x = clampedX;
    blockToPlace.angle = 0;
    // 속도는 물리 엔진이 자연스럽게 처리하도록 함 (0으로 설정하지 않음)
    
    // 블록을 물리 엔진에 추가하여 떨어지도록 함
    // (이미 추가되어 있으면 중복 추가 방지)
    if (!this.physicsService.bodies.includes(blockToPlace)) {
      this.physicsService.addBody(blockToPlace);
    }
    
    // 블록 상태: 떨어지는 중
    blockToPlace.isFalling = true;
    // isPlaced는 place() 메서드에서 설정되므로 여기서는 설정하지 않음
    
    // 떨어지는 블록 목록에 추가
    this.fallingBlocks.add(blockToPlace);
    
    // currentBlock을 null로 설정하고 바로 다음 블록 생성 (떨어지는 블록은 조작 불가, 다음 블록만 조작 가능)
    this.currentBlock = null;
    this._spawnNextBlock();
  }

  /**
   * 블록을 타워에 고정
   * @param {Block} block
   * @private
   */
  _fixBlockToTower(block) {
    if (!block) {
      return;
    }
    
    // 블록이 이미 배치되었으면 무시 (_getPlacedBlocks로 확인)
    const placedBlocks = this._getPlacedBlocks();
    if (placedBlocks.includes(block)) {
      return;
    }
    
    // 블록 배치 시작 (디버깅 로그 제거)
    
    // currentBlock이 이 블록이면 초기화 (다음 블록을 위해)
    // currentBlock이 아니어도 정상 동작 (떨어지는 블록일 수 있음)

    // 블록 상태만 변경 (위치는 물리 엔진이 자연스럽게 처리)
    block.place(); // isPlaced = true, isFalling = false
    
    // 타워에 블록 추가 (테스트 호환성)
    this.tower.addBlock(block);
    
    // 마찰과 반발 계수 조정 (안정적으로 쌓이도록)
    block.friction = 0.8; // 높은 마찰
    block.restitution = 0.1; // 낮은 반발
    
    // 물리 엔진에 이미 있으면 그대로 두고, 없으면 추가
    const wasInPhysics = this.physicsService.bodies.includes(block);
    if (!wasInPhysics) {
      this.physicsService.addBody(block);
    }
    
    // 떨어지는 블록 목록에서 제거
    this.fallingBlocks.delete(block);
    
    // 이 블록이 currentBlock이면 null로 설정 (이미 placeBlock에서 다음 블록을 생성했으므로 여기서는 생성하지 않음)
    if (this.currentBlock === block) {
      this.currentBlock = null;
    }
    
    // currentBlock이 null이면 다음 블록 생성 (placeBlock에서 생성하지 못한 경우를 대비)
    if (!this.currentBlock) {
      this._spawnNextBlock();
    }

    // 점수 계산 및 추가 (블록이 배치되고 안정화된 후)
    // 블록이 배치된 직후 바로 계산
    this._calculateAndAddScore();

    // 라운드 증가
    this.gameState.incrementRound();
    this.consecutivePlacements++;

    // 이벤트 콜백
    if (this.onBlockPlaced) {
      this.onBlockPlaced(this._getPlacedBlocks());
    }
  }

  /**
   * 현재 타워 높이 계산 (좌표값 기반)
   * 가장 높은 블록의 상단 Y 좌표를 기준으로 계산
   * @returns {number} 타워 높이 (픽셀)
   * @private
   */
  _calculateCurrentTowerHeight() {
    const placedBlocks = this._getPlacedBlocks();
    
    // 블록이 없으면 높이는 0
    if (placedBlocks.length === 0) {
      return 0;
    }
    
    // 베이스 상단 Y 좌표 (베이스 높이 30)
    const baseTopY = this.basePosition.y - 30;
    
    // 가장 높은 블록의 상단 Y 좌표 찾기
    // Y 좌표는 아래로 갈수록 커지므로, 가장 높은 블록은 Y 좌표가 가장 작은 블록
    // 블록 상단 = position.y - height/2
    let minBlockTopY = Infinity;
    placedBlocks.forEach(block => {
      const blockTopY = block.position.y - block.height / 2;
      minBlockTopY = Math.min(minBlockTopY, blockTopY);
    });
    
    // 타워 높이 = 베이스 상단 Y - 가장 높은 블록 상단 Y
    // Y 좌표는 아래로 갈수록 커지므로, baseTopY가 minBlockTopY보다 크면 높이가 생김
    const towerHeight = baseTopY - minBlockTopY;
    
    // 높이는 0 이상이어야 함
    return Math.max(0, towerHeight);
  }

  /**
   * 최대 높이 업데이트 및 점수 계산 (좌표값 기반)
   * 블록이 배치되고 안정화된 후에 한 번만 호출됨
   * @private
   */
  _updateMaxHeightAndScore() {
    // 현재 타워 높이 계산 (좌표값 기반)
    const currentHeight = this._calculateCurrentTowerHeight();
    const currentTowerHeight = new TowerHeight(currentHeight);
    
    // 최대 높이 업데이트 (현재 높이가 최대 높이보다 크면 업데이트)
    if (currentTowerHeight.isGreaterThan(this.gameLoopState.maxTowerHeight)) {
      this.gameLoopState.maxTowerHeight = currentTowerHeight.copy();
    }
    
    // 점수 = 최대 높이 / 블록 높이 (블록 높이 1개 = 1점)
    // 좌표값 차이를 블록 높이로 나눠서 점수 계산
    const score = Math.floor(this.gameLoopState.maxTowerHeight.getValue() / this.blockHeight);

    // 점수 계산 완료 (디버깅 로그 제거)

    // 점수를 최대 높이 기준으로 설정
    this.gameState.setScore(score);

    if (this.onScoreChanged) {
      this.onScoreChanged(this.gameState.score.getValue());
    }
  }

  /**
   * 점수 계산 및 추가 (블록 배치 시 호출)
   * @private
   */
  _calculateAndAddScore() {
    // 최대 높이 업데이트 및 점수 계산
    this._updateMaxHeightAndScore();
  }

  /**
   * 게임 오버 처리
   * @private
   */
  _handleGameOver() {
    // 게임이 시작되지 않았으면 무시
    if (!this.gameState.isPlaying) {
      return;
    }
    
    if (this.gameState.isGameOver) {
      return;
    }

    this.gameState.end();
    this.stop();

    if (this.onGameOver) {
      this.onGameOver(this.gameState);
    }
  }

  /**
   * 다음 블록 위치 자동 이동 (주기적으로 좌우로 움직임)
   * @param {number} deltaTime - 경과 시간 (초)
   * @private
   */
  _updateBlockPosition(deltaTime) {
    if (!this.currentBlock || !this.gameState.isPlaying || this.gameState.isPaused) {
      return;
    }

    // 블록이 떨어지는 중이면 이동하지 않음
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      return;
    }

    // 베이스 범위 내로 제한
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
    const blockHalfWidth = this.blockWidth / 2;
    const minX = baseLeft + blockHalfWidth;
    const maxX = baseRight - blockHalfWidth;

    // 시간 업데이트
    this.blockMoveTime += deltaTime;

    // 위치 업데이트
    this.nextBlockX += this.blockMoveDirection * this.blockMoveSpeed * deltaTime;

    // 경계에 닿으면 방향 전환
    if (this.nextBlockX >= maxX) {
      this.nextBlockX = maxX;
      this.blockMoveDirection = -1; // 왼쪽으로
      return;
    }
    if (this.nextBlockX <= minX) {
      this.nextBlockX = minX;
      this.blockMoveDirection = 1; // 오른쪽으로
    }

    // 현재 블록 위치 업데이트 (떨어지지 않은 블록만)
    if (this.currentBlock && !this.currentBlock.isFalling && !this.physicsService.bodies.includes(this.currentBlock)) {
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

    // 블록 위치 자동 업데이트 (주기적으로 좌우로 움직임)
    this._updateBlockPosition(deltaTime);

    // 물리 시뮬레이션 업데이트 (게임이 시작되었을 때만)
    // PhysicsService.update() 내부에서 checkBalance()가 호출되지만,
    // 이미 update() 시작 부분에서 isPlaying 체크를 하므로 안전함
    this.physicsService.update(deltaTime);
    
    // 블록은 물리 엔진에서 자연스럽게 시뮬레이션됨
    // 위치를 강제로 고정하지 않음 (무게 균형에 따라 움직일 수 있음)

    // 블록은 물리 엔진이 자연스럽게 처리하도록 함
    // 자동 고정하지 않음 - 충돌 해결을 통해 블록이 타워 위에 올라가도록 함

    // 떨어지는 블록들이 화면 밖으로 나갔는지 확인
    // 모든 물리 엔진에 포함된 블록을 체크 (베이스 제외)
    // 배치된 블록도 떨어질 수 있으므로 모든 블록을 체크해야 함
    const allBlocks = this.physicsService.bodies.filter(b => !b.isStatic);
    
    // 베이스가 없으면 게임 오버 체크하지 않음
    const baseBlock = this.physicsService.bodies.find(b => b.isStatic);
    if (!baseBlock) {
      return; // 베이스가 없으면 업데이트 중단
    }
    
    for (const block of allBlocks) {
      if (!this._isValidBlock(block)) {
        continue;
      }

      if (this._shouldFixBlockToTower(block)) {
        this._fixBlockToTower(block);
        continue;
      }

      if (this._isBlockOutOfBounds(block)) {
        this._handleGameOver();
        return;
      }
    }

    // 타워 안정성 평가는 하지 않음
    // 블록이 무너지는 것만으로는 게임 오버가 되지 않음
    // 블록이 베이스 바닥 아래로 떨어지면 게임 오버 (위에서 처리)

    // 점수 계산은 블록이 배치되고 안정화된 후에만 수행 (_fixBlockToTower에서 처리)
    // 매 프레임마다 계산하지 않음

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
    if (!this.currentBlock || this._getPlacedBlocks().length === 0) {
      return false;
    }

    // 현재 블록이 타워의 최상단에 닿았는지 확인
    const blockAABB = this.currentBlock.getAABB();
    const towerTopY = this._getTopY();

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
    // 게임이 시작되지 않았으면 스페이스바로 시작
    if (!this.gameState.isPlaying && !this.gameState.isGameOver) {
      if (key === ' ' || key === 'Space') {
        this.start();
        return;
      }
    }

    if (!this.gameState.isPlaying) {
      return;
    }

    switch (key) {
      case ' ':
      case 'Space':
        this._tryPlaceBlock();
        break;
      case 'Escape':
        if (this.gameState.isPaused) {
          this.resume();
          return;
        }
        if (this.gameState.isPlaying) {
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
    // 게임이 시작되지 않았으면 시작
    if (!this.gameState.isPlaying && !this.gameState.isGameOver) {
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

    // 클릭 시 블록 배치 (쿨타임 체크)
    this._tryPlaceBlock();
  }

  /**
   * 현재 게임 상태 반환
   * @returns {Object}
   */
  getGameState() {
    const currentTime = Date.now();
    const timeSinceLastPlace = currentTime - this.lastPlaceTime;
    const cooldownRemaining = Math.max(0, this.placeCooldown - timeSinceLastPlace);
    const cooldownProgress = Math.min(1, timeSinceLastPlace / this.placeCooldown);
    
    return {
      gameState: this.gameState,
      tower: this.tower, // 테스트 호환성
      placedBlocks: this._getPlacedBlocks(),
      currentBlock: this.currentBlock,
      physicsBodies: this.physicsService.bodies,
      basePosition: this.basePosition,
      baseWidth: this.baseWidth,
      score: this.gameState.score.getValue(),
      highScore: this.gameState.highScore.getValue(),
      placeCooldown: {
        remaining: cooldownRemaining,
        progress: cooldownProgress,
        isReady: cooldownRemaining === 0,
      },
    };
  }

  /**
   * 배치된 블록들 가져오기 (물리 엔진에서)
   * 배치된 블록은 isPlaced=true이지만 isStatic=false (무게 균형에 따라 움직일 수 있음)
   * 베이스 블록은 제외 (isStatic=true인 블록은 제외)
   * @returns {Block[]}
   * @private
   */
  _getPlacedBlocks() {
    // 배치된 블록들만 반환 (베이스 제외, 빠르게 떨어지는 블록 제외)
    return this.physicsService.bodies.filter(body => {
      if (!(body instanceof Block)) return false;
      if (body.isStatic) return false; // 베이스 제외
      // isPlaced가 true인 블록만 배치된 것으로 간주 (명확한 조건)
      // 물리 엔진에 추가되었고 isPlaced가 true인 블록만 반환
      return body.isPlaced === true;
    });
  }

  /**
   * 타워의 최상단 Y 좌표
   * @returns {number}
   * @private
   */
  _getTopY() {
    const placedBlocks = this._getPlacedBlocks();
    
    // 블록의 현재 위치 사용 (물리 엔진에서 자연스럽게 시뮬레이션됨)
    let maxBlockBottomY = -Infinity;
    placedBlocks.forEach(block => {
      // 블록의 하단 = position.y + height/2 (현재 위치 사용)
      const blockBottomY = block.position.y + block.height / 2;
      maxBlockBottomY = Math.max(maxBlockBottomY, blockBottomY);
    });

    // 블록이 없으면 베이스 상단 Y 좌표 반환 (베이스 높이 30)
    if (maxBlockBottomY === -Infinity) {
      return this.basePosition.y - 30;
    }

    return maxBlockBottomY;
  }

  /**
   * 타워 높이 계산
   * @returns {number}
   * @private
   */
  _getHeight() {
    const placedBlocks = this._getPlacedBlocks();
    if (placedBlocks.length === 0) return 0;

    let minY = Infinity;
    let maxY = -Infinity;

    placedBlocks.forEach(block => {
      const aabb = block.getAABB();
      minY = Math.min(minY, aabb.min.y);
      maxY = Math.max(maxY, aabb.max.y);
    });

    return maxY - minY;
  }

  /**
   * 타워 안정성 평가
   * @returns {{stable: boolean, toppledBlocks: Block[]}}
   * @private
   */
  _evaluateStability() {
    const placedBlocks = this._getPlacedBlocks();
    const toppledBlocks = [];
    let allStable = true;

    placedBlocks.forEach(block => {
      // 각 블록의 안정성 확인
      const supportBounds = BalanceUtil.getDefaultSupportBounds(block);
      const result = BalanceUtil.evaluate(block, { supportBounds });

      if (!result.stable || block.isToppled()) {
        toppledBlocks.push(block);
        allStable = false;
      }
    });

    return {
      stable: allStable,
      toppledBlocks,
    };
  }

  /**
   * 블록 유효성 검사
   * @param {Body} block
   * @returns {boolean}
   * @private
   */
  _isValidBlock(block) {
    if (!block) {
      return false;
    }

    const aabb = block.getAABB();
    if (!aabb || !aabb.min || !aabb.max) {
      return false;
    }

    return true;
  }

  /**
   * 블록을 타워에 고정해야 하는지 확인
   * @param {Body} block
   * @returns {boolean}
   * @private
   */
  _shouldFixBlockToTower(block) {
    const placedBlocks = this._getPlacedBlocks();
    if (placedBlocks.includes(block)) {
      return false;
    }

    const baseTopY = this.basePosition.y - 30;
    const minBlockTopY = this._calculateMinBlockTopY(baseTopY, placedBlocks);
    const blockBottom = block.getAABBMaxY();
    const distanceToTop = blockBottom - minBlockTopY;
    const isNearTop = distanceToTop <= 5 && distanceToTop >= -5;
    const isInBaseRangeX = this._isBlockInBaseRangeX(block);
    const isSlowEnough = Math.abs(block.velocity.y) < 100 && Math.abs(block.velocity.x) < 100;

    return isNearTop && isInBaseRangeX && isSlowEnough;
  }

  /**
   * 가장 높은 블록의 상단 Y 좌표 계산
   * @param {number} baseTopY
   * @param {Array} placedBlocks
   * @returns {number}
   * @private
   */
  _calculateMinBlockTopY(baseTopY, placedBlocks) {
    let minBlockTopY = baseTopY;
    if (placedBlocks.length === 0) {
      return minBlockTopY;
    }

    placedBlocks.forEach(placedBlock => {
      const blockTopY = placedBlock.position.y - placedBlock.height / 2;
      minBlockTopY = Math.min(minBlockTopY, blockTopY);
    });

    return minBlockTopY;
  }

  /**
   * 블록이 베이스 X 범위 내에 있는지 확인
   * @param {Body} block
   * @returns {boolean}
   * @private
   */
  _isBlockInBaseRangeX(block) {
    const blockCenterX = block.position.x;
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
    return blockCenterX >= baseLeft && blockCenterX <= baseRight;
  }

  /**
   * 블록이 화면 밖으로 나갔는지 확인
   * @param {Body} block
   * @returns {boolean}
   * @private
   */
  _isBlockOutOfBounds(block) {
    const aabb = block.getAABB();
    const baseBottom = this.basePosition.y;
    return aabb.min.y > baseBottom;
  }
}

