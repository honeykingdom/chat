/* eslint-disable no-param-reassign */
import { PayloadAction } from '@reduxjs/toolkit';

import {
  FfzEmote,
  FfzGlobalEmotesResponse,
  FfzChannelEmotesResponse,
} from 'api/ffz';
import { FetchFlags, initialFetchFlags } from 'utils/constants';
import setFetchFlags from 'utils/setFetchFlags';
import { ChatState } from 'features/chat/slice';
import {
  parseFfzGlobalEmotes,
  parseFfzChannelEmotes,
} from 'features/chat/utils/parseApiResponse';

export interface FfzEmotesState {
  global: {
    items: FfzEmote[];
  } & FetchFlags;
  byChannels: {
    [channel: string]: {
      items: FfzEmote[];
    } & FetchFlags;
  };
}

export const ffzEmotesInitialState: FfzEmotesState = {
  global: {
    ...initialFetchFlags,
    items: [],
  },
  byChannels: {},
};

const ffzChannelEmotesInitialState = {
  ...initialFetchFlags,
  items: [],
};

export const ffzEmotesReducers = {
  fetchFfzGlobalEmotesRequest: (state: ChatState) => {
    setFetchFlags(state.ffzEmotes.global, 'request');
  },

  fetchFfzGlobalEmotesSuccess: (
    state: ChatState,
    { payload }: PayloadAction<FfzGlobalEmotesResponse>,
  ): void => {
    state.ffzEmotes.global.items = parseFfzGlobalEmotes(payload);

    setFetchFlags(state.ffzEmotes.global, 'success');
  },

  fetchFfzGlobalEmotesFailure: (
    state: ChatState,
    { payload }: PayloadAction<string>,
  ): void => {
    setFetchFlags(state.ffzEmotes.global, 'failure', payload);
  },

  fetchFfzChannelEmotesRequest: (
    state: ChatState,
    { payload }: PayloadAction<{ channel: string }>,
  ): void => {
    const { channel } = payload;

    if (!state.ffzEmotes.byChannels[channel]) {
      state.ffzEmotes.byChannels[channel] = ffzChannelEmotesInitialState;
    }

    setFetchFlags(state.ffzEmotes.byChannels[channel], 'request');
  },

  fetchFfzChannelEmotesSuccess: (
    state: ChatState,
    {
      payload,
    }: PayloadAction<{ channel: string; data: FfzChannelEmotesResponse }>,
  ): void => {
    const { channel, data } = payload;

    state.ffzEmotes.byChannels[channel].items = parseFfzChannelEmotes(data);

    setFetchFlags(state.ffzEmotes.byChannels[channel], 'success');
  },

  fetchFfzChannelEmotesFailure: (
    state: ChatState,
    { payload }: PayloadAction<{ channel: string; error: string }>,
  ): void => {
    const { channel, error } = payload;

    setFetchFlags(state.ffzEmotes.byChannels[channel], 'failure', error);
  },
};