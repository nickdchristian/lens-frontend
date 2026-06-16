import { expect, test, describe } from 'vitest';

import { state } from '../state.js';

describe('Global State', () => {
  test('should initialize with default values', () => {
    expect(state).toBeDefined();
    expect(state.currentTab).toBe('dashboard');
    expect(state.allEvents).toEqual([]);
    expect(state.selectedRepository).toBe('All');
    expect(state.searchQuery).toBe('');
    expect(state.groupBy).toBe('None');
    expect(state.historySearchQuery).toBe('');
  });

  test('should be mutable', () => {
    state.currentTab = 'settings';
    expect(state.currentTab).toBe('settings');
    
    state.allEvents = [{ id: 1, name: 'test' }];
    expect(state.allEvents.length).toBe(1);
    expect(state.allEvents[0].id).toBe(1);
  });
});
