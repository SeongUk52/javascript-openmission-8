import { jest } from '@jest/globals';
import { GameState } from '../src/domain/GameState.js';

// Node.js 환경에서 localStorage 모킹
const mockLocalStorage = {
  store: {},
  getItem: jest.fn((key) => mockLocalStorage.store[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.store[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.store = {};
  }),
};

// global 객체에 localStorage 추가
global.localStorage = mockLocalStorage;

describe('GameState', () => {
  let gameState;

  beforeEach(() => {
    // localStorage 초기화
    mockLocalStorage.store = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    
    gameState = new GameState();
  });

  describe('생성자', () => {
    test('기본값으로 게임 상태를 생성한다', () => {
      expect(gameState.score.getValue()).toBe(0);
      expect(gameState.round).toBe(0);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.startTime).toBeNull();
      expect(gameState.endTime).toBeNull();
      expect(gameState.highScore.getValue()).toBe(0);
    });

    test('옵션으로 게임 상태를 생성한다', () => {
      const state = new GameState({
        initialScore: 100,
        initialRound: 5,
      });

      expect(state.score.getValue()).toBe(100);
      expect(state.round).toBe(5);
    });
  });

  describe('start', () => {
    test('게임을 시작한다', () => {
      gameState.start();

      expect(gameState.isPlaying).toBe(true);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.startTime).not.toBeNull();
      expect(gameState.endTime).toBeNull();
      expect(gameState.score.getValue()).toBe(0);
      expect(gameState.round).toBe(0);
    });
  });

  describe('end', () => {
    test('게임을 종료한다', () => {
      gameState.start();
      gameState.addScore(100);

      gameState.end();

      expect(gameState.isPlaying).toBe(false);
      expect(gameState.isGameOver).toBe(true);
      expect(gameState.endTime).not.toBeNull();
    });

    test('최고 점수를 업데이트한다', () => {
      mockLocalStorage.store['towerGame_highScore'] = '50';
      const state = new GameState();
      
      state.start();
      state.addScore(100);
      state.end();

      expect(state.highScore.getValue()).toBe(100);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('towerGame_highScore', '100');
    });

    test('최고 점수보다 낮으면 업데이트하지 않는다', () => {
      mockLocalStorage.store['towerGame_highScore'] = '200';
      const state = new GameState();
      
      state.start();
      state.addScore(100);
      state.end();

      expect(state.highScore.getValue()).toBe(200);
    });
  });

  describe('pause', () => {
    test('게임을 일시정지한다', () => {
      gameState.start();
      gameState.pause();

      expect(gameState.isPaused).toBe(true);
    });

    test('게임이 시작되지 않았으면 일시정지하지 않는다', () => {
      gameState.pause();
      expect(gameState.isPaused).toBe(false);
    });

    test('게임이 종료되었으면 일시정지하지 않는다', () => {
      gameState.start();
      gameState.end();
      gameState.pause();

      expect(gameState.isPaused).toBe(false);
    });
  });

  describe('resume', () => {
    test('게임을 재개한다', () => {
      gameState.start();
      gameState.pause();
      gameState.resume();

      expect(gameState.isPaused).toBe(false);
    });
  });

  describe('addScore', () => {
    test('점수를 추가한다', () => {
      gameState.start();
      gameState.addScore(10);

      expect(gameState.score.getValue()).toBe(10);

      gameState.addScore(20);
      expect(gameState.score.getValue()).toBe(30);
    });

    test('게임이 시작되지 않았으면 점수를 추가하지 않는다', () => {
      gameState.addScore(10);
      expect(gameState.score.getValue()).toBe(0);
    });

    test('게임이 종료되었으면 점수를 추가하지 않는다', () => {
      gameState.start();
      gameState.end();
      gameState.addScore(10);

      expect(gameState.score.getValue()).toBe(0);
    });
  });

  describe('setScore', () => {
    test('점수를 설정한다', () => {
      gameState.start();
      gameState.setScore(100);

      expect(gameState.score.getValue()).toBe(100);

      gameState.setScore(50);
      expect(gameState.score.getValue()).toBe(50);
    });

    test('음수 점수는 0으로 설정된다', () => {
      gameState.start();
      gameState.setScore(-10);

      expect(gameState.score.getValue()).toBe(0);
    });

    test('게임이 시작되지 않았으면 점수를 설정하지 않는다', () => {
      gameState.setScore(100);
      expect(gameState.score.getValue()).toBe(0);
    });

    test('게임이 종료되었으면 점수를 설정하지 않는다', () => {
      gameState.start();
      gameState.end();
      gameState.setScore(100);

      expect(gameState.score.getValue()).toBe(0);
    });
  });

  describe('incrementRound', () => {
    test('라운드를 증가시킨다', () => {
      gameState.start();
      gameState.incrementRound();

      expect(gameState.round).toBe(1);

      gameState.incrementRound();
      expect(gameState.round).toBe(2);
    });

    test('게임이 시작되지 않았으면 라운드를 증가시키지 않는다', () => {
      gameState.incrementRound();
      expect(gameState.round).toBe(0);
    });

    test('게임이 종료되었으면 라운드를 증가시키지 않는다', () => {
      gameState.start();
      gameState.end();
      gameState.incrementRound();

      expect(gameState.round).toBe(0);
    });
  });

  describe('getElapsedTime', () => {
    test('경과 시간을 반환한다', () => {
      gameState.start();
      
      // 시간이 지난 것처럼 시뮬레이션
      const startTime = Date.now() - 5000; // 5초 전
      gameState.startTime = startTime;

      const elapsed = gameState.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });

    test('게임이 시작되지 않았으면 0을 반환한다', () => {
      expect(gameState.getElapsedTime()).toBe(0);
    });

    test('게임이 종료되었으면 종료 시점까지의 시간을 반환한다', () => {
      gameState.start();
      const startTime = Date.now() - 10000;
      const endTime = Date.now() - 5000;
      gameState.startTime = startTime;
      gameState.endTime = endTime;

      const elapsed = gameState.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(5);
    });
  });

  describe('reset', () => {
    test('게임 상태를 리셋한다', () => {
      gameState.start();
      gameState.addScore(100);
      gameState.incrementRound();
      gameState.pause();

      gameState.reset();

      expect(gameState.score.getValue()).toBe(0);
      expect(gameState.round).toBe(0);
      expect(gameState.isGameOver).toBe(false);
      expect(gameState.isPaused).toBe(false);
      expect(gameState.isPlaying).toBe(false);
      expect(gameState.startTime).toBeNull();
      expect(gameState.endTime).toBeNull();
    });
  });
});

