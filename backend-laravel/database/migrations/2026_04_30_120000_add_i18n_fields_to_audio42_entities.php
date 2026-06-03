<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            $table->json('translation_json')->nullable()->after('gallery_json');
            $table->json('enabled_locales_json')->nullable()->after('translation_json');
        });

        Schema::table('guides', function (Blueprint $table) {
            $table->json('translation_json')->nullable()->after('trust_points_json');
            $table->json('enabled_locales_json')->nullable()->after('translation_json');
        });

        Schema::table('tour_points', function (Blueprint $table) {
            $table->json('translation_json')->nullable()->after('gallery_captions_json');
        });

        Schema::table('tracks', function (Blueprint $table) {
            $table->json('translation_json')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('tracks', function (Blueprint $table) {
            $table->dropColumn('translation_json');
        });

        Schema::table('tour_points', function (Blueprint $table) {
            $table->dropColumn('translation_json');
        });

        Schema::table('guides', function (Blueprint $table) {
            $table->dropColumn(['translation_json', 'enabled_locales_json']);
        });

        Schema::table('tours', function (Blueprint $table) {
            $table->dropColumn(['translation_json', 'enabled_locales_json']);
        });
    }
};
