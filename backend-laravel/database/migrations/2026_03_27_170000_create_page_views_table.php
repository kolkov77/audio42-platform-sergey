<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->string('session_key', 64)->index();
            $table->string('host', 255)->nullable()->index();
            $table->string('page_path', 255)->index();
            $table->string('page_query', 1000)->nullable();
            $table->string('referrer_url', 1000)->nullable();
            $table->string('referrer_host', 255)->nullable()->index();
            $table->string('source_label', 255)->nullable()->index();
            $table->string('utm_source', 255)->nullable()->index();
            $table->string('utm_medium', 255)->nullable();
            $table->string('utm_campaign', 255)->nullable();
            $table->string('utm_content', 255)->nullable();
            $table->string('utm_term', 255)->nullable();
            $table->boolean('is_entry')->default(false)->index();
            $table->timestamp('viewed_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
