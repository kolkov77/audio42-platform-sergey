<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('short_description', 300)->nullable();
            $table->text('full_description')->nullable();
            $table->text('audience_description')->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();
            $table->decimal('price_rub', 10, 2)->default(0);
            $table->string('currency', 3)->default('RUB');
            $table->string('cover_image_url')->nullable();
            $table->json('gallery_json')->nullable();
            $table->string('status')->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tours');
    }
};
