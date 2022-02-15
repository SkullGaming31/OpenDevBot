const config = require('../../config');

const axios = require('axios').default;

/**
 * @typedef TwitchAPIUser
 * @prop {string} id the users id
 * @prop {string} login the Users username
 * @prop {string} display_name the users twitch Display Name
 * @prop {string} type not sure
 * @prop {string} broadcaster_type Regular Streamer, Affiliate, Partner
 * @prop {string} discription The Channels Description
 * @prop {string} profile_image_url URL to there Twitch Profile Picture
 * @prop {string} offline_image_url URL to there offline image
 * @prop {int} view_count the channels view count
 * @prop {string} email the channels Email(if the email scope is specified)
 * @prop {string} created_at date for when they created there twitch account
 */

/**
 * @param {*} options
 * @param {string} options.token the Oauth token for the expected user
 * @returns {TwitchAPIUser}
 */

const helixBaseUrl = 'https://api.twitch.tv/helix';
const helix = axios.create({
	baseURL: helixBaseUrl
});
async function getUser({ token } = { }) {
	const response = await helix.get('/users', {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Client-Id': config.TWITCH_CLIENT_ID
		}
	});
	return response.data.data[0] || null;
}

async function getGoals({ token } = {}) {
	const {data: { data }} = await helix.get('/goals', {
		headers: {
			'Authorization': `Bearer ${token}`,
			'Client-Id': config.TWITCH_CLIENT_ID
		}
	});
	return data[0] || null;
}

module.exports = { 
	getUser,
	getGoals
};