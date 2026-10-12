<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sendJson(bool $success, $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        $success ? ['success' => true, 'data' => $data] : ['success' => false, 'message' => $data],
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function readJsonBody(): array
{
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        throw new InvalidArgumentException('Please send a valid JSON request.');
    }
    return $body;
}

function requiredText(array $data, string $key, string $label, int $maxLength): string
{
    $value = isset($data[$key]) && is_string($data[$key]) ? trim($data[$key]) : '';
    if ($value === '') {
        throw new InvalidArgumentException($label . ' is required.');
    }
    if (strlen($value) > $maxLength) {
        throw new InvalidArgumentException($label . ' is too long.');
    }
    return $value;
}

function validatePhone(string $phone): string
{
    if (strlen($phone) > 30 || !preg_match('/^[0-9+\s().-]+$/', $phone) || strlen(preg_replace('/\D/', '', $phone)) < 10) {
        throw new InvalidArgumentException('Please enter a valid contact phone number with at least 10 digits.');
    }
    return $phone;
}

function validateReportDate(string $value): string
{
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    $dateErrors = DateTime::getLastErrors();
    if (!$date || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0)) ||
        $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        throw new InvalidArgumentException('Please select a valid date that is today or earlier.');
    }
    return $value;
}

function formatItem(array $row): array
{
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'type' => $row['type'],
        'category' => $row['category'],
        'location' => $row['location'],
        'date' => $row['item_date'],
        'description' => $row['description'],
        'contactName' => $row['contact_name'],
        'contactPhone' => $row['contact_phone'],
        'email' => $row['contact_email'],
        'reporter' => $row['reporter'],
        'isUserReport' => $row['owner_token'] !== null,
        'submittedAt' => $row['created_at'],
        'claimCount' => isset($row['claim_count']) ? (int) $row['claim_count'] : 0
    ];
}

function getItem(PDO $pdo, string $id): ?array
{
    $statement = $pdo->prepare(
        'SELECT items.*, (SELECT COUNT(*) FROM claims WHERE claims.item_id = items.id) AS claim_count
         FROM items WHERE items.id = :id'
    );
    $statement->execute(['id' => $id]);
    $row = $statement->fetch();
    return $row ? formatItem($row) : null;
}

try {
    session_start();

    $action = isset($_GET['action']) && is_string($_GET['action']) ? $_GET['action'] : '';
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    $databaseHost = 'localhost';
    $databaseName = 'campusfind_db';
    $databaseUser = 'root';
    $databasePassword = '';
    $pdo = new PDO(
        'mysql:host=' . $databaseHost . ';dbname=' . $databaseName . ';charset=utf8mb4',
        $databaseUser,
        $databasePassword,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    $ownerToken = hash('sha256', session_id());

    if ($action === 'items' && $method === 'GET') {
        $statement = $pdo->query('SELECT * FROM items ORDER BY created_at DESC, id DESC');
        sendJson(true, array_map('formatItem', $statement->fetchAll()));
    }

    if ($action === 'my-reports' && $method === 'GET') {
        $statement = $pdo->prepare(
            'SELECT * FROM items WHERE owner_token = :owner_token ORDER BY created_at DESC, id DESC'
        );
        $statement->execute(['owner_token' => $ownerToken]);
        sendJson(true, array_map('formatItem', $statement->fetchAll()));
    }

    if ($action === 'item' && $method === 'GET') {
        $id = isset($_GET['id']) && is_string($_GET['id']) ? trim($_GET['id']) : '';
        sendJson(true, $id === '' ? null : getItem($pdo, $id));
    }

    if ($action === 'create-item' && $method === 'POST') {
        $data = readJsonBody();
        $title = requiredText($data, 'title', 'Item name', 120);
        $type = requiredText($data, 'type', 'Report type', 10);
        $category = requiredText($data, 'category', 'Category', 40);
        $location = requiredText($data, 'location', 'Location', 160);
        $date = validateReportDate(requiredText($data, 'date', 'Item date', 10));
        $description = requiredText($data, 'description', 'Description', 2000);
        $contactName = requiredText($data, 'contactName', 'Your name', 120);
        $contactPhone = validatePhone(requiredText($data, 'contactPhone', 'Phone number', 30));
        $email = isset($data['email']) && is_string($data['email']) ? trim($data['email']) : '';

        if (!in_array($type, ['lost', 'found'], true)) {
            throw new InvalidArgumentException('Please choose a valid report type.');
        }
        if (!in_array($category, ['Accessories', 'Documents', 'Electronics', 'Wallets', 'Personal Items'], true)) {
            throw new InvalidArgumentException('Please choose a valid item category.');
        }
        if (strlen($description) < 20) {
            throw new InvalidArgumentException('Description must include at least 20 characters.');
        }
        if ($email !== '' && (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
            throw new InvalidArgumentException('Please enter a valid email address.');
        }

        $id = 'item-' . bin2hex(random_bytes(8));
        $statement = $pdo->prepare(
            'INSERT INTO items
                (id, title, type, category, location, item_date, description, contact_name, contact_phone, contact_email, reporter, owner_token)
             VALUES
                (:id, :title, :type, :category, :location, :item_date, :description, :contact_name, :contact_phone, :contact_email, :reporter, :owner_token)'
        );
        $statement->execute([
            'id' => $id,
            'title' => $title,
            'type' => $type,
            'category' => $category,
            'location' => $location,
            'item_date' => $date,
            'description' => $description,
            'contact_name' => $contactName,
            'contact_phone' => $contactPhone,
            'contact_email' => $email === '' ? null : $email,
            'reporter' => $contactName,
            'owner_token' => $ownerToken
        ]);
        sendJson(true, getItem($pdo, $id), 201);
    }

    if ($action === 'create-claim' && $method === 'POST') {
        $data = readJsonBody();
        $itemId = requiredText($data, 'itemId', 'Item', 40);
        $name = requiredText($data, 'name', 'Your name', 120);
        $phone = validatePhone(requiredText($data, 'phone', 'Phone number', 30));
        $message = requiredText($data, 'message', 'Message', 1000);

        if (!getItem($pdo, $itemId)) {
            sendJson(false, 'This item could not be found.', 404);
        }

        $statement = $pdo->prepare(
            'INSERT INTO claims (item_id, name, phone, message) VALUES (:item_id, :name, :phone, :message)'
        );
        $statement->execute([
            'item_id' => $itemId,
            'name' => $name,
            'phone' => $phone,
            'message' => $message
        ]);
        $countStatement = $pdo->prepare('SELECT COUNT(*) FROM claims WHERE item_id = :item_id');
        $countStatement->execute(['item_id' => $itemId]);
        sendJson(true, ['claimCount' => (int) $countStatement->fetchColumn()], 201);
    }

    if ($action === 'delete-item' && $method === 'POST') {
        $data = readJsonBody();
        $id = requiredText($data, 'id', 'Report', 40);
        $statement = $pdo->prepare('DELETE FROM items WHERE id = :id AND owner_token = :owner_token');
        $statement->execute(['id' => $id, 'owner_token' => $ownerToken]);
        if ($statement->rowCount() !== 1) {
            sendJson(false, 'This report was not found or you do not have permission to delete it.', 404);
        }
        sendJson(true, ['deleted' => true]);
    }

    if (!in_array($method, ['GET', 'POST'], true)) {
        header('Allow: GET, POST');
        sendJson(false, 'This request method is not supported.', 405);
    }
    sendJson(false, 'This API action is not supported.', 404);
} catch (InvalidArgumentException $error) {
    sendJson(false, $error->getMessage(), 422);
} catch (Throwable $error) {
    error_log('CampusFind API error: ' . $error->getMessage());
    sendJson(false, 'The request could not be completed. Check the database setup and server error log.', 500);
}
