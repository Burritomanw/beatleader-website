import createHttpStore from './http-store';
import beatSaverEnhancer from './enhancers/leaderboard/beatsaver'
import accEnhancer from './enhancers/scores/acc'
import beatSaviorEnhancer from './enhancers/scores/beatsavior'
import rankedsEnhancer from './enhancers/leaderboard/rankeds'
import compareEnhancer from './enhancers/scores/compare'
import diffEnhancer from './enhancers/scores/diff'
import {debounce} from '../../utils/debounce'
import {opt} from '../../utils/js'
import createApiScoresProvider from './providers/api-scores'
import produce, {applyPatches} from 'immer'

export default (playerId = null, type = 'recent', page = 1, initialState = null, initialStateType = 'initial') => {
  let currentPlayerId = playerId;
  let currentType = type;
  let currentPage = page ? page : 1;

  const getCurrentEnhanceTaskId = () => `${currentPlayerId}/${currentPage}/${currentType}`;
  const getPatchId = (playerId, scoreRow) => `${playerId}/${opt(scoreRow, 'leaderboard.leaderboardId')}`

  let enhancePatches = {};
  let currentEnhanceTaskId = null;

  const onNewData = ({fetchParams, state, stateType, set}) => {
    currentPage = opt(fetchParams, 'page', 1);
    currentType = opt(fetchParams, 'type', null);
    currentPlayerId = opt(fetchParams, 'playerId', null);

    if (!state || !Array.isArray(state)) return;

    const enhanceTaskId = getCurrentEnhanceTaskId();
    if (currentEnhanceTaskId !== enhanceTaskId) {
      enhancePatches = {}
      currentEnhanceTaskId = enhanceTaskId;
    }

    const stateProduce = (state, patchId, producer) => produce(state, producer, patches => {
      if (!enhancePatches[patchId]) enhancePatches[patchId] = [];

      enhancePatches[patchId].push(...patches)
    })

    const debouncedSetState = debounce((enhanceTaskId, state) => {
      if (currentEnhanceTaskId !== enhanceTaskId) return;

      set(state);
    }, 100);

    const newState = [...state];

    const setStateRow = (enhanceTaskId, scoreRow) => {
      if (currentEnhanceTaskId !== enhanceTaskId) return null;

      const patchId = getPatchId(currentPlayerId, scoreRow)
      const stateRowIdx = newState.findIndex(s => getPatchId(currentPlayerId, s) === patchId)
      if (stateRowIdx < 0) return;

      newState[stateRowIdx] = applyPatches(newState[stateRowIdx], enhancePatches[patchId]);

      debouncedSetState(enhanceTaskId, newState);

      return newState[stateRowIdx];
    }

    for (const scoreRow of newState) {
      stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => beatSaverEnhancer(draft))
        .then(scoreRow => stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => accEnhancer(draft)))
        .then(scoreRow => setStateRow(enhanceTaskId, scoreRow))
        .then(scoreRow => stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => diffEnhancer(draft, currentPlayerId)))
        .then(scoreRow => setStateRow(enhanceTaskId, scoreRow))
        .then(scoreRow => stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => compareEnhancer(draft, currentPlayerId)))
        .then(scoreRow => setStateRow(enhanceTaskId, scoreRow))

      stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => rankedsEnhancer(draft))
        .then(scoreRow => setStateRow(enhanceTaskId, scoreRow))

      if (stateType && stateType === 'live')
        stateProduce(scoreRow, getPatchId(currentPlayerId, scoreRow), draft => beatSaviorEnhancer(draft, currentPlayerId))
          .then(scoreRow => setStateRow(enhanceTaskId, scoreRow))
    }
  }

  const provider = createApiScoresProvider();

  const httpStore = createHttpStore(
    provider,
    {playerId, type, page},
    initialState,
    {
      onInitialized: onNewData,
      onAfterStateChange: onNewData,
      onSetPending: ({fetchParams}) => ({...fetchParams}),
    },
    initialStateType
  );

  const fetch = async (page, type = currentType, playerId = currentPlayerId, force = false) => {
    if (
      (!playerId || playerId === currentPlayerId) &&
      (!type || type === currentType) &&
      (!page || page === currentPage) &&
      !force
    )
      return false;

    return httpStore.fetch({playerId, type, page}, force, provider, !playerId || playerId !== currentPlayerId);
  }

  const refresh = async () => fetch(currentPage, currentType, currentPlayerId, true);

  return {
    ...httpStore,
    fetch,
    refresh,
    getPlayerId: () => currentPlayerId,
    getPage: () => currentPage,
    getType: () => currentType,
  }
}

