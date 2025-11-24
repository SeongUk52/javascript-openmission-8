# javascript-openmission-8
우아한테크코스(Woowa Tech Course) 웹 프론트엔드 8기 오픈 미션: 프리코스 챌린지

## 🎮 [게임 플레이하기](https://blockstacking-game.netlify.app/)

## 🎯 미션: 물리엔진 기반 타워 빌딩 게임

### 📋 프로젝트 개요
물리엔진을 직접 구현하여 타워를 쌓는 웹 게임을 만든다. 그래픽 기반으로 구현하며, 단계별로 기능을 확장해 나간다.

### 🎯 목표
- ✅ 프리코스 문제 형태 유지 (단계별 진행, 명확한 규칙)
- ✅ 물리엔진 직접 구현 (고난도 문제)
- ✅ 웹 기반 그래픽 게임
- ✅ 프로그래밍 역량을 제대로 보여줄 수 있는 복잡한 문제

---

## 🎮 게임 컨셉: Stack Tower (물리 기반)

### 핵심 메커닉
- 위에서 블록이 떨어짐
- 플레이어가 좌/우로 블록 배치 결정
- 물리엔진이 중력, 충돌, 회전, 균형을 계산
- 타워가 무너지면 게임 오버
- 높이/안정성에 따라 점수 획득

### 물리엔진 구현 요소

#### 1. 기본 물리 시스템
- **중력**: 일정한 가속도 적용
- **속도/가속도**: 선형 운동 계산
- **질량**: 블록별 무게 차이
- **시간 단위**: 프레임 기반 시뮬레이션

#### 2. 충돌 감지
- **AABB (Axis-Aligned Bounding Box)**: 직사각형 충돌
- **충돌 반응**: 탄성/비탄성 충돌
- **접촉점 계산**: 충돌 위치 파악

#### 3. 회전/토크 시스템
- **각속도**: 회전 속도
- **관성 모멘트**: 회전 관성
- **토크 계산**: 무게 중심 기준 회전력
- **균형 판정**: 중심점과 지지점 관계

#### 4. 고급 물리
- **마찰력**: 블록 간 마찰
- **공기 저항**: 떨어지는 속도 제한
- **진동/흔들림**: 불안정한 구조 시뮬레이션

---

## 🏗️ 아키텍처 설계 (레이어드 아키텍처 + MVC)

### 계층 구조
```
src/
├── domain/              # 도메인 모델 (Model Layer)
│   ├── Vector.js       # 2D 벡터 도메인 모델
│   ├── Body.js         # 물리 객체 도메인 모델
│   ├── Block.js        # 게임 블록 도메인 모델
│   ├── Tower.js        # 타워 도메인 모델
│   └── GameState.js    # 게임 상태 도메인 모델
│
├── service/             # 서비스 레이어 (Business Logic)
│   ├── PhysicsService.js    # 물리 시뮬레이션 서비스
│   ├── GravityService.js   # 중력 서비스
│   └── ScoreService.js     # 점수 계산 서비스
│
├── util/                # 유틸리티 레이어
│   ├── CollisionUtil.js    # 충돌 감지/해결 유틸
│   ├── TorqueUtil.js       # 토크 계산 유틸
│   └── BalanceUtil.js      # 균형 판정 유틸
│
├── controller/           # 컨트롤러 레이어 (Controller)
│   └── GameController.js  # 게임 컨트롤러 (입력 처리, 게임 루프)
│
├── view/                # 뷰 레이어 (View)
│   ├── CanvasRenderer.js  # Canvas 렌더링
│   ├── Animation.js       # 애니메이션 처리
│   └── UI.js              # UI 요소 (점수, 버튼 등)
│
└── web/                 # 웹 진입점
    ├── index.html
    └── main.js
```

### 레이어별 책임

#### Domain Layer (도메인 모델)
- **Vector**: 순수 데이터 구조, 벡터 연산
- **Body**: 물리 객체의 상태와 기본 동작
- **Block**: 게임 블록 도메인 모델 (Body 확장)
- **Tower**: 타워 도메인 모델 (블록 컬렉션 관리)
- **GameState**: 게임 상태 도메인 모델 (점수, 라운드, 게임 오버 등)

#### Service Layer (서비스)
- **PhysicsService**: 물리 시뮬레이션의 비즈니스 로직
- **GravityService**: 중력 시스템 관리
- **ScoreService**: 점수 계산 및 관리 비즈니스 로직

#### Util Layer (유틸리티)
- **CollisionUtil**: 순수 함수 형태의 충돌 계산
- **TorqueUtil**: 토크 계산 유틸리티
- **BalanceUtil**: 균형 판정 유틸리티

#### Controller Layer (컨트롤러)
- **GameController**: 사용자 입력 처리, 게임 루프 관리, 서비스 조율

#### View Layer (뷰)
- **CanvasRenderer**: 물리 상태를 시각화
- **UI**: 사용자 인터페이스

### 핵심 원칙
1. **레이어 분리**: 각 레이어는 명확한 책임을 가짐
2. **의존성 방향**: 상위 레이어가 하위 레이어에만 의존 (Domain ← Service ← Controller ← View)
3. **단일 책임**: 각 클래스는 하나의 책임만 가짐
4. **테스트 가능성**: 각 레이어를 독립적으로 테스트 가능
5. **확장 가능**: 새로운 기능 추가 시 기존 레이어에 영향 최소화

### Repository 패턴
- **사용하지 않음**: 이 프로젝트는 데이터베이스가 없는 인메모리 게임이므로 Repository 패턴은 과함
- **상태 관리**: 게임 상태는 `GameState` 도메인 모델로 관리하고, Controller나 Service에서 직접 접근
- **단순성**: 불필요한 추상화를 피하고 명확한 구조 유지

---

## 📝 구현 단계

### Phase 1: 물리엔진 코어 ✅
- [x] 2D 벡터 클래스 구현
- [x] 기본 Body 클래스 (위치, 속도, 질량)
- [x] 중력 시스템
- [x] AABB 충돌 감지
- [x] 충돌 반응 처리

### Phase 2: 회전/토크 시스템
- [x] 각속도 구현
- [x] 관성 모멘트 계산
- [x] 토크 계산 (무게 중심 기준)
- [x] 균형 판정 알고리즘

### Phase 3: 게임 로직 ✅
- [x] 블록 생성 시스템
- [x] 타워 관리
- [x] 입력 처리 (키보드/마우스)
- [x] 게임 루프
- [x] 점수 시스템
- [x] GameController 구현

### Phase 4: 렌더링 시스템 ✅
- [x] Canvas 기본 렌더링
- [x] 블록 그리기
- [x] 물리 상태 시각화
- [x] UI 요소 (점수, 게임 오버 등)
- [x] 웹 진입점 구현

### Phase 5: 고급 기능 (선택)
- [ ] 애니메이션 효과
- [ ] 파티클 효과
- [ ] 사운드 효과
- [ ] 반응형 디자인

---

## 🛠️ 기술 스택
- **언어**: JavaScript (ES6+)
- **런타임**: 브라우저
- **렌더링**: HTML5 Canvas
- **테스트**: Jest (물리엔진 단위 테스트)
- **물리**: 직접 구현 (외부 라이브러리 사용 안 함)
- **빌드**: Vite 또는 Webpack (선택)

---

## 🎓 프로그래밍 역량 포인트

### 1. 수학적 알고리즘
- 벡터 연산 (덧셈, 뺄셈, 내적, 외적)
- 물리 공식 구현 (운동 방정식, 토크)
- 좌표 변환

### 2. 복잡한 시스템 설계
- 물리엔진 아키텍처
- 충돌 감지 최적화
- 상태 관리

### 3. 성능 최적화
- 프레임 레이트 유지
- 충돌 감지 최적화 (공간 분할 등)

### 4. 테스트 가능한 구조
- 물리 계산 단위 테스트
- 시뮬레이션 검증

---

## 📚 참고 자료

### 2D 물리 엔진 구현 레퍼런스

이 프로젝트의 물리 엔진 구현은 다음 원리와 베스트 프랙티스를 참고했습니다:

#### 충돌 해결 (Collision Resolution)
- **Impulse-based Collision Resolution**: 속도 기반 충돌 해결
  - 정상 임펄스 계산: `j = -(1 + e) * v_rel · n / (1/mA + 1/mB)`
  - 위치 보정 (Positional Correction): penetration 해결을 위한 위치 조정
  - 참고: 일반적인 2D 물리 엔진 충돌 해결 알고리즘
- **충돌 매니폴드 (Collision Manifold)**: AABB 충돌 감지 및 normal/penetration 계산
  - penetration: 겹치는 영역의 최소 크기 (MTV - Minimum Translation Vector)
  - normal: penetration이 가장 작은 축 방향, bodyA에서 bodyB로 향하는 방향
  - X축 penetration < Y축 penetration → X축 normal, 그 반대면 Y축 normal
  - 참고: Box2D/Matter.js의 AABB 충돌 감지 방식

#### 마찰 (Friction)
- **Coulumb 마찰 법칙**: 마찰 임펄스는 정상 임펄스에 비례
  - 마찰 임펄스 최대값: `|j_friction| ≤ μ * |j_normal|`
  - 접선 속도 감쇠: 접촉면에서의 상대 속도 감소
  - 각속도 감쇠: 접촉 중인 블록의 회전 감소
  - 참고: 물리 엔진에서의 마찰 구현 베스트 프랙티스
- **정적 마찰(Static Friction)과 동적 마찰(Dynamic Friction) 구분**
  - 정적 마찰: 상대 속도가 작을 때(임계값 1.0 이하) 더 강한 마찰 적용 (1.5배)
  - 동적 마찰: 상대 속도가 클 때 일반 마찰 적용
  - 블록이 다른 블록 위에 조금만 벗어나서 배치되어도 안정적으로 유지되도록 정적 마찰 강화
  - 참고: Box2D/Matter.js의 정적/동적 마찰 구분 방식

#### 각운동 (Angular Motion)
- **각속도 감쇠**: 공기 저항과 접촉 마찰 분리
  - 공기 저항: 약한 감쇠 (0.98 계수)
  - 접촉 마찰: 충돌 시에만 강한 감쇠 적용
  - 참고: 2D 물리 엔진의 각속도 처리 방법
- **각 충격량 (Angular Impulse)**: `τ = r × F`
  - 접촉점에서의 각 충격량: `angularImpulse = r.cross(impulse)`
  - normal impulse가 중심을 통과하면 각 충격량이 0이어야 함
  - 완벽하게 수평/수직으로 닿았을 때는 각 충격량이 매우 작아야 함
  - 수치 오차로 인한 작은 각 충격량(0.001 이하)은 무시
  - 참고: Box2D/Matter.js의 각 충격량 계산 방식

#### 위치 보정 (Positional Correction)
- **Penetration 해결**: 블록이 겹치지 않도록 위치 조정
  - 보정 비율: 1.0 (100% 보정)
  - Slop 허용 오차: 0.001
  - 참고: 물리 엔진의 위치 보정 알고리즘

#### 접촉점 계산 (Contact Point Calculation)
- **정적 객체와의 접촉**: normal 방향으로 투영된 중심점 사용
  - 수평 접촉 (normal ≈ (0, ±1)): x 좌표를 동적 객체 중심으로, y 좌표는 겹치는 영역 중심
  - 수직 접촉 (normal ≈ (±1, 0)): y 좌표를 동적 객체 중심으로, x 좌표는 겹치는 영역 중심
  - 완벽하게 수평/수직으로 닿았을 때는 각 충격량이 0이 되도록 보정
  - 참고: Box2D/Matter.js의 접촉점 계산 방식

#### 균형 판정 (Balance Evaluation)
- **무게 중심과 지지 영역**: 무게 중심이 지지 영역 내에 있으면 안정적
  - tolerance: 블록 너비의 30% (조금만 벗어나도 안정적으로 유지)
  - 각도 임계값: 약 30도 (더 관대한 균형 판정)
  - 무너짐 임계값: offset이 블록 너비의 20% 이상 벗어나야 무너짐
  - 점진적 토크 적용: 무너질 때 한 번에 큰 토크를 주지 않고 점진적으로 적용
  - 참고: Box2D/Matter.js의 균형 판정 방식

#### 일반적인 2D 물리 엔진 원리
- AABB (Axis-Aligned Bounding Box) 충돌 감지
- 관성 모멘트 계산: `I = (1/12) * m * (w² + h²)`
- 토크 계산: `τ = r × F`
- 균형 판정: 무게 중심과 지지 영역 관계

### 참고 자료 링크

#### 최신 오픈소스 물리 엔진
- **[Box2D](https://box2d.org/)**: C++로 작성된 2D 물리 엔진 (가장 널리 사용되는 2D 물리 엔진)
  - [Box2D 공식 문서](https://box2d.org/documentation/)
  - [Box2D GitHub](https://github.com/erincatto/box2d)
  - 충돌 해결, 마찰, 각속도 감쇠 등의 구현 참고
- **[Matter.js](https://brm.io/matter-js/)**: JavaScript로 작성된 2D 물리 엔진 (웹 기반 프로젝트에 적합)
  - [Matter.js 공식 문서](https://brm.io/matter-js/docs/)
  - [Matter.js GitHub](https://github.com/liabru/matter-js)
  - JavaScript 구현 방식 참고
- **[Chipmunk2D](https://chipmunk-physics.net/)**: C로 작성된 경량 2D 물리 엔진
  - [Chipmunk2D 공식 문서](https://chipmunk-physics.net/documentation.php)
  - 성능 최적화 기법 참고

#### 일반 물리 엔진 튜토리얼
- [2D Physics Engine Tutorial](https://www.toptal.com/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics)
- [Collision Detection and Response](https://www.gamedeveloper.com/programming/collision-detection-algorithms)
- [Friction in Physics Engines](https://en.wikipedia.org/wiki/Friction)
- [Impulse-based Collision Resolution](https://en.wikipedia.org/wiki/Collision_response)

---

## 🌿 브랜치 전략 (Git Flow)

### 브랜치 종류
- `main`: 프로덕션 버전 (안정적인 배포 버전)
- `develop`: 개발 브랜치 (통합 개발 환경)
- `feature/기능명`: 기능 개발 (예: `feature/physics-engine`)
- `release/버전`: 릴리즈 준비 (예: `release/v1.0.0`)
- `hotfix/버그명`: 긴급 버그 수정 (예: `hotfix/collision-bug`)

### 워크플로우
1. **기능 개발**
   - `develop`에서 `feature/기능명` 브랜치 생성
   - 개발 완료 후 `develop`으로 머지
   
2. **릴리즈 준비**
   - `develop`에서 `release/버전` 브랜치 생성
   - 버그 수정 및 테스트
   - 완료 후 `main`과 `develop` 모두에 머지
   
3. **긴급 수정**
   - `main`에서 `hotfix/버그명` 브랜치 생성
   - 수정 완료 후 `main`과 `develop` 모두에 머지

4. **커밋 메시지**: Conventional Commits 형식 사용

---

## 🚀 배포

### 무료 배포 플랫폼

이 프로젝트는 다음 무료 플랫폼에서 배포할 수 있습니다:

#### 1. **Vercel** (추천) ⭐
- **장점**: GitHub 연동 자동 배포, 무료, 빠른 CDN
- **배포 링크**: [https://vercel.com](https://vercel.com)
- **배포 방법**:
  1. Vercel에 GitHub 계정으로 로그인
  2. "Add New Project" → 저장소 선택
  3. **중요**: 다음 설정 확인
     - **Framework Preset**: Other
     - **Build Command**: `npm run build` (자동으로 설정됨)
     - **Output Directory**: `dist` (자동으로 설정됨)
     - **Root Directory**: 비워두기 (설정하지 않음)
  4. "Deploy" 클릭
  5. 배포 완료 후 URL 확인

#### 2. **Netlify** (추천 - 더 간단함) ⭐
- **장점**: GitHub 연동 자동 배포, 무료, 쉬운 설정, `netlify.toml` 자동 인식
- **배포 링크**: [https://netlify.com](https://netlify.com)
- **배포 방법**:
  1. Netlify에 GitHub 계정으로 로그인
  2. "Add new site" → "Import an existing project"
  3. 저장소 선택
  4. **자동으로 `netlify.toml` 설정 인식됨** (Build command: `npm run build`, Publish directory: `dist`)
  5. "Deploy site" 클릭!

#### 3. **GitHub Pages**
- **장점**: 완전 무료, GitHub과 통합
- **배포 링크**: [https://pages.github.com](https://pages.github.com)
- **배포 방법**:
  1. Settings → Pages
  2. Source: `web` 폴더
  3. Save

#### 4. **Render** (서버 필요 시)
- **장점**: Node.js 서버 지원, 무료 티어
- **배포 링크**: [https://render.com](https://render.com)
- **배포 방법**:
  1. Render에 GitHub 계정으로 로그인
  2. "New Web Service"
  3. Build Command: 없음
  4. Start Command: `node server.js`
  5. Deploy!

### 배포 링크

배포 후 아래 링크를 업데이트해주세요:

🎮 **[게임 플레이하기](https://blockstacking-game.netlify.app/)**

> 💡 **빠른 배포 팁**: 
> - Vercel: GitHub 저장소를 연결하면 자동으로 배포됩니다
>   - **중요**: Vercel 대시보드에서 Settings → Build & Development Settings 확인
>   - Build Command: `npm run build` 또는 비워두기 (vercel.json 사용)
>   - Output Directory: `dist`
>   - Root Directory: 비워두기
> - Netlify: `netlify.toml` 파일이 이미 설정되어 있어 드래그 앤 드롭으로도 배포 가능합니다
> - GitHub Pages: `.github/workflows/deploy.yml` 파일이 있어 main 브랜치에 푸시하면 자동 배포됩니다

---

## 📊 진행 상황

### 완료된 작업
- ✅ **레이어드 아키텍처**: Domain, Service, Util, Controller 레이어로 구조화
  - Domain: Vector, Body, Block, Tower, GameState (도메인 모델)
  - Service: PhysicsService, GravityService, ScoreService (비즈니스 로직)
  - Util: CollisionUtil, TorqueUtil, BalanceUtil (유틸리티)
  - Controller: GameController (게임 로직 조율, 입력 처리)
- ✅ **Vector 클래스**: 2D 벡터 연산 (덧셈, 뺄셈, 내적, 외적, 회전 등)
- ✅ **Body 클래스**: 물리 객체 (위치, 속도, 질량, 관성 모멘트, 토크 등)
- ✅ **Block 클래스**: 게임 블록 도메인 모델 (Body 확장, 게임 특화 속성)
- ✅ **Tower 클래스**: 타워 도메인 모델 (블록 컬렉션 관리, 안정성 평가)
- ✅ **GameState 클래스**: 게임 상태 도메인 모델 (점수, 게임 오버 등)
- ✅ **GravityService**: 중력 힘 적용 및 설정
- ✅ **CollisionUtil**: AABB 충돌 감지 및 해결 (위치 보정, 임펄스 적용)
- ✅ **TorqueUtil**: 토크 계산/적용, 각운동 업데이트, 각속도 제한
- ✅ **BalanceUtil**: 지지 영역 기반 안정성 판정, 허용 오프셋 계산
- ✅ **PhysicsService**: 모든 물리 시스템 통합, Body 관리, 이벤트 콜백
- ✅ **ScoreService**: 점수 계산 서비스 (최대 높이 기반 점수 계산)
- ✅ **GameController**: 게임 컨트롤러 (게임 루프, 입력 처리, 블록 생성/배치, 점수 관리, 게임 오버 처리)
- ✅ **CanvasRenderer**: Canvas 렌더러 (블록, 타워, 물리 객체 시각화)
- ✅ **UI**: UI 렌더러 (점수, 게임 오버, 일시정지, 시작 화면) - 한글화 완료
- ✅ **웹 진입점**: index.html, main.js (키보드/마우스/터치 입력 지원)
- ✅ **테스트**: 총 177개 테스트 케이스 통과
- ✅ **배포**: Netlify를 통한 자동 배포 완료

### v1.0.1 변경사항 (2025-01-24)
- ✅ **UI 한글화**: 모든 게임 텍스트를 한국어로 변경
- ✅ **UI 개선**: AD 키 설명 제거 (좌우 이동 기능 제거됨)
- ✅ **라운드 표시 제거**: 게임에 라운드 개념이 없으므로 UI에서 제거
- ✅ **버그 수정**: 배치된 블록이 떨어져도 게임 오버가 감지되지 않던 문제 수정

### v1.1.0 변경사항 (2025-01-24)
- ✅ **카메라 시스템 추가**: 타워가 높아지면 화면이 자동으로 따라올라가도록 구현
  - 타워 높이가 블록 높이의 4배 이상 쌓이면 카메라가 부드럽게 위로 이동
  - 베이스와 블록 생성 위치는 화면 하단에 고정되어 보임
  - 물리 좌표는 변경하지 않고 뷰만 이동하도록 구현
- ✅ **블록 안정성 개선**: 블록이 블록 위에 올라갔을 때 불안정하게 움직이는 문제 개선
  - 접촉 중인 블록의 수평 속도 및 각속도 감쇠 강화
  - 블록 배치 시 즉시 안정화 처리 (속도/각속도 리셋, 각도 스냅)
- ✅ **충돌 처리 개선**: 살짝 어긋난 블록도 자연스럽게 착지하도록 개선
  - 충돌 normal 계산 로직 개선 (상대 속도, 중심선 정렬, 정적 객체 여부 고려)
  - 수직 normal 우선 적용으로 옆으로 튕기는 현상 감소

### 다음 단계
1. 게임 테스트 및 버그 수정
2. 애니메이션 및 효과 구현 (선택)
3. 성능 최적화 (선택)
