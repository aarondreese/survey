# Field Type Configuration Guide

## CustomFieldType Mappings

This document explains how database field types from `hms.CustomFieldType` map to survey display types.

### Field Type Reference

| ID | CustomFieldType | Display Type | Description | Use Case |
|---|---|---|---|---|
| 1 | CustomDate | date | Date picker (date only) | Install dates, service dates |
| 2 | CustomDateTime | date | Date picker with time | Timestamp fields |
| 3 | CustomTime | text | Time input | Time-only fields |
| 4 | CustomInt | number | Integer input | Counts, IDs, whole numbers |
| 5 | CustomDecimal | number | Decimal input | Measurements, prices |
| 6 | CustomShortText | text or textarea | Single-line or multi-line text | Names, serial numbers, or longer descriptions |
| 7 | CustomLongText | text or textarea | Single-line or multi-line text | Comments, descriptions |
| 8 | CustomMaxText | textarea | Large text area | Extended notes |
| 9 | CustomBoolean | boolean | Yes/No switch toggle | True/false flags |
| 10 | CustomImageLink | image | Image upload/camera | Photos, diagrams |

### Display Type Options

#### For Fields with Options Lists (Lookup Fields):
- **Dropdown**: Single selection from a list (compact)
- **Radio Buttons**: Single selection from a list (visible options)
- **Checkboxes**: Multiple selection from a list

#### For Boolean Fields (CustomBoolean):
- **Boolean Switch**: Yes/No or True/False toggle switch
  - Renders as a modern switch/toggle UI element
  - Returns true/false value
  - Use for: Active/Inactive, Enabled/Disabled, Yes/No questions

#### Key Distinction: Boolean vs Checkbox
- **Boolean**: Single yes/no choice, renders as a switch/toggle
  - Example: "Is this unit active?" → Switch (Yes/No)
- **Checkbox**: Multiple selections from a list of options
  - Example: "Select applicable conditions:" → Checkboxes (Good, Fair, Poor, etc.)

### Field Naming Convention

Fields follow this pattern: `{FieldType}{Number}`

Examples:
- `String01`, `String02` → CustomShortText fields
- `Date01`, `Date02` → CustomDate fields
- `Int01`, `Int02` → CustomInt fields
- `Bool01`, `Bool02` → CustomBoolean fields
- `Lookup01`, `Lookup02` → Lookup fields with options
- `Image01`, `Image02` → CustomImageLink fields

### Configuration Rules

The system automatically restricts available display types based on the field's underlying type:

1. **Date/Time fields**: Can only use `date` display type
2. **Numeric fields** (Int/Decimal): Can only use `number` display type
3. **Boolean fields**: Can only use `boolean` display type (switch)
4. **Lookup fields** (with options): Can only use `dropdown`, `radio`, or `checkbox`
5. **String/Text fields**: Can use either `text` (short text, single-line) or `textarea` (long text, multi-line)
   - **CustomShortText**: Allows selection between `text` and `textarea`
   - **CustomLongText**: Allows selection between `text` and `textarea`
   - **CustomMaxText**: Typically uses `textarea` for large text
6. **Image fields**: Can only use `image` display type

This prevents invalid configurations (e.g., trying to use a dropdown for a date field) while providing flexibility for text-based fields.
