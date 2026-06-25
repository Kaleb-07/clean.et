<?php

namespace App\Services;

use App\Models\Sector;
use Illuminate\Validation\ValidationException;

class SchemaValidationService
{
    /**
     * Validate requirement_data against a sector's requirement_schema.
     * Throws ValidationException on failure so the controller can return 422.
     *
     * @param  Sector  $sector
     * @param  array   $data
     * @throws ValidationException
     */
    public function validate(Sector $sector, array $data): void
    {
        $fields = $sector->getFields();
        $errors = [];

        foreach ($fields as $field) {
            $key      = $field['key'];
            $label    = $field['label'];
            $required = $field['required'] ?? false;
            $type     = $field['type'] ?? 'text';
            $options  = $field['options'] ?? null;

            $value = $data[$key] ?? null;

            // Required check
            if ($required && ($value === null || $value === '')) {
                $errors["requirement_data.{$key}"] = ["{$label} is required."];
                continue;
            }

            if ($value === null || $value === '') {
                continue; // optional and empty — skip further checks
            }

            // Type checks
            match ($type) {
                'number'  => $this->assertNumeric($key, $label, $value, $errors),
                'boolean' => $this->assertBoolean($key, $label, $value, $errors),
                'select'  => $this->assertOption($key, $label, $value, $options, $errors),
                default   => null,
            };
        }

        if (!empty($errors)) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function assertNumeric(string $key, string $label, mixed $value, array &$errors): void
    {
        if (!is_numeric($value) || $value < 0) {
            $errors["requirement_data.{$key}"] = ["{$label} must be a positive number."];
        }
    }

    private function assertBoolean(string $key, string $label, mixed $value, array &$errors): void
    {
        if (!in_array($value, [true, false, 1, 0, '1', '0', 'true', 'false'], true)) {
            $errors["requirement_data.{$key}"] = ["{$label} must be true or false."];
        }
    }

    private function assertOption(string $key, string $label, mixed $value, ?array $options, array &$errors): void
    {
        if ($options !== null && !in_array($value, $options, true)) {
            $list = implode(', ', $options);
            $errors["requirement_data.{$key}"] = ["{$label} must be one of: {$list}."];
        }
    }
}
