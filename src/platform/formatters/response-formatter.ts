export interface ResponseFormatter {
  format(text: string): string;
  formatCode(code: string, language?: string): string;
  formatError(error: string): string;
  formatList(items: string[]): string;
  truncate(text: string): string;
}