import React from 'react';
import styled from 'styled-components';

import type { Notice as NoticeType } from 'features/messages/messagesSlice';

const NoticeRoot = styled.div<{ $isEven: boolean }>`
  padding: 5px 20px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 20px;
  word-wrap: break-word;
  background-color: ${(p) => (p.$isEven ? '#1f1925' : 'transparent')};
`;

type Props = {
  message: NoticeType;
  isEven: boolean;
};

const Notice = ({ message: { message }, isEven }: Props) => (
  <NoticeRoot $isEven={isEven}>{message}</NoticeRoot>
);

export default Notice;
