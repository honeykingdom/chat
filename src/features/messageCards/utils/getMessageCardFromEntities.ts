import type {
  MessageEntity,
  MessageCardInfo,
} from 'features/messages/messagesSlice';

// https://regex101.com/r/jGbDV1/5
const twitchClipRegex = /^(?:https?:\/\/)?(?:clips\.twitch\.tv\/|(?:www\.|m\.)?twitch\.tv\/(?:[\d\w]+)\/clip\/)([\d\w-]+)(?:\?.+)?$/;

// https://regex101.com/r/xsgeA4/4
const twitchVideoRegex = /^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/videos\/(\d+)(?:\?.+)?$/;

// https://regexr.com/3dj5t
const youtubeVideoRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?(?:youtube\.com|youtu.be)(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

const getMessageCardFromEntities = (
  entities: MessageEntity[],
  [parseTwitch, parseYoutube]: [boolean, boolean] = [true, true],
): MessageCardInfo | null => {
  if (!parseTwitch && !parseYoutube) return null;

  // eslint-disable-next-line no-restricted-syntax
  for (const entity of entities) {
    if (typeof entity === 'object' && entity.type === 'link') {
      if (parseTwitch) {
        // twitch clip
        let m = twitchClipRegex.exec(entity.text);

        if (m) {
          return {
            type: 'twitch-clip',
            id: m[1],
            url: entity.href,
          };
        }

        // twitch video
        m = twitchVideoRegex.exec(entity.text);

        if (m) {
          return {
            type: 'twitch-video',
            id: m[1],
            url: entity.href,
          };
        }
      }

      if (parseYoutube) {
        // youtube video
        const m = youtubeVideoRegex.exec(entity.text);

        if (m) {
          return {
            type: 'youtube-video',
            id: m[4],
            url: entity.href,
          };
        }
      }
    }
  }

  return null;
};

export default getMessageCardFromEntities;
