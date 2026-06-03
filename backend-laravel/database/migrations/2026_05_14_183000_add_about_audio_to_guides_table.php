<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('guides', function (Blueprint $table) {
            $table->string('about_audio_url')->nullable()->after('photo_url');
            $table->string('about_audio_file_name')->nullable()->after('about_audio_url');
        });
    }

    public function down(): void
    {
        Schema::table('guides', function (Blueprint $table) {
            $table->dropColumn(['about_audio_url', 'about_audio_file_name']);
        });
    }
};
