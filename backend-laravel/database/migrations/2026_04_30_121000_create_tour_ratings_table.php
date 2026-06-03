<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tour_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('rater_key');
            $table->unsignedTinyInteger('rating');
            $table->string('locale', 8)->default('ru');
            $table->timestamps();

            $table->unique(['tour_id', 'rater_key']);
            $table->index(['tour_id', 'rating']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tour_ratings');
    }
};
