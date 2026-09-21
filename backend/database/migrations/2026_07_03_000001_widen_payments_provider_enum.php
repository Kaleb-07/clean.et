<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Widen the payments table provider and status enums to match
 * the full set of values used across the application.
 *
 * Original schema defined:
 *   provider: ['telebirr', 'cbe']
 *   status:   ['pending', 'completed', 'failed']
 *
 * Required:
 *   provider: ['telebirr', 'cbe', 'cbe_birr', 'amole', 'stripe', 'cash']
 *   status:   ['pending', 'completed', 'failed']  — already correct, no change
 */
return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support ALTER COLUMN; skip enum widening on SQLite
        // (in-memory SQLite used in tests will just accept any string value)
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // MySQL / Postgres: widen provider enum
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE payments MODIFY COLUMN provider ENUM('telebirr','cbe','cbe_birr','amole','stripe','cash') NOT NULL");
        }

        if (DB::getDriverName() === 'pgsql') {
            // Postgres uses check constraints; drop old, add new
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check");
            DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('telebirr','cbe','cbe_birr','amole','stripe','cash'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') return;

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE payments MODIFY COLUMN provider ENUM('telebirr','cbe') NOT NULL");
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_provider_check");
            DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_provider_check CHECK (provider IN ('telebirr','cbe'))");
        }
    }
};
