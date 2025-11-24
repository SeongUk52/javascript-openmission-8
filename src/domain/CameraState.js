export class CameraState {
  constructor({
    offsetY = 0,
    targetOffsetY = 0,
    followSpeed = 6,
    verticalGap = 0,
    followThreshold = 0,
  } = {}) {
    this.offsetY = offsetY;
    this.targetOffsetY = targetOffsetY;
    this.followSpeed = followSpeed;
    this.verticalGap = verticalGap;
    this.followThreshold = followThreshold;
  }

  copy() {
    return new CameraState({
      offsetY: this.offsetY,
      targetOffsetY: this.targetOffsetY,
      followSpeed: this.followSpeed,
      verticalGap: this.verticalGap,
      followThreshold: this.followThreshold,
    });
  }
}

