import options, {
  initialState,
  changeOption,
} from 'features/options/optionsSlice';

describe('options reducer', () => {
  it('should handle initial state', () => {
    expect(options(initialState, { type: '' })).toEqual(initialState);
  });

  it('should handle changeOption', () => {
    const action = {
      type: changeOption.type,
      payload: { name: 'fixedWidth', value: true },
    };

    const state = options(initialState, action);

    expect(state.fixedWidth).toBe(true);
  });
});
