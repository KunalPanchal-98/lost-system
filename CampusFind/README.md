# CampusFind on XAMPP

CampusFind keeps the original multi-page interface and styles. Item reports and claim requests are saved in MySQL through `api.php`; the browser stores only the light/dark theme preference. Reports are associated with the PHP browser session so the existing **My Reports** page can list and delete reports made in that session.

## Setup

1. Install and open XAMPP, then start **Apache** and **MySQL**.
2. Copy this project folder into XAMPP's `htdocs` directory and name the copied folder `CampusFind`. The path should be `C:\xampp\htdocs\CampusFind\`.
3. Open `http://localhost/phpmyadmin/` in your browser.
4. Choose **Import**, select this project's `database.sql`, and import it. This creates the `campusfind_db` database, the `items` and `claims` tables, and the four example listings shown in the original frontend.
5. If your local MySQL account is not XAMPP's default `root` account with a blank password, update `$databaseUser` and `$databasePassword` near the top of `api.php`.
6. Open `http://localhost/CampusFind/`. Use the site through this URL; opening the HTML files directly from File Explorer will not run PHP requests.

## Included project files

- `index.html`, `browse.html`, `report-lost.html`, `report-found.html`, `my-reports.html`, and `item-details.html` are the original site pages.
- `assets/css/styles.css` and `assets/js/app.js` preserve the existing stylesheet and frontend behavior; the JavaScript now loads and submits records using `api.php`.
- `api.php` handles listing, details, report creation/deletion, and claim requests.
- `database.sql` creates the database and tables.

No sign-in system is included in the original project. **My Reports** is therefore scoped to the current PHP browser session; clearing the browser's session cookie or closing the browser may end access to those reports, but does not remove their database records.
