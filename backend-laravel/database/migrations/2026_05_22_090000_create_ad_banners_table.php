<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_banners', function (Blueprint $table) {
            $table->id();
            $table->string('name_internal');
            $table->string('page_key', 64);
            $table->string('slot_key', 64);
            $table->string('image_url');
            $table->string('target_url');
            $table->string('alt_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['page_key', 'slot_key', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_banners');
    }
};
