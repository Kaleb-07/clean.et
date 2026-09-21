<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds checkout_url to payments so payment gateways can return
 * a redirect URL for mobile-money flows (Telebirr, CBE Birr, etc.).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('checkout_url')->nullable()->after('provider_reference');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('checkout_url');
        });
    }
};
