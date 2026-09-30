<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Check payments table columns
echo "=== PAYMENTS TABLE COLUMNS ===\n";
$cols = DB::select('PRAGMA table_info(payments)');
foreach ($cols as $c) {
    echo $c->name . " | " . $c->type . " | notnull:" . $c->notnull . "\n";
}

// Check invoices table columns
echo "\n=== INVOICES TABLE COLUMNS ===\n";
$cols2 = DB::select('PRAGMA table_info(invoices)');
foreach ($cols2 as $c) {
    echo $c->name . " | " . $c->type . "\n";
}

// Check current booking statuses
echo "\n=== BOOKINGS STATUS SUMMARY ===\n";
$rows = DB::select("SELECT id, status, staff_id, customer_id, price FROM bookings");
foreach ($rows as $r) {
    echo "Booking #{$r->id}: status={$r->status}, staff_id={$r->staff_id}, price={$r->price}\n";
}

// Check what status is needed for payment
echo "\n=== TEST: can staff collect payment on in_progress booking? ===\n";
$inProgress = DB::select("SELECT id, staff_id FROM bookings WHERE status='in_progress' LIMIT 1");
if ($inProgress) {
    echo "Found in_progress booking: #" . $inProgress[0]->id . "\n";
} else {
    echo "No in_progress booking found — status check will block payment collection\n";
}
