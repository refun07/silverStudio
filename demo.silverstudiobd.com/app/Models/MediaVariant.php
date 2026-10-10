<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MediaVariant extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'size' => 'integer',
    ];

    public function mediaFile()
    {
        return $this->belongsTo(MediaFile::class);
    }
}
