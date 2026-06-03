<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('page_views', function (Blueprint $table): void {
            $table->string('visitor_key', 64)->nullable()->after('session_key')->index();
            $table->string('device_type', 32)->nullable()->after('host')->index();
        });
    }

    public function down(): void
    {
        Schema::table('page_views', function (Blueprint $table): void {
            $table->dropColumn(['visitor_key', 'device_type']);
        });
    }
};
