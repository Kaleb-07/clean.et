<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('services', 'image')) {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE services MODIFY image LONGTEXT NULL');
            }
        } else {
            Schema::table('services', function (Blueprint $table) {
                $table->longText('image')->nullable()->after('price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('services', 'image') && DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE services MODIFY image VARCHAR(255) NULL');
        }
    }
};
