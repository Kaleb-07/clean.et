<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $ctrl = app(\App\Http\Controllers\API\BookingController::class);
    echo "Controller resolved OK\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "In: " . $e->getFile() . ":" . $e->getLine() . "\n";
    // Unwrap previous
    $prev = $e->getPrevious();
    while ($prev) {
        echo "Caused by: " . $prev->getMessage() . "\n";
        echo "In: " . $prev->getFile() . ":" . $prev->getLine() . "\n";
        $prev = $prev->getPrevious();
    }
}
