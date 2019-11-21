import pt from 'prop-types';
import { parse as twemojiParser } from 'twemoji-parser';
import emojilib from 'emojilib/emojis';
import urlRegex from 'url-regex';
import * as R from 'ramda';

import normalizeHref from 'utils/normalizeHref';

const TWITCH_EMOTES_CDN = '//static-cdn.jtvnw.net/emoticons/v1';
const BTTV_EMOTES_CDN = '//cdn.betterttv.net/emote';

const mentionRegex = /^@([\p{Letter}\p{Number}_]+)/u;
const linkRegex = urlRegex({ strict: false });

const normalizeEmotesFromTags = R.pipe(
  R.toPairs,
  R.map(([id, value]) => R.map((v) => ({ id, ...v }), value)),
  R.flatten,
);

const getFfzSrcSet = R.pipe(
  R.toPairs,
  R.map(([dpi, url]) => `${url} ${dpi}x`),
  R.join(', '),
);

export const createTwitchEmote = ({ id, code }) => ({
  type: 'twitch-emote',
  alt: code,
  src: `${TWITCH_EMOTES_CDN}/${id}/1.0`,
  srcSet: `${TWITCH_EMOTES_CDN}/${id}/1.0 1x, ${TWITCH_EMOTES_CDN}/${id}/2.0 2x, ${TWITCH_EMOTES_CDN}/${id}/3.0 4x`,
});
export const createBttvEmote = ({ id, code }) => ({
  type: 'bttv-emote',
  alt: code,
  src: `${BTTV_EMOTES_CDN}/${id}/1x`,
  srcSet: `${BTTV_EMOTES_CDN}/${id}/2x 2x, ${BTTV_EMOTES_CDN}/${id}/3x 4x`,
});
export const createFfzEmote = ({ name, urls }) => ({
  type: 'ffz-emote',
  alt: name,
  src: urls[1],
  srcSet: getFfzSrcSet(urls),
});
export const createEmoji = (alt, src) => ({
  type: 'emoji',
  alt: `:${alt}:`,
  src,
  srcSet: null,
});
export const createMention = (text, target) => ({
  type: 'mention',
  text,
  target,
});
export const createLink = (href) => ({
  type: 'link',
  text: href,
  href: normalizeHref(href),
});

export const twitchEmoteType = pt.shape({
  type: pt.oneOf(['twitch-emote']).isRequired,
  alt: pt.string.isRequired,
  src: pt.string.isRequired,
  srcSet: pt.string.isRequired,
});
export const bttvEmoteType = pt.shape({
  type: pt.oneOf(['bttv-emote']).isRequired,
  alt: pt.string.isRequired,
  src: pt.string.isRequired,
  srcSet: pt.string.isRequired,
});
export const ffzEmoteType = pt.shape({
  type: pt.oneOf(['ffz-emote']).isRequired,
  alt: pt.string.isRequired,
  src: pt.string.isRequired,
  srcSet: pt.string.isRequired,
});
export const emojiType = pt.shape({
  type: pt.oneOf(['emoji']).isRequired,
  alt: pt.string.isRequired,
  src: pt.string.isRequired,
  srcSet: pt.string,
});
export const mentionType = pt.shape({
  type: pt.oneOf(['mention']).isRequired,
  text: pt.string.isRequired,
  target: pt.string.isRequired,
});
export const linkType = pt.shape({
  type: pt.oneOf(['link']).isRequired,
  text: pt.string.isRequired,
  href: pt.string.isRequired,
});

const regexMap = {
  4: '>\\(', // '\\&gt\\;\\('
  9: '<3', // '\\&lt\\;3'
};

const findTwitchEmote = (name, items) =>
  R.find(({ id, code }) => {
    // 1-14 - match by regex
    if (id >= 1 && id <= 14) {
      const regexString = regexMap[id] || code;
      return RegExp(`^${regexString}$`).test(name);
    }

    return name === code;
  }, items);
const findTwitchEmoteInSets = (name, sets) => {
  // eslint-disable-next-line no-restricted-syntax
  for (const set of Object.values(sets)) {
    const result = findTwitchEmote(name, set);

    if (result) return result;
  }

  return null;
};

const findBttvEmote = (name, items) => R.find(R.propEq('code', name), items);
const findFfzEmote = (name, items) => R.find(R.propEq('name', name), items);
const findEmoji = (char) =>
  R.pipe(R.filter(R.propEq('char', char)), R.keys, R.head)(emojilib);

const findEntity = (word, emotes, { parseTwitch = false }) => {
  if (!emotes) return null;

  const {
    twitchGlobal,
    twitchUser,
    bttvGlobal,
    bttvChannel,
    ffzGlobal,
    ffzChannel,
  } = emotes;

  if (parseTwitch) {
    const twitchEmote =
      findTwitchEmoteInSets(word, twitchGlobal) ||
      findTwitchEmoteInSets(word, twitchUser);

    if (twitchEmote) {
      return createTwitchEmote({ id: twitchEmote.id, code: word });
    }
  }

  const bttvEmote =
    findBttvEmote(word, bttvGlobal) || findBttvEmote(word, bttvChannel);

  if (bttvEmote) {
    return createBttvEmote(bttvEmote);
  }

  const ffzEmote =
    findFfzEmote(word, ffzGlobal) || findFfzEmote(word, ffzChannel);

  if (ffzEmote) {
    return createFfzEmote(ffzEmote);
  }

  // Don't parse two or more emotes without spaces between
  // Don't parse emote if it's not in the emojilib package
  const emojiMatch = twemojiParser(word, { assetType: 'png' });

  if (
    emojiMatch &&
    emojiMatch.length === 1 &&
    emojiMatch[0].text.length === word.length
  ) {
    const emoji = findEmoji(word);

    if (emoji) {
      const [{ url }] = emojiMatch;

      return createEmoji(emoji, url);
    }
  }

  const mentionMatch = word.match(mentionRegex);

  if (mentionMatch) {
    const [text, target] = mentionMatch;

    return [
      createMention(text, target.toLowerCase()),
      word.length - text.length,
    ];
  }

  const linkMatch = word.match(linkRegex);

  if (linkMatch && linkMatch[0].length === word.length) {
    return createLink(word);
  }

  return null;
};

const formatMessage = (message, embeddedEmotes, emotes) => {
  // If the message was sent by the current user, there is no embedded emotes
  // So we need to parse twitch emotes manually

  const isOwnMessage = embeddedEmotes === undefined || embeddedEmotes === null;
  const hasEmbeddedEmotes =
    embeddedEmotes && Object.keys(embeddedEmotes).length > 0;
  const normalizedEmbeddedEmotes = normalizeEmotesFromTags(embeddedEmotes);

  const result = [];
  let offset = 0;
  // Before that offset all content was added to the result array
  let arrayOffset = 0;

  // Check every word. From offset to the next space index
  do {
    const spaceIndex = message.indexOf(' ', offset + 1);

    const isStart = offset === 0;
    const isEnd = spaceIndex === -1;

    const startIndex = isStart ? offset : offset + 1;
    const endIndex = isEnd ? message.length : spaceIndex;

    const word = message.substring(startIndex, endIndex);

    if (word) {
      let entity = null;

      // Check embedded twitch emotes
      if (hasEmbeddedEmotes) {
        const embeddedEmote = R.find(
          R.propEq('start', startIndex),
          normalizedEmbeddedEmotes,
        );

        if (embeddedEmote) {
          entity = createTwitchEmote({ id: embeddedEmote.id, code: word });
        }
      }

      // Check other entities
      if (!entity) {
        entity = findEntity(word, emotes, { parseTwitch: isOwnMessage });
      }

      if (entity) {
        // Push all text before this entity
        if (arrayOffset !== startIndex) {
          const textBefore = message.substring(arrayOffset, startIndex);
          result.push(textBefore);
        }

        // If entity it's an array it means entity may be not full word
        // The second element is the difference between word length and entity length
        if (Array.isArray(entity)) {
          const [entityObject, difference] = entity;
          result.push(entityObject);
          arrayOffset = endIndex - difference;
        } else {
          result.push(entity);
          arrayOffset = endIndex;
        }
      }
    }

    // If it's the last word and it wasn't added to the result add it now
    if (spaceIndex === -1 && arrayOffset !== endIndex) {
      const textAfter = message.substring(arrayOffset, endIndex);
      result.push(textAfter);
    }

    offset = spaceIndex;
  } while (offset !== -1);

  return result;
};

export default formatMessage;
