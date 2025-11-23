import { Vector } from '../domain/Vector.js';
import { Block } from '../domain/Block.js';
import { Tower } from '../domain/Tower.js';

/**
 * Canvas 렌더러
 * 물리 상태를 Canvas에 시각화한다.
 */
export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas 요소
   * @param {Object} options - 렌더링 옵션
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // 렌더링 옵션
    this.showDebugInfo = options.showDebugInfo || false;
    this.showAABB = options.showAABB || false;
    this.showCenterOfMass = options.showCenterOfMass || false;
    
    // 배경색
    this.backgroundColor = options.backgroundColor || '#1a1a2e';
    
    // 그리드 설정
    this.showGrid = options.showGrid || false;
    this.gridSize = options.gridSize || 50;
  }

  /**
   * Canvas 크기 설정
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * 화면 클리어
   */
  clear() {
    // Canvas 크기 확인
    if (this.canvas.width === 0 || this.canvas.height === 0) {
      console.warn('Canvas size is 0!', this.canvas.width, this.canvas.height);
      return;
    }
    
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 그리드 그리기
   * @private
   */
  _drawGrid() {
    if (!this.showGrid) return;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;

    // 세로선
    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // 가로선
    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * 블록 그리기
   * @param {Block} block
   */
  drawBlock(block) {
    if (!(block instanceof Block)) {
      console.warn('[CanvasRenderer] drawBlock: not a Block instance', block);
      return;
    }

    // 디버그: 블록 정보 확인
    if (!block.position || !block.width || !block.height) {
      console.warn('[CanvasRenderer] drawBlock: invalid block data', {
        hasPosition: !!block.position,
        width: block.width,
        height: block.height,
      });
      return;
    }

    this.ctx.save();

    // 블록 위치로 이동
    this.ctx.translate(block.position.x, block.position.y);
    this.ctx.rotate(block.angle);

    // 블록 그리기 (중심 기준)
    const halfWidth = block.width / 2;
    const halfHeight = block.height / 2;

    // 블록 색상
    this.ctx.fillStyle = block.color || '#3498db';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;

    // 블록 사각형
    this.ctx.fillRect(-halfWidth, -halfHeight, block.width, block.height);
    this.ctx.strokeRect(-halfWidth, -halfHeight, block.width, block.height);

    // 배치된 블록은 다른 스타일
    if (block.isPlaced) {
      this.ctx.strokeStyle = '#2ecc71';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(-halfWidth, -halfHeight, block.width, block.height);
    }

    this.ctx.restore();

    // 디버그 정보
    if (this.showDebugInfo) {
      this._drawBlockDebugInfo(block);
    }

    // AABB 그리기
    if (this.showAABB) {
      this._drawAABB(block);
    }

    // 무게 중심 그리기
    if (this.showCenterOfMass) {
      this._drawCenterOfMass(block);
    }
  }

  /**
   * 블록 디버그 정보 그리기
   * @param {Block} block
   * @private
   */
  _drawBlockDebugInfo(block) {
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'left';
    
    const info = [
      `ID: ${block.id.substring(0, 8)}`,
      `V: (${block.velocity.x.toFixed(1)}, ${block.velocity.y.toFixed(1)})`,
      `A: ${(block.angle * 180 / Math.PI).toFixed(1)}°`,
    ];
    
    const y = block.position.y - block.height / 2 - 5;
    info.forEach((text, i) => {
      this.ctx.fillText(text, block.position.x + block.width / 2 + 5, y + i * 12);
    });
    
    this.ctx.restore();
  }

  /**
   * AABB 그리기
   * @param {Block} block
   * @private
   */
  _drawAABB(block) {
    const aabb = block.getAABB();
    
    this.ctx.strokeStyle = '#ff00ff';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    
    this.ctx.strokeRect(
      aabb.min.x,
      aabb.min.y,
      aabb.max.x - aabb.min.x,
      aabb.max.y - aabb.min.y
    );
    
    this.ctx.setLineDash([]);
  }

  /**
   * 무게 중심 그리기
   * @param {Block} block
   * @private
   */
  _drawCenterOfMass(block) {
    const com = block.getCenterOfMass();
    
    this.ctx.fillStyle = '#ffff00';
    this.ctx.beginPath();
    this.ctx.arc(com.x, com.y, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * 타워 기반 그리기
   * @param {Tower} tower
   */
  drawTowerBase(tower) {
    if (!tower || !tower.basePosition || !tower.baseWidth) {
      console.warn('[CanvasRenderer] drawTowerBase: invalid tower data', tower);
      return;
    }
    
    const { basePosition, baseWidth } = tower;
    const halfWidth = baseWidth / 2;
    const baseHeight = 30; // 베이스 높이 증가

    this.ctx.fillStyle = '#34495e';
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 3;

    // 타워 기반 사각형
    // basePosition.y는 베이스의 하단 Y 좌표 (canvasHeight)
    // 베이스의 상단 Y 좌표 = basePosition.y - baseHeight
    const baseTopY = basePosition.y - baseHeight;
    const baseLeftX = basePosition.x - halfWidth;
    
    // 디버그: 베이스 그리기 정보
    // console.log('[CanvasRenderer] Drawing base:', {
    //   basePosition: { x: basePosition.x, y: basePosition.y },
    //   baseTopY,
    //   baseLeftX,
    //   baseWidth,
    //   baseHeight,
    //   canvasHeight: this.canvas.height,
    // });
    
    this.ctx.fillRect(
      baseLeftX,
      baseTopY,
      baseWidth,
      baseHeight
    );
    this.ctx.strokeRect(
      baseLeftX,
      baseTopY,
      baseWidth,
      baseHeight
    );
  }

  /**
   * 타워의 모든 블록 그리기
   * @param {Tower} tower
   */
  drawTower(tower) {
    // 타워 기반 그리기
    this.drawTowerBase(tower);

    // 블록들 그리기
    if (tower.blocks && tower.blocks.length > 0) {
      tower.blocks.forEach(block => {
        this.drawBlock(block);
      });
    }
  }

  /**
   * 모든 Body 그리기
   * @param {Body[]} bodies
   */
  drawBodies(bodies) {
    bodies.forEach(body => {
      if (body instanceof Block) {
        this.drawBlock(body);
      } else {
        // 일반 Body는 간단하게 그리기
        this._drawBody(body);
      }
    });
  }

  /**
   * 일반 Body 그리기
   * @param {Body} body
   * @private
   */
  _drawBody(body) {
    this.ctx.save();
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);

    this.ctx.fillStyle = '#95a5a6';
    this.ctx.strokeStyle = '#7f8c8d';
    this.ctx.lineWidth = 2;

    const halfWidth = body.width / 2;
    const halfHeight = body.height / 2;

    this.ctx.fillRect(-halfWidth, -halfHeight, body.width, body.height);
    this.ctx.strokeRect(-halfWidth, -halfHeight, body.width, body.height);

    this.ctx.restore();
  }

  /**
   * 전체 렌더링
   * @param {Object} gameState - 게임 상태
   */
  render(gameState) {
    if (!gameState) {
      console.warn('[CanvasRenderer] render: no gameState');
      return;
    }
    
    // 화면 클리어
    this.clear();

    // 그리드 그리기
    this._drawGrid();

    // 타워 베이스 그리기 (항상)
    if (gameState.tower) {
      // 디버그: 베이스 정보 확인
      if (!gameState.tower.basePosition || !gameState.tower.baseWidth) {
        console.warn('[CanvasRenderer] Tower base missing data:', {
          hasBasePosition: !!gameState.tower.basePosition,
          hasBaseWidth: !!gameState.tower.baseWidth,
        });
      }
      this.drawTowerBase(gameState.tower);
    }

    // 타워에 배치된 블록들 그리기
    if (gameState.tower && gameState.tower.blocks) {
      // 디버그 로그 제거 (매 프레임마다 출력되어 성능에 영향)
      // console.log('[CanvasRenderer] Drawing tower blocks:', {
      //   blockCount: gameState.tower.blocks.length,
      //   blocks: gameState.tower.blocks.map(b => ({
      //     id: b.id,
      //     position: { x: b.position.x, y: b.position.y },
      //     isPlaced: b.isPlaced,
      //     width: b.width,
      //     height: b.height,
      //   })),
      // });
      
      gameState.tower.blocks.forEach(block => {
        this.drawBlock(block);
      });
    }

    // 현재 떨어지는 블록 그리기
    if (gameState.currentBlock) {
      this.drawBlock(gameState.currentBlock);
    }

    // 다른 물리 객체들 그리기 (타워 베이스 등)
    if (gameState.physicsBodies && Array.isArray(gameState.physicsBodies)) {
      const otherBodies = gameState.physicsBodies.filter(
        body => body !== gameState.currentBlock && 
                gameState.tower && !gameState.tower.blocks.includes(body)
      );
      if (otherBodies.length > 0) {
        this.drawBodies(otherBodies);
      }
    }
  }
}

