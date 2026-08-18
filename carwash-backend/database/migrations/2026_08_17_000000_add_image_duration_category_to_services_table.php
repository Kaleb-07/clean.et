<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (!Schema::hasColumn('services', 'image')) {
                $table->longText('image')->nullable()->after('price');
            }
            if (!Schema::hasColumn('services', 'duration')) {
                $table->integer('duration')->default(45)->after('image');
            }
            if (!Schema::hasColumn('services', 'category')) {
                $table->string('category')->default('car-washing')->after('duration');
            }
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            if (Schema::hasColumn('services', 'image')) {
                $table->dropColumn('image');
            }
            if (Schema::hasColumn('services', 'duration')) {
                $table->dropColumn('duration');
            }
            if (Schema::hasColumn('services', 'category')) {
                $table->dropColumn('category');
            }
        });
    }
};
