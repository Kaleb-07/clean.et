<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tenant_payouts')) {
            Schema::create('tenant_payouts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
                $table->decimal('gross_amount', 12, 2);
                $table->decimal('commission_rate', 5, 2)->default(10.00); // e.g. 10.00%
                $table->decimal('commission_amount', 12, 2);
                $table->decimal('net_payout', 12, 2);
                $table->date('period_start');
                $table->date('period_end');
                $table->enum('status', ['pending', 'processing', 'paid', 'failed'])->default('pending');
                $table->string('payout_method')->default('telebirr'); // telebirr, cbe, bank_transfer
                $table->string('reference_number')->nullable();
                $table->text('notes')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_payouts');
    }
};
