<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_points', function (Blueprint $table) {
            $table->json('gallery_captions_json')->nullable()->after('gallery_json');
        });
    }

    public function down(): void
    {
        Schema::table('tour_points', function (Blueprint $table) {
            $table->dropColumn('gallery_captions_json');
        });
    }
};
