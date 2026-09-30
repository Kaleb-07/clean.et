<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add 'chapa' and 'phone_number' / 'chapa_tx_ref' fields to the payments table.
 *
 * Also widens the provider enum to include 'chapa' for MySQL / Postgres.
 * SQLite (used in local dev/tests) silently accepts any string value already.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Add chapa-specific columns ─────────────────────────────────────
        if (!Schema::hasColumn('payments', 'phone_number')) {
            Schema::table('payments', function ($table) {
                // Phone number used for direct-charge mobile flows (Telebirr, CBE Birr, etc.)
                $table->string('phone_number', 20)->nullable()->after('checkout_url');
            });
        }

        if (!Schema::hasColumn('payments', 'chapa_tx_ref')) {
            Schema::table('payments', function ($table) {
                // Chapa's unique transaction reference (same as provider_reference but explicit)
                $table->string('chapa_tx_ref', 100)->nullable()->after('phone_number');
            });
        }

        // ── 2. Widen provider enum to include 'chapa' ─────────────────────────
        if (DB::getDriverName() === 'sqlite') {
            // SQLite: no ALTER COLUMN needed — it accepts any string
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE payments MODIFY COLUMN provider " .
                "ENUM('telebirr','cbe','cbe_birr','amole','stripe','cash','chapa') NOT NULL"
            );
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check");
            DB::statement(
                "ALTER TABLE payments ADD CONSTRAINT payments_provider_check " .
                "CHECK (provider IN ('telebirr','cbe','cbe_birr','amole','stripe','cash','chapa'))"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') return;

        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE payments MODIFY COLUMN provider " .
                "ENUM('telebirr','cbe','cbe_birr','amole','stripe','cash') NOT NULL"
            );
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check");
            DB::statement(
                "ALTER TABLE payments ADD CONSTRAINT payments_provider_check " .
                "CHECK (provider IN ('telebirr','cbe','cbe_birr','amole','stripe','cash'))"
            );
        }

        // Remove added columns
        Schema::table('payments', function ($table) {
            $table->dropColumn(['phone_number', 'chapa_tx_ref']);
        });
    }
};
