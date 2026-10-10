# Silver Studio

Silver Studio storefront and administration application, built with Laravel 10, React 18, TypeScript, and Vite. This repository contains the local cPanel source export.

## Repository layout

- `demo.silverstudiobd.com/`: complete Laravel application, dependency manifests, migrations, and frontend source. Run Composer, Artisan, and Yarn from this directory.
- `index.php`, `.htaccess`, `css/`, `js/`, `images/`, and `webfonts/`: exported cPanel document root and static assets. The root entry point loads the nested Laravel application.
- Root `app/`, `resources/`, `routes/`, and `deploy-overrides/`: deployment override copies retained from the export. Some differ from the nested application; review them before applying changes. The nested application is the runtime source loaded by `index.php` and used by Vite.

## Local setup

Install PHP compatible with `composer.lock`, Composer, Node.js, Yarn Classic, and MySQL. The manifest requires PHP 8.1 or newer; locked dependencies may require a newer version.

```sh
cd demo.silverstudiobd.com
composer install
cp .env.example .env
php artisan key:generate
yarn install --frozen-lockfile
```

Set your database and integration credentials in `.env`. For a new local database, run `php artisan migrate`; run seeders only if their supplied demo data is wanted. Build the frontend with `yarn build`, or use `yarn dev` for development.

## Deployment

The exported root `index.php` expects the Laravel application in `demo.silverstudiobd.com/`. The root `.htaccess` retains the exported cPanel handler and media fallback rules; adjust these for your hosting environment.

Install production dependencies and rebuild Vite assets inside the nested application. The nested build writes to `demo.silverstudiobd.com/public/build`; the exported cPanel document root also needs the matching files at `build/`. Supply `.env`, uploaded media, and writable storage separately. Ensure the web server does not serve private application files from the nested directory.

## Excluded local files

Environment files, dependencies, generated builds, uploaded media, runtime caches and logs, database dumps, deployment ZIPs, and local tooling files are ignored. Geographic seed SQL under `demo.silverstudiobd.com/sql/` remains versioned. `.env.example` contains configuration placeholders; supply your own credentials locally.
