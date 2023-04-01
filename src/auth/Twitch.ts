import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { AccessTokenModel } from '../database/models/accessToken';

// Define the model for access tokens

// Twitch API configuration
const twitchClientId = process.env.TWITCH_CLIENT_SECRET as string;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET as string;
const twitchRedirectUri = 'http://localhost:3001/auth/twitch/callback';

export const twitchRouter = Router();

// Define the routes for authentication
twitchRouter.get('/twitch', (req: Request, res: Response) => {
	res.send('Testing');
});
twitchRouter.get('/auth/twitch', (req: Request, res: Response) => {
	// Redirect the user to the Twitch authorization page
	const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitchClientId}&redirect_uri=${twitchRedirectUri}&scope=user:read:email`;
	res.redirect(twitchAuthUrl);
});

twitchRouter.get('/auth/twitch/callback', async (req, res) => {
	const { code } = req.query;

	try {
		// Exchange the authorization code for an access token
		const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
			params: {
				client_id: twitchClientId,
				client_secret: twitchClientSecret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: twitchRedirectUri,
			},
		});

		// Save the access token to the database
		const { access_token, refresh_token, scope, expires_in } = tokenResponse.data;
		const scopes = scope.split(' ');
		await saveAccessToken(access_token, refresh_token, scopes);

		// Redirect the user to the success page
		res.redirect('/auth/success');
	} catch (error) {
		console.error('Error exchanging authorization code for access token:', error);
		res.redirect('/auth/error');
	}
});

// Save an access token to the database
const saveAccessToken = async (accessToken: string, refreshToken: string, scopes: string[]) => {
	const newAccessToken = new AccessTokenModel({
		accessToken,
		refreshToken,
		scopes,
	});
	try {
		const savedAccessToken = await newAccessToken.save();
		console.log('Access token saved:', savedAccessToken);
	} catch (error) {
		console.error('Error saving access token:', error);
	}
};

// Update an access token in the database with expiresIn and obtainmentTimestamp
const updateAccessToken = async (accessToken: string, expiresIn: number, obtainmentTimestamp: number) => {
	try {
		const updatedAccessToken = await AccessTokenModel.findOneAndUpdate(
			{ accessToken },
			{ expiresIn, obtainmentTimestamp },
			{ new: true },
		);
		console.log('Accesstoken updated:', updatedAccessToken);
	} catch (error) {
		console.error('Error updating access token:', error);
	}
};