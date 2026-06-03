<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('page_views', function (Blueprint $table): void {
            $table->string('geo_country_code', 8)->nullable()->after('utm_term')->index();
            $table->string('geo_country_name', 255)->nullable()->after('geo_country_code')->index();
            $table->string('geo_city_name', 255)->nullable()->after('geo_country_name')->index();
        });
    }

    public function down(): void
    {
        Schema::table('page_views', function (Blueprint $table): void {
            $table->dropColumn(['geo_country_code', 'geo_country_name', 'geo_city_name']);
        });
    }
};
