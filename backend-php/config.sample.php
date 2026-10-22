<?php
// Copy to config.php (same folder) and fill in. config.php is git-ignored.
// On Hostinger: hPanel → Databases → MySQL Databases gives the host/name/user.
return [
    'db' => [
        'host'     => 'localhost',
        'port'     => 3306,
        'name'     => 'u123456789_priceintel',
        'user'     => 'u123456789_priceintel',
        'password' => 'change-me',
    ],

    // Shared secret for the scraper endpoints (/models/sync, /scrape/*).
    // Put the same value in the GitHub repo secret SCRAPE_TOKEN.
    // Generate one with: php -r "echo bin2hex(random_bytes(24));"
    'scrape_token' => 'change-me-to-a-long-random-string',

    // Allowed browser origin for the dashboard. When the dashboard and the API
    // share a domain (public_html + public_html/api) CORS isn't used at all;
    // '*' keeps local `npm run dev` working against the live API.
    'cors_origin' => '*',

    // GoFix model master that seeds the product catalog.
    'model_api' => [
        'base_url'   => 'https://dotsmart-003-site10.gtempurl.com',
        // 1 = Smart Phones, 2 = Tablets, 3 = Smart Watches, 4 = Laptops.
        'device_ids' => [1],
    ],
];
