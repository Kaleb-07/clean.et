<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Chapa – Ethiopian Payment Gateway
    | Docs: https://developer.chapa.co / https://docs.chapa.global/docs/v2
    |--------------------------------------------------------------------------
    | Set CHAPA_MODE=test  to use test keys (default).
    | Set CHAPA_MODE=live  when going to production.
    |
    | Test phone numbers (Direct Charge / mobile-money):
    |   251900000000 → success
    |   251911111111 → INSUFFICIENT_FUNDS
    |   251922222222 → USER_CANCELLED
    |   251933333333 → timeout / incomplete
    */
    'chapa' => [
        'mode'          => env('CHAPA_MODE', 'test'),
        'secret_key'    => env('CHAPA_SECRET_KEY', ''),
        'base_url'      => env('CHAPA_BASE_URL', 'https://api.chapa.global/v2'),
        'webhook_secret' => env('CHAPA_WEBHOOK_SECRET', ''),
    ],

];
