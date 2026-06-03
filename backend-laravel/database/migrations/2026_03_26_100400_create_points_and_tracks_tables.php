<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('points_of_interest', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('city')->default('Кемерово');
            $table->string('address_text')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('tour_points', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->foreignId('point_id')->nullable()->constrained('points_of_interest')->nullOnDelete();
            $table->string('title_override')->nullable();
            $table->text('description_override')->nullable();
            $table->unsignedInteger('sort_order')->default(1);
            $table->boolean('is_route_visible')->default(true);
            $table->timestamps();
        });

        Schema::create('tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tour_point_id')->nullable()->constrained('tour_points')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('audio_url');
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('sort_order')->default(1);
            $table->boolean('is_demo')->default(false);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tracks');
        Schema::dropIfExists('tour_points');
        Schema::dropIfExists('points_of_interest');
    }
};
