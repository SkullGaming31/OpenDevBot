import React from 'react';

export default function ConnectPage() {
    // Use existing backend OAuth endpoint to begin the flow
    return (
        <section>
            <h2>Connect OpenDevBot to Twitch</h2>
            <p>
                Click the button below to authorize the bot for your channel. You'll be redirected back to this dashboard after
                authorization.
            </p>
            <p>
                <a href="/api/v1/auth/twitch">Connect with Twitch</a>
            </p>
        </section>
    );
}
