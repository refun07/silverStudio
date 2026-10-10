<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class BangladeshMobileNumber implements ValidationRule
{
    public static function isValid(mixed $value): bool
    {
        return is_string($value) && preg_match('/^01[3-9][0-9]{8}$/', $value) === 1;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! self::isValid($value)) {
            $fail('The :attribute must be an 11-digit Bangladesh mobile number starting with 013 to 019.');
        }
    }
}
