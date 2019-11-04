import { TWITCH_API_BASE } from './constants';

export const getAuthorizationHeader = () => ({
  Authorization: `Bearer ${localStorage.accessToken}`,
});

export const apiRequest = (url) =>
  fetch(url, {
    headers: getAuthorizationHeader(),
  }).then((response) => response.json());

/*
{
  "data": [{
    "id": "44322889",
    "login": "dallas",
    "display_name": "dallas",
    "type": "staff",
    "broadcaster_type": "",
    "description": "Just a gamer playing games and chatting. :)",
    "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
    "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
    "view_count": 191836881,
    "email": "login@provider.com"
  }]
}
*/
export const fetchUser = (id) =>
  apiRequest(`${TWITCH_API_BASE}/users?id=${id}`);

export const fetchRecentMessages = (channel) =>
  fetch(
    `https://recent-messages.robotty.de/api/v2/recent-messages/${channel}?clearchatToNotice=true`,
  ).then((response) => response.json());
