import { PhysicsService } from '../service/PhysicsService.js';
import { ScoreService } from '../service/ScoreService.js';
import { Block } from '../domain/Block.js';
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

    // 베이스 정보
    const baseX = canvasWidth / 2;
    const baseY = canvasHeight; // 베이스는 바닥에 붙어있음 (베이스의 하단 Y 좌표)
    this.basePosition = new Vector(baseX, baseY);
    this.baseWidth = 400; // 베이스 너비

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
      
      // 블록이 베이스나 배치된 블록과 충돌했는지 확인
      // 베이스는 정적(isStatic=true, isPlaced=true)
      // 배치된 블록은 isPlaced=true이지만 isStatic=false (무게 균형에 따라 움직일 수 있음)
      // 떨어지는 블록은 isFalling=true, isPlaced=false
      
      const baseBody = bodyA.isStatic && bodyA.isPlaced ? bodyA : (bodyB.isStatic && bodyB.isPlaced ? bodyB : null);
      const placedBody = !bodyA.isStatic && bodyA.isPlaced ? bodyA : (!bodyB.isStatic && bodyB.isPlaced ? bodyB : null);
      const fallingBody = (bodyA.isFalling && !bodyA.isPlaced) ? bodyA : ((bodyB.isFalling && !bodyB.isPlaced) ? bodyB : null);
      
      // 베이스나 배치된 블록과 떨어지는 블록의 충돌만 처리
      if (!fallingBody) return;
      if (!baseBody && !placedBody) return;
      
      // 떨어지는 블록이 맞는지 확인
      if (!this.fallingBlocks.has(fallingBody) && fallingBody !== this.currentBlock) return;
      
      const supportBody = baseBody || placedBody;
      const dynamicBody = fallingBody;
      
      // 블록이 베이스 또는 배치된 블록과 충돌
      // 중요: 떨어지는 블록이 타워 최상단에 닿았는지 확인
      // 가장 위에 있는 블록과만 충돌해야 함 (중간 블록과 충돌하면 안 됨)
      const placedBlocks = this._getPlacedBlocks();
      let shouldFix = false;
      
      if (baseBody) {
        // 베이스와 충돌: 모든 블록이 베이스와 충돌 가능 (첫 번째 블록 특별 처리 제거)
        // X 위치 확인: 블록이 타워 범위 내에 있어야 함
        const baseLeft = this.basePosition.x - this.baseWidth / 2;
        const baseRight = this.basePosition.x + this.baseWidth / 2;
        const isInBaseRangeX = dynamicBody.position.x >= baseLeft && dynamicBody.position.x <= baseRight;
        
        if (isInBaseRangeX) {
          shouldFix = true;
        }
      } else if (placedBody) {
        // 배치된 블록과 충돌: 모든 블록과 충돌 가능 (하드코딩 없음)
        // 모든 블록에 대해 동일한 로직 적용
        
        // X 위치 확인: 블록이 타워 범위 내에 있어야 함
        const baseLeft = this.basePosition.x - this.baseWidth / 2;
        const baseRight = this.basePosition.x + this.baseWidth / 2;
        const isInBaseRangeX = dynamicBody.position.x >= baseLeft && dynamicBody.position.x <= baseRight;
        
        if (!isInBaseRangeX) {
          // X 범위를 벗어났으면 무시
          return;
        }
        
        // 블록이 배치된 블록과 충돌했고 X 범위 내에 있으면 고정
        // 충돌이 감지되었다는 것은 이미 타워에 닿았다는 의미
        shouldFix = true;
      }
      
      if (!shouldFix) {
        // 타워 최상단이 아니면 무시 (중간 블록과의 충돌은 무시)
        console.log('[GameController] Collision ignored - shouldFix is false:', {
          fallingBlockId: dynamicBody.id.substring(0, 20),
          supportBodyId: supportBody.id.substring(0, 20),
          isBaseBody: !!baseBody,
          isPlacedBody: !!placedBody,
        });
        return;
      }
      
      // 디버그 로그 제거 (성능 향상)
      // console.log('[GameController] Block collided with base/placed body:', {
      //   blockId: dynamicBody.id,
      //   supportBodyId: supportBody.id,
      //   supportBodyIsStatic: supportBody.isStatic,
      //   supportBodyIsPlaced: supportBody.isPlaced,
      //   blockVelocityY: dynamicBody.velocity.y,
      //   towerTopY: baseBody ? null : this._getTopY(),
      // });
      
      // 블록이 충돌했으면 즉시 고정 (속도 조건 완화)
      // 속도가 너무 빠르면(떨어지는 중) 잠시 기다렸다가 고정
      const absVelocityY = Math.abs(dynamicBody.velocity.y);
      if (absVelocityY < 1000) {
        // 디버그 로그 제거 (성능 향상)
        // console.log('[GameController] Fixing block immediately after collision', {
        //   blockId: dynamicBody.id,
        //   velocityY: dynamicBody.velocity.y,
        //   absVelocityY,
        // });
        // 속도를 0으로 설정하여 완전히 멈춤
        dynamicBody.velocity.x = 0;
        dynamicBody.velocity.y = 0;
        dynamicBody.angularVelocity = 0;
        this._fixBlockToTower(dynamicBody);
      } else {
        // 디버그 로그 제거 (성능 향상)
        // console.log('[GameController] Block moving too fast, waiting...', {
        //   blockId: dynamicBody.id,
        //   velocityY: dynamicBody.velocity.y,
        // });
      }
    };
    
    this.physicsService.onTopple = (body, result) => {
      // 게임이 시작되지 않았으면 무시
      if (!this.gameState.isPlaying) {
        return;
      }
      
      if (body instanceof Block && body.isPlaced) {
        console.log('[GameController] Block toppling detected:', {
          blockId: body.id ? body.id.substring(0, 20) : 'unknown',
          offset: result.offset,
          centerOfMass: { x: result.centerOfMass.x, y: result.centerOfMass.y },
          supportBounds: result.supportBounds,
        });
        
        // 블록이 무너지면 물리적으로 움직이도록 함
        // offset이 양수면 오른쪽으로, 음수면 왼쪽으로 기울어짐
        const torque = result.offset * 500; // 토크 증가 (더 강하게)
        body.angularVelocity += torque;
        
        // 블록이 무너지면 떨어지도록 함
        body.isPlaced = false;
        body.isFalling = true;
        
        // 블록이 무너지는 것만으로는 게임 오버가 되지 않음
        // 블록이 베이스 바닥 아래로 떨어지면 게임 오버 (update에서 처리)
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
    // 물리 엔진의 배치된 블록들은 게임 재시작 시 자동으로 제거됨
    this.consecutivePlacements = 0;
    this.nextBlockX = this.canvasWidth / 2;
    
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
    baseBlock.isPlaced = true; // 베이스는 항상 배치된 상태
    baseBlock.isFalling = false;
    this.physicsService.addBody(baseBlock);
    
    console.log('[GameController] Base added to physics:', {
      basePosition: { x: this.basePosition.x, y: this.basePosition.y },
      baseCenter: { x: baseBlock.position.x, y: baseBlock.position.y },
      baseSize: { width: this.baseWidth, height: baseHeight },
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
      console.log('[GameController] _spawnNextBlock: currentBlock already exists and not falling', {
        currentBlockId: this.currentBlock.id,
        isFalling: this.currentBlock.isFalling,
        inPhysics: this.physicsService.bodies.includes(this.currentBlock),
      });
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

    // 현재 블록이 이미 떨어지는 중이면, 그 블록은 떨어지게 두고 새 블록 생성하지 않음
    // (떨어지는 중에도 조작 가능하도록)
    // 단, 블록이 아직 물리 엔진에 추가되지 않았으면 떨어뜨림
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      // 이미 떨어지는 중이면 아무것도 하지 않음 (조작은 계속 가능)
      console.log('[GameController] Current block is already falling, ignoring placeBlock call');
      return;
    }

    const blockToPlace = this.currentBlock;
    
    // 블록 상태 설정 (떨어지는 상태로 변경)
    blockToPlace.isFalling = true;
    blockToPlace.isPlaced = false;
    
    // 블록이 타워 위에 떨어지도록 위치 설정
    // 블록을 타워 위에 배치하는 것이 아니라, 블록이 떨어져서 타워에 닿도록 함
    // 따라서 블록의 초기 위치는 타워 위쪽에 설정
    const blockHeight = blockToPlace.height;
    const blockCount = this._getPlacedBlocks().length;
    let spawnY;
    
    console.log('[GameController] Calculating spawnY:', {
      blockCount,
      towerTopY: blockCount === 0 ? null : this._getTopY(),
      basePositionY: this.basePosition.y,
    });
    
    // 모든 블록은 화면 상단 근처에서 떨어지도록 설정 (일관된 위치)
    // 첫 번째 블록과 이후 블록 모두 같은 높이에서 시작
    spawnY = 200; // 화면 상단에서 200픽셀 아래 (일관된 위치)
    
    console.log('[GameController] Block spawnY:', {
      blockCount,
      spawnY,
      towerTopY: blockCount === 0 ? null : this._getTopY(),
    });
    
    // 블록의 X 위치를 베이스 범위 내로 제한
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
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
    
    // currentBlock을 null로 설정하고 바로 다음 블록 생성 (떨어지는 블록은 조작 불가, 다음 블록만 조작 가능)
    this.currentBlock = null;
    this._spawnNextBlock();
    
    console.log('[GameController] Block positioned for falling:', {
      blockId: blockToPlace.id,
      spawnY,
      nextBlockX: this.nextBlockX,
      towerTopY: this._getPlacedBlocks().length === 0 ? this.basePosition.y - 30 : this._getTopY(),
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

    // 블록 상태 변경 (배치됨) - 물리 엔진에서 계속 시뮬레이션되도록
    block.place(); // isPlaced = true, isFalling = false
    
    // 블록은 정적이 아니어야 함 (무게 균형에 따라 움직일 수 있음)
    // 블록의 위치는 물리 엔진이 자연스럽게 처리하도록 함
    // 충돌 해결을 통해 블록이 타워 위에 올라가도록 함
    
    // 타워 최상단 계산 (블록이 타워 안으로 들어가지 않도록 약간의 위치 조정)
    const placedBlocks = this._getPlacedBlocks().filter(b => b !== block);
    let maxBlockBottomY = -Infinity;
    
    placedBlocks.forEach(placedBlock => {
      const blockBottomY = placedBlock.position.y + placedBlock.height / 2;
      maxBlockBottomY = Math.max(maxBlockBottomY, blockBottomY);
    });
    
    if (maxBlockBottomY === -Infinity) {
      maxBlockBottomY = this.basePosition.y - 30; // 베이스 상단
    }
    
    const towerTopY = maxBlockBottomY;
    
    // 블록이 타워 안으로 들어갔으면 약간 위로 조정 (충돌 해결을 돕기 위해)
    const blockBottom = block.position.y + block.height / 2;
    if (blockBottom > towerTopY) {
      const epsilon = 0.1;
      block.position.y = towerTopY + epsilon - block.height / 2;
    }
    
    // 속도는 0으로 설정 (충돌 해결 후 안정화)
    block.velocity.y = 0;
    block.angularVelocity = 0;
    
    // nextBlockX를 중앙으로 초기화 (다음 블록이 중앙에서 시작하도록)
    this.nextBlockX = this.basePosition.x;
    
    // 마찰과 반발 계수 조정 (안정적으로 쌓이도록)
    block.friction = 0.8; // 높은 마찰
    block.restitution = 0.1; // 낮은 반발
    
    // 물리 엔진에 이미 있으면 그대로 두고, 없으면 추가
    const wasInPhysics = this.physicsService.bodies.includes(block);
    if (!wasInPhysics) {
      this.physicsService.addBody(block);
    }
    
    // 블록은 이미 물리 엔진에 있고 isPlaced=true, isStatic=true로 설정됨
    // 별도 배열 관리 불필요
    
    const placedBlocksForDebug = this._getPlacedBlocks();
    const currentTowerTopY = this._getTopY();
    const blockAABB = block.getAABB();
    
    // 디버그: 모든 배치된 블록의 위치 확인
    const blockPositions = placedBlocksForDebug.map(b => ({
      id: b.id.substring(0, 20),
      position: { x: b.position.x, y: b.position.y },
      aabb: { min: { y: b.getAABB().min.y }, max: { y: b.getAABB().max.y } },
      isStatic: b.isStatic,
      angle: b.angle,
    }));
    
    console.log('[GameController] Block fixed to tower:', {
      blockId: block.id.substring(0, 20),
      position: { x: block.position.x, y: block.position.y },
      blockAABB: { min: { y: blockAABB.min.y }, max: { y: blockAABB.max.y } },
      towerBlocks: placedBlocksForDebug.length,
      towerTopY: currentTowerTopY,
      blockIsPlaced: block.isPlaced,
      blockIsFalling: block.isFalling,
      isStatic: block.isStatic,
      angle: block.angle,
      allPlacedBlocks: blockPositions,
      inPlacedBlocks: placedBlocksForDebug.includes(block),
      inPhysicsBodies: this.physicsService.bodies.includes(block),
    });
    
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

    // 점수 계산 및 추가
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
   * 점수 계산 및 추가
   * @private
   */
  _calculateAndAddScore() {
    const placedBlocks = this._getPlacedBlocks();
    const blockCount = placedBlocks.length;
    const height = this._getHeight();
    const stability = this._evaluateStability();

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

    // 블록이 떨어지는 중이면 조작 불가 (다음 블록만 조작 가능)
    if (this.currentBlock.isFalling && this.physicsService.bodies.includes(this.currentBlock)) {
      return;
    }

    const moveSpeed = 15; // 이동 속도 증가 (5 -> 15)
    this.nextBlockX += direction * moveSpeed;

    // 베이스 범위 내로 제한
    const baseLeft = this.basePosition.x - this.baseWidth / 2;
    const baseRight = this.basePosition.x + this.baseWidth / 2;
    const blockHalfWidth = this.blockWidth / 2;
    this.nextBlockX = Math.max(baseLeft + blockHalfWidth, Math.min(baseRight - blockHalfWidth, this.nextBlockX));

    // 현재 블록 위치 업데이트 (떨어지지 않은 블록만 조작 가능)
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

    // 물리 시뮬레이션 업데이트 (게임이 시작되었을 때만)
    // PhysicsService.update() 내부에서 checkBalance()가 호출되지만,
    // 이미 update() 시작 부분에서 isPlaying 체크를 하므로 안전함
    this.physicsService.update(deltaTime);
    
    // 블록은 물리 엔진에서 자연스럽게 시뮬레이션됨
    // 위치를 강제로 고정하지 않음 (무게 균형에 따라 움직일 수 있음)

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
      
      // 모든 블록에 대해 동일한 로직 적용 (첫 번째 블록 특별 처리 제거)
      // 타워 최상단과 충돌 확인 (블록이 없으면 베이스 상단)
      const towerTopY = this._getTopY();
      
      const blockBottom = blockAABB.max.y; // 블록의 하단
      // 블록의 하단이 타워 최상단에 닿았는지 확인
      const distanceY = blockBottom - towerTopY;
      
      // X 위치도 확인 (베이스 범위 내에 있어야 함)
      const blockCenterX = block.position.x;
      const baseLeft = this.basePosition.x - this.baseWidth / 2;
      const baseRight = this.basePosition.x + this.baseWidth / 2;
      const isInBaseRangeX = blockCenterX >= baseLeft && blockCenterX <= baseRight;
      
      // 더 넓은 범위로 확인 (블록이 타워에 닿을 수 있도록)
      // 블록의 하단이 타워 최상단보다 위에 있거나 같으면 닿은 것으로 간주
      isTouchingTower = distanceY <= 100 && 
                       distanceY >= -20 && // 블록이 타워 위에 있거나 약간 겹치면
                       Math.abs(block.velocity.y) < 1000 && // 속도 조건 완화
                       isInBaseRangeX; // X 범위 내에 있어야 함
      
      if (isTouchingTower) {
        console.log('[GameController] Block touching tower, fixing...', {
          blockId: block.id,
          blockBottom: blockAABB.max.y,
          towerTopY,
          velocityY: block.velocity.y,
          towerBlocks: this._getPlacedBlocks().length,
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
      let isNearTower = false;
      let isInBaseRangeX = false;
      
      const placedBlocks = this._getPlacedBlocks();
      
      // 모든 블록에 대해 동일한 로직 적용 (첫 번째 블록 특별 처리 제거)
      // 타워 최상단과 충돌 확인 (블록이 없으면 베이스 상단)
      const towerTopY = this._getTopY();
      const blockBottom = aabb.max.y; // 블록 하단
      const distanceY = blockBottom - towerTopY;
      
      // X 위치도 확인 (베이스 범위 내에 있어야 함)
      const blockCenterX = block.position.x;
      const baseLeft = this.basePosition.x - this.baseWidth / 2;
      const baseRight = this.basePosition.x + this.baseWidth / 2;
      isInBaseRangeX = blockCenterX >= baseLeft && blockCenterX <= baseRight;
      
      // 타워 위 200픽셀 이내 또는 겹침 (더 넓은 범위로 허용)
      isNearTower = distanceY <= 200 && distanceY >= -50 && isInBaseRangeX;
      
      // 게임 오버 조건: 블록이 베이스 바닥 아래로 떨어졌을 때만 게임 오버
      // 베이스의 하단 = basePosition.y (베이스 높이 30)
      // 블록의 상단이 베이스의 하단보다 아래에 있으면 게임 오버
      const baseBottom = this.basePosition.y;
      const isOutOfBounds = aabb.min.y > baseBottom;
      
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
          isInBaseRangeX,
          baseBlock: baseBlock ? { position: baseBlock.position, aabb: baseBlock.getAABB() } : null,
        });
        this._handleGameOver();
        return;
      }
    }

    // 타워 안정성 평가는 하지 않음
    // 블록이 무너지는 것만으로는 게임 오버가 되지 않음
    // 블록이 베이스 바닥 아래로 떨어지면 게임 오버 (위에서 처리)

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
      placedBlocks: this._getPlacedBlocks(),
      currentBlock: this.currentBlock,
      physicsBodies: this.physicsService.bodies,
      basePosition: this.basePosition,
      baseWidth: this.baseWidth,
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
    return this.physicsService.bodies.filter(body => 
      body instanceof Block && body.isPlaced && !body.isFalling && !body.isStatic
    );
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
}

