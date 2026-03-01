# Super CSV Crawler

Apify actor that fetches CSV files from URLs and converts them to datasets. Supports custom field names instead of using the first row as headers.

## Features

- **Multiple CSV URLs** – Fetch and parse multiple CSV files in one run
- **Configurable separator** – Use `,` (comma), `;` (semicolon), or other delimiter
- **Custom field names** – Optional array of column names; when provided, these are used as keys instead of the first row of the CSV

## Input

| Field        | Type    | Description |
|-------------|---------|-------------|
| `csvUrls`   | array   | URLs of CSV files to fetch and convert to dataset |
| `separator` | string  | Column separator (default: `,`). Often `,` or `;` |
| `fieldNames`| array   | Optional. Column names used as object keys. When omitted, the first row of each CSV is treated as the header |

## Behavior

- **Without `fieldNames`**: The first row of each CSV is used as the header. Each subsequent row becomes an object with keys from that header row.
- **With `fieldNames`**: The provided array is used as headers. All rows (including the first) are treated as data, so the first row is no longer interpreted as column names.

## Example

**CSV with no header row (use `fieldNames`):**
```
Alice,30,Engineer
Bob,25,Designer
```
Input: `fieldNames: ["name", "age", "role"]`  
Output: `[{ name: "Alice", age: "30", role: "Engineer" }, ...]`

**CSV with header row (omit `fieldNames`):**
```
Name,Age,Role
Alice,30,Engineer
Bob,25,Designer
```
Input: omit `fieldNames`  
Output: `[{ Name: "Alice", Age: "30", Role: "Engineer" }, ...]`
