import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as twitchIrc from '@honeykingdom/twitch-simple-irc';
import { usePrevious } from 'react-use';

import { NOTICE_MESSAGE_TAGS, LS_ACCESS_TOKEN } from 'utils/constants';
import {
  updateIsConnected,
  updateGlobalUserParams,
  updateUserParams,
  updateRoomParams,
} from 'features/chat/chatSlice';
import { receiveMessage, clearChat } from 'features/messages/messagesSlice';
import { invalidateAuth } from 'features/auth/authSlice';
import {
  currentChannelSelector,
  isConnectedSelector,
} from 'features/chat/chatSelectors';
import {
  isAuthSelector,
  isAuthReadySelector,
  userLoginSelector,
} from 'features/auth/authSelectors';
import replaceEmojis from 'features/messages/utils/replaceEmojis';

const useTwitchClient = () => {
  const dispatch = useDispatch();

  const isAuthReady = useSelector(isAuthReadySelector);
  const isAuth = useSelector(isAuthSelector);
  const userLogin = useSelector(userLoginSelector);
  const isConnected = useSelector(isConnectedSelector);
  const currentChannel = useSelector(currentChannelSelector);
  const prevChannel = usePrevious(currentChannel);
  const clientRef = useRef<twitchIrc.Client | null>(null);

  const registerEvents = useCallback(
    (client: typeof clientRef) => {
      if (!client.current) return;

      const handleRegister = () => dispatch(updateIsConnected(true));

      const handleDisconnect = () => dispatch(updateIsConnected(false));

      const handleGlobalUserState = (data: twitchIrc.GlobalUserStateEvent) =>
        dispatch(updateGlobalUserParams(data));

      const handleUserState = (data: twitchIrc.UserStateEvent) =>
        dispatch(updateUserParams(data));

      const handleRoomState = (data: twitchIrc.RoomStateEvent) =>
        dispatch(updateRoomParams(data));

      const handleMessage = (message: twitchIrc.MessageEvent) => {
        dispatch(receiveMessage({ type: 'message', message }));
      };

      const handleNotice = (message: twitchIrc.NoticeEvent) => {
        if (
          client.current &&
          message.message === 'Login authentication failed'
        ) {
          dispatch(invalidateAuth());
          // eslint-disable-next-line no-param-reassign
          client.current = null;
          return;
        }

        dispatch(receiveMessage({ type: 'notice', message }));
      };

      const handleUserNotice = (message: twitchIrc.UserNoticeEvent) =>
        dispatch(receiveMessage({ type: 'user-notice', message }));

      const handleClearChat = (data: twitchIrc.ClearChatEvent) => {
        if (!data.tags.targetUserId) return;
        dispatch(clearChat(data));
      };

      client.current.on('register', handleRegister);
      client.current.on('disconnect', handleDisconnect);
      client.current.on('globaluserstate', handleGlobalUserState);
      client.current.on('userstate', handleUserState);
      client.current.on('roomstate', handleRoomState);
      client.current.on('message', handleMessage);
      client.current.on('notice', handleNotice);
      client.current.on('usernotice', handleUserNotice);
      client.current.on('clearchat', handleClearChat);
    },
    [dispatch],
  );

  useEffect(
    () => () => {
      if (clientRef.current) {
        clientRef.current = null;
      }
    },
    [clientRef],
  );

  useEffect(() => {
    if (!currentChannel || !isAuthReady) return;

    if (!clientRef.current) {
      const options = isAuth
        ? {
            name: userLogin as string,
            auth: localStorage.getItem(LS_ACCESS_TOKEN) as string,
          }
        : null;

      (async () => {
        clientRef.current = twitchIrc.Client.create(options);

        registerEvents(clientRef);

        await clientRef.current.connect();

        clientRef.current.join(currentChannel);
      })();

      return;
    }

    if (prevChannel && prevChannel !== currentChannel) {
      clientRef.current.part(prevChannel);
      clientRef.current.join(currentChannel);
    }
  }, [
    dispatch,
    registerEvents,
    isAuth,
    isAuthReady,
    isConnected,
    userLogin,
    currentChannel,
    prevChannel,
  ]);

  const sendMessage = useCallback(
    (channel: string, message: string) => {
      if (!clientRef.current || !message.trim()) return;

      const normalizedMessage = replaceEmojis(message.trim());

      clientRef.current.say(channel, normalizedMessage);

      function handleUserState(data: twitchIrc.UserStateEvent) {
        if (data.channel === channel) {
          const ownMessage = {
            message: normalizedMessage,
            channel,
            tags: data.tags,
          };

          dispatch(
            receiveMessage({ type: 'own-message', message: ownMessage }),
          );

          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          removeListeners();
        }
      }

      function handleNotice(data: twitchIrc.NoticeEvent) {
        if (
          data.channel === channel &&
          NOTICE_MESSAGE_TAGS.includes(data.tags.msgId)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define
          removeListeners();
        }
      }

      function removeListeners() {
        if (!clientRef.current) return;

        clientRef.current.off('notice', handleNotice);
        clientRef.current.off('userstate', handleUserState);
      }

      clientRef.current.on('notice', handleNotice);
      clientRef.current.on('userstate', handleUserState);

      setTimeout(() => removeListeners(), 10000);
    },
    [clientRef, dispatch],
  );

  return { sendMessage };
};

export default useTwitchClient;
