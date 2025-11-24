import { MaterialProperties } from './MaterialProperties.js';
import { Size } from './Size.js';
import { ForceState } from './ForceState.js';

/**
 * Body 속성 Value Object
 * 재질 속성, 크기, 힘 상태, 정적 객체 여부를 관리한다.
 */
export class BodyProperties {
  constructor(materialProperties, size, forceState, isStatic = false) {
    this.materialProperties = materialProperties;
    this.size = size;
    this.forceState = forceState;
    this.isStatic = isStatic;
  }

  copy() {
    return new BodyProperties(
      this.materialProperties.copy(),
      this.size.copy(),
      this.forceState.copy(),
      this.isStatic
    );
  }
}

