/**
 * 블록 상태 Value Object
 * 현재 블록, 떨어지는 블록들, 블록 이동 상태를 관리한다.
 */
export class BlockState {
  constructor(currentBlock, fallingBlocks, nextBlockX, blockMoveDirection, blockMoveSpeed, blockMoveTime) {
    this.currentBlock = currentBlock;
    this.fallingBlocks = fallingBlocks;
    this.nextBlockX = nextBlockX;
    this.blockMoveDirection = blockMoveDirection;
    this.blockMoveSpeed = blockMoveSpeed;
    this.blockMoveTime = blockMoveTime;
  }

  copy() {
    return new BlockState(
      this.currentBlock,
      new Set(this.fallingBlocks),
      this.nextBlockX,
      this.blockMoveDirection,
      this.blockMoveSpeed,
      this.blockMoveTime
    );
  }
}

