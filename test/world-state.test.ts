import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldStateModel } from '../src/environment/world-state.js';

test('tracks uncertainty and reconciles action-conditioned predictions', () => {
  const world = new WorldStateModel();
  world.observe({ key: 'door.state', value: 'closed', source: 'camera', confidence: 0.9, observedAt: 1 });
  world.observe({ key: 'door.state', value: 'open', source: 'weak-sensor', confidence: 0.3, observedAt: 2 });
  assert.equal(world.belief('door.state')?.value, 'closed');

  const predicted = world.predict({ type: 'open-door' }, (state) => ({
    ...state,
    'door.state': { ...state['door.state'], value: 'open' },
  }));
  world.observe({ key: 'door.state', value: 'open', source: 'camera', confidence: 1, observedAt: 3 });
  assert.equal(world.reconcile(predicted, ['door.state']).matched, true);
});
