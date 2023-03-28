import axios from 'axios';
axios.defaults;
import '../interfaces/TwitchAPIUser';

// interface TwitchAPIUser {
//     id: string;
//     login: string;
//     display_name: string;
//     type: string;
//     broadcaster_type: string;
//     description: string;
//     profile_image_url: string;
//     offline_image_url: string;
//     email: string;
//     created_at: string;
// }

const helixBaseUrl = 'https://api.twitch.tv/helix';
const helix = axios.create({ baseURL: helixBaseUrl });

export async function getUser<TwitchAPIUser>({ token } : { token: string}) {
	const response = await helix.get('/users', {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Client-Id': process.env.TWITCH_CLIENT_ID
		}
	});
	// console.log(response.data);
	return response.data.data[0] || null;
}