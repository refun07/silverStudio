<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('media_files')) {
            Schema::table('media_files', function (Blueprint $table) {
                if (! Schema::hasColumn('media_files', 'original_path')) {
                    $table->longText('original_path')->nullable()->after('media_file');
                }
                if (! Schema::hasColumn('media_files', 'preview_path')) {
                    $table->longText('preview_path')->nullable()->after('original_path');
                }
                if (! Schema::hasColumn('media_files', 'disk')) {
                    $table->string('disk', 50)->nullable()->after('preview_path');
                }
                if (! Schema::hasColumn('media_files', 'mime_type')) {
                    $table->string('mime_type')->nullable()->after('media_extension');
                }
                if (! Schema::hasColumn('media_files', 'original_extension')) {
                    $table->string('original_extension', 30)->nullable()->after('mime_type');
                }
                if (! Schema::hasColumn('media_files', 'width')) {
                    $table->unsignedInteger('width')->nullable()->after('original_extension');
                }
                if (! Schema::hasColumn('media_files', 'height')) {
                    $table->unsignedInteger('height')->nullable()->after('width');
                }
                if (! Schema::hasColumn('media_files', 'processing_status')) {
                    $table->string('processing_status', 30)->default('legacy')->after('height');
                }
                if (! Schema::hasColumn('media_files', 'processing_error')) {
                    $table->text('processing_error')->nullable()->after('processing_status');
                }
                if (! Schema::hasColumn('media_files', 'checksum')) {
                    $table->char('checksum', 64)->nullable()->after('processing_error');
                }
            });

            if (Schema::hasColumn('media_files', 'media_file')) {
                if (Schema::hasColumn('media_files', 'original_path')) {
                    DB::table('media_files')->whereNull('original_path')->update(['original_path' => DB::raw('media_file')]);
                }
                if (Schema::hasColumn('media_files', 'preview_path')) {
                    DB::table('media_files')->whereNull('preview_path')->update(['preview_path' => DB::raw('media_file')]);
                }
            }
            if (Schema::hasColumn('media_files', 'disk')) {
                DB::table('media_files')->whereNull('disk')->update(['disk' => config('filesystems.default', 'local')]);
            }
            if (Schema::hasColumn('media_files', 'media_extension') && Schema::hasColumn('media_files', 'original_extension')) {
                DB::table('media_files')->whereNull('original_extension')->update(['original_extension' => DB::raw('media_extension')]);
            }
        }

        if (! Schema::hasTable('media_variants')) {
            Schema::create('media_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('media_file_id')->constrained('media_files')->cascadeOnDelete();
                $table->string('type', 50);
                $table->string('disk', 50)->nullable();
                $table->longText('path');
                $table->string('mime_type')->nullable();
                $table->string('extension', 30)->nullable();
                $table->unsignedInteger('width')->nullable();
                $table->unsignedInteger('height')->nullable();
                $table->unsignedBigInteger('size')->nullable();
                $table->timestamps();
                $table->unique(['media_file_id', 'type']);
            });
        }

        if (Schema::hasTable('checkout_sessions')) {
            Schema::table('checkout_sessions', function (Blueprint $table) {
                if (! Schema::hasColumn('checkout_sessions', 'follow_up_status')) {
                    $table->string('follow_up_status', 50)->nullable()->after('current_step');
                }
                if (! Schema::hasColumn('checkout_sessions', 'next_follow_up_at')) {
                    $table->timestamp('next_follow_up_at')->nullable()->after('follow_up_status');
                }
            });
        }
    }

    public function down(): void
    {
        // Intentionally left non-destructive for production safety.
    }
};
