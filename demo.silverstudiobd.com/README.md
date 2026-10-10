# Silver Studio application

This directory contains the Laravel application and its React/Vite frontend. Run Composer, Artisan, and Yarn commands here.

See the [repository setup and deployment guide](../README.md) for installation, the cPanel export layout, and excluded runtime files.

```sh
composer install
cp .env.example .env
php artisan key:generate
yarn install --frozen-lockfile
yarn build
```

Configure the local database and service credentials in `.env` before running migrations or starting the application.
