<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

$api_url = 'https://data.epa.gov.tw/api/v1/aqx_p_01?api_key=9be7b239-557b-4c10-9775-78cadfc555e9&format=json';

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept: application/json'
        ]
    ]
]);

$result = file_get_contents($api_url, false, $context);

if ($result === FALSE) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data from EPA API']);
} else {
    echo $result;
}
?>